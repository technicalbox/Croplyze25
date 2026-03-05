'use client';

import { useTranslate } from '@/hooks/use-translate';

/**
 * Inline translation component for dynamic text.
 * Wraps `useTranslate` hook so it can be used directly in JSX.
 * 
 * Usage:
 * ```tsx
 * <T text="High Severity" />
 * <T text={diagnosis.diseaseName} />
 * ```
 * 
 * The text will be translated into the app's current language automatically.
 * On cache hit it renders instantly; on miss it shows English then swaps.
 */
export function T({ text }: { text: string }) {
    const translated = useTranslate(text);
    return <>{translated}</>;
}

/**
 * Translate a static UI label.
 * Good for short, known English labels like "Severity", "Region", etc.
 */
export function TLabel({ children }: { children: string }) {
    const translated = useTranslate(children);
    return <>{translated}</>;
}
