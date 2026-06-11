"use client";

import { useLayoutEffect, useRef, useState, type DragEvent, type ReactNode, type WheelEvent } from "react";
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

export type GridDensity = "compact" | "medium" | "large";

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
    onLessonMove?: (lesson: LessonResponse, target: { group: StudyGroupResponse; slot: TimeSlot; day: DayOfWeek }) => void | Promise<void>;
    onLunchEdit?: (lunch: LunchResponse) => void;
    onLunchDelete?: (lunch: LunchResponse) => void;
    onTimeSlotDoubleClick?: (slot: TimeSlot) => void;
    readOnly?: boolean;
    rowHeaderLabel?: string;
    showEmptyCellPlaceholder?: boolean;
}

interface DraggedLesson {
    lesson: LessonResponse;
    groupName: string;
}

interface DropTarget {
    day: DayOfWeek;
    groupId: number;
    slotId: number;
    state: "valid" | "invalid" | "disabled";
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

function getLessonDuration(lesson: LessonResponse) {
    const duration = Number(lesson.durationHours);
    if (!Number.isFinite(duration) || duration < 1) return 1;
    return Math.max(1, Math.round(duration));
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

function getLunchSpan(lunch: LunchResponse, slotIndex: number, slots: TimeSlot[]) {
    const lunchEnd = formatTime(lunch.endTime);
    let span = 1;

    for (let index = slotIndex + 1; index < slots.length; index += 1) {
        if (formatTime(slots[index - 1].endTime) >= lunchEnd) break;
        span += 1;
    }

    return span;
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
    onDragStart,
    onDragEnd,
    readOnly = false,
}: {
    lesson: LessonResponse;
    config: ReturnType<typeof getScaledConfig>;
    onClick?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onDragStart?: (event: DragEvent<HTMLDivElement>) => void;
    onDragEnd?: () => void;
    readOnly?: boolean;
}) {
    const color = getLessonColor(lesson);
    const hasActions = Boolean(onEdit || onDelete);

    return (
        <div
            role="button"
            tabIndex={0}
            draggable={!readOnly}
            onDragStart={(event) => {
                if (readOnly) return;
                const ghost = document.createElement("div");
                const rect = event.currentTarget.getBoundingClientRect();
                ghost.textContent = lesson.subjectName;
                ghost.style.position = "fixed";
                ghost.style.top = "-1000px";
                ghost.style.left = "-1000px";
                ghost.style.width = `${rect.width}px`;
                ghost.style.height = `${rect.height}px`;
                ghost.style.boxSizing = "border-box";
                ghost.style.padding = "12px";
                ghost.style.border = `1px solid ${color.border}`;
                ghost.style.borderRadius = "16px";
                ghost.style.background = color.bg;
                ghost.style.color = color.text;
                ghost.style.opacity = "0.62";
                ghost.style.font = "600 14px system-ui, sans-serif";
                ghost.style.boxShadow = "0 10px 20px rgb(15 23 42 / 0.12)";
                ghost.style.overflow = "hidden";
                document.body.append(ghost);
                event.dataTransfer.setDragImage(ghost, 0, 0);
                window.setTimeout(() => ghost.remove(), 0);
                onDragStart?.(event);
            }}
            onDragEnd={onDragEnd}
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
                readOnly
                    ? "cursor-default hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
                    : "cursor-grab hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring",
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

            {hasActions && (
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
            )}
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
    const hasActions = Boolean(onEdit || onDelete);

    return (
        <div className="group relative flex h-full min-h-full w-full items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-3 text-center text-amber-900">
            <div className="text-sm font-semibold">Lunch</div>

            {hasActions && (
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
            )}
        </div>
    );
}

function EmptyCell({
    config,
    onCreateLesson,
    onCreateLunch,
    showPlaceholder = true,
}: {
    config: ReturnType<typeof getScaledConfig>;
    onCreateLesson?: () => void;
    onCreateLunch?: () => void;
    showPlaceholder?: boolean;
}) {
    const hasActions = Boolean(onCreateLesson || onCreateLunch);

    return (
        <div
            className={[
                "group relative flex h-full min-h-full w-full items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 text-muted-foreground outline-none transition",
                hasActions ? "hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-within:ring-2 focus-within:ring-ring" : "",
                config.cardPadding,
            ].join(" ")}
        >
            {showPlaceholder && (
                <Plus className={`h-5 w-5 opacity-40 transition ${hasActions ? "group-hover:scale-110 group-hover:opacity-10 group-focus-within:opacity-10" : ""}`} />
            )}
            {hasActions && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                {onCreateLesson && (
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
                )}
                {onCreateLunch && (
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
                )}
            </div>
            )}
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
    onLessonMove,
    onLunchEdit,
    onLunchDelete,
    onTimeSlotDoubleClick,
    readOnly = false,
    rowHeaderLabel = "Group",
    showEmptyCellPlaceholder = true,
}: TimetableGridProps) {
    const normalizedDensity = normalizeDensity(density);
    const sortedSlots = sortTimeSlots(timeSlots);
    const config = getScaledConfig(normalizedDensity, zoom);
    const normalizedZoom = normalizeZoom(zoom);
    const [draggedLesson, setDraggedLesson] = useState<DraggedLesson | null>(null);
    const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

    if (groups.length === 0) {
        return <EmptyGridState title="No groups selected" description="Change filters to show timetable grid." />;
    }

    if (sortedSlots.length === 0) {
        return <EmptyGridState title="No time slots" description="Create time slots before viewing the grid." />;
    }

    const canFitLessonAt = (lesson: LessonResponse, group: StudyGroupResponse, slot: TimeSlot, day?: DayOfWeek) => {
        if (!day || !lesson.groupNames.includes(group.name)) return false;

        const startIndex = sortedSlots.findIndex((item) => item.id === slot.id);
        if (startIndex === -1) return false;

        const duration = getLessonDuration(lesson);
        if (startIndex + duration > sortedSlots.length) return false;

        const occupiedSlots = new Set<number>();

        lessons.forEach((item) => {
            if (item.id === lesson.id || item.dayOfWeek !== day || !item.groupNames.includes(group.name)) return;

            const lessonStartIndex = sortedSlots.findIndex((slotItem) => formatTime(slotItem.startTime) === formatTime(item.startTime));
            if (lessonStartIndex === -1) return;

            const lessonSpan = getLessonSpan(item, sortedSlots.length - lessonStartIndex);
            for (let index = lessonStartIndex; index < lessonStartIndex + lessonSpan; index += 1) {
                occupiedSlots.add(index);
            }
        });

        lunchBlocks.forEach((lunch) => {
            if (lunch.dayOfWeek !== day || lunch.groupId !== group.id) return;

            const lunchStartIndex = sortedSlots.findIndex((slotItem) => formatTime(slotItem.startTime) === formatTime(lunch.startTime));
            if (lunchStartIndex === -1) return;

            const lunchSpan = getLunchSpan(lunch, lunchStartIndex, sortedSlots);
            for (let index = lunchStartIndex; index < lunchStartIndex + lunchSpan; index += 1) {
                occupiedSlots.add(index);
            }
        });

        for (let index = startIndex; index < startIndex + duration; index += 1) {
            if (occupiedSlots.has(index)) return false;
        }

        return true;
    };

    const getDropTargetState = (group: StudyGroupResponse, slot: TimeSlot, day?: DayOfWeek): DropTarget["state"] | null => {
        if (!draggedLesson || !day) return null;
        if (draggedLesson.groupName !== group.name) return "disabled";
        return canFitLessonAt(draggedLesson.lesson, group, slot, day) ? "valid" : "invalid";
    };

    const getDropState = (group: StudyGroupResponse, slot: TimeSlot, day?: DayOfWeek) => {
        if (!draggedLesson || !day) return null;
        const state = getDropTargetState(group, slot, day);
        const active = dropTarget?.day === day && dropTarget.groupId === group.id && dropTarget.slotId === slot.id;
        return { state, active };
    };

    const handleCellDragEnter = (group: StudyGroupResponse, slot: TimeSlot, day?: DayOfWeek) => {
        if (!draggedLesson || !day) return;
        setDropTarget({
            day,
            groupId: group.id,
            slotId: slot.id,
            state: getDropTargetState(group, slot, day) ?? "disabled",
        });
    };

    const handleCellDragOver = (event: DragEvent<HTMLTableCellElement>, group: StudyGroupResponse, slot: TimeSlot, day?: DayOfWeek) => {
        if (!draggedLesson || !day) return;
        const state = getDropTargetState(group, slot, day);

        setDropTarget({
            day,
            groupId: group.id,
            slotId: slot.id,
            state: state ?? "disabled",
        });

        if (state !== "valid") {
            event.dataTransfer.dropEffect = "none";
            return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    };

    const handleCellDrop = async (event: DragEvent<HTMLTableCellElement>, group: StudyGroupResponse, slot: TimeSlot, day?: DayOfWeek) => {
        event.preventDefault();

        if (!draggedLesson || !day || !canFitLessonAt(draggedLesson.lesson, group, slot, day)) {
            setDropTarget(null);
            return;
        }

        const lesson = draggedLesson.lesson;
        setDraggedLesson(null);
        setDropTarget(null);

        if (lesson.dayOfWeek === day && formatTime(lesson.startTime) === formatTime(slot.startTime)) {
            return;
        }

        await onLessonMove?.(lesson, { group, slot, day });
    };

    const handleCellDragLeave = (event: DragEvent<HTMLTableCellElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setDropTarget(null);
        }
    };

    const getCellClassName = (dropState: ReturnType<typeof getDropState>) => {
        const classes = ["border-b border-r border-border bg-background/40 align-top transition-colors last:border-r-0"];

        if (dropState?.active && dropState.state === "valid") {
            classes.push("bg-emerald-50 ring-2 ring-inset ring-emerald-400");
        } else if (dropState?.active && dropState.state === "invalid") {
            classes.push("bg-red-50 ring-2 ring-inset ring-red-300");
        } else if (draggedLesson && dropState?.state === "valid") {
            classes.push("bg-emerald-50/40");
        } else if (draggedLesson && dropState?.state === "invalid") {
            classes.push("bg-red-50/30");
        } else if (draggedLesson && dropState?.state === "disabled") {
            classes.push("opacity-35 grayscale");
        }

        return classes.join(" ");
    };

    const renderCells = (group: StudyGroupResponse, day?: DayOfWeek) => {
        const cells: ReactNode[] = [];
        let slotIndex = 0;

        while (slotIndex < sortedSlots.length) {
            const slot = sortedSlots[slotIndex];
            const lesson = getLessonForCell(lessons, group.name, slot, day);
            const lunch = getLunchForCell(lunchBlocks, group.id, slot, day);
            const dropState = getDropState(group, slot, day);
            const cellDragProps = readOnly ? {} : {
                onDragEnter: () => handleCellDragEnter(group, slot, day),
                onDragOver: (event: DragEvent<HTMLTableCellElement>) => handleCellDragOver(event, group, slot, day),
                onDragLeave: handleCellDragLeave,
                onDrop: (event: DragEvent<HTMLTableCellElement>) => handleCellDrop(event, group, slot, day),
            };

            if (lesson) {
                const span = getLessonSpan(lesson, sortedSlots.length - slotIndex);
                cells.push(
                    <td
                        key={`${day || "single"}-${group.id}-${slot.id}`}
                        colSpan={span}
                        style={{ minWidth: config.slotWidth * span, height: config.cellHeight, padding: config.cellPadding }}
                        className={getCellClassName(dropState)}
                        {...cellDragProps}
                    >
                        <LessonCard
                            lesson={lesson}
                            config={config}
                            onClick={() => onLessonClick?.(lesson)}
                            onEdit={() => onLessonEdit?.(lesson)}
                            onDelete={() => onLessonDelete?.(lesson)}
                            onDragStart={(event) => {
                                if (readOnly) return;
                                setDraggedLesson({ lesson, groupName: group.name });
                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData("text/plain", String(lesson.id));
                            }}
                            onDragEnd={() => {
                                setDraggedLesson(null);
                                setDropTarget(null);
                            }}
                            readOnly={readOnly}
                        />
                    </td>,
                );
                slotIndex += span;
                continue;
            }

            cells.push(
                <td
                    key={`${day || "single"}-${group.id}-${slot.id}`}
                    style={{ minWidth: config.slotWidth, height: config.cellHeight, padding: config.cellPadding }}
                    className={getCellClassName(dropState)}
                    {...cellDragProps}
                >
                    {lunch ? (
                        <LunchCell
                            lunch={lunch}
                            onEdit={() => onLunchEdit?.(lunch)}
                            onDelete={() => onLunchDelete?.(lunch)}
                        />
                    ) : (
                        <EmptyCell
                            config={config}
                            onCreateLesson={onCellClick ? () => onCellClick(group, slot, day, "lesson") : undefined}
                            onCreateLunch={onCellClick ? () => onCellClick(group, slot, day, "lunch") : undefined}
                            showPlaceholder={showEmptyCellPlaceholder}
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
                    <th style={{ left: config.dayColumnWidth, width: config.groupColumnWidth, minWidth: config.groupColumnWidth, padding: `${config.headerPaddingY}px ${config.headerPaddingX}px`, fontSize: config.headerFontSize }} className="sticky top-0 z-50 border-b border-r border-border bg-slate-950 text-left font-semibold text-white">{rowHeaderLabel}</th>
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
                <th style={{ left: 0, width: config.groupColumnWidth, minWidth: config.groupColumnWidth, padding: `${config.headerPaddingY}px ${config.headerPaddingX}px`, fontSize: config.headerFontSize }} className="sticky top-0 z-50 border-b border-r border-border bg-slate-950 text-left font-semibold text-white">{rowHeaderLabel}</th>
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
