import type { ReactNode } from "react";

interface PageHeaderProps {
    title: string;
    description?: string;
    eyebrow?: string;
    actions?: ReactNode;
}

export function PageHeader({
                               title,
                               description,
                               eyebrow,
                               actions,
                           }: PageHeaderProps) {
    return (
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
                {eyebrow && (
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
                        {eyebrow}
                    </div>
                )}

                <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                    {title}
                </h1>

                {description && (
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>

            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}