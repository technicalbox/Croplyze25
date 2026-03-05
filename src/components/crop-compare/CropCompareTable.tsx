'use client';

import React from 'react';
import {
    Clock, Droplets, Layers, Sun, ShieldAlert, TrendingUp,
    Package, IndianRupee, Gauge, Crown, Sparkles, Trophy, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';
import { useRegion } from '@/providers/region-provider';
import { useChatbot } from '@/components/chatbot/chat-provider';
import { CROP_DEFAULTS } from '@/farming-partner/profit-predictor-types';
import type { CropDocument, CropType } from '@/types/crop';

// ── Derived helpers ──────────────────────────────────────────────────────────

function getDifficultyLevel(crop: CropDocument): 'Easy' | 'Medium' | 'Hard' {
    const riskCount = crop.diseaseRisks?.length ?? 0;
    const water = crop.waterNeeds;
    if (riskCount >= 4 || water === 'High') return 'Hard';
    if (riskCount >= 2 || water === 'Medium') return 'Medium';
    return 'Easy';
}

function getRiskLevel(crop: CropDocument): 'Low' | 'Medium' | 'High' {
    const risks = crop.diseaseRisks ?? [];
    const criticalOrHigh = risks.filter(
        (r) => r.severity === 'Critical' || r.severity === 'High'
    ).length;
    if (criticalOrHigh >= 2) return 'High';
    if (criticalOrHigh >= 1 || risks.length >= 3) return 'Medium';
    return 'Low';
}

function getEstYield(crop: CropDocument): number {
    const defaults = CROP_DEFAULTS[crop.cropType as CropType];
    return defaults?.yieldPerAcre ?? 15;
}

function getEstProfit(crop: CropDocument): number {
    const defaults = CROP_DEFAULTS[crop.cropType as CropType];
    if (!defaults) return 0;
    return defaults.yieldPerAcre * defaults.pricePerUnit;
}

function formatCurrency(n: number): string {
    if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
    return `₹${n.toFixed(0)}`;
}

function getCurrentSeason(): string {
    const month = new Date().getMonth(); // 0-11
    if (month >= 5 && month <= 9) return 'Kharif';
    if (month >= 10 || month <= 1) return 'Rabi';
    return 'Zaid';
}

// Compute a simple composite score for "best for your region"
function getCompositeScore(crop: CropDocument): number {
    let score = 0;
    // Market demand
    if (crop.marketDemandLevel === 'high') score += 3;
    else if (crop.marketDemandLevel === 'medium') score += 2;
    else score += 1;
    // Risk (inverse)
    const risk = getRiskLevel(crop);
    if (risk === 'Low') score += 3;
    else if (risk === 'Medium') score += 2;
    else score += 1;
    // Season match
    const season = getCurrentSeason();
    if (crop.seasonBest?.some((s) => s.toLowerCase().includes(season.toLowerCase()))) score += 2;
    // Profit potential
    score += Math.min(getEstProfit(crop) / 50000, 3); // normalized 0-3
    return score;
}

// ── Highlight helpers ────────────────────────────────────────────────────────

type HighlightType = 'best' | 'worst' | 'neutral';

function clsHighlight(type: HighlightType): string {
    if (type === 'best') return 'text-emerald-600 dark:text-emerald-400 font-bold';
    if (type === 'worst') return 'text-red-500 font-bold';
    return 'text-foreground';
}

function bgHighlight(type: HighlightType): string {
    if (type === 'best') return 'bg-emerald-50 dark:bg-emerald-950/20';
    if (type === 'worst') return 'bg-red-50 dark:bg-red-950/20';
    return '';
}

// ── MetricRow ────────────────────────────────────────────────────────────────

interface MetricRowProps {
    icon: React.ElementType;
    label: string;
    values: { text: string; highlight: HighlightType }[];
}

function MetricRow({ icon: Icon, label, values }: MetricRowProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center border-b border-border dark:border-white/5 last:border-b-0">
            {/* Label */}
            <div className="flex items-center gap-2 px-3 py-2.5 sm:w-[140px] sm:shrink-0 sm:border-r sm:border-border sm:dark:border-white/5">
                <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
            </div>
            {/* Values */}
            <div className="flex flex-1">
                {values.map((v, i) => (
                    <div
                        key={i}
                        className={`flex-1 px-3 py-2.5 text-sm font-semibold text-center ${clsHighlight(v.highlight)} ${bgHighlight(v.highlight)} ${i > 0 ? 'border-l border-border dark:border-white/5' : ''}`}
                    >
                        {v.text}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Main Component ───────────────────────────────────────────────────────────

interface CropCompareTableProps {
    crops: CropDocument[];
}

export default function CropCompareTable({ crops }: CropCompareTableProps) {
    const { region, hasRegion } = useRegion();
    const { openChatWithMessage } = useChatbot();

    // Find best crop index
    const scores = crops.map(getCompositeScore);
    const bestIdx = scores.indexOf(Math.max(...scores));

    // Rank crops by score (descending) for the Crop Priority section
    const rankedCrops = crops
        .map((crop, idx) => ({ crop, score: scores[idx], originalIdx: idx }))
        .sort((a, b) => b.score - a.score);

    // ── Build metric rows ────────────────────────────────────────────────────

    // Harvest time (lower is better)
    const harvestDays = crops.map((c) => c.timeToHarvestDays ?? 0);
    const minHarvest = Math.min(...harvestDays.filter(Boolean));

    // Water (Low is best)
    const waterOrder = { Low: 1, Medium: 2, High: 3 };
    const waterValues = crops.map((c) => c.waterNeeds ?? 'Medium');
    const bestWater = Math.min(...waterValues.map((w) => waterOrder[w]));

    // Risk (Low is best)
    const risks = crops.map(getRiskLevel);
    const riskOrder = { Low: 1, Medium: 2, High: 3 };
    const bestRisk = Math.min(...risks.map((r) => riskOrder[r]));

    // Market demand (high is best)
    const demandOrder = { high: 3, medium: 2, low: 1 };
    const demands = crops.map((c) => c.marketDemandLevel ?? 'medium');
    const bestDemand = Math.max(...demands.map((d) => demandOrder[d]));

    // Yield (higher is better)
    const yields = crops.map(getEstYield);
    const maxYield = Math.max(...yields);

    // Profit (higher is better)
    const profits = crops.map(getEstProfit);
    const maxProfit = Math.max(...profits);

    // Difficulty (Easy is best)
    const difficulties = crops.map(getDifficultyLevel);
    const diffOrder = { Easy: 1, Medium: 2, Hard: 3 };
    const bestDiff = Math.min(...difficulties.map((d) => diffOrder[d]));

    // Season match
    const currentSeason = getCurrentSeason();

    // ── Suggest Best Crop ────────────────────────────────────────────────────

    const handleSuggest = () => {
        haptics.medium();
        const cropNames = crops.map((c) => c.commonNames?.en ?? c.id).join(', ');
        const regionStr = hasRegion
            ? [region.city, region.state, region.country].filter(Boolean).join(', ')
            : 'India';
        openChatWithMessage(
            `I'm comparing these crops: ${cropNames}. My region is ${regionStr}. Which one should I grow this ${currentSeason} season and why? Consider market demand, weather risks, disease risks, water needs, and profit potential. Give me a clear recommendation with reasons.`
        );
    };

    // ── Render ───────────────────────────────────────────────────────────────

    const getName = (c: CropDocument) => c.commonNames?.en ?? c.id;

    return (
        <div className="flex flex-col gap-4">
            {/* ── Crop headers ──────────────────────────────────────── */}
            <div className="rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-border dark:border-white/10 overflow-hidden">
                {/* Header row */}
                <div className="flex border-b border-border dark:border-white/5">
                    <div className="hidden sm:flex items-center px-3 py-3 w-[140px] shrink-0 border-r border-border dark:border-white/5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Metric</span>
                    </div>
                    {crops.map((crop, i) => (
                        <div
                            key={crop.id}
                            className={`flex-1 px-3 py-3 text-center ${i > 0 ? 'border-l border-border dark:border-white/5' : ''}`}
                        >
                            <p className="text-sm font-bold text-foreground leading-tight">
                                {getName(crop)}
                            </p>
                            <p className="text-[10px] text-muted-foreground italic mt-0.5">{crop.cropType}</p>
                            {i === bestIdx && (
                                <span className="inline-flex items-center gap-1 mt-1.5 text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                                    <Crown className="w-3 h-3" /> Best Pick
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                {/* ── Metric rows ──────────────────────────────────────── */}
                <MetricRow
                    icon={Clock}
                    label="Harvest"
                    values={harvestDays.map((d) => ({
                        text: `${d} days`,
                        highlight: d === minHarvest && d > 0 ? 'best' : 'neutral' as HighlightType,
                    }))}
                />
                <MetricRow
                    icon={Droplets}
                    label="Water"
                    values={waterValues.map((w) => ({
                        text: w,
                        highlight: waterOrder[w] === bestWater ? 'best' : w === 'High' ? 'worst' : 'neutral' as HighlightType,
                    }))}
                />
                <MetricRow
                    icon={Layers}
                    label="Best Soil"
                    values={crops.map((c) => ({
                        text: (c.soilBest ?? []).slice(0, 2).join(', ') || '—',
                        highlight: 'neutral' as HighlightType,
                    }))}
                />
                <MetricRow
                    icon={Sun}
                    label="Season"
                    values={crops.map((c) => {
                        const seasons = c.seasonBest ?? [];
                        const matchesCurrent = seasons.some((s) =>
                            s.toLowerCase().includes(currentSeason.toLowerCase())
                        );
                        return {
                            text: seasons.slice(0, 2).join(', ') || '—',
                            highlight: matchesCurrent ? 'best' : 'neutral' as HighlightType,
                        };
                    })}
                />
                <MetricRow
                    icon={ShieldAlert}
                    label="Risk"
                    values={risks.map((r) => ({
                        text: r,
                        highlight: riskOrder[r] === bestRisk ? 'best' : r === 'High' ? 'worst' : 'neutral' as HighlightType,
                    }))}
                />
                <MetricRow
                    icon={TrendingUp}
                    label="Demand"
                    values={demands.map((d) => ({
                        text: d.charAt(0).toUpperCase() + d.slice(1),
                        highlight: demandOrder[d] === bestDemand ? 'best' : d === 'low' ? 'worst' : 'neutral' as HighlightType,
                    }))}
                />
                <MetricRow
                    icon={Package}
                    label="Yield"
                    values={yields.map((y) => ({
                        text: `${y} qtl/acre`,
                        highlight: y === maxYield ? 'best' : 'neutral' as HighlightType,
                    }))}
                />
                <MetricRow
                    icon={IndianRupee}
                    label="Profit"
                    values={profits.map((p) => ({
                        text: `${formatCurrency(p)}/acre`,
                        highlight: p === maxProfit ? 'best' : 'neutral' as HighlightType,
                    }))}
                />
                <MetricRow
                    icon={Gauge}
                    label="Difficulty"
                    values={difficulties.map((d) => ({
                        text: d,
                        highlight: diffOrder[d] === bestDiff ? 'best' : d === 'Hard' ? 'worst' : 'neutral' as HighlightType,
                    }))}
                />
            </div>

            {/* ── Crop Priority Section ────────────────────────────── */}
            <div className="rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-border dark:border-white/10 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border dark:border-white/5">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-bold text-foreground">Crop Priority</h3>
                </div>
                <div className="flex flex-col divide-y divide-border dark:divide-white/5">
                    {rankedCrops.map((item, rank) => {
                        const cropName = getName(item.crop);
                        const scorePercent = Math.round((item.score / 14) * 100); // max theoretical score ~14
                        const isTop = rank === 0;
                        return (
                            <div
                                key={item.crop.id}
                                className={`flex items-center gap-3 px-4 py-3 ${isTop ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : ''}`}
                            >
                                {/* Rank badge */}
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${isTop
                                        ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm shadow-amber-500/30'
                                        : 'bg-gray-100 dark:bg-white/10 text-muted-foreground'
                                    }`}>
                                    {rank + 1}
                                </div>
                                {/* Crop name & type */}
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold truncate ${isTop ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'}`}>
                                        {cropName}
                                        {isTop && (
                                            <span className="ml-2 text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full align-middle">
                                                Most Suitable
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground italic">{item.crop.cropType}</p>
                                </div>
                                {/* Score */}
                                <div className="flex flex-col items-end shrink-0">
                                    <span className={`text-sm font-bold tabular-nums ${isTop ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                                        {scorePercent}%
                                    </span>
                                    <span className="text-[9px] text-muted-foreground">suitability</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {/* Note */}
                <div className="flex items-start gap-2 px-4 py-2.5 bg-blue-50/50 dark:bg-blue-950/10 border-t border-border dark:border-white/5">
                    <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Note: Crops are ranked by suitability score. Farmers can choose any crop from the list based on priority.
                    </p>
                </div>
            </div>

            {/* ── Suggest Best Crop ────────────────────────────────── */}
            <Button
                onClick={handleSuggest}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white font-bold shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-transform duration-150"
            >
                <Sparkles className="w-4 h-4 mr-2" /> Suggest Best Crop
            </Button>
        </div>
    );
}
