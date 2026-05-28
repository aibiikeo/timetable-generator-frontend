"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { TimeSlotRequest, TimeSlotResponse } from "@/lib/types";

interface TimeSlotFormModalProps {
    open: boolean;
    slot: TimeSlotResponse | null;
    existingSlots?: TimeSlotResponse[];
    saving?: boolean;
    onClose: () => void;
    onSave: (slotId: number | null, data: TimeSlotRequest) => void | Promise<void>;
}

const MAX_SLOT_ORDER = 15;
const LESSON_MINUTES = 40;
const BREAK_MINUTES = 5;

function toMinutes(time: string) {
    const [hours, minutes] = time.substring(0, 5).split(":").map(Number);
    return hours * 60 + minutes;
}

function toTime(minutes: number) {
    const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
    const hours = Math.floor(normalized / 60).toString().padStart(2, "0");
    const mins = (normalized % 60).toString().padStart(2, "0");
    return `${hours}:${mins}`;
}

function sortSlots(slots: TimeSlotResponse[]) {
    return [...slots].sort((a, b) => {
        const orderDiff = (a.order ?? 0) - (b.order ?? 0);
        if (orderDiff !== 0) return orderDiff;
        return a.startTime.localeCompare(b.startTime);
    });
}

function getNextSlotDefaults(existingSlots: TimeSlotResponse[]) {
    const sorted = sortSlots(existingSlots);
    const last = sorted.at(-1);

    if (!last) {
        return {
            order: 1,
            startTime: "08:00",
            endTime: "08:40",
            description: "1st lesson",
        };
    }

    const nextOrder = Math.min((last.order ?? sorted.length) + 1, MAX_SLOT_ORDER);
    const nextStart = toTime(toMinutes(last.endTime) + BREAK_MINUTES);
    const nextEnd = toTime(toMinutes(nextStart) + LESSON_MINUTES);

    return {
        order: nextOrder,
        startTime: nextStart,
        endTime: nextEnd,
        description: `${nextOrder}${getOrdinalSuffix(nextOrder)} lesson`,
    };
}

function getDefaultsForOrder(existingSlots: TimeSlotResponse[], order: number) {
    const sorted = sortSlots(existingSlots);
    const previous = [...sorted]
        .filter((item) => (item.order ?? 0) < order)
        .sort((a, b) => (b.order ?? 0) - (a.order ?? 0))[0];

    if (!previous) {
        const startTime = "08:00";
        return {
            startTime,
            endTime: toTime(toMinutes(startTime) + LESSON_MINUTES),
        };
    }

    const startTime = toTime(toMinutes(previous.endTime) + BREAK_MINUTES);
    return {
        startTime,
        endTime: toTime(toMinutes(startTime) + LESSON_MINUTES),
    };
}

function getOrdinalSuffix(value: number) {
    if (value % 100 >= 11 && value % 100 <= 13) return "th";
    if (value % 10 === 1) return "st";
    if (value % 10 === 2) return "nd";
    if (value % 10 === 3) return "rd";
    return "th";
}

export default function TimeSlotFormModal({
                                              open,
                                              slot,
                                              existingSlots = [],
                                              saving = false,
                                              onClose,
                                              onSave,
                                          }: TimeSlotFormModalProps) {
    const defaultValues = useMemo(
        () => getNextSlotDefaults(existingSlots),
        [existingSlots],
    );

    const [order, setOrder] = useState(1);
    const [startTime, setStartTime] = useState("08:00");
    const [endTime, setEndTime] = useState("08:40");
    const [description, setDescription] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (!open) return;

        setOrder(slot?.order ?? defaultValues.order);
        setStartTime((slot?.startTime ?? defaultValues.startTime).substring(0, 5));
        setEndTime((slot?.endTime ?? defaultValues.endTime).substring(0, 5));
        setDescription(slot?.description ?? defaultValues.description);
        setError("");
    }, [defaultValues, open, slot]);

    const handleOrderChange = (value: string) => {
        const nextOrder = Number(value);
        if (!Number.isFinite(nextOrder)) {
            setOrder(1);
            return;
        }

        const safeOrder = Math.min(Math.max(nextOrder, 1), MAX_SLOT_ORDER);
        setOrder(safeOrder);
        setDescription(`${safeOrder}${getOrdinalSuffix(safeOrder)} lesson`);

        if (!slot) {
            const nextTimes = getDefaultsForOrder(existingSlots, safeOrder);
            setStartTime(nextTimes.startTime);
            setEndTime(nextTimes.endTime);
        }
    };

    const handleStartTimeChange = (value: string) => {
        setStartTime(value);
        if (value && (!endTime || toMinutes(endTime) <= toMinutes(value))) {
            setEndTime(toTime(toMinutes(value) + LESSON_MINUTES));
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!Number.isFinite(Number(order)) || Number(order) < 1 || Number(order) > MAX_SLOT_ORDER) {
            setError(`Order must be between 1 and ${MAX_SLOT_ORDER}`);
            return;
        }

        if (!slot && existingSlots.length >= MAX_SLOT_ORDER) {
            setError(`Maximum ${MAX_SLOT_ORDER} time slots allowed`);
            return;
        }

        if (!startTime || !endTime) {
            setError("Start and end time are required");
            return;
        }

        if (startTime >= endTime) {
            setError("End time must be after start time");
            return;
        }

        await onSave(slot?.id ?? null, {
            order: Number(order),
            startTime,
            endTime,
            description: description.trim() || `${order}${getOrdinalSuffix(Number(order))} lesson`,
        });
    };

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{slot ? "Edit Time Slot" : "New Time Slot"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <label className="mb-2 block text-sm font-medium">Order</label>
                            <Input
                                type="number"
                                value={order}
                                min={1}
                                max={MAX_SLOT_ORDER}
                                onChange={(event) => handleOrderChange(event.target.value)}
                                disabled={saving}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">Start</label>
                            <Input
                                type="time"
                                value={startTime}
                                onChange={(event) => handleStartTimeChange(event.target.value)}
                                disabled={saving}
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">End</label>
                            <Input
                                type="time"
                                value={endTime}
                                onChange={(event) => setEndTime(event.target.value)}
                                disabled={saving}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">Description</label>
                        <Input
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            placeholder="Example: First lesson"
                            disabled={saving}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
