'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import { translateText } from '@/lib/translate';

/**
 * Map of app language codes to BCP-47 speech synthesis lang tags.
 */
const LANG_TO_SPEECH: Record<string, string> = {
    en: 'en-US',
    hi: 'hi-IN',
    te: 'te-IN',
    ta: 'ta-IN',
    kn: 'kn-IN',
    ml: 'ml-IN',
    bn: 'bn-IN',
    pa: 'pa-IN',
    gu: 'gu-IN',
    mr: 'mr-IN',
    ur: 'ur-PK',
    ar: 'ar-SA',
    es: 'es-ES',
    fr: 'fr-FR',
    pt: 'pt-BR',
    de: 'de-DE',
    ru: 'ru-RU',
    zh: 'zh-CN',
    sw: 'sw-KE',
};

/**
 * Finds the best matching voice for a given language tag.
 */
function findVoice(lang: string): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    // Exact match first
    const exact = voices.find(v => v.lang === lang);
    if (exact) return exact;

    // Prefix match (e.g. 'hi' matches 'hi-IN')
    const prefix = lang.split('-')[0].toLowerCase();
    const partial = voices.find(v => v.lang.toLowerCase().startsWith(prefix));
    if (partial) return partial;

    // Default voice
    return voices.find(v => v.default) ?? voices[0] ?? null;
}

/**
 * Split long text into chunks that the speech synthesis can handle.
 * Some browsers have a ~200 char limit per utterance.
 */
function splitForSpeech(text: string, maxLen = 180): string[] {
    if (text.length <= maxLen) return [text];

    const chunks: string[] = [];
    // WebView-safe: avoid regex lookbehind (?<=...) which crashes older Android WebView
    // Instead, split on sentence-ending punctuation followed by whitespace
    const sentences = text.split(/([.!?।॥])\s+/).reduce<string[]>((acc, part, i, arr) => {
        // Rejoin punctuation with the preceding text
        if (i % 2 === 1) {
            // This is a punctuation match — append to previous sentence
            if (acc.length > 0) {
                acc[acc.length - 1] += part;
            }
        } else {
            acc.push(part);
        }
        return acc;
    }, []);
    let current = '';

    for (const sentence of sentences) {
        if (!sentence) continue;
        if ((current + ' ' + sentence).length > maxLen && current) {
            chunks.push(current.trim());
            current = sentence;
        } else {
            current += (current ? ' ' : '') + sentence;
        }
    }
    if (current) chunks.push(current.trim());
    return chunks;
}

export interface UseTTSReturn {
    speaking: boolean;
    loading: boolean;
    supported: boolean;
    speak: (text: string) => void;
    stop: () => void;
    toggle: (text: string) => void;
}

export function useTTS(): UseTTSReturn {
    const { language } = useTranslation();
    const [speaking, setSpeaking] = useState(false);
    const [loading, setLoading] = useState(false);
    const [supported, setSupported] = useState(false);
    const queueRef = useRef<string[]>([]);
    const currentIdxRef = useRef(0);
    const cancelledRef = useRef(false);

    // Check support + preload voices
    useEffect(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            setSupported(true);
            window.speechSynthesis.getVoices();
            window.speechSynthesis.onvoiceschanged = () => {
                window.speechSynthesis.getVoices();
            };
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const stop = useCallback(() => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        cancelledRef.current = true;
        try { window.speechSynthesis.cancel(); } catch { /* WebView may throw */ }
        queueRef.current = [];
        currentIdxRef.current = 0;
        setSpeaking(false);
        setLoading(false);
    }, []);

    /**
     * Speak a single chunk directly — no translation.
     * Returns a promise that resolves when the chunk finishes speaking.
     */
    const speakChunk = useCallback((text: string, speechLang: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
                reject(new Error('No TTS'));
                return;
            }

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = speechLang;
            utterance.rate = 0.92;
            utterance.pitch = 1;

            const voice = findVoice(speechLang);
            if (voice) utterance.voice = voice;

            utterance.onend = () => resolve();
            utterance.onerror = (e) => {
                // 'interrupted' is normal when we cancel
                if (e.error === 'interrupted' || e.error === 'canceled') {
                    resolve();
                } else {
                    reject(e);
                }
            };

            window.speechSynthesis.speak(utterance);
        });
    }, []);

    const speak = useCallback(async (text: string) => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        if (!text.trim()) return;

        // Cancel any previous speech
        window.speechSynthesis.cancel();
        cancelledRef.current = false;

        const speechLang = LANG_TO_SPEECH[language] || 'en-US';

        if (language === 'en') {
            // English — speak directly in chunks
            setSpeaking(true);
            const chunks = splitForSpeech(text);
            try {
                for (const chunk of chunks) {
                    if (cancelledRef.current) break;
                    await speakChunk(chunk, speechLang);
                }
            } catch { /* ignore */ }
            if (!cancelledRef.current) setSpeaking(false);
            return;
        }

        // Non-English — translate first, then speak
        setSpeaking(true);
        setLoading(true);

        try {
            // Translate the entire text at once
            const translated = await translateText(text, language);
            setLoading(false);

            if (cancelledRef.current) return;

            // Split into speakable chunks
            const chunks = splitForSpeech(translated);

            for (const chunk of chunks) {
                if (cancelledRef.current) break;
                await speakChunk(chunk, speechLang);
            }
        } catch {
            // Translation failed — try speaking English
            setLoading(false);
            if (!cancelledRef.current) {
                try {
                    const chunks = splitForSpeech(text);
                    for (const chunk of chunks) {
                        if (cancelledRef.current) break;
                        await speakChunk(chunk, 'en-US');
                    }
                } catch { /* ignore */ }
            }
        }

        if (!cancelledRef.current) setSpeaking(false);
    }, [language, speakChunk]);

    const toggle = useCallback((text: string) => {
        if (speaking || loading) {
            stop();
        } else {
            speak(text);
        }
    }, [speaking, loading, speak, stop]);

    return { speaking, loading, supported, speak, stop, toggle };
}
