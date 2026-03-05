import { NextRequest, NextResponse } from 'next/server';
import { getCropById } from '@/services/crops-service';

/**
 * GET /api/crops/[id]
 *
 * Returns full crop document by slug ID (e.g. "rice", "wheat").
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;
        if (!id || id.length < 1) {
            return NextResponse.json({ error: 'Crop ID is required' }, { status: 400 });
        }

        const crop = await getCropById(id);
        if (!crop) {
            return NextResponse.json(
                { error: `Crop '${id}' not found` },
                { status: 404 },
            );
        }

        return NextResponse.json(crop);
    } catch (err) {
        console.error(`[crops/${(await params).id}] Error:`, err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal error' },
            { status: 500 },
        );
    }
}
