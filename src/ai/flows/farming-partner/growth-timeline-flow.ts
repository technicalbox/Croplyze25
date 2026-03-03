/**
 * @fileOverview Genkit AI flow for the Growth Timeline Engine.
 *
 * Generates a week-by-week crop management guide covering:
 *  - Watering schedule
 *  - Fertilizing schedule
 *  - Pest prevention
 *  - Weather precautions
 *  - Farmer checklist
 *
 * Each week is a structured, independently editable `WeeklyEntry`.
 * No 'use server' — consumed by API routes, not client components.
 */

import { ai, runWithRotation, cachedPrompt } from '@/ai/genkit';
import { z } from 'genkit';

// ─── Input Schema ─────────────────────────────────────────────────────────────

export const GrowthTimelineInputSchema = z.object({
    cropType: z.string().describe('Crop to grow (e.g., "wheat", "tomato", "cotton").'),
    plantingDate: z.string().describe('Planting date in YYYY-MM-DD format (e.g., "2025-11-01").'),
    region: z.string().describe('Geographic region (e.g., "Punjab, Pakistan", "Maharashtra, India").'),
    variety: z.string().default('standard').describe('Crop variety (e.g., "Punjab-11", "Roma", "standard").'),
    waterAvailability: z
        .enum(['abundant', 'moderate', 'limited', 'rain-fed only'])
        .default('moderate')
        .describe('Irrigation or water availability level.'),
    soilType: z
        .string()
        .default('loamy')
        .describe('Soil type (e.g., "loamy", "clay", "sandy").'),
    language: z
        .string()
        .optional()
        .default('en')
        .describe('ISO language code for the response (e.g. "hi", "te"). Default: en.'),
});

export type GrowthTimelineInput = z.infer<typeof GrowthTimelineInputSchema>;

// ─── Output Schema ────────────────────────────────────────────────────────────

const WateringSchema = z.object({
    frequencyPerWeek: z.number().int().min(0).describe('How many times to water per week. 0 = no irrigation needed.'),
    litresPerAcrePerSession: z.number().nonnegative().describe('Water volume per irrigation session per acre.'),
    method: z.enum(['Flood', 'Drip', 'Sprinkler', 'Rain-fed', 'Furrow', 'None'])
        .describe('Recommended irrigation method.'),
    bestTimeOfDay: z.enum(['Early Morning', 'Morning', 'Evening', 'Anytime', 'None'])
        .describe('Optimal time of day to irrigate.'),
    note: z.string().describe('Any specific watering advice for this week/stage.'),
});

const FertilizingSchema = z.object({
    apply: z.boolean().describe('Whether fertilizer should be applied this week.'),
    productName: z.string().describe('Fertilizer name (e.g., "Urea", "DAP", "Compost", "None").'),
    activeIngredients: z.string().describe('Key nutrients (e.g., "N:P:K 46:0:0", "N:P:K 18:46:0").'),
    dosePerAcre: z.string().describe('Application dose (e.g., "25 kg/acre"). Empty string if apply=false.'),
    applicationMethod: z.enum(['Broadcast', 'Band application', 'Foliar spray', 'Drip fertigation', 'None'])
        .describe('How to apply the fertilizer.'),
    timing: z.string().describe('Best time to apply (e.g., "Before irrigation", "After light rain"). Empty if apply=false.'),
    note: z.string().describe('Fertilizing rationale or caution for this week.'),
});

const PestPreventionSchema = z.object({
    activeThreats: z.array(z.string()).describe('Pests or diseases likely active this week given region + stage.'),
    preventionActions: z.array(z.string()).describe('Specific actions to prevent/control threats.'),
    // Flattened from nested object to satisfy Gemini max schema depth of 5
    chemicalName: z.string().describe('Pesticide/fungicide name. Use "None" if organic/cultural methods suffice.'),
    chemicalDosePerAcre: z.string().describe('Application dose per acre (e.g. "500 ml/acre"). Empty string if chemicalName is "None".'),
    chemicalSafetyClass: z
        .enum(['WHO Class U', 'WHO Class III', 'WHO Class II', 'WHO Class Ib', 'WHO Class Ia', 'None'])
        .describe('WHO hazard classification for the chemical. "None" if no chemical recommended.'),
    isCriticalWeek: z.boolean().describe('True if this week is especially high-risk for pests/disease.'),
    monitoringTip: z.string().describe('What to look for when scouting the field this week.'),
});

const WeatherPrecautionsSchema = z.object({
    expectedConditions: z.string().describe('Typical weather expected this week for this region/season.'),
    risks: z.array(z.string()).describe('Weather-related risks (e.g., "Late frost", "Heatwave stress", "Lodging wind").'),
    protectiveActions: z.array(z.string()).describe('Actions to mitigate weather risks.'),
    urgencyLevel: z.enum(['Low', 'Medium', 'High', 'Critical'])
        .describe('How urgent are weather precautions this week.'),
});

export const WeeklyEntrySchema = z.object({
    weekNumber: z.number().int().min(1).describe('1-based week index.'),
    weekLabel: z.string().describe('Descriptive label (e.g., "Week 1 — Germination").'),
    daysRange: z.string().describe('Day range string (e.g., "Day 1–7").'),
    startDate: z.string().describe('Calendar start date for this week (YYYY-MM-DD).'),
    growthStage: z.enum(['Pre-Planting', 'Germination', 'Seedling', 'Vegetative', 'Reproductive', 'Maturation', 'Harvest Ready'])
        .describe('Crop growth stage active this week.'),
    watering: WateringSchema,
    fertilizing: FertilizingSchema,
    pestPrevention: PestPreventionSchema,
    weatherPrecautions: WeatherPrecautionsSchema,
    farmerChecklist: z.array(z.string()).max(5)
        .describe('3–5 concrete to-do items for the farmer this week, ordered by priority.'),
    isEdited: z.boolean().default(false)
        .describe('Always false from AI. Set to true by the app when the user edits this week.'),
});

export type WeeklyEntry = z.infer<typeof WeeklyEntrySchema>;

const KeyMilestoneSchema = z.object({
    date: z.string().describe('Calendar date (YYYY-MM-DD).'),
    weekNumber: z.number().int().describe('Week number this milestone falls in.'),
    title: z.string().describe('Short title (e.g., "First top-dress fertilizer").'),
    description: z.string().describe('What the farmer must do and why.'),
    isCritical: z.boolean().describe('True for actions where missing the date significantly impacts yield.'),
});

export const GrowthTimelineOutputSchema = z.object({
    cropName: z.string().describe('Crop name as provided.'),
    variety: z.string().describe('Variety as provided.'),
    region: z.string().describe('Region as provided.'),
    plantingDate: z.string().describe('Planting date as provided (YYYY-MM-DD).'),
    estimatedHarvestDate: z.string().describe('Estimated harvest date (YYYY-MM-DD or range like "2026-04-10 to 2026-04-20").'),
    totalWeeks: z.number().int().describe('Total number of weeks in the timeline.'),
    weeks: z.array(WeeklyEntrySchema).describe('Week-by-week guidance, from Week 1 through harvest.'),
    keyMilestones: z.array(KeyMilestoneSchema).describe('Critical calendar events the farmer must not miss (5–10 items).'),
    quickSummary: z.string().describe('2–3 sentence overview of the growing season for this crop/region.'),
});

export type GrowthTimelineOutput = z.infer<typeof GrowthTimelineOutputSchema>;

// ─── Genkit Flow ──────────────────────────────────────────────────────────────

const growthTimelineCfg = {
    name: 'growthTimelinePrompt',
    input: { schema: GrowthTimelineInputSchema },
    output: { schema: GrowthTimelineOutputSchema },
    prompt: `You are a crop physiology and agronomy expert with 20+ years of field experience in South Asian farming.
Generate a complete, week-by-week Growth Timeline for the following crop.

═══ CROP DETAILS ═══
Crop:               {{{cropType}}}
Variety:            {{{variety}}}
Planting Date:      {{{plantingDate}}}
Region:             {{{region}}}
Water Availability: {{{waterAvailability}}}
Soil Type:          {{{soilType}}}

═══ INSTRUCTIONS ═══
Generate one WeeklyEntry for EACH week of the crop's growing season (from planting to harvest-ready).
Use your agronomic knowledge to determine the correct number of weeks for {{{cropType}}} variety "{{{variety}}}" in {{{region}}}.

For each week:
- Calculate startDate by adding (weekNumber-1)*7 days to {{{plantingDate}}} (use YYYY-MM-DD format).
- Assign the correct growthStage for that week.
- Provide SPECIFIC, QUANTIFIED guidance for:

  1. watering: Exact frequency and litres/acre matching "{{{waterAvailability}}}" constraints.
     Adjust for the season and growth stage — seedlings need less, vegetative stage more.

  2. fertilizing: Apply only when agronomically correct for that stage.
     Use regionally available fertilizers for {{{region}}} (e.g., Urea, DAP, SOP for Pakistan/India).
     Do NOT apply fertilizer every week — typical schedule is 2-4 applications total.

  3. pestPrevention: Be specific about which pests/fungi are active in {{{region}}}
     during this stage and date range. Week 1-2 may have seed rot; later weeks may have aphids, rust, etc.
     Set isCriticalWeek=true only for high-risk windows.
     Use FLAT fields: chemicalName ("None" if not needed), chemicalDosePerAcre (empty string if none), chemicalSafetyClass.

  4. weatherPrecautions: Use realistic weather expectations for {{{region}}} at this time of year.
     Adjust risks based on season implied by {{{plantingDate}}}.

  5. farmerChecklist: 3-5 actionable bullet points, highest priority first.

  6. keyMilestones: Identify 5-10 critical dates (irrigation starts, fertilizer doses, spray windows, harvest).

Make the guidance locally relevant and accurate for {{{region}}}. Avoid generic advice.
All dates must be calculated from {{{plantingDate}}}.

LANGUAGE: Respond entirely in the language with code "{{language}}". Reference: en=English, hi=Hindi, te=Telugu, ta=Tamil, kn=Kannada, ml=Malayalam, bn=Bengali, pa=Punjabi, gu=Gujarati, mr=Marathi, ur=Urdu, ar=Arabic, es=Spanish, fr=French, pt=Portuguese, de=German, ru=Russian, zh=Chinese, sw=Swahili. All text fields must be written in that language.`,
};

const growthTimelineFlow = ai.defineFlow(
    {
        name: 'growthTimelineFlow',
        inputSchema: GrowthTimelineInputSchema,
        outputSchema: GrowthTimelineOutputSchema,
    },
    async (input) => {
        return runWithRotation(async (instance) => {
      const _p = cachedPrompt(instance, growthTimelineCfg);
      const { output } = await _p(input);
        if (!output) throw new Error('AI returned empty response for Growth Timeline.');
        return output;
    });
    }
);

/**
 * Public entry point — called by service layer, safe in API routes.
 */
export async function runGrowthTimeline(input: GrowthTimelineInput): Promise<GrowthTimelineOutput> {
    return growthTimelineFlow(input);
}
