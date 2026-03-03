'use client';

import { useState } from 'react';
import { ArrowLeft, Wheat, PlusCircle, History } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser as useUserFromAuth } from '@/firebase/auth/use-user';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import PlannerForm from '@/components/crop-success-planner/planner-form';
import PlannerResults from '@/components/crop-success-planner/planner-results';
import SavedPlansList from '@/components/common/saved-plans-list';
import type { CropSuccessPlan } from '@/farming-partner/crop-success-planner-service';
import {
    listCropSuccessPlansClient,
    deleteCropSuccessPlanClient,
} from '@/farming-partner/crop-success-planner-client';

/** Convert a CropSuccessPlan to display metadata for the list. */
function planToMeta(plan: CropSuccessPlan) {
    return {
        id: plan.id ?? plan.createdAt.toString(),
        title: `${plan.input.cropName} — ${plan.input.region}`,
        subtitle: `${plan.input.season} · ${plan.input.soilType} soil`,
        createdAt: plan.createdAt,
    };
}

type Tab = 'new' | 'history';

export default function CropSuccessPlannerPage() {
    const { user, loading } = useUserFromAuth();
    const router = useRouter();
    const [tab, setTab] = useState<Tab>('new');
    const [result, setResult] = useState<CropSuccessPlan | null>(null);

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);

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
            {/* Sticky header */}
            <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 backdrop-blur-sm px-4">
                <Button asChild variant="ghost" size="icon" className="shrink-0">
                    <Link href="/farming-partner">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10 shrink-0">
                        <Wheat className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-base font-bold leading-tight truncate">Crop Success Planner</h1>
                        <p className="text-xs text-muted-foreground truncate">AI suitability analysis</p>
                    </div>
                </div>
            </header>

            {/* Tab bar — only shown when not viewing a result */}
            {!result && (
                <div className="flex border-b bg-background/80 backdrop-blur-sm px-4 gap-1">
                    {([
                        { id: 'new', label: 'New Plan', icon: PlusCircle },
                        { id: 'history', label: 'My Plans', icon: History },
                    ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => { haptics.light(); setTab(id); }}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 transition-colors',
                                tab === id
                                    ? 'border-primary text-primary'
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
                    <PlannerResults
                        plan={result}
                        onReset={() => { setResult(null); setTab('new'); }}
                    />
                ) : tab === 'new' ? (
                    <PlannerForm
                        userId={user.uid}
                        onSuccess={(plan) => { setResult(plan); }}
                    />
                ) : (
                    <SavedPlansList<CropSuccessPlan>
                        userId={user.uid}
                        loader={listCropSuccessPlansClient}
                        toMeta={planToMeta}
                        onDelete={deleteCropSuccessPlanClient}
                        onSelect={(plan) => setResult(plan)}
                        title="My Saved Plans"
                        emptyLabel="No saved plans yet. Generate your first plan above."
                    />
                )}
            </main>
        </div>
    );
}
