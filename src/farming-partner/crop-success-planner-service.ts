/**
 * @fileOverview Server-only AI orchestration for the Crop Success Planner.
 *
 * This module ONLY calls the AI flow. Firestore persistence is intentionally
 * omitted — it is handled client-side (where Firebase Auth context exists).
 *
 * The Firestore client SDK enforces security rules that require a valid
 * authenticated session (request.auth). When called from a server-side
 * Next.js API route there is no auth session, resulting in PERMISSION_DENIED.
 * Moving writes to the client resolves this cleanly without needing Admin SDK.
 */

import { runCropSuccessPlanner } from '@/ai/flows/farming-partner/crop-success-planner-flow';
import type {
    CropSuccessPlannerInput,
    CropSuccessPlannerOutput,
} from '@/ai/flows/farming-partner/crop-success-planner-flow';

// ─── Shared type (used by both server and client) ─────────────────────────────

/** Full plan document — stored in Firestore by the client after AI generation. */
export interface CropSuccessPlan {
    id?: string;
    userId: string;
    createdAt: number;             // Unix ms timestamp
    status: 'completed' | 'error';
    input: CropSuccessPlannerInput;
    result: CropSuccessPlannerOutput;
}

// ─── Server function — AI only ────────────────────────────────────────────────

/**
 * Invokes the AI flow and returns the structured result.
 * Does NOT write to Firestore (call savePlanToFirestore() client-side instead).
 */
export async function generateCropSuccessPlan(
    input: CropSuccessPlannerInput,
    userId: string
): Promise<CropSuccessPlan> {
    const result = await runCropSuccessPlanner(input);

    return {
        userId,
        createdAt: Date.now(),
        status: 'completed',
        input,
        result,
    };
}
