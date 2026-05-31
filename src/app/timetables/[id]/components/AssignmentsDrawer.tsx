"use client";

import { useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    Edit,
    Search,
    Trash2,
    X,
    Plus,
    MapPin,
    Loader2,
    RotateCcw,
    Square,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AssignmentResponse } from "@/lib/types";

type AssignmentFilter = "ALL" | "SCHEDULED" | "PARTIAL" | "UNPLACED";

interface AssignmentsDrawerProps {
    open: boolean;
    assignments: AssignmentResponse[];
    onClose: () => void;
    onCreateAssignment?: () => void;
    onEditAssignment?: (assignment: AssignmentResponse) => void;
    onDeleteAssignment?: (assignment: AssignmentResponse) => void;
    onManualPlace?: (assignment: AssignmentResponse) => void;
    initialFilter?: AssignmentFilter;
    retrying?: boolean;
    onRetryFailed?: (assignments: AssignmentResponse[]) => void;
    onStopRetry?: () => void;
}

function normalizePlacementStatus(status?: string | null): AssignmentFilter {
    const normalized = String(status || "").toUpperCase();

    if (
        normalized === "SCHEDULED" ||
        normalized === "PLACED" ||
        normalized === "FULLY_SCHEDULED" ||
        normalized === "COMPLETE"
    ) {
        return "SCHEDULED";
    }

    if (
        normalized === "PARTIAL" ||
        normalized === "PARTIALLY_SCHEDULED" ||
        normalized === "PARTIALLY_PLACED"
    ) {
        return "PARTIAL";
    }

    if (
        normalized === "UNPLACED" ||
        normalized === "FAILED" ||
        normalized === "MANUAL_REQUIRED" ||
        normalized === "UNSCHEDULED" ||
        normalized === "PENDING"
    ) {
        return "UNPLACED";
    }

    return "PARTIAL";
}

function getStatusBadgeVariant(status: AssignmentFilter) {
    if (status === "SCHEDULED") return "success";
    if (status === "UNPLACED") return "destructive";
    if (status === "PARTIAL") return "warning";

    return "secondary";
}

function getStatusLabel(status: AssignmentFilter) {
    if (status === "SCHEDULED") return "Scheduled";
    if (status === "PARTIAL") return "Partial";
    if (status === "UNPLACED") return "Unplaced";

    return "All";
}

export default function AssignmentsDrawer({
                                              open,
                                              assignments,
                                              onClose,
                                              onCreateAssignment,
                                              onEditAssignment,
                                              onDeleteAssignment,
                                              onManualPlace,
                                              initialFilter = "ALL",
                                              retrying = false,
                                              onRetryFailed,
                                              onStopRetry,
                                          }: AssignmentsDrawerProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState<AssignmentFilter>("ALL");

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open, onClose]);

    useEffect(() => {
        if (!open) {
            setSearchQuery("");
            setFilter("ALL");
        } else {
            setFilter(initialFilter);
        }
    }, [initialFilter, open]);

    const summary = useMemo(() => {
        return assignments.reduce(
            (acc, assignment) => {
                const status = normalizePlacementStatus(
                    assignment.placementStatus,
                );

                acc.total += 1;

                if (status === "SCHEDULED") {
                    acc.scheduled += 1;
                } else if (status === "PARTIAL") {
                    acc.partial += 1;
                } else if (status === "UNPLACED") {
                    acc.unplaced += 1;
                }

                return acc;
            },
            {
                total: 0,
                scheduled: 0,
                partial: 0,
                unplaced: 0,
            },
        );
    }, [assignments]);

    const filteredAssignments = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return assignments.filter((assignment) => {
            const status = normalizePlacementStatus(
                assignment.placementStatus,
            );

            if (filter !== "ALL" && status !== filter) {
                return false;
            }

            if (!query) return true;

            return (
                assignment.subjectName.toLowerCase().includes(query) ||
                assignment.teacherName.toLowerCase().includes(query) ||
                assignment.groupNames.some((groupName) =>
                    groupName.toLowerCase().includes(query),
                ) ||
                assignment.majorName?.toLowerCase().includes(query) ||
                assignment.departmentName?.toLowerCase().includes(query) ||
                assignment.facultyName?.toLowerCase().includes(query)
            );
        });
    }, [assignments, filter, searchQuery]);

    const retryAssignments = useMemo(() => {
        if (filter === "PARTIAL" || filter === "UNPLACED") {
            return filteredAssignments;
        }

        return assignments.filter((assignment) => {
            const status = normalizePlacementStatus(assignment.placementStatus);
            return status === "PARTIAL" || status === "UNPLACED";
        });
    }, [assignments, filter, filteredAssignments]);

    const showRetryBar =
        retryAssignments.length > 0 &&
        Boolean(onRetryFailed) &&
        (filter === "PARTIAL" || filter === "UNPLACED");

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50">
            <button
                type="button"
                aria-label="Close assignments panel"
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-border bg-background shadow-2xl sm:w-[560px]">
                <div className="flex items-start justify-between gap-4 border-b border-border p-5">
                    <div>
                        <h2 className="text-xl font-semibold">
                            Assignments
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {summary.total} total - {summary.scheduled} scheduled -{" "}
                            {summary.partial} partial - {summary.unplaced} unplaced
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        {onCreateAssignment && (
                            <Button type="button" size="sm" onClick={onCreateAssignment}>
                                <Plus className="h-4 w-4" />
                                New
                            </Button>
                        )}

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            aria-label="Close assignments panel"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="space-y-4 border-b border-border p-5">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(event) =>
                                setSearchQuery(event.target.value)
                            }
                            placeholder="Search subject, teacher, group..."
                            className="h-11 rounded-xl pl-10"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {(["ALL", "SCHEDULED", "PARTIAL", "UNPLACED"] as const).map(
                            (item) => (
                                <Button
                                    key={item}
                                    type="button"
                                    variant={filter === item ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFilter(item)}
                                >
                                    {getStatusLabel(item)}
                                </Button>
                            ),
                        )}
                    </div>

                    {showRetryBar && (
                        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="text-sm font-medium text-amber-950">
                                    {retryAssignments.length} {filter === "PARTIAL" ? "partial" : "unplaced"} assignment(s)
                                </div>
                                <p className="mt-0.5 text-xs text-amber-800">
                                    Retry uses the current splitting and keeps placed lessons.
                                </p>
                            </div>

                            {retrying ? (
                                <Button type="button" size="sm" variant="outline" onClick={onStopRetry}>
                                    <Square className="h-4 w-4" />
                                    Stop
                                </Button>
                            ) : (
                                <Button type="button" size="sm" onClick={() => onRetryFailed?.(retryAssignments)}>
                                    <RotateCcw className="h-4 w-4" />
                                    Retry failed
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                <div className="custom-scrollbar flex-1 overflow-y-auto p-5">
                    {filteredAssignments.length === 0 ? (
                        <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
                            <div>
                                <AlertCircle className="mx-auto h-9 w-9 text-muted-foreground" />
                                <h3 className="mt-3 text-sm font-semibold">
                                    No assignments found
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Try changing the search query or filter.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {retrying && showRetryBar && (
                                <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Retrying failed assignments...
                                </div>
                            )}
                            {filteredAssignments.map((assignment) => {
                                const status = normalizePlacementStatus(
                                    assignment.placementStatus,
                                );

                                return (
                                    <Card
                                        key={assignment.id}
                                        className="rounded-2xl transition hover:bg-accent/50"
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="line-clamp-2 text-sm font-semibold">
                                                            {assignment.subjectName}
                                                        </h3>

                                                        <Badge
                                                            variant={getStatusBadgeVariant(
                                                                status,
                                                            )}
                                                        >
                                                            {getStatusLabel(status)}
                                                        </Badge>
                                                    </div>

                                                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                                                        {assignment.teacherName}
                                                    </p>

                                                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                                        {assignment.groupNames.join(", ")}
                                                    </p>

                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        <Badge variant="outline">
                                                            {assignment.hoursPerWeek} h/week
                                                        </Badge>

                                                        <Badge variant="outline">
                                                            {assignment.roomTypeRequired}
                                                        </Badge>

                                                        <Badge variant="outline">
                                                            {assignment.shift}
                                                        </Badge>

                                                        {assignment.generatedLessonsCount !==
                                                            undefined &&
                                                            assignment.requiredLessonsCount !==
                                                            undefined && (
                                                                <Badge variant="outline">
                                                                    {
                                                                        assignment.generatedLessonsCount
                                                                    }
                                                                    /
                                                                    {
                                                                        assignment.requiredLessonsCount
                                                                    } lessons
                                                                </Badge>
                                                            )}
                                                    </div>

                                                    {assignment.failureReason && (
                                                        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                                                            {assignment.failureReason}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex shrink-0 gap-1">
                                                    {onManualPlace && status !== "SCHEDULED" && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            onClick={() => onManualPlace(assignment)}
                                                            aria-label="Place assignment manually"
                                                        >
                                                            <MapPin className="h-4 w-4" />
                                                        </Button>
                                                    )}

                                                    {onEditAssignment && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            onClick={() =>
                                                                onEditAssignment(
                                                                    assignment,
                                                                )
                                                            }
                                                            aria-label="Edit assignment"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    )}

                                                    {onDeleteAssignment && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            onClick={() =>
                                                                onDeleteAssignment(
                                                                    assignment,
                                                                )
                                                            }
                                                            aria-label="Delete assignment"
                                                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>

            </aside>
        </div>
    );
}
