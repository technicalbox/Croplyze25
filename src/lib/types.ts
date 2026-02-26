import type { Timestamp } from 'firebase/firestore';
import type { DetectCropDiseaseOutput } from '@/ai/flows/detect-crop-disease-flow';
import { GenerateTreatmentAdviceOutput } from '@/ai/flows/generate-treatment-advice-flow';

export type Diagnosis = {
  id: string;
  userId: string;
  cropType: string;
  image: string; // data URI
  diagnosis: DetectCropDiseaseOutput;
  treatment?: GenerateTreatmentAdviceOutput;
  createdAt: Timestamp;
};
