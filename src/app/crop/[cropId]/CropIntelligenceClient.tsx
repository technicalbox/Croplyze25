'use client';

import React, { useState, useEffect } from 'react';
import type { CropDocument } from '@/types/crop';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { haptics } from '@/lib/haptics';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import {
    ArrowLeft, Share2, Heart, Volume2, CalendarDays, Droplets, Sun,
    ThermometerSun, Sprout, TrendingUp, AlertOctagon, CheckCircle2,
    Sparkles, ShieldCheck, Clock, MapPin, StopCircle, Loader2, Navigation, VolumeX
} from 'lucide-react';
import { useRegion } from '@/providers/region-provider';
import { useTTS } from '@/hooks/useTTS';

// ── Safe helper to access nested crop properties ─────────────────────────────
function safeReplace(value: string | undefined | null, search: string | RegExp, replacement: string): string {
    if (!value || typeof value !== 'string') return 'N/A';
    return value.replace(search, replacement);
}

function safeJoin(arr: any[] | undefined | null, separator = ', '): string {
    if (!Array.isArray(arr)) return '';
    return arr.filter(Boolean).join(separator);
}

export default function CropIntelligenceClient({ crop }: { crop: CropDocument }) {
    const router = useRouter();
    const { language } = useTranslation();
    const { user } = useUser();
    const db = useFirestore();

    // ── Mounted guard: prevents hydration issues + browser API crashes ────────
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const [isFavorite, setIsFavorite] = useState(false);
    const { region, hasRegion } = useRegion();
    const [aiResult, setAiResult] = useState<any>(null);
    const [aiLoading, setAiLoading] = useState(false);

    // ── TTS (multi-language) ──
    const { speaking: isSpeaking, toggle: toggleTTS, stop: stopTTS } = useTTS();
    useEffect(() => { return () => stopTTS(); }, [stopTTS]);

    // Lang fallback logic — all with optional chaining
    const supportedLangs = ['en', 'hi', 'te', 'ta', 'kn'];
    const activeLang = supportedLangs.includes(language as any)
        ? (language as keyof CropDocument['commonNames'])
        : 'en';
    const localizedName = crop?.commonNames?.[activeLang] ?? crop?.commonNames?.en ?? 'Unknown Crop';
    const englishName = crop?.commonNames?.en ?? 'Unknown Crop';

    // Check favorite status
    useEffect(() => {
        if (!user || !db || !crop?.id) return;
        const checkFav = async () => {
            try {
                const favDoc = await getDoc(doc(db, `users/${user.uid}/preferences/favorites`));
                if (favDoc.exists()) {
                    const arr = favDoc.data()?.cropIds || [];
                    setIsFavorite(arr.includes(crop.id));
                }
            } catch (err) {
                // Silently fail — user may not have favorites yet or permissions issue
                console.warn('[favorites] Could not check favorites:', err);
            }
        };
        checkFav();
    }, [user, db, crop?.id]);

    // TTS Logic — only execute on mounted client
    const toggleSpeech = () => {
        if (!mounted) return;
        haptics.light();
        const textToRead = `
            ${localizedName || englishName} crop intelligence. 
            Water requirement: ${safeReplace(crop?.waterNeeds, /_/g, ' ')}. 
            Sunlight requirement: ${safeReplace(crop?.sunlightNeeds, /_/g, ' ')}. 
            Time to harvest: ${crop?.timeToHarvestDays ?? 'unknown'} days.
            Best season: ${safeJoin(crop?.seasonBest).replace(/_/g, ' ') || 'N/A'}.
            Soil type: ${safeJoin(crop?.soilBest) || 'N/A'}.
        `;
        toggleTTS(textToRead);
    };

    const toggleFavorite = async () => {
        haptics.medium();
        setIsFavorite(!isFavorite); // optimistic
        if (!user || !db || !crop?.id) return;

        const ref = doc(db, `users/${user.uid}/preferences/favorites`);
        try {
            await setDoc(ref, { cropIds: isFavorite ? arrayRemove(crop.id) : arrayUnion(crop.id) }, { merge: true });
        } catch (e) {
            console.error('Failed to update favorites', e);
            setIsFavorite(isFavorite); // revert on fail
        }
    };

    const goBack = () => {
        stopTTS();
        haptics.light();
        router.back();
    };

    const addToPlanner = () => {
        haptics.medium();
        stopTTS();
        router.push(`/farming-partner/crop-success-planner?cropId=${crop?.id ?? ''}&cropName=${encodeURIComponent(englishName)}`);
    };

    // AI Summary Generator — fully safe
    const generateSummary = () => {
        const soilArr = Array.isArray(crop?.soilBest) ? crop.soilBest : [];
        const soilStatus = soilArr.length > 0 ? `It thrives in ${soilArr.join(', ')} soil.` : 'It is versatile in various soils.';
        const waterVal = crop?.waterNeeds ?? '';
        const waterStatus = waterVal === 'High' ? 'requires significant irrigation.' : waterVal === 'Low' ? 'is highly drought resistant.' : 'needs moderate watering.';
        const seasonArr = Array.isArray(crop?.seasonBest) ? crop.seasonBest : [];
        return `${englishName} is a ${crop?.cropType?.replace?.(/_/g, ' ') || 'valuable'} crop that ${waterStatus} ${soilStatus} Ideal for the ${seasonArr[0] || 'main'} season, it takes about ${crop?.timeToHarvestDays ?? 'N/A'} days to reach peak harvest.`;
    };

    // ── Fallback: No crop data ───────────────────────────────────────────────
    if (!crop) {
        return (
            <div className="flex flex-col min-h-screen bg-[#f8fafc] dark:bg-[#0f1115] items-center justify-center p-8 text-center gap-4">
                <AlertOctagon className="w-12 h-12 text-amber-500" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Crop Data Not Found</h2>
                <p className="text-sm text-gray-500">The crop information could not be loaded.</p>
                <Button onClick={() => router.back()} variant="outline" className="rounded-xl mt-4">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#f8fafc] dark:bg-[#0f1115] pb-28">

            {/* STICKY HEADER */}
            <header className="sticky top-0 z-50 flex h-16 items-center justify-between px-4 bg-background/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/5 transition-all">
                <Button onClick={goBack} variant="ghost" size="icon" className="shrink-0 rounded-full hover:bg-gray-100 dark:hover:bg-white/10">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="text-center flex-1 overflow-hidden px-4">
                    <h1 className="text-sm font-bold truncate">
                        {localizedName !== englishName ? `${localizedName} (${englishName})` : englishName}
                    </h1>
                </div>
                <div className="flex gap-1">
                    <Button onClick={toggleFavorite} variant="ghost" size="icon" className="shrink-0 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30">
                        <Heart className={`h-5 w-5 transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-500 hover:text-red-500'}`} />
                    </Button>
                </div>
            </header>

            <main className="flex flex-col flex-1 p-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* 1. HERO GRAPHIC (Glassmorphic) */}
                <div className="relative w-full rounded-[2.5rem] bg-gradient-to-br from-[#0c5c3e] to-[#042f1f] p-8 text-white shadow-2xl overflow-hidden mt-2">
                    {/* Decorative shapes */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/20 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4"></div>

                    <div className="relative z-10 flex flex-col pt-4">
                        <Badge className="w-fit bg-emerald-500/20 text-emerald-100 border-none backdrop-blur-md px-3 py-1 text-xs uppercase tracking-widest font-bold mb-6">
                            {crop?.cropType?.replace?.('_', ' ') || 'Crop'}
                        </Badge>
                        <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-none mb-2">
                            {localizedName}
                        </h2>
                        {localizedName !== englishName && (
                            <p className="text-xl font-bold text-white/70 tracking-wide mb-3">{englishName}</p>
                        )}
                        <p className="text-sm font-medium italic text-emerald-200/80 mb-8 max-w-[250px]">
                            {crop?.scientificName ?? ''}
                        </p>

                        <div className="flex items-center gap-3">
                            <Button
                                onClick={addToPlanner}
                                className="bg-white text-[#0c5c3e] hover:bg-gray-100 rounded-full h-12 px-6 font-bold shadow-[0_8px_16px_rgba(0,0,0,0.2)] hover:scale-105 transition-all"
                            >
                                <CalendarDays className="w-4 h-4 mr-2" /> Plan Crop
                            </Button>
                            {mounted && (
                                <Button
                                    onClick={toggleSpeech}
                                    variant="outline"
                                    className={`rounded-full h-12 w-12 p-0 border-white/20 backdrop-blur-md transition-all ${isSpeaking ? 'bg-orange-500 border-orange-500 text-white animate-pulse' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                >
                                    {isSpeaking ? <StopCircle className="w-5 h-5 fill-current" /> : <Volume2 className="w-5 h-5" />}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. AI EXECUTIVE SUMMARY */}
                <div className="relative p-[1.5px] rounded-[1.5rem] bg-gradient-to-r from-violet-500/30 via-fuchsia-500/30 to-orange-500/30 shadow-sm">
                    <div className="bg-white/90 dark:bg-[#1a1c1e]/90 backdrop-blur-xl rounded-[calc(1.5rem-1.5px)] p-5">
                        <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">
                            <Sparkles className="w-4 h-4" /> AI Harvest Synopsis
                        </h3>
                        <p className="text-sm font-medium leading-relaxed text-gray-700 dark:text-gray-300">
                            {generateSummary()}
                        </p>
                    </div>
                </div>

                {/* 3. VITAL ANALYTICS GRID */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <BentoCard icon={<Droplets className="w-6 h-6 text-blue-500" />} label="Water" val={safeReplace(crop?.waterNeeds, /_/g, ' ')} />
                    <BentoCard icon={<Sun className="w-6 h-6 text-orange-500" />} label="Sunlight" val={safeReplace(crop?.sunlightNeeds, /_/g, ' ')} />
                    <BentoCard icon={<Clock className="w-6 h-6 text-emerald-500" />} label="Harvest" val={crop?.timeToHarvestDays ? `${crop.timeToHarvestDays}d` : 'N/A'} />
                    <BentoCard icon={<TrendingUp className={`w-6 h-6 ${crop?.marketDemandLevel === 'high' ? 'text-green-500' : crop?.marketDemandLevel === 'medium' ? 'text-yellow-500' : 'text-red-500'}`} />} label="Demand" val={crop?.marketDemandLevel || 'Unknown'} />
                </div>

                {/* CAN I GROW THIS? AI BUTTON */}
                <div className="mt-2">
                    <button
                        onClick={async () => {
                            if (!hasRegion) { haptics.error(); return; }
                            setAiLoading(true);
                            haptics.light();
                            try {
                                const res = await fetch('/api/crops/can-i-grow', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        cropId: crop?.id ?? '',
                                        cropName: englishName,
                                        region: { country: region?.country ?? '', state: region?.state ?? '', city: region?.city ?? '' },
                                    }),
                                });
                                const data = await res.json();
                                if (data?.success) {
                                    setAiResult(data.data);
                                    haptics.success();
                                }
                            } catch (e) { console.error(e); }
                            setAiLoading(false);
                        }}
                        disabled={aiLoading}
                        className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-[15px] flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-60"
                    >
                        {aiLoading ? (
                            <><Loader2 className="h-5 w-5 animate-spin" /> Analyzing...</>
                        ) : (
                            <><Navigation className="h-5 w-5" /> Can I grow this here?</>
                        )}
                    </button>
                    {!hasRegion && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center mt-1.5">⚠ Set your location first from the dashboard</p>
                    )}
                    {hasRegion && !aiResult && (
                        <p className="text-[11px] text-muted-foreground text-center mt-1.5">📍 {[region?.city, region?.state, region?.country].filter(Boolean).join(', ')}</p>
                    )}

                    {/* AI Result Panel */}
                    {aiResult && (
                        <div className="mt-4 p-5 rounded-2xl bg-white dark:bg-[#1a1c1e] border border-gray-100 dark:border-white/5 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl text-white ${(aiResult?.suitabilityScore ?? 0) >= 70 ? 'bg-emerald-500' : (aiResult?.suitabilityScore ?? 0) >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}>
                                        {aiResult?.suitabilityScore ?? '?'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-gray-100">
                                            {aiResult?.canGrow ? '✅ Yes, you can grow this!' : '⚠️ Not recommended'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">Profitability: <span className="capitalize font-semibold">{aiResult?.profitability ?? 'N/A'}</span></p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{aiResult?.summary ?? ''}</p>
                            {Array.isArray(aiResult?.risks) && aiResult.risks.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase mb-1">⚠ Risks</p>
                                    <ul className="space-y-1">{aiResult.risks.map((r: string, i: number) => <li key={i} className="text-sm text-gray-600 dark:text-gray-400">• {r}</li>)}</ul>
                                </div>
                            )}
                            {Array.isArray(aiResult?.tips) && aiResult.tips.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">💡 Tips</p>
                                    <ul className="space-y-1">{aiResult.tips.map((t: string, i: number) => <li key={i} className="text-sm text-gray-600 dark:text-gray-400">• {t}</li>)}</ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 4. SOIL & SEASON DIAGNOSTICS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Season Config */}
                    <div className="flex flex-col gap-3">
                        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 p-5 rounded-[1.5rem] flex items-start gap-4">
                            <div className="bg-white dark:bg-black/20 p-3 rounded-2xl shrink-0"><CheckCircle2 className="w-6 h-6 text-green-600" /></div>
                            <div>
                                <h4 className="text-xs uppercase font-bold text-green-800 dark:text-green-500 tracking-wider mb-1">Best Season</h4>
                                <p className="text-sm font-semibold capitalize text-gray-900 dark:text-gray-100">{safeJoin(crop?.seasonBest) || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 p-5 rounded-[1.5rem] flex items-start gap-4">
                            <div className="bg-white dark:bg-black/20 p-3 rounded-2xl shrink-0"><AlertOctagon className="w-6 h-6 text-red-600" /></div>
                            <div>
                                <h4 className="text-xs uppercase font-bold text-red-800 dark:text-red-500 tracking-wider mb-1">Avoid Season</h4>
                                <p className="text-sm font-semibold capitalize text-gray-900 dark:text-gray-100">{safeJoin(crop?.seasonAvoid) || 'None'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Soil & Geo */}
                    <div className="bg-white dark:bg-[#1a1c1e] border border-gray-100 dark:border-white/5 p-5 rounded-[1.5rem] flex flex-col gap-5">
                        <div>
                            <h4 className="flex items-center gap-2 text-xs uppercase font-bold text-amber-700 dark:text-amber-500 mb-2"><Sprout className="w-4 h-4" /> Optimal Soils</h4>
                            <div className="flex flex-wrap gap-2">
                                {Array.isArray(crop?.soilBest) && crop.soilBest.length > 0 ? (
                                    crop.soilBest.map((s, i) => (
                                        <Badge key={i} variant="secondary" className="bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 rounded-lg">{typeof s === 'string' ? s.replace(/_/g, ' ') : String(s)}</Badge>
                                    ))
                                ) : (
                                    <span className="text-sm text-gray-500 italic">No soil data available</span>
                                )}
                            </div>
                        </div>
                        {Array.isArray(crop?.soilBad) && crop.soilBad.length > 0 && (
                            <div>
                                <h4 className="flex items-center gap-2 text-xs uppercase font-bold text-red-700 dark:text-red-500 mb-2">Avoid Soils</h4>
                                <div className="flex flex-wrap gap-2">
                                    {crop.soilBad.map((s, i) => (
                                        <Badge key={i} variant="destructive" className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-lg shadow-none hover:bg-red-200">{typeof s === 'string' ? s.replace(/_/g, ' ') : String(s)}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 5. DISEASES & PREVENTION */}
                {Array.isArray(crop?.diseaseRisks) && crop.diseaseRisks.length > 0 && (
                    <div className="mt-4 flex flex-col gap-4">
                        <h3 className="text-lg font-black flex items-center gap-2 text-gray-900 dark:text-gray-100 px-1">
                            <AlertOctagon className="w-5 h-5 text-red-500" /> Threat Intelligence
                        </h3>
                        {crop.diseaseRisks.map((disease, i) => (
                            <div key={i} className="bg-white dark:bg-[#1a1c1e] border border-gray-100 dark:border-white/5 rounded-[1.5rem] overflow-hidden shadow-sm">
                                <div className="bg-red-50 dark:bg-red-950/30 p-4 border-b border-red-100 dark:border-red-900/30">
                                    <div className="flex justify-between items-start gap-2">
                                        <h4 className="font-bold text-red-900 dark:text-red-400">{disease?.name || (disease as any)?.diseaseName || 'Unknown Disease'}</h4>
                                        <Badge variant="outline" className={`shrink-0 uppercase tracking-wider text-[10px] font-black ${disease?.severity === 'High' || disease?.severity === 'Critical' ? 'border-red-500 text-red-600 bg-red-100 dark:bg-red-900/40' : 'border-orange-500 text-orange-600 bg-orange-100 dark:bg-orange-900/40'}`}>
                                            {disease?.severity ?? 'Unknown'} RISK
                                        </Badge>
                                    </div>
                                    <p className="text-sm font-medium text-red-800/80 dark:text-red-300/80 mt-2">{disease?.symptoms || (disease as any)?.description || ''}</p>
                                </div>
                                {/* Shield Tips */}
                                <div className="p-4 bg-white dark:bg-transparent">
                                    <h5 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-3">
                                        <ShieldCheck className="w-4 h-4" /> Prevention / Treatment
                                    </h5>
                                    <ul className="space-y-2">
                                        {Array.isArray(crop?.preventionTips) && crop.preventionTips.length > 0 ? (
                                            crop.preventionTips.slice(0, 3).map((tip, idx) => (
                                                <li key={idx} className="flex items-start gap-3">
                                                    <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></div>
                                                    <span className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{tip}</span>
                                                </li>
                                            ))
                                        ) : (
                                            <p className="text-sm text-gray-500 italic">No specific prevention logged.</p>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 6. GROWTH MASTERCLASS TIMELINE */}
                {Array.isArray(crop?.growthSteps) && crop.growthSteps.length > 0 && (
                    <div className="mt-4">
                        <h3 className="text-lg font-black flex items-center gap-2 text-gray-900 dark:text-gray-100 px-1 mb-6">
                            <TrendingUp className="w-5 h-5 text-emerald-600" /> Growth Phasing
                        </h3>
                        <div className="relative border-l-2 border-dashed border-gray-200 dark:border-gray-800 ml-5 space-y-8 pb-4">
                            {crop.growthSteps.map((step, i) => (
                                <div key={i} className="relative pl-8 pr-2">
                                    {/* Timeline Node */}
                                    <div className="absolute left-[-13px] top-1 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 border-2 border-emerald-500 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                                        <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400">{i + 1}</span>
                                    </div>
                                    <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1 leading-none">{step?.title || (step as any)?.phase || `Step ${i + 1}`}</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                                        {step?.description ?? ''}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* BOTTOM SPACING FOR NAV AVOIDANCE */}
                <div className="h-10"></div>
            </main>
        </div>
    );
}

function BentoCard({ icon, label, val }: { icon: React.ReactNode, label: string, val: string }) {
    return (
        <div className="bg-white dark:bg-[#1a1c1e] p-4 rounded-[1.5rem] border border-gray-100 dark:border-white/5 shadow-sm flex flex-col hover:shadow-md transition-shadow">
            <div className="mb-3 shrink-0">{icon}</div>
            <p className="text-[#a1a1aa] text-xs font-bold uppercase tracking-wider mb-0.5">{label}</p>
            <p className="text-gray-900 dark:text-white font-black text-sm capitalize truncate">{val}</p>
        </div>
    );
}
