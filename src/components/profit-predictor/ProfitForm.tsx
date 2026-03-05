'use client';

import React, { useState, useCallback } from 'react';
import {
    Ruler, IndianRupee, Wheat, Droplets, Users, Package, Calculator, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CropSearchInput } from '@/components/crops/CropSearchInput';
import { useRegion } from '@/providers/region-provider';
import { haptics } from '@/lib/haptics';
import {
    CROP_DEFAULTS,
    calculateProfit,
    type ProfitInput,
    type ProfitCalculation,
} from '@/farming-partner/profit-predictor-types';
import { saveProfitCalculation } from '@/farming-partner/profit-predictor-client';
import type { CropType } from '@/types/crop';

// ── Helpers ──────────────────────────────────────────────────────────────────

function NumberField({
    label, icon: Icon, value, onChange, placeholder, suffix, required = false,
}: {
    label: string;
    icon: React.ElementType;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    suffix?: string;
    required?: boolean;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" />
                {label}
                {required && <span className="text-red-400">*</span>}
            </label>
            <div className="relative">
                <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder ?? '0'}
                    className="w-full rounded-xl border border-border bg-white/50 dark:bg-white/5 backdrop-blur-sm px-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                {suffix && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">
                        {suffix}
                    </span>
                )}
            </div>
        </div>
    );
}

// ── Main Form ────────────────────────────────────────────────────────────────

interface ProfitFormProps {
    userId: string;
    onSuccess: (calc: ProfitCalculation) => void;
}

export default function ProfitForm({ userId, onSuccess }: ProfitFormProps) {
    const { region, hasRegion } = useRegion();

    // Crop selection
    const [selectedCropId, setSelectedCropId] = useState('');
    const [selectedCropName, setSelectedCropName] = useState('');
    const [selectedCropType, setSelectedCropType] = useState<CropType | ''>('');

    // Form values (strings for input control, parsed to numbers on submit)
    const [landSize, setLandSize] = useState('');
    const [yieldPerAcre, setYieldPerAcre] = useState('');
    const [marketPrice, setMarketPrice] = useState('');
    const [fertilizerCost, setFertilizerCost] = useState('');
    const [laborCost, setLaborCost] = useState('');
    const [irrigationCost, setIrrigationCost] = useState('');
    const [otherExpenses, setOtherExpenses] = useState('');

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // ── Crop selection handler ───────────────────────────────────────────────

    const handleCropSelect = useCallback(async (cropId: string, cropName: string) => {
        setSelectedCropId(cropId);
        setSelectedCropName(cropName);
        setError('');

        // Fetch the crop to get its type for default values
        try {
            const res = await fetch(`/api/crops/${cropId}`);
            if (res.ok) {
                const crop = await res.json();
                const cropType = crop?.cropType as CropType;
                setSelectedCropType(cropType || '');

                if (cropType && CROP_DEFAULTS[cropType]) {
                    const defaults = CROP_DEFAULTS[cropType];
                    setYieldPerAcre(String(defaults.yieldPerAcre));
                    setMarketPrice(String(defaults.pricePerUnit));
                }
            }
        } catch {
            // If fetch fails, farmer can still enter values manually
        }
    }, []);

    // ── Submit ───────────────────────────────────────────────────────────────

    const handleCalculate = useCallback(async () => {
        // Validate required fields
        if (!selectedCropId) { setError('Please select a crop'); return; }
        if (!landSize || parseFloat(landSize) <= 0) { setError('Please enter land size'); return; }
        if (!yieldPerAcre || parseFloat(yieldPerAcre) <= 0) { setError('Please enter expected yield per acre'); return; }
        if (!marketPrice || parseFloat(marketPrice) <= 0) { setError('Please enter market price'); return; }
        if (!fertilizerCost && !laborCost) { setError('Please enter at least one cost'); return; }

        setError('');
        haptics.medium();

        const input: ProfitInput = {
            cropId: selectedCropId,
            cropName: selectedCropName,
            landSizeAcres: parseFloat(landSize),
            yieldPerAcre: parseFloat(yieldPerAcre),
            marketPricePerUnit: parseFloat(marketPrice),
            fertilizerCost: parseFloat(fertilizerCost) || 0,
            laborCost: parseFloat(laborCost) || 0,
            irrigationCost: parseFloat(irrigationCost) || 0,
            otherExpenses: parseFloat(otherExpenses) || 0,
        };

        // Pure math — instant result
        const result = calculateProfit(input);

        const calc: ProfitCalculation = {
            userId,
            createdAt: Date.now(),
            input,
            result,
            region: hasRegion
                ? [region.city, region.state, region.country].filter(Boolean).join(', ')
                : undefined,
        };

        // Save to Firestore in background
        setSaving(true);
        try {
            const id = await saveProfitCalculation(calc);
            calc.id = id;
        } catch {
            // Save failed — still show results (offline-first)
        } finally {
            setSaving(false);
        }

        onSuccess(calc);
    }, [
        selectedCropId, selectedCropName, landSize, yieldPerAcre, marketPrice,
        fertilizerCost, laborCost, irrigationCost, otherExpenses,
        userId, hasRegion, region, onSuccess,
    ]);

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col gap-5">
            {/* Crop Selection */}
            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Wheat className="w-3.5 h-3.5" /> Select Crop <span className="text-red-400">*</span>
                </label>
                <CropSearchInput
                    onSelect={handleCropSelect}
                    placeholder="Search crop (e.g. Rice, Tomato)..."
                />
                {selectedCropName && (
                    <p className="text-xs text-primary font-medium mt-0.5">
                        ✓ Selected: {selectedCropName}
                        {selectedCropType && (
                            <span className="text-muted-foreground ml-1">({selectedCropType})</span>
                        )}
                    </p>
                )}
            </div>

            {/* Land Size */}
            <NumberField
                label="Land Size"
                icon={Ruler}
                value={landSize}
                onChange={setLandSize}
                placeholder="e.g. 5"
                suffix="acres"
                required
            />

            {/* Yield & Price — side by side */}
            <div className="grid grid-cols-2 gap-3">
                <NumberField
                    label="Yield / Acre"
                    icon={Package}
                    value={yieldPerAcre}
                    onChange={setYieldPerAcre}
                    placeholder="e.g. 20"
                    suffix="qtl"
                    required
                />
                <NumberField
                    label="Market Price"
                    icon={IndianRupee}
                    value={marketPrice}
                    onChange={setMarketPrice}
                    placeholder="e.g. 2200"
                    suffix="₹/qtl"
                    required
                />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 h-px bg-border dark:bg-white/10" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1.5">Costs</span>
                <div className="flex-1 h-px bg-border dark:bg-white/10" />
            </div>

            {/* Costs */}
            <div className="grid grid-cols-2 gap-3">
                <NumberField
                    label="Fertilizer"
                    icon={Droplets}
                    value={fertilizerCost}
                    onChange={setFertilizerCost}
                    placeholder="₹ total"
                    suffix="₹"
                    required
                />
                <NumberField
                    label="Labor"
                    icon={Users}
                    value={laborCost}
                    onChange={setLaborCost}
                    placeholder="₹ total"
                    suffix="₹"
                    required
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <NumberField
                    label="Irrigation"
                    icon={Droplets}
                    value={irrigationCost}
                    onChange={setIrrigationCost}
                    placeholder="Optional"
                    suffix="₹"
                />
                <NumberField
                    label="Other Expenses"
                    icon={Package}
                    value={otherExpenses}
                    onChange={setOtherExpenses}
                    placeholder="Optional"
                    suffix="₹"
                />
            </div>

            {/* Error */}
            {error && (
                <p className="text-sm text-red-500 font-medium bg-red-50 dark:bg-red-950/30 rounded-xl px-4 py-2.5">
                    {error}
                </p>
            )}

            {/* Submit Button */}
            <Button
                onClick={handleCalculate}
                disabled={saving}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-base shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-transform duration-150"
            >
                {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                    <Calculator className="w-5 h-5 mr-2" />
                )}
                {saving ? 'Saving...' : 'Calculate Profit'}
            </Button>
        </div>
    );
}
