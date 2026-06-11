"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { Check, ChevronDown, FileDown, Loader2, Minus, Plus, RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { publicTimetableApi } from "@/lib";
import { DAYS_OF_WEEK } from "@/lib/constants";
import type {
    DayOfWeek,
    LessonResponse,
    LunchResponse,
    PublicTimetableFilterOptionsResponse,
    PublicFilterOptionResponse,
    PublicTimetableLessonResponse,
    PublicTimetableQuery,
    PublicTimetableScheduleResponse,
    StudyGroupResponse,
    TimeSlot as AdminTimeSlot,
} from "@/lib/types";
import ExportModal from "../timetables/[id]/components/ExportModal";
import TimetableGrid, { type GridDensity } from "../timetables/[id]/components/TimetableGrid";

type FilterKey = "facultyId" | "departmentId" | "groupId" | "teacherId" | "roomId";
type RowMode = "group" | "room";

type FilterState = Record<FilterKey, string> & {
    dayOfWeek: DayOfWeek | "ALL";
};

type TimeSlot = AdminTimeSlot & { key: string };

interface RowItem {
    id: number;
    name: string;
}

type PublicTimetableFilterOptions = PublicTimetableFilterOptionsResponse;

const EMPTY_FILTERS: FilterState = {
    facultyId: "",
    departmentId: "",
    groupId: "",
    teacherId: "",
    roomId: "",
    dayOfWeek: "ALL",
};

const EMPTY_OPTIONS: PublicFilterOptionResponse[] = [];
const EMPTY_LUNCHES: LunchResponse[] = [];
const EMPTY_FILTER_OPTIONS: PublicTimetableFilterOptions = {
    faculties: EMPTY_OPTIONS,
    departments: EMPTY_OPTIONS,
    groups: EMPTY_OPTIONS,
    teachers: EMPTY_OPTIONS,
    rooms: EMPTY_OPTIONS,
};
const ALL_ROOMS_VALUE = "__ALL_ROOMS__";
const DENSITY_OPTIONS: GridDensity[] = ["compact", "medium", "large"];

const SECONDARY_FILTERS: {
    key: FilterKey;
    label: string;
    placeholder: string;
    source: keyof Pick<PublicTimetableFilterOptions, "departments" | "groups" | "teachers" | "rooms">;
}[] = [
    { key: "departmentId", label: "Department", placeholder: "All departments", source: "departments" },
    { key: "groupId", label: "Group", placeholder: "All groups", source: "groups" },
    { key: "teacherId", label: "Teacher", placeholder: "All teachers", source: "teachers" },
    { key: "roomId", label: "Room", placeholder: "Choose room", source: "rooms" },
];

const VISIBLE_DAYS = DAYS_OF_WEEK.filter((day) => day !== "SUNDAY");
const MIN_GRID_ZOOM = 60;
const MAX_GRID_ZOOM = 150;
const GRID_ZOOM_STEP = 10;

const STANDARD_TIME_SLOTS: TimeSlot[] = [
    { id: 1, key: "08:00", order: 1, startTime: "08:00:00", endTime: "08:40:00", description: "1st lesson" },
    { id: 2, key: "08:45", order: 2, startTime: "08:45:00", endTime: "09:25:00", description: "2nd lesson" },
    { id: 3, key: "09:30", order: 3, startTime: "09:30:00", endTime: "10:10:00", description: "3rd lesson" },
    { id: 4, key: "10:15", order: 4, startTime: "10:15:00", endTime: "10:55:00", description: "4th lesson" },
    { id: 5, key: "11:00", order: 5, startTime: "11:00:00", endTime: "11:40:00", description: "5th lesson" },
    { id: 6, key: "11:45", order: 6, startTime: "11:45:00", endTime: "12:25:00", description: "6th lesson" },
    { id: 7, key: "12:30", order: 7, startTime: "12:30:00", endTime: "13:10:00", description: "7th lesson" },
    { id: 8, key: "13:15", order: 8, startTime: "13:15:00", endTime: "13:55:00", description: "8th lesson" },
    { id: 9, key: "14:00", order: 9, startTime: "14:00:00", endTime: "14:40:00", description: "9th lesson" },
    { id: 10, key: "14:45", order: 10, startTime: "14:45:00", endTime: "15:25:00", description: "10th lesson" },
    { id: 11, key: "15:30", order: 11, startTime: "15:30:00", endTime: "16:10:00", description: "11th lesson" },
    { id: 12, key: "16:15", order: 12, startTime: "16:15:00", endTime: "16:55:00", description: "12th lesson" },
    { id: 13, key: "17:00", order: 13, startTime: "17:00:00", endTime: "17:40:00", description: "13th lesson" },
    { id: 14, key: "17:45", order: 14, startTime: "17:45:00", endTime: "18:25:00", description: "14th lesson" },
];

const EXPORT_COLORS = [
    { fill: "DBEAFE", text: "1E3A8A" },
    { fill: "D1FAE5", text: "065F46" },
    { fill: "EDE9FE", text: "5B21B6" },
    { fill: "FEF3C7", text: "92400E" },
    { fill: "FFE4E6", text: "9F1239" },
    { fill: "CFFAFE", text: "155E75" },
    { fill: "FAE8FF", text: "86198F" },
    { fill: "ECFCCB", text: "3F6212" },
];
const LUNCH_EXPORT_STYLE = { fill: "FEF3C7", text: "92400E" };

function formatDay(day: DayOfWeek) {
    return day.charAt(0) + day.slice(1).toLowerCase();
}

function formatTime(time: string) {
    return time?.slice(0, 5) || "";
}

function timeToMinutes(time: string) {
    const [hours, minutes] = formatTime(time).split(":").map(Number);
    return hours * 60 + minutes;
}

function getQuery(filters: FilterState): PublicTimetableQuery {
    const query: PublicTimetableQuery = {};

    (["facultyId", "departmentId", "groupId", "teacherId", "roomId"] as FilterKey[]).forEach((key) => {
        if (filters[key] && filters[key] !== ALL_ROOMS_VALUE) {
            query[key] = Number(filters[key]);
        }
    });

    if (filters.dayOfWeek !== "ALL") {
        query.dayOfWeek = filters.dayOfWeek;
    }

    return query;
}

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

    for (let index = 0; index < value.length; index += 1) {
        hash = value.charCodeAt(index) + ((hash << 5) - hash);
    }

    return Math.abs(hash) % EXPORT_COLORS.length;
}

function getExportColor(value: string) {
    return EXPORT_COLORS[hashExportColor(value)];
}

function makeLessonExportText(lesson: PublicTimetableLessonResponse, teacherSelected: boolean, roomSelected: boolean) {
    const groups = lesson.groups.map((group) => group.name).join(", ");
    const secondLine = teacherSelected ? groups : lesson.teacherName;
    const thirdLine = roomSelected ? groups : lesson.roomName || "No room";

    return [lesson.subjectName, secondLine, thirdLine].join("\n");
}

function sanitizeFileName(value: string) {
    return value.match(/[a-z0-9а-яё_-]+/gi)?.join("_").toLowerCase() || "aiu_timetable";
}

function optionName(options: PublicFilterOptionResponse[], id: string) {
    return options.find((option) => String(option.id) === id)?.name;
}

function sortOptions(options: PublicFilterOptionResponse[]) {
    return options.sort((a, b) => a.name.localeCompare(b.name));
}

function mergeOptions(...optionLists: PublicFilterOptionResponse[][]) {
    const options = new Map<number, string>();

    optionLists.flat().forEach((option) => {
        if (option && Number.isFinite(option.id) && option.name) {
            options.set(option.id, option.name);
        }
    });

    return sortOptions([...options.entries()].map(([id, name]) => ({ id, name })));
}

function collectOptions(
    lessons: PublicTimetableLessonResponse[],
    getOption: (lesson: PublicTimetableLessonResponse) => PublicFilterOptionResponse | null,
) {
    const options = new Map<number, string>();

    lessons.forEach((lesson) => {
        const option = getOption(lesson);

        if (option && Number.isFinite(option.id) && option.name) {
            options.set(option.id, option.name);
        }
    });

    return sortOptions([...options.entries()].map(([id, name]) => ({ id, name })));
}

function buildFilterOptions(
    lessons: PublicTimetableLessonResponse[],
    timetable?: PublicTimetableScheduleResponse["timetable"],
    baseOptions: PublicTimetableFilterOptions = EMPTY_FILTER_OPTIONS,
): PublicTimetableFilterOptions {
    const faculties = mergeOptions(
        baseOptions.faculties,
        collectOptions(lessons, (lesson) => ({ id: lesson.facultyId, name: lesson.facultyName })),
    );

    if (timetable?.facultyId && timetable.facultyName && !faculties.some((faculty) => faculty.id === timetable.facultyId)) {
        faculties.push({ id: timetable.facultyId, name: timetable.facultyName });
        sortOptions(faculties);
    }

    return {
        faculties,
        departments: mergeOptions(
            baseOptions.departments,
            collectOptions(lessons, (lesson) => ({ id: lesson.departmentId, name: lesson.departmentName })),
        ),
        groups: mergeOptions(
            baseOptions.groups,
            [
                ...lessons.reduce((groups, lesson) => {
                    lesson.groups.forEach((group) => groups.set(group.id, group.name));
                    return groups;
                }, new Map<number, string>()),
            ].map(([id, name]) => ({ id, name })),
        ),
        teachers: mergeOptions(
            baseOptions.teachers,
            collectOptions(lessons, (lesson) => ({ id: lesson.teacherId, name: lesson.teacherName })),
        ),
        rooms: mergeOptions(
            baseOptions.rooms,
            collectOptions(lessons, (lesson) =>
                lesson.roomId && lesson.roomName ? { id: lesson.roomId, name: lesson.roomName } : null,
            ),
        ),
    };
}

function getLessonSlotKey(lesson: PublicTimetableLessonResponse) {
    return getNearestSlotKey(lesson.startTime);
}

function getLunchSlotKey(lunch: LunchResponse) {
    return getNearestSlotKey(lunch.startTime);
}

function getNearestSlotKey(startTime: string) {
    const startMinutes = timeToMinutes(startTime);
    let nearest = STANDARD_TIME_SLOTS[0];
    let nearestDistance = Number.POSITIVE_INFINITY;

    STANDARD_TIME_SLOTS.forEach((slot) => {
        const distance = Math.abs(timeToMinutes(slot.startTime) - startMinutes);

        if (distance < nearestDistance) {
            nearest = slot;
            nearestDistance = distance;
        }
    });

    return nearest.key;
}

function getLessonSpan(lesson: PublicTimetableLessonResponse, remainingSlots: number) {
    const duration = Number(lesson.durationHours);
    if (!Number.isFinite(duration) || duration < 1) return 1;
    return Math.min(Math.max(1, Math.round(duration)), remainingSlots);
}

function getLunchSpan(lunch: LunchResponse, slotIndex: number) {
    const lunchEnd = formatTime(lunch.endTime);
    let span = 1;

    for (let index = slotIndex + 1; index < STANDARD_TIME_SLOTS.length; index += 1) {
        if (formatTime(STANDARD_TIME_SLOTS[index - 1].endTime) >= lunchEnd) break;
        span += 1;
    }

    return Math.min(span, STANDARD_TIME_SLOTS.length - slotIndex);
}

function getLunchForCell(lunches: LunchResponse[], row: RowItem, slot: TimeSlot, day: DayOfWeek, rowMode: RowMode) {
    if (rowMode !== "group") return undefined;

    return lunches.find((lunch) =>
        lunch.groupId === row.id &&
        lunch.dayOfWeek === day &&
        getLunchSlotKey(lunch) === slot.key,
    );
}

function getRows(
    mode: RowMode,
    filters: FilterState,
    filtersData: PublicTimetableFilterOptions,
    lessons: PublicTimetableLessonResponse[],
): RowItem[] {
    if (mode === "room") {
        if (filters.roomId && filters.roomId !== ALL_ROOMS_VALUE) {
            const selectedRoom = optionName(filtersData.rooms, filters.roomId);
            return selectedRoom ? [{ id: Number(filters.roomId), name: selectedRoom }] : [];
        }

        const roomMap = new Map<number, string>();
        lessons.forEach((lesson) => {
            if (lesson.roomId && lesson.roomName) {
                roomMap.set(lesson.roomId, lesson.roomName);
            }
        });

        return [...roomMap.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    }

    if (filters.groupId) {
        const selectedGroup = optionName(filtersData.groups, filters.groupId);
        return selectedGroup ? [{ id: Number(filters.groupId), name: selectedGroup }] : [];
    }

    const groupMap = new Map<number, string>();
    lessons.forEach((lesson) => {
        lesson.groups.forEach((group) => groupMap.set(group.id, group.name));
    });

    return [...groupMap.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

function lessonBelongsToRow(lesson: PublicTimetableLessonResponse, row: RowItem, mode: RowMode) {
    if (mode === "room") {
        return lesson.roomId === row.id;
    }

    return lesson.groups.some((group) => group.id === row.id);
}

function inferCourseFromName(name: string, academicYearStart?: number) {
    const match = /-(\d{2})\b/.exec(name);
    if (!match) return 1;

    const admissionYear = 2000 + Number(match[1]);
    const referenceYear = academicYearStart ?? new Date().getFullYear();
    const course = referenceYear - admissionYear + 1;

    return Math.min(Math.max(course, 1), 6);
}

function toGridGroup(
    row: RowItem,
    lessons: PublicTimetableLessonResponse[],
    mode: RowMode,
    academicYearStart?: number,
): StudyGroupResponse {
    const lesson = lessons.find((item) => lessonBelongsToRow(item, row, mode));

    return {
        id: row.id,
        name: row.name,
        course: mode === "group" ? inferCourseFromName(row.name, academicYearStart) : 1,
        studentCount: 0,
        majorId: lesson?.majorId ?? 0,
        majorName: lesson?.majorName ?? "",
        degree: lesson?.degree ?? "BACHELOR",
        departmentId: lesson?.departmentId ?? 0,
        departmentName: lesson?.departmentName ?? "",
        facultyId: lesson?.facultyId ?? 0,
        facultyName: lesson?.facultyName ?? "",
    };
}

function toGridLesson(lesson: PublicTimetableLessonResponse, mode: RowMode): LessonResponse {
    return {
        id: lesson.id,
        timetableId: lesson.timetableId,
        assignmentId: lesson.id,
        subjectName: lesson.subjectName,
        teacherName: lesson.teacherName || "",
        groupNames: mode === "room" ? [lesson.roomName || "No room"] : lesson.groups.map((group) => group.name),
        roomName: lesson.roomName,
        dayOfWeek: lesson.dayOfWeek,
        startTime: lesson.startTime,
        durationHours: lesson.durationHours,
        majorId: lesson.majorId,
        majorName: lesson.majorName,
        degree: lesson.degree,
        departmentId: lesson.departmentId,
        departmentName: lesson.departmentName,
        facultyId: lesson.facultyId,
        facultyName: lesson.facultyName,
    };
}

export default function AiuTimetablePage() {
    const [filtersData, setFiltersData] = useState<PublicTimetableFilterOptions>(() => buildFilterOptions([]));
    const [schedule, setSchedule] = useState<PublicTimetableScheduleResponse | null>(null);
    const [lunches, setLunches] = useState<LunchResponse[]>([]);
    const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
    const [gridZoom, setGridZoom] = useState(100);
    const [gridDensity, setGridDensity] = useState<GridDensity>("medium");
    const [editingGridZoom, setEditingGridZoom] = useState(false);
    const [gridZoomDraft, setGridZoomDraft] = useState("100");
    const [showExportModal, setShowExportModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        document.title = "AIU Timetable";

        let icon = document.querySelector<HTMLLinkElement>("link[rel='icon']");
        if (!icon) {
            icon = document.createElement("link");
            icon.rel = "icon";
            document.head.append(icon);
        }
        icon.href = "/logo_aiu.png";

        void loadInitialData();
    }, []);

    const loadSchedule = useCallback(async () => {
        if (!filters.facultyId) {
            setSchedule(null);
            setLunches([]);
            return;
        }

        try {
            setScheduleLoading(true);
            setMessage("");
            const query = getQuery(filters);
            const [nextSchedule, nextFilterOptions] = await Promise.all([
                publicTimetableApi.getSchedule(query),
                publicTimetableApi.getFilterOptions({
                    facultyId: query.facultyId,
                    departmentId: query.departmentId,
                }),
            ]);
            setSchedule(nextSchedule);
            setLunches(nextSchedule.lunches ?? []);
            setFiltersData(buildFilterOptions(nextSchedule.lessons, nextSchedule.timetable, nextFilterOptions));
        } catch {
            setSchedule(null);
            setLunches([]);
            setMessage("No published timetable yet.");
        } finally {
            setScheduleLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        void loadSchedule();
    }, [loadSchedule]);

    const lessons = useMemo(() => schedule?.lessons ?? [], [schedule]);
    const showSchedule = Boolean(filters.facultyId);
    const rowMode: RowMode = filters.roomId ? "room" : "group";
    const days = filters.dayOfWeek === "ALL" ? VISIBLE_DAYS : [filters.dayOfWeek];
    const facultyOptions = filtersData.faculties;
    const rows = useMemo(
        () => getRows(rowMode, filters, filtersData, lessons),
        [filters, filtersData, lessons, rowMode],
    );
    const gridGroups = useMemo(
        () => rows.map((row) => toGridGroup(row, lessons, rowMode, schedule?.timetable?.academicYearStart)),
        [lessons, rowMode, rows, schedule?.timetable?.academicYearStart],
    );
    const gridLessons = useMemo(
        () => lessons.map((lesson) => toGridLesson(lesson, rowMode)),
        [lessons, rowMode],
    );

    const loadInitialData = async () => {
        try {
            setLoading(true);
            setMessage("");
            setFilters(EMPTY_FILTERS);
            setSchedule(null);
            setLunches([]);
            const [initialSchedule, initialFilterOptions] = await Promise.all([
                publicTimetableApi.getSchedule(),
                publicTimetableApi.getFilterOptions(),
            ]);

            setFiltersData(buildFilterOptions(initialSchedule.lessons, initialSchedule.timetable, initialFilterOptions));
        } catch {
            setFiltersData(buildFilterOptions([]));
            setFilters(EMPTY_FILTERS);
            setSchedule(null);
            setLunches([]);
            setMessage("No published timetable yet.");
        } finally {
            setLoading(false);
        }
    };

    const updateFilter = (key: keyof FilterState, value: string) => {
        setFilters((current) => {
            const next = {
                ...current,
                [key]: value,
            };

            if (key === "facultyId") {
                next.departmentId = "";
                next.groupId = "";
                next.teacherId = "";
                next.roomId = "";
                next.dayOfWeek = "ALL";
            }

            if (key === "departmentId") {
                next.groupId = "";
            }

            if (key === "groupId" && value) {
                next.teacherId = "";
                next.roomId = "";
                next.dayOfWeek = "ALL";
            }

            if (key === "teacherId" && value) {
                next.groupId = "";
                next.roomId = "";
                next.dayOfWeek = "ALL";
            }

            if (key === "roomId" && value) {
                next.groupId = "";
                next.teacherId = "";
                next.dayOfWeek = "ALL";
            }

            if (key === "dayOfWeek" && value !== "ALL") {
                next.groupId = "";
                next.teacherId = "";
                next.roomId = "";
            }

            return next;
        });
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

    const handleExport = (format: "pdf" | "excel") => {
        if (!schedule || lessons.length === 0 || rows.length === 0) return;

        const teacherSelected = Boolean(filters.teacherId);
        const roomSelected = Boolean(filters.roomId);
        const displayName = schedule.timetable?.name || "AIU Timetable";
        const fileName = sanitizeFileName(`aiu_timetable_${filters.dayOfWeek === "ALL" ? "all_days" : filters.dayOfWeek}`);
        const headers = [
            "Day",
            rowMode === "room" ? "Room" : "Group",
            ...STANDARD_TIME_SLOTS.map((slot) => `${formatTime(slot.startTime)}-${formatTime(slot.endTime)}`),
        ];

        if (format === "excel") {
            const rowsForSheet: string[][] = [];
            const merges: XLSX.Range[] = [];
            const styledCells = new Map<string, { fill: string; text: string; bold?: boolean }>();
            let currentExcelRow = 1;

            days.forEach((day) => {
                const dayStartRow = currentExcelRow;
                const dayLessons = lessons.filter((lesson) => lesson.dayOfWeek === day);

                rows.forEach((row, rowIndex) => {
                    const rowValues: string[] = [rowIndex === 0 ? formatDay(day) : "", row.name];
                    let slotIndex = 0;

                    while (slotIndex < STANDARD_TIME_SLOTS.length) {
                            const slot = STANDARD_TIME_SLOTS[slotIndex];
                            const cellLessons = dayLessons.filter((lesson) =>
                                lessonBelongsToRow(lesson, row, rowMode) &&
                                getLessonSlotKey(lesson) === slot.key,
                            );
                            const lunch = getLunchForCell(lunches, row, slot, day, rowMode);

                            if (cellLessons.length > 0) {
                            const lesson = cellLessons[0];
                            const span = Math.max(
                                ...cellLessons.map((item) => getLessonSpan(item, STANDARD_TIME_SLOTS.length - slotIndex)),
                            );
                            const cellColumnIndex = 2 + slotIndex;
                            const cellAddress = XLSX.utils.encode_cell({ r: currentExcelRow, c: cellColumnIndex });
                            const color = getExportColor(lesson.subjectName);

                            rowValues.push(cellLessons.map((item) => makeLessonExportText(item, teacherSelected, roomSelected)).join("\n\n"));
                            styledCells.set(cellAddress, { fill: color.fill, text: color.text, bold: true });

                            if (span > 1) {
                                merges.push({
                                    s: { r: currentExcelRow, c: cellColumnIndex },
                                    e: { r: currentExcelRow, c: cellColumnIndex + span - 1 },
                                });

                                for (let offset = 1; offset < span; offset += 1) {
                                    rowValues.push("");
                                }
                            }

                                slotIndex += span;
                            } else if (lunch) {
                                const span = getLunchSpan(lunch, slotIndex);
                                const cellColumnIndex = 2 + slotIndex;
                                const cellAddress = XLSX.utils.encode_cell({ r: currentExcelRow, c: cellColumnIndex });

                                rowValues.push("Lunch");
                                styledCells.set(cellAddress, { fill: LUNCH_EXPORT_STYLE.fill, text: LUNCH_EXPORT_STYLE.text, bold: true });

                                if (span > 1) {
                                    merges.push({
                                        s: { r: currentExcelRow, c: cellColumnIndex },
                                        e: { r: currentExcelRow, c: cellColumnIndex + span - 1 },
                                    });

                                    for (let offset = 1; offset < span; offset += 1) {
                                        rowValues.push("");
                                    }
                                }

                                slotIndex += span;
                            } else {
                                rowValues.push("");
                            slotIndex += 1;
                        }
                    }

                    rowsForSheet.push(rowValues);
                    currentExcelRow += 1;
                });

                if (rows.length > 1) {
                    merges.push({
                        s: { r: dayStartRow, c: 0 },
                        e: { r: dayStartRow + rows.length - 1, c: 0 },
                    });
                }
            });

            const worksheet = XLSX.utils.aoa_to_sheet([]);
            XLSX.utils.sheet_add_aoa(worksheet, [[displayName]], { origin: "A1" });
            XLSX.utils.sheet_add_aoa(worksheet, [headers, ...rowsForSheet], { origin: "A3" });

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
                ...STANDARD_TIME_SLOTS.map(() => ({ wch: 24 })),
            ];
            worksheet["!rows"] = [
                { hpt: 30 },
                { hpt: 8 },
                { hpt: 28 },
                ...rowsForSheet.map(() => ({ hpt: 58 })),
            ];

            worksheet["A1"].s = {
                fill: { patternType: "solid", fgColor: { rgb: "111827" } },
                font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 },
                alignment: { vertical: "center", horizontal: "left" },
            };

            const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
            for (let rowIndex = 2; rowIndex <= range.e.r; rowIndex += 1) {
                for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex += 1) {
                    const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
                    const originalAddress = XLSX.utils.encode_cell({ r: rowIndex - 2, c: colIndex });

                    if (!worksheet[address]) {
                        worksheet[address] = { t: "s", v: "" };
                    }

                    const cell = worksheet[address];
                    const isHeader = rowIndex === 2;
                    const isDayColumn = colIndex === 0;
                    const isRowColumn = colIndex === 1;
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
                    } else if (isRowColumn) {
                        fillColor = "F8FAFC";
                        bold = true;
                    } else if (customStyle) {
                        fillColor = customStyle.fill;
                        textColor = customStyle.text;
                        bold = customStyle.bold ?? true;
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

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Timetable");
            XLSX.writeFile(workbook, `${fileName}.xlsx`);
        } else {
            const rowsPerPage = 10;
            const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            let isFirstPage = true;

            const drawPageHeader = (day: DayOfWeek, pagePart: number) => {
                doc.setFillColor(17, 24, 39);
                doc.rect(0, 0, pageWidth, 24, "F");
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(14);
                doc.text(displayName, 12, 12);
                doc.setFontSize(9);
                doc.text(`${formatDay(day)}${pagePart > 1 ? ` - Part ${pagePart}` : ""}`, 12, 18);
            };

            const drawFooter = () => {
                doc.setFontSize(8);
                doc.setTextColor(100);
                doc.text(`Generated from AIU Timetable - ${new Date().toLocaleDateString()}`, 12, pageHeight - 8);
            };

            type PdfCell = string | {
                content: string;
                colSpan?: number;
                styles: Record<string, unknown>;
            };

            const headRow = [
                {
                    content: rowMode === "room" ? "Room" : "Group",
                    styles: {
                        fillColor: [17, 24, 39] as [number, number, number],
                        textColor: [255, 255, 255] as [number, number, number],
                        fontStyle: "bold" as const,
                        halign: "center" as const,
                        valign: "middle" as const,
                    },
                },
                ...STANDARD_TIME_SLOTS.map((slot) => ({
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

            const buildRows = (day: DayOfWeek, pageRows: RowItem[]) => {
                const dayLessons = lessons.filter((lesson) => lesson.dayOfWeek === day);

                return pageRows.map((row) => {
                    const bodyRow: PdfCell[] = [
                        {
                            content: row.name,
                            styles: {
                                fillColor: [248, 250, 252],
                                textColor: [17, 24, 39],
                                fontStyle: "bold",
                                valign: "middle",
                            },
                        },
                    ];
                    let slotIndex = 0;

                    while (slotIndex < STANDARD_TIME_SLOTS.length) {
                        const slot = STANDARD_TIME_SLOTS[slotIndex];
                        const cellLessons = dayLessons.filter((lesson) =>
                            lessonBelongsToRow(lesson, row, rowMode) &&
                            getLessonSlotKey(lesson) === slot.key,
                        );
                        const lunch = getLunchForCell(lunches, row, slot, day, rowMode);

                        if (cellLessons.length > 0) {
                            const lesson = cellLessons[0];
                            const span = Math.max(
                                ...cellLessons.map((item) => getLessonSpan(item, STANDARD_TIME_SLOTS.length - slotIndex)),
                            );
                            const color = getExportColor(lesson.subjectName);

                            bodyRow.push({
                                content: cellLessons.map((item) => makeLessonExportText(item, teacherSelected, roomSelected)).join("\n\n"),
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
                            const span = getLunchSpan(lunch, slotIndex);

                            bodyRow.push({
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
                            bodyRow.push({
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

                    return bodyRow;
                });
            };

            days.forEach((day) => {
                for (let startIndex = 0; startIndex < rows.length; startIndex += rowsPerPage) {
                    const pagePart = Math.floor(startIndex / rowsPerPage) + 1;
                    const pageRows = rows.slice(startIndex, startIndex + rowsPerPage);

                    if (!isFirstPage) {
                        doc.addPage();
                    }

                    isFirstPage = false;
                    drawPageHeader(day, pagePart);
                    autoTable(doc, {
                        head: [headRow],
                        body: buildRows(day, pageRows),
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

    return (
        <main className="min-h-screen px-4 py-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1600px] space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/logo_aiu.png" alt="AIU logo" className="h-12 w-12 rounded-xl object-contain" />
                        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                            AIU Timetable
                        </h1>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button
                            variant="outline"
                            disabled={!showSchedule || scheduleLoading || lessons.length === 0 || rows.length === 0}
                            onClick={() => setShowExportModal(true)}
                        >
                            <FileDown className="h-4 w-4" />
                            Export
                        </Button>
                        <Button variant="outline" onClick={() => void loadInitialData()} disabled={loading || scheduleLoading}>
                            {loading || scheduleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            Refresh
                        </Button>
                    </div>
                </div>

                {message && (
                    <Card className="border-amber-200 bg-amber-50 text-amber-950">
                        <CardContent className="p-4 text-sm">{message}</CardContent>
                    </Card>
                )}

                <Card className="glass-card relative z-50 overflow-visible">
                    <CardContent className="overflow-visible p-4">
                        {loading ? (
                            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                                {Array.from({ length: 3 }).map((_, index) => (
                                    <Skeleton key={index} className="h-11 w-full" />
                                ))}
                            </div>
                        ) : (
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                                <FilterSelect
                                    label="Faculty"
                                    value={filters.facultyId}
                                    placeholder="Select faculty"
                                    options={facultyOptions}
                                    onChange={(value) => updateFilter("facultyId", value)}
                                />

                                {showSchedule && (
                                    <>
                                        {SECONDARY_FILTERS.map(({ key, label, placeholder, source }) => {
                                            const options = filtersData[source] ?? EMPTY_OPTIONS;
                                            const searchable = key === "groupId" || key === "teacherId" || key === "roomId";

                                            return searchable ? (
                                                <SearchableFilterSelect
                                                    key={key}
                                                    label={label}
                                                    value={filters[key]}
                                                    placeholder={placeholder}
                                                    options={options}
                                                    onChange={(value) => updateFilter(key, value)}
                                                />
                                            ) : (
                                                <FilterSelect
                                                    key={key}
                                                    label={label}
                                                    value={filters[key]}
                                                    placeholder={placeholder}
                                                    options={options}
                                                    includeAllRooms={false}
                                                    onChange={(value) => updateFilter(key, value)}
                                                />
                                            );
                                        })}

                                        <div>
                                            <label className="mb-2 block text-sm font-medium">Day</label>
                                            <select
                                                value={filters.dayOfWeek}
                                                onChange={(event) => updateFilter("dayOfWeek", event.target.value)}
                                                className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            >
                                                <option value="ALL">All days</option>
                                                {VISIBLE_DAYS.map((day) => (
                                                    <option key={day} value={day}>
                                                        {formatDay(day)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {showSchedule ? (
                    <Card className="glass-card relative z-0">
                        <CardContent className="p-4">
                            <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
                                <div className="flex items-center gap-2">
                                    {DENSITY_OPTIONS.map((density) => (
                                        <button
                                            key={density}
                                            type="button"
                                            onClick={() => setGridDensity(density)}
                                            className={[
                                                "h-9 rounded-lg border px-3 text-sm font-medium transition-colors",
                                                gridDensity === density
                                                    ? "border-slate-950 bg-slate-950 text-white"
                                                    : "border-border bg-background text-foreground hover:bg-muted",
                                            ].join(" ")}
                                        >
                                            {density}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center overflow-hidden rounded-lg border border-border bg-background shadow-sm">
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
                            {scheduleLoading ? (
                                <div className="space-y-3">
                                    {Array.from({ length: 5 }).map((_, index) => (
                                        <Skeleton key={index} className="h-24 w-full" />
                                    ))}
                                </div>
                            ) : lessons.length === 0 || gridGroups.length === 0 ? (
                                <EmptyState title="No lessons found" description="No lessons match the selected filters." />
                            ) : (
                                <TimetableGrid
                                    lessons={gridLessons}
                                    groups={gridGroups}
                                    selectedDay={filters.dayOfWeek}
                                    timeSlots={STANDARD_TIME_SLOTS}
                                    lunchBlocks={rowMode === "group" ? lunches : EMPTY_LUNCHES}
                                    density={gridDensity}
                                    zoom={gridZoom / 100}
                                    onZoomChange={handleGridZoomChange}
                                    readOnly
                                    rowHeaderLabel={rowMode === "room" ? "Room" : "Group"}
                                    showEmptyCellPlaceholder={false}
                                />
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="glass-card">
                        <CardContent className="py-12">
                            <EmptyState title="Select faculty" description="Choose a faculty to open the timetable grid." />
                        </CardContent>
                    </Card>
                )}
                <ExportModal
                    isOpen={showExportModal}
                    timetableName={schedule?.timetable?.name || "AIU Timetable"}
                    onClose={() => setShowExportModal(false)}
                    onExport={handleExport}
                />
            </div>
        </main>
    );
}

function FilterSelect({
    label,
    value,
    placeholder,
    options,
    includeAllRooms = false,
    onChange,
}: {
    label: string;
    value: string;
    placeholder: string;
    options: PublicFilterOptionResponse[];
    includeAllRooms?: boolean;
    onChange: (value: string) => void;
}) {
    return (
        <div>
            <label className="mb-2 block text-sm font-medium">{label}</label>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <option value="">{placeholder}</option>
                {includeAllRooms && <option value={ALL_ROOMS_VALUE}>All rooms</option>}
                {options.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.name}
                    </option>
                ))}
            </select>
        </div>
    );
}

function SearchableFilterSelect({
    label,
    value,
    placeholder,
    options,
    includeAllRooms = false,
    onChange,
}: {
    label: string;
    value: string;
    placeholder: string;
    options: PublicFilterOptionResponse[];
    includeAllRooms?: boolean;
    onChange: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const rootRef = useRef<HTMLDivElement | null>(null);
    const selectedOption = options.find((option) => String(option.id) === value);
    const selectedLabel = value === ALL_ROOMS_VALUE ? "All rooms" : selectedOption?.name || placeholder;
    const normalizedQuery = query.trim().toLowerCase();
    const filteredOptions = normalizedQuery
        ? options.filter((option) => option.name.toLowerCase().includes(normalizedQuery))
        : options;

    useEffect(() => {
        if (!open) return;

        const handlePointerDown = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener("pointerdown", handlePointerDown);
        return () => document.removeEventListener("pointerdown", handlePointerDown);
    }, [open]);

    const selectValue = (nextValue: string) => {
        onChange(nextValue);
        setOpen(false);
        setQuery("");
    };

    return (
        <div ref={rootRef} className="relative">
            <label className="mb-2 block text-sm font-medium">{label}</label>
            <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen((current) => !current)}
                className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-input bg-card px-3 text-left text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <span className={value ? "truncate text-foreground" : "truncate text-muted-foreground"}>
                    {selectedLabel}
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="absolute left-0 right-0 top-full z-[100] mt-2 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
                    <div className="border-b border-border p-2">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                autoFocus
                                type="search"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Escape") {
                                        event.stopPropagation();
                                        setOpen(false);
                                    }
                                }}
                                placeholder={`Search ${label.toLowerCase()}`}
                                className="h-10 w-full rounded-lg border border-input bg-card py-2 pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </div>
                    </div>

                    <div role="listbox" className="custom-scrollbar max-h-72 overflow-auto p-1">
                        <SearchableOption
                            selected={value === ""}
                            label={placeholder}
                            muted
                            onSelect={() => selectValue("")}
                        />
                        {includeAllRooms && (
                            <SearchableOption
                                selected={value === ALL_ROOMS_VALUE}
                                label="All rooms"
                                onSelect={() => selectValue(ALL_ROOMS_VALUE)}
                            />
                        )}
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-6 text-center text-sm text-muted-foreground">No results</div>
                        ) : (
                            filteredOptions.map((option) => (
                                <SearchableOption
                                    key={option.id}
                                    selected={String(option.id) === value}
                                    label={option.name}
                                    onSelect={() => selectValue(String(option.id))}
                                />
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function SearchableOption({
    selected,
    label,
    muted = false,
    onSelect,
}: {
    selected: boolean;
    label: string;
    muted?: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            role="option"
            aria-selected={selected}
            onClick={onSelect}
            className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <span className={`truncate ${muted ? "text-muted-foreground" : "text-foreground"}`}>{label}</span>
            {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
        </button>
    );
}
