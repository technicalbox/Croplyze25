'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AlertOctagon, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MAX_AUTO_RETRIES = 2;

export default function CropDetailsError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const router = useRouter();
    const retryCount = useRef(0);

    useEffect(() => {
        console.error('[CropDetails] Route error caught by boundary:', error);

        // Auto-retry silently up to MAX_AUTO_RETRIES times
        // This handles transient WebView hydration issues that resolve on retry
        if (retryCount.current < MAX_AUTO_RETRIES) {
            retryCount.current += 1;
            const timer = setTimeout(() => reset(), 100);
            return () => clearTimeout(timer);
        }
    }, [error, reset]);

    // Don't render error UI while auto-retrying
    if (retryCount.current < MAX_AUTO_RETRIES) {
        return (
            <div className="flex flex-col min-h-screen bg-[#f8fafc] dark:bg-[#0f1115] items-center justify-center">
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Only show error UI after all retries are exhausted
    return (
        <div className="flex flex-col min-h-screen bg-[#f8fafc] dark:bg-[#0f1115]">
            <header className="sticky top-0 z-50 flex h-16 items-center px-4 bg-background/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/5">
                <Button
                    onClick={() => router.back()}
                    variant="ghost"
                    size="icon"
                    className="shrink-0 rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-sm font-bold ml-3">Crop Intelligence</h1>
            </header>
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-6">
                <div className="w-20 h-20 rounded-3xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 flex items-center justify-center">
                    <AlertOctagon className="w-10 h-10 text-red-500" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Something went wrong</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">
                        We couldn&apos;t load the crop details. This may be a temporary issue.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        onClick={() => {
                            retryCount.current = 0;
                            reset();
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 px-6 font-bold shadow-lg shadow-emerald-500/20"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" /> Try Again
                    </Button>
                    <Button
                        onClick={() => router.push('/')}
                        variant="outline"
                        className="rounded-xl h-12 px-6 font-bold border-gray-200 dark:border-white/10"
                    >
                        Go Home
                    </Button>
                </div>
            </div>
        </div>
    );
}
