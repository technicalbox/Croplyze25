/**
 * @fileOverview Genkit AI flow for the Harvest Optimizer.
 * Produces a 5-section harvest report:
 *   1. Best harvest window
 *   2. Readiness signs
 *   3. Yield improvement tips
 *   4. Storage advice
 *   5. Market timing tips
 *
 * Schema depth is capped at ≤ 5 to comply with Gemini's API constraint.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// ─── Input ────────────────────────────────────────────────────────────────────

export const HarvestOptimizerInputSchema = z.object({
    cropType: z.string().describe('Crop name (e.g. "wheat", "tomato").'),
    variety: z.string().optional().describe('Crop variety if known.'),
    plantingDate: z.string().describe('Actual planting date (YYYY-MM-DD).'),
    region: z.string().describe('Geographic region (e.g. "Punjab, Pakistan").'),
    farmSizeAcres: z.number().positive().describe('Farm size in acres.'),
    targetMarket: z.enum(['local', 'wholesale', 'export', 'processing'])
        .describe('Primary target market.'),
});
export type HarvestOptimizerInput = z.infer<typeof HarvestOptimizerInputSchema>;

// ─── Output ───────────────────────────────────────────────────────────────────
// All top-level fields → depth 2.
// yieldTips items (objects) → depth 4. All arrays of strings → depth 3/4.
// storageCommonMistakes / marketTips arrays of strings → depth 3. OK.

export const HarvestOptimizerOutputSchema = z.object({

    // ── 1. Best Harvest Window ────────────────────────────────────────────
    harvestWindowStart: z.string().describe('Start of optimal harvest window (YYYY-MM-DD).'),
    harvestWindowEnd: z.string().describe('End of optimal harvest window (YYYY-MM-DD).'),
    harvestWindowReasoning: z.string().describe('Why this window is optimal (maturity, weather, market timing).'),
    idealTimeOfDay: z.string().describe('Best time of day to harvest (e.g. "Early morning, 5–8 AM").'),
    harvestMethod: z.string().describe('Manual / mechanical / semi-mechanical — with short reasoning.'),

    // ── 2. Readiness Signs ────────────────────────────────────────────────
    readinessVisual: z.array(z.string()).describe('Visual signs the crop is harvest-ready (colour, leaf drop, etc.).'),
    readinessTactile: z.array(z.string()).describe('Touch/feel signs (firmness, skin thickness, etc.).'),
    readinessAroma: z.array(z.string()).describe('Smell/aroma indicators of ripeness.'),
    maturityIndex: z.string().describe('Key scientific or practical maturity index (e.g. Brix level, dry matter %).'),

    // ── 3. Yield Improvement Tips ─────────────────────────────────────────
    yieldTips: z.array(z.object({
        action: z.string().describe('Specific pre-harvest action.'),
        expectedGainPercent: z.number().describe('Estimated yield or quality gain (%).'),
        timing: z.string().describe('When to apply (e.g. "2 weeks before harvest").'),
    })).describe('Actionable tips to improve yield or quality before harvest.'),

    // ── 4. Storage Advice ─────────────────────────────────────────────────
    storageTemperature: z.string().describe('Recommended storage temperature (e.g. "2–4 °C").'),
    storageHumidity: z.string().describe('Recommended relative humidity (e.g. "85–90%").'),
    storageShelfLifeDays: z.number().describe('Expected shelf life in days under recommended conditions.'),
    storagePackaging: z.string().describe('Best packaging material and method.'),
    storageCommonMistakes: z.array(z.string()).describe('Common storage mistakes that reduce shelf life/value.'),
    storageNotes: z.string().describe('Any special storage handling notes for this crop/region.'),

    // ── 5. Market Timing Tips ─────────────────────────────────────────────
    marketPeakWindowStart: z.string().describe('Start of peak price period in local market (YYYY-MM-DD or month name).'),
    marketPeakWindowEnd: z.string().describe('End of peak price period.'),
    marketPriceRangeMin: z.number().describe('Minimum expected price per kg in local currency.'),
    marketPriceRangeMax: z.number().describe('Maximum expected price per kg in local currency.'),
    marketPriceCurrency: z.string().describe('Currency code or name (e.g. "PKR", "INR", "USD").'),
    marketStrategy: z.string().describe('Sell strategy (bulk now / stagger / store-and-sell / contract) with rationale.'),
    marketTips: z.array(z.string()).describe('Specific market timing tips for this crop and region.'),

    // ── Summary ───────────────────────────────────────────────────────────
    estimatedYieldKgPerAcre: z.number().describe('Realistic yield estimate kg/acre for this region.'),
    totalEstimatedYieldKg: z.number().describe('estimatedYieldKgPerAcre × farmSizeAcres.'),
    marketReadinessScore: z.number().min(0).max(10).describe('0–10 score for suitability to target market at harvest.'),
    quickSummary: z.string().describe('2–3 sentence executive summary of the harvest plan.'),
});
export type HarvestOptimizerOutput = z.infer<typeof HarvestOptimizerOutputSchema>;

// ─── Flow ─────────────────────────────────────────────────────────────────────

export async function generateHarvestOptimizer(
    input: HarvestOptimizerInput,
): Promise<HarvestOptimizerOutput> {
    return harvestOptimizerFlow(input);
}

const harvestOptimizerPrompt = ai.definePrompt({
    name: 'harvestOptimizerPrompt',
    input: { schema: HarvestOptimizerInputSchema },
    output: { schema: HarvestOptimizerOutputSchema },
    prompt: `You are a senior agronomist and post-harvest specialist. Generate a comprehensive harvest optimization report.

═══ CROP DETAILS ═══
Crop:          {{{cropType}}}{{#if variety}} ({{variety}}){{/if}}
Planting Date: {{{plantingDate}}}
Region:        {{{region}}}
Farm Size:     {{{farmSizeAcres}}} acres
Target Market: {{{targetMarket}}}

═══ INSTRUCTIONS ═══
Generate accurate, region-specific guidance in JSON matching this schema exactly:

1. harvestWindowStart/End: Calculate from plantingDate + typical days-to-maturity for
   {{{cropType}}} in {{{region}}}. Adjust for {{{targetMarket}}} (export = harvest slightly
   earlier for shelf life; local = wait for full ripeness).
   harvestWindowReasoning: Explain why this window balances quality, weather, and market timing.
   idealTimeOfDay: e.g. "Early morning (5–8 AM)" for most crops — explain why.
   harvestMethod: Manual vs mechanical vs semi-mechanical based on crop and region capacity.

2. readinessVisual/Tactile/Aroma: At least 3 specific signs each for {{{cropType}}}.
   maturityIndex: The most reliable measurable index (e.g. "Brix ≥ 12 for table grapes").

3. yieldTips: 4–6 actionable pre-harvest tips. Include expectedGainPercent for each.
   Examples: foliar potassium spray, irrigation cutoff timing, disease scouting.

4. storageTemperature/Humidity/ShelfLifeDays/Packaging/CommonMistakes/Notes:
   Use storage parameters specific to {{{cropType}}} for {{{targetMarket}}}.
   storageCommonMistakes: 3–5 common farmer errors.

5. marketPeakWindowStart/End: Seasonal peak demand for {{{cropType}}} in or near {{{region}}}.
   marketPriceRangeMin/Max + marketPriceCurrency: Realistic local prices in the dominant
   currency used in {{{region}}} (PKR for Pakistan, INR for India, USD otherwise).
   marketStrategy: Recommend between "sell immediately", "stagger over 4 weeks",
   "store and sell at peak", or "forward contract" based on market conditions.
   marketTips: 3–5 specific timing/buyer tips.

6. estimatedYieldKgPerAcre: Realistic for {{{region}}} (not aspirational).
   totalEstimatedYieldKg: yieldKgPerAcre × {{{farmSizeAcres}}}.
   marketReadinessScore: 0–10 — how well this crop matches {{{targetMarket}}} expectations.
   quickSummary: 2–3 concise sentences summarising the key harvest action.

Be locally accurate — use real market dynamics and conditions for {{{region}}}.`,
});

const harvestOptimizerFlow = ai.defineFlow(
    {
        name: 'harvestOptimizerFlow',
        inputSchema: HarvestOptimizerInputSchema,
        outputSchema: HarvestOptimizerOutputSchema,
    },
    async (input) => {
        const { output } = await harvestOptimizerPrompt(input);
        if (!output) throw new Error('Failed to generate harvest optimizer from AI.');
        return output;
    },
);
