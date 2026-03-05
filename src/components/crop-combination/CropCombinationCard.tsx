'use client';

import React from 'react';
import {
    Droplets, Sprout, Bug, TrendingUp, ChevronRight,
    Bookmark, BookmarkCheck, Layers, Sun
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import type { CropCombination } from '@/types/crop-combination';

// ── Season & Soil badge helpers ─────────────────────────────────────────────

const SEASON_COLORS: Record<string, string> = {
    kharif: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    rabi: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
    zaid: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/20',
};

const TYPE_COLORS: Record<string, string> = {
    intercropping: 'from-emerald-500 to-teal-600',
    companion: 'from-blue-500 to-indigo-600',
    relay: 'from-amber-500 to-orange-600',
    mixed: 'from-violet-500 to-purple-600',
};

const TYPE_LABELS: Record<string, string> = {
    intercropping: 'Intercropping',
    companion: 'Companion',
    relay: 'Relay Crop',
    mixed: 'Mixed Crop',
};

// ── Props ────────────────────────────────────────────────────────────────────

interface CropCombinationCardProps {
    combination: CropCombination;
    isSaved?: boolean;
    onSave?: (id: string) => void;
    onUnsave?: (id: string) => void;
    onView: (id: string) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CropCombinationCard({
    combination: c,
    isSaved = false,
    onSave,
    onUnsave,
    onView,
}: CropCombinationCardProps) {
    return (
        <div
            onClick={() => { haptics.light(); onView(c.id); }}
            className={cn(
                'group relative rounded-2xl overflow-hidden cursor-pointer',
                'bg-white/80 dark:bg-white/5 backdrop-blur-xl',
                'border border-white/20 dark:border-white/10',
                'shadow-[0_4px_24px_rgb(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgb(0,0,0,0.2)]',
                'hover:shadow-lg hover:border-primary/20 dark:hover:border-primary/30',
                'active:scale-[0.98] transition-all duration-200',
            )}
        >
            {/* ── Top gradient accent ── */}
            <div className={cn(
                'h-1.5 w-full bg-gradient-to-r',
                TYPE_COLORS[c.type] ?? TYPE_COLORS.companion,
            )} />

            <div className="p-4 flex flex-col gap-3">
                {/* ── Header: Crop pair with emojis ── */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Primary crop */}
                        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/20 text-2xl flex-shrink-0">
                            {c.primaryCrop.emoji}
                        </div>

                        {/* Plus connector */}
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 flex-shrink-0">
                            <span className="text-xs font-black text-primary">+</span>
                        </div>

                        {/* Companion crop */}
                        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 text-2xl flex-shrink-0">
                            {c.companionCrop.emoji}
                        </div>

                        {/* Names */}
                        <div className="ml-1 flex-1 min-w-0">
                            <p className="text-sm font-bold leading-tight truncate text-foreground">
                                {c.primaryCrop.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                + {c.companionCrop.name}
                            </p>
                        </div>
                    </div>

                    {/* Bookmark button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            haptics.medium();
                            if (isSaved) {
                                onUnsave?.(c.id);
                            } else {
                                onSave?.(c.id);
                            }
                        }}
                        className={cn(
                            'p-2 rounded-xl transition-all duration-200 flex-shrink-0',
                            isSaved
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                    >
                        {isSaved
                            ? <BookmarkCheck className="w-4 h-4" />
                            : <Bookmark className="w-4 h-4" />
                        }
                    </button>
                </div>

                {/* ── Tagline ── */}
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {c.tagline}
                </p>

                {/* ── Quick stats row ── */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Droplets className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        <span className="truncate">{c.waterRequirement}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span className="truncate">+{c.yieldImprovementPct}%</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Bug className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                        <span className="truncate">{c.pestReduction.length} benefits</span>
                    </div>
                </div>

                {/* ── Season + Type badges ── */}
                <div className="flex flex-wrap items-center gap-1.5">
                    {/* Type badge */}
                    <span className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-gradient-to-r',
                        TYPE_COLORS[c.type] ?? TYPE_COLORS.companion,
                    )}>
                        {TYPE_LABELS[c.type] ?? c.type}
                    </span>

                    {/* Season badges */}
                    {c.seasons.map((s) => (
                        <span
                            key={s}
                            className={cn(
                                'text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize',
                                SEASON_COLORS[s] ?? SEASON_COLORS.kharif,
                            )}
                        >
                            {s}
                        </span>
                    ))}
                </div>

                {/* ── View details CTA ── */}
                <div className="flex items-center justify-between pt-1 border-t border-border/50 dark:border-white/5">
                    <span className="text-[11px] font-semibold text-primary group-hover:text-primary/80 transition-colors">
                        View Details
                    </span>
                    <ChevronRight className="w-4 h-4 text-primary/60 group-hover:translate-x-0.5 transition-transform" />
                </div>
            </div>
        </div>
    );
}
