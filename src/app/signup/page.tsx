'use client';
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
} from 'firebase/auth';
import { useAuth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Logo from "@/components/logo";
import { useNotification } from '@/providers/notification-provider';
import React, { useState } from "react";
import { haptics } from "@/lib/haptics";
import { getUserDoc, isProfileComplete, setUserDoc } from '@/services/userService';
import { Loader2 } from 'lucide-react';

export default function SignupPage() {
  const auth = useAuth();
  const router = useRouter();
  const addNotification = useNotification();
  const [signingUp, setSigningUp] = useState(false);
  const [googleSigningUp, setGoogleSigningUp] = useState(false);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    haptics.heavy();
    setSigningUp(true);
    const form = e.currentTarget;
    const fullName = (form.elements.namedItem('full-name') as HTMLInputElement).value;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: fullName });

      // Save only minimal data — full profile will be collected on /complete-profile
      await setUserDoc(user.uid, {
        name: fullName,
        email: user.email || email,
        photoURL: user.photoURL || '',
      });

      // Always send new users to complete their profile
      router.replace('/complete-profile');
    } catch (error: any) {
      haptics.error();
      addNotification({
        type: "error",
        title: "Signup Failed",
        message: error.message,
      });
      setSigningUp(false);
    }
  };

  const handleGoogleSignup = async () => {
    haptics.heavy();
    setGoogleSigningUp(true);
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const user = result.user;

      // Check if doc already exists and is complete (returning Google user)
      const existingDoc = await getUserDoc(user.uid);
      if (isProfileComplete(existingDoc)) {
        router.replace('/dashboard');
        return;
      }

      // Save partial data from Google profile — rest collected on /complete-profile
      await setUserDoc(user.uid, {
        name: existingDoc?.name || user.displayName || '',
        email: existingDoc?.email || user.email || '',
        photoURL: existingDoc?.photoURL || user.photoURL || '',
      });

      router.replace('/complete-profile');
    } catch (error: any) {
      haptics.error();
      addNotification({
        type: "error",
        title: "Google Signup Failed",
        message: error.message,
      });
      setGoogleSigningUp(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="mx-auto grid w-full max-w-sm gap-6">
        <div className="grid gap-2 text-center">
          <Link href="#" className="flex justify-center">
            <Logo iconClassName="h-12 w-12" />
          </Link>
          <h1 className="text-3xl font-bold font-headline mt-4">Create an Account</h1>
          <p className="text-balance text-muted-foreground">
            Join Croplyze to protect your crops.
          </p>
        </div>
        <form onSubmit={handleSignup} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="full-name">Full Name</Label>
            <Input id="full-name" name="full-name" placeholder="John Doe" required className="h-12 text-base" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              name="email"
              placeholder="m@example.com"
              required
              className="h-12 text-base"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required className="h-12 text-base" />
          </div>
          <Button type="submit" className="w-full h-12 text-base" disabled={signingUp}>
            {signingUp ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating Account…</> : 'Create Account'}
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 text-base"
            type="button"
            onClick={handleGoogleSignup}
            disabled={googleSigningUp}
          >
            {googleSigningUp ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing up…</> : 'Sign up with Google'}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
