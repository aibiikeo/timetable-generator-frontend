"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
    AssignmentResponse,
    RoomResponse,
    StudyGroupResponse,
    SubjectResponse,
    TeacherResponse,
    TimeSlot,
} from "@/lib/types";

import ExceptionsPicker, { TimeException } from "./ExceptionsPicker";
import SplittingOptions, { SplittingConfig } from "./SplittingOptions";

interface AssignmentFormProps {
    initialAssignment?: AssignmentResponse | null;
    subjects: SubjectResponse[];
    teachers: TeacherResponse[];
    groups: StudyGroupResponse[];
    rooms: RoomResponse[];
    timeSlots: TimeSlot[];
    saving?: boolean;
    onSave: (data: unknown) => void | Promise<void>;
    onCancel: () => void;
}

interface FormState {
    subjectId: number;
    teacherId: number;
    groupIds: number[];
    hoursPerWeek: number | string;
    durationHours: number | string;
    preferredRoomId: number;
    roomTypeRequired: string;
    shift: string;
}

const EMPTY_FORM: FormState = {
    subjectId: 0,
    teacherId: 0,
    groupIds: [],
    hoursPerWeek: 2,
    durationHours: 2,
    preferredRoomId: 0,
    roomTypeRequired: "ANY",
    shift: "MORNING",
};

const DEFAULT_SPLITTING: SplittingConfig = {
    enabled: false,
    minPartHours: 2,
    maxPartHours: 2,
    allowDifferentDays: true,
};

function getInitialFormState(initialAssignment?: AssignmentResponse | null): FormState {
    if (!initialAssignment) return EMPTY_FORM;

    const unsafe = initialAssignment as unknown as {
        subjectId?: number;
        teacherId?: number;
        groupIds?: number[];
        hoursPerWeek?: number;
        durationHours?: number;
        preferredRoomId?: number;
        roomTypeRequired?: string;
        roomType?: string;
        shift?: string;
    };

    return {
        subjectId: unsafe.subjectId ?? 0,
        teacherId: unsafe.teacherId ?? 0,
        groupIds: unsafe.groupIds ?? [],
        hoursPerWeek: unsafe.hoursPerWeek ?? 2,
        durationHours:
            unsafe.durationHours && unsafe.durationHours >= 2
                ? unsafe.durationHours
                : 2,
        preferredRoomId: unsafe.preferredRoomId ?? 0,
        roomTypeRequired: unsafe.roomTypeRequired ?? unsafe.roomType ?? "ANY",
        shift: unsafe.shift ?? "MORNING",
    };
}

export default function AssignmentForm({
                                           initialAssignment,
                                           subjects,
                                           teachers,
                                           groups,
                                           rooms,
                                           timeSlots,
                                           saving = false,
                                           onSave,
                                           onCancel,
                                       }: AssignmentFormProps) {
    const [formData, setFormData] = useState<FormState>(() =>
        getInitialFormState(initialAssignment),
    );

    const [exceptions, setExceptions] = useState<TimeException[]>([]);
    const [splitting, setSplitting] =
        useState<SplittingConfig>(DEFAULT_SPLITTING);

    const [error, setError] = useState("");

    const selectedSubject = useMemo(() => {
        return subjects.find((subject) => subject.id === formData.subjectId);
    }, [subjects, formData.subjectId]);

    const orderedGroups = useMemo(() => {
        if (!selectedSubject?.majorId) {
            return [...groups].sort((a, b) => a.name.localeCompare(b.name));
        }

        const subjectMajorId = selectedSubject.majorId;

        return [...groups].sort((a, b) => {
            const aMatches = a.majorId === subjectMajorId;
            const bMatches = b.majorId === subjectMajorId;

            if (aMatches && !bMatches) return -1;
            if (!aMatches && bMatches) return 1;

            return a.name.localeCompare(b.name);
        });
    }, [groups, selectedSubject]);

    const selectedGroupsCount = formData.groupIds.length;
    const allGroupsSelected =
        orderedGroups.length > 0 &&
        selectedGroupsCount === orderedGroups.length;

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
        const { name, value, type } = e.target;

        setFormData((prev) => {
            const nextValue =
                type === "number" ||
                name === "subjectId" ||
                name === "teacherId" ||
                name === "preferredRoomId"
                    ? value === ""
                        ? ""
                        : Number(value)
                    : value;

            return {
                ...prev,
                [name]: nextValue,
            };
        });

        setError("");
    };

    const handleToggleGroup = (groupId: number) => {
        setFormData((prev) => ({
            ...prev,
            groupIds: prev.groupIds.includes(groupId)
                ? prev.groupIds.filter((id) => id !== groupId)
                : [...prev.groupIds, groupId],
        }));

        setError("");
    };

    const handleSelectAllGroups = () => {
        const ids = orderedGroups.map((group) => group.id);

        setFormData((prev) => ({
            ...prev,
            groupIds: allGroupsSelected ? [] : ids,
        }));

        setError("");
    };

    const validateForm = () => {
        const hoursPerWeek = Number(formData.hoursPerWeek);
        const durationHours = Number(formData.durationHours);

        if (!formData.subjectId) {
            setError("Please select a subject");
            return false;
        }

        if (!formData.teacherId) {
            setError("Please select a teacher");
            return false;
        }

        if (formData.groupIds.length === 0) {
            setError("Please select at least one group");
            return false;
        }

        if (!Number.isFinite(hoursPerWeek) || hoursPerWeek < 2) {
            setError("Hours per week must be at least 2 slots");
            return false;
        }

        if (!Number.isFinite(durationHours) || durationHours < 2) {
            setError(
                "Generated lessons must take at least 2 slots. Use manual placement if you need 1 slot.",
            );
            return false;
        }

        if (durationHours > hoursPerWeek) {
            setError("Lesson duration cannot be greater than hours per week");
            return false;
        }

        if (!formData.roomTypeRequired) {
            setError("Please select required room type");
            return false;
        }

        if (!formData.shift) {
            setError("Please select shift");
            return false;
        }

        if (splitting.enabled && Number(splitting.minPartHours) < 2) {
            setError(
                "Generated split parts must take at least 2 slots. One-slot lessons are only for manual placement.",
            );
            return false;
        }

        if (splitting.enabled && Number(splitting.maxPartHours) < 2) {
            setError("Maximum split hours must be at least 2 slots");
            return false;
        }

        if (
            splitting.enabled &&
            Number(splitting.minPartHours) > Number(splitting.maxPartHours)
        ) {
            setError("Minimum split hours cannot be greater than maximum split hours");
            return false;
        }

        if (
            splitting.enabled &&
            Number(splitting.maxPartHours) > hoursPerWeek
        ) {
            setError("Maximum split hours cannot be greater than hours per week");
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        const payload = {
            subjectId: Number(formData.subjectId),
            teacherId: Number(formData.teacherId),
            groupIds: formData.groupIds,
            hoursPerWeek: Number(formData.hoursPerWeek),
            durationHours: Number(formData.durationHours),

            preferredRoomId:
                Number(formData.preferredRoomId) > 0
                    ? Number(formData.preferredRoomId)
                    : undefined,

            roomTypeRequired: formData.roomTypeRequired,
            shift: formData.shift,

            unavailableSlots: exceptions,

            splittingOptions: splitting.enabled
                ? {
                    minPartHours: Number(splitting.minPartHours),
                    maxPartHours: Number(splitting.maxPartHours),
                    allowDifferentDays: splitting.allowDifferentDays,
                }
                : undefined,
        };

        await onSave(payload);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="mb-2 block text-sm font-medium">
                    Subject
                </label>

                <select
                    name="subjectId"
                    value={formData.subjectId}
                    onChange={handleChange}
                    required
                    className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <option value={0}>Select subject</option>

                    {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                            {subject.code} — {subject.name}
                        </option>
                    ))}
                </select>

                {selectedSubject && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                        Major: {selectedSubject.majorName || "Unknown"}
                    </p>
                )}
            </div>

            <div>
                <label className="mb-2 block text-sm font-medium">
                    Teacher
                </label>

                <select
                    name="teacherId"
                    value={formData.teacherId}
                    onChange={handleChange}
                    required
                    className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <option value={0}>Select teacher</option>

                    {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                            {teacher.fullName}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                        <label className="block text-sm font-medium">
                            Groups
                        </label>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {selectedGroupsCount} selected
                            {selectedSubject?.majorName
                                ? ` · ${selectedSubject.majorName} groups are shown first`
                                : ""}
                        </p>
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleSelectAllGroups}
                        disabled={orderedGroups.length === 0}
                    >
                        {allGroupsSelected ? "Clear" : "Select all"}
                    </Button>
                </div>

                <div className="custom-scrollbar max-h-56 overflow-y-auto rounded-2xl border border-border p-3">
                    {orderedGroups.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No groups available.
                        </p>
                    ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                            {orderedGroups.map((group) => {
                                const checked = formData.groupIds.includes(group.id);
                                const isRecommended =
                                    Boolean(selectedSubject?.majorId) &&
                                    group.majorId === selectedSubject?.majorId;

                                return (
                                    <label
                                        key={group.id}
                                        className={
                                            isRecommended
                                                ? "flex cursor-pointer items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm transition-colors hover:bg-blue-100"
                                                : "flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm transition-colors hover:bg-accent"
                                        }
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => handleToggleGroup(group.id)}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />

                                        <span className="font-medium">
                                            {group.name}
                                        </span>

                                        <span className="text-xs text-muted-foreground">
                                            {group.studentCount}
                                        </span>

                                        {isRecommended && (
                                            <Badge
                                                variant="info"
                                                className="ml-auto shrink-0"
                                            >
                                                Major
                                            </Badge>
                                        )}
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>

                {formData.groupIds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {formData.groupIds.map((groupId) => {
                            const group = groups.find((item) => item.id === groupId);

                            return (
                                <Badge key={groupId} variant="outline">
                                    {group?.name || `#${groupId}`}
                                </Badge>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label className="mb-2 block text-sm font-medium">
                        Hours per week
                    </label>

                    <Input
                        type="number"
                        name="hoursPerWeek"
                        min={2}
                        value={formData.hoursPerWeek}
                        onChange={handleChange}
                        required
                    />

                    <p className="mt-1.5 text-xs text-muted-foreground">
                        Total generated slots per week.
                    </p>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium">
                        Lesson duration
                    </label>

                    <Input
                        type="number"
                        name="durationHours"
                        min={2}
                        value={formData.durationHours}
                        onChange={handleChange}
                        required
                    />

                    <p className="mt-1.5 text-xs text-muted-foreground">
                        Generated lessons use at least 2 slots.
                    </p>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <div>
                    <label className="mb-2 block text-sm font-medium">
                        Required room type
                    </label>

                    <select
                        name="roomTypeRequired"
                        value={formData.roomTypeRequired}
                        onChange={handleChange}
                        required
                        className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <option value="ANY">Any</option>
                        <option value="CLASSROOM">Classroom</option>
                        <option value="COMPUTER_LAB">Computer lab</option>
                    </select>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium">
                        Shift
                    </label>

                    <select
                        name="shift"
                        value={formData.shift}
                        onChange={handleChange}
                        required
                        className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <option value="MORNING">Morning</option>
                        <option value="AFTERNOON">Afternoon</option>
                        <option value="EVENING">Evening</option>
                    </select>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium">
                        Preferred room
                    </label>

                    <select
                        name="preferredRoomId"
                        value={formData.preferredRoomId}
                        onChange={handleChange}
                        className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <option value={0}>No preference</option>

                        {rooms.map((room) => (
                            <option key={room.id} value={room.id}>
                                {room.name} — {room.type}, {room.capacity} seats
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <SplittingOptions
                value={splitting}
                onChange={(nextValue) => {
                    setSplitting(nextValue);
                    setError("");
                }}
            />

            <ExceptionsPicker
                value={exceptions}
                timeSlots={timeSlots}
                onChange={(nextValue) => {
                    setExceptions(nextValue);
                    setError("");
                }}
            />

            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={saving}
                >
                    Cancel
                </Button>

                <Button type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                </Button>
            </div>
        </form>
    );
}