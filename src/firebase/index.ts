'use client';

import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

import { useUser } from './auth/use-user';
import { useCollection } from './firestore/use-collection';
import { useDoc } from './firestore/use-doc';
import { FirebaseProvider, useAuth, useFirebaseApp, useFirestore } from './provider';
import FirebaseClientProvider from './client-provider';

function initializeFirebase(): {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
} {
  const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);

  return { firebaseApp, auth, firestore };
}

export {
  initializeFirebase,
  FirebaseProvider,
  FirebaseClientProvider,
  useUser,
  useCollection,
  useDoc,
  useFirebaseApp,
  useAuth,
  useFirestore,
};
