'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { Loader2, ChevronRight, ChevronLeft, Leaf, Droplets, MapPin, Calendar, Sprout, RefreshCw, X } from 'lucide-react';
import type { CropSuccessPlan } from '@/farming-partner/crop-success-planner-service';
import { saveCropSuccessPlan } from '@/farming-partner/crop-success-planner-client';
import { CropSearchInput } from '@/components/crops/CropSearchInput';
import { useRegion } from '@/providers/region-provider';
import RegionSelector from '@/components/region/RegionSelector';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
    cropName: string;
    soilType: string;
    previousCrop: string;
    waterAvailability: string;
    region: string;
    season: string;
}

interface Props {
    userId: string;
    onSuccess: (plan: CropSuccessPlan) => void;
}

// ─── Step configuration ───────────────────────────────────────────────────────

const STEPS = [
    { id: 1, title: 'Crop & Soil', icon: Leaf, fields: ['cropName', 'soilType'] },
    { id: 2, title: 'History & Water', icon: Droplets, fields: ['previousCrop', 'waterAvailability'] },
    { id: 3, title: 'Location & Season', icon: MapPin, fields: ['region', 'season'] },
];

const SOIL_TYPES = ['Loamy', 'Clay', 'Sandy', 'Silty', 'Chalky', 'Peaty'];
const WATER_LEVELS = [
    { value: 'abundant', label: '💧 Abundant — Full irrigation available' },
    { value: 'moderate', label: '🌊 Moderate — Partial irrigation' },
    { value: 'limited', label: '⚠️ Limited — Sparse water supply' },
    { value: 'rain-fed only', label: '☁️ Rain-fed only — No irrigation' },
];
const SEASONS = ['Rabi', 'Kharif', 'Zaid', 'Summer', 'Winter', 'Spring', 'Autumn'];

// ─── Field validation ─────────────────────────────────────────────────────────

function validateStep(step: number, data: FormData): Record<string, string> {
    const errors: Record<string, string> = {};
    if (step === 1) {
        if (!data.cropName.trim()) errors.cropName = 'Crop name is required.';
        if (!data.soilType) errors.soilType = 'Select a soil type.';
    }
    if (step === 2) {
        if (!data.previousCrop.trim()) errors.previousCrop = 'Previous crop is required. Enter "fallow" if none.';
        if (!data.waterAvailability) errors.waterAvailability = 'Select water availability.';
    }
    if (step === 3) {
        if (!data.region.trim()) errors.region = 'Region is required.';
        if (!data.season) errors.season = 'Select a season.';
    }
    return errors;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
    return (
        <div className="flex items-center gap-2 mb-6">
            {Array.from({ length: total }, (_, i) => {
                const step = i + 1;
                const done = step < current;
                const active = step === current;
                return (
                    <div key={step} className="flex items-center gap-2 flex-1">
                        <div className={cn(
                            'flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300 shrink-0',
                            done ? 'bg-primary text-primary-foreground' : '',
                            active ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110' : '',
                            !done && !active ? 'bg-muted text-muted-foreground' : '',
                        )}>
                            {done ? '✓' : step}
                        </div>
                        {step < total && (
                            <div className={cn(
                                'h-0.5 flex-1 rounded-full transition-all duration-500',
                                done ? 'bg-primary' : 'bg-muted',
                            )} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Error message ────────────────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
    if (!msg) return null;
    return <p className="text-xs text-destructive mt-1 animate-in slide-in-from-top-1">{msg}</p>;
}

// ─── Main Form Component ──────────────────────────────────────────────────────

export default function PlannerForm({ userId, onSuccess }: Props) {
    const [step, setStep] = useState(1);
    const [data, setData] = useState<FormData>({
        cropName: '', soilType: '', previousCrop: '',
        waterAvailability: '', region: '', season: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState('');
    const { region: regionCtx, hasRegion, isDetecting, detectGPS } = useRegion();
    const [regionSelectorOpen, setRegionSelectorOpen] = useState(false);

    // Auto-fill region from context
    useEffect(() => {
        if (hasRegion) {
            const regionStr = [regionCtx.city, regionCtx.state, regionCtx.country].filter(Boolean).join(', ');
            if (regionStr) setData(d => ({ ...d, region: regionStr }));
        }
    }, [hasRegion, regionCtx]);


    const set = (field: keyof FormData, value: string) => {
        setData(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const handleNext = () => {
        const errs = validateStep(step, data);
        if (Object.keys(errs).length) { setErrors(errs); haptics.error(); return; }
        haptics.light();
        setStep(s => s + 1);
    };

    const handleBack = () => { haptics.light(); setStep(s => s - 1); };

    const handleSubmit = async () => {
        const errs = validateStep(3, data);
        if (Object.keys(errs).length) { setErrors(errs); return; }

        setSubmitting(true);
        setApiError('');
        haptics.heavy();

        try {
            const res = await fetch('/api/farming-partner/crop-success-planner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                body: JSON.stringify({
                    ...data,
                    cropName: data.cropName.trim(),
                    previousCrop: data.previousCrop.trim(),
                    region: data.region.trim(),
                }),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Something went wrong.');

            const plan: CropSuccessPlan = json.plan;

            // Show results immediately — don't block on Firestore save.
            // If Firestore rules haven't been deployed yet the save will fail
            // silently; results still display. Save is best-effort / fire-and-forget.
            haptics.success();
            onSuccess(plan);

            // Background save — does NOT affect the UI if it fails.
            saveCropSuccessPlan(plan)
                .then((id) => { plan.id = id; })
                .catch((err) => console.warn('[CropSuccessPlanner] Firestore save skipped:', err?.message));
        } catch (err: unknown) {
            setApiError(err instanceof Error ? err.message : 'Failed to analyse. Please try again.');
            haptics.error();
        } finally {
            setSubmitting(false);
        }
    };

    const currentStepInfo = STEPS[step - 1];
    const Icon = currentStepInfo.icon;

    return (
        <>
            <div className="flex flex-col gap-4 animate-in fade-in-0 duration-300">
                {/* Step header */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">
                            <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold">{currentStepInfo.title}</h2>
                            <p className="text-xs text-muted-foreground">Step {step} of {STEPS.length}</p>
                        </div>
                    </div>
                </div>

                {/* Step indicator */}
                <StepIndicator current={step} total={STEPS.length} />

                {/* Form card */}
                <Card className="rounded-2xl border-border">
                    <CardContent className="p-5 flex flex-col gap-5">

                        {/* Step 1: Crop & Soil */}
                        {step === 1 && (
                            <>
                                <div className="flex flex-col gap-1.5 z-20">
                                    <Label htmlFor="cropName" className="text-sm font-semibold flex items-center gap-1.5 z-10">
                                        <Sprout className="h-4 w-4 text-primary" /> Crop Name
                                    </Label>
                                    {data.cropName ? (
                                        <div className="flex items-center justify-between p-3.5 border border-primary/30 rounded-2xl bg-primary/5 text-primary font-medium animate-in zoom-in-95">
                                            <span>{data.cropName}</span>
                                            <Button variant="ghost" size="icon" onClick={() => set('cropName', '')} className="h-7 w-7 rounded-full text-primary hover:bg-primary/20">
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className={cn("relative z-20", errors.cropName && "ring-2 ring-destructive rounded-2xl")}>
                                            <CropSearchInput
                                                placeholder="Search by crop name..."
                                                onSelect={(id, name) => set('cropName', name)}
                                            />
                                        </div>
                                    )}
                                    <FieldError msg={errors.cropName} />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label className="text-sm font-semibold">Soil Type</Label>
                                    <Select value={data.soilType} onValueChange={v => set('soilType', v)}>
                                        <SelectTrigger className={cn('rounded-xl', errors.soilType && 'border-destructive')}>
                                            <SelectValue placeholder="Select soil type…" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {SOIL_TYPES.map(s => (
                                                <SelectItem key={s} value={s.toLowerCase()}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FieldError msg={errors.soilType} />
                                </div>
                            </>
                        )}

                        {/* Step 2: Previous Crop & Water */}
                        {step === 2 && (
                            <>
                                <div className="flex flex-col gap-1.5 z-10">
                                    <Label htmlFor="previousCrop" className="text-sm font-semibold flex items-center gap-1.5">
                                        <RefreshCw className="h-4 w-4 text-primary" /> Previous Crop
                                    </Label>
                                    {data.previousCrop ? (
                                        <div className="flex items-center justify-between p-3.5 border border-primary/30 rounded-2xl bg-primary/5 text-primary font-medium animate-in zoom-in-95">
                                            <span>{data.previousCrop}</span>
                                            <Button variant="ghost" size="icon" onClick={() => set('previousCrop', '')} className="h-7 w-7 rounded-full text-primary hover:bg-primary/20">
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            <div className={cn("relative z-10", errors.previousCrop && "ring-2 ring-destructive rounded-2xl")}>
                                                <CropSearchInput
                                                    placeholder="Search previous crop..."
                                                    onSelect={(id, name) => set('previousCrop', name)}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => set('previousCrop', 'Fallow')}
                                                className="self-start text-xs font-medium text-muted-foreground bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-full transition-colors"
                                            >
                                                🏜️ Field was fallow (no crop)
                                            </button>
                                        </div>
                                    )}
                                    <p className="text-xs text-muted-foreground">What was grown here last season?</p>
                                    <FieldError msg={errors.previousCrop} />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                                        <Droplets className="h-4 w-4 text-primary" /> Water Availability
                                    </Label>
                                    <div className="flex flex-col gap-2">
                                        {WATER_LEVELS.map(({ value, label }) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => set('waterAvailability', value)}
                                                className={cn(
                                                    'text-left px-4 py-3 rounded-xl border text-sm transition-all duration-200 active:scale-[0.98]',
                                                    data.waterAvailability === value
                                                        ? 'border-primary bg-primary/5 text-primary font-semibold'
                                                        : 'border-border bg-card text-foreground',
                                                )}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                    <FieldError msg={errors.waterAvailability} />
                                </div>
                            </>
                        )}

                        {/* Step 3: Region & Season */}
                        {step === 3 && (
                            <>
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
                                            errors.region && 'border-destructive ring-1 ring-destructive/20',
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
                                    <FieldError msg={errors.region} />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                                        <Calendar className="h-4 w-4 text-primary" /> Growing Season
                                    </Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {SEASONS.map(s => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => set('season', s)}
                                                className={cn(
                                                    'px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 active:scale-[0.97]',
                                                    data.season === s
                                                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                                        : 'border-border bg-card text-foreground',
                                                )}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                    <FieldError msg={errors.season} />
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* API error */}
                {apiError && (
                    <div className="flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
                        <span className="text-destructive text-sm">{apiError}</span>
                    </div>
                )}

                {/* Navigation buttons */}
                <div className="flex gap-3">
                    {step > 1 && (
                        <Button variant="outline" onClick={handleBack} disabled={submitting} className="flex-1 rounded-xl h-12">
                            <ChevronLeft className="h-4 w-4 mr-1" /> Back
                        </Button>
                    )}

                    {step < STEPS.length ? (
                        <Button onClick={handleNext} className="flex-1 rounded-xl h-12 font-semibold">
                            Next <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex-1 rounded-xl h-12 font-semibold"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Analysing…
                                </>
                            ) : (
                                <>
                                    <Sprout className="h-4 w-4 mr-2" />
                                    Analyse Crop
                                </>
                            )}
                        </Button>
                    )}
                </div>

                {/* Summary so far (steps 2+) */}
                {step > 1 && (
                    <Card className="rounded-2xl border-border bg-muted/40">
                        <CardContent className="p-4">
                            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Your inputs so far</p>
                            <div className="flex flex-wrap gap-2">
                                {data.cropName && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{data.cropName}</span>}
                                {data.soilType && <span className="text-xs bg-accent/10 text-accent-foreground px-2 py-1 rounded-full">{data.soilType} soil</span>}
                                {step > 2 && data.previousCrop && <span className="text-xs bg-warning-background text-warning-foreground px-2 py-1 rounded-full">prev: {data.previousCrop}</span>}
                                {step > 2 && data.waterAvailability && <span className="text-xs bg-info-background text-info-foreground px-2 py-1 rounded-full">{data.waterAvailability}</span>}
                            </div>
                        </CardContent>
                    </Card>
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
                    const regionStr = [regionCtx.city, regionCtx.state, regionCtx.country].filter(Boolean).join(', ');
                    set('region', regionStr);
                    setRegionSelectorOpen(false);
                }}
                isDetecting={isDetecting}
            />
        </>
    );
}
