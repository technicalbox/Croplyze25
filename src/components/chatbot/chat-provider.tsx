'use client';

/**
 * @fileOverview Chat context provider — manages session state, sends messages,
 * and persists chat turns to Firestore (client-side).
 * Extended with voice mode toggle and offline caching.
 */

import {
    createContext, useContext, useState, useCallback, useRef, useEffect,
    type ReactNode,
} from 'react';
import { useUser } from '@/firebase';
import { useTranslation } from '@/lib/i18n';
import {
    createChatSession,
    updateChatSession,
    addChatTurn,
    getChatMessages,
    listChatSessions,
} from '@/farming-partner/farming-chatbot-client';
import type { ChatMessage, ChatSession } from '@/farming-partner/farming-chatbot-service';
import type { ChatMessageInput } from '@/ai/flows/farming-chatbot-flow';
import { cacheResponse, getCachedResponse } from '@/hooks/useVoiceAssistant';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UiMessage {
    id: string;
    role: 'user' | 'model';
    content: string;
    createdAt: number;
}

export interface ChatContextValue {
    isOpen: boolean;
    openChat: () => void;
    /** Opens the chat modal AND sends a prefilled message after animation settles. */
    openChatWithMessage: (message: string) => void;
    closeChat: () => void;
    messages: UiMessage[];
    isLoading: boolean;
    sessionId: string | null;
    sessionTitle: string | null;
    suggestedFollowUps: string[];
    detectedLanguage: string;
    cropContext: ChatMessageInput['cropContext'] | null;
    setCropContext: (ctx: ChatMessageInput['cropContext'] | null) => void;
    /** Sends a message to Fasal AI. Returns the AI reply text, or null on error. */
    sendMessage: (text: string) => Promise<string | null>;
    startNewSession: () => void;
    sessions: ChatSession[];
    loadSession: (sessionId: string) => Promise<void>;
    // Voice mode
    isVoiceOpen: boolean;
    openVoice: () => void;
    closeVoice: () => void;
    /** Set a language override for the next sendMessage calls (used by voice modal). null = use global app language. */
    setVoiceLanguage: (lang: string | null) => void;
}

const ChatCtx = createContext<ChatContextValue | null>(null);

export function useChatbot() {
    const ctx = useContext(ChatCtx);
    if (!ctx) throw new Error('useChatbot must be used within ChatProvider');
    return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const SESSION_KEY = 'chatbot_session_id';
const MAX_HISTORY = 10;

export function ChatProvider({ children }: { children: ReactNode }) {
    const { user } = useUser();
    const { language } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [isVoiceOpen, setIsVoiceOpen] = useState(false);
    const [messages, setMessages] = useState<UiMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sessionTitle, setSessionTitle] = useState<string | null>(null);
    const [suggestedFollowUps, setSuggestedFollowUps] = useState<string[]>([]);
    const [detectedLanguage, setDetectedLanguage] = useState('en');
    const [cropContext, setCropContext] = useState<ChatMessageInput['cropContext'] | null>(null);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const historyRef = useRef<{ role: 'user' | 'model'; content: string }[]>([]);
    /** Language override set by voice modal — ref so sendMessage always reads latest value */
    const voiceLanguageRef = useRef<string | null>(null);
    const setVoiceLanguage = useCallback((lang: string | null) => {
        voiceLanguageRef.current = lang;
    }, []);

    // Restore session on mount
    useEffect(() => {
        if (!user) return;
        try {
            if (typeof window === 'undefined') return;
            const saved = localStorage.getItem(`${SESSION_KEY}_${user.uid}`);
            if (saved) {
                setSessionId(saved);
                getChatMessages(user.uid, saved).then(msgs => {
                    const ui = msgs.map(m => ({
                        id: m.id ?? String(m.createdAt),
                        role: m.role,
                        content: m.content,
                        createdAt: m.createdAt,
                    }));
                    setMessages(ui);
                    historyRef.current = ui.slice(-MAX_HISTORY).map(m => ({ role: m.role, content: m.content }));
                }).catch(() => {/* session may be deleted */ });
            }
        } catch { /* localStorage may not be available in some WebViews */ }
        // Load sessions list
        listChatSessions(user.uid).then(setSessions).catch(() => { });
    }, [user]);

    const openChat = useCallback(() => setIsOpen(true), []);
    const closeChat = useCallback(() => setIsOpen(false), []);
    const openVoice = useCallback(() => setIsVoiceOpen(true), []);
    const closeVoice = useCallback(() => setIsVoiceOpen(false), []);

    const startNewSession = useCallback(() => {
        setMessages([]);
        setSessionId(null);
        setSessionTitle(null);
        setSuggestedFollowUps([]);
        historyRef.current = [];
        try {
            if (user && typeof window !== 'undefined') localStorage.removeItem(`${SESSION_KEY}_${user.uid}`);
        } catch { /* safe */ }
    }, [user]);

    const loadSession = useCallback(async (sid: string) => {
        if (!user) return;
        const msgs = await getChatMessages(user.uid, sid);
        const ui = msgs.map(m => ({
            id: m.id ?? String(m.createdAt),
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
        }));
        setMessages(ui);
        setSessionId(sid);
        historyRef.current = ui.slice(-MAX_HISTORY).map(m => ({ role: m.role, content: m.content }));
        try {
            if (typeof window !== 'undefined') localStorage.setItem(`${SESSION_KEY}_${user.uid}`, sid);
        } catch { /* safe */ }
    }, [user]);

    const sendMessage = useCallback(async (text: string): Promise<string | null> => {
        if (!text.trim() || isLoading || !user) return null;
        const now = Date.now();

        // 1. Optimistic user message
        const userMsg: UiMessage = { id: `u-${now}`, role: 'user', content: text, createdAt: now };
        setMessages(prev => [...prev, userMsg]);
        setSuggestedFollowUps([]);
        setIsLoading(true);

        // Build history to send (last N turns before adding this one)
        const historyToSend = historyRef.current.slice(-MAX_HISTORY);

        // Voice language override takes priority, then fall back to global app language.
        // voiceLanguageRef is a ref so it's always the latest value — no stale closures.
        const effectiveLang = voiceLanguageRef.current || language;
        console.log('[sendMessage] language →', effectiveLang, '(voiceOverride:', voiceLanguageRef.current, ', appLang:', language, ')');

        try {
            // 2. Call API
            const res = await fetch('/api/chat/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.uid,
                },
                body: JSON.stringify({
                    message: text,
                    language: effectiveLang,
                    chatHistory: historyToSend,
                    cropContext: cropContext ?? undefined,
                    sessionId: sessionId ?? undefined,
                }),
            });

            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();

            // 3. Extract actual AI response
            const aiResponse: string = data.reply;
            console.log('[Fasal AI] AI Response:', aiResponse);

            // 4. Append AI reply to chat + cache for offline
            cacheResponse(text, aiResponse);
            const aiMsg: UiMessage = {
                id: `m-${Date.now()}`,
                role: 'model',
                content: aiResponse,
                createdAt: Date.now() + 1,
            };
            setMessages(prev => [...prev, aiMsg]);
            setSuggestedFollowUps(data.suggestedFollowUps ?? []);
            setDetectedLanguage(data.detectedLanguage ?? 'en');

            // 5. Update history ref
            historyRef.current = [...historyRef.current, { role: 'user' as const, content: text }, { role: 'model' as const, content: aiResponse }].slice(-MAX_HISTORY);

            // 6. Persist to Firestore
            let sid = sessionId;
            if (!sid) {
                // New session
                const title = data.sessionTitle ?? text.slice(0, 60);
                sid = await createChatSession(user.uid, {
                    title,
                    language: data.detectedLanguage ?? 'en',
                    createdAt: now,
                    updatedAt: now,
                    cropContext: cropContext ?? undefined,
                });
                setSessionId(sid);
                setSessionTitle(title);
                localStorage.setItem?.(`${SESSION_KEY}_${user.uid}`, sid!) ?? void 0;
                setSessions(prev => [{ id: sid!, title, language: data.detectedLanguage ?? 'en', createdAt: now, updatedAt: now, userId: user.uid }, ...prev]);
            } else {
                // Update updatedAt
                await updateChatSession(user.uid, sid, { updatedAt: Date.now() });
            }
            await addChatTurn(user.uid, sid, text, aiResponse, now);

            // 7. Return the actual AI response to the caller
            return aiResponse;

        } catch (err) {
            console.error('[ChatProvider] sendMessage failed:', err);
            // Try offline cache before giving an error
            const cached = getCachedResponse(text);
            const fallbackContent = cached
                ? `${cached}\n\n(⚠️ Offline — showing cached response)`
                : 'Sorry, I could not connect. Please try again.';
            const errMsg: UiMessage = {
                id: `err-${Date.now()}`,
                role: 'model',
                content: fallbackContent,
                createdAt: Date.now(),
            };
            setMessages(prev => [...prev, errMsg]);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, user, sessionId, cropContext, language]);

    /** Opens the chat modal and auto-sends a prefilled message after the animation settles. */
    const openChatWithMessage = useCallback((message: string) => {
        setIsOpen(true);
        setTimeout(() => { sendMessage(message); }, 350);
    }, [sendMessage]);

    return (
        <ChatCtx.Provider value={{
            isOpen, openChat, openChatWithMessage, closeChat,
            messages, isLoading,
            sessionId, sessionTitle,
            suggestedFollowUps, detectedLanguage,
            cropContext, setCropContext,
            sendMessage, startNewSession,
            sessions, loadSession,
            isVoiceOpen, openVoice, closeVoice,
            setVoiceLanguage,
        }}>
            {children}
        </ChatCtx.Provider>
    );
}
