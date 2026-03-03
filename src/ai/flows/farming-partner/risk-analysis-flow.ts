/**
 * @fileOverview Genkit flow for farm risk analysis (weather, pest, market).
 *
 * - generateRiskAnalysis - Main function to call.
 * - RiskAnalysisInput    - Input type.
 * - RiskAnalysisOutput   - Output type.
 */

import { ai, runWithRotation, cachedPrompt } from '@/ai/genkit';
import { z } from 'genkit';

export const RiskAnalysisInputSchema = z.object({
    cropType: z.string().describe('The crop type.'),
    region: z.string().describe('Geographic region.'),
    season: z.string().describe('Growing season.'),
    soilType: z.string().describe('Soil type.'),
    farmSizeAcres: z.number().positive().describe('Farm size in acres.'),
});
export type RiskAnalysisInput = z.infer<typeof RiskAnalysisInputSchema>;

const RiskDimensionSchema = z.object({
    score: z.number().min(0).max(10).describe('Risk score from 0 (no risk) to 10 (extreme risk).'),
    level: z.enum(['Low', 'Medium', 'High', 'Critical']).describe('Risk level category.'),
    factors: z.array(z.string()).describe('Key risk factors contributing to this score.'),
    mitigationStrategies: z.array(z.string()).describe('Specific actions to mitigate this risk.'),
});

export const RiskAnalysisOutputSchema = z.object({
    overallRiskScore: z.number().min(0).max(10).describe('Composite risk score (weighted average).'),
    overallRiskLevel: z.enum(['Low', 'Medium', 'High', 'Critical']).describe('Overall risk category.'),
    weatherRisk: RiskDimensionSchema.describe('Climate and weather-related risks.'),
    pestRisk: RiskDimensionSchema.describe('Pest, disease, and weed pressure risks.'),
    marketRisk: RiskDimensionSchema.describe('Price volatility, demand, and supply chain risks.'),
    soilRisk: RiskDimensionSchema.describe('Soil degradation, nutrient depletion, or erosion risks.'),
    financialRisk: RiskDimensionSchema.describe('Input cost, financing, and insurance risks.'),
    topPriorityActions: z.array(z.object({
        priority: z.number().describe('Priority rank (1 = most urgent).'),
        action: z.string().describe('The action to take.'),
        deadline: z.string().describe('When this should be done (e.g., "Before planting", "Week 4").'),
        estimatedCostUSD: z.number().describe('Estimated cost to implement in USD.'),
    })).describe('Top prioritized actions to reduce overall farm risk.'),
    riskSummary: z.string().describe('One-paragraph summary of the risk profile and key advice.'),
});
export type RiskAnalysisOutput = z.infer<typeof RiskAnalysisOutputSchema>;

export async function generateRiskAnalysis(input: RiskAnalysisInput): Promise<RiskAnalysisOutput> {
    return riskAnalysisFlow(input);
}

const riskAnalysisCfg = {
    name: 'riskAnalysisPrompt',
    input: { schema: RiskAnalysisInputSchema },
    output: { schema: RiskAnalysisOutputSchema },
    prompt: `You are an agricultural risk management expert. Perform a comprehensive farm risk analysis.

Crop: {{{cropType}}}
Region: {{{region}}}
Season: {{{season}}}
Soil Type: {{{soilType}}}
Farm Size: {{{farmSizeAcres}}} acres

Generate a detailed risk assessment in JSON covering:
1. overallRiskScore: Weighted composite (0-10).
2. overallRiskLevel: Category (Low/Medium/High/Critical).
3. weatherRisk: Score, factors, and mitigations based on {{{region}}} climate during {{{season}}}.
4. pestRisk: Common pests/diseases for {{{cropType}}} in {{{region}}}, score, and controls.
5. marketRisk: Price volatility and demand factors for {{{cropType}}} in {{{region}}}.
6. soilRisk: Soil health risks for {{{soilType}}} with {{{cropType}}}.
7. financialRisk: Cost and investment risks.
8. topPriorityActions: Top 5 ranked actions with deadlines and costs.
9. riskSummary: Clear, concise summary paragraph.

Base the analysis on realistic conditions for {{{region}}} during the {{{season}}} season.`,
};

const riskAnalysisFlow = ai.defineFlow(
    {
        name: 'riskAnalysisFlow',
        inputSchema: RiskAnalysisInputSchema,
        outputSchema: RiskAnalysisOutputSchema,
    },
    async (input) => {
        return runWithRotation(async (instance) => {
      const _p = cachedPrompt(instance, riskAnalysisCfg);
      const { output } = await _p(input);
        if (!output) {
            throw new Error('Failed to generate risk analysis from AI.');
        }
        return output;
    });
    }
);
