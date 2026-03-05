'use client';

/**
 * @fileOverview 2-step input form for the Harvest Optimizer.
 * Step 1: crop name, planting date, farm size acres
 * Step 2: region, target market
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { Loader2, ChevronRight, ChevronLeft, Tractor, MapPin, X, Sprout } from 'lucide-react';
import type { HarvestOptimizerRecord } from '@/farming-partner/harvest-optimizer-service';
import type { HarvestOptimizerInput } from '@/ai/flows/farming-partner/harvest-optimizer-flow';
import { saveHarvestOptimizer } from '@/farming-partner/harvest-optimizer-client';
import { CropSearchInput } from '@/components/crops/CropSearchInput';
import { useRegion } from '@/providers/region-provider';
import RegionSelector from '@/components/region/RegionSelector';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
    cropType: string;
    variety: string;
    plantingDate: string;
    farmSizeAcres: string;
    region: string;
    targetMarket: HarvestOptimizerInput['targetMarket'] | '';
}

interface Props {
    userId: string;
    onSuccess: (record: HarvestOptimizerRecord) => void;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const MARKET_OPTIONS: { value: HarvestOptimizerInput['targetMarket']; label: string; emoji: string }[] = [
    { value: 'local', label: 'Local Market', emoji: '🏪' },
    { value: 'wholesale', label: 'Wholesale', emoji: '🏭' },
    { value: 'export', label: 'Export', emoji: '✈️' },
    { value: 'processing', label: 'Processing', emoji: '🏗️' },
];

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepBar({ step }: { step: number }) {
    return (
        <div className="flex items-center gap-1.5">
            {[1, 2].map(i => (
                <div
                    key={i}
                    className={cn(
                        'h-1.5 rounded-full transition-all duration-300',
                        i <= step ? 'bg-amber-500' : 'bg-muted',
                        i === step ? 'flex-[2]' : 'flex-1',
                    )}
                />
            ))}
        </div>
    );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export default function OptimizerForm({ userId, onSuccess }: Props) {
    const [step, setStep] = useState(1);
    const { region, hasRegion, isDetecting, detectGPS } = useRegion();
    const [regionSelectorOpen, setRegionSelectorOpen] = useState(false);
    const [data, setData] = useState<FormData>({
        cropType: '', variety: '', plantingDate: '', farmSizeAcres: '',
        region: '', targetMarket: '',
    });
    const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
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

    // ── Validation ────────────────────────────────────────────────────────────

    const validateStep1 = (): boolean => {
        const e: typeof errors = {};
        if (!data.cropType.trim()) e.cropType = 'Crop name is required.';
        if (!data.plantingDate) e.plantingDate = 'Planting date is required.';
        const acres = parseFloat(data.farmSizeAcres);
        if (!data.farmSizeAcres || isNaN(acres) || acres <= 0) e.farmSizeAcres = 'Enter a valid farm size (> 0).';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const validateStep2 = (): boolean => {
        const e: typeof errors = {};
        if (!data.region.trim()) e.region = 'Region is required.';
        if (!data.targetMarket) e.targetMarket = 'Select a target market.';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleNext = () => {
        if (!validateStep1()) { haptics.error(); return; }
        haptics.light();
        setStep(2);
    };

    const handleSubmit = async () => {
        if (!validateStep2()) { haptics.error(); return; }

        setSubmitting(true);
        setApiError('');
        haptics.heavy();

        try {
            const payload: HarvestOptimizerInput = {
                cropType: data.cropType.trim(),
                variety: data.variety.trim() || undefined,
                plantingDate: data.plantingDate,
                region: data.region.trim(),
                farmSizeAcres: parseFloat(data.farmSizeAcres),
                targetMarket: data.targetMarket as HarvestOptimizerInput['targetMarket'],
            };

            const res = await fetch('/api/harvest-optimizer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to generate report.');

            const record: HarvestOptimizerRecord = json.report;
            haptics.success();
            onSuccess(record);

            saveHarvestOptimizer(record)
                .then(id => { record.id = id; })
                .catch(err => console.warn('[HarvestOptimizer] Firestore save skipped:', err?.message));

        } catch (err: unknown) {
            setApiError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
            haptics.error();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <div className="flex flex-col gap-5 animate-in fade-in-0 duration-300">

                {/* Header */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-amber-500/10">
                            {step === 1 ? <Tractor className="h-5 w-5 text-amber-600" /> : <MapPin className="h-5 w-5 text-amber-600" />}
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Step {step} of 2</p>
                            <h2 className="text-sm font-bold">{step === 1 ? 'Crop Details' : 'Location & Market'}</h2>
                        </div>
                    </div>
                    <StepBar step={step} />
                </div>

                {/* Step 1 */}
                {step === 1 && (
                    <Card className="rounded-2xl border-border">
                        <CardContent className="p-4 flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5 z-20">
                                <Label htmlFor="cropType" className="text-sm font-semibold flex items-center gap-1.5">
                                    <Sprout className="h-4 w-4 text-amber-600" /> Crop Name <span className="text-red-500">*</span>
                                </Label>
                                {data.cropType ? (
                                    <div className="flex items-center justify-between p-3.5 border border-amber-500/30 rounded-2xl bg-amber-500/5 text-amber-700 font-medium animate-in zoom-in-95">
                                        <span>{data.cropType}</span>
                                        <Button variant="ghost" size="icon" onClick={() => set('cropType', '')} className="h-7 w-7 rounded-full text-amber-600 hover:bg-amber-500/20">
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className={cn("relative z-20", errors.cropType && "ring-2 ring-red-500 rounded-2xl")}>
                                        <CropSearchInput
                                            placeholder="Search by crop name..."
                                            onSelect={(id, name) => set('cropType', name)}
                                        />
                                    </div>
                                )}
                                {errors.cropType && <p className="text-xs text-red-500">{errors.cropType}</p>}
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="variety" className="text-sm font-semibold text-muted-foreground">
                                    Variety <span className="text-xs font-normal">(optional)</span>
                                </Label>
                                <Input
                                    id="variety"
                                    placeholder='e.g. Punjab-11, Desi'
                                    value={data.variety}
                                    onChange={e => set('variety', e.target.value)}
                                    className="rounded-xl h-11"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="plantingDate" className="text-sm font-semibold">Planting Date <span className="text-red-500">*</span></Label>
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
                                <Label htmlFor="farmSize" className="text-sm font-semibold">Farm Size (acres) <span className="text-red-500">*</span></Label>
                                <Input
                                    id="farmSize"
                                    type="number"
                                    min="0.1"
                                    step="0.5"
                                    placeholder="e.g. 5"
                                    value={data.farmSizeAcres}
                                    onChange={e => set('farmSizeAcres', e.target.value)}
                                    className={cn('rounded-xl h-11', errors.farmSizeAcres && 'border-red-500')}
                                />
                                {errors.farmSizeAcres && <p className="text-xs text-red-500">{errors.farmSizeAcres}</p>}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 2 */}
                {step === 2 && (
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
                                            ? 'border-amber-500/20 bg-amber-500/5'
                                            : 'border-border bg-card hover:bg-muted',
                                        errors.region && 'border-red-500 ring-1 ring-red-500/20',
                                    )}
                                >
                                    <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                    <span className={cn('text-sm truncate flex-1', data.region ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                                        {isDetecting ? 'Detecting location...' : data.region || 'Tap to set region'}
                                    </span>
                                    <span className="text-[10px] font-semibold text-amber-600 shrink-0">
                                        {data.region ? 'Change' : 'Set'}
                                    </span>
                                </button>
                                {errors.region && <p className="text-xs text-red-500">{errors.region}</p>}
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label className="text-sm font-semibold">Target Market <span className="text-red-500">*</span></Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {MARKET_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => { set('targetMarket', opt.value); haptics.light(); }}
                                            className={cn(
                                                'py-3 px-3 rounded-xl border text-sm font-medium text-left transition-all duration-150 flex items-center gap-2',
                                                data.targetMarket === opt.value
                                                    ? 'bg-amber-500/10 border-amber-500 text-amber-700 font-semibold'
                                                    : 'border-border bg-card hover:bg-muted active:scale-95',
                                            )}
                                        >
                                            <span className="text-base leading-none">{opt.emoji}</span>
                                            <span className="text-xs">{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                                {errors.targetMarket && <p className="text-xs text-red-500">{errors.targetMarket}</p>}
                            </div>

                            {/* Confirmation summary */}
                            {data.cropType && (
                                <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3.5">
                                    <p className="text-xs font-bold text-amber-700 mb-1.5">📋 Generating report for</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {[
                                            `🌾 ${data.cropType}${data.variety ? ` (${data.variety})` : ''}`,
                                            `📅 From ${data.plantingDate}`,
                                            `📐 ${data.farmSizeAcres} acres`,
                                        ].filter(Boolean).map(chip => (
                                            <span key={chip} className="text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground">{chip}</span>
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
                        <Button variant="outline" onClick={() => { haptics.light(); setStep(1); }} disabled={submitting} className="flex-1 rounded-xl h-12 font-semibold gap-2">
                            <ChevronLeft className="h-4 w-4" /> Back
                        </Button>
                    )}
                    {step === 1 ? (
                        <Button onClick={handleNext} className="flex-1 rounded-xl h-12 font-semibold gap-2 bg-amber-600 hover:bg-amber-700">
                            Next <ChevronRight className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={submitting} className="flex-1 rounded-xl h-12 font-semibold gap-2 bg-amber-600 hover:bg-amber-700">
                            {submitting ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Generating report…</>
                            ) : (
                                <><Tractor className="h-4 w-4" /> Generate Report</>
                            )}
                        </Button>
                    )}
                </div>

                {submitting && (
                    <p className="text-center text-xs text-muted-foreground animate-pulse">
                        AI is analysing your crop data… this may take 15–30 seconds.
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
