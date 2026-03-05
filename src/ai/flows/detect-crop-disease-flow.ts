'use server';
/**
 * @fileOverview A Genkit flow for detecting crop diseases from an image and providing a confidence score.
 *
 * - detectCropDisease - A function that handles the crop disease detection process.
 * - DetectCropDiseaseInput - The input type for the detectCropDisease function.
 * - DetectCropDiseaseOutput - The return type for the detectCropDisease function.
 */

import { ai, runWithRotation, cachedPrompt } from '@/ai/genkit';
import { z } from 'genkit';

const DetectCropDiseaseInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a crop, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type DetectCropDiseaseInput = z.infer<typeof DetectCropDiseaseInputSchema>;

const DetectCropDiseaseOutputSchema = z.object({
  cropType: z.string().describe('The type of crop identified from the image (e.g., "Tomato", "Potato", "Wheat").'),
  diseaseName: z.string().describe('The name of the detected disease, or "No disease detected" if healthy.'),
  confidenceScore: z.number().min(0.0).max(1.0).describe('A confidence score for the diagnosis, ranging from 0.0 to 1.0.'),
  severityLevel: z.enum(['Low', 'Medium', 'High', 'Not Applicable']).describe('The severity level of the detected disease.'),
  description: z.string().describe('A brief description of the disease, its symptoms, and potential impact.'),
  whyWeThink: z.string().describe("An explanation of why the AI made this diagnosis and its confidence level, mentioning observed leaf patterns, lesion clustering, or texture comparisons. Structured as a 'Why We Think' section."),
});
export type DetectCropDiseaseOutput = z.infer<typeof DetectCropDiseaseOutputSchema>;

export async function detectCropDisease(input: DetectCropDiseaseInput): Promise<DetectCropDiseaseOutput> {
  return detectCropDiseaseFlow(input);
}

const detectCropDiseasePromptCfg = {
  name: 'detectCropDiseasePrompt',
  input: { schema: DetectCropDiseaseInputSchema },
  output: { schema: DetectCropDiseaseOutputSchema },
  prompt: `You are an expert agricultural AI assistant specialized in identifying crops and diagnosing crop diseases.
Your task is to analyze the provided image, first identify the type of crop shown, and then identify any potential diseases affecting it.

Provide the following information in a JSON format:
1.  **cropType**: The type of crop identified in the image (e.g., "Tomato", "Potato", "Wheat", "Rice"). Identify this from the visual characteristics of the plant.
2.  **diseaseName**: The name of the detected disease, or "No disease detected" if the crop appears healthy.
3.  **confidenceScore**: A numerical score between 0.0 and 1.0 representing your confidence in the diagnosis. 1.0 is highest confidence.
4.  **severityLevel**: Categorize the disease severity as 'Low', 'Medium', 'High', or 'Not Applicable' if no disease is found.
5.  **description**: A brief, informative description of the identified disease, including its typical symptoms and potential impact on the crop.
6.  **whyWeThink**: A detailed explanation for your diagnosis and confidence score. Describe what specific visual cues (e.g., leaf patterns, lesion clustering, color changes, texture) in the image led to your conclusion.

Image: {{media url=photoDataUri}}`,
};

const detectCropDiseaseFlow = ai.defineFlow(
  {
    name: 'detectCropDiseaseFlow',
    inputSchema: DetectCropDiseaseInputSchema,
    outputSchema: DetectCropDiseaseOutputSchema,
  },
  async (input) => {
    return runWithRotation(async (instance) => {
      const prompt = cachedPrompt(instance, detectCropDiseasePromptCfg);
      const { output } = await prompt(input);
      if (!output) throw new Error('Failed to get a valid response from the AI for disease detection.');
      return output;
    });
  }
);
