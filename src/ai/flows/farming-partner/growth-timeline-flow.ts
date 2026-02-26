/**
 * @fileOverview Genkit flow for generating a crop growth timeline.
 *
 * - generateGrowthTimeline - Main function to call.
 * - GrowthTimelineInput    - Input type.
 * - GrowthTimelineOutput   - Output type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const GrowthTimelineInputSchema = z.object({
    cropType: z.string().describe('The crop type (e.g., "wheat", "tomato").'),
    plantingDate: z.string().describe('The planting date (e.g., "2024-11-01").'),
    region: z.string().describe('Geographic region.'),
    variety: z.string().describe('Crop variety (e.g., "Punjab-11", "Roma", "standard").'),
});
export type GrowthTimelineInput = z.infer<typeof GrowthTimelineInputSchema>;

const GrowthStageSchema = z.object({
    stageName: z.string().describe('Name of the growth stage (e.g., "Germination", "Vegetative", "Flowering", "Grain Fill", "Maturity").'),
    startDay: z.number().describe('Day number from planting when this stage begins.'),
    endDay: z.number().describe('Day number from planting when this stage ends.'),
    description: z.string().describe('What happens during this stage.'),
    careInstructions: z.string().describe('Specific care actions required (irrigation, pest monitoring, fertilizing, etc.).'),
    warningSignsToWatch: z.string().describe('Potential issues or stress signs to watch for during this stage.'),
});

export const GrowthTimelineOutputSchema = z.object({
    stages: z.array(GrowthStageSchema).describe('Sequential crop growth stages from planting to harvest.'),
    estimatedHarvestDate: z.string().describe('Estimated harvest date (e.g., "2025-April-10 to April-20").'),
    totalGrowingDays: z.number().describe('Total days from planting to harvest.'),
    criticalDates: z.array(z.object({
        date: z.string().describe('Approximate date.'),
        event: z.string().describe('Critical farming action required on this date (e.g., "Apply second dose of urea").'),
    })).describe('Key dates requiring farmer attention.'),
});
export type GrowthTimelineOutput = z.infer<typeof GrowthTimelineOutputSchema>;

export async function generateGrowthTimeline(input: GrowthTimelineInput): Promise<GrowthTimelineOutput> {
    return growthTimelineFlow(input);
}

const growthTimelinePrompt = ai.definePrompt({
    name: 'growthTimelinePrompt',
    input: { schema: GrowthTimelineInputSchema },
    output: { schema: GrowthTimelineOutputSchema },
    prompt: `You are a crop physiology expert. Generate a detailed growth timeline.

Crop: {{{cropType}}}
Variety: {{{variety}}}
Planting Date: {{{plantingDate}}}
Region: {{{region}}}

Generate a complete, stage-by-stage growth timeline in JSON including:
1. stages: All growth stages with exact day ranges, care instructions, and warning signs.
2. estimatedHarvestDate: Based on planting date + growing days.
3. totalGrowingDays: Total crop duration.
4. criticalDates: Key calendar dates the farmer must act on (calculate from {{{plantingDate}}}).

Be very specific about care instructions, quantities for each stage, and warning signs for {{{region}}} climate.`,
});

const growthTimelineFlow = ai.defineFlow(
    {
        name: 'growthTimelineFlow',
        inputSchema: GrowthTimelineInputSchema,
        outputSchema: GrowthTimelineOutputSchema,
    },
    async (input) => {
        const { output } = await growthTimelinePrompt(input);
        if (!output) {
            throw new Error('Failed to generate growth timeline from AI.');
        }
        return output;
    }
);
