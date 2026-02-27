'use client';

import Link from 'next/link';
import { useUser as useUserFromAuth } from '@/firebase/auth/use-user';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ArrowLeft, Wheat, CalendarDays, ChevronRight, Sprout, BarChart3, Droplets, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TOOLS = [
    {
        href: '/farming-partner/crop-success-planner',
        icon: Wheat,
        title: 'Crop Success Planner',
        description: 'AI suitability score, risk analysis, and soil prep intelligence for your next crop.',
        tag: 'Popular',
        features: ['Suitability score', 'Risk analysis', 'Soil intelligence'],
        featureIcons: [Sprout, BarChart3, Droplets],
        gradient: 'from-primary to-emerald-700',
        shadow: 'shadow-primary/25',
    },
    {
        href: '/growth-timeline',
        icon: CalendarDays,
        title: 'Growth Timeline',
        description: 'Week-by-week watering, fertilizing, pest prevention, and weather precautions.',
        tag: 'New',
        features: ['Weekly watering', 'Fertilizer schedule', 'Pest prevention'],
        featureIcons: [Droplets, Sprout, Bug],
        gradient: 'from-teal-600 to-cyan-700',
        shadow: 'shadow-teal-500/25',
    },
];

export default function FarmingPartnerHubPage() {
    const { user, loading } = useUserFromAuth();
    const router = useRouter();

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
            {/* Header */}
            <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 backdrop-blur-sm px-4">
                <Button asChild variant="ghost" size="icon" className="shrink-0">
                    <Link href="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
                </Button>
                <div className="min-w-0">
                    <h1 className="text-base font-bold leading-tight">Farm AI</h1>
                    <p className="text-xs text-muted-foreground">AI-powered farming tools</p>
                </div>
            </header>

            <main className="flex flex-col gap-5 p-4 pb-28">

                {/* Hero */}
                <div className="pt-1 flex flex-col gap-1">
                    <p className="text-2xl font-black tracking-tight">Your AI Farming<br />
                        <span className="text-primary">Partner</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Plan, manage, and optimise every stage of your crop's life cycle.
                    </p>
                </div>

                {/* Tool cards */}
                <div className="flex flex-col gap-4">
                    {TOOLS.map((tool) => {
                        const Icon = tool.icon;
                        return (
                            <Link key={tool.href} href={tool.href} className="block active:scale-[0.98] transition-transform duration-150">
                                <div className={`w-full rounded-2xl overflow-hidden relative bg-gradient-to-br ${tool.gradient} text-white shadow-lg ${tool.shadow}`}>
                                    {/* Glow overlay */}
                                    <div className="absolute inset-0 opacity-10"
                                        style={{ backgroundImage: 'radial-gradient(circle at 85% 30%, white 0%, transparent 65%)' }} />

                                    <div className="relative p-5 flex flex-col gap-4">
                                        {/* Title row */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-white/20 shrink-0">
                                                    <Icon className="h-6 w-6 text-white" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <p className="text-base font-bold leading-tight">{tool.title}</p>
                                                        <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full">{tool.tag}</span>
                                                    </div>
                                                    <p className="text-xs text-white/75 leading-relaxed">{tool.description}</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-white/50 shrink-0 mt-1" />
                                        </div>

                                        {/* Feature strip */}
                                        <div className="flex gap-2">
                                            {tool.features.map((f, i) => {
                                                const FIcon = tool.featureIcons[i];
                                                return (
                                                    <div key={f} className="flex items-center gap-1 bg-white/10 rounded-lg px-2.5 py-1.5">
                                                        <FIcon className="h-3 w-3 text-white/70 shrink-0" />
                                                        <span className="text-[10px] font-medium text-white/80 whitespace-nowrap">{f}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Coming soon hint */}
                <div className="border border-dashed border-border rounded-2xl p-5 flex flex-col items-center gap-2 text-center">
                    <p className="text-sm font-semibold text-muted-foreground">More tools coming soon</p>
                    <p className="text-xs text-muted-foreground">Harvest optimizer, market price alerts, weather advisory…</p>
                </div>
            </main>
        </div>
    );
}
