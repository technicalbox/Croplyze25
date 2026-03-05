'use client';

import { useState, useEffect } from 'react';
import {
  doc,
  onSnapshot,
  type Firestore,
  type DocumentData,
} from 'firebase/firestore';
import { useFirestore } from '..';

export function useDoc<T>(path: string | undefined, id: string) {
  const firestore = useFirestore();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if(!path || !id) {
        setLoading(false);
        return;
    }
    const docRef = doc(firestore, path, id);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setData({ ...snapshot.data(), id: snapshot.id } as T);
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, path, id]);

  return { data, loading, error };
}
