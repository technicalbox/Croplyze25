'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { diseaseDictionary, type DiseaseEntry } from '@/data/disease-dictionary';
import { AnimatePresence, motion } from 'framer-motion';
import Fuse from 'fuse.js';

export interface DiseaseSearchInputProps {
    onSelect: (diseaseName: string) => void;
    placeholder?: string;
    className?: string;
}

const TYPE_COLORS: Record<string, string> = {
    fungal: 'bg-violet-500',
    bacterial: 'bg-rose-500',
    viral: 'bg-amber-500',
    insect: 'bg-red-500',
    mite: 'bg-orange-500',
    nematode: 'bg-teal-500',
    nutrient: 'bg-emerald-500',
    weed: 'bg-lime-500',
    other: 'bg-gray-500',
};

const TYPE_BADGE_COLORS: Record<string, string> = {
    fungal: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    bacterial: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    viral: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    insect: 'bg-red-500/15 text-red-600 dark:text-red-400',
    mite: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
    nematode: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
    nutrient: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    weed: 'bg-lime-500/15 text-lime-600 dark:text-lime-400',
    other: 'bg-gray-500/15 text-gray-600 dark:text-gray-400',
};

export function DiseaseSearchInput({
    onSelect,
    placeholder = 'Search diseases (e.g. "Late Blight", "Aphids")',
    className,
}: DiseaseSearchInputProps) {
    const fuse = useMemo(
        () =>
            new Fuse(diseaseDictionary, {
                keys: [
                    { name: 'name', weight: 0.5 },
                    { name: 'type', weight: 0.15 },
                    { name: 'affectedCrops', weight: 0.2 },
                    { name: 'description', weight: 0.15 },
                ],
                threshold: 0.4,
                includeScore: true,
            }),
        [],
    );

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<DiseaseEntry[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsFocused(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleChange = (q: string) => {
        setQuery(q);
        if (q.trim().length < 1) {
            // Show popular diseases when query is empty but focused
            setResults([]);
            return;
        }
        const matches = fuse.search(q).map((r) => r.item);
        setResults(matches.slice(0, 10));
    };

    // Show initial suggestions when focused with empty query
    const displayResults = query.trim().length < 1 && isFocused
        ? diseaseDictionary.slice(0, 10) // show first 10 popular diseases
        : results;

    const handleSelect = (entry: DiseaseEntry) => {
        setQuery('');
        setIsFocused(false);
        onSelect(entry.name);
    };

    return (
        <div ref={containerRef} className={cn('relative z-40 w-full', className)}>
            {/* Input */}
            <div className={cn(
                'relative flex items-center w-full px-4 h-14 bg-white/80 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all duration-300',
                isFocused && 'ring-2 ring-[#006000]/20 border-[#006000]/30 shadow-lg',
            )}>
                <Search className="flex-shrink-0 w-5 h-5 text-gray-400 dark:text-gray-500 mr-3" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => handleChange(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    placeholder={placeholder}
                    className="flex-1 w-full bg-transparent border-none outline-none text-[15px] font-medium text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
                {query && (
                    <button onClick={() => { setQuery(''); setResults([]); }} className="p-1 ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Dropdown */}
            <AnimatePresence>
                {isFocused && displayResults.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute top-[calc(100%+8px)] left-0 right-0 w-full bg-white/90 dark:bg-[#1a1c1e]/90 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[320px]"
                    >
                        {query.trim().length < 1 && (
                            <div className="px-4 pt-3 pb-1">
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Popular Diseases & Pests</p>
                            </div>
                        )}
                        <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth p-2">
                            {displayResults.map((entry) => {
                                const bgColor = TYPE_COLORS[entry.type] || 'bg-gray-500';
                                const badgeColor = TYPE_BADGE_COLORS[entry.type] || TYPE_BADGE_COLORS.other;
                                const firstLetter = entry.name[0]?.toUpperCase() || '?';
                                return (
                                    <button
                                        key={entry.id}
                                        onClick={() => handleSelect(entry)}
                                        className="w-full flex items-center px-3 py-2.5 text-left rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 active:scale-[0.98] transition-all group"
                                    >
                                        <div className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center mr-3 flex-shrink-0`}>
                                            <span className="text-sm font-black text-white leading-none">{firstLetter}</span>
                                        </div>
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-[#006000] dark:group-hover:text-[#4ade80] transition-colors">
                                                    {entry.name}
                                                </span>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize flex-shrink-0 ${badgeColor}`}>
                                                    {entry.type}
                                                </span>
                                            </div>
                                            <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                                {entry.affectedCrops.slice(0, 4).join(', ')}{entry.affectedCrops.length > 4 ? ` +${entry.affectedCrops.length - 4}` : ''}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {query.trim().length >= 1 && results.length === 0 && (
                            <div className="px-4 py-6 text-center">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                    No diseases found for &quot;{query}&quot;
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    Try a different disease or pest name
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
