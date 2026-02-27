'use client';

import { Button } from "@/components/ui/button";
import { Bell, User, Wheat, ChevronRight, CalendarDays, Tractor } from "lucide-react";
import AlertBanner from "@/components/dashboard/alert-banner";
import QuickActions from "@/components/dashboard/quick-actions";
import LatestScanCard from "@/components/dashboard/latest-scan-card";
import { useCollection } from "@/firebase";
import { Diagnosis } from "@/lib/types";
import { useRouter } from 'next/navigation';
import { useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import Link from 'next/link';
import { useUser as useUserFromAuth } from '@/firebase/auth/use-user';
import { format } from 'date-fns';

// ─── Greeting helpers ─────────────────────────────────────────────────────────

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const { user, loading } = useUserFromAuth();
    const router = useRouter();
    const { data: pastDiagnoses, loading: diagnosesLoading } = useCollection<Diagnosis>(
        user ? `users/${user.uid}/cropDiagnoses` : undefined,
    );
    const { t } = useTranslation();

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);

    if (loading || !user) return <div>Loading...</div>;
    if (!user) return null;

    const firstName = user.displayName?.split(' ')[0] ?? 'Farmer';
    const todayStr = format(new Date(), 'EEEE, dd MMM yyyy');

    return (
        <div className="flex-1 bg-background">
            {/* ── Header ── */}
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-sm px-4">
                <h1 className="text-xl font-bold">{t('dashboard.title')}</h1>
                <div className="flex items-center gap-1">
                    <Button asChild variant="ghost" size="icon">
                        <Link href="/alerts"><Bell className="h-5 w-5" /></Link>
                    </Button>
                    <Button asChild variant="ghost" size="icon">
                        <Link href="/profile"><User className="h-5 w-5" /></Link>
                    </Button>
                </div>
            </header>

            <main className="flex flex-1 flex-col gap-4 p-4">

                {/* ── Greeting ── */}
                <div className="animate-in fade-in-0 duration-300">
                    <p className="text-2xl font-bold text-foreground">{getGreeting()}, {firstName} 🌱</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{todayStr}</p>
                </div>

                {/* ── Alert Banner ── */}
                <div className="animate-in fade-in-0 duration-500">
                    <AlertBanner />
                </div>

                {/* ── Quick Actions ── */}
                <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Quick Actions</p>
                    <QuickActions />
                </div>

                {/* ── Farm AI Tool Cards ── */}
                <div className="grid grid-cols-2 gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
                    {/* Crop Success Planner */}
                    <Link href="/farming-partner/crop-success-planner" className="block active:scale-[0.97] transition-transform duration-150">
                        <div className="h-full rounded-2xl overflow-hidden relative bg-gradient-to-br from-primary to-emerald-700 text-white shadow-md shadow-primary/20">
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
                            <div className="relative flex flex-col gap-3 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/20">
                                        <Wheat className="h-5 w-5 text-white" />
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-white/40" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">Planner</p>
                                    <h2 className="text-sm font-bold leading-tight mt-0.5">Crop Success</h2>
                                    <p className="text-[11px] text-white/70 mt-1 leading-snug">AI score, risks &amp; soil prep</p>
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Growth Timeline */}
                    <Link href="/growth-timeline" className="block active:scale-[0.97] transition-transform duration-150">
                        <div className="h-full rounded-2xl overflow-hidden relative bg-gradient-to-br from-teal-600 to-cyan-700 text-white shadow-md shadow-teal-500/20">
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
                            <div className="relative flex flex-col gap-3 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/20">
                                        <CalendarDays className="h-5 w-5 text-white" />
                                    </div>
                                    <span className="text-[9px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full">NEW</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">Timeline</p>
                                    <h2 className="text-sm font-bold leading-tight mt-0.5">Growth Plan</h2>
                                    <p className="text-[11px] text-white/70 mt-1 leading-snug">Week-by-week crop guide</p>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Harvest Optimizer — full width */}
                <Link href="/harvest-optimizer" className="block active:scale-[0.98] transition-transform duration-150 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
                    <div className="w-full rounded-2xl overflow-hidden relative bg-gradient-to-br from-amber-600 to-orange-700 text-white shadow-md shadow-amber-500/20">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 85% 30%, white 0%, transparent 65%)' }} />
                        <div className="relative flex items-center gap-4 p-4">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 shrink-0">
                                <Tractor className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <p className="text-sm font-bold leading-tight">Harvest Optimizer</p>
                                    <span className="text-[9px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full">NEW</span>
                                </div>
                                <p className="text-[11px] text-white/70 leading-snug">Timing · Readiness Signs · Yield Tips · Storage · Market</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-white/40 shrink-0" />
                        </div>
                    </div>
                </Link>

                {/* ── Latest Scan Card ── */}
                <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Latest Scan</p>
                    <LatestScanCard diagnoses={diagnosesLoading ? undefined : (pastDiagnoses ?? [])} />
                </div>

            </main>
        </div>
    );
}
