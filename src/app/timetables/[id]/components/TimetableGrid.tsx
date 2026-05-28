"use client";

import type { ReactNode } from "react";
import { CalendarDays, DoorOpen, Pencil, Plus, Trash2, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
    DayOfWeek,
    LessonResponse,
    LunchResponse,
    StudyGroupResponse,
    TimeSlot,
} from "@/lib/types";
import { DAYS_OF_WEEK } from "@/lib/constants";

type GridDensity = "compact" | "medium" | "large";

interface TimetableGridProps {
    lessons: LessonResponse[];
    groups: StudyGroupResponse[];
    selectedDay: DayOfWeek | "ALL";
    timeSlots: TimeSlot[];
    lunchBlocks?: LunchResponse[];
    density?: GridDensity | "comfortable";
    zoom?: number;
    onCellClick?: (group: StudyGroupResponse, slot: TimeSlot, day?: DayOfWeek) => void;
    onLessonClick?: (lesson: LessonResponse) => void;
    onLessonEdit?: (lesson: LessonResponse) => void;
    onLessonDelete?: (lesson: LessonResponse) => void;
    onTimeSlotDoubleClick?: (slot: TimeSlot) => void;
}

const VISIBLE_DAYS = DAYS_OF_WEEK.filter((day) => day !== "SUNDAY");
const DAY_COLUMN_WIDTH = 132;
const GROUP_COLUMN_WIDTH = 188;

const DAY_LABELS: Record<DayOfWeek, string> = {
    MONDAY: "Monday",
    TUESDAY: "Tuesday",
    WEDNESDAY: "Wednesday",
    THURSDAY: "Thursday",
    FRIDAY: "Friday",
    SATURDAY: "Saturday",
    SUNDAY: "Sunday",
};

const DENSITY_CONFIG: Record<GridDensity, { slotWidth: number; cellHeight: number; cardPadding: string; titleSize: string; metaSize: string }> = {
    compact: { slotWidth: 132, cellHeight: 96, cardPadding: "p-2", titleSize: "text-xs", metaSize: "text-[11px]" },
    medium: { slotWidth: 170, cellHeight: 128, cardPadding: "p-3", titleSize: "text-sm", metaSize: "text-xs" },
    large: { slotWidth: 210, cellHeight: 160, cardPadding: "p-4", titleSize: "text-sm", metaSize: "text-xs" },
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
];

function normalizeDensity(density?: GridDensity | "comfortable"): GridDensity {
    if (density === "compact" || density === "medium" || density === "large") {
        return density;
    }

    return "medium";
}

function normalizeZoom(zoom?: number) {
    if (!Number.isFinite(zoom)) return 1;
    return Math.min(Math.max(Number(zoom), 0.6), 1.5);
}

function getScaledConfig(density: GridDensity, zoom?: number) {
    const base = DENSITY_CONFIG[density] ?? DENSITY_CONFIG.medium;
    const scale = normalizeZoom(zoom);

    return {
        ...base,
        slotWidth: Math.round(base.slotWidth * scale),
        cellHeight: Math.round(base.cellHeight * scale),
    };
}

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
    return LESSON_PALETTE[hashString(`${lesson.subjectName}-${lesson.teacherName}`) % LESSON_PALETTE.length];
}

function getLessonSpan(lesson: LessonResponse, remainingSlots: number) {
    const duration = Number(lesson.durationHours);
    if (!Number.isFinite(duration) || duration < 1) return 1;
    return Math.min(Math.max(1, Math.round(duration)), remainingSlots);
}

function sortTimeSlots(timeSlots: TimeSlot[]) {
    return [...timeSlots].sort((a, b) => {
        const orderDiff = (a.order ?? 0) - (b.order ?? 0);
        if (orderDiff !== 0) return orderDiff;
        return formatTime(a.startTime).localeCompare(formatTime(b.startTime));
    });
}

function getLessonForCell(lessons: LessonResponse[], groupName: string, slot: TimeSlot, day?: DayOfWeek) {
    return lessons.find((lesson) =>
        lesson.groupNames.includes(groupName) &&
        formatTime(lesson.startTime) === formatTime(slot.startTime) &&
        (!day || lesson.dayOfWeek === day),
    );
}

function getLunchForCell(lunchBlocks: LunchResponse[], groupId: number, slot: TimeSlot, day?: DayOfWeek) {
    return lunchBlocks.find((lunch) =>
        lunch.groupId === groupId &&
        formatTime(lunch.startTime) === formatTime(slot.startTime) &&
        (!day || lunch.dayOfWeek === day),
    );
}

function EmptyGridState({ title, description }: { title: string; description: string }) {
    return (
        <div className="flex h-full min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-border bg-card/60">
            <div className="text-center">
                <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground" />
                <h3 className="mt-3 text-sm font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
        </div>
    );
}

function getSlotDescription(slot: TimeSlot) {
    const description = String(slot.description || "").trim();
    if (description && !/^\d+$/.test(description)) return description;

    const order = slot.order ?? Number(description);
    if (!order) return description;

    const suffix = order % 100 >= 11 && order % 100 <= 13
        ? "th"
        : order % 10 === 1
            ? "st"
            : order % 10 === 2
                ? "nd"
                : order % 10 === 3
                    ? "rd"
                    : "th";

    return `${order}${suffix} lesson`;
}

function TimeSlotHeader({ slot, config, onDoubleClick }: { slot: TimeSlot; config: ReturnType<typeof getScaledConfig>; onDoubleClick?: () => void }) {
    const description = getSlotDescription(slot);

    return (
        <th
            style={{ minWidth: config.slotWidth, width: config.slotWidth }}
            onDoubleClick={onDoubleClick}
            title="Double click to edit time slot"
            className="sticky top-0 z-30 border-b border-r border-border bg-slate-950 px-3 py-3 text-left font-semibold text-white last:border-r-0"
        >
            <button type="button" className="w-full rounded-lg text-left outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40">
                <div>{formatTime(slot.startTime)}-{formatTime(slot.endTime)}</div>
                {description && <div className="mt-1 line-clamp-1 text-xs font-normal text-slate-300">{description}</div>}
            </button>
        </th>
    );
}

function LessonCard({
    lesson,
    config,
    onClick,
    onEdit,
    onDelete,
}: {
    lesson: LessonResponse;
    config: ReturnType<typeof getScaledConfig>;
    onClick?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}) {
    const color = getLessonColor(lesson);

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onDoubleClick={(event) => {
                event.stopPropagation();
                onEdit?.();
            }}
            onKeyDown={(event) => {
                if (event.key === "Enter") onClick?.();
            }}
            title={`${lesson.subjectName}\n${lesson.teacherName}\n${lesson.roomName || "No room"}`}
            className={[
                "group relative h-full min-h-full w-full rounded-2xl border text-left shadow-sm outline-none transition",
                "cursor-pointer hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring",
                config.cardPadding,
            ].join(" ")}
            style={{ backgroundColor: color.bg, borderColor: color.border, color: color.text }}
        >
            <div className={`line-clamp-2 font-semibold leading-5 ${config.titleSize}`}>{lesson.subjectName}</div>
            <div className={`mt-1 flex items-center gap-1 ${config.metaSize}`}>
                <UserRound className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{lesson.teacherName}</span>
            </div>
            <div className={`mt-1 flex items-center gap-1 ${config.metaSize}`}>
                <DoorOpen className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{lesson.roomName || "No room"}</span>
            </div>

            <div className="absolute right-2 top-2 hidden gap-1 rounded-xl bg-white/75 p-1 shadow-sm backdrop-blur group-hover:flex group-focus-within:flex">
                <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Edit lesson"
                    onClick={(event) => {
                        event.stopPropagation();
                        onEdit?.();
                    }}
                >
                    <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Delete lesson"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={(event) => {
                        event.stopPropagation();
                        onDelete?.();
                    }}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}

function LunchCell() {
    return (
        <div className="flex h-full min-h-full w-full items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-3 text-center text-amber-900">
            <div className="text-sm font-semibold">Lunch</div>
        </div>
    );
}

function EmptyCell({ config, onClick }: { config: ReturnType<typeof getScaledConfig>; onClick?: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title="Create lesson"
            className={[
                "group flex h-full min-h-full w-full items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 text-muted-foreground outline-none transition",
                "hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-ring",
                config.cardPadding,
            ].join(" ")}
        >
            <Plus className="h-5 w-5 opacity-40 transition group-hover:scale-110 group-hover:opacity-100" />
        </button>
    );
}

function GroupHeaderCell({ group, left, zIndex }: { group: StudyGroupResponse; left: number; zIndex: number }) {
    return (
        <th
            style={{ left, zIndex, width: GROUP_COLUMN_WIDTH, minWidth: GROUP_COLUMN_WIDTH }}
            className="sticky border-b border-r border-border bg-card px-4 py-3 text-left align-top shadow-[1px_0_0_var(--border)]"
        >
            <div className="line-clamp-2 font-semibold">{group.name}</div>
            <div className="mt-2 inline-flex rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">Course {group.course}</div>
        </th>
    );
}

function GridShell({ minWidth, children }: { minWidth: number; children: ReactNode }) {
    return (
        <div className="h-full overflow-hidden rounded-2xl border border-border bg-card">
            <div className="custom-scrollbar h-full overflow-auto">
                <table style={{ minWidth }} className="w-full border-separate border-spacing-0 text-sm">
                    {children}
                </table>
            </div>
        </div>
    );
}

export default function TimetableGrid({
    lessons,
    groups,
    selectedDay,
    timeSlots,
    lunchBlocks = [],
    density = "medium",
    zoom = 1,
    onCellClick,
    onLessonClick,
    onLessonEdit,
    onLessonDelete,
    onTimeSlotDoubleClick,
}: TimetableGridProps) {
    const normalizedDensity = normalizeDensity(density);
    const sortedSlots = sortTimeSlots(timeSlots);
    const config = getScaledConfig(normalizedDensity, zoom);

    if (groups.length === 0) {
        return <EmptyGridState title="No groups selected" description="Change filters to show timetable grid." />;
    }

    if (sortedSlots.length === 0) {
        return <EmptyGridState title="No time slots" description="Create time slots before viewing the grid." />;
    }

    const renderCells = (group: StudyGroupResponse, day?: DayOfWeek) => {
        const cells: ReactNode[] = [];
        let slotIndex = 0;

        while (slotIndex < sortedSlots.length) {
            const slot = sortedSlots[slotIndex];
            const lesson = getLessonForCell(lessons, group.name, slot, day);
            const lunch = getLunchForCell(lunchBlocks, group.id, slot, day);

            if (lesson) {
                const span = getLessonSpan(lesson, sortedSlots.length - slotIndex);
                cells.push(
                    <td key={`${day || "single"}-${group.id}-${slot.id}`} colSpan={span} style={{ minWidth: config.slotWidth * span, height: config.cellHeight }} className="border-b border-r border-border bg-background/40 p-2 align-top last:border-r-0">
                        <LessonCard
                            lesson={lesson}
                            config={config}
                            onClick={() => onLessonClick?.(lesson)}
                            onEdit={() => onLessonEdit?.(lesson)}
                            onDelete={() => onLessonDelete?.(lesson)}
                        />
                    </td>,
                );
                slotIndex += span;
                continue;
            }

            cells.push(
                <td key={`${day || "single"}-${group.id}-${slot.id}`} style={{ minWidth: config.slotWidth, height: config.cellHeight }} className="border-b border-r border-border bg-background/40 p-2 align-top last:border-r-0">
                    {lunch ? <LunchCell /> : <EmptyCell config={config} onClick={() => onCellClick?.(group, slot, day)} />}
                </td>,
            );
            slotIndex += 1;
        }

        return cells;
    };

    if (selectedDay === "ALL") {
        const minWidth = DAY_COLUMN_WIDTH + GROUP_COLUMN_WIDTH + sortedSlots.length * config.slotWidth;

        return (
            <GridShell minWidth={minWidth}>
                <thead>
                <tr>
                    <th style={{ left: 0, width: DAY_COLUMN_WIDTH, minWidth: DAY_COLUMN_WIDTH }} className="sticky top-0 z-50 border-b border-r border-border bg-slate-950 px-4 py-3 text-left font-semibold text-white">Day</th>
                    <th style={{ left: DAY_COLUMN_WIDTH, width: GROUP_COLUMN_WIDTH, minWidth: GROUP_COLUMN_WIDTH }} className="sticky top-0 z-50 border-b border-r border-border bg-slate-950 px-4 py-3 text-left font-semibold text-white">Group</th>
                    {sortedSlots.map((slot) => <TimeSlotHeader key={slot.id} slot={slot} config={config} onDoubleClick={() => onTimeSlotDoubleClick?.(slot)} />)}
                </tr>
                </thead>
                <tbody>
                {VISIBLE_DAYS.map((day) => groups.map((group, groupIndex) => (
                    <tr key={`${day}-${group.id}`}>
                        {groupIndex === 0 && (
                            <th rowSpan={groups.length} style={{ left: 0, zIndex: 40, width: DAY_COLUMN_WIDTH, minWidth: DAY_COLUMN_WIDTH }} className="sticky border-b border-r border-border bg-blue-100 px-4 py-4 text-left align-top font-semibold text-blue-950 shadow-[1px_0_0_var(--border)]">
                                <div className="sticky top-16 whitespace-normal break-words text-base leading-5">{DAY_LABELS[day]}</div>
                            </th>
                        )}
                        <GroupHeaderCell group={group} left={DAY_COLUMN_WIDTH} zIndex={30} />
                        {renderCells(group, day)}
                    </tr>
                )))}
                </tbody>
            </GridShell>
        );
    }

    const minWidth = GROUP_COLUMN_WIDTH + sortedSlots.length * config.slotWidth;

    return (
        <GridShell minWidth={minWidth}>
            <thead>
            <tr>
                <th style={{ left: 0, width: GROUP_COLUMN_WIDTH, minWidth: GROUP_COLUMN_WIDTH }} className="sticky top-0 z-50 border-b border-r border-border bg-slate-950 px-4 py-3 text-left font-semibold text-white">Group</th>
                {sortedSlots.map((slot) => <TimeSlotHeader key={slot.id} slot={slot} config={config} onDoubleClick={() => onTimeSlotDoubleClick?.(slot)} />)}
            </tr>
            </thead>
            <tbody>
            {groups.map((group) => (
                <tr key={group.id}>
                    <GroupHeaderCell group={group} left={0} zIndex={30} />
                    {renderCells(group, selectedDay)}
                </tr>
            ))}
            </tbody>
        </GridShell>
    );
}
