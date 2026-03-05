'use client';
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth } from "@/firebase/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Logo from "@/components/logo";
import { useNotification } from '@/providers/notification-provider';
import React, { useState } from "react";
import { haptics } from '@/lib/haptics';
import { Checkbox } from "@/components/ui/checkbox";
import { getUserDoc, isProfileComplete } from '@/services/userService';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const addNotification = useNotification();
  const [loggingIn, setLoggingIn] = useState(false);
  const [googleLoggingIn, setGoogleLoggingIn] = useState(false);

  /**
   * After auth succeeds, check whether the user has a complete profile.
   * If yes → dashboard.  If not → complete-profile.
   */
  const redirectAfterAuth = async (uid: string) => {
    try {
      const doc = await getUserDoc(uid);
      if (isProfileComplete(doc)) {
        router.replace('/dashboard');
      } else {
        router.replace('/complete-profile');
      }
    } catch {
      // If the check fails, default to complete-profile to be safe
      router.replace('/complete-profile');
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    haptics.heavy();
    setLoggingIn(true);
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await redirectAfterAuth(cred.user.uid);
    } catch (error: any) {
      haptics.error();
      addNotification({
        type: "error",
        title: "Login Failed",
        message: error.message,
      });
      setLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    haptics.heavy();
    setGoogleLoggingIn(true);
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      await redirectAfterAuth(result.user.uid);
    } catch (error: any) {
      haptics.error();
      addNotification({
        type: "error",
        title: "Google Login Failed",
        message: error.message,
      });
      setGoogleLoggingIn(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="mx-auto grid w-full max-w-sm gap-6">
        <div className="grid gap-2 text-center">
          <Link href="#" className="flex justify-center">
            <Logo iconClassName="h-12 w-12" />
          </Link>
          <h1 className="text-3xl font-bold font-headline mt-4">Welcome Back</h1>
          <p className="text-balance text-muted-foreground">
            Login to your Croplyze account.
          </p>
        </div>
        <form onSubmit={handleLogin} className="grid gap-4">
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
            <div className="flex items-center">
              <Label htmlFor="password">Password</Label>
              <Link
                href="#"
                className="ml-auto inline-block text-sm underline"
              >
                Forgot your password?
              </Link>
            </div>
            <Input id="password" name="password" type="password" required className="h-12 text-base" />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="rememberMe" name="rememberMe" />
            <label
              htmlFor="rememberMe"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Remember me
            </label>
          </div>
          <Button type="submit" className="w-full h-12 text-base" disabled={loggingIn}>
            {loggingIn ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Logging in…</> : 'Login'}
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 text-base"
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoggingIn}
          >
            {googleLoggingIn ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in…</> : 'Login with Google'}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
