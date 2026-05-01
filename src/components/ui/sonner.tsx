"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
    return (
        <SonnerToaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
                classNames: {
                    toast:
                        "rounded-xl border border-border bg-card text-card-foreground shadow-xl",
                    title: "text-sm font-semibold",
                    description: "text-sm text-muted-foreground",
                },
            }}
        />
    );
}