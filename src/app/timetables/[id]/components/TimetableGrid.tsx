"use client";

import { CalendarDays, DoorOpen, Plus, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type {
    DayOfWeek,
    LessonResponse,
    StudyGroupResponse,
    TimeSlot,
} from "@/lib/types";
import { DAYS_OF_WEEK, DAYS_SHORT } from "@/lib/constants";

type GridDensity = "compact" | "comfortable" | "large";

interface TimetableGridProps {
    lessons: LessonResponse[];
    groups: StudyGroupResponse[];
    selectedDay: DayOfWeek | "ALL";
    timeSlots: TimeSlot[];
    density?: GridDensity;
    onCellClick?: (
        group: StudyGroupResponse,
        slot: TimeSlot,
        day?: DayOfWeek,
    ) => void;
    onLessonClick?: (lesson: LessonResponse) => void;
    onTimeSlotDoubleClick?: (slot: TimeSlot) => void;
}

const VISIBLE_DAYS = DAYS_OF_WEEK.filter((day) => day !== "SUNDAY");

const DAY_COLUMN_WIDTH = 132;
const GROUP_COLUMN_WIDTH = 188;

const DENSITY_CONFIG: Record<
    GridDensity,
    {
        slotWidth: number;
        cellHeight: string;
        cardPadding: string;
        titleSize: string;
        metaSize: string;
    }
> = {
    compact: {
        slotWidth: 132,
        cellHeight: "h-24",
        cardPadding: "p-2",
        titleSize: "text-xs",
        metaSize: "text-[11px]",
    },
    comfortable: {
        slotWidth: 170,
        cellHeight: "h-32",
        cardPadding: "p-3",
        titleSize: "text-sm",
        metaSize: "text-xs",
    },
    large: {
        slotWidth: 210,
        cellHeight: "h-40",
        cardPadding: "p-4",
        titleSize: "text-sm",
        metaSize: "text-xs",
    },
};

const LESSON_PALETTE = [
    { bg: "#DBEAFE", border: "#93C5FD", text: "#1E3A8A" },
    { bg: "#D1FAE5", border: "#6EE7B7", text: "#065F46" },
    { bg: "#EDE9FE", border: "#C4B5FD", text: "#5B21B6" },
    { bg: "#FEF3C7", border: "#FCD34D", text: "#92400E" },
    { bg: "#FFE4E6", border: "#FDA4AF", text: "#9F1239" },
    { bg: "#CFFAFE", border: "#67E8F9", text: "#155E75" },
    { bg: "#FAE8FF", border: "#F0ABFC", text: "#86198F" },
    { bg: "#ECFCCB", border: "#BEF264", text: "#3F6212" },
    { bg: "#FCE7F3", border: "#F9A8D4", text: "#9D174D" },
    { bg: "#E0E7FF", border: "#A5B4FC", text: "#3730A3" },
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
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;

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

function TimeSlotHeader({
                            slot,
                            density,
                            onDoubleClick,
                        }: {
    slot: TimeSlot;
    density: GridDensity;
    onDoubleClick?: () => void;
}) {
    const config = DENSITY_CONFIG[density];

    return (
        <th
            style={{ minWidth: config.slotWidth, width: config.slotWidth }}
            onDoubleClick={onDoubleClick}
            title="Double click to edit time slot"
            className="sticky top-0 z-30 border-b border-r border-border bg-slate-950 px-3 py-3 text-left font-semibold text-white last:border-r-0"
        >
            <button
                type="button"
                onDoubleClick={onDoubleClick}
                className="w-full rounded-lg text-left outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40"
            >
                <div>
                    {formatTime(slot.startTime)}–{formatTime(slot.endTime)}
                </div>

                {slot.description && (
                    <div className="mt-1 line-clamp-1 text-xs font-normal text-slate-300">
                        {slot.description}
                    </div>
                )}
            </button>
        </th>
    );
}

function LessonCard({
                        lesson,
                        density,
                        showDay = false,
                        onClick,
                    }: {
    lesson: LessonResponse;
    density: GridDensity;
    showDay?: boolean;
    onClick?: () => void;
}) {
    const color = getLessonColor(lesson);
    const config = DENSITY_CONFIG[density];

    return (
        <button
            type="button"
            onClick={onClick}
            title={`${lesson.subjectName}\n${lesson.teacherName}\n${lesson.groupNames.join(", ")}`}
            className={[
                "h-full min-h-full w-full rounded-2xl border text-left shadow-sm outline-none transition",
                "hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring",
                config.cardPadding,
            ].join(" ")}
            style={{
                backgroundColor: color.bg,
                borderColor: color.border,
                color: color.text,
            }}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div
                        className={[
                            "line-clamp-2 font-semibold leading-5",
                            config.titleSize,
                        ].join(" ")}
                    >
                        {lesson.subjectName}
                    </div>

                    <div
                        className={[
                            "mt-1 flex items-center gap-1",
                            config.metaSize,
                        ].join(" ")}
                    >
                        <UserRound className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{lesson.teacherName}</span>
                    </div>

                    <div
                        className={[
                            "mt-1 flex items-center gap-1",
                            config.metaSize,
                        ].join(" ")}
                    >
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

                <Badge
                    variant="outline"
                    className="border-white/60 bg-white/60"
                    style={{ color: color.text }}
                >
                    SCHEDULED
                </Badge>
            </div>
        </button>
    );
}

function EmptyCell({
                       density,
                       onClick,
                   }: {
    density: GridDensity;
    onClick?: () => void;
}) {
    const config = DENSITY_CONFIG[density];

    return (
        <button
            type="button"
            onClick={onClick}
            title="Create lesson"
            className={[
                "group flex h-full min-h-full w-full items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 text-muted-foreground outline-none transition",
                "hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-ring",
                config.cellHeight,
            ].join(" ")}
        >
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-current bg-background/60 transition-transform group-hover:scale-110">
                <Plus className="h-4 w-4" />
            </span>
        </button>
    );
}

function GroupHeaderCell({
                             group,
                             left,
                             zIndex,
                         }: {
    group: StudyGroupResponse;
    left: number;
    zIndex: number;
}) {
    return (
        <th
            style={{ left, zIndex, width: GROUP_COLUMN_WIDTH, minWidth: GROUP_COLUMN_WIDTH }}
            className="sticky border-b border-r border-border bg-white px-4 py-3 text-left align-top shadow-[1px_0_0_var(--border)]"
        >
            <div className="line-clamp-2 font-semibold">{group.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">
                {group.studentCount} students
            </div>
            <Badge variant="outline" className="mt-2">
                Course {group.course}
            </Badge>
        </th>
    );
}

export default function TimetableGrid({
                                          lessons,
                                          groups,
                                          selectedDay,
                                          timeSlots,
                                          density = "comfortable",
                                          onCellClick,
                                          onLessonClick,
                                          onTimeSlotDoubleClick,
                                      }: TimetableGridProps) {
    const sortedSlots = sortTimeSlots(timeSlots);
    const config = DENSITY_CONFIG[density];

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
                        style={{
                            minWidth: config.slotWidth * span,
                        }}
                        className={[
                            "border-b border-r border-border bg-background/40 p-2 align-top last:border-r-0",
                            config.cellHeight,
                        ].join(" ")}
                    >
                        <LessonCard
                            lesson={lesson}
                            density={density}
                            showDay={selectedDay === "ALL"}
                            onClick={() => onLessonClick?.(lesson)}
                        />
                    </td>,
                );

                slotIndex += span;
            } else {
                cells.push(
                    <td
                        key={`${day || "single"}-${group.id}-${slot.id}`}
                        style={{
                            minWidth: config.slotWidth,
                        }}
                        className={[
                            "border-b border-r border-border bg-background/40 p-2 align-top last:border-r-0",
                            config.cellHeight,
                        ].join(" ")}
                    >
                        <EmptyCell
                            density={density}
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
        const minWidth =
            DAY_COLUMN_WIDTH +
            GROUP_COLUMN_WIDTH +
            sortedSlots.length * config.slotWidth;

        return (
            <div className="h-full overflow-hidden rounded-2xl border border-border bg-card">
                <div className="custom-scrollbar h-full overflow-auto">
                    <table
                        style={{ minWidth }}
                        className="w-full border-separate border-spacing-0 text-sm"
                    >
                        <thead>
                        <tr>
                            <th
                                style={{
                                    left: 0,
                                    width: DAY_COLUMN_WIDTH,
                                    minWidth: DAY_COLUMN_WIDTH,
                                }}
                                className="sticky top-0 z-50 border-b border-r border-border bg-slate-950 px-4 py-3 text-left font-semibold text-white"
                            >
                                Day
                            </th>

                            <th
                                style={{
                                    left: DAY_COLUMN_WIDTH,
                                    width: GROUP_COLUMN_WIDTH,
                                    minWidth: GROUP_COLUMN_WIDTH,
                                }}
                                className="sticky top-0 z-50 border-b border-r border-border bg-slate-950 px-4 py-3 text-left font-semibold text-white"
                            >
                                Group
                            </th>

                            {sortedSlots.map((slot) => (
                                <TimeSlotHeader
                                    key={slot.id}
                                    slot={slot}
                                    density={density}
                                    onDoubleClick={() =>
                                        onTimeSlotDoubleClick?.(slot)
                                    }
                                />
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
                                            style={{
                                                left: 0,
                                                zIndex: 40,
                                                width: DAY_COLUMN_WIDTH,
                                                minWidth: DAY_COLUMN_WIDTH,
                                            }}
                                            className="sticky border-b border-r border-border bg-blue-100 px-4 py-3 text-left align-middle font-semibold text-blue-950 shadow-[1px_0_0_var(--border)]"
                                        >
                                            <div className="text-sm">
                                                {DAYS_SHORT[day] || day}
                                            </div>
                                            <div className="mt-1 text-xs font-normal text-blue-700">
                                                {day}
                                            </div>
                                        </th>
                                    )}

                                    <GroupHeaderCell
                                        group={group}
                                        left={DAY_COLUMN_WIDTH}
                                        zIndex={30}
                                    />

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

    const minWidth =
        GROUP_COLUMN_WIDTH + sortedSlots.length * config.slotWidth;

    return (
        <div className="h-full overflow-hidden rounded-2xl border border-border bg-card">
            <div className="custom-scrollbar h-full overflow-auto">
                <table
                    style={{ minWidth }}
                    className="w-full border-separate border-spacing-0 text-sm"
                >
                    <thead>
                    <tr>
                        <th
                            style={{
                                left: 0,
                                width: GROUP_COLUMN_WIDTH,
                                minWidth: GROUP_COLUMN_WIDTH,
                            }}
                            className="sticky top-0 z-50 border-b border-r border-border bg-slate-950 px-4 py-3 text-left font-semibold text-white"
                        >
                            Group
                        </th>

                        {sortedSlots.map((slot) => (
                            <TimeSlotHeader
                                key={slot.id}
                                slot={slot}
                                density={density}
                                onDoubleClick={() =>
                                    onTimeSlotDoubleClick?.(slot)
                                }
                            />
                        ))}
                    </tr>
                    </thead>

                    <tbody>
                    {groups.map((group) => (
                        <tr key={group.id}>
                            <GroupHeaderCell
                                group={group}
                                left={0}
                                zIndex={30}
                            />

                            {renderCellsForGroupAndDay(group, selectedDay)}
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}