/**
 * @fileOverview Genkit AI flow for the Farming Chatbot.
 *
 * Features:
 * - Context-aware (injects crop/soil/region details into system prompt)
 * - Multilingual (detects and responds in user's language)
 * - Chat history aware (accepts last N turns for conversational continuity)
 * - Gemini depth-5 safe (suggestedFollowUps stored as 3 flat fields)
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// ─── Supported languages ──────────────────────────────────────────────────────

export const SUPPORTED_LANGUAGES = [
    'auto', 'en', 'ur', 'hi', 'pa', 'ar', 'sw', 'fr',
] as const;
export type ChatLanguage = typeof SUPPORTED_LANGUAGES[number];

// ─── Input schema ─────────────────────────────────────────────────────────────

export const ChatMessageInputSchema = z.object({
    message: z
        .string()
        .min(1)
        .describe('The latest user message.'),

    language: z
        .enum(SUPPORTED_LANGUAGES)
        .default('auto')
        .describe('Preferred response language. "auto" = detect from message.'),

    /** Last ≤10 conversation turns for context. Oldest first. */
    chatHistory: z
        .array(z.object({
            role: z.enum(['user', 'model']),
            content: z.string(),
        }))
        .max(10)
        .default([])
        .describe('Recent chat history for conversational context.'),

    /** Optional farm/crop context to ground the AI's advice. */
    cropContext: z
        .object({
            cropType: z.string().describe('Current or planned crop (e.g. "wheat").'),
            region: z.string().describe('Farm region (e.g. "Punjab, Pakistan").'),
            soilType: z.string().optional().describe('Soil type if known.'),
            season: z.string().optional().describe('Current season.'),
        })
        .optional()
        .describe('Optional farm context to personalise advice.'),
});

export type ChatMessageInput = z.infer<typeof ChatMessageInputSchema>;

// ─── Output schema ────────────────────────────────────────────────────────────
// suggestedFollowUps stored as 3 flat fields (NOT an array of objects)
// to keep Gemini schema depth ≤ 5.

export const ChatMessageOutputSchema = z.object({
    reply: z.string().describe('The AI farming assistant reply.'),
    detectedLanguage: z.string().describe('ISO 639-1 code of the language detected in the user message (e.g. "ur", "en", "hi").'),
    suggestedFollowUp1: z.string().describe('First suggested follow-up question in the same language as reply.'),
    suggestedFollowUp2: z.string().describe('Second suggested follow-up question. Empty string if not applicable.'),
    suggestedFollowUp3: z.string().describe('Third suggested follow-up question. Empty string if not applicable.'),
});

export type ChatMessageOutput = z.infer<typeof ChatMessageOutputSchema>;

// ─── Flow ─────────────────────────────────────────────────────────────────────

export async function runFarmingChatbot(
    input: ChatMessageInput,
): Promise<ChatMessageOutput> {
    return farmingChatbotFlow(input);
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

const farmingChatbotPrompt = ai.definePrompt({
    name: 'farmingChatbotPrompt',
    input: { schema: ChatMessageInputSchema },
    output: { schema: ChatMessageOutputSchema },
    prompt: `You are Fasal AI — a friendly, expert farming assistant for smallholder and commercial farmers.

═══ YOUR ROLE ═══
- Provide accurate, practical agricultural advice.
- Focus strictly on farming topics: crops, soil, irrigation, pests, fertilizers, harvest, weather, market prices, storage, and sustainable practices.
- If asked about unrelated topics, politely redirect: "I can only help with farming-related questions."
- Always be encouraging and culturally sensitive.

═══ LANGUAGE ═══
Requested Language: {{language}}

If the Requested Language is "auto":
- Detect the language from the user's message.
- Reply in the SAME LANGUAGE as the user's message.

If the Requested Language is NOT "auto" (e.g. "en", "ur"):
- Respond strictly in the Requested Language code.
- Even if the user writes in a different language, reply in the Requested Language.

Always use simple words suitable for farmers with varying literacy levels.

Set detectedLanguage to the ISO 639-1 code of the language you detected (e.g. "ur" for Urdu, "en" for English, "hi" for Hindi, "pa" for Punjabi).

═══ FARM CONTEXT ═══
{{#if cropContext}}
This farmer's context:
- Crop:   {{cropContext.cropType}}
- Region: {{cropContext.region}}
{{#if cropContext.soilType}}- Soil:   {{cropContext.soilType}}{{/if}}
{{#if cropContext.season}}- Season: {{cropContext.season}}{{/if}}

Tailor all advice to this specific crop and region. Reference it naturally.
{{else}}
No specific crop context provided. Give general farming advice and ask clarifying questions if helpful.
{{/if}}

═══ CONVERSATION HISTORY ═══
{{#if chatHistory.length}}
Previous turns (oldest first):
{{#each chatHistory}}
{{role}}: {{content}}
{{/each}}
{{/if}}

═══ CURRENT MESSAGE ═══
user: {{message}}

═══ RESPONSE RULES ═══
1. reply: Give a clear, actionable answer. Use bullet points for multi-step advice. 2–4 sentences or a short list. Do not repeat the user's question.
2. detectedLanguage: ISO 639-1 code only (e.g. "ur", "en", "hi", "pa", "ar").
3. suggestedFollowUp1/2/3: Write 3 natural follow-up questions in the SAME language as your reply that the farmer might want to ask next. Make them specific and useful. Use empty string "" only if there are genuinely no relevant follow-ups.`,
});

// ─── Define flow ──────────────────────────────────────────────────────────────

const farmingChatbotFlow = ai.defineFlow(
    {
        name: 'farmingChatbotFlow',
        inputSchema: ChatMessageInputSchema,
        outputSchema: ChatMessageOutputSchema,
    },
    async (input) => {
        const { output } = await farmingChatbotPrompt(input);
        if (!output) throw new Error('Farming chatbot AI returned no output.');
        return output;
    },
);
