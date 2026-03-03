'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { getUserDoc, isProfileComplete } from '@/services/userService';
import ProfileForm from '@/components/profile/profile-form';
import Logo from '@/components/logo';
import { Loader2 } from 'lucide-react';

export default function CompleteProfilePage() {
    const { user, loading: userLoading } = useUser();
    const router = useRouter();
    const [checking, setChecking] = useState(true);
    const [existingData, setExistingData] = useState<any>(null);

    useEffect(() => {
        if (userLoading) return;

        // Not authenticated → go to login
        if (!user) {
            router.replace('/login');
            return;
        }

        // Check if profile is already complete → skip straight to dashboard
        (async () => {
            try {
                const doc = await getUserDoc(user.uid);
                if (isProfileComplete(doc)) {
                    router.replace('/dashboard');
                    return;
                }
                // Pre-fill with whatever partial data we have
                setExistingData({
                    name: doc?.name || user.displayName || '',
                    email: doc?.email || user.email || '',
                    phone: doc?.phone || '',
                    farmName: doc?.farmName || '',
                    state: doc?.state || '',
                    primaryCrop: doc?.primaryCrop || '',
                    landArea: doc?.landArea || '',
                    soilType: doc?.soilType || '',
                    language: doc?.language || 'en',
                    photoURL: doc?.photoURL || user.photoURL || '',
                });
            } catch {
                // If fetch fails, still let user fill in the form
                setExistingData({
                    name: user.displayName || '',
                    email: user.email || '',
                    phone: '',
                    farmName: '',
                    state: '',
                    primaryCrop: '',
                    landArea: '',
                    soilType: '',
                    language: 'en',
                    photoURL: user.photoURL || '',
                });
            } finally {
                setChecking(false);
            }
        })();
    }, [user, userLoading, router]);

    if (userLoading || checking) {
        return (
            <div className="flex-1 bg-background flex items-center justify-center min-h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) return null; // redirect is happening

    return (
        <div className="w-full min-h-screen flex flex-col items-center bg-background p-4 py-8">
            <div className="mx-auto w-full max-w-md space-y-6">
                {/* ── Header ── */}
                <div className="text-center space-y-2">
                    <div className="flex justify-center">
                        <Logo iconClassName="h-12 w-12" />
                    </div>
                    <h1 className="text-2xl font-bold font-headline mt-4">
                        Complete Your Profile
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Tell us a bit more about yourself and your farm so we can personalise
                        your experience.
                    </p>
                </div>

                {/* ── Form ── */}
                {existingData && (
                    <ProfileForm
                        uid={user.uid}
                        defaultValues={existingData}
                        submitLabel="Continue to Dashboard"
                        onSuccess={() => router.replace('/dashboard')}
                    />
                )}
            </div>
        </div>
    );
}
