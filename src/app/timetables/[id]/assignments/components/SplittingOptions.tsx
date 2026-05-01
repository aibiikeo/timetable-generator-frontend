"use client";

import { Input } from "@/components/ui/input";

export interface SplittingConfig {
    enabled: boolean;
    minPartHours: number;
    maxPartHours: number;
    allowDifferentDays: boolean;
}

interface SplittingOptionsProps {
    value: SplittingConfig;
    onChange: (value: SplittingConfig) => void;
}

export default function SplittingOptions({
                                             value,
                                             onChange,
                                         }: SplittingOptionsProps) {
    const update = <K extends keyof SplittingConfig>(
        key: K,
        nextValue: SplittingConfig[K],
    ) => {
        onChange({
            ...value,
            [key]: nextValue,
        });
    };

    return (
        <div className="rounded-2xl border border-border p-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h4 className="text-sm font-semibold">
                        Splitting options
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Split weekly hours into smaller lessons if needed.
                    </p>
                </div>

                <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={value.enabled}
                        onChange={(e) =>
                            update("enabled", e.target.checked)
                        }
                        className="h-4 w-4 rounded border-gray-300"
                    />
                    Enabled
                </label>
            </div>

            {value.enabled && (
                <div className="mt-4 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Minimum part hours
                            </label>

                            <Input
                                type="number"
                                min={1}
                                value={value.minPartHours}
                                onChange={(e) =>
                                    update(
                                        "minPartHours",
                                        Number(e.target.value),
                                    )
                                }
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Maximum part hours
                            </label>

                            <Input
                                type="number"
                                min={1}
                                value={value.maxPartHours}
                                onChange={(e) =>
                                    update(
                                        "maxPartHours",
                                        Number(e.target.value),
                                    )
                                }
                            />
                        </div>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                        <input
                            type="checkbox"
                            checked={value.allowDifferentDays}
                            onChange={(e) =>
                                update(
                                    "allowDifferentDays",
                                    e.target.checked,
                                )
                            }
                            className="h-4 w-4 rounded border-gray-300"
                        />
                        Allow parts on different days
                    </label>
                </div>
            )}
        </div>
    );
}