'use client';

/**
 * @fileOverview Client-side Firestore CRUD for the Farming Chatbot.
 *
 * Structure:
 *   users/{userId}/chat-sessions/{sessionId}          ← session metadata
 *   users/{userId}/chat-sessions/{sessionId}/messages ← message subcollection
 *
 * WHY CLIENT-SIDE: Firestore rules enforce request.auth.uid == userId.
 * Server-side API routes have no Firebase Auth session → PERMISSION_DENIED.
 */

import {
    getFirestore,
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    query,
    orderBy,
    limit,
    Timestamp,
    writeBatch,
} from 'firebase/firestore';
import { getApp } from 'firebase/app';
import type { ChatSession, ChatMessage } from './farming-chatbot-service';

function getDb() { return getFirestore(getApp()); }

// ─── Collection helpers ───────────────────────────────────────────────────────

const sessionsCol = (userId: string) =>
    collection(getDb(), 'users', userId, 'chat-sessions');

const messagesCol = (userId: string, sessionId: string) =>
    collection(getDb(), 'users', userId, 'chat-sessions', sessionId, 'messages');

// ─── Session CRUD ─────────────────────────────────────────────────────────────

/** Create a new chat session. Returns the new session ID. */
export async function createChatSession(
    userId: string,
    data: Omit<ChatSession, 'id' | 'userId'>,
): Promise<string> {
    const docData: Record<string, any> = {
        ...data,
        userId,
        createdAt: Timestamp.fromMillis(data.createdAt),
        updatedAt: Timestamp.fromMillis(data.updatedAt),
    };

    Object.keys(docData).forEach(k => docData[k] === undefined && delete docData[k]);

    const ref = await addDoc(sessionsCol(userId), docData);
    return ref.id;
}

/** Update session metadata (title, language, updatedAt). */
export async function updateChatSession(
    userId: string,
    sessionId: string,
    patch: Partial<Pick<ChatSession, 'title' | 'language' | 'updatedAt'>>,
): Promise<void> {
    const ref = doc(getDb(), 'users', userId, 'chat-sessions', sessionId);
    const update: Record<string, unknown> = { ...patch };
    if (patch.updatedAt) update.updatedAt = Timestamp.fromMillis(patch.updatedAt);
    await updateDoc(ref, update);
}

/** List all sessions for a user, most recently updated first. */
export async function listChatSessions(userId: string): Promise<ChatSession[]> {
    const snap = await getDocs(
        query(sessionsCol(userId), orderBy('updatedAt', 'desc'), limit(50)),
    );
    return snap.docs.map(d => {
        const data = d.data();
        return {
            ...(data as Omit<ChatSession, 'id' | 'createdAt' | 'updatedAt'>),
            id: d.id,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : (data.createdAt as number),
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : (data.updatedAt as number),
        };
    });
}

/**
 * Delete a session AND all its messages.
 * Firestore does not auto-delete subcollections — we batch-delete messages first.
 */
export async function deleteChatSession(
    userId: string,
    sessionId: string,
): Promise<void> {
    const db = getDb();
    const msgSnap = await getDocs(messagesCol(userId, sessionId));

    // Batch delete messages (max 500 per batch — fine for chat history)
    const batch = writeBatch(db);
    msgSnap.docs.forEach(d => batch.delete(d.ref));
    batch.delete(doc(db, 'users', userId, 'chat-sessions', sessionId));
    await batch.commit();
}

// ─── Message CRUD ─────────────────────────────────────────────────────────────

/** Add a single message to a session. Returns the new message ID. */
export async function addChatMessage(
    userId: string,
    sessionId: string,
    message: Omit<ChatMessage, 'id'>,
): Promise<string> {
    const ref = await addDoc(messagesCol(userId, sessionId), {
        ...message,
        createdAt: Timestamp.fromMillis(message.createdAt),
    });
    return ref.id;
}

/** Load all messages for a session in chronological order. */
export async function getChatMessages(
    userId: string,
    sessionId: string,
): Promise<ChatMessage[]> {
    const snap = await getDocs(
        query(messagesCol(userId, sessionId), orderBy('createdAt', 'asc')),
    );
    return snap.docs.map(d => {
        const data = d.data();
        return {
            ...(data as Omit<ChatMessage, 'id' | 'createdAt'>),
            id: d.id,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : (data.createdAt as number),
        };
    });
}

/**
 * Convenience: add both user message and model reply in a single batch.
 * Returns [userMessageId, modelMessageId].
 */
export async function addChatTurn(
    userId: string,
    sessionId: string,
    userContent: string,
    modelContent: string,
    now: number = Date.now(),
): Promise<[string, string]> {
    const [userMsg, modelMsg] = await Promise.all([
        addChatMessage(userId, sessionId, {
            role: 'user',
            content: userContent,
            createdAt: now,
        }),
        addChatMessage(userId, sessionId, {
            role: 'model',
            content: modelContent,
            createdAt: now + 1, // +1ms to ensure sort order
        }),
    ]);
    return [userMsg, modelMsg];
}
