'use client';

/**
 * @fileOverview Client-side Firestore CRUD for saved crop combinations (bookmarks).
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
    where,
    Timestamp,
} from 'firebase/firestore';
import { getApp } from 'firebase/app';
import type { SavedCropCombination } from '@/types/crop-combination';

function getDb() {
    return getFirestore(getApp());
}

const SUB_COLLECTION = 'savedCropCombinations';

export async function saveCropCombination(record: SavedCropCombination): Promise<string> {
    const db = getDb();
    const colRef = collection(db, 'users', record.userId, SUB_COLLECTION);
    const ref = await addDoc(colRef, {
        ...record,
        createdAt: Timestamp.fromMillis(record.createdAt),
    });
    return ref.id;
}

export async function listSavedCropCombinations(userId: string): Promise<SavedCropCombination[]> {
    const db = getDb();
    const colRef = collection(db, 'users', userId, SUB_COLLECTION);
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
        const data = d.data();
        return {
            ...(data as Omit<SavedCropCombination, 'id' | 'createdAt'>),
            id: d.id,
            createdAt:
                data.createdAt instanceof Timestamp
                    ? data.createdAt.toMillis()
                    : (data.createdAt as number),
        };
    });
}

export async function deleteSavedCropCombination(userId: string, recordId: string): Promise<void> {
    const db = getDb();
    await deleteDoc(doc(db, 'users', userId, SUB_COLLECTION, recordId));
}

export async function isCombinationSaved(userId: string, combinationId: string): Promise<boolean> {
    const db = getDb();
    const colRef = collection(db, 'users', userId, SUB_COLLECTION);
    const q = query(colRef, where('combinationId', '==', combinationId));
    const snap = await getDocs(q);
    return !snap.empty;
}
