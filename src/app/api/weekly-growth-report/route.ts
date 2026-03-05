import { NextRequest, NextResponse } from 'next/server';
import { generateWeeklyGrowthReport } from '@/farming-partner/weekly-growth-report-service';
import { WeeklyGrowthReportInputSchema } from '@/ai/flows/farming-partner/weekly-growth-report-flow';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/weekly-growth-report
 *
 * Generates a weekly growth report for a crop using AI.
 * Returns the full WeeklyGrowthReportRecord — the authenticated client saves it to Firestore.
 *
 * Headers required:
 *   x-user-id: <Firebase UID>
 *
 * Body (JSON):
 *   cropName:           string  (required)
 *   plantingDate:       string  (required, YYYY-MM-DD)
 *   currentGrowthStage: string  (required)
 *   weekNumber:         number  (required)
 *   weekStartDate:      string  (required, YYYY-MM-DD)
 *   weekEndDate:        string  (required, YYYY-MM-DD)
 *   weatherData:        string  (required)
 *   farmerActivities:   string  (required)
 *   region?:            string  (optional)
 *   soilData?:          string  (optional)
 *   cropVariety?:       string  (optional)
 */
export async function POST(req: NextRequest) {
    try {
        const userId = req.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized — x-user-id header is required.' },
                { status: 401 }
            );
        }

        let body: unknown;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
        }

        // Validate with the flow schema (zod)
        const parsed = WeeklyGrowthReportInputSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed.', details: parsed.error.flatten().fieldErrors },
                { status: 422 }
            );
        }

        const record = await generateWeeklyGrowthReport(parsed.data, userId);
        return NextResponse.json({ report: record }, { status: 201 });

    } catch (err: unknown) {
        console.error('[weekly-growth-report POST] Error:', err);
        const message = err instanceof Error ? err.message : 'Unexpected error generating weekly report.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
