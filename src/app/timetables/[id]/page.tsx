"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import {
    ArrowLeft,
    ClipboardList,
    FileDown,
    Loader2,
    Minus,
    Play,
    Plus,
    Send,
    Settings2,
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
    departmentApi,
    facultyApi,
    getApiErrorMessage,
    groupApi,
    lessonApi,
    lunchApi,
    roomApi,
    subjectApi,
    teacherApi,
    timeSlotApi,
    timetableApi,
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
import DiagnosticsPanel from "./components/DiagnosticsPanel";
import ExportModal from "./components/ExportModal";
import GenerateOptionsModal from "./components/GenerateOptionsModal";
import GenerationResultModal from "./components/GenerationResultModal";
import LessonDetailsModal from "./components/LessonDetailsModal";
import LessonFormModal from "./components/LessonFormModal";
import LunchSettingsPanel from "./components/LunchSettingsPanel";
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
type MainTab = "schedule" | "diagnostics" | "settings";

type DeleteTarget =
    | { type: "timetable"; entityName: string }
    | { type: "lesson"; entityName: string; lesson: LessonResponse }
    | { type: "assignment"; entityName: string; assignment: AssignmentResponse }
    | { type: "lunch"; entityName: string; lunch: LunchResponse };

const VISIBLE_DAYS = DAYS_OF_WEEK.filter((day) => day !== "SUNDAY");
const MIN_GRID_ZOOM = 60;
const MAX_GRID_ZOOM = 150;
const GRID_ZOOM_STEP = 10;

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

function getDisplayTimetableName(name: string) {
    return name.replace(/\s+v\d+$/i, "").trim();
}

function findLessonRoomId(lesson: LessonResponse | null, rooms: RoomResponse[]) {
    if (!lesson?.roomName) return undefined;
    return rooms.find((room) => room.name === lesson.roomName)?.id;
}

function makeLessonExportText(lesson: LessonResponse) {
    return [lesson.subjectName, lesson.teacherName, lesson.roomName || "No room"].join("\n");
}

function getLessonForExportCell(lessons: LessonResponse[], groupName: string, slot: TimeSlot, day: DayOfWeek) {
    return lessons.find((lesson) =>
        lesson.groupNames.includes(groupName) &&
        formatTime(lesson.startTime) === formatTime(slot.startTime) &&
        lesson.dayOfWeek === day,
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
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [generatingMode, setGeneratingMode] = useState<GenerationMode | null>(null);
    const [showExportModal, setShowExportModal] = useState(false);
    const [generationResult, setGenerationResult] = useState<GenerationResponse | null>(null);
    const [manualAssignmentId, setManualAssignmentId] = useState<number | null>(null);

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

    const [timeSlotModalOpen, setTimeSlotModalOpen] = useState(false);
    const [editingTimeSlot, setEditingTimeSlot] = useState<TimeSlot | null>(null);

    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
    const [deleteMode, setDeleteMode] = useState<DeleteMode>("SIMPLE");

    const [selectedDay, setSelectedDay] = useState<DayOfWeek | "ALL">("ALL");
    const [selectedFaculty, setSelectedFaculty] = useState<FilterValue>("ALL");
    const [selectedDepartment, setSelectedDepartment] = useState<FilterValue>("ALL");
    const [selectedGroup, setSelectedGroup] = useState<FilterValue>("ALL");
    const [density, setDensity] = useState<GridDensity>("medium");
    const [gridZoom, setGridZoom] = useState(100);
    const [editingGridZoom, setEditingGridZoom] = useState(false);
    const [gridZoomDraft, setGridZoomDraft] = useState("100");
    const [mainTab, setMainTab] = useState<MainTab>("schedule");

    useEffect(() => {
        if (!timetableId || Number.isNaN(timetableId) || timetableId <= 0) {
            setLoading(false);
            setError("Invalid timetable ID");
            return;
        }

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
        } catch (err) {
            const message = getApiErrorMessage(err, "Failed to load timetable data");
            setError(message);
            toast.error(message);
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
        try {
            setActionLoading(true);
            setGeneratingMode(mode);
            setError("");

            const result = await timetableApi.generateTimetable(timetableId, mode);
            setGenerationResult(result);
            setShowGenerateModal(false);
            await loadData();

            toast.success(`Generated ${result.placedLessonsCount} lessons. Failed: ${result.failedVerticesCount}.`);
        } catch (err) {
            const message = getApiErrorMessage(err, "Generation failed");
            setError(message);
            toast.error(message);
        } finally {
            setGeneratingMode(null);
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
            toast.error(message);
        } finally {
            setPublishing(false);
            setActionLoading(false);
        }
    };

    const requestDelete = (target: DeleteTarget) => {
        setDeleteTarget(target);
        setDeleteMode("SIMPLE");
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;

        try {
            setActionLoading(true);
            setError("");

            if (deleteTarget.type === "timetable") {
                await timetableApi.deleteTimetable(timetableId, deleteMode);
                toast.success("Timetable deleted");
                window.location.href = "/timetables";
                return;
            }

            if (deleteTarget.type === "lesson") {
                await lessonApi.deleteLesson(timetableId, deleteTarget.lesson.id);
                toast.success("Lesson deleted");
            }

            if (deleteTarget.type === "assignment") {
                await assignmentApi.deleteAssignment(timetableId, deleteTarget.assignment.id);
                toast.success("Assignment deleted");
            }

            if (deleteTarget.type === "lunch") {
                await lunchApi.deleteLunch(deleteTarget.lunch.id);
                toast.success("Lunch block deleted");
            }

            setDeleteTarget(null);
            await loadData();
        } catch (err) {
            const message = getApiErrorMessage(err, "Delete failed");
            setError(message);
            toast.error(message);
        } finally {
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
            const rows: string[][] = [];
            const merges: XLSX.Range[] = [];
            const styledCells = new Map<string, { fill: string; text: string; bold?: boolean }>();
            let currentExcelRow = 1;

            daysToExport.forEach((day) => {
                const dayStartRow = currentExcelRow;

                groupsToExport.forEach((group, groupIndex) => {
                    const row: string[] = [groupIndex === 0 ? day : "", group.name];
                    let slotIndex = 0;

                    while (slotIndex < slotsToExport.length) {
                        const slot = slotsToExport[slotIndex];
                        const lesson = getLessonForExportCell(filteredLessons, group.name, slot, day);

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
                        } else {
                            row.push("");
                            slotIndex += 1;
                        }
                    }

                    rows.push(row);
                    currentExcelRow += 1;
                });

                if (groupsToExport.length > 1) {
                    merges.push({
                        s: { r: dayStartRow, c: 0 },
                        e: { r: dayStartRow + groupsToExport.length - 1, c: 0 },
                    });
                }
            });

            const worksheet = XLSX.utils.aoa_to_sheet([]);
            const workbook = XLSX.utils.book_new();

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

            XLSX.utils.book_append_sheet(workbook, worksheet, "Timetable");
            XLSX.writeFile(workbook, `${fileName}.xlsx`);
        } else {
            const groupsPerPage = 10;
            const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            let isFirstPage = true;

            const drawPageHeader = (day: DayOfWeek, pagePart: number) => {
                doc.setFillColor(17, 24, 39);
                doc.rect(0, 0, pageWidth, 24, "F");
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(14);
                doc.text(displayTimetableName, 12, 12);
                doc.setFontSize(9);
                doc.text(
                    `${timetable.academicYearStart}-${timetable.academicYearEnd} - ${timetable.semester} - ${day}${pagePart > 1 ? ` - Part ${pagePart}` : ""}`,
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

            daysToExport.forEach((day) => {
                for (let startIndex = 0; startIndex < groupsToExport.length; startIndex += groupsPerPage) {
                    const pagePart = Math.floor(startIndex / groupsPerPage) + 1;
                    const groupsChunk = groupsToExport.slice(startIndex, startIndex + groupsPerPage);

                    if (!isFirstPage) {
                        doc.addPage();
                    }

                    isFirstPage = false;
                    drawPageHeader(day, pagePart);

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
                toast.error("Manual placement failed because of conflicts");
                return;
            }

            await loadData();
            closeManualModal();
            toast.success("Lesson placed manually");
        } catch (err) {
            const message = getApiErrorMessage(err, "Manual placement failed");
            setError(message);
            toast.error(message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleSaveAssignment = async (data: AssignmentRequest) => {
        try {
            setActionLoading(true);
            setError("");

            if (editingAssignment) {
                await assignmentApi.updateAssignment(timetableId, editingAssignment.id, data);
                toast.success("Assignment updated");
            } else {
                await assignmentApi.createAssignment(timetableId, data);
                toast.success("Assignment created");
            }

            setShowAssignmentForm(false);
            setEditingAssignment(null);
            await loadData();
        } catch (err) {
            const message = getApiErrorMessage(err, "Failed to save assignment");
            setError(message);
            toast.error(message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleCellClick = (group: StudyGroupResponse, slot: TimeSlot, day?: DayOfWeek) => {
        setEditingLesson(null);
        setLessonInitialValues({
            groupName: group.name,
            dayOfWeek: day ?? (selectedDay === "ALL" ? undefined : selectedDay),
            startTime: formatTime(slot.startTime),
            durationHours: 1,
        });
        setLessonFormOpen(true);
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
            toast.error(message);
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
            toast.error(message);
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
            toast.error(message);
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

            {error && <Card className="mb-6 border-red-200 bg-red-50 text-red-800"><CardContent className="p-4 text-sm">{error}</CardContent></Card>}

            <Card className="glass-card mt-6">
                <CardHeader>
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            {(["schedule", "diagnostics", "settings"] as MainTab[]).map((tab) => (
                                <Button key={tab} variant={mainTab === tab ? "default" : "outline"} onClick={() => setMainTab(tab)}>
                                    {tab === "schedule" ? "Schedule" : tab === "diagnostics" ? "Diagnostics" : "Settings"}
                                </Button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <select value={selectedDay} onChange={(event) => setSelectedDay(event.target.value as DayOfWeek | "ALL")} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm"><option value="ALL">All days</option>{VISIBLE_DAYS.map((day) => <option key={day} value={day}>{day.charAt(0) + day.slice(1).toLowerCase()}</option>)}</select>
                            <select value={selectedFaculty} onChange={(event) => setSelectedFaculty(event.target.value === "ALL" ? "ALL" : Number(event.target.value))} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm"><option value="ALL">All faculties</option>{faculties.map((faculty) => <option key={faculty.id} value={faculty.id}>{faculty.name}</option>)}</select>
                            <select value={selectedDepartment} onChange={(event) => setSelectedDepartment(event.target.value === "ALL" ? "ALL" : Number(event.target.value))} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm"><option value="ALL">All departments</option>{filteredDepartments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select>
                            <select value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value === "ALL" ? "ALL" : Number(event.target.value))} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm"><option value="ALL">All groups</option>{filteredGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
                        </div>

                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" onClick={() => setShowGenerateModal(true)} disabled={actionLoading}><Play className="h-4 w-4" />Generate</Button>
                                <Button variant="outline" onClick={handlePublish} disabled={actionLoading || timetable.status === "PUBLISHED"}>{publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Publish</Button>
                                <Button variant="outline" onClick={() => setShowExportModal(true)}><FileDown className="h-4 w-4" />Export</Button>
                                <Button variant="outline" onClick={() => setAssignmentsDrawerOpen(true)}><ClipboardList className="h-4 w-4" />Assignments <Badge variant="secondary">{assignments.length}</Badge></Button>
                                <Button variant="destructive" onClick={() => requestDelete({ type: "timetable", entityName: timetable.name })}><Trash2 className="h-4 w-4" />Delete</Button>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm text-muted-foreground">View:</span>
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
                                <Button size="sm" variant="outline" onClick={() => { setEditingTimeSlot(null); setTimeSlotModalOpen(true); }}><Settings2 className="h-4 w-4" />Time slot</Button>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                {mainTab === "schedule" && (
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
                                onCellClick={handleCellClick}
                                onLessonClick={handleLessonClick}
                                onLessonEdit={(lesson) => {
                                    setEditingLesson(lesson);
                                    setLessonInitialValues({ roomId: findLessonRoomId(lesson, rooms) });
                                    setLessonFormOpen(true);
                                }}
                                onLessonDelete={(lesson) => requestDelete({ type: "lesson", entityName: lesson.subjectName, lesson })}
                                onTimeSlotDoubleClick={(slot) => { setEditingTimeSlot(slot); setTimeSlotModalOpen(true); }}
                            />
                        </div>
                    </CardContent>
                )}
            </Card>

            {mainTab === "diagnostics" && (
                <DiagnosticsPanel
                    assignments={assignments}
                    generationResult={generationResult}
                    onManualPlace={openManualModal}
                    onEditAssignment={(assignment) => { setEditingAssignment(assignment); setShowAssignmentForm(true); }}
                />
            )}

            {mainTab === "settings" && (
                <LunchSettingsPanel
                    timetableId={timetableId}
                    lunches={lunches}
                    groups={filteredGroups.length > 0 ? filteredGroups : groups}
                    saving={actionLoading}
                    onCreate={handleCreateLunch}
                    onDelete={(lunch) => requestDelete({ type: "lunch", entityName: `Lunch ${formatTime(lunch.startTime)}-${formatTime(lunch.endTime)}`, lunch })}
                />
            )}

            <AssignmentsDrawer
                open={assignmentsDrawerOpen}
                assignments={assignments}
                onClose={() => setAssignmentsDrawerOpen(false)}
                onCreateAssignment={() => { setEditingAssignment(null); setShowAssignmentForm(true); }}
                onEditAssignment={(assignment) => { setEditingAssignment(assignment); setShowAssignmentForm(true); }}
                onDeleteAssignment={(assignment) => requestDelete({ type: "assignment", entityName: assignment.subjectName, assignment })}
                onManualPlace={(assignment) => openManualModal(assignment.id)}
            />

            <Dialog open={showAssignmentForm} onOpenChange={(open) => { if (!open) { setShowAssignmentForm(false); setEditingAssignment(null); } }}>
                <DialogContent className="custom-scrollbar max-h-[90vh] max-w-2xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingAssignment ? "Edit Assignment" : "New Assignment"}</DialogTitle>
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

            <GenerateOptionsModal isOpen={showGenerateModal} onClose={() => setShowGenerateModal(false)} onGenerate={handleGenerate} timetableName={timetable.name} loading={Boolean(generatingMode)} loadingMode={generatingMode} />
            <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} onExport={handleExport} timetableName={timetable.name} />

            {generationResult && (
                <GenerationResultModal result={generationResult} onClose={() => setGenerationResult(null)} onManualPlace={(assignmentId) => { setGenerationResult(null); openManualModal(assignmentId); }} />
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

            <DeleteModeDialog
                open={Boolean(deleteTarget)}
                title={deleteTarget?.type === "timetable" ? "Delete timetable?" : deleteTarget?.type === "assignment" ? "Delete assignment?" : deleteTarget?.type === "lunch" ? "Delete lunch block?" : "Delete lesson?"}
                description={deleteTarget?.type === "timetable" ? "This will delete the timetable and related schedule data." : "This action removes the selected item."}
                entityName={deleteTarget?.entityName}
                selectedMode={deleteMode}
                loading={actionLoading}
                showModeSelector={deleteTarget?.type === "timetable"}
                onModeChange={setDeleteMode}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleConfirmDelete}
            />
        </AppShell>
    );
}
