'use server';
/**
 * @fileOverview A Genkit flow for finding nearby agricultural suppliers.
 *
 * - findNearbySuppliers - A function that returns a list of fictional suppliers based on location.
 * - FindNearbySuppliersInput - The input type for the findNearbySuppliers function.
 * - FindNearbySuppliersOutput - The return type for the findNearbySuppliers function.
 */

import { ai, runWithRotation, cachedPrompt } from '@/ai/genkit';
import { z } from 'genkit';

const FindNearbySuppliersInputSchema = z.object({
  latitude: z.number().describe("The user's latitude."),
  longitude: z.number().describe("The user's longitude."),
  cropType: z.string().optional().describe('The type of crop.'),
  diseaseName: z.string().optional().describe('The name of the diagnosed disease.'),
});
export type FindNearbySuppliersInput = z.infer<typeof FindNearbySuppliersInputSchema>;

const SupplierSchema = z.object({
  name: z.string().describe('The fictional name of the supplier.'),
  address: z.string().describe('The plausible full address for the supplier.'),
  latitude: z.number().describe('The latitude for the address.'),
  longitude: z.number().describe('The longitude for the address.'),
  distance: z.string().describe('A string representing the distance from the user (e.g., "5.2 km").'),
  products: z
    .array(z.string())
    .describe(
      'A list of 2-3 relevant products they might sell for the given crop/disease.'
    ),
});

const FindNearbySuppliersOutputSchema = z.object({
  suppliers: z.array(SupplierSchema),
});
export type FindNearbySuppliersOutput = z.infer<
  typeof FindNearbySuppliersOutputSchema
>;

export async function findNearbySuppliers(
  input: FindNearbySuppliersInput
): Promise<FindNearbySuppliersOutput> {
  return findNearbySuppliersFlow(input);
}

const suppliersCfg = {
  name: 'findNearbySuppliersPrompt',
  input: { schema: FindNearbySuppliersInputSchema },
  output: { schema: FindNearbySuppliersOutputSchema },
  prompt: `You are an agricultural supply chain expert. Based on the user's location (latitude: {{{latitude}}}, longitude: {{{longitude}}}), find 5 fictional but realistic agricultural suppliers nearby.
        
The user is dealing with a '{{{cropType}}}' crop diagnosed with '{{{diseaseName}}}'.

For each supplier, provide:
- A realistic, localized name.
- A full, plausible address near the given coordinates.
- Plausible latitude and longitude for the address.
- The distance in kilometers from the user's location as a string (e.g., "5.2 km").
- A list of 2-3 products they might sell that are relevant for treating '{{{diseaseName}}}' on '{{{cropType}}}' crops.

Return the list of suppliers in JSON format.`,
};

const findNearbySuppliersFlow = ai.defineFlow(
  {
    name: 'findNearbySuppliersFlow',
    inputSchema: FindNearbySuppliersInputSchema,
    outputSchema: FindNearbySuppliersOutputSchema,
  },
  async (input) => {
    return runWithRotation(async (instance) => {
      const _p = cachedPrompt(instance, suppliersCfg);
      const { output } = await _p(input);
    if (!output) {
      throw new Error('Failed to generate suppliers.');
    }
    return output;
    });
  }
);
