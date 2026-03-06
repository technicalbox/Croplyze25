'use client';

/**
 * @fileOverview Weather Alerts Panel — dashboard section showing up to 3
 * real-time weather alerts with severity badges, icons, and data source info.
 *
 * Features:
 * - Auto-fetches alerts on mount using the user's GPS location
 * - Stores alerts in Firestore for persistence
 * - Sends browser push notifications for warning/critical alerts
 * - Mobile-first responsive card layout
 * - "View Detailed Forecast" link to full alerts page
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
    CloudRain, Sun, Snowflake, Wind, Thermometer,
    AlertTriangle, ShieldAlert, Droplet, ChevronRight,
    Loader2, CloudOff, Clock, MapPin, Database, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useRegion } from '@/providers/region-provider';
import { useUser, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import type { OutbreakAlert, AlertResponse } from '@/lib/alert-types';
import { saveWeatherAlerts } from '@/services/weather-alerts-firestore';
import {
    requestNotificationPermission,
    sendAlertNotifications,
    isNotificationSupported,
} from '@/services/push-notifications';

// ── Severity config ──────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<string, {
    label: string;
    bg: string;
    text: string;
    border: string;
    dot: string;
}> = {
    critical: {
        label: 'Critical',
        bg: 'bg-red-500/10',
        text: 'text-red-700 dark:text-red-400',
        border: 'border-red-200 dark:border-red-800/40',
        dot: 'bg-red-500',
    },
    high: {
        label: 'High',
        bg: 'bg-orange-500/10',
        text: 'text-orange-700 dark:text-orange-400',
        border: 'border-orange-200 dark:border-orange-800/40',
        dot: 'bg-orange-500',
    },
    moderate: {
        label: 'Moderate',
        bg: 'bg-amber-500/10',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800/40',
        dot: 'bg-amber-500',
    },
    low: {
        label: 'Low',
        bg: 'bg-green-500/10',
        text: 'text-green-700 dark:text-green-400',
        border: 'border-green-200 dark:border-green-800/40',
        dot: 'bg-green-500',
    },
};

// ── Icon mapping ─────────────────────────────────────────────────────────────

function AlertIcon({ type, severity }: { type: string; severity: string }) {
    const sizeClass = 'h-5 w-5';
    const cfg = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.info;

    const icons: Record<string, React.ReactNode> = {
        weather: <CloudRain className={cn(sizeClass, cfg.text)} />,
        disease: <ShieldAlert className={cn(sizeClass, cfg.text)} />,
        irrigation: <Droplet className={cn(sizeClass, cfg.text)} />,
    };

    // Sub-type icons based on title keywords
    return icons[type] ?? <AlertTriangle className={cn(sizeClass, cfg.text)} />;
}

function getWeatherIcon(alert: OutbreakAlert): React.ReactNode {
    const title = alert.title.toLowerCase();
    const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info;
    const cls = cn('h-5 w-5', cfg.text);

    if (title.includes('rain') || title.includes('storm')) return <CloudRain className={cls} />;
    if (title.includes('heat') || title.includes('temperature')) return <Thermometer className={cls} />;
    if (title.includes('frost') || title.includes('cold')) return <Snowflake className={cls} />;
    if (title.includes('wind')) return <Wind className={cls} />;
    if (title.includes('blight') || title.includes('disease') || title.includes('risk')) return <ShieldAlert className={cls} />;
    if (title.includes('irrigat')) return <Droplet className={cls} />;
    return <AlertTriangle className={cls} />;
}

// ── Skeleton loader ──────────────────────────────────────────────────────────

function AlertCardSkeleton() {
    return (
        <div className="rounded-2xl border border-border bg-card p-4 animate-pulse">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="flex gap-2">
                        <div className="h-5 bg-muted rounded-full w-16" />
                        <div className="h-5 bg-muted rounded-full w-20" />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Single alert card ────────────────────────────────────────────────────────

function WeatherAlertCard({
    alert,
    index,
}: {
    alert: OutbreakAlert;
    index: number;
}) {
    const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info;
    const icon = getWeatherIcon(alert);

    return (
        <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.08 }}
        >
            <Link href="/alerts" className="block active:scale-[0.98] transition-transform">
                <div className={cn(
                    'rounded-2xl border p-4 bg-card shadow-sm hover:shadow-md transition-shadow',
                    cfg.border,
                )}>
                    <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                            cfg.bg,
                        )}>
                            {icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            {/* Title + severity badge */}
                            <div className="flex items-start justify-between gap-2">
                                <h3 className="text-sm font-bold text-foreground leading-tight line-clamp-1">
                                    {alert.title.replace(/^[⚠🌧💧🌡💨🚿🦠] ?/, '')}
                                </h3>
                                <span className={cn(
                                    'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0',
                                    cfg.bg, cfg.text,
                                )}>
                                    <span className={cn('w-1.5 h-1.5 rounded-full mr-1', cfg.dot)} />
                                    {cfg.label}
                                </span>
                            </div>

                            {/* Description */}
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                {alert.message}
                            </p>

                            {/* Meta row: location + time + source */}
                            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2">
                                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {alert.timestamp}
                                </span>
                                {alert.source?.name && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                        <Database className="h-3 w-3" />
                                        {alert.source.name}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Chevron */}
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-1" />
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ location }: { location: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-border bg-card p-6 text-center"
        >
            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <Sun className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm font-semibold text-foreground">
                No weather alerts for your farm today
            </p>
            <p className="text-xs text-muted-foreground mt-1">
                Weather conditions look favorable. We&apos;ll notify you if anything changes.
            </p>
            {location && (
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center justify-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {location}
                </p>
            )}
        </motion.div>
    );
}

// ── Main Panel ───────────────────────────────────────────────────────────────

export default function WeatherAlertsPanel() {
    const [alerts, setAlerts] = useState<OutbreakAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { region, gps, hasRegion } = useRegion();
    const { user } = useUser();
    const db = useFirestore();
    const fetchedRef = useRef(false);

    const locationLabel = hasRegion
        ? [region.city, region.state].filter(Boolean).join(', ') || region.country
        : '';

    useEffect(() => {
        if (fetchedRef.current) return;
        fetchedRef.current = true;

        async function load() {
            setLoading(true);
            try {
                const lat = gps?.lat ?? 20.5937;
                const lng = gps?.lng ?? 78.9629;
                const regionStr = hasRegion
                    ? [region.city, region.state, region.country].filter(Boolean).join(', ')
                    : undefined;

                const res = await fetch('/api/alerts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        lat,
                        lng,
                        cropType: 'rice',
                        region: regionStr,
                    }),
                });

                if (!res.ok) throw new Error(`Server error: ${res.status}`);
                const data: AlertResponse = await res.json();

                // Filter to only WEATHER category alerts for the dashboard panel
                // All other categories (crop_risk, irrigation, market, etc.) stay on /alerts page
                const weatherOnly = (data.alerts ?? []).filter(a => a.category === 'weather');
                const topAlerts = weatherOnly.slice(0, 3);
                setAlerts(topAlerts);

                // Save to Firestore for persistence
                if (user && db && topAlerts.length > 0) {
                    try {
                        await saveWeatherAlerts(db, user.uid, topAlerts, regionStr ?? 'Unknown');
                    } catch (e) {
                        console.warn('[weather-alerts] Firestore save failed:', e);
                    }
                }

                // Send push notifications for warning/critical
                if (topAlerts.length > 0) {
                    // Request permission if not yet granted
                    if (isNotificationSupported()) {
                        await requestNotificationPermission();
                    }
                    sendAlertNotifications(
                        topAlerts.map(a => ({
                            type: a.type,
                            severity: a.severity,
                            title: a.title,
                            message: a.message,
                            alertId: a.id,
                        }))
                    );
                }
            } catch (err) {
                console.error('[weather-alerts] Failed:', err);
                setError(err instanceof Error ? err.message : 'Failed to load');
            } finally {
                setLoading(false);
            }
        }

        load();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="flex flex-col gap-3">
            {/* Section header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <CloudRain className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-foreground leading-tight">
                            Weather Alerts
                        </h2>
                        {locationLabel && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <MapPin className="h-2.5 w-2.5" />
                                {locationLabel}
                            </p>
                        )}
                    </div>
                </div>
                <Link
                    href="/alerts"
                    onClick={() => haptics.light()}
                    className="text-xs font-semibold text-primary flex items-center gap-0.5 hover:underline"
                >
                    View All
                    <ChevronRight className="h-3.5 w-3.5" />
                </Link>
            </div>

            {/* Loading state */}
            {loading && (
                <div className="flex flex-col gap-3">
                    <AlertCardSkeleton />
                    <AlertCardSkeleton />
                </div>
            )}

            {/* Error state */}
            {error && !loading && (
                <div className="rounded-2xl border border-border bg-card p-4 text-center">
                    <CloudOff className="h-6 w-6 mx-auto text-muted-foreground/50 mb-1.5" />
                    <p className="text-xs text-muted-foreground">
                        Unable to load weather alerts
                    </p>
                </div>
            )}

            {/* Alerts list (max 3) */}
            {!loading && !error && (
                <AnimatePresence>
                    {alerts.length > 0 ? (
                        <div className="flex flex-col gap-3">
                            {alerts.map((alert, i) => (
                                <WeatherAlertCard key={alert.id} alert={alert} index={i} />
                            ))}

                            {/* View Detailed Forecast button */}
                            <Link href="/alerts" className="block">
                                <Button
                                    variant="outline"
                                    className="w-full h-10 rounded-2xl text-xs font-bold border-border dark:border-white/10"
                                    onClick={() => haptics.light()}
                                >
                                    <CloudRain className="h-3.5 w-3.5 mr-1.5" />
                                    View Detailed Forecast
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <EmptyState location={locationLabel} />
                    )}
                </AnimatePresence>
            )}
        </div>
    );
}
