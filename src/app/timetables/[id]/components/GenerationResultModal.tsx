"use client";

import {
    AlertTriangle,
    CheckCircle2,
    ClipboardList,
    Loader2,
    RotateCcw,
    Square,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { getAssignmentLessonStats } from "@/lib";
import type { AssignmentResponse, GenerationResponse } from "@/lib/types";

interface GenerationResultModalProps {
    result: GenerationResponse;
    assignments?: AssignmentResponse[];
    retrying?: boolean;
    onClose: () => void;
    onManualPlace: (assignmentId: number) => void;
    onRetryFailed?: () => void;
    onStopRetry?: () => void;
}

interface FailedItem {
    assignmentId?: number;
    id?: number;
    subjectName?: string;
    teacherName?: string;
    groupNames?: string[];
    reason?: string;
    message?: string;
}

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
                                                  assignments = [],
                                                  retrying = false,
                                                  onClose,
                                                  onManualPlace,
                                                  onRetryFailed,
                                                  onStopRetry,
                                              }: GenerationResultModalProps) {
    const failedItems = getFailedItems(result);

    const placedLessonsCount =
        (result as unknown as { placedLessonsCount?: number }).placedLessonsCount ?? 0;

    const fallbackUnscheduledLessons =
        (result as unknown as { failedVerticesCount?: number }).failedVerticesCount ?? 0;

    const assignmentSummary = getAssignmentLessonStats(assignments);
    const scheduledLessons =
        assignmentSummary.requiredLessons > 0
            ? assignmentSummary.placedLessons
            : placedLessonsCount;
    const unscheduledLessons =
        assignmentSummary.requiredLessons > 0
            ? assignmentSummary.unplacedLessons
            : fallbackUnscheduledLessons;
    const totalLessons =
        assignmentSummary.requiredLessons || scheduledLessons + unscheduledLessons;
    const completionRate =
        totalLessons > 0
            ? Math.round((scheduledLessons / totalLessons) * 100)
            : 0;

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="custom-scrollbar max-h-[90vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                    <div>
                        <DialogTitle>
                            Timetable generation summary
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <section className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-medium text-emerald-800">
                                Scheduled lessons
                            </div>
                            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                        </div>

                        <div className="mt-3 text-3xl font-bold text-emerald-900">
                            {scheduledLessons}
                        </div>

                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-medium text-amber-800">
                                Unscheduled lessons
                            </div>
                            <AlertTriangle className="h-5 w-5 text-amber-700" />
                        </div>

                        <div className="mt-3 text-3xl font-bold text-amber-900">
                            {unscheduledLessons}
                        </div>

                    </div>

                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-medium text-blue-800">
                                Timetable ready
                            </div>
                            <ClipboardList className="h-5 w-5 text-blue-700" />
                        </div>

                        <div className="mt-3 text-3xl font-bold text-blue-900">
                            {completionRate}%
                        </div>

                    </div>
                </section>

                <section className="mt-6">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold">
                            Needs manual placement
                        </h4>

                        <Badge
                            variant={
                                failedItems.length > 0
                                    ? "warning"
                                    : "success"
                            }
                        >
                            {failedItems.length} assignment(s)
                        </Badge>
                    </div>

                    {failedItems.length === 0 ? (
                        <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
                            No assignments need manual placement right now.
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
                                                    ? ` - ${item.groupNames.join(", ")}`
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

                <DialogFooter>
                    {failedItems.length > 0 && onRetryFailed && (
                        retrying ? (
                            <Button type="button" variant="outline" onClick={onStopRetry}>
                                <Square className="h-4 w-4" />
                                Stop
                            </Button>
                        ) : (
                            <Button type="button" variant="outline" onClick={onRetryFailed}>
                                <RotateCcw className="h-4 w-4" />
                                Retry failed
                            </Button>
                        )
                    )}
                    <Button type="button" onClick={onClose}>
                        {retrying && <Loader2 className="h-4 w-4 animate-spin" />}
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
