"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    ClipboardList,
    Edit,
    Plus,
    Search,
    Trash2,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    assignmentApi,
    groupApi,
    roomApi,
    subjectApi,
    teacherApi,
    timetableApi,
    timeSlotApi,
} from "@/lib";
import type {
    AssignmentResponse,
    RoomResponse,
    StudyGroupResponse,
    SubjectResponse,
    TeacherResponse,
    TimeSlot,
    TimetableResponse,
} from "@/lib/types";

import AssignmentForm from "./components/AssignmentForm";

type SortField = "subjectName" | "teacherName" | "placementStatus";
type SortDirection = "asc" | "desc";

function getApiErrorMessage(error: unknown, fallback: string) {
    if (
        typeof error === "object" &&
        error !== null &&
        "response" in error
    ) {
        const axiosError = error as {
            response?: {
                data?: unknown;
                status?: number;
            };
        };

        const data = axiosError.response?.data;

        if (typeof data === "string") return data;

        if (typeof data === "object" && data !== null) {
            const body = data as {
                message?: string;
                error?: string;
                details?: string;
            };

            if (body.message) return body.message;
            if (body.error) return body.error;
            if (body.details) return body.details;
        }

        if (axiosError.response?.status === 400) {
            return "Invalid assignment data. Check subject, teacher and groups.";
        }

        if (axiosError.response?.status === 404) {
            return "Assignment data was not found.";
        }
    }

    return fallback;
}

function getPlacementVariant(status: string) {
    switch (status) {
        case "SCHEDULED":
            return "success";
        case "PARTIAL":
            return "warning";
        case "FAILED":
            return "destructive";
        case "PENDING":
            return "secondary";
        default:
            return "outline";
    }
}

export default function AssignmentsPage({
                                            params,
                                        }: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const timetableId = Number(id);

    const [timetable, setTimetable] = useState<TimetableResponse | null>(null);
    const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);

    const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
    const [teachers, setTeachers] = useState<TeacherResponse[]>([]);
    const [groups, setGroups] = useState<StudyGroupResponse[]>([]);
    const [rooms, setRooms] = useState<RoomResponse[]>([]);
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedAssignments, setSelectedAssignments] = useState<number[]>([]);

    const [sortField, setSortField] = useState<SortField>("subjectName");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] =
        useState<AssignmentResponse | null>(null);

    useEffect(() => {
        if (!timetableId || Number.isNaN(timetableId)) {
            setLoading(false);
            setError("Invalid timetable ID");
            return;
        }

        void loadData(true);
    }, [timetableId]);

    const filteredAssignments = useMemo(() => {
        if (!searchQuery.trim()) return assignments;

        const lower = searchQuery.toLowerCase();

        return assignments.filter((assignment) => {
            return (
                assignment.subjectName?.toLowerCase().includes(lower) ||
                assignment.teacherName?.toLowerCase().includes(lower) ||
                assignment.placementStatus?.toLowerCase().includes(lower) ||
                assignment.groupNames?.some((group) =>
                    group.toLowerCase().includes(lower),
                ) ||
                assignment.id.toString().includes(lower)
            );
        });
    }, [assignments, searchQuery]);

    const sortedAssignments = useMemo(() => {
        return [...filteredAssignments].sort((a, b) => {
            const direction = sortDirection === "asc" ? 1 : -1;

            return (
                String(a[sortField] || "").localeCompare(
                    String(b[sortField] || ""),
                ) * direction
            );
        });
    }, [filteredAssignments, sortField, sortDirection]);

    const scheduledCount = useMemo(() => {
        return assignments.filter(
            (assignment) => assignment.placementStatus === "SCHEDULED",
        ).length;
    }, [assignments]);

    const manualCount = useMemo(() => {
        return assignments.filter(
            (assignment) =>
                assignment.requiresManualInput ||
                assignment.placementStatus === "FAILED",
        ).length;
    }, [assignments]);

    const loadData = async (initial = false) => {
        try {
            if (initial) setLoading(true);

            setError("");
            setSuccessMessage("");

            const [
                timetableData,
                assignmentsData,
                subjectsData,
                teachersData,
                groupsData,
                roomsData,
                timeSlotsData,
            ] = await Promise.all([
                timetableApi.getTimetable(timetableId),
                assignmentApi.getAssignmentsByTimetable(timetableId),
                subjectApi.getSubjects(),
                teacherApi.getTeachers(),
                groupApi.getAllGroups(),
                roomApi.getRooms(),
                timeSlotApi.getTimeSlots(),
            ]);

            setTimetable(timetableData);
            setAssignments(assignmentsData);
            setSubjects(subjectsData);
            setTeachers(teachersData);
            setGroups(groupsData);
            setRooms(roomsData);
            setTimeSlots(timeSlotsData);
        } catch (err) {
            setError(getApiErrorMessage(err, "Failed to load assignments"));
        } finally {
            if (initial) setLoading(false);
        }
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection((current) =>
                current === "asc" ? "desc" : "asc",
            );
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const getSortLabel = (field: SortField, label: string) => {
        const isActive = sortField === field;

        return (
            <button
                type="button"
                onClick={() => handleSort(field)}
                className="inline-flex items-center gap-1 font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
                {label}
                {isActive && (
                    <span className="text-xs">
                        {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                )}
            </button>
        );
    };

    const openCreateForm = () => {
        setError("");
        setSuccessMessage("");
        setEditingAssignment(null);
        setIsFormOpen(true);
    };

    const openEditForm = (assignment: AssignmentResponse) => {
        setError("");
        setSuccessMessage("");
        setEditingAssignment(assignment);
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingAssignment(null);
        setSaving(false);
    };

    const handleSaveAssignment = async (data: unknown) => {
        try {
            setSaving(true);
            setError("");
            setSuccessMessage("");

            if (editingAssignment) {
                const apiWithUpdate = assignmentApi as unknown as {
                    updateAssignment?: (
                        timetableId: number,
                        assignmentId: number,
                        data: unknown,
                    ) => Promise<AssignmentResponse>;
                };

                if (!apiWithUpdate.updateAssignment) {
                    setError("Update assignment API is not available");
                    return;
                }

                await apiWithUpdate.updateAssignment(
                    timetableId,
                    editingAssignment.id,
                    data,
                );
                setSuccessMessage("Assignment updated successfully");
            } else {
                await assignmentApi.createAssignment(timetableId, data);
                setSuccessMessage("Assignment created successfully");
            }

            closeForm();
            await loadData();
        } catch (err) {
            setError(
                getApiErrorMessage(
                    err,
                    editingAssignment
                        ? "Failed to update assignment"
                        : "Failed to create assignment",
                ),
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (assignment: AssignmentResponse) => {
        if (!confirm(`Delete assignment "${assignment.subjectName}"?`)) return;

        try {
            setError("");
            setSuccessMessage("");

            const apiWithDelete = assignmentApi as unknown as {
                deleteAssignment?: (
                    timetableId: number,
                    assignmentId: number,
                ) => Promise<void>;
            };

            if (!apiWithDelete.deleteAssignment) {
                setError("Delete assignment API is not available");
                return;
            }

            await apiWithDelete.deleteAssignment(timetableId, assignment.id);
            await loadData();

            setSuccessMessage("Assignment deleted successfully");
        } catch (err) {
            setError(getApiErrorMessage(err, "Failed to delete assignment"));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedAssignments.length === 0) return;

        if (
            !confirm(
                `Delete ${selectedAssignments.length} selected assignments?`,
            )
        ) {
            return;
        }

        try {
            setError("");
            setSuccessMessage("");

            const apiWithDelete = assignmentApi as unknown as {
                deleteAssignment?: (
                    timetableId: number,
                    assignmentId: number,
                ) => Promise<void>;
            };

            if (!apiWithDelete.deleteAssignment) {
                setError("Delete assignment API is not available");
                return;
            }

            const results = await Promise.allSettled(
                selectedAssignments.map((assignmentId) =>
                    apiWithDelete.deleteAssignment!(
                        timetableId,
                        assignmentId,
                    ),
                ),
            );

            const failed = results.filter(
                (result) => result.status === "rejected",
            );

            if (failed.length > 0) {
                setError(`${failed.length} assignment(s) could not be deleted`);
            } else {
                setSuccessMessage("Selected assignments deleted successfully");
            }

            setSelectedAssignments([]);
            await loadData();
        } catch {
            setError("Unexpected error while deleting assignments");
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedAssignments(
                sortedAssignments.map((assignment) => assignment.id),
            );
        } else {
            setSelectedAssignments([]);
        }
    };

    const handleSelectAssignment = (id: number) => {
        setSelectedAssignments((prev) =>
            prev.includes(id)
                ? prev.filter((assignmentId) => assignmentId !== id)
                : [...prev, id],
        );
    };

    if (loading) {
        return (
            <AppShell>
                <div className="space-y-6">
                    <Skeleton className="h-28 w-full" />
                    <div className="grid gap-4 md:grid-cols-3">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                    <Skeleton className="h-[520px] w-full" />
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <PageHeader
                eyebrow="Scheduling"
                title="Assignments"
                description={
                    timetable
                        ? `Manage assignments for ${timetable.name}`
                        : "Manage subject assignments for timetable generation."
                }
                actions={
                    <>
                        <Button variant="outline" asChild>
                            <Link href={`/timetables/${timetableId}`}>
                                <ArrowLeft className="h-4 w-4" />
                                Back
                            </Link>
                        </Button>

                        <Button onClick={openCreateForm}>
                            <Plus className="h-4 w-4" />
                            New assignment
                        </Button>
                    </>
                }
            />

            {error && (
                <Card className="mb-6 border-red-200 bg-red-50 text-red-800">
                    <CardContent className="p-4 text-sm">{error}</CardContent>
                </Card>
            )}

            {successMessage && (
                <Card className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-800">
                    <CardContent className="p-4 text-sm">
                        {successMessage}
                    </CardContent>
                </Card>
            )}

            <section className="grid gap-4 md:grid-cols-3">
                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Assignments
                        </CardTitle>
                        <ClipboardList className="h-4 w-4 text-blue-700" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {assignments.length}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Total assignments
                        </p>
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Scheduled
                        </CardTitle>
                        <Badge variant="success">Placed</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {scheduledCount}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Already placed lessons
                        </p>
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Manual
                        </CardTitle>
                        <Badge variant={manualCount > 0 ? "warning" : "secondary"}>
                            Review
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{manualCount}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Need manual placement
                        </p>
                    </CardContent>
                </Card>
            </section>

            <Card className="glass-card mt-6">
                <CardHeader>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="relative w-full max-w-xl">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={(e) =>
                                    setSearchQuery(e.target.value)
                                }
                                placeholder="Search by subject, teacher, group, status..."
                                className="h-11 rounded-xl pl-10 pr-4 shadow-sm"
                            />
                        </div>

                        {selectedAssignments.length > 0 && (
                            <Button
                                variant="destructive"
                                onClick={handleDeleteSelected}
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete selected ({selectedAssignments.length})
                            </Button>
                        )}
                    </div>
                </CardHeader>

                <CardContent>
                    {sortedAssignments.length === 0 ? (
                        <EmptyState
                            title="No assignments found"
                            description="Create assignment records before generating timetable lessons."
                            actionLabel="New assignment"
                            onAction={openCreateForm}
                        />
                    ) : (
                        <div className="custom-scrollbar overflow-x-auto">
                            <table className="w-full min-w-[1000px] text-sm">
                                <thead>
                                <tr className="border-b text-left">
                                    <th className="w-12 py-3">
                                        <input
                                            type="checkbox"
                                            checked={
                                                selectedAssignments.length ===
                                                sortedAssignments.length &&
                                                sortedAssignments.length > 0
                                            }
                                            onChange={handleSelectAll}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                    </th>

                                    <th className="py-3">
                                        {getSortLabel(
                                            "subjectName",
                                            "Subject",
                                        )}
                                    </th>
                                    <th className="py-3">
                                        {getSortLabel(
                                            "teacherName",
                                            "Teacher",
                                        )}
                                    </th>
                                    <th className="py-3">Groups</th>
                                    <th className="py-3">
                                        {getSortLabel(
                                            "placementStatus",
                                            "Status",
                                        )}
                                    </th>
                                    <th className="py-3">Manual</th>
                                    <th className="py-3 text-right">
                                        Actions
                                    </th>
                                </tr>
                                </thead>

                                <tbody>
                                {sortedAssignments.map((assignment) => (
                                    <tr
                                        key={assignment.id}
                                        className="border-b last:border-b-0 hover:bg-accent/50"
                                    >
                                        <td className="py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedAssignments.includes(
                                                    assignment.id,
                                                )}
                                                onChange={() =>
                                                    handleSelectAssignment(
                                                        assignment.id,
                                                    )
                                                }
                                                className="h-4 w-4 rounded border-gray-300"
                                            />
                                        </td>

                                        <td className="py-4">
                                            <div className="font-medium">
                                                {assignment.subjectName}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                ID: {assignment.id}
                                            </div>
                                        </td>

                                        <td className="py-4">
                                            {assignment.teacherName}
                                        </td>

                                        <td className="py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {assignment.groupNames?.map(
                                                    (groupName) => (
                                                        <Badge
                                                            key={groupName}
                                                            variant="outline"
                                                        >
                                                            {groupName}
                                                        </Badge>
                                                    ),
                                                )}
                                            </div>
                                        </td>

                                        <td className="py-4">
                                            <Badge
                                                variant={
                                                    getPlacementVariant(
                                                        assignment.placementStatus,
                                                    ) as any
                                                }
                                            >
                                                {assignment.placementStatus}
                                            </Badge>
                                        </td>

                                        <td className="py-4">
                                            {assignment.requiresManualInput ? (
                                                <Badge variant="warning">
                                                    Required
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">
                                                    No
                                                </Badge>
                                            )}
                                        </td>

                                        <td className="py-4">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() =>
                                                        openEditForm(
                                                            assignment,
                                                        )
                                                    }
                                                    aria-label="Edit assignment"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() =>
                                                        handleDelete(
                                                            assignment,
                                                        )
                                                    }
                                                    aria-label="Delete assignment"
                                                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <div className="glass-card custom-scrollbar max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-2xl">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-semibold">
                                    {editingAssignment
                                        ? "Edit Assignment"
                                        : "Create Assignment"}
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Select subject, teacher, groups and scheduling options.
                                </p>
                            </div>

                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={closeForm}
                                disabled={saving}
                                aria-label="Close assignment form"
                            >
                                ✕
                            </Button>
                        </div>

                        <AssignmentForm
                            initialAssignment={editingAssignment}
                            subjects={subjects}
                            teachers={teachers}
                            groups={groups}
                            rooms={rooms}
                            timeSlots={timeSlots}
                            saving={saving}
                            onSave={handleSaveAssignment}
                            onCancel={closeForm}
                        />
                    </div>
                </div>
            )}
        </AppShell>
    );
}