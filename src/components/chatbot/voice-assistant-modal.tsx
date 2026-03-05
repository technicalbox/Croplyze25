'use client';

/**
 * @fileOverview Full-screen Voice Assistant modal — farmer-friendly voice interface
 * for Fasal AI. Large mic button, visual feedback, auto TTS playback.
 *
 * KEY DESIGN: This modal makes a DIRECT fetch() to /api/chat/message and
 * speaks the `data.reply` field immediately. No sendMessage, no useEffect
 * chains, no stale closures.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Mic, MicOff, Volume2, VolumeX, RotateCcw, Keyboard, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useChatbot } from './chat-provider';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { useTranslation } from '@/lib/i18n';
import { useUser } from '@/firebase';

// ─── Language pills ───────────────────────────────────────────────────────────

const VOICE_LANGUAGES = [
    { code: 'en', label: 'EN', nativeLabel: 'English' },
    { code: 'hi', label: 'हिं', nativeLabel: 'हिन्दी' },
    { code: 'te', label: 'తె', nativeLabel: 'తెలుగు' },
    { code: 'ta', label: 'தமி', nativeLabel: 'தமிழ்' },
    { code: 'kn', label: 'ಕನ', nativeLabel: 'ಕನ್ನಡ' },
    { code: 'mr', label: 'मरा', nativeLabel: 'मराठी' },
];

// ─── TTS language map ─────────────────────────────────────────────────────────

const TTS_LANG_MAP: Record<string, string> = {
    en: 'en-IN', hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN', kn: 'kn-IN', mr: 'mr-IN',
};

// ─── Voice states ─────────────────────────────────────────────────────────────

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

// ─── Pulse rings animation ────────────────────────────────────────────────────

function PulseRings({ active }: { active: boolean }) {
    if (!active) return null;
    return (
        <>
            {[0, 1, 2].map(i => (
                <span
                    key={i}
                    className="absolute inset-0 rounded-full border-2 border-green-400/40"
                    style={{
                        animation: `voicePulse 2s ${i * 0.4}s ease-out infinite`,
                    }}
                />
            ))}
        </>
    );
}

// ─── Direct TTS function (standalone, no React dependency) ───────────────────

function speakDirectly(text: string, langCode: string): void {
    if (typeof window === 'undefined') return;

    // Cancel any ongoing speech
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    const speechLang = TTS_LANG_MAP[langCode] || 'en-IN';

    // Clean markdown formatting for natural speech
    const cleanText = String(text)
        .replace(/\*\*(.*?)\*\*/g, '$1')    // remove **bold** markers, keep content
        .replace(/^[-•]\s+/gm, '')           // remove bullet markers
        .replace(/\n{2,}/g, '. ')            // collapse double newlines to pause
        .replace(/\n/g, '. ')                // single newlines to pause
        .trim();

    console.log('[Voice TTS] Speaking text:', cleanText.substring(0, 200));
    console.log('[Voice TTS] Language:', speechLang, '| langCode:', langCode);

    if (!cleanText) return;

    // For non-English Indian languages, use Google Translate TTS (reliable for hi, te, ta, kn, mr)
    // Browser SpeechSynthesis often lacks Indian language voices on Windows
    if (langCode !== 'en') {
        console.log('[Voice TTS] Using Google Translate TTS for', langCode);
        speakWithGoogleTTS(cleanText, langCode);
        return;
    }

    // For English, use browser SpeechSynthesis (high quality)
    if (!('speechSynthesis' in window)) return;

    const speech = new SpeechSynthesisUtterance(cleanText);
    speech.lang = speechLang;
    speech.rate = 0.9;

    const voices = window.speechSynthesis.getVoices();
    const match = voices.find(v => v.lang === speechLang)
        || voices.find(v => v.lang.startsWith(langCode));
    if (match) speech.voice = match;

    window.speechSynthesis.speak(speech);
}

/**
 * Speak text using Google Translate's TTS endpoint.
 * Supports all Indian languages reliably (hi, te, ta, kn, mr, etc.)
 * Splits long text into chunks ≤200 chars (Google's limit per request).
 */
function speakWithGoogleTTS(text: string, langCode: string): void {
    // Google Translate TTS has a ~200 char limit per request
    const MAX_CHUNK = 200;
    const chunks: string[] = [];

    // Split text into sentence-based chunks
    const sentences = text.split(/(?<=[.।!?])\s+/);
    let currentChunk = '';

    for (const sentence of sentences) {
        if ((currentChunk + ' ' + sentence).length > MAX_CHUNK) {
            if (currentChunk) chunks.push(currentChunk.trim());
            // If a single sentence is too long, split by commas
            if (sentence.length > MAX_CHUNK) {
                const parts = sentence.match(new RegExp(`.{1,${MAX_CHUNK}}`, 'g')) || [sentence];
                chunks.push(...parts);
            } else {
                currentChunk = sentence;
            }
        } else {
            currentChunk = currentChunk ? currentChunk + ' ' + sentence : sentence;
        }
    }
    if (currentChunk) chunks.push(currentChunk.trim());

    console.log('[Voice TTS] Google TTS chunks:', chunks.length);

    // Play chunks sequentially
    let index = 0;

    function playNextChunk() {
        if (index >= chunks.length) return;

        const chunk = encodeURIComponent(chunks[index]);
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${chunk}`;

        const audio = new Audio(url);
        audio.playbackRate = 0.9;

        audio.onended = () => {
            index++;
            playNextChunk();
        };

        audio.onerror = (e) => {
            console.error('[Voice TTS] Google TTS error on chunk', index, e);
            index++;
            playNextChunk(); // Skip failed chunk, try next
        };

        audio.play().catch(err => {
            console.error('[Voice TTS] Play failed:', err);
            // Fallback to browser SpeechSynthesis if Google TTS is blocked
            if ('speechSynthesis' in window) {
                console.log('[Voice TTS] Falling back to browser SpeechSynthesis');
                const speech = new SpeechSynthesisUtterance(chunks.join(' '));
                speech.lang = TTS_LANG_MAP[langCode] || 'en-IN';
                speech.rate = 0.9;
                window.speechSynthesis.speak(speech);
            }
        });
    }

    playNextChunk();
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface VoiceAssistantModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function VoiceAssistantModal({ isOpen, onClose }: VoiceAssistantModalProps) {
    const { language } = useTranslation();
    const { user } = useUser();
    const { setVoiceLanguage } = useChatbot();
    const voice = useVoiceAssistant(language);

    const [voiceLang, setVoiceLangState] = useState(language || 'en');
    const [voiceState, setVoiceState] = useState<VoiceState>('idle');
    const [lastAiReply, setLastAiReply] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);

    // Ref always holds the latest voiceLang — safe to read inside async callbacks
    const voiceLangRef = useRef(voiceLang);
    // Prevent duplicate sends
    const hasSentRef = useRef(false);

    // Wrapper that updates both state (for UI) and ref (for async operations)
    const setVoiceLang = useCallback((code: string) => {
        setVoiceLangState(code);
        voiceLangRef.current = code;
    }, []);

    // Sync voiceLang to the ChatProvider
    useEffect(() => {
        if (isOpen) setVoiceLanguage(voiceLang);
    }, [voiceLang, isOpen, setVoiceLanguage]);

    // Clear the override when modal closes
    useEffect(() => {
        if (!isOpen) setVoiceLanguage(null);
    }, [isOpen, setVoiceLanguage]);

    // Lock body scroll
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // ═══════════════════════════════════════════════════════════════════════════
    // CORE: Direct API call + TTS — no sendMessage, no stale closures
    // Flow: user voice → STT → fetch API → get data.reply → speak(data.reply)
    // ═══════════════════════════════════════════════════════════════════════════

    const sendAndSpeak = useCallback(async (userText: string) => {
        if (!userText.trim() || isSending || !user) return;

        const currentLang = voiceLangRef.current;
        setIsSending(true);
        setVoiceState('processing');

        console.log('[Voice] ─── New query ───');
        console.log('[Voice] User said:', userText);
        console.log('[Voice] Language:', currentLang);

        try {
            // --- Step 1: Call the chatbot API directly ---
            const response = await fetch('/api/chat/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.uid,
                },
                body: JSON.stringify({
                    message: userText,
                    language: currentLang,
                    chatHistory: [],
                }),
            });

            if (!response.ok) {
                console.error('[Voice] API error:', response.status);
                setLastAiReply('Sorry, could not connect. Please try again.');
                setVoiceState('idle');
                return;
            }

            // --- Step 2: Parse the response ---
            const data = await response.json();
            console.log('[Voice] FULL API RESPONSE:', JSON.stringify(data));

            // --- Step 3: Extract the AI response text ---
            const aiResponse: string =
                data.reply ||
                data.message ||
                data.text ||
                data.response ||
                data.answer ||
                'Sorry, I could not generate a response.';

            console.log('[Voice] AI Response:', aiResponse);
            console.log('[Voice] Type:', typeof aiResponse, '| Length:', aiResponse.length);

            // --- Step 4: Display the response ---
            setLastAiReply(aiResponse);

            // --- Step 5: Cache for offline ---
            voice.cacheResponse(userText, aiResponse);

            // --- Step 6: SPEAK the actual AI response ---
            setVoiceState('speaking');
            speakDirectly(aiResponse, currentLang);

        } catch (err) {
            console.error('[Voice] Failed:', err);
            setLastAiReply('Sorry, could not connect. Please try again.');
            setVoiceState('idle');
        } finally {
            setIsSending(false);
        }
    }, [isSending, user, voice]);

    // ─── Auto-send when user stops speaking ──────────────────────────────────

    // Reset the "sent" flag when listening starts
    useEffect(() => {
        if (voice.isListening) {
            hasSentRef.current = false;
        }
    }, [voice.isListening]);

    // When listening stops and we have a transcript, send it
    useEffect(() => {
        if (!voice.isListening && voice.transcript && !hasSentRef.current && !isSending) {
            const query = voice.transcript.trim();
            if (query) {
                hasSentRef.current = true;
                sendAndSpeak(query);
            }
        }
    }, [voice.isListening, voice.transcript, isSending, sendAndSpeak]);

    // ─── Detect when TTS finishes ───────────────────────────────────────────

    useEffect(() => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        const interval = setInterval(() => {
            if (voiceState === 'speaking' && !window.speechSynthesis.speaking) {
                setVoiceState('idle');
            }
        }, 300);
        return () => clearInterval(interval);
    }, [voiceState]);

    // Handle mic button press
    const handleMicPress = useCallback(() => {
        haptics.medium();
        if (voice.isListening) {
            voice.stopListening();
        } else {
            // Stop any ongoing TTS
            window.speechSynthesis?.cancel();
            voice.stopSpeaking();
            voice.startListening(voiceLang);
        }
    }, [voice, voiceLang]);

    // Handle repeat — re-speak the last AI reply
    const handleRepeat = useCallback(() => {
        haptics.light();
        if (lastAiReply) {
            speakDirectly(lastAiReply, voiceLangRef.current);
            setVoiceState('speaking');
        }
    }, [lastAiReply]);

    if (!isOpen) return null;

    const currentDisplay = voice.isListening
        ? (voice.interimTranscript || voice.transcript || '')
        : voice.transcript;

    return (
        <div
            className={cn(
                'fixed inset-0 z-50 flex flex-col',
                'animate-in slide-in-from-bottom-full duration-300 ease-out',
                'bg-[#F0FDF4] dark:bg-[#062C21] transition-colors duration-500'
            )}
        >
            {/* Ambient glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[60vh] bg-green-500/15 dark:bg-green-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-400/20 dark:bg-emerald-600/10 blur-[100px] rounded-full" />
            </div>

            {/* CSS animations */}
            <style>{`
                @keyframes voicePulse {
                    0% { transform: scale(1); opacity: 0.6; }
                    100% { transform: scale(2.5); opacity: 0; }
                }
                @keyframes voiceFloat {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-6px); }
                }
                @keyframes voiceGlow {
                    0%, 100% { box-shadow: 0 0 30px rgba(74,222,128,0.2); }
                    50% { box-shadow: 0 0 60px rgba(74,222,128,0.5); }
                }
            `}</style>

            {/* ── Header ──────────────────────────────────────────────────── */}
            <header className="relative z-10 flex-none px-4 pt-14 pb-3 flex items-center justify-between">
                <button
                    onClick={() => { haptics.light(); onClose(); window.speechSynthesis?.cancel(); voice.stopListening(); }}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white/40 dark:bg-black/20 border border-white/30 dark:border-white/10 backdrop-blur-md active:scale-95 transition-transform"
                >
                    <X className="h-5 w-5 text-gray-700 dark:text-white" />
                </button>

                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">Voice Mode</span>
                </div>

                <button
                    onClick={() => { haptics.light(); onClose(); }}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white/40 dark:bg-black/20 border border-white/30 dark:border-white/10 backdrop-blur-md active:scale-95 transition-transform"
                    title="Switch to text chat"
                >
                    <Keyboard className="h-5 w-5 text-gray-700 dark:text-white" />
                </button>
            </header>

            {/* ── Language pills ───────────────────────────────────────────── */}
            <div className="relative z-10 flex-none px-4 py-2">
                <div className="flex gap-2 justify-center flex-wrap">
                    {VOICE_LANGUAGES.map(l => (
                        <button
                            key={l.code}
                            onClick={() => { haptics.light(); setVoiceLang(l.code); }}
                            className={cn(
                                'px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95',
                                voiceLang === l.code
                                    ? 'bg-gradient-to-br from-green-400 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                                    : 'bg-white/50 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-white/30 dark:border-white/10 backdrop-blur-md',
                            )}
                        >
                            {l.label}
                            <span className="block text-[9px] font-medium opacity-70 mt-0.5">{l.nativeLabel}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Main content area ───────────────────────────────────────── */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-6 px-6">

                {/* Status text */}
                <div className="text-center min-h-[60px]">
                    {voiceState === 'idle' && !lastAiReply && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Tap the microphone and ask your question
                        </p>
                    )}
                    {voiceState === 'listening' && (
                        <p className="text-sm font-semibold text-green-700 dark:text-green-400 animate-pulse">
                            🎤 Listening... Speak now
                        </p>
                    )}
                    {voiceState === 'processing' && (
                        <div className="flex items-center gap-2 justify-center">
                            <Loader2 className="h-4 w-4 animate-spin text-green-500" />
                            <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                                Fasal AI is thinking...
                            </p>
                        </div>
                    )}
                    {voiceState === 'speaking' && (
                        <div className="flex items-center gap-2 justify-center">
                            <Volume2 className="h-4 w-4 text-green-500 animate-pulse" />
                            <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                                Speaking...
                            </p>
                        </div>
                    )}
                </div>

                {/* Transcript display */}
                {currentDisplay && (
                    <div className="w-full max-w-sm bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-white/40 dark:border-white/10 p-4 shadow-lg">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">You said</p>
                        <p className="text-sm text-gray-800 dark:text-white leading-relaxed">
                            {currentDisplay}
                            {voice.isListening && voice.interimTranscript && (
                                <span className="text-gray-400 dark:text-gray-500"> {voice.interimTranscript}</span>
                            )}
                        </p>
                    </div>
                )}

                {/* ── Large mic button ────────────────────────────────────── */}
                <div className="relative">
                    <PulseRings active={voice.isListening} />
                    <button
                        onClick={handleMicPress}
                        disabled={isSending}
                        className={cn(
                            'relative w-24 h-24 rounded-full flex items-center justify-center',
                            'transition-all duration-300 active:scale-90',
                            'shadow-2xl',
                            voice.isListening
                                ? 'bg-red-500 shadow-red-500/40'
                                : isSending
                                    ? 'bg-gray-400 shadow-gray-400/30 cursor-not-allowed'
                                    : 'bg-gradient-to-br from-green-400 to-emerald-600 shadow-green-500/40',
                            !isSending && 'hover:shadow-3xl',
                        )}
                        style={!voice.isListening && !isSending ? { animation: 'voiceGlow 3s ease-in-out infinite' } : {}}
                    >
                        {isSending ? (
                            <Loader2 className="h-10 w-10 text-white animate-spin" />
                        ) : voice.isListening ? (
                            <MicOff className="h-10 w-10 text-white relative z-10" />
                        ) : (
                            <Mic className="h-10 w-10 text-white relative z-10" />
                        )}
                    </button>
                </div>

                {/* Error message */}
                {voice.sttError && (
                    <div className="w-full max-w-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl p-3">
                        <p className="text-xs text-red-700 dark:text-red-300 text-center">{voice.sttError}</p>
                    </div>
                )}

                {/* AI Response panel */}
                {lastAiReply && voiceState !== 'listening' && (
                    <div className="w-full max-w-sm bg-white/70 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-white/40 dark:border-white/10 p-4 shadow-lg max-h-[200px] overflow-y-auto">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Fasal AI</p>
                            <div className="flex gap-1.5">
                                <button
                                    onClick={handleRepeat}
                                    className={cn(
                                        'w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90',
                                        voiceState === 'speaking'
                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                                            : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400',
                                    )}
                                    title="Replay voice"
                                >
                                    {voiceState === 'speaking' ? (
                                        <VolumeX className="h-4 w-4" />
                                    ) : (
                                        <RotateCcw className="h-3.5 w-3.5" />
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        if (voiceState === 'speaking') {
                                            window.speechSynthesis?.cancel();
                                            setVoiceState('idle');
                                        } else if (lastAiReply) {
                                            speakDirectly(lastAiReply, voiceLangRef.current);
                                            setVoiceState('speaking');
                                        }
                                    }}
                                    className={cn(
                                        'w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90',
                                        voiceState === 'speaking'
                                            ? 'bg-green-500 text-white shadow-md shadow-green-500/30'
                                            : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400',
                                    )}
                                    title={voiceState === 'speaking' ? 'Stop speaking' : 'Read aloud'}
                                >
                                    <Volume2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                        <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed whitespace-pre-line">
                            {lastAiReply}
                        </p>
                    </div>
                )}
            </div>

            {/* ── Bottom safe area ─────────────────────────────────────────── */}
            <div className="relative z-10 flex-none px-6 pb-10 pt-4">
                <p className="text-center text-[10px] text-gray-400 dark:text-gray-500">
                    Powered by Fasal AI • Speak in your language
                </p>
                <div className="w-28 h-1 bg-gray-900/15 dark:bg-white/20 rounded-full mx-auto mt-3" />
            </div>
        </div>
    );
}
