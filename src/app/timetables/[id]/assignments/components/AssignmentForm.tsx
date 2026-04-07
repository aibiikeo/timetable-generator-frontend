'use client';

import { useState, useEffect } from 'react';
import {
    SubjectResponse,
    TeacherResponse,
    StudyGroupResponse,
    RoomResponse,
    Shift,
    RoomType,
    DayOfWeek,
    TimeSlot
} from '@/lib/types';
import { generateSplittingOptions } from '@/lib/splitting';
import SplittingOptions from './SplittingOptions';
import ExceptionsPicker from './ExceptionsPicker';

interface AssignmentFormData {
    subjectId: number;
    teacherId: number;
    groupIds: number[];
    hoursPerWeek: number;
    shift?: Shift;
    roomTypeRequired?: RoomType;
    specificRoomId?: number;
    hoursSplitting: string;
    excludedDays: DayOfWeek[];
    excludedTimeSlots: { day: DayOfWeek; startTime: string; endTime: string }[];
    preferredDays?: DayOfWeek[];
}

type SplittingMode = 'auto' | 'manual';

interface Props {
    subjects: SubjectResponse[];
    teachers: TeacherResponse[];
    groups: StudyGroupResponse[];
    rooms: RoomResponse[];
    timeSlots: TimeSlot[];
    onSave: (data: AssignmentFormData) => void;
    onCancel: () => void;
    initialData?: AssignmentFormData;
}

export default function AssignmentForm({
                                           subjects,
                                           teachers,
                                           groups,
                                           rooms,
                                           timeSlots,
                                           onSave,
                                           onCancel,
                                           initialData
                                       }: Props) {
    const [formData, setFormData] = useState<AssignmentFormData>(
        initialData || {
            subjectId: 0,
            teacherId: 0,
            groupIds: [],
            hoursPerWeek: 4,
            shift: 'ANY',
            roomTypeRequired: 'ANY',
            specificRoomId: undefined,
            hoursSplitting: '',
            excludedDays: [],
            excludedTimeSlots: [],
            preferredDays: [],
        }
    );

    const [splittingOptions, setSplittingOptions] = useState<string[]>([]);
    const [splittingMode, setSplittingMode] = useState<SplittingMode>('auto');
    const [manualSplittingInput, setManualSplittingInput] = useState('');

    useEffect(() => {
        if (formData.hoursPerWeek > 0) {
            const options = generateSplittingOptions(formData.hoursPerWeek);
            setSplittingOptions(options);

            if (
                splittingMode === 'auto' &&
                formData.hoursSplitting &&
                !options.includes(formData.hoursSplitting)
            ) {
                setFormData(prev => ({ ...prev, hoursSplitting: '' }));
            }
        } else {
            setSplittingOptions([]);
            setFormData(prev => ({ ...prev, hoursSplitting: '' }));
            setManualSplittingInput('');
        }
    }, [formData.hoursPerWeek, splittingMode]);

    useEffect(() => {
        // Если есть initialData, определяем режим по значению.
        if (!initialData) return;

        const current = initialData.hoursSplitting?.trim() ?? '';

        if (!current) {
            setSplittingMode('auto');
            setManualSplittingInput('');
            return;
        }

        if (generateSplittingOptions(initialData.hoursPerWeek).includes(current)) {
            setSplittingMode('auto');
            setManualSplittingInput('');
        } else {
            setSplittingMode('manual');
            setManualSplittingInput(current);
        }
    }, [initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const normalizedHoursSplitting =
            splittingMode === 'manual'
                ? manualSplittingInput.trim()
                : formData.hoursSplitting.trim();

        onSave({
            ...formData,
            hoursSplitting: normalizedHoursSplitting,
        });
    };

    const handleGroupToggle = (groupId: number) => {
        setFormData(prev => ({
            ...prev,
            groupIds: prev.groupIds.includes(groupId)
                ? prev.groupIds.filter(id => id !== groupId)
                : [...prev.groupIds, groupId]
        }));
    };

    const handleSelectSuggestedSplitting = (val: string) => {
        setSplittingMode('auto');
        setFormData(prev => ({
            ...prev,
            hoursSplitting: val
        }));
    };

    const handleManualInputChange = (val: string) => {
        setSplittingMode('manual');
        setManualSplittingInput(val);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Subject *</label>
                <select
                    value={formData.subjectId}
                    onChange={e => setFormData({ ...formData, subjectId: Number(e.target.value) })}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                    <option value="">Select subject</option>
                    {subjects.map(s => (
                        <option key={s.id} value={s.id}>
                            {s.name}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Teacher *</label>
                <select
                    value={formData.teacherId}
                    onChange={e => setFormData({ ...formData, teacherId: Number(e.target.value) })}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                    <option value="">Select teacher</option>
                    {teachers.map(t => (
                        <option key={t.id} value={t.id}>
                            {t.fullName}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Groups *</label>
                <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
                    {groups.map(group => (
                        <label key={group.id} className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={formData.groupIds.includes(group.id)}
                                onChange={() => handleGroupToggle(group.id)}
                                className="h-4 w-4 text-blue-600"
                            />
                            <span className="text-sm">{group.name}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Hours per week *</label>
                <input
                    type="number"
                    min="2"
                    max="30"
                    value={formData.hoursPerWeek}
                    onChange={e =>
                        setFormData({ ...formData, hoursPerWeek: Number(e.target.value) })
                    }
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Shift</label>
                <select
                    value={formData.shift || ''}
                    onChange={e =>
                        setFormData({
                            ...formData,
                            shift: (e.target.value as Shift) || undefined
                        })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                    <option value="">Any</option>
                    <option value="MORNING">Morning</option>
                    <option value="AFTERNOON">Afternoon</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Required room type</label>
                <select
                    value={formData.roomTypeRequired || ''}
                    onChange={e =>
                        setFormData({
                            ...formData,
                            roomTypeRequired: (e.target.value as RoomType) || undefined
                        })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                    <option value="">Any</option>
                    <option value="CLASSROOM">Classroom</option>
                    <option value="COMPUTER_LAB">Computer Lab</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Specific room (optional)</label>
                <select
                    value={formData.specificRoomId || ''}
                    onChange={e =>
                        setFormData({
                            ...formData,
                            specificRoomId: Number(e.target.value) || undefined
                        })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                    <option value="">Auto-assign</option>
                    {rooms.map(r => (
                        <option key={r.id} value={r.id}>
                            {r.name}
                        </option>
                    ))}
                </select>
            </div>

            <SplittingOptions
                totalHours={formData.hoursPerWeek}
                mode={splittingMode}
                selectedValue={formData.hoursSplitting}
                manualValue={manualSplittingInput}
                options={splittingOptions}
                onModeChange={setSplittingMode}
                onSelectSuggested={handleSelectSuggestedSplitting}
                onManualChange={handleManualInputChange}
            />

            <ExceptionsPicker
                value={{
                    excludedDays: formData.excludedDays,
                    excludedTimeSlots: formData.excludedTimeSlots
                }}
                onChange={(val) => setFormData({ ...formData, ...val })}
                timeSlots={timeSlots}
            />

            <div className="flex justify-end space-x-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    Save Assignment
                </button>
            </div>
        </form>
    );
}