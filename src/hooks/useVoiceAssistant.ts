'use client';

/**
 * @fileOverview Voice Assistant hook — centralizes Speech-to-Text (STT) and
 * Text-to-Speech (TTS) logic for the Fasal AI voice interface.
 *
 * STT: Web Speech API (SpeechRecognition)
 * TTS: Browser SpeechSynthesis API
 *
 * Supports: en-IN, hi-IN, te-IN, ta-IN, kn-IN, mr-IN
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// ─── SpeechRecognition shim ────────────────────────────────────────────────────
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

// ─── Language mappings ─────────────────────────────────────────────────────────

/** Map app language codes → BCP-47 locale for SpeechRecognition */
const STT_LANG_MAP: Record<string, string> = {
    en: 'en-IN',
    hi: 'hi-IN',
    te: 'te-IN',
    ta: 'ta-IN',
    kn: 'kn-IN',
    mr: 'mr-IN',
};

/** Map app language codes → BCP-47 locale for SpeechSynthesis */
const TTS_LANG_MAP: Record<string, string> = {
    en: 'en-IN',
    hi: 'hi-IN',
    te: 'te-IN',
    ta: 'ta-IN',
    kn: 'kn-IN',
    mr: 'mr-IN',
};

// ─── Offline cache helpers ─────────────────────────────────────────────────────

const VOICE_CACHE_PREFIX = 'vc:';
const MAX_CACHED_RESPONSES = 50;

function cacheKey(query: string): string {
    return `${VOICE_CACHE_PREFIX}${query.trim().toLowerCase().slice(0, 200)}`;
}

export function cacheResponse(query: string, reply: string): void {
    if (typeof window === 'undefined' || !query.trim()) return;
    try {
        localStorage.setItem(cacheKey(query), JSON.stringify({
            reply,
            timestamp: Date.now(),
        }));
        // Prune old entries if too many
        const keys = Object.keys(localStorage).filter(k => k.startsWith(VOICE_CACHE_PREFIX));
        if (keys.length > MAX_CACHED_RESPONSES) {
            // Remove oldest entries
            const entries = keys.map(k => {
                try {
                    const v = JSON.parse(localStorage.getItem(k) || '{}');
                    return { key: k, ts: v.timestamp || 0 };
                } catch { return { key: k, ts: 0 }; }
            }).sort((a, b) => a.ts - b.ts);
            entries.slice(0, entries.length - MAX_CACHED_RESPONSES).forEach(e => {
                localStorage.removeItem(e.key);
            });
        }
    } catch { /* localStorage full */ }
}

export function getCachedResponse(query: string): string | null {
    if (typeof window === 'undefined' || !query.trim()) return null;
    try {
        const raw = localStorage.getItem(cacheKey(query));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed.reply || null;
    } catch {
        return null;
    }
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export interface VoiceAssistantState {
    // STT
    isListening: boolean;
    transcript: string;
    interimTranscript: string;
    sttSupported: boolean;
    sttError: string | null;
    startListening: (lang?: string) => void;
    stopListening: () => void;

    // TTS
    isSpeaking: boolean;
    ttsSupported: boolean;
    speak: (text: string, lang?: string) => void;
    stopSpeaking: () => void;
    repeatLast: () => void;

    // Offline
    cacheResponse: (query: string, reply: string) => void;
    getCachedResponse: (query: string) => string | null;
}

export function useVoiceAssistant(defaultLang: string = 'en'): VoiceAssistantState {
    // ── STT state ──
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [sttSupported, setSttSupported] = useState(false);
    const [sttError, setSttError] = useState<string | null>(null);
    const recognitionRef = useRef<any>(null);

    // ── TTS state ──
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [ttsSupported, setTtsSupported] = useState(false);
    const lastSpokenRef = useRef<{ text: string; lang: string } | null>(null);

    // ── Feature detection ──
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
        setSttSupported(!!SR);
        setTtsSupported('speechSynthesis' in window);
    }, []);

    // ── Cleanup on unmount ──
    useEffect(() => {
        return () => {
            recognitionRef.current?.abort();
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    // ── STT methods ──

    const startListening = useCallback((lang?: string) => {
        const SR = typeof window !== 'undefined'
            ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
            : null;
        if (!SR) {
            setSttError('Speech recognition is not supported on this browser.');
            return;
        }

        // Stop any existing recognition
        recognitionRef.current?.abort();
        setSttError(null);
        setTranscript('');
        setInterimTranscript('');

        const rec = new SR();
        rec.continuous = false;
        rec.interimResults = true;
        rec.maxAlternatives = 1;

        const resolvedLang = lang || defaultLang;
        rec.lang = STT_LANG_MAP[resolvedLang] || STT_LANG_MAP['en'];

        rec.onresult = (e: any) => {
            let finalText = '';
            let interimText = '';

            for (let i = 0; i < e.results.length; i++) {
                const result = e.results[i];
                if (result.isFinal) {
                    finalText += result[0].transcript;
                } else {
                    interimText += result[0].transcript;
                }
            }

            if (finalText) {
                setTranscript(finalText);
                setInterimTranscript('');
            } else {
                setInterimTranscript(interimText);
            }
        };

        rec.onend = () => {
            setIsListening(false);
        };

        rec.onerror = (e: any) => {
            setIsListening(false);
            switch (e.error) {
                case 'not-allowed':
                    setSttError('Microphone access was denied. Please allow microphone access.');
                    break;
                case 'no-speech':
                    setSttError('No speech was detected. Please try again.');
                    break;
                case 'network':
                    setSttError('Network error. Please check your internet connection.');
                    break;
                default:
                    setSttError(`Speech recognition error: ${e.error}`);
            }
        };

        recognitionRef.current = rec;
        rec.start();
        setIsListening(true);
    }, [defaultLang]);

    const stopListening = useCallback(() => {
        recognitionRef.current?.stop();
        setIsListening(false);
    }, []);

    // ── TTS methods ──

    const speak = useCallback((text: string, lang?: string) => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

        // ── Ensure we have a proper string ──
        const inputText = String(text || '');
        console.log('[TTS] speak() called with text:', inputText);
        console.log('[TTS] text type:', typeof text, '| length:', inputText.length);

        if (!inputText.trim()) {
            console.warn('[TTS] Empty text passed to speak(), skipping');
            return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const resolvedLang = lang || defaultLang;
        const bcp47 = TTS_LANG_MAP[resolvedLang] || TTS_LANG_MAP['en'];

        // Clean text for speech: remove markdown bold, bullets, etc.
        const cleanText = inputText
            .replace(/\*\*(.*?)\*\*/g, '$1')  // remove **bold** markers but keep content
            .replace(/^[-•]\s+/gm, '')         // remove bullet markers
            .replace(/\n{2,}/g, '. ')           // collapse double newlines to pause
            .replace(/\n/g, '. ')               // newlines to pause
            .trim();

        console.log('[TTS] Clean text to speak:', cleanText);
        console.log('[TTS] Language:', bcp47);

        if (!cleanText || cleanText.length < 3) {
            console.warn('[TTS] Cleaned text is too short, speaking raw input instead');
            // Fallback: speak the raw input
            const utterance = new SpeechSynthesisUtterance(String(inputText));
            utterance.lang = bcp47;
            utterance.rate = 0.9;
            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);
            lastSpokenRef.current = { text: inputText, lang: bcp47 };
            window.speechSynthesis.speak(utterance);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = bcp47;
        utterance.rate = 0.9;  // Slightly slower for farmers
        utterance.pitch = 1.0;

        // Try to find a matching voice
        const voices = window.speechSynthesis.getVoices();
        const matchingVoice = voices.find(v => v.lang === bcp47)
            || voices.find(v => v.lang.startsWith(resolvedLang));
        if (matchingVoice) {
            utterance.voice = matchingVoice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = (e) => {
            console.error('[TTS] Speech error:', e);
            setIsSpeaking(false);
        };

        lastSpokenRef.current = { text: cleanText, lang: bcp47 };
        window.speechSynthesis.speak(utterance);
    }, [defaultLang]);

    const stopSpeaking = useCallback(() => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }, []);

    const repeatLast = useCallback(() => {
        if (!lastSpokenRef.current) return;
        const { text, lang } = lastSpokenRef.current;

        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.9;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const matchingVoice = voices.find(v => v.lang === lang)
            || voices.find(v => v.lang.startsWith(lang.split('-')[0]));
        if (matchingVoice) {
            utterance.voice = matchingVoice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    }, []);

    return {
        // STT
        isListening,
        transcript,
        interimTranscript,
        sttSupported,
        sttError,
        startListening,
        stopListening,

        // TTS
        isSpeaking,
        ttsSupported,
        speak,
        stopSpeaking,
        repeatLast,

        // Offline
        cacheResponse,
        getCachedResponse,
    };
}
