import { NextRequest, NextResponse } from 'next/server';
import { predictTreatmentOutcome } from '@/ai/flows/treatment-outcome-predictor-flow';
import type { TreatmentOutcomePredictorInput } from '@/ai/flows/treatment-outcome-predictor-flow';

export const dynamic = 'force-dynamic';

// ── Input validation ──────────────────────────────────────────────────────────

function validateInput(body: unknown): TreatmentOutcomePredictorInput | { error: string } {
    if (!body || typeof body !== 'object') {
        return { error: 'Request body must be a JSON object.' };
    }

    const b = body as Record<string, unknown>;
    const required = [
        'medicineName',
        'activeIngredient',
        'category',
        'cropType',
        'diseaseName',
        'soilType',
        'weatherConditions',
        'season',
    ];

    for (const field of required) {
        if (typeof b[field] !== 'string' || !(b[field] as string).trim()) {
            return { error: `Missing or invalid field: "${field}". Must be a non-empty string.` };
        }
    }

    const severityLevel = b.severityLevel as string | undefined;
    if (severityLevel && !['Low', 'Medium', 'High'].includes(severityLevel)) {
        return { error: '"severityLevel" must be one of: "Low", "Medium", "High".' };
    }

    return {
        medicineName: (b.medicineName as string).trim(),
        activeIngredient: (b.activeIngredient as string).trim(),
        category: (b.category as string).trim(),
        cropType: (b.cropType as string).trim(),
        diseaseName: (b.diseaseName as string).trim(),
        soilType: (b.soilType as string).trim(),
        weatherConditions: (b.weatherConditions as string).trim(),
        season: (b.season as string).trim(),
        ...(severityLevel ? { severityLevel: severityLevel as 'Low' | 'Medium' | 'High' } : {}),
    };
}

// ── POST — Run prediction ─────────────────────────────────────────────────────

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

        const prediction = await predictTreatmentOutcome(validated);
        return NextResponse.json({ prediction }, { status: 200 });
    } catch (err: unknown) {
        console.error('[treatment-predictor] POST error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal server error.' },
            { status: 500 }
        );
    }
}
