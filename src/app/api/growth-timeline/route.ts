import { NextRequest, NextResponse } from 'next/server';
import { generateGrowthTimelinePlan } from '@/farming-partner/growth-timeline-service';
import { GrowthTimelineInputSchema } from '@/ai/flows/farming-partner/growth-timeline-flow';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

/**
 * POST /api/growth-timeline
 *
 * Generates a week-by-week growth timeline for a crop using AI.
 * Returns the full GrowthTimelineRecord — the authenticated client saves it to Firestore.
 *
 * Headers required:
 *   x-user-id: <Firebase UID>
 *
 * Body (JSON):
 *   cropType:          string  (required)
 *   plantingDate:      string  (required, YYYY-MM-DD)
 *   region:            string  (required)
 *   variety?:          string  (optional, default "standard")
 *   waterAvailability?: enum   (optional, default "moderate")
 *   soilType?:         string  (optional, default "loamy")
 */
export async function POST(req: NextRequest) {
    try {
        const userId = req.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized — x-user-id header is required.' }, { status: 401 });
        }

        let body: unknown;
        try { body = await req.json(); }
        catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

        // Validate with the flow schema (zod)
        const parsed = GrowthTimelineInputSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed.', details: parsed.error.flatten().fieldErrors },
                { status: 422 }
            );
        }

        const record = await generateGrowthTimelinePlan(parsed.data, userId);
        return NextResponse.json({ timeline: record }, { status: 201 });

    } catch (err: unknown) {
        console.error('[growth-timeline POST] Error:', err);
        const message = err instanceof Error ? err.message : 'Unexpected error generating timeline.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
