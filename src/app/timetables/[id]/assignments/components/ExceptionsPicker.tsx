'use client';

import { useState } from 'react';
import { DayOfWeek, TimeSlot } from '@/lib/types';
import { DAYS_OF_WEEK, DAYS_SHORT } from '@/lib/constants';

interface ExceptionsPickerProps {
    value: {
        excludedDays: DayOfWeek[];
        excludedTimeSlots: { day: DayOfWeek; startTime: string; endTime: string }[];
    };
    onChange: (value: any) => void;
    timeSlots: TimeSlot[];
}

const formatTime = (time: string) => time.substring(0, 5);

export default function ExceptionsPicker({ value, onChange, timeSlots }: ExceptionsPickerProps) {
    const [selectedDay, setSelectedDay] = useState<DayOfWeek>('MONDAY');
    const [selectedSlotId, setSelectedSlotId] = useState<number | ''>('');

    const toggleDay = (day: DayOfWeek) => {
        const newDays = value.excludedDays.includes(day)
            ? value.excludedDays.filter(d => d !== day)
            : [...value.excludedDays, day];
        onChange({ ...value, excludedDays: newDays });
    };

    const addTimeExclusion = () => {
        if (!selectedDay || !selectedSlotId) return;
        const slot = timeSlots.find(s => s.id === selectedSlotId);
        if (!slot) return;
        const exclusion = {
            day: selectedDay,
            startTime: slot.startTime,
            endTime: slot.endTime,
        };
        onChange({
            ...value,
            excludedTimeSlots: [...value.excludedTimeSlots, exclusion],
        });
        setSelectedSlotId('');
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Excluded days
                </label>
                <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map(day => (
                        <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(day)}
                            className={`px-3 py-1 rounded-md text-sm ${
                                value.excludedDays.includes(day)
                                    ? 'bg-red-100 text-red-700 border border-red-300'
                                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}
                        >
                            {DAYS_SHORT[day]}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Excluded time slots (by day)
                </label>
                <div className="flex gap-2 items-center">
                    <select
                        value={selectedDay}
                        onChange={(e) => setSelectedDay(e.target.value as DayOfWeek)}
                        className="block w-40 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                        {DAYS_OF_WEEK.map(day => (
                            <option key={day} value={day}>{DAYS_SHORT[day]}</option>
                        ))}
                    </select>
                    <select
                        value={selectedSlotId}
                        onChange={(e) => setSelectedSlotId(e.target.value ? Number(e.target.value) : '')}
                        className="block w-40 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                        <option value="">Select slot</option>
                        {timeSlots.map(slot => (
                            <option key={slot.id} value={slot.id}>
                                {formatTime(slot.startTime)}–{formatTime(slot.endTime)}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={addTimeExclusion}
                        disabled={!selectedSlotId}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        Add
                    </button>
                </div>

                <div className="mt-2 space-y-1">
                    {value.excludedTimeSlots.map((exc, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <span className="text-sm">
                                {DAYS_SHORT[exc.day]}: {formatTime(exc.startTime)}–{formatTime(exc.endTime)}
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    const newSlots = value.excludedTimeSlots.filter((_, i) => i !== idx);
                                    onChange({ ...value, excludedTimeSlots: newSlots });
                                }}
                                className="text-red-600 hover:text-red-800"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}