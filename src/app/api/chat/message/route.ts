import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendChatMessage, generateSessionTitle } from '@/farming-partner/farming-chatbot-service';
import {
    ChatMessageInputSchema,
    SUPPORTED_LANGUAGES,
} from '@/ai/flows/farming-chatbot-flow';

// Vercel: allow up to 30s for AI response
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

// ─── Extended request schema (adds sessionId field for continuity) ─────────────

const RequestSchema = z.object({
    /** Omit to start a new session; include to continue an existing one. */
    sessionId: z.string().optional(),

    message: z.string().min(1).max(2000),

    language: z.enum(SUPPORTED_LANGUAGES).default('auto'),

    /**
     * Client sends the last ≤10 messages from its local state.
     * This avoids a server-side Firestore read and keeps the route Vercel-safe.
     */
    chatHistory: z.array(z.object({
        role: z.enum(['user', 'model']),
        content: z.string(),
    })).max(10).default([]),

    cropContext: z.object({
        cropType: z.string(),
        region: z.string(),
        soilType: z.string().optional(),
        season: z.string().optional(),
    }).optional(),
});

export async function POST(req: NextRequest) {
    try {
        // ── Auth ────────────────────────────────────────────────────────────────
        const userId = req.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json({ error: 'Missing x-user-id header.' }, { status: 401 });
        }

        // ── Validate input ──────────────────────────────────────────────────────
        const body = await req.json();
        const parsed = RequestSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid request.', details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const { sessionId, message, language, chatHistory, cropContext } = parsed.data;

        // ── Build Genkit flow input ─────────────────────────────────────────────
        const flowInput = ChatMessageInputSchema.parse({
            message,
            language,
            chatHistory,
            cropContext,
        });

        // ── Call AI ─────────────────────────────────────────────────────────────
        const turn = await sendChatMessage(flowInput);

        // ── Generate session title (for new sessions or to update on first message) ──
        const isNewSession = !sessionId;
        const sessionTitle = isNewSession ? generateSessionTitle(message) : undefined;

        // ── Return ──────────────────────────────────────────────────────────────
        return NextResponse.json({
            sessionId: sessionId ?? null,    // null = client should create new session
            isNewSession,
            sessionTitle,                            // set only for new sessions
            reply: turn.reply,
            detectedLanguage: turn.detectedLanguage,
            suggestedFollowUps: turn.suggestedFollowUps,
            timestamp: turn.timestamp,
        }, { status: 200 });

    } catch (err: unknown) {
        console.error('[POST /api/chat/message]', err);
        const message = err instanceof Error ? err.message : 'Internal server error.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
