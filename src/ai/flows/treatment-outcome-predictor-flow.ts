'use server';
/**
 * @fileOverview A Genkit flow for predicting the outcome of a treatment/medicine
 * on a specific crop, disease, and environmental context.
 *
 * - predictTreatmentOutcome - Main function to call the prediction flow.
 * - TreatmentOutcomePredictorInput - Input type.
 * - TreatmentOutcomePredictorOutput - Output type.
 */

import { ai, runWithRotation, cachedPrompt } from '@/ai/genkit';
import { z } from 'genkit';
import { getMedicineDictionaryContext } from '@/data/medicine-dictionary';

// ── Input ────────────────────────────────────────────────────────────────────

const TreatmentOutcomePredictorInputSchema = z.object({
    medicineName: z.string().describe('Name of the medicine/pesticide being evaluated.'),
    activeIngredient: z.string().describe('Active ingredient of the medicine.'),
    category: z.string().describe('Category: fungicide, insecticide, herbicide, organic, bio-fungicide, bio-insecticide.'),
    cropType: z.string().describe('The crop being treated (e.g., "Tomato", "Rice", "Wheat").'),
    diseaseName: z.string().describe('The detected or suspected disease/pest (e.g., "Late Blight", "Aphids").'),
    soilType: z.string().describe('Soil type (e.g., "Clay", "Loamy", "Sandy", "Black Cotton").'),
    weatherConditions: z.string().describe('Current/expected weather conditions (e.g., "Hot and Humid", "Cool and Dry").'),
    season: z.string().describe('Current growing season (e.g., "Kharif", "Rabi", "Zaid").'),
    severityLevel: z
        .enum(['Low', 'Medium', 'High'])
        .optional()
        .describe('Severity of the disease/pest infestation.'),
});
export type TreatmentOutcomePredictorInput = z.infer<typeof TreatmentOutcomePredictorInputSchema>;

// ── Output ───────────────────────────────────────────────────────────────────

const AlternativeMedicineSchema = z.object({
    name: z.string().describe('Name of the alternative medicine.'),
    activeIngredient: z.string().describe('Active ingredient of the alternative.'),
    suitabilityScore: z.number().min(0).max(100).describe('Suitability score for the alternative (0–100).'),
    costEfficiency: z.string().describe('Cost efficiency comparison (e.g., "Lower cost", "Similar cost", "Higher cost").'),
    effectivenessComparison: z.string().describe('How effectiveness compares to the selected medicine.'),
    reason: z.string().describe('Why this alternative may be better.'),
});

const TreatmentOutcomePredictorOutputSchema = z.object({
    suitabilityScore: z
        .number()
        .min(0)
        .max(100)
        .describe('Overall suitability score for this medicine on this crop/disease/conditions (0–100).'),
    diseaseControlLevel: z
        .enum(['High', 'Moderate', 'Low'])
        .describe('Expected level of disease/pest control.'),
    yieldRecoveryPercent: z
        .number()
        .describe('Estimated percentage of yield recovery after treatment (e.g., 18 means +18%).'),
    treatmentSuccessProbability: z
        .number()
        .min(0)
        .max(100)
        .describe('Probability that the treatment will be successful (0–100).'),
    estimatedProfitImpact: z.object({
        min: z.number().describe('Minimum estimated profit improvement in ₹.'),
        max: z.number().describe('Maximum estimated profit improvement in ₹.'),
        currency: z.string().default('INR').describe('Currency code.'),
    }).describe('Estimated profit impact range.'),
    reasoning: z
        .string()
        .describe('Detailed reasoning explaining the prediction, considering all analysis factors.'),
    riskFactors: z
        .array(z.string())
        .describe('Key risk factors that could reduce effectiveness.'),
    applicationTips: z
        .array(z.string())
        .describe('Practical tips for applying this treatment effectively.'),
    alternatives: z
        .array(AlternativeMedicineSchema)
        .describe('Alternative medicines that may be better suited. Provide 2–3 alternatives if available.'),
});
export type TreatmentOutcomePredictorOutput = z.infer<typeof TreatmentOutcomePredictorOutputSchema>;

// ── Wrapper ──────────────────────────────────────────────────────────────────

export async function predictTreatmentOutcome(
    input: TreatmentOutcomePredictorInput
): Promise<TreatmentOutcomePredictorOutput> {
    return treatmentOutcomePredictorFlow(input);
}

// ── Prompt ────────────────────────────────────────────────────────────────────

const medicineDictionaryContext = getMedicineDictionaryContext();

const treatmentOutcomePredictorPromptCfg = {
    name: 'treatmentOutcomePredictorPrompt',
    input: { schema: TreatmentOutcomePredictorInputSchema },
    output: { schema: TreatmentOutcomePredictorOutputSchema },
    prompt: `You are an expert agricultural treatment advisor and crop protection specialist.

Your task is to evaluate whether a specific medicine/pesticide will be effective for the farmer's crop and conditions, and predict the treatment outcome.

## Medicine Being Evaluated
- **Medicine Name**: {{{medicineName}}}
- **Active Ingredient**: {{{activeIngredient}}}
- **Category**: {{{category}}}

## Farm Context
- **Crop Type**: {{{cropType}}}
- **Disease/Pest**: {{{diseaseName}}}
- **Soil Type**: {{{soilType}}}
- **Weather Conditions**: {{{weatherConditions}}}
- **Season**: {{{season}}}
{{#if severityLevel}}
- **Severity Level**: {{{severityLevel}}}
{{/if}}

## Medicine Reference Database
Use this reference database of common agricultural medicines to inform your analysis and to suggest alternatives:

${medicineDictionaryContext}

## Instructions
Analyze the suitability of the given medicine for the specific crop, disease, soil, weather, and seasonal conditions. Consider:
1. Whether the medicine targets the specified disease/pest
2. Whether the crop is in the recommended list
3. How weather conditions affect the medicine's effectiveness
4. Soil type impact on the treatment
5. Seasonal factors and timing
6. Cost-effectiveness
7. Environmental impact

Provide:
- **suitabilityScore**: 0–100 score. Above 70 = highly suitable (Green), 40–69 = moderate (Yellow), below 40 = risky (Red).
- **diseaseControlLevel**: High, Moderate, or Low.
- **yieldRecoveryPercent**: Estimated yield improvement percentage.
- **treatmentSuccessProbability**: 0–100 probability.
- **estimatedProfitImpact**: Min and max profit improvement in ₹ (Indian Rupees) considering typical crop yields and market prices.
- **reasoning**: Detailed explanation.
- **riskFactors**: Key risks that could reduce effectiveness.
- **applicationTips**: Practical application advice.
- **alternatives**: 2–3 better alternative medicines from the database if the selected medicine is not the best option. If the selected medicine IS the best option, provide alternatives with lower scores as viable backups.

Be realistic and data-driven. Do not guarantee results. Base predictions on agricultural science and the reference data provided.`,
};

// ── Flow ──────────────────────────────────────────────────────────────────────

const treatmentOutcomePredictorFlow = ai.defineFlow(
    {
        name: 'treatmentOutcomePredictorFlow',
        inputSchema: TreatmentOutcomePredictorInputSchema,
        outputSchema: TreatmentOutcomePredictorOutputSchema,
    },
    async (input) => {
        return runWithRotation(async (instance) => {
            const prompt = cachedPrompt(instance, treatmentOutcomePredictorPromptCfg);
            const { output } = await prompt(input);
            if (!output) throw new Error('Failed to generate treatment outcome prediction.');
            return output;
        });
    }
);
