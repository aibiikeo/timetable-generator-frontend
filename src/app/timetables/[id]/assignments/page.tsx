'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth, subjectApi, teacherApi, groupApi, roomApi, assignmentApi, timetableApi } from '@/lib';
import { SubjectResponse, TeacherResponse, StudyGroupResponse, RoomResponse, AssignmentResponse, AssignmentRequest } from '@/lib/types';
import AssignmentForm from './components/AssignmentForm';

export default function AssignmentsPage({ params }: { params: Promise<{ id: string }> }) {
    const unwrappedParams = React.use(params);
    const timetableId = parseInt(unwrappedParams.id);
    const router = useRouter();
    const { logout } = useAuth();

    // Проверка валидности ID
    if (isNaN(timetableId) || timetableId <= 0) {
        return <div className="p-8 text-center text-red-600">Invalid timetable ID: {unwrappedParams.id}</div>;
    }

    const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
    const [teachers, setTeachers] = useState<TeacherResponse[]>([]);
    const [groups, setGroups] = useState<StudyGroupResponse[]>([]);
    const [rooms, setRooms] = useState<RoomResponse[]>([]);
    const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadData();
    }, [timetableId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [subjectsData, teachersData, groupsData, roomsData, assignmentsData] = await Promise.all([
                subjectApi.getSubjects(),
                teacherApi.getTeachers(),
                groupApi.getAllGroups(),
                roomApi.getRooms(),
                assignmentApi.getAssignmentsByTimetable(timetableId),
            ]);
            setSubjects(subjectsData);
            setTeachers(teachersData);
            setGroups(groupsData);
            setRooms(roomsData);
            setAssignments(assignmentsData);
        } catch (err) {
            setError('Не удалось загрузить данные');
        } finally {
            setLoading(false);
        }
    };

    const handleAddAssignment = async (data: AssignmentRequest) => {
        try {
            setError('');
            await assignmentApi.createAssignment(timetableId, data);
            await loadData();
            setShowForm(false);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Ошибка при создании назначения');
        }
    };

    const handleGenerate = async () => {
        try {
            setError('');
            const result = await timetableApi.generateTimetable(timetableId);
            // Используем placedLessonsCount вместо несуществующего generatedLessons
            router.push(`/timetables/${timetableId}?generated=${result.placedLessonsCount}`);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Ошибка генерации');
        }
    };

    if (loading) {
        return (
            <ProtectedRoute>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <header className="fixed top-0 left-0 right-0 bg-white shadow-sm border-b z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <h1 className="text-xl font-semibold">Настройка расписания #{timetableId}</h1>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => router.push(`/timetables/${timetableId}`)}
                                className="text-blue-600 hover:text-blue-800"
                            >
                                ← К календарю
                            </button>
                            <button
                                onClick={logout}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                            >
                                Выйти
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="pt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                        {error}
                    </div>
                )}

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-medium">Добавленные назначения</h2>
                    <div className="space-x-3">
                        <button
                            onClick={() => setShowForm(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            + Добавить назначение
                        </button>
                        <button
                            onClick={handleGenerate}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                            Сгенерировать расписание
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                    {assignments.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Пока нет ни одного назначения</p>
                    ) : (
                        <ul className="divide-y divide-gray-200">
                            {assignments.map((a) => (
                                <li key={a.id} className="py-3">
                                    <div className="flex justify-between">
                                        <span>
                                            {a.subjectName} – {a.teacherName} ({a.groupNames.join(', ')})
                                        </span>
                                        <span className="text-sm text-gray-500">{a.hoursPerWeek} ч/нед</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {showForm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="p-6">
                                <h3 className="text-lg font-semibold mb-4">Новое назначение</h3>
                                <AssignmentForm
                                    subjects={subjects}
                                    teachers={teachers}
                                    groups={groups}
                                    rooms={rooms}
                                    onSave={handleAddAssignment}
                                    onCancel={() => setShowForm(false)}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </ProtectedRoute>
    );
}