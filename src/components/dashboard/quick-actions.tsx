'use client';

/**
 * @fileOverview Quick action pill buttons for the Home dashboard.
 * Four horizontal scrollable pills: Scan, Ask AI, Crop Planner, Growth Timeline.
 */

import Link from 'next/link';
import { ScanLine, Sparkles, Wheat, CalendarDays, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useChatbot } from '@/components/chatbot/chat-provider';

const staticActions = [
    {
        id: 'crops',
        label: 'Crop DB',
        icon: BookOpen,
        href: '/crops',
        gradient: 'from-orange-500 to-amber-600',
        shadow: 'shadow-orange-500/25',
    },
    {
        id: 'scan',
        label: 'Scan Crop',
        icon: ScanLine,
        href: '/scan',
        gradient: 'from-emerald-500 to-green-600',
        shadow: 'shadow-green-500/25',
    },
    {
        id: 'planner',
        label: 'Crop Planner',
        icon: Wheat,
        href: '/farming-partner/crop-success-planner',
        gradient: 'from-primary to-emerald-700',
        shadow: 'shadow-primary/25',
    },
    {
        id: 'timeline',
        label: 'Growth Plan',
        icon: CalendarDays,
        href: '/growth-timeline',
        gradient: 'from-teal-500 to-cyan-600',
        shadow: 'shadow-teal-500/25',
    },
];

export default function QuickActions() {
    const { openChat } = useChatbot();

    return (
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
            {/* Ask AI — triggers chat modal, not a link */}
            <button
                onClick={() => { haptics.medium(); openChat(); }}
                className={cn(
                    'flex-none flex items-center gap-2 px-4 py-2.5 rounded-2xl',
                    'bg-gradient-to-r from-violet-500 to-purple-600',
                    'shadow-md shadow-violet-500/25',
                    'text-white text-sm font-semibold whitespace-nowrap',
                    'active:scale-95 transition-transform duration-150',
                )}
            >
                <Sparkles className="h-4 w-4 flex-none" />
                Ask Fasal AI
            </button>

            {staticActions.map(action => (
                <Link
                    key={action.id}
                    href={action.href}
                    onClick={() => haptics.light()}
                    className={cn(
                        'flex-none flex items-center gap-2 px-4 py-2.5 rounded-2xl',
                        'bg-gradient-to-r', action.gradient,
                        'shadow-md', action.shadow,
                        'text-white text-sm font-semibold whitespace-nowrap',
                        'active:scale-95 transition-transform duration-150',
                    )}
                >
                    <action.icon className="h-4 w-4 flex-none" />
                    {action.label}
                </Link>
            ))}
        </div>
    );
}
