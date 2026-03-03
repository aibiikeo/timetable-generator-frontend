'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib';

export default function HomePage() {
    const router = useRouter();

    useEffect(() => {
        const token = api.getAccessToken();

        if (token) {
            console.log('[Redirect] User authenticated, redirecting to home');
            router.push('/home');
        } else {
            console.log('[Redirect] No authentication, redirecting to login');
            router.push('/login');
        }
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Redirecting...</p>
            </div>
        </div>
    );
}