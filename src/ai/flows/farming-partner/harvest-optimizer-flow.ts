/**
 * @fileOverview Genkit flow for optimizing crop harvest timing and yield.
 *
 * - generateHarvestOptimizer - Main function to call.
 * - HarvestOptimizerInput    - Input type.
 * - HarvestOptimizerOutput   - Output type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const HarvestOptimizerInputSchema = z.object({
    cropType: z.string().describe('The crop type.'),
    plantingDate: z.string().describe('The actual planting date (e.g., "2024-11-01").'),
    region: z.string().describe('Geographic region.'),
    targetMarket: z.string().describe('Intended market (e.g., "local", "export", "processing facility", "wholesale").'),
    farmSizeAcres: z.number().positive().describe('Farm size in acres.'),
});
export type HarvestOptimizerInput = z.infer<typeof HarvestOptimizerInputSchema>;

export const HarvestOptimizerOutputSchema = z.object({
    optimalHarvestWindowStart: z.string().describe('Start of optimal harvest window (date string).'),
    optimalHarvestWindowEnd: z.string().describe('End of optimal harvest window (date string).'),
    estimatedYieldKgPerAcre: z.number().describe('Estimated yield in kg per acre.'),
    totalEstimatedYieldKg: z.number().describe('Total estimated yield for the entire farm.'),
    sellPriceEstimatePerKg: z.number().describe('Estimated market price per kg in USD.'),
    estimatedGrossRevenueUSD: z.number().describe('Total estimated gross revenue in USD.'),
    marketReadinessScore: z.number().min(0).max(10).describe('Score from 0–10 on how ready this crop will be for the target market at harvest.'),
    harvestMethod: z.string().describe('Recommended harvest method (manual, mechanical, semi-mechanical) with reasoning.'),
    postHarvestSteps: z.array(z.object({
        step: z.string().describe('Post-harvest step name.'),
        description: z.string().describe('Description of the step.'),
        timingAfterHarvestDays: z.number().describe('Days after harvest this should be done.'),
    })).describe('Post-harvest handling steps to maximize shelf life and value.'),
    tips: z.string().describe('Additional harvest optimization tips for this region and market.'),
});
export type HarvestOptimizerOutput = z.infer<typeof HarvestOptimizerOutputSchema>;

export async function generateHarvestOptimizer(input: HarvestOptimizerInput): Promise<HarvestOptimizerOutput> {
    return harvestOptimizerFlow(input);
}

const harvestOptimizerPrompt = ai.definePrompt({
    name: 'harvestOptimizerPrompt',
    input: { schema: HarvestOptimizerInputSchema },
    output: { schema: HarvestOptimizerOutputSchema },
    prompt: `You are an agricultural economics and post-harvest expert. Generate a harvest optimization report.

Crop: {{{cropType}}}
Planting Date: {{{plantingDate}}}
Region: {{{region}}}
Farm Size: {{{farmSizeAcres}}} acres
Target Market: {{{targetMarket}}}

Generate an actionable harvest optimization plan in JSON including:
1. optimalHarvestWindowStart/End: Exact date range for peak quality and market timing.
2. estimatedYieldKgPerAcre: Realistic yield estimate for {{{region}}}.
3. totalEstimatedYieldKg: Yield × farm size.
4. sellPriceEstimatePerKg: Realistic market price for {{{targetMarket}}}.
5. estimatedGrossRevenueUSD: Total revenue estimate.
6. marketReadinessScore: How well-suited this will be for {{{targetMarket}}} at harvest.
7. harvestMethod: Best harvesting approach with brief reasoning.
8. postHarvestSteps: Steps to maximize quality (drying, sorting, storage, etc.).
9. tips: Specific market timing advice for {{{region}}}.

Be realistic with prices and yields for {{{region}}} and {{{targetMarket}}}.`,
});

const harvestOptimizerFlow = ai.defineFlow(
    {
        name: 'harvestOptimizerFlow',
        inputSchema: HarvestOptimizerInputSchema,
        outputSchema: HarvestOptimizerOutputSchema,
    },
    async (input) => {
        const { output } = await harvestOptimizerPrompt(input);
        if (!output) {
            throw new Error('Failed to generate harvest optimizer from AI.');
        }
        return output;
    }
);
