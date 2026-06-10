"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";

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

import ExceptionsPicker, { type TimeException } from "./ExceptionsPicker";
import SplittingOptions from "./SplittingOptions";

interface AssignmentFormProps {
    initialAssignment?: AssignmentResponse | null;
    subjects: SubjectResponse[];
    teachers: TeacherResponse[];
    groups: StudyGroupResponse[];
    rooms: RoomResponse[];
    timeSlots: TimeSlot[];
    saving?: boolean;
    onSave: (data: AssignmentRequest | AssignmentRequest[]) => void | Promise<void>;
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

interface AssignmentRowState {
    id: string;
    subjectId: number;
    teacherId: number;
    groupIds: number[];
    hoursPerWeek: number | string;
    hoursSplitting: string;
    specificRoomId: number;
    roomTypeRequired: RoomType;
    shift: Shift;
    manualSplitting: boolean;
    exceptions: TimeException[];
    subjectOpen: boolean;
    subjectSearch: string;
    teacherOpen: boolean;
    teacherSearch: string;
    groupSearch: string;
    groupsOpen: boolean;
}

type RowDropdown = "subject" | "teacher" | "groups";

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

function createEmptyAssignmentRow(): AssignmentRowState {
    return {
        id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random()}`,
        subjectId: 0,
        teacherId: 0,
        groupIds: [],
        hoursPerWeek: 2,
        hoursSplitting: "2",
        specificRoomId: 0,
        roomTypeRequired: "ANY",
        shift: "MORNING",
        manualSplitting: false,
        exceptions: [],
        subjectOpen: false,
        subjectSearch: "",
        teacherOpen: false,
        teacherSearch: "",
        groupSearch: "",
        groupsOpen: false,
    };
}

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

function getDefaultSplitting(hoursPerWeek: number | string) {
    return generateSplittingOptions(Number(hoursPerWeek))[0] || "";
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
    const isEditing = Boolean(initialAssignment);
    const [formData, setFormData] = useState<FormState>(() =>
        getInitialFormState(initialAssignment),
    );
    const [assignmentRows, setAssignmentRows] = useState<AssignmentRowState[]>([
        createEmptyAssignmentRow(),
    ]);
    const [activeRowId, setActiveRowId] = useState<string | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState<{
        left: number;
        top: number;
        width: number;
    } | null>(null);
    const formRef = useRef<HTMLFormElement | null>(null);

    const [exceptions, setExceptions] = useState<TimeException[]>([]);
    const [manualSplitting, setManualSplitting] = useState(false);

    const [error, setError] = useState("");

    useEffect(() => {
        setActiveRowId((current) => {
            if (current && assignmentRows.some((row) => row.id === current)) {
                return current;
            }

            return assignmentRows[0]?.id || null;
        });
    }, [assignmentRows]);

    useEffect(() => {
        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as HTMLElement | null;

            if (target?.closest("[data-assignment-dropdown]")) return;

            setAssignmentRows((prev) =>
                prev.map((row) => ({
                    ...row,
                    subjectOpen: false,
                    teacherOpen: false,
                    groupsOpen: false,
                })),
            );
        };
        const handleScroll = () => {
            setAssignmentRows((prev) =>
                prev.map((row) => ({
                    ...row,
                    subjectOpen: false,
                    teacherOpen: false,
                    groupsOpen: false,
                })),
            );
        };

        document.addEventListener("pointerdown", handlePointerDown);
        window.addEventListener("scroll", handleScroll, true);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            window.removeEventListener("scroll", handleScroll, true);
        };
    }, []);

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
        setFormData(getInitialFormState(initialAssignment));
        setAssignmentRows([createEmptyAssignmentRow()]);
        setExceptions([]);
        setManualSplitting(false);
        setError("");
    }, [initialAssignment]);

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

    const updateAssignmentRow = (
        rowId: string,
        patch: Partial<Omit<AssignmentRowState, "id">>,
    ) => {
        setAssignmentRows((prev) =>
            prev.map((row) =>
                row.id === rowId
                    ? {
                        ...row,
                        ...patch,
                    }
                    : row,
            ),
        );

        setError("");
    };

    const handleRowNumberChange = (rowId: string, value: string) => {
        const hoursPerWeek = value === "" ? "" : Number(value);
        const hoursSplitting = getDefaultSplitting(hoursPerWeek);

        setAssignmentRows((prev) =>
            prev.map((row) =>
                row.id === rowId
                    ? {
                        ...row,
                        hoursPerWeek,
                        hoursSplitting: row.manualSplitting
                            ? row.hoursSplitting
                            : hoursSplitting,
                    }
                    : row,
            ),
        );

        setError("");
    };

    const openRowDropdown = (
        rowId: string,
        dropdown: RowDropdown,
        event: React.MouseEvent<HTMLButtonElement>,
    ) => {
        const rect = event.currentTarget.getBoundingClientRect();

        setDropdownPosition({
            left: rect.left,
            top: rect.bottom + 4,
            width: rect.width,
        });

        updateAssignmentRow(rowId, {
            subjectOpen: dropdown === "subject",
            teacherOpen: dropdown === "teacher",
            groupsOpen: dropdown === "groups",
        });
    };

    const handleToggleRowGroup = (rowId: string, groupId: number) => {
        setAssignmentRows((prev) =>
            prev.map((row) => {
                if (row.id !== rowId) return row;

                return {
                    ...row,
                    groupIds: row.groupIds.includes(groupId)
                        ? row.groupIds.filter((id) => id !== groupId)
                        : [...row.groupIds, groupId],
                };
            }),
        );

        setError("");
    };

    const handleSelectAllRowGroups = (rowId: string, groupIds: number[]) => {
        const ids = groupIds;

        setAssignmentRows((prev) =>
            prev.map((row) => {
                if (row.id !== rowId) return row;
                const everySelected = ids.every((id) => row.groupIds.includes(id));

                return {
                    ...row,
                    groupIds: everySelected
                        ? row.groupIds.filter((id) => !ids.includes(id))
                        : [...new Set([...ids, ...row.groupIds])],
                };
            }),
        );

        setError("");
    };

    const handleAddAssignmentRow = () => {
        const nextRow = createEmptyAssignmentRow();

        setAssignmentRows((prev) => [...prev, nextRow]);
        setActiveRowId(nextRow.id);
        setError("");
    };

    const handleRemoveAssignmentRow = (rowId: string) => {
        setAssignmentRows((prev) => {
            if (prev.length === 1) return prev;

            const nextRows = prev.filter((row) => row.id !== rowId);

            if (activeRowId === rowId) {
                setActiveRowId(nextRows[nextRows.length - 1]?.id || null);
            }

            return nextRows;
        });
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

        if (isEditing) {
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
        } else {
            const invalidRowIndex = assignmentRows.findIndex((row) => {
                const hoursPerWeek = Number(row.hoursPerWeek);
                const rowSplittingOptions = generateSplittingOptions(hoursPerWeek);

                return (
                    !row.subjectId ||
                    !row.teacherId ||
                    row.groupIds.length === 0 ||
                    !Number.isFinite(hoursPerWeek) ||
                    hoursPerWeek < 2 ||
                    (
                        row.manualSplitting
                            ? !isValidManualSplitting(row.hoursSplitting, hoursPerWeek)
                            : !rowSplittingOptions.includes(row.hoursSplitting)
                    )
                );
            });

            if (invalidRowIndex !== -1) {
                setError(`Complete all required fields for row ${invalidRowIndex + 1}`);
                return false;
            }

            return true;
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

        const commonPayload = {
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

        if (isEditing) {
            await onSave({
                ...commonPayload,
                subjectId: Number(formData.subjectId),
                teacherId: Number(formData.teacherId),
                groupIds: formData.groupIds,
            });
            return;
        }

        await onSave(
            assignmentRows.map((row) => ({
                subjectId: Number(row.subjectId),
                teacherId: Number(row.teacherId),
                groupIds: row.groupIds,
                hoursPerWeek: Number(row.hoursPerWeek),
                shift: row.shift,
                roomTypeRequired: row.roomTypeRequired,
                hoursSplitting: row.manualSplitting
                    ? parseSplittingParts(row.hoursSplitting).join("+")
                    : row.hoursSplitting,
                excludedTimeSlots:
                    buildExcludedTimeSlots(row.exceptions, timeSlots).length > 0
                        ? buildExcludedTimeSlots(row.exceptions, timeSlots)
                        : undefined,
                specificRoomId:
                    Number(row.specificRoomId) > 0
                        ? Number(row.specificRoomId)
                        : undefined,
            })),
        );
    };

    return (
        <form ref={formRef} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {isEditing ? (
                <>
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
                </>
            ) : (
                <section className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden pr-2">
                    <div className="space-y-2">
                        {assignmentRows.map((row, index) => {
                            const rowSplittingOptions = generateSplittingOptions(
                                Number(row.hoursPerWeek),
                            );
                            const selectedSubject = subjects.find(
                                (subject) => subject.id === row.subjectId,
                            );
                            const selectedTeacher = teachers.find(
                                (teacher) => teacher.id === row.teacherId,
                            );
                            const subjectQuery = row.subjectSearch.trim().toLowerCase();
                            const teacherQuery = row.teacherSearch.trim().toLowerCase();
                            const groupQuery = row.groupSearch.trim().toLowerCase();
                            const filteredSubjects = subjects.filter((subject) =>
                                `${subject.code} ${subject.name}`.toLowerCase().includes(subjectQuery),
                            );
                            const filteredTeachers = teachers.filter((teacher) =>
                                teacher.fullName.toLowerCase().includes(teacherQuery),
                            );
                            const filteredGroups = orderedGroups.filter((group) =>
                                group.name.toLowerCase().includes(groupQuery),
                            );
                            const filteredGroupIds = filteredGroups.map((group) => group.id);
                            const allRowGroupsSelected =
                                filteredGroupIds.length > 0 &&
                                filteredGroupIds.every((groupId) =>
                                    row.groupIds.includes(groupId),
                                );
                            const selectedGroupNames = row.groupIds
                                .map((groupId) => groups.find((group) => group.id === groupId)?.name)
                                .filter(Boolean);
                            const isActiveRow = row.id === activeRowId;

                            if (!isActiveRow) {
                                return (
                                    <div
                                        key={row.id}
                                        className="flex min-h-12 items-center gap-3 rounded-lg border border-border bg-background/70 px-3 py-2"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm font-medium">
                                                #{index + 1}{" "}
                                                {selectedSubject
                                                    ? `${selectedSubject.code} - ${selectedSubject.name}`
                                                    : "No subject"}
                                                {" · "}
                                                {selectedTeacher?.fullName || "No teacher"}
                                            </div>
                                            <div className="truncate text-xs text-muted-foreground">
                                                {selectedGroupNames.length > 0
                                                    ? selectedGroupNames.join(", ")
                                                    : "No groups"}
                                                {" · "}
                                                {row.hoursPerWeek}h
                                                {" · "}
                                                {row.manualSplitting ? "Manual" : row.hoursSplitting}
                                                {" · "}
                                                {row.shift}
                                                {" · "}
                                                {row.roomTypeRequired}
                                                {row.exceptions.length > 0
                                                    ? ` · ${row.exceptions.length} exception${row.exceptions.length === 1 ? "" : "s"}`
                                                    : ""}
                                            </div>
                                        </div>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => setActiveRowId(row.id)}
                                            aria-label="Edit assignment row"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => handleRemoveAssignmentRow(row.id)}
                                            disabled={saving || assignmentRows.length === 1}
                                            aria-label="Remove assignment row"
                                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={row.id}
                                    className="relative overflow-visible rounded-xl border border-border bg-background/60 p-3"
                                >
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <span className="text-xs font-semibold uppercase text-muted-foreground">
                                            #{index + 1}
                                        </span>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => handleRemoveAssignmentRow(row.id)}
                                            disabled={saving || assignmentRows.length === 1}
                                            aria-label="Remove assignment row"
                                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1.25fr)_minmax(0,1.65fr)_minmax(76px,.55fr)_minmax(0,.9fr)_minmax(0,.9fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
                                        <div className="relative min-w-0" data-assignment-dropdown>
                                            <label className="mb-2 block text-xs font-medium text-muted-foreground">
                                                Subject
                                            </label>
                                            <button
                                                type="button"
                                                className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 py-2 text-left text-sm shadow-sm"
                                                onClick={(event) => openRowDropdown(row.id, "subject", event)}
                                            >
                                                <span className="truncate">
                                                    {selectedSubject
                                                        ? `${selectedSubject.code} - ${selectedSubject.name}`
                                                        : "Select subject"}
                                                </span>
                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                            </button>
                                            {row.subjectOpen && dropdownPosition && createPortal(
                                                <div
                                                    data-assignment-dropdown
                                                    className="fixed z-[100] rounded-lg border border-border bg-popover p-2 shadow-xl"
                                                    style={{
                                                        left: dropdownPosition.left,
                                                        top: dropdownPosition.top,
                                                        width: dropdownPosition.width,
                                                    }}
                                                >
                                                    <Input
                                                        value={row.subjectSearch}
                                                        onChange={(event) =>
                                                            updateAssignmentRow(row.id, {
                                                                subjectSearch: event.target.value,
                                                            })
                                                        }
                                                        placeholder="Search subject"
                                                        className="mb-2"
                                                    />
                                                    <div className="custom-scrollbar max-h-48 overflow-y-auto">
                                                        {filteredSubjects.length === 0 ? (
                                                            <div className="px-2 py-2 text-sm text-muted-foreground">
                                                                No subjects found
                                                            </div>
                                                        ) : (
                                                            filteredSubjects.map((subject) => (
                                                                <button
                                                                    key={subject.id}
                                                                    type="button"
                                                                    className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
                                                                    onClick={() =>
                                                                        updateAssignmentRow(row.id, {
                                                                            subjectId: subject.id,
                                                                            subjectOpen: false,
                                                                            subjectSearch: "",
                                                                        })
                                                                    }
                                                                >
                                                                    {subject.code} - {subject.name}
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>,
                                                document.body,
                                            )}
                                        </div>

                                        <div className="relative min-w-0" data-assignment-dropdown>
                                            <label className="mb-2 block text-xs font-medium text-muted-foreground">
                                                Teacher
                                            </label>
                                            <button
                                                type="button"
                                                className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 py-2 text-left text-sm shadow-sm"
                                                onClick={(event) => openRowDropdown(row.id, "teacher", event)}
                                            >
                                                <span className="truncate">
                                                    {selectedTeacher?.fullName || "Select teacher"}
                                                </span>
                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                            </button>
                                            {row.teacherOpen && dropdownPosition && createPortal(
                                                <div
                                                    data-assignment-dropdown
                                                    className="fixed z-[100] rounded-lg border border-border bg-popover p-2 shadow-xl"
                                                    style={{
                                                        left: dropdownPosition.left,
                                                        top: dropdownPosition.top,
                                                        width: dropdownPosition.width,
                                                    }}
                                                >
                                                    <Input
                                                        value={row.teacherSearch}
                                                        onChange={(event) =>
                                                            updateAssignmentRow(row.id, {
                                                                teacherSearch: event.target.value,
                                                            })
                                                        }
                                                        placeholder="Search teacher"
                                                        className="mb-2"
                                                    />
                                                    <div className="custom-scrollbar max-h-48 overflow-y-auto">
                                                        {filteredTeachers.length === 0 ? (
                                                            <div className="px-2 py-2 text-sm text-muted-foreground">
                                                                No teachers found
                                                            </div>
                                                        ) : (
                                                            filteredTeachers.map((teacher) => (
                                                                <button
                                                                    key={teacher.id}
                                                                    type="button"
                                                                    className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
                                                                    onClick={() =>
                                                                        updateAssignmentRow(row.id, {
                                                                            teacherId: teacher.id,
                                                                            teacherOpen: false,
                                                                            teacherSearch: "",
                                                                        })
                                                                    }
                                                                >
                                                                    {teacher.fullName}
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>,
                                                document.body,
                                            )}
                                        </div>
                                        <div className="relative min-w-0" data-assignment-dropdown>
                                            <label className="mb-2 block text-xs font-medium text-muted-foreground">
                                                Groups
                                            </label>

                                            <button
                                                type="button"
                                                className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 py-2 text-left text-sm shadow-sm"
                                                onClick={(event) => openRowDropdown(row.id, "groups", event)}
                                            >
                                                <span className="truncate">
                                                    {row.groupIds.length > 0
                                                        ? `${row.groupIds.length} selected`
                                                        : "Select groups"}
                                                </span>
                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                            </button>

                                            {row.groupsOpen && dropdownPosition && createPortal(
                                                <div
                                                    data-assignment-dropdown
                                                    className="fixed z-[100] rounded-lg border border-border bg-popover p-2 shadow-xl"
                                                    style={{
                                                        left: dropdownPosition.left,
                                                        top: dropdownPosition.top,
                                                        width: dropdownPosition.width,
                                                    }}
                                                >
                                                    <Input
                                                        value={row.groupSearch}
                                                        onChange={(event) =>
                                                            updateAssignmentRow(row.id, {
                                                                groupSearch: event.target.value,
                                                            })
                                                        }
                                                        placeholder="Search groups"
                                                        className="mb-2"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="xs"
                                                        className="mb-2 w-full justify-start"
                                                        onClick={() =>
                                                            handleSelectAllRowGroups(row.id, filteredGroupIds)
                                                        }
                                                        disabled={saving || filteredGroupIds.length === 0}
                                                    >
                                                        {allRowGroupsSelected ? "Clear" : "Select all"}
                                                    </Button>
                                                    <div className="custom-scrollbar max-h-44 overflow-y-auto">
                                                        {filteredGroups.length === 0 ? (
                                                            <div className="px-2 py-2 text-sm text-muted-foreground">
                                                                No groups found
                                                            </div>
                                                        ) : (
                                                            filteredGroups.map((group) => {
                                                                const checked = row.groupIds.includes(group.id);

                                                                return (
                                                                    <label
                                                                        key={group.id}
                                                                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={checked}
                                                                            onChange={() =>
                                                                                handleToggleRowGroup(row.id, group.id)
                                                                            }
                                                                            className="h-4 w-4 rounded border-gray-300"
                                                                        />
                                                                        <span className="truncate font-medium">
                                                                            {group.name}
                                                                        </span>
                                                                    </label>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </div>,
                                                document.body,
                                            )}
                                        </div>

                                        <div className="min-w-0">
                                            <label className="mb-2 block text-xs font-medium text-muted-foreground">
                                                Hours
                                            </label>
                                            <Input
                                                type="number"
                                                min={2}
                                                value={row.hoursPerWeek}
                                                onChange={(event) =>
                                                    handleRowNumberChange(row.id, event.target.value)
                                                }
                                            />
                                        </div>

                                        <div className="min-w-0">
                                            <label className="mb-2 block text-xs font-medium text-muted-foreground">
                                                Split
                                            </label>
                                            <select
                                                value={row.manualSplitting ? "manual" : row.hoursSplitting}
                                                onChange={(event) => {
                                                    if (event.target.value === "manual") {
                                                        updateAssignmentRow(row.id, {
                                                            manualSplitting: true,
                                                            hoursSplitting:
                                                                row.hoursSplitting ||
                                                                rowSplittingOptions[0] ||
                                                                "",
                                                        });
                                                        return;
                                                    }

                                                    updateAssignmentRow(row.id, {
                                                        manualSplitting: false,
                                                        hoursSplitting: event.target.value,
                                                    });
                                                }}
                                                className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            >
                                                {rowSplittingOptions.length === 0 ? (
                                                    <option value="">No valid split</option>
                                                ) : (
                                                    rowSplittingOptions.map((option) => (
                                                        <option key={option} value={option}>
                                                            {option}
                                                        </option>
                                                    ))
                                                )}
                                                <option value="manual">Manual</option>
                                            </select>
                                            {row.manualSplitting && (
                                                <Input
                                                    value={row.hoursSplitting}
                                                    onChange={(event) =>
                                                        updateAssignmentRow(row.id, {
                                                            hoursSplitting: event.target.value,
                                                        })
                                                    }
                                                    placeholder="2+2+2"
                                                    className="mt-2"
                                                />
                                            )}
                                        </div>

                                        <div className="min-w-0">
                                            <label className="mb-2 block text-xs font-medium text-muted-foreground">
                                                Shift
                                            </label>
                                            <select
                                                value={row.shift}
                                                onChange={(event) =>
                                                    updateAssignmentRow(row.id, {
                                                        shift: event.target.value as Shift,
                                                    })
                                                }
                                                className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            >
                                                <option value="ANY">Any</option>
                                                <option value="MORNING">Morning</option>
                                                <option value="AFTERNOON">Afternoon</option>
                                            </select>
                                        </div>

                                        <div className="min-w-0">
                                            <label className="mb-2 block text-xs font-medium text-muted-foreground">
                                                Room type
                                            </label>
                                            <select
                                                value={row.roomTypeRequired}
                                                onChange={(event) =>
                                                    updateAssignmentRow(row.id, {
                                                        roomTypeRequired: event.target.value as RoomType,
                                                    })
                                                }
                                                className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            >
                                                <option value="ANY">Any</option>
                                                <option value="CLASSROOM">Classroom</option>
                                                <option value="COMPUTER_LAB">Computer lab</option>
                                            </select>
                                        </div>

                                        <div className="min-w-0">
                                            <label className="mb-2 block text-xs font-medium text-muted-foreground">
                                                Room
                                            </label>
                                            <select
                                                value={row.specificRoomId}
                                                onChange={(event) =>
                                                    updateAssignmentRow(row.id, {
                                                        specificRoomId: Number(event.target.value),
                                                    })
                                                }
                                                className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            >
                                                <option value={0}>No preference</option>
                                                {rooms.map((room) => (
                                                    <option key={room.id} value={room.id}>
                                                        {room.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="mt-4 border-t border-border pt-4">
                                        <ExceptionsPicker
                                            value={row.exceptions}
                                            timeSlots={timeSlots}
                                            compact
                                            onChange={(nextValue) => {
                                                updateAssignmentRow(row.id, {
                                                    exceptions: nextValue,
                                                });
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                </section>
            )}

            {isEditing && (
                <>
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
                </>
            )}

            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="mt-3 shrink-0 border-t border-border bg-card pt-3">
                <div className="flex items-center justify-between gap-3">
                    {isEditing ? (
                        <span />
                    ) : (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 min-w-52"
                            onClick={handleAddAssignmentRow}
                            disabled={saving}
                        >
                            <Plus className="h-4 w-4" />
                            Add assignment
                        </Button>
                    )}

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onCancel}
                            disabled={saving}
                        >
                            Cancel
                        </Button>

                        <Button type="submit" size="sm" disabled={saving}>
                            {saving
                                ? "Saving..."
                                : isEditing
                                    ? "Save"
                                    : `Create ${assignmentRows.length} assignment${assignmentRows.length === 1 ? "" : "s"}`}
                        </Button>
                    </div>
                </div>
            </div>
        </form>
    );
}
