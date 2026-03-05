'use server';
/**
 * @fileOverview This file implements a Genkit flow that explains the reasoning behind an AI's plant disease diagnosis.
 *
 * - explainAIDiagnosis - A function that handles the AI diagnosis explanation process.
 * - ExplainAIDiagnosisInput - The input type for the explainAIDiagnosis function.
 * - ExplainAIDiagnosisOutput - The return type for the explainAIDiagnosis function.
 */

import { ai, runWithRotation, cachedPrompt } from '@/ai/genkit';
import { z } from 'genkit';

const ExplainAIDiagnosisInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the plant, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  diseaseName: z.string().describe('The name of the diagnosed plant disease.'),
  confidenceScore: z
    .number()
    .describe('The confidence score (0-100) of the diagnosis.'),
  severityLevel: z
    .string()
    .describe('The severity level of the diagnosed disease (e.g., "Low", "Medium", "High").'),
  visualCuesDescription: z
    .string()
    .describe(
      'A detailed description of the visual cues observed in the image that led to the diagnosis.'
    ),
  language: z
    .string()
    .optional()
    .default('en')
    .describe('ISO language code for the response (e.g. "hi", "te"). Default: en.'),
});
export type ExplainAIDiagnosisInput = z.infer<typeof ExplainAIDiagnosisInputSchema>;

const ExplainAIDiagnosisOutputSchema = z.object({
  explanation: z
    .string()
    .describe(
      'A detailed explanation of the AI\u2019s diagnosis, structured with sections for visual patterns, clustering, texture, and confidence level.'
    ),
});
export type ExplainAIDiagnosisOutput = z.infer<typeof ExplainAIDiagnosisOutputSchema>;

export async function explainAIDiagnosis(
  input: ExplainAIDiagnosisInput
): Promise<ExplainAIDiagnosisOutput> {
  return explainAIDiagnosisFlow(input);
}

const promptCfg = {
  name: 'explainAIDiagnosisPrompt',
  input: { schema: ExplainAIDiagnosisInputSchema },
  output: { schema: ExplainAIDiagnosisOutputSchema },
  prompt: `You are an expert botanist and AI diagnostic assistant. Your task is to explain why a specific plant disease was diagnosed based on the provided image and diagnostic information. Structure your explanation clearly, focusing on the visual cues from the image that support the diagnosis. Use the description of visual cues provided to inform your explanation.

**Diagnosed Disease**: {{{diseaseName}}}
**Confidence Score**: {{{confidenceScore}}}%
**Severity Level**: {{{severityLevel}}}
**Key Visual Cues Observed**: {{{visualCuesDescription}}}

**Photo**: {{media url=photoDataUri}}

Provide a detailed explanation following this structure. Ensure your explanation directly refers to the visual information in the image, elaborating on how each cue contributes to the diagnosis:

### Why We Think this is {{{diseaseName}}}

Based on the uploaded image and our analysis, here's why this diagnosis was made:

#### Spotted Leaf Patterns
[Explain any spotted leaf patterns, their characteristics, and how they match the disease. Reference the visual cues provided and what is seen in the photo.]

#### Lesion Clustering
[Describe how lesions are clustered or distributed, if applicable, and its significance for the diagnosis. Reference the visual cues provided and what is seen in the photo.]

#### Texture Comparison
[Discuss the texture observed on the affected plant parts and compare it to typical disease characteristics. Reference the visual cues provided and what is seen in the photo.]

#### Confidence Level
[Explain what the confidence score of {{{confidenceScore}}}% means in this context, for example: 'This high confidence score indicates a strong match with known symptoms of X disease.'.]

LANGUAGE: Respond entirely in the language with code "{{language}}". Reference: en=English, hi=Hindi, te=Telugu, ta=Tamil, kn=Kannada, ml=Malayalam, bn=Bengali, pa=Punjabi, gu=Gujarati, mr=Marathi, ur=Urdu, ar=Arabic, es=Spanish, fr=French, pt=Portuguese, de=German, ru=Russian, zh=Chinese, sw=Swahili. Write the full explanation in that language.
`,
};

const explainAIDiagnosisFlow = ai.defineFlow(
  {
    name: 'explainAIDiagnosisFlow',
    inputSchema: ExplainAIDiagnosisInputSchema,
    outputSchema: ExplainAIDiagnosisOutputSchema,
  },
  async (input) => {
    return runWithRotation(async (instance) => {
      const _p = cachedPrompt(instance, promptCfg);
      const { output } = await _p(input);
      return output!;
    });
  }
);
