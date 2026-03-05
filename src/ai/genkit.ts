import { genkit, type Genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// ═══════════════════════════════════════════════════════════════════════════════
// GEMINI API KEY ROTATION — Works at the instance level.
//
// How it works:
//   - Prompts are defined on `ai` (the primary export) using key #1.
//   - When a prompt call hits 429, the flow throws up to the API route.
//   - The API route wraps calls with `withRetry()` which catches 429,
//     waits for backoff, and retries on the SAME instance.
//   - Between retries, we swap the underlying API key via env var +
//     re-create the instance (prompts are lazily redefined via cachedPrompt).
//
// For heavy usage: use staggeredAi() to get a round-robin instance
//   that distributes load across keys from the start.
// ═══════════════════════════════════════════════════════════════════════════════

const MODEL = 'googleai/gemini-2.5-flash';
const COOLDOWN_MS = 60_000;
const RETRIES_PER_KEY = 2;
const RETRY_BASE_MS = 1000;
const MAX_TOTAL = 12;

// ── Key pool ─────────────────────────────────────────────────────────────────

interface KeyState { key: string; label: string; failedAt: number; }
let pool: KeyState[] | null = null;
let idx = 0;

function init(): KeyState[] {
  if (pool) return pool;
  const keys: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const k = process.env[`GEMINI_KEY_${i}`];
    if (k?.trim()) keys.push(k.trim());
  }
  if (!keys.length) {
    const fb = process.env.GOOGLE_GENAI_API_KEY;
    if (fb?.trim()) keys.push(fb.trim());
  }
  pool = keys.map((k, i) => ({ key: k, label: `Key#${i + 1}...${k.slice(-6)}`, failedAt: 0 }));
  if (pool.length) console.log(`[genkit] ${pool.length} API key(s) loaded for rotation.`);
  return pool;
}

function nextKey(): string | null {
  const p = init();
  if (!p.length) return null;
  const now = Date.now();
  for (let i = 0; i < p.length; i++) {
    const s = p[(idx + i) % p.length];
    if (s.failedAt > 0 && now - s.failedAt < COOLDOWN_MS) continue;
    s.failedAt = 0;
    idx = (p.indexOf(s) + 1) % p.length;
    return s.key;
  }
  const oldest = p.reduce((a, b) => a.failedAt < b.failedAt ? a : b);
  oldest.failedAt = 0;
  return oldest.key;
}

function markFailed(key: string) {
  const s = init().find(x => x.key === key);
  if (s) { s.failedAt = Date.now(); console.warn(`[genkit] ${s.label} cooled down 60s.`); }
}

function labelFor(key: string | null) {
  return init().find(x => x.key === key)?.label ?? 'default';
}

// ── Genkit instances (one per key, cached) ───────────────────────────────────

const instances = new Map<string, Genkit>();

function getInstance(apiKey?: string | null): Genkit {
  const ck = apiKey ?? '__default__';
  let inst = instances.get(ck);
  if (!inst) {
    inst = apiKey
      ? genkit({ plugins: [googleAI({ apiKey })], model: MODEL })
      : genkit({ plugins: [googleAI()], model: MODEL });
    instances.set(ck, inst);
  }
  return inst;
}

/** Primary instance — all definePrompt / defineFlow calls use this. */
export const ai = getInstance(nextKey());

// ── Prompt cache ─────────────────────────────────────────────────────────────

type PromptConfig = Parameters<Genkit['definePrompt']>[0];
type PromptFn = ReturnType<Genkit['definePrompt']>;
const promptCache = new Map<string, Map<string, PromptFn>>();

/**
 * Get or create a prompt on a specific Genkit instance.
 * Each (promptName + instanceKey) combo is created exactly once.
 */
export function cachedPrompt(instance: Genkit, config: PromptConfig): PromptFn {
  const instanceId = [...instances.entries()].find(([, v]) => v === instance)?.[0] ?? '__unknown__';
  let byInstance = promptCache.get(config.name);
  if (!byInstance) { byInstance = new Map(); promptCache.set(config.name, byInstance); }
  let fn = byInstance.get(instanceId);
  if (!fn) { fn = instance.definePrompt(config); byInstance.set(instanceId, fn); }
  return fn;
}

// ── 429 detection ────────────────────────────────────────────────────────────

function is429(err: unknown): boolean {
  if (!err) return false;
  const m = String(err);
  return m.includes('429') || m.includes('RESOURCE_EXHAUSTED') || m.includes('rate limit') || m.includes('quota');
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ── Rotation wrapper ─────────────────────────────────────────────────────────

/**
 * Run fn with a Genkit instance. On 429, rotates to next key and retries.
 *
 * Usage in flows:
 *   return runWithRotation(async (instance) => {
 *       const prompt = cachedPrompt(instance, myPromptConfig);
 *       const { output } = await prompt(input);
 *       return output;
 *   });
 */
export async function runWithRotation<T>(fn: (instance: Genkit) => Promise<T>): Promise<T> {
  const p = init();
  const totalKeys = Math.max(p.length, 1);
  let lastErr: unknown;
  let total = 0;

  for (let k = 0; k < totalKeys; k++) {
    const key = nextKey();
    const inst = getInstance(key);
    for (let r = 0; r < RETRIES_PER_KEY; r++) {
      if (++total > MAX_TOTAL) throw lastErr ?? new Error('Gemini: max attempts exceeded');
      console.log(`[genkit] ${labelFor(key)} attempt ${total}, retry ${r + 1}/${RETRIES_PER_KEY}`);
      try {
        return await fn(inst);
      } catch (err) {
        lastErr = err;
        if (!is429(err)) throw err;
        if (r === RETRIES_PER_KEY - 1) { if (key) markFailed(key); break; }
        await sleep(RETRY_BASE_MS * Math.pow(2, r));
      }
    }
  }
  throw lastErr ?? new Error('Gemini: all keys rate-limited.');
}
