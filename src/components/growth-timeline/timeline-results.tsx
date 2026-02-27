'use client';

/**
 * @fileOverview Growth Timeline Results — displays the AI-generated week-by-week
 * plan as horizontally scrollable weekly cards, each expandable for full detail.
 */

import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import {
    RotateCcw, ChevronDown, ChevronUp,
    Droplets, Sprout, Bug, CloudRain,
    CheckSquare, AlertTriangle, ChevronLeft, ChevronRight,
    CalendarDays, Leaf, TrendingUp, Zap, Info,
} from 'lucide-react';
import type { GrowthTimelineRecord } from '@/farming-partner/growth-timeline-service';
import type { WeeklyEntry } from '@/ai/flows/farming-partner/growth-timeline-flow';

// ─── Colour maps ──────────────────────────────────────────────────────────────

const stageConfig: Record<string, { color: string; bg: string; dot: string }> = {
    'Pre-Planting': { color: 'text-violet-600', bg: 'bg-violet-500/10', dot: 'bg-violet-500' },
    Germination: { color: 'text-green-600', bg: 'bg-green-500/10', dot: 'bg-green-500' },
    Seedling: { color: 'text-emerald-600', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
    Vegetative: { color: 'text-teal-600', bg: 'bg-teal-500/10', dot: 'bg-teal-500' },
    Reproductive: { color: 'text-yellow-600', bg: 'bg-yellow-500/10', dot: 'bg-yellow-500' },
    Maturation: { color: 'text-orange-600', bg: 'bg-orange-500/10', dot: 'bg-orange-500' },
    'Harvest Ready': { color: 'text-red-600', bg: 'bg-red-500/10', dot: 'bg-red-400' },
};

const urgencyColor = {
    Low: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
    Medium: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20',
    High: 'text-orange-600 bg-orange-500/10 border-orange-500/20',
    Critical: 'text-red-600 bg-red-500/10 border-red-500/20',
};

// ─── Week Summary Thumb card (horizontal strip) ────────────────────────────────

function WeekThumb({
    week, selected, onClick,
}: { week: WeeklyEntry; selected: boolean; onClick: () => void }) {
    const stage = stageConfig[week.growthStage] ?? stageConfig.Germination;
    return (
        <button
            type="button"
            onClick={() => { haptics.light(); onClick(); }}
            className={cn(
                'flex-shrink-0 w-24 flex flex-col gap-2 p-3 rounded-2xl border transition-all duration-200',
                selected
                    ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                    : 'bg-card border-border hover:border-primary/40 active:scale-95',
            )}
        >
            <div className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full self-start truncate max-w-full',
                selected ? 'bg-white/20 text-white' : cn(stage.bg, stage.color),
            )}>
                {week.growthStage.split(' ')[0]}
            </div>
            <div className={cn('text-xs font-black', selected ? 'text-white' : 'text-foreground')}>
                Wk {week.weekNumber}
            </div>
            <div className={cn('text-[10px] leading-tight', selected ? 'text-white/70' : 'text-muted-foreground')}>
                {week.daysRange}
            </div>
            {week.pestPrevention.isCriticalWeek && (
                <div className={cn('text-[9px] font-bold', selected ? 'text-yellow-200' : 'text-orange-500')}>
                    ⚠ High risk
                </div>
            )}
            {week.isEdited && (
                <div className={cn('text-[9px]', selected ? 'text-white/60' : 'text-muted-foreground')}>
                    ✏ Edited
                </div>
            )}
        </button>
    );
}

// ─── Section block inside week detail ────────────────────────────────────────

function DetailSection({
    icon: Icon, title, accent = 'primary', children, badge,
}: {
    icon: React.ElementType; title: string; accent?: 'primary' | 'blue' | 'emerald' | 'amber' | 'rose';
    children: React.ReactNode; badge?: string;
}) {
    const [open, setOpen] = useState(true);
    const accentMap = {
        primary: 'bg-primary/10 text-primary',
        blue: 'bg-blue-500/10 text-blue-600',
        emerald: 'bg-emerald-500/10 text-emerald-600',
        amber: 'bg-amber-500/10 text-amber-600',
        rose: 'bg-rose-500/10 text-rose-600',
    };
    return (
        <div className="border border-border rounded-xl overflow-hidden">
            <button
                type="button"
                onClick={() => { haptics.light(); setOpen(o => !o); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-3 active:bg-muted/50 transition-colors"
            >
                <div className={cn('flex items-center justify-center w-7 h-7 rounded-lg shrink-0', accentMap[accent])}>
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

// ─── Full week detail panel ────────────────────────────────────────────────────

function WeekDetail({ week }: { week: WeeklyEntry }) {
    const stage = stageConfig[week.growthStage] ?? stageConfig.Germination;

    return (
        <div className="flex flex-col gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-250">

            {/* Stage badge + dates */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', stage.bg, stage.color)}>
                    {week.growthStage}
                </span>
                <span className="text-xs text-muted-foreground">{week.daysRange}</span>
                {week.startDate && (
                    <span className="text-xs text-muted-foreground">· From {week.startDate}</span>
                )}
                {week.isEdited && (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">✏ Edited</span>
                )}
                {week.pestPrevention.isCriticalWeek && (
                    <span className="text-xs bg-orange-500/10 text-orange-600 border border-orange-500/20 px-2 py-0.5 rounded-full font-semibold">
                        ⚠ Critical pest week
                    </span>
                )}
            </div>

            {/* Watering */}
            <DetailSection icon={Droplets} title="Watering" accent="blue"
                badge={week.watering.frequencyPerWeek > 0 ? `${week.watering.frequencyPerWeek}×/week` : 'None'}>
                <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { label: 'Method', value: week.watering.method },
                            { label: 'Best time', value: week.watering.bestTimeOfDay },
                            { label: 'Volume', value: week.watering.litresPerAcrePerSession > 0 ? `${week.watering.litresPerAcrePerSession} L/ac` : 'N/A' },
                            { label: 'Frequency', value: `${week.watering.frequencyPerWeek}× per week` },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-muted/40 rounded-lg px-2.5 py-2">
                                <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
                                <p className="text-xs font-semibold mt-0.5">{value}</p>
                            </div>
                        ))}
                    </div>
                    {week.watering.note && (
                        <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-blue-500/40 pl-2">{week.watering.note}</p>
                    )}
                </div>
            </DetailSection>

            {/* Fertilizing */}
            <DetailSection icon={Leaf} title="Fertilizing" accent="emerald"
                badge={week.fertilizing.apply ? week.fertilizing.productName : 'Not this week'}>
                {week.fertilizing.apply ? (
                    <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { label: 'Product', value: week.fertilizing.productName },
                                { label: 'NPK', value: week.fertilizing.activeIngredients },
                                { label: 'Dose', value: week.fertilizing.dosePerAcre },
                                { label: 'Method', value: week.fertilizing.applicationMethod },
                            ].map(({ label, value }) => (
                                <div key={label} className="bg-muted/40 rounded-lg px-2.5 py-2">
                                    <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
                                    <p className="text-xs font-semibold mt-0.5">{value}</p>
                                </div>
                            ))}
                        </div>
                        {week.fertilizing.timing && (
                            <p className="text-xs text-muted-foreground">🕐 {week.fertilizing.timing}</p>
                        )}
                        {week.fertilizing.note && (
                            <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-emerald-500/40 pl-2">{week.fertilizing.note}</p>
                        )}
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground">{week.fertilizing.note || 'No fertilizer application needed this week.'}</p>
                )}
            </DetailSection>

            {/* Pest Prevention */}
            <DetailSection icon={Bug} title="Pest & Disease" accent="amber"
                badge={week.pestPrevention.activeThreats.length > 0 ? `${week.pestPrevention.activeThreats.length} threats` : 'Low risk'}>
                <div className="flex flex-col gap-2.5">
                    {week.pestPrevention.activeThreats.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {week.pestPrevention.activeThreats.map(t => (
                                <span key={t} className="text-xs bg-amber-500/10 text-amber-700 border border-amber-500/20 px-2 py-0.5 rounded-full">{t}</span>
                            ))}
                        </div>
                    )}
                    {week.pestPrevention.preventionActions.map((a, i) => (
                        <p key={i} className="text-xs text-muted-foreground leading-relaxed">• {a}</p>
                    ))}
                    {week.pestPrevention.chemicalName && week.pestPrevention.chemicalName !== 'None' && (
                        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2.5">
                            <p className="text-xs font-semibold text-yellow-700">Chemical option</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {week.pestPrevention.chemicalName}
                                {week.pestPrevention.chemicalDosePerAcre ? ` · ${week.pestPrevention.chemicalDosePerAcre}` : ''}
                            </p>
                            {week.pestPrevention.chemicalSafetyClass && week.pestPrevention.chemicalSafetyClass !== 'None' && (
                                <span className="text-[10px] bg-yellow-500/10 text-yellow-700 px-1.5 py-0.5 rounded mt-1 inline-block">
                                    {week.pestPrevention.chemicalSafetyClass}
                                </span>
                            )}
                        </div>
                    )}
                    {week.pestPrevention.monitoringTip && (
                        <div className="flex items-start gap-1.5">
                            <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                            <p className="text-xs text-muted-foreground">{week.pestPrevention.monitoringTip}</p>
                        </div>
                    )}
                </div>
            </DetailSection>

            {/* Weather Precautions */}
            <DetailSection icon={CloudRain} title="Weather Precautions" accent="rose"
                badge={week.weatherPrecautions.urgencyLevel}>
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn('text-xs', urgencyColor[week.weatherPrecautions.urgencyLevel])}>
                            {week.weatherPrecautions.urgencyLevel} urgency
                        </Badge>
                    </div>
                    {week.weatherPrecautions.expectedConditions && (
                        <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-rose-500/40 pl-2">
                            {week.weatherPrecautions.expectedConditions}
                        </p>
                    )}
                    {week.weatherPrecautions.risks.map((r, i) => (
                        <p key={i} className="text-xs text-muted-foreground">⚠ {r}</p>
                    ))}
                    {week.weatherPrecautions.protectiveActions.map((a, i) => (
                        <p key={i} className="text-xs text-muted-foreground">✓ {a}</p>
                    ))}
                </div>
            </DetailSection>

            {/* Farmer Checklist */}
            {week.farmerChecklist.length > 0 && (
                <div className="bg-primary/5 border border-primary/15 rounded-xl p-3.5">
                    <p className="text-xs font-bold text-primary flex items-center gap-1.5 mb-2">
                        <CheckSquare className="h-3.5 w-3.5" /> This week's checklist
                    </p>
                    <ol className="flex flex-col gap-1.5">
                        {week.farmerChecklist.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/15 text-primary text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                                {item}
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </div>
    );
}

// ─── Main Results Component ───────────────────────────────────────────────────

interface Props {
    record: GrowthTimelineRecord;
    onReset: () => void;
}

export default function TimelineResults({ record, onReset }: Props) {
    const tl = record.timeline;
    const [selectedWeek, setSelectedWeek] = useState(1);
    const scrollRef = useRef<HTMLDivElement>(null);

    const activeWeek = tl.weeks.find(w => w.weekNumber === selectedWeek) ?? tl.weeks[0];

    const scrollBy = (dir: 'left' | 'right') => {
        scrollRef.current?.scrollBy({ left: dir === 'right' ? 200 : -200, behavior: 'smooth' });
    };

    return (
        <div className="flex flex-col gap-5 animate-in fade-in-0 duration-400">

            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <h2 className="text-base font-bold capitalize">{tl.cropName} Timeline</h2>
                    <p className="text-xs text-muted-foreground truncate">
                        {tl.region} · {tl.totalWeeks} weeks · Harvest ~{tl.estimatedHarvestDate}
                    </p>
                </div>
                <Button
                    variant="ghost" size="sm"
                    onClick={() => { haptics.light(); onReset(); }}
                    className="rounded-xl h-9 text-xs gap-1.5 shrink-0"
                >
                    <RotateCcw className="h-3.5 w-3.5" /> New
                </Button>
            </div>

            {/* Quick summary */}
            {tl.quickSummary && (
                <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">{tl.quickSummary}</p>
                </div>
            )}

            {/* Stat strip */}
            <div className="grid grid-cols-3 gap-2">
                {[
                    { icon: CalendarDays, label: 'Total weeks', value: `${tl.totalWeeks}` },
                    { icon: TrendingUp, label: 'Harvest', value: tl.estimatedHarvestDate.length > 12 ? tl.estimatedHarvestDate.slice(0, 12) + '…' : tl.estimatedHarvestDate },
                    { icon: Zap, label: 'Milestones', value: `${tl.keyMilestones.length}` },
                ].map(({ icon: Icon, label, value }) => (
                    <Card key={label} className="rounded-2xl border-border">
                        <CardContent className="p-3 flex flex-col gap-1">
                            <Icon className="h-4 w-4 text-primary" />
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className="text-sm font-bold truncate">{value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ─── Weekly strip ─── */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">Weekly Plan</h3>
                    <div className="flex gap-1">
                        <button onClick={() => scrollBy('left')} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button onClick={() => scrollBy('right')} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* Horizontal scrollable week thumbs */}
                <div
                    ref={scrollRef}
                    className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {tl.weeks.map(week => (
                        <WeekThumb
                            key={week.weekNumber}
                            week={week}
                            selected={selectedWeek === week.weekNumber}
                            onClick={() => setSelectedWeek(week.weekNumber)}
                        />
                    ))}
                </div>
            </div>

            {/* Week detail */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">{activeWeek.weekLabel}</h3>
                    <div className="flex gap-1.5">
                        <button
                            disabled={selectedWeek <= 1}
                            onClick={() => { haptics.light(); setSelectedWeek(w => Math.max(1, w - 1)); }}
                            className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-muted transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            disabled={selectedWeek >= tl.weeks.length}
                            onClick={() => { haptics.light(); setSelectedWeek(w => Math.min(tl.weeks.length, w + 1)); }}
                            className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-muted transition-colors"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                <WeekDetail week={activeWeek} />
            </div>

            {/* Key Milestones */}
            {tl.keyMilestones.length > 0 && (
                <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-bold">Key Milestones</h3>
                    <div className="flex flex-col gap-2">
                        {tl.keyMilestones.map((m, i) => (
                            <div key={i} className={cn(
                                'flex items-start gap-3 p-3.5 rounded-xl border',
                                m.isCritical
                                    ? 'bg-orange-500/5 border-orange-500/20'
                                    : 'bg-card border-border',
                            )}>
                                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                                    {m.weekNumber}
                                </div>
                                <div className="flex flex-col gap-0.5 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-sm font-semibold">{m.title}</span>
                                        {m.isCritical && (
                                            <span className="text-[10px] font-bold text-orange-600 bg-orange-500/10 px-1.5 py-0.5 rounded-full">Critical</span>
                                        )}
                                    </div>
                                    <span className="text-xs text-muted-foreground">{m.date}</span>
                                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{m.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CTA */}
            <Button
                variant="outline"
                onClick={() => { haptics.light(); onReset(); }}
                className="w-full rounded-xl h-12 font-semibold gap-2"
            >
                <RotateCcw className="h-4 w-4" /> Generate New Timeline
            </Button>
        </div>
    );
}
