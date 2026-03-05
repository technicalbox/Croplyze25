'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, CalendarDays, PlusCircle, History, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser as useUserFromAuth } from '@/firebase/auth/use-user';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import TimelineForm from '@/components/growth-timeline/timeline-form';
import TimelineResults from '@/components/growth-timeline/timeline-results';
import WeeklyReportForm from '@/components/growth-timeline/weekly-report-form';
import WeeklyReportResults from '@/components/growth-timeline/weekly-report-results';
import SavedPlansList from '@/components/common/saved-plans-list';
import type { GrowthTimelineRecord } from '@/farming-partner/growth-timeline-service';
import type { WeeklyGrowthReportRecord } from '@/farming-partner/weekly-growth-report-service';
import {
    listGrowthTimelines,
    deleteGrowthTimeline,
} from '@/farming-partner/growth-timeline-client';
import {
    listWeeklyGrowthReports,
    deleteWeeklyGrowthReport,
} from '@/farming-partner/weekly-growth-report-client';

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

/** Convert a WeeklyGrowthReportRecord to display metadata. */
function weeklyReportToMeta(record: WeeklyGrowthReportRecord) {
    const r = record.report;
    const inp = record.input;
    return {
        id: record.id ?? record.createdAt.toString(),
        title: `${inp.cropName} — Week ${inp.weekNumber}`,
        subtitle: `${inp.weekStartDate} → ${inp.weekEndDate} · ${r.health_rating}`,
        createdAt: record.createdAt,
    };
}

type Tab = 'new' | 'history' | 'weekly-report' | 'weekly-history';

export default function GrowthTimelineClient() {
    const { user, loading } = useUserFromAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialTab = (searchParams.get('tab') as Tab) || 'new';
    const [tab, setTab] = useState<Tab>(initialTab);
    const [result, setResult] = useState<GrowthTimelineRecord | null>(null);
    const [weeklyResult, setWeeklyResult] = useState<WeeklyGrowthReportRecord | null>(null);

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

    const hasActiveResult = result || weeklyResult;

    const headerSubtitle = result
        ? `${result.timeline.cropName} · ${result.timeline.totalWeeks} weeks`
        : weeklyResult
            ? `${weeklyResult.input.cropName} · Week ${weeklyResult.input.weekNumber}`
            : 'Week-by-week crop management';

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
                            {headerSubtitle}
                        </p>
                    </div>
                </div>
            </header>

            {/* Tab bar — only shown when not viewing a result */}
            {!hasActiveResult && (
                <div className="flex border-b bg-background/80 backdrop-blur-sm px-4 gap-1 overflow-x-auto no-scrollbar">
                    {([
                        { id: 'new', label: 'New Timeline', icon: PlusCircle },
                        { id: 'history', label: 'My Timelines', icon: History },
                        { id: 'weekly-report', label: 'Weekly Report', icon: BarChart3 },
                        { id: 'weekly-history', label: 'Report History', icon: History },
                    ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => { haptics.light(); setTab(id); }}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap',
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
                {/* ── Timeline result view ── */}
                {result ? (
                    <TimelineResults
                        record={result}
                        onReset={() => { setResult(null); setTab('new'); }}
                    />
                ) : weeklyResult ? (
                    /* ── Weekly report result view ── */
                    <WeeklyReportResults
                        record={weeklyResult}
                        onReset={() => { setWeeklyResult(null); setTab('weekly-report'); }}
                    />
                ) : tab === 'new' ? (
                    <TimelineForm
                        userId={user.uid}
                        onSuccess={(record) => setResult(record)}
                    />
                ) : tab === 'history' ? (
                    <SavedPlansList<GrowthTimelineRecord>
                        userId={user.uid}
                        loader={listGrowthTimelines}
                        toMeta={timelineToMeta}
                        onDelete={(userId, id) => deleteGrowthTimeline(userId, id)}
                        onSelect={(record) => setResult(record)}
                        title="My Timelines"
                        emptyLabel="No timelines saved yet. Generate your first one above."
                    />
                ) : tab === 'weekly-report' ? (
                    <WeeklyReportForm
                        userId={user.uid}
                        onSuccess={(record) => setWeeklyResult(record)}
                    />
                ) : (
                    /* tab === 'weekly-history' */
                    <SavedPlansList<WeeklyGrowthReportRecord>
                        userId={user.uid}
                        loader={listWeeklyGrowthReports}
                        toMeta={weeklyReportToMeta}
                        onDelete={(userId, id) => deleteWeeklyGrowthReport(userId, id)}
                        onSelect={(record) => setWeeklyResult(record)}
                        title="Weekly Growth Reports"
                        emptyLabel="No weekly reports yet. Generate your first one in the Weekly Report tab."
                    />
                )}
            </main>
        </div>
    );
}
