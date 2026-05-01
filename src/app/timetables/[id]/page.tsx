"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
    ArrowLeft,
    CalendarDays,
    ClipboardList,
    FileDown,
    Loader2,
    Play,
    Plus,
    RefreshCcw,
    Send,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
    assignmentApi,
    departmentApi,
    facultyApi,
    groupApi,
    lessonApi,
    roomApi,
    subjectApi,
    teacherApi,
    timetableApi,
    timeSlotApi,
} from "@/lib";
import type {
    AssignmentResponse,
    DayOfWeek,
    FacultyResponse,
    GenerationMode,
    GenerationResponse,
    LessonResponse,
    RoomResponse,
    StudyGroupResponse,
    SubjectResponse,
    TeacherResponse,
    TimeSlot,
    TimetableResponse,
    TimetableStatus,
} from "@/lib/types";
import { DAYS_OF_WEEK, DAYS_SHORT } from "@/lib/constants";

import AssignmentForm from "./assignments/components/AssignmentForm";
import ExportModal from "./components/ExportModal";
import GenerateOptionsModal from "./components/GenerateOptionsModal";
import GenerationResultModal from "./components/GenerationResultModal";
import ManualPlacementModal from "./components/ManualPlacementModal";
import TimetableGrid from "./components/TimetableGrid";

type DepartmentOption = {
    id: number;
    name: string;
    facultyId: number;
    facultyName?: string;
};

type FilterValue = number | "ALL";

const VISIBLE_DAYS = DAYS_OF_WEEK.filter((day) => day !== "SUNDAY");

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

function getLessonDurationSpan(
    lesson: LessonResponse,
    slotIndex: number,
    totalSlots: number,
) {
    const duration = Number(lesson.durationHours);

    if (!Number.isFinite(duration) || duration < 1) {
        return 1;
    }

    return Math.min(Math.max(1, Math.round(duration)), totalSlots - slotIndex);
}

function getLessonForExportCell(
    lessons: LessonResponse[],
    groupName: string,
    slot: TimeSlot,
    day: DayOfWeek,
) {
    return lessons.find((lesson) => {
        return (
            lesson.groupNames.includes(groupName) &&
            formatTime(lesson.startTime) === formatTime(slot.startTime) &&
            lesson.dayOfWeek === day
        );
    });
}

function makeLessonExportText(lesson: LessonResponse) {
    return [
        lesson.subjectName,
        lesson.teacherName,
        lesson.roomName || "No room",
    ].join("\n");
}

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
            return "Invalid request. Check selected data and try again.";
        }

        if (axiosError.response?.status === 403) {
            return "You do not have permission to perform this action.";
        }

        if (axiosError.response?.status === 404) {
            return "Timetable data was not found.";
        }
    }

    return fallback;
}

function getStatusVariant(status: TimetableStatus) {
    switch (status) {
        case "PUBLISHED":
            return "success";
        case "GENERATED":
            return "info";
        case "PARTIAL":
            return "warning";
        case "ARCHIVED":
            return "secondary";
        default:
            return "outline";
    }
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

export default function TimetableDetailPage({
                                                params,
                                            }: {
    params: Promise<{ id: string }>;
}) {
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

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [showAssignmentForm, setShowAssignmentForm] = useState(false);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showAssignments, setShowAssignments] = useState(false);

    const [generating, setGenerating] = useState(false);
    const [publishing, setPublishing] = useState(false);

    const [generationResult, setGenerationResult] =
        useState<GenerationResponse | null>(null);
    const [manualAssignmentId, setManualAssignmentId] = useState<number | null>(
        null,
    );

    const [selectedDay, setSelectedDay] = useState<DayOfWeek | "ALL">("ALL");
    const [selectedFaculty, setSelectedFaculty] = useState<FilterValue>("ALL");
    const [selectedDepartment, setSelectedDepartment] =
        useState<FilterValue>("ALL");
    const [selectedGroup, setSelectedGroup] = useState<FilterValue>("ALL");

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
            setSuccessMessage("");

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
        } catch (err) {
            setError(getApiErrorMessage(err, "Failed to load timetable data"));
        } finally {
            if (initial) setLoading(false);
        }
    };

    const filteredDepartments = useMemo(() => {
        if (selectedFaculty === "ALL") return departments;

        return departments.filter(
            (department) => department.facultyId === selectedFaculty,
        );
    }, [departments, selectedFaculty]);

    const filteredGroups = useMemo(() => {
        let result = groups;

        if (selectedFaculty !== "ALL") {
            result = result.filter((group) => group.facultyId === selectedFaculty);
        }

        if (selectedDepartment !== "ALL") {
            result = result.filter(
                (group) => group.departmentId === selectedDepartment,
            );
        }

        if (selectedGroup !== "ALL") {
            result = result.filter((group) => group.id === selectedGroup);
        }

        return result;
    }, [groups, selectedFaculty, selectedDepartment, selectedGroup]);

    const filteredLessons = useMemo(() => {
        const allowedGroupNames = new Set(
            filteredGroups.map((group) => group.name),
        );

        const byGroup = lessons.filter((lesson) =>
            lesson.groupNames.some((groupName) => allowedGroupNames.has(groupName)),
        );

        if (selectedDay === "ALL") return byGroup;

        return byGroup.filter((lesson) => lesson.dayOfWeek === selectedDay);
    }, [lessons, filteredGroups, selectedDay]);

    const scheduledAssignments = useMemo(() => {
        return assignments.filter(
            (assignment) => assignment.placementStatus === "SCHEDULED",
        ).length;
    }, [assignments]);

    const failedAssignments = useMemo(() => {
        return assignments.filter(
            (assignment) =>
                assignment.requiresManualInput ||
                assignment.placementStatus === "FAILED",
        ).length;
    }, [assignments]);

    const handleGenerate = async (mode: GenerationMode) => {
        try {
            setGenerating(true);
            setError("");
            setSuccessMessage("");

            const result = await timetableApi.generateTimetable(timetableId, mode);

            setGenerationResult(result);
            setShowGenerateModal(false);

            await loadData();

            setSuccessMessage(
                `Generated ${result.placedLessonsCount} lessons. Failed: ${result.failedVerticesCount}.`,
            );
        } catch (err) {
            setError(getApiErrorMessage(err, "Generation failed"));
        } finally {
            setGenerating(false);
        }
    };

    const handlePublish = async () => {
        if (!timetable) return;

        if (timetable.status === "PUBLISHED") return;

        if (!confirm(`Publish timetable "${timetable.name}"?`)) return;

        try {
            setPublishing(true);
            setError("");
            setSuccessMessage("");

            await timetableApi.publishTimetable(timetableId);
            await loadData();

            setSuccessMessage("Timetable published successfully");
        } catch (err) {
            setError(getApiErrorMessage(err, "Failed to publish timetable"));
        } finally {
            setPublishing(false);
        }
    };

    const handleDelete = async () => {
        if (!timetable) return;

        if (!confirm(`Delete timetable "${timetable.name}"?`)) return;

        try {
            setError("");

            await timetableApi.deleteTimetable(timetableId);

            window.location.href = "/timetables";
        } catch (err) {
            setError(getApiErrorMessage(err, "Failed to delete timetable"));
        }
    };

    const handleExport = async (format: "pdf" | "excel") => {
        if (!timetable) return;

        const slotsToExport = [...timeSlots].sort((a, b) => a.order - b.order);
        const groupsToExport = filteredGroups;

        const daysToExport =
            selectedDay === "ALL"
                ? VISIBLE_DAYS
                : [selectedDay];

        const headers = [
            "Day",
            "Group",
            ...slotsToExport.map(
                (slot) =>
                    `${formatTime(slot.startTime)}–${formatTime(slot.endTime)}`,
            ),
        ];

        const fileBaseName = `timetable_${timetable.id}_${
            selectedDay === "ALL" ? "all_days" : selectedDay.toLowerCase()
        }`;

        if (format === "excel") {
            const rows: string[][] = [];
            const merges: XLSX.Range[] = [];
            const styledCells = new Map<
                string,
                {
                    fill: string;
                    text: string;
                    bold?: boolean;
                    center?: boolean;
                }
            >();

            let currentExcelRow = 1;

            daysToExport.forEach((day) => {
                const dayStartRow = currentExcelRow;

                groupsToExport.forEach((group, groupIndex) => {
                    const row: string[] = [
                        groupIndex === 0 ? day : "",
                        group.name,
                    ];

                    let slotIndex = 0;

                    while (slotIndex < slotsToExport.length) {
                        const slot = slotsToExport[slotIndex];
                        const lesson = getLessonForExportCell(
                            filteredLessons,
                            group.name,
                            slot,
                            day,
                        );

                        if (lesson) {
                            const span = getLessonDurationSpan(
                                lesson,
                                slotIndex,
                                slotsToExport.length,
                            );

                            row.push(makeLessonExportText(lesson));

                            const cellColumnIndex = 2 + slotIndex;
                            const cellAddress = XLSX.utils.encode_cell({
                                r: currentExcelRow,
                                c: cellColumnIndex,
                            });

                            const color = getExportColorByLesson(lesson);

                            styledCells.set(cellAddress, {
                                fill: color.fill,
                                text: color.text,
                                bold: true,
                            });

                            if (span > 1) {
                                merges.push({
                                    s: {
                                        r: currentExcelRow,
                                        c: cellColumnIndex,
                                    },
                                    e: {
                                        r: currentExcelRow,
                                        c: cellColumnIndex + span - 1,
                                    },
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
                        s: {
                            r: dayStartRow,
                            c: 0,
                        },
                        e: {
                            r: dayStartRow + groupsToExport.length - 1,
                            c: 0,
                        },
                    });
                }
            });

            const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
            const workbook = XLSX.utils.book_new();

            worksheet["!cols"] = [
                { wch: 16 },
                { wch: 20 },
                ...slotsToExport.map(() => ({ wch: 24 })),
            ];

            worksheet["!rows"] = [
                { hpt: 28 },
                ...rows.map(() => ({ hpt: 58 })),
            ];

            worksheet["!merges"] = merges;

            const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");

            for (let row = range.s.r; row <= range.e.r; row += 1) {
                for (let col = range.s.c; col <= range.e.c; col += 1) {
                    const address = XLSX.utils.encode_cell({ r: row, c: col });

                    if (!worksheet[address]) {
                        worksheet[address] = {
                            t: "s",
                            v: "",
                        };
                    }

                    const cell = worksheet[address];
                    const value = String(cell.v || "");

                    const isHeader = row === 0;
                    const isDayColumn = col === 0;
                    const isGroupColumn = col === 1;
                    const customStyle = styledCells.get(address);

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
                        textColor = "111827";
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
                        fill: {
                            patternType: "solid",
                            fgColor: { rgb: fillColor },
                        },
                        font: {
                            bold,
                            color: { rgb: textColor },
                            sz: isHeader ? 11 : 9,
                        },
                        alignment: {
                            vertical: "center",
                            horizontal,
                            wrapText: true,
                        },
                        border: {
                            top: {
                                style: "thin",
                                color: { rgb: "CBD5E1" },
                            },
                            bottom: {
                                style: "thin",
                                color: { rgb: "CBD5E1" },
                            },
                            left: {
                                style: "thin",
                                color: { rgb: "CBD5E1" },
                            },
                            right: {
                                style: "thin",
                                color: { rgb: "CBD5E1" },
                            },
                        },
                    };
                }
            }

            const titleRow = [
                `${timetable.name} · ${timetable.academicYearStart}–${timetable.academicYearEnd} · ${timetable.semester}`,
            ];

            XLSX.utils.sheet_add_aoa(worksheet, [titleRow], {
                origin: "A1",
            });

            XLSX.utils.sheet_add_aoa(worksheet, [headers, ...rows], {
                origin: "A3",
            });

            worksheet["!merges"] = [
                {
                    s: { r: 0, c: 0 },
                    e: { r: 0, c: Math.max(2, headers.length - 1) },
                },
                ...merges.map((merge) => ({
                    s: {
                        r: merge.s.r + 2,
                        c: merge.s.c,
                    },
                    e: {
                        r: merge.e.r + 2,
                        c: merge.e.c,
                    },
                })),
            ];

            worksheet["A1"].s = {
                fill: {
                    patternType: "solid",
                    fgColor: { rgb: "111827" },
                },
                font: {
                    bold: true,
                    color: { rgb: "FFFFFF" },
                    sz: 14,
                },
                alignment: {
                    vertical: "center",
                    horizontal: "left",
                },
            };

            const shiftedRange = XLSX.utils.decode_range(
                worksheet["!ref"] || "A1",
            );

            for (let row = 2; row <= shiftedRange.e.r; row += 1) {
                for (let col = shiftedRange.s.c; col <= shiftedRange.e.c; col += 1) {
                    const address = XLSX.utils.encode_cell({ r: row, c: col });
                    const cell = worksheet[address];

                    if (!cell) continue;

                    const originalAddress = XLSX.utils.encode_cell({
                        r: row - 2,
                        c: col,
                    });

                    const customStyle = styledCells.get(originalAddress);
                    const value = String(cell.v || "");

                    const isHeader = row === 2;
                    const isDayColumn = col === 0;
                    const isGroupColumn = col === 1;

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
                        textColor = "111827";
                        bold = true;
                    } else if (customStyle) {
                        fillColor = customStyle.fill;
                        textColor = customStyle.text;
                        bold = true;
                    } else if (value.trim()) {
                        const color = getExportColorByText(value.split("\n")[0]);
                        fillColor = color.fill;
                        textColor = color.text;
                        bold = true;
                    }

                    cell.s = {
                        fill: {
                            patternType: "solid",
                            fgColor: { rgb: fillColor },
                        },
                        font: {
                            bold,
                            color: { rgb: textColor },
                            sz: isHeader ? 11 : 9,
                        },
                        alignment: {
                            vertical: "center",
                            horizontal,
                            wrapText: true,
                        },
                        border: {
                            top: {
                                style: "thin",
                                color: { rgb: "CBD5E1" },
                            },
                            bottom: {
                                style: "thin",
                                color: { rgb: "CBD5E1" },
                            },
                            left: {
                                style: "thin",
                                color: { rgb: "CBD5E1" },
                            },
                            right: {
                                style: "thin",
                                color: { rgb: "CBD5E1" },
                            },
                        },
                    };
                }
            }

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

            XLSX.utils.book_append_sheet(workbook, worksheet, "Timetable");
            XLSX.writeFile(workbook, `${fileBaseName}.xlsx`);
        } else {
            const GROUPS_PER_PAGE = 10;

            const doc = new jsPDF({
                orientation: "landscape",
                unit: "mm",
                format: "a3",
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            let isFirstPage = true;

            const drawPageHeader = (day: DayOfWeek, pagePart: number) => {
                doc.setFillColor(17, 24, 39);
                doc.rect(0, 0, pageWidth, 24, "F");

                doc.setTextColor(255, 255, 255);
                doc.setFontSize(14);
                doc.text(timetable.name, 12, 12);

                doc.setFontSize(9);
                doc.text(
                    `${timetable.academicYearStart}–${timetable.academicYearEnd} · ${timetable.semester} · ${day}${
                        pagePart > 1 ? ` · Part ${pagePart}` : ""
                    }`,
                    12,
                    18,
                );
            };

            const drawFooter = () => {
                doc.setFontSize(8);
                doc.setTextColor(100);

                doc.text(
                    `Generated from Timetable Generator · ${new Date().toLocaleDateString()}`,
                    12,
                    pageHeight - 8,
                );
            };

            const buildRowsForDay = (
                day: DayOfWeek,
                groupsChunk: StudyGroupResponse[],
            ) => {
                const bodyRows: any[][] = [];

                groupsChunk.forEach((group) => {
                    const row: any[] = [];

                    row.push({
                        content: group.name,
                        styles: {
                            fillColor: [248, 250, 252],
                            textColor: [17, 24, 39],
                            fontStyle: "bold",
                            valign: "middle",
                        },
                    });

                    let slotIndex = 0;

                    while (slotIndex < slotsToExport.length) {
                        const slot = slotsToExport[slotIndex];

                        const lesson = getLessonForExportCell(
                            filteredLessons,
                            group.name,
                            slot,
                            day,
                        );

                        if (lesson) {
                            const span = getLessonDurationSpan(
                                lesson,
                                slotIndex,
                                slotsToExport.length,
                            );

                            const color = getExportColorByLesson(lesson);
                            const fill = hexToRgb(color.fill);
                            const text = hexToRgb(color.text);

                            row.push({
                                content: makeLessonExportText(lesson),
                                colSpan: span,
                                styles: {
                                    fillColor: fill,
                                    textColor: text,
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
                    content: `${formatTime(slot.startTime)}–${formatTime(slot.endTime)}`,
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
                for (
                    let startIndex = 0;
                    startIndex < groupsToExport.length;
                    startIndex += GROUPS_PER_PAGE
                ) {
                    const pagePart = Math.floor(startIndex / GROUPS_PER_PAGE) + 1;
                    const groupsChunk = groupsToExport.slice(
                        startIndex,
                        startIndex + GROUPS_PER_PAGE,
                    );

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
                        margin: {
                            left: 6,
                            right: 6,
                            bottom: 14,
                        },
                        tableWidth: "auto",
                        didDrawPage: drawFooter,
                    });
                }
            });

            doc.save(`${fileBaseName}.pdf`);
        }

        setShowExportModal(false);
    };

    const openManualModal = (assignmentId: number) => {
        setManualAssignmentId(assignmentId);
    };

    const closeManualModal = () => {
        setManualAssignmentId(null);
    };

    const handleManualPlace = async (data: {
        dayOfWeek: DayOfWeek;
        startTime: string;
        durationHours: number;
        roomId: number;
    }) => {
        if (!manualAssignmentId) return;

        try {
            setError("");
            setSuccessMessage("");

            const success = await timetableApi.manualPlaceLesson(
                timetableId,
                manualAssignmentId,
                data,
            );

            if (!success) {
                setError("Manual placement failed because of conflicts");
                return;
            }

            await loadData();
            closeManualModal();

            setSuccessMessage("Lesson placed manually");
        } catch (err) {
            setError(getApiErrorMessage(err, "Manual placement failed"));
        }
    };

    const handleSaveAssignment = async (data: unknown) => {
        try {
            setError("");
            setSuccessMessage("");

            await assignmentApi.createAssignment(timetableId, data);

            setShowAssignmentForm(false);
            await loadData();

            setSuccessMessage("Assignment created successfully");
        } catch (err) {
            setError(getApiErrorMessage(err, "Failed to create assignment"));
        }
    };

    const handleCellClick = () => {
        setShowAssignmentForm(true);
    };

    const handleLessonClick = (lesson: LessonResponse) => {
        alert(
            `${lesson.subjectName}\n${lesson.teacherName}\n${lesson.groupNames.join(", ")}\n${lesson.roomName || "No room"}`,
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

    if (!timetable) {
        return (
            <AppShell>
                <PageHeader
                    eyebrow="Scheduling"
                    title="Timetable not found"
                    description="The selected timetable could not be loaded."
                    actions={
                        <Button variant="outline" asChild>
                            <Link href="/timetables">
                                <ArrowLeft className="h-4 w-4" />
                                Back to timetables
                            </Link>
                        </Button>
                    }
                />

                <Card className="glass-card">
                    <CardContent className="py-12">
                        <EmptyState
                            title="Timetable not found"
                            description="Go back to timetables and select another version."
                            actionLabel="Back to timetables"
                            onAction={() => {
                                window.location.href = "/timetables";
                            }}
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
                title={timetable.name}
                description={`Timetable #${timetable.id} · ${timetable.status}`}
                actions={
                    <>
                        <Button variant="outline" asChild>
                            <Link href="/timetables">
                                <ArrowLeft className="h-4 w-4" />
                                Back
                            </Link>
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => void loadData(true)}
                        >
                            <RefreshCcw className="h-4 w-4" />
                            Refresh
                        </Button>

                        <Button onClick={() => setShowAssignmentForm(true)}>
                            <Plus className="h-4 w-4" />
                            Add assignment
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

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Status
                        </CardTitle>
                        <CalendarDays className="h-4 w-4 text-blue-700" />
                    </CardHeader>
                    <CardContent>
                        <Badge variant={getStatusVariant(timetable.status) as any}>
                            {timetable.status}
                        </Badge>
                        <p className="mt-3 text-xs text-muted-foreground">
                            Current timetable state
                        </p>
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Lessons
                        </CardTitle>
                        <ClipboardList className="h-4 w-4 text-violet-700" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{lessons.length}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Placed lessons
                        </p>
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Assignments
                        </CardTitle>
                        <Badge variant="info">Source</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {scheduledAssignments}/{assignments.length}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Scheduled assignments
                        </p>
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Manual
                        </CardTitle>
                        <Badge variant={failedAssignments > 0 ? "warning" : "secondary"}>
                            Review
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{failedAssignments}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Need manual placement
                        </p>
                    </CardContent>
                </Card>
            </section>

            <Card className="glass-card mt-6">
                <CardHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <select
                                value={selectedDay}
                                onChange={(event) =>
                                    setSelectedDay(event.target.value as DayOfWeek | "ALL")
                                }
                                className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="ALL">All days</option>
                                {VISIBLE_DAYS.map((day) => (
                                    <option key={day} value={day}>
                                        {DAYS_SHORT[day] ?? day}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={selectedFaculty}
                                onChange={(event) =>
                                    setSelectedFaculty(
                                        event.target.value === "ALL"
                                            ? "ALL"
                                            : Number(event.target.value),
                                    )
                                }
                                className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="ALL">All faculties</option>
                                {faculties.map((faculty) => (
                                    <option key={faculty.id} value={faculty.id}>
                                        {faculty.name}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={selectedDepartment}
                                onChange={(event) =>
                                    setSelectedDepartment(
                                        event.target.value === "ALL"
                                            ? "ALL"
                                            : Number(event.target.value),
                                    )
                                }
                                className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="ALL">All departments</option>
                                {filteredDepartments.map((department) => (
                                    <option key={department.id} value={department.id}>
                                        {department.name}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={selectedGroup}
                                onChange={(event) =>
                                    setSelectedGroup(
                                        event.target.value === "ALL"
                                            ? "ALL"
                                            : Number(event.target.value),
                                    )
                                }
                                className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="ALL">All groups</option>
                                {filteredGroups.map((group) => (
                                    <option key={group.id} value={group.id}>
                                        {group.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={() => setShowGenerateModal(true)}>
                                {generating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Play className="h-4 w-4" />
                                )}
                                Generate
                            </Button>

                            <Button
                                variant="outline"
                                onClick={handlePublish}
                                disabled={publishing || timetable.status === "PUBLISHED"}
                            >
                                {publishing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                                Publish
                            </Button>

                            <Button variant="outline" onClick={() => setShowExportModal(true)}>
                                <FileDown className="h-4 w-4" />
                                Export
                            </Button>

                            <Button variant="destructive" onClick={handleDelete}>
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="mb-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setShowAssignments((current) => !current)}
                        >
                            <ClipboardList className="h-4 w-4" />
                            Assignments ({assignments.length})
                        </Button>

                        {showAssignments && (
                            <div className="custom-scrollbar mt-3 max-h-64 overflow-y-auto rounded-2xl border border-border">
                                {assignments.length === 0 ? (
                                    <div className="p-4 text-sm text-muted-foreground">
                                        No assignments yet.
                                    </div>
                                ) : (
                                    assignments.map((assignment) => (
                                        <div
                                            key={assignment.id}
                                            className="flex flex-col gap-3 border-b border-border p-4 last:border-b-0 md:flex-row md:items-center md:justify-between"
                                        >
                                            <div>
                                                <div className="font-medium">
                                                    {assignment.subjectName}
                                                </div>
                                                <div className="mt-1 text-sm text-muted-foreground">
                                                    {assignment.teacherName} ·{" "}
                                                    {assignment.groupNames.join(", ")}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant={
                                                        getPlacementVariant(
                                                            assignment.placementStatus,
                                                        ) as any
                                                    }
                                                >
                                                    {assignment.placementStatus}
                                                </Badge>

                                                {assignment.requiresManualInput && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            openManualModal(
                                                                assignment.id,
                                                            )
                                                        }
                                                    >
                                                        Place manually
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    <div className="h-[620px] min-h-0">
                        <TimetableGrid
                            lessons={filteredLessons}
                            groups={filteredGroups}
                            selectedDay={selectedDay}
                            timeSlots={timeSlots}
                            onCellClick={handleCellClick}
                            onLessonClick={handleLessonClick}
                        />
                    </div>
                </CardContent>
            </Card>

            {showAssignmentForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <div className="glass-card custom-scrollbar max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-2xl">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-semibold">
                                    New Assignment
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Add subject, teacher, groups and scheduling constraints.
                                </p>
                            </div>

                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowAssignmentForm(false)}
                                aria-label="Close assignment form"
                            >
                                ✕
                            </Button>
                        </div>

                        <AssignmentForm
                            subjects={subjects}
                            teachers={teachers}
                            groups={groups}
                            rooms={rooms}
                            timeSlots={timeSlots}
                            onSave={handleSaveAssignment}
                            onCancel={() => setShowAssignmentForm(false)}
                        />
                    </div>
                </div>
            )}

            <GenerateOptionsModal
                isOpen={showGenerateModal}
                onClose={() => setShowGenerateModal(false)}
                onGenerate={handleGenerate}
                timetableName={timetable.name}
                loading={generating}
            />

            <ExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onExport={handleExport}
                timetableName={timetable.name}
            />

            {generationResult && (
                <GenerationResultModal
                    result={generationResult}
                    onClose={() => setGenerationResult(null)}
                    onManualPlace={(assignmentId) => {
                        setGenerationResult(null);
                        openManualModal(assignmentId);
                    }}
                />
            )}

            {manualAssignmentId && (
                <ManualPlacementModal
                    assignmentId={manualAssignmentId}
                    rooms={rooms}
                    onPlace={handleManualPlace}
                    onClose={closeManualModal}
                />
            )}
        </AppShell>
    );
}