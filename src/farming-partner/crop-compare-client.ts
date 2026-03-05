'use client';

/**
 * @fileOverview Client-side Firestore CRUD for Crop Compare history.
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

export interface CropCompareRecord {
    id?: string;
    userId: string;
    createdAt: number;
    cropIds: string[];
    cropNames: string[];
    bestPickName: string;
    region?: string;
}

function getDb() {
    return getFirestore(getApp());
}

const SUB_COLLECTION = 'cropComparisons';

export async function saveCropComparison(record: CropCompareRecord): Promise<string> {
    const db = getDb();
    const colRef = collection(db, 'users', record.userId, SUB_COLLECTION);
    const ref = await addDoc(colRef, {
        ...record,
        createdAt: Timestamp.fromMillis(record.createdAt),
    });
    return ref.id;
}

export async function listCropComparisonsClient(userId: string): Promise<CropCompareRecord[]> {
    const db = getDb();
    const colRef = collection(db, 'users', userId, SUB_COLLECTION);
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
        const data = d.data();
        return {
            ...(data as Omit<CropCompareRecord, 'id' | 'createdAt'>),
            id: d.id,
            createdAt:
                data.createdAt instanceof Timestamp
                    ? data.createdAt.toMillis()
                    : (data.createdAt as number),
        };
    });
}

export async function deleteCropComparisonClient(userId: string, recordId: string): Promise<void> {
    const db = getDb();
    await deleteDoc(doc(db, 'users', userId, SUB_COLLECTION, recordId));
}
