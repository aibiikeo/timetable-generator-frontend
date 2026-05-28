"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { DayOfWeek, LunchRequest, LunchResponse, StudyGroupResponse } from "@/lib/types";
import { DAYS_OF_WEEK, DAYS_SHORT } from "@/lib/constants";

interface LunchSettingsPanelProps {
    timetableId: number;
    lunches: LunchResponse[];
    groups: StudyGroupResponse[];
    saving?: boolean;
    onCreate: (data: LunchRequest) => void | Promise<void>;
    onDelete: (lunch: LunchResponse) => void | Promise<void>;
}

const DAYS = DAYS_OF_WEEK.filter((day) => day !== "SUNDAY");

function formatTime(time: string) {
    return time.substring(0, 5);
}

export default function LunchSettingsPanel({
                                               timetableId,
                                               lunches,
                                               groups,
                                               saving = false,
                                               onCreate,
                                               onDelete,
                                           }: LunchSettingsPanelProps) {
    const [groupId, setGroupId] = useState(0);
    const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>("MONDAY");
    const [startTime, setStartTime] = useState("12:30");
    const [endTime, setEndTime] = useState("13:10");
    const [error, setError] = useState("");

    useEffect(() => {
        if (groups.length > 0 && groupId === 0) {
            setGroupId(groups[0].id);
        }
    }, [groupId, groups]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!groupId) {
            setError("Select group");
            return;
        }

        if (startTime >= endTime) {
            setError("End time must be after start time");
            return;
        }

        setError("");
        await onCreate({
            timetableId,
            groupId,
            dayOfWeek,
            startTime,
            endTime,
            manual: true,
        });
    };

    const groupName = (id: number) => groups.find((group) => group.id === id)?.name ?? `Group #${id}`;

    return (
        <Card className="glass-card mt-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    Lunch settings
                </CardTitle>
            </CardHeader>

            <CardContent className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-border bg-card p-4">
                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="mb-2 block text-sm font-medium">Group</label>
                        <select
                            value={groupId}
                            onChange={(event) => setGroupId(Number(event.target.value))}
                            className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                            disabled={saving || groups.length === 0}
                        >
                            {groups.map((group) => (
                                <option key={group.id} value={group.id}>{group.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">Day</label>
                        <select
                            value={dayOfWeek}
                            onChange={(event) => setDayOfWeek(event.target.value as DayOfWeek)}
                            className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                            disabled={saving}
                        >
                            {DAYS.map((day) => (
                                <option key={day} value={day}>{DAYS_SHORT[day] ?? day}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium">Start</label>
                            <Input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} disabled={saving} />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium">End</label>
                            <Input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} disabled={saving} />
                        </div>
                    </div>

                    <Button type="submit" disabled={saving || groups.length === 0}>
                        <Plus className="h-4 w-4" />
                        Add lunch block
                    </Button>
                </form>

                <div className="custom-scrollbar max-h-72 space-y-3 overflow-y-auto pr-2">
                    {lunches.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                            No lunch blocks yet.
                        </div>
                    ) : (
                        lunches.map((lunch) => (
                            <div key={lunch.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
                                <div>
                                    <div className="font-medium">{groupName(lunch.groupId)}</div>
                                    <div className="mt-1 text-sm text-muted-foreground">
                                        {DAYS_SHORT[lunch.dayOfWeek] ?? lunch.dayOfWeek} - {formatTime(lunch.startTime)}-{formatTime(lunch.endTime)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary">Lunch</Badge>
                                    <Button variant="ghost" size="icon-sm" onClick={() => onDelete(lunch)} disabled={saving} aria-label="Delete lunch block">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
