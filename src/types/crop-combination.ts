/**
 * Types for the Crop Combination feature.
 * Describes pairs of crops that grow well together (companion planting / intercropping).
 */

export type Season = 'kharif' | 'rabi' | 'zaid';
export type SoilType = 'loamy' | 'clayey' | 'sandy' | 'alluvial' | 'red' | 'black' | 'laterite';

export interface CropCombination {
    /** Unique slug, e.g. "rice-azolla" */
    id: string;
    /** Primary crop */
    primaryCrop: {
        name: string;
        id: string; // slug matching crops_seed.json
        emoji: string;
    };
    /** Companion crop */
    companionCrop: {
        name: string;
        id: string;
        emoji: string;
    };
    /** Short tagline, e.g. "Classic companion planting pair" */
    tagline: string;
    /** Intercropping type */
    type: 'intercropping' | 'companion' | 'relay' | 'mixed';
    /** Benefits of growing together */
    benefits: string[];
    /** Soil compatibility — which soil types suit this pair */
    soilCompatibility: SoilType[];
    /** Water requirements description */
    waterRequirement: 'Low' | 'Medium' | 'High';
    /** Pest reduction advantages */
    pestReduction: string[];
    /** Expected yield benefit as a short description */
    yieldBenefit: string;
    /** Yield improvement percentage estimate */
    yieldImprovementPct: number;
    /** Applicable seasons */
    seasons: Season[];
    /** ICAR/FAO/university recommendation source */
    source: string;
    /** Detailed growing guide */
    growingGuide: string;
    /** Popularity / relevance score (1-10) */
    popularity: number;
}

/** Saved crop combination record (user bookmarks) */
export interface SavedCropCombination {
    id?: string;
    userId: string;
    combinationId: string;
    combinationTitle: string;
    createdAt: number;
    notes?: string;
}
