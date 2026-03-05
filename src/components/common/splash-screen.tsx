'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Premium splash screen that plays the Croplyze intro video
 * then fades out gracefully. Only shows on first load per session.
 */
export default function SplashScreen() {
    const [visible, setVisible] = useState(true);
    const [fadeOut, setFadeOut] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const hasShown = useRef(false);

    useEffect(() => {
        // Only show once per session
        if (typeof window !== 'undefined' && sessionStorage.getItem('splash_shown')) {
            setVisible(false);
            return;
        }

        hasShown.current = true;

        // Fallback: auto-dismiss after 4 seconds regardless
        const fallbackTimer = setTimeout(() => {
            triggerFadeOut();
        }, 4000);

        return () => clearTimeout(fallbackTimer);
    }, []);

    const triggerFadeOut = () => {
        if (fadeOut) return;
        setFadeOut(true);
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('splash_shown', 'true');
        }
        setTimeout(() => setVisible(false), 800); // match CSS transition
    };

    const handleVideoEnd = () => {
        // Add a small pause after video ends for polish
        setTimeout(triggerFadeOut, 300);
    };

    if (!visible) return null;

    return (
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-700 ease-out ${fadeOut ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
                }`}
            style={{
                background: 'linear-gradient(135deg, #0a0a0a 0%, #0d1117 40%, #070d12 100%)',
            }}
        >
            {/* Ambient glow behind the video */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                    className="w-[300px] h-[300px] rounded-full blur-[100px] opacity-30"
                    style={{
                        background: 'radial-gradient(circle, rgba(34,197,94,0.5) 0%, rgba(16,185,129,0.2) 50%, transparent 70%)',
                    }}
                />
            </div>

            {/* Video container */}
            <div className="relative flex flex-col items-center gap-6 z-10">
                {/* Video with glow effect */}
                <div className="relative">
                    {/* Glow ring behind video */}
                    <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/10 to-green-500/20 blur-xl animate-pulse" />

                    <video
                        ref={videoRef}
                        src="/splash.mp4"
                        autoPlay
                        muted
                        playsInline
                        onEnded={handleVideoEnd}
                        className="relative w-[220px] h-auto rounded-2xl shadow-2xl shadow-emerald-900/30"
                        style={{
                            filter: 'brightness(1.1) contrast(1.05) saturate(1.1)',
                        }}
                    />
                </div>

                {/* Loading bar */}
                <div className="w-32 h-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                        style={{
                            animation: 'splashProgress 3s ease-out forwards',
                        }}
                    />
                </div>

                {/* Tagline */}
                <p className="text-[11px] text-white/30 font-medium tracking-[0.2em] uppercase">
                    AI Farming Partner
                </p>
            </div>

            {/* CSS animation for the progress bar */}
            <style jsx>{`
                @keyframes splashProgress {
                    0% { width: 0%; }
                    60% { width: 70%; }
                    100% { width: 100%; }
                }
            `}</style>
        </div>
    );
}
