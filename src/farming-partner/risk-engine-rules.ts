/**
 * @fileOverview Rule-based scoring utilities for the AI Risk Engine.
 * Pure TypeScript — no API calls, runs on the server in the API route.
 *
 * Produces 0-100 baseline scores that are then passed to the Genkit flow
 * for Gemini calibration and explanation.
 */

// ─── Severity weights ─────────────────────────────────────────────────────────

const SEVERITY_SCORE: Record<string, number> = {
    High: 100,
    Medium: 55,
    Low: 25,
    'Not Applicable': 0,
};

// ─── Seasonal weather risk heuristics ────────────────────────────────────────
// month index (1-12) → base weather risk for common crops.
// Scores reflect typical South/West Asian monsoon + frost patterns.

const MONSOON_MONTHS = new Set([6, 7, 8, 9]);          // Jun–Sep
const FROST_MONTHS = new Set([12, 1, 2]);             // Dec–Feb
const DROUGHT_MONTHS = new Set([3, 4, 5]);              // Mar–May

const WEATHER_SENSITIVE_CROPS = new Set([
    'tomato', 'potato', 'cotton', 'rice', 'paddy',
    'sugarcane', 'maize', 'corn',
]);

export interface ScanSummary {
    diseaseName: string;
    severityLevel: string;
    createdAtMs: number;
    cropType: string;
}

// ─── Disease Likelihood (0-100) ───────────────────────────────────────────────

/**
 * % of scans with a disease × recency weight.
 * More recent diseased scans push the score higher.
 */
export function computeDiseaseLikelihood(scans: ScanSummary[]): number {
    if (scans.length === 0) return 20; // unknown → low default

    const now = Date.now();
    let weightedScore = 0;
    let totalWeight = 0;

    scans.forEach((s, idx) => {
        const ageDays = (now - s.createdAtMs) / (1000 * 60 * 60 * 24);
        // Recency weight: most recent scan = weight 1.0, decays with age
        const weight = Math.max(0.2, 1 - ageDays / 90);
        const isHealthy =
            !s.diseaseName ||
            s.diseaseName === 'No disease detected' ||
            s.diseaseName === 'Healthy';

        weightedScore += weight * (isHealthy ? 0 : 1);
        totalWeight += weight;
    });

    return Math.round((weightedScore / totalWeight) * 100);
}

// ─── Low Yield Risk (0-100) ───────────────────────────────────────────────────

/**
 * Average severity score across last 5 scans.
 */
export function computeYieldRisk(scans: ScanSummary[]): number {
    if (scans.length === 0) return 15;

    const recent = scans.slice(0, 5);
    const avg =
        recent.reduce((sum, s) => {
            const isHealthy =
                !s.diseaseName ||
                s.diseaseName === 'No disease detected' ||
                s.diseaseName === 'Healthy';
            return sum + (isHealthy ? 0 : (SEVERITY_SCORE[s.severityLevel] ?? 30));
        }, 0) / recent.length;

    return Math.min(100, Math.round(avg));
}

// ─── Weather Damage Risk (0-100) ──────────────────────────────────────────────

/**
 * Seasonal heuristic: crop sensitivity × current season.
 */
export function computeWeatherRisk(cropType: string, month: number): number {
    const crop = cropType.toLowerCase();
    const sensitive = WEATHER_SENSITIVE_CROPS.has(crop);

    let base = 20;

    if (MONSOON_MONTHS.has(month)) {
        base = sensitive ? 70 : 45;
    } else if (FROST_MONTHS.has(month)) {
        base = sensitive ? 60 : 35;
    } else if (DROUGHT_MONTHS.has(month)) {
        base = sensitive ? 55 : 30;
    } else {
        base = sensitive ? 30 : 20;
    }

    return base;
}
