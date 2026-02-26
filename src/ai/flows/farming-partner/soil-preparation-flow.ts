/**
 * @fileOverview Genkit flow for generating a soil preparation guide.
 *
 * - generateSoilPreparationGuide - Main function to call.
 * - SoilPrepInput                - Input type.
 * - SoilPrepOutput               - Output type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const SoilPrepInputSchema = z.object({
    cropType: z.string().describe('The crop that will be planted.'),
    soilType: z.string().describe('Current soil type (e.g., "clay", "loamy", "sandy").'),
    region: z.string().describe('Geographic region.'),
    currentPHLevel: z.number().min(0).max(14).describe('Current soil pH level (e.g., 6.5).'),
});
export type SoilPrepInput = z.infer<typeof SoilPrepInputSchema>;

const SoilStepSchema = z.object({
    stepNumber: z.number().describe('Sequential step number.'),
    title: z.string().describe('Short title for this preparation step.'),
    description: z.string().describe('Detailed instructions for this step.'),
    estimatedDays: z.number().describe('Estimated days required for this step.'),
});

const AmendmentSchema = z.object({
    name: z.string().describe('Name of the soil amendment or input (e.g., "Lime", "Compost", "Gypsum").'),
    quantityPerAcre: z.string().describe('Quantity needed per acre (e.g., "500 kg", "2 tons").'),
    estimatedCostUSD: z.number().describe('Estimated cost per acre in USD.'),
    purpose: z.string().describe('Why this amendment is recommended.'),
});

export const SoilPrepOutputSchema = z.object({
    steps: z.array(SoilStepSchema).describe('Sequential soil preparation steps.'),
    targetPH: z.number().describe('Target pH level for the specified crop.'),
    totalPrepTimeDays: z.number().describe('Total estimated preparation time in days.'),
    amendments: z.array(AmendmentSchema).describe('List of recommended soil amendments.'),
    notes: z.string().describe('Additional soil health tips.'),
});
export type SoilPrepOutput = z.infer<typeof SoilPrepOutputSchema>;

export async function generateSoilPreparationGuide(input: SoilPrepInput): Promise<SoilPrepOutput> {
    return soilPrepFlow(input);
}

const soilPrepPrompt = ai.definePrompt({
    name: 'soilPrepPrompt',
    input: { schema: SoilPrepInputSchema },
    output: { schema: SoilPrepOutputSchema },
    prompt: `You are a soil science expert. Generate a complete soil preparation guide.

Crop: {{{cropType}}}
Soil Type: {{{soilType}}}
Region: {{{region}}}
Current pH: {{{currentPHLevel}}}

Provide a practical, step-by-step soil preparation plan in JSON including:
1. steps: Ordered preparation steps (tilling, pH correction, organic matter addition, etc.).
2. targetPH: Ideal soil pH for this crop.
3. totalPrepTimeDays: Total preparation time.
4. amendments: Specific soil amendments with quantities and costs.
5. notes: Any local soil considerations for {{{region}}}.

Be specific about quantities, timing, and costs. Account for the current pH of {{{currentPHLevel}}} and what changes are needed.`,
});

const soilPrepFlow = ai.defineFlow(
    {
        name: 'soilPrepFlow',
        inputSchema: SoilPrepInputSchema,
        outputSchema: SoilPrepOutputSchema,
    },
    async (input) => {
        const { output } = await soilPrepPrompt(input);
        if (!output) {
            throw new Error('Failed to generate soil preparation guide from AI.');
        }
        return output;
    }
);
