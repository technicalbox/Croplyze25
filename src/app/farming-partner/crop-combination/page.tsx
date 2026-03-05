'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    ArrowLeft, Sprout, Loader2, Zap, ChevronDown,
    Droplets, Sun, Target, Wheat, MapPin, Ruler,
    CloudRain, TrendingUp, ShieldCheck, Leaf, Sparkles,
    BookmarkCheck, Bookmark, RotateCcw, ChevronRight,
    FlaskConical, AlertTriangle, Info, Bug,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser as useUserFromAuth } from '@/firebase/auth/use-user';
import { useRouter } from 'next/navigation';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useRegion } from '@/providers/region-provider';
import { useChatbot } from '@/components/chatbot/chat-provider';
import {
    saveCropCombination as saveCombinationToFirestore,
    listSavedCropCombinations,
    deleteSavedCropCombination,
} from '@/farming-partner/crop-combination-client';

// ── Form option types ─────────────────────────────────────────────────────────

const SOIL_TYPES = ['Clay', 'Sandy', 'Loamy', 'Silt', 'Black Soil', 'Red Soil'] as const;
const SEASONS = ['Kharif', 'Rabi', 'Zaid', 'All Season'] as const;
const WATER_LEVELS = [
    { id: 'low' as const, label: 'Low', icon: '💧' },
    { id: 'medium' as const, label: 'Medium', icon: '💧💧' },
    { id: 'high' as const, label: 'High', icon: '💧💧💧' },
];
const IRRIGATION_TYPES = ['Rainfed', 'Canal', 'Drip', 'Sprinkler'] as const;
const SUNLIGHT_OPTIONS = [
    { id: 'partial_sun' as const, label: 'Partial Sun', icon: '⛅' },
    { id: 'full_sun' as const, label: 'Full Sun', icon: '☀️' },
];
const FARMING_GOALS = [
    { id: 'Maximum Yield', label: 'Maximum Yield', icon: TrendingUp, color: 'from-emerald-500 to-green-600' },
    { id: 'Maximum Profit', label: 'Maximum Profit', icon: Target, color: 'from-amber-500 to-orange-600' },
    { id: 'Soil Improvement', label: 'Soil Improvement', icon: Leaf, color: 'from-teal-500 to-cyan-600' },
    { id: 'Low Water Farming', label: 'Low Water Farming', icon: Droplets, color: 'from-blue-500 to-indigo-600' },
];

// ── AI Result type (mirrors flow output) ──────────────────────────────────────

interface CombinationResult {
    primaryCrop: string;
    companionCrop: string;
    strategy: string;
    suitabilityScore: number;
    benefits: string[];
    soilBenefit: string;
    waterEfficiency: string;
    pestReduction: string;
    expectedYieldBoost: string;
    plantingGuide: string;
    estimatedRevenuePerAcre: string;
}

interface AIResponse {
    recommendedCombinations: CombinationResult[];
    reasoning: string;
    seasonalAdvice: string;
    soilPreparation: string;
    warnings: string[];
}

// ── SelectField component ─────────────────────────────────────────────────────

function SelectField({
    label,
    icon: Icon,
    value,
    options,
    onChange,
    iconColor,
}: {
    label: string;
    icon: React.ElementType;
    value: string;
    options: readonly string[];
    onChange: (v: string) => void;
    iconColor: string;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <Icon className={cn('w-3.5 h-3.5', iconColor)} />
                {label}
            </label>
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={cn(
                        'w-full appearance-none px-4 py-3 pr-10 rounded-xl text-sm font-medium',
                        'bg-white/80 dark:bg-white/5 backdrop-blur-sm',
                        'border border-border/60 dark:border-white/10',
                        'text-foreground',
                        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30',
                        'transition-all duration-200',
                    )}
                >
                    <option value="">Select {label.toLowerCase()}...</option>
                    {options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
        </div>
    );
}

// ── ChipSelector component ────────────────────────────────────────────────────

function ChipSelector<T extends string>({
    label,
    icon: Icon,
    options,
    value,
    onChange,
    iconColor,
}: {
    label: string;
    icon: React.ElementType;
    options: { id: T; label: string; icon?: string | React.ElementType }[];
    value: T | '';
    onChange: (v: T) => void;
    iconColor: string;
}) {
    return (
        <div className="flex flex-col gap-2">
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <Icon className={cn('w-3.5 h-3.5', iconColor)} />
                {label}
            </label>
            <div className="flex flex-wrap gap-2">
                {options.map((opt) => (
                    <button
                        key={opt.id}
                        type="button"
                        onClick={() => { haptics.light(); onChange(opt.id); }}
                        className={cn(
                            'px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-150',
                            'active:scale-[0.96]',
                            value === opt.id
                                ? 'bg-primary/10 border-primary/30 text-primary dark:bg-primary/20'
                                : 'border-border/60 dark:border-white/10 text-muted-foreground hover:text-foreground hover:border-foreground/20',
                        )}
                    >
                        {typeof opt.icon === 'string' && <span className="mr-1">{opt.icon}</span>}
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ── Score color helpers ───────────────────────────────────────────────────────

function scoreColor(score: number) {
    if (score >= 85) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 70) return 'text-blue-600 dark:text-blue-400';
    if (score >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
}

function scoreBg(score: number) {
    if (score >= 85) return 'bg-emerald-500';
    if (score >= 70) return 'bg-blue-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-red-500';
}

const STRATEGY_COLORS: Record<string, string> = {
    'Intercropping': 'from-emerald-500 to-teal-600',
    'Companion Planting': 'from-blue-500 to-indigo-600',
    'Relay Cropping': 'from-amber-500 to-orange-600',
    'Mixed Cropping': 'from-violet-500 to-purple-600',
};

// ── Main Page Component ───────────────────────────────────────────────────────

export default function CropCombinationPage() {
    const { user, loading } = useUserFromAuth();
    const router = useRouter();
    const { region, hasRegion } = useRegion();
    const { openChatWithMessage } = useChatbot();

    // ── Form state ────────────────────────────────────────────────────────────
    const [soilType, setSoilType] = useState('');
    const [landSize, setLandSize] = useState('');
    const [regionInput, setRegionInput] = useState('');
    const [season, setSeason] = useState('');
    const [waterAvailability, setWaterAvailability] = useState<'low' | 'medium' | 'high' | ''>('');
    const [irrigationType, setIrrigationType] = useState('');
    const [sunlightExposure, setSunlightExposure] = useState<'partial_sun' | 'full_sun' | ''>('');
    const [farmingGoal, setFarmingGoal] = useState('');
    const [cropPreferences, setCropPreferences] = useState('');

    // ── Result state ──────────────────────────────────────────────────────────
    const [aiResult, setAiResult] = useState<AIResponse | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');
    const [expandedCard, setExpandedCard] = useState<number | null>(null);
    const [savedCombos, setSavedCombos] = useState<Set<string>>(new Set());

    // Auth guard
    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);

    // Auto-fill region from GPS
    useEffect(() => {
        if (hasRegion && !regionInput) {
            const parts = [region.city, region.state, region.country].filter(Boolean);
            setRegionInput(parts.join(', '));
        }
    }, [hasRegion, region, regionInput]);

    // ── Form validation ───────────────────────────────────────────────────────

    const isFormValid = soilType && landSize && parseFloat(landSize) > 0 && regionInput &&
        season && waterAvailability && irrigationType && sunlightExposure && farmingGoal;

    const filledCount = [soilType, landSize, regionInput, season, waterAvailability,
        irrigationType, sunlightExposure, farmingGoal].filter(Boolean).length;

    // ── Generate handler ──────────────────────────────────────────────────────

    const handleGenerate = useCallback(async () => {
        if (!isFormValid || !user) return;

        haptics.medium();
        setIsGenerating(true);
        setError('');
        setAiResult(null);
        setExpandedCard(null);

        try {
            const res = await fetch('/api/farming-partner/crop-combination', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.uid,
                },
                body: JSON.stringify({
                    soilType,
                    landSize: parseFloat(landSize),
                    region: regionInput,
                    season,
                    waterAvailability,
                    irrigationType,
                    sunlightExposure,
                    farmingGoal,
                    cropPreferences: cropPreferences || undefined,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Server error (${res.status})`);
            }

            const data = await res.json();
            setAiResult(data.result);
            setExpandedCard(0); // Auto-expand first result
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate recommendations.');
        } finally {
            setIsGenerating(false);
        }
    }, [isFormValid, user, soilType, landSize, regionInput, season, waterAvailability,
        irrigationType, sunlightExposure, farmingGoal, cropPreferences]);

    // ── Save handler ──────────────────────────────────────────────────────────

    const handleSave = useCallback(async (combo: CombinationResult) => {
        if (!user) return;
        const key = `${combo.primaryCrop}+${combo.companionCrop}`;
        setSavedCombos((prev) => new Set([...prev, key]));
        haptics.medium();

        try {
            await saveCombinationToFirestore({
                userId: user.uid,
                combinationId: key.toLowerCase().replace(/\s+/g, '-'),
                combinationTitle: `${combo.primaryCrop} + ${combo.companionCrop}`,
                createdAt: Date.now(),
                notes: `Strategy: ${combo.strategy} | Score: ${combo.suitabilityScore}`,
            });
        } catch {
            setSavedCombos((prev) => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        }
    }, [user]);

    // ── Reset form ────────────────────────────────────────────────────────────

    const handleReset = () => {
        haptics.light();
        setAiResult(null);
        setError('');
        setExpandedCard(null);
    };

    // ── Render ────────────────────────────────────────────────────────────────

    if (loading || !user) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-background">
            {/* ── Header ── */}
            <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 backdrop-blur-sm px-4">
                <Button asChild variant="ghost" size="icon" className="shrink-0">
                    <Link href="/farming-partner">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/10 shrink-0">
                        <Sprout className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-base font-bold leading-tight truncate">Crop Combination</h1>
                        <p className="text-xs text-muted-foreground truncate">AI-powered companion cropping</p>
                    </div>
                </div>
            </header>

            <main className="flex flex-col gap-5 p-4 pb-28">

                {/* ════════════════════════════════════════════════════════════════
                    RESULTS VIEW
                   ════════════════════════════════════════════════════════════════ */}
                {aiResult ? (
                    <>
                        {/* ── Summary card ── */}
                        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 text-white p-5 shadow-xl shadow-emerald-500/20">
                            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/8 blur-2xl pointer-events-none" />

                            <div className="relative">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Sparkles className="w-4 h-4 text-yellow-300" />
                                    <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
                                        AI Recommendations
                                    </span>
                                </div>
                                <h2 className="text-lg font-bold leading-tight mb-1">
                                    {aiResult.recommendedCombinations.length} Combinations Found
                                </h2>
                                <p className="text-sm text-white/70 leading-relaxed">
                                    {aiResult.reasoning}
                                </p>
                            </div>
                        </div>

                        {/* ── Warnings ── */}
                        {aiResult.warnings.length > 0 && (
                            <div className="rounded-2xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Warnings</span>
                                </div>
                                <ul className="space-y-1.5">
                                    {aiResult.warnings.map((w, i) => (
                                        <li key={i} className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed flex items-start gap-2">
                                            <span className="text-amber-500 mt-0.5">•</span> {w}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* ── Combination cards ── */}
                        <div className="flex flex-col gap-3">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                Recommended Combinations
                            </p>

                            {aiResult.recommendedCombinations.map((combo, idx) => {
                                const isExpanded = expandedCard === idx;
                                const comboKey = `${combo.primaryCrop}+${combo.companionCrop}`;
                                const isSaved = savedCombos.has(comboKey);

                                return (
                                    <div
                                        key={idx}
                                        className={cn(
                                            'rounded-2xl overflow-hidden border transition-all duration-300',
                                            'bg-white/80 dark:bg-white/5 backdrop-blur-xl',
                                            isExpanded
                                                ? 'border-primary/30 shadow-lg shadow-primary/5'
                                                : 'border-border/60 dark:border-white/10 shadow-sm',
                                        )}
                                    >
                                        {/* ── Top gradient bar ── */}
                                        <div className={cn(
                                            'h-1.5 w-full bg-gradient-to-r',
                                            STRATEGY_COLORS[combo.strategy] ?? 'from-emerald-500 to-teal-600',
                                        )} />

                                        {/* ── Header (always visible) ── */}
                                        <button
                                            onClick={() => {
                                                haptics.light();
                                                setExpandedCard(isExpanded ? null : idx);
                                            }}
                                            className="w-full flex items-center gap-3 p-4 text-left"
                                        >
                                            {/* Rank badge */}
                                            <div className={cn(
                                                'w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0',
                                                idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' :
                                                    idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500' :
                                                        idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800' :
                                                            'bg-gradient-to-br from-blue-400 to-blue-600',
                                            )}>
                                                #{idx + 1}
                                            </div>

                                            {/* Crop names */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-foreground truncate">
                                                    {combo.primaryCrop} + {combo.companionCrop}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className={cn(
                                                        'text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-gradient-to-r',
                                                        STRATEGY_COLORS[combo.strategy] ?? 'from-emerald-500 to-teal-600',
                                                    )}>
                                                        {combo.strategy}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Score */}
                                            <div className="flex flex-col items-center flex-shrink-0">
                                                <span className={cn('text-2xl font-black', scoreColor(combo.suitabilityScore))}>
                                                    {combo.suitabilityScore}
                                                </span>
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase">Score</span>
                                            </div>

                                            <ChevronRight className={cn(
                                                'w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0',
                                                isExpanded && 'rotate-90',
                                            )} />
                                        </button>

                                        {/* ── Expanded content ── */}
                                        {isExpanded && (
                                            <div className="px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                                {/* Score bar */}
                                                <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                                                    <div
                                                        className={cn('h-full rounded-full transition-all duration-500', scoreBg(combo.suitabilityScore))}
                                                        style={{ width: `${combo.suitabilityScore}%` }}
                                                    />
                                                </div>

                                                {/* Benefits */}
                                                <div>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Benefits</p>
                                                    <ul className="space-y-1.5">
                                                        {combo.benefits.map((b, i) => (
                                                            <li key={i} className="flex items-start gap-2 text-xs text-foreground/80 leading-relaxed">
                                                                <Leaf className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                                                {b}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                {/* Grid details */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 p-3">
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            <Leaf className="w-3 h-3 text-emerald-500" />
                                                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Soil Benefit</span>
                                                        </div>
                                                        <p className="text-[11px] text-foreground/70 leading-relaxed">{combo.soilBenefit}</p>
                                                    </div>
                                                    <div className="rounded-xl bg-blue-500/5 dark:bg-blue-500/10 p-3">
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            <Droplets className="w-3 h-3 text-blue-500" />
                                                            <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase">Water</span>
                                                        </div>
                                                        <p className="text-[11px] text-foreground/70 leading-relaxed">{combo.waterEfficiency}</p>
                                                    </div>
                                                    <div className="rounded-xl bg-rose-500/5 dark:bg-rose-500/10 p-3">
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            <Bug className="w-3 h-3 text-rose-500" />
                                                            <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase">Pest Control</span>
                                                        </div>
                                                        <p className="text-[11px] text-foreground/70 leading-relaxed">{combo.pestReduction}</p>
                                                    </div>
                                                    <div className="rounded-xl bg-amber-500/5 dark:bg-amber-500/10 p-3">
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            <TrendingUp className="w-3 h-3 text-amber-500" />
                                                            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Yield Boost</span>
                                                        </div>
                                                        <p className="text-[11px] text-foreground/70 leading-relaxed">{combo.expectedYieldBoost}</p>
                                                    </div>
                                                </div>

                                                {/* Revenue */}
                                                <div className="flex items-center gap-3 rounded-xl bg-primary/5 dark:bg-primary/10 p-3 border border-primary/10">
                                                    <Target className="w-5 h-5 text-primary flex-shrink-0" />
                                                    <div>
                                                        <p className="text-[10px] font-bold text-primary uppercase">Est. Revenue / Acre</p>
                                                        <p className="text-sm font-bold text-foreground">{combo.estimatedRevenuePerAcre}</p>
                                                    </div>
                                                </div>

                                                {/* Planting guide */}
                                                <div className="rounded-xl border border-border/40 dark:border-white/5 p-3">
                                                    <div className="flex items-center gap-1.5 mb-2">
                                                        <Sprout className="w-3.5 h-3.5 text-primary" />
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Planting Guide</span>
                                                    </div>
                                                    <p className="text-xs text-foreground/70 leading-relaxed">{combo.plantingGuide}</p>
                                                </div>

                                                {/* Action buttons */}
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSave(combo);
                                                        }}
                                                        disabled={isSaved}
                                                        variant="outline"
                                                        className="flex-1 h-10 rounded-xl text-xs font-bold"
                                                    >
                                                        {isSaved
                                                            ? <><BookmarkCheck className="w-3.5 h-3.5 mr-1.5" /> Saved</>
                                                            : <><Bookmark className="w-3.5 h-3.5 mr-1.5" /> Save</>
                                                        }
                                                    </Button>
                                                    <Button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            haptics.medium();
                                                            openChatWithMessage(
                                                                `I want to grow ${combo.primaryCrop} with ${combo.companionCrop} using ${combo.strategy} on my ${landSize} acre ${soilType} soil farm in ${regionInput}. ` +
                                                                `Give me a detailed week-by-week plan with exact spacing, fertilizer schedule, irrigation plan, and pest management.`
                                                            );
                                                        }}
                                                        className="flex-1 h-10 rounded-xl text-xs font-bold bg-gradient-to-r from-primary to-emerald-700 text-white"
                                                    >
                                                        <FlaskConical className="w-3.5 h-3.5 mr-1.5" /> Ask AI
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* ── Seasonal advice ── */}
                        <div className="rounded-2xl border border-border/60 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-sm p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Info className="w-4 h-4 text-blue-500" />
                                <span className="text-xs font-bold text-foreground">Seasonal Advice</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{aiResult.seasonalAdvice}</p>
                        </div>

                        {/* ── Soil preparation ── */}
                        <div className="rounded-2xl border border-border/60 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-sm p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Leaf className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs font-bold text-foreground">Soil Preparation</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{aiResult.soilPreparation}</p>
                        </div>

                        {/* ── New combination button ── */}
                        <Button
                            onClick={handleReset}
                            variant="outline"
                            className="w-full h-11 rounded-2xl font-bold border-border dark:border-white/10"
                        >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            New Combination
                        </Button>
                    </>
                ) : (
                    /* ════════════════════════════════════════════════════════════════
                       FORM VIEW
                       ════════════════════════════════════════════════════════════════ */
                    <>
                        {/* ── Hero ── */}
                        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 text-white p-5 shadow-xl shadow-emerald-500/20">
                            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/8 blur-2xl pointer-events-none" />

                            <div className="relative">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Sparkles className="w-4 h-4 text-yellow-300" />
                                    <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider">AI Powered</span>
                                </div>
                                <h2 className="text-xl font-bold leading-tight mb-1">Find Your Perfect Crop Pair</h2>
                                <p className="text-sm text-white/70">
                                    Tell us about your farm and we'll recommend the best crop combinations for maximum productivity.
                                </p>
                            </div>
                        </div>

                        {/* ── Form progress ── */}
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                Farm Conditions ({filledCount}/8)
                            </p>
                            <div className="flex gap-1">
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className={cn(
                                        'w-5 h-1 rounded-full transition-all duration-300',
                                        i < filledCount ? 'bg-primary' : 'bg-muted',
                                    )} />
                                ))}
                            </div>
                        </div>

                        {/* ── Form fields ── */}
                        <div className="flex flex-col gap-4 rounded-2xl border border-border/60 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-sm p-4">
                            {/* Soil Type */}
                            <SelectField
                                label="Soil Type"
                                icon={Leaf}
                                value={soilType}
                                options={SOIL_TYPES}
                                onChange={setSoilType}
                                iconColor="text-amber-500"
                            />

                            {/* Land Size */}
                            <div className="flex flex-col gap-1.5">
                                <label className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                    <Ruler className="w-3.5 h-3.5 text-indigo-500" />
                                    Land Size (Acres)
                                </label>
                                <input
                                    type="number"
                                    value={landSize}
                                    onChange={(e) => setLandSize(e.target.value)}
                                    placeholder="e.g. 5"
                                    min="0.1"
                                    step="0.1"
                                    className={cn(
                                        'w-full px-4 py-3 rounded-xl text-sm font-medium',
                                        'bg-white/80 dark:bg-white/5 backdrop-blur-sm',
                                        'border border-border/60 dark:border-white/10',
                                        'text-foreground placeholder:text-muted-foreground',
                                        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30',
                                        'transition-all duration-200',
                                    )}
                                />
                            </div>

                            {/* Region */}
                            <div className="flex flex-col gap-1.5">
                                <label className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                                    Region / Location
                                </label>
                                <input
                                    type="text"
                                    value={regionInput}
                                    onChange={(e) => setRegionInput(e.target.value)}
                                    placeholder={hasRegion ? 'Auto-detected from GPS' : 'e.g. Maharashtra, India'}
                                    className={cn(
                                        'w-full px-4 py-3 rounded-xl text-sm font-medium',
                                        'bg-white/80 dark:bg-white/5 backdrop-blur-sm',
                                        'border border-border/60 dark:border-white/10',
                                        'text-foreground placeholder:text-muted-foreground',
                                        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30',
                                        'transition-all duration-200',
                                    )}
                                />
                                {hasRegion && !regionInput && (
                                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> GPS location detected — will auto-fill
                                    </p>
                                )}
                            </div>

                            {/* Season */}
                            <SelectField
                                label="Season"
                                icon={CloudRain}
                                value={season}
                                options={SEASONS}
                                onChange={setSeason}
                                iconColor="text-teal-500"
                            />

                            {/* Water Availability */}
                            <ChipSelector
                                label="Water Availability"
                                icon={Droplets}
                                options={WATER_LEVELS}
                                value={waterAvailability}
                                onChange={setWaterAvailability}
                                iconColor="text-blue-500"
                            />

                            {/* Irrigation Type */}
                            <SelectField
                                label="Irrigation Type"
                                icon={Droplets}
                                value={irrigationType}
                                options={IRRIGATION_TYPES}
                                onChange={setIrrigationType}
                                iconColor="text-cyan-500"
                            />

                            {/* Sunlight */}
                            <ChipSelector
                                label="Sunlight Exposure"
                                icon={Sun}
                                options={SUNLIGHT_OPTIONS}
                                value={sunlightExposure}
                                onChange={setSunlightExposure}
                                iconColor="text-yellow-500"
                            />
                        </div>

                        {/* ── Farming Goal ── */}
                        <div className="flex flex-col gap-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                Farming Goal
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {FARMING_GOALS.map((goal) => (
                                    <button
                                        key={goal.id}
                                        onClick={() => { haptics.light(); setFarmingGoal(goal.id); }}
                                        className={cn(
                                            'flex items-center gap-2.5 p-3.5 rounded-2xl text-left transition-all duration-200',
                                            'active:scale-[0.97]',
                                            farmingGoal === goal.id
                                                ? cn('bg-gradient-to-br text-white shadow-md', goal.color)
                                                : 'bg-white/80 dark:bg-white/5 border border-border/60 dark:border-white/10 text-foreground hover:border-primary/20',
                                        )}
                                    >
                                        <div className={cn(
                                            'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                                            farmingGoal === goal.id ? 'bg-white/20' : 'bg-muted/50',
                                        )}>
                                            <goal.icon className={cn(
                                                'w-4.5 h-4.5',
                                                farmingGoal === goal.id ? 'text-white' : 'text-muted-foreground',
                                            )} />
                                        </div>
                                        <span className={cn(
                                            'text-xs font-bold leading-tight',
                                            farmingGoal === goal.id ? 'text-white' : 'text-foreground',
                                        )}>
                                            {goal.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ── Crop Preferences (optional) ── */}
                        <div className="flex flex-col gap-1.5">
                            <label className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                <Wheat className="w-3.5 h-3.5 text-orange-500" />
                                Crop Preferences
                                <span className="text-[9px] font-normal normal-case text-muted-foreground/60 ml-1">(optional)</span>
                            </label>
                            <input
                                type="text"
                                value={cropPreferences}
                                onChange={(e) => setCropPreferences(e.target.value)}
                                placeholder="e.g. Rice, Tomato, Cotton..."
                                className={cn(
                                    'w-full px-4 py-3 rounded-xl text-sm font-medium',
                                    'bg-white/80 dark:bg-white/5 backdrop-blur-sm',
                                    'border border-border/60 dark:border-white/10',
                                    'text-foreground placeholder:text-muted-foreground',
                                    'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30',
                                    'transition-all duration-200',
                                )}
                            />
                        </div>

                        {/* ── Error message ── */}
                        {error && (
                            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
                                <p className="text-xs text-destructive font-medium">{error}</p>
                            </div>
                        )}

                        {/* ── Generate button ── */}
                        <Button
                            onClick={handleGenerate}
                            disabled={!isFormValid || isGenerating}
                            className={cn(
                                'w-full h-14 rounded-2xl font-bold text-base shadow-lg transition-all duration-200 active:scale-[0.98]',
                                isFormValid && !isGenerating
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-emerald-500/25'
                                    : 'bg-muted text-muted-foreground cursor-not-allowed shadow-none',
                            )}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Analyzing Your Farm...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-5 h-5 mr-2" />
                                    Generate Crop Combination
                                </>
                            )}
                        </Button>

                        {/* ── Generating state ── */}
                        {isGenerating && (
                            <div className="rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-5 text-center">
                                <div className="flex items-center justify-center gap-3 mb-3">
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                                        <Sprout className="w-5 h-5 text-primary absolute inset-0 m-auto" />
                                    </div>
                                </div>
                                <p className="text-sm font-bold text-foreground mb-1">Analyzing Farm Conditions</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Our AI is evaluating soil compatibility, water needs, season suitability, and intercropping science for your {landSize} acre {soilType.toLowerCase()} soil farm...
                                </p>
                            </div>
                        )}

                        {/* ── Info footer ── */}
                        {!isGenerating && (
                            <div className="text-center py-2">
                                <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                                    Recommendations based on ICAR, FAO, and agricultural research data.
                                    <br />Results are personalized to your specific farm conditions.
                                </p>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
