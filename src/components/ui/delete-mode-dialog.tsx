"use client";

import { AlertTriangle, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { DeleteMode } from "@/lib/types";

interface DeleteModeOption {
    value: DeleteMode;
    title: string;
    description: string;
    tone: "safe" | "warning" | "danger";
}

const DELETE_MODE_OPTIONS: DeleteModeOption[] = [
    {
        value: "SIMPLE",
        title: "Simple delete",
        description: "Delete only if there are no dependent records. This is the safest option.",
        tone: "safe",
    },
    {
        value: "DETACH",
        title: "Detach dependencies",
        description: "Remove links from dependent records, then delete this item.",
        tone: "warning",
    },
    {
        value: "WITH",
        title: "Delete with dependencies",
        description: "Delete this item together with dependent records. Use carefully.",
        tone: "danger",
    },
];

interface DeleteModeDialogProps {
    open: boolean;
    title: string;
    description: string;
    entityName?: string;
    selectedMode: DeleteMode;
    loading?: boolean;
    showModeSelector?: boolean;
    onModeChange: (mode: DeleteMode) => void;
    onCancel: () => void;
    onConfirm: (mode: DeleteMode) => void | Promise<void>;
}

export function DeleteModeDialog({
                                     open,
                                     title,
                                     description,
                                     entityName,
                                     selectedMode,
                                     loading = false,
                                     showModeSelector = true,
                                     onModeChange,
                                     onCancel,
                                     onConfirm,
                                 }: DeleteModeDialogProps) {
    return (
        <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <div className="flex items-start gap-4 pr-6">
                        <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-red-700">
                            <AlertTriangle className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                            <DialogTitle>{title}</DialogTitle>
                            <DialogDescription className="mt-1">
                                {description}
                            </DialogDescription>

                            {entityName && (
                                <p className="mt-2 truncate text-sm font-medium text-foreground">
                                    {entityName}
                                </p>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                {showModeSelector ? (
                    <div className="grid gap-3">
                        {DELETE_MODE_OPTIONS.map((option) => {
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
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {option.description}
                                            </p>
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

                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                            Choose the weakest delete mode that solves the problem. Use dependency deletion only when you really want related records removed.
                        </div>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                        This action cannot be undone.
                    </div>
                )}

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
