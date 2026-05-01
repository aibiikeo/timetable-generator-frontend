"use client";

import { CalendarDays, DoorOpen, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type {
    DayOfWeek,
    LessonResponse,
    StudyGroupResponse,
    TimeSlot,
} from "@/lib/types";
import { DAYS_OF_WEEK, DAYS_SHORT } from "@/lib/constants";

interface TimetableGridProps {
    lessons: LessonResponse[];
    groups: StudyGroupResponse[];
    selectedDay: DayOfWeek | "ALL";
    timeSlots: TimeSlot[];
    onCellClick?: (
        group: StudyGroupResponse,
        slot: TimeSlot,
        day?: DayOfWeek,
    ) => void;
    onLessonClick?: (lesson: LessonResponse) => void;
}

const VISIBLE_DAYS = DAYS_OF_WEEK.filter((day) => day !== "SUNDAY");

const LESSON_PALETTE = [
    { bg: "#DBEAFE", border: "#93C5FD", text: "#1E3A8A", soft: "#EFF6FF" },
    { bg: "#D1FAE5", border: "#6EE7B7", text: "#065F46", soft: "#ECFDF5" },
    { bg: "#EDE9FE", border: "#C4B5FD", text: "#5B21B6", soft: "#F5F3FF" },
    { bg: "#FEF3C7", border: "#FCD34D", text: "#92400E", soft: "#FFFBEB" },
    { bg: "#FFE4E6", border: "#FDA4AF", text: "#9F1239", soft: "#FFF1F2" },
    { bg: "#CFFAFE", border: "#67E8F9", text: "#155E75", soft: "#ECFEFF" },
    { bg: "#FAE8FF", border: "#F0ABFC", text: "#86198F", soft: "#FDF4FF" },
    { bg: "#ECFCCB", border: "#BEF264", text: "#3F6212", soft: "#F7FEE7" },
    { bg: "#FCE7F3", border: "#F9A8D4", text: "#9D174D", soft: "#FDF2F8" },
    { bg: "#E0E7FF", border: "#A5B4FC", text: "#3730A3", soft: "#EEF2FF" },
];

function formatTime(time: string) {
    return time.substring(0, 5);
}

function hashString(value: string) {
    let hash = 0;

    for (let i = 0; i < value.length; i += 1) {
        hash = value.charCodeAt(i) + ((hash << 5) - hash);
    }

    return Math.abs(hash);
}

function getLessonColor(lesson: LessonResponse) {
    const key = `${lesson.subjectName}-${lesson.teacherName}`;
    return LESSON_PALETTE[hashString(key) % LESSON_PALETTE.length];
}

function getLessonSpan(lesson: LessonResponse, remainingSlots: number) {
    const rawDuration = Number(lesson.durationHours);

    if (!Number.isFinite(rawDuration) || rawDuration < 1) {
        return 1;
    }

    return Math.min(Math.max(1, Math.round(rawDuration)), remainingSlots);
}

function getLessonForCell(
    lessons: LessonResponse[],
    groupName: string,
    slot: TimeSlot,
    day?: DayOfWeek,
) {
    return lessons.find((lesson) => {
        const matchesGroup = lesson.groupNames.includes(groupName);
        const matchesSlot = formatTime(lesson.startTime) === formatTime(slot.startTime);
        const matchesDay = !day || lesson.dayOfWeek === day;

        return matchesGroup && matchesSlot && matchesDay;
    });
}

function sortTimeSlots(timeSlots: TimeSlot[]) {
    return [...timeSlots].sort((a, b) => {
        const orderA = (a as unknown as { order?: number }).order ?? 0;
        const orderB = (b as unknown as { order?: number }).order ?? 0;

        if (orderA !== orderB) return orderA - orderB;

        return formatTime(a.startTime).localeCompare(formatTime(b.startTime));
    });
}

function EmptyGridState({
                            title,
                            description,
                        }: {
    title: string;
    description: string;
}) {
    return (
        <div className="flex h-full min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-border bg-card/60">
            <div className="text-center">
                <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground" />
                <h3 className="mt-3 text-sm font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    {description}
                </p>
            </div>
        </div>
    );
}

function LessonCard({
                        lesson,
                        compact = false,
                        showDay = false,
                        onClick,
                    }: {
    lesson: LessonResponse;
    compact?: boolean;
    showDay?: boolean;
    onClick?: () => void;
}) {
    const color = getLessonColor(lesson);

    return (
        <button
            type="button"
            onClick={onClick}
            className="h-full min-h-[112px] w-full rounded-2xl border p-3 text-left shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
            style={{
                backgroundColor: color.bg,
                borderColor: color.border,
                color: color.text,
            }}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div
                        className={
                            compact
                                ? "line-clamp-2 text-xs font-semibold leading-5"
                                : "line-clamp-2 text-sm font-semibold leading-5"
                        }
                    >
                        {lesson.subjectName}
                    </div>

                    <div className="mt-1 flex items-center gap-1 text-xs">
                        <UserRound className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{lesson.teacherName}</span>
                    </div>

                    <div className="mt-1 flex items-center gap-1 text-xs">
                        <DoorOpen className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                            {lesson.roomName || "No room"}
                        </span>
                    </div>
                </div>

                {showDay && (
                    <Badge
                        variant="outline"
                        className="shrink-0 border-white/60 bg-white/60"
                        style={{ color: color.text }}
                    >
                        {DAYS_SHORT[lesson.dayOfWeek] || lesson.dayOfWeek}
                    </Badge>
                )}
            </div>

            <div className="mt-3 flex flex-wrap gap-1">
                <Badge
                    variant="outline"
                    className="border-white/60 bg-white/60"
                    style={{ color: color.text }}
                >
                    {formatTime(lesson.startTime)}
                </Badge>

                <Badge
                    variant="outline"
                    className="border-white/60 bg-white/60"
                    style={{ color: color.text }}
                >
                    {lesson.durationHours} slot(s)
                </Badge>
            </div>
        </button>
    );
}

function EmptyCell({
                       onClick,
                   }: {
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex h-full min-h-[112px] w-full items-center justify-center rounded-2xl border border-dashed border-border bg-card/70 text-xs text-muted-foreground transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
            Empty
        </button>
    );
}

export default function TimetableGrid({
                                          lessons,
                                          groups,
                                          selectedDay,
                                          timeSlots,
                                          onCellClick,
                                          onLessonClick,
                                      }: TimetableGridProps) {
    const sortedSlots = sortTimeSlots(timeSlots);

    if (groups.length === 0) {
        return (
            <EmptyGridState
                title="No groups selected"
                description="Change filters to show timetable grid."
            />
        );
    }

    if (sortedSlots.length === 0) {
        return (
            <EmptyGridState
                title="No time slots"
                description="Create time slots before viewing the grid."
            />
        );
    }

    const renderCellsForGroupAndDay = (
        group: StudyGroupResponse,
        day?: DayOfWeek,
    ) => {
        const cells: React.ReactNode[] = [];
        let slotIndex = 0;

        while (slotIndex < sortedSlots.length) {
            const slot = sortedSlots[slotIndex];
            const lesson = getLessonForCell(lessons, group.name, slot, day);

            if (lesson) {
                const span = getLessonSpan(
                    lesson,
                    sortedSlots.length - slotIndex,
                );

                cells.push(
                    <td
                        key={`${day || "single"}-${group.id}-${slot.id}`}
                        colSpan={span}
                        className="h-32 border-b border-r border-border bg-background/40 p-2 align-top last:border-r-0"
                    >
                        <LessonCard
                            lesson={lesson}
                            compact={selectedDay === "ALL"}
                            onClick={() => onLessonClick?.(lesson)}
                        />
                    </td>,
                );

                slotIndex += span;
            } else {
                cells.push(
                    <td
                        key={`${day || "single"}-${group.id}-${slot.id}`}
                        className="h-32 border-b border-r border-border bg-background/40 p-2 align-top last:border-r-0"
                    >
                        <EmptyCell
                            onClick={() => onCellClick?.(group, slot, day)}
                        />
                    </td>,
                );

                slotIndex += 1;
            }
        }

        return cells;
    };

    if (selectedDay === "ALL") {
        return (
            <div className="h-full overflow-hidden rounded-2xl border border-border bg-card">
                <div className="custom-scrollbar h-full overflow-auto">
                    <table className="w-full min-w-[1320px] border-separate border-spacing-0 text-sm">
                        <thead>
                        <tr>
                            <th className="sticky left-0 top-0 z-40 w-32 border-b border-r border-border bg-slate-950 px-4 py-3 text-left font-semibold text-white">
                                Day
                            </th>

                            <th className="sticky left-32 top-0 z-40 w-44 border-b border-r border-border bg-slate-950 px-4 py-3 text-left font-semibold text-white">
                                Group
                            </th>

                            {sortedSlots.map((slot) => (
                                <th
                                    key={slot.id}
                                    className="sticky top-0 z-30 min-w-[170px] border-b border-r border-border bg-slate-950 px-3 py-3 text-left font-semibold text-white last:border-r-0"
                                >
                                    <div>
                                        {formatTime(slot.startTime)}–
                                        {formatTime(slot.endTime)}
                                    </div>

                                    {(slot as unknown as { label?: string }).label && (
                                        <div className="mt-1 text-xs font-normal text-slate-300">
                                            {(slot as unknown as { label?: string }).label}
                                        </div>
                                    )}
                                </th>
                            ))}
                        </tr>
                        </thead>

                        <tbody>
                        {VISIBLE_DAYS.map((day) =>
                            groups.map((group, groupIndex) => (
                                <tr key={`${day}-${group.id}`}>
                                    {groupIndex === 0 && (
                                        <th
                                            rowSpan={groups.length}
                                            className="sticky left-0 z-30 border-b border-r border-border bg-blue-100 px-4 py-3 text-left align-middle font-semibold text-blue-950"
                                        >
                                            <div className="text-sm">
                                                {DAYS_SHORT[day] || day}
                                            </div>
                                            <div className="mt-1 text-xs font-normal text-blue-700">
                                                {day}
                                            </div>
                                        </th>
                                    )}

                                    <th className="sticky left-32 z-20 border-b border-r border-border bg-white px-4 py-3 text-left align-top">
                                        <div className="font-semibold">
                                            {group.name}
                                        </div>
                                        <div className="mt-1 text-xs text-muted-foreground">
                                            {group.studentCount} students
                                        </div>
                                        <Badge variant="outline" className="mt-2">
                                            Course {group.course}
                                        </Badge>
                                    </th>

                                    {renderCellsForGroupAndDay(group, day)}
                                </tr>
                            )),
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-hidden rounded-2xl border border-border bg-card">
            <div className="custom-scrollbar h-full overflow-auto">
                <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-sm">
                    <thead>
                    <tr>
                        <th className="sticky left-0 top-0 z-30 w-44 border-b border-r border-border bg-slate-950 px-4 py-3 text-left font-semibold text-white">
                            Group
                        </th>

                        {sortedSlots.map((slot) => (
                            <th
                                key={slot.id}
                                className="sticky top-0 z-20 min-w-[180px] border-b border-r border-border bg-slate-950 px-3 py-3 text-left font-semibold text-white last:border-r-0"
                            >
                                <div>
                                    {formatTime(slot.startTime)}–
                                    {formatTime(slot.endTime)}
                                </div>

                                {(slot as unknown as { label?: string }).label && (
                                    <div className="mt-1 text-xs font-normal text-slate-300">
                                        {(slot as unknown as { label?: string }).label}
                                    </div>
                                )}
                            </th>
                        ))}
                    </tr>
                    </thead>

                    <tbody>
                    {groups.map((group) => (
                        <tr key={group.id}>
                            <th className="sticky left-0 z-10 border-b border-r border-border bg-white px-4 py-3 text-left align-top">
                                <div className="font-semibold">{group.name}</div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                    {group.studentCount} students
                                </div>
                                <Badge variant="outline" className="mt-2">
                                    Course {group.course}
                                </Badge>
                            </th>

                            {renderCellsForGroupAndDay(group, selectedDay)}
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}