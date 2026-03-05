'use client';

/**
 * @fileOverview Weekly Growth Report Results — displays the AI-generated weekly
 * report with summary, growth status, risks, insights, and recommendations.
 * Features color-coded cards, progress indicators, and interactive sections.
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import {
    ArrowLeft, FileText, TrendingUp, AlertTriangle, Lightbulb,
    CheckCircle2, Calendar, CloudSun, ClipboardList, Shield,
    ChevronDown, ChevronUp, Activity, Leaf, BarChart3,
} from 'lucide-react';
import { format } from 'date-fns';
import type { WeeklyGrowthReportRecord } from '@/farming-partner/weekly-growth-report-service';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    record: WeeklyGrowthReportRecord;
    onReset: () => void;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

function healthColor(rating: string) {
    switch (rating) {
        case 'Healthy': return {
            bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',
            text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500',
            gradient: 'from-emerald-500 to-green-600',
        };
        case 'Watch': return {
            bg: 'bg-amber-500/10', border: 'border-amber-500/20',
            text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500',
            gradient: 'from-amber-500 to-orange-500',
        };
        case 'Risk': return {
            bg: 'bg-red-500/10', border: 'border-red-500/20',
            text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500',
            gradient: 'from-red-500 to-rose-600',
        };
        default: return {
            bg: 'bg-muted', border: 'border-border',
            text: 'text-foreground', dot: 'bg-muted-foreground',
            gradient: 'from-gray-500 to-gray-600',
        };
    }
}

function severityColor(severity: string) {
    switch (severity) {
        case 'high': return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
        case 'medium': return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
        case 'low': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
        default: return 'bg-muted text-muted-foreground border-border';
    }
}

function priorityColor(priority: string) {
    switch (priority) {
        case 'high': return 'bg-red-500 text-white';
        case 'medium': return 'bg-amber-500 text-white';
        case 'low': return 'bg-blue-500 text-white';
        default: return 'bg-muted text-muted-foreground';
    }
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function ReportSection({
    icon: Icon, title, accent, children, collapsible = false, defaultOpen = true,
}: {
    icon: React.ElementType; title: string;
    accent?: 'emerald' | 'amber' | 'red' | 'blue' | 'violet' | 'teal';
    children: React.ReactNode;
    collapsible?: boolean;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    const accentMap = {
        emerald: 'text-emerald-600 dark:text-emerald-400',
        amber: 'text-amber-600 dark:text-amber-400',
        red: 'text-red-600 dark:text-red-400',
        blue: 'text-blue-600 dark:text-blue-400',
        violet: 'text-violet-600 dark:text-violet-400',
        teal: 'text-teal-600 dark:text-teal-400',
    };

    return (
        <Card className="rounded-2xl border-border shadow-sm overflow-hidden animate-slide-up-fade">
            <button
                onClick={() => { if (collapsible) { haptics.light(); setOpen(!open); } }}
                className={cn(
                    'w-full flex items-center gap-2.5 px-4 py-3',
                    collapsible && 'cursor-pointer hover:bg-muted/50 transition-colors',
                )}
            >
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                    accent ? `bg-${accent}-500/10` : 'bg-muted')}>
                    <Icon className={cn('h-4 w-4', accent ? accentMap[accent] : 'text-muted-foreground')} />
                </div>
                <h3 className="text-sm font-bold flex-1 text-left">{title}</h3>
                {collapsible && (
                    open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
            </button>
            {open && <CardContent className="px-4 pb-4 pt-0">{children}</CardContent>}
        </Card>
    );
}

// ─── Progress Ring ────────────────────────────────────────────────────────────

function GrowthRing({ percentage, rating }: { percentage: number; rating: string }) {
    const hc = healthColor(rating);
    const circumference = 2 * Math.PI * 42;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative w-28 h-28 mx-auto">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" strokeWidth="6"
                    className="stroke-muted" />
                <circle cx="50" cy="50" r="42" fill="none" strokeWidth="6"
                    strokeLinecap="round"
                    className={cn(
                        rating === 'Healthy' ? 'stroke-emerald-500' :
                            rating === 'Watch' ? 'stroke-amber-500' : 'stroke-red-500'
                    )}
                    style={{
                        strokeDasharray: circumference,
                        strokeDashoffset: offset,
                        transition: 'stroke-dashoffset 1s ease-out',
                    }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn('text-2xl font-bold', hc.text)}>{percentage}%</span>
                <span className="text-[10px] text-muted-foreground font-medium">Growth</span>
            </div>
        </div>
    );
}

// ─── Main Results Component ───────────────────────────────────────────────────

export default function WeeklyReportResults({ record, onReset }: Props) {
    const { report, input } = record;
    const hc = healthColor(report.health_rating);

    return (
        <div className="flex flex-col gap-4 animate-slide-up-fade">

            {/* ── Header card — Week info + Health badge ── */}
            <Card className={cn('rounded-2xl overflow-hidden shadow-lg border-0')}>
                <div className={cn('bg-gradient-to-br text-white p-5', hc.gradient)}>
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Calendar className="h-4 w-4 text-white/70" />
                                <span className="text-xs text-white/70 font-medium">
                                    Week {input.weekNumber}
                                </span>
                            </div>
                            <h2 className="text-xl font-bold leading-tight mb-0.5">
                                {input.cropName}
                                {input.cropVariety && <span className="text-white/70 text-base font-medium"> · {input.cropVariety}</span>}
                            </h2>
                            <p className="text-xs text-white/60">
                                {input.weekStartDate} → {input.weekEndDate}
                            </p>
                        </div>
                        <div className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-bold',
                            'bg-white/20 backdrop-blur-sm',
                        )}>
                            {report.health_rating === 'Healthy' && '🟢'}
                            {report.health_rating === 'Watch' && '🟡'}
                            {report.health_rating === 'Risk' && '🔴'}
                            {' '}{report.health_rating}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                        <Leaf className="h-3.5 w-3.5 text-white/60" />
                        <span className="text-xs text-white/70">{input.currentGrowthStage}</span>
                        {input.region && (
                            <>
                                <span className="text-white/30">·</span>
                                <span className="text-xs text-white/70">{input.region}</span>
                            </>
                        )}
                    </div>
                </div>
            </Card>

            {/* ── Growth Progress ── */}
            <ReportSection icon={Activity} title="Growth Progress" accent="emerald">
                <div className="flex flex-col items-center gap-3 py-2">
                    <GrowthRing percentage={report.growth_percentage} rating={report.health_rating} />
                    <p className="text-sm text-center text-muted-foreground leading-relaxed max-w-xs">
                        {report.growth_status}
                    </p>
                </div>
            </ReportSection>

            {/* ── Weekly Summary ── */}
            <ReportSection icon={FileText} title="Weekly Summary" accent="teal">
                <p className="text-sm text-foreground leading-relaxed">
                    {report.summary}
                </p>
            </ReportSection>

            {/* ── Weather Impact ── */}
            <ReportSection icon={CloudSun} title="Weather Impact" accent="blue" collapsible>
                <p className="text-sm text-foreground leading-relaxed">
                    {report.weather_impact}
                </p>
            </ReportSection>

            {/* ── Activity Assessment ── */}
            <ReportSection icon={ClipboardList} title="Activity Assessment" accent="violet" collapsible>
                <p className="text-sm text-foreground leading-relaxed">
                    {report.activity_assessment}
                </p>
            </ReportSection>

            {/* ── Insights ── */}
            <ReportSection icon={Lightbulb} title="Insights" accent="amber">
                <div className="flex flex-col gap-2.5">
                    {report.insights.map((insight, i) => (
                        <div
                            key={i}
                            className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10"
                        >
                            <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                <Lightbulb className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">{insight.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{insight.detail}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </ReportSection>

            {/* ── Risks Detected ── */}
            <ReportSection icon={AlertTriangle} title="Risks Detected" accent="red">
                {report.risks.length === 0 ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <Shield className="h-4 w-4 text-emerald-600" />
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">No risks detected this week!</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2.5">
                        {report.risks.map((risk, i) => (
                            <div key={i} className={cn(
                                'flex items-start gap-3 p-3 rounded-xl border',
                                severityColor(risk.severity),
                            )}>
                                <AlertTriangle className={cn(
                                    'h-4 w-4 shrink-0 mt-0.5',
                                    risk.severity === 'high' ? 'text-red-500' :
                                        risk.severity === 'medium' ? 'text-amber-500' : 'text-blue-500',
                                )} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs font-bold">{risk.title}</p>
                                        <span className={cn(
                                            'text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase',
                                            priorityColor(risk.severity),
                                        )}>
                                            {risk.severity}
                                        </span>
                                    </div>
                                    <p className="text-xs mt-0.5 leading-relaxed opacity-80">{risk.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ReportSection>

            {/* ── Recommendations for Next Week ── */}
            <ReportSection icon={TrendingUp} title="Recommendations for Next Week" accent="emerald">
                <div className="flex flex-col gap-2.5">
                    {report.recommendations_for_next_week.map((rec, i) => (
                        <div
                            key={i}
                            className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10"
                        >
                            <div className={cn(
                                'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                                priorityColor(rec.priority),
                            )}>
                                <span className="text-[10px] font-bold">{i + 1}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-xs font-bold text-foreground">{rec.action}</p>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{rec.reason}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </ReportSection>

            {/* ── Report metadata ── */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
                <BarChart3 className="h-3 w-3" />
                <span>Generated {format(record.createdAt, 'dd MMM yyyy · HH:mm')}</span>
            </div>

            {/* ── Back button ── */}
            <Button
                variant="outline"
                onClick={() => { haptics.light(); onReset(); }}
                className="rounded-xl h-11"
            >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back to Weekly Reports
            </Button>
        </div>
    );
}
