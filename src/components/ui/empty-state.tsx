import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
    title: string;
    description?: string;
    icon?: ReactNode;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export function EmptyState({
                               title,
                               description,
                               icon,
                               actionLabel,
                               onAction,
                               className,
                           }: EmptyStateProps) {
    return (
        <div
            className={cn(
                "flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/70 p-10 text-center",
                className,
            )}
        >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                {icon ?? <Inbox className="h-7 w-7" />}
            </div>

            <h3 className="text-base font-semibold text-foreground">{title}</h3>

            {description && (
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    {description}
                </p>
            )}

            {actionLabel && onAction && (
                <Button className="mt-6" onClick={onAction}>
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}