'use client';
import {
  doc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import type { DetectCropDiseaseOutput } from '@/ai/flows/detect-crop-disease-flow';

export type DiagnosisData = {
  userId: string;
  cropType: string;
  image: string;
  diagnosis: DetectCropDiseaseOutput;
};

export async function saveDiagnosis(
  firestore: Firestore,
  diagnosisData: DiagnosisData
) {
  if (!diagnosisData.userId) {
    throw new Error('User ID is required to save a diagnosis.');
  }

  const diagnosisCollection = collection(
    firestore,
    'users',
    diagnosisData.userId,
    'cropDiagnoses'
  );

  const docRef = await addDoc(diagnosisCollection, {
    ...diagnosisData,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}
