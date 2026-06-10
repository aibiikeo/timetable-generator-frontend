"use client";

import { useLayoutEffect, useRef, type ReactNode, type WheelEvent } from "react";
import { CalendarDays, CalendarPlus, DoorOpen, Pencil, Plus, Trash2, UserRound, Utensils } from "lucide-react";

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
    onZoomChange?: (zoom: number) => void;
    onCellClick?: (group: StudyGroupResponse, slot: TimeSlot, day?: DayOfWeek, type?: "lesson" | "lunch") => void;
    onLessonClick?: (lesson: LessonResponse) => void;
    onLessonEdit?: (lesson: LessonResponse) => void;
    onLessonDelete?: (lesson: LessonResponse) => void;
    onLunchEdit?: (lunch: LunchResponse) => void;
    onLunchDelete?: (lunch: LunchResponse) => void;
    onTimeSlotDoubleClick?: (slot: TimeSlot) => void;
}

const VISIBLE_DAYS = DAYS_OF_WEEK.filter((day) => day !== "SUNDAY");
const DAY_COLUMN_WIDTH = 132;
const GROUP_COLUMN_WIDTH = 188;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 1.5;

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
    return Math.min(Math.max(Number(zoom), MIN_ZOOM), MAX_ZOOM);
}

function getScaledConfig(density: GridDensity, zoom?: number) {
    const base = DENSITY_CONFIG[density] ?? DENSITY_CONFIG.medium;
    const scale = normalizeZoom(zoom);

    return {
        ...base,
        scale,
        slotWidth: Math.round(base.slotWidth * scale),
        cellHeight: Math.round(base.cellHeight * scale),
        dayColumnWidth: Math.round(DAY_COLUMN_WIDTH * scale),
        groupColumnWidth: Math.round(GROUP_COLUMN_WIDTH * scale),
        headerPaddingX: Math.max(8, Math.round(16 * scale)),
        headerPaddingY: Math.max(8, Math.round(12 * scale)),
        cellPadding: Math.max(4, Math.round(8 * scale)),
        headerFontSize: Math.max(12, Math.round(14 * scale)),
        groupBadgeFontSize: Math.max(10, Math.round(12 * scale)),
        dayFontSize: Math.max(12, Math.round(16 * scale)),
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

function TimeSlotHeader({ slot, config, onDoubleClick }: { slot: TimeSlot; config: ReturnType<typeof getScaledConfig>; onDoubleClick?: () => void }) {
    return (
        <th
            style={{
                minWidth: config.slotWidth,
                width: config.slotWidth,
                padding: `${config.headerPaddingY}px ${config.headerPaddingX}px`,
                fontSize: config.headerFontSize,
            }}
            onDoubleClick={onDoubleClick}
            title="Double click to edit time slot"
            className="sticky top-0 z-30 border-b border-r border-border bg-slate-950 text-left font-semibold text-white last:border-r-0"
        >
            <button type="button" className="w-full rounded-lg text-left outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40">
                <div>{formatTime(slot.startTime)}-{formatTime(slot.endTime)}</div>
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

function LunchCell({
    lunch,
    onEdit,
    onDelete,
}: {
    lunch: LunchResponse;
    onEdit?: () => void;
    onDelete?: () => void;
}) {
    return (
        <div className="group relative flex h-full min-h-full w-full items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-3 text-center text-amber-900">
            <div className="text-sm font-semibold">Lunch</div>

            <div className="absolute right-2 top-2 hidden gap-1 rounded-xl bg-white/80 p-1 shadow-sm backdrop-blur group-hover:flex group-focus-within:flex">
                <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Edit lunch block"
                    title={`${formatTime(lunch.startTime)}-${formatTime(lunch.endTime)}`}
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
                    aria-label="Delete lunch block"
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

function EmptyCell({
    config,
    onCreateLesson,
    onCreateLunch,
}: {
    config: ReturnType<typeof getScaledConfig>;
    onCreateLesson?: () => void;
    onCreateLunch?: () => void;
}) {
    return (
        <div
            className={[
                "group relative flex h-full min-h-full w-full items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 text-muted-foreground outline-none transition",
                "hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-within:ring-2 focus-within:ring-ring",
                config.cardPadding,
            ].join(" ")}
        >
            <Plus className="h-5 w-5 opacity-40 transition group-hover:scale-110 group-hover:opacity-10 group-focus-within:opacity-10" />
            <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    aria-label="Create lesson"
                    title="Create lesson"
                    onClick={onCreateLesson}
                >
                    <CalendarPlus className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    aria-label="Create lunch block"
                    title="Create lunch block"
                    onClick={onCreateLunch}
                >
                    <Utensils className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

function GroupHeaderCell({ group, left, zIndex, config }: { group: StudyGroupResponse; left: number; zIndex: number; config: ReturnType<typeof getScaledConfig> }) {
    return (
        <th
            style={{
                left,
                zIndex,
                width: config.groupColumnWidth,
                minWidth: config.groupColumnWidth,
                padding: `${config.headerPaddingY}px ${config.headerPaddingX}px`,
                fontSize: config.headerFontSize,
            }}
            className="sticky border-b border-r border-border bg-card text-left align-top shadow-[1px_0_0_var(--border)]"
        >
            <div className="line-clamp-2 font-semibold">{group.name}</div>
            <div
                style={{
                    fontSize: config.groupBadgeFontSize,
                    padding: `${Math.max(3, Math.round(4 * config.scale))}px ${Math.max(8, Math.round(12 * config.scale))}px`,
                }}
                className="mt-2 inline-flex rounded-full border border-border text-muted-foreground"
            >
                Course {group.course}
            </div>
        </th>
    );
}

function GridShell({
    minWidth,
    zoom,
    onZoomChange,
    children,
}: {
    minWidth: number;
    zoom: number;
    onZoomChange?: (zoom: number) => void;
    children: ReactNode;
}) {
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const zoomAnchorRef = useRef<{
        zoom: number;
        x: number;
        y: number;
        scrollLeft: number;
        scrollTop: number;
    } | null>(null);

    useLayoutEffect(() => {
        const anchor = zoomAnchorRef.current;
        const scroller = scrollRef.current;

        if (!anchor || !scroller || anchor.zoom === zoom) return;

        const ratio = zoom / anchor.zoom;
        scroller.scrollLeft = (anchor.scrollLeft + anchor.x) * ratio - anchor.x;
        scroller.scrollTop = (anchor.scrollTop + anchor.y) * ratio - anchor.y;
        zoomAnchorRef.current = null;
    }, [zoom]);

    const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
        if (!onZoomChange || (!event.ctrlKey && !event.metaKey)) return;

        event.preventDefault();

        const scroller = scrollRef.current;
        if (!scroller) return;

        const rect = scroller.getBoundingClientRect();
        const nextZoom = normalizeZoom(zoom * Math.exp(-event.deltaY * 0.0015));

        if (nextZoom === zoom) return;

        zoomAnchorRef.current = {
            zoom,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            scrollLeft: scroller.scrollLeft,
            scrollTop: scroller.scrollTop,
        };
        onZoomChange(nextZoom);
    };

    return (
        <div className="h-full overflow-hidden rounded-2xl border border-border bg-card">
            <div ref={scrollRef} onWheel={handleWheel} className="custom-scrollbar h-full overflow-auto">
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
    onZoomChange,
    onCellClick,
    onLessonClick,
    onLessonEdit,
    onLessonDelete,
    onLunchEdit,
    onLunchDelete,
    onTimeSlotDoubleClick,
}: TimetableGridProps) {
    const normalizedDensity = normalizeDensity(density);
    const sortedSlots = sortTimeSlots(timeSlots);
    const config = getScaledConfig(normalizedDensity, zoom);
    const normalizedZoom = normalizeZoom(zoom);

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
                    <td key={`${day || "single"}-${group.id}-${slot.id}`} colSpan={span} style={{ minWidth: config.slotWidth * span, height: config.cellHeight, padding: config.cellPadding }} className="border-b border-r border-border bg-background/40 align-top last:border-r-0">
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
                <td key={`${day || "single"}-${group.id}-${slot.id}`} style={{ minWidth: config.slotWidth, height: config.cellHeight, padding: config.cellPadding }} className="border-b border-r border-border bg-background/40 align-top last:border-r-0">
                    {lunch ? (
                        <LunchCell
                            lunch={lunch}
                            onEdit={() => onLunchEdit?.(lunch)}
                            onDelete={() => onLunchDelete?.(lunch)}
                        />
                    ) : (
                        <EmptyCell
                            config={config}
                            onCreateLesson={() => onCellClick?.(group, slot, day, "lesson")}
                            onCreateLunch={() => onCellClick?.(group, slot, day, "lunch")}
                        />
                    )}
                </td>,
            );
            slotIndex += 1;
        }

        return cells;
    };

    if (selectedDay === "ALL") {
        const minWidth = config.dayColumnWidth + config.groupColumnWidth + sortedSlots.length * config.slotWidth;

        return (
            <GridShell minWidth={minWidth} zoom={normalizedZoom} onZoomChange={onZoomChange}>
                <thead>
                <tr>
                    <th style={{ left: 0, width: config.dayColumnWidth, minWidth: config.dayColumnWidth, padding: `${config.headerPaddingY}px ${config.headerPaddingX}px`, fontSize: config.headerFontSize }} className="sticky top-0 z-50 border-b border-r border-border bg-slate-950 text-left font-semibold text-white">Day</th>
                    <th style={{ left: config.dayColumnWidth, width: config.groupColumnWidth, minWidth: config.groupColumnWidth, padding: `${config.headerPaddingY}px ${config.headerPaddingX}px`, fontSize: config.headerFontSize }} className="sticky top-0 z-50 border-b border-r border-border bg-slate-950 text-left font-semibold text-white">Group</th>
                    {sortedSlots.map((slot) => <TimeSlotHeader key={slot.id} slot={slot} config={config} onDoubleClick={() => onTimeSlotDoubleClick?.(slot)} />)}
                </tr>
                </thead>
                <tbody>
                {VISIBLE_DAYS.map((day) => groups.map((group, groupIndex) => (
                    <tr key={`${day}-${group.id}`}>
                        {groupIndex === 0 && (
                            <th rowSpan={groups.length} style={{ left: 0, zIndex: 40, width: config.dayColumnWidth, minWidth: config.dayColumnWidth, padding: `${config.headerPaddingY}px ${config.headerPaddingX}px`, fontSize: config.dayFontSize }} className="sticky border-b border-r border-border bg-blue-100 text-left align-top font-semibold text-blue-950 shadow-[1px_0_0_var(--border)]">
                                <div className="sticky top-16 whitespace-normal break-words leading-5">{DAY_LABELS[day]}</div>
                            </th>
                        )}
                        <GroupHeaderCell group={group} left={config.dayColumnWidth} zIndex={30} config={config} />
                        {renderCells(group, day)}
                    </tr>
                )))}
                </tbody>
            </GridShell>
        );
    }

    const minWidth = config.groupColumnWidth + sortedSlots.length * config.slotWidth;

    return (
        <GridShell minWidth={minWidth} zoom={normalizedZoom} onZoomChange={onZoomChange}>
            <thead>
            <tr>
                <th style={{ left: 0, width: config.groupColumnWidth, minWidth: config.groupColumnWidth, padding: `${config.headerPaddingY}px ${config.headerPaddingX}px`, fontSize: config.headerFontSize }} className="sticky top-0 z-50 border-b border-r border-border bg-slate-950 text-left font-semibold text-white">Group</th>
                {sortedSlots.map((slot) => <TimeSlotHeader key={slot.id} slot={slot} config={config} onDoubleClick={() => onTimeSlotDoubleClick?.(slot)} />)}
            </tr>
            </thead>
            <tbody>
            {groups.map((group) => (
                <tr key={group.id}>
                    <GroupHeaderCell group={group} left={0} zIndex={30} config={config} />
                    {renderCells(group, selectedDay)}
                </tr>
            ))}
            </tbody>
        </GridShell>
    );
}
