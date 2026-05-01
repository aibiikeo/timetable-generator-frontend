"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const router = useRouter();
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        const token = api.getAccessToken();

        if (!token) {
            router.replace("/login");
            return;
        }

        setChecked(true);
    }, [router]);

    if (!checked) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="glass-card rounded-2xl p-8 text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="mt-4 text-sm text-muted-foreground">
                        Checking session...
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}