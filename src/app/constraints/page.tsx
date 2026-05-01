"use client";

import {
    Clock,
    DoorOpen,
    GraduationCap,
    ShieldCheck,
    Users,
    Utensils,
    UserCheck,
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

const constraints = [
    {
        title: "Teacher conflict",
        description: "A teacher cannot teach two lessons at the same time.",
        icon: UserCheck,
        badge: "Hard rule",
        color: "bg-blue-50 text-blue-700 border-blue-100",
    },
    {
        title: "Group conflict",
        description: "A student group cannot have overlapping lessons.",
        icon: Users,
        badge: "Hard rule",
        color: "bg-violet-50 text-violet-700 border-violet-100",
    },
    {
        title: "Room capacity",
        description: "The selected room should fit the assigned group.",
        icon: DoorOpen,
        badge: "Hard rule",
        color: "bg-amber-50 text-amber-700 border-amber-100",
    },
    {
        title: "Room type",
        description: "Labs, lecture rooms and regular rooms should match lesson needs.",
        icon: GraduationCap,
        badge: "Hard rule",
        color: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
    {
        title: "Time availability",
        description: "Lessons should be placed only into available time slots.",
        icon: Clock,
        badge: "Rule",
        color: "bg-sky-50 text-sky-700 border-sky-100",
    },
    {
        title: "Lunch break",
        description: "The timetable should respect lunch blocks when they are configured.",
        icon: Utensils,
        badge: "Rule",
        color: "bg-rose-50 text-rose-700 border-rose-100",
    },
];

export default function ConstraintsPage() {
    return (
        <AppShell>
            <PageHeader
                eyebrow="Scheduling"
                title="Constraints"
                description="Rules used to check and generate class schedules."
            />

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {constraints.map((constraint) => {
                    const Icon = constraint.icon;

                    return (
                        <Card key={constraint.title} className="glass-card">
                            <CardHeader>
                                <div className="mb-4 flex items-center justify-between">
                                    <div
                                        className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${constraint.color}`}
                                    >
                                        <Icon className="h-5 w-5" />
                                    </div>

                                    <Badge variant="secondary">{constraint.badge}</Badge>
                                </div>

                                <CardTitle>{constraint.title}</CardTitle>
                                <CardDescription>{constraint.description}</CardDescription>
                            </CardHeader>
                        </Card>
                    );
                })}
            </section>

            <Card className="glass-card mt-6">
                <CardHeader>
                    <div className="flex items-start gap-3">
                        <div className="rounded-2xl border border-green-100 bg-green-50 p-2 text-green-700">
                            <ShieldCheck className="h-5 w-5" />
                        </div>

                        <div>
                            <CardTitle>During generation</CardTitle>
                            <CardDescription>
                                If the system cannot place a lesson, it should be shown in the review list
                                with the reason. The methodist can then adjust data or place it manually.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="grid gap-3 md:grid-cols-3">
                        {["Generated lessons", "Unplaced lessons", "Manual corrections"].map(
                            (item) => (
                                <div
                                    key={item}
                                    className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium"
                                >
                                    {item}
                                </div>
                            ),
                        )}
                    </div>
                </CardContent>
            </Card>
        </AppShell>
    );
}