/**
 * @fileOverview Server-only orchestrator for the Weekly Growth Report.
 *
 * Calls the AI flow and returns a WeeklyGrowthReportRecord.
 * Firestore persistence is handled client-side (weekly-growth-report-client.ts)
 * to avoid PERMISSION_DENIED from unauthenticated server Firestore calls.
 */

import { runWeeklyGrowthReport } from '@/ai/flows/farming-partner/weekly-growth-report-flow';
import type {
    WeeklyGrowthReportInput,
    WeeklyGrowthReportOutput,
} from '@/ai/flows/farming-partner/weekly-growth-report-flow';

export type { WeeklyGrowthReportInput, WeeklyGrowthReportOutput };

// ─── Firestore Document Type ──────────────────────────────────────────────────

/**
 * Full document stored in Firestore at:
 *   users/{userId}/weekly-growth-reports/{reportId}
 */
export interface WeeklyGrowthReportRecord {
    id?: string;
    userId: string;
    createdAt: number;             // Unix ms timestamp
    updatedAt: number;             // Unix ms
    input: WeeklyGrowthReportInput;
    report: WeeklyGrowthReportOutput;
}

// ─── Server Orchestrator ──────────────────────────────────────────────────────

/**
 * Calls the AI flow and returns a WeeklyGrowthReportRecord ready for client-side save.
 * Does NOT write to Firestore — the authenticated client handles that.
 */
export async function generateWeeklyGrowthReport(
    input: WeeklyGrowthReportInput,
    userId: string
): Promise<WeeklyGrowthReportRecord> {
    const report = await runWeeklyGrowthReport(input);

    return {
        userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        input,
        report,
    };
}
