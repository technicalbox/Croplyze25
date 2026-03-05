'use client';

/**
 * @fileOverview Farm Analytics Dashboard — /insights
 *
 * Central analytics hub. Collects all heavy analytics components that were
 * removed from the home screen in Phase 1. Also adds two KPI summary cards
 * (Farm Health Score + Risk Level) computed client-side from scan history.
 */

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useUser as useUserFromAuth } from '@/firebase/auth/use-user';
import { useCollection } from '@/firebase';
import { Diagnosis } from '@/lib/types';
import { Download, Loader2, BarChart2, ShieldCheck, ShieldAlert, ShieldX, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { format } from 'date-fns';
import { useTranslation } from '@/lib/i18n';
import { useNotification } from '@/providers/notification-provider';
import { haptics } from '@/lib/haptics';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import AlertBanner from '@/components/dashboard/alert-banner';
import AiInsightsPanel from '@/components/dashboard/ai-insights-panel';
import RiskEnginePanel from '@/components/dashboard/risk-engine-panel';
import DiseaseChart from '@/components/dashboard/disease-chart';
import HistoryTable from '@/components/dashboard/history-table';
import FarmSummaryReport from '@/components/dashboard/farm-summary-report';

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

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub: string;
    color: string;
    bg: string;
}

function KpiCard({ icon, label, value, sub, color, bg }: KpiCardProps) {
    return (
        <div className="flex-1 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                    <span style={{ color }}>{icon}</span>
                </div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">{label}</p>
            </div>
            <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{sub}</p>
        </div>
    );
}

// ─── Farm Health Score computation ────────────────────────────────────────────

function useFarmKpis(diagnoses: Diagnosis[] | null | undefined) {
    return useMemo(() => {
        if (!diagnoses || diagnoses.length === 0) {
            return { healthScore: null, riskLabel: null };
        }
        const total = diagnoses.length;
        const healthy = diagnoses.filter(d =>
            !d.diagnosis.diseaseName ||
            d.diagnosis.diseaseName === 'No disease detected' ||
            d.diagnosis.diseaseName === 'Healthy'
        ).length;

        const healthScore = Math.round((healthy / total) * 100);

        // Risk: count high-severity in last 30 days
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const recent = diagnoses.filter(d => {
            try { return d.createdAt.toMillis() >= thirtyDaysAgo; } catch { return false; }
        });
        const highCount = recent.filter(d => (d.diagnosis.severityLevel as string) === 'High').length;
        const medCount = recent.filter(d => (d.diagnosis.severityLevel as string) === 'Medium').length;
        const riskScore = highCount * 3 + medCount;

        const riskLabel =
            riskScore === 0 ? 'Low' :
                riskScore <= 2 ? 'Moderate' :
                    riskScore <= 5 ? 'High' : 'Critical';

        return { healthScore, riskLabel };
    }, [diagnoses]);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InsightsPage() {
    const { user, loading } = useUserFromAuth();
    const router = useRouter();
    const { t } = useTranslation();
    const addNotification = useNotification();
    const { data: pastDiagnoses, loading: diagnosesLoading } = useCollection<Diagnosis>(
        user ? `users/${user.uid}/cropDiagnoses` : undefined,
    );

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);

    const { healthScore, riskLabel } = useFarmKpis(pastDiagnoses);

    // ── PDF export (moved from old dashboard) ─────────────────────────────────
    const handleExportPdf = () => {
        haptics.light();
        if (!pastDiagnoses || pastDiagnoses.length === 0) {
            addNotification({ type: 'warning', title: 'No Data', message: 'No diagnosis history to export.' });
            return;
        }
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text('Croplyze — Crop Health History', 14, 22);

        const SEVERITY_MAP: Record<string, string> = {
            High: t('dashboard.historyTable.severityLevel.high'),
            Medium: t('dashboard.historyTable.severityLevel.medium'),
            Low: t('dashboard.historyTable.severityLevel.low'),
            'Not Applicable': t('dashboard.historyTable.severityLevel.notApplicable'),
        };

        const rows = pastDiagnoses.map(d => {
            const isHealthy = !d.diagnosis.diseaseName ||
                d.diagnosis.diseaseName === 'No disease detected' ||
                d.diagnosis.diseaseName === 'Healthy';
            return [
                d.cropType,
                d.diagnosis.diseaseName,
                isHealthy ? t('dashboard.historyTable.healthy') : SEVERITY_MAP[d.diagnosis.severityLevel as string],
                d.createdAt ? format(d.createdAt.toDate(), 'yyyy-MM-dd') : 'N/A',
            ];
        });

        autoTable(doc, {
            head: [[
                t('dashboard.historyTable.crop'),
                t('dashboard.historyTable.diagnosis'),
                t('dashboard.historyTable.severity'),
                t('dashboard.historyTable.date'),
            ]],
            body: rows,
            startY: 30,
            headStyles: { fillColor: [4, 120, 87] },
            theme: 'striped',
        });

        doc.save('croplyze-history.pdf');
        addNotification({ type: 'success', title: 'Export Successful', message: 'History exported to PDF.' });
    };

    if (loading || !user) return <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    const RISK_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
        Low: { color: '#22c55e', bg: '#22c55e18', icon: <ShieldCheck className="h-4 w-4" /> },
        Moderate: { color: '#f59e0b', bg: '#f59e0b18', icon: <Shield className="h-4 w-4" /> },
        High: { color: '#f97316', bg: '#f9731618', icon: <ShieldAlert className="h-4 w-4" /> },
        Critical: { color: '#ef4444', bg: '#ef444418', icon: <ShieldX className="h-4 w-4" /> },
    };
    const riskCfg = RISK_CONFIG[riskLabel ?? 'Low'] ?? RISK_CONFIG['Low'];

    return (
        <div className="flex-1 bg-background">
            {/* ── Header ── */}
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-sm px-4">
                <div className="flex items-center gap-2">
                    <BarChart2 className="h-5 w-5 text-primary" />
                    <h1 className="text-xl font-bold">Farm Dashboard</h1>
                </div>
                <Button onClick={handleExportPdf} variant="ghost" size="icon" title="Export PDF">
                    <Download className="h-5 w-5" />
                </Button>
            </header>

            <main className="flex flex-col gap-5 p-4">

                {/* ── Farm Summary Report ── */}
                <FarmSummaryReport diagnoses={pastDiagnoses ?? []} />

                {/* ── KPI row ── */}
                <div className="flex gap-3 animate-in fade-in-0 duration-300">
                    {/* Farm Health Score */}
                    {healthScore !== null ? (
                        <KpiCard
                            icon={<ShieldCheck className="h-4 w-4" />}
                            label="Farm Health"
                            value={`${healthScore}/100`}
                            sub={healthScore >= 75 ? 'Good condition' : healthScore >= 50 ? 'Needs attention' : 'At risk'}
                            color={healthScore >= 75 ? '#22c55e' : healthScore >= 50 ? '#f59e0b' : '#ef4444'}
                            bg={healthScore >= 75 ? '#22c55e18' : healthScore >= 50 ? '#f59e0b18' : '#ef444418'}
                        />
                    ) : (
                        <KpiCard
                            icon={<ShieldCheck className="h-4 w-4" />}
                            label="Farm Health"
                            value="—"
                            sub="No scans yet"
                            color="#94a3b8"
                            bg="#94a3b818"
                        />
                    )}

                    {/* Risk Level */}
                    <KpiCard
                        icon={riskCfg.icon}
                        label="Risk Level"
                        value={riskLabel ?? '—'}
                        sub={riskLabel ? 'Last 30 days' : 'No scans yet'}
                        color={riskCfg.color}
                        bg={riskCfg.bg}
                    />
                </div>

                {/* ── Alert Banner ── */}
                <div className="animate-in fade-in-0 duration-400">
                    <AlertBanner />
                </div>

                {/* ── AI Insights ── */}
                <AiInsightsPanel diagnoses={pastDiagnoses ?? []} />

                {/* ── Risk Engine ── */}
                <RiskEnginePanel diagnoses={pastDiagnoses ?? []} />

                {/* ── Disease Trend ── */}
                <SectionDivider label="Disease Trend" />
                <Card className="w-full rounded-2xl overflow-hidden">
                    <CardHeader>
                        <CardTitle>{t('dashboard.frequencyTitle')}</CardTitle>
                        <CardDescription>{t('dashboard.frequencyDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DiseaseChart diagnoses={pastDiagnoses} />
                    </CardContent>
                </Card>

                {/* ── Scan History ── */}
                <SectionDivider label="Scan History" />
                {diagnosesLoading ? (
                    <Card className="w-full rounded-2xl">
                        <CardContent className="flex items-center justify-center min-h-[200px]">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        </CardContent>
                    </Card>
                ) : pastDiagnoses && pastDiagnoses.length > 0 ? (
                    <Card className="w-full rounded-2xl overflow-hidden">
                        <CardHeader>
                            <CardTitle>{t('dashboard.historyTitle')}</CardTitle>
                            <CardDescription>{t('dashboard.historyDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <HistoryTable diagnoses={pastDiagnoses} />
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="w-full rounded-2xl">
                        <CardContent className="flex flex-col items-center justify-center min-h-[180px] text-center p-6">
                            <BarChart2 className="h-10 w-10 text-muted-foreground mb-3" />
                            <h3 className="text-base font-semibold">{t('dashboard.noHistoryTitle')}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{t('dashboard.noHistoryDescription')}</p>
                            <Link href="/scan" className="mt-4">
                                <Button size="sm" className="rounded-xl">Scan your first crop</Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}

                {/* Bottom padding for FAB / nav */}
                <div className="h-4" />
            </main>
        </div>
    );
}
