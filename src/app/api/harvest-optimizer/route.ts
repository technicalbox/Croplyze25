import { NextRequest, NextResponse } from 'next/server';
import { generateHarvestOptimizerPlan } from '@/farming-partner/harvest-optimizer-service';
import { HarvestOptimizerInputSchema } from '@/ai/flows/farming-partner/harvest-optimizer-flow';

// Force dynamic — uses request headers; never statically rendered.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const userId = req.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json({ error: 'Missing x-user-id header.' }, { status: 401 });
        }

        const body = await req.json();
        const parsed = HarvestOptimizerInputSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid input.', details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const report = await generateHarvestOptimizerPlan(parsed.data, userId);
        return NextResponse.json({ report }, { status: 200 });

    } catch (err: unknown) {
        console.error('[POST /api/harvest-optimizer]', err);
        const message = err instanceof Error ? err.message : 'Internal server error.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
