'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Country, State, City, ICountry, IState, ICity } from 'country-state-city';
import { Search, MapPin, ChevronRight, ChevronLeft, X, Loader2, Navigation, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

interface RegionSelectorProps {
    open: boolean;
    onClose: () => void;
    onSelect: (country: string, countryCode: string, state: string, city: string) => void;
    onDetectGPS?: () => void;
    isDetecting?: boolean;
    initialCountryCode?: string;
}

type Step = 'country' | 'state' | 'city';

// ── Component ────────────────────────────────────────────────────────────────

export default function RegionSelector({
    open,
    onClose,
    onSelect,
    onDetectGPS,
    isDetecting = false,
    initialCountryCode,
}: RegionSelectorProps) {
    const [step, setStep] = useState<Step>('country');
    const [search, setSearch] = useState('');
    const [selectedCountry, setSelectedCountry] = useState<ICountry | null>(null);
    const [selectedState, setSelectedState] = useState<IState | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Reset state when opening
    useEffect(() => {
        if (open) {
            setStep('country');
            setSearch('');
            setSelectedCountry(null);
            setSelectedState(null);

            // If we have an initial country, pre-select it
            if (initialCountryCode) {
                const c = Country.getCountryByCode(initialCountryCode);
                if (c) {
                    setSelectedCountry(c);
                    setStep('state');
                }
            }
        }
    }, [open, initialCountryCode]);

    // Auto-focus search on step change
    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 200);
    }, [step, open]);

    // ── Data ─────────────────────────────────────────────────────────────────

    const countries = useMemo(() => {
        // Put India at top for Indian-focused app
        const all = Country.getAllCountries();
        const india = all.find(c => c.isoCode === 'IN');
        const rest = all.filter(c => c.isoCode !== 'IN');
        return india ? [india, ...rest] : all;
    }, []);

    const states = useMemo(() => {
        if (!selectedCountry) return [];
        return State.getStatesOfCountry(selectedCountry.isoCode);
    }, [selectedCountry]);

    const cities = useMemo(() => {
        if (!selectedCountry || !selectedState) return [];
        return City.getCitiesOfState(selectedCountry.isoCode, selectedState.isoCode);
    }, [selectedCountry, selectedState]);

    // ── Filtered data ────────────────────────────────────────────────────────

    const filteredItems = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (step === 'country') {
            if (!q) return countries.slice(0, 50); // Show top 50 initially
            return countries.filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.isoCode.toLowerCase().includes(q) ||
                (c.phonecode && c.phonecode.includes(q)),
            ).slice(0, 50);
        }
        if (step === 'state') {
            if (!q) return states;
            return states.filter(s =>
                s.name.toLowerCase().includes(q) ||
                s.isoCode.toLowerCase().includes(q),
            );
        }
        if (step === 'city') {
            if (!q) return cities.slice(0, 100);
            return cities.filter(c => c.name.toLowerCase().includes(q)).slice(0, 100);
        }
        return [];
    }, [step, search, countries, states, cities]);

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleSelectCountry = (country: ICountry) => {
        setSelectedCountry(country);
        setSearch('');
        const countryStates = State.getStatesOfCountry(country.isoCode);
        if (countryStates.length === 0) {
            // No states — skip directly
            onSelect(country.name, country.isoCode, '', '');
            onClose();
        } else {
            setStep('state');
        }
    };

    const handleSelectState = (state: IState) => {
        setSelectedState(state);
        setSearch('');
        const stateCities = City.getCitiesOfState(selectedCountry!.isoCode, state.isoCode);
        if (stateCities.length === 0) {
            // No cities — done
            onSelect(selectedCountry!.name, selectedCountry!.isoCode, state.name, '');
            onClose();
        } else {
            setStep('city');
        }
    };

    const handleSelectCity = (city: ICity) => {
        onSelect(selectedCountry!.name, selectedCountry!.isoCode, selectedState!.name, city.name);
        onClose();
    };

    const handleSkipCity = () => {
        onSelect(selectedCountry!.name, selectedCountry!.isoCode, selectedState!.name, '');
        onClose();
    };

    const handleBack = () => {
        setSearch('');
        if (step === 'city') setStep('state');
        else if (step === 'state') setStep('country');
    };

    // ── Title & subtitle ─────────────────────────────────────────────────────

    const title = step === 'country' ? 'Select Country'
        : step === 'state' ? `Select State`
            : 'Select City';

    const subtitle = step === 'state' ? selectedCountry?.name
        : step === 'city' ? `${selectedState?.name}, ${selectedCountry?.name}`
            : undefined;

    if (!open) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-white dark:bg-[#141618] rounded-t-3xl overflow-hidden flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    {/* ── Header ── */}
                    <div className="flex items-center gap-3 px-4 pt-5 pb-3">
                        {step !== 'country' ? (
                            <button onClick={handleBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                                <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                            </button>
                        ) : (
                            <div className="p-2 -ml-2 rounded-xl bg-emerald-500/10">
                                <MapPin className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h2>
                            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
                        </div>
                        <button onClick={onClose} className="p-2 -mr-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                            <X className="h-5 w-5 text-gray-400" />
                        </button>
                    </div>

                    {/* ── GPS Button (only on country step) ── */}
                    {step === 'country' && onDetectGPS && (
                        <div className="px-4 pb-3">
                            <button
                                onClick={onDetectGPS}
                                disabled={isDetecting}
                                className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-60"
                            >
                                {isDetecting ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Detecting location...</>
                                ) : (
                                    <><Navigation className="h-4 w-4" /> Auto-detect my location</>
                                )}
                            </button>
                            <p className="text-[11px] text-muted-foreground text-center mt-2">or choose manually below</p>
                        </div>
                    )}

                    {/* ── Search bar ── */}
                    <div className="px-4 pb-3">
                        <div className="relative flex items-center h-12 bg-gray-100 dark:bg-white/5 rounded-2xl px-4">
                            <Search className="h-4 w-4 text-gray-400 mr-3 flex-shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={`Search ${step}...`}
                                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                                    <X className="h-3.5 w-3.5 text-gray-400" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ── Skip city button ── */}
                    {step === 'city' && (
                        <div className="px-4 pb-2">
                            <button
                                onClick={handleSkipCity}
                                className="w-full text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 py-2 rounded-xl hover:bg-emerald-500/10 transition-colors"
                            >
                                Skip city selection →
                            </button>
                        </div>
                    )}

                    {/* ── List ── */}
                    <div className="flex-1 overflow-y-auto px-4 pb-8 min-h-0">
                        {filteredItems.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground text-sm">
                                No results found for "{search}"
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {(filteredItems as any[]).map((item: any, idx: number) => {
                                    const name = item.name;
                                    const code = item.isoCode;
                                    const flag = step === 'country' ? (item as ICountry).flag || '' : '';

                                    return (
                                        <button
                                            key={`${code}-${idx}`}
                                            onClick={() => {
                                                if (step === 'country') handleSelectCountry(item as ICountry);
                                                else if (step === 'state') handleSelectState(item as IState);
                                                else handleSelectCity(item as ICity);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3.5 text-left rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 active:scale-[0.98] transition-all group"
                                        >
                                            {flag ? (
                                                <span className="text-2xl flex-shrink-0">{flag}</span>
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{name.charAt(0)}</span>
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                    {name}
                                                </p>
                                                {step === 'country' && (
                                                    <p className="text-[11px] text-muted-foreground">{code}</p>
                                                )}
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-700 flex-shrink-0 group-hover:text-emerald-500 transition-colors" />
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
