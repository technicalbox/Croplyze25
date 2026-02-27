/**
 * @fileOverview Server-side Firestore helpers for Growth Timelines.
 *
 * Used ONLY by API routes (GET, PATCH, DELETE).
 * Uses the same inline Firebase config pattern as farming-partner/firestore.ts
 * to avoid importing browser-only src/firebase/config.ts in server context.
 *
 * NOTE: PATCH/DELETE go through the server because they need ownership
 * verification. The POST (save) is handled client-side to leverage auth context.
 */

import { initializeApp, getApp, getApps } from 'firebase/app';
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    orderBy,
    query,
    Timestamp,
} from 'firebase/firestore';
import type { GrowthTimelineRecord } from './growth-timeline-service';
import type { WeeklyEntry } from '@/ai/flows/farming-partner/growth-timeline-flow';

// Inline config — avoids importing browser-only firebase/config.ts
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyCXF7ZXTrgfdMApLF4kZAwiFpL8baTdBc4',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'studio-2729619248-93d9f.firebaseapp.com',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'studio-2729619248-93d9f',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'studio-2729619248-93d9f.appspot.com',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '255814188362',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '1:255814188362:web:ee6527ab26a1811a7c95b3',
};

function getDb() {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    return getFirestore(app);
}

function timelineDoc(userId: string, timelineId: string) {
    return doc(getDb(), 'users', userId, 'growth-timelines', timelineId);
}

function timelineCol(userId: string) {
    return collection(getDb(), 'users', userId, 'growth-timelines');
}

function deserialize(id: string, data: Record<string, unknown>): GrowthTimelineRecord {
    return {
        ...data,
        id,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : (data.createdAt as number),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : (data.updatedAt as number),
    } as GrowthTimelineRecord;
}

// ─── Read (single) ────────────────────────────────────────────────────────────

export async function getGrowthTimelineServer(
    userId: string,
    timelineId: string
): Promise<GrowthTimelineRecord | null> {
    const snap = await getDoc(timelineDoc(userId, timelineId));
    if (!snap.exists()) return null;
    return deserialize(snap.id, snap.data() as Record<string, unknown>);
}

// ─── Read (list) ──────────────────────────────────────────────────────────────

export async function listGrowthTimelinesServer(userId: string): Promise<GrowthTimelineRecord[]> {
    const q = query(timelineCol(userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => deserialize(d.id, d.data() as Record<string, unknown>));
}

// ─── Update (single week — server-side) ──────────────────────────────────────

/**
 * Fetches the full timeline, patches the target week, and writes back.
 * Marks isEdited=true on the modified week. Bumps updatedAt.
 */
export async function updateGrowthTimelineWeekServer(
    userId: string,
    timelineId: string,
    weekNumber: number,
    weekData: Partial<Omit<WeeklyEntry, 'weekNumber' | 'isEdited'>>
): Promise<void> {
    const record = await getGrowthTimelineServer(userId, timelineId);
    if (!record) throw new Error(`Timeline ${timelineId} not found for user ${userId}.`);

    const updatedWeeks = record.timeline.weeks.map((week) =>
        week.weekNumber === weekNumber
            ? { ...week, ...weekData, isEdited: true }
            : week
    );

    await updateDoc(timelineDoc(userId, timelineId), {
        'timeline.weeks': updatedWeeks,
        updatedAt: Timestamp.fromMillis(Date.now()),
    });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteGrowthTimelineServer(userId: string, timelineId: string): Promise<void> {
    await deleteDoc(timelineDoc(userId, timelineId));
}
