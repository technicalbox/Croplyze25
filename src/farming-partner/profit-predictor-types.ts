/**
 * @fileOverview Shared types for the Crop Profit Predictor.
 *
 * All calculation logic is pure client-side math — no AI flows needed.
 * Firestore persistence uses the ProfitCalculation shape.
 */

import type { CropType } from '@/types/crop';

// ── Input from the farmer ────────────────────────────────────────────────────

export interface ProfitInput {
    cropId: string;
    cropName: string;
    landSizeAcres: number;
    yieldPerAcre: number;          // quintals (default unit)
    marketPricePerUnit: number;    // ₹ per quintal
    fertilizerCost: number;        // ₹
    laborCost: number;             // ₹
    irrigationCost: number;        // ₹ (optional, default 0)
    otherExpenses: number;         // ₹ (optional, default 0)
}

// ── Calculated results ───────────────────────────────────────────────────────

export interface ProfitResult {
    totalYield: number;
    totalRevenue: number;
    totalCost: number;
    netProfit: number;
    profitMarginPercent: number;
    breakEvenPricePerUnit: number;
    breakEvenYield: number;
    isProfit: boolean;
}

// ── Firestore document ───────────────────────────────────────────────────────

export interface ProfitCalculation {
    id?: string;
    userId: string;
    createdAt: number;             // Unix ms timestamp
    input: ProfitInput;
    result: ProfitResult;
    region?: string;               // saved for context
}

// ── Default yield & price by crop type ───────────────────────────────────────
// Sensible Indian agriculture averages (quintals/acre & ₹/quintal).
// Farmer can always override these in the form.

export const CROP_DEFAULTS: Record<CropType, { yieldPerAcre: number; pricePerUnit: number; unit: string }> = {
    grain: { yieldPerAcre: 20, pricePerUnit: 2200, unit: 'quintal' },
    pulse: { yieldPerAcre: 8, pricePerUnit: 6500, unit: 'quintal' },
    oilseed: { yieldPerAcre: 6, pricePerUnit: 5500, unit: 'quintal' },
    vegetable: { yieldPerAcre: 40, pricePerUnit: 1500, unit: 'quintal' },
    leafy_green: { yieldPerAcre: 30, pricePerUnit: 2000, unit: 'quintal' },
    fruit: { yieldPerAcre: 30, pricePerUnit: 3000, unit: 'quintal' },
    spice: { yieldPerAcre: 4, pricePerUnit: 15000, unit: 'quintal' },
    plantation: { yieldPerAcre: 10, pricePerUnit: 8000, unit: 'quintal' },
    cash_crop: { yieldPerAcre: 15, pricePerUnit: 5000, unit: 'quintal' },
    flower: { yieldPerAcre: 8, pricePerUnit: 10000, unit: 'quintal' },
    medicinal: { yieldPerAcre: 5, pricePerUnit: 12000, unit: 'quintal' },
    fodder: { yieldPerAcre: 80, pricePerUnit: 500, unit: 'quintal' },
    nut: { yieldPerAcre: 4, pricePerUnit: 25000, unit: 'quintal' },
    tuber: { yieldPerAcre: 50, pricePerUnit: 1200, unit: 'quintal' },
    berry: { yieldPerAcre: 15, pricePerUnit: 8000, unit: 'quintal' },
    exotic: { yieldPerAcre: 10, pricePerUnit: 12000, unit: 'quintal' },
    mushroom: { yieldPerAcre: 12, pricePerUnit: 10000, unit: 'quintal' },
    aquatic: { yieldPerAcre: 20, pricePerUnit: 4000, unit: 'quintal' },
};

// ── Pure calculation function ────────────────────────────────────────────────

export function calculateProfit(input: ProfitInput): ProfitResult {
    const totalYield = input.landSizeAcres * input.yieldPerAcre;
    const totalRevenue = totalYield * input.marketPricePerUnit;
    const totalCost =
        input.fertilizerCost +
        input.laborCost +
        input.irrigationCost +
        input.otherExpenses;
    const netProfit = totalRevenue - totalCost;
    const profitMarginPercent =
        totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const breakEvenPricePerUnit =
        totalYield > 0 ? totalCost / totalYield : 0;
    const breakEvenYield =
        input.marketPricePerUnit > 0
            ? totalCost / input.marketPricePerUnit
            : 0;

    return {
        totalYield,
        totalRevenue,
        totalCost,
        netProfit,
        profitMarginPercent,
        breakEvenPricePerUnit,
        breakEvenYield,
        isProfit: netProfit >= 0,
    };
}
