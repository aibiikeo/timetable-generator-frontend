"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Loader2, Lock, Mail } from "lucide-react";

import { api, userApi } from "@/lib";
import { setStoredUserRole } from "@/lib/authRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setError("");
        setLoading(true);

        try {
            const response = await api.login({
                email: email.trim(),
                password,
            });

            const { access_token, refresh_token } = response.data;

            if (!access_token || !refresh_token) {
                throw new Error("Tokens not found in response");
            }

            localStorage.setItem("userEmail", email.trim());

            try {
                const userId = await userApi.getUserIdByEmail(email.trim());
                const user = await userApi.getUser(userId);

                setStoredUserRole(user.role);
            } catch (roleError) {
                console.error("Failed to load user role:", roleError);
                setError("Login succeeded, but role could not be loaded");
                return;
            }

            router.push("/home");
        } catch (err: any) {
            console.warn("[Login failed]", err.response?.status);

            if (err.response?.status === 401) {
                setError("Invalid email or password");
                setPassword("");
                return;
            }

            if (err.response?.status === 400) {
                setError(err.response.data?.message || "Invalid request format");
                return;
            }

            if (err.code === "ERR_NETWORK") {
                setError("Cannot connect to server");
                return;
            }

            setError("Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center px-4 py-10">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.16),transparent_34rem),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.12),transparent_30rem)]" />

            <Card className="glass-card w-full max-w-md overflow-hidden">
                <CardHeader className="space-y-4 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
                        <CalendarDays className="h-7 w-7" />
                    </div>

                    <div>
                        <CardTitle className="text-2xl">
                            Timetable Generator
                        </CardTitle>
                        <CardDescription className="mt-2">
                            Sign in to manage university schedules.
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label
                                htmlFor="email"
                                className="mb-2 block text-sm font-medium"
                            >
                                Email
                            </label>

                            <div className="relative">
                                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                                <Input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@example.com"
                                    disabled={loading}
                                    required
                                    className="h-11 pl-10"
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="mb-2 block text-sm font-medium"
                            >
                                Password
                            </label>

                            <div className="relative">
                                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                                <Input
                                    id="password"
                                    type="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    disabled={loading}
                                    required
                                    className="h-11 pl-10"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="h-11 w-full" disabled={loading}>
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Sign in
                        </Button>

                        <div className="rounded-2xl border border-border bg-card/80 p-4 text-center text-xs text-muted-foreground">
                            <p className="font-medium text-foreground">Demo credentials</p>
                            <p className="mt-2 font-mono">superadmin@example.com / SuperSecret123</p>
                            <p className="mt-1 font-mono">admin@university.kg / SuperSecret456</p>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </main>
    );
}