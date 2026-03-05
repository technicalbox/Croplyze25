/**
 * generate-crops.ts — Batch-generates full crop data using Gemini AI.
 *
 * Usage:  npx tsx src/scripts/generate-crops.ts
 *
 * Reads crop names from src/data/crop-names.ts, sends batches of 25 to Gemini,
 * validates output, and writes the final crops_seed.json.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';

// ── Load API keys ───────────────────────────────────────────────────────────
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const API_KEYS: string[] = [];
for (let i = 1; i <= 10; i++) {
    const k = process.env[`GEMINI_KEY_${i}`];
    if (k) API_KEYS.push(k);
}
if (!API_KEYS.length) {
    const fallback = process.env.GOOGLE_GENAI_API_KEY;
    if (fallback) API_KEYS.push(fallback);
}
if (!API_KEYS.length) {
    console.error('No Gemini API keys found in .env.local');
    process.exit(1);
}
console.log(`[gen] Found ${API_KEYS.length} API key(s)`);

// ── Crop names ──────────────────────────────────────────────────────────────
import { CROP_NAMES, type CropEntry } from '../data/crop-names';
console.log(`[gen] ${CROP_NAMES.length} crops to generate`);

// ── Config ──────────────────────────────────────────────────────────────────
const BATCH_SIZE = 25;
const OUTPUT_PATH = path.resolve(process.cwd(), 'src/data/crops_seed.json');
const MODEL = 'gemini-2.0-flash';

let currentKeyIdx = 0;
const keyCooldowns = new Map<number, number>();

function getClient() {
    // Skip cooled-down keys
    for (let attempts = 0; attempts < API_KEYS.length; attempts++) {
        const cooldownUntil = keyCooldowns.get(currentKeyIdx) ?? 0;
        if (Date.now() > cooldownUntil) {
            return { client: new GoogleGenerativeAI(API_KEYS[currentKeyIdx]), keyIdx: currentKeyIdx };
        }
        currentKeyIdx = (currentKeyIdx + 1) % API_KEYS.length;
    }
    // All keys cooled down, use first anyway
    return { client: new GoogleGenerativeAI(API_KEYS[0]), keyIdx: 0 };
}

function rotateKey(failedIdx: number) {
    keyCooldowns.set(failedIdx, Date.now() + 60_000);
    currentKeyIdx = (failedIdx + 1) % API_KEYS.length;
    console.log(`[gen] Key#${failedIdx + 1} cooled down. Rotating to Key#${currentKeyIdx + 1}`);
}

// ── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt(crops: CropEntry[]): string {
    const cropList = crops.map(c => `- ${c.name} (${c.scientific}) [${c.category}]`).join('\n');

    return `You are an expert agronomist with deep knowledge of Indian and global agriculture.

Generate detailed, accurate crop data for these ${crops.length} crops:

${cropList}

For EACH crop, return a JSON object with these EXACT fields:
{
  "id": "lowercase-slug",
  "commonNames": { "en": "English", "hi": "Hindi", "te": "Telugu", "ta": "Tamil", "kn": "Kannada" },
  "scientificName": "Genus species",
  "aliases": ["regional", "colloquial", "trade names"],
  "cropType": "one of: grain|pulse|oilseed|vegetable|leafy_green|fruit|spice|plantation|cash_crop|flower|medicinal|fodder|nut|tuber|berry|mushroom|aquatic",
  "seasonBest": ["kharif"|"rabi"|"zaid"|"all_year"],
  "seasonAvoid": ["peak_summer"|"heavy_monsoon"|"frost_season"],
  "soilBest": ["loamy", "alluvial"],
  "soilBad": ["saline", "waterlogged"],
  "waterNeeds": "High|Medium|Low",
  "sunlightNeeds": "Full sun|Partial shade|Full shade",
  "tempRangeC": { "min": 20, "max": 35 },
  "timeToHarvestDays": 120,
  "marketDemandLevel": "high|medium|low",
  "peakDemandMonths": [10, 11, 12],
  "isSeasonalCrop": true,
  "growthSteps": [
    { "step": 1, "title": "Land Preparation", "description": "...", "daysFromStart": "0-7" },
    { "step": 2, "title": "Sowing/Planting", "description": "...", "daysFromStart": "7-14" },
    { "step": 3, "title": "Growth Phase", "description": "...", "daysFromStart": "14-60" },
    { "step": 4, "title": "Flowering/Fruiting", "description": "...", "daysFromStart": "60-90" },
    { "step": 5, "title": "Harvest", "description": "...", "daysFromStart": "90-120" }
  ],
  "diseaseRisks": [
    { "name": "Disease Name", "symptoms": "visible symptoms", "severity": "Low|Medium|High|Critical", "prevention": "how to prevent", "treatment": "how to treat" }
  ],
  "preventionTips": ["tip1", "tip2", "tip3"],
  "yieldImprovementTips": ["tip1", "tip2", "tip3"],
  "harvestTips": ["tip1", "tip2"],
  "tags": ["descriptive", "category", "tags"],
  "lastUpdated": "2026-03-01T00:00:00Z",
  "source": "ai_generated"
}

RULES:
1. Use accurate, realistic agronomic data relevant to Indian farming conditions
2. Common names MUST be in actual script (Devanagari for Hindi, Telugu script, Tamil script, Kannada script)
3. If unsure about a regional name, use the English name as fallback
4. Include at least 2 disease risks per crop
5. Include at least 4 growth steps per crop
6. timeToHarvestDays must be realistic (not 0)
7. Return ONLY a JSON array of ${crops.length} objects. No markdown, no explanation.`;
}

// ── Generation ───────────────────────────────────────────────────────────────

async function generateBatch(crops: CropEntry[], batchNum: number, totalBatches: number): Promise<any[]> {
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const { client, keyIdx } = getClient();
        try {
            console.log(`[gen] Batch ${batchNum}/${totalBatches} (${crops.length} crops) — Key#${keyIdx + 1}, attempt ${attempt}`);

            const model = client.getGenerativeModel({ model: MODEL });
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: buildPrompt(crops) }] }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 65536,
                    responseMimeType: 'application/json',
                },
            });

            const text = result.response.text();

            // Parse JSON
            let parsed: any[];
            try {
                parsed = JSON.parse(text);
            } catch {
                // Try extracting JSON array from response
                const match = text.match(/\[[\s\S]*\]/);
                if (!match) throw new Error('No JSON array found in response');
                parsed = JSON.parse(match[0]);
            }

            if (!Array.isArray(parsed)) {
                throw new Error('Response is not an array');
            }

            console.log(`[gen] Batch ${batchNum} → got ${parsed.length} crops`);
            return parsed;

        } catch (err: any) {
            const msg = err?.message ?? String(err);
            const is429 = msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED');

            if (is429) {
                rotateKey(keyIdx);
                const waitMs = attempt * 5000;
                console.log(`[gen] Rate limited. Waiting ${waitMs / 1000}s...`);
                await sleep(waitMs);
            } else {
                console.error(`[gen] Batch ${batchNum} attempt ${attempt} error:`, msg.slice(0, 200));
                if (attempt === MAX_RETRIES) {
                    console.error(`[gen] Batch ${batchNum} FAILED after ${MAX_RETRIES} attempts. Skipping.`);
                    return [];
                }
                await sleep(2000);
            }
        }
    }
    return [];
}

// ── Validation ───────────────────────────────────────────────────────────────

function validateCrop(crop: any): boolean {
    if (!crop.id || typeof crop.id !== 'string') return false;
    if (!crop.commonNames?.en) return false;
    if (!crop.scientificName) return false;
    if (!Array.isArray(crop.aliases)) return false;
    if (typeof crop.timeToHarvestDays !== 'number' || crop.timeToHarvestDays < 1 || crop.timeToHarvestDays > 3650) return false;
    if (!crop.tempRangeC || crop.tempRangeC.min >= crop.tempRangeC.max) return false;
    if (!Array.isArray(crop.diseaseRisks) || crop.diseaseRisks.length < 1) return false;
    if (!Array.isArray(crop.growthSteps) || crop.growthSteps.length < 3) return false;
    return true;
}

function fixCrop(crop: any, entry: CropEntry): any {
    // Ensure ID is a proper slug
    if (!crop.id) crop.id = entry.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');

    // Ensure required arrays exist
    if (!Array.isArray(crop.aliases)) crop.aliases = [];
    if (!Array.isArray(crop.seasonBest)) crop.seasonBest = ['all_year'];
    if (!Array.isArray(crop.seasonAvoid)) crop.seasonAvoid = [];
    if (!Array.isArray(crop.soilBest)) crop.soilBest = ['loamy'];
    if (!Array.isArray(crop.soilBad)) crop.soilBad = [];
    if (!Array.isArray(crop.peakDemandMonths)) crop.peakDemandMonths = [1, 2, 3];
    if (!Array.isArray(crop.tags)) crop.tags = [entry.category];
    if (!Array.isArray(crop.preventionTips)) crop.preventionTips = [];
    if (!Array.isArray(crop.yieldImprovementTips)) crop.yieldImprovementTips = [];
    if (!Array.isArray(crop.harvestTips)) crop.harvestTips = [];

    // Ensure cropType
    if (!crop.cropType) crop.cropType = entry.category;

    // Ensure commonNames has all languages
    if (!crop.commonNames) crop.commonNames = {};
    crop.commonNames.en = crop.commonNames.en || entry.name;
    crop.commonNames.hi = crop.commonNames.hi || entry.name;
    crop.commonNames.te = crop.commonNames.te || entry.name;
    crop.commonNames.ta = crop.commonNames.ta || entry.name;
    crop.commonNames.kn = crop.commonNames.kn || entry.name;

    // Ensure metadata
    crop.scientificName = crop.scientificName || entry.scientific;
    crop.lastUpdated = crop.lastUpdated || '2026-03-01T00:00:00Z';
    crop.source = 'ai_generated';

    // Build search keywords
    const terms = new Set<string>();
    terms.add(crop.id);
    for (const name of Object.values(crop.commonNames) as string[]) {
        if (name) terms.add(name.toLowerCase());
    }
    for (const alias of crop.aliases) {
        terms.add(String(alias).toLowerCase());
    }
    for (const part of crop.scientificName.toLowerCase().split(' ')) {
        terms.add(part);
    }
    terms.add(crop.cropType);
    for (const tag of crop.tags) {
        terms.add(String(tag).toLowerCase());
    }
    crop.searchKeywords = [...terms];

    return crop;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    const allCrops: any[] = [];
    const seenIds = new Set<string>();

    // Load existing seed data if any
    if (fs.existsSync(OUTPUT_PATH)) {
        try {
            const existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
            if (Array.isArray(existing)) {
                for (const crop of existing) {
                    if (crop.id && !seenIds.has(crop.id)) {
                        seenIds.add(crop.id);
                        allCrops.push(crop);
                    }
                }
                console.log(`[gen] Loaded ${allCrops.length} existing crops from seed file`);
            }
        } catch { /* ignore parse errors */ }
    }

    // Filter out already-generated crops
    const remaining = CROP_NAMES.filter(c => {
        const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
        return !seenIds.has(slug);
    });

    console.log(`[gen] ${remaining.length} crops remaining to generate`);

    if (remaining.length === 0) {
        console.log('[gen] All crops already generated!');
        return;
    }

    // Batch and generate
    const batches: CropEntry[][] = [];
    for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
        batches.push(remaining.slice(i, i + BATCH_SIZE));
    }

    console.log(`[gen] Will process ${batches.length} batches of ~${BATCH_SIZE} crops each`);

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const results = await generateBatch(batch, i + 1, batches.length);

        let valid = 0;
        let fixed = 0;
        for (let j = 0; j < results.length; j++) {
            const entry = batch[j] || batch[0];
            let crop = fixCrop(results[j], entry);

            if (!seenIds.has(crop.id)) {
                seenIds.add(crop.id);
                if (validateCrop(crop)) {
                    valid++;
                } else {
                    fixed++;
                }
                allCrops.push(crop);
            }
        }

        console.log(`[gen] Batch ${i + 1}: ${valid} valid, ${fixed} fixed, total ${allCrops.length}`);

        // Save progress after each batch
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allCrops, null, 2), 'utf-8');
        console.log(`[gen] Saved ${allCrops.length} crops to ${OUTPUT_PATH}`);

        // Rate limiting pause between batches
        if (i < batches.length - 1) {
            const pauseMs = 3000;
            console.log(`[gen] Pausing ${pauseMs / 1000}s before next batch...`);
            await sleep(pauseMs);
        }
    }

    console.log(`\n[gen] ✅ DONE! Generated ${allCrops.length} total crops.`);
    console.log(`[gen] Output: ${OUTPUT_PATH}`);

    // Print category breakdown
    const categories: Record<string, number> = {};
    for (const crop of allCrops) {
        categories[crop.cropType] = (categories[crop.cropType] || 0) + 1;
    }
    console.log('\n[gen] Category breakdown:');
    for (const [cat, count] of Object.entries(categories).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${cat}: ${count}`);
    }
}

main().catch(err => {
    console.error('[gen] Fatal error:', err);
    process.exit(1);
});
