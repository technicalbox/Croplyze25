'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import {
    RotateCcw,
    Volume2,
    VolumeX,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Info,
    Sprout,
    Droplets,
    TrendingUp,
    ListChecks,
    ShieldAlert,
    RefreshCw,
} from 'lucide-react';
import SuitabilityGauge from './suitability-gauge';
import SoilIntelligencePanel from './soil-intelligence-panel';
import type { CropSuccessPlan } from '@/farming-partner/crop-success-planner-service';

interface Props {
    plan: CropSuccessPlan;
    onReset: () => void;
}

// ─── Severity config ──────────────────────────────────────────────────────────

const severityConfig = {
    Critical: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: XCircle },
    High: { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: AlertTriangle },
    Medium: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: AlertTriangle },
    Low: { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Info },
};

const phaseConfig = {
    'Pre-Planting': { color: 'bg-violet-500/10 text-violet-600', icon: '🌱' },
    'At Planting': { color: 'bg-green-500/10 text-green-600', icon: '🌾' },
    'Early Growth': { color: 'bg-emerald-500/10 text-emerald-600', icon: '🌿' },
    'Mid-Season': { color: 'bg-teal-500/10 text-teal-600', icon: '☀️' },
    'Pre-Harvest': { color: 'bg-amber-500/10 text-amber-600', icon: '🌻' },
};

const priorityConfig = {
    'Must Do': { color: 'bg-red-500/10 text-red-600 border-red-500/20', label: 'Must Do' },
    'Recommended': { color: 'bg-primary/10 text-primary border-primary/20', label: 'Recommended' },
    'Optional': { color: 'bg-muted text-muted-foreground border-border', label: 'Optional' },
};

// ─── Voice reader ─────────────────────────────────────────────────────────────

function buildSpeechText(plan: CropSuccessPlan): string {
    const r = plan.result;
    return [
        `Crop Success Report for ${plan.input.cropName} in ${plan.input.region}.`,
        `Suitability score: ${r.suitabilityScore} out of 100, Grade ${r.suitabilityGrade}.`,
        r.suitabilityRationale,
        `Rotation assessment: ${r.rotationAssessment.reasoning}`,
        `Top risks: ${r.risks.slice(0, 3).map(k => `${k.riskName}, ${k.severity} severity`).join('. ')}.`,
        `Water advice: ${r.waterManagementAdvice}`,
        `Expected yield: ${r.expectedYieldRangeKgPerAcre.min} to ${r.expectedYieldRangeKgPerAcre.max} kilograms per acre.`,
        `Overall verdict: ${r.overallVerdict}`,
    ].join(' ');
}

function VoiceButton({ plan }: { plan: CropSuccessPlan }) {
    const [speaking, setSpeaking] = useState(false);

    const handleVoice = useCallback(() => {
        if (!('speechSynthesis' in window)) return;
        haptics.light();

        if (speaking) {
            window.speechSynthesis.cancel();
            setSpeaking(false);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(buildSpeechText(plan));
        utterance.rate = 0.92;
        utterance.pitch = 1;
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setSpeaking(true);
    }, [speaking, plan]);

    return (
        <Button
            variant={speaking ? 'default' : 'outline'}
            size="sm"
            onClick={handleVoice}
            className="rounded-xl gap-2 text-xs font-semibold h-9"
        >
            {speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            {speaking ? 'Stop' : 'Read Aloud'}
        </Button>
    );
}

// ─── Expandable section ───────────────────────────────────────────────────────

function ExpandableSection({
    title, icon: Icon, children, defaultOpen = false, badge,
}: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
    badge?: string;
}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <Card className="rounded-2xl border-border overflow-hidden">
            <button
                type="button"
                onClick={() => { haptics.light(); setOpen(o => !o); }}
                className="w-full flex items-center justify-between px-4 py-3.5 active:bg-muted/50 transition-colors"
            >
                <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-bold">{title}</span>
                    {badge && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                            {badge}
                        </span>
                    )}
                </div>
                {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {open && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                    <Separator />
                    <div className="p-4">{children}</div>
                </div>
            )}
        </Card>
    );
}

// ─── Main Results Component ───────────────────────────────────────────────────

export default function PlannerResults({ plan, onReset }: Props) {
    const r = plan.result;

    return (
        <div className="flex flex-col gap-4 animate-in fade-in-0 duration-400">

            {/* Top action row */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-base font-bold">Analysis Complete</h2>
                    <p className="text-xs text-muted-foreground">
                        {plan.input.cropName} · {plan.input.region}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <VoiceButton plan={plan} />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { haptics.light(); onReset(); }}
                        className="rounded-xl h-9 text-xs gap-1.5"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        New Plan
                    </Button>
                </div>
            </div>

            {/* ─── Score Card ─── */}
            <Card className="rounded-2xl border-border bg-gradient-to-br from-card to-primary/5">
                <CardContent className="p-5 flex flex-col items-center gap-4">
                    <SuitabilityGauge
                        score={r.suitabilityScore}
                        grade={r.suitabilityGrade}
                    />
                    <p className="text-center text-sm text-muted-foreground leading-relaxed">
                        {r.suitabilityRationale}
                    </p>

                    {/* Input chips */}
                    <div className="flex flex-wrap gap-1.5 justify-center">
                        {[
                            { icon: '🌱', label: plan.input.cropName },
                            { icon: '🪨', label: `${plan.input.soilType} soil` },
                            { icon: '💧', label: plan.input.waterAvailability },
                            { icon: '📅', label: plan.input.season },
                        ].map(({ icon, label }) => (
                            <span key={label} className="text-xs bg-muted/60 px-2.5 py-1 rounded-full text-muted-foreground font-medium">
                                {icon} {label}
                            </span>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* ─── Rotation & Yield Strip ─── */}
            <div className="grid grid-cols-2 gap-3">
                <Card className={cn(
                    'rounded-2xl border',
                    r.rotationAssessment.isBeneficial ? 'border-green-500/20 bg-green-500/5' : 'border-orange-500/20 bg-orange-500/5'
                )}>
                    <CardContent className="p-3.5 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                            <RefreshCw className={cn('h-4 w-4', r.rotationAssessment.isBeneficial ? 'text-green-500' : 'text-orange-500')} />
                            <span className="text-xs font-semibold text-muted-foreground">Rotation</span>
                        </div>
                        <span className={cn('text-sm font-bold', r.rotationAssessment.isBeneficial ? 'text-green-600' : 'text-orange-600')}>
                            {r.rotationAssessment.isBeneficial ? '✓ Beneficial' : '⚠ Caution'}
                        </span>
                        <span className="text-xs text-muted-foreground">N: {r.rotationAssessment.nitrogenEffect}</span>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-border bg-primary/5 border-primary/20">
                    <CardContent className="p-3.5 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            <span className="text-xs font-semibold text-muted-foreground">Yield Est.</span>
                        </div>
                        <span className="text-sm font-bold text-primary">
                            {r.expectedYieldRangeKgPerAcre.min}–{r.expectedYieldRangeKgPerAcre.max}
                        </span>
                        <span className="text-xs text-muted-foreground">kg / acre</span>
                    </CardContent>
                </Card>
            </div>

            {/* ─── Critical Warnings ─── */}
            {r.warnings.length > 0 && (
                <Card className="rounded-2xl border-red-500/30 bg-red-500/5">
                    <CardContent className="p-4 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-red-500 shrink-0" />
                            <span className="text-sm font-bold text-red-600">Critical Warnings</span>
                        </div>
                        {r.warnings.map((w, i) => (
                            <p key={i} className="text-xs text-red-700 dark:text-red-400 leading-relaxed pl-7">• {w}</p>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* ─── Risks ─── */}
            <ExpandableSection
                title="Risk Analysis"
                icon={AlertTriangle}
                badge={`${r.risks.length} risks found`}
                defaultOpen={true}
            >
                <div className="flex flex-col gap-3">
                    {r.risks.map((risk, i) => {
                        const cfg = severityConfig[risk.severity] ?? severityConfig.Low;
                        const Icon = cfg.icon;
                        return (
                            <div
                                key={i}
                                className={cn('rounded-xl border p-3.5 flex flex-col gap-2', cfg.bg, cfg.border)}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Icon className={cn('h-4 w-4 shrink-0', cfg.color)} />
                                        <span className="text-sm font-semibold">{risk.riskName}</span>
                                    </div>
                                    <Badge variant="outline" className={cn('text-xs shrink-0', cfg.color, cfg.border)}>
                                        {risk.severity}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{risk.description}</p>
                                <div className="flex flex-col gap-1 pt-1 border-t border-border/40">
                                    <p className="text-xs font-semibold text-foreground">💡 Mitigation</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{risk.mitigation}</p>
                                </div>
                                {risk.estimatedImpactOnYield && (
                                    <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                                        📉 {risk.estimatedImpactOnYield}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </ExpandableSection>

            {/* ─── Soil Preparation Intelligence ─── */}
            {plan.soilIntelligence && (
                <ExpandableSection
                    title="Soil Preparation Intelligence"
                    icon={Sprout}
                    badge="AI Soil Analysis"
                    defaultOpen={false}
                >
                    <SoilIntelligencePanel data={plan.soilIntelligence} />
                </ExpandableSection>
            )}

            {/* ─── Preparation Steps ─── */}
            <ExpandableSection
                title="Preparation Plan"
                icon={ListChecks}
                badge={`${r.preparationSteps.length} steps`}
                defaultOpen={false}
            >
                <div className="flex flex-col gap-3">
                    {r.preparationSteps.map((step) => {
                        const phase = phaseConfig[step.phase] ?? { color: 'bg-muted text-muted-foreground', icon: '📋' };
                        const priority = priorityConfig[step.priority] ?? priorityConfig['Recommended'];
                        return (
                            <div key={step.stepNumber} className="flex gap-3">
                                {/* Step number */}
                                <div className="flex flex-col items-center gap-1 shrink-0">
                                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                        {step.stepNumber}
                                    </div>
                                    {step.stepNumber < r.preparationSteps.length && (
                                        <div className="w-0.5 flex-1 min-h-[16px] bg-border rounded-full" />
                                    )}
                                </div>

                                {/* Step content */}
                                <div className="flex flex-col gap-2 pb-3 flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex flex-col gap-1 min-w-0">
                                            <span className="text-sm font-bold leading-tight">{step.title}</span>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', phase.color)}>
                                                    {phase.icon} {step.phase}
                                                </span>
                                                <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', priority.color)}>
                                                    {priority.label}
                                                </span>
                                            </div>
                                        </div>
                                        {step.estimatedCostUSD > 0 && (
                                            <span className="text-xs font-semibold text-primary shrink-0">
                                                ${step.estimatedCostUSD}/ac
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                                    <p className="text-xs text-accent-foreground font-medium">🕐 {step.timing}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ExpandableSection>

            {/* ─── Water Management ─── */}
            <ExpandableSection title="Water Management" icon={Droplets} defaultOpen={false}>
                <p className="text-sm text-muted-foreground leading-relaxed">{r.waterManagementAdvice}</p>
            </ExpandableSection>

            {/* ─── Recommendations ─── */}
            <ExpandableSection
                title="Top Recommendations"
                icon={CheckCircle2}
                badge={`${r.recommendations.length}`}
                defaultOpen={false}
            >
                <ol className="flex flex-col gap-3">
                    {r.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                                {i + 1}
                            </span>
                            <p className="text-sm text-muted-foreground leading-relaxed">{rec}</p>
                        </li>
                    ))}
                </ol>
            </ExpandableSection>

            {/* ─── Overall Verdict ─── */}
            <Card className="rounded-2xl border-primary/20 bg-primary/5">
                <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Sprout className="h-4 w-4 text-primary" />
                        Overall Verdict
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{r.overallVerdict}</p>
                </CardContent>
            </Card>

            {/* Bottom CTA */}
            <Button
                variant="outline"
                onClick={() => { haptics.light(); onReset(); }}
                className="w-full rounded-xl h-12 font-semibold gap-2"
            >
                <RotateCcw className="h-4 w-4" />
                Plan Another Crop
            </Button>
        </div>
    );
}
