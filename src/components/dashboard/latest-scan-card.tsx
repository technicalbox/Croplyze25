'use client';

/**
 * @fileOverview Latest scan result card for the Home dashboard.
 * Shows only the most recent Diagnosis — clean, minimal, tappable.
 */

import Link from 'next/link';
import { ScanLine, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Diagnosis } from '@/lib/types';
import { format } from 'date-fns';
import { useTranslate } from '@/hooks/use-translate';

// ─── Severity config ──────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
    High: { label: 'High Severity', color: '#ef4444', bg: '#ef444415' },
    Medium: { label: 'Med Severity', color: '#f97316', bg: '#f9731615' },
    Low: { label: 'Low Severity', color: '#f59e0b', bg: '#f59e0b15' },
    'Not Applicable': { label: 'Healthy', color: '#22c55e', bg: '#22c55e15' },
};

interface LatestScanCardProps {
    diagnoses: Diagnosis[] | undefined;
}

export default function LatestScanCard({ diagnoses }: LatestScanCardProps) {
    const latest = diagnoses?.[0];
    const rawDiseaseName = latest?.diagnosis?.diseaseName ?? '';
    const translatedDisease = useTranslate(rawDiseaseName);

    // ── Empty state ──────────────────────────────────────────────────────────
    if (!diagnoses || diagnoses.length === 0) {
        return (
            <Link href="/scan" className="block active:scale-[0.98] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md card-hover">
                <div className="rounded-2xl border border-dashed border-border bg-card p-5 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-none">
                        <ScanLine className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">No scans yet</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Tap here to scan your first crop
                        </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-none" />
                </div>
            </Link>
        );
    }

    if (!latest) return null;
    const isHealthy =
        !latest.diagnosis.diseaseName ||
        latest.diagnosis.diseaseName === 'No disease detected' ||
        latest.diagnosis.diseaseName === 'Healthy';

    const sev = latest.diagnosis.severityLevel as keyof typeof SEVERITY_CONFIG;
    const sevConfig = SEVERITY_CONFIG[sev] ?? SEVERITY_CONFIG['Not Applicable'];
    const displayDisease = isHealthy ? 'No disease detected' : translatedDisease;

    let dateStr = '';
    try { dateStr = format(latest.createdAt.toDate(), 'dd MMM yyyy'); } catch { dateStr = ''; }

    return (
        <Link
            href={`/scan/${latest.id}`}
            className="block active:scale-[0.98] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
        >
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                {/* Top accent bar */}
                <div
                    className="h-1.5 w-full"
                    style={{ background: isHealthy ? '#22c55e' : sevConfig.color }}
                />
                <div className="p-4 flex items-center gap-3">
                    {/* Icon */}
                    <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-none"
                        style={{ background: isHealthy ? '#22c55e15' : sevConfig.bg }}
                    >
                        {isHealthy
                            ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                            : <AlertCircle className="h-5 w-5" style={{ color: sevConfig.color }} />}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-bold text-foreground capitalize truncate">
                                {latest.cropType}
                            </p>
                            {/* Severity badge */}
                            <span
                                className="flex-none text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: sevConfig.bg, color: sevConfig.color }}
                            >
                                {isHealthy ? 'Healthy' : sevConfig.label}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{displayDisease}</p>
                        {dateStr && (
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">{dateStr}</p>
                        )}
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-none" />
                </div>

                {/* Footer label */}
                <div className="px-4 pb-3">
                    <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-semibold">
                        Latest scan · Tap to view full report
                    </p>
                </div>
            </div>
        </Link>
    );
}
