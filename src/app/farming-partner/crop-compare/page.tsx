'use client';

import React, { useState, useCallback } from 'react';
import { ArrowLeft, Scale, Plus, X, Loader2, PlusCircle, History } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser as useUserFromAuth } from '@/firebase/auth/use-user';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { CropSearchInput } from '@/components/crops/CropSearchInput';
import CropCompareTable from '@/components/crop-compare/CropCompareTable';
import SavedPlansList from '@/components/common/saved-plans-list';
import { useRegion } from '@/providers/region-provider';
import type { CropDocument } from '@/types/crop';
import {
    saveCropComparison,
    listCropComparisonsClient,
    deleteCropComparisonClient,
    type CropCompareRecord,
} from '@/farming-partner/crop-compare-client';

interface SelectedCrop {
    id: string;
    name: string;
    data: CropDocument | null;
    loading: boolean;
}

type Tab = 'new' | 'history';

/** Convert a CropCompareRecord to display metadata for the history list. */
function recordToMeta(record: CropCompareRecord) {
    return {
        id: record.id ?? record.createdAt.toString(),
        title: record.cropNames.join(' vs '),
        subtitle: `Best: ${record.bestPickName}${record.region ? ` · ${record.region}` : ''}`,
        createdAt: record.createdAt,
    };
}

export default function CropComparePage() {
    const { user, loading } = useUserFromAuth();
    const router = useRouter();
    const { region, hasRegion } = useRegion();
    const [tab, setTab] = useState<Tab>('new');
    const [crops, setCrops] = useState<SelectedCrop[]>([
        { id: '', name: '', data: null, loading: false },
        { id: '', name: '', data: null, loading: false },
    ]);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);

    // ── Add / remove crop slots ──────────────────────────────────────────────

    const addSlot = () => {
        if (crops.length < 3) {
            haptics.light();
            setCrops((prev) => [...prev, { id: '', name: '', data: null, loading: false }]);
        }
    };

    const removeSlot = (idx: number) => {
        haptics.light();
        setCrops((prev) => prev.filter((_, i) => i !== idx));
    };

    // ── Crop selection ───────────────────────────────────────────────────────

    const handleSelect = useCallback(async (idx: number, cropId: string, cropName: string) => {
        haptics.medium();
        setSaved(false);

        setCrops((prev) =>
            prev.map((c, i) =>
                i === idx ? { ...c, id: cropId, name: cropName, loading: true, data: null } : c
            )
        );

        try {
            const res = await fetch(`/api/crops/${cropId}`);
            if (res.ok) {
                const data = await res.json();
                setCrops((prev) =>
                    prev.map((c, i) =>
                        i === idx ? { ...c, data, loading: false } : c
                    )
                );
            } else {
                setCrops((prev) =>
                    prev.map((c, i) =>
                        i === idx ? { ...c, loading: false } : c
                    )
                );
            }
        } catch {
            setCrops((prev) =>
                prev.map((c, i) =>
                    i === idx ? { ...c, loading: false } : c
                )
            );
        }
    }, []);

    // ── Derived state ────────────────────────────────────────────────────────

    const loadedCrops = crops.filter((c) => c.data !== null).map((c) => c.data!);
    const canCompare = loadedCrops.length >= 2;
    const anyLoading = crops.some((c) => c.loading);

    // ── Auto-save comparison when table appears ──────────────────────────────

    useEffect(() => {
        if (!canCompare || saved || !user || anyLoading) return;

        const cropNames = loadedCrops.map((c) => c.commonNames?.en ?? c.id);
        // Simple best pick: highest market demand
        const bestIdx = loadedCrops.reduce((best, crop, i) => {
            const demandOrder = { high: 3, medium: 2, low: 1 };
            const currentBest = demandOrder[loadedCrops[best].marketDemandLevel ?? 'medium'] ?? 2;
            const thisDemand = demandOrder[crop.marketDemandLevel ?? 'medium'] ?? 2;
            return thisDemand > currentBest ? i : best;
        }, 0);

        const record: CropCompareRecord = {
            userId: user.uid,
            createdAt: Date.now(),
            cropIds: loadedCrops.map((c) => c.id),
            cropNames,
            bestPickName: cropNames[bestIdx] ?? '',
            region: hasRegion
                ? [region.city, region.state, region.country].filter(Boolean).join(', ')
                : undefined,
        };

        setSaved(true);
        saveCropComparison(record).catch(() => { });
    }, [canCompare, saved, user, anyLoading, loadedCrops, hasRegion, region]);

    // ── Reset form ───────────────────────────────────────────────────────────

    const resetForm = () => {
        setCrops([
            { id: '', name: '', data: null, loading: false },
            { id: '', name: '', data: null, loading: false },
        ]);
        setSaved(false);
    };

    // ── Render ───────────────────────────────────────────────────────────────

    if (loading || !user) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-background">
            {/* Header */}
            <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 backdrop-blur-sm px-4">
                <Button asChild variant="ghost" size="icon" className="shrink-0">
                    <Link href="/farming-partner">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-sky-500/10 shrink-0">
                        <Scale className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-base font-bold leading-tight truncate">Crop Compare</h1>
                        <p className="text-xs text-muted-foreground truncate">Side-by-side comparison</p>
                    </div>
                </div>
            </header>

            {/* Tab bar */}
            {!canCompare && (
                <div className="flex border-b bg-background/80 backdrop-blur-sm px-4 gap-1">
                    {([
                        { id: 'new', label: 'New Compare', icon: PlusCircle },
                        { id: 'history', label: 'History', icon: History },
                    ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => { haptics.light(); setTab(id); }}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 transition-colors',
                                tab === id
                                    ? 'border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400'
                                    : 'border-transparent text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                        </button>
                    ))}
                </div>
            )}

            <main className="flex flex-col gap-5 p-4 pb-28">
                {tab === 'history' && !canCompare ? (
                    <SavedPlansList<CropCompareRecord>
                        userId={user.uid}
                        loader={listCropComparisonsClient}
                        toMeta={recordToMeta}
                        onDelete={deleteCropComparisonClient}
                        onSelect={async (record) => {
                            setTab('new');
                            setSaved(true); // Don't re-save historical loaded data

                            // Initialize crops with name and loading state
                            setCrops(record.cropIds.map((id, i) => ({
                                id,
                                name: record.cropNames[i] || id,
                                data: null,
                                loading: true,
                            })));

                            // Fetch full crop data
                            const loadedCrops = await Promise.all(record.cropIds.map(async (id) => {
                                try {
                                    const res = await fetch(`/api/crops/${id}`);
                                    if (res.ok) {
                                        return await res.json();
                                    }
                                } catch { }
                                return null;
                            }));

                            // Update state with loaded data
                            setCrops(prev => prev.map((c, i) => ({
                                ...c,
                                data: loadedCrops[i],
                                loading: false,
                            })));
                        }}
                        title="Past Comparisons"
                        emptyLabel="No saved comparisons yet. Start comparing crops above."
                    />
                ) : (
                    <>
                        {/* ── Crop selection slots ──────────────────────────── */}
                        <div className="flex flex-col gap-3">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                Select crops to compare
                            </p>

                            {crops.map((crop, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                    <div className="flex-1">
                                        {crop.id ? (
                                            <div className="flex items-center gap-2 rounded-xl border border-border dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-sm px-3 py-2.5">
                                                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${crop.loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
                                                <span className="text-sm font-semibold flex-1 truncate">{crop.name}</span>
                                                {crop.loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                                                <button
                                                    onClick={() => {
                                                        haptics.light();
                                                        setSaved(false);
                                                        setCrops((prev) =>
                                                            prev.map((c, i) =>
                                                                i === idx ? { id: '', name: '', data: null, loading: false } : c
                                                            )
                                                        );
                                                    }}
                                                    className="text-muted-foreground hover:text-foreground"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <CropSearchInput
                                                onSelect={(id, name) => handleSelect(idx, id, name)}
                                                placeholder={`Crop ${idx + 1} (e.g. ${idx === 0 ? 'Rice' : idx === 1 ? 'Wheat' : 'Maize'})...`}
                                            />
                                        )}
                                    </div>

                                    {idx === 2 && (
                                        <button
                                            onClick={() => removeSlot(idx)}
                                            className="mt-2 text-muted-foreground hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            ))}

                            {crops.length < 3 && (
                                <button
                                    onClick={addSlot}
                                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border dark:border-white/10 text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors active:scale-[0.98]"
                                >
                                    <Plus className="w-4 h-4" /> Add 3rd Crop
                                </button>
                            )}
                        </div>

                        {/* ── Loading state ─────────────────────────────────── */}
                        {anyLoading && (
                            <div className="flex items-center justify-center gap-2 py-4">
                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                <span className="text-sm text-muted-foreground">Loading crop data...</span>
                            </div>
                        )}

                        {/* ── Comparison table ──────────────────────────────── */}
                        {canCompare && !anyLoading && (
                            <>
                                <CropCompareTable crops={loadedCrops} />
                                <Button
                                    onClick={() => { haptics.medium(); resetForm(); }}
                                    variant="outline"
                                    className="w-full h-11 rounded-2xl font-bold border-border dark:border-white/10"
                                >
                                    New Comparison
                                </Button>
                            </>
                        )}

                        {/* ── Empty state ───────────────────────────────────── */}
                        {!canCompare && !anyLoading && (
                            <div className="text-center py-8">
                                <Scale className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    Select at least 2 crops above to start comparing
                                </p>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
