"use client";

import {
    BookOpen,
    Building2,
    CalendarDays,
    CheckCircle2,
    Download,
    DoorOpen,
    Presentation,
    Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

const steps = [
    {
        title: "Prepare academic structure",
        description: "Add faculties, departments, majors and student groups.",
        icon: Building2,
    },
    {
        title: "Add teaching resources",
        description: "Fill teachers, subjects, rooms and time slots.",
        icon: Presentation,
    },
    {
        title: "Create timetable",
        description: "Create a timetable for the required semester.",
        icon: CalendarDays,
    },
    {
        title: "Add assignments",
        description: "Specify which subject should be taught to which group.",
        icon: BookOpen,
    },
    {
        title: "Generate schedule",
        description: "Run automatic generation and wait for the result.",
        icon: Sparkles,
    },
    {
        title: "Review result",
        description: "Check generated lessons, conflicts and unplaced lessons.",
        icon: CheckCircle2,
    },
    {
        title: "Adjust rooms or lessons",
        description: "Fix missing data or place lessons manually if needed.",
        icon: DoorOpen,
    },
    {
        title: "Export",
        description: "Export the final timetable for sharing or printing.",
        icon: Download,
    },
];

export default function WorkflowPage() {
    return (
        <AppShell>
            <PageHeader
                title="Guide"
                description="Recommended order for creating and reviewing a timetable."
            />

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {steps.map((step, index) => {
                    const Icon = step.icon;

                    return (
                        <Card key={step.title} className="glass-card">
                            <CardHeader>
                                <div className="mb-4 flex items-center justify-between">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
                                        <Icon className="h-5 w-5" />
                                    </div>

                                    <Badge variant="outline">{index + 1}</Badge>
                                </div>

                                <CardTitle className="text-base">{step.title}</CardTitle>
                                <CardDescription>{step.description}</CardDescription>
                            </CardHeader>
                        </Card>
                    );
                })}
            </section>
        </AppShell>
    );
}