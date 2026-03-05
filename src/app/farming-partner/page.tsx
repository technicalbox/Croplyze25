'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser as useUserFromAuth } from '@/firebase/auth/use-user';
import { useChatbot } from '@/components/chatbot/chat-provider';
import {
    Wheat, CalendarDays, Tractor, ChevronRight,
    Sprout, BarChart3, Droplets, Bug, TrendingUp, Package,
    Sparkles, ScanLine, Bot, IndianRupee, Target, Scale,
    FileBarChart,
} from 'lucide-react';
import Link from 'next/link';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

// ─── AI Chat Tools ────────────────────────────────────────────────────────────

const AI_TOOLS = [
    {
        id: 'crop-planner',
        icon: Sprout,
        label: 'Crop Planner',
        sublabel: 'Best crop for your season',
        gradient: 'from-green-500 to-emerald-600',
        shadow: 'shadow-green-500/20',
        prompt: 'Suggest the best crops I can plant this season based on my soil type and local weather conditions. Give me a ranked list with reasons.',
    },
    {
        id: 'yield-predictor',
        icon: BarChart3,
        label: 'Yield Predictor',
        sublabel: 'Estimate your harvest',
        gradient: 'from-blue-500 to-indigo-600',
        shadow: 'shadow-blue-500/20',
        prompt: 'What yield can I realistically expect from my current crop? What are the top 3 things I can do right now to improve my final yield?',
    },
    {
        id: 'fertilizer',
        icon: Droplets,
        label: 'Fertilizer Guide',
        sublabel: 'NPK & organic advice',
        gradient: 'from-teal-500 to-cyan-600',
        shadow: 'shadow-teal-500/20',
        prompt: 'What fertilizer should I use for my crop at this growth stage? Give me both a chemical and an organic option with dosage and timing.',
    },
    {
        id: 'pest',
        icon: Bug,
        label: 'Pest Solution',
        sublabel: 'Identify & treat pests',
        gradient: 'from-rose-500 to-red-600',
        shadow: 'shadow-rose-500/20',
        prompt: 'My crop is showing signs of pest damage. Help me identify the most likely pest based on common symptoms, and give me organic and chemical treatment options.',
    },
    {
        id: 'harvest',
        icon: TrendingUp,
        label: 'Harvest Guide',
        sublabel: 'Timing & readiness signs',
        gradient: 'from-amber-500 to-orange-600',
        shadow: 'shadow-amber-500/20',
        prompt: 'When is the optimal time to harvest my crop? What are the key readiness signs I should look for, and how do I maximise my yield at harvest?',
    },
];

// ─── Deep-link Farm Tools (keep existing) ────────────────────────────────────

const FARM_TOOLS = [
    {
        href: '/farming-partner/crop-success-planner',
        icon: Wheat,
        title: 'Crop Success Planner',
        description: 'AI suitability score, risk analysis, and soil prep intelligence.',
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
    {
        href: '/growth-timeline?tab=weekly-report',
        icon: FileBarChart,
        title: 'Weekly Growth Report',
        description: 'AI-powered weekly crop analysis with health summary, risks, and recommendations.',
        tag: 'New',
        features: ['Health analysis', 'Risk detection', 'Weekly insights'],
        featureIcons: [BarChart3, Bug, Sparkles],
        gradient: 'from-cyan-600 to-blue-700',
        shadow: 'shadow-cyan-500/25',
    },
    {
        href: '/harvest-optimizer',
        icon: Tractor,
        title: 'Harvest Optimizer',
        description: 'Best harvest timing, readiness signs, yield tips, storage & market strategy.',
        tag: 'New',
        features: ['Harvest timing', 'Yield tips', 'Market strategy'],
        featureIcons: [TrendingUp, Package, BarChart3],
        gradient: 'from-amber-600 to-orange-700',
        shadow: 'shadow-amber-500/25',
    },
    {
        href: '/farming-partner/profit-predictor',
        icon: IndianRupee,
        title: 'Profit Predictor',
        description: 'Estimate profit, costs, and break-even before planting.',
        tag: 'New',
        features: ['Revenue estimate', 'Cost analysis', 'Break-even'],
        featureIcons: [TrendingUp, BarChart3, Target],
        gradient: 'from-violet-600 to-purple-700',
        shadow: 'shadow-violet-500/25',
    },
    {
        href: '/farming-partner/crop-compare',
        icon: Scale,
        title: 'Crop Compare',
        description: 'Compare 2–3 crops side-by-side to pick the best one.',
        tag: 'New',
        features: ['Side-by-side', 'Risk analysis', 'Best pick'],
        featureIcons: [BarChart3, Bug, Sparkles],
        gradient: 'from-sky-600 to-blue-700',
        shadow: 'shadow-sky-500/25',
    },
    {
        href: '/farming-partner/crop-combination',
        icon: Sprout,
        title: 'Crop Combination',
        description: 'Find crops that grow well together for better yield & soil health.',
        tag: 'New',
        features: ['Companion crops', 'Pest reduction', 'Yield boost'],
        featureIcons: [Sprout, Bug, TrendingUp],
        gradient: 'from-emerald-600 to-lime-700',
        shadow: 'shadow-emerald-500/25',
    },
];

// ─── Section divider ──────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border dark:bg-white/10" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-2">{label}</span>
            <div className="flex-1 h-px bg-border dark:bg-white/10" />
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FarmingPartnerHubPage() {
    const { user, loading } = useUserFromAuth();
    const router = useRouter();
    const { openChat, openChatWithMessage } = useChatbot();

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
            {/* ── Header ── */}
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-sm px-4">
                <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    <h1 className="text-xl font-bold">Farm AI Advisor</h1>
                </div>
                <button
                    onClick={() => { haptics.light(); openChat(); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold active:scale-95 transition-transform duration-150"
                >
                    <Sparkles className="h-3.5 w-3.5" />
                    Open Chat
                </button>
            </header>

            <main className="flex flex-col gap-5 p-4">

                {/* ── HERO ── */}
                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary via-emerald-600 to-teal-700 text-white p-5 shadow-xl shadow-primary/25">
                    {/* Background glow orb */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/8 blur-2xl pointer-events-none" />

                    {/* Online indicator */}
                    <div className="flex items-center gap-1.5 mb-3">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                        </span>
                        <span className="text-[11px] font-semibold text-white/70 uppercase tracking-wider">Fasal AI · Online</span>
                    </div>

                    <h2 className="text-2xl font-bold leading-tight mb-1">Ask anything<br />about your farm</h2>
                    <p className="text-sm text-white/70 mb-4">Crops · Soil · Pests · Weather · Harvest</p>

                    {/* Tap-to-chat input mockup */}
                    <button
                        onClick={() => { haptics.medium(); openChat(); }}
                        className="w-full flex items-center gap-3 bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 text-left active:scale-[0.98] transition-transform duration-150"
                    >
                        <ScanLine className="h-4 w-4 text-white/60 flex-none" />
                        <span className="text-sm text-white/60">What's on your mind? Ask about crops, soil…</span>
                    </button>
                </div>

                {/* ── AI TOOLS ── */}
                <SectionDivider label="AI Tools" />

                <div className="grid grid-cols-2 gap-3">
                    {AI_TOOLS.slice(0, 4).map(tool => (
                        <button
                            key={tool.id}
                            onClick={() => { haptics.medium(); openChatWithMessage(tool.prompt); }}
                            className={cn(
                                'flex flex-col items-start gap-2 p-4 rounded-2xl text-left',
                                'bg-gradient-to-br', tool.gradient,
                                'shadow-md', tool.shadow,
                                'active:scale-[0.97] transition-transform duration-150',
                            )}
                        >
                            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                                <tool.icon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white leading-tight">{tool.label}</p>
                                <p className="text-[11px] text-white/70 mt-0.5 leading-snug">{tool.sublabel}</p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* 5th tool — full width */}
                {(() => {
                    const tool5 = AI_TOOLS[4];
                    if (!tool5) return null;
                    const Icon5 = tool5.icon;
                    return (
                        <button
                            onClick={() => { haptics.medium(); openChatWithMessage(tool5.prompt); }}
                            className={cn(
                                'w-full flex items-center gap-4 p-4 rounded-2xl text-left',
                                'bg-gradient-to-r', tool5.gradient,
                                'shadow-md', tool5.shadow,
                                'active:scale-[0.98] transition-transform duration-150',
                            )}
                        >
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-none">
                                <Icon5 className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white">{tool5.label}</p>
                                <p className="text-[11px] text-white/70">{tool5.sublabel}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-white/40 flex-none" />
                        </button>
                    );
                })()}

                {/* ── FARM TOOLS ── */}
                <SectionDivider label="Farm Tools" />

                <div className="flex flex-col gap-3">
                    {FARM_TOOLS.map(tool => (
                        <Link
                            key={tool.href}
                            href={tool.href}
                            onClick={() => haptics.light()}
                            className="block active:scale-[0.98] transition-transform duration-150"
                        >
                            <div className={cn(
                                'relative rounded-2xl overflow-hidden',
                                'bg-gradient-to-br', tool.gradient,
                                'text-white shadow-md', tool.shadow,
                            )}>
                                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
                                <div className="relative flex items-center gap-4 p-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-none">
                                        <tool.icon className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <p className="text-sm font-bold leading-tight">{tool.title}</p>
                                            {tool.tag && (
                                                <span className="text-[9px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full">{tool.tag}</span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-white/70 leading-snug">{tool.description}</p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-white/40 flex-none" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

            </main>
        </div>
    );
}
