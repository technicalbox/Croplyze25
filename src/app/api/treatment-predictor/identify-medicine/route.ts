import { NextRequest, NextResponse } from 'next/server';
import { identifyMedicine } from '@/ai/flows/medicine-identify-flow';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const userId = req.headers.get('x-user-id')?.trim();
        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized — include your Firebase UID in the x-user-id header.' },
                { status: 401 }
            );
        }

        let body: unknown;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Request body is not valid JSON.' }, { status: 400 });
        }

        const b = body as Record<string, unknown>;
        if (typeof b.photoDataUri !== 'string' || !b.photoDataUri) {
            return NextResponse.json(
                { error: 'Missing required field: "photoDataUri".' },
                { status: 422 }
            );
        }

        const result = await identifyMedicine({ photoDataUri: b.photoDataUri });
        return NextResponse.json({ result }, { status: 200 });
    } catch (err: unknown) {
        console.error('[identify-medicine] POST error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal server error.' },
            { status: 500 }
        );
    }
}
