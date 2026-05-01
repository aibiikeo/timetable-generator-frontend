"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
    DayOfWeek,
    TimeSlot,
} from "@/lib/types";

export interface TimeException {
    dayOfWeek: DayOfWeek;
    timeSlotId: number;
}

interface ExceptionsPickerProps {
    value: TimeException[];
    timeSlots: TimeSlot[];
    onChange: (value: TimeException[]) => void;
}

const DAYS: DayOfWeek[] = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
];

function formatTime(time: string) {
    return time.substring(0, 5);
}

export default function ExceptionsPicker({
                                             value,
                                             timeSlots,
                                             onChange,
                                         }: ExceptionsPickerProps) {
    const sortedSlots = [...timeSlots].sort((a, b) => {
        const orderA = (a as unknown as { order?: number }).order ?? 0;
        const orderB = (b as unknown as { order?: number }).order ?? 0;

        if (orderA !== orderB) return orderA - orderB;

        return formatTime(a.startTime).localeCompare(formatTime(b.startTime));
    });

    const handleAdd = () => {
        if (sortedSlots.length === 0) return;

        onChange([
            ...value,
            {
                dayOfWeek: "MONDAY",
                timeSlotId: sortedSlots[0].id,
            },
        ]);
    };

    const handleUpdate = (
        index: number,
        field: keyof TimeException,
        nextValue: string,
    ) => {
        onChange(
            value.map((item, itemIndex) =>
                itemIndex === index
                    ? {
                        ...item,
                        [field]:
                            field === "timeSlotId"
                                ? Number(nextValue)
                                : nextValue,
                    }
                    : item,
            ),
        );
    };

    const handleRemove = (index: number) => {
        onChange(value.filter((_, itemIndex) => itemIndex !== index));
    };

    return (
        <div className="rounded-2xl border border-border p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <h4 className="text-sm font-semibold">
                        Time exceptions
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Mark time slots where this assignment should not be placed.
                    </p>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAdd}
                    disabled={sortedSlots.length === 0}
                >
                    <Plus className="h-4 w-4" />
                    Add
                </Button>
            </div>

            {value.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card/70 p-4 text-sm text-muted-foreground">
                    No exceptions selected.
                </div>
            ) : (
                <div className="space-y-2">
                    {value.map((item, index) => (
                        <div
                            key={`${item.dayOfWeek}-${item.timeSlotId}-${index}`}
                            className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_1fr_auto]"
                        >
                            <select
                                value={item.dayOfWeek}
                                onChange={(e) =>
                                    handleUpdate(
                                        index,
                                        "dayOfWeek",
                                        e.target.value,
                                    )
                                }
                                className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
                            >
                                {DAYS.map((day) => (
                                    <option key={day} value={day}>
                                        {day}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={item.timeSlotId}
                                onChange={(e) =>
                                    handleUpdate(
                                        index,
                                        "timeSlotId",
                                        e.target.value,
                                    )
                                }
                                className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
                            >
                                {sortedSlots.map((slot) => (
                                    <option key={slot.id} value={slot.id}>
                                        {formatTime(slot.startTime)}–
                                        {formatTime(slot.endTime)}
                                    </option>
                                ))}
                            </select>

                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleRemove(index)}
                                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                aria-label="Remove exception"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}