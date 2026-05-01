"use client";

import { useRouter } from "next/navigation";
import {
    AlertTriangle,
    ArrowRight,
    CalendarDays,
    CheckCircle2,
    ClipboardList,
    Download,
    FileSpreadsheet,
    Play,
    Plus,
    Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

const quickActions = [
    {
        title: "Open timetables",
        description: "View and manage schedules",
        href: "/timetables",
        icon: CalendarDays,
    },
    {
        title: "New timetable",
        description: "Create schedule period",
        href: "/timetables",
        icon: Plus,
    },
    {
        title: "Add assignment",
        description: "Add teaching load",
        href: "/timetables",
        icon: ClipboardList,
    },
    {
        title: "Generate",
        description: "Run scheduling",
        href: "/timetables",
        icon: Sparkles,
    },
];

const reviewItems = [
    {
        title: "Unplaced lessons",
        value: "—",
        description: "Lessons that were not placed after generation",
        icon: AlertTriangle,
        badge: "Check",
        color: "border-amber-200 bg-amber-50/80 text-amber-800",
    },
    {
        title: "Conflicts",
        value: "—",
        description: "Teacher, group, room or time conflicts",
        icon: AlertTriangle,
        badge: "Review",
        color: "border-red-200 bg-red-50/80 text-red-800",
    },
    {
        title: "Missing data",
        value: "—",
        description: "Assignments, rooms or time slots that need completion",
        icon: ClipboardList,
        badge: "Data",
        color: "border-blue-200 bg-blue-50/80 text-blue-800",
    },
];

export default function HomePage() {
    const router = useRouter();

    return (
        <AppShell>
            <PageHeader title="Dashboard" />

            <section className="mt-6 grid items-start gap-6 xl:grid-cols-[1.4fr_0.9fr]">
                <Card className="glass-card h-fit overflow-hidden">
                    <CardHeader className="pb-4">
                        <CardTitle>Current timetable</CardTitle>
                    </CardHeader>

                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="rounded-2xl border border-border bg-card p-5">
                                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
                                    <ClipboardList className="h-5 w-5" />
                                </div>

                                <div className="text-2xl font-bold">—</div>

                                <div className="mt-1 text-sm text-muted-foreground">
                                    Assignments
                                </div>
                            </div>

                            <div className="rounded-2xl border border-border bg-card p-5">
                                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>

                                <div className="text-2xl font-bold">—</div>

                                <div className="mt-1 text-sm text-muted-foreground">
                                    Placed lessons
                                </div>
                            </div>

                            <div className="rounded-2xl border border-border bg-card p-5">
                                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50 text-amber-700">
                                    <AlertTriangle className="h-5 w-5" />
                                </div>

                                <div className="text-2xl font-bold">—</div>

                                <div className="mt-1 text-sm text-muted-foreground">
                                    Needs review
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                onClick={() => router.push("/timetables")}
                            >
                                <ClipboardList className="h-4 w-4" />
                                Assignments
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => router.push("/timetables")}
                            >
                                <Play className="h-4 w-4" />
                                Generate
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => router.push("/timetables")}
                            >
                                <FileSpreadsheet className="h-4 w-4" />
                                Review grid
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => router.push("/timetables")}
                            >
                                <Download className="h-4 w-4" />
                                Export
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-card h-[440px] overflow-hidden">
                    <CardHeader className="pb-4">
                        <CardTitle>Quick actions</CardTitle>
                    </CardHeader>

                    <CardContent className="custom-scrollbar h-[calc(440px-80px)] overflow-y-auto pr-3">
                        <div className="space-y-3">
                            {quickActions.map((action) => {
                                const Icon = action.icon;

                                return (
                                    <button
                                        key={action.title}
                                        onClick={() => router.push(action.href)}
                                        className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                                    >
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
                                            <Icon className="h-5 w-5" />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="font-medium text-foreground">
                                                {action.title}
                                            </div>
                                            <div className="mt-1 text-xs text-muted-foreground">
                                                {action.description}
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

            <section className="mt-6">
                <Card className="glass-card">
                    <CardHeader>
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div>
                                <CardTitle>Needs review</CardTitle>
                                <CardDescription>
                                    Items that may require attention after generation.
                                </CardDescription>
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push("/timetables")}
                            >
                                Open review
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                            {reviewItems.map((item) => {
                                const Icon = item.icon;

                                return (
                                    <div
                                        key={item.title}
                                        className="rounded-2xl border border-border bg-card p-5"
                                    >
                                        <div className="mb-4 flex items-start justify-between gap-3">
                                            <div
                                                className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${item.color}`}
                                            >
                                                <Icon className="h-5 w-5" />
                                            </div>

                                            <Badge variant="secondary">{item.badge}</Badge>
                                        </div>

                                        <div className="text-2xl font-bold">
                                            {item.value}
                                        </div>

                                        <div className="mt-1 font-medium text-foreground">
                                            {item.title}
                                        </div>

                                        <div className="mt-2 text-sm leading-6 text-muted-foreground">
                                            {item.description}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </section>
        </AppShell>
    );
}