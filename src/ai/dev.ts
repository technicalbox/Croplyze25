'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/detect-crop-disease-flow.ts';
import '@/ai/flows/explain-ai-diagnosis-flow.ts';
import '@/ai/flows/generate-treatment-advice-flow.ts';
import '@/ai/flows/find-nearby-suppliers-flow.ts';
