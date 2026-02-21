import { Timestamp } from 'firebase/firestore';
import type { DetectCropDiseaseOutput } from './ai/flows/detect-crop-disease-flow';

export type Diagnosis = {
  id: string;
  userId: string;
  cropType: string;
  image: string; // data URI
  diagnosis: DetectCropDiseaseOutput;
  createdAt: Timestamp;
};

// Mock data is no longer needed and will be replaced by Firestore data.
export const pastDiagnoses: Diagnosis[] = [];

export const getDiagnosisById = (id: string) => null;

export const fullDiagnosisReport = {};
