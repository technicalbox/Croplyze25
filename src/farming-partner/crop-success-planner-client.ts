'use client';

/**
 * @fileOverview Client-side Firestore helper for the Crop Success Planner.
 *
 * WHY CLIENT-SIDE:
 * Firestore security rules enforce `request.auth != null && request.auth.uid == userId`.
 * Server-side API routes have no Firebase Auth session, causing PERMISSION_DENIED.
 * The authenticated Firebase instance only exists in the browser context.
 *
 * Usage: call saveCropSuccessPlan() immediately after receiving the AI result
 * from the API route, while the user is logged in.
 */

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    query,
    orderBy,
    Timestamp,
} from 'firebase/firestore';
import { getApp } from 'firebase/app';
import type { CropSuccessPlan } from './crop-success-planner-service';

function getDb() {
    // Re-uses the already-initialised Firebase app from FirebaseClientProvider
    return getFirestore(getApp());
}

/** Save an AI-generated plan to Firestore as the authenticated user. */
export async function saveCropSuccessPlan(plan: CropSuccessPlan): Promise<string> {
    const db = getDb();
    const colRef = collection(db, 'users', plan.userId, 'crop-success-plans');

    const ref = await addDoc(colRef, {
        ...plan,
        createdAt: Timestamp.fromMillis(plan.createdAt),
    });

    return ref.id;
}

/** List all plans for a user, newest first. */
export async function listCropSuccessPlansClient(userId: string): Promise<CropSuccessPlan[]> {
    const db = getDb();
    const colRef = collection(db, 'users', userId, 'crop-success-plans');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);

    return snap.docs.map((d) => {
        const data = d.data();
        return {
            ...(data as Omit<CropSuccessPlan, 'id' | 'createdAt'>),
            id: d.id,
            createdAt:
                data.createdAt instanceof Timestamp
                    ? data.createdAt.toMillis()
                    : (data.createdAt as number),
        };
    });
}

/** Delete a plan from Firestore. */
export async function deleteCropSuccessPlanClient(userId: string, planId: string): Promise<void> {
    const db = getDb();
    await deleteDoc(doc(db, 'users', userId, 'crop-success-plans', planId));
}
