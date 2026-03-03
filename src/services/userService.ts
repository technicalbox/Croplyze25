import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import type { UserDocument } from '@/lib/types';

function getDb() {
    return getFirestore(getApp());
}

/**
 * Fetch the user's Firestore profile document.
 * Returns `null` if no document exists yet.
 */
export async function getUserDoc(uid: string): Promise<UserDocument | null> {
    const snap = await getDoc(doc(getDb(), 'users', uid));
    if (!snap.exists()) return null;
    return { uid, ...snap.data() } as UserDocument;
}

/**
 * Create or merge a user profile document.
 * `createdAt` is set only on creation; `updatedAt` is always refreshed.
 */
export async function setUserDoc(
    uid: string,
    data: Partial<UserDocument>,
): Promise<void> {
    const ref = doc(getDb(), 'users', uid);
    const existing = await getDoc(ref);

    await setDoc(
        ref,
        {
            ...data,
            uid,
            updatedAt: serverTimestamp(),
            ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
        },
        { merge: true },
    );
}

/**
 * Check whether a profile is "complete" — i.e. has the minimum required fields
 * (name, phone, state, language) filled in.
 */
export function isProfileComplete(profile: UserDocument | null): boolean {
    if (!profile) return false;
    return !!(profile.name && profile.phone && profile.state && profile.language);
}
