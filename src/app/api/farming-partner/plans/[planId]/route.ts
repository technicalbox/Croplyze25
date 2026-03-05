import { NextRequest, NextResponse } from 'next/server';
import {
    getFarmingPlan,
    deleteFarmingPlan,
} from '@/farming-partner/farming-partner-service';

// Force dynamic so Next.js doesn't attempt static pre-rendering of this route
export const dynamic = 'force-dynamic';

interface RouteParams {
    params: Promise<{ planId: string }>;
}

/**
 * GET /api/farming-partner/plans/[planId]
 *
 * Fetches a single farming plan by ID.
 *
 * Request headers:
 *   x-user-id: <Firebase UID>   (required)
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        const userId = req.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized — x-user-id header is required.' },
                { status: 401 }
            );
        }

        const { planId } = await params;
        const plan = await getFarmingPlan(userId, planId);
        if (!plan) {
            return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });
        }

        return NextResponse.json({ plan }, { status: 200 });
    } catch (err: unknown) {
        console.error('[farming-partner/plans/[planId]] GET Error:', err);
        const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * DELETE /api/farming-partner/plans/[planId]
 *
 * Deletes a farming plan by ID.
 *
 * Request headers:
 *   x-user-id: <Firebase UID>   (required)
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
    try {
        const userId = req.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized — x-user-id header is required.' },
                { status: 401 }
            );
        }

        const { planId } = await params;

        // Verify the plan exists and belongs to this user before deleting
        const plan = await getFarmingPlan(userId, planId);
        if (!plan) {
            return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });
        }

        await deleteFarmingPlan(userId, planId);
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err: unknown) {
        console.error('[farming-partner/plans/[planId]] DELETE Error:', err);
        const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
