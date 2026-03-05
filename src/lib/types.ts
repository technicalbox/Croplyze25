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

export type UserDocument = {
  uid: string;
  name: string;
  phone: string;
  email: string;
  farmName?: string;
  state: string;
  primaryCrop?: string;
  landArea?: string;
  soilType?: string;
  language: string;
  photoURL?: string;
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
};
