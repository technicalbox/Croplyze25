/**
 * @fileOverview Genkit flow for the AI Risk Engine.
 *
 * Input: compact text-only scan summary (no images) + crop context.
 * Output: 3 risk predictions — disease likelihood, low yield risk, weather damage risk.
 * Each prediction has a 0-100 score, a label, and a 1-2 sentence advice string.
 *
 * The flow receives already-computed rule-based baseline scores in the input
 * so Gemini only needs to calibrate and explain, keeping latency low.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// ─── Input Schema ─────────────────────────────────────────────────────────────

export const RiskEngineInputSchema = z.object({
    cropType: z.string().describe('The primary crop type, e.g. "wheat", "tomato".'),
    region: z.string().optional().describe('Farm region for seasonal context, e.g. "Punjab, Pakistan".'),
    currentMonth: z.number().min(1).max(12).describe('Current month (1-12) for seasonal heuristics.'),

    /** Rule-engine baseline scores (0-100). Gemini calibrates on top of these. */
    baselineDiseasePct: z.number().describe('% of recent scans that detected a disease (0-100).'),
    baselineYieldRisk: z.number().describe('Cumulative severity score mapped to 0-100 yield risk.'),
    baselineWeatherRisk: z.number().describe('Crop+season heuristic score 0-100.'),

    /** Most recent disease name (empty if all healthy) */
    latestDiseaseName: z.string().describe('Disease name from the most recent scan, or "None".'),

    /** Total scans analysed */
    scanCount: z.number().describe('Total scans in the window used for baseline computation.'),
});

export type RiskEngineInput = z.infer<typeof RiskEngineInputSchema>;

// ─── Output Schema ────────────────────────────────────────────────────────────

const RiskPredictionSchema = z.object({
    score: z.number().min(0).max(100).describe('Risk score 0-100 (higher = more risk).'),
    label: z.enum(['Low', 'Moderate', 'High', 'Critical']).describe('Human-readable risk label.'),
    advice: z.string().describe('One actionable sentence of advice for the farmer. No HTML.'),
});

export const RiskEngineOutputSchema = z.object({
    diseaseLikelihood: RiskPredictionSchema.describe('Probability of disease occurring in the near future.'),
    yieldRisk: RiskPredictionSchema.describe('Risk of significant yield loss based on scan history.'),
    weatherDamageRisk: RiskPredictionSchema.describe('Risk of weather-related crop damage in this season.'),
    overallRiskLabel: z.enum(['Low', 'Moderate', 'High', 'Critical']).describe('Aggregate risk level.'),
    summary: z.string().describe('One sentence overall farm health summary. No HTML. Max 20 words.'),
});

export type RiskEngineOutput = z.infer<typeof RiskEngineOutputSchema>;

// ─── Prompt ───────────────────────────────────────────────────────────────────

const riskEnginePrompt = ai.definePrompt({
    name: 'riskEnginePrompt',
    input: { schema: RiskEngineInputSchema },
    output: { schema: RiskEngineOutputSchema },
    prompt: `You are an agricultural risk analyst AI. Based on the data below, provide calibrated risk predictions for a smallholder farmer.

FARM DATA:
- Crop: {{cropType}}
- Region: {{region}}
- Current month: {{currentMonth}}
- Recent disease scans: {{scanCount}} scans analysed
- Latest detected disease: {{latestDiseaseName}}
- Baseline disease rate: {{baselineDiseasePct}}% of scans showed disease
- Baseline yield risk score: {{baselineYieldRisk}}/100
- Baseline weather risk score: {{baselineWeatherRisk}}/100

INSTRUCTIONS:
1. Use the baseline scores as your starting point. Adjust them ±15 based on crop type, season, and the specific disease name.
2. For weather damage risk, consider monsoon/frost/drought seasons typical for the region and month.
3. Every advice string must be a single practical sentence a farmer can act on TODAY. NEVER use HTML tags.
4. overallRiskLabel = the highest of the three individual labels.
5. summary must be ≤20 words, plain text, no HTML.

LABEL THRESHOLDS: score 0-30=Low, 31-55=Moderate, 56-79=High, 80-100=Critical.`,
});

// ─── Flow ─────────────────────────────────────────────────────────────────────

const riskEngineFlow = ai.defineFlow(
    {
        name: 'riskEngineFlow',
        inputSchema: RiskEngineInputSchema,
        outputSchema: RiskEngineOutputSchema,
    },
    async (input) => {
        const { output } = await riskEnginePrompt(input);
        if (!output) throw new Error('Risk engine AI returned no output.');
        return output;
    },
);

export async function runRiskEngine(input: RiskEngineInput): Promise<RiskEngineOutput> {
    return riskEngineFlow(input);
}
