"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { publicTimetableApi } from "@/lib";
import { DAYS_OF_WEEK } from "@/lib/constants";
import type {
    DayOfWeek,
    PublicTimetableFilterOptionsResponse,
    PublicFilterOptionResponse,
    PublicTimetableLessonResponse,
    PublicTimetableQuery,
    PublicTimetableScheduleResponse,
} from "@/lib/types";

type FilterKey = "facultyId" | "departmentId" | "groupId" | "teacherId" | "roomId";
type RowMode = "group" | "room";

type FilterState = Record<FilterKey, string> & {
    dayOfWeek: DayOfWeek | "ALL";
};

interface TimeSlot {
    key: string;
    order: number;
    startTime: string;
    endTime: string;
    description: string;
}

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
const EMPTY_FILTER_OPTIONS: PublicTimetableFilterOptions = {
    faculties: EMPTY_OPTIONS,
    departments: EMPTY_OPTIONS,
    groups: EMPTY_OPTIONS,
    teachers: EMPTY_OPTIONS,
    rooms: EMPTY_OPTIONS,
};
const ALL_ROOMS_VALUE = "__ALL_ROOMS__";

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
const DAY_COLUMN_WIDTH = 132;
const ROW_COLUMN_WIDTH = 188;
const SLOT_WIDTH = 146;
const CELL_HEIGHT = 112;

const STANDARD_TIME_SLOTS: TimeSlot[] = [
    { key: "08:00", order: 1, startTime: "08:00:00", endTime: "08:40:00", description: "1st lesson" },
    { key: "08:45", order: 2, startTime: "08:45:00", endTime: "09:25:00", description: "2nd lesson" },
    { key: "09:30", order: 3, startTime: "09:30:00", endTime: "10:10:00", description: "3rd lesson" },
    { key: "10:15", order: 4, startTime: "10:15:00", endTime: "10:55:00", description: "4th lesson" },
    { key: "11:00", order: 5, startTime: "11:00:00", endTime: "11:40:00", description: "5th lesson" },
    { key: "11:45", order: 6, startTime: "11:45:00", endTime: "12:25:00", description: "6th lesson" },
    { key: "12:30", order: 7, startTime: "12:30:00", endTime: "13:10:00", description: "7th lesson" },
    { key: "13:15", order: 8, startTime: "13:15:00", endTime: "13:55:00", description: "8th lesson" },
    { key: "14:00", order: 9, startTime: "14:00:00", endTime: "14:40:00", description: "9th lesson" },
    { key: "14:45", order: 10, startTime: "14:45:00", endTime: "15:25:00", description: "10th lesson" },
    { key: "15:30", order: 11, startTime: "15:30:00", endTime: "16:10:00", description: "11th lesson" },
    { key: "16:15", order: 12, startTime: "16:15:00", endTime: "16:55:00", description: "12th lesson" },
    { key: "17:00", order: 13, startTime: "17:00:00", endTime: "17:40:00", description: "13th lesson" },
    { key: "17:45", order: 14, startTime: "17:45:00", endTime: "18:25:00", description: "14th lesson" },
];

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

function getLessonColor(value: string) {
    const colors = [
        "border-blue-200 bg-blue-50 text-blue-950",
        "border-emerald-200 bg-emerald-50 text-emerald-950",
        "border-violet-200 bg-violet-50 text-violet-950",
        "border-amber-200 bg-amber-50 text-amber-950",
        "border-cyan-200 bg-cyan-50 text-cyan-950",
        "border-rose-200 bg-rose-50 text-rose-950",
    ];

    let hash = 0;

    for (let index = 0; index < value.length; index += 1) {
        hash = value.charCodeAt(index) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
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
    const lessonStart = timeToMinutes(lesson.startTime);
    let nearest = STANDARD_TIME_SLOTS[0];
    let nearestDistance = Number.POSITIVE_INFINITY;

    STANDARD_TIME_SLOTS.forEach((slot) => {
        const distance = Math.abs(timeToMinutes(slot.startTime) - lessonStart);

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

export default function AiuTimetablePage() {
    const [filtersData, setFiltersData] = useState<PublicTimetableFilterOptions>(() => buildFilterOptions([]));
    const [schedule, setSchedule] = useState<PublicTimetableScheduleResponse | null>(null);
    const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
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
            setFiltersData(buildFilterOptions(nextSchedule.lessons, nextSchedule.timetable, nextFilterOptions));
        } catch {
            setSchedule(null);
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

    const loadInitialData = async () => {
        try {
            setLoading(true);
            setMessage("");
            setFilters(EMPTY_FILTERS);
            setSchedule(null);
            const [initialSchedule, initialFilterOptions] = await Promise.all([
                publicTimetableApi.getSchedule(),
                publicTimetableApi.getFilterOptions(),
            ]);

            setFiltersData(buildFilterOptions(initialSchedule.lessons, initialSchedule.timetable, initialFilterOptions));
        } catch {
            setFiltersData(buildFilterOptions([]));
            setFilters(EMPTY_FILTERS);
            setSchedule(null);
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

    return (
        <main className="min-h-screen px-4 py-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1600px] space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo_aiu.png" alt="AIU logo" className="h-12 w-12 rounded-xl object-contain" />
                        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                            AIU Timetable
                        </h1>
                    </div>

                    <Button variant="outline" onClick={() => void loadInitialData()} disabled={loading || scheduleLoading}>
                        {loading || scheduleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Refresh
                    </Button>
                </div>

                {message && (
                    <Card className="border-amber-200 bg-amber-50 text-amber-950">
                        <CardContent className="p-4 text-sm">{message}</CardContent>
                    </Card>
                )}

                <Card className="glass-card">
                    <CardContent className="p-4">
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

                                            return (
                                                <FilterSelect
                                                    key={key}
                                                    label={label}
                                                    value={filters[key]}
                                                    placeholder={placeholder}
                                                    options={options}
                                                    includeAllRooms={key === "roomId"}
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
                    <Card className="glass-card">
                        <CardContent className="p-4">
                            {scheduleLoading ? (
                                <div className="space-y-3">
                                    {Array.from({ length: 5 }).map((_, index) => (
                                        <Skeleton key={index} className="h-24 w-full" />
                                    ))}
                                </div>
                            ) : lessons.length === 0 || rows.length === 0 ? (
                                <EmptyState title="No lessons found" description="No lessons match the selected filters." />
                            ) : (
                                <PublicTimetableGrid
                                    days={days}
                                    rowMode={rowMode}
                                    rows={rows}
                                    lessons={lessons}
                                    teacherSelected={Boolean(filters.teacherId)}
                                    roomSelected={Boolean(filters.roomId)}
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

function PublicTimetableGrid({
    days,
    rowMode,
    rows,
    lessons,
    teacherSelected,
    roomSelected,
}: {
    days: DayOfWeek[];
    rowMode: RowMode;
    rows: RowItem[];
    lessons: PublicTimetableLessonResponse[];
    teacherSelected: boolean;
    roomSelected: boolean;
}) {
    const minWidth = DAY_COLUMN_WIDTH + ROW_COLUMN_WIDTH + STANDARD_TIME_SLOTS.length * SLOT_WIDTH;

    return (
        <div className="custom-scrollbar max-h-[760px] overflow-auto rounded-2xl border border-border bg-white">
            <table
                className="w-full border-separate border-spacing-0 text-sm"
                style={{ minWidth }}
            >
                <thead>
                <tr>
                    <th
                        className="sticky left-0 top-0 z-50 border-b border-r border-border bg-zinc-50 px-4 py-4 text-left font-semibold text-muted-foreground"
                        style={{ width: DAY_COLUMN_WIDTH, minWidth: DAY_COLUMN_WIDTH }}
                    >
                        Day
                    </th>
                    <th
                        className="sticky top-0 z-40 border-b border-r border-border bg-zinc-50 px-4 py-4 text-left font-semibold text-muted-foreground"
                        style={{ left: DAY_COLUMN_WIDTH, width: ROW_COLUMN_WIDTH, minWidth: ROW_COLUMN_WIDTH }}
                    >
                        {rowMode === "room" ? "Room" : "Group"}
                    </th>
                    {STANDARD_TIME_SLOTS.map((slot) => (
                        <th
                            key={slot.key}
                            className="sticky top-0 z-30 border-b border-r border-border bg-zinc-50 px-3 py-4 text-center font-semibold text-muted-foreground last:border-r-0"
                            style={{ width: SLOT_WIDTH, minWidth: SLOT_WIDTH }}
                        >
                            {formatTime(slot.startTime)}-{formatTime(slot.endTime)}
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {days.flatMap((day) => rows.map((row, rowIndex) => {
                    const dayLessons = lessons.filter((lesson) => lesson.dayOfWeek === day);

                    return (
                        <tr key={`${day}-${row.id}`}>
                            {rowIndex === 0 && (
                                <th
                                    rowSpan={rows.length}
                                    className="sticky left-0 z-30 border-b border-r border-border bg-white px-4 py-4 text-left align-top font-semibold shadow-[1px_0_0_var(--border)]"
                                    style={{ width: DAY_COLUMN_WIDTH, minWidth: DAY_COLUMN_WIDTH }}
                                >
                                    {formatDay(day)}
                                </th>
                            )}
                            <th
                                className="sticky z-20 border-b border-r border-border bg-white px-4 py-4 text-left align-top font-medium shadow-[1px_0_0_var(--border)]"
                                style={{ left: DAY_COLUMN_WIDTH, width: ROW_COLUMN_WIDTH, minWidth: ROW_COLUMN_WIDTH }}
                            >
                                {row.name}
                            </th>
                            {renderGridCells(row, rowMode, dayLessons, teacherSelected, roomSelected)}
                        </tr>
                    );
                }))}
                </tbody>
            </table>
        </div>
    );
}

function renderGridCells(
    row: RowItem,
    rowMode: RowMode,
    lessons: PublicTimetableLessonResponse[],
    teacherSelected: boolean,
    roomSelected: boolean,
) {
    const cells = [];
    let slotIndex = 0;

    while (slotIndex < STANDARD_TIME_SLOTS.length) {
        const slot = STANDARD_TIME_SLOTS[slotIndex];
        const cellLessons = lessons.filter((lesson) =>
            lessonBelongsToRow(lesson, row, rowMode) &&
            getLessonSlotKey(lesson) === slot.key,
        );

        if (cellLessons.length > 0) {
            const span = Math.max(
                ...cellLessons.map((lesson) => getLessonSpan(lesson, STANDARD_TIME_SLOTS.length - slotIndex)),
            );

            cells.push(
                <td
                    key={`${row.id}-${slot.key}`}
                    colSpan={span}
                    className="border-b border-r border-border bg-white p-2 align-top last:border-r-0"
                    style={{ minWidth: SLOT_WIDTH * span, height: CELL_HEIGHT }}
                >
                    <div className="space-y-2">
                        {cellLessons.map((lesson) => (
                            <LessonBlock
                                key={lesson.id}
                                lesson={lesson}
                                teacherSelected={teacherSelected}
                                roomSelected={roomSelected}
                            />
                        ))}
                    </div>
                </td>,
            );

            slotIndex += span;
        } else {
            cells.push(
                <td
                    key={`${row.id}-${slot.key}`}
                    className="border-b border-r border-border bg-white p-2 align-top last:border-r-0"
                    style={{ minWidth: SLOT_WIDTH, height: CELL_HEIGHT }}
                />,
            );
            slotIndex += 1;
        }
    }

    return cells;
}

function LessonBlock({
    lesson,
    teacherSelected,
    roomSelected,
}: {
    lesson: PublicTimetableLessonResponse;
    teacherSelected: boolean;
    roomSelected: boolean;
}) {
    const groups = lesson.groups.map((group) => group.name).join(", ");
    const secondLine = teacherSelected ? groups : lesson.teacherName;
    const thirdLine = roomSelected ? groups : lesson.roomName || "No room";

    return (
        <article className={`h-full min-h-20 rounded-xl border p-3 shadow-sm ${getLessonColor(lesson.subjectName)}`}>
            <div className="line-clamp-2 font-semibold leading-5">{lesson.subjectName}</div>
            <div className="mt-1 truncate text-xs opacity-80">{secondLine}</div>
            <div className="mt-1 truncate text-xs opacity-80">{thirdLine}</div>
        </article>
    );
}
