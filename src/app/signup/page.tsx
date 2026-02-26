'use client';
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Logo from "@/components/logo";
import { useNotification } from '@/providers/notification-provider';
import React from "react";
import { haptics } from "@/lib/haptics";

export default function SignupPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const addNotification = useNotification();

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    haptics.heavy();
    const form = e.currentTarget;
    const fullName = (form.elements.namedItem('full-name') as HTMLInputElement).value;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName: fullName });

      await setDoc(doc(firestore, 'users', user.uid), {
        id: user.uid,
        displayName: fullName,
        email: user.email,
        photoURL: user.photoURL,
      });

      router.push('/dashboard');
    } catch (error: any) {
      haptics.error();
      addNotification({
        type: "error",
        title: "Signup Failed",
        message: error.message,
      });
    }
  };

  const handleGoogleSignup = async () => {
    haptics.heavy();
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const user = result.user;
      
      await setDoc(doc(firestore, 'users', user.uid), {
        id: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      }, { merge: true });

      router.push('/dashboard');
    } catch (error: any) {
      haptics.error();
      addNotification({
        type: "error",
        title: "Google Signup Failed",
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
            <Button type="submit" className="w-full h-12 text-base">
              Create Account
            </Button>
            <Button variant="outline" className="w-full h-12 text-base" type="button" onClick={handleGoogleSignup}>
              Sign up with Google
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
