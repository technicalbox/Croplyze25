/**
 * @fileOverview API route for the Early Outbreak Alert system.
 *
 * POST /api/alerts
 *
 * Fetches real-time weather data from:
 *   1. OpenWeatherMap (current + forecast) — requires API key
 *   2. NASA POWER (satellite agro-climate) — free, no key needed
 *
 * Then runs the alert generation engine to produce
 * disease, weather, and irrigation alerts based on thresholds.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchOpenWeatherData, fetchNASAPowerData } from '@/services/weather-service';
import { generateAllAlerts } from '@/services/alert-engine';
import type { AlertResponse } from '@/lib/alert-types';

// Allow up to 30s for external API calls
export const maxDuration = 30;

// ─── Request validation ──────────────────────────────────────────────────────

const RequestSchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    cropType: z.string().min(1).default('wheat'),
    region: z.string().optional(),
    soilType: z.string().optional(),
});

// ─── POST /api/alerts ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = RequestSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const { lat, lng, cropType, region } = parsed.data;

        // ── Fetch weather data from multiple sources in parallel ─────────
        const [owmData, nasaData] = await Promise.all([
            fetchOpenWeatherData(lat, lng),
            fetchNASAPowerData(lat, lng),
        ]);

        // ── Generate alerts ──────────────────────────────────────────────
        const alerts = generateAllAlerts(cropType, owmData, nasaData, region);

        const response: AlertResponse = {
            alerts,
            weather: owmData,
            nasaPower: nasaData,
            generatedAt: Date.now(),
        };

        return NextResponse.json(response);
    } catch (err) {
        console.error('[alerts API] error:', err);
        return NextResponse.json(
            {
                alerts: [],
                weather: null,
                nasaPower: null,
                generatedAt: Date.now(),
                error: err instanceof Error ? err.message : 'Failed to generate alerts',
            } satisfies AlertResponse,
            { status: 500 },
        );
    }
}
