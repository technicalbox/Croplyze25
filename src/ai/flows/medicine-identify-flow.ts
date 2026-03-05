'use server';
/**
 * @fileOverview A Genkit flow for identifying a medicine/pesticide from a photo of its bottle/package.
 *
 * - identifyMedicine - Identifies the medicine name, active ingredient, and category from an image.
 * - IdentifyMedicineInput - Input type.
 * - IdentifyMedicineOutput - Output type.
 */

import { ai, runWithRotation, cachedPrompt } from '@/ai/genkit';
import { z } from 'genkit';

// ── Input ────────────────────────────────────────────────────────────────────

const IdentifyMedicineInputSchema = z.object({
    photoDataUri: z
        .string()
        .describe(
            "A photo of a pesticide/medicine bottle or package, as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
        ),
});
export type IdentifyMedicineInput = z.infer<typeof IdentifyMedicineInputSchema>;

// ── Output ───────────────────────────────────────────────────────────────────

const IdentifyMedicineOutputSchema = z.object({
    medicineName: z.string().describe('The recognized medicine/pesticide brand or common name.'),
    activeIngredient: z.string().describe('The primary active ingredient listed on the label.'),
    category: z
        .enum(['fungicide', 'insecticide', 'herbicide', 'organic', 'bio-fungicide', 'bio-insecticide', 'unknown'])
        .describe('The category of the medicine.'),
    manufacturer: z.string().optional().describe('The manufacturer name if visible on the label.'),
    confidence: z
        .number()
        .min(0)
        .max(1)
        .describe('Confidence score for the identification (0.0–1.0).'),
});
export type IdentifyMedicineOutput = z.infer<typeof IdentifyMedicineOutputSchema>;

// ── Wrapper ──────────────────────────────────────────────────────────────────

export async function identifyMedicine(input: IdentifyMedicineInput): Promise<IdentifyMedicineOutput> {
    return identifyMedicineFlow(input);
}

// ── Prompt ────────────────────────────────────────────────────────────────────

const identifyMedicinePromptCfg = {
    name: 'identifyMedicinePrompt',
    input: { schema: IdentifyMedicineInputSchema },
    output: { schema: IdentifyMedicineOutputSchema },
    prompt: `You are an expert agricultural product identification specialist.
Your task is to analyze the provided image of a pesticide, fungicide, insecticide, or bio-treatment bottle/package and identify it.

Read any text, brand names, active ingredient details, and categorization information visible on the label.

Provide the following information in a JSON format:
1. **medicineName**: The brand or common name of the product (e.g., "Mancozeb", "Imidacloprid", "Neem Oil").
2. **activeIngredient**: The primary active ingredient and concentration if visible (e.g., "Mancozeb 75% WP").
3. **category**: One of 'fungicide', 'insecticide', 'herbicide', 'organic', 'bio-fungicide', 'bio-insecticide', or 'unknown'.
4. **manufacturer**: The manufacturer name if visible on the label (optional).
5. **confidence**: A score between 0.0 and 1.0 representing how confident you are in the identification.

If the image is not clear or does not show a pesticide/medicine product, set confidence to a low value and provide your best guess.

Image: {{media url=photoDataUri}}`,
};

// ── Flow ──────────────────────────────────────────────────────────────────────

const identifyMedicineFlow = ai.defineFlow(
    {
        name: 'identifyMedicineFlow',
        inputSchema: IdentifyMedicineInputSchema,
        outputSchema: IdentifyMedicineOutputSchema,
    },
    async (input) => {
        return runWithRotation(async (instance) => {
            const prompt = cachedPrompt(instance, identifyMedicinePromptCfg);
            const { output } = await prompt(input);
            if (!output) throw new Error('Failed to identify medicine from the image.');
            return output;
        });
    }
);
