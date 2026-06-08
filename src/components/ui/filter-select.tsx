"use client";

import { cn } from "@/lib/utils";

interface FilterSelectProps {
    value: string;
    onChange: (value: string) => void;
    children: React.ReactNode;
    className?: string;
    ariaLabel: string;
}

export function FilterSelect({
    value,
    onChange,
    children,
    className,
    ariaLabel,
}: FilterSelectProps) {
    return (
        <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-label={ariaLabel}
            className={cn(
                "h-11 w-full rounded-xl border border-input bg-card px-4 text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                className,
            )}
        >
            {children}
        </select>
    );
}
