'use client';

/**
 * @fileOverview Farm Summary Report — a glanceable health overview card.
 *
 * 5 sections: Health Score, Crop Status, Risk Overview,
 * AI Recommendation, and Quick Action buttons.
 * Designed to be understood in under 5 seconds.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    Activity, Leaf, ShieldAlert, TrendingDown, CloudLightning,
    ArrowRight, ScanLine, Bot, FileDown, Sparkles,
} from 'lucide-react';
import { useChatbot } from '@/components/chatbot/chat-provider';
import type { Diagnosis } from '@/lib/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const HEALTHY = (d: Diagnosis) =>
    !d.diagnosis.diseaseName ||
    d.diagnosis.diseaseName === 'No disease detected' ||
    d.diagnosis.diseaseName === 'Healthy';

const SEVERITY_WEIGHT: Record<string, number> = { High: 100, Medium: 55, Low: 25, 'Not Applicable': 0 };

function riskLabel(score: number) {
    if (score <= 30) return { label: 'Low', color: '#22c55e', bg: '#22c55e18' };
    if (score <= 55) return { label: 'Moderate', color: '#f59e0b', bg: '#f59e0b18' };
    if (score <= 79) return { label: 'High', color: '#f97316', bg: '#f9731618' };
    return { label: 'Critical', color: '#ef4444', bg: '#ef444418' };
}

function healthLabel(score: number) {
    if (score >= 80) return { text: 'Excellent', color: '#22c55e' };
    if (score >= 60) return { text: 'Good', color: '#3b82f6' };
    if (score >= 40) return { text: 'Moderate', color: '#f59e0b' };
    if (score >= 20) return { text: 'Poor', color: '#f97316' };
    return { text: 'Critical', color: '#ef4444' };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreCircle({ score, color, size = 96 }: { score: number; color: string; size?: number }) {
    const r = (size - 12) / 2;
    const circ = 2 * Math.PI * r;
    const dash = (Math.min(100, Math.max(0, score)) / 100) * circ;
    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
                <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={8} stroke="currentColor"
                    className="text-gray-100 dark:text-white/10" fill="none" />
                <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={8} stroke={color} fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${circ}`}
                    style={{ transition: 'stroke-dasharray 1s ease' }} />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-bold leading-none" style={{ color }}>{score}</span>
                <span className="text-[9px] text-muted-foreground leading-none mt-0.5">/100</span>
            </div>
        </div>
    );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-gray-50 dark:bg-white/5">
            <span className="text-xl font-bold leading-none" style={{ color }}>{value}</span>
            <span className="text-[10px] text-muted-foreground font-medium text-center leading-tight">{label}</span>
        </div>
    );
}

function RiskRow({ icon, label, score }: { icon: React.ReactNode; label: string; score: number }) {
    const info = riskLabel(score);
    return (
        <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-none"
                style={{ background: info.bg }}>
                <span style={{ color: info.color }}>{icon}</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-foreground">{label}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: info.bg, color: info.color }}>
                        {info.label}
                    </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.max(3, score)}%`, background: info.color }} />
                </div>
            </div>
        </div>
    );
}

function SkeletonRecommendation() {
    return (
        <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-gray-100 dark:bg-white/10 rounded w-full" />
            <div className="h-3 bg-gray-100 dark:bg-white/10 rounded w-5/6" />
            <div className="h-3 bg-gray-100 dark:bg-white/10 rounded w-4/6" />
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface FarmSummaryReportProps {
    diagnoses: Diagnosis[];
}

export default function FarmSummaryReport({ diagnoses }: FarmSummaryReportProps) {
    const router = useRouter();
    const { openChat } = useChatbot();
    const [recommendation, setRecommendation] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const fetchedRef = useRef(false);

    // ── Computed metrics ──────────────────────────────────────────────────────

    const metrics = useMemo(() => {
        const total = diagnoses.length;
        const healthy = diagnoses.filter(HEALTHY).length;
        const diseased = total - healthy;
        const needingAttention = diagnoses.filter(d => {
            if (HEALTHY(d)) return false;
            const sev = d.diagnosis.severityLevel as string;
            return sev === 'High' || sev === 'Medium';
        }).length;

        // Disease risk: % of scans with disease, weighted by recency
        const now = Date.now();
        let weightedDisease = 0, totalWeight = 0;
        diagnoses.forEach(d => {
            let ageDays = 30;
            try { ageDays = (now - d.createdAt.toMillis()) / (1000 * 60 * 60 * 24); } catch { }
            const weight = Math.max(0.2, 1 - ageDays / 90);
            weightedDisease += weight * (HEALTHY(d) ? 0 : 1);
            totalWeight += weight;
        });
        const diseaseRisk = total === 0 ? 20 : Math.round((weightedDisease / totalWeight) * 100);

        // Yield risk: avg severity of last 5
        const recent5 = diagnoses.slice(0, 5);
        const yieldRisk = recent5.length === 0 ? 15 : Math.min(100, Math.round(
            recent5.reduce((s, d) => s + (HEALTHY(d) ? 0 : (SEVERITY_WEIGHT[d.diagnosis.severityLevel as string] ?? 30)), 0) / recent5.length
        ));

        // Weather risk: simple heuristic
        const month = new Date().getMonth() + 1;
        const crop = (diagnoses[0]?.cropType ?? 'wheat').toLowerCase();
        const sensitive = ['tomato', 'potato', 'cotton', 'rice', 'paddy', 'sugarcane', 'maize', 'corn'].includes(crop);
        const monsoon = [6, 7, 8, 9].includes(month);
        const frost = [12, 1, 2].includes(month);
        const drought = [3, 4, 5].includes(month);
        let weatherRisk = 20;
        if (monsoon) weatherRisk = sensitive ? 70 : 45;
        else if (frost) weatherRisk = sensitive ? 60 : 35;
        else if (drought) weatherRisk = sensitive ? 55 : 30;
        else weatherRisk = sensitive ? 30 : 20;

        const healthScore = Math.max(0, Math.round(100 - (diseaseRisk + yieldRisk + weatherRisk) / 3));

        return { total, healthy, diseased, needingAttention, diseaseRisk, yieldRisk, weatherRisk, healthScore };
    }, [diagnoses]);

    const hLabel = healthLabel(metrics.healthScore);

    // ── AI Recommendation fetch ───────────────────────────────────────────────

    useEffect(() => {
        if (fetchedRef.current || diagnoses.length === 0) return;
        fetchedRef.current = true;

        const primaryCrop = diagnoses[0]?.cropType ?? 'wheat';
        const scans = diagnoses.slice(0, 15).map(d => ({
            diseaseName: d.diagnosis.diseaseName,
            severityLevel: d.diagnosis.severityLevel ?? 'Not Applicable',
            createdAtMs: (() => { try { return d.createdAt.toMillis(); } catch { return Date.now(); } })(),
            cropType: d.cropType,
        }));

        setAiLoading(true);
        fetch('/api/farm-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cropType: primaryCrop, scans }),
        })
            .then(r => r.json())
            .then(res => {
                if (res.error) { setAiError(res.error); return; }
                setRecommendation(res.recommendation);
            })
            .catch(e => setAiError(e.message))
            .finally(() => setAiLoading(false));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── PDF Download ──────────────────────────────────────────────────────────

    const handleDownloadPDF = () => {
        window.print();
    };

    // ── Empty State ───────────────────────────────────────────────────────────

    if (diagnoses.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Activity className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-bold text-foreground mb-1">Farm Summary Report</p>
                <p className="text-xs text-muted-foreground mb-4">Scan your first crop to generate your farm health report</p>
                <button
                    onClick={() => router.push('/scan')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold active:scale-95 transition-transform"
                >
                    <ScanLine className="h-4 w-4" />
                    Scan Now
                </button>
            </div>
        );
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden print:shadow-none print:border-gray-300 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">

            {/* ── Header ── */}
            <div className="relative bg-gradient-to-r from-primary/10 via-emerald-500/10 to-teal-500/10 dark:from-primary/20 dark:via-emerald-500/15 dark:to-teal-500/15 px-5 pt-5 pb-4">
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                        <Activity className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-foreground">Farm Summary Report</p>
                        <p className="text-[10px] text-muted-foreground">Real-time health overview</p>
                    </div>
                </div>
            </div>

            <div className="px-5 pb-5 flex flex-col gap-5">

                {/* ── 1. Overall Farm Health ── */}
                <div className="flex items-center gap-5 pt-4">
                    <ScoreCircle score={metrics.healthScore} color={hLabel.color} />
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Overall Health</p>
                        <p className="text-lg font-bold leading-tight" style={{ color: hLabel.color }}>
                            {hLabel.text}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            Based on {metrics.total} scan{metrics.total !== 1 ? 's' : ''}, disease risk, yield risk, and weather conditions.
                        </p>
                    </div>
                </div>

                {/* ── Divider ── */}
                <div className="h-px bg-border dark:bg-white/8" />

                {/* ── 2. Crop Status ── */}
                <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-2.5">Crop Status</p>
                    <div className="grid grid-cols-4 gap-2">
                        <StatBox label="Total Scanned" value={metrics.total} color="#6366f1" />
                        <StatBox label="Healthy" value={metrics.healthy} color="#22c55e" />
                        <StatBox label="Diseased" value={metrics.diseased} color="#ef4444" />
                        <StatBox label="Needs Care" value={metrics.needingAttention} color="#f59e0b" />
                    </div>
                </div>

                {/* ── Divider ── */}
                <div className="h-px bg-border dark:bg-white/8" />

                {/* ── 3. Risk Overview ── */}
                <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-2.5">Risk Overview</p>
                    <div className="flex flex-col gap-3">
                        <RiskRow
                            icon={<ShieldAlert className="h-3.5 w-3.5" />}
                            label="Disease Risk"
                            score={metrics.diseaseRisk}
                        />
                        <RiskRow
                            icon={<TrendingDown className="h-3.5 w-3.5" />}
                            label="Yield Risk"
                            score={metrics.yieldRisk}
                        />
                        <RiskRow
                            icon={<CloudLightning className="h-3.5 w-3.5" />}
                            label="Weather Risk"
                            score={metrics.weatherRisk}
                        />
                    </div>
                </div>

                {/* ── Divider ── */}
                <div className="h-px bg-border dark:bg-white/8" />

                {/* ── 4. AI Farm Recommendation ── */}
                <div>
                    <div className="flex items-center gap-2 mb-2.5">
                        <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">AI Recommendation</p>
                    </div>
                    <div className="rounded-xl bg-violet-50/60 dark:bg-violet-500/10 border border-violet-200/40 dark:border-violet-500/20 p-3.5">
                        {aiLoading && <SkeletonRecommendation />}
                        {aiError && (
                            <p className="text-xs text-red-500">⚠ Unable to generate recommendation</p>
                        )}
                        {recommendation && !aiLoading && (
                            <p className="text-sm text-foreground leading-relaxed">
                                "{recommendation}"
                            </p>
                        )}
                        {!recommendation && !aiLoading && !aiError && (
                            <p className="text-xs text-muted-foreground italic">Awaiting AI analysis…</p>
                        )}
                    </div>
                </div>

                {/* ── Divider ── */}
                <div className="h-px bg-border dark:bg-white/8" />

                {/* ── 5. Quick Action Buttons ── */}
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => router.push('/insights')}
                        className={cn(
                            'flex flex-col items-center gap-1.5 p-3 rounded-xl',
                            'bg-primary/10 hover:bg-primary/15 active:scale-95',
                            'transition-all duration-150',
                        )}
                    >
                        <ArrowRight className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-semibold text-primary text-center leading-tight">View Insights</span>
                    </button>

                    <button
                        onClick={() => router.push('/scan')}
                        className={cn(
                            'flex flex-col items-center gap-1.5 p-3 rounded-xl',
                            'bg-emerald-500/10 hover:bg-emerald-500/15 active:scale-95',
                            'transition-all duration-150',
                        )}
                    >
                        <ScanLine className="h-4 w-4 text-emerald-600" />
                        <span className="text-[10px] font-semibold text-emerald-600 text-center leading-tight">Scan Crop</span>
                    </button>

                    <button
                        onClick={() => openChat()}
                        className={cn(
                            'flex flex-col items-center gap-1.5 p-3 rounded-xl',
                            'bg-violet-500/10 hover:bg-violet-500/15 active:scale-95',
                            'transition-all duration-150',
                        )}
                    >
                        <Bot className="h-4 w-4 text-violet-600" />
                        <span className="text-[10px] font-semibold text-violet-600 text-center leading-tight">Ask Farm AI</span>
                    </button>
                </div>

                {/* ── Download PDF Button ── */}
                <button
                    onClick={handleDownloadPDF}
                    className={cn(
                        'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl',
                        'border border-border hover:bg-muted/50 active:scale-[0.98]',
                        'transition-all duration-150 print:hidden',
                    )}
                >
                    <FileDown className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground">Download Farm Report (PDF)</span>
                </button>
            </div>
        </div>
    );
}
