/**
 * @fileOverview Genkit AI flow for the Weekly Growth Report.
 *
 * Generates a structured weekly analysis of crop growth, activities, and risks.
 * Returns summary, growth_status, risks, insights, and recommendations.
 */

import { ai, runWithRotation, cachedPrompt } from '@/ai/genkit';
import { z } from 'genkit';

// ─── Input Schema ─────────────────────────────────────────────────────────────

export const WeeklyGrowthReportInputSchema = z.object({
    cropName: z.string().describe('Crop being grown (e.g., "wheat", "tomato", "rice").'),
    plantingDate: z.string().describe('Planting date in YYYY-MM-DD format.'),
    currentGrowthStage: z.string().describe('Current growth stage (e.g., "Germination", "Vegetative", "Flowering", "Fruiting", "Maturity").'),
    weekNumber: z.number().int().min(1).describe('Current week number since planting.'),
    weekStartDate: z.string().describe('Start date of the reporting week (YYYY-MM-DD).'),
    weekEndDate: z.string().describe('End date of the reporting week (YYYY-MM-DD).'),
    region: z.string().optional().describe('Farm region for weather and local context.'),
    weatherData: z.string().describe('Weather summary for the past 7 days (e.g., "Sunny, avg temp 28°C, 5mm rainfall, humidity 65%").'),
    soilData: z.string().optional().describe('Soil conditions if available (e.g., "Loamy, pH 6.5, adequate moisture").'),
    farmerActivities: z.string().describe('Comma-separated list of activities done this week (e.g., "Watered 3 times, Applied urea fertilizer, Sprayed neem oil").'),
    cropVariety: z.string().optional().describe('Specific variety of the crop.'),
    language: z.string().optional().default('en').describe('ISO language code for the response.'),
});

export type WeeklyGrowthReportInput = z.infer<typeof WeeklyGrowthReportInputSchema>;

// ─── Output Schema ────────────────────────────────────────────────────────────

export const WeeklyGrowthReportOutputSchema = z.object({
    summary: z.string().describe('A 2–4 sentence overview of crop health and progress this week. Plain text.'),
    growth_status: z.string().describe('Current growth status description with estimated growth percentage (e.g., "Healthy — 45% complete, entering vegetative stage").'),
    growth_percentage: z.number().min(0).max(100).describe('Estimated overall growth completion percentage (0-100).'),
    health_rating: z.enum(['Healthy', 'Watch', 'Risk']).describe('"Healthy" = good, "Watch" = needs attention, "Risk" = issues detected.'),
    risks: z.array(z.object({
        title: z.string().describe('Short risk title.'),
        severity: z.enum(['low', 'medium', 'high']).describe('Severity level.'),
        description: z.string().describe('1–2 sentence description of the risk.'),
    })).describe('Detected or potential risks for this crop this week.'),
    insights: z.array(z.object({
        title: z.string().describe('Insight title.'),
        detail: z.string().describe('1–2 sentence insight detail.'),
    })).describe('Key observations and learnings from this week.'),
    recommendations_for_next_week: z.array(z.object({
        action: z.string().describe('Specific recommended action.'),
        priority: z.enum(['low', 'medium', 'high']).describe('Priority level.'),
        reason: z.string().describe('Brief reason for this recommendation.'),
    })).describe('Concrete actions the farmer should take next week.'),
    weather_impact: z.string().describe('How this week\'s weather affected or could affect crop growth.'),
    activity_assessment: z.string().describe('Assessment of the farmer\'s activities this week — what was good, what was missing.'),
});

export type WeeklyGrowthReportOutput = z.infer<typeof WeeklyGrowthReportOutputSchema>;

// ─── Prompt ───────────────────────────────────────────────────────────────────

const weeklyGrowthReportCfg = {
    name: 'weeklyGrowthReportPrompt',
    input: { schema: WeeklyGrowthReportInputSchema },
    output: { schema: WeeklyGrowthReportOutputSchema },
    prompt: `You are an expert agricultural AI advisor. Analyze the following farm data and generate a detailed weekly crop growth report.

FARM DATA:
- Crop: {{cropName}}{{#if cropVariety}} (variety: {{cropVariety}}){{/if}}
- Planting date: {{plantingDate}}
- Current growth stage: {{currentGrowthStage}}
- Week: {{weekNumber}} ({{weekStartDate}} to {{weekEndDate}})
- Region: {{#if region}}{{region}}{{else}}Not specified{{/if}}
- Weather last 7 days: {{weatherData}}
- Soil conditions: {{#if soilData}}{{soilData}}{{else}}Not available{{/if}}
- Farmer activities this week: {{farmerActivities}}

INSTRUCTIONS:
1. Provide a clear, actionable weekly growth report.
2. The summary should be 2–4 sentences describing overall crop health and notable events.
3. growth_status should include growth stage info and estimated completion percentage.
4. growth_percentage should be realistic based on crop type and week number.
5. health_rating: "Healthy" if everything is on track, "Watch" if minor concerns exist, "Risk" if there are active threats.
6. List 1–4 risks with severity. If no risks, provide at least 1 preventive warning.
7. List 2–4 insights based on the data.
8. List 3–5 recommendations for next week, prioritized.
9. weather_impact: Explain how weather influenced or could influence growth.
10. activity_assessment: Evaluate what the farmer did well and what was missing.
11. Be specific to the crop type, growth stage, and region. Avoid generic advice.
12. Use simple language a smallholder farmer can understand.

LANGUAGE: Respond entirely in the language with code "{{language}}".`,
};

// ─── Flow ─────────────────────────────────────────────────────────────────────

const weeklyGrowthReportFlow = ai.defineFlow(
    {
        name: 'weeklyGrowthReportFlow',
        inputSchema: WeeklyGrowthReportInputSchema,
        outputSchema: WeeklyGrowthReportOutputSchema,
    },
    async (input) => {
        return runWithRotation(async (instance) => {
            const _p = cachedPrompt(instance, weeklyGrowthReportCfg);
            const { output } = await _p(input);
            if (!output) throw new Error('Weekly Growth Report AI returned no output.');
            return output;
        });
    },
);

export async function runWeeklyGrowthReport(input: WeeklyGrowthReportInput): Promise<WeeklyGrowthReportOutput> {
    return weeklyGrowthReportFlow(input);
}
