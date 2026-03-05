'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import { translateText, getCachedSync } from '@/lib/translate';

/**
 * React hook that translates a string into the user's currently selected language.
 *
 * Performance characteristics:
 * - Cache hit  → zero re-render, translation shown on first paint (no flicker)
 * - Cache miss → previous translation stays visible while API loads (~300ms)
 * - lang='en'  → returns text immediately, no API call ever
 * - Offline    → cached value already in localStorage, served instantly
 * - API fails  → silently stays on last good value (English or prev translation)
 *
 * Usage:
 *   const name = useTranslate('Leaf Rust');
 *   // → "పత్తి తుప్పు" when language is 'te' (instant on cache hit)
 */
export function useTranslate(text: string): string {
    const { language } = useTranslation();

    // Initialise synchronously from cache — eliminates first-paint flicker entirely
    const [translated, setTranslated] = useState<string>(() => {
        if (!text || language === 'en' || language === 'auto') return text;
        return getCachedSync(text, language) ?? text;
    });

    // Track previous text+lang so we don't show English while loading
    const prevRef = useRef<string>(translated);

    useEffect(() => {
        if (!text) { setTranslated(''); return; }
        if (language === 'en' || language === 'auto') { setTranslated(text); return; }

        // Check sync cache first — if hit, apply immediately with no async needed
        const synced = getCachedSync(text, language);
        if (synced !== null) {
            setTranslated(synced);
            prevRef.current = synced;
            return;
        }

        // Cache miss — keep showing last good value (no snap back to English)
        // prevRef.current stays as whatever was last shown

        let cancelled = false;
        translateText(text, language).then(result => {
            if (!cancelled) {
                setTranslated(result);
                prevRef.current = result;
            }
        });

        return () => { cancelled = true; };
    }, [text, language]);

    return translated;
}
