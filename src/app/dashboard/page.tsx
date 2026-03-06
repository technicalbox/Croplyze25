'use client';

import { Button } from "@/components/ui/button";
import { Bell, User, Wheat, ChevronRight, CalendarDays, Tractor, MapPin, Navigation, IndianRupee, Scale, FlaskConical } from "lucide-react";
import AlertBanner from "@/components/dashboard/alert-banner";
import QuickActions from "@/components/dashboard/quick-actions";
import LatestScanCard from "@/components/dashboard/latest-scan-card";
import WeatherAlertsPanel from "@/components/dashboard/weather-alerts-panel";
import { useCollection } from "@/firebase";
import { Diagnosis } from "@/lib/types";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import Link from 'next/link';
import { useUser as useUserFromAuth } from '@/firebase/auth/use-user';
import { format } from 'date-fns';
import { CropSearchInput } from "@/components/crops/CropSearchInput";
import { useRegion } from "@/providers/region-provider";
import RegionSelector from "@/components/region/RegionSelector";

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
    const { region, hasRegion, isDetecting, showPrompt, detectGPS, setManualRegion, dismissPrompt } = useRegion();
    const [regionSelectorOpen, setRegionSelectorOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);

    if (loading || !user) return <div>Loading...</div>;
    if (!user) return null;

    const firstName = user.displayName?.split(' ')[0] ?? 'Farmer';
    const todayStr = format(new Date(), 'EEEE, dd MMM yyyy');

    const locationLabel = hasRegion
        ? [region.city, region.state, region.country].filter(Boolean).join(', ')
        : 'Set your location';

    return (
        <div className="flex-1 bg-background">
            {/* ── Header (mobile only — desktop header handles this) ── */}
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b bg-background/80 backdrop-blur-sm px-4 lg:hidden">
                {/* Compact location chip */}
                <button
                    onClick={() => setRegionSelectorOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-primary/10 hover:bg-primary/15 transition-colors min-w-0 max-w-[180px]"
                >
                    {region.source === 'gps' ? (
                        <Navigation className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    ) : (
                        <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-foreground truncate">
                        {hasRegion ? (region.city || region.state || region.country) : 'Set location'}
                    </span>
                </button>

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
                <div className="animate-slide-up-fade">
                    <p className="text-3xl font-bold tracking-tight text-foreground">{getGreeting()}, {firstName} 🌱</p>
                    <p className="text-sm text-muted-foreground mt-1">{todayStr}</p>
                </div>

                {/* ── Global Crop Search ── */}
                <div className="animate-slide-up-fade delay-50 z-20 relative lg:hidden">
                    <CropSearchInput
                        placeholder="Search any crop (e.g., Rice, Tomato)..."
                        onSelect={(id) => router.push(`/crop/${id}`)}
                    />
                </div>

                {/* ── Alert Banner ── */}
                <div className="animate-slide-up-fade delay-[75ms] mt-2 z-10 relative">
                    <AlertBanner />
                </div>

                {/* ── Weather Alerts ── */}
                <div className="animate-slide-up-fade delay-100">
                    <WeatherAlertsPanel />
                </div>

                {/* ── Quick Actions ── */}
                <div className="animate-slide-up-fade delay-150">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Quick Actions</p>
                    <QuickActions />
                </div>

                {/* ── Farm AI Tool Cards ── */}
                <div className="grid grid-cols-2 gap-3 animate-slide-up-fade delay-225">
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

                {/* Treatment Predictor + Profit Predictor — side by side */}
                <div className="grid grid-cols-2 gap-3 animate-slide-up-fade delay-300">
                    <Link href="/farming-partner/treatment-predictor" className="block active:scale-[0.97] transition-transform duration-150">
                        <div className="h-full rounded-2xl overflow-hidden relative bg-gradient-to-br from-rose-600 to-red-700 text-white shadow-md shadow-rose-500/20">
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
                            <div className="relative flex flex-col gap-3 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/20">
                                        <FlaskConical className="h-5 w-5 text-white" />
                                    </div>
                                    <span className="text-[9px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full">NEW</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">Predictor</p>
                                    <h2 className="text-sm font-bold leading-tight mt-0.5">Treatment</h2>
                                    <p className="text-[11px] text-white/70 mt-1 leading-snug">Medicine & treatment success</p>
                                </div>
                            </div>
                        </div>
                    </Link>

                    <Link href="/farming-partner/profit-predictor" className="block active:scale-[0.97] transition-transform duration-150">
                        <div className="h-full rounded-2xl overflow-hidden relative bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-md shadow-violet-500/20">
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
                            <div className="relative flex flex-col gap-3 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/20">
                                        <IndianRupee className="h-5 w-5 text-white" />
                                    </div>
                                    <span className="text-[9px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full">NEW</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">Predictor</p>
                                    <h2 className="text-sm font-bold leading-tight mt-0.5">Profit</h2>
                                    <p className="text-[11px] text-white/70 mt-1 leading-snug">Costs & break-even estimate</p>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Crop Compare — compact full-width link */}
                <Link href="/farming-partner/crop-compare" className="block active:scale-[0.98] transition-transform duration-150 animate-slide-up-fade delay-300">
                    <div className="w-full rounded-2xl overflow-hidden relative bg-gradient-to-r from-sky-600 to-blue-700 text-white shadow-md shadow-sky-500/20">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 85% 30%, white 0%, transparent 65%)' }} />
                        <div className="relative flex items-center gap-3 px-4 py-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/20 shrink-0">
                                <Scale className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold leading-tight">Crop Compare</p>
                                <p className="text-[10px] text-white/60">Compare 2–3 crops side-by-side</p>
                            </div>
                            <span className="text-[9px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full shrink-0">NEW</span>
                            <ChevronRight className="h-4 w-4 text-white/40 shrink-0" />
                        </div>
                    </div>
                </Link>

                {/* Harvest Optimizer — compact full-width link (like Crop Compare) */}
                <Link href="/harvest-optimizer" className="block active:scale-[0.98] transition-transform duration-150 animate-slide-up-fade delay-300">
                    <div className="w-full rounded-2xl overflow-hidden relative bg-gradient-to-r from-amber-600 to-orange-700 text-white shadow-md shadow-amber-500/20">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 85% 30%, white 0%, transparent 65%)' }} />
                        <div className="relative flex items-center gap-3 px-4 py-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/20 shrink-0">
                                <Tractor className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold leading-tight">Harvest Optimizer</p>
                                <p className="text-[10px] text-white/60">Timing, yield & market tips</p>
                            </div>
                            <span className="text-[9px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full shrink-0">NEW</span>
                            <ChevronRight className="h-4 w-4 text-white/40 shrink-0" />
                        </div>
                    </div>
                </Link>

                {/* ── Latest Scan Card ── */}
                <div className="animate-slide-up-fade delay-375">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Latest Scan</p>
                    <LatestScanCard diagnoses={diagnosesLoading ? undefined : (pastDiagnoses ?? [])} />
                </div>

            </main>


            {/* ── Region Selector Modal ── */}
            <RegionSelector
                open={regionSelectorOpen}
                onClose={() => setRegionSelectorOpen(false)}
                onSelect={(country, countryCode, state, city) => {
                    setManualRegion(country, countryCode, state, city);
                    setRegionSelectorOpen(false);
                }}
                onDetectGPS={async () => {
                    await detectGPS();
                    setRegionSelectorOpen(false);
                }}
                isDetecting={isDetecting}
            />
        </div>
    );
}

