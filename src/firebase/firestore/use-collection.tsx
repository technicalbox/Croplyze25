'use client';

import { useState, useEffect } from 'react';
import {
  onSnapshot,
  collection,
  type Firestore,
} from 'firebase/firestore';
import { useFirestore } from '..';

export function useCollection<T>(path: string | undefined) {
  const firestore = useFirestore();
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!path) {
      setData([]);
      setLoading(false);
      return;
    }

    const collectionRef = collection(firestore, path);

    const unsubscribe = onSnapshot(
      collectionRef,
      (snapshot) => {
        const docs = snapshot.docs.map(
          (doc) => ({ ...doc.data(), id: doc.id } as T)
        );
        setData(docs);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, path]);

  return { data, loading, error };
}
