"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Database, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { DeleteMode } from "@/lib/types";

interface DeleteModeOption {
    value: DeleteMode;
    title: string;
    tone: "safe" | "warning" | "danger";
}

const DELETE_MODE_OPTIONS: DeleteModeOption[] = [
    {
        value: "SIMPLE",
        title: "Simple delete",
        tone: "safe",
    },
    {
        value: "DETACH",
        title: "Detach dependencies",
        tone: "warning",
    },
    {
        value: "WITH",
        title: "Delete with dependencies",
        tone: "danger",
    },
];

interface DeleteModeDialogProps {
    open: boolean;
    title: string;
    description: string;
    entityName?: string;
    dependencyGroups?: {
        label: string;
        items: string[];
    }[];
    selectedMode: DeleteMode;
    availableModes?: DeleteMode[];
    loading?: boolean;
    showModeSelector?: boolean;
    onModeChange: (mode: DeleteMode) => void;
    onCancel: () => void;
    onConfirm: (mode: DeleteMode) => void | Promise<void>;
}

export function DeleteModeDialog({
                                     open,
                                     title,
                                     entityName,
                                     dependencyGroups = [],
                                     selectedMode,
                                     availableModes,
                                     loading = false,
                                     showModeSelector = true,
                                     onModeChange,
                                     onCancel,
                                     onConfirm,
                                 }: DeleteModeDialogProps) {
    const [selectedDependencyGroup, setSelectedDependencyGroup] = useState<string | null>(null);
    const dependencyCount = dependencyGroups.reduce(
        (total, group) => total + group.items.length,
        0,
    );
    const selectedGroup = dependencyGroups.find(
        (group) => group.label === selectedDependencyGroup,
    );
    const modeOptions = availableModes
        ? DELETE_MODE_OPTIONS.filter((option) => availableModes.includes(option.value))
        : DELETE_MODE_OPTIONS;

    useEffect(() => {
        setSelectedDependencyGroup(null);
    }, [open, entityName]);

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
            <DialogContent className="max-h-[calc(100vh-2rem)] max-w-xl overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-start gap-4 pr-6">
                        <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-red-700">
                            <AlertTriangle className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                            <DialogTitle>{title}</DialogTitle>

                            {entityName && (
                                <p className="mt-2 truncate text-sm font-medium text-foreground">
                                    {entityName}
                                </p>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                {dependencyGroups.length > 0 && (
                    <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 text-sm text-amber-950">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                                <span className="rounded-lg border border-amber-200 bg-white/70 p-1.5 text-amber-700">
                                    <Database className="h-4 w-4" />
                                </span>
                                <div className="min-w-0">
                                    <div className="font-medium leading-tight">Related records found</div>
                                    <div className="mt-0.5 text-xs text-amber-800">
                                        Review what will be affected by this delete mode.
                                    </div>
                                </div>
                            </div>

                            <Badge variant="warning" className="shrink-0">
                                {dependencyCount} total
                            </Badge>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {dependencyGroups.map((group) => (
                                <button
                                    type="button"
                                    key={group.label}
                                    className="rounded-full border border-amber-200 bg-white/60 px-2 py-0.5 text-xs font-medium text-amber-900"
                                    onClick={() =>
                                        setSelectedDependencyGroup((current) =>
                                            current === group.label ? null : group.label,
                                        )
                                    }
                                >
                                    {`${group.label}: ${group.items.length}`}
                                </button>
                            ))}
                        </div>

                        {selectedGroup && (
                            <div className="mt-3 max-h-44 overflow-y-auto rounded-lg border border-amber-200/70 bg-white/55 p-3">
                                <div className="text-xs font-semibold uppercase text-amber-800">
                                    {selectedGroup.label}
                                </div>
                                <ul className="mt-1.5 space-y-1 text-amber-950">
                                    {selectedGroup.items.map((item) => (
                                        <li key={item} className="truncate text-xs" title={item}>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {showModeSelector ? (
                    <div className="grid gap-3">
                        {modeOptions.map((option) => {
                            const selected = selectedMode === option.value;

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => onModeChange(option.value)}
                                    disabled={loading}
                                    className={[
                                        "rounded-2xl border p-4 text-left transition",
                                        selected
                                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                            : "border-border bg-card hover:bg-accent/60",
                                    ].join(" ")}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="font-medium">{option.title}</div>
                                        </div>

                                        <Badge
                                            variant={
                                                option.tone === "danger"
                                                    ? "destructive"
                                                    : option.tone === "warning"
                                                        ? "warning"
                                                        : "secondary"
                                            }
                                        >
                                            {option.value}
                                        </Badge>
                                    </div>
                                </button>
                            );
                        })}

                    </div>
                ) : null}

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={() => onConfirm(selectedMode)}
                        disabled={loading}
                    >
                        <Trash2 className="h-4 w-4" />
                        {loading ? "Deleting..." : "Delete"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
