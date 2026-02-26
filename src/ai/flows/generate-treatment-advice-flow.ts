'use server';
/**
 * @fileOverview A Genkit flow for providing detailed, contextualized treatment recommendations based on a plant disease diagnosis.
 *
 * - generateTreatmentAdvice - A function that handles the generation of treatment advice.
 * - GenerateTreatmentAdviceInput - The input type for the generateTreatmentAdvice function.
 * - GenerateTreatmentAdviceOutput - The return type for the generateTreatmentAdvice function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input Schema
const GenerateTreatmentAdviceInputSchema = z.object({
  diseaseName: z.string().describe('The name of the identified plant disease.'),
  cropType: z.string().describe('The type of crop affected by the disease.'),
  severityLevel:
    z.string().optional().describe('The severity level of the disease (e.g., "mild", "moderate", "severe").'),
});
export type GenerateTreatmentAdviceInput = z.infer<typeof GenerateTreatmentAdviceInputSchema>;

// Output Schemas for nested objects
const PesticideRecommendationSchema = z.object({
  name: z.string().describe('The name of the recommended pesticide.'),
  dosage: z.string().describe('The recommended dosage of the pesticide.'),
  applicationMethod: z.string().describe('How to apply the pesticide.'),
});

const OrganicSolutionRecommendationSchema = z.object({
  name: z.string().describe('The name of the recommended organic solution.'),
  preparation: z.string().describe('How to prepare the organic solution.'),
  applicationMethod: z.string().describe('How to apply the organic solution.'),
});

// Main Output Schema
const GenerateTreatmentAdviceOutputSchema = z.object({
  pesticideRecommendation: PesticideRecommendationSchema.optional().describe(
    'Detailed recommendation for a chemical pesticide. If no specific product is available, suggest a type of chemical treatment.'
  ),
  organicSolutionRecommendation: OrganicSolutionRecommendationSchema.optional().describe(
    'Detailed recommendation for an organic treatment solution. If no specific product is available, suggest a cultural practice or general organic method.'
  ),
  applicationMethods:
    z.array(z.string()).optional().describe('General methods for applying treatments.'),
  preventionTips:
    z.array(z.string()).optional().describe('Tips to prevent the recurrence or spread of the disease.'),
  generalAdvice:
    z.string().optional().describe('Any additional general advice for managing the disease.'),
});
export type GenerateTreatmentAdviceOutput = z.infer<typeof GenerateTreatmentAdviceOutputSchema>;

// Prompt definition
const generateTreatmentAdvicePrompt = ai.definePrompt({
  name: 'generateTreatmentAdvicePrompt',
  input: { schema: GenerateTreatmentAdviceInputSchema },
  output: { schema: GenerateTreatmentAdviceOutputSchema },
  prompt: `You are an expert agricultural advisor specializing in plant disease treatment.\nYour task is to provide detailed, contextualized treatment recommendations for a diagnosed plant disease affecting a specific crop.\n\nBased on the following information, generate comprehensive advice including pesticide recommendations, organic solutions, application methods, and prevention tips.\n\nDisease Name: {{{diseaseName}}}\nCrop Type: {{{cropType}}}\n{{#if severityLevel}}\nSeverity Level: {{{severityLevel}}}\n{{/if}}\n\nProvide your recommendations in a structured JSON format as described in the output schema. Aim to provide both a pesticide and an organic solution recommendation if applicable. If a specific product is not known, recommend a general type of product or a cultural practice.`,
});

// Flow definition
const generateTreatmentAdviceFlow = ai.defineFlow(
  {
    name: 'generateTreatmentAdviceFlow',
    inputSchema: GenerateTreatmentAdviceInputSchema,
    outputSchema: GenerateTreatmentAdviceOutputSchema,
  },
  async (input) => {
    const { output } = await generateTreatmentAdvicePrompt(input);
    if (!output) {
      throw new Error('Failed to generate treatment advice.');
    }
    return output;
  }
);

// Wrapper function
export async function generateTreatmentAdvice(
  input: GenerateTreatmentAdviceInput
): Promise<GenerateTreatmentAdviceOutput> {
  return generateTreatmentAdviceFlow(input);
}
