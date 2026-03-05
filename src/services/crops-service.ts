/**
 * @fileOverview Server-side Firestore helpers for the `crops` collection.
 *
 * Uses the same standalone Firebase init pattern as farming-partner/firestore.ts.
 * Safe for Next.js API routes.
 *
 * Features:
 *   - getCropById: fetch a single crop document
 *   - searchCrops: Firestore array-contains + Fuse.js fuzzy fallback
 *   - getAllCrops: cached crop list
 *   - seedCropsFromJson: populate Firestore from crops_seed.json
 */

import { initializeApp, getApp, getApps } from 'firebase/app';
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    query,
    where,
    limit,
} from 'firebase/firestore';
import Fuse from 'fuse.js';
import type { CropDocument } from '@/types/crop';

// ── Firebase init (server-safe) ──────────────────────────────────────────────

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyCXF7ZXTrgfdMApLF4kZAwiFpL8baTdBc4',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'studio-2729619248-93d9f.firebaseapp.com',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'studio-2729619248-93d9f',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'studio-2729619248-93d9f.appspot.com',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '255814188362',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '1:255814188362:web:ee6527ab26a1811a7c95b3',
};

function getDb() {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    return getFirestore(app);
}

const CROPS_COLLECTION = 'crops';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * The JSON seed file uses a nested structure that differs from the flat
 * CropDocument interface. This function normalizes both shapes so that
 * everything downstream can rely on CropDocument fields.
 */
function normalizeRawCrop(raw: any): CropDocument {
    // If raw already has the flat fields, return as-is (Firestore docs)
    if (raw.waterNeeds && raw.seasonBest) return raw as CropDocument;

    // Map nested JSON seed → flat CropDocument
    const gc = raw.growthConditions || {};
    const rp = raw.riskAndPrevention || {};
    const md = raw.marketDemand || {};
    const soilObj = raw.soil || {};

    return {
        id: raw.id,
        commonNames: raw.commonNames || { en: '', hi: '', te: '', ta: '', kn: '' },
        scientificName: raw.scientificName || '',
        aliases: raw.aliases || [],
        cropType: raw.cropType || 'other',

        seasonBest: raw.seasonBest || raw.seasons || [],
        seasonAvoid: raw.seasonAvoid || [],
        soilBest: raw.soilBest || soilObj.best || [],
        soilBad: raw.soilBad || soilObj.bad || [],
        waterNeeds: raw.waterNeeds || gc.waterRequirement || 'Medium',
        sunlightNeeds: raw.sunlightNeeds || gc.sunlight || 'Full sun',
        tempRangeC: raw.tempRangeC || gc.tempC || { min: 15, max: 35 },
        timeToHarvestDays: raw.timeToHarvestDays || 0,

        marketDemandLevel: raw.marketDemandLevel || (md.seasonal ? 'high' : 'medium'),
        peakDemandMonths: raw.peakDemandMonths || md.peakMonths || [],
        isSeasonalCrop: raw.isSeasonalCrop ?? md.seasonal ?? true,

        growthSteps: raw.growthSteps || [],
        diseaseRisks: raw.diseaseRisks || (rp.diseases || []).map((d: any) => ({
            name: d.name || '',
            symptoms: d.symptoms || d.prevention || '',
            severity: d.severity || 'Medium',
            prevention: d.prevention || '',
            treatment: d.treatment || '',
        })),
        preventionTips: raw.preventionTips || (rp.diseases || []).map((d: any) => d.prevention).filter(Boolean),
        yieldImprovementTips: raw.yieldImprovementTips || [],
        harvestTips: raw.harvestTips || [],

        searchKeywords: raw.searchKeywords || [],
        tags: raw.tags || [],
        lastUpdated: raw.lastUpdated || '',
        source: raw.source || 'seed',
    } as CropDocument;
}

/** Build searchKeywords array from a crop document for Firestore indexing. */
export function buildSearchKeywords(crop: CropDocument): string[] {
    const terms = new Set<string>();
    terms.add(crop.id.toLowerCase());
    for (const name of Object.values(crop.commonNames)) {
        if (name) terms.add(name.toLowerCase());
    }
    for (const alias of crop.aliases) {
        terms.add(alias.toLowerCase());
    }
    for (const part of crop.scientificName.toLowerCase().split(' ')) {
        terms.add(part);
    }
    terms.add(crop.cropType);
    for (const tag of (crop.tags || [])) {
        terms.add(tag.toLowerCase());
    }
    for (const s of (crop.seasonBest || [])) {
        terms.add(s.toLowerCase());
    }
    return [...terms];
}

// ── Read operations ──────────────────────────────────────────────────────────

export async function getCropById(id: string): Promise<CropDocument | null> {
    const db = getDb();
    const docRef = doc(db, CROPS_COLLECTION, id.toLowerCase());

    try {
        const snap = await getDoc(docRef);
        if (snap.exists()) return snap.data() as CropDocument;
    } catch (err) {
        console.warn(`[crops] Firestore getCropById failed for ${id}. Falling back to local data.`, err);
    }

    // Fallback: Local JSON
    try {
        const localData = (await import('@/data/crops_seed.json')).default as unknown as any[];
        const match = localData.find(c => c.id.toLowerCase() === id.toLowerCase());
        return match ? normalizeRawCrop(match) : null;
    } catch {
        return null;
    }
}

export async function searchCrops(
    q: string,
    options?: { maxResults?: number; season?: string; tag?: string; cropType?: string },
): Promise<CropDocument[]> {
    const db = getDb();
    const max = options?.maxResults ?? 10;
    const term = q.toLowerCase().trim();

    // Step 1: Firestore exact term search
    if (term.length >= 2) {
        try {
            const cropsRef = collection(db, CROPS_COLLECTION);
            const firestoreQuery = query(
                cropsRef,
                where('searchKeywords', 'array-contains', term),
                limit(max),
            );
            const snap = await getDocs(firestoreQuery);
            if (!snap.empty) {
                let results = snap.docs.map(d => d.data() as CropDocument);
                results = applyFilters(results, options);
                return results.slice(0, max);
            }
        } catch (err) {
            console.warn('[crops] Firestore search failed, falling back to Fuse.js:', err);
        }
    }

    // Step 2: Fuse.js fuzzy fallback
    const allCrops = await getAllCrops();
    if (!allCrops.length) return [];

    const fuse = new Fuse(allCrops, {
        keys: [
            { name: 'id', weight: 2.0 },
            { name: 'commonNames.en', weight: 2.0 },
            { name: 'commonNames.hi', weight: 1.5 },
            { name: 'commonNames.te', weight: 1.5 },
            { name: 'commonNames.ta', weight: 1.5 },
            { name: 'commonNames.kn', weight: 1.5 },
            { name: 'aliases', weight: 1.5 },
            { name: 'scientificName', weight: 1.0 },
            { name: 'tags', weight: 0.8 },
            { name: 'cropType', weight: 0.8 },
        ],
        threshold: 0.35,
        includeScore: true,
    });

    let results = fuse.search(term).map(r => r.item);
    results = applyFilters(results, options);
    return results.slice(0, max);
}

// ── Cache ────────────────────────────────────────────────────────────────────

let _allCropsCache: { data: CropDocument[]; ts: number } | null = null;
const CACHE_TTL = 5 * 60_000;

export async function getAllCrops(): Promise<CropDocument[]> {
    if (_allCropsCache && Date.now() - _allCropsCache.ts < CACHE_TTL) {
        return _allCropsCache.data;
    }
    const db = getDb();

    let data: CropDocument[] = [];
    try {
        const snap = await getDocs(collection(db, CROPS_COLLECTION));
        data = snap.docs.map(d => d.data() as CropDocument);
    } catch (err) {
        console.warn('[crops] Firestore getAllCrops failed. Falling back to local JSON.', err);
    }

    // Fallback: Local JSON if firestore is empty or gave a permission error
    if (data.length === 0) {
        try {
            const rawData = (await import('@/data/crops_seed.json')).default as unknown as any[];
            data = rawData.map(normalizeRawCrop);
        } catch {
            data = [];
        }
    }

    _allCropsCache = { data, ts: Date.now() };
    return data;
}

function applyFilters(
    crops: CropDocument[],
    options?: { season?: string; tag?: string; cropType?: string },
): CropDocument[] {
    let results = crops;
    if (options?.season) {
        const s = options.season.toLowerCase();
        results = results.filter(c =>
            c.seasonBest.some(cs => cs === s || cs === 'all_year'),
        );
    }
    if (options?.tag) {
        const t = options.tag.toLowerCase();
        results = results.filter(c => c.tags.includes(t));
    }
    if (options?.cropType) {
        results = results.filter(c => c.cropType === options.cropType);
    }
    return results;
}

// ── Seed operation ───────────────────────────────────────────────────────────

export async function seedCropsFromJson(): Promise<number> {
    const seedModule = await import('@/data/crops_seed.json');
    const seedData = seedModule.default as unknown as CropDocument[];
    const db = getDb();
    let count = 0;
    for (const crop of seedData) {
        const docRef = doc(db, CROPS_COLLECTION, crop.id);
        await setDoc(docRef, {
            ...crop,
            searchKeywords: buildSearchKeywords(crop),
        }, { merge: true });
        count++;
    }
    console.log(`[crops] Seeded ${count} crops to Firestore.`);
    return count;
}
