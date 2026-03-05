'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
    detectAndGeocodeLocation,
    getPermissionStatus,
    type GeoRegion,
} from '@/lib/geolocation';

// ── Types ────────────────────────────────────────────────────────────────────

export interface RegionData {
    country: string;
    countryCode: string;
    state: string;
    city: string;
    source: 'gps' | 'manual' | 'none';
}

export interface GPSData {
    lat: number;
    lng: number;
}

export interface RegionState {
    region: RegionData;
    gps: GPSData | null;
    isLoading: boolean;
    isDetecting: boolean;
    hasRegion: boolean;
    /** @deprecated kept for compat — always false now */
    showPrompt: boolean;
}

export interface RegionActions {
    detectGPS: () => Promise<void>;
    setManualRegion: (country: string, countryCode: string, state: string, city: string) => Promise<void>;
    clearRegion: () => void;
    dismissPrompt: () => void;
}

type RegionContextType = RegionState & RegionActions;

const defaultRegion: RegionData = {
    country: '',
    countryCode: '',
    state: '',
    city: '',
    source: 'none',
};

// ── Context ──────────────────────────────────────────────────────────────────

const RegionContext = createContext<RegionContextType | null>(null);

export function useRegion(): RegionContextType {
    const ctx = useContext(RegionContext);
    if (!ctx) throw new Error('useRegion must be used within RegionProvider');
    return ctx;
}

// ── LocalStorage helpers ─────────────────────────────────────────────────────

const LS_KEY_REGION = 'croplyze_region';
const LS_KEY_GPS = 'croplyze_gps';
const LS_KEY_PROMPT_DISMISSED = 'croplyze_region_prompt_dismissed';

function loadFromLS<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

function saveToLS(key: string, value: any) {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function RegionProvider({ children }: { children: React.ReactNode }) {
    const { user } = useUser();
    const db = useFirestore();

    const [region, setRegion] = useState<RegionData>(defaultRegion);
    const [gps, setGps] = useState<GPSData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDetecting, setIsDetecting] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);
    const initialized = useRef(false);

    const hasRegion = region.source !== 'none' && region.country !== '';

    // ── Persist to Firestore ─────────────────────────────────────────────────

    const persistToFirestore = useCallback(async (r: RegionData, g: GPSData | null) => {
        if (!user || !db) return;
        try {
            const ref = doc(db, `users/${user.uid}`);
            await setDoc(ref, {
                region: {
                    country: r.country,
                    countryCode: r.countryCode,
                    state: r.state,
                    city: r.city,
                    source: r.source,
                },
                ...(g ? { gps: { lat: g.lat, lng: g.lng } } : {}),
                regionUpdatedAt: serverTimestamp(),
            }, { merge: true });
        } catch (err) {
            console.warn('[region] Failed to persist to Firestore:', err);
        }
    }, [user, db]);

    // ── Load region on mount ─────────────────────────────────────────────────

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        async function init() {
            setIsLoading(true);

            // Step 1: Try Firestore (if logged in)
            if (user && db) {
                try {
                    const userDoc = await getDoc(doc(db, `users/${user.uid}`));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        if (data?.region?.country) {
                            const r: RegionData = {
                                country: data.region.country,
                                countryCode: data.region.countryCode || '',
                                state: data.region.state || '',
                                city: data.region.city || '',
                                source: data.region.source || 'manual',
                            };
                            const g: GPSData | null = data.gps ? { lat: data.gps.lat, lng: data.gps.lng } : null;
                            setRegion(r);
                            setGps(g);
                            saveToLS(LS_KEY_REGION, r);
                            if (g) saveToLS(LS_KEY_GPS, g);
                            setIsLoading(false);
                            return;
                        }
                    }
                } catch (err) {
                    console.warn('[region] Firestore load failed:', err);
                }
            }

            // Step 2: Try localStorage
            const cachedRegion = loadFromLS<RegionData>(LS_KEY_REGION);
            if (cachedRegion && cachedRegion.country) {
                setRegion(cachedRegion);
                setGps(loadFromLS<GPSData>(LS_KEY_GPS));
                setIsLoading(false);
                return;
            }

            // Step 3: No saved region — auto-detect GPS silently
            setIsLoading(false);

            // Auto-detect GPS in the background (no popup)
            try {
                const geo: GeoRegion = await detectAndGeocodeLocation();
                const r: RegionData = {
                    country: geo.country,
                    countryCode: geo.countryCode,
                    state: geo.state,
                    city: geo.city,
                    source: 'gps',
                };
                const g: GPSData = { lat: geo.lat, lng: geo.lng };
                setRegion(r);
                setGps(g);
                saveToLS(LS_KEY_REGION, r);
                saveToLS(LS_KEY_GPS, g);
                saveToLS(LS_KEY_PROMPT_DISMISSED, true);
                // Persist to Firestore if user is logged in
                if (user && db) {
                    try {
                        const ref = doc(db, `users/${user.uid}`);
                        await setDoc(ref, {
                            region: { country: r.country, countryCode: r.countryCode, state: r.state, city: r.city, source: r.source },
                            gps: { lat: g.lat, lng: g.lng },
                            regionUpdatedAt: serverTimestamp(),
                        }, { merge: true });
                    } catch { /* silent */ }
                }
            } catch {
                // GPS failed/denied — stay without region, user can set manually
                console.warn('[region] Auto-detect failed, user can set manually');
            }
        }

        init();
    }, [user, db]);

    // ── GPS Detection ────────────────────────────────────────────────────────

    const detectGPSAction = useCallback(async () => {
        setIsDetecting(true);
        setShowPrompt(false);
        try {
            const geo: GeoRegion = await detectAndGeocodeLocation();
            const r: RegionData = {
                country: geo.country,
                countryCode: geo.countryCode,
                state: geo.state,
                city: geo.city,
                source: 'gps',
            };
            const g: GPSData = { lat: geo.lat, lng: geo.lng };

            setRegion(r);
            setGps(g);
            saveToLS(LS_KEY_REGION, r);
            saveToLS(LS_KEY_GPS, g);
            saveToLS(LS_KEY_PROMPT_DISMISSED, true);
            await persistToFirestore(r, g);
        } catch (err: any) {
            console.warn('[region] GPS detection failed:', err?.message);
            // If denied, show manual selector prompt
            if (err?.message === 'PERMISSION_DENIED') {
                setShowPrompt(false);
                saveToLS(LS_KEY_PROMPT_DISMISSED, true);
            }
        } finally {
            setIsDetecting(false);
        }
    }, [persistToFirestore]);

    // ── Manual Region Set ────────────────────────────────────────────────────

    const setManualRegion = useCallback(async (
        country: string, countryCode: string, state: string, city: string,
    ) => {
        const r: RegionData = { country, countryCode, state, city, source: 'manual' };
        setRegion(r);
        setGps(null);
        setShowPrompt(false);
        saveToLS(LS_KEY_REGION, r);
        saveToLS(LS_KEY_PROMPT_DISMISSED, true);
        await persistToFirestore(r, null);
    }, [persistToFirestore]);

    // ── Clear ────────────────────────────────────────────────────────────────

    const clearRegion = useCallback(() => {
        setRegion(defaultRegion);
        setGps(null);
        if (typeof window !== 'undefined') {
            localStorage.removeItem(LS_KEY_REGION);
            localStorage.removeItem(LS_KEY_GPS);
            localStorage.removeItem(LS_KEY_PROMPT_DISMISSED);
        }
    }, []);

    const dismissPrompt = useCallback(() => {
        setShowPrompt(false);
        saveToLS(LS_KEY_PROMPT_DISMISSED, true);
    }, []);

    return (
        <RegionContext.Provider value={{
            region, gps, isLoading, isDetecting, hasRegion, showPrompt,
            detectGPS: detectGPSAction, setManualRegion, clearRegion, dismissPrompt,
        }}>
            {children}
        </RegionContext.Provider>
    );
}
