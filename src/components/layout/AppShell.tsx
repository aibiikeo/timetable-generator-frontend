"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { HelpButton } from "@/components/layout/HelpButton";
import { cn } from "@/lib/utils";

interface AppShellProps {
    children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    useEffect(() => {
        const stored = window.localStorage.getItem("sidebar-collapsed");
        if (stored === "true") {
            setSidebarCollapsed(true);
        }
    }, []);

    const handleToggleSidebar = () => {
        setSidebarCollapsed((current) => {
            const next = !current;
            window.localStorage.setItem("sidebar-collapsed", String(next));
            return next;
        });
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-background text-foreground">
                <Sidebar collapsed={sidebarCollapsed} onToggle={handleToggleSidebar} />

                <MobileSidebar
                    open={mobileSidebarOpen}
                    onClose={() => setMobileSidebarOpen(false)}
                />

                <div
                    className={cn(
                        "transition-all duration-300",
                        sidebarCollapsed ? "lg:pl-20" : "lg:pl-72",
                    )}
                >
                    <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />

                    <main className="mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-8">
                        {children}
                    </main>
                </div>

                <HelpButton />
            </div>
        </ProtectedRoute>
    );
}