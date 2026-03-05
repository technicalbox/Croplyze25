'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, Loader2, Leaf, X } from 'lucide-react';
import { useCropSearch } from '@/hooks/useCropSearch';
import { useTranslation } from '@/lib/i18n';
import type { CropDocument } from '@/types/crop';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

export interface CropSearchInputProps {
    onSelect: (cropId: string, cropName: string) => void;
    placeholder?: string;
    autoFocus?: boolean;
    className?: string;
    cropType?: string; // Optional filter (e.g. 'vegetable')
    excludedCropIds?: string[]; // IDs of crops already selected (to prevent duplicates)
}

export function CropSearchInput({
    onSelect,
    placeholder = 'Search crops (e.g. "Rice", "चावल")',
    autoFocus = false,
    className,
    cropType,
    excludedCropIds = [],
}: CropSearchInputProps) {
    const { language } = useTranslation();

    // Map i18n language code to our schema's 5 languages, default 'en'
    const supportedLangs = ['en', 'hi', 'te', 'ta', 'kn'] as const;
    const activeLang = supportedLangs.includes(language as any)
        ? (language as keyof CropDocument['commonNames'])
        : 'en';

    const { query, setQuery, results, isLoading } = useCropSearch({
        activeLanguage: activeLang,
        debounceMs: 300,
        limit: 8,
        cropType,
    });

    const [isFocused, setIsFocused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Helper: get the best name to display based on language
    const getDisplayName = (crop: CropDocument) => {
        const langName = crop.commonNames[activeLang];
        // If the regional name exists and is different from English, show both e.g. "चावल (Rice)"
        if (langName && langName !== crop.commonNames.en) {
            return `${langName} (${crop.commonNames.en})`;
        }
        return crop.commonNames.en;
    };

    const handleSelect = (crop: CropDocument) => {
        const langName = crop.commonNames[activeLang];
        // Use the regional language name if it exists and is different from English,
        // otherwise use the full English name (which may include aliases like "Maize (Corn)")
        const name = (langName && langName !== crop.commonNames.en) ? langName : crop.commonNames.en;
        setQuery('');
        setIsFocused(false);
        onSelect(crop.id, name);
    };

    return (
        <div ref={containerRef} className={cn("relative z-50 w-full", className)}>

            {/* ── Input Box ── */}
            <div className={cn(
                "relative flex items-center w-full px-4 h-14 bg-white/80 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all duration-300",
                isFocused && "ring-2 ring-[#006000]/20 border-[#006000]/30 shadow-lg"
            )}>
                <Search className="flex-shrink-0 w-5 h-5 text-gray-400 dark:text-gray-500 mr-3" />

                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    className="flex-1 w-full bg-transparent border-none outline-none text-[15px] font-medium text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />

                {isLoading && (
                    <Loader2 className="flex-shrink-0 w-4 h-4 ml-3 text-[#006000] animate-spin" />
                )}

                {!isLoading && query && (
                    <button
                        onClick={() => setQuery('')}
                        className="p-1 ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* ── Dropdown Menu ── */}
            <AnimatePresence>
                {isFocused && query.trim() !== '' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute z-[100] top-[calc(100%+8px)] left-0 right-0 w-full bg-white/90 dark:bg-[#1a1c1e]/90 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[300px]"
                    >
                        <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth p-2">
                            {results.filter((crop) => !excludedCropIds.includes(crop.id)).length > 0 ? (
                                results.filter((crop) => !excludedCropIds.includes(crop.id)).map((crop) => {
                                    const firstLetter = (crop.commonNames?.en || crop.id || '?')[0].toUpperCase();
                                    const colors = [
                                        'bg-emerald-500', 'bg-orange-500', 'bg-blue-500', 'bg-rose-500',
                                        'bg-violet-500', 'bg-amber-500', 'bg-teal-500', 'bg-pink-500',
                                        'bg-cyan-500', 'bg-lime-500', 'bg-indigo-500', 'bg-fuchsia-500',
                                    ];
                                    const colorIdx = crop.id.split('').reduce((acc: number, ch: string) => acc + ch.charCodeAt(0), 0) % colors.length;

                                    return (
                                        <button
                                            key={crop.id}
                                            onClick={() => handleSelect(crop)}
                                            className="w-full flex items-center px-4 py-3 text-left rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 active:scale-[0.98] transition-all group"
                                        >
                                            <div className={`w-8 h-8 rounded-full ${colors[colorIdx]} flex items-center justify-center mr-3 flex-shrink-0`}>
                                                <span className="text-sm font-black text-white leading-none">{firstLetter}</span>
                                            </div>
                                            <div className="flex flex-col flex-1 truncate">
                                                <span className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-[#006000] dark:group-hover:text-[#4ade80] transition-colors">
                                                    {getDisplayName(crop)}
                                                </span>
                                                <div className="flex items-center space-x-2 mt-0.5">
                                                    <span className="text-[12px] font-medium text-gray-500 dark:text-gray-400 truncate">
                                                        {crop.scientificName}
                                                    </span>
                                                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400">
                                                        {(crop.cropType || 'other').replace('_', ' ')}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            ) : !isLoading ? (
                                <div className="px-4 py-8 text-center flex flex-col items-center justify-center">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                        No crops found for "{query}"
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                        Try searching by English name, regional name, or type
                                    </p>
                                </div>
                            ) : null}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
