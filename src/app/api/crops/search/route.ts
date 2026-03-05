import { NextRequest, NextResponse } from 'next/server';
import { searchCrops, getAllCrops } from '@/services/crops-service';

/**
 * GET /api/crops/search?q=rice&season=kharif&tag=grain&cropType=vegetable&limit=10
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const q = searchParams.get('q')?.trim() ?? '';
        const season = searchParams.get('season') ?? undefined;
        const tag = searchParams.get('tag') ?? undefined;
        const cropType = searchParams.get('cropType') ?? undefined;
        const maxResults = Math.min(
            parseInt(searchParams.get('limit') ?? '10', 10) || 10,
            50,
        );

        if (!q) {
            const all = await getAllCrops();
            let results = all;
            if (season) results = results.filter(c => c.seasonBest.some(s => s === season.toLowerCase() || s === 'all_year'));
            if (tag) results = results.filter(c => c.tags.includes(tag.toLowerCase()));
            if (cropType) results = results.filter(c => c.cropType === cropType);
            return NextResponse.json({ results: results.slice(0, maxResults), total: results.length });
        }

        const results = await searchCrops(q, { maxResults, season, tag, cropType });
        return NextResponse.json({ results, total: results.length });
    } catch (err) {
        console.error('[crops/search] Error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal error' },
            { status: 500 },
        );
    }
}
