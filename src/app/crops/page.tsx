import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAllCrops } from '@/services/crops-service';
import CropClientList from './crop-client-list';

// Revalidate occasionally, though it falls back to static seed if FS fails
export const revalidate = 3600;

export default async function CropsExplorerPage() {
    let initialCrops: any[] = [];
    try {
        initialCrops = await getAllCrops();
    } catch (e) {
        console.error('Failed to load crops for explorer:', e);
    }

    return (
        <div className="flex-1 bg-background flex flex-col min-h-screen pb-20">
            {/* Header */}
            <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 backdrop-blur-md px-4">
                <Button asChild variant="ghost" size="icon" className="shrink-0 group">
                    <Link href="/farming-partner">
                        <ArrowLeft className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </Link>
                </Button>
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-orange-500/10 shrink-0">
                        <BookOpen className="h-4 w-4 text-orange-500" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-base font-bold leading-tight truncate">Crop Intelligence</h1>
                        <p className="text-[11px] text-muted-foreground truncate uppercase tracking-wider font-semibold">
                            400+ Crops Available
                        </p>
                    </div>
                </div>
            </header>

            <main className="flex flex-col flex-1 p-4 gap-6">
                <Suspense fallback={<div className="animate-pulse h-12 w-full bg-muted rounded-2xl" />}>
                    <CropClientList initialCrops={initialCrops} />
                </Suspense>
            </main>
        </div>
    );
}
