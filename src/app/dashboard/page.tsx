'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, History, Loader2, User, Bell, Wheat, ChevronRight, Sprout, BarChart3 } from "lucide-react";
import AlertBanner from "@/components/dashboard/alert-banner";
import HistoryTable from "@/components/dashboard/history-table";
import DiseaseChart from "@/components/dashboard/disease-chart";
import { useUser, useCollection } from "@/firebase";
import { Diagnosis } from "@/lib/types";
import { useRouter } from 'next/navigation';
import { useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { useNotification } from "@/providers/notification-provider";
import { haptics } from "@/lib/haptics";
import Link from 'next/link';
import { useUser as useUserFromAuth } from '@/firebase/auth/use-user';

export default function DashboardPage() {
    const { user, loading } = useUserFromAuth();
    const router = useRouter();
    const { data: pastDiagnoses, loading: diagnosesLoading } = useCollection<Diagnosis>(
        user ? `users/${user.uid}/cropDiagnoses` : undefined,
    );
    const { t } = useTranslation();
    const addNotification = useNotification();

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);

    const handleExportPdf = () => {
        haptics.light();
        if (!pastDiagnoses || pastDiagnoses.length === 0) {
            addNotification({
                type: "warning",
                title: "No Data to Export",
                message: "There is no diagnosis history to export.",
            });
            return;
        }

        const doc = new jsPDF();

        doc.setFontSize(20);
        doc.text("Croplyze - Crop Health History", 14, 22);

        const tableColumns = [
            t('dashboard.historyTable.crop'),
            t('dashboard.historyTable.diagnosis'),
            t('dashboard.historyTable.severity'),
            t('dashboard.historyTable.date')
        ];
        const tableRows: (string[])[] = [];

        const severityTranslationMap = {
            'High': t('dashboard.historyTable.severityLevel.high'),
            'Medium': t('dashboard.historyTable.severityLevel.medium'),
            'Low': t('dashboard.historyTable.severityLevel.low'),
            'Not Applicable': t('dashboard.historyTable.severityLevel.notApplicable'),
        };

        pastDiagnoses.forEach(diag => {
            const isHealthy = !diag.diagnosis.diseaseName || diag.diagnosis.diseaseName === 'No disease detected' || diag.diagnosis.diseaseName === 'Healthy';
            const severity = isHealthy ? t('dashboard.historyTable.healthy') : severityTranslationMap[diag.diagnosis.severityLevel as keyof typeof severityTranslationMap];
            const diagnosisData = [
                diag.cropType,
                diag.diagnosis.diseaseName,
                severity,
                diag.createdAt ? format(diag.createdAt.toDate(), 'yyyy-MM-dd') : 'N/A'
            ];
            tableRows.push(diagnosisData);
        });

        autoTable(doc, {
            head: [tableColumns],
            body: tableRows,
            startY: 30,
            headStyles: { fillColor: [4, 120, 87] }, // primary-main color
            theme: 'striped',
        });

        doc.save('croplyze-history.pdf');
        addNotification({
            type: "success",
            title: "Export Successful",
            message: "Your diagnosis history has been exported to PDF.",
        });
    };

    const hasHistory = pastDiagnoses && pastDiagnoses.length > 0;

    if (loading || !user) return <div>Loading...</div>;
    if (!user) return null;

    return (
        <div className="flex-1 bg-background">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-sm px-4">
                <h1 className="text-xl font-bold">{t('dashboard.title')}</h1>
                <div className="flex items-center gap-1">
                    <Button onClick={handleExportPdf} variant="ghost" size="icon">
                        <Download className="h-5 w-5" />
                    </Button>
                    <Button asChild variant="ghost" size="icon">
                        <Link href="/alerts"><Bell className="h-5 w-5" /></Link>
                    </Button>
                    <Button asChild variant="ghost" size="icon">
                        <Link href="/profile"><User className="h-5 w-5" /></Link>
                    </Button>
                </div>
            </header>

            <main className="flex flex-1 flex-col gap-4 p-4">
                <div className="animate-in fade-in-0 duration-500">
                    <AlertBanner />
                </div>

                {/* ── Farming Partner Engine Banner ── */}
                <Link href="/farming-partner/crop-success-planner" className="block animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
                    <div className="w-full rounded-2xl overflow-hidden relative bg-gradient-to-br from-primary to-emerald-700 text-white shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }} />
                        <div className="relative flex items-center gap-4 p-5">
                            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/20 shrink-0">
                                <Wheat className="h-7 w-7 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-0.5">New Feature</p>
                                <h2 className="text-base font-bold leading-tight">Crop Success Planner</h2>
                                <p className="text-xs text-white/80 mt-0.5">AI suitability score, risks &amp; prep steps</p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-white/60 shrink-0" />
                        </div>
                        <div className="flex border-t border-white/10">
                            {[
                                { icon: Sprout, label: 'Suitability Score' },
                                { icon: BarChart3, label: 'Risk Analysis' },
                                { icon: Wheat, label: 'Prep Plan' },
                            ].map(({ icon: Icon, label }) => (
                                <div key={label} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-white/70">
                                    <Icon className="h-3.5 w-3.5" />
                                    <span className="text-[10px] font-medium">{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Link>

                <div className="flex flex-col gap-4">
                    <Card className="w-full max-w-full rounded-2xl p-4 overflow-hidden break-words">
                        <CardHeader>
                            <CardTitle>{t('dashboard.frequencyTitle')}</CardTitle>
                            <CardDescription>{t('dashboard.frequencyDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <DiseaseChart diagnoses={pastDiagnoses} />
                        </CardContent>
                    </Card>

                    {diagnosesLoading ? (
                        <Card className="w-full max-w-full rounded-2xl p-4 overflow-hidden break-words">
                            <CardHeader>
                                <CardTitle>{t('dashboard.historyTitle')}</CardTitle>
                                <CardDescription>{t('dashboard.historyDescription')}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            </CardContent>
                        </Card>
                    ) : hasHistory ? (
                        <Card className="w-full max-w-full rounded-2xl p-4 overflow-hidden break-words">
                            <CardHeader>
                                <CardTitle>{t('dashboard.historyTitle')}</CardTitle>
                                <CardDescription>{t('dashboard.historyDescription')}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <HistoryTable diagnoses={pastDiagnoses} />
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="w-full max-w-full rounded-2xl p-4 overflow-hidden break-words">
                            <CardHeader>
                                <CardTitle>{t('dashboard.historyTitle')}</CardTitle>
                                <CardDescription>{t('dashboard.historyDescription')}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-6">
                                <History className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold">{t('dashboard.noHistoryTitle')}</h3>
                                <p className="text-muted-foreground text-sm">{t('dashboard.noHistoryDescription')}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    );
}
