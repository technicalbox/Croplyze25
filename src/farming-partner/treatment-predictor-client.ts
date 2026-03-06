'use client';

/**
 * @fileOverview Client-side Firestore CRUD for the Treatment Predictor.
 *
 * Stores each treatment prediction search (input + output) so the user
 * can refer back to previous queries.
 *
 * Collection: users/{userId}/treatmentPredictions/{docId}
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
import type { TreatmentOutcomePredictorOutput } from '@/ai/flows/treatment-outcome-predictor-flow';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TreatmentPredictionRecord {
    id?: string;
    userId: string;
    /** Input fields */
    medicineName: string;
    activeIngredient: string;
    category: string;
    cropType: string;
    diseaseName: string;
    soilType: string;
    weatherConditions: string;
    season: string;
    severityLevel?: string;
    /** AI prediction output */
    prediction: TreatmentOutcomePredictorOutput;
    /** Timestamp (epoch ms when reading, Firestore Timestamp when writing) */
    createdAt: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDb() {
    return getFirestore(getApp());
}

const SUB_COLLECTION = 'treatmentPredictions';

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/** Save a treatment prediction record to Firestore. */
export async function saveTreatmentPrediction(
    record: TreatmentPredictionRecord,
): Promise<string> {
    const db = getDb();
    const colRef = collection(db, 'users', record.userId, SUB_COLLECTION);

    const ref = await addDoc(colRef, {
        ...record,
        createdAt: Timestamp.fromMillis(record.createdAt),
    });

    return ref.id;
}

/** List all treatment predictions for a user, newest first. */
export async function listTreatmentPredictions(
    userId: string,
): Promise<TreatmentPredictionRecord[]> {
    const db = getDb();
    const colRef = collection(db, 'users', userId, SUB_COLLECTION);
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);

    return snap.docs.map((d) => {
        const data = d.data();
        return {
            ...(data as Omit<TreatmentPredictionRecord, 'id' | 'createdAt'>),
            id: d.id,
            createdAt:
                data.createdAt instanceof Timestamp
                    ? data.createdAt.toMillis()
                    : (data.createdAt as number),
        };
    });
}

/** Delete a treatment prediction from Firestore. */
export async function deleteTreatmentPrediction(
    userId: string,
    predictionId: string,
): Promise<void> {
    const db = getDb();
    await deleteDoc(doc(db, 'users', userId, SUB_COLLECTION, predictionId));
}
