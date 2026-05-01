"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    CalendarClock,
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
    lessonApi,
    roomApi,
    timetableApi,
} from "@/lib";
import type {
    AssignmentResponse,
    DayOfWeek,
    LessonResponse,
    RoomResponse,
    TimetableResponse,
} from "@/lib/types";

type SortField = "dayOfWeek" | "startTime" | "subjectName" | "teacherName" | "roomName";
type SortDirection = "asc" | "desc";

interface LessonFormData {
    assignmentId: number;
    dayOfWeek: DayOfWeek;
    startTime: string;
    durationHours: number | string;
    roomId?: number;
}

const DAYS: DayOfWeek[] = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
];

const DAY_ORDER: Record<DayOfWeek, number> = {
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
    SUNDAY: 7,
};

const EMPTY_FORM: LessonFormData = {
    assignmentId: 0,
    dayOfWeek: "MONDAY",
    startTime: "09:00",
    durationHours: 2,
    roomId: undefined,
};

export default function LessonsPage() {
    const router = useRouter();

    const [publishedTimetable, setPublishedTimetable] =
        useState<TimetableResponse | null>(null);

    const [lessons, setLessons] = useState<LessonResponse[]>([]);
    const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
    const [rooms, setRooms] = useState<RoomResponse[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDay, setSelectedDay] = useState<DayOfWeek | "ALL">("ALL");
    const [selectedLessons, setSelectedLessons] = useState<number[]>([]);

    const [sortField, setSortField] = useState<SortField>("dayOfWeek");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentLesson, setCurrentLesson] = useState<LessonResponse | null>(null);

    const [formData, setFormData] = useState<LessonFormData>(EMPTY_FORM);

    useEffect(() => {
        void loadData(true);
    }, []);

    const filteredLessons = useMemo(() => {
        const lower = searchQuery.toLowerCase();

        return lessons.filter((lesson) => {
            const matchesSearch =
                lesson.subjectName.toLowerCase().includes(lower) ||
                lesson.teacherName.toLowerCase().includes(lower) ||
                (lesson.roomName || "").toLowerCase().includes(lower) ||
                lesson.groupNames.some((group) => group.toLowerCase().includes(lower)) ||
                lesson.dayOfWeek.toLowerCase().includes(lower) ||
                lesson.startTime.includes(lower);

            const matchesDay =
                selectedDay === "ALL" || lesson.dayOfWeek === selectedDay;

            return matchesSearch && matchesDay;
        });
    }, [lessons, searchQuery, selectedDay]);

    const sortedLessons = useMemo(() => {
        return [...filteredLessons].sort((a, b) => {
            const direction = sortDirection === "asc" ? 1 : -1;

            if (sortField === "dayOfWeek") {
                return (DAY_ORDER[a.dayOfWeek] - DAY_ORDER[b.dayOfWeek]) * direction;
            }

            if (sortField === "roomName") {
                return String(a.roomName || "").localeCompare(String(b.roomName || "")) * direction;
            }

            return String(a[sortField] || "").localeCompare(String(b[sortField] || "")) * direction;
        });
    }, [filteredLessons, sortField, sortDirection]);

    const loadData = async (initial = false) => {
        try {
            if (initial) setLoading(true);

            setError("");

            const timetables = await timetableApi.getAllTimetables();

            const published = timetables
                .filter((timetable) => timetable.status === "PUBLISHED")
                .sort((a, b) => {
                    const dateDiff =
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime();

                    if (dateDiff !== 0) return dateDiff;

                    return b.version - a.version;
                })[0] ?? null;

            setPublishedTimetable(published);

            if (!published) {
                setLessons([]);
                setAssignments([]);
                setRooms([]);
                setSelectedLessons([]);
                return;
            }

            const [lessonsData, assignmentsData, roomsData] = await Promise.all([
                lessonApi.getLessonsByTimetable(published.id),
                assignmentApi.getAssignmentsByTimetable(published.id),
                roomApi.getRooms(),
            ]);

            setLessons(lessonsData);
            setAssignments(assignmentsData);
            setRooms(roomsData);
        } catch (err) {
            console.error("Error loading published timetable lessons:", err);
            setError("Failed to load lessons from published timetable");
        } finally {
            if (initial) setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData(EMPTY_FORM);
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
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

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
        const { name, value, type } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]:
                type === "number" || name === "assignmentId" || name === "roomId"
                    ? value === ""
                        ? undefined
                        : Number(value)
                    : value,
        }));
    };

    const validateForm = () => {
        if (!formData.assignmentId) {
            setError("Please select assignment");
            return false;
        }

        if (!formData.dayOfWeek) {
            setError("Please select day");
            return false;
        }

        if (!formData.startTime) {
            setError("Start time is required");
            return false;
        }

        if (Number(formData.durationHours) < 1) {
            setError("Duration must be at least 1 hour");
            return false;
        }

        return true;
    };

    const getPayload = () => ({
        assignmentId: Number(formData.assignmentId),
        dayOfWeek: formData.dayOfWeek,
        startTime: formData.startTime,
        durationHours: Number(formData.durationHours),
        roomId: formData.roomId ? Number(formData.roomId) : undefined,
    });

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            setError("");

            if (!publishedTimetable) {
                setError("No published timetable found");
                return;
            }

            await lessonApi.createLesson(publishedTimetable.id, getPayload());

            setIsCreateModalOpen(false);
            resetForm();

            await loadData();
        } catch (err: any) {
            console.error("Error creating lesson:", err);
            setError(err.response?.data?.message || "Failed to create lesson");
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentLesson) return;
        if (!validateForm()) return;

        try {
            setError("");

            if (!publishedTimetable) {
                setError("No published timetable found");
                return;
            }

            await lessonApi.updateLesson(
                publishedTimetable.id,
                currentLesson.id,
                getPayload(),
            );

            setIsEditModalOpen(false);
            setCurrentLesson(null);
            resetForm();

            await loadData();
        } catch (err: any) {
            console.error("Error updating lesson:", err);
            setError(err.response?.data?.message || "Failed to update lesson");
        }
    };

    const handleEdit = (lesson: LessonResponse) => {
        const room = rooms.find((item) => item.name === lesson.roomName);

        setCurrentLesson(lesson);
        setFormData({
            assignmentId: lesson.assignmentId,
            dayOfWeek: lesson.dayOfWeek,
            startTime: lesson.startTime,
            durationHours: lesson.durationHours,
            roomId: room?.id,
        });

        setIsEditModalOpen(true);
    };

    const handleDelete = async (lesson: LessonResponse) => {
        if (!confirm(`Delete lesson "${lesson.subjectName}"?`)) return;

        try {
            setError("");

            if (!publishedTimetable) {
                setError("No published timetable found");
                return;
            }

            await lessonApi.deleteLesson(publishedTimetable.id, lesson.id);

            await loadData();
        } catch (err: any) {
            console.error("Error deleting lesson:", err);
            setError(err.response?.data?.message || "Failed to delete lesson");
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedLessons.length === 0) return;

        if (!confirm(`Delete ${selectedLessons.length} selected lessons?`)) return;

        if (!publishedTimetable) {
            setError("No published timetable found");
            return;
        }

        try {
            setError("");

            const results = await Promise.allSettled(
                selectedLessons.map((id) =>
                    lessonApi.deleteLesson(publishedTimetable.id, id),
                ),
            );

            const failed = results.filter((result) => result.status === "rejected");

            if (failed.length > 0) {
                setError(`${failed.length} lesson(s) could not be deleted`);
            }

            setSelectedLessons([]);
            await loadData();
        } catch {
            setError("Unexpected error while deleting lessons");
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedLessons(sortedLessons.map((lesson) => lesson.id));
        } else {
            setSelectedLessons([]);
        }
    };

    const handleSelectLesson = (id: number) => {
        setSelectedLessons((prev) =>
            prev.includes(id)
                ? prev.filter((lessonId) => lessonId !== id)
                : [...prev, id],
        );
    };

    const openCreateModal = () => {
        setError("");
        resetForm();
        setIsCreateModalOpen(true);
    };

    if (!loading && !publishedTimetable) {
        return (
            <AppShell>
                <PageHeader
                    eyebrow="Scheduling"
                    title="Lessons"
                    description="Published timetable lessons will appear here."
                />

                <Card className="glass-card">
                    <CardContent className="py-12">
                        <EmptyState
                            title="No published timetable"
                            description="Publish a timetable first, then its lessons will be shown here."
                            actionLabel="Go to timetables"
                            onAction={() => router.push("/timetables")}
                        />
                    </CardContent>
                </Card>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <PageHeader
                eyebrow="Scheduling"
                title="Lessons"
                description={
                    publishedTimetable
                        ? `Showing lessons from published timetable: ${publishedTimetable.name}`
                        : "Published timetable lessons will appear here."
                }
                actions={
                    publishedTimetable && (
                        <Button onClick={openCreateModal}>
                            <Plus className="h-4 w-4" />
                            New lesson
                        </Button>
                    )
                }
            />

            {error && (
                <Card className="mb-6 border-red-200 bg-red-50 text-red-800">
                    <CardContent className="p-4 text-sm">{error}</CardContent>
                </Card>
            )}

            <section className="grid gap-4 md:grid-cols-3">
                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Lessons
                        </CardTitle>
                        <CalendarClock className="h-4 w-4 text-blue-700" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{lessons.length}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Total lessons
                        </p>
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Published timetable
                        </CardTitle>
                        <Badge variant="success">PUBLISHED</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="truncate text-xl font-bold">
                            {publishedTimetable?.name || "—"}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {publishedTimetable
                                ? `${publishedTimetable.academicYearStart}–${publishedTimetable.academicYearEnd} · ${publishedTimetable.semester}`
                                : "No published timetable"}
                        </p>
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Selected
                        </CardTitle>
                        <Badge variant="secondary">Bulk</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{selectedLessons.length}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Selected rows
                        </p>
                    </CardContent>
                </Card>
            </section>

            <Card className="glass-card mt-6">
                <CardHeader>
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="relative w-full max-w-xl">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by subject, teacher, room, group..."
                                className="h-11 rounded-xl pl-10 pr-4 shadow-sm"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={selectedDay}
                                onChange={(e) =>
                                    setSelectedDay(e.target.value as DayOfWeek | "ALL")
                                }
                                className="h-11 rounded-xl border border-input bg-card px-3 text-sm shadow-sm"
                            >
                                <option value="ALL">All days</option>
                                {DAYS.map((day) => (
                                    <option key={day} value={day}>
                                        {day}
                                    </option>
                                ))}
                            </select>

                            {selectedLessons.length > 0 && (
                                <Button variant="destructive" onClick={handleDeleteSelected}>
                                    <Trash2 className="h-4 w-4" />
                                    Delete selected ({selectedLessons.length})
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <Skeleton key={index} className="h-14 w-full" />
                            ))}
                        </div>
                    ) : sortedLessons.length === 0 ? (
                        <EmptyState
                            title="No lessons found"
                            description="Create a lesson or change filters."
                            actionLabel="New lesson"
                            onAction={openCreateModal}
                        />
                    ) : (
                        <div className="custom-scrollbar overflow-x-auto">
                            <table className="w-full min-w-[1050px] text-sm">
                                <thead>
                                <tr className="border-b text-left">
                                    <th className="w-12 py-3">
                                        <input
                                            type="checkbox"
                                            checked={
                                                selectedLessons.length === sortedLessons.length &&
                                                sortedLessons.length > 0
                                            }
                                            onChange={handleSelectAll}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                    </th>
                                    <th className="py-3">{getSortLabel("dayOfWeek", "Day")}</th>
                                    <th className="py-3">{getSortLabel("startTime", "Time")}</th>
                                    <th className="py-3">{getSortLabel("subjectName", "Subject")}</th>
                                    <th className="py-3">{getSortLabel("teacherName", "Teacher")}</th>
                                    <th className="py-3">Groups</th>
                                    <th className="py-3">{getSortLabel("roomName", "Room")}</th>
                                    <th className="py-3 text-center">Duration</th>
                                    <th className="py-3 text-right">Actions</th>
                                </tr>
                                </thead>

                                <tbody>
                                {sortedLessons.map((lesson) => (
                                    <tr
                                        key={lesson.id}
                                        className="border-b last:border-b-0 hover:bg-accent/50"
                                    >
                                        <td className="py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedLessons.includes(lesson.id)}
                                                onChange={() => handleSelectLesson(lesson.id)}
                                                className="h-4 w-4 rounded border-gray-300"
                                            />
                                        </td>

                                        <td className="py-4">
                                            <Badge variant="secondary">{lesson.dayOfWeek}</Badge>
                                        </td>

                                        <td className="py-4 font-medium">{lesson.startTime}</td>

                                        <td className="py-4">
                                            <div className="font-medium">{lesson.subjectName}</div>
                                            <div className="text-xs text-muted-foreground">
                                                ID: {lesson.id}
                                            </div>
                                        </td>

                                        <td className="py-4">{lesson.teacherName}</td>

                                        <td className="py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {lesson.groupNames.map((group) => (
                                                    <Badge key={group} variant="outline">
                                                        {group}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </td>

                                        <td className="py-4">{lesson.roomName || "—"}</td>

                                        <td className="py-4 text-center">
                                            {lesson.durationHours}h
                                        </td>

                                        <td className="py-4">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => handleEdit(lesson)}
                                                    aria-label="Edit lesson"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => handleDelete(lesson)}
                                                    aria-label="Delete lesson"
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

            {(isCreateModalOpen || isEditModalOpen) && (
                <LessonModal
                    title={isCreateModalOpen ? "Create Lesson" : "Edit Lesson"}
                    formData={formData}
                    assignments={assignments}
                    rooms={rooms}
                    onChange={handleInputChange}
                    onClose={() => {
                        setIsCreateModalOpen(false);
                        setIsEditModalOpen(false);
                        setCurrentLesson(null);
                        resetForm();
                    }}
                    onSubmit={isCreateModalOpen ? handleCreateSubmit : handleEditSubmit}
                />
            )}
        </AppShell>
    );
}

interface LessonModalProps {
    title: string;
    formData: LessonFormData;
    assignments: AssignmentResponse[];
    rooms: RoomResponse[];
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

function LessonModal({
                         title,
                         formData,
                         assignments,
                         rooms,
                         onClose,
                         onSubmit,
                         onChange,
                     }: LessonModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="glass-card w-full max-w-xl rounded-2xl bg-card p-6 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold">{title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Place a lesson into a day, time and room.
                        </p>
                    </div>

                    <Button type="button" variant="ghost" size="icon" onClick={onClose}>
                        ✕
                    </Button>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Assignment
                        </label>
                        <select
                            name="assignmentId"
                            value={formData.assignmentId}
                            onChange={onChange}
                            required
                            className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value={0}>Select assignment</option>
                            {assignments.map((assignment) => (
                                <option key={assignment.id} value={assignment.id}>
                                    {assignment.subjectName} — {assignment.teacherName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Day
                            </label>
                            <select
                                name="dayOfWeek"
                                value={formData.dayOfWeek}
                                onChange={onChange}
                                required
                                className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {DAYS.map((day) => (
                                    <option key={day} value={day}>
                                        {day}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Start time
                            </label>
                            <Input
                                type="time"
                                name="startTime"
                                value={formData.startTime}
                                onChange={onChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Duration hours
                            </label>
                            <Input
                                type="number"
                                name="durationHours"
                                value={formData.durationHours}
                                onChange={onChange}
                                min={1}
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Room
                            </label>
                            <select
                                name="roomId"
                                value={formData.roomId ?? ""}
                                onChange={onChange}
                                className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="">No room</option>
                                {rooms.map((room) => (
                                    <option key={room.id} value={room.id}>
                                        {room.name} — {room.type}, {room.capacity} seats
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit">Save</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}