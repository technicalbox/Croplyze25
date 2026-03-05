'use client';

import React from 'react';
import {
    ArrowLeft, Droplets, TrendingUp, Bug, Layers, Sprout,
    BookmarkCheck, Bookmark, Sparkles, ShieldCheck, Leaf,
    Sun, FileText, FlaskConical, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import type { CropCombination } from '@/types/crop-combination';

// ── Colors ────────────────────────────────────────────────────────────────────

const TYPE_GRADIENT: Record<string, string> = {
    intercropping: 'from-emerald-600 to-teal-700',
    companion: 'from-blue-600 to-indigo-700',
    relay: 'from-amber-600 to-orange-700',
    mixed: 'from-violet-600 to-purple-700',
};

const TYPE_LABELS: Record<string, string> = {
    intercropping: 'Intercropping',
    companion: 'Companion Planting',
    relay: 'Relay Cropping',
    mixed: 'Mixed Cropping',
};

const SEASON_COLORS: Record<string, string> = {
    kharif: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    rabi: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    zaid: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
};

// ── InfoCard sub-component ────────────────────────────────────────────────────

function InfoCard({
    icon: Icon,
    title,
    children,
    iconColor,
}: {
    icon: React.ElementType;
    title: string;
    children: React.ReactNode;
    iconColor: string;
}) {
    return (
        <div className="rounded-2xl border border-border/60 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/40 dark:border-white/5">
                <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', iconColor)}>
                    <Icon className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-sm font-bold text-foreground">{title}</h3>
            </div>
            <div className="px-4 py-3">
                {children}
            </div>
        </div>
    );
}

// ── Props ────────────────────────────────────────────────────────────────────

interface CropCombinationDetailProps {
    combination: CropCombination;
    isSaved: boolean;
    onSave: (id: string) => void;
    onUnsave: (id: string) => void;
    onBack: () => void;
    onAskAI?: (prompt: string) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CropCombinationDetail({
    combination: c,
    isSaved,
    onSave,
    onUnsave,
    onBack,
    onAskAI,
}: CropCombinationDetailProps) {
    const gradient = TYPE_GRADIENT[c.type] ?? TYPE_GRADIENT.companion;

    return (
        <div className="flex flex-col gap-4">
            {/* ── Hero Card ─────────────────────────────────────────────── */}
            <div className={cn(
                'relative rounded-3xl overflow-hidden text-white p-5',
                'bg-gradient-to-br', gradient,
                'shadow-xl',
            )}>
                {/* Background orbs */}
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/8 blur-2xl pointer-events-none" />

                {/* Back button + Bookmark */}
                <div className="relative flex items-center justify-between mb-4">
                    <button
                        onClick={() => { haptics.light(); onBack(); }}
                        className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-xs font-semibold">Back</span>
                    </button>
                    <button
                        onClick={() => {
                            haptics.medium();
                            isSaved ? onUnsave(c.id) : onSave(c.id);
                        }}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                            isSaved
                                ? 'bg-white/30 text-white'
                                : 'bg-white/15 text-white/80 hover:bg-white/25 hover:text-white',
                        )}
                    >
                        {isSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                        {isSaved ? 'Saved' : 'Save'}
                    </button>
                </div>

                {/* Crop pair display */}
                <div className="relative flex items-center gap-3 mb-3">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl">
                        {c.primaryCrop.emoji}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                        <span className="text-sm font-black">+</span>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl">
                        {c.companionCrop.emoji}
                    </div>
                </div>

                {/* Names */}
                <h2 className="text-xl font-bold leading-tight mb-0.5">
                    {c.primaryCrop.name} + {c.companionCrop.name}
                </h2>
                <p className="text-sm text-white/70 mb-3">{c.tagline}</p>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] font-bold bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {TYPE_LABELS[c.type] ?? c.type}
                    </span>
                    {c.seasons.map((s) => (
                        <span key={s} className="text-[10px] font-semibold bg-white/15 px-2.5 py-1 rounded-full capitalize">
                            {s}
                        </span>
                    ))}
                </div>
            </div>

            {/* ── Yield highlight ────────────────────────────────────────── */}
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 p-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                        +{c.yieldImprovementPct}% Yield Improvement
                    </p>
                    <p className="text-xs text-emerald-600/80 dark:text-emerald-400/70 leading-relaxed">
                        {c.yieldBenefit}
                    </p>
                </div>
            </div>

            {/* ── Benefits ──────────────────────────────────────────────── */}
            <InfoCard icon={Sparkles} title="Benefits" iconColor="bg-gradient-to-br from-primary to-emerald-600">
                <ul className="space-y-2">
                    {c.benefits.map((b, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-foreground/80 leading-relaxed">
                            <Leaf className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                            {b}
                        </li>
                    ))}
                </ul>
            </InfoCard>

            {/* ── Pest Reduction ─────────────────────────────────────────── */}
            <InfoCard icon={Bug} title="Pest Reduction" iconColor="bg-gradient-to-br from-rose-500 to-red-600">
                <ul className="space-y-2">
                    {c.pestReduction.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-foreground/80 leading-relaxed">
                            <ShieldCheck className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                            {p}
                        </li>
                    ))}
                </ul>
            </InfoCard>

            {/* ── Soil & Water ──────────────────────────────────────────── */}
            <InfoCard icon={Layers} title="Soil & Water" iconColor="bg-gradient-to-br from-amber-500 to-orange-600">
                <div className="space-y-3">
                    <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                            Compatible Soils
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {c.soilCompatibility.map((s) => (
                                <span
                                    key={s}
                                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 capitalize"
                                >
                                    {s}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-semibold text-foreground/80">
                            Water Requirement: <span className="font-bold text-foreground">{c.waterRequirement}</span>
                        </span>
                    </div>
                </div>
            </InfoCard>

            {/* ── Growing Guide ──────────────────────────────────────────── */}
            <InfoCard icon={Sprout} title="Growing Guide" iconColor="bg-gradient-to-br from-green-500 to-emerald-600">
                <p className="text-xs text-foreground/80 leading-relaxed">
                    {c.growingGuide}
                </p>
            </InfoCard>

            {/* ── Source ─────────────────────────────────────────────────── */}
            <InfoCard icon={FileText} title="Research Source" iconColor="bg-gradient-to-br from-slate-500 to-slate-700">
                <p className="text-xs text-muted-foreground leading-relaxed italic">
                    {c.source}
                </p>
            </InfoCard>

            {/* ── AI Assist Button ────────────────────────────────────────── */}
            {onAskAI && (
                <Button
                    onClick={() => {
                        haptics.medium();
                        onAskAI(
                            `I want to grow ${c.primaryCrop.name} with ${c.companionCrop.name} together in my field. ` +
                            `Give me a detailed step-by-step plan including soil preparation, sowing schedule, ` +
                            `irrigation, fertilizer, pest management, and expected harvest timeline. ` +
                            `Consider Indian farming conditions.`
                        );
                    }}
                    className={cn(
                        'w-full h-12 rounded-2xl font-bold shadow-lg transition-all duration-200 active:scale-[0.98]',
                        'bg-gradient-to-r from-primary to-emerald-700 hover:from-primary/90 hover:to-emerald-800 text-white shadow-primary/20',
                    )}
                >
                    <FlaskConical className="w-4 h-4 mr-2" />
                    Ask AI for Detailed Plan
                </Button>
            )}
        </div>
    );
}
