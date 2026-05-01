"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { getStoredUserRole, loadCurrentUserByStoredEmail } from "@/lib/authRole";
import { Button } from "@/components/ui/button";
import { NAV_GROUPS, NAV_ITEMS } from "@/components/layout/nav-items";

interface MobileSidebarProps {
    open: boolean;
    onClose: () => void;
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
    const pathname = usePathname();
    const [role, setRole] = useState(getStoredUserRole());

    useEffect(() => {
        if (role) return;

        loadCurrentUserByStoredEmail()
            .then((user) => {
                if (user) setRole(user.role);
            })
            .catch((error) => {
                console.error("Failed to load role for mobile sidebar:", error);
            });
    }, [role]);

    const visibleItems = useMemo(() => {
        return NAV_ITEMS.filter((item) => {
            if (item.href === "/users") {
                return role === "SUPER_ADMIN";
            }

            return true;
        });
    }, [role]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />

            <aside className="absolute left-0 top-0 flex h-full w-80 max-w-[85vw] flex-col border-r border-sidebar-border bg-sidebar shadow-2xl">
                <div className="flex h-16 items-center border-b border-sidebar-border px-4">
                    <Link href="/home" onClick={onClose} className="flex min-w-0 items-center gap-3">
                        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-border">
                            <Image
                                src="/logo_aiu.png"
                                alt="Ala-Too International University"
                                width={44}
                                height={44}
                                className="h-11 w-11 object-contain"
                                priority
                            />
                        </div>

                        <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-sidebar-foreground">
                                Ala-Too Timetable
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                                Scheduling system
                            </div>
                        </div>
                    </Link>

                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={onClose}
                        className="ml-auto"
                        aria-label="Close navigation"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <nav className="custom-scrollbar flex-1 overflow-y-auto px-3 py-4">
                    <div className="space-y-6">
                        {NAV_GROUPS.map((group) => {
                            const items = visibleItems.filter((item) => item.group === group);

                            if (items.length === 0) return null;

                            return (
                                <div key={group}>
                                    <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        {group}
                                    </div>

                                    <div className="space-y-1">
                                        {items.map((item) => {
                                            const Icon = item.icon;
                                            const isActive =
                                                pathname === item.href ||
                                                (item.href !== "/home" &&
                                                    pathname.startsWith(item.href));

                                            return (
                                                <Link
                                                    key={`${item.group}-${item.title}`}
                                                    href={item.href}
                                                    onClick={onClose}
                                                    className={cn(
                                                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                                                        "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                                        isActive &&
                                                        "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm",
                                                    )}
                                                >
                                                    <Icon className="h-4 w-4 shrink-0" />
                                                    <span>{item.title}</span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </nav>
            </aside>
        </div>
    );
}