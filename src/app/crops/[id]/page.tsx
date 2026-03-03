import { Metadata } from 'next';
import { getCropById } from '@/services/crops-service';
import { notFound } from 'next/navigation';
import CropClientDetail from './CropClientDetail';

// Next.js 15: params is now a Promise
type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const crop = await getCropById(id);
    if (!crop) return { title: 'Crop Not Found' };
    return { title: `${crop?.commonNames?.en ?? 'Crop'} | Crop Intelligence` };
}

export default async function CropDetailsPage({ params }: PageProps) {
    const { id } = await params;
    const crop = await getCropById(id);
    if (!crop) return notFound();

    return <CropClientDetail crop={crop} />;
}
