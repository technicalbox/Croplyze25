'use client';
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  signInWithRedirect,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth } from "@/firebase/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Logo from "@/components/logo";
import { useNotification } from '@/providers/notification-provider';
import React from "react";
import { haptics } from '@/lib/haptics';
import { Checkbox } from "@/components/ui/checkbox";

export default function LoginPage() {
  const router = useRouter();
  const addNotification = useNotification();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    haptics.heavy();
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/dashboard');
    } catch (error: any) {
      haptics.error();
      addNotification({
        type: "error",
        title: "Login Failed",
        message: error.message,
      });
    }
  };

  const handleGoogleLogin = async () => {
    haptics.heavy();
    try {
      await signInWithRedirect(auth, new GoogleAuthProvider());
      router.replace('/dashboard');
    } catch (error: any) {
      haptics.error();
      addNotification({
        type: "error",
        title: "Google Login Failed",
        message: error.message,
      });
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
          <Button type="submit" className="w-full h-12 text-base">
            Login
          </Button>
          <Button variant="outline" className="w-full h-12 text-base" type="button" onClick={handleGoogleLogin}>
            Login with Google
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
