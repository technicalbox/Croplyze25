'use client';

/**
 * @fileOverview Chat input bar with text field, optional voice input,
 * and a send button. Matches the Stitch design: pill-shaped with green glow.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { Send, Mic, MicOff, Loader2 } from 'lucide-react';
import { useChatbot } from './chat-provider';

// ─── SpeechRecognition shim ────────────────────────────────────────────────────
declare global {
    interface Window {
        SpeechRecognition: typeof SpeechRecognition;
        webkitSpeechRecognition: typeof SpeechRecognition;
    }
}

export default function ChatInput() {
    const { sendMessage, isLoading } = useChatbot();
    const [text, setText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [voiceSupported, setVoiceSupported] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const SR = typeof window !== 'undefined'
            ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
            : null;
        setVoiceSupported(!!SR);
    }, []);

    const startListening = useCallback(() => {
        const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
        if (!SR) return;
        haptics.light();
        const rec = new SR();
        rec.continuous = false;
        rec.interimResults = true;
        rec.lang = 'auto';

        rec.onresult = (e) => {
            const transcript = Array.from(e.results)
                .map(r => r[0].transcript)
                .join('');
            setText(transcript);
        };
        rec.onend = () => setIsListening(false);
        rec.onerror = () => setIsListening(false);

        recognitionRef.current = rec;
        rec.start();
        setIsListening(true);
    }, []);

    const stopListening = useCallback(() => {
        recognitionRef.current?.stop();
        setIsListening(false);
        haptics.light();
    }, []);

    const handleSend = useCallback(() => {
        const msg = text.trim();
        if (!msg || isLoading) return;
        haptics.medium();
        setText('');
        sendMessage(msg);
        inputRef.current?.focus();
    }, [text, isLoading, sendMessage]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    return (
        <div className="flex items-center gap-2 relative">
            {/* Glow behind input */}
            <div className="absolute inset-0 bg-green-400/15 rounded-2xl blur-md pointer-events-none" />

            {/* Input pill */}
            <div className="flex-1 relative z-10 flex items-center gap-2 pl-4 pr-1 py-1 bg-white/80 dark:bg-[#0A382A] border border-white/40 dark:border-white/10 rounded-2xl shadow-lg backdrop-blur-xl">
                <input
                    ref={inputRef}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isListening ? 'Listening…' : 'Ask about crop health…'}
                    disabled={isLoading}
                    className={cn(
                        'flex-1 bg-transparent border-none outline-none text-sm',
                        'text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500',
                        isListening && 'placeholder-green-600 dark:placeholder-green-400',
                    )}
                />

                {/* Send or spinner */}
                <button
                    onClick={handleSend}
                    disabled={!text.trim() || isLoading}
                    className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150',
                        text.trim() && !isLoading
                            ? 'bg-gradient-to-br from-green-400 to-emerald-600 text-white shadow-md shadow-green-500/30 active:scale-95'
                            : 'text-gray-300 dark:text-gray-600',
                    )}
                >
                    {isLoading
                        ? <Loader2 className="h-4 w-4 animate-spin text-green-500" />
                        : <Send className="h-4 w-4" />}
                </button>
            </div>

            {/* Mic button */}
            {voiceSupported && (
                <button
                    onClick={isListening ? stopListening : startListening}
                    disabled={isLoading}
                    className={cn(
                        'relative flex-none w-12 h-12 rounded-2xl flex items-center justify-center z-10',
                        'transition-all duration-200 active:scale-95',
                        isListening
                            ? 'bg-red-500 shadow-lg shadow-red-500/40'
                            : 'bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg shadow-green-500/40',
                    )}
                >
                    {isListening && (
                        <span className="absolute inset-0 rounded-2xl animate-ping bg-red-400/40 pointer-events-none" />
                    )}
                    {isListening
                        ? <MicOff className="h-5 w-5 text-white relative z-10" />
                        : <Mic className="h-5 w-5 text-white relative z-10" />}
                </button>
            )}
        </div>
    );
}
