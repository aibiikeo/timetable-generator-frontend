"use client";

import { useEffect } from "react";
import {
    CalendarDays,
    Clock,
    DoorOpen,
    Edit,
    Trash2,
    UserRound,
    Users,
    X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import type { LessonResponse } from "@/lib/types";
import { DAYS_SHORT } from "@/lib/constants";

interface LessonDetailsModalProps {
    lesson: LessonResponse | null;
    open: boolean;
    onClose: () => void;
    onEdit: (lesson: LessonResponse) => void;
    onDelete: (lesson: LessonResponse) => void;
}

function formatTime(time: string) {
    return time.substring(0, 5);
}

export default function LessonDetailsModal({
                                               lesson,
                                               open,
                                               onClose,
                                               onEdit,
                                               onDelete,
                                           }: LessonDetailsModalProps) {
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

    if (!open || !lesson) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Close lesson details"
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            <Card className="glass-card relative z-10 w-full max-w-xl rounded-2xl bg-card shadow-2xl">
                <CardHeader className="border-b border-border">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                                <CalendarDays className="h-5 w-5" />
                            </div>

                            <CardTitle className="line-clamp-2">
                                {lesson.subjectName}
                            </CardTitle>

                            <p className="mt-1 text-sm text-muted-foreground">
                                Lesson #{lesson.id}
                            </p>
                        </div>

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            aria-label="Close lesson details"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-5 p-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-border bg-card p-4">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <UserRound className="h-4 w-4 text-muted-foreground" />
                                Teacher
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {lesson.teacherName}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-border bg-card p-4">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <DoorOpen className="h-4 w-4 text-muted-foreground" />
                                Room
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {lesson.roomName || "No room assigned"}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-border bg-card p-4">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                Time
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {DAYS_SHORT[lesson.dayOfWeek] || lesson.dayOfWeek},{" "}
                                {formatTime(lesson.startTime)} - {lesson.durationHours} slot(s)
                            </p>
                        </div>

                        <div className="rounded-2xl border border-border bg-card p-4">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                Groups
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                                {lesson.groupNames.map((groupName) => (
                                    <Badge key={groupName} variant="outline">
                                        {groupName}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-muted/40 p-4">
                        <div className="text-sm font-medium">Academic structure</div>

                        <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                            <div>
                                <span className="font-medium text-foreground">
                                    Faculty:
                                </span>{" "}
                                {lesson.facultyName || "-"}
                            </div>

                            <div>
                                <span className="font-medium text-foreground">
                                    Department:
                                </span>{" "}
                                {lesson.departmentName || "-"}
                            </div>

                            <div>
                                <span className="font-medium text-foreground">
                                    Major:
                                </span>{" "}
                                {lesson.majorName || "-"}
                            </div>

                            <div>
                                <span className="font-medium text-foreground">
                                    Degree:
                                </span>{" "}
                                {lesson.degree || "-"}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Close
                        </Button>

                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => onEdit(lesson)}
                        >
                            <Edit className="h-4 w-4" />
                            Edit lesson
                        </Button>

                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => onDelete(lesson)}
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete lesson
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}