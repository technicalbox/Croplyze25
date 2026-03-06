'use client';

import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useChatbot } from './chat-provider';
import { Sparkles } from 'lucide-react';

export default function ChatFab() {
    const { openChat, isOpen, messages } = useChatbot();

    // Count only model responses as a "session active" indicator
    const hasSession = messages.length > 0;

    if (isOpen) return null;

    return (
        // Wrapper: overflow-visible so badge is never clipped
        <div className="fixed bottom-20 right-4 z-40">
            <button
                suppressHydrationWarning
                id="chat-fab"
                onClick={() => { haptics.medium(); openChat(); }}
                aria-label="Open Fasal AI chat"
                className={cn(
                    'relative w-14 h-14 rounded-2xl',
                    'bg-gradient-to-br from-green-400 to-emerald-600',
                    'flex items-center justify-center',
                    'shadow-lg shadow-green-500/40',
                    'active:scale-95 transition-transform duration-150',
                    'overflow-visible',          // ← never clip the badge
                )}
            >
                {/* Glow pulse ring — separate span so it doesn't cause overflow issues */}
                <span className="absolute inset-0 rounded-2xl animate-ping bg-green-400/25 pointer-events-none" />
                {/* Subtle shimmer */}
                <span className="absolute inset-0 bg-white/10 rounded-2xl pointer-events-none" />

                <Sparkles className="h-6 w-6 text-white relative z-10" />
            </button>

            {/* Badge sits OUTSIDE the button so it can never be clipped */}
            {hasSession && (
                <span
                    className={cn(
                        'absolute -top-2 -right-2',
                        'min-w-[20px] h-5 px-1 rounded-full',              // min-w so text never gets cut
                        'bg-green-600 text-white',                          // green instead of jarring red
                        'text-[10px] font-bold',
                        'flex items-center justify-center',
                        'border-2 border-white dark:border-[#062C21]',     // crisp ring
                        'shadow-md shadow-green-700/40',
                        'pointer-events-none select-none',
                    )}
                >
                    AI
                </span>
            )}
        </div>
    );
}
