'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Tractor, PlusCircle, History } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser as useUserFromAuth } from '@/firebase/auth/use-user';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import OptimizerForm from '@/components/harvest-optimizer/optimizer-form';
import OptimizerResults from '@/components/harvest-optimizer/optimizer-results';
import SavedPlansList from '@/components/common/saved-plans-list';
import type { HarvestOptimizerRecord } from '@/farming-partner/harvest-optimizer-service';
import { listHarvestOptimizers, deleteHarvestOptimizer } from '@/farming-partner/harvest-optimizer-client';

function recordToMeta(r: HarvestOptimizerRecord) {
    const marketLabel = { local: 'Local', wholesale: 'Wholesale', export: 'Export', processing: 'Processing' }[r.input.targetMarket];
    return {
        id: r.id ?? r.createdAt.toString(),
        title: `${r.input.cropType}${r.input.variety ? ` (${r.input.variety})` : ''} — ${r.input.region}`,
        subtitle: `${marketLabel} · ${r.input.farmSizeAcres} acres · ${r.output.harvestWindowStart}`,
        createdAt: r.createdAt,
    };
}

type Tab = 'new' | 'history';

export default function HarvestOptimizerPage() {
    const { user, loading } = useUserFromAuth();
    const router = useRouter();
    const [tab, setTab] = useState<Tab>('new');
    const [result, setResult] = useState<HarvestOptimizerRecord | null>(null);

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-screen">
                <div className="h-10 w-10 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex-1 bg-background">
            {/* Header */}
            <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 backdrop-blur-sm px-4">
                <Button asChild variant="ghost" size="icon" className="shrink-0">
                    <Link href="/farming-partner"><ArrowLeft className="h-5 w-5" /></Link>
                </Button>
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/10 shrink-0">
                        <Tractor className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-base font-bold leading-tight truncate">Harvest Optimizer</h1>
                        <p className="text-xs text-muted-foreground truncate">
                            {result
                                ? `${result.input.cropType} · ${result.output.harvestWindowStart}`
                                : 'Timing, storage & market guidance'}
                        </p>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            {!result && (
                <div className="flex border-b bg-background/80 backdrop-blur-sm px-4 gap-1">
                    {([
                        { id: 'new', label: 'New Report', icon: PlusCircle },
                        { id: 'history', label: 'My Reports', icon: History },
                    ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => { haptics.light(); setTab(id); }}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 transition-colors',
                                tab === id
                                    ? 'border-amber-500 text-amber-600'
                                    : 'border-transparent text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                        </button>
                    ))}
                </div>
            )}

            <main className="flex flex-col gap-6 p-4 pb-28">
                {result ? (
                    <OptimizerResults
                        record={result}
                        onReset={() => { setResult(null); setTab('new'); }}
                    />
                ) : tab === 'new' ? (
                    <OptimizerForm
                        userId={user.uid}
                        onSuccess={(record) => setResult(record)}
                    />
                ) : (
                    <SavedPlansList<HarvestOptimizerRecord>
                        userId={user.uid}
                        loader={listHarvestOptimizers}
                        toMeta={recordToMeta}
                        onDelete={(userId, id) => deleteHarvestOptimizer(userId, id)}
                        onSelect={(record) => setResult(record)}
                        title="My Reports"
                        emptyLabel="No reports yet. Generate your first harvest report above."
                    />
                )}
            </main>
        </div>
    );
}
