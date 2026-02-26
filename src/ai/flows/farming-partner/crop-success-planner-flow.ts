/**
 * @fileOverview Genkit AI flow for the Crop Success Planner.
 *
 * Analyses a farmer's inputs and returns:
 *   - A suitability score (0-100) with a letter grade
 *   - Identified risks (with severity + mitigation)
 *   - Step-by-step crop preparation plan
 *   - Agronomic recommendations
 *
 * No 'use server' — this module is consumed by API routes, not client components.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// ─── Input Schema ─────────────────────────────────────────────────────────────

export const CropSuccessPlannerInputSchema = z.object({
    cropName: z
        .string()
        .describe('The crop the farmer wants to grow (e.g., "wheat", "tomato", "rice").'),
    soilType: z
        .string()
        .describe('Current soil type (e.g., "loamy", "clay", "sandy", "silty", "chalky").'),
    previousCrop: z
        .string()
        .describe(
            'The crop grown in the previous season on the same field (e.g., "maize", "cotton", "fallow").'
        ),
    waterAvailability: z
        .enum(['abundant', 'moderate', 'limited', 'rain-fed only'])
        .describe('Irrigation or water availability level.'),
    region: z
        .string()
        .describe('Geographic region (e.g., "Punjab, Pakistan", "Sindh, Pakistan", "Maharashtra, India").'),
    season: z
        .string()
        .describe('Target growing season (e.g., "Rabi", "Kharif", "Zaid", "Winter", "Summer").'),
});

export type CropSuccessPlannerInput = z.infer<typeof CropSuccessPlannerInputSchema>;

// ─── Output Schema ────────────────────────────────────────────────────────────

const RiskItemSchema = z.object({
    riskName: z.string().describe('Name of the identified risk (e.g., "Waterlogging", "Aphid infestation").'),
    severity: z.enum(['Low', 'Medium', 'High', 'Critical']).describe('Risk severity level.'),
    description: z.string().describe('Why this risk exists given the inputs.'),
    mitigation: z.string().describe('Specific, actionable mitigation strategy.'),
    estimatedImpactOnYield: z
        .string()
        .describe('Estimated yield loss if untreated (e.g., "10-20% yield reduction").'),
});

const PreparationStepSchema = z.object({
    stepNumber: z.number().describe('Sequential step number.'),
    phase: z
        .enum(['Pre-Planting', 'At Planting', 'Early Growth', 'Mid-Season', 'Pre-Harvest'])
        .describe('Farming phase this step belongs to.'),
    title: z.string().describe('Short, clear step title.'),
    description: z.string().describe('Detailed instructions for this step.'),
    timing: z.string().describe('When to perform this step (e.g., "3 weeks before planting").'),
    estimatedCostUSD: z
        .number()
        .nonnegative()
        .describe('Estimated cost per acre in USD. Use 0 if no cost.'),
    priority: z.enum(['Must Do', 'Recommended', 'Optional']).describe('Priority level.'),
});

const RotationAssessmentSchema = z.object({
    isBeneficial: z.boolean().describe('Whether planting this crop after the previous crop is agronomically beneficial.'),
    reasoning: z.string().describe('Explanation of the crop rotation compatibility.'),
    nitrogenEffect: z
        .enum(['Increases', 'Neutral', 'Depletes'])
        .describe('Effect of the previous crop on soil nitrogen.'),
});

export const CropSuccessPlannerOutputSchema = z.object({
    suitabilityScore: z
        .number()
        .min(0)
        .max(100)
        .describe('Overall crop success probability score from 0 (unsuitable) to 100 (ideal).'),
    suitabilityGrade: z
        .enum(['A', 'B', 'C', 'D', 'F'])
        .describe('Letter grade: A=Excellent (90-100), B=Good (75-89), C=Fair (55-74), D=Poor (35-54), F=Unsuitable (<35).'),
    suitabilityRationale: z
        .string()
        .describe('2-3 sentence explanation of why this score was given.'),
    rotationAssessment: RotationAssessmentSchema.describe(
        'Analysis of the previous crop → current crop rotation.'
    ),
    risks: z.array(RiskItemSchema).describe('All identified risks, ordered by severity (highest first).'),
    preparationSteps: z
        .array(PreparationStepSchema)
        .describe('Chronological preparation steps from now through planting and early growth.'),
    waterManagementAdvice: z
        .string()
        .describe(
            'Specific irrigation or water management guidance given the stated water availability level.'
        ),
    expectedYieldRangeKgPerAcre: z.object({
        min: z.number().describe('Minimum expected yield (kg/acre) under suboptimal conditions.'),
        max: z.number().describe('Maximum expected yield (kg/acre) under optimal conditions.'),
    }),
    recommendations: z
        .array(z.string())
        .describe('Top 5 prioritised agronomic recommendations for this combination.'),
    warnings: z
        .array(z.string())
        .describe('Critical warnings the farmer must not ignore. Empty array if none.'),
    overallVerdict: z
        .string()
        .describe(
            'One concise paragraph summarising whether the farmer should proceed, with what conditions.'
        ),
});

export type CropSuccessPlannerOutput = z.infer<typeof CropSuccessPlannerOutputSchema>;

// ─── Genkit Flow ──────────────────────────────────────────────────────────────

const cropSuccessPlannerPrompt = ai.definePrompt({
    name: 'cropSuccessPlannerPrompt',
    input: { schema: CropSuccessPlannerInputSchema },
    output: { schema: CropSuccessPlannerOutputSchema },
    prompt: `You are a senior agronomist and crop planning expert with 20+ years of field experience.
Analyse the following farm details and produce a comprehensive Crop Success Plan.

═══ FARM DETAILS ═══
Crop:                {{{cropName}}}
Soil Type:           {{{soilType}}}
Previous Crop:       {{{previousCrop}}}
Water Availability:  {{{waterAvailability}}}
Region:              {{{region}}}
Season:              {{{season}}}

═══ YOUR TASK ═══
Produce a rigorous, data-driven JSON assessment covering:

1. suitabilityScore (0–100): Base this on:
   - How well {{{cropName}}} grows in {{{soilType}}} soil (25 pts)
   - Suitability for {{{season}}} season in {{{region}}} (25 pts)
   - Crop rotation quality after {{{previousCrop}}} (20 pts)
   - Sufficiency of "{{{waterAvailability}}}" water for {{{cropName}}} (20 pts)
   - Regional climate compatibility (10 pts)

2. suitabilityGrade: Map score to letter grade (A/B/C/D/F).

3. suitabilityRationale: Explain the score honestly.

4. rotationAssessment: Evaluate if {{{previousCrop}}} → {{{cropName}}} is a sound rotation choice.

5. risks: Identify ALL material risks (minimum 3, maximum 8). Order by severity descending.
   Include soil, water, pest, disease, market, and climate risks relevant to this exact combination.

6. preparationSteps: Provide actionable, sequenced steps. Minimum 6 steps.
   Include soil testing, tillage, soil amendment, seed selection, irrigation setup, and any rotation-specific actions.

7. waterManagementAdvice: Be precise about schedule/quantities given "{{{waterAvailability}}}" availability.

8. expectedYieldRangeKgPerAcre: Realistic range for {{{region}}} conditions.

9. recommendations: Top 5 ranked tips, most important first.

10. warnings: Only include CRITICAL issues (empty array if none).

11. overallVerdict: Clear go/no-go summary with conditions.

Use your knowledge of agricultural conditions in {{{region}}} to make this locally relevant and accurate.`,
});

const cropSuccessPlannerFlow = ai.defineFlow(
    {
        name: 'cropSuccessPlannerFlow',
        inputSchema: CropSuccessPlannerInputSchema,
        outputSchema: CropSuccessPlannerOutputSchema,
    },
    async (input) => {
        const { output } = await cropSuccessPlannerPrompt(input);
        if (!output) {
            throw new Error('AI returned an empty response for the Crop Success Planner.');
        }
        return output;
    }
);

/**
 * Public function to invoke the Crop Success Planner AI flow.
 * Called by the service layer — safe to use in API routes.
 */
export async function runCropSuccessPlanner(
    input: CropSuccessPlannerInput
): Promise<CropSuccessPlannerOutput> {
    return cropSuccessPlannerFlow(input);
}
