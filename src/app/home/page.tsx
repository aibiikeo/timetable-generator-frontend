"use client";

import { useRouter } from "next/navigation";
import {
    ArrowRight,
    CalendarDays,
    ClipboardList,
    Download,
    FileSpreadsheet,
    Play,
    Plus,
    Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
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

const workflowSteps = [
    {
        title: "Assignments",
        description: "Check teaching load before generation",
        href: "/timetables",
        icon: ClipboardList,
        color: "border-blue-100 bg-blue-50 text-blue-700",
    },
    {
        title: "Generate",
        description: "Build a timetable from current data",
        href: "/timetables",
        icon: Play,
        color: "border-emerald-100 bg-emerald-50 text-emerald-700",
    },
    {
        title: "Review grid",
        description: "Open the generated timetable view",
        href: "/timetables",
        icon: FileSpreadsheet,
        color: "border-violet-100 bg-violet-50 text-violet-700",
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
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                                <CardTitle>Schedule workspace</CardTitle>
                                <CardDescription>
                                    Start with assignments, generate the timetable, then review
                                    the grid before export.
                                </CardDescription>
                            </div>

                            <Button onClick={() => router.push("/timetables")}>
                                Open timetables
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                            {workflowSteps.map((step) => {
                                const Icon = step.icon;

                                return (
                                    <button
                                        key={step.title}
                                        onClick={() => router.push(step.href)}
                                        className="group rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                                    >
                                        <div
                                            className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border ${step.color}`}
                                        >
                                            <Icon className="h-5 w-5" />
                                        </div>

                                        <div className="flex items-center justify-between gap-3">
                                            <div className="font-medium text-foreground">
                                                {step.title}
                                            </div>
                                            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                                        </div>

                                        <div className="mt-2 text-sm leading-6 text-muted-foreground">
                                            {step.description}
                                        </div>
                                    </button>
                                );
                            })}
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
        </AppShell>
    );
}
