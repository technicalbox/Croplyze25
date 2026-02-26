import { NextRequest, NextResponse } from 'next/server';
import { createAndSaveFarmingPlan } from '@/farming-partner/farming-partner-service';
import type { FarmingPlanRequest } from '@/farming-partner/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/farming-partner/generate
 *
 * Generates a complete farming plan using all 5 AI modules in parallel,
 * then saves the result to Firestore.
 *
 * Request headers:
 *   x-user-id: <Firebase UID>   (required)
 *
 * Request body (JSON):
 *   See FarmingPlanRequest in src/farming-partner/types.ts
 *
 * Response:
 *   { planId: string, plan: FarmingPlanRecord }
 */
export async function POST(req: NextRequest) {
    try {
        // Auth: expect Firebase UID in header (set by client before calling)
        const userId = req.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized — x-user-id header is required.' },
                { status: 401 }
            );
        }

        // Parse and validate request body
        let body: FarmingPlanRequest;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
        }

        const { cropType, region, soilType, season, farmSizeAcres } = body;

        if (!cropType || !region || !soilType || !season || !farmSizeAcres) {
            return NextResponse.json(
                {
                    error: 'Missing required fields: cropType, region, soilType, season, farmSizeAcres.',
                },
                { status: 422 }
            );
        }

        if (typeof farmSizeAcres !== 'number' || farmSizeAcres <= 0) {
            return NextResponse.json(
                { error: 'farmSizeAcres must be a positive number.' },
                { status: 422 }
            );
        }

        // Generate and persist the full farming plan
        const result = await createAndSaveFarmingPlan(body, userId);

        return NextResponse.json(result, { status: 201 });
    } catch (err: unknown) {
        console.error('[farming-partner/generate] Error:', err);
        const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
