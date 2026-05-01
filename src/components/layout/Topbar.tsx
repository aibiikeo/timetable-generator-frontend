"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    LogOut,
    Menu,
    Search,
    ShieldCheck,
    UserCircle,
} from "lucide-react";

import { api, useAuth } from "@/lib";
import {
    clearStoredUserRole,
    getStoredUserEmail,
    getStoredUserRole,
    loadCurrentUserByStoredEmail,
} from "@/lib/authRole";
import type { UserRole } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TopbarProps {
    onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
    const router = useRouter();
    const { logout } = useAuth();

    const [email, setEmail] = useState<string | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);

    useEffect(() => {
        const loadUserInfo = async () => {
            const storedEmail = getStoredUserEmail();
            const storedRole = getStoredUserRole();

            setEmail(storedEmail);
            setRole(storedRole);

            if (storedEmail && !storedRole) {
                try {
                    const user = await loadCurrentUserByStoredEmail();

                    if (user) {
                        setEmail(user.email);
                        setRole(user.role);
                    }
                } catch (error) {
                    console.error("Failed to load current user in topbar:", error);
                }
            }
        };

        void loadUserInfo();
    }, []);

    const handleLogout = () => {
        logout();
        api.clearTokens?.();
        clearStoredUserRole();

        if (typeof window !== "undefined") {
            localStorage.removeItem("userEmail");
        }

        router.push("/login");
    };

    return (
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl lg:px-6">
            <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={onMenuClick}
                aria-label="Open navigation menu"
            >
                <Menu className="h-5 w-5" />
            </Button>

            <div className="hidden w-full max-w-md items-center gap-2 rounded-xl border border-input bg-card px-3 shadow-sm md:flex">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                    className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    placeholder="Search teacher, room, subject..."
                />
            </div>

            <div className="ml-auto flex items-center gap-3">
                <div className="hidden items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2 shadow-sm sm:flex">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                        <UserCircle className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                        <div className="max-w-[180px] truncate text-sm font-medium">
                            {email || "Unknown user"}
                        </div>

                        <div className="mt-0.5 flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />

                            {role ? (
                                <Badge
                                    variant={
                                        role === "SUPER_ADMIN"
                                            ? "warning"
                                            : "secondary"
                                    }
                                    className="px-2 py-0 text-[10px]"
                                >
                                    {role}
                                </Badge>
                            ) : (
                                <span className="text-xs text-muted-foreground">
                                    Loading role...
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 shadow-sm sm:hidden">
                    <UserCircle className="h-5 w-5 shrink-0 text-blue-700" />

                    <span className="max-w-[190px] truncate text-sm font-medium text-foreground sm:max-w-[260px]">
                        {email || "Unknown user"}
                    </span>

                    {role && (
                        <Badge
                            variant={
                                role === "SUPER_ADMIN"
                                    ? "warning"
                                    : "secondary"
                            }
                            className="shrink-0 px-2 py-0 text-[10px]"
                        >
                            {role}
                        </Badge>
                    )}
                </div>

                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleLogout}
                    aria-label="Logout"
                    title="Logout"
                >
                    <LogOut className="h-4 w-4" />
                </Button>
            </div>
        </header>
    );
}