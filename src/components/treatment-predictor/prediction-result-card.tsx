'use client';

import {
    CheckCircle2,
    AlertTriangle,
    XCircle,
    TrendingUp,
    IndianRupee,
    Shield,
    Lightbulb,
    AlertCircle,
    Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TreatmentOutcomePredictorOutput } from '@/ai/flows/treatment-outcome-predictor-flow';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PredictionResultCardProps {
    medicineName: string;
    category: string;
    prediction: TreatmentOutcomePredictorOutput;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getScoreColor(score: number) {
    if (score >= 70) return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500', ring: 'ring-emerald-500/30', badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', label: 'Highly Suitable' };
    if (score >= 40) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500', ring: 'ring-amber-500/30', badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', label: 'Moderate' };
    return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-500', ring: 'ring-red-500/30', badge: 'bg-red-500/15 text-red-600 dark:text-red-400', label: 'Risky Choice' };
}

function getStatusIcon(score: number) {
    if (score >= 70) return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    if (score >= 40) return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
}

const CATEGORY_GRADIENT: Record<string, string> = {
    fungicide: 'from-violet-600 to-purple-700',
    insecticide: 'from-rose-600 to-red-700',
    herbicide: 'from-amber-600 to-orange-700',
    organic: 'from-emerald-600 to-green-700',
    'bio-fungicide': 'from-teal-600 to-cyan-700',
    'bio-insecticide': 'from-cyan-600 to-blue-700',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function PredictionResultCard({
    medicineName,
    category,
    prediction,
}: PredictionResultCardProps) {
    const scoreColor = getScoreColor(prediction.suitabilityScore);
    const successColor = getScoreColor(prediction.treatmentSuccessProbability);
    const gradient = CATEGORY_GRADIENT[category] || 'from-primary to-emerald-700';

    // SVG circle progress — use radius 38 so stroke (6px) stays well inside the 100×100 viewBox
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (prediction.suitabilityScore / 100) * circumference;

    return (
        <div className="space-y-4 animate-slide-up-fade">
            {/* ── Hero card ── */}
            <div className={cn('relative rounded-2xl overflow-hidden bg-gradient-to-br text-white shadow-xl', gradient)}>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
                <div className="relative p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-white/60 mb-1">Treatment Prediction</p>
                    <h3 className="text-xl font-bold leading-tight mb-1">{medicineName}</h3>
                    <span className="inline-block text-[10px] font-bold uppercase bg-white/20 px-2 py-0.5 rounded-full tracking-wide capitalize">
                        {category}
                    </span>
                </div>
            </div>

            {/* ── Suitability score ring (full width, centred) ── */}
            <div className="bg-card rounded-2xl border border-border p-5 flex flex-col items-center justify-center">
                <div className="relative w-32 h-32">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" overflow="visible">
                        <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                        <circle
                            cx="50" cy="50" r={radius} fill="none"
                            stroke="currentColor"
                            className={scoreColor.text}
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={cn('text-3xl font-bold leading-none', scoreColor.text)}>{prediction.suitabilityScore}%</span>
                    </div>
                </div>
                <p className="text-xs font-semibold text-muted-foreground mt-2">Suitability Score</p>
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full mt-1', scoreColor.badge)}>
                    {scoreColor.label}
                </span>
            </div>

            {/* ── Key metrics row ── */}
            <div className="grid grid-cols-3 gap-2">
                {/* Disease Control */}
                <div className="bg-card rounded-xl border border-border p-3 flex flex-col items-center text-center gap-1">
                    <Shield className={cn('h-5 w-5', prediction.diseaseControlLevel === 'High' ? 'text-emerald-500' : prediction.diseaseControlLevel === 'Moderate' ? 'text-amber-500' : 'text-red-500')} />
                    <p className="text-[10px] text-muted-foreground font-medium leading-tight">Disease Control</p>
                    <p className="text-sm font-bold">{prediction.diseaseControlLevel}</p>
                </div>

                {/* Yield Recovery */}
                <div className="bg-card rounded-xl border border-border p-3 flex flex-col items-center text-center gap-1">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                    <p className="text-[10px] text-muted-foreground font-medium leading-tight">Yield Recovery</p>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{prediction.yieldRecoveryPercent}%</p>
                </div>

                {/* Success Probability */}
                <div className="bg-card rounded-xl border border-border p-3 flex flex-col items-center text-center gap-1">
                    {getStatusIcon(prediction.treatmentSuccessProbability)}
                    <p className="text-[10px] text-muted-foreground font-medium leading-tight">Success Rate</p>
                    <p className={cn('text-sm font-bold', successColor.text)}>{prediction.treatmentSuccessProbability}%</p>
                </div>
            </div>

            {/* ── Profit Impact ── */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                    <IndianRupee className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-sm font-bold text-foreground">Estimated Profit Impact</p>
                </div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{prediction.estimatedProfitImpact.min.toLocaleString('en-IN')} – ₹{prediction.estimatedProfitImpact.max.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">improvement per acre</p>
            </div>

            {/* ── Reasoning ── */}
            <div className="bg-card rounded-2xl border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <p className="text-sm font-bold">Analysis Summary</p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{prediction.reasoning}</p>
            </div>

            {/* ── Risk Factors ── */}
            {prediction.riskFactors.length > 0 && (
                <div className="bg-card rounded-2xl border border-border p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <p className="text-sm font-bold">Risk Factors</p>
                    </div>
                    <ul className="space-y-2">
                        {prediction.riskFactors.map((risk, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                                {risk}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* ── Application Tips ── */}
            {prediction.applicationTips.length > 0 && (
                <div className="bg-card rounded-2xl border border-border p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <p className="text-sm font-bold">Application Tips</p>
                    </div>
                    <ul className="space-y-2">
                        {prediction.applicationTips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                {tip}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* ── Disclaimer ── */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50 border border-border">
                <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Predictions are based on crop data, weather conditions, medicine database references, and historical treatment insights. Results are not guaranteed.
                </p>
            </div>
        </div>
    );
}
