/**
 * @fileOverview Shared types for the Farming Partner Engine.
 * Re-exports from AI flows + defines the Firestore FarmingPlanRecord.
 */

export type {
    CropPlanInput,
    CropPlanOutput,
} from '@/ai/flows/farming-partner/crop-plan-flow';

export type {
    SoilPrepInput,
    SoilPrepOutput,
} from '@/ai/flows/farming-partner/soil-preparation-flow';

export type {
    GrowthTimelineInput,
    GrowthTimelineOutput,
} from '@/ai/flows/farming-partner/growth-timeline-flow';

export type {
    HarvestOptimizerInput,
    HarvestOptimizerOutput,
} from '@/ai/flows/farming-partner/harvest-optimizer-flow';

export type {
    RiskAnalysisInput,
    RiskAnalysisOutput,
} from '@/ai/flows/farming-partner/risk-analysis-flow';

/**
 * The input shape accepted by the generate API route,
 * covering all 5 engine modules.
 */
export interface FarmingPlanRequest {
    // shared fields used across multiple flows
    cropType: string;
    region: string;
    soilType: string;
    season: string;
    farmSizeAcres: number;
    // crop-plan specific
    plantingDate?: string;         // optional: user may not know yet
    variety?: string;              // optional
    // soil-prep specific
    currentPHLevel?: number;       // optional: defaults to 7.0 if not provided
    // harvest-optimizer specific
    targetMarket?: string;         // optional: defaults to "local"
}

/**
 * A complete farming plan stored in Firestore.
 * Stored at: users/{userId}/farming-plans/{planId}
 */
export interface FarmingPlanRecord {
    id?: string;
    userId: string;
    createdAt: number;             // Unix timestamp (ms)
    request: FarmingPlanRequest;
    cropPlan: import('@/ai/flows/farming-partner/crop-plan-flow').CropPlanOutput;
    soilPrep: import('@/ai/flows/farming-partner/soil-preparation-flow').SoilPrepOutput;
    growthTimeline: import('@/ai/flows/farming-partner/growth-timeline-flow').GrowthTimelineOutput;
    harvest: import('@/ai/flows/farming-partner/harvest-optimizer-flow').HarvestOptimizerOutput;
    riskAnalysis: import('@/ai/flows/farming-partner/risk-analysis-flow').RiskAnalysisOutput;
}
