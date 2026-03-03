/**
 * @fileOverview Firestore read/write helpers for the Farming Partner Engine.
 * Uses a standalone Firebase init (NOT importing src/firebase/config.ts, which
 * has browser-only side-effects incompatible with server-side API routes).
 * All functions are server-safe — called from Next.js API routes only.
 */

import { initializeApp, getApp, getApps } from 'firebase/app';
import {
    getFirestore,
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    deleteDoc,
    orderBy,
    query,
    Timestamp,
} from 'firebase/firestore';
import type { FarmingPlanRecord } from './types';

// Inline config to avoid importing src/firebase/config.ts which calls
// setBrowserLocalPersistence() at module-level — that throws in server context.
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyCXF7ZXTrgfdMApLF4kZAwiFpL8baTdBc4",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "studio-2729619248-93d9f.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "studio-2729619248-93d9f",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "studio-2729619248-93d9f.appspot.com",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "255814188362",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:255814188362:web:ee6527ab26a1811a7c95b3",
};


function getDb() {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    return getFirestore(app);
}

const PLANS_COLLECTION = (userId: string) =>
    collection(getDb(), 'users', userId, 'farming-plans');

/**
 * Save a new farming plan to Firestore.
 * Returns the generated Firestore document ID.
 */
export async function saveFarmingPlan(plan: FarmingPlanRecord): Promise<string> {
    const ref = await addDoc(PLANS_COLLECTION(plan.userId), {
        ...plan,
        createdAt: Timestamp.fromMillis(plan.createdAt),
    });
    return ref.id;
}

/**
 * Fetch all farming plans for a user, ordered by creation date descending.
 */
export async function getUserFarmingPlans(userId: string): Promise<FarmingPlanRecord[]> {
    const q = query(
        PLANS_COLLECTION(userId),
        orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
        const data = d.data();
        return {
            ...data,
            id: d.id,
            createdAt: data.createdAt instanceof Timestamp
                ? data.createdAt.toMillis()
                : (data.createdAt as number),
        } as FarmingPlanRecord;
    });
}

/**
 * Fetch a single farming plan by ID for a given user.
 * Returns null if not found.
 */
export async function getFarmingPlan(
    userId: string,
    planId: string
): Promise<FarmingPlanRecord | null> {
    const ref = doc(getDb(), 'users', userId, 'farming-plans', planId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
        ...data,
        id: snap.id,
        createdAt: data.createdAt instanceof Timestamp
            ? data.createdAt.toMillis()
            : (data.createdAt as number),
    } as FarmingPlanRecord;
}

/**
 * Delete a farming plan by ID for a given user.
 */
export async function deleteFarmingPlan(userId: string, planId: string): Promise<void> {
    const ref = doc(getDb(), 'users', userId, 'farming-plans', planId);
    await deleteDoc(ref);
}
