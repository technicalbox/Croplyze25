'use client';

/**
 * @fileOverview Full-screen chat modal — slides up from the bottom.
 * Matches the Stitch design: ambient light-green gradient, glassmorphism header,
 * context strip, message list, and the pill input bar.
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, MoreVertical, Wifi, Plus, MessageSquare, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useChatbot } from './chat-provider';
import ContextStrip from './context-strip';
import MessageList from './message-list';
import ChatInput from './chat-input';

// ─── Language dropdown (pill) ─────────────────────────────────────────────────

const LANG_LABELS: Record<string, string> = {
    en: 'EN', ur: 'UR', hi: 'HI', pa: 'PA', ar: 'AR', sw: 'SW', fr: 'FR',
};

// ─── AI Avatar orb ────────────────────────────────────────────────────────────

function AiOrb() {
    return (
        <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30 flex-none">
            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3a9 9 0 110 18A9 9 0 0112 3zm0 2a7 7 0 100 14A7 7 0 0012 5zm.01 3.5a.5.5 0 01.5.5v4.5l3 1.75a.5.5 0 01-.5.866L12 14.268l-3.01 1.75a.5.5 0 01-.5-.866l3-1.75V9a.5.5 0 01.5-.5z" />
            </svg>
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full border border-white/30" />
        </div>
    );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function ChatModal() {
    const [showMenu, setShowMenu] = useState(false);
    const {
        isOpen, closeChat,
        sessionTitle, detectedLanguage,
        startNewSession, messages,
        sessions, loadSession,
        openVoice,
    } = useChatbot();

    // Lock body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // Escape key closes modal
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeChat(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [closeChat]);

    if (!isOpen) return null;

    const langLabel = LANG_LABELS[detectedLanguage] ?? 'EN';

    return (
        <div
            className={cn(
                'fixed inset-0 z-50 flex flex-col',
                'animate-in slide-in-from-bottom-full duration-300 ease-out',
                'bg-[#F0FDF4] dark:bg-[#062C21] transition-colors duration-500'
            )}
        >
            {/* Ambient glow blobs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[50vh] bg-green-500/20 dark:bg-green-500/10 blur-[100px] rounded-full" />
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-400/20 dark:bg-emerald-600/10 blur-[80px] rounded-full" />
            </div>

            {/* ── Header ──────────────────────────────────────────────────── */}
            <header
                className="relative z-10 flex-none px-4 pt-14 pb-4 flex items-center gap-3 bg-white/30 dark:bg-black/20 backdrop-blur-[20px] rounded-b-3xl border-b border-white/40 dark:border-white/10"
            >
                <button
                    onClick={() => { haptics.light(); closeChat(); }}
                    className="flex-none w-9 h-9 rounded-full flex items-center justify-center bg-white/40 border border-white/30 backdrop-blur-md active:scale-95 transition-transform"
                >
                    <ArrowLeft className="h-4 w-4 text-gray-700" />
                </button>

                <AiOrb />

                <div className="flex-1 min-w-0">
                    <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">
                        {sessionTitle ?? 'Fasal AI'}
                    </h1>
                    <p className="text-[10px] text-green-700 font-medium uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Online
                    </p>
                </div>

                {/* Language pill */}
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/50 dark:bg-white/10 border border-white/30 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-white backdrop-blur-md">
                    <Wifi className="h-3 w-3 text-green-500 dark:text-green-400" />
                    {langLabel}
                </div>

                {/* Menu trigger */}
                <button
                    onClick={() => { haptics.light(); setShowMenu(true); }}
                    className="flex-none w-9 h-9 rounded-full flex items-center justify-center bg-white/40 dark:bg-black/20 border border-white/30 dark:border-white/10 backdrop-blur-md active:scale-95 transition-transform"
                    title="Menu"
                >
                    <MoreVertical className="h-4 w-4 text-gray-600 dark:text-white" />
                </button>

                {/* Voice mode toggle */}
                <button
                    onClick={() => { haptics.medium(); closeChat(); openVoice(); }}
                    className="flex-none w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-orange-500/30 active:scale-95 transition-transform"
                    title="Switch to voice mode"
                >
                    <Mic className="h-4 w-4 text-white" />
                </button>
            </header>

            {/* ── Context strip ────────────────────────────────────────────── */}
            <div className="relative z-10 flex-none px-4 py-2 overflow-x-auto">
                <ContextStrip />
            </div>

            {/* ── Message list ─────────────────────────────────────────────── */}
            <div className="relative z-10 flex-1 flex flex-col min-h-0">
                <MessageList />
            </div>

            {/* ── Input bar ─────────────────────────────────────────────────── */}
            <div className="relative z-10 flex-none px-4 pb-10 pt-3 bg-gradient-to-t from-background-light via-background-light to-transparent dark:from-background-dark dark:via-background-dark/90 dark:to-transparent">
                <ChatInput />
                {/* Home indicator */}
                <div className="w-28 h-1 bg-gray-900/15 dark:bg-white/20 rounded-full mx-auto mt-4" />
            </div>

            {/* ── Side Menu (History) ──────────────────────────────────────── */}
            {showMenu && (
                <>
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 z-40 animate-in fade-in duration-200"
                        onClick={() => setShowMenu(false)}
                    />
                    {/* Drawer */}
                    <div className="absolute top-0 right-0 bottom-0 w-3/4 max-w-sm bg-white dark:bg-[#062C21] z-50 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                        <div className="p-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
                            <h2 className="font-semibold text-gray-800 dark:text-white">Chat Menu</h2>
                            <button onClick={() => setShowMenu(false)} className="p-2 -mr-2 text-gray-500 dark:text-gray-400">
                                <ArrowLeft className="h-5 w-5 rotate-180" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            <button
                                onClick={() => {
                                    startNewSession();
                                    setShowMenu(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-xl font-medium mb-6 active:scale-95 transition-transform"
                            >
                                <Plus className="h-5 w-5" />
                                New Chat
                            </button>

                            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Recent Chats</h3>
                            <div className="space-y-2">
                                {sessions.length === 0 && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">No previous chats.</p>
                                )}
                                {sessions.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => {
                                            loadSession(s.id!);
                                            setShowMenu(false);
                                        }}
                                        className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left"
                                    >
                                        <MessageSquare className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-none" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-800 dark:text-white font-medium truncate">{s.title || 'Fasal AI Chat'}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                {new Date(s.updatedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
