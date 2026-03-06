'use client';

/**
 * @fileOverview Risk Engine Panel — displays 3 AI-powered risk predictions.
 *
 * User-triggered: shows a CTA button. Only calls POST /api/risk-engine when
 * the user explicitly requests it, avoiding unnecessary API usage.
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ShieldAlert, TrendingDown, CloudLightning, AlertTriangle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Diagnosis } from '@/lib/types';
import type { RiskEngineOutput } from '@/ai/flows/risk-engine-flow';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LABEL_COLOR: Record<string, string> = {
    Low: '#22c55e',
    Moderate: '#f59e0b',
    High: '#f97316',
    Critical: '#ef4444',
};

const LABEL_BG: Record<string, string> = {
    Low: '#22c55e18',
    Moderate: '#f59e0b18',
    High: '#f9731618',
    Critical: '#ef444418',
};

// ─── Arc gauge (same as ai-insights-panel) ───────────────────────────────────

function ArcGauge({ pct, color, size = 72 }: { pct: number; color: string; size?: number }) {
    const r = (size - 10) / 2;
    const circ = 2 * Math.PI * r;
    const dash = (Math.min(100, Math.max(0, pct)) / 100) * circ;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
            <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={7} stroke="currentColor"
                className="text-gray-100 dark:text-white/10" fill="none" />
            <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={7} stroke={color} fill="none"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
                style={{ transition: 'stroke-dasharray 0.7s ease' }} />
        </svg>
    );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
    return (
        <div className="rounded-2xl p-4 border border-gray-100 dark:border-white/8 bg-card animate-pulse">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/10" />
                <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 bg-gray-100 dark:bg-white/10 rounded w-24" />
                    <div className="h-3.5 bg-gray-100 dark:bg-white/10 rounded w-32" />
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="w-[72px] h-[72px] rounded-full bg-gray-100 dark:bg-white/10" />
                <div className="flex-1 space-y-2">
                    <div className="h-2 bg-gray-100 dark:bg-white/10 rounded" />
                    <div className="h-2 bg-gray-100 dark:bg-white/10 rounded w-4/5" />
                    <div className="h-5 bg-gray-100 dark:bg-white/10 rounded w-16" />
                </div>
            </div>
        </div>
    );
}

// ─── Single risk card ─────────────────────────────────────────────────────────

interface RiskCardProps {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    score: number;
    label: string;
    advice: string;
}

function RiskCard({ icon, title, subtitle, score, label, advice }: RiskCardProps) {
    const color = LABEL_COLOR[label] ?? '#94a3b8';
    const bg = LABEL_BG[label] ?? '#94a3b818';

    return (
        <div className="rounded-2xl p-4 border border-gray-100 dark:border-white/8 bg-card shadow-sm">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: bg }}>
                    <span style={{ color }}>{icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">{title}</p>
                    <p className="text-sm font-bold text-foreground leading-tight">{subtitle}</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="relative flex-none flex items-center justify-center">
                    <ArcGauge pct={score} color={color} />
                    <div className="absolute flex flex-col items-center">
                        <span className="text-base font-bold leading-none" style={{ color }}>{score}</span>
                        <span className="text-[9px] text-muted-foreground leading-none mt-0.5">/100</span>
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mb-1.5"
                        style={{ background: bg, color }}>
                        {label}
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed">{advice}</p>
                </div>
            </div>
        </div>
    );
}

// ─── Overall badge ────────────────────────────────────────────────────────────

function OverallBadge({ label, summary }: { label: string; summary: string }) {
    const color = LABEL_COLOR[label] ?? '#94a3b8';
    const bg = LABEL_BG[label] ?? '#94a3b818';
    return (
        <div className="rounded-2xl p-3 flex items-center gap-3"
            style={{ background: bg, border: `1px solid ${color}30` }}>
            <AlertTriangle className="h-5 w-5 flex-none" style={{ color }} />
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color }}>
                    Overall: {label} Risk
                </p>
                <p className="text-xs text-foreground mt-0.5 leading-relaxed">{summary}</p>
            </div>
        </div>
    );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface RiskEnginePanelProps {
    diagnoses: Diagnosis[];
}

export default function RiskEnginePanel({ diagnoses }: RiskEnginePanelProps) {
    const [data, setData] = useState<RiskEngineOutput | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [activated, setActivated] = useState(false);

    const runRiskAnalysis = () => {
        setActivated(true);
        setError(null);
        setData(null);

        const primaryCrop = diagnoses[0]?.cropType ?? 'wheat';

        const scans = diagnoses.slice(0, 15).map(d => ({
            diseaseName: d.diagnosis.diseaseName,
            severityLevel: d.diagnosis.severityLevel ?? 'Not Applicable',
            createdAtMs: (() => { try { return d.createdAt.toMillis(); } catch { return Date.now(); } })(),
            cropType: d.cropType,
        }));

        setLoading(true);
        fetch('/api/risk-engine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cropType: primaryCrop, scans }),
        })
            .then(r => r.json())
            .then((res: RiskEngineOutput & { error?: string }) => {
                if (res.error) { setError(res.error); return; }
                setData(res);
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    };

    return (
        <div className="flex flex-col gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
            {/* Section header */}
            <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-border dark:bg-white/10" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-2">
                    AI Risk Engine
                </span>
                <div className="flex-1 h-px bg-border dark:bg-white/10" />
            </div>

            {/* CTA — shown when not yet activated or when user wants to re-run */}
            {!activated && (
                <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-6 flex flex-col items-center gap-3 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Zap className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-foreground">AI Risk Analysis</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
                            Analyze your crop scan history to predict disease, yield, and weather risks using AI.
                        </p>
                    </div>
                    <Button
                        onClick={runRiskAnalysis}
                        className="rounded-xl gap-2 mt-1"
                        size="sm"
                    >
                        <Zap className="h-4 w-4" />
                        Run Risk Analysis
                    </Button>
                </div>
            )}

            {loading && (
                <>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </>
            )}

            {error && (
                <div className="rounded-2xl p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-sm text-red-600 dark:text-red-400">
                    ⚠ Risk Engine unavailable: {error}
                </div>
            )}

            {data && !loading && (
                <>
                    <OverallBadge label={data.overallRiskLabel} summary={data.summary} />

                    <RiskCard
                        icon={<ShieldAlert className="h-4 w-4" />}
                        title="Disease Risk"
                        subtitle="Likelihood"
                        score={data.diseaseLikelihood.score}
                        label={data.diseaseLikelihood.label}
                        advice={data.diseaseLikelihood.advice}
                    />
                    <RiskCard
                        icon={<TrendingDown className="h-4 w-4" />}
                        title="Yield Risk"
                        subtitle="Low Yield Threat"
                        score={data.yieldRisk.score}
                        label={data.yieldRisk.label}
                        advice={data.yieldRisk.advice}
                    />
                    <RiskCard
                        icon={<CloudLightning className="h-4 w-4" />}
                        title="Weather Risk"
                        subtitle="Damage Potential"
                        score={data.weatherDamageRisk.score}
                        label={data.weatherDamageRisk.label}
                        advice={data.weatherDamageRisk.advice}
                    />

                    {/* Re-run button */}
                    <Button
                        onClick={runRiskAnalysis}
                        variant="outline"
                        size="sm"
                        className="rounded-xl gap-2 self-center mt-1"
                    >
                        <Zap className="h-3.5 w-3.5" />
                        Re-run Analysis
                    </Button>
                </>
            )}
        </div>
    );
}
