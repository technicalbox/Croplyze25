'use client';

/**
 * @fileOverview Results panel for the Harvest Optimizer.
 * 5 collapsible sections: Harvest Window, Readiness Signs,
 * Yield Tips, Storage Advice, Market Timing.
 * Plus a stat strip and quick summary.
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import {
    RotateCcw, ChevronDown, ChevronUp,
    Calendar, Eye, Hand, Wind, TrendingUp,
    Package, DollarSign, Tractor, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import type { HarvestOptimizerRecord } from '@/farming-partner/harvest-optimizer-service';

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
    icon: Icon, title, badge, accentClass = 'text-amber-600 bg-amber-500/10',
    children,
}: {
    icon: React.ElementType; title: string; badge?: string;
    accentClass?: string; children: React.ReactNode;
}) {
    const [open, setOpen] = useState(true);
    return (
        <div className="border border-border rounded-xl overflow-hidden">
            <button
                type="button"
                onClick={() => { haptics.light(); setOpen(o => !o); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-3 active:bg-muted/50 transition-colors"
            >
                <div className={cn('flex items-center justify-center w-7 h-7 rounded-lg shrink-0', accentClass)}>
                    <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-bold flex-1 text-left">{title}</span>
                {badge && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{badge}</span>}
                {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
            {open && (
                <div className="animate-in slide-in-from-top-1 duration-150">
                    <Separator />
                    <div className="p-3.5">{children}</div>
                </div>
            )}
        </div>
    );
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-muted/40 rounded-xl px-3 py-2.5 flex flex-col gap-0.5">
            <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
            <p className="text-sm font-bold truncate">{value}</p>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props { record: HarvestOptimizerRecord; onReset: () => void; }

export default function OptimizerResults({ record, onReset }: Props) {
    const { input, output: o } = record;

    const crop = `${input.cropType}${input.variety ? ` (${input.variety})` : ''}`;
    const marketLabel = { local: 'Local', wholesale: 'Wholesale', export: 'Export', processing: 'Processing' }[input.targetMarket];

    return (
        <div className="flex flex-col gap-5 animate-in fade-in-0 duration-400">

            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <h2 className="text-base font-bold capitalize">{crop} Harvest Report</h2>
                    <p className="text-xs text-muted-foreground truncate">{input.region} · {marketLabel} market · {input.farmSizeAcres} acres</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { haptics.light(); onReset(); }} className="rounded-xl h-9 text-xs gap-1.5 shrink-0">
                    <RotateCcw className="h-3.5 w-3.5" /> New
                </Button>
            </div>

            {/* Quick summary */}
            {o.quickSummary && (
                <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl px-4 py-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">{o.quickSummary}</p>
                </div>
            )}

            {/* Stat strip */}
            <div className="grid grid-cols-2 gap-2">
                <Stat label="Yield/Acre" value={`${o.estimatedYieldKgPerAcre.toLocaleString()} kg`} />
                <Stat label="Total Yield" value={`${o.totalEstimatedYieldKg.toLocaleString()} kg`} />
                <Stat label="Market Score" value={`${o.marketReadinessScore}/10`} />
                <Stat label="Price Range" value={`${o.marketPriceRangeMin}–${o.marketPriceRangeMax} ${o.marketPriceCurrency}/kg`} />
            </div>

            {/* ── 1. Best Harvest Window ── */}
            <Section icon={Calendar} title="Best Harvest Window" badge={`${o.harvestWindowStart} → ${o.harvestWindowEnd}`} accentClass="text-amber-600 bg-amber-500/10">
                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2">
                        <Stat label="Window Start" value={o.harvestWindowStart} />
                        <Stat label="Window End" value={o.harvestWindowEnd} />
                        <Stat label="Best Time" value={o.idealTimeOfDay} />
                        <Stat label="Method" value={o.harvestMethod.split(' ')[0]} />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-amber-500/40 pl-2">
                        {o.harvestWindowReasoning}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        <span className="font-semibold">Method:</span> {o.harvestMethod}
                    </p>
                </div>
            </Section>

            {/* ── 2. Readiness Signs ── */}
            <Section icon={Eye} title="Readiness Signs" accentClass="text-green-600 bg-green-500/10">
                <div className="flex flex-col gap-3">
                    {[
                        { label: '👁 Visual', items: o.readinessVisual },
                        { label: '✋ Tactile', items: o.readinessTactile },
                        { label: '👃 Aroma', items: o.readinessAroma },
                    ].map(({ label, items }) => (
                        <div key={label}>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
                            <ul className="flex flex-col gap-1">
                                {items.map((s, i) => (
                                    <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-green-500 shrink-0" />{s}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                    <div className="bg-green-500/5 border border-green-500/15 rounded-lg px-3 py-2">
                        <p className="text-xs font-semibold text-green-700">Maturity Index</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{o.maturityIndex}</p>
                    </div>
                </div>
            </Section>

            {/* ── 3. Yield Improvement Tips ── */}
            <Section icon={TrendingUp} title="Yield Improvement Tips" badge={`${o.yieldTips.length} tips`} accentClass="text-blue-600 bg-blue-500/10">
                <div className="flex flex-col gap-3">
                    {o.yieldTips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 text-[10px] font-bold shrink-0 mt-0.5">
                                {i + 1}
                            </div>
                            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                <p className="text-xs font-semibold">{tip.action}</p>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] text-muted-foreground">⏰ {tip.timing}</span>
                                    <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-500/30 bg-blue-500/5 px-1.5 py-0">
                                        +{tip.expectedGainPercent}% gain
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* ── 4. Storage Advice ── */}
            <Section icon={Package} title="Storage Advice" badge={`${o.storageShelfLifeDays}d shelf life`} accentClass="text-violet-600 bg-violet-500/10">
                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2">
                        <Stat label="Temperature" value={o.storageTemperature} />
                        <Stat label="Humidity" value={o.storageHumidity} />
                        <Stat label="Shelf Life" value={`${o.storageShelfLifeDays} days`} />
                        <Stat label="Packaging" value={o.storagePackaging.split(' ').slice(0, 3).join(' ')} />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        <span className="font-semibold">Packaging:</span> {o.storagePackaging}
                    </p>
                    {o.storageCommonMistakes.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-destructive mb-1.5">⚠ Common Mistakes to Avoid</p>
                            <ul className="flex flex-col gap-1">
                                {o.storageCommonMistakes.map((m, i) => (
                                    <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-orange-500 shrink-0" />{m}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {o.storageNotes && (
                        <p className="text-xs text-muted-foreground border-l-2 border-violet-500/40 pl-2">{o.storageNotes}</p>
                    )}
                </div>
            </Section>

            {/* ── 5. Market Timing ── */}
            <Section icon={DollarSign} title="Market Timing" badge={marketLabel} accentClass="text-emerald-600 bg-emerald-500/10">
                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2">
                        <Stat label="Peak Period" value={`${o.marketPeakWindowStart}`} />
                        <Stat label="Peak End" value={`${o.marketPeakWindowEnd}`} />
                        <Stat label="Price Min" value={`${o.marketPriceRangeMin} ${o.marketPriceCurrency}/kg`} />
                        <Stat label="Price Max" value={`${o.marketPriceRangeMax} ${o.marketPriceCurrency}/kg`} />
                    </div>
                    <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg px-3 py-2.5">
                        <p className="text-xs font-semibold text-emerald-700 mb-0.5">Recommended Strategy</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{o.marketStrategy}</p>
                    </div>
                    {o.marketTips.length > 0 && (
                        <ul className="flex flex-col gap-1.5">
                            {o.marketTips.map((tip, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                    <span className="text-emerald-500 shrink-0 mt-0.5">•</span>{tip}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </Section>

            <Button variant="outline" onClick={() => { haptics.light(); onReset(); }} className="w-full rounded-xl h-12 font-semibold gap-2">
                <RotateCcw className="h-4 w-4" /> Generate New Report
            </Button>
        </div>
    );
}
