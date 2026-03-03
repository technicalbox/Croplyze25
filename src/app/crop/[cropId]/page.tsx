import { Metadata } from 'next';
import { getCropById } from '@/services/crops-service';
import { notFound } from 'next/navigation';
import CropIntelligenceClient from './CropIntelligenceClient';

// Cache for a long time, but dynamic if needed
export const revalidate = 86400;

// Next.js 15: params is now a Promise
type PageProps = { params: Promise<{ cropId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { cropId } = await params;
    const crop = await getCropById(cropId);
    if (!crop) return { title: 'Crop Intelligence Not Found' };
    return { title: `${crop?.commonNames?.en ?? 'Crop'} Intelligence | Croplyze` };
}

export default async function CropDetailsPage({ params }: PageProps) {
    const { cropId } = await params;
    const crop = await getCropById(cropId);
    if (!crop) return notFound();

    return <CropIntelligenceClient crop={crop} />;
}
