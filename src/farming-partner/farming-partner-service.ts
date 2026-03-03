/**
 * @fileOverview Farming Partner Engine — service orchestration layer.
 * Calls all 5 AI flows in parallel and writes results to Firestore.
 */

import { generateCropPlan } from '@/ai/flows/farming-partner/crop-plan-flow';
import { generateSoilPreparationGuide } from '@/ai/flows/farming-partner/soil-preparation-flow';
import { generateGrowthTimeline } from '@/ai/flows/farming-partner/growth-timeline-flow';
import { generateHarvestOptimizer } from '@/ai/flows/farming-partner/harvest-optimizer-flow';
import { generateRiskAnalysis } from '@/ai/flows/farming-partner/risk-analysis-flow';
import {
    saveFarmingPlan,
    getUserFarmingPlans,
    getFarmingPlan,
    deleteFarmingPlan,
} from './firestore';
import type { FarmingPlanRequest, FarmingPlanRecord } from './types';

/**
 * Generate a complete farming plan by running all 5 AI flows in parallel.
 * Does NOT save to Firestore — call savePlan() separately.
 */
export async function generateFullFarmingPlan(
    request: FarmingPlanRequest,
    userId: string
): Promise<FarmingPlanRecord> {
    const {
        cropType,
        region,
        soilType,
        season,
        farmSizeAcres,
        plantingDate = 'Recommended by crop plan',
        variety = 'Standard',
        currentPHLevel = 7.0,
        targetMarket = 'local',
    } = request;

    // Run all flows in parallel for speed
    const [cropPlan, soilPrep, growthTimeline, harvest, riskAnalysis] = await Promise.all([
        generateCropPlan({ cropType, region, soilType, season, farmSizeAcres }),

        generateSoilPreparationGuide({ cropType, soilType, region, currentPHLevel }),

        generateGrowthTimeline({
            cropType,
            plantingDate,
            region,
            variety,
        }),

        generateHarvestOptimizer({
            cropType,
            plantingDate,
            region,
            targetMarket,
            farmSizeAcres,
        }),

        generateRiskAnalysis({ cropType, region, season, soilType, farmSizeAcres }),
    ]);

    return {
        userId,
        createdAt: Date.now(),
        request,
        cropPlan,
        soilPrep,
        growthTimeline,
        harvest,
        riskAnalysis,
    };
}

/**
 * Generate and persist a full farming plan.
 * Returns the saved plan with its Firestore ID.
 */
export async function createAndSaveFarmingPlan(
    request: FarmingPlanRequest,
    userId: string
): Promise<{ planId: string; plan: FarmingPlanRecord }> {
    const plan = await generateFullFarmingPlan(request, userId);
    const planId = await saveFarmingPlan(plan);
    return { planId, plan: { ...plan, id: planId } };
}

// Re-export Firestore helpers for convenience
export { getUserFarmingPlans, getFarmingPlan, deleteFarmingPlan };
