'use client';

/**
 * @fileOverview Growth Timeline form — collects crop details and calls
 * the API to generate the weekly timeline. Saves the result to Firestore
 * client-side (via growth-timeline-client.ts) to avoid PERMISSION_DENIED.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import {
    Loader2, ChevronRight, ChevronLeft,
    Sprout, Droplets, MapPin, Calendar, X,
} from 'lucide-react';
import type { GrowthTimelineRecord } from '@/farming-partner/growth-timeline-service';
import { saveGrowthTimeline } from '@/farming-partner/growth-timeline-client';
import { CropSearchInput } from '@/components/crops/CropSearchInput';
import { useRegion } from '@/providers/region-provider';
import RegionSelector from '@/components/region/RegionSelector';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
    cropType: string;
    plantingDate: string;
    region: string;
    variety: string;
    waterAvailability: string;
    soilType: string;
}

interface Props {
    userId: string;
    onSuccess: (record: GrowthTimelineRecord) => void;
}

// ─── Step config ──────────────────────────────────────────────────────────────

const STEPS = [
    { id: 1, title: 'Crop & Planting', icon: Sprout, fields: ['cropType', 'plantingDate'] },
    { id: 2, title: 'Soil & Water', icon: Droplets, fields: ['soilType', 'waterAvailability'] },
    { id: 3, title: 'Region & Variety', icon: MapPin, fields: ['region'] },
];

const WATER_OPTIONS = [
    { value: 'abundant', label: '💧 Abundant — Full irrigation' },
    { value: 'moderate', label: '🌊 Moderate — Partial irrigation' },
    { value: 'limited', label: '⚠️ Limited — Sparse supply' },
    { value: 'rain-fed only', label: '☁️ Rain-fed only' },
];

const SOIL_TYPES = ['Loamy', 'Clay', 'Sandy', 'Silty', 'Chalky', 'Peaty', 'Alluvial'];

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(step: number, data: FormData): Record<string, string> {
    const e: Record<string, string> = {};
    if (step === 1) {
        if (!data.cropType.trim()) e.cropType = 'Crop name is required.';
        if (!data.plantingDate) e.plantingDate = 'Select a planting date.';
    }
    if (step === 2) {
        if (!data.soilType) e.soilType = 'Select a soil type.';
        if (!data.waterAvailability) e.waterAvailability = 'Select water availability.';
    }
    if (step === 3) {
        if (!data.region.trim()) e.region = 'Region is required (e.g., "Punjab, Pakistan").';
    }
    return e;
}

// ─── Step progress bar ────────────────────────────────────────────────────────

function StepIndicator({ step, total }: { step: number; total: number }) {
    return (
        <div className="flex items-center gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
                <div
                    key={i}
                    className={cn(
                        'h-1.5 rounded-full transition-all duration-300',
                        i < step ? 'bg-primary' : 'bg-muted',
                        i === step - 1 ? 'flex-[2]' : 'flex-1',
                    )}
                />
            ))}
        </div>
    );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export default function TimelineForm({ userId, onSuccess }: Props) {
    const [step, setStep] = useState(1);
    const { region, hasRegion, isDetecting, detectGPS } = useRegion();
    const [regionSelectorOpen, setRegionSelectorOpen] = useState(false);
    const [data, setData] = useState<FormData>({
        cropType: '', plantingDate: '', region: '',
        variety: '', waterAvailability: '', soilType: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState('');

    // Auto-fill region from context
    useEffect(() => {
        if (hasRegion) {
            const regionStr = [region.city, region.state, region.country].filter(Boolean).join(', ');
            if (regionStr) setData(d => ({ ...d, region: regionStr }));
        }
    }, [hasRegion, region]);

    const set = (k: keyof FormData, v: string) => {
        setData(d => ({ ...d, [k]: v }));
        setErrors(e => { const n = { ...e }; delete n[k]; return n; });
    };

    const handleNext = () => {
        const errs = validate(step, data);
        if (Object.keys(errs).length) { setErrors(errs); haptics.error(); return; }
        haptics.light();
        setStep(s => s + 1);
    };

    const handleBack = () => { haptics.light(); setStep(s => s - 1); };

    const handleSubmit = async () => {
        const errs = validate(step, data);
        if (Object.keys(errs).length) { setErrors(errs); return; }

        setSubmitting(true);
        setApiError('');
        haptics.heavy();

        try {
            const res = await fetch('/api/growth-timeline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                body: JSON.stringify({
                    cropType: data.cropType.trim(),
                    plantingDate: data.plantingDate,
                    region: data.region.trim(),
                    variety: data.variety.trim() || 'standard',
                    waterAvailability: data.waterAvailability || 'moderate',
                    soilType: data.soilType || 'loamy',
                }),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to generate timeline.');

            const record: GrowthTimelineRecord = json.timeline;

            // Show results immediately, save to Firestore in the background.
            haptics.success();
            onSuccess(record);

            saveGrowthTimeline(record)
                .then(id => { record.id = id; })
                .catch(err => console.warn('[GrowthTimeline] Firestore save skipped:', err?.message));

        } catch (err: unknown) {
            setApiError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
            haptics.error();
        } finally {
            setSubmitting(false);
        }
    };

    const StepIcon = STEPS[step - 1].icon;

    return (
        <>
            <div className="flex flex-col gap-5 animate-in fade-in-0 duration-300">

                {/* Header */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-primary/10">
                            <StepIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Step {step} of {STEPS.length}</p>
                            <h2 className="text-sm font-bold">{STEPS[step - 1].title}</h2>
                        </div>
                    </div>
                    <StepIndicator step={step} total={STEPS.length} />
                </div>

                {/* Step 1 — Crop & Planting Date */}
                {step === 1 && (
                    <Card className="rounded-2xl border-border">
                        <CardContent className="p-4 flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5 z-20">
                                <Label htmlFor="cropType" className="text-sm font-semibold flex items-center gap-1.5">
                                    <Sprout className="h-4 w-4 text-primary" /> Crop Name <span className="text-red-500">*</span>
                                </Label>
                                {data.cropType ? (
                                    <div className="flex items-center justify-between p-3.5 border border-primary/30 rounded-2xl bg-primary/5 text-primary font-medium animate-in zoom-in-95">
                                        <span>{data.cropType}</span>
                                        <Button variant="ghost" size="icon" onClick={() => set('cropType', '')} className="h-7 w-7 rounded-full text-primary hover:bg-primary/20">
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className={cn("relative z-20", errors.cropType && "ring-2 ring-destructive rounded-2xl")}>
                                        <CropSearchInput
                                            placeholder="Search by crop name..."
                                            onSelect={(id, name) => set('cropType', name)}
                                        />
                                    </div>
                                )}
                                {errors.cropType && <p className="text-xs text-red-500">{errors.cropType}</p>}
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="plantingDate" className="text-sm font-semibold">
                                    Planting Date <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="plantingDate"
                                    type="date"
                                    value={data.plantingDate}
                                    onChange={e => set('plantingDate', e.target.value)}
                                    className={cn('rounded-xl h-11', errors.plantingDate && 'border-red-500')}
                                />
                                {errors.plantingDate && <p className="text-xs text-red-500">{errors.plantingDate}</p>}
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="variety" className="text-sm font-semibold text-muted-foreground">
                                    Variety <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                                </Label>
                                <Input
                                    id="variety"
                                    placeholder='e.g. Punjab-11, Roma (leave blank for "standard")'
                                    value={data.variety}
                                    onChange={e => set('variety', e.target.value)}
                                    className="rounded-xl h-11"
                                />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 2 — Soil & Water */}
                {step === 2 && (
                    <Card className="rounded-2xl border-border">
                        <CardContent className="p-4 flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-sm font-semibold">
                                    Soil Type <span className="text-red-500">*</span>
                                </Label>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {SOIL_TYPES.map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => { set('soilType', s.toLowerCase()); haptics.light(); }}
                                            className={cn(
                                                'py-2.5 px-3 rounded-xl border text-sm font-medium transition-all duration-150',
                                                data.soilType === s.toLowerCase()
                                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                                    : 'border-border bg-card hover:bg-muted active:scale-95',
                                            )}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                                {errors.soilType && <p className="text-xs text-red-500">{errors.soilType}</p>}
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label className="text-sm font-semibold">
                                    Water Availability <span className="text-red-500">*</span>
                                </Label>
                                <div className="flex flex-col gap-2">
                                    {WATER_OPTIONS.map(w => (
                                        <button
                                            key={w.value}
                                            type="button"
                                            onClick={() => { set('waterAvailability', w.value); haptics.light(); }}
                                            className={cn(
                                                'w-full py-3 px-4 rounded-xl border text-sm text-left transition-all duration-150',
                                                data.waterAvailability === w.value
                                                    ? 'bg-primary/10 border-primary text-primary font-semibold'
                                                    : 'border-border bg-card hover:bg-muted',
                                            )}
                                        >
                                            {w.label}
                                        </button>
                                    ))}
                                </div>
                                {errors.waterAvailability && <p className="text-xs text-red-500">{errors.waterAvailability}</p>}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 3 — Region */}
                {step === 3 && (
                    <Card className="rounded-2xl border-border">
                        <CardContent className="p-4 flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> Your Region
                                </Label>
                                <button
                                    type="button"
                                    onClick={() => setRegionSelectorOpen(true)}
                                    className={cn(
                                        'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all active:scale-[0.99]',
                                        data.region
                                            ? 'border-primary/20 bg-primary/5'
                                            : 'border-border bg-card hover:bg-muted',
                                        errors.region && 'border-red-500 ring-1 ring-red-500/20',
                                    )}
                                >
                                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                                    <span className={cn('text-sm truncate flex-1', data.region ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                                        {isDetecting ? 'Detecting location...' : data.region || 'Tap to set region'}
                                    </span>
                                    <span className="text-[10px] font-semibold text-primary shrink-0">
                                        {data.region ? 'Change' : 'Set'}
                                    </span>
                                </button>
                                {errors.region && <p className="text-xs text-red-500">{errors.region}</p>}
                            </div>

                            {/* Summary of what will be generated */}
                            {data.cropType && (
                                <div className="bg-primary/5 border border-primary/15 rounded-xl p-3.5 flex flex-col gap-1.5">
                                    <p className="text-xs font-bold text-primary">📋 Generating timeline for</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {[
                                            `🌱 ${data.cropType}${data.variety ? ` (${data.variety})` : ''}`,
                                            `📅 From ${data.plantingDate}`,
                                            `🪨 ${data.soilType} soil`,
                                            `💧 ${data.waterAvailability}`,
                                        ].map((chip) => (
                                            <span key={chip} className="text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground">
                                                {chip}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* API error */}
                {apiError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                        <p className="text-sm text-red-600 dark:text-red-400">{apiError}</p>
                    </div>
                )}

                {/* Navigation */}
                <div className={cn('flex gap-3', step === 1 && 'justify-end')}>
                    {step > 1 && (
                        <Button
                            variant="outline"
                            onClick={handleBack}
                            disabled={submitting}
                            className="flex-1 rounded-xl h-12 font-semibold gap-2"
                        >
                            <ChevronLeft className="h-4 w-4" /> Back
                        </Button>
                    )}
                    {step < STEPS.length ? (
                        <Button
                            onClick={handleNext}
                            className="flex-1 rounded-xl h-12 font-semibold gap-2"
                        >
                            Next <ChevronRight className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex-1 rounded-xl h-12 font-semibold gap-2"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Generating timeline…
                                </>
                            ) : (
                                <>
                                    <Calendar className="h-4 w-4" />
                                    Generate Timeline
                                </>
                            )}
                        </Button>
                    )}
                </div>

                {submitting && (
                    <p className="text-center text-xs text-muted-foreground animate-pulse">
                        AI is generating your week-by-week plan… this may take 15–30 seconds.
                    </p>
                )}
            </div>

            {/* Region Selector Modal */}
            <RegionSelector
                open={regionSelectorOpen}
                onClose={() => setRegionSelectorOpen(false)}
                onSelect={(country, countryCode, state, city) => {
                    const regionStr = [city, state, country].filter(Boolean).join(', ');
                    set('region', regionStr);
                    setRegionSelectorOpen(false);
                }}
                onDetectGPS={async () => {
                    await detectGPS();
                    const regionStr = [region.city, region.state, region.country].filter(Boolean).join(', ');
                    set('region', regionStr);
                    setRegionSelectorOpen(false);
                }}
                isDetecting={isDetecting}
            />
        </>
    );
}
