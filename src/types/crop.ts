/**
 * Firestore `crops` collection — TypeScript types.
 * Document ID = machine slug, e.g. "rice", "wheat", "maize".
 *
 * Schema v2 — flattened for Firestore, 5-language support,
 * includes growing guide, disease risks with severity, and farming tips.
 */

// ── Crop type enum ───────────────────────────────────────────────────────────

export type CropType =
    | 'grain'
    | 'pulse'
    | 'oilseed'
    | 'vegetable'
    | 'leafy_green'
    | 'fruit'
    | 'spice'
    | 'plantation'
    | 'cash_crop'
    | 'flower'
    | 'medicinal'
    | 'fodder'
    | 'nut'
    | 'tuber'
    | 'berry'
    | 'exotic'
    | 'mushroom'
    | 'aquatic';

export const CROP_TYPES: CropType[] = [
    'grain', 'pulse', 'oilseed', 'vegetable', 'leafy_green',
    'fruit', 'spice', 'plantation', 'cash_crop', 'flower',
    'medicinal', 'fodder', 'nut', 'tuber', 'berry',
    'exotic', 'mushroom', 'aquatic',
];

// ── Sub-types ────────────────────────────────────────────────────────────────

export interface GrowthStep {
    step: number;
    title: string;
    description: string;
    daysFromStart: string; // e.g. "0-7", "8-21"
}

export interface DiseaseRisk {
    name: string;
    symptoms: string;
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    prevention: string;
    treatment: string;
}

// ── Main document ────────────────────────────────────────────────────────────

export interface CropDocument {
    // Identity
    id: string;
    commonNames: {
        en: string;
        hi: string;
        te: string;
        ta: string;
        kn: string;
    };
    scientificName: string;
    aliases: string[];
    cropType: CropType;

    // Growing conditions
    seasonBest: string[];
    seasonAvoid: string[];
    soilBest: string[];
    soilBad: string[];
    waterNeeds: 'High' | 'Medium' | 'Low';
    sunlightNeeds: 'Full sun' | 'Partial shade' | 'Full shade';
    tempRangeC: { min: number; max: number };
    timeToHarvestDays: number;

    // Market intelligence
    marketDemandLevel: 'high' | 'medium' | 'low';
    peakDemandMonths: number[];
    isSeasonalCrop: boolean;

    // Farming guide
    growthSteps: GrowthStep[];
    diseaseRisks: DiseaseRisk[];
    preventionTips: string[];
    yieldImprovementTips: string[];
    harvestTips: string[];

    // Search & metadata
    searchKeywords: string[];
    tags: string[];
    lastUpdated: string;
    source: 'seed' | 'ai_generated' | 'curated';
}
