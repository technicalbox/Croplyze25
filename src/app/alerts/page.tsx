'use client';

/**
 * @fileOverview Comprehensive Alerts page with 9 category tabs,
 * smart filtering, severity badges, mark-as-read, and priority sorting.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  AlertTriangle, CloudRain, Droplet, Sprout, CheckCircle, Info,
  Trash2, RefreshCcw, MapPin, Thermometer, Wind, ExternalLink,
  ShieldAlert, Loader2, WifiOff, Database, ChevronDown, Filter,
  X, Bell, BellOff, Check, Snowflake, Zap, Bug, Wheat, TrendingUp,
  Landmark, ClipboardList, CloudLightning, Sun, Eye, EyeOff,
  ChevronRight, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useRegion } from '@/providers/region-provider';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import type { OutbreakAlert, AlertResponse, AlertCategory, AlertSeverity, ALERT_CATEGORIES } from '@/lib/alert-types';

// ── Category config ──────────────────────────────────────────────────────────

interface CategoryTab {
  id: AlertCategory | 'all';
  label: string;
  icon: React.ReactNode;
  color: string;
}

const CATEGORY_TABS: CategoryTab[] = [
  { id: 'all', label: 'All', icon: <Bell className="h-3.5 w-3.5" />, color: 'text-foreground' },
  { id: 'weather', label: 'Weather', icon: <CloudRain className="h-3.5 w-3.5" />, color: 'text-sky-500' },
  { id: 'crop_risk', label: 'Crop Risk', icon: <Wheat className="h-3.5 w-3.5" />, color: 'text-amber-500' },
  { id: 'pest_disease', label: 'Pest & Disease', icon: <Bug className="h-3.5 w-3.5" />, color: 'text-red-500' },
  { id: 'irrigation', label: 'Irrigation', icon: <Droplet className="h-3.5 w-3.5" />, color: 'text-blue-500' },
  { id: 'harvest', label: 'Harvest', icon: <Sprout className="h-3.5 w-3.5" />, color: 'text-green-500' },
  { id: 'market', label: 'Market', icon: <TrendingUp className="h-3.5 w-3.5" />, color: 'text-purple-500' },
  { id: 'government', label: 'Govt. Schemes', icon: <Landmark className="h-3.5 w-3.5" />, color: 'text-indigo-500' },
  { id: 'farm_task', label: 'Farm Tasks', icon: <ClipboardList className="h-3.5 w-3.5" />, color: 'text-teal-500' },
  { id: 'disaster', label: 'Disaster', icon: <CloudLightning className="h-3.5 w-3.5" />, color: 'text-rose-600' },
];

// ── Severity config ──────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<string, {
  label: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
  chipBg: string;
}> = {
  critical: {
    label: 'Critical',
    bg: 'bg-red-500/10',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-l-4 border-l-red-500',
    dot: 'bg-red-500',
    chipBg: 'bg-red-100 dark:bg-red-900/30',
  },
  high: {
    label: 'High',
    bg: 'bg-orange-500/10',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-l-4 border-l-orange-500',
    dot: 'bg-orange-500',
    chipBg: 'bg-orange-100 dark:bg-orange-900/30',
  },
  moderate: {
    label: 'Moderate',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-700 dark:text-yellow-400',
    border: 'border-l-4 border-l-yellow-500',
    dot: 'bg-yellow-500',
    chipBg: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  low: {
    label: 'Low',
    bg: 'bg-green-500/10',
    text: 'text-green-700 dark:text-green-400',
    border: 'border-l-4 border-l-green-500',
    dot: 'bg-green-500',
    chipBg: 'bg-green-100 dark:bg-green-900/30',
  },
};

// ── Icon for alert ───────────────────────────────────────────────────────────

function getAlertIcon(alert: OutbreakAlert): React.ReactNode {
  const title = alert.title.toLowerCase();
  const cls = 'h-5 w-5';

  if (title.includes('rain') || title.includes('storm')) return <CloudRain className={cn(cls, 'text-sky-500')} />;
  if (title.includes('heat') || title.includes('temperature')) return <Thermometer className={cn(cls, 'text-orange-500')} />;
  if (title.includes('frost') || title.includes('cold')) return <Snowflake className={cn(cls, 'text-cyan-500')} />;
  if (title.includes('wind')) return <Wind className={cn(cls, 'text-teal-500')} />;
  if (title.includes('lightning')) return <Zap className={cn(cls, 'text-yellow-500')} />;
  if (title.includes('fog')) return <CloudRain className={cn(cls, 'text-gray-400')} />;
  if (title.includes('flood') || title.includes('cyclone')) return <CloudLightning className={cn(cls, 'text-rose-600')} />;
  if (title.includes('drought')) return <Sun className={cn(cls, 'text-amber-600')} />;
  if (title.includes('blight') || title.includes('disease') || title.includes('mildew') || title.includes('rust') || title.includes('spot'))
    return <ShieldAlert className={cn(cls, 'text-red-500')} />;
  if (title.includes('pest') || title.includes('borer') || title.includes('aphid') || title.includes('whitefly'))
    return <Bug className={cn(cls, 'text-red-400')} />;
  if (title.includes('irrigat') || title.includes('moisture') || title.includes('water'))
    return <Droplet className={cn(cls, 'text-blue-500')} />;
  if (title.includes('harvest')) return <Sprout className={cn(cls, 'text-green-500')} />;
  if (title.includes('market') || title.includes('demand') || title.includes('price'))
    return <TrendingUp className={cn(cls, 'text-purple-500')} />;
  if (title.includes('insurance') || title.includes('subsidy') || title.includes('scheme'))
    return <Landmark className={cn(cls, 'text-indigo-500')} />;
  if (title.includes('fertilizer') || title.includes('spray') || title.includes('weed') || title.includes('soil'))
    return <ClipboardList className={cn(cls, 'text-teal-500')} />;
  if (alert.category === 'disaster') return <AlertTriangle className={cn(cls, 'text-rose-600')} />;
  return <AlertTriangle className={cn(cls, 'text-amber-500')} />;
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function AlertSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-full" />
              <div className="flex gap-2">
                <div className="h-5 bg-muted rounded-full w-16" />
                <div className="h-5 bg-muted rounded-full w-12" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Alert card ───────────────────────────────────────────────────────────────

function AlertCard({
  alert,
  index,
  onMarkRead,
  onDismiss,
  expanded,
  onToggle,
}: {
  alert: OutbreakAlert;
  index: number;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
  expanded: boolean;
  onToggle: (id: string) => void;
}) {
  const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.low;
  const icon = getAlertIcon(alert);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      <div className={cn(
        'rounded-2xl border border-border bg-card shadow-sm overflow-hidden transition-all',
        cfg.border,
        alert.read && 'opacity-60',
      )}>
        {/* Header — clickable to expand */}
        <button
          onClick={() => { haptics.light(); onToggle(alert.id); }}
          className="w-full text-left p-4 hover:bg-secondary/30 transition-colors"
        >
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
              <div className="flex items-start justify-between gap-2">
                <h3 className={cn(
                  'text-sm font-bold leading-tight line-clamp-1',
                  alert.read ? 'text-muted-foreground' : 'text-foreground',
                )}>
                  {alert.title.replace(/^[⚠🌧💧🌡💨🚿🦠🔥❄⛈⚡🌫🌊☀🌱🌻📈🏛📋🚨✅] ?/, '')}
                </h3>
                <span className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0',
                  cfg.chipBg, cfg.text,
                )}>
                  <span className={cn('w-1.5 h-1.5 rounded-full mr-1', cfg.dot)} />
                  {cfg.label}
                </span>
              </div>

              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                {alert.message}
              </p>

              {/* Meta */}
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2">
                {alert.location && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {alert.location.split(',')[0]}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Database className="h-3 w-3" />
                  {alert.source?.name ?? 'Analysis'}
                </span>
                {!alert.read && (
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" title="Unread" />
                )}
              </div>
            </div>

            <ChevronDown className={cn(
              'h-4 w-4 text-muted-foreground/50 shrink-0 mt-1 transition-transform',
              expanded && 'rotate-180',
            )} />
          </div>
        </button>

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-border/50 pt-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {alert.details}
                </p>

                {/* Threshold pills */}
                {alert.thresholds && alert.thresholds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {alert.thresholds.map((t, i) => (
                      <span key={i} className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
                        t.value >= t.threshold
                          ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                          : 'bg-green-500/10 text-green-700 dark:text-green-400',
                      )}>
                        {t.metric}: {t.value}{t.unit}
                        <span className="text-muted-foreground">(limit: {t.threshold}{t.unit})</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Source badge */}
                {alert.source && (
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/30">
                    <Database className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground font-medium">
                      Source: {alert.source.name}
                    </span>
                    {alert.source.url && (
                      <a href={alert.source.url} target="_blank" rel="noopener noreferrer" className="text-primary">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 mt-4">
                  <Button size="sm" className="flex-1 h-9 text-xs font-bold rounded-xl" onClick={() => haptics.heavy()}>
                    {alert.action}
                  </Button>
                  {!alert.read && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 text-xs rounded-xl"
                      onClick={(e) => { e.stopPropagation(); haptics.light(); onMarkRead(alert.id); }}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Read
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); haptics.light(); onDismiss(alert.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const [allAlerts, setAllAlerts] = useState<OutbreakAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Filters
  const [activeCategory, setActiveCategory] = useState<AlertCategory | 'all'>('all');
  const [activeSeverity, setActiveSeverity] = useState<AlertSeverity | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Expanded card
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { region, gps, hasRegion } = useRegion();
  const { user } = useUser();

  // ── Fetch alerts ─────────────────────────────────────────────────────────

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
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

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: AlertResponse = await res.json();

      setAllAlerts((data.alerts ?? []).map(a => ({ ...a, read: false })));
      setLastUpdated(data.generatedAt);
    } catch (err) {
      console.error('[alerts] Fetch failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [gps, hasRegion, region]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const markRead = (id: string) => {
    setAllAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  };

  const dismiss = (id: string) => {
    haptics.success();
    setAllAlerts(prev => prev.filter(a => a.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const clearExpired = () => {
    haptics.heavy();
    const now = Date.now();
    setAllAlerts(prev => prev.filter(a => a.expiresAt > now));
  };

  const markAllRead = () => {
    haptics.medium();
    setAllAlerts(prev => prev.map(a => ({ ...a, read: true })));
  };

  // ── Filtered & sorted alerts ─────────────────────────────────────────────

  const filteredAlerts = useMemo(() => {
    let result = [...allAlerts];

    // Category filter
    if (activeCategory !== 'all') {
      result = result.filter(a => a.category === activeCategory);
    }

    // Severity filter
    if (activeSeverity !== 'all') {
      result = result.filter(a => a.severity === activeSeverity);
    }

    return result;
  }, [allAlerts, activeCategory, activeSeverity]);

  // Counts
  const unreadCount = allAlerts.filter(a => !a.read).length;
  const categoryCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of allAlerts) {
      map[a.category] = (map[a.category] ?? 0) + 1;
    }
    return map;
  }, [allAlerts]);

  const locationLabel = hasRegion
    ? [region.city, region.state].filter(Boolean).join(', ')
    : 'India';

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/80 backdrop-blur-sm px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-destructive/10">
            <Bell className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold leading-tight">Alerts</h1>
              {unreadCount > 0 && (
                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{locationLabel}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { haptics.light(); setShowFilters(f => !f); }}>
            <Filter className={cn('h-4 w-4', showFilters && 'text-primary')} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={loading} onClick={() => { haptics.light(); fetchAlerts(); }}>
            <RefreshCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </header>

      {/* Category tabs — horizontal scroll */}
      <div className="border-b bg-background">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 py-2.5">
          {CATEGORY_TABS.map(tab => {
            const isActive = activeCategory === tab.id;
            const count = tab.id === 'all' ? allAlerts.length : (categoryCountMap[tab.id] ?? 0);
            return (
              <button
                key={tab.id}
                onClick={() => { haptics.light(); setActiveCategory(tab.id as AlertCategory | 'all'); }}
                className={cn(
                  'flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary/50 text-muted-foreground hover:bg-secondary',
                )}
              >
                {tab.icon}
                {tab.label}
                {count > 0 && (
                  <span className={cn(
                    'min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center',
                    isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Severity filter bar (collapsible) */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b"
          >
            <div className="px-4 py-3 space-y-3">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Severity</p>
                <div className="flex gap-1.5 flex-wrap">
                  {(['all', 'critical', 'high', 'moderate', 'low'] as const).map(sev => {
                    const isActive = activeSeverity === sev;
                    const sevCfg = sev !== 'all' ? SEVERITY_CONFIG[sev] : null;
                    return (
                      <button
                        key={sev}
                        onClick={() => setActiveSeverity(sev)}
                        className={cn(
                          'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all',
                          isActive
                            ? (sevCfg ? cn(sevCfg.chipBg, sevCfg.text) : 'bg-primary text-primary-foreground')
                            : 'bg-secondary/50 text-muted-foreground hover:bg-secondary',
                        )}
                      >
                        {sevCfg && <span className={cn('w-1.5 h-1.5 rounded-full', sevCfg.dot)} />}
                        {sev === 'all' ? 'All' : sevCfg?.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg" onClick={markAllRead}>
                  <Check className="h-3 w-3 mr-1" />
                  Mark All Read
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg" onClick={clearExpired}>
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear Expired
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Loading */}
        {loading && <div className="p-4"><AlertSkeleton /></div>}

        {/* Error */}
        {error && !loading && (
          <div className="p-4">
            <div className="rounded-2xl p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-center">
              <WifiOff className="h-8 w-8 mx-auto text-red-400 mb-2" />
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">Unable to fetch alerts</p>
              <p className="text-xs text-red-500/80 mt-1">{error}</p>
              <Button onClick={fetchAlerts} variant="outline" size="sm" className="mt-3">
                <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Alerts list */}
        {!loading && !error && (
          <div className="p-4 space-y-3">
            {/* Last Updated */}
            {lastUpdated && (
              <p className="text-[10px] text-muted-foreground text-center">
                Updated: {new Date(lastUpdated).toLocaleTimeString()}
              </p>
            )}

            <AnimatePresence mode="popLayout">
              {filteredAlerts.length > 0 ? (
                filteredAlerts.map((alert, index) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    index={index}
                    onMarkRead={markRead}
                    onDismiss={dismiss}
                    expanded={expandedId === alert.id}
                    onToggle={(id) => setExpandedId(prev => prev === id ? null : id)}
                  />
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center text-center py-16"
                >
                  <div className="p-6 bg-green-500/5 dark:bg-green-500/10 rounded-full mb-5">
                    <Sprout className="h-14 w-14 text-green-500" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">Your farm is safe</h2>
                  <p className="text-sm text-muted-foreground max-w-xs mt-2">
                    {activeCategory !== 'all'
                      ? `No ${CATEGORY_TABS.find(t => t.id === activeCategory)?.label ?? ''} alerts at the moment.`
                      : 'No alerts at the moment. We\'ll notify you when conditions change.'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {locationLabel}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Data sources footer */}
            {filteredAlerts.length > 0 && (
              <div className="rounded-xl bg-secondary/30 p-3 mt-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Trusted Data Sources
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: 'NASA POWER', desc: 'Satellite agro-climate' },
                    { name: 'OpenWeatherMap', desc: 'Real-time weather' },
                    { name: 'ICAR Guidelines', desc: 'Disease thresholds' },
                    { name: 'FAO Standards', desc: 'Crop water needs' },
                  ].map(s => (
                    <span key={s.name} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-background border border-border text-[10px] text-muted-foreground" title={s.desc}>
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
