/**
 * @fileOverview Genkit AI flow for Soil Preparation Intelligence.
 *
 * Reuses CropSuccessPlannerInputSchema — no new input fields required.
 * Designed to run in parallel with cropSuccessPlannerFlow via Promise.all.
 *
 * Covers:
 *  - Previous crop residue handling
 *  - Weed seed removal strategies
 *  - Organic improvement plan
 *  - Safe chemical alternatives with safety class ratings
 *  - Environmental warning notes
 */

import { ai, runWithRotation, cachedPrompt } from '@/ai/genkit';
import { z } from 'genkit';
import { CropSuccessPlannerInputSchema } from './crop-success-planner-flow';

// Re-export input type alias for convenience
export type { CropSuccessPlannerInput } from './crop-success-planner-flow';

// ─── Output Schema ────────────────────────────────────────────────────────────

const ResidueHandlingSchema = z.object({
    method: z
        .enum(['Incorporate', 'Remove & Compost', 'Burn (controlled)', 'Mulch', 'None Required'])
        .describe('Recommended residue handling method for the previous crop.'),
    timing: z.string().describe('When to perform residue management (e.g., "2-3 weeks before tillage").'),
    rationale: z.string().describe('Why this method is recommended given this specific crop rotation.'),
    benefitToNextCrop: z.string().describe('How this action benefits the incoming crop.'),
    toolsRequired: z.array(z.string()).describe('Equipment or tools needed (e.g., "Disc harrow", "Rotavator").'),
    warnings: z.array(z.string()).describe('Precautions or risks with the chosen residue method. Empty if none.'),
});

const SeedRemovalStrategySchema = z.object({
    strategies: z.array(z.object({
        name: z.string().describe('Strategy name (e.g., "Stale Seedbed Technique", "Pre-emergence herbicide").'),
        description: z.string().describe('How to apply this strategy.'),
        timing: z.string().describe('Timing relative to planting.'),
        effectiveness: z.enum(['Very High', 'High', 'Moderate', 'Low']).describe('Weed control effectiveness.'),
    })),
    primaryWeedTargets: z.array(z.string()).describe('Main weed species expected given the previous crop and region.'),
    mechanicalOptions: z.array(z.string()).describe('Non-chemical removal methods.'),
    note: z.string().describe('General seed removal advice for this crop rotation.'),
});

const OrganicAmendmentSchema = z.object({
    name: z.string().describe('Amendment name (e.g., "Farmyard Manure", "Green Manure — Sesbania", "Compost").'),
    ratePerAcre: z.string().describe('Application rate (e.g., "5 tonnes/acre").'),
    timing: z.string().describe('When to apply (e.g., "4 weeks before planting").'),
    benefit: z.string().describe('Specific benefit to this soil type and crop.'),
    estimatedCostUSD: z.number().nonnegative().describe('Estimated cost per acre in USD.'),
    isLocallyAvailable: z.boolean().describe('Whether this amendment is typically available in the specified region.'),
});

const ChemicalAlternativeSchema = z.object({
    productName: z.string().describe('Generic or common product name.'),
    activeIngredient: z.string().describe('Active chemical ingredient(s).'),
    purpose: z.enum(['Soil Fumigation', 'pH Correction', 'Nutrient Supply', 'Pest Control', 'Weed Control', 'Disease Suppression'])
        .describe('Primary use of this chemical.'),
    dosagePerAcre: z.string().describe('Recommended dosage (e.g., "2 kg/acre").'),
    applicationTiming: z.string().describe('When to apply relative to planting.'),
    safetyClass: z.enum(['WHO Class Ia', 'WHO Class Ib', 'WHO Class II', 'WHO Class III', 'WHO Class U'])
        .describe('WHO hazard classification — Class U = Unlikely to be hazardous.'),
    ppeRequired: z.array(z.string()).describe('Personal protective equipment needed (e.g., "Gloves", "Respirator").'),
    withholdingPeriodDays: z.number().int().nonnegative()
        .describe('Days before harvest that application must stop. 0 = not applicable at this stage.'),
    saferAlternatives: z.array(z.string())
        .describe('Safer or organic substitutes that provide a similar effect.'),
    environmentalImpact: z.string().describe('Brief note on soil/water/biodiversity impact.'),
});

const EnvironmentalWarningSchema = z.object({
    category: z.enum(['Soil Health', 'Water Quality', 'Biodiversity', 'Human Safety', 'Climate'])
        .describe('Category of environmental concern.'),
    severity: z.enum(['Low', 'Medium', 'High', 'Critical']).describe('Severity of the warning.'),
    title: z.string().describe('Short warning title.'),
    description: z.string().describe('Detailed explanation of the environmental risk.'),
    mitigation: z.string().describe('What the farmer can do to reduce this risk.'),
});

export const SoilIntelligenceOutputSchema = z.object({
    soilHealthScore: z.number().min(0).max(100)
        .describe('Overall soil health score (0=severely degraded, 100=ideal). Based on soil type, rotation history, and water context.'),
    soilHealthGrade: z.enum(['A', 'B', 'C', 'D', 'F'])
        .describe('Letter grade: A≥90, B≥75, C≥55, D≥35, F<35.'),
    soilConditionSummary: z.string()
        .describe('2-3 sentence assessment of the current soil condition given the inputs.'),
    residueHandling: ResidueHandlingSchema
        .describe('How to deal with the previous crop residue before planting.'),
    seedRemoval: SeedRemovalStrategySchema
        .describe('Strategies to remove weed seeds left by the previous crop.'),
    organicImprovementPlan: z.object({
        amendments: z.array(OrganicAmendmentSchema).describe('Ordered list of organic amendments, most impactful first.'),
        totalEstimatedCostUSD: z.number().nonnegative().describe('Sum of all amendment costs per acre.'),
        implementationOrder: z.string().describe('Which amendment to apply first, second, etc. and why.'),
    }),
    chemicalAlternatives: z.array(ChemicalAlternativeSchema)
        .describe('Safe chemical options relevant to this soil+crop combination. Max 4. Ordered safest first.'),
    environmentalWarnings: z.array(EnvironmentalWarningSchema)
        .describe('Environmental risks for this specific field context. Ordered by severity.'),
    priorityActions: z.array(z.string()).max(3)
        .describe('The 3 most important actions to take immediately before anything else.'),
});

export type SoilIntelligenceOutput = z.infer<typeof SoilIntelligenceOutputSchema>;

// ─── Genkit Flow ──────────────────────────────────────────────────────────────

const soilIntelligenceCfg = {
    name: 'soilIntelligencePrompt',
    input: { schema: CropSuccessPlannerInputSchema },
    output: { schema: SoilIntelligenceOutputSchema },
    prompt: `You are a specialist soil scientist and agrochemical safety expert.
Analyse the following field details and produce a comprehensive Soil Preparation Intelligence report.

═══ FIELD DETAILS ═══
Upcoming Crop:       {{{cropName}}}
Soil Type:           {{{soilType}}}
Previous Crop:       {{{previousCrop}}}
Water Availability:  {{{waterAvailability}}}
Region:              {{{region}}}
Season:              {{{season}}}

═══ YOUR TASK ═══
Produce a rigorous JSON report covering each section below.
Be specific to the soil type, region, and crop rotation — avoid generic advice.

1. soilHealthScore (0–100) and soilHealthGrade (A–F):
   Score based on: soil type suitability (30pts), rotation benefit (30pts),
   water management context (20pts), regional soil health norms (20pts).

2. soilConditionSummary: Honest, concise soil condition assessment.

3. residueHandling: How to manage {{{previousCrop}}} residue before planting {{{cropName}}}.
   - Choose the most appropriate method for {{{soilType}}} soil.
   - Include specific timing and tools.
   - Note any allelopathy risks from {{{previousCrop}}} residue.

4. seedRemoval: Weed seed management strategies.
   - List the primary weed species left by {{{previousCrop}}} in {{{region}}}.
   - Include at least 2 strategies (mix mechanical and cultural).
   - Include one chemical option only if necessary and safer alternatives are insufficient.

5. organicImprovementPlan: Ranked amendments for {{{soilType}}} soil.
   - Choose amendments appropriate for {{{region}}} (local availability matters).
   - Minimum 2, maximum 4 amendments.
   - Order by implementation sequence.

6. chemicalAlternatives: Safe chemical inputs relevant to preparing for {{{cropName}}}.
   - ONLY include WHO Class III or Class U chemicals unless no safer option exists.
   - For any Class I/II chemical, this MUST be justified in environmentalImpact.
   - Include ppeRequired and saferAlternatives for every entry.
   - Maximum 4 entries.

7. environmentalWarnings: Real risks for this specific context.
   - Consider: {{{waterAvailability}}} water usage, {{{soilType}}} soil runoff risk,
     {{{region}}} biodiversity context, and residue burning risks if applicable.
   - Minimum 2, maximum 5 warnings.

8. priorityActions: The single most impactful actions (max 3), written as direct farmer instructions.

Use local agronomic knowledge for {{{region}}} to make recommendations actionable and regionally accurate.`,
};

const soilIntelligenceFlow = ai.defineFlow(
    {
        name: 'soilIntelligenceFlow',
        inputSchema: CropSuccessPlannerInputSchema,
        outputSchema: SoilIntelligenceOutputSchema,
    },
    async (input) => {
        return runWithRotation(async (instance) => {
      const _p = cachedPrompt(instance, soilIntelligenceCfg);
      const { output } = await _p(input);
        if (!output) {
            throw new Error('AI returned an empty response for Soil Intelligence.');
        }
        return output;
    });
    }
);

/**
 * Public function to invoke the Soil Intelligence AI flow.
 * Safe to call in API routes. Designed for parallel execution with runCropSuccessPlanner.
 */
export async function runSoilIntelligence(
    input: Parameters<typeof soilIntelligenceFlow>[0]
): Promise<SoilIntelligenceOutput> {
    return soilIntelligenceFlow(input);
}
