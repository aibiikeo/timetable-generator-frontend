"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { timetableApi } from "@/lib/timetableApi";
import type {
    DayOfWeek,
    ManualPlacementSuggestionResponse,
    RoomResponse,
} from "@/lib/types";

interface ManualPlacementModalProps {
    timetableId: number;
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
                                                 timetableId,
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
    const [suggestions, setSuggestions] = useState<ManualPlacementSuggestionResponse[]>([]);
    const [suggestionsError, setSuggestionsError] = useState("");
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);

    useEffect(() => {
        if (!assignmentId) {
            setSuggestions([]);
            return;
        }

        let cancelled = false;

        const loadSuggestions = async () => {
            setSuggestionsLoading(true);
            setSuggestionsError("");

            try {
                const selectedDuration = Number(durationHours);
                const normalizedDuration =
                    Number.isNaN(selectedDuration) || selectedDuration < 1
                        ? 2
                        : selectedDuration;
                const durations = [1, 2, 3, 4];

                if (!durations.includes(normalizedDuration)) {
                    durations.push(normalizedDuration);
                }

                const results = await Promise.all(
                    durations.map((duration) =>
                        timetableApi.suggestManualPlacements(
                            timetableId,
                            assignmentId,
                            duration,
                            6,
                        ),
                    ),
                );

                const items = results
                    .flat()
                    .sort(
                        (first, second) =>
                            first.score - second.score ||
                            second.durationHours - first.durationHours ||
                            first.dayOfWeek.localeCompare(second.dayOfWeek) ||
                            first.startTime.localeCompare(second.startTime) ||
                            first.roomId - second.roomId,
                    )
                    .slice(0, 12);

                if (!cancelled) {
                    setSuggestions(items);
                }
            } catch {
                if (!cancelled) {
                    setSuggestions([]);
                    setSuggestionsError("Could not load suggestions. Restart backend and try again.");
                }
            } finally {
                if (!cancelled) {
                    setSuggestionsLoading(false);
                }
            }
        };

        void loadSuggestions();

        return () => {
            cancelled = true;
        };
    }, [assignmentId, durationHours, timetableId]);

    const applySuggestion = (suggestion: ManualPlacementSuggestionResponse) => {
        setDayOfWeek(suggestion.dayOfWeek);
        setStartTime(formatTimeForInput(suggestion.startTime));
        setDurationHours(suggestion.durationHours);
        setRoomId(suggestion.roomId);
        setError("");
    };

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
        <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
            <DialogContent className="flex max-h-[calc(100vh-2rem)] max-w-lg flex-col overflow-hidden">
                <DialogHeader>
                    <div>
                        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <CalendarClock className="h-5 w-5" />
                        </div>

                        <DialogTitle>Manual Placement</DialogTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Assignment #{assignmentId}
                        </p>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="min-h-0 flex-1 space-y-4 overflow-hidden">
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
                                        {room.name} - {room.type}, {room.capacity} seats
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium">Suggested slots</p>
                                {suggestionsLoading && (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                )}
                            </div>

                            {suggestions.length > 0 ? (
                                <div className="custom-scrollbar grid max-h-56 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                                    {suggestions.map((suggestion) => (
                                        <button
                                            key={`${suggestion.dayOfWeek}-${suggestion.startTime}-${suggestion.roomId}`}
                                            type="button"
                                            onClick={() => applySuggestion(suggestion)}
                                            className="rounded-lg border border-border bg-card px-3 py-2 text-left text-sm shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                                        >
                                            <span className="block font-medium">
                                                {suggestion.dayOfWeek} {formatTimeForDisplay(suggestion.startTime)}
                                            </span>
                                            <span className="block text-xs font-medium text-blue-700">
                                                {suggestion.durationHours}h
                                            </span>
                                            <span className="block truncate text-muted-foreground">
                                                {suggestion.roomName} - {suggestion.roomType}, {suggestion.roomCapacity} seats
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                !suggestionsLoading && (
                                    <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
                                        {suggestionsError || "No conflict-free slots found."}
                                    </p>
                                )
                            )}
                        </div>

                        {error && (
                            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="mt-4 shrink-0 border-t border-border pt-4">
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
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function formatTimeForInput(value: string) {
    return value.slice(0, 5);
}

function formatTimeForDisplay(value: string) {
    return value.slice(0, 5);
}
