// src/app/components/ProtectedRoute.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const router = useRouter();
    const authChecked = useRef(false);

    useEffect(() => {
        // Проверяем авторизацию только один раз
        if (!authChecked.current) {
            const token = api.getAccessToken();

            if (!token) {
                console.log('[Auth] No token found, redirecting to login');
                router.push('/login');
                return;
            }

            console.log('[Auth] Token found, access granted');
            authChecked.current = true;
        }
    }, [router]);

    return <>{children}</>;
}