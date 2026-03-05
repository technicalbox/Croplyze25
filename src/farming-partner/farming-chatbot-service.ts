/**
 * @fileOverview Server-only orchestrator for the Farming Chatbot.
 * Calls the Genkit flow and returns a structured ChatTurn.
 * No Firestore writes — persistence is handled client-side.
 */

import {
    runFarmingChatbot,
    type ChatMessageInput,
    type ChatMessageOutput,
} from '@/ai/flows/farming-chatbot-flow';

export type { ChatMessageInput, ChatMessageOutput };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatTurn {
    userMessage: string;
    reply: string;
    detectedLanguage: string;
    suggestedFollowUps: string[];   // reconstructed clean array from flat fields
    cropContext?: ChatMessageInput['cropContext'];
    timestamp: number;       // Unix ms
}

export interface ChatSession {
    id?: string;
    userId: string;
    title: string;            // auto-generated from first message
    language: string;
    createdAt: number;
    updatedAt: number;
    cropContext?: ChatMessageInput['cropContext'];
}

export interface ChatMessage {
    id?: string;
    role: 'user' | 'model';
    content: string;
    createdAt: number;
}

// ─── Server function ──────────────────────────────────────────────────────────

/**
 * Sends a message to the Farming Chatbot AI and returns a structured turn.
 * The caller is responsible for persisting the turn to Firestore client-side.
 */
export async function sendChatMessage(
    input: ChatMessageInput,
): Promise<ChatTurn> {
    const output: ChatMessageOutput = await runFarmingChatbot(input);

    // Reconstruct suggestedFollowUps from flat fields, filtering empty strings
    const suggestedFollowUps = [
        output.suggestedFollowUp1,
        output.suggestedFollowUp2,
        output.suggestedFollowUp3,
    ].filter(s => s && s.trim().length > 0);

    return {
        userMessage: input.message,
        reply: output.reply,
        detectedLanguage: output.detectedLanguage,
        suggestedFollowUps,
        cropContext: input.cropContext,
        timestamp: Date.now(),
    };
}

/**
 * Generate a concise session title from the first user message.
 * Truncates at 60 chars.
 */
export function generateSessionTitle(firstMessage: string): string {
    const trimmed = firstMessage.trim();
    if (trimmed.length <= 60) return trimmed;
    return trimmed.slice(0, 57) + '…';
}
