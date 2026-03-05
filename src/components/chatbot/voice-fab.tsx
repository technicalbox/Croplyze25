'use client';

/**
 * @fileOverview Floating Action Button for Voice Assistant mode.
 * Large mic icon that opens the VoiceAssistantModal.
 * Positioned just above the existing Chat FAB.
 */

import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { Mic } from 'lucide-react';

interface VoiceFabProps {
    onClick: () => void;
    isHidden?: boolean;
}

export default function VoiceFab({ onClick, isHidden }: VoiceFabProps) {
    if (isHidden) return null;

    return (
        <div className="fixed bottom-36 right-4 z-40">
            <button
                id="voice-fab"
                onClick={() => { haptics.medium(); onClick(); }}
                aria-label="Open Voice Assistant"
                className={cn(
                    'relative w-14 h-14 rounded-2xl',
                    'bg-gradient-to-br from-amber-400 to-orange-500',
                    'flex items-center justify-center',
                    'shadow-lg shadow-orange-500/40',
                    'active:scale-95 transition-transform duration-150',
                    'overflow-visible',
                )}
            >
                {/* Gentle pulse */}
                <span className="absolute inset-0 rounded-2xl animate-ping bg-orange-400/20 pointer-events-none" style={{ animationDuration: '2s' }} />
                {/* Shimmer */}
                <span className="absolute inset-0 bg-white/10 rounded-2xl pointer-events-none" />

                <Mic className="h-6 w-6 text-white relative z-10" />
            </button>

            {/* Label badge */}
            <span
                className={cn(
                    'absolute -top-2 -left-2',
                    'px-1.5 py-0.5 rounded-full',
                    'bg-orange-600 text-white',
                    'text-[9px] font-bold',
                    'border-2 border-white dark:border-[#062C21]',
                    'shadow-md shadow-orange-700/40',
                    'pointer-events-none select-none',
                )}
            >
                🎤
            </span>
        </div>
    );
}
