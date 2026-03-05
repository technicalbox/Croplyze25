'use client';

import React from 'react';
import { MapPin, Navigation, List, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LocationPermissionPromptProps {
    open: boolean;
    onAllowGPS: () => void;
    onManual: () => void;
    onDismiss: () => void;
    isDetecting?: boolean;
}

export default function LocationPermissionPrompt({
    open,
    onAllowGPS,
    onManual,
    onDismiss,
    isDetecting,
}: LocationPermissionPromptProps) {
    if (!open) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-end justify-center"
                onClick={onDismiss}
            >
                <motion.div
                    initial={{ y: '100%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                    className="w-full max-w-md bg-white dark:bg-[#1a1c1e] rounded-t-3xl p-6 pb-10"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Close button */}
                    <button onClick={onDismiss} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10">
                        <X className="h-4 w-4 text-gray-400" />
                    </button>

                    {/* Icon */}
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <MapPin className="h-8 w-8 text-white" />
                        </div>
                    </div>

                    {/* Text */}
                    <h3 className="text-xl font-bold text-center text-gray-900 dark:text-gray-100 mb-2">
                        Set Your Location
                    </h3>
                    <p className="text-sm text-center text-muted-foreground mb-6 leading-relaxed">
                        Allow location access to personalize crop advice, market insights, and weather alerts for your region.
                    </p>

                    {/* Buttons */}
                    <div className="space-y-3">
                        <button
                            onClick={onAllowGPS}
                            disabled={isDetecting}
                            className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-60"
                        >
                            <Navigation className="h-5 w-5" />
                            {isDetecting ? 'Detecting...' : 'Auto-detect Location'}
                        </button>

                        <button
                            onClick={onManual}
                            className="w-full h-14 rounded-2xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                        >
                            <List className="h-5 w-5" />
                            Choose Manually
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
