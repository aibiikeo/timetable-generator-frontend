"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { getStoredUserRole, loadCurrentUserByStoredEmail } from "@/lib/authRole";
import { Button } from "@/components/ui/button";
import { NAV_GROUPS, NAV_ITEMS } from "@/components/layout/nav-items";

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
    className?: string;
}

export function Sidebar({ collapsed, onToggle, className }: SidebarProps) {
    const pathname = usePathname();
    const [role, setRole] = useState(getStoredUserRole());

    useEffect(() => {
        if (role) return;

        loadCurrentUserByStoredEmail()
            .then((user) => {
                if (user) setRole(user.role);
            })
            .catch((error) => {
                console.error("Failed to load role for sidebar:", error);
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

    return (
        <aside
            className={cn(
                "hidden h-screen shrink-0 border-r border-sidebar-border bg-sidebar/95 backdrop-blur-xl transition-all duration-300 lg:fixed lg:left-0 lg:top-0 lg:flex lg:flex-col",
                collapsed ? "w-20" : "w-72",
                className,
            )}
        >
            <div className="flex h-16 items-center border-b border-sidebar-border px-4">
                <Link
                    href="/home"
                    className={cn(
                        "flex min-w-0 items-center gap-3",
                        collapsed && "justify-center",
                    )}
                >
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

                    {!collapsed && (
                        <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-sidebar-foreground">
                                Ala-Too Timetable
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                                Scheduling system
                            </div>
                        </div>
                    )}
                </Link>

                {!collapsed && (
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={onToggle}
                        className="ml-auto"
                        aria-label="Collapse sidebar"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                )}

                {collapsed && (
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={onToggle}
                        className="absolute -right-4 top-5 h-8 w-8 rounded-full border border-border bg-card shadow-md"
                        aria-label="Expand sidebar"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                )}
            </div>

            <nav className="custom-scrollbar flex-1 overflow-y-auto px-3 py-4">
                <div className="space-y-6">
                    {NAV_GROUPS.map((group) => {
                        const items = visibleItems.filter((item) => item.group === group);

                        if (items.length === 0) return null;

                        return (
                            <div key={group}>
                                {!collapsed && (
                                    <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        {group}
                                    </div>
                                )}

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
                                                title={collapsed ? item.title : undefined}
                                                className={cn(
                                                    "flex items-center rounded-xl text-sm font-medium transition-all",
                                                    collapsed
                                                        ? "justify-center px-0 py-3"
                                                        : "gap-3 px-3 py-2.5",
                                                    "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                                    isActive &&
                                                    "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm",
                                                )}
                                            >
                                                <Icon className="h-4 w-4 shrink-0" />
                                                {!collapsed && <span>{item.title}</span>}
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
    );
}