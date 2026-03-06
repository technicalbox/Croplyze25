/**
 * @fileOverview Firestore service for Weather Alerts.
 * Stores and retrieves weather alerts in `users/{uid}/weather_alerts`.
 */

import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    query,
    orderBy,
    limit,
    where,
    serverTimestamp,
    type Firestore,
} from 'firebase/firestore';
import type { OutbreakAlert, AlertDocument } from '@/lib/alert-types';

// ── Save alerts to Firestore ─────────────────────────────────────────────────

export async function saveWeatherAlerts(
    db: Firestore,
    userId: string,
    alerts: OutbreakAlert[],
    location: string,
): Promise<void> {
    const collectionRef = collection(db, `users/${userId}/weather_alerts`);

    // Check for existing active alerts to deduplicate
    const existingQ = query(
        collectionRef,
        where('expires_at', '>', Date.now()),
        orderBy('expires_at', 'desc'),
    );

    let existingKeys = new Set<string>();
    try {
        const existingSnap = await getDocs(existingQ);
        existingKeys = new Set(
            existingSnap.docs.map(d => `${d.data().alert_type}-${d.data().severity}`)
        );
    } catch {
        // If query fails (index not ready), proceed anyway
    }

    for (const alert of alerts) {
        const key = `${alert.type}-${alert.severity}`;
        if (existingKeys.has(key)) continue;

        const record: Omit<AlertDocument, 'id'> = {
            userId,
            alert_type: alert.type,
            category: alert.category,
            title: alert.title,
            description: alert.message,
            severity: alert.severity,
            crop: alert.crop,
            location: alert.location ?? location,
            created_at: alert.generatedAt,
            expires_at: alert.expiresAt,
            read_status: false,
            source_name: alert.source?.name ?? 'Weather Analysis',
            source_url: alert.source?.url,
            details: alert.details,
            action: alert.action,
        };

        await addDoc(collectionRef, record);
    }
}

// ── List alerts ──────────────────────────────────────────────────────────────

export async function listWeatherAlertsClient(
    db: Firestore,
    userId: string,
    maxResults = 10,
): Promise<AlertDocument[]> {
    const collectionRef = collection(db, `users/${userId}/weather_alerts`);
    const q = query(collectionRef, orderBy('created_at', 'desc'), limit(maxResults));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id })) as AlertDocument[];
}

// ── Dismiss alert ────────────────────────────────────────────────────────────

export async function dismissWeatherAlert(
    db: Firestore,
    userId: string,
    alertId: string,
): Promise<void> {
    const docRef = doc(db, `users/${userId}/weather_alerts`, alertId);
    await deleteDoc(docRef);
}
