'use client';

/**
 * @fileOverview Client-side Firestore CRUD for Weekly Growth Reports.
 *
 * Runs in the browser where Firebase Auth context is present,
 * satisfying Firestore security rules (request.auth != null).
 *
 * Collection path: users/{userId}/weekly-growth-reports/{reportId}
 */

import { getApp } from 'firebase/app';
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
import type { WeeklyGrowthReportRecord } from './weekly-growth-report-service';

function getDb() {
    return getFirestore(getApp());
}

function reportCol(userId: string) {
    return collection(getDb(), 'users', userId, 'weekly-growth-reports');
}

function reportDoc(userId: string, reportId: string) {
    return doc(getDb(), 'users', userId, 'weekly-growth-reports', reportId);
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Saves a WeeklyGrowthReportRecord to Firestore and returns the generated document ID.
 */
export async function saveWeeklyGrowthReport(record: WeeklyGrowthReportRecord): Promise<string> {
    const ref = await addDoc(reportCol(record.userId), {
        ...record,
        createdAt: Timestamp.fromMillis(record.createdAt),
        updatedAt: Timestamp.fromMillis(record.updatedAt),
    });
    return ref.id;
}

// ─── Read (list) ──────────────────────────────────────────────────────────────

/**
 * Returns all weekly growth reports for a user, ordered newest first.
 */
export async function listWeeklyGrowthReports(userId: string): Promise<WeeklyGrowthReportRecord[]> {
    const q = query(reportCol(userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
        const data = d.data();
        return {
            ...data,
            id: d.id,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : (data.createdAt as number),
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : (data.updatedAt as number),
        } as WeeklyGrowthReportRecord;
    });
}

// ─── Read (single) ────────────────────────────────────────────────────────────

/**
 * Returns a single weekly growth report by ID, or null if not found.
 */
export async function getWeeklyGrowthReport(
    userId: string,
    reportId: string
): Promise<WeeklyGrowthReportRecord | null> {
    const snap = await getDoc(reportDoc(userId, reportId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
        ...data,
        id: snap.id,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : (data.createdAt as number),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : (data.updatedAt as number),
    } as WeeklyGrowthReportRecord;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Permanently deletes a weekly growth report document.
 */
export async function deleteWeeklyGrowthReport(userId: string, reportId: string): Promise<void> {
    await deleteDoc(reportDoc(userId, reportId));
}

// ─── Cache check ──────────────────────────────────────────────────────────────

/**
 * Checks if a report was already generated this week (within 7 days)
 * for the same crop + week number. Returns the cached record or null.
 */
export async function getCachedWeeklyReport(
    userId: string,
    cropName: string,
    weekNumber: number
): Promise<WeeklyGrowthReportRecord | null> {
    const reports = await listWeeklyGrowthReports(userId);
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    return reports.find(r =>
        r.input.cropName.toLowerCase() === cropName.toLowerCase() &&
        r.input.weekNumber === weekNumber &&
        r.createdAt > sevenDaysAgo
    ) ?? null;
}
