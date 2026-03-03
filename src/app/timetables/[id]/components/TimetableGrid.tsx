'use client';

import { DayOfWeek, LessonResponse, StudyGroupResponse, TimeSlot } from '@/lib/types';
import { LESSON_COLORS } from '@/lib/constants';
import { useMemo } from 'react';

const formatTime = (time: string) => time.substring(0, 5);

interface Props {
    lessons: LessonResponse[];
    groups: StudyGroupResponse[];
    selectedDay: DayOfWeek | 'ALL';
    timeSlots: TimeSlot[];
    onCellClick?: (group: StudyGroupResponse, timeSlot: TimeSlot) => void;
    onLessonClick?: (lesson: LessonResponse) => void;
}

export default function TimetableGrid({
                                          lessons,
                                          groups,
                                          selectedDay,
                                          timeSlots,
                                          onCellClick,
                                          onLessonClick
                                      }: Props) {
    // Фильтруем уроки по выбранному дню (если ALL — все дни)
    const dayLessons = useMemo(() => {
        if (selectedDay === 'ALL') return lessons;
        return lessons.filter(l => l.dayOfWeek === selectedDay);
    }, [lessons, selectedDay]);

    // Сортируем слоты по порядку (order)
    const sortedSlots = useMemo(() => {
        return [...timeSlots].sort((a, b) => a.order - b.order);
    }, [timeSlots]);

    // Функция для определения цвета урока
    const getLessonColor = (subjectName: string) => {
        const index = subjectName.length % LESSON_COLORS.length;
        return LESSON_COLORS[index];
    };

    return (
        <div className="overflow-x-auto relative border border-gray-200 rounded-lg shadow-sm">
            <table className="min-w-full border-collapse">
                <thead>
                <tr className="bg-gray-50">
                    <th className="sticky left-0 bg-gray-50 border-b border-r border-gray-200 p-3 text-left text-sm font-medium text-gray-700 z-10">
                        Group
                    </th>
                    {sortedSlots.map(slot => (
                        <th
                            key={slot.id}
                            className="border-b border-r border-gray-200 p-2 text-center text-xs font-medium text-gray-600"
                        >
                            <div>{slot.slot || `Slot ${slot.order}`}</div>
                            <div className="text-gray-400">{formatTime(slot.startTime)}–{formatTime(slot.endTime)}</div>
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {groups.map(group => {
                    // Уроки для этой группы
                    const groupLessons = dayLessons.filter(l => l.groupNames.includes(group.name));

                    // Создаём карту занятий по отформатированному времени начала
                    const lessonByStart = new Map(
                        groupLessons.map(l => [formatTime(l.startTime), l])
                    );

                    // Множество занятых слотов (все часы, которые заняты длительными уроками)
                    const occupiedSlots = new Set<string>();
                    groupLessons.forEach(l => {
                        const startIndex = sortedSlots.findIndex(s => formatTime(s.startTime) === formatTime(l.startTime));
                        if (startIndex !== -1) {
                            for (let i = 0; i < l.durationHours; i++) {
                                if (startIndex + i < sortedSlots.length) {
                                    occupiedSlots.add(formatTime(sortedSlots[startIndex + i].startTime));
                                }
                            }
                        }
                    });

                    return (
                        <tr key={group.id} className="hover:bg-gray-50">
                            <td className="sticky left-0 bg-white border-b border-r border-gray-200 p-3 font-medium text-sm z-10">
                                {group.name}
                            </td>
                            {sortedSlots.map(slot => {
                                const slotStart = formatTime(slot.startTime);
                                const lesson = lessonByStart.get(slotStart);
                                // Если этот слот уже занят предыдущим длительным уроком — пропускаем
                                if (occupiedSlots.has(slotStart) && !lesson) {
                                    return null;
                                }
                                if (lesson) {
                                    // Ячейка с уроком, занимающая несколько слотов
                                    return (
                                        <td
                                            key={slot.id}
                                            colSpan={lesson.durationHours}
                                            className="border-b border-r border-gray-200 p-1 cursor-pointer hover:shadow-md transition"
                                            onClick={() => onLessonClick?.(lesson)}
                                            style={{ backgroundColor: getLessonColor(lesson.subjectName) + '40' }}
                                        >
                                            <div className="p-2 rounded bg-white bg-opacity-90 shadow-sm">
                                                <div className="font-semibold text-sm truncate">{lesson.subjectName}</div>
                                                <div className="text-xs truncate">{lesson.teacherName}</div>
                                                <div className="text-xs text-gray-600 truncate">{lesson.roomName}</div>
                                            </div>
                                        </td>
                                    );
                                }
                                // Пустая ячейка
                                return (
                                    <td
                                        key={slot.id}
                                        className="border-b border-r border-gray-200 p-1 bg-gray-50 cursor-pointer hover:bg-gray-100"
                                        onClick={() => onCellClick?.(group, slot)}
                                    >
                                        <div className="h-full min-h-[60px] flex items-center justify-center text-gray-400 text-sm">
                                            +
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    );
                })}
                </tbody>
            </table>
        </div>
    );
}