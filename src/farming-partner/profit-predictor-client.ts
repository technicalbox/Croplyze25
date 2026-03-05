'use client';

/**
 * @fileOverview Client-side Firestore CRUD for the Profit Predictor.
 *
 * Mirrors the pattern in crop-success-planner-client.ts.
 * Uses the authenticated Firebase instance from FirebaseClientProvider.
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
import type { ProfitCalculation } from './profit-predictor-types';

function getDb() {
    return getFirestore(getApp());
}

const SUB_COLLECTION = 'profitCalculations';

/** Save a profit calculation to Firestore. */
export async function saveProfitCalculation(calc: ProfitCalculation): Promise<string> {
    const db = getDb();
    const colRef = collection(db, 'users', calc.userId, SUB_COLLECTION);

    const ref = await addDoc(colRef, {
        ...calc,
        createdAt: Timestamp.fromMillis(calc.createdAt),
    });

    return ref.id;
}

/** List all profit calculations for a user, newest first. */
export async function listProfitCalculationsClient(userId: string): Promise<ProfitCalculation[]> {
    const db = getDb();
    const colRef = collection(db, 'users', userId, SUB_COLLECTION);
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);

    return snap.docs.map((d) => {
        const data = d.data();
        return {
            ...(data as Omit<ProfitCalculation, 'id' | 'createdAt'>),
            id: d.id,
            createdAt:
                data.createdAt instanceof Timestamp
                    ? data.createdAt.toMillis()
                    : (data.createdAt as number),
        };
    });
}

/** Delete a profit calculation from Firestore. */
export async function deleteProfitCalculationClient(userId: string, calcId: string): Promise<void> {
    const db = getDb();
    await deleteDoc(doc(db, 'users', userId, SUB_COLLECTION, calcId));
}
