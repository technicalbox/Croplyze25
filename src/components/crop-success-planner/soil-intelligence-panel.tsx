'use client';

/**
 * @fileOverview Soil Intelligence Panel — displays the SoilIntelligenceOutput
 * produced by soil-intelligence-flow.ts as a set of expandable sections.
 *
 * Designed as a self-contained component so it can be dropped into any page
 * without modifying existing components.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import {
    ChevronDown,
    ChevronUp,
    Layers,
    Sprout,
    FlaskConical,
    Leaf,
    AlertTriangle,
    CheckCircle2,
    ShieldCheck,
    Zap,
} from 'lucide-react';
import type { SoilIntelligenceOutput } from '@/farming-partner/crop-success-planner-service';

interface Props {
    data: SoilIntelligenceOutput;
}

// ─── Colour mappings ──────────────────────────────────────────────────────────

const severityConfig = {
    Critical: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-600', dark: 'dark:text-red-400' },
    High: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-600', dark: 'dark:text-orange-400' },
    Medium: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-600', dark: 'dark:text-yellow-400' },
    Low: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-600', dark: 'dark:text-blue-400' },
};

const gradeColor = {
    A: 'text-green-500', B: 'text-emerald-500', C: 'text-yellow-500', D: 'text-orange-500', F: 'text-red-500',
};

const envCategoryIcon: Record<string, React.ElementType> = {
    'Soil Health': Layers,
    'Water Quality': Sprout,
    Biodiversity: Leaf,
    'Human Safety': ShieldCheck,
    Climate: AlertTriangle,
};

const safetyClassBadge: Record<string, string> = {
    'WHO Class U': 'bg-green-500/10 text-green-700 border-green-500/20',
    'WHO Class III': 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
    'WHO Class II': 'bg-orange-500/10 text-orange-700 border-orange-500/20',
    'WHO Class Ib': 'bg-red-500/10 text-red-700 border-red-500/20',
    'WHO Class Ia': 'bg-red-700/10 text-red-900 border-red-700/30',
};

// ─── Reusable expandable section ─────────────────────────────────────────────

function SoilSection({
    title,
    icon: Icon,
    badge,
    children,
    defaultOpen = false,
    accent = 'primary',
}: {
    title: string;
    icon: React.ElementType;
    badge?: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    accent?: 'primary' | 'emerald' | 'amber' | 'blue' | 'rose';
}) {
    const [open, setOpen] = useState(defaultOpen);

    const accentMap = {
        primary: 'bg-primary/10 text-primary',
        emerald: 'bg-emerald-500/10 text-emerald-600',
        amber: 'bg-amber-500/10 text-amber-600',
        blue: 'bg-blue-500/10 text-blue-600',
        rose: 'bg-rose-500/10 text-rose-600',
    };

    return (
        <Card className="rounded-2xl border-border overflow-hidden">
            <button
                type="button"
                onClick={() => { haptics.light(); setOpen(o => !o); }}
                className="w-full flex items-center justify-between px-4 py-3.5 active:bg-muted/50 transition-colors"
            >
                <div className="flex items-center gap-2.5">
                    <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg', accentMap[accent])}>
                        <Icon className="h-4 w-4" />
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

// ─── Soil health mini-gauge ───────────────────────────────────────────────────

function SoilHealthBar({ score, grade }: { score: number; grade: string }) {
    const color =
        score >= 75 ? 'bg-green-500' :
            score >= 55 ? 'bg-yellow-500' :
                score >= 35 ? 'bg-orange-500' :
                    'bg-red-500';

    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                    className={cn('h-full rounded-full transition-all duration-1000', color)}
                    style={{ width: `${score}%` }}
                />
            </div>
            <span className={cn('text-base font-black w-6 text-center', gradeColor[grade as keyof typeof gradeColor] ?? 'text-foreground')}>
                {grade}
            </span>
            <span className="text-sm font-bold text-foreground w-10 text-right">{score}</span>
        </div>
    );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export default function SoilIntelligencePanel({ data }: Props) {
    return (
        <div className="flex flex-col gap-3">

            {/* Header + Soil Health Score */}
            <div className="flex items-center gap-2 mb-1">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/10">
                    <Layers className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                    <h3 className="text-base font-bold">Soil Preparation Intelligence</h3>
                    <p className="text-xs text-muted-foreground">AI soil science analysis</p>
                </div>
            </div>

            {/* Soil Health Score Card */}
            <Card className="rounded-2xl border-border bg-gradient-to-br from-card to-emerald-500/5">
                <CardContent className="p-4 flex flex-col gap-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Soil Health Score</p>
                    <SoilHealthBar score={data.soilHealthScore} grade={data.soilHealthGrade} />
                    <p className="text-sm text-muted-foreground leading-relaxed">{data.soilConditionSummary}</p>

                    {/* Priority actions */}
                    {data.priorityActions.length > 0 && (
                        <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 flex flex-col gap-2">
                            <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                                <Zap className="h-3.5 w-3.5" /> Priority Actions
                            </p>
                            {data.priorityActions.map((action, i) => (
                                <p key={i} className="text-xs text-muted-foreground leading-relaxed pl-1">
                                    <span className="font-bold text-primary">{i + 1}.</span> {action}
                                </p>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Residue Handling */}
            <SoilSection title="Residue Handling" icon={Layers} accent="emerald" defaultOpen={true}>
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 bg-emerald-500/10 text-xs">
                            {data.residueHandling.method}
                        </Badge>
                        <span className="text-xs text-muted-foreground">🕐 {data.residueHandling.timing}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{data.residueHandling.rationale}</p>
                    <div className="bg-primary/5 border border-primary/10 rounded-xl p-3">
                        <p className="text-xs font-semibold text-primary mb-1">✓ Benefit to next crop</p>
                        <p className="text-xs text-muted-foreground">{data.residueHandling.benefitToNextCrop}</p>
                    </div>
                    {data.residueHandling.toolsRequired.length > 0 && (
                        <div className="flex flex-col gap-1">
                            <p className="text-xs font-semibold text-foreground">🔧 Tools needed</p>
                            <div className="flex flex-wrap gap-1.5">
                                {data.residueHandling.toolsRequired.map((tool) => (
                                    <span key={tool} className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">{tool}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    {data.residueHandling.warnings.length > 0 && (
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
                            <p className="text-xs font-bold text-orange-600 mb-1">⚠ Precautions</p>
                            {data.residueHandling.warnings.map((w, i) => (
                                <p key={i} className="text-xs text-orange-700 dark:text-orange-400">• {w}</p>
                            ))}
                        </div>
                    )}
                </div>
            </SoilSection>

            {/* Seed Removal */}
            <SoilSection title="Seed Removal Strategies" icon={Sprout} accent="amber"
                badge={`${data.seedRemoval.strategies.length} strategies`}>
                <div className="flex flex-col gap-3">
                    {data.seedRemoval.primaryWeedTargets.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-foreground mb-1.5">🌿 Primary weed targets</p>
                            <div className="flex flex-wrap gap-1.5">
                                {data.seedRemoval.primaryWeedTargets.map((w) => (
                                    <span key={w} className="text-xs bg-amber-500/10 text-amber-700 border border-amber-500/20 px-2 py-0.5 rounded-full">{w}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    {data.seedRemoval.strategies.map((s, i) => (
                        <div key={i} className="border border-border rounded-xl p-3 flex flex-col gap-1.5">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold">{s.name}</span>
                                <Badge variant="outline" className={cn('text-xs shrink-0',
                                    s.effectiveness === 'Very High' ? 'text-green-600 border-green-500/30 bg-green-500/10' :
                                        s.effectiveness === 'High' ? 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10' :
                                            s.effectiveness === 'Moderate' ? 'text-yellow-600 border-yellow-500/30 bg-yellow-500/10' :
                                                'text-muted-foreground'
                                )}>
                                    {s.effectiveness}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>
                            <p className="text-xs text-accent-foreground font-medium">🕐 {s.timing}</p>
                        </div>
                    ))}
                    {data.seedRemoval.mechanicalOptions.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-foreground mb-1">🔧 Mechanical options</p>
                            {data.seedRemoval.mechanicalOptions.map((m, i) => (
                                <p key={i} className="text-xs text-muted-foreground">• {m}</p>
                            ))}
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground italic border-t border-border pt-2">{data.seedRemoval.note}</p>
                </div>
            </SoilSection>

            {/* Organic Improvement Plan */}
            <SoilSection title="Organic Improvement Plan" icon={Leaf} accent="primary"
                badge={`${data.organicImprovementPlan.amendments.length} amendments`}>
                <div className="flex flex-col gap-3">
                    <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-primary pl-3">
                        {data.organicImprovementPlan.implementationOrder}
                    </p>
                    {data.organicImprovementPlan.amendments.map((a, i) => (
                        <div key={i} className="border border-border rounded-xl p-3.5 flex flex-col gap-2">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-sm font-bold">{a.name}</span>
                                    <span className="text-xs text-muted-foreground">{a.ratePerAcre} · {a.timing}</span>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    {a.estimatedCostUSD > 0 && (
                                        <span className="text-xs font-bold text-primary">${a.estimatedCostUSD}/ac</span>
                                    )}
                                    {a.isLocallyAvailable && (
                                        <span className="text-[10px] bg-green-500/10 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                                            Locally available
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{a.benefit}</p>
                        </div>
                    ))}
                    {data.organicImprovementPlan.totalEstimatedCostUSD > 0 && (
                        <div className="flex items-center justify-between border-t border-border pt-2">
                            <span className="text-xs font-semibold text-muted-foreground">Total estimated cost</span>
                            <span className="text-sm font-black text-primary">${data.organicImprovementPlan.totalEstimatedCostUSD}/acre</span>
                        </div>
                    )}
                </div>
            </SoilSection>

            {/* Chemical Alternatives */}
            <SoilSection title="Chemical Alternatives" icon={FlaskConical} accent="blue"
                badge={`${data.chemicalAlternatives.length} options`}>
                <div className="flex flex-col gap-3">
                    <p className="text-xs text-muted-foreground border-l-2 border-blue-500 pl-3">
                        Options ordered safest first. Always follow label instructions and wear required PPE.
                    </p>
                    {data.chemicalAlternatives.map((c, i) => (
                        <div key={i} className="border border-border rounded-xl p-3.5 flex flex-col gap-2">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex flex-col gap-0.5 min-w-0">
                                    <span className="text-sm font-bold leading-tight">{c.productName}</span>
                                    <span className="text-xs text-muted-foreground italic">{c.activeIngredient}</span>
                                </div>
                                <Badge variant="outline" className={cn('text-xs shrink-0 whitespace-nowrap',
                                    safetyClassBadge[c.safetyClass] ?? 'bg-muted text-muted-foreground border-border'
                                )}>
                                    {c.safetyClass}
                                </Badge>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                                <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{c.purpose}</span>
                                <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{c.dosagePerAcre}</span>
                                {c.withholdingPeriodDays > 0 && (
                                    <span className="text-xs bg-orange-500/10 text-orange-700 px-2 py-0.5 rounded-full">
                                        {c.withholdingPeriodDays}d withhold
                                    </span>
                                )}
                            </div>

                            <p className="text-xs text-muted-foreground">🕐 {c.applicationTiming}</p>

                            {c.ppeRequired.length > 0 && (
                                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2">
                                    <p className="text-xs font-semibold text-yellow-700 mb-0.5">🥽 PPE required</p>
                                    <p className="text-xs text-yellow-800 dark:text-yellow-300">{c.ppeRequired.join(' · ')}</p>
                                </div>
                            )}

                            {c.saferAlternatives.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-green-700 mb-1">✓ Safer alternatives</p>
                                    {c.saferAlternatives.map((alt, j) => (
                                        <p key={j} className="text-xs text-muted-foreground">• {alt}</p>
                                    ))}
                                </div>
                            )}

                            <p className="text-xs text-muted-foreground border-t border-border pt-2">
                                🌍 {c.environmentalImpact}
                            </p>
                        </div>
                    ))}
                </div>
            </SoilSection>

            {/* Environmental Warnings */}
            <SoilSection title="Environmental Warnings" icon={AlertTriangle} accent="rose"
                badge={`${data.environmentalWarnings.length}`}>
                <div className="flex flex-col gap-3">
                    {data.environmentalWarnings.map((w, i) => {
                        const cfg = severityConfig[w.severity] ?? severityConfig.Low;
                        const Icon = envCategoryIcon[w.category] ?? AlertTriangle;
                        return (
                            <div key={i} className={cn('rounded-xl border p-3.5 flex flex-col gap-2', cfg.bg, cfg.border)}>
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Icon className={cn('h-4 w-4 shrink-0', cfg.text)} />
                                        <span className="text-sm font-bold">{w.title}</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Badge variant="outline" className={cn('text-xs', cfg.text, cfg.border)}>{w.severity}</Badge>
                                        <span className="text-xs text-muted-foreground">{w.category}</span>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{w.description}</p>
                                <div className="flex flex-col gap-0.5 pt-1 border-t border-border/40">
                                    <p className="text-xs font-semibold text-foreground">💡 Mitigation</p>
                                    <p className="text-xs text-muted-foreground">{w.mitigation}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </SoilSection>
        </div>
    );
}
