import { Suspense } from 'react';
import GrowthTimelineClient from './GrowthTimelineClient';

function LoadingFallback() {
    return (
        <div className="flex-1 flex items-center justify-center min-h-screen">
            <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
    );
}

export default function GrowthTimelinePage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <GrowthTimelineClient />
        </Suspense>
    );
}
