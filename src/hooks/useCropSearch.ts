import { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import { useDebounce } from './useDebounce';
import type { CropDocument } from '@/types/crop';

interface UseCropSearchOptions {
    activeLanguage: keyof CropDocument['commonNames'];
    debounceMs?: number;
    limit?: number;
    cropType?: string;
}

export function useCropSearch(options: UseCropSearchOptions) {
    const { activeLanguage = 'en', debounceMs = 300, limit = 10, cropType } = options;

    const [query, setQuery] = useState('');
    const debouncedQuery = useDebounce(query, debounceMs);

    const [results, setResults] = useState<CropDocument[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // We will lazy-load the master list
    const [localData, setLocalData] = useState<CropDocument[] | null>(null);

    // Initialize/Load local data once
    useEffect(() => {
        let mounted = true;
        import('@/data/crops_seed.json')
            .then((module) => {
                if (!mounted) return;
                // Normalize raw seed data to ensure all fields are accessible for search
                const raw = module.default as unknown as any[];
                const normalized = raw.map((c: any) => {
                    // If already normalized (has waterNeeds + seasonBest), skip
                    if (c.waterNeeds && c.seasonBest) return c as CropDocument;
                    // Otherwise, map nested fields
                    const gc = c.growthConditions || {};
                    const soilObj = c.soil || {};
                    return {
                        ...c,
                        seasonBest: c.seasonBest || c.seasons || [],
                        seasonAvoid: c.seasonAvoid || [],
                        soilBest: c.soilBest || soilObj.best || [],
                        soilBad: c.soilBad || soilObj.bad || [],
                        waterNeeds: c.waterNeeds || gc.waterRequirement || 'Medium',
                        sunlightNeeds: c.sunlightNeeds || gc.sunlight || 'Full sun',
                        searchKeywords: c.searchKeywords || [],
                    } as CropDocument;
                });
                setLocalData(normalized);
            })
            .catch((err) => console.error('Failed to load local crop seed:', err));
        return () => { mounted = false; };
    }, []);

    // Setup Fuse.js instance with language boost
    const fuse = useMemo(() => {
        if (!localData) return null;
        let dataToSearch = localData;

        // Apply static filters to local data if provided
        if (cropType) {
            dataToSearch = dataToSearch.filter(c => c.cropType === cropType);
        }

        return new Fuse(dataToSearch, {
            keys: [
                { name: `commonNames.${activeLanguage}`, weight: 3.0 }, // Huge boost to current lang
                { name: 'commonNames.en', weight: 2.0 },
                { name: 'commonNames.hi', weight: 1.8 },
                { name: 'commonNames.te', weight: 1.8 },
                { name: 'commonNames.ta', weight: 1.8 },
                { name: 'commonNames.kn', weight: 1.8 },
                { name: 'aliases', weight: 1.5 },
                { name: 'id', weight: 1.0 },
                { name: 'scientificName', weight: 0.8 },
                { name: 'searchKeywords', weight: 0.8 },
                { name: 'tags', weight: 0.5 },
            ],
            threshold: 0.35,
            shouldSort: true,
            includeScore: true,
        });
    }, [localData, activeLanguage, cropType]);

    // Perform search
    useEffect(() => {
        let active = true;

        async function performSearch() {
            if (!debouncedQuery.trim()) {
                setResults([]);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);

            try {
                // Tier 1: Client-Side Fuse.js Search
                if (fuse && localData) {
                    const localResults = fuse.search(debouncedQuery).map(res => res.item);
                    if (localResults.length > 0) {
                        if (active) {
                            setResults(localResults.slice(0, limit));
                            setIsLoading(false);
                        }
                        // If we have local results, we skip Firestore fallback to keep it 0ms
                        return;
                    }
                }

                // Tier 2: Server-Side API Fallback (Firestore)
                const searchParams = new URLSearchParams();
                searchParams.set('q', debouncedQuery);
                searchParams.set('limit', String(limit));
                if (cropType) searchParams.set('cropType', cropType);

                const res = await fetch(`/api/crops/search?${searchParams.toString()}`);
                if (!res.ok) throw new Error('API Error');

                const data = await res.json();
                if (active) {
                    setResults(data.results || []);
                }
            } catch (err) {
                console.error('Crop search failed:', err);
                if (active) setResults([]);
            } finally {
                if (active) setIsLoading(false);
            }
        }

        performSearch();

        return () => {
            active = false;
        };
    }, [debouncedQuery, fuse, localData, limit, cropType]);

    return {
        query,
        setQuery,
        results,
        isLoading,
    };
}
