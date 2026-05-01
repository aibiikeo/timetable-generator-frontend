"use client";

import {
    AlertTriangle,
    CheckCircle2,
    ClipboardList,
    X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GenerationResponse } from "@/lib/types";

interface GenerationResultModalProps {
    result: GenerationResponse;
    onClose: () => void;
    onManualPlace: (assignmentId: number) => void;
}

type FailedItem = {
    assignmentId?: number;
    id?: number;
    subjectName?: string;
    teacherName?: string;
    groupNames?: string[];
    reason?: string;
    message?: string;
};

function getFailedItems(result: GenerationResponse): FailedItem[] {
    const raw = result as unknown as {
        failedAssignments?: FailedItem[];
        failedItems?: FailedItem[];
        failures?: FailedItem[];
        unplacedAssignments?: FailedItem[];
    };

    return (
        raw.failedAssignments ||
        raw.failedItems ||
        raw.failures ||
        raw.unplacedAssignments ||
        []
    );
}

export default function GenerationResultModal({
                                                  result,
                                                  onClose,
                                                  onManualPlace,
                                              }: GenerationResultModalProps) {
    const failedItems = getFailedItems(result);

    const placedLessonsCount =
        (result as unknown as { placedLessonsCount?: number }).placedLessonsCount ?? 0;

    const failedVerticesCount =
        (result as unknown as { failedVerticesCount?: number }).failedVerticesCount ?? 0;

    const totalProcessed = placedLessonsCount + failedVerticesCount;
    const successRate =
        totalProcessed > 0
            ? Math.round((placedLessonsCount / totalProcessed) * 100)
            : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="glass-card custom-scrollbar max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold">
                            Generation Result
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Review generated lessons and assignments that need manual placement.
                        </p>
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <section className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-medium text-emerald-800">
                                Placed
                            </div>
                            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                        </div>

                        <div className="mt-3 text-3xl font-bold text-emerald-900">
                            {placedLessonsCount}
                        </div>

                        <p className="mt-1 text-xs text-emerald-700">
                            Lessons successfully scheduled
                        </p>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-medium text-amber-800">
                                Failed
                            </div>
                            <AlertTriangle className="h-5 w-5 text-amber-700" />
                        </div>

                        <div className="mt-3 text-3xl font-bold text-amber-900">
                            {failedVerticesCount}
                        </div>

                        <p className="mt-1 text-xs text-amber-700">
                            Need manual review
                        </p>
                    </div>

                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-medium text-blue-800">
                                Success rate
                            </div>
                            <ClipboardList className="h-5 w-5 text-blue-700" />
                        </div>

                        <div className="mt-3 text-3xl font-bold text-blue-900">
                            {successRate}%
                        </div>

                        <p className="mt-1 text-xs text-blue-700">
                            Based on processed items
                        </p>
                    </div>
                </section>

                <section className="mt-6">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold">
                            Manual placement queue
                        </h4>

                        <Badge
                            variant={
                                failedItems.length > 0
                                    ? "warning"
                                    : "success"
                            }
                        >
                            {failedItems.length} item(s)
                        </Badge>
                    </div>

                    {failedItems.length === 0 ? (
                        <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
                            No failed assignments. The generation result looks clean.
                        </div>
                    ) : (
                        <div className="custom-scrollbar max-h-80 overflow-y-auto rounded-2xl border border-border">
                            {failedItems.map((item, index) => {
                                const assignmentId =
                                    item.assignmentId || item.id || 0;

                                return (
                                    <div
                                        key={`${assignmentId}-${index}`}
                                        className="flex flex-col gap-3 border-b border-border p-4 last:border-b-0 md:flex-row md:items-center md:justify-between"
                                    >
                                        <div>
                                            <div className="font-medium">
                                                {item.subjectName ||
                                                    `Assignment #${assignmentId || index + 1}`}
                                            </div>

                                            <div className="mt-1 text-sm text-muted-foreground">
                                                {item.teacherName || "No teacher info"}
                                                {item.groupNames?.length
                                                    ? ` · ${item.groupNames.join(", ")}`
                                                    : ""}
                                            </div>

                                            {(item.reason || item.message) && (
                                                <div className="mt-2 text-xs text-amber-700">
                                                    {item.reason || item.message}
                                                </div>
                                            )}
                                        </div>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={!assignmentId}
                                            onClick={() => onManualPlace(assignmentId)}
                                        >
                                            Place manually
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                <div className="mt-6 flex justify-end">
                    <Button type="button" onClick={onClose}>
                        Done
                    </Button>
                </div>
            </div>
        </div>
    );
}