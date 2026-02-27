'use client';

import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useChatbot } from './chat-provider';
import { Sparkles, MessageCircle } from 'lucide-react';

export default function ChatFab() {
    const { openChat, isOpen, messages } = useChatbot();
    const unread = messages.filter(m => m.role === 'model').length;

    if (isOpen) return null;

    return (
        <button
            id="chat-fab"
            onClick={() => { haptics.medium(); openChat(); }}
            aria-label="Open Fasal AI chat"
            className={cn(
                'fixed bottom-20 right-4 z-40',
                'w-14 h-14 rounded-2xl',
                'bg-gradient-to-br from-green-400 to-emerald-600',
                'flex items-center justify-center',
                'shadow-lg shadow-green-500/40',
                'active:scale-95 transition-transform duration-150',
                'overflow-hidden',
            )}
        >
            {/* Glow pulse ring */}
            <span className="absolute inset-0 rounded-2xl animate-ping bg-green-400/30 pointer-events-none" />
            {/* Shimmer overlay */}
            <span className="absolute inset-0 bg-white/10 rounded-2xl" />
            <Sparkles className="h-6 w-6 text-white relative z-10" />

            {/* Badge */}
            {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-background z-20">
                    {unread > 9 ? '9+' : unread}
                </span>
            )}
        </button>
    );
}
