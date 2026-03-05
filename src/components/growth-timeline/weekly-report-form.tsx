'use client';

/**
 * @fileOverview Weekly Growth Report form — collects crop details, weather, activities,
 * and calls the API to generate the weekly report. Saves the result to Firestore
 * client-side (via weekly-growth-report-client.ts).
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import {
    Loader2, Sprout, Cloud, Shovel, Calendar,
    ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle,
    Sparkles,
} from 'lucide-react';
import { saveWeeklyGrowthReport, getCachedWeeklyReport } from '@/farming-partner/weekly-growth-report-client';
import type { WeeklyGrowthReportRecord } from '@/farming-partner/weekly-growth-report-service';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
    cropName: string;
    plantingDate: string;
    currentGrowthStage: string;
    weekNumber: string;
    weekStartDate: string;
    weekEndDate: string;
    region: string;
    weatherData: string;
    soilData: string;
    farmerActivities: string;
    cropVariety: string;
}

interface Props {
    userId: string;
    onSuccess: (record: WeeklyGrowthReportRecord) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GROWTH_STAGES = [
    'Germination',
    'Seedling',
    'Vegetative',
    'Flowering',
    'Fruiting',
    'Maturity',
    'Harvest-Ready',
];

const COMMON_ACTIVITIES = [
    'Watering', 'Fertilizer application', 'Pesticide spraying',
    'Weeding', 'Pruning', 'Mulching', 'Soil testing',
    'Transplanting', 'Staking', 'Harvesting',
];

// ─── Step config ──────────────────────────────────────────────────────────────

const STEPS = [
    { label: 'Crop Info', icon: Sprout },
    { label: 'Weather & Soil', icon: Cloud },
    { label: 'Activities', icon: Shovel },
];

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(step: number, data: FormData): Record<string, string> {
    const errs: Record<string, string> = {};
    if (step === 0) {
        if (!data.cropName.trim()) errs.cropName = 'Crop name is required.';
        if (!data.plantingDate) errs.plantingDate = 'Planting date is required.';
        if (!data.currentGrowthStage) errs.currentGrowthStage = 'Growth stage is required.';
        if (!data.weekNumber || +data.weekNumber < 1) errs.weekNumber = 'Week number must be at least 1.';
    }
    if (step === 1) {
        if (!data.weatherData.trim()) errs.weatherData = 'Weather data is required.';
    }
    if (step === 2) {
        if (!data.farmerActivities.trim()) errs.farmerActivities = 'At least one activity is required.';
    }
    return errs;
}

// ─── Step progress bar ────────────────────────────────────────────────────────

function StepIndicator({ step, total }: { step: number; total: number }) {
    return (
        <div className="flex items-center gap-1.5 w-full px-1">
            {Array.from({ length: total }).map((_, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                        className={cn(
                            'h-1.5 w-full rounded-full transition-all duration-300',
                            i < step ? 'bg-teal-500' : i === step ? 'bg-teal-400' : 'bg-muted',
                        )}
                    />
                    <span className={cn(
                        'text-[10px] font-medium transition-colors',
                        i <= step ? 'text-teal-600 dark:text-teal-400' : 'text-muted-foreground',
                    )}>
                        {STEPS[i].label}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export default function WeeklyReportForm({ userId, onSuccess }: Props) {
    const [step, setStep] = useState(0);
    const [data, setData] = useState<FormData>({
        cropName: '',
        plantingDate: '',
        currentGrowthStage: '',
        weekNumber: '',
        weekStartDate: '',
        weekEndDate: '',
        region: '',
        weatherData: '',
        soilData: '',
        farmerActivities: '',
        cropVariety: '',
    });
    const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    const set = (k: keyof FormData, v: string) => {
        setData(prev => ({ ...prev, [k]: v }));
        setErrors(prev => { const n = { ...prev }; delete n[k]; return n; });
    };

    // Auto-compute week dates from planting date + week number
    const weekDates = useMemo(() => {
        if (!data.plantingDate || !data.weekNumber || +data.weekNumber < 1) return null;
        const planting = new Date(data.plantingDate);
        const weekNum = +data.weekNumber;
        const start = new Date(planting);
        start.setDate(start.getDate() + (weekNum - 1) * 7);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0],
        };
    }, [data.plantingDate, data.weekNumber]);

    // Sync computed dates
    if (weekDates && data.weekStartDate !== weekDates.start) {
        data.weekStartDate = weekDates.start;
        data.weekEndDate = weekDates.end;
    }

    const handleNext = () => {
        const errs = validate(step, data);
        if (Object.keys(errs).length) { setErrors(errs); haptics.error(); return; }
        haptics.light();
        setStep(s => s + 1);
    };

    const handleBack = () => { haptics.light(); setStep(s => s - 1); };

    const toggleActivity = (activity: string) => {
        haptics.light();
        setSelectedActivities(prev => {
            const next = prev.includes(activity)
                ? prev.filter(a => a !== activity)
                : [...prev, activity];
            // Sync to form data
            set('farmerActivities', next.join(', '));
            return next;
        });
    };

    const handleSubmit = async () => {
        const errs = validate(step, data);
        if (Object.keys(errs).length) { setErrors(errs); haptics.error(); return; }

        haptics.medium();
        setLoading(true);
        setStatus('Checking for cached report…');

        try {
            // Check cache first
            const cached = await getCachedWeeklyReport(userId, data.cropName, +data.weekNumber);
            if (cached) {
                setStatus('Found existing report for this week!');
                haptics.success();
                onSuccess(cached);
                return;
            }

            setStatus('Analyzing crop data with AI…');

            const res = await fetch('/api/weekly-growth-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': userId,
                },
                body: JSON.stringify({
                    cropName: data.cropName.trim(),
                    plantingDate: data.plantingDate,
                    currentGrowthStage: data.currentGrowthStage,
                    weekNumber: +data.weekNumber,
                    weekStartDate: data.weekStartDate,
                    weekEndDate: data.weekEndDate,
                    region: data.region.trim() || undefined,
                    weatherData: data.weatherData.trim(),
                    soilData: data.soilData.trim() || undefined,
                    farmerActivities: data.farmerActivities.trim(),
                    cropVariety: data.cropVariety.trim() || undefined,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Network error' }));
                throw new Error(err.error || `Server error (${res.status})`);
            }

            const json = await res.json();
            const record: WeeklyGrowthReportRecord = json.report;

            setStatus('Saving report…');
            const docId = await saveWeeklyGrowthReport(record);
            record.id = docId;

            haptics.success();
            onSuccess(record);
        } catch (err: unknown) {
            haptics.error();
            setStatus('');
            setErrors({ _form: err instanceof Error ? err.message : 'Failed to generate report.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-4 animate-slide-up-fade">
            <StepIndicator step={step} total={STEPS.length} />

            <Card className="rounded-2xl border-border shadow-sm">
                <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center gap-2">
                        {(() => { const Icon = STEPS[step].icon; return <Icon className="h-4 w-4 text-teal-600" />; })()}
                        <h3 className="text-sm font-bold">{STEPS[step].label}</h3>
                    </div>
                </CardHeader>

                <CardContent className="p-4 pt-2 flex flex-col gap-3">
                    {/* ── Step 0: Crop Info ── */}
                    {step === 0 && (
                        <>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Crop Name *</Label>
                                <Input
                                    placeholder="e.g., Wheat, Tomato, Rice"
                                    value={data.cropName}
                                    onChange={e => set('cropName', e.target.value)}
                                    className={cn(errors.cropName && 'border-destructive')}
                                />
                                {errors.cropName && <p className="text-xs text-destructive">{errors.cropName}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Crop Variety (optional)</Label>
                                <Input
                                    placeholder="e.g., HD-2967, Cherry"
                                    value={data.cropVariety}
                                    onChange={e => set('cropVariety', e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Planting Date *</Label>
                                    <Input
                                        type="date"
                                        value={data.plantingDate}
                                        onChange={e => set('plantingDate', e.target.value)}
                                        className={cn(errors.plantingDate && 'border-destructive')}
                                    />
                                    {errors.plantingDate && <p className="text-xs text-destructive">{errors.plantingDate}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Week # *</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        placeholder="e.g., 3"
                                        value={data.weekNumber}
                                        onChange={e => set('weekNumber', e.target.value)}
                                        className={cn(errors.weekNumber && 'border-destructive')}
                                    />
                                    {errors.weekNumber && <p className="text-xs text-destructive">{errors.weekNumber}</p>}
                                </div>
                            </div>

                            {weekDates && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-500/10 border border-teal-500/20">
                                    <Calendar className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                                    <span className="text-xs text-teal-700 dark:text-teal-400">
                                        Week {data.weekNumber}: {weekDates.start} → {weekDates.end}
                                    </span>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Growth Stage *</Label>
                                <Select
                                    value={data.currentGrowthStage}
                                    onValueChange={v => set('currentGrowthStage', v)}
                                >
                                    <SelectTrigger className={cn(errors.currentGrowthStage && 'border-destructive')}>
                                        <SelectValue placeholder="Select stage…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {GROWTH_STAGES.map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.currentGrowthStage && <p className="text-xs text-destructive">{errors.currentGrowthStage}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Region (optional)</Label>
                                <Input
                                    placeholder="e.g., Punjab, India"
                                    value={data.region}
                                    onChange={e => set('region', e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    {/* ── Step 1: Weather & Soil ── */}
                    {step === 1 && (
                        <>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Weather (last 7 days) *</Label>
                                <Textarea
                                    placeholder="e.g., Sunny with avg 28°C, 15mm rain on Day 3, humidity 60-70%"
                                    value={data.weatherData}
                                    onChange={e => set('weatherData', e.target.value)}
                                    className={cn('min-h-[80px]', errors.weatherData && 'border-destructive')}
                                />
                                {errors.weatherData && <p className="text-xs text-destructive">{errors.weatherData}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Soil Conditions (optional)</Label>
                                <Textarea
                                    placeholder="e.g., Loamy soil, pH 6.5, adequate moisture"
                                    value={data.soilData}
                                    onChange={e => set('soilData', e.target.value)}
                                    className="min-h-[60px]"
                                />
                            </div>
                        </>
                    )}

                    {/* ── Step 2: Activities ── */}
                    {step === 2 && (
                        <>
                            <p className="text-xs text-muted-foreground">
                                Tap activities you did this week, or type your own below.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {COMMON_ACTIVITIES.map(act => (
                                    <button
                                        key={act}
                                        type="button"
                                        onClick={() => toggleActivity(act)}
                                        className={cn(
                                            'px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150',
                                            selectedActivities.includes(act)
                                                ? 'bg-teal-500 text-white border-teal-500 shadow-sm'
                                                : 'bg-background border-border text-foreground hover:border-teal-400',
                                        )}
                                    >
                                        {selectedActivities.includes(act) && (
                                            <CheckCircle2 className="inline h-3 w-3 mr-1 -mt-0.5" />
                                        )}
                                        {act}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Additional details</Label>
                                <Textarea
                                    placeholder="e.g., Watered 3 times, applied 50kg urea per acre"
                                    value={data.farmerActivities}
                                    onChange={e => set('farmerActivities', e.target.value)}
                                    className={cn('min-h-[60px]', errors.farmerActivities && 'border-destructive')}
                                />
                                {errors.farmerActivities && <p className="text-xs text-destructive">{errors.farmerActivities}</p>}
                            </div>
                        </>
                    )}

                    {/* Global error */}
                    {errors._form && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20">
                            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                            <p className="text-xs text-destructive">{errors._form}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Navigation ── */}
            <div className="flex gap-3">
                {step > 0 && (
                    <Button
                        variant="outline"
                        onClick={handleBack}
                        disabled={loading}
                        className="flex-1 rounded-xl h-11"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1.5" />
                        Back
                    </Button>
                )}
                {step < STEPS.length - 1 ? (
                    <Button
                        onClick={handleNext}
                        className="flex-1 rounded-xl h-11 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-md shadow-teal-500/20"
                    >
                        Next
                        <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>
                ) : (
                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 rounded-xl h-11 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-md shadow-teal-500/20"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                {status || 'Generating…'}
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4 mr-1.5" />
                                Generate Report
                            </>
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
}
