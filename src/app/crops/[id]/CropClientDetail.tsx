'use client';

import React from 'react';
import type { CropDocument } from '@/types/crop';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { haptics } from '@/lib/haptics';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft, Leaf, Droplets, Sun, Calendar, Wheat, BookOpen, AlertCircle,
    CheckCircle2, TrendingUp, Scissors, ThermometerSun
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function CropClientDetail({ crop }: { crop: CropDocument }) {
    const router = useRouter();
    const { language } = useTranslation();

    const langMap = ['en', 'hi', 'te', 'ta', 'kn'];
    const activeLang = langMap.includes(language as any) ? (language as keyof CropDocument['commonNames']) : 'en';
    const regionalName = crop?.commonNames?.[activeLang] ?? crop?.commonNames?.en ?? 'Unknown';
    const englishName = crop?.commonNames?.en ?? 'Unknown';
    const showBoth = regionalName && regionalName !== englishName;

    const goBack = () => {
        haptics.light();
        router.back();
    };

    return (
        <div className="flex-1 bg-background flex flex-col min-h-screen pb-20">
            {/* Header */}
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-md px-4">
                <Button onClick={goBack} variant="ghost" size="icon" className="shrink-0 -ml-2 group">
                    <ArrowLeft className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Button>
                <div className="text-center flex-1 pr-6">
                    <h1 className="text-base font-bold truncate px-4">
                        {showBoth ? `${regionalName} (${englishName})` : englishName}
                    </h1>
                </div>
            </header>

            <main className="flex flex-col flex-1 p-4 gap-6 animate-in fade-in duration-500">

                {/* Hero Card */}
                <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-green-500 to-[#006000] p-6 text-white shadow-xl">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Leaf className="w-48 h-48 rotate-12" />
                    </div>
                    <div className="relative z-10 flex flex-col">
                        <Badge className="w-fit bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm mb-4 capitalize">
                            {crop.cropType?.replace('_', ' ') || 'Crop'}
                        </Badge>
                        <h2 className="text-3xl font-black tracking-tight drop-shadow-sm leading-tight mb-1">
                            {showBoth ? regionalName : englishName}
                        </h2>
                        {showBoth && (
                            <p className="text-lg font-bold text-white/90 mb-2">
                                {englishName}
                            </p>
                        )}
                        <p className="text-white/80 font-medium italic mt-1 text-sm flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4" /> {crop?.scientificName ?? ''}
                        </p>


                        {Array.isArray(crop?.aliases) && crop.aliases.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-4">
                                {crop.aliases.map((alias, i) => (
                                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 uppercase tracking-wider font-semibold">
                                        {alias}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Requirements Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <ReqCard icon={<Droplets className="w-5 h-5 text-blue-500" />} title="Water" value={crop?.waterNeeds || 'N/A'} />
                    <ReqCard icon={<Sun className="w-5 h-5 text-orange-500" />} title="Sunlight" value={crop?.sunlightNeeds || 'N/A'} />
                    <ReqCard icon={<ThermometerSun className="w-5 h-5 text-red-500" />} title="Best Season" value={Array.isArray(crop?.seasonBest) ? (crop.seasonBest.join(', ') || 'N/A') : 'N/A'} />
                    <ReqCard icon={<Calendar className="w-5 h-5 text-purple-500" />} title="Harvest In" value={crop?.timeToHarvestDays ? `${crop.timeToHarvestDays} days` : 'N/A'} />
                </div>

                {/* Growth Phases Timeline */}
                <Section title="Growth Timeline" icon={<TrendingUp className="w-5 h-5 text-[#006000]" />}>
                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-gray-800 before:to-transparent">
                        {Array.isArray(crop?.growthSteps) && crop.growthSteps.map((step, idx) => (
                            <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-gray-100 dark:bg-gray-800 dark:border-gray-900 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 text-xs font-bold text-gray-500 dark:text-gray-400">
                                    {idx + 1}
                                </div>
                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-[1.5rem] bg-white dark:bg-[#1a1c1e] shadow-sm border border-gray-100 dark:border-white/5">
                                    <div className="flex flex-col">
                                        <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-1">{step?.title || (step as any)?.phase || `Step ${idx + 1}`}</h4>
                                        <p className="text-xs text-muted-foreground">{step?.description ?? ''}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* Disease Risks */}
                {
                    Array.isArray(crop?.diseaseRisks) && crop.diseaseRisks.length > 0 && (
                        <Section title="Disease Risks" icon={<AlertCircle className="w-5 h-5 text-red-500" />}>
                            <div className="grid gap-3">
                                {crop.diseaseRisks.map((risk, i) => (
                                    <div key={i} className="p-4 rounded-[1.5rem] bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                                        <h4 className="font-bold text-red-900 dark:text-red-400 text-sm mb-1">{(risk as any)?.diseaseName || risk?.name || 'Unknown'}</h4>
                                        <p className="text-xs text-red-800/80 dark:text-red-300/80 leading-relaxed mb-2">
                                            {(risk as any)?.description || risk?.symptoms || ''}
                                        </p>
                                        <div className="flex gap-2">
                                            <Badge variant="destructive" className="bg-red-500 text-[10px] capitalize">
                                                {risk?.severity ?? 'Unknown'} Severity
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )
                }

                {/* Tips */}
                <div className="grid gap-3 mb-6">
                    {Array.isArray(crop?.yieldImprovementTips) && crop.yieldImprovementTips.length > 0 && (
                        <div className="p-5 rounded-[1.5rem] bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                            <h3 className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-400 mb-3">
                                <TrendingUp className="w-5 h-5" />
                                Pro Yield Tips
                            </h3>
                            <ul className="space-y-2">
                                {crop.yieldImprovementTips.map((tip, i) => (
                                    <li key={i} className="flex items-start gap-2.5 text-xs text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
                                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {Array.isArray(crop?.harvestTips) && crop.harvestTips.length > 0 && (
                        <div className="p-5 rounded-[1.5rem] bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
                            <h3 className="flex items-center gap-2 font-bold text-orange-900 dark:text-orange-400 mb-3">
                                <Scissors className="w-5 h-5" />
                                Harvest Advice
                            </h3>
                            <ul className="space-y-2">
                                {crop.harvestTips.map((tip, i) => (
                                    <li key={i} className="flex items-start gap-2.5 text-xs text-orange-800/80 dark:text-orange-300/80 leading-relaxed">
                                        <CheckCircle2 className="w-4 h-4 shrink-0 text-orange-500 mt-0.5" />
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

            </main >
        </div >
    );
}

function ReqCard({ icon, title, value }: { icon: React.ReactNode, title: string, value: string }) {
    return (
        <Card className="rounded-[1.5rem] border-gray-100 dark:border-white/5 shadow-sm bg-white dark:bg-[#1a1c1e] overflow-hidden">
            <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-gray-50 dark:bg-white/5">
                        {icon}
                    </div>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{title}</span>
                </div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 capitalize leading-tight">
                    {(value || 'N/A').replace(/_/g, ' ')}
                </p>
            </CardContent>
        </Card>
    );
}

function Section({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
    return (
        <div className="my-2">
            <h3 className="flex items-center gap-2 font-bold text-gray-900 dark:text-gray-100 mb-4 px-1 text-lg">
                {icon}
                {title}
            </h3>
            {children}
        </div>
    );
}
