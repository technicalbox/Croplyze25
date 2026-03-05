'use client';

/**
 * @fileOverview Message list: AI bubbles, user bubbles, typing orb, follow-up chips.
 * Faithful to the Stitch design — green gradient user bubbles, white glass AI bubbles
 * with left green bar accent, and the animated thinking orb.
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useChatbot, type UiMessage } from './chat-provider';
import { Volume2, VolumeX } from 'lucide-react';

// ─── Typing dots ──────────────────────────────────────────────────────────────

function TypingDots() {
    return (
        <div className="flex items-center gap-1.5 px-4 py-3 bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl rounded-tl-sm w-fit border border-white/30 shadow-sm">
            {[0, 1, 2].map(i => (
                <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-green-400"
                    style={{ animation: `chatTyping 1.4s ${-0.32 + i * 0.16}s infinite ease-in-out both` }}
                />
            ))}
        </div>
    );
}

// ─── Thinking orb ─────────────────────────────────────────────────────────────

function ThinkingOrb() {
    return (
        <div className="relative w-full py-10 flex flex-col items-center justify-center">
            {/* Aura */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(74,222,128,0.25) 0%, transparent 70%)', filter: 'blur(24px)', animation: 'pulse 4s ease-in-out infinite' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-emerald-500/10 rounded-full"
                style={{ filter: 'blur(16px)', animation: 'chatGlow 3s ease-in-out infinite alternate' }} />

            {/* Main orb */}
            <div className="relative z-10 w-20 h-20 rounded-full bg-white/10 dark:bg-white/5 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-[0_0_40px_rgba(74,222,128,0.2)]"
                style={{ animation: 'chatFloat 6s ease-in-out infinite' }}>
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-green-400 flex items-center justify-center relative overflow-hidden shadow-inner">
                    {/* Shimmer */}
                    <span className="absolute inset-0 bg-white/20 -skew-x-12"
                        style={{ animation: 'chatShimmer 2s infinite', transform: 'translateX(-150%) skewX(-12deg)' }} />
                    {/* Bars icon */}
                    <svg className="h-7 w-7 text-white relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M9 18V5l12-2v13" />
                        <line x1="9" y1="9" x2="21" y2="7" />
                        <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                    </svg>
                </div>
                {/* Orbiting dot */}
                <div className="absolute inset-0 rounded-full" style={{ animation: 'spin 4s linear infinite' }}>
                    <div className="w-2 h-2 bg-green-400 rounded-full absolute top-0 left-1/2 -translate-x-1/2 shadow-[0_0_8px_#4ADE80]" />
                </div>
            </div>

            {/* Status */}
            <div className="mt-6 flex flex-col items-center gap-1 relative z-10">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 dark:bg-white/5 border border-white/20 backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-bounce" />
                    <span className="text-[10px] font-semibold text-green-700 dark:text-green-300 uppercase tracking-wider">Processing Request</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 animate-pulse mt-1">Analysing your query…</p>
            </div>
        </div>
    );
}

// ─── AI bubble ────────────────────────────────────────────────────────────────

/** Strip any stray HTML tags the AI might have included despite instructions */
function stripHtml(raw: string): string {
    // Replace block-level tags with newlines to preserve structure
    return raw
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<li>/gi, '- ')
        .replace(/<ul>|<\/ul>|<ol>|<\/ol>/gi, '\n')
        .replace(/<\/?(strong|b)>/gi, '**')
        .replace(/<[^>]+>/g, '')  // nuke every remaining tag
        .replace(/\n{3,}/g, '\n\n') // collapse triple+ newlines
        .trim();
}

/** Render inline text: **bold** → <strong> */
function InlineText({ text }: { text: string }) {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return (
        <>
            {parts.map((chunk, i) =>
                i % 2 === 1
                    ? <strong key={i} className="font-semibold text-gray-900 dark:text-white">{chunk}</strong>
                    : <span key={i}>{chunk}</span>
            )}
        </>
    );
}

function AiBubble({ content }: { content: string }) {
    const { detectedLanguage } = useChatbot();
    const [isSpeaking, setIsSpeaking] = useState(false);
    const clean = stripHtml(content);
    const lines = clean.split('\n').filter(l => l.trim() !== '');

    // Count bullet lines to number them
    let bulletCount = 0;

    const handleSpeak = () => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        haptics.light();

        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        const langMap: Record<string, string> = {
            en: 'en-IN', hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN', kn: 'kn-IN', mr: 'mr-IN',
        };
        const bcp47 = langMap[detectedLanguage] || langMap['en'];

        const plainText = clean
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/^[-•]\s+/gm, '')
            .replace(/\n{2,}/g, '. ')
            .replace(/\n/g, '. ')
            .trim();

        const utterance = new SpeechSynthesisUtterance(plainText);
        utterance.lang = bcp47;
        utterance.rate = 0.9;
        const voices = window.speechSynthesis.getVoices();
        const match = voices.find(v => v.lang === bcp47) || voices.find(v => v.lang.startsWith(detectedLanguage));
        if (match) utterance.voice = match;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    };

    return (
        <div className="flex flex-col items-start gap-1 max-w-[90%]">
            <span className="text-[11px] font-medium text-green-700 dark:text-green-400 ml-1">Fasal AI</span>
            <div className="relative bg-white/80 dark:bg-white/5 border border-white/50 dark:border-white/10 backdrop-blur-xl rounded-2xl rounded-tl-sm shadow-md overflow-hidden">
                {/* Left green accent bar */}
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-400 to-emerald-600 rounded-l-sm" />
                <div className="px-4 py-3 pl-5 space-y-2">
                    {lines.map((line, i) => {
                        const trimmed = line.trim();
                        const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('• ');

                        if (isBullet) {
                            bulletCount++;
                            const num = bulletCount;
                            const text = trimmed.replace(/^[-•]\s+/, '');
                            return (
                                <div key={i} className="flex items-start gap-2.5">
                                    <span className="flex-none w-5 h-5 rounded-full bg-green-500/20 text-green-700 dark:text-green-300 flex items-center justify-center text-[10px] font-bold border border-green-500/30 mt-0.5 shrink-0">
                                        {num}
                                    </span>
                                    <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                                        <InlineText text={text} />
                                    </p>
                                </div>
                            );
                        }

                        // Non-bullet lines reset bullet counter only if separated by empty lines
                        // (preserve sequential numbering within a block)
                        return (
                            <p key={i} className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">
                                <InlineText text={trimmed} />
                            </p>
                        );
                    })}
                </div>
                {/* Read-aloud button */}
                <div className="flex justify-end px-3 pb-2">
                    <button
                        onClick={handleSpeak}
                        className={cn(
                            'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all active:scale-95',
                            isSpeaking
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/15',
                        )}
                        title={isSpeaking ? 'Stop reading' : 'Read aloud'}
                    >
                        {isSpeaking
                            ? <><VolumeX className="h-3 w-3" /> Stop</>
                            : <><Volume2 className="h-3 w-3" /> Listen</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── User bubble ──────────────────────────────────────────────────────────────

function UserBubble({ content, time }: { content: string; time: number }) {
    const t = new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return (
        <div className="flex flex-col items-end gap-1 max-w-[85%] ml-auto">
            <div className="relative bg-gradient-to-br from-green-600 to-green-800 text-white px-4 py-3 rounded-2xl rounded-tr-sm shadow-md shadow-green-900/20 overflow-hidden">
                <div className="absolute inset-0 bg-white/5 rounded-2xl" />
                <p className="text-sm leading-relaxed relative z-10">{content}</p>
            </div>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">{t}</span>
        </div>
    );
}

// ─── Follow-up chips ──────────────────────────────────────────────────────────

function FollowUpChips() {
    const { suggestedFollowUps, sendMessage, isLoading } = useChatbot();
    if (!suggestedFollowUps.length || isLoading) return null;

    return (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mb-1 mt-1">
            {suggestedFollowUps.map((tip, i) => (
                <button
                    key={i}
                    onClick={() => { haptics.light(); sendMessage(tip); }}
                    className="flex-none px-3 py-2 rounded-xl bg-white/70 dark:bg-white/10 border border-white/30 dark:border-white/10 backdrop-blur-md text-xs text-gray-700 dark:text-green-50 whitespace-nowrap hover:bg-white dark:hover:bg-white/20 transition-all active:scale-95"
                >
                    {tip}
                </button>
            ))}
        </div>
    );
}

// ─── Main message list ────────────────────────────────────────────────────────

export default function MessageList() {
    const { messages, isLoading, sendMessage } = useChatbot();
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    if (messages.length === 0 && !isLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                    <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                        <path d="M12 8v4l3 3" />
                    </svg>
                </div>
                <div>
                    <p className="text-base font-bold text-gray-800 dark:text-white">Fasal AI is ready</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
                        Ask me anything about your crops — diseases, fertilizers, harvest timing, weather, market prices.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {['Why are my leaves yellowing?', 'Best fertilizer for wheat?', 'When to harvest rice?'].map(s => (
                        <button key={s} onClick={() => { haptics.light(); sendMessage(s); }} className="px-3 py-1.5 rounded-xl bg-white/50 dark:bg-white/10 border border-white/30 text-xs text-gray-600 dark:text-gray-300 backdrop-blur-md hover:bg-white dark:hover:bg-white/20 transition-colors">
                            {s}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 px-4 py-3">
            <style>{`
                @keyframes chatTyping {
                    0%, 80%, 100% { transform: scale(0); opacity: 0.4; }
                    40% { transform: scale(1); opacity: 1; }
                }
                @keyframes chatFloat {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-8px); }
                }
                @keyframes chatGlow {
                    0% { box-shadow: 0 0 20px rgba(74,222,128,0.1); }
                    100% { box-shadow: 0 0 60px rgba(74,222,128,0.4); }
                }
                @keyframes chatShimmer {
                    0% { transform: translateX(-150%) skewX(-12deg); }
                    100% { transform: translateX(300%) skewX(-12deg); }
                }
            `}</style>

            {messages.map((msg, idx) => (
                <div key={msg.id} className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                    {msg.role === 'model'
                        ? <AiBubble content={msg.content} />
                        : <UserBubble content={msg.content} time={msg.createdAt} />}
                    {/* Follow-ups after last AI message */}
                    {msg.role === 'model' && idx === messages.length - 1 && <FollowUpChips />}
                </div>
            ))}

            {isLoading && (
                <div className="animate-in fade-in-0 duration-300">
                    <ThinkingOrb />
                </div>
            )}

            <div ref={bottomRef} />
        </div>
    );
}
