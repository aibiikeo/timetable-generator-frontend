"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarPlus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
    AssignmentResponse,
    DayOfWeek,
    LessonRequest,
    LessonResponse,
    RoomResponse,
    TimeSlot,
} from "@/lib/types";
import { DAYS_OF_WEEK } from "@/lib/constants";

interface LessonFormInitialValues {
    assignmentId?: number;
    dayOfWeek?: DayOfWeek;
    startTime?: string;
    durationHours?: number;
    roomId?: number;
    groupName?: string;
}

interface LessonFormModalProps {
    open: boolean;
    title: string;
    assignments: AssignmentResponse[];
    rooms: RoomResponse[];
    timeSlots: TimeSlot[];
    existingLessons?: LessonResponse[];
    initialValues?: LessonFormInitialValues;
    lesson?: LessonResponse | null;
    saving?: boolean;
    onClose: () => void;
    onSave: (data: LessonRequest) => void | Promise<void>;
    onDeleteConflictingLesson?: (lesson: LessonResponse) => void;
}

const DAYS = DAYS_OF_WEEK.filter((day) => day !== "SUNDAY");

function formatTime(time: string) {
    return time.substring(0, 5);
}

function sortTimeSlots(timeSlots: TimeSlot[]) {
    return [...timeSlots].sort((a, b) => {
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        if (orderA !== orderB) return orderA - orderB;
        return formatTime(a.startTime).localeCompare(formatTime(b.startTime));
    });
}

function getRoomLabel(room: RoomResponse) {
    return `${room.name} - ${room.type} - ${room.capacity} seats`;
}

function normalizeStatus(status?: string | null) {
    return String(status || "").toUpperCase();
}

function assignmentIsUnplacedOrPartial(assignment: AssignmentResponse) {
    const status = normalizeStatus(assignment.placementStatus);
    return (
        assignment.requiresManualInput ||
        status === "PARTIAL" ||
        status === "UNPLACED" ||
        status === "FAILED" ||
        status === "PENDING" ||
        status === "MANUAL_REQUIRED" ||
        status === "UNSCHEDULED"
    );
}

function getAssignmentLabel(assignment: AssignmentResponse) {
    const groups = assignment.groupNames.join(", ");
    return `${assignment.subjectName} - ${assignment.teacherName}${groups ? ` - ${groups}` : ""}`;
}

function getInitialAssignmentId(
    lesson?: LessonResponse | null,
    initialValues?: LessonFormInitialValues,
) {
    if (initialValues?.assignmentId) return initialValues.assignmentId;
    if (lesson?.assignmentId) return lesson.assignmentId;
    return 0;
}

function getInitialStartTime(
    timeSlots: TimeSlot[],
    lesson?: LessonResponse | null,
    initialValues?: LessonFormInitialValues,
) {
    if (initialValues?.startTime) return formatTime(initialValues.startTime);
    if (lesson?.startTime) return formatTime(lesson.startTime);
    return timeSlots[0]?.startTime ? formatTime(timeSlots[0].startTime) : "";
}

function getInitialDuration(
    lesson?: LessonResponse | null,
    initialValues?: LessonFormInitialValues,
) {
    if (initialValues?.durationHours) return initialValues.durationHours;
    if (lesson?.durationHours) return lesson.durationHours;
    return 1;
}

function getInitialDay(
    lesson?: LessonResponse | null,
    initialValues?: LessonFormInitialValues,
) {
    if (initialValues?.dayOfWeek) return initialValues.dayOfWeek;
    if (lesson?.dayOfWeek) return lesson.dayOfWeek;
    return "MONDAY";
}

function getInitialRoomId(
    rooms: RoomResponse[],
    lesson?: LessonResponse | null,
    initialValues?: LessonFormInitialValues,
) {
    if (initialValues?.roomId) return initialValues.roomId;
    if (lesson?.roomName) return rooms.find((room) => room.name === lesson.roomName)?.id ?? 0;
    return 0;
}

function getSlotIndex(slots: TimeSlot[], startTime: string) {
    return slots.findIndex((slot) => formatTime(slot.startTime) === formatTime(startTime));
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
    return aStart < bEnd && bStart < aEnd;
}

export default function LessonFormModal({
    open,
    title,
    assignments,
    rooms,
    timeSlots,
    existingLessons = [],
    initialValues,
    lesson,
    saving = false,
    onClose,
    onSave,
    onDeleteConflictingLesson,
}: LessonFormModalProps) {
    const sortedSlots = useMemo(() => sortTimeSlots(timeSlots), [timeSlots]);

    const [assignmentId, setAssignmentId] = useState(0);
    const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>("MONDAY");
    const [startTime, setStartTime] = useState("");
    const [durationHours, setDurationHours] = useState<number | string>(1);
    const [roomId, setRoomId] = useState<number>(0);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!open) return;

        setAssignmentId(getInitialAssignmentId(lesson, initialValues));
        setDayOfWeek(getInitialDay(lesson, initialValues));
        setStartTime(getInitialStartTime(sortedSlots, lesson, initialValues));
        setDurationHours(getInitialDuration(lesson, initialValues));
        setRoomId(getInitialRoomId(rooms, lesson, initialValues));
        setError("");
    }, [initialValues, lesson, open, rooms, sortedSlots]);

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !saving) onClose();
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [open, onClose, saving]);

    const selectedAssignment = assignments.find((assignment) => assignment.id === assignmentId);

    const filteredAssignments = useMemo(() => {
        const groupName = initialValues?.groupName;
        const byGroup = groupName
            ? assignments.filter((assignment) => assignment.groupNames.includes(groupName))
            : assignments;

        if (lesson) return byGroup;

        const unplaced = byGroup.filter(assignmentIsUnplacedOrPartial);
        return unplaced.length > 0 ? unplaced : byGroup;
    }, [assignments, initialValues?.groupName, lesson]);

    const conflictingLessons = useMemo(() => {
        if (!selectedAssignment || !dayOfWeek || !startTime) return [];

        const selectedSlotIndex = getSlotIndex(sortedSlots, startTime);
        const duration = Number(durationHours);
        if (selectedSlotIndex < 0 || !Number.isFinite(duration) || duration < 1) return [];

        const selectedStart = selectedSlotIndex;
        const selectedEnd = selectedSlotIndex + duration;
        const targetGroups = new Set(selectedAssignment.groupNames);

        return existingLessons.filter((item) => {
            if (lesson && item.id === lesson.id) return false;
            if (item.dayOfWeek !== dayOfWeek) return false;
            if (!item.groupNames.some((groupName) => targetGroups.has(groupName))) return false;

            const itemStart = getSlotIndex(sortedSlots, item.startTime);
            if (itemStart < 0) return false;

            const itemDuration = Number(item.durationHours);
            const itemEnd = itemStart + (Number.isFinite(itemDuration) && itemDuration > 0 ? itemDuration : 1);

            return rangesOverlap(selectedStart, selectedEnd, itemStart, itemEnd);
        });
    }, [dayOfWeek, durationHours, existingLessons, lesson, selectedAssignment, sortedSlots, startTime]);

    const availableDuration = useMemo(() => {
        if (!selectedAssignment || !startTime) return 1;

        const selectedSlotIndex = getSlotIndex(sortedSlots, startTime);
        if (selectedSlotIndex < 0) return 1;

        const targetGroups = new Set(selectedAssignment.groupNames);
        const nextLessonStart = existingLessons
            .filter((item) => {
                if (lesson && item.id === lesson.id) return false;
                if (item.dayOfWeek !== dayOfWeek) return false;
                if (!item.groupNames.some((groupName) => targetGroups.has(groupName))) return false;
                return getSlotIndex(sortedSlots, item.startTime) > selectedSlotIndex;
            })
            .map((item) => getSlotIndex(sortedSlots, item.startTime))
            .filter((index) => index > selectedSlotIndex)
            .sort((a, b) => a - b)[0];

        const untilNext = nextLessonStart ? nextLessonStart - selectedSlotIndex : sortedSlots.length - selectedSlotIndex;
        return Math.max(1, untilNext);
    }, [dayOfWeek, existingLessons, lesson, selectedAssignment, sortedSlots, startTime]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!assignmentId) {
            setError("Please select assignment");
            return;
        }

        if (!dayOfWeek) {
            setError("Please select day");
            return;
        }

        if (!startTime) {
            setError("Please select start time");
            return;
        }

        if (Number(durationHours) < 1) {
            setError("Duration must be at least 1 slot");
            return;
        }

        if (conflictingLessons.length > 0) {
            setError("Selected time overlaps with an existing lesson. Use available duration or remove the conflicting lesson first.");
            return;
        }

        try {
            setError("");
            await onSave({
                assignmentId,
                dayOfWeek,
                startTime,
                durationHours: Number(durationHours),
                roomId: roomId > 0 ? roomId : undefined,
            });
        } catch (err) {
            setError(err instanceof Error && err.message ? err.message : "Failed to save lesson");
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Close lesson form"
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => {
                    if (!saving) onClose();
                }}
            />

            <div className="glass-card relative z-10 w-full max-w-2xl rounded-2xl bg-card p-6 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <CalendarPlus className="h-5 w-5" />
                        </div>
                        <h3 className="text-lg font-semibold">{title}</h3>
                    </div>

                    <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={saving} aria-label="Close lesson form">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {error && (
                    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                        {error}
                    </div>
                )}

                {conflictingLessons.length > 0 && (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        <div className="flex items-start gap-2 font-medium">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            This time overlaps with existing lesson(s).
                        </div>
                        <div className="mt-2 space-y-2">
                            {conflictingLessons.map((conflict) => (
                                <div key={conflict.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/70 px-3 py-2">
                                    <span className="min-w-0 truncate">
                                        {conflict.subjectName} - {formatTime(conflict.startTime)} - {conflict.durationHours} slot(s)
                                    </span>
                                    {onDeleteConflictingLesson && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => onDeleteConflictingLesson(conflict)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="mt-3"
                            onClick={() => setDurationHours(availableDuration)}
                        >
                            Use free duration: {availableDuration} slot(s)
                        </Button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium">Assignment</label>
                        <select
                            value={assignmentId}
                            onChange={(event) => setAssignmentId(Number(event.target.value))}
                            disabled={saving}
                            required
                            className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <option value={0}>Select unplaced assignment</option>
                            {filteredAssignments.map((assignment) => (
                                <option key={assignment.id} value={assignment.id}>
                                    {getAssignmentLabel(assignment)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <label className="mb-2 block text-sm font-medium">Day</label>
                            <select
                                value={dayOfWeek}
                                onChange={(event) => setDayOfWeek(event.target.value as DayOfWeek)}
                                disabled={saving}
                                required
                                className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {DAYS.map((day) => <option key={day} value={day}>{day}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">Start time</label>
                            <select
                                value={startTime}
                                onChange={(event) => setStartTime(event.target.value)}
                                disabled={saving}
                                required
                                className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <option value="">Select time</option>
                                {sortedSlots.map((slot) => (
                                    <option key={slot.id} value={formatTime(slot.startTime)}>
                                        {formatTime(slot.startTime)}-{formatTime(slot.endTime)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">Duration</label>
                            <Input
                                type="number"
                                min={1}
                                max={4}
                                value={durationHours}
                                onChange={(event) => setDurationHours(event.target.value === "" ? "" : Number(event.target.value))}
                                disabled={saving}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">Room</label>
                        <select
                            value={roomId}
                            onChange={(event) => setRoomId(Number(event.target.value))}
                            disabled={saving}
                            className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <option value={0}>No room</option>
                            {rooms.map((room) => <option key={room.id} value={room.id}>{getRoomLabel(room)}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
                        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save lesson"}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
