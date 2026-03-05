'use client';

import React, { useEffect, useRef } from 'react';

const MAX_AUTO_RETRIES = 2;

/**
 * Global error boundary — last line of defense.
 * Auto-retries silently before showing error UI to the user.
 */
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const retryCount = useRef(0);

    useEffect(() => {
        console.error('[GlobalError] Uncaught error:', error);

        // Auto-retry silently
        if (retryCount.current < MAX_AUTO_RETRIES) {
            retryCount.current += 1;
            const timer = setTimeout(() => reset(), 150);
            return () => clearTimeout(timer);
        }
    }, [error, reset]);

    // Show a blank/loading screen while auto-retrying
    if (retryCount.current < MAX_AUTO_RETRIES) {
        return (
            <html>
                <body style={{ margin: 0, background: '#0f1115', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                    <div style={{
                        width: '32px', height: '32px',
                        border: '3px solid rgba(16,185,129,0.3)',
                        borderTopColor: '#10b981',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                    }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </body>
            </html>
        );
    }

    // Only show error UI after all retries exhausted
    return (
        <html>
            <body style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                margin: 0, padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: '100vh', background: '#0f1115', color: '#e5e7eb',
            }}>
                <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '360px' }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '16px',
                        background: 'rgba(239,68,68,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1.5rem', fontSize: '28px',
                    }}>⚠️</div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                        Something went wrong
                    </h2>
                    <p style={{ fontSize: '0.875rem', color: '#9ca3af', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                        The app encountered an unexpected error. Please try again.
                    </p>
                    <button
                        onClick={() => { retryCount.current = 0; reset(); }}
                        style={{
                            background: 'linear-gradient(135deg, #10b981, #14b8a6)',
                            color: 'white', border: 'none', borderRadius: '12px',
                            padding: '12px 24px', fontSize: '0.875rem', fontWeight: 700,
                            cursor: 'pointer', marginRight: '8px',
                        }}
                    >Try Again</button>
                    <button
                        onClick={() => { if (typeof window !== 'undefined') window.location.href = '/'; }}
                        style={{
                            background: 'transparent', color: '#9ca3af',
                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
                            padding: '12px 24px', fontSize: '0.875rem', fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >Go Home</button>
                </div>
            </body>
        </html>
    );
}
