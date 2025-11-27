'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { syncUserAction } from '@/actions/auth';
import AuthLayout from '@/components/AuthLayout';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const syncUser = async (token: string) => {
        try {
            const result = await syncUserAction(token);

            if (!result.success) {
                throw new Error(result.error || 'Failed to sync user');
            }

            router.push('/dashboard');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to sync user data');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const token = await userCredential.user.getIdToken();
            await syncUser(token);
        } catch (err: any) {
            setError(err.message || 'Failed to login');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError('');
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const token = await result.user.getIdToken();
            await syncUser(token);
        } catch (err: any) {
            setError(err.message || 'Failed to login with Google');
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Welcome Back"
            subtitle="Please enter your details to sign in"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg">
                        {error}
                    </div>
                )}

                <Input
                    label="Email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <div className="space-y-1">
                    <Input
                        label="Password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <div className="flex justify-end">
                        <Link
                            href="/forgot-password"
                            className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
                        >
                            Forgot password?
                        </Link>
                    </div>
                </div>

                <Button type="submit" isLoading={isLoading}>
                    Sign in
                </Button>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">Or continue with</span>
                    </div>
                </div>

                <Button type="button" variant="outline" onClick={handleGoogleLogin} disabled={isLoading}>
                    Google
                </Button>

                <p className="text-center text-sm text-gray-600 mt-8">
                    Don't have an account?{' '}
                    <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
                        Sign up for free
                    </Link>
                </p>
            </form>
        </AuthLayout>
    );
}
