'use client';

/**
 * @fileOverview AI Insights Panel — 5 widgets computed from existing scan history.
 * Inserted between Harvest Optimizer card and the disease frequency chart.
 * No new API calls; all derived from the Diagnosis[] already loaded on the dashboard.
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Lightbulb, ShieldAlert, Sprout, TrendingUp, Leaf } from 'lucide-react';
import type { Diagnosis } from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HEALTHY = (d: Diagnosis) =>
    !d.diagnosis.diseaseName ||
    d.diagnosis.diseaseName === 'No disease detected' ||
    d.diagnosis.diseaseName === 'Healthy';

const SEVERITY_WEIGHT: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Animated arc ring showing a 0-100 percentage */
function ArcGauge({
    pct,
    color,
    size = 88,
}: { pct: number; color: string; size?: number }) {
    const r = (size - 12) / 2;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
            {/* Track */}
            <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={8} stroke="currentColor"
                className="text-gray-100 dark:text-white/10" fill="none" />
            {/* Fill */}
            <circle
                cx={size / 2} cy={size / 2} r={r} strokeWidth={8} stroke={color} fill="none"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
                style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
        </svg>
    );
}

/** Thin horizontal fill bar */
function HorizBar({ pct, color }: { pct: number; color: string }) {
    return (
        <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
            <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.max(2, pct)}%`, background: color }}
            />
        </div>
    );
}

/** Section wrapper card */
function InsightCard({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn(
            'rounded-2xl p-4 border border-gray-100 dark:border-white/8 bg-card dark:bg-card',
            'shadow-sm',
            className,
        )}>
            {children}
        </div>
    );
}

function Label({ text, color }: { text: string; color: string }) {
    return (
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: color + '20', color }}>
            {text}
        </span>
    );
}

// ─── 1. Crop Success Probability ──────────────────────────────────────────────

function CropSuccessWidget({ diagnoses }: { diagnoses: Diagnosis[] }) {
    const pct = diagnoses.length === 0 ? 0
        : Math.round((diagnoses.filter(HEALTHY).length / diagnoses.length) * 100);

    const { color, label } =
        pct >= 75 ? { color: '#22c55e', label: 'Good' } :
            pct >= 50 ? { color: '#f59e0b', label: 'Fair' } :
                { color: '#ef4444', label: 'Poor' };

    return (
        <InsightCard>
            <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + '20' }}>
                    <Sprout className="h-4 w-4" style={{ color }} />
                </div>
                <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Crop Success</p>
                    <p className="text-sm font-bold text-foreground leading-tight">Probability</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="relative flex items-center justify-center">
                    <ArcGauge pct={pct} color={color} />
                    <div className="absolute flex flex-col items-center">
                        <span className="text-lg font-bold text-foreground leading-none">{pct}%</span>
                    </div>
                </div>
                <div className="flex-1 space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Healthy scans</span>
                        <span className="text-xs font-bold text-foreground">{diagnoses.filter(HEALTHY).length}/{diagnoses.length}</span>
                    </div>
                    <HorizBar pct={pct} color={color} />
                    <Label text={label} color={color} />
                </div>
            </div>
        </InsightCard>
    );
}

// ─── 2. Yield Prediction ──────────────────────────────────────────────────────

function YieldPredictionWidget({ diagnoses }: { diagnoses: Diagnosis[] }) {
    const { impact, color, label, bar } = useMemo(() => {
        if (diagnoses.length === 0) return { impact: 0, color: '#22c55e', label: 'No Data', bar: 50 };
        const recent = diagnoses.slice(0, 5);
        const totalWeight = recent.reduce((s, d) => {
            if (HEALTHY(d)) return s;
            return s + (SEVERITY_WEIGHT[d.diagnosis.severityLevel as string] ?? 1);
        }, 0);
        const maxWeight = recent.length * 3;
        const lossPct = Math.round((totalWeight / maxWeight) * 40); // max 40% yield loss
        return {
            impact: -lossPct,
            color: lossPct < 10 ? '#22c55e' : lossPct < 25 ? '#f59e0b' : '#ef4444',
            label: lossPct < 10 ? 'On Track' : lossPct < 25 ? 'Moderate Risk' : 'High Risk',
            bar: 100 - lossPct,
        };
    }, [diagnoses]);

    return (
        <InsightCard>
            <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + '20' }}>
                    <TrendingUp className="h-4 w-4" style={{ color }} />
                </div>
                <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Yield Prediction</p>
                    <p className="text-sm font-bold text-foreground leading-tight">Impact Estimate</p>
                </div>
                <div className="ml-auto">
                    <span className="text-lg font-bold" style={{ color }}>
                        {impact === 0 ? '—' : `${impact}%`}
                    </span>
                </div>
            </div>
            <HorizBar pct={bar} color={color} />
            <div className="flex justify-between items-center mt-1.5">
                <span className="text-[11px] text-muted-foreground">Based on last 5 scans</span>
                <Label text={label} color={color} />
            </div>
        </InsightCard>
    );
}

// ─── 3. Soil Health Indicator ─────────────────────────────────────────────────

function SoilHealthWidget({ diagnoses }: { diagnoses: Diagnosis[] }) {
    const { score, label, color } = useMemo(() => {
        if (diagnoses.length === 0) return { score: 0, label: 'No Data', color: '#94a3b8' };
        const healthy = diagnoses.filter(HEALTHY).length;
        const total = diagnoses.length;
        const ratio = healthy / total;
        if (ratio >= 0.8) return { score: 85, label: 'Good', color: '#22c55e' };
        if (ratio >= 0.5) return { score: 55, label: 'Fair', color: '#f59e0b' };
        return { score: 25, label: 'Poor', color: '#ef4444' };
    }, [diagnoses]);

    const segments = [
        { key: 'poor', label: 'Poor', from: 0, to: 33, col: '#ef4444' },
        { key: 'fair', label: 'Fair', from: 33, to: 66, col: '#f59e0b' },
        { key: 'good', label: 'Good', from: 66, to: 100, col: '#22c55e' },
    ];

    return (
        <InsightCard>
            <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#84cc1620' }}>
                    <Leaf className="h-4 w-4 text-lime-500" />
                </div>
                <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Soil Health</p>
                    <p className="text-sm font-bold text-foreground leading-tight">Indicator</p>
                </div>
                <div className="ml-auto">
                    <Label text={label} color={color} />
                </div>
            </div>
            {/* 3-segment bar */}
            <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                {segments.map(seg => {
                    const active = score >= seg.from && score < seg.to;
                    return (
                        <div key={seg.key} className="flex-1 rounded-full transition-all duration-500"
                            style={{ background: active ? seg.col : seg.col + '30' }} />
                    );
                })}
            </div>
            <div className="flex justify-between mt-1">
                {segments.map(seg => (
                    <span key={seg.key} className="text-[10px] text-muted-foreground">{seg.label}</span>
                ))}
            </div>
        </InsightCard>
    );
}

// ─── 4. Risk Meter ────────────────────────────────────────────────────────────

function RiskMeterWidget({ diagnoses }: { diagnoses: Diagnosis[] }) {
    const { risk, color, pct, description } = useMemo(() => {
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const recent = diagnoses.filter(d => {
            try { return d.createdAt.toMillis() >= thirtyDaysAgo; } catch { return false; }
        });
        const highSeverity = recent.filter(d => (d.diagnosis.severityLevel as string) === 'High').length;
        const medSeverity = recent.filter(d => (d.diagnosis.severityLevel as string) === 'Medium').length;
        const score = highSeverity * 3 + medSeverity * 1;

        if (score === 0) return { risk: 'Low', color: '#22c55e', pct: 15, description: 'No high-risk issues in 30 days' };
        if (score <= 2) return { risk: 'Medium', color: '#f59e0b', pct: 50, description: `${medSeverity} medium-severity scan(s)` };
        if (score <= 5) return { risk: 'High', color: '#f97316', pct: 75, description: `${highSeverity} high-severity scan(s)` };
        return { risk: 'Critical', color: '#ef4444', pct: 95, description: 'Immediate attention needed' };
    }, [diagnoses]);

    return (
        <InsightCard>
            <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + '20' }}>
                    <ShieldAlert className="h-4 w-4" style={{ color }} />
                </div>
                <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Risk Meter</p>
                    <p className="text-sm font-bold text-foreground leading-tight">Last 30 Days</p>
                </div>
                <div className="ml-auto">
                    <Label text={risk} color={color} />
                </div>
            </div>
            <HorizBar pct={pct} color={color} />
            <p className="text-[11px] text-muted-foreground mt-1.5">{description}</p>
        </InsightCard>
    );
}

// ─── 5. AI Suggestions ────────────────────────────────────────────────────────

const SUGGESTION_MAP: Record<string, string[]> = {
    'Healthy': ['✓ Keep monitoring weekly for early signs.', '💧 Maintain consistent irrigation schedules.'],
    'No disease detected': ['✓ Crop looks healthy. Continue current practice.', '🌿 Consider soil testing for proactive care.'],
    _default: [
        '🔍 Review the scan results and consult a local agronomist.',
        '💊 Apply recommended treatment promptly to prevent spread.',
        '📋 Record treatment dates for future reference.',
    ],
};

function AiSuggestionsWidget({ diagnoses }: { diagnoses: Diagnosis[] }) {
    const suggestions = useMemo(() => {
        if (diagnoses.length === 0) return ['📷 Run your first crop scan to unlock AI suggestions.'];
        const latest = diagnoses[0];
        const name = latest.diagnosis.diseaseName ?? 'Healthy';
        return SUGGESTION_MAP[name] ?? SUGGESTION_MAP['_default'];
    }, [diagnoses]);

    const latestCrop = diagnoses[0]?.cropType;

    return (
        <InsightCard>
            <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <Lightbulb className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">AI Suggestions</p>
                    <p className="text-sm font-bold text-foreground leading-tight">
                        {latestCrop ? `For ${latestCrop}` : 'Smart Advice'}
                    </p>
                </div>
            </div>
            <ul className="space-y-2">
                {suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                        <span className="text-sm text-foreground leading-relaxed">{s}</span>
                    </li>
                ))}
            </ul>
        </InsightCard>
    );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface AiInsightsPanelProps {
    diagnoses: Diagnosis[];
}

export default function AiInsightsPanel({ diagnoses }: AiInsightsPanelProps) {
    return (
        <div className="flex flex-col gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
            {/* Section header */}
            <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-border dark:bg-white/10" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-2">AI Insights</span>
                <div className="flex-1 h-px bg-border dark:bg-white/10" />
            </div>

            {/* 2-col grid: success + yield */}
            <div className="grid grid-cols-2 gap-3">
                <CropSuccessWidget diagnoses={diagnoses} />
                <YieldPredictionWidget diagnoses={diagnoses} />
            </div>

            {/* Full width: soil */}
            <SoilHealthWidget diagnoses={diagnoses} />

            {/* 2-col: risk + suggestions side by side on wider, stacked on narrow */}
            <RiskMeterWidget diagnoses={diagnoses} />
            <AiSuggestionsWidget diagnoses={diagnoses} />
        </div>
    );
}
