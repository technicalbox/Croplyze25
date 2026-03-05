'use client';

/**
 * @fileOverview Client-side Firestore CRUD for Growth Timelines.
 *
 * Runs in the browser where Firebase Auth context is present,
 * satisfying Firestore security rules (request.auth != null).
 *
 * Collection path: users/{userId}/growth-timelines/{timelineId}
 */

import { getApp } from 'firebase/app';
import {
    getFirestore,
    collection,
    doc,
    addDoc,
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

function getDb() {
    return getFirestore(getApp());
}

function timelineCol(userId: string) {
    return collection(getDb(), 'users', userId, 'growth-timelines');
}

function timelineDoc(userId: string, timelineId: string) {
    return doc(getDb(), 'users', userId, 'growth-timelines', timelineId);
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Saves a GrowthTimelineRecord to Firestore and returns the generated document ID.
 */
export async function saveGrowthTimeline(record: GrowthTimelineRecord): Promise<string> {
    const ref = await addDoc(timelineCol(record.userId), {
        ...record,
        createdAt: Timestamp.fromMillis(record.createdAt),
        updatedAt: Timestamp.fromMillis(record.updatedAt),
    });
    return ref.id;
}

// ─── Read (list) ──────────────────────────────────────────────────────────────

/**
 * Returns all growth timelines for a user, ordered newest first.
 */
export async function listGrowthTimelines(userId: string): Promise<GrowthTimelineRecord[]> {
    const q = query(timelineCol(userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
        const data = d.data();
        return {
            ...data,
            id: d.id,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : (data.createdAt as number),
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : (data.updatedAt as number),
        } as GrowthTimelineRecord;
    });
}

// ─── Read (single) ────────────────────────────────────────────────────────────

/**
 * Returns a single growth timeline by ID, or null if not found.
 */
export async function getGrowthTimeline(
    userId: string,
    timelineId: string
): Promise<GrowthTimelineRecord | null> {
    const snap = await getDoc(timelineDoc(userId, timelineId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
        ...data,
        id: snap.id,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : (data.createdAt as number),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : (data.updatedAt as number),
    } as GrowthTimelineRecord;
}

// ─── Update (single week) ─────────────────────────────────────────────────────

/**
 * Updates a single week within the timeline's weeks array.
 * Marks the week as `isEdited: true` automatically.
 * Also bumps the top-level `updatedAt` timestamp.
 *
 * NOTE: Firestore doesn't support array element updates by index natively.
 * We fetch, merge, and write back the modified weeks array.
 */
export async function updateTimelineWeek(
    userId: string,
    timelineId: string,
    weekNumber: number,
    weekData: Partial<Omit<WeeklyEntry, 'weekNumber' | 'isEdited'>>
): Promise<void> {
    const record = await getGrowthTimeline(userId, timelineId);
    if (!record) throw new Error(`Growth timeline ${timelineId} not found.`);

    const weeks = record.timeline.weeks.map((week) =>
        week.weekNumber === weekNumber
            ? { ...week, ...weekData, isEdited: true }
            : week
    );

    await updateDoc(timelineDoc(userId, timelineId), {
        'timeline.weeks': weeks,
        updatedAt: Timestamp.fromMillis(Date.now()),
    });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Permanently deletes a growth timeline document.
 */
export async function deleteGrowthTimeline(userId: string, timelineId: string): Promise<void> {
    await deleteDoc(timelineDoc(userId, timelineId));
}
