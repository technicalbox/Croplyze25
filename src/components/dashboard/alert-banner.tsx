'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CloudRain, Droplet, ShieldAlert, ChevronRight, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useRegion } from '@/providers/region-provider';
import Link from 'next/link';
import type { OutbreakAlert } from '@/lib/alert-types';

const TYPE_ICONS: Record<string, React.ReactNode> = {
    disease: <ShieldAlert className="h-4 w-4" />,
    weather: <CloudRain className="h-4 w-4" />,
    irrigation: <Droplet className="h-4 w-4" />,
};

const SEVERITY_VARIANTS: Record<string, 'warning' | 'destructive' | 'default'> = {
    critical: 'destructive',
    high: 'destructive',
    moderate: 'warning',
    low: 'default',
};

export default function AlertBanner() {
    const { t } = useTranslation();
    const { gps, hasRegion, region } = useRegion();
    const [topAlert, setTopAlert] = useState<OutbreakAlert | null>(null);
    const [alertCount, setAlertCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function fetchTopAlert() {
            try {
                const lat = gps?.lat ?? 20.5937;
                const lng = gps?.lng ?? 78.9629;
                const regionStr = hasRegion
                    ? [region.city, region.state, region.country].filter(Boolean).join(', ')
                    : undefined;

                const res = await fetch('/api/alerts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lat, lng, cropType: 'rice', region: regionStr }),
                });

                if (!res.ok || cancelled) return;
                const data = await res.json();

                if (!cancelled && data.alerts?.length > 0) {
                    // Only show weather alerts on the dashboard banner
                    const weatherAlerts = data.alerts.filter((a: any) => a.category === 'weather');
                    if (weatherAlerts.length > 0) {
                        setTopAlert(weatherAlerts[0]);
                        setAlertCount(weatherAlerts.length);
                    }
                }
            } catch {
                // silent fail for banner — full alerts page handles errors
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchTopAlert();
        return () => { cancelled = true; };
    }, [gps, hasRegion, region]);

    if (loading) {
        return (
            <div className="rounded-xl border border-border bg-card p-3 animate-pulse">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted" />
                    <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-muted rounded w-2/3" />
                        <div className="h-2.5 bg-muted rounded w-4/5" />
                    </div>
                </div>
            </div>
        );
    }

    if (!topAlert) {
        return (
            <Alert variant="default" className="bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30">
                <AlertTriangle className="h-4 w-4 text-green-600" />
                <AlertTitle className="font-bold text-green-700 dark:text-green-400">All Clear</AlertTitle>
                <AlertDescription className="text-green-600/80 dark:text-green-400/70">
                    No active alerts. Weather conditions are favorable for your crops.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <Link href="/alerts" className="block">
            <Alert
                variant={SEVERITY_VARIANTS[topAlert.severity] ?? 'warning'}
                className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
            >
                {TYPE_ICONS[topAlert.type] ?? <AlertTriangle className="h-4 w-4" />}
                <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                        <AlertTitle className="font-bold text-sm leading-tight truncate">
                            {topAlert.title}
                        </AlertTitle>
                        <AlertDescription className="text-xs line-clamp-1 mt-0.5">
                            {topAlert.message}
                        </AlertDescription>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {alertCount > 1 && (
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                                {alertCount}
                            </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                </div>
            </Alert>
        </Link>
    );
}
