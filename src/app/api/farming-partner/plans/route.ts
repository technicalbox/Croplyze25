import { NextRequest, NextResponse } from 'next/server';
import { getUserFarmingPlans } from '@/farming-partner/farming-partner-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/farming-partner/plans
 *
 * Returns all farming plans for the authenticated user.
 *
 * Request headers:
 *   x-user-id: <Firebase UID>   (required)
 */
export async function GET(req: NextRequest) {
    try {
        const userId = req.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized — x-user-id header is required.' },
                { status: 401 }
            );
        }

        const plans = await getUserFarmingPlans(userId);
        return NextResponse.json({ plans }, { status: 200 });
    } catch (err: unknown) {
        console.error('[farming-partner/plans] GET Error:', err);
        const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
