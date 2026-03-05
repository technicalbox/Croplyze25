/**
 * @fileOverview Server-only AI orchestration for the Crop Success Planner.
 *
 * Runs cropSuccessPlannerFlow + soilIntelligenceFlow in PARALLEL via Promise.all
 * — zero added latency compared to running either flow alone.
 *
 * Firestore persistence is handled client-side (crop-success-planner-client.ts)
 * to avoid PERMISSION_DENIED from unauthenticated server-side Firestore calls.
 */

import { runCropSuccessPlanner } from '@/ai/flows/farming-partner/crop-success-planner-flow';
import { runSoilIntelligence } from '@/ai/flows/farming-partner/soil-intelligence-flow';
import type { CropSuccessPlannerInput, CropSuccessPlannerOutput } from '@/ai/flows/farming-partner/crop-success-planner-flow';
import type { SoilIntelligenceOutput } from '@/ai/flows/farming-partner/soil-intelligence-flow';

// Re-export so client code only needs to import from this module
export type { CropSuccessPlannerInput, CropSuccessPlannerOutput, SoilIntelligenceOutput };

// ─── Shared document type ─────────────────────────────────────────────────────

/**
 * Full plan document — stored in Firestore client-side after generation.
 * soilIntelligence is optional for backward compatibility with plans
 * generated before this feature was added.
 */
export interface CropSuccessPlan {
    id?: string;
    userId: string;
    createdAt: number;              // Unix ms timestamp
    status: 'completed' | 'error';
    input: CropSuccessPlannerInput;
    result: CropSuccessPlannerOutput;
    soilIntelligence?: SoilIntelligenceOutput;
}

// ─── Server orchestrator ──────────────────────────────────────────────────────

/**
 * Runs the crop suitability planner AND soil intelligence analyser in parallel.
 * Returns a combined CropSuccessPlan with both results.
 */
export async function generateCropSuccessPlan(
    input: CropSuccessPlannerInput,
    userId: string
): Promise<CropSuccessPlan> {
    const [result, soilIntelligence] = await Promise.all([
        runCropSuccessPlanner(input),
        runSoilIntelligence(input),
    ]);

    return {
        userId,
        createdAt: Date.now(),
        status: 'completed',
        input,
        result,
        soilIntelligence,
    };
}
