'use client';

import { cn } from '@/lib/utils';
import { Sparkles, ArrowRight, IndianRupee, TrendingUp } from 'lucide-react';
import type { TreatmentOutcomePredictorOutput } from '@/ai/flows/treatment-outcome-predictor-flow';

type Alternative = TreatmentOutcomePredictorOutput['alternatives'][number];

interface AlternativeSuggestionsProps {
    alternatives: Alternative[];
    currentScore: number;
}

function getScoreBadge(score: number) {
    if (score >= 70) return { color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', label: 'High' };
    if (score >= 40) return { color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', label: 'Moderate' };
    return { color: 'bg-red-500/15 text-red-600 dark:text-red-400', label: 'Low' };
}

export default function AlternativeSuggestions({
    alternatives,
    currentScore,
}: AlternativeSuggestionsProps) {
    if (!alternatives || alternatives.length === 0) return null;

    const hasBetter = alternatives.some(a => a.suitabilityScore > currentScore);

    return (
        <div className="space-y-3 animate-slide-up-fade delay-150">
            {/* Section header */}
            <div className="flex items-center gap-2">
                {hasBetter ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <Sparkles className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Better Alternative Found</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="text-sm font-bold text-foreground">Other Options</span>
                    </div>
                )}
            </div>

            {/* Alternative cards */}
            {alternatives.map((alt, i) => {
                const isBetter = alt.suitabilityScore > currentScore;
                const badge = getScoreBadge(alt.suitabilityScore);
                const scoreDiff = alt.suitabilityScore - currentScore;

                return (
                    <div
                        key={i}
                        className={cn(
                            'relative rounded-2xl border overflow-hidden transition-all',
                            isBetter
                                ? 'border-emerald-500/30 bg-emerald-500/5 shadow-sm shadow-emerald-500/10'
                                : 'border-border bg-card',
                        )}
                    >
                        {isBetter && (
                            <div className="absolute top-0 right-0 px-2.5 py-1 rounded-bl-xl bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider">
                                Recommended
                            </div>
                        )}

                        <div className="p-4">
                            {/* Name + score */}
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-bold text-foreground">{alt.name}</h4>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">{alt.activeIngredient}</p>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className={cn('text-lg font-bold', isBetter ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground')}>
                                        {alt.suitabilityScore}%
                                    </span>
                                    {scoreDiff !== 0 && (
                                        <span className={cn(
                                            'text-[10px] font-bold',
                                            scoreDiff > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
                                        )}>
                                            {scoreDiff > 0 ? '+' : ''}{scoreDiff}% vs current
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Comparison bar */}
                            <div className="mb-3">
                                <div className="h-2 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className={cn(
                                            'h-full rounded-full transition-all duration-700',
                                            alt.suitabilityScore >= 70 ? 'bg-emerald-500' : alt.suitabilityScore >= 40 ? 'bg-amber-500' : 'bg-red-500',
                                        )}
                                        style={{ width: `${alt.suitabilityScore}%` }}
                                    />
                                </div>
                            </div>

                            {/* Details grid */}
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <div className="flex items-center gap-1.5">
                                    <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">{alt.costEfficiency}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">{alt.effectivenessComparison}</span>
                                </div>
                            </div>

                            {/* Reason */}
                            <p className="text-xs text-muted-foreground leading-relaxed">{alt.reason}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
