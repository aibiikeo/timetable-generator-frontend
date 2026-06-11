"use client";

import {
    Archive,
    BookOpen,
    CalendarClock,
    CalendarDays,
    CalendarPlus,
    CheckCircle2,
    DoorOpen,
    Download,
    Eye,
    FileDown,
    Filter,
    Grip,
    ListChecks,
    MapPin,
    MousePointer2,
    Pencil,
    Plus,
    RotateCcw,
    Search,
    Send,
    Sparkles,
    Square,
    Trash2,
    Utensils,
    WandSparkles,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

const workflow = [
    {
        title: "Academic structure",
        description: "Faculties -> Departments -> Majors -> Groups. This chain lets assignments and generation connect subjects to the correct students.",
    },
    {
        title: "Resources",
        description: "Teachers, Subjects, Rooms, and time slots define what the generator is allowed to use.",
    },
    {
        title: "Timetable",
        description: "Create a timetable for the semester, open it with Eye, then fill its assignments.",
    },
    {
        title: "Generate, fix, publish",
        description: "Run generation, review partial or unplaced assignments, adjust the grid manually, then publish or export.",
    },
];

const sections = [
    {
        title: "Data Pages",
        icon: BookOpen,
        summary: "Faculties, Departments, Majors, Groups, Teachers, Subjects, and Rooms use the same pattern: table, filters, row selection, create forms, and edit forms.",
        items: [
            {
                label: "New",
                icon: Plus,
                text: "Creates a record. For linked data, choose the correct parent: a department belongs to a faculty, a major belongs to a department, and groups or subjects belong to a major.",
            },
            {
                label: "Search + filters",
                icon: Search,
                text: "The top search works inside the current page. Dropdown filters narrow the list by faculty, department, major, room type, or status.",
            },
            {
                label: "Select rows",
                icon: ListChecks,
                text: "Use the checkbox column for bulk delete. After deletion, the list reloads so stale selected ids do not remain active.",
            },
            {
                label: "Edit",
                icon: Pencil,
                text: "Updates a record without recreating its linked data. If the backend reports a duplicate name or code, the form shows the error.",
            },
            {
                label: "Delete modes",
                icon: Trash2,
                text: "Simple delete only removes records with no dependencies. Detach dependencies keeps related records but unlinks them. Delete with dependencies removes the record and the dependent data, so use it deliberately.",
            },
        ],
    },
    {
        title: "Timetables",
        icon: CalendarDays,
        summary: "The Timetables page manages timetable versions. A version can be draft, published, or archived.",
        items: [
            {
                label: "New timetable",
                icon: Plus,
                text: "Creates a timetable container. After creating it, open it with Eye to work with assignments, lessons, and the timetable grid.",
            },
            {
                label: "Eye",
                icon: Eye,
                text: "Opens the detail page for a specific timetable. Generation, manual fixes, and grid editing happen there.",
            },
            {
                label: "Archive",
                icon: Archive,
                text: "Marks a timetable as archived. Use this for older versions that should stay in history but not be treated as active.",
            },
            {
                label: "Delete",
                icon: Trash2,
                text: "Deletes a timetable. If it has lessons, assignments, or lunch blocks, review the dependency list in the dialog before confirming.",
            },
        ],
    },
    {
        title: "Assignments",
        icon: ListChecks,
        summary: "An assignment answers: which subject, which teacher, which groups, how many weekly hours, which room type, and which shift.",
        items: [
            {
                label: "Assignments panel",
                icon: ListChecks,
                text: "On the timetable page, this panel shows total, scheduled, partial, and unplaced assignments plus the number of placed lessons. It is the main diagnosis view after generation.",
            },
            {
                label: "Manual splitting",
                icon: Grip,
                text: "You can set a manual hour split such as 2+2+2. The sum must match weekly hours, and supported lesson blocks are 2, 3, or 4 hours.",
            },
            {
                label: "Status filters",
                icon: Filter,
                text: "Scheduled, Partial, and Unplaced filters help you find problematic assignments quickly. Retry failed appears when you are reviewing Partial or Unplaced items.",
            },
            {
                label: "MapPin",
                icon: MapPin,
                text: "Opens Manual Placement for an assignment that was not fully scheduled by the generator.",
            },
        ],
    },
    {
        title: "Generation",
        icon: WandSparkles,
        summary: "The generator places lessons across time slots, rooms, groups, teacher availability, and conflict rules.",
        items: [
            {
                label: "Full generation",
                icon: Sparkles,
                text: "Builds the timetable as a fresh run. Use it after changing core data or assignments.",
            },
            {
                label: "Partial generation",
                icon: CalendarPlus,
                text: "Adds or completes scheduling while trying to preserve already placed lessons. Use it after focused changes.",
            },
            {
                label: "Stop",
                icon: Square,
                text: "Stops the current generation or retry. Results that were already saved may remain in their current state.",
            },
            {
                label: "Retry failed",
                icon: RotateCcw,
                text: "Runs generation only for failed, partial, or unplaced assignments. It uses the current splitting and keeps already placed lessons.",
            },
        ],
    },
    {
        title: "Timetable grid",
        icon: CalendarClock,
        summary: "The timetable grid is not only for viewing. It supports manual editing, and several actions appear on hover.",
        items: [
            {
                label: "Drag and drop",
                icon: MousePointer2,
                text: "You can drag a lesson card to another free slot in the same group row. Green highlight means the target is valid, red means there is a conflict, and greyed cells belong to another group.",
            },
            {
                label: "Lesson card",
                icon: BookOpen,
                text: "Click opens details. Double-click opens edit. On hover, Pencil and Trash appear for editing or deleting the lesson.",
            },
            {
                label: "Empty cell actions",
                icon: Plus,
                text: "Hover an empty cell: CalendarPlus creates a lesson in that slot, and Utensils adds a lunch block.",
            },
            {
                label: "Time slot header",
                icon: CalendarClock,
                text: "Double-click a time header to edit the time slot. This is easy to miss, but it is faster than looking for a separate page.",
            },
            {
                label: "Zoom",
                icon: Grip,
                text: "Use Ctrl or Command + mouse wheel to zoom the grid. The zoom anchors around the cursor, which helps when reviewing dense schedules.",
            },
        ],
    },
    {
        title: "Manual placement",
        icon: MapPin,
        summary: "Manual placement is used when the generator cannot find a slot, or when you want to place a specific lesson yourself.",
        items: [
            {
                label: "Suggested slots",
                icon: CheckCircle2,
                text: "The modal loads free options for several durations. Clicking a suggestion fills day, start time, duration, and room.",
            },
            {
                label: "Place",
                icon: Send,
                text: "Checks conflicts on the backend and creates the lesson. If teacher, room, group, or time conflicts exist, an error toast appears.",
            },
            {
                label: "Room choice",
                icon: DoorOpen,
                text: "Room options show name, type, and capacity. For a computer lab or large group, choose a room that matches the assignment requirements.",
            },
        ],
    },
    {
        title: "Publish and export",
        icon: FileDown,
        summary: "After reviewing the timetable, you can publish it for the public view or export it to a file.",
        items: [
            {
                label: "Publish",
                icon: Send,
                text: "Marks the timetable as published. The public timetable and the Lessons page usually use the published version.",
            },
            {
                label: "Archive",
                icon: Archive,
                text: "Removes the timetable from active use while keeping it as a historical version.",
            },
            {
                label: "Export PDF",
                icon: Download,
                text: "Creates a printable version of the current view, respecting selected filters and day. Use it for sharing or printing.",
            },
            {
                label: "Export Excel",
                icon: FileDown,
                text: "Creates a workbook with sheets for groups or sections. Colors help separate subjects and teachers.",
            },
        ],
    },
];

export default function GuidePage() {
    return (
        <AppShell>
            <PageHeader
                title="Guide"
                description="A practical tutorial for creating, generating, manually adjusting, publishing, and exporting a timetable."
            />

            <div className="space-y-6">
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {workflow.map((step, index) => (
                        <Card key={step.title} className="glass-card">
                            <CardHeader className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Badge variant="outline">Step {index + 1}</Badge>
                                    <CheckCircle2 className="h-5 w-5 text-blue-700" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">{step.title}</CardTitle>
                                    <CardDescription className="mt-2 leading-6">
                                        {step.description}
                                    </CardDescription>
                                </div>
                            </CardHeader>
                        </Card>
                    ))}
                </section>

                <section className="grid gap-4 xl:grid-cols-2">
                    {sections.map((section) => {
                        const SectionIcon = section.icon;

                        return (
                            <Card key={section.title} className="glass-card">
                                <CardHeader>
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
                                            <SectionIcon className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <CardTitle className="text-lg">{section.title}</CardTitle>
                                            <CardDescription className="mt-1 leading-6">
                                                {section.summary}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="divide-y divide-border rounded-xl border border-border bg-background/70">
                                        {section.items.map((item) => {
                                            const ItemIcon = item.icon;

                                            return (
                                                <div key={item.label} className="grid gap-3 p-4 sm:grid-cols-[180px_1fr]">
                                                    <div className="flex items-center gap-2 font-medium text-foreground">
                                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                                                            <ItemIcon className="h-4 w-4" />
                                                        </span>
                                                        <span>{item.label}</span>
                                                    </div>
                                                    <p className="text-sm leading-6 text-muted-foreground">
                                                        {item.text}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </section>

            </div>
        </AppShell>
    );
}
