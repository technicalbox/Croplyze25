/**
 * @fileOverview Genkit flow for generating a personalised crop plan.
 *
 * - generateCropPlan - Main function to call.
 * - CropPlanInput    - Input type.
 * - CropPlanOutput   - Output type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const CropPlanInputSchema = z.object({
  cropType: z.string().describe('The crop the farmer wants to grow (e.g., "wheat", "tomato", "maize").'),
  region: z.string().describe('Geographic region or district (e.g., "Punjab, Pakistan", "Maharashtra, India").'),
  soilType: z.string().describe('Soil type (e.g., "loamy", "clay", "sandy", "silty").'),
  season: z.string().describe('Growing season (e.g., "Kharif", "Rabi", "Zaid", "Summer", "Winter").'),
  farmSizeAcres: z.number().positive().describe('Total farm size in acres.'),
});
export type CropPlanInput = z.infer<typeof CropPlanInputSchema>;

const FertilizerScheduleItemSchema = z.object({
  weekFromPlanting: z.number().describe('Week number from planting date.'),
  fertilizerName: z.string().describe('Name of fertilizer to apply.'),
  quantityKgPerAcre: z.number().describe('Quantity in kg per acre.'),
  notes: z.string().describe('Application notes.'),
});

export const CropPlanOutputSchema = z.object({
  recommendedVariety: z.string().describe('Best variety of the crop for this region and season.'),
  plantingDate: z.string().describe('Recommended planting date range (e.g., "October 15 – November 1").'),
  spacingCm: z.object({
    rowSpacing: z.number().describe('Row spacing in centimeters.'),
    plantSpacing: z.number().describe('Plant-to-plant spacing in centimeters.'),
  }),
  wateringSchedule: z.string().describe('Irrigation frequency and estimated water requirement.'),
  fertilizerSchedule: z.array(FertilizerScheduleItemSchema).describe('Week-by-week fertilizer application schedule.'),
  estimatedCostPerAcre: z.number().describe('Estimated input cost per acre in USD.'),
  notes: z.string().describe('Additional agronomic tips specific to this region and crop.'),
});
export type CropPlanOutput = z.infer<typeof CropPlanOutputSchema>;

export async function generateCropPlan(input: CropPlanInput): Promise<CropPlanOutput> {
  return cropPlanFlow(input);
}

const cropPlanPrompt = ai.definePrompt({
  name: 'cropPlanPrompt',
  input: { schema: CropPlanInputSchema },
  output: { schema: CropPlanOutputSchema },
  prompt: `You are an expert agronomist. Generate a precise, actionable crop plan for a farmer.

Crop: {{{cropType}}}
Region: {{{region}}}
Soil Type: {{{soilType}}}
Season: {{{season}}}
Farm Size: {{{farmSizeAcres}}} acres

Provide a detailed crop plan in JSON format with:
1. recommendedVariety: Best performing variety for this region/season.
2. plantingDate: Optimal planting window.
3. spacingCm: Row and plant spacing.
4. wateringSchedule: Irrigation plan (frequency and water amount).
5. fertilizerSchedule: Week-by-week application schedule with quantities.
6. estimatedCostPerAcre: Total estimated input cost in USD.
7. notes: Region-specific agronomic advice.

Be specific, realistic, and practical. Use local knowledge of {{{region}}}.`,
});

const cropPlanFlow = ai.defineFlow(
  {
    name: 'cropPlanFlow',
    inputSchema: CropPlanInputSchema,
    outputSchema: CropPlanOutputSchema,
  },
  async (input) => {
    const { output } = await cropPlanPrompt(input);
    if (!output) {
      throw new Error('Failed to generate crop plan from AI.');
    }
    return output;
  }
);
