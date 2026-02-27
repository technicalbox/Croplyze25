'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, CalendarDays, PlusCircle, History } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser as useUserFromAuth } from '@/firebase/auth/use-user';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import TimelineForm from '@/components/growth-timeline/timeline-form';
import TimelineResults from '@/components/growth-timeline/timeline-results';
import SavedPlansList from '@/components/common/saved-plans-list';
import type { GrowthTimelineRecord } from '@/farming-partner/growth-timeline-service';
import {
    listGrowthTimelines,
    deleteGrowthTimeline,
} from '@/farming-partner/growth-timeline-client';

/** Convert a GrowthTimelineRecord to display metadata. */
function timelineToMeta(record: GrowthTimelineRecord) {
    const tl = record.timeline;
    return {
        id: record.id ?? record.createdAt.toString(),
        title: `${tl.cropName}${tl.variety && tl.variety !== 'standard' ? ` (${tl.variety})` : ''} — ${tl.region}`,
        subtitle: `${tl.totalWeeks} weeks · Harvest ~${tl.estimatedHarvestDate}`,
        createdAt: record.createdAt,
    };
}

type Tab = 'new' | 'history';

export default function GrowthTimelinePage() {
    const { user, loading } = useUserFromAuth();
    const router = useRouter();
    const [tab, setTab] = useState<Tab>('new');
    const [result, setResult] = useState<GrowthTimelineRecord | null>(null);

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-screen">
                <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
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
                    <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-teal-500/10 shrink-0">
                        <CalendarDays className="h-4 w-4 text-teal-600" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-base font-bold leading-tight truncate">Growth Timeline</h1>
                        <p className="text-xs text-muted-foreground truncate">
                            {result
                                ? `${result.timeline.cropName} · ${result.timeline.totalWeeks} weeks`
                                : 'Week-by-week crop management'}
                        </p>
                    </div>
                </div>
            </header>

            {/* Tab bar — only shown when not viewing a result */}
            {!result && (
                <div className="flex border-b bg-background/80 backdrop-blur-sm px-4 gap-1">
                    {([
                        { id: 'new', label: 'New Timeline', icon: PlusCircle },
                        { id: 'history', label: 'My Timelines', icon: History },
                    ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => { haptics.light(); setTab(id); }}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 transition-colors',
                                tab === id
                                    ? 'border-teal-500 text-teal-600'
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
                    <TimelineResults
                        record={result}
                        onReset={() => { setResult(null); setTab('new'); }}
                    />
                ) : tab === 'new' ? (
                    <TimelineForm
                        userId={user.uid}
                        onSuccess={(record) => setResult(record)}
                    />
                ) : (
                    <SavedPlansList<GrowthTimelineRecord>
                        userId={user.uid}
                        loader={listGrowthTimelines}
                        toMeta={timelineToMeta}
                        onDelete={(userId, id) => deleteGrowthTimeline(userId, id)}
                        onSelect={(record) => setResult(record)}
                        title="My Timelines"
                        emptyLabel="No timelines saved yet. Generate your first one above."
                    />
                )}
            </main>
        </div>
    );
}
