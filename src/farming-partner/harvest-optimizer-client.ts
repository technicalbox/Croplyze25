'use client';

/**
 * @fileOverview Client-side Firestore CRUD for Harvest Optimizer reports.
 * Uses getApp() to reuse the authenticated browser Firebase instance.
 */

import {
    getFirestore, collection, addDoc, getDocs,
    deleteDoc, doc, query, orderBy, Timestamp,
} from 'firebase/firestore';
import { getApp } from 'firebase/app';
import type { HarvestOptimizerRecord } from './harvest-optimizer-service';

function getDb() { return getFirestore(getApp()); }

const COL = (userId: string) =>
    collection(getDb(), 'users', userId, 'harvest-optimizer');

/** Save a generated report; returns the new Firestore document ID. */
export async function saveHarvestOptimizer(record: HarvestOptimizerRecord): Promise<string> {
    const ref = await addDoc(COL(record.userId), {
        ...record,
        createdAt: Timestamp.fromMillis(record.createdAt),
    });
    return ref.id;
}

/** List all reports for a user, newest first. */
export async function listHarvestOptimizers(userId: string): Promise<HarvestOptimizerRecord[]> {
    const snap = await getDocs(query(COL(userId), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => {
        const data = d.data();
        return {
            ...(data as Omit<HarvestOptimizerRecord, 'id' | 'createdAt'>),
            id: d.id,
            createdAt: data.createdAt instanceof Timestamp
                ? data.createdAt.toMillis()
                : (data.createdAt as number),
        };
    });
}

/** Delete a report. */
export async function deleteHarvestOptimizer(userId: string, id: string): Promise<void> {
    await deleteDoc(doc(getDb(), 'users', userId, 'harvest-optimizer', id));
}
