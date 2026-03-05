import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
    computeDiseaseLikelihood,
    computeYieldRisk,
    computeWeatherRisk,
    type ScanSummary,
} from '@/farming-partner/risk-engine-rules';
import { runFarmSummary } from '@/ai/flows/farm-summary-flow';

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

// ─── POST /api/farm-summary ──────────────────────────────────────────────────

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
        const currentMonth = new Date().getMonth() + 1;

        // ── Compute baselines ─────────────────────────────────────────────────
        const diseaseRisk = computeDiseaseLikelihood(scans as ScanSummary[]);
        const yieldRisk = computeYieldRisk(scans as ScanSummary[]);
        const weatherRisk = computeWeatherRisk(cropType, currentMonth);

        const healthScore = Math.max(0, Math.round(100 - (diseaseRisk + yieldRisk + weatherRisk) / 3));

        const healthyScans = scans.filter(s =>
            !s.diseaseName ||
            s.diseaseName === 'No disease detected' ||
            s.diseaseName === 'Healthy'
        ).length;

        const latestDiseaseName = scans[0]?.diseaseName || 'None';

        // ── AI recommendation ─────────────────────────────────────────────────
        const result = await runFarmSummary({
            cropType,
            region,
            currentMonth,
            totalScans: scans.length,
            healthyScans,
            diseasedScans: scans.length - healthyScans,
            latestDiseaseName,
            healthScore,
            diseaseRisk,
            yieldRisk,
            weatherRisk,
        });

        return NextResponse.json({
            recommendation: result.recommendation,
            healthScore,
            diseaseRisk,
            yieldRisk,
            weatherRisk,
        });
    } catch (err) {
        console.error('[farm-summary] error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal error' },
            { status: 500 },
        );
    }
}
