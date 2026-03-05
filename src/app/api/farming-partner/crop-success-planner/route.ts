import { NextRequest, NextResponse } from 'next/server';
import { generateCropSuccessPlan } from '@/farming-partner/crop-success-planner-service';
import type { CropSuccessPlannerInput } from '@/ai/flows/farming-partner/crop-success-planner-flow';

// Force dynamic — uses request headers, never statically rendered.
export const dynamic = 'force-dynamic';

// ─── Input validation ─────────────────────────────────────────────────────────

const VALID_WATER_LEVELS = ['abundant', 'moderate', 'limited', 'rain-fed only'] as const;

function validateInput(body: unknown): CropSuccessPlannerInput | { error: string } {
    if (!body || typeof body !== 'object') {
        return { error: 'Request body must be a JSON object.' };
    }

    const b = body as Record<string, unknown>;
    const required = ['cropName', 'soilType', 'previousCrop', 'waterAvailability', 'region', 'season'];

    for (const field of required) {
        if (typeof b[field] !== 'string' || !(b[field] as string).trim()) {
            return { error: `Missing or invalid field: "${field}". Must be a non-empty string.` };
        }
    }

    if (!VALID_WATER_LEVELS.includes(b.waterAvailability as (typeof VALID_WATER_LEVELS)[number])) {
        return {
            error: `"waterAvailability" must be one of: ${VALID_WATER_LEVELS.map((v) => `"${v}"`).join(', ')}.`,
        };
    }

    return {
        cropName: (b.cropName as string).trim(),
        soilType: (b.soilType as string).trim(),
        previousCrop: (b.previousCrop as string).trim(),
        waterAvailability: b.waterAvailability as CropSuccessPlannerInput['waterAvailability'],
        region: (b.region as string).trim(),
        season: (b.season as string).trim(),
    };
}

// ─── POST — Run AI and return plan (client saves to Firestore) ────────────────
/**
 * POST /api/farming-partner/crop-success-planner
 *
 * Runs the AI analysis and returns the result.
 * The client is responsible for saving the result to Firestore using
 * the authenticated Firebase session (avoids PERMISSION_DENIED).
 *
 * Headers:
 *   x-user-id: <Firebase UID>
 *
 * Response 200:
 *   { plan: CropSuccessPlan }
 */
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

        // AI-only — no Firestore. Client persists after receiving this response.
        const plan = await generateCropSuccessPlan(validated, userId);

        return NextResponse.json({ plan }, { status: 200 });
    } catch (err: unknown) {
        console.error('[crop-success-planner] POST error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal server error.' },
            { status: 500 }
        );
    }
}
