import { NextRequest, NextResponse } from 'next/server';
import {
    runCropCombination,
    type CropCombinationInput,
} from '@/ai/flows/farming-partner/crop-combination-flow';

export const dynamic = 'force-dynamic';

// ─── Validation ───────────────────────────────────────────────────────────────

const VALID_WATER = ['low', 'medium', 'high'] as const;
const VALID_SUNLIGHT = ['partial_sun', 'full_sun'] as const;

function validateInput(body: unknown): CropCombinationInput | { error: string } {
    if (!body || typeof body !== 'object') {
        return { error: 'Request body must be a JSON object.' };
    }

    const b = body as Record<string, unknown>;
    const requiredStrings = ['soilType', 'region', 'season', 'irrigationType', 'farmingGoal'];

    for (const field of requiredStrings) {
        if (typeof b[field] !== 'string' || !(b[field] as string).trim()) {
            return { error: `Missing or invalid field: "${field}". Must be a non-empty string.` };
        }
    }

    if (typeof b.landSize !== 'number' || b.landSize <= 0) {
        return { error: '"landSize" must be a positive number.' };
    }

    if (!VALID_WATER.includes(b.waterAvailability as (typeof VALID_WATER)[number])) {
        return { error: `"waterAvailability" must be one of: ${VALID_WATER.join(', ')}.` };
    }

    if (!VALID_SUNLIGHT.includes(b.sunlightExposure as (typeof VALID_SUNLIGHT)[number])) {
        return { error: `"sunlightExposure" must be one of: ${VALID_SUNLIGHT.join(', ')}.` };
    }

    return {
        soilType: (b.soilType as string).trim(),
        landSize: b.landSize as number,
        region: (b.region as string).trim(),
        season: (b.season as string).trim(),
        waterAvailability: b.waterAvailability as CropCombinationInput['waterAvailability'],
        irrigationType: (b.irrigationType as string).trim(),
        sunlightExposure: b.sunlightExposure as CropCombinationInput['sunlightExposure'],
        farmingGoal: (b.farmingGoal as string).trim(),
        cropPreferences: typeof b.cropPreferences === 'string' ? b.cropPreferences.trim() || undefined : undefined,
        language: typeof b.language === 'string' ? b.language.trim() : 'en',
    };
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    try {
        const userId = req.headers.get('x-user-id')?.trim();
        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized — include your Firebase UID in the x-user-id header.' },
                { status: 401 }
            );
        }

        let rawBody: unknown;
        try {
            rawBody = await req.json();
        } catch {
            return NextResponse.json({ error: 'Request body is not valid JSON.' }, { status: 400 });
        }

        const validated = validateInput(rawBody);
        if ('error' in validated) {
            return NextResponse.json({ error: validated.error }, { status: 422 });
        }

        const result = await runCropCombination(validated);

        return NextResponse.json({ result }, { status: 200 });
    } catch (err: unknown) {
        console.error('[crop-combination] POST error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal server error.' },
            { status: 500 }
        );
    }
}
