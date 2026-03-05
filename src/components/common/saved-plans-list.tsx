'use client';

/**
 * @fileOverview Reusable saved-plans history list.
 * Used by both Crop Success Planner and Growth Timeline pages.
 * Loads records from Firestore client-side and shows them as tappable cards.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import {
    Loader2, Trash2, ChevronRight, Clock, RefreshCw, Inbox,
} from 'lucide-react';
import { format } from 'date-fns';

// ─── Generic types ────────────────────────────────────────────────────────────

export interface SavedPlanMeta {
    id: string;
    title: string;       // e.g. "Wheat — Punjab, Pakistan"
    subtitle: string;    // e.g. "Rabi · Loamy soil"
    createdAt: number;   // Unix ms
}

interface Props<T> {
    userId: string;
    /** Fetches all records, returns them as T[]. */
    loader: (userId: string) => Promise<T[]>;
    /** Converts a record into display metadata. */
    toMeta: (record: T) => SavedPlanMeta;
    /** Deletes a single record by ID. */
    onDelete: (userId: string, id: string) => Promise<void>;
    /** Called when the user taps a record — parent loads it as the active result. */
    onSelect: (record: T) => void;
    /** Zero-state label */
    emptyLabel?: string;
    /** Section title */
    title?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SavedPlansList<T extends { id?: string }>({
    userId, loader, toMeta, onDelete, onSelect,
    emptyLabel = 'No saved plans yet.',
    title = 'Saved Plans',
}: Props<T>) {
    const [records, setRecords] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleting, setDeleting] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await loader(userId);
            setRecords(data);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to load history.');
        } finally {
            setLoading(false);
        }
    }, [userId, loader]);

    useEffect(() => { load(); }, [load]);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        haptics.error();
        setDeleting(id);
        try {
            await onDelete(userId, id);
            setRecords(r => r.filter(x => x.id !== id));
        } catch {
            haptics.error();
        } finally {
            setDeleting(null);
        }
    };

    const handleSelect = (record: T) => {
        haptics.light();
        onSelect(record);
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">{title}</h3>
                {!loading && (
                    <button
                        onClick={() => { haptics.light(); load(); }}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    >
                        <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                )}
            </div>

            {loading && (
                <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs">Loading history…</span>
                </div>
            )}

            {error && !loading && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
                    <p className="text-xs text-destructive">{error}</p>
                    <button onClick={load} className="text-xs text-primary underline mt-1">Retry</button>
                </div>
            )}

            {!loading && !error && records.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <Inbox className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">{emptyLabel}</p>
                </div>
            )}

            {!loading && records.map((record) => {
                const meta = toMeta(record);
                const isDeleting = deleting === meta.id;
                return (
                    <Card
                        key={meta.id}
                        onClick={() => !isDeleting && handleSelect(record)}
                        className={cn(
                            'rounded-2xl border-border cursor-pointer transition-all duration-150',
                            'hover:border-primary/40 active:scale-[0.98]',
                            isDeleting && 'opacity-50 pointer-events-none',
                        )}
                    >
                        <CardContent className="p-3.5 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{meta.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{meta.subtitle}</p>
                                <div className="flex items-center gap-1 mt-1">
                                    <Clock className="h-3 w-3 text-muted-foreground/60" />
                                    <span className="text-[10px] text-muted-foreground">
                                        {format(meta.createdAt, 'dd MMM yyyy · HH:mm')}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    onClick={(e) => handleDelete(e, meta.id)}
                                    disabled={isDeleting}
                                    className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                                >
                                    {isDeleting
                                        ? <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                                        : <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                    }
                                </button>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
