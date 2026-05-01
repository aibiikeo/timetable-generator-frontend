"use client";

import { useState } from "react";
import { CalendarClock, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
    DayOfWeek,
    RoomResponse,
} from "@/lib/types";

interface ManualPlacementModalProps {
    assignmentId: number;
    rooms: RoomResponse[];
    onClose: () => void;
    onPlace: (data: {
        dayOfWeek: DayOfWeek;
        startTime: string;
        durationHours: number;
        roomId: number;
    }) => void | Promise<void>;
}

const DAYS: DayOfWeek[] = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
];

export default function ManualPlacementModal({
                                                 assignmentId,
                                                 rooms,
                                                 onClose,
                                                 onPlace,
                                             }: ManualPlacementModalProps) {
    const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>("MONDAY");
    const [startTime, setStartTime] = useState("09:00");
    const [durationHours, setDurationHours] = useState<number | string>(2);
    const [roomId, setRoomId] = useState<number>(rooms[0]?.id ?? 0);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!dayOfWeek) {
            setError("Please select day");
            return;
        }

        if (!startTime) {
            setError("Start time is required");
            return;
        }

        if (Number(durationHours) < 1) {
            setError("Duration must be at least 1 hour");
            return;
        }

        if (!roomId) {
            setError("Please select a room");
            return;
        }

        try {
            setSaving(true);
            setError("");

            await onPlace({
                dayOfWeek,
                startTime,
                durationHours: Number(durationHours),
                roomId,
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="glass-card w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <CalendarClock className="h-5 w-5" />
                        </div>

                        <h3 className="text-lg font-semibold">
                            Manual Placement
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Place assignment #{assignmentId} into a specific day, time and room.
                        </p>
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        disabled={saving}
                        aria-label="Close modal"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Day
                        </label>

                        <select
                            value={dayOfWeek}
                            onChange={(e) =>
                                setDayOfWeek(e.target.value as DayOfWeek)
                            }
                            className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            required
                        >
                            {DAYS.map((day) => (
                                <option key={day} value={day}>
                                    {day}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Start time
                            </label>

                            <Input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Duration hours
                            </label>

                            <Input
                                type="number"
                                min={1}
                                value={durationHours}
                                onChange={(e) =>
                                    setDurationHours(
                                        e.target.value === ""
                                            ? ""
                                            : Number(e.target.value),
                                    )
                                }
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Room
                        </label>

                        <select
                            value={roomId}
                            onChange={(e) => setRoomId(Number(e.target.value))}
                            className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            required
                        >
                            <option value={0}>Select room</option>

                            {rooms.map((room) => (
                                <option key={room.id} value={room.id}>
                                    {room.name} — {room.type}, {room.capacity} seats
                                </option>
                            ))}
                        </select>
                    </div>

                    {error && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Cancel
                        </Button>

                        <Button type="submit" disabled={saving}>
                            {saving ? "Placing..." : "Place lesson"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}