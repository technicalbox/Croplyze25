/**
 * @fileOverview Server-only orchestrator for the Growth Timeline Engine.
 *
 * Calls the AI flow and returns a GrowthTimelineRecord.
 * Firestore persistence is handled client-side (growth-timeline-client.ts)
 * to avoid PERMISSION_DENIED from unauthenticated server Firestore calls.
 */

import { runGrowthTimeline } from '@/ai/flows/farming-partner/growth-timeline-flow';
import type { GrowthTimelineInput, GrowthTimelineOutput } from '@/ai/flows/farming-partner/growth-timeline-flow';

export type { GrowthTimelineInput, GrowthTimelineOutput };

// ─── Firestore Document Type ──────────────────────────────────────────────────

/**
 * Full document stored in Firestore at:
 *   users/{userId}/growth-timelines/{timelineId}
 */
export interface GrowthTimelineRecord {
    id?: string;
    userId: string;
    createdAt: number;             // Unix ms timestamp
    updatedAt: number;             // Unix ms — updated on each week edit
    input: GrowthTimelineInput;
    timeline: GrowthTimelineOutput;
}

// ─── Server Orchestrator ──────────────────────────────────────────────────────

/**
 * Calls the AI flow and returns a GrowthTimelineRecord ready for client-side save.
 * Does NOT write to Firestore — the authenticated client handles that.
 */
export async function generateGrowthTimelinePlan(
    input: GrowthTimelineInput,
    userId: string
): Promise<GrowthTimelineRecord> {
    const timeline = await runGrowthTimeline(input);

    return {
        userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        input,
        timeline,
    };
}
