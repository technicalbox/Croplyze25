/**
 * @fileOverview Genkit AI flow for personalised crop combination recommendations.
 *
 * Analyses a farmer's land conditions (soil, water, season, region, goals)
 * and returns optimised crop pairings with suitability scores.
 *
 * No 'use server' — consumed by API routes only.
 */

import { ai, runWithRotation, cachedPrompt } from '@/ai/genkit';
import { z } from 'genkit';

// ─── Input Schema ─────────────────────────────────────────────────────────────

export const CropCombinationInputSchema = z.object({
    soilType: z
        .string()
        .describe('Soil type (e.g., "Clay", "Sandy", "Loamy", "Silt", "Black Soil", "Red Soil").'),
    landSize: z
        .number()
        .positive()
        .describe('Farm land size in acres.'),
    region: z
        .string()
        .describe('Geographic region (e.g., "Maharashtra, India", "Punjab, India").'),
    season: z
        .string()
        .describe('Target growing season: "Kharif", "Rabi", "Zaid", or "All Season".'),
    waterAvailability: z
        .enum(['low', 'medium', 'high'])
        .describe('Water availability level.'),
    irrigationType: z
        .string()
        .describe('Irrigation type: "Rainfed", "Canal", "Drip", or "Sprinkler".'),
    sunlightExposure: z
        .enum(['partial_sun', 'full_sun'])
        .describe('Sunlight exposure level.'),
    farmingGoal: z
        .string()
        .describe('Primary farming goal: "Maximum Yield", "Maximum Profit", "Soil Improvement", or "Low Water Farming".'),
    cropPreferences: z
        .string()
        .optional()
        .describe('Optional crop preferences or crops the farmer already wants to grow.'),
    language: z
        .string()
        .optional()
        .default('en')
        .describe('ISO language code for the AI response. Default: en.'),
});

export type CropCombinationInput = z.infer<typeof CropCombinationInputSchema>;

// ─── Output Schema ────────────────────────────────────────────────────────────

const CropCombinationItemSchema = z.object({
    primaryCrop: z.string().describe('Name of the primary crop.'),
    companionCrop: z.string().describe('Name of the companion crop.'),
    strategy: z
        .enum(['Intercropping', 'Companion Planting', 'Relay Cropping', 'Mixed Cropping'])
        .describe('Type of multi-cropping strategy.'),
    suitabilityScore: z
        .number()
        .min(0)
        .max(100)
        .describe('Suitability score (0-100) for this combination given the farmer\'s conditions.'),
    benefits: z
        .array(z.string())
        .describe('List of 3-5 specific benefits of this combination for this farmer.'),
    soilBenefit: z
        .string()
        .describe('Specific soil improvement this combination provides.'),
    waterEfficiency: z
        .string()
        .describe('How this combination optimises water usage.'),
    pestReduction: z
        .string()
        .describe('Pest or disease reduction advantage.'),
    expectedYieldBoost: z
        .string()
        .describe('Expected yield improvement percentage or description.'),
    plantingGuide: z
        .string()
        .describe('Brief planting guide with spacing, timing, and key steps.'),
    estimatedRevenuePerAcre: z
        .string()
        .describe('Estimated combined revenue per acre in local currency.'),
});

const CropCombinationOutputSchema = z.object({
    recommendedCombinations: z
        .array(CropCombinationItemSchema)
        .describe('Top 3-5 recommended crop combinations, ordered by suitability score (highest first).'),
    reasoning: z
        .string()
        .describe('2-3 sentence explanation of why these combinations were selected based on the farmer\'s conditions.'),
    seasonalAdvice: z
        .string()
        .describe('Season-specific advice for the farmer\'s region.'),
    soilPreparation: z
        .string()
        .describe('Soil preparation advice before implementing the selected combination.'),
    warnings: z
        .array(z.string())
        .describe('Critical warnings or cautions. Empty array if none.'),
});

export type CropCombinationOutput = z.infer<typeof CropCombinationOutputSchema>;

// ─── Genkit Flow ──────────────────────────────────────────────────────────────

const cropCombinationCfg = {
    name: 'cropCombinationPrompt',
    input: { schema: CropCombinationInputSchema },
    output: { schema: CropCombinationOutputSchema },
    prompt: `You are a world-class agronomist specialising in intercropping, companion planting, and multi-crop strategies.
A farmer needs personalised crop combination recommendations based on their specific farm conditions.

═══ FARM CONDITIONS ═══
Soil Type:           {{{soilType}}}
Land Size:           {{{landSize}}} acres
Region:              {{{region}}}
Season:              {{{season}}}
Water Availability:  {{{waterAvailability}}}
Irrigation Type:     {{{irrigationType}}}
Sunlight Exposure:   {{{sunlightExposure}}}
Farming Goal:        {{{farmingGoal}}}
Crop Preferences:    {{{cropPreferences}}}

═══ YOUR TASK ═══
Recommend 4-5 optimal crop combinations tailored to this farmer's exact conditions. Consider:

1. **Soil Compatibility**: Which crop pairs work best in {{{soilType}}} soil?
2. **Water Optimisation**: Given {{{waterAvailability}}} water and {{{irrigationType}}} irrigation, which combinations minimise water waste?
3. **Season Suitability**: Which crops grow well together in {{{season}}} in {{{region}}}?
4. **Farming Goal Alignment**: Optimise for {{{farmingGoal}}}.
5. **Intercropping Science**: Consider nitrogen fixation, root depth compatibility, canopy architecture, allelopathy, and pest deterrence.
6. **Local Relevance**: Use crop varieties and practices common in {{{region}}}.

For each combination:
- suitabilityScore: Rate 0-100 based on how well it matches ALL conditions. Be strict — only give 90+ for near-perfect matches.
- benefits: List 3-5 specific, measurable benefits relevant to THIS farmer's conditions.
- soilBenefit: How this pair specifically improves {{{soilType}}} soil.
- waterEfficiency: Water use optimisation for {{{waterAvailability}}} availability.
- pestReduction: Specific pest/disease reduction mechanism.
- expectedYieldBoost: Realistic yield improvement estimate.
- plantingGuide: Practical spacing, timing, and implementation steps for {{{landSize}}} acres.
- estimatedRevenuePerAcre: Revenue estimate in Indian Rupees (₹).

Order results by suitabilityScore descending. Be practical, honest, and region-specific.

{{#if cropPreferences}}
The farmer has expressed interest in: {{{cropPreferences}}}. Try to include at least one combination involving these crops if agronomically sound.
{{/if}}

LANGUAGE: Respond entirely in the language with code "{{language}}". All text fields must be in that language.`,
};

const cropCombinationFlow = ai.defineFlow(
    {
        name: 'cropCombinationFlow',
        inputSchema: CropCombinationInputSchema,
        outputSchema: CropCombinationOutputSchema,
    },
    async (input) => {
        return runWithRotation(async (instance) => {
            const _p = cachedPrompt(instance, cropCombinationCfg);
            const { output } = await _p(input);
            if (!output) {
                throw new Error('AI returned an empty response for Crop Combination.');
            }
            return output;
        });
    }
);

/**
 * Public function to invoke the Crop Combination AI flow.
 */
export async function runCropCombination(
    input: CropCombinationInput
): Promise<CropCombinationOutput> {
    return cropCombinationFlow(input);
}
