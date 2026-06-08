"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
    AssignmentRequest,
    AssignmentResponse,
    RoomResponse,
    RoomType,
    Shift,
    StudyGroupResponse,
    SubjectResponse,
    TeacherResponse,
    TimeSlot,
    TimeSlotExclusion,
} from "@/lib/types";
import { generateSplittingOptions } from "@/lib/splitting";

import ExceptionsPicker, { TimeException } from "./ExceptionsPicker";
import SplittingOptions from "./SplittingOptions";

interface AssignmentFormProps {
    initialAssignment?: AssignmentResponse | null;
    subjects: SubjectResponse[];
    teachers: TeacherResponse[];
    groups: StudyGroupResponse[];
    rooms: RoomResponse[];
    timeSlots: TimeSlot[];
    saving?: boolean;
    onSave: (data: AssignmentRequest) => void | Promise<void>;
    onCancel: () => void;
}

interface FormState {
    subjectId: number;
    teacherId: number;
    groupIds: number[];
    hoursPerWeek: number | string;
    hoursSplitting: string;
    specificRoomId: number;
    roomTypeRequired: RoomType;
    shift: Shift;
}

const EMPTY_FORM: FormState = {
    subjectId: 0,
    teacherId: 0,
    groupIds: [],
    hoursPerWeek: 2,
    hoursSplitting: "2",
    specificRoomId: 0,
    roomTypeRequired: "ANY",
    shift: "MORNING",
};

function getInitialFormState(initialAssignment?: AssignmentResponse | null): FormState {
    if (!initialAssignment) return EMPTY_FORM;

    return {
        subjectId: initialAssignment.subjectId ?? 0,
        teacherId: initialAssignment.teacherId ?? 0,
        groupIds: initialAssignment.groupIds ?? [],
        hoursPerWeek: initialAssignment.hoursPerWeek ?? 2,
        hoursSplitting: normalizeSplitting(
            initialAssignment.hoursSplitting ||
            String(initialAssignment.hoursPerWeek ?? 2),
        ),
        specificRoomId: initialAssignment.specificRoomId ?? 0,
        roomTypeRequired: initialAssignment.roomTypeRequired ?? "ANY",
        shift: initialAssignment.shift ?? "MORNING",
    };
}

function normalizeSplitting(value: string): string {
    return value
        .split("+")
        .map((part) => Number(part.trim()))
        .filter((part) => Number.isFinite(part) && part > 0)
        .sort((a, b) => b - a)
        .join("+");
}

function parseSplittingParts(value: string): number[] {
    if (!/^\s*\d+(\s*\+\s*\d+)*\s*$/.test(value)) return [];

    return value
        .split("+")
        .map((part) => Number(part.trim()))
        .filter((part) => Number.isFinite(part));
}

function isValidManualSplitting(value: string, total: number): boolean {
    const parts = parseSplittingParts(value);

    return (
        parts.length > 0 &&
        parts.every((part) => [2, 3, 4].includes(part)) &&
        parts.reduce((sum, part) => sum + part, 0) === total
    );
}

function buildExcludedTimeSlots(
    exceptions: TimeException[],
    timeSlots: TimeSlot[],
): TimeSlotExclusion[] {
    return exceptions
        .map((exception) => {
            const timeSlot = timeSlots.find(
                (slot) => slot.id === exception.timeSlotId,
            );

            if (!timeSlot) return null;

            return {
                day: exception.dayOfWeek,
                startTime: timeSlot.startTime,
                endTime: timeSlot.endTime,
            };
        })
        .filter((item): item is TimeSlotExclusion => item !== null);
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
    const [manualSplitting, setManualSplitting] = useState(false);

    const [error, setError] = useState("");

    const orderedGroups = useMemo(() => {
        return [...groups].sort((a, b) => a.name.localeCompare(b.name));
    }, [groups]);

    const selectedGroupsCount = formData.groupIds.length;
    const allGroupsSelected =
        orderedGroups.length > 0 &&
        selectedGroupsCount === orderedGroups.length;
    const splittingOptions = useMemo(() => {
        return generateSplittingOptions(Number(formData.hoursPerWeek));
    }, [formData.hoursPerWeek]);

    useEffect(() => {
        if (manualSplitting) return;

        if (splittingOptions.length === 0) {
            setFormData((prev) => ({
                ...prev,
                hoursSplitting: "",
            }));
            return;
        }

        setFormData((prev) => {
            const current = normalizeSplitting(prev.hoursSplitting);

            if (splittingOptions.includes(current)) {
                return {
                    ...prev,
                    hoursSplitting: current,
                };
            }

            return {
                ...prev,
                hoursSplitting: splittingOptions[0],
            };
        });
    }, [manualSplitting, splittingOptions]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
        const { name, value, type } = e.target;

        setFormData((prev) => {
            const nextValue =
                type === "number" ||
                name === "subjectId" ||
                name === "teacherId" ||
                name === "specificRoomId"
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

        if (!formData.roomTypeRequired) {
            setError("Please select required room type");
            return false;
        }

        if (!formData.shift) {
            setError("Please select shift");
            return false;
        }

        if (manualSplitting) {
            if (!isValidManualSplitting(formData.hoursSplitting, hoursPerWeek)) {
                setError("Manual split must use 2, 3 or 4 and match weekly hours, for example 2+2+2");
                return false;
            }
        } else if (!splittingOptions.includes(formData.hoursSplitting)) {
            setError("Please select a valid lesson split");
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        const hoursPerWeek = Number(formData.hoursPerWeek);
        const hoursSplitting = manualSplitting
            ? parseSplittingParts(formData.hoursSplitting).join("+")
            : formData.hoursSplitting;

        const excludedTimeSlots = buildExcludedTimeSlots(exceptions, timeSlots);

        const payload: AssignmentRequest = {
            subjectId: Number(formData.subjectId),
            teacherId: Number(formData.teacherId),
            groupIds: formData.groupIds,
            hoursPerWeek,
            shift: formData.shift,
            roomTypeRequired: formData.roomTypeRequired,
            hoursSplitting,
            excludedTimeSlots:
                excludedTimeSlots.length > 0 ? excludedTimeSlots : undefined,
            specificRoomId:
                Number(formData.specificRoomId) > 0
                    ? Number(formData.specificRoomId)
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
                    value={formData.subjectId ?? 0}
                    onChange={handleChange}
                    required
                    className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <option value={0}>Select subject</option>

                    {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                            {subject.code} - {subject.name}
                        </option>
                    ))}
                </select>


            </div>

            <div>
                <label className="mb-2 block text-sm font-medium">
                    Teacher
                </label>

                <select
                    name="teacherId"
                    value={formData.teacherId ?? 0}
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

                                return (
                                    <label
                                        key={group.id}
                                        className="flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm transition-colors hover:bg-accent"
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
                </div>

                <SplittingOptions
                    options={splittingOptions}
                    value={formData.hoursSplitting}
                    manual={manualSplitting}
                    onChange={(nextValue) => {
                        setFormData((prev) => ({
                            ...prev,
                            hoursSplitting: nextValue,
                        }));
                        setError("");
                    }}
                    onManualChange={(nextValue) => {
                        setFormData((prev) => ({
                            ...prev,
                            hoursSplitting: nextValue,
                        }));
                        setError("");
                    }}
                    onManualToggle={(nextManual) => {
                        setManualSplitting(nextManual);
                        setFormData((prev) => ({
                            ...prev,
                            hoursSplitting: nextManual
                                ? prev.hoursSplitting || splittingOptions[0] || ""
                                : splittingOptions[0] || "",
                        }));
                        setError("");
                    }}
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <div>
                    <label className="mb-2 block text-sm font-medium">
                        Required room type
                    </label>

                    <select
                        name="roomTypeRequired"
                        value={formData.roomTypeRequired ?? "ANY"}
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
                        value={formData.shift ?? "ANY"}
                        onChange={handleChange}
                        required
                        className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <option value="ANY">Any</option>
                        <option value="MORNING">Morning</option>
                        <option value="AFTERNOON">Afternoon</option>
                    </select>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium">
                        Preferred room
                    </label>

                    <select
                        name="specificRoomId"
                        value={formData.specificRoomId ?? 0}
                        onChange={handleChange}
                        className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <option value={0}>No preference</option>

                        {rooms.map((room) => (
                            <option key={room.id} value={room.id}>
                                {room.name} - {room.type}, {room.capacity} seats
                            </option>
                        ))}
                    </select>
                </div>
            </div>

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
