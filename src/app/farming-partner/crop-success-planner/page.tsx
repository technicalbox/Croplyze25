'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser as useUserFromAuth } from '@/firebase/auth/use-user';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import PlannerForm from '@/components/crop-success-planner/planner-form';
import PlannerResults from '@/components/crop-success-planner/planner-results';
import type { CropSuccessPlan } from '@/farming-partner/crop-success-planner-service';

export default function CropSuccessPlannerPage() {
    const { user, loading } = useUserFromAuth();
    const router = useRouter();
    const [result, setResult] = useState<CropSuccessPlan | null>(null);

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-background">
            {/* Sticky header */}
            <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 backdrop-blur-sm px-4">
                <Button asChild variant="ghost" size="icon" className="shrink-0">
                    <Link href="/dashboard">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div className="min-w-0">
                    <h1 className="text-lg font-bold leading-tight truncate">Crop Success Planner</h1>
                    <p className="text-xs text-muted-foreground truncate">AI-powered suitability analysis</p>
                </div>
            </header>

            <main className="flex flex-col gap-6 p-4 pb-24">
                {result ? (
                    <PlannerResults
                        plan={result}
                        onReset={() => setResult(null)}
                    />
                ) : (
                    <PlannerForm
                        userId={user.uid}
                        onSuccess={(plan) => setResult(plan)}
                    />
                )}
            </main>
        </div>
    );
}
