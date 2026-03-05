import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
    computeDiseaseLikelihood,
    computeYieldRisk,
    computeWeatherRisk,
    type ScanSummary,
} from '@/farming-partner/risk-engine-rules';
import { runRiskEngine } from '@/ai/flows/risk-engine-flow';

// Vercel: allow up to 30s for AI enrichment
export const maxDuration = 30;

// ─── Request validation ───────────────────────────────────────────────────────

const RequestSchema = z.object({
    cropType: z.string().min(1),
    region: z.string().optional(),
    scans: z.array(z.object({
        diseaseName: z.string(),
        severityLevel: z.string(),
        createdAtMs: z.number(),
        cropType: z.string(),
    })).max(20),
});

// ─── POST /api/risk-engine ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = RequestSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid request body', details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const { cropType, region, scans } = parsed.data;
        const currentMonth = new Date().getMonth() + 1; // 1-12

        // ── Step 1: Rule-based baseline (fast, free) ──────────────────────────
        const baselineDiseasePct = computeDiseaseLikelihood(scans as ScanSummary[]);
        const baselineYieldRisk = computeYieldRisk(scans as ScanSummary[]);
        const baselineWeatherRisk = computeWeatherRisk(cropType, currentMonth);

        const latestDiseaseName = scans[0]?.diseaseName || 'None';

        // ── Step 2: Gemini enrichment ─────────────────────────────────────────
        const result = await runRiskEngine({
            cropType,
            region,
            currentMonth,
            baselineDiseasePct,
            baselineYieldRisk,
            baselineWeatherRisk,
            latestDiseaseName,
            scanCount: scans.length,
        });

        return NextResponse.json(result);
    } catch (err) {
        console.error('[risk-engine] error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal error' },
            { status: 500 },
        );
    }
}
