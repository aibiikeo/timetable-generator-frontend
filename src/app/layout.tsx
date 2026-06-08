import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { SearchProvider } from "@/components/layout/SearchContext";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
});

export const metadata: Metadata = {
    title: "AIU Timetable Scheduling System",
    description: "University timetable scheduling system",
    icons: {
        icon: "/logo_aiu.png",
    },
};

export default function RootLayout({
                                       children,
                                   }: {
    children: ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
        <body className={`${inter.className} bg-background text-foreground antialiased`}>
        <SearchProvider>{children}</SearchProvider>
        <Toaster />
        </body>
        </html>
    );
}
