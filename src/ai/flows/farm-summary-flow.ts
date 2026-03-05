/**
 * @fileOverview Genkit flow for the Farm Summary AI Recommendation.
 *
 * Input: compact scan stats + risk baselines.
 * Output: a short 2–3 sentence actionable recommendation for the farmer.
 */

import { ai, runWithRotation, cachedPrompt } from '@/ai/genkit';
import { z } from 'genkit';

// ─── Input Schema ─────────────────────────────────────────────────────────────

export const FarmSummaryInputSchema = z.object({
    cropType: z.string().describe('Primary crop type, e.g. "wheat", "tomato".'),
    region: z.string().optional().describe('Farm region for context.'),
    currentMonth: z.number().min(1).max(12).describe('Current month (1-12).'),
    totalScans: z.number().describe('Total number of scans performed.'),
    healthyScans: z.number().describe('Number of scans that were healthy.'),
    diseasedScans: z.number().describe('Number of scans with diseases detected.'),
    latestDiseaseName: z.string().describe('Disease name from most recent scan, or "None".'),
    healthScore: z.number().min(0).max(100).describe('Overall farm health score (0-100, higher is better).'),
    diseaseRisk: z.number().min(0).max(100).describe('Disease risk score (0-100).'),
    yieldRisk: z.number().min(0).max(100).describe('Yield risk score (0-100).'),
    weatherRisk: z.number().min(0).max(100).describe('Weather risk score (0-100).'),
    language: z.string().optional().default('en').describe('ISO language code for response.'),
});

export type FarmSummaryInput = z.infer<typeof FarmSummaryInputSchema>;

// ─── Output Schema ────────────────────────────────────────────────────────────

export const FarmSummaryOutputSchema = z.object({
    recommendation: z.string().describe('A 2–3 sentence actionable farm recommendation for the farmer. Plain text, no HTML or markdown. Written in an encouraging but informative tone.'),
});

export type FarmSummaryOutput = z.infer<typeof FarmSummaryOutputSchema>;

// ─── Prompt ───────────────────────────────────────────────────────────────────

const farmSummaryCfg = {
    name: 'farmSummaryPrompt',
    input: { schema: FarmSummaryInputSchema },
    output: { schema: FarmSummaryOutputSchema },
    prompt: `You are a farm health advisor AI. Write a short, actionable recommendation (2–3 sentences max) for a smallholder farmer based on this data:

FARM DATA:
- Primary crop: {{cropType}}
- Region: {{region}}
- Month: {{currentMonth}}
- Total scans: {{totalScans}}, Healthy: {{healthyScans}}, Diseased: {{diseasedScans}}
- Latest detected disease: {{latestDiseaseName}}
- Overall health score: {{healthScore}}/100
- Disease risk: {{diseaseRisk}}/100
- Yield risk: {{yieldRisk}}/100
- Weather risk: {{weatherRisk}}/100

INSTRUCTIONS:
1. Be specific: mention the crop name, the main risk, and one concrete action.
2. If healthScore > 70, start with encouragement. If < 40, express urgency.
3. Keep it under 50 words. Use simple language a farmer can understand.
4. NEVER use HTML, markdown, or bullet points. Just plain sentences.

LANGUAGE: Respond entirely in the language with code "{{language}}".`,
};

// ─── Flow ─────────────────────────────────────────────────────────────────────

const farmSummaryFlow = ai.defineFlow(
    {
        name: 'farmSummaryFlow',
        inputSchema: FarmSummaryInputSchema,
        outputSchema: FarmSummaryOutputSchema,
    },
    async (input) => {
        return runWithRotation(async (instance) => {
            const _p = cachedPrompt(instance, farmSummaryCfg);
            const { output } = await _p(input);
            if (!output) throw new Error('Farm summary AI returned no output.');
            return output;
        });
    },
);

export async function runFarmSummary(input: FarmSummaryInput): Promise<FarmSummaryOutput> {
    return farmSummaryFlow(input);
}
