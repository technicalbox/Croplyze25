/**
 * Google Translate helper — using the Chrome extension endpoint.
 *
 * API: https://clients5.google.com/translate_a/t?client=dict-chrome-ex&q=TEXT&sl=en&tl=LANG
 * Free, no API key required.
 *
 * Cache: localStorage key "tz:{lang}:{hash}" → translated string.
 * On any error, returns the original English text.
 */

const CACHE_PREFIX = 'tz:';

// ── Cache helpers ────────────────────────────────────────────────────────────

function cacheKey(text: string, lang: string): string {
    // Use first 200 chars to keep key size reasonable
    return `${CACHE_PREFIX}${lang}:${text.trim().slice(0, 200)}`;
}

function getCached(text: string, lang: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
        return localStorage.getItem(cacheKey(text, lang));
    } catch {
        return null;
    }
}

export function getCachedSync(text: string, lang: string): string | null {
    return getCached(text, lang);
}

function setCached(text: string, lang: string, value: string): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(cacheKey(text, lang), value);
    } catch { /* localStorage full */ }
}

export function clearTranslationCache(): void {
    if (typeof window === 'undefined') return;
    try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
        keys.forEach(k => localStorage.removeItem(k));
    } catch { /* ignore */ }
}

// ── Google Translate (Chrome extension endpoint) ─────────────────────────────

/**
 * WebView-safe timeout signal — AbortSignal.timeout() is NOT available in
 * older Android WebView (< Chrome 103). Use AbortController + setTimeout.
 */
function createTimeoutSignal(ms: number): { signal: AbortSignal; clear: () => void } {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

async function googleTranslate(text: string, targetLang: string): Promise<string> {
    // Primary: Chrome dict extension endpoint
    const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl=${targetLang}&q=${encodeURIComponent(text)}`;

    try {
        const timeout1 = createTimeoutSignal(8000);
        try {
            const res = await fetch(url, { signal: timeout1.signal });
            timeout1.clear();
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            // Response can be: string, [string], [[string, string]], or array of arrays
            if (typeof data === 'string') return data;
            if (Array.isArray(data)) {
                if (typeof data[0] === 'string') return data[0];
                if (Array.isArray(data[0])) {
                    // Format: [["translated", "original"], ...]
                    return data.map((item: string[]) => item[0]).join('');
                }
            }
            throw new Error('Unexpected response');
        } catch {
            timeout1.clear();
            throw new Error('primary failed');
        }
    } catch {
        // Fallback: googleapis endpoint
        try {
            const fallbackUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
            const timeout2 = createTimeoutSignal(8000);
            try {
                const res = await fetch(fallbackUrl, { signal: timeout2.signal });
                timeout2.clear();
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (Array.isArray(data) && Array.isArray(data[0])) {
                    return data[0]
                        .filter((seg: unknown) => Array.isArray(seg) && seg[0])
                        .map((seg: string[]) => seg[0])
                        .join('');
                }
            } catch {
                timeout2.clear();
            }
        } catch { /* both failed */ }
    }

    return text;
}

// ── Main function ────────────────────────────────────────────────────────────

export async function translateText(text: string, targetLang: string): Promise<string> {
    if (!text || !text.trim()) return text;
    if (targetLang === 'en' || targetLang === 'auto' || !targetLang) return text;

    const cached = getCached(text, targetLang);
    if (cached !== null) return cached;

    try {
        const translation = await googleTranslate(text.trim(), targetLang);
        if (translation && translation !== text) {
            setCached(text, targetLang, translation);
            return translation;
        }
        return text;
    } catch {
        return text;
    }
}
