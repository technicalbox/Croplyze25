/**
 * @fileOverview Server-only orchestrator for the Harvest Optimizer.
 * Calls the AI flow and wraps in a HarvestOptimizerRecord.
 * No Firestore — persistence is handled client-side.
 */

import {
    generateHarvestOptimizer,
    type HarvestOptimizerInput,
    type HarvestOptimizerOutput,
} from '@/ai/flows/farming-partner/harvest-optimizer-flow';

export type { HarvestOptimizerInput, HarvestOptimizerOutput };

// ─── Record type (stored in Firestore) ────────────────────────────────────────

export interface HarvestOptimizerRecord {
    id?: string;
    userId: string;
    createdAt: number;          // Unix ms
    input: HarvestOptimizerInput;
    output: HarvestOptimizerOutput;
}

// ─── Server function ──────────────────────────────────────────────────────────

export async function generateHarvestOptimizerPlan(
    input: HarvestOptimizerInput,
    userId: string,
): Promise<HarvestOptimizerRecord> {
    const output = await generateHarvestOptimizer(input);

    return {
        userId,
        createdAt: Date.now(),
        input,
        output,
    };
}
