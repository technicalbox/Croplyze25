'use client';

import { useState, useMemo } from 'react';
import { CropSearchInput } from '@/components/crops/CropSearchInput';
import type { CropDocument } from '@/types/crop';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { Leaf, ChevronRight, Droplets, MapPin, Tag } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { useRouter } from 'next/navigation';

export default function CropClientList({ initialCrops }: { initialCrops: CropDocument[] }) {
    const { language } = useTranslation();
    const router = useRouter();

    // Group categories
    const categories = useMemo(() => {
        const set = new Set(initialCrops.map(c => c.cropType).filter(Boolean));
        // Sort explicitly by some common ones
        const list = Array.from(set);
        return ['all', ...list].sort();
    }, [initialCrops]);

    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const filteredCrops = useMemo(() => {
        if (selectedCategory === 'all') return initialCrops;
        return initialCrops.filter(c => c.cropType === selectedCategory);
    }, [initialCrops, selectedCategory]);

    const langKey = useMemo(() => {
        const map = ['en', 'hi', 'te', 'ta', 'kn'];
        return map.includes(language as any) ? (language as keyof CropDocument['commonNames']) : 'en';
    }, [language]);

    if (!initialCrops.length) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading database...</div>;
    }

    return (
        <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-2 duration-500">
            {/* Search ─ we use the exact same standalone smart bar */}
            <div className="relative z-20">
                <CropSearchInput
                    placeholder="Search 400+ crops instantly..."
                    onSelect={(id) => { haptics.light(); router.push(`/crop/${id}`); }}
                />
            </div>

            {/* Categories filter */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mask-linear opacity-0 animate-fade-in delay-100" style={{ animationFillMode: 'forwards' }}>
                {categories.map((cat, i) => (
                    <button
                        key={cat}
                        onClick={() => { haptics.light(); setSelectedCategory(cat); }}
                        className={`flex-none px-4 py-2 rounded-full text-xs font-semibold capitalize transition-all duration-300 transform outline-none active:scale-95 ${selectedCategory === cat
                            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                            : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground border dark:border-white/5 backdrop-blur-md'
                            }`}
                        style={{ animationDelay: `${i * 30}ms` }}
                    >
                        {cat.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCrops.map((crop, i) => {
                    const regionalName = crop.commonNames[langKey];
                    const englishName = crop.commonNames.en;
                    const showBoth = regionalName && regionalName !== englishName;
                    const firstLetter = (englishName || crop.id || '?')[0].toUpperCase();

                    // Deterministic color based on crop id
                    const colors = [
                        'bg-emerald-500', 'bg-orange-500', 'bg-blue-500', 'bg-rose-500',
                        'bg-violet-500', 'bg-amber-500', 'bg-teal-500', 'bg-pink-500',
                        'bg-cyan-500', 'bg-lime-500', 'bg-indigo-500', 'bg-fuchsia-500',
                    ];
                    const colorIdx = crop.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % colors.length;
                    const avatarColor = colors[colorIdx];

                    return (
                        <Link
                            href={`/crop/${crop.id}`}
                            key={crop.id}
                            className="group relative block bg-white dark:bg-[#1a1c1e] p-4 rounded-3xl border border-gray-100 dark:border-white/5 active:scale-[0.98] transition-all overflow-hidden shadow-sm hover:shadow-md hover:border-orange-500/30 dark:hover:border-orange-500/30"
                            style={{ animationFillMode: 'both', animationDelay: `${Math.min(i * 30, 800)}ms` }}
                            onClick={() => haptics.light()}
                        >
                            {/* Decorative background glow on hover */}
                            <div className="absolute -inset-2 bg-gradient-to-r from-orange-500/0 via-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur-xl rounded-full" />

                            <div className="relative flex items-center justify-between z-10">
                                <div className="flex items-center gap-3 w-max flex-1 min-w-0 pr-4">
                                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${avatarColor} text-white shadow-sm`}>
                                        <span className="text-xl font-black leading-none">{firstLetter}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="truncate font-bold text-[15px] leading-tight text-gray-900 dark:text-gray-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                                            {showBoth ? `${regionalName} (${englishName})` : englishName}
                                        </h2>
                                        <div className="flex items-center gap-2 mt-1 truncate">
                                            <span className="truncate text-xs text-muted-foreground italic">
                                                {crop.scientificName}
                                            </span>
                                            {crop.cropType && (
                                                <span className="flex-none rounded-md bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
                                                    {crop.cropType.replace('_', ' ')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-300 dark:text-gray-700 shrink-0 group-hover:text-orange-500 transition-colors group-hover:translate-x-1" />
                            </div>
                        </Link>
                    )
                })}
            </div>
            {filteredCrops.length === 0 && (
                <div className="text-center text-muted-foreground py-12 px-4 border border-dashed rounded-3xl mt-4">
                    No crops found in this category.
                </div>
            )}
        </div>
    );
}
