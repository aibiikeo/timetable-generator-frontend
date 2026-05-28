"use client";

import { AlertTriangle, CheckCircle2, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssignmentResponse, GenerationResponse } from "@/lib/types";

interface DiagnosticsPanelProps {
    assignments: AssignmentResponse[];
    generationResult?: GenerationResponse | null;
    onManualPlace: (assignmentId: number) => void;
    onEditAssignment: (assignment: AssignmentResponse) => void;
}

function needsReview(assignment: AssignmentResponse) {
    const status = String(assignment.placementStatus || "").toUpperCase();
    return assignment.requiresManualInput || ["FAILED", "PARTIAL", "PENDING", "UNPLACED"].includes(status);
}

export default function DiagnosticsPanel({
                                             assignments,
                                             generationResult,
                                             onManualPlace,
                                             onEditAssignment,
                                         }: DiagnosticsPanelProps) {
    const reviewAssignments = assignments.filter(needsReview);
    const failedCount = generationResult?.failedVerticesCount ?? reviewAssignments.length;

    return (
        <Card className="glass-card mt-6">
            <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                        <CardTitle>Diagnostics</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Review assignments that were not fully scheduled and repair them manually.
                        </p>
                    </div>

                    <Badge variant={failedCount > 0 ? "warning" : "success"}>
                        {failedCount > 0 ? `${failedCount} need review` : "No issues"}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent>
                {reviewAssignments.length === 0 ? (
                    <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-sm text-green-800">
                        <div className="flex items-center gap-2 font-medium">
                            <CheckCircle2 className="h-4 w-4" />
                            Nothing needs manual repair right now.
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {reviewAssignments.map((assignment) => (
                            <div
                                key={assignment.id}
                                className="rounded-2xl border border-border bg-card p-4"
                            >
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                                            <div className="font-medium">{assignment.subjectName}</div>
                                            <Badge variant="warning">{assignment.placementStatus}</Badge>
                                        </div>

                                        <div className="mt-1 text-sm text-muted-foreground">
                                            {assignment.teacherName} - {assignment.groupNames.join(", ")}
                                        </div>

                                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                                            <b>Reason:</b> {assignment.failureReason || "Not enough valid room/time candidates or a constraint conflict."}
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 flex-wrap gap-2">
                                        <Button variant="outline" size="sm" onClick={() => onEditAssignment(assignment)}>
                                            Edit assignment
                                        </Button>
                                        <Button size="sm" onClick={() => onManualPlace(assignment.id)}>
                                            <Wrench className="h-4 w-4" />
                                            Place manually
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
