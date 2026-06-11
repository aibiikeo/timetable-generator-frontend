"use client";

import { type ComponentType, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowRight,
    BookOpen,
    Building2,
    CalendarDays,
    Check,
    ClipboardList,
    DoorOpen,
    GraduationCap,
    Layers3,
    Plus,
    Settings,
    UserRound,
    UsersRound,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { assignmentApi, lessonApi, quickActionApi, timetableApi } from "@/lib";
import type {
    AssignmentResponse,
    LessonResponse,
    QuickActionOptionResponse,
    QuickActionSettingsResponse,
    TimetableResponse,
} from "@/lib";

const fallbackQuickActions: QuickActionOptionResponse[] = [
    { id: "OPEN_TIMETABLES", label: "Open timetables", method: "GET", pathTemplate: "/api/timetables", group: "Timetables" },
    { id: "NEW_TIMETABLE", label: "New timetable", method: "POST", pathTemplate: "/api/timetables", group: "Timetables" },
    { id: "ADD_ASSIGNMENT", label: "Add assignment", method: "POST", pathTemplate: "/api/timetables/{timetableId}/assignments", group: "Assignments" },
    { id: "OPEN_ASSIGNMENTS", label: "Open assignments", method: "GET", pathTemplate: "/api/timetables/{timetableId}/assignments", group: "Assignments" },
    { id: "OPEN_TEACHERS", label: "Open teachers", method: "GET", pathTemplate: "/api/teachers", group: "Teachers" },
    { id: "ADD_TEACHER", label: "Add teacher", method: "POST", pathTemplate: "/api/teachers", group: "Teachers" },
    { id: "OPEN_ROOMS", label: "Open rooms", method: "GET", pathTemplate: "/api/rooms", group: "Rooms" },
    { id: "ADD_ROOM", label: "Add room", method: "POST", pathTemplate: "/api/rooms", group: "Rooms" },
    { id: "OPEN_SUBJECTS", label: "Open subjects", method: "GET", pathTemplate: "/api/subjects", group: "Subjects" },
    { id: "ADD_SUBJECT", label: "Add subject", method: "POST", pathTemplate: "/api/subjects", group: "Subjects" },
    { id: "OPEN_GROUPS", label: "Open groups", method: "GET", pathTemplate: "/api/groups", group: "Groups" },
    { id: "ADD_GROUP", label: "Add group", method: "POST", pathTemplate: "/api/groups", group: "Groups" },
    { id: "OPEN_FACULTIES", label: "Open faculties", method: "GET", pathTemplate: "/api/faculties", group: "Faculties" },
    { id: "ADD_FACULTY", label: "Add faculty", method: "POST", pathTemplate: "/api/faculties", group: "Faculties" },
    { id: "OPEN_DEPARTMENTS", label: "Open departments", method: "GET", pathTemplate: "/api/departments", group: "Departments" },
    { id: "ADD_DEPARTMENT", label: "Add department", method: "POST", pathTemplate: "/api/departments", group: "Departments" },
    { id: "OPEN_MAJORS", label: "Open majors", method: "GET", pathTemplate: "/api/majors", group: "Majors" },
    { id: "ADD_MAJOR", label: "Add major", method: "POST", pathTemplate: "/api/majors", group: "Majors" },
];

const QUICK_ACTIONS_STORAGE_KEY = "quick-actions-settings";
const LAST_WORKED_TIMETABLE_STORAGE_KEY = "last-worked-timetable-id";

const quickActionIcons: Record<string, ComponentType<{ className?: string }>> = {
    OPEN_TIMETABLES: CalendarDays,
    NEW_TIMETABLE: Plus,
    ADD_ASSIGNMENT: ClipboardList,
    OPEN_ASSIGNMENTS: ClipboardList,
    OPEN_TEACHERS: UserRound,
    ADD_TEACHER: UserRound,
    OPEN_ROOMS: DoorOpen,
    ADD_ROOM: DoorOpen,
    OPEN_SUBJECTS: BookOpen,
    ADD_SUBJECT: BookOpen,
    OPEN_GROUPS: UsersRound,
    ADD_GROUP: UsersRound,
    OPEN_FACULTIES: Building2,
    ADD_FACULTY: Building2,
    OPEN_DEPARTMENTS: Layers3,
    ADD_DEPARTMENT: Layers3,
    OPEN_MAJORS: GraduationCap,
    ADD_MAJOR: GraduationCap,
};

function getDisplayTimetableName(name: string) {
    return name.replace(/\s+v\d+$/i, "").trim();
}

function formatStatus(status: TimetableResponse["status"]) {
    return status.charAt(0) + status.slice(1).toLowerCase();
}

function getFallbackSettings(): QuickActionSettingsResponse {
    return {
        autoEnabled: true,
        maxSelected: 10,
        selectedActions: fallbackQuickActions.slice(0, 10),
        availableActions: fallbackQuickActions,
    };
}

function getStoredQuickActionSettings() {
    if (typeof window === "undefined") return null;

    try {
        const raw = window.localStorage.getItem(QUICK_ACTIONS_STORAGE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as {
            autoEnabled?: boolean;
            selectedActionIds?: string[];
        };
        const selectedActionIds = Array.isArray(parsed.selectedActionIds)
            ? parsed.selectedActionIds
            : [];

        return {
            autoEnabled: parsed.autoEnabled ?? true,
            selectedActionIds,
        };
    } catch {
        return null;
    }
}

function getStoredLastWorkedTimetableId() {
    if (typeof window === "undefined") return null;

    const raw = window.localStorage.getItem(LAST_WORKED_TIMETABLE_STORAGE_KEY);
    const id = raw ? Number(raw) : NaN;

    return Number.isFinite(id) && id > 0 ? id : null;
}

function getLatestActiveTimetable(timetables: TimetableResponse[]) {
    return [...timetables]
        .filter((timetable) => timetable.status !== "ARCHIVED")
        .sort((a, b) => {
            return (
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            );
        })[0] ?? null;
}

function getCurrentTimetable(
    timetables: TimetableResponse[],
    lastWorkedTimetableId: number | null,
) {
    const lastWorkedTimetable = lastWorkedTimetableId
        ? timetables.find((timetable) => timetable.id === lastWorkedTimetableId)
        : null;

    if (lastWorkedTimetable && lastWorkedTimetable.status !== "ARCHIVED") {
        return lastWorkedTimetable;
    }

    return getLatestActiveTimetable(timetables);
}

function buildLocalQuickActionSettings(
    autoEnabled: boolean,
    selectedActionIds: string[],
): QuickActionSettingsResponse {
    const selectedActions = autoEnabled
        ? fallbackQuickActions.slice(0, 10)
        : fallbackQuickActions.filter((action) => selectedActionIds.includes(action.id));

    return {
        autoEnabled,
        maxSelected: 10,
        selectedActions,
        availableActions: fallbackQuickActions,
    };
}

export default function HomePage() {
    const router = useRouter();
    const [timetables, setTimetables] = useState<TimetableResponse[]>([]);
    const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
    const [lessons, setLessons] = useState<LessonResponse[]>([]);
    const [loadingCurrent, setLoadingCurrent] = useState(true);
    const [currentError, setCurrentError] = useState("");
    const [quickActionSettings, setQuickActionSettings] =
        useState<QuickActionSettingsResponse>(getFallbackSettings);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [savingQuickActions, setSavingQuickActions] = useState(false);
    const [lastWorkedTimetableId, setLastWorkedTimetableId] = useState<number | null>(null);

    const currentTimetable = useMemo(() => {
        return getCurrentTimetable(timetables, lastWorkedTimetableId);
    }, [lastWorkedTimetableId, timetables]);

    const requiredLessons = useMemo(() => {
        if (currentTimetable?.totalRequiredLessonBlocks) {
            return currentTimetable.totalRequiredLessonBlocks;
        }

        if (currentTimetable?.totalRequiredLessons) {
            return currentTimetable.totalRequiredLessons;
        }

        return assignments.reduce((total, assignment) => {
            return total + (assignment.requiredLessonBlocksCount ?? assignment.requiredLessonsCount ?? 0);
        }, 0);
    }, [assignments, currentTimetable]);

    const placedLessons = lessons.length || currentTimetable?.totalLessonBlocks || currentTimetable?.totalLessons || 0;
    const unplacedLessons = Math.max(requiredLessons - placedLessons, 0);

    useEffect(() => {
        let mounted = true;

        async function loadCurrentTimetable() {
            try {
                setLoadingCurrent(true);
                setCurrentError("");

                const timetableData = await timetableApi.getAllTimetables();
                const storedLastWorkedTimetableId = getStoredLastWorkedTimetableId();
                const current = getCurrentTimetable(
                    timetableData,
                    storedLastWorkedTimetableId,
                );

                if (!mounted) return;

                setLastWorkedTimetableId(storedLastWorkedTimetableId);
                setTimetables(timetableData);

                if (!current) {
                    setAssignments([]);
                    setLessons([]);
                    return;
                }

                const [assignmentData, lessonData] = await Promise.all([
                    assignmentApi.getAssignmentsByTimetable(current.id),
                    lessonApi.getLessonsByTimetable(current.id),
                ]);

                if (!mounted) return;

                setAssignments(assignmentData);
                setLessons(lessonData);
            } catch {
                if (mounted) setCurrentError("Failed to load current timetable");
            } finally {
                if (mounted) setLoadingCurrent(false);
            }
        }

        void loadCurrentTimetable();

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        let mounted = true;

        async function loadQuickActions() {
            const storedSettings = getStoredQuickActionSettings();
            if (storedSettings) {
                setQuickActionSettings(
                    buildLocalQuickActionSettings(
                        storedSettings.autoEnabled,
                        storedSettings.selectedActionIds,
                    ),
                );
            }

            try {
                const settings = await quickActionApi.getSettings();
                if (mounted) setQuickActionSettings(settings);
            } catch {
                try {
                    const availableActions = await quickActionApi.getOptions();
                    if (!mounted) return;
                    setQuickActionSettings({
                        autoEnabled: true,
                        maxSelected: 10,
                        selectedActions: availableActions.slice(0, 10),
                        availableActions,
                    });
                } catch {
                    if (mounted && !storedSettings) {
                        setQuickActionSettings(getFallbackSettings());
                    }
                }
            }
        }

        void loadQuickActions();

        return () => {
            mounted = false;
        };
    }, []);

    const selectedActionIds = useMemo(() => {
        return quickActionSettings.selectedActions.map((action) => action.id);
    }, [quickActionSettings.selectedActions]);

    function getQuickActionHref(actionId: string) {
        switch (actionId) {
            case "ADD_ASSIGNMENT":
                return currentTimetable
                    ? `/timetables/${currentTimetable.id}/assignments?create=1`
                    : "/timetables";
            case "OPEN_ASSIGNMENTS":
                return currentTimetable
                    ? `/timetables/${currentTimetable.id}/assignments`
                    : "/timetables";
            case "NEW_TIMETABLE":
                return "/timetables?create=1";
            case "OPEN_TEACHERS":
                return "/teachers";
            case "ADD_TEACHER":
                return "/teachers?create=1";
            case "OPEN_ROOMS":
                return "/rooms";
            case "ADD_ROOM":
                return "/rooms?create=1";
            case "OPEN_SUBJECTS":
                return "/subjects";
            case "ADD_SUBJECT":
                return "/subjects?create=1";
            case "OPEN_GROUPS":
                return "/groups";
            case "ADD_GROUP":
                return "/groups?create=1";
            case "OPEN_FACULTIES":
                return "/faculties";
            case "ADD_FACULTY":
                return "/faculties?create=1";
            case "OPEN_DEPARTMENTS":
                return "/departments";
            case "ADD_DEPARTMENT":
                return "/departments?create=1";
            case "OPEN_MAJORS":
                return "/majors";
            case "ADD_MAJOR":
                return "/majors?create=1";
            default:
                return "/timetables";
        }
    }

    async function saveQuickActionSettings(autoEnabled: boolean, actionIds: string[]) {
        const previous = quickActionSettings;
        const selectedActions = autoEnabled
            ? previous.selectedActions
            : previous.availableActions.filter((action) => actionIds.includes(action.id));

        setQuickActionSettings({
            ...previous,
            autoEnabled,
            selectedActions,
        });

        window.localStorage.setItem(
            QUICK_ACTIONS_STORAGE_KEY,
            JSON.stringify({ autoEnabled, selectedActionIds: actionIds }),
        );

        try {
            setSavingQuickActions(true);
            const updated = await quickActionApi.updateSettings({
                autoEnabled,
                selectedActionIds: actionIds,
            });
            setQuickActionSettings(updated);
        } catch {
            setQuickActionSettings({
                ...previous,
                autoEnabled,
                selectedActions,
            });
        } finally {
            setSavingQuickActions(false);
        }
    }

    async function handleQuickAction(action: QuickActionOptionResponse) {
        router.push(getQuickActionHref(action.id));
        void quickActionApi.recordUsage(action.id)
            .then((updated) => {
                if (updated.autoEnabled) setQuickActionSettings(updated);
            })
            .catch(() => undefined);
    }

    function toggleQuickAction(actionId: string) {
        const exists = selectedActionIds.includes(actionId);
        const nextIds = exists
            ? selectedActionIds.filter((id) => id !== actionId)
            : [...selectedActionIds, actionId];

        if (!exists && nextIds.length > quickActionSettings.maxSelected) return;
        void saveQuickActionSettings(false, nextIds);
    }

    return (
        <AppShell>
            <PageHeader title="Dashboard" />

            <section className="mt-6 grid items-start gap-6 xl:grid-cols-[1.4fr_0.9fr]">
                <Card className="glass-card h-fit overflow-hidden">
                    <CardHeader className="pb-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                                <CardTitle>Current timetable</CardTitle>
                            </div>

                            <Button
                                onClick={() =>
                                    router.push(
                                        currentTimetable
                                            ? `/timetables/${currentTimetable.id}`
                                            : "/timetables",
                                    )
                                }
                                disabled={loadingCurrent}
                            >
                                {currentTimetable ? "Open timetable" : "Open timetables"}
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent>
                        {loadingCurrent ? (
                            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                                Loading current timetable...
                            </div>
                        ) : currentError ? (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
                                {currentError}
                            </div>
                        ) : currentTimetable ? (
                            <div className="space-y-6">
                                <div>
                                    <div className="text-3xl font-semibold tracking-normal text-foreground">
                                        {getDisplayTimetableName(currentTimetable.name)}
                                    </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                    <div className="rounded-lg border border-border bg-card px-4 py-3">
                                        <div className="text-xs font-medium uppercase text-muted-foreground">
                                            Status
                                        </div>
                                        <div className="mt-1 text-lg font-semibold">
                                            {formatStatus(currentTimetable.status)}
                                        </div>
                                    </div>
                                    <div className="rounded-lg border border-border bg-card px-4 py-3">
                                        <div className="text-xs font-medium uppercase text-muted-foreground">
                                            Assignments
                                        </div>
                                        <div className="mt-1 text-lg font-semibold">
                                            {assignments.length}
                                        </div>
                                    </div>
                                    <div className="rounded-lg border border-border bg-card px-4 py-3">
                                        <div className="text-xs font-medium uppercase text-muted-foreground">
                                            Placed lessons
                                        </div>
                                        <div className="mt-1 text-lg font-semibold">
                                            {placedLessons}
                                        </div>
                                    </div>
                                    <div className="rounded-lg border border-border bg-card px-4 py-3">
                                        <div className="text-xs font-medium uppercase text-muted-foreground">
                                            Unplaced
                                        </div>
                                        <div className="mt-1 text-lg font-semibold">
                                            {unplacedLessons}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed border-border p-6">
                                <div className="text-lg font-semibold">
                                    No current timetable
                                </div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                    Create a timetable version before adding assignments.
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="glass-card h-[440px] overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between gap-3 pb-4">
                        <CardTitle>Quick actions</CardTitle>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setSettingsOpen(true)}
                            title="Settings"
                            aria-label="Quick actions settings"
                        >
                            <Settings className="h-4 w-4" />
                        </Button>
                    </CardHeader>

                    <CardContent className="custom-scrollbar h-[calc(440px-80px)] overflow-y-auto pr-3">
                        <div className="space-y-3">
                            {quickActionSettings.selectedActions.map((action) => {
                                const Icon = quickActionIcons[action.id] ?? ArrowRight;

                                return (
                                    <button
                                        key={action.id}
                                        onClick={() => void handleQuickAction(action)}
                                        className="group flex min-h-16 w-full items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                                    >
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
                                            <Icon className="h-5 w-5" />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-base font-medium text-foreground">
                                                {action.label}
                                            </div>
                                        </div>

                                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                                    </button>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </section>

            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Quick actions settings</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <label className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background px-4 py-3">
                            <span className="font-medium">Auto</span>
                            <input
                                type="checkbox"
                                checked={quickActionSettings.autoEnabled}
                                disabled={savingQuickActions}
                                onChange={(event) =>
                                    void saveQuickActionSettings(
                                        event.target.checked,
                                        selectedActionIds,
                                    )
                                }
                                className="h-5 w-5 accent-blue-600"
                            />
                        </label>

                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">Actions</span>
                            <span className="text-muted-foreground">
                                {selectedActionIds.length}/{quickActionSettings.maxSelected}
                            </span>
                        </div>

                        <div className="custom-scrollbar max-h-[380px] space-y-2 overflow-y-auto pr-1">
                            {quickActionSettings.availableActions.map((action) => {
                                const checked = selectedActionIds.includes(action.id);
                                const disabled =
                                    quickActionSettings.autoEnabled ||
                                    savingQuickActions ||
                                    (!checked &&
                                        selectedActionIds.length >=
                                            quickActionSettings.maxSelected);

                                return (
                                    <label
                                        key={action.id}
                                        className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition hover:border-primary/30"
                                    >
                                        <span className="flex h-5 w-5 items-center justify-center rounded border border-border bg-background">
                                            {checked && <Check className="h-3.5 w-3.5 text-blue-700" />}
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={disabled}
                                            onChange={() => toggleQuickAction(action.id)}
                                            className="sr-only"
                                        />
                                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                            {action.label}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button onClick={() => setSettingsOpen(false)}>Done</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppShell>
    );
}
