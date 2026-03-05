'use client';

/**
 * PageTranslator — auto-translates the entire page DOM when language changes.
 *
 * Uses MutationObserver to watch for new/changed text nodes.
 * Translates using the free Google Translate API.
 * Caches everything in localStorage for instant replay.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import { translateText, getCachedSync } from '@/lib/translate';

// Elements whose text should NOT be translated
const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE',
    'SVG', 'PATH', 'CIRCLE', 'RECT', 'POLYGON', 'NOSCRIPT',
    'SELECT', 'OPTION',
]);

const TRANSLATED_ATTR = 'data-t-lang';
const ORIGINAL_ATTR = 'data-t-orig';
const MIN_TEXT_LEN = 2;

/**
 * Check if a text node should be translated.
 */
function shouldTranslate(node: Text): boolean {
    const text = node.textContent?.trim();
    if (!text || text.length < MIN_TEXT_LEN) return false;

    // Skip if only numbers, punctuation, emojis, or whitespace
    if (/^[\d\s.,!?;:·•\-–—+=%$#@&*()[\]{}/<>|\\'"~`^\u200B-\u200D\uFEFF\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u.test(text)) {
        return false;
    }

    // Skip if parent is a skip tag or marked no-translate
    let parent = node.parentElement;
    while (parent) {
        if (SKIP_TAGS.has(parent.tagName)) return false;
        if (parent.hasAttribute('data-no-translate')) return false;
        if (parent.tagName === 'BODY') break;
        parent = parent.parentElement;
    }

    return true;
}

/**
 * Collect all translatable text nodes from a root element.
 */
function collectTextNodes(root: Node): Text[] {
    if (typeof document === 'undefined') return [];
    const nodes: Text[] = [];
    try {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                return shouldTranslate(node as Text)
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT;
            },
        });
        let n: Text | null;
        while ((n = walker.nextNode() as Text | null)) nodes.push(n);
    } catch { /* safe fallback for WebView */ }
    return nodes;
}

export function PageTranslator() {
    const { language } = useTranslation();
    const langRef = useRef(language);
    const pendingRef = useRef<Set<Text>>(new Set());
    const processingRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const observerRef = useRef<MutationObserver | null>(null);
    // Track which text nodes we've changed so MutationObserver ignores our own updates
    const ourUpdatesRef = useRef<WeakSet<Text>>(new WeakSet());

    langRef.current = language;

    /**
     * Process all pending text nodes: translate and update DOM.
     */
    const processQueue = useCallback(async () => {
        if (processingRef.current) return;
        processingRef.current = true;

        const lang = langRef.current;
        if (lang === 'en' || !lang) {
            pendingRef.current.clear();
            processingRef.current = false;
            return;
        }

        // Grab current batch
        const nodes = Array.from(pendingRef.current);
        pendingRef.current.clear();

        // Filter to only connected, translatable nodes
        const jobs: { node: Text; original: string }[] = [];
        for (const node of nodes) {
            if (!node.isConnected || !node.parentElement) continue;

            const parent = node.parentElement;

            // Get original text (stored on parent, or current text if first time)
            const storedKey = `t-o-${Array.from(parent.childNodes).indexOf(node)}`;
            let original = parent.getAttribute(storedKey);
            if (!original) {
                original = node.textContent?.trim() || '';
                if (original && original.length >= MIN_TEXT_LEN) {
                    parent.setAttribute(storedKey, original);
                }
            }
            if (!original || original.length < MIN_TEXT_LEN) continue;

            // Skip already translated for this language
            if (parent.getAttribute(TRANSLATED_ATTR) === lang) {
                const storedTranslation = parent.getAttribute(`t-v-${Array.from(parent.childNodes).indexOf(node)}`);
                if (storedTranslation) continue;
            }

            // Check cache — apply immediately if cached
            const cached = getCachedSync(original, lang);
            if (cached) {
                ourUpdatesRef.current.add(node);
                node.textContent = cached;
                parent.setAttribute(TRANSLATED_ATTR, lang);
                continue;
            }

            jobs.push({ node, original });
        }

        // Translate remaining jobs (max 8 concurrent)
        const batchSize = 8;
        for (let i = 0; i < jobs.length; i += batchSize) {
            if (langRef.current !== lang) break; // Language changed, abort

            const batch = jobs.slice(i, i + batchSize);
            await Promise.allSettled(
                batch.map(async ({ node, original }) => {
                    try {
                        const translated = await translateText(original, lang);
                        if (node.isConnected && langRef.current === lang && translated) {
                            ourUpdatesRef.current.add(node);
                            node.textContent = translated;
                            node.parentElement?.setAttribute(TRANSLATED_ATTR, lang);
                        }
                    } catch { /* skip failed translations */ }
                })
            );
        }

        processingRef.current = false;

        // If new nodes were added while processing, run again
        if (pendingRef.current.size > 0) {
            processQueue();
        }
    }, []);

    const scheduleProcess = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(processQueue, 200);
    }, [processQueue]);

    /**
     * Restore all translated text to original English.
     */
    const restoreOriginals = useCallback(() => {
        if (typeof document === 'undefined') return;
        try {
            const allTranslated = document.querySelectorAll(`[${TRANSLATED_ATTR}]`);
            allTranslated.forEach(el => {
                Array.from(el.attributes)
                    .filter(a => a.name.startsWith('t-o-'))
                    .forEach(a => {
                        const idx = parseInt(a.name.replace('t-o-', ''));
                        const child = el.childNodes[idx];
                        if (child && child.nodeType === Node.TEXT_NODE) {
                            ourUpdatesRef.current.add(child as Text);
                            child.textContent = a.value;
                        }
                    });
                el.removeAttribute(TRANSLATED_ATTR);
            });
        } catch { /* safe fallback */ }
    }, []);

    // Main effect: handle language changes
    useEffect(() => {
        // Cleanup previous observer
        observerRef.current?.disconnect();
        if (timerRef.current) clearTimeout(timerRef.current);
        pendingRef.current.clear();
        processingRef.current = false;

        if (language === 'en' || !language) {
            restoreOriginals();
            return;
        }

        // Translate all existing text nodes
        if (typeof document === 'undefined' || !document.body) return;
        const textNodes = collectTextNodes(document.body);
        for (const node of textNodes) {
            pendingRef.current.add(node);
        }
        scheduleProcess();

        // Watch for new/changed DOM content
        observerRef.current = new MutationObserver((mutations) => {
            if (langRef.current === 'en') return;
            let hasNew = false;

            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(added => {
                        if (added.nodeType === Node.TEXT_NODE) {
                            // Skip our own updates
                            if (ourUpdatesRef.current.has(added as Text)) {
                                ourUpdatesRef.current.delete(added as Text);
                                return;
                            }
                            if (shouldTranslate(added as Text)) {
                                pendingRef.current.add(added as Text);
                                hasNew = true;
                            }
                        } else if (added.nodeType === Node.ELEMENT_NODE) {
                            collectTextNodes(added).forEach(t => {
                                pendingRef.current.add(t);
                                hasNew = true;
                            });
                        }
                    });
                } else if (mutation.type === 'characterData') {
                    const node = mutation.target as Text;
                    // Skip our own updates
                    if (ourUpdatesRef.current.has(node)) {
                        ourUpdatesRef.current.delete(node);
                        return;
                    }
                    if (shouldTranslate(node)) {
                        pendingRef.current.add(node);
                        hasNew = true;
                    }
                }
            }

            if (hasNew) scheduleProcess();
        });

        observerRef.current.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
        });

        return () => {
            observerRef.current?.disconnect();
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [language, scheduleProcess, restoreOriginals]);

    return null;
}
