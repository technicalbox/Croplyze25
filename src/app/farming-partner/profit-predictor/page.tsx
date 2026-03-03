'use client';

import { useState } from 'react';
import { ArrowLeft, IndianRupee, PlusCircle, History } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser as useUserFromAuth } from '@/firebase/auth/use-user';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import ProfitForm from '@/components/profit-predictor/ProfitForm';
import ProfitResults from '@/components/profit-predictor/ProfitResults';
import SavedPlansList from '@/components/common/saved-plans-list';
import type { ProfitCalculation } from '@/farming-partner/profit-predictor-types';
import {
    listProfitCalculationsClient,
    deleteProfitCalculationClient,
} from '@/farming-partner/profit-predictor-client';

/** Convert a ProfitCalculation to display metadata for the history list. */
function calcToMeta(calc: ProfitCalculation) {
    return {
        id: calc.id ?? calc.createdAt.toString(),
        title: `${calc.input.cropName} — ${calc.input.landSizeAcres} acres`,
        subtitle: `${calc.result.isProfit ? '✅ Profit' : '❌ Loss'}: ₹${Math.abs(calc.result.netProfit).toLocaleString('en-IN')}`,
        createdAt: calc.createdAt,
    };
}

type Tab = 'new' | 'history';

export default function ProfitPredictorPage() {
    const { user, loading } = useUserFromAuth();
    const router = useRouter();
    const [tab, setTab] = useState<Tab>('new');
    const [result, setResult] = useState<ProfitCalculation | null>(null);

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
                    <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-violet-500/10 shrink-0">
                        <IndianRupee className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-base font-bold leading-tight truncate">Profit Predictor</h1>
                        <p className="text-xs text-muted-foreground truncate">Estimate before planting</p>
                    </div>
                </div>
            </header>

            {/* Tab bar — only shown when not viewing a result */}
            {!result && (
                <div className="flex border-b bg-background/80 backdrop-blur-sm px-4 gap-1">
                    {([
                        { id: 'new', label: 'New Estimate', icon: PlusCircle },
                        { id: 'history', label: 'History', icon: History },
                    ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => { haptics.light(); setTab(id); }}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 transition-colors',
                                tab === id
                                    ? 'border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400'
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
                    <ProfitResults
                        calc={result}
                        onReset={() => { setResult(null); setTab('new'); }}
                    />
                ) : tab === 'new' ? (
                    <ProfitForm
                        userId={user.uid}
                        onSuccess={(calc) => { setResult(calc); }}
                    />
                ) : (
                    <SavedPlansList<ProfitCalculation>
                        userId={user.uid}
                        loader={listProfitCalculationsClient}
                        toMeta={calcToMeta}
                        onDelete={deleteProfitCalculationClient}
                        onSelect={(calc) => setResult(calc)}
                        title="Past Estimates"
                        emptyLabel="No saved estimates yet. Create your first profit estimate above."
                    />
                )}
            </main>
        </div>
    );
}
