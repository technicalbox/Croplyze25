'use client';

/**
 * @fileOverview Chat context provider — manages session state, sends messages,
 * and persists chat turns to Firestore (client-side).
 */

import {
    createContext, useContext, useState, useCallback, useRef, useEffect,
    type ReactNode,
} from 'react';
import { useUser } from '@/firebase';
import {
    createChatSession,
    updateChatSession,
    addChatTurn,
    getChatMessages,
    listChatSessions,
} from '@/farming-partner/farming-chatbot-client';
import type { ChatMessage, ChatSession } from '@/farming-partner/farming-chatbot-service';
import type { ChatMessageInput } from '@/ai/flows/farming-chatbot-flow';

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
    sendMessage: (text: string) => Promise<void>;
    startNewSession: () => void;
    sessions: ChatSession[];
    loadSession: (sessionId: string) => Promise<void>;
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
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<UiMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sessionTitle, setSessionTitle] = useState<string | null>(null);
    const [suggestedFollowUps, setSuggestedFollowUps] = useState<string[]>([]);
    const [detectedLanguage, setDetectedLanguage] = useState('en');
    const [cropContext, setCropContext] = useState<ChatMessageInput['cropContext'] | null>(null);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const historyRef = useRef<{ role: 'user' | 'model'; content: string }[]>([]);

    // Restore session on mount
    useEffect(() => {
        if (!user) return;
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
        // Load sessions list
        listChatSessions(user.uid).then(setSessions).catch(() => { });
    }, [user]);

    const openChat = useCallback(() => setIsOpen(true), []);
    const closeChat = useCallback(() => setIsOpen(false), []);

    const startNewSession = useCallback(() => {
        setMessages([]);
        setSessionId(null);
        setSessionTitle(null);
        setSuggestedFollowUps([]);
        historyRef.current = [];
        if (user) localStorage.removeItem(`${SESSION_KEY}_${user.uid}`);
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
        localStorage.setItem(`${SESSION_KEY}_${user.uid}`, sid);
    }, [user]);

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim() || isLoading || !user) return;
        const now = Date.now();

        // 1. Optimistic user message
        const userMsg: UiMessage = { id: `u-${now}`, role: 'user', content: text, createdAt: now };
        setMessages(prev => [...prev, userMsg]);
        setSuggestedFollowUps([]);
        setIsLoading(true);

        // Build history to send (last N turns before adding this one)
        const historyToSend = historyRef.current.slice(-MAX_HISTORY);

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
                    language: 'auto',
                    chatHistory: historyToSend,
                    cropContext: cropContext ?? undefined,
                    sessionId: sessionId ?? undefined,
                }),
            });

            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();

            // 3. Append AI reply
            const aiMsg: UiMessage = {
                id: `m-${Date.now()}`,
                role: 'model',
                content: data.reply,
                createdAt: Date.now() + 1,
            };
            setMessages(prev => [...prev, aiMsg]);
            setSuggestedFollowUps(data.suggestedFollowUps ?? []);
            setDetectedLanguage(data.detectedLanguage ?? 'en');

            // 4. Update history ref
            historyRef.current = [...historyRef.current, { role: 'user', content: text }, { role: 'model', content: data.reply }].slice(-MAX_HISTORY);

            // 5. Persist to Firestore
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
                localStorage.setItem(`${SESSION_KEY}_${user.uid}`, sid);
                setSessions(prev => [{ id: sid!, title, language: data.detectedLanguage ?? 'en', createdAt: now, updatedAt: now, userId: user.uid }, ...prev]);
            } else {
                // Update updatedAt
                await updateChatSession(user.uid, sid, { updatedAt: Date.now() });
            }
            await addChatTurn(user.uid, sid, text, data.reply, now);

        } catch (err) {
            console.error('[ChatProvider] sendMessage failed:', err);
            const errMsg: UiMessage = {
                id: `err-${Date.now()}`,
                role: 'model',
                content: 'Sorry, I could not connect. Please try again.',
                createdAt: Date.now(),
            };
            setMessages(prev => [...prev, errMsg]);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, user, sessionId, cropContext]);

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
        }}>
            {children}
        </ChatCtx.Provider>
    );
}
