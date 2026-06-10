"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import {
    ArrowLeft,
    Archive,
    ClipboardList,
    FileDown,
    Loader2,
    Minus,
    Play,
    Plus,
    Send,
    Square,
    Trash2,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DeleteModeDialog } from "@/components/ui/delete-mode-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
    assignmentApi,
    compactGroups,
    departmentApi,
    facultyApi,
    formatAssignment,
    formatLesson,
    formatLunch,
    getApiErrorMessage,
    getDeleteRelatedRecordsMessage,
    groupApi,
    lessonApi,
    lunchApi,
    roomApi,
    subjectApi,
    teacherApi,
    timeSlotApi,
    timetableApi,
    uniqueItems,
} from "@/lib";
import { DAYS_OF_WEEK } from "@/lib/constants";
import type {
    AssignmentRequest,
    AssignmentResponse,
    DayOfWeek,
    DeleteMode,
    FacultyResponse,
    GenerationMode,
    GenerationResponse,
    LessonRequest,
    LessonResponse,
    LunchRequest,
    LunchResponse,
    Degree,
    RoomResponse,
    StudyGroupResponse,
    SubjectResponse,
    TeacherResponse,
    TimeSlot,
    TimeSlotRequest,
    TimetableResponse,
} from "@/lib/types";

import AssignmentForm from "./assignments/components/AssignmentForm";
import AssignmentsDrawer from "./components/AssignmentsDrawer";
import ExportModal from "./components/ExportModal";
import GenerateOptionsModal from "./components/GenerateOptionsModal";
import GenerationResultModal from "./components/GenerationResultModal";
import LessonDetailsModal from "./components/LessonDetailsModal";
import LessonFormModal from "./components/LessonFormModal";
import ManualPlacementModal from "./components/ManualPlacementModal";
import TimeSlotFormModal from "./components/TimeSlotFormModal";
import TimetableGrid from "./components/TimetableGrid";

type DepartmentOption = {
    id: number;
    name: string;
    facultyId: number;
    facultyName?: string;
};

type FilterValue = number | "ALL";
type GridDensity = "compact" | "medium" | "large";
type AssignmentDrawerFilter = "ALL" | "SCHEDULED" | "PARTIAL" | "UNPLACED";
type RunningGenerationAction = "generate" | "retry" | null;

type DeleteTarget =
    | { type: "timetable"; entityName: string }
    | { type: "lesson"; entityName: string; lesson: LessonResponse }
    | { type: "assignment"; entityName: string; assignment: AssignmentResponse }
    | { type: "lunch"; entityName: string; lunch: LunchResponse };
const ASSIGNMENT_DELETE_MODES: DeleteMode[] = ["SIMPLE", "WITH"];

const VISIBLE_DAYS = DAYS_OF_WEEK.filter((day) => day !== "SUNDAY");
const MIN_GRID_ZOOM = 60;
const MAX_GRID_ZOOM = 150;
const GRID_ZOOM_STEP = 10;
const LAST_WORKED_TIMETABLE_STORAGE_KEY = "last-worked-timetable-id";

function formatTime(time: string) {
    return time.substring(0, 5);
}

const EXPORT_COLORS = [
    { fill: "DBEAFE", text: "1E3A8A" },
    { fill: "D1FAE5", text: "065F46" },
    { fill: "EDE9FE", text: "5B21B6" },
    { fill: "FEF3C7", text: "92400E" },
    { fill: "FFE4E6", text: "9F1239" },
    { fill: "CFFAFE", text: "155E75" },
    { fill: "FAE8FF", text: "86198F" },
    { fill: "ECFCCB", text: "3F6212" },
    { fill: "FCE7F3", text: "9D174D" },
    { fill: "E0E7FF", text: "3730A3" },
];
const LUNCH_EXPORT_STYLE = { fill: "FEF3C7", text: "92400E" };

function hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace("#", "");
    const parts = clean.match(/.{1,2}/g);

    if (!parts || parts.length < 3) {
        return [219, 234, 254];
    }

    return [
        parseInt(parts[0], 16),
        parseInt(parts[1], 16),
        parseInt(parts[2], 16),
    ];
}

function hashExportColor(value: string) {
    let hash = 0;

    for (let i = 0; i < value.length; i += 1) {
        hash = value.charCodeAt(i) + ((hash << 5) - hash);
    }

    return Math.abs(hash) % EXPORT_COLORS.length;
}

function getExportColorByText(value: string) {
    return EXPORT_COLORS[hashExportColor(value)];
}

function getExportColorByLesson(lesson: LessonResponse) {
    return getExportColorByText(`${lesson.subjectName}-${lesson.teacherName}`);
}

function getLessonDurationSpan(lesson: LessonResponse, slotIndex: number, totalSlots: number) {
    const duration = Number(lesson.durationHours);

    if (!Number.isFinite(duration) || duration < 1) {
        return 1;
    }

    return Math.min(Math.max(1, Math.round(duration)), totalSlots - slotIndex);
}

function getLunchDurationSpan(lunch: LunchResponse, slotIndex: number, slots: TimeSlot[]) {
    const lunchEnd = formatTime(lunch.endTime);
    let span = 1;

    for (let index = slotIndex + 1; index < slots.length; index += 1) {
        if (formatTime(slots[index - 1].endTime) >= lunchEnd) break;
        span += 1;
    }

    return span;
}

function getDisplayTimetableName(name: string) {
    return name.replace(/\s+v\d+$/i, "").trim();
}

function findLessonRoomId(lesson: LessonResponse | null, rooms: RoomResponse[]) {
    if (!lesson?.roomName) return undefined;
    return rooms.find((room) => room.name === lesson.roomName)?.id;
}

function isRequestCanceled(error: unknown) {
    if (typeof error !== "object" || error === null) return false;

    const candidate = error as { code?: string; name?: string; message?: string };
    return candidate.code === "ERR_CANCELED" || candidate.name === "CanceledError" || candidate.message === "canceled";
}

function showErrorToast(message: string) {
    toast.error(message, { duration: Infinity });
}

function isProblemAssignment(assignment: AssignmentResponse) {
    const status = String(assignment.placementStatus || "").toUpperCase();
    return assignment.requiresManualInput || ["FAILED", "MANUAL_REQUIRED", "PARTIAL", "PENDING", "UNPLACED"].includes(status);
}

function getRetrySplitting(assignment: AssignmentResponse) {
    return assignment.selectedSplitting || assignment.hoursSplitting || assignment.splittingOptions?.[0] || "";
}

function makeLessonExportText(lesson: LessonResponse) {
    return [lesson.subjectName, lesson.teacherName, lesson.roomName || "No room"].join("\n");
}

function sanitizeExcelSheetName(name: string) {
    const cleaned = name
        .replaceAll("[", " ")
        .replaceAll("]", " ")
        .replaceAll(":", " ")
        .replaceAll("*", " ")
        .replaceAll("?", " ")
        .replaceAll("/", " ")
        .replaceAll("\\", " ")
        .replaceAll(/\s+/g, " ")
        .trim();
    return (cleaned || "Sheet").slice(0, 31);
}

function makeUniqueSheetName(name: string, usedNames: Set<string>) {
    const base = sanitizeExcelSheetName(name);
    let candidate = base;
    let index = 2;

    while (usedNames.has(candidate)) {
        const suffix = ` ${index}`;
        candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`;
        index += 1;
    }

    usedNames.add(candidate);
    return candidate;
}

function getExcelExportSheets(groups: StudyGroupResponse[]) {
    const sheets: { name: string; groups: StudyGroupResponse[] }[] = [];
    const bachelorByDepartment = new Map<number | string, { name: string; groups: StudyGroupResponse[] }>();

    groups.forEach((group) => {
        if (group.degree === "BACHELOR") {
            const key = group.departmentId ?? group.departmentName ?? "Bachelor";
            const name = group.departmentName || "Bachelor";
            const entry = bachelorByDepartment.get(key) ?? { name, groups: [] };
            entry.groups.push(group);
            bachelorByDepartment.set(key, entry);
        }
    });

    [...bachelorByDepartment.values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((entry) => {
            sheets.push({
                name: `Bachelor - ${entry.name}`,
                groups: entry.groups,
            });
        });

    const standaloneDegrees: Degree[] = ["MASTER", "PHD", "SPECIALIST"];
    standaloneDegrees.forEach((degree) => {
        const degreeGroups = groups.filter((group) => group.degree === degree);
        if (degreeGroups.length > 0) {
            sheets.push({
                name: degree === "PHD" ? "PhD" : degree,
                groups: degreeGroups,
            });
        }
    });

    return sheets.length > 0 ? sheets : [{ name: "Timetable", groups }];
}

function getExportSections(groups: StudyGroupResponse[]) {
    return getExcelExportSheets(groups);
}

function getLessonForExportCell(lessons: LessonResponse[], groupName: string, slot: TimeSlot, day: DayOfWeek) {
    return lessons.find((lesson) =>
        lesson.groupNames.includes(groupName) &&
        formatTime(lesson.startTime) === formatTime(slot.startTime) &&
        lesson.dayOfWeek === day,
    );
}

function getLunchForExportCell(lunches: LunchResponse[], groupId: number, slot: TimeSlot, day: DayOfWeek) {
    return lunches.find((lunch) =>
        lunch.groupId === groupId &&
        formatTime(lunch.startTime) === formatTime(slot.startTime) &&
        lunch.dayOfWeek === day,
    );
}

export default function TimetableDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const timetableId = Number(id);

    const [timetable, setTimetable] = useState<TimetableResponse | null>(null);
    const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
    const [lessons, setLessons] = useState<LessonResponse[]>([]);
    const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
    const [teachers, setTeachers] = useState<TeacherResponse[]>([]);
    const [groups, setGroups] = useState<StudyGroupResponse[]>([]);
    const [rooms, setRooms] = useState<RoomResponse[]>([]);
    const [faculties, setFaculties] = useState<FacultyResponse[]>([]);
    const [departments, setDepartments] = useState<DepartmentOption[]>([]);
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
    const [lunches, setLunches] = useState<LunchResponse[]>([]);

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState("");

    const [showAssignmentForm, setShowAssignmentForm] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<AssignmentResponse | null>(null);
    const [assignmentsDrawerOpen, setAssignmentsDrawerOpen] = useState(false);
    const [assignmentsDrawerFilter, setAssignmentsDrawerFilter] = useState<AssignmentDrawerFilter>("ALL");
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [generatingMode, setGeneratingMode] = useState<GenerationMode | null>(null);
    const [runningGenerationAction, setRunningGenerationAction] = useState<RunningGenerationAction>(null);
    const [showExportModal, setShowExportModal] = useState(false);
    const [generationResult, setGenerationResult] = useState<GenerationResponse | null>(null);
    const [manualAssignmentId, setManualAssignmentId] = useState<number | null>(null);
    const generationAbortRef = useRef<AbortController | null>(null);

    const [lessonDetailsOpen, setLessonDetailsOpen] = useState(false);
    const [selectedLesson, setSelectedLesson] = useState<LessonResponse | null>(null);
    const [lessonFormOpen, setLessonFormOpen] = useState(false);
    const [editingLesson, setEditingLesson] = useState<LessonResponse | null>(null);
    const [lessonInitialValues, setLessonInitialValues] = useState<{
        assignmentId?: number;
        dayOfWeek?: DayOfWeek;
        startTime?: string;
        durationHours?: number;
        roomId?: number;
        groupName?: string;
    } | undefined>();
    const [editingLunch, setEditingLunch] = useState<LunchResponse | null>(null);
    const [lunchDraft, setLunchDraft] = useState<LunchRequest | null>(null);

    const [timeSlotModalOpen, setTimeSlotModalOpen] = useState(false);
    const [editingTimeSlot, setEditingTimeSlot] = useState<TimeSlot | null>(null);

    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
    const [deleteMode, setDeleteMode] = useState<DeleteMode>("SIMPLE");
    const deleteInProgressRef = useRef(false);

    const [selectedDay, setSelectedDay] = useState<DayOfWeek | "ALL">("ALL");
    const [selectedFaculty, setSelectedFaculty] = useState<FilterValue>("ALL");
    const [selectedDepartment, setSelectedDepartment] = useState<FilterValue>("ALL");
    const [selectedGroup, setSelectedGroup] = useState<FilterValue>("ALL");
    const [density, setDensity] = useState<GridDensity>("medium");
    const [gridZoom, setGridZoom] = useState(100);
    const [editingGridZoom, setEditingGridZoom] = useState(false);
    const [gridZoomDraft, setGridZoomDraft] = useState("100");

    useEffect(() => {
        if (!timetableId || Number.isNaN(timetableId) || timetableId <= 0) {
            setLoading(false);
            setError("Invalid timetable ID");
            return;
        }

        window.localStorage.setItem(
            LAST_WORKED_TIMETABLE_STORAGE_KEY,
            String(timetableId),
        );
        void loadData(true);
    }, [timetableId]);

    useEffect(() => {
        setSelectedDepartment("ALL");
        setSelectedGroup("ALL");
    }, [selectedFaculty]);

    useEffect(() => {
        setSelectedGroup("ALL");
    }, [selectedDepartment]);

    const loadData = async (initial = false) => {
        try {
            if (initial) setLoading(true);
            setError("");

            const [
                timetableData,
                assignmentsData,
                lessonsData,
                subjectsData,
                teachersData,
                groupsData,
                roomsData,
                facultiesData,
                timeSlotsData,
                departmentsData,
                lunchesData,
            ] = await Promise.all([
                timetableApi.getTimetable(timetableId),
                assignmentApi.getAssignmentsByTimetable(timetableId),
                lessonApi.getLessonsByTimetable(timetableId),
                subjectApi.getSubjects(),
                teacherApi.getTeachers(),
                groupApi.getAllGroups(),
                roomApi.getRooms(),
                facultyApi.getFaculties(),
                timeSlotApi.getTimeSlots(),
                departmentApi.getDepartments(),
                lunchApi.getLunchesByTimetable(timetableId),
            ]);

            setTimetable(timetableData);
            setAssignments(assignmentsData);
            setLessons(lessonsData);
            setSubjects(subjectsData);
            setTeachers(teachersData);
            setGroups(groupsData);
            setRooms(roomsData);
            setFaculties(facultiesData);
            setTimeSlots(timeSlotsData);
            setDepartments(departmentsData as DepartmentOption[]);
            setLunches(lunchesData);

            return {
                assignments: assignmentsData,
            };
        } catch (err) {
            const message = getApiErrorMessage(err, "Failed to load timetable data");
            setError(message);
            showErrorToast(message);
            return null;
        } finally {
            if (initial) setLoading(false);
        }
    };

    const filteredDepartments = useMemo(() => {
        if (selectedFaculty === "ALL") return departments;
        return departments.filter((department) => department.facultyId === selectedFaculty);
    }, [departments, selectedFaculty]);

    const filteredGroups = useMemo(() => {
        let result = groups;

        if (selectedFaculty !== "ALL") result = result.filter((group) => group.facultyId === selectedFaculty);
        if (selectedDepartment !== "ALL") result = result.filter((group) => group.departmentId === selectedDepartment);
        if (selectedGroup !== "ALL") result = result.filter((group) => group.id === selectedGroup);

        return result;
    }, [groups, selectedFaculty, selectedDepartment, selectedGroup]);

    const filteredLessons = useMemo(() => {
        const groupNames = new Set(filteredGroups.map((group) => group.name));
        const byGroup = lessons.filter((lesson) => lesson.groupNames.some((groupName) => groupNames.has(groupName)));
        if (selectedDay === "ALL") return byGroup;
        return byGroup.filter((lesson) => lesson.dayOfWeek === selectedDay);
    }, [lessons, filteredGroups, selectedDay]);

    const filteredLunches = useMemo(() => {
        const groupIds = new Set(filteredGroups.map((group) => group.id));
        const byGroup = lunches.filter((lunch) => groupIds.has(lunch.groupId));
        if (selectedDay === "ALL") return byGroup;
        return byGroup.filter((lunch) => lunch.dayOfWeek === selectedDay);
    }, [lunches, filteredGroups, selectedDay]);

    const handleGenerate = async (mode: GenerationMode) => {
        const controller = new AbortController();
        generationAbortRef.current = controller;

        try {
            setActionLoading(true);
            setGeneratingMode(mode);
            setRunningGenerationAction("generate");
            setError("");

            const result = await timetableApi.generateTimetable(timetableId, mode, controller.signal);
            setGenerationResult(result);
            setShowGenerateModal(false);
            await loadData();

            toast.success("Generation finished");
        } catch (err) {
            if (isRequestCanceled(err)) {
                toast.info("Generation stopped");
                return;
            }

            const message = getApiErrorMessage(err, "Generation failed");
            setError(message);
            showErrorToast(message);
        } finally {
            if (generationAbortRef.current === controller) {
                generationAbortRef.current = null;
            }
            setGeneratingMode(null);
            setRunningGenerationAction(null);
            setActionLoading(false);
        }
    };

    const handleStopGeneration = () => {
        generationAbortRef.current?.abort();
        generationAbortRef.current = null;
        setGeneratingMode(null);
        setRunningGenerationAction(null);
        setActionLoading(false);
    };

    const handleRetryFailed = async (scope?: AssignmentResponse[]) => {
        const retryAssignments = (scope && scope.length > 0 ? scope : assignments.filter(isProblemAssignment))
            .filter(isProblemAssignment);

        if (retryAssignments.length === 0) {
            toast.info("No failed or partial assignments to retry");
            return;
        }

        const manualSplittings = retryAssignments.reduce<Record<number, string>>((acc, assignment) => {
            const splitting = getRetrySplitting(assignment);
            if (splitting) {
                acc[assignment.id] = splitting;
            }
            return acc;
        }, {});

        if (Object.keys(manualSplittings).length === 0) {
            showErrorToast("No splitting values available for retry");
            return;
        }

        const controller = new AbortController();
        generationAbortRef.current = controller;

        try {
            setActionLoading(true);
            setRunningGenerationAction("retry");
            setError("");

            const result = await timetableApi.retryFailedAssignments(timetableId, manualSplittings, controller.signal);
            setGenerationResult(result);
            await loadData();

            toast.success("Retry finished");
        } catch (err) {
            if (isRequestCanceled(err)) {
                toast.info("Retry stopped");
                return;
            }

            const message = getApiErrorMessage(err, "Retry failed");
            setError(message);
            showErrorToast(message);
        } finally {
            if (generationAbortRef.current === controller) {
                generationAbortRef.current = null;
            }
            setRunningGenerationAction(null);
            setActionLoading(false);
        }
    };

    const handlePublish = async () => {
        if (!timetable || timetable.status === "PUBLISHED") return;

        try {
            setActionLoading(true);
            setPublishing(true);
            setError("");
            await timetableApi.publishTimetable(timetableId);
            await loadData();
            toast.success("Timetable published");
        } catch (err) {
            const message = getApiErrorMessage(err, "Failed to publish timetable");
            setError(message);
            showErrorToast(message);
        } finally {
            setPublishing(false);
            setActionLoading(false);
        }
    };

    const handleArchive = async () => {
        if (!timetable || timetable.status === "ARCHIVED") return;

        try {
            setActionLoading(true);
            setError("");
            await timetableApi.archiveTimetable(timetableId);
            await loadData();
            toast.success("Timetable archived");
        } catch (err) {
            const message = getApiErrorMessage(err, "Failed to archive timetable");
            setError(message);
            showErrorToast(message);
        } finally {
            setActionLoading(false);
        }
    };

    const openAssignmentsWithFilter = (filter: AssignmentDrawerFilter = "ALL") => {
        setAssignmentsDrawerFilter(filter);
        setAssignmentsDrawerOpen(true);
    };

    const requestDelete = (target: DeleteTarget) => {
        if (deleteInProgressRef.current) return;

        setDeleteTarget(target);
        setDeleteMode("SIMPLE");
    };

    const getDeleteDependencyGroups = () => {
        if (!deleteTarget) return [];

        if (deleteTarget.type === "timetable") {
            return compactGroups([
                {
                    label: "Assignments",
                    items: uniqueItems(assignments.map(formatAssignment)),
                },
                {
                    label: "Lessons",
                    items: uniqueItems(lessons.map(formatLesson)),
                },
                {
                    label: "Lunches",
                    items: lunches.map(formatLunch),
                },
            ]);
        }

        if (deleteTarget.type === "assignment") {
            return compactGroups([
                {
                    label: "Lessons",
                    items: uniqueItems(
                        lessons
                            .filter((lesson) => lesson.assignmentId === deleteTarget.assignment.id)
                            .map(formatLesson),
                    ),
                },
            ]);
        }

        return [];
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        const target = deleteTarget;
        const mode = deleteMode;

        try {
            deleteInProgressRef.current = true;
            setActionLoading(true);
            setError("");
            setDeleteTarget(null);
            setDeleteMode("SIMPLE");

            if (target.type === "timetable") {
                await timetableApi.deleteTimetable(timetableId, mode);
                toast.success("Timetable deleted");
                window.location.href = "/timetables";
                return;
            }

            if (target.type === "lesson") {
                await lessonApi.deleteLesson(timetableId, target.lesson.id);
                toast.success("Lesson deleted");
            }

            if (target.type === "assignment") {
                await assignmentApi.deleteAssignment(timetableId, target.assignment.id, mode);
                toast.success("Assignment deleted");
            }

            if (target.type === "lunch") {
                await lunchApi.deleteLunch(target.lunch.id, mode);
                toast.success("Lunch block deleted");
            }

            await loadData();
        } catch {
            const message =
                target.type === "timetable"
                    ? getDeleteRelatedRecordsMessage("timetable", timetableId)
                    : target.type === "lesson"
                        ? getDeleteRelatedRecordsMessage("lesson", target.lesson.id)
                        : target.type === "assignment"
                            ? getDeleteRelatedRecordsMessage("assignment", target.assignment.id)
                            : getDeleteRelatedRecordsMessage("lunch", target.lunch.id);
            toast.error(message);
        } finally {
            deleteInProgressRef.current = false;
            setActionLoading(false);
        }
    };

    const handleExport = async (format: "pdf" | "excel") => {
        if (!timetable) return;

        const slotsToExport = [...timeSlots].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const groupsToExport = filteredGroups;
        const daysToExport = selectedDay === "ALL" ? VISIBLE_DAYS : [selectedDay];
        const headers = [
            "Day",
            "Group",
            ...slotsToExport.map((slot) => `${formatTime(slot.startTime)}-${formatTime(slot.endTime)}`),
        ];
        const displayTimetableName = getDisplayTimetableName(timetable.name);
        const fileName = `timetable_${timetable.id}_${selectedDay === "ALL" ? "all_days" : selectedDay.toLowerCase()}`;

        if (format === "excel") {
            const workbook = XLSX.utils.book_new();
            const usedSheetNames = new Set<string>();

            const appendExcelSheet = (sheetName: string, sheetGroups: StudyGroupResponse[]) => {
                const rows: string[][] = [];
                const merges: XLSX.Range[] = [];
                const styledCells = new Map<string, { fill: string; text: string; bold?: boolean }>();
                let currentExcelRow = 1;

                daysToExport.forEach((day) => {
                    const dayStartRow = currentExcelRow;

                    sheetGroups.forEach((group, groupIndex) => {
                        const row: string[] = [groupIndex === 0 ? day : "", group.name];
                        let slotIndex = 0;

                        while (slotIndex < slotsToExport.length) {
                            const slot = slotsToExport[slotIndex];
                            const lesson = getLessonForExportCell(filteredLessons, group.name, slot, day);
                            const lunch = getLunchForExportCell(lunches, group.id, slot, day);

                            if (lesson) {
                                const span = getLessonDurationSpan(lesson, slotIndex, slotsToExport.length);
                                const cellColumnIndex = 2 + slotIndex;
                                const cellAddress = XLSX.utils.encode_cell({ r: currentExcelRow, c: cellColumnIndex });
                                const color = getExportColorByLesson(lesson);

                                row.push(makeLessonExportText(lesson));
                                styledCells.set(cellAddress, { fill: color.fill, text: color.text, bold: true });

                                if (span > 1) {
                                    merges.push({
                                        s: { r: currentExcelRow, c: cellColumnIndex },
                                        e: { r: currentExcelRow, c: cellColumnIndex + span - 1 },
                                    });

                                    for (let offset = 1; offset < span; offset += 1) {
                                        row.push("");
                                    }
                                }

                                slotIndex += span;
                            } else if (lunch) {
                                const span = getLunchDurationSpan(lunch, slotIndex, slotsToExport);
                                const cellColumnIndex = 2 + slotIndex;
                                const cellAddress = XLSX.utils.encode_cell({ r: currentExcelRow, c: cellColumnIndex });

                                row.push("Lunch");
                                styledCells.set(cellAddress, { fill: LUNCH_EXPORT_STYLE.fill, text: LUNCH_EXPORT_STYLE.text, bold: true });

                                if (span > 1) {
                                    merges.push({
                                        s: { r: currentExcelRow, c: cellColumnIndex },
                                        e: { r: currentExcelRow, c: cellColumnIndex + span - 1 },
                                    });

                                    for (let offset = 1; offset < span; offset += 1) {
                                        row.push("");
                                    }
                                }

                                slotIndex += span;
                            } else {
                                row.push("");
                                slotIndex += 1;
                            }
                        }

                        rows.push(row);
                        currentExcelRow += 1;
                    });

                    if (sheetGroups.length > 1) {
                        merges.push({
                            s: { r: dayStartRow, c: 0 },
                            e: { r: dayStartRow + sheetGroups.length - 1, c: 0 },
                        });
                    }
                });

                const worksheet = XLSX.utils.aoa_to_sheet([]);

                XLSX.utils.sheet_add_aoa(
                    worksheet,
                    [[`${displayTimetableName} - ${timetable.academicYearStart}-${timetable.academicYearEnd} - ${timetable.semester}`]],
                    { origin: "A1" },
                );
                XLSX.utils.sheet_add_aoa(worksheet, [headers, ...rows], { origin: "A3" });

                worksheet["!merges"] = [
                    { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(2, headers.length - 1) } },
                    ...merges.map((merge) => ({
                        s: { r: merge.s.r + 2, c: merge.s.c },
                        e: { r: merge.e.r + 2, c: merge.e.c },
                    })),
                ];
                worksheet["!cols"] = [
                    { wch: 16 },
                    { wch: 20 },
                    ...slotsToExport.map(() => ({ wch: 24 })),
                ];
                worksheet["!rows"] = [
                    { hpt: 30 },
                    { hpt: 8 },
                    { hpt: 28 },
                    ...rows.map(() => ({ hpt: 58 })),
                ];

                worksheet["A1"].s = {
                    fill: { patternType: "solid", fgColor: { rgb: "111827" } },
                    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 },
                    alignment: { vertical: "center", horizontal: "left" },
                };

                const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");

                for (let row = 2; row <= range.e.r; row += 1) {
                    for (let col = range.s.c; col <= range.e.c; col += 1) {
                        const address = XLSX.utils.encode_cell({ r: row, c: col });
                        const originalAddress = XLSX.utils.encode_cell({ r: row - 2, c: col });

                        if (!worksheet[address]) {
                            worksheet[address] = { t: "s", v: "" };
                        }

                        const cell = worksheet[address];
                        const value = String(cell.v || "");
                        const isHeader = row === 2;
                        const isDayColumn = col === 0;
                        const isGroupColumn = col === 1;
                        const customStyle = styledCells.get(originalAddress);

                        let fillColor = "FFFFFF";
                        let textColor = "111827";
                        let bold = false;
                        let horizontal: "left" | "center" = "left";

                        if (isHeader) {
                            fillColor = "111827";
                            textColor = "FFFFFF";
                            bold = true;
                            horizontal = "center";
                        } else if (isDayColumn) {
                            fillColor = "DBEAFE";
                            textColor = "1E3A8A";
                            bold = true;
                            horizontal = "center";
                        } else if (isGroupColumn) {
                            fillColor = "F8FAFC";
                            bold = true;
                        } else if (customStyle) {
                            fillColor = customStyle.fill;
                            textColor = customStyle.text;
                            bold = customStyle.bold ?? true;
                        } else if (value.trim()) {
                            const color = getExportColorByText(value.split("\n")[0]);
                            fillColor = color.fill;
                            textColor = color.text;
                            bold = true;
                        }

                        cell.s = {
                            fill: { patternType: "solid", fgColor: { rgb: fillColor } },
                            font: { bold, color: { rgb: textColor }, sz: isHeader ? 11 : 9 },
                            alignment: { vertical: "center", horizontal, wrapText: true },
                            border: {
                                top: { style: "thin", color: { rgb: "CBD5E1" } },
                                bottom: { style: "thin", color: { rgb: "CBD5E1" } },
                                left: { style: "thin", color: { rgb: "CBD5E1" } },
                                right: { style: "thin", color: { rgb: "CBD5E1" } },
                            },
                        };
                    }
                }

                XLSX.utils.book_append_sheet(workbook, worksheet, makeUniqueSheetName(sheetName, usedSheetNames));
            };

            getExcelExportSheets(groupsToExport).forEach((sheet) => {
                appendExcelSheet(sheet.name, sheet.groups);
            });

            XLSX.writeFile(workbook, `${fileName}.xlsx`);
        } else {
            const groupsPerPage = 10;
            const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            let isFirstPage = true;

            const drawPageHeader = (sectionName: string, day: DayOfWeek, pagePart: number) => {
                doc.setFillColor(17, 24, 39);
                doc.rect(0, 0, pageWidth, 24, "F");
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(14);
                doc.text(displayTimetableName, 12, 12);
                doc.setFontSize(9);
                doc.text(
                    `${sectionName} - ${timetable.academicYearStart}-${timetable.academicYearEnd} - ${timetable.semester} - ${day}${pagePart > 1 ? ` - Part ${pagePart}` : ""}`,
                    12,
                    18,
                );
            };

            const drawFooter = () => {
                doc.setFontSize(8);
                doc.setTextColor(100);
                doc.text(`Generated from Timetable Generator - ${new Date().toLocaleDateString()}`, 12, pageHeight - 8);
            };

            type PdfCell = string | {
                content: string;
                colSpan?: number;
                styles: Record<string, unknown>;
            };

            const buildRowsForDay = (day: DayOfWeek, groupsChunk: StudyGroupResponse[]) => {
                const bodyRows: PdfCell[][] = [];

                groupsChunk.forEach((group) => {
                    const row: PdfCell[] = [
                        {
                            content: group.name,
                            styles: {
                                fillColor: [248, 250, 252],
                                textColor: [17, 24, 39],
                                fontStyle: "bold",
                                valign: "middle",
                            },
                        },
                    ];

                    let slotIndex = 0;

                    while (slotIndex < slotsToExport.length) {
                        const slot = slotsToExport[slotIndex];
                        const lesson = getLessonForExportCell(filteredLessons, group.name, slot, day);
                        const lunch = getLunchForExportCell(lunches, group.id, slot, day);

                        if (lesson) {
                            const span = getLessonDurationSpan(lesson, slotIndex, slotsToExport.length);
                            const color = getExportColorByLesson(lesson);

                            row.push({
                                content: makeLessonExportText(lesson),
                                colSpan: span,
                                styles: {
                                    fillColor: hexToRgb(color.fill),
                                    textColor: hexToRgb(color.text),
                                    fontStyle: "bold",
                                    valign: "middle",
                                    halign: "left",
                                    minCellHeight: 16,
                                },
                            });

                            slotIndex += span;
                        } else if (lunch) {
                            const span = getLunchDurationSpan(lunch, slotIndex, slotsToExport);

                            row.push({
                                content: "Lunch",
                                colSpan: span,
                                styles: {
                                    fillColor: hexToRgb(LUNCH_EXPORT_STYLE.fill),
                                    textColor: hexToRgb(LUNCH_EXPORT_STYLE.text),
                                    fontStyle: "bold",
                                    valign: "middle",
                                    halign: "center",
                                    minCellHeight: 16,
                                },
                            });

                            slotIndex += span;
                        } else {
                            row.push({
                                content: "",
                                styles: {
                                    fillColor: [255, 255, 255],
                                    textColor: [148, 163, 184],
                                    minCellHeight: 16,
                                },
                            });

                            slotIndex += 1;
                        }
                    }

                    bodyRows.push(row);
                });

                return bodyRows;
            };

            const headRow = [
                {
                    content: "Group",
                    styles: {
                        fillColor: [17, 24, 39] as [number, number, number],
                        textColor: [255, 255, 255] as [number, number, number],
                        fontStyle: "bold" as const,
                        halign: "center" as const,
                        valign: "middle" as const,
                    },
                },
                ...slotsToExport.map((slot) => ({
                    content: `${formatTime(slot.startTime)}-${formatTime(slot.endTime)}`,
                    styles: {
                        fillColor: [17, 24, 39] as [number, number, number],
                        textColor: [255, 255, 255] as [number, number, number],
                        fontStyle: "bold" as const,
                        halign: "center" as const,
                        valign: "middle" as const,
                    },
                })),
            ];

            getExportSections(groupsToExport).forEach((section) => {
                daysToExport.forEach((day) => {
                    for (let startIndex = 0; startIndex < section.groups.length; startIndex += groupsPerPage) {
                        const pagePart = Math.floor(startIndex / groupsPerPage) + 1;
                        const groupsChunk = section.groups.slice(startIndex, startIndex + groupsPerPage);

                        if (!isFirstPage) {
                            doc.addPage();
                        }

                        isFirstPage = false;
                        drawPageHeader(section.name, day, pagePart);

                        autoTable(doc, {
                            head: [headRow],
                            body: buildRowsForDay(day, groupsChunk),
                            startY: 30,
                            theme: "grid",
                            styles: {
                                fontSize: 6.5,
                                cellPadding: 1.6,
                                valign: "middle",
                                overflow: "linebreak",
                                lineColor: [203, 213, 225],
                                lineWidth: 0.18,
                            },
                            headStyles: {
                                fillColor: [17, 24, 39],
                                textColor: [255, 255, 255],
                                fontStyle: "bold",
                                halign: "center",
                                valign: "middle",
                            },
                            columnStyles: {
                                0: {
                                    cellWidth: 28,
                                    fontStyle: "bold",
                                    fillColor: [248, 250, 252],
                                    textColor: [17, 24, 39],
                                },
                            },
                            margin: { left: 6, right: 6, bottom: 14 },
                            tableWidth: "auto",
                            didDrawPage: drawFooter,
                        });
                    }
                });
            });

            doc.save(`${fileName}.pdf`);
        }

        setShowExportModal(false);
        toast.success(`${format.toUpperCase()} exported`);
    };

    const openManualModal = (assignmentId: number) => setManualAssignmentId(assignmentId);
    const closeManualModal = () => setManualAssignmentId(null);

    const handleManualPlace = async (data: { dayOfWeek: DayOfWeek; startTime: string; durationHours: number; roomId: number }) => {
        if (!manualAssignmentId) return;

        try {
            setActionLoading(true);
            const success = await timetableApi.manualPlaceLesson(timetableId, manualAssignmentId, data);

            if (!success) {
                showErrorToast("Manual placement failed because of conflicts");
                return;
            }

            await loadData();
            closeManualModal();
            toast.success("Lesson placed manually");
        } catch (err) {
            const message = getApiErrorMessage(err, "Manual placement failed");
            setError(message);
            showErrorToast(message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleSaveAssignment = async (data: AssignmentRequest | AssignmentRequest[]) => {
        try {
            setActionLoading(true);
            setError("");

            if (editingAssignment) {
                if (Array.isArray(data)) {
                    showErrorToast("Cannot update multiple assignments at once");
                    return;
                }

                await assignmentApi.updateAssignment(timetableId, editingAssignment.id, data);
                toast.success("Assignment updated");
            } else {
                const assignmentsToCreate = Array.isArray(data) ? data : [data];

                await Promise.all(
                    assignmentsToCreate.map((assignment) =>
                        assignmentApi.createAssignment(timetableId, assignment),
                    ),
                );
                toast.success(
                    `${assignmentsToCreate.length} assignment${assignmentsToCreate.length === 1 ? "" : "s"} created`,
                );
            }

            setShowAssignmentForm(false);
            setEditingAssignment(null);
            await loadData();
        } catch (err) {
            const message = getApiErrorMessage(err, "Failed to save assignment");
            setError(message);
            showErrorToast(message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleCellClick = async (group: StudyGroupResponse, slot: TimeSlot, day?: DayOfWeek, type: "lesson" | "lunch" = "lesson") => {
        const targetDay = day ?? (selectedDay === "ALL" ? undefined : selectedDay);

        if (type === "lunch") {
            if (!targetDay) {
                showErrorToast("Choose a day before adding lunch from the grid");
                return;
            }

            await handleCreateLunch({
                timetableId,
                groupId: group.id,
                dayOfWeek: targetDay,
                startTime: formatTime(slot.startTime),
                endTime: formatTime(slot.endTime),
                manual: true,
            });
            return;
        }

        setEditingLesson(null);
        setLessonInitialValues({
            groupName: group.name,
            dayOfWeek: targetDay,
            startTime: formatTime(slot.startTime),
            durationHours: 1,
        });
        setLessonFormOpen(true);
    };

    const openLunchEditor = (lunch: LunchResponse) => {
        setEditingLunch(lunch);
        setLunchDraft({
            timetableId: lunch.timetableId,
            groupId: lunch.groupId,
            dayOfWeek: lunch.dayOfWeek,
            startTime: formatTime(lunch.startTime),
            endTime: formatTime(lunch.endTime),
            manual: lunch.manual,
        });
    };

    const handleLessonClick = (lesson: LessonResponse) => {
        setSelectedLesson(lesson);
        setLessonDetailsOpen(true);
    };

    const handleSaveLesson = async (data: LessonRequest) => {
        try {
            setActionLoading(true);
            setError("");

            if (editingLesson) {
                await lessonApi.updateLesson(timetableId, editingLesson.id, data);
                toast.success("Lesson updated");
            } else {
                await lessonApi.createLesson(timetableId, data);
                toast.success("Lesson created");
            }

            setLessonFormOpen(false);
            setEditingLesson(null);
            setLessonInitialValues(undefined);
            await loadData();
        } catch (err) {
            const message = getApiErrorMessage(err, "Failed to save lesson");
            setError(message);
            showErrorToast(message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleSaveTimeSlot = async (slotId: number | null, data: TimeSlotRequest) => {
        try {
            setActionLoading(true);
            if (slotId) {
                await timeSlotApi.updateTimeSlot(slotId, data);
                toast.success("Time slot updated");
            } else {
                await timeSlotApi.createTimeSlot(data);
                toast.success("Time slot created");
            }

            setTimeSlotModalOpen(false);
            setEditingTimeSlot(null);
            await loadData();
        } catch (err) {
            const message = getApiErrorMessage(err, "Failed to save time slot");
            setError(message);
            showErrorToast(message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateLunch = async (data: LunchRequest) => {
        try {
            setActionLoading(true);
            await lunchApi.createLunch(data);
            await loadData();
            toast.success("Lunch block added");
        } catch (err) {
            const message = getApiErrorMessage(err, "Failed to create lunch block");
            setError(message);
            showErrorToast(message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateLunch = async () => {
        if (!editingLunch || !lunchDraft) return;

        if (lunchDraft.startTime >= lunchDraft.endTime) {
            showErrorToast("End time must be after start time");
            return;
        }

        try {
            setActionLoading(true);
            await lunchApi.updateLunch(editingLunch.id, lunchDraft);
            setEditingLunch(null);
            setLunchDraft(null);
            await loadData();
            toast.success("Lunch block updated");
        } catch (err) {
            const message = getApiErrorMessage(err, "Failed to update lunch block");
            setError(message);
            showErrorToast(message);
        } finally {
            setActionLoading(false);
        }
    };

    const updateGridZoom = (direction: 1 | -1) => {
        setGridZoom((current) =>
            Math.min(
                Math.max(current + direction * GRID_ZOOM_STEP, MIN_GRID_ZOOM),
                MAX_GRID_ZOOM,
            ),
        );
    };

    const handleGridZoomChange = (zoom: number) => {
        setGridZoom(Math.min(Math.max(Math.round(zoom * 100), MIN_GRID_ZOOM), MAX_GRID_ZOOM));
    };

    const commitGridZoomDraft = () => {
        const nextZoom = Number(gridZoomDraft);

        if (Number.isFinite(nextZoom)) {
            setGridZoom(Math.min(Math.max(Math.round(nextZoom), MIN_GRID_ZOOM), MAX_GRID_ZOOM));
        }

        setEditingGridZoom(false);
    };

    if (loading) {
        return (
            <AppShell>
                <div className="space-y-6">
                    <Skeleton className="h-28 w-full" />
                    <div className="grid gap-4 md:grid-cols-4">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                    <Skeleton className="h-[620px] w-full" />
                </div>
            </AppShell>
        );
    }

    if (!timetable) {
        return (
            <AppShell>
                <PageHeader
                    eyebrow="Scheduling"
                    title="Timetable not found"
                    description="The selected timetable could not be loaded."
                    actions={<Button variant="outline" asChild><Link href="/timetables"><ArrowLeft className="h-4 w-4" />Back</Link></Button>}
                />
                <Card className="glass-card">
                    <CardContent className="py-12">
                        <EmptyState title="Timetable not found" description="Go back to timetables and select another version." actionLabel="Back to timetables" onAction={() => { window.location.href = "/timetables"; }} />
                    </CardContent>
                </Card>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <PageHeader
                eyebrow="Scheduling"
                title={getDisplayTimetableName(timetable.name)}
                description={`${timetable.academicYearStart}-${timetable.academicYearEnd} - ${timetable.semester}`}
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" asChild><Link href="/timetables"><ArrowLeft className="h-4 w-4" />Back</Link></Button>
                        <Button onClick={() => { setEditingAssignment(null); setShowAssignmentForm(true); }}><Plus className="h-4 w-4" />Add assignment</Button>
                    </div>
                }
            />

            <Card className="glass-card mt-6">
                <CardHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <select value={selectedDay} onChange={(event) => setSelectedDay(event.target.value as DayOfWeek | "ALL")} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm"><option value="ALL">All days</option>{VISIBLE_DAYS.map((day) => <option key={day} value={day}>{day.charAt(0) + day.slice(1).toLowerCase()}</option>)}</select>
                            <select value={selectedFaculty} onChange={(event) => setSelectedFaculty(event.target.value === "ALL" ? "ALL" : Number(event.target.value))} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm"><option value="ALL">All faculties</option>{faculties.map((faculty) => <option key={faculty.id} value={faculty.id}>{faculty.name}</option>)}</select>
                            <select value={selectedDepartment} onChange={(event) => setSelectedDepartment(event.target.value === "ALL" ? "ALL" : Number(event.target.value))} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm"><option value="ALL">All departments</option>{filteredDepartments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select>
                            <select value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value === "ALL" ? "ALL" : Number(event.target.value))} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm"><option value="ALL">All groups</option>{filteredGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
                        </div>

                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" onClick={() => setShowGenerateModal(true)} disabled={actionLoading && runningGenerationAction !== "generate"}><Play className="h-4 w-4" />Generate</Button>
                                {runningGenerationAction && (
                                    <Button variant="outline" onClick={handleStopGeneration}>
                                        <Square className="h-4 w-4" />
                                        Stop
                                    </Button>
                                )}
                                <Button variant="outline" onClick={handlePublish} disabled={actionLoading || timetable.status === "PUBLISHED"}>{publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Publish</Button>
                                <Button variant="outline" onClick={handleArchive} disabled={actionLoading || timetable.status === "ARCHIVED"}><Archive className="h-4 w-4" />Archive</Button>
                                <Button variant="outline" onClick={() => setShowExportModal(true)}><FileDown className="h-4 w-4" />Export</Button>
                                <Button variant="outline" onClick={() => openAssignmentsWithFilter("ALL")}><ClipboardList className="h-4 w-4" />Assignments <Badge variant="secondary">{assignments.length}</Badge></Button>
                                <Button variant="destructive" onClick={() => requestDelete({ type: "timetable", entityName: timetable.name })}><Trash2 className="h-4 w-4" />Delete</Button>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {(["compact", "medium", "large"] as GridDensity[]).map((item) => <Button key={item} size="sm" variant={density === item ? "default" : "outline"} onClick={() => setDensity(item)}>{item}</Button>)}
                                <div className="ml-1 flex items-center overflow-hidden rounded-lg border border-border bg-background shadow-sm">
                                    <Button
                                        type="button"
                                        size="icon-sm"
                                        variant="ghost"
                                        aria-label="Zoom out"
                                        disabled={gridZoom <= MIN_GRID_ZOOM}
                                        onClick={() => updateGridZoom(-1)}
                                    >
                                        <Minus className="h-4 w-4" />
                                    </Button>
                                    {editingGridZoom ? (
                                        <input
                                            autoFocus
                                            type="number"
                                            min={MIN_GRID_ZOOM}
                                            max={MAX_GRID_ZOOM}
                                            value={gridZoomDraft}
                                            onChange={(event) => setGridZoomDraft(event.target.value)}
                                            onBlur={commitGridZoomDraft}
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter") commitGridZoomDraft();
                                                if (event.key === "Escape") setEditingGridZoom(false);
                                            }}
                                            className="h-7 w-16 border-x border-border bg-background px-2 text-center text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            aria-label="Zoom percent"
                                        />
                                    ) : (
                                        <button
                                            type="button"
                                            className="h-7 min-w-14 border-x border-border px-2 text-center text-xs font-medium text-muted-foreground hover:bg-muted"
                                            onClick={() => setGridZoom(100)}
                                            onDoubleClick={() => {
                                                setGridZoomDraft(String(gridZoom));
                                                setEditingGridZoom(true);
                                            }}
                                            aria-label="Reset or edit zoom"
                                        >
                                            {gridZoom}%
                                        </button>
                                    )}
                                    <Button
                                        type="button"
                                        size="icon-sm"
                                        variant="ghost"
                                        aria-label="Zoom in"
                                        disabled={gridZoom >= MAX_GRID_ZOOM}
                                        onClick={() => updateGridZoom(1)}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="h-[680px] min-h-0">
                        <TimetableGrid
                            lessons={filteredLessons}
                            groups={filteredGroups}
                            selectedDay={selectedDay}
                            timeSlots={timeSlots}
                            lunchBlocks={filteredLunches}
                            density={density}
                            zoom={gridZoom / 100}
                            onZoomChange={handleGridZoomChange}
                            onCellClick={handleCellClick}
                            onLessonClick={handleLessonClick}
                            onLessonEdit={(lesson) => {
                                setEditingLesson(lesson);
                                setLessonInitialValues({ roomId: findLessonRoomId(lesson, rooms) });
                                setLessonFormOpen(true);
                            }}
                            onLessonDelete={(lesson) => requestDelete({ type: "lesson", entityName: lesson.subjectName, lesson })}
                            onLunchEdit={openLunchEditor}
                            onLunchDelete={(lunch) => requestDelete({ type: "lunch", entityName: `Lunch ${formatTime(lunch.startTime)}-${formatTime(lunch.endTime)}`, lunch })}
                            onTimeSlotDoubleClick={(slot) => { setEditingTimeSlot(slot); setTimeSlotModalOpen(true); }}
                        />
                    </div>
                </CardContent>
            </Card>

            <AssignmentsDrawer
                open={assignmentsDrawerOpen}
                assignments={assignments}
                onClose={() => setAssignmentsDrawerOpen(false)}
                onCreateAssignment={() => { setEditingAssignment(null); setShowAssignmentForm(true); }}
                onEditAssignment={(assignment) => { setEditingAssignment(assignment); setShowAssignmentForm(true); }}
                onDeleteAssignment={(assignment) => requestDelete({ type: "assignment", entityName: assignment.subjectName, assignment })}
                onManualPlace={(assignment) => openManualModal(assignment.id)}
                initialFilter={assignmentsDrawerFilter}
                retrying={runningGenerationAction === "retry"}
                onRetryFailed={handleRetryFailed}
                onStopRetry={handleStopGeneration}
            />

            <Dialog open={showAssignmentForm} onOpenChange={(open) => { if (!open) { setShowAssignmentForm(false); setEditingAssignment(null); } }}>
                <DialogContent className="max-h-[90vh] max-w-7xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
                    <DialogHeader className="shrink-0 border-b border-border pb-3">
                        <DialogTitle>{editingAssignment ? "Edit Assignment" : "New Assignments"}</DialogTitle>
                        </DialogHeader>
                    <AssignmentForm
                        initialAssignment={editingAssignment}
                        subjects={subjects}
                        teachers={teachers}
                        groups={groups}
                        rooms={rooms}
                        timeSlots={timeSlots}
                        saving={actionLoading}
                        onSave={handleSaveAssignment}
                        onCancel={() => { setShowAssignmentForm(false); setEditingAssignment(null); }}
                    />
                </DialogContent>
            </Dialog>

            <GenerateOptionsModal isOpen={showGenerateModal} onClose={() => setShowGenerateModal(false)} onGenerate={handleGenerate} onStop={handleStopGeneration} timetableName={timetable.name} loading={Boolean(generatingMode)} loadingMode={generatingMode} />
            <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} onExport={handleExport} timetableName={timetable.name} />

            {generationResult && (
                <GenerationResultModal
                    result={generationResult}
                    assignments={assignments}
                    retrying={runningGenerationAction === "retry"}
                    onClose={() => setGenerationResult(null)}
                    onManualPlace={(assignmentId) => { setGenerationResult(null); openManualModal(assignmentId); }}
                    onRetryFailed={() => handleRetryFailed()}
                    onStopRetry={handleStopGeneration}
                />
            )}

            {manualAssignmentId && <ManualPlacementModal assignmentId={manualAssignmentId} rooms={rooms} onPlace={handleManualPlace} onClose={closeManualModal} />}

            <LessonDetailsModal
                open={lessonDetailsOpen}
                lesson={selectedLesson}
                onClose={() => setLessonDetailsOpen(false)}
                onEdit={(lesson) => {
                    setLessonDetailsOpen(false);
                    setEditingLesson(lesson);
                    setLessonInitialValues({ roomId: findLessonRoomId(lesson, rooms) });
                    setLessonFormOpen(true);
                }}
                onDelete={(lesson) => {
                    setLessonDetailsOpen(false);
                    requestDelete({ type: "lesson", entityName: lesson.subjectName, lesson });
                }}
            />

            <LessonFormModal
                open={lessonFormOpen}
                title={editingLesson ? "Edit Lesson" : "New Lesson"}
                assignments={assignments}
                rooms={rooms}
                timeSlots={timeSlots}
                existingLessons={lessons}
                initialValues={lessonInitialValues}
                lesson={editingLesson}
                saving={actionLoading}
                onClose={() => { setLessonFormOpen(false); setEditingLesson(null); setLessonInitialValues(undefined); }}
                onSave={handleSaveLesson}
                onDeleteConflictingLesson={(conflict) => {
                    setLessonFormOpen(false);
                    requestDelete({ type: "lesson", entityName: conflict.subjectName, lesson: conflict });
                }}
            />

            <TimeSlotFormModal
                open={timeSlotModalOpen}
                slot={editingTimeSlot}
                saving={actionLoading}
                onClose={() => { setTimeSlotModalOpen(false); setEditingTimeSlot(null); }}
                existingSlots={timeSlots}
                onSave={handleSaveTimeSlot}
            />

            <Dialog open={Boolean(editingLunch)} onOpenChange={(open) => { if (!open) { setEditingLunch(null); setLunchDraft(null); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Lunch</DialogTitle>
                    </DialogHeader>

                    {lunchDraft && (
                        <div className="space-y-4">
                            <div>
                                <label className="mb-2 block text-sm font-medium">Group</label>
                                <select
                                    value={lunchDraft.groupId}
                                    onChange={(event) => setLunchDraft({ ...lunchDraft, groupId: Number(event.target.value) })}
                                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                                    disabled={actionLoading}
                                >
                                    {groups.map((group) => (
                                        <option key={group.id} value={group.id}>{group.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">Day</label>
                                <select
                                    value={lunchDraft.dayOfWeek}
                                    onChange={(event) => setLunchDraft({ ...lunchDraft, dayOfWeek: event.target.value as DayOfWeek })}
                                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                                    disabled={actionLoading}
                                >
                                    {VISIBLE_DAYS.map((day) => (
                                        <option key={day} value={day}>{day.charAt(0) + day.slice(1).toLowerCase()}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-medium">Start</label>
                                    <input
                                        type="time"
                                        value={lunchDraft.startTime}
                                        onChange={(event) => setLunchDraft({ ...lunchDraft, startTime: event.target.value })}
                                        className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                                        disabled={actionLoading}
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium">End</label>
                                    <input
                                        type="time"
                                        value={lunchDraft.endTime}
                                        onChange={(event) => setLunchDraft({ ...lunchDraft, endTime: event.target.value })}
                                        className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                                        disabled={actionLoading}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => { setEditingLunch(null); setLunchDraft(null); }} disabled={actionLoading}>
                                    Cancel
                                </Button>
                                <Button type="button" onClick={handleUpdateLunch} disabled={actionLoading}>
                                    Save
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <DeleteModeDialog
                open={Boolean(deleteTarget)}
                title={deleteTarget?.type === "timetable" ? "Delete timetable?" : deleteTarget?.type === "assignment" ? "Delete assignment?" : deleteTarget?.type === "lunch" ? "Delete lunch block?" : "Delete lesson?"}
                description={deleteTarget?.type === "timetable" ? "This will delete the timetable and related schedule data." : "This action removes the selected item."}
                entityName={deleteTarget?.entityName}
                dependencyGroups={getDeleteDependencyGroups()}
                selectedMode={deleteMode}
                availableModes={deleteTarget?.type === "assignment" ? ASSIGNMENT_DELETE_MODES : undefined}
                loading={actionLoading}
                showModeSelector={deleteTarget?.type === "timetable" || deleteTarget?.type === "assignment"}
                onModeChange={setDeleteMode}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleConfirmDelete}
            />
        </AppShell>
    );
}
