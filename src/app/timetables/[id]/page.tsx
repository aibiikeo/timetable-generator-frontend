'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth, timetableApi, assignmentApi, lessonApi, subjectApi, teacherApi, groupApi, roomApi, facultyApi, api, timeSlotApi } from '@/lib';
import {
    TimetableResponse,
    AssignmentResponse,
    LessonResponse,
    GenerationMode,
    GenerationResponse,
    SubjectResponse,
    TeacherResponse,
    StudyGroupResponse,
    RoomResponse,
    FacultyResponse,
    DayOfWeek,
    TimeSlot
} from '@/lib/types';
import AssignmentForm from './assignments/components/AssignmentForm';
import GenerateOptionsModal from '@/components/GenerateOptionsModal';
import GenerationResultModal from './components/GenerationResultModal';
import ManualPlacementModal from './components/ManualPlacementModal';
import ExportModal from '@/components/ExportModal';
import TimetableGrid from './components/TimetableGrid';
import { DAYS_OF_WEEK, DAYS_SHORT } from '@/lib/constants';

// Хелпер для форматирования времени (убираем секунды)
const formatTime = (time: string) => time.substring(0, 5);

const getStatusColor = (status: string) => {
    switch (status) {
        case 'DRAFT': return 'bg-gray-100 text-gray-800';
        case 'GENERATED': return 'bg-green-100 text-green-800';
        case 'PARTIAL': return 'bg-yellow-100 text-yellow-800';
        case 'PUBLISHED': return 'bg-blue-100 text-blue-800';
        case 'ARCHIVED': return 'bg-purple-100 text-purple-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const getPlacementColor = (status: string) => {
    switch (status) {
        case 'SCHEDULED': return 'bg-green-100 text-green-800';
        case 'PARTIAL': return 'bg-yellow-100 text-yellow-800';
        case 'FAILED': return 'bg-red-100 text-red-800';
        case 'PENDING': return 'bg-gray-100 text-gray-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

export default function TimetableDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const unwrappedParams = React.use(params);
    const timetableId = parseInt(unwrappedParams.id);
    const router = useRouter();
    const { logout } = useAuth();

    // Данные пользователя
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loadingUser, setLoadingUser] = useState(true);

    // Основные данные
    const [timetable, setTimetable] = useState<TimetableResponse | null>(null);
    const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
    const [lessons, setLessons] = useState<LessonResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Справочники
    const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
    const [teachers, setTeachers] = useState<TeacherResponse[]>([]);
    const [groups, setGroups] = useState<StudyGroupResponse[]>([]);
    const [rooms, setRooms] = useState<RoomResponse[]>([]);
    const [faculties, setFaculties] = useState<FacultyResponse[]>([]);
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

    // Состояния модалок
    const [showAssignmentForm, setShowAssignmentForm] = useState(false);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [generationResult, setGenerationResult] = useState<GenerationResponse | null>(null);
    const [manualAssignmentId, setManualAssignmentId] = useState<number | null>(null);
    const [showAssignments, setShowAssignments] = useState(false);

    // Фильтры
    const [selectedDay, setSelectedDay] = useState<DayOfWeek | 'ALL'>('ALL');
    const [selectedDepartment, setSelectedDepartment] = useState<number | 'ALL'>('ALL');

    // Загрузка текущего пользователя
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const users = await api.getUsers();
                const userEmail = localStorage.getItem('userEmail');
                if (userEmail) {
                    const foundUser = users.data.find((u: any) => u.email === userEmail);
                    setCurrentUser(foundUser || null);
                }
            } catch (error) {
                console.error('Failed to fetch current user:', error);
            } finally {
                setLoadingUser(false);
            }
        };
        fetchCurrentUser();
    }, []);

    // Загрузка всех данных
    useEffect(() => {
        if (!timetableId || isNaN(timetableId) || timetableId <= 0) return;
        loadData();
    }, [timetableId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [tt, assigns, less, subs, teach, grps, rms, facs, slots] = await Promise.all([
                timetableApi.getTimetable(timetableId),
                assignmentApi.getAssignmentsByTimetable(timetableId),
                lessonApi.getLessonsByTimetable(timetableId),
                subjectApi.getSubjects(),
                teacherApi.getTeachers(),
                groupApi.getAllGroups(),
                roomApi.getRooms(),
                facultyApi.getFaculties(),
                timeSlotApi.getTimeSlots(),
            ]);
            setTimetable(tt);
            setAssignments(assigns);
            setLessons(less);
            setSubjects(subs);
            setTeachers(teach);
            setGroups(grps);
            setRooms(rms);
            setFaculties(facs);
            setTimeSlots(slots);
        } catch (err) {
            setError('Failed to load timetable data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Фильтрация групп по выбранному департаменту
    const filteredGroups = useMemo(() => {
        if (selectedDepartment === 'ALL') return groups;
        return groups.filter(g => g.facultyId === selectedDepartment);
    }, [groups, selectedDepartment]);

    // Фильтрация уроков по выбранному дню (если ALL — все дни)
    const filteredLessons = useMemo(() => {
        if (selectedDay === 'ALL') return lessons;
        return lessons.filter(l => l.dayOfWeek === selectedDay);
    }, [lessons, selectedDay]);

    // Обработчики действий
    const handleGenerate = async (mode: GenerationMode) => {
        try {
            const result = await timetableApi.generateTimetable(timetableId, mode);
            setGenerationResult(result);
            await loadData();
        } catch (err) {
            setError('Generation failed');
            console.error(err);
        }
    };

    const handlePublish = async () => {
        if (!confirm('Publish this timetable?')) return;
        try {
            await timetableApi.publishTimetable(timetableId);
            await loadData();
        } catch (err) {
            setError('Failed to publish');
            console.error(err);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Delete this timetable?')) return;
        try {
            await timetableApi.deleteTimetable(timetableId);
            router.push('/timetables');
        } catch (err) {
            setError('Failed to delete');
            console.error(err);
        }
    };

    const handleExport = async (format: 'pdf' | 'excel') => {
        if (!timetable) return;

        const groupsToExport = filteredGroups;
        const slotsToExport = [...timeSlots].sort((a, b) => a.order - b.order);

        const headers = ['Group', ...slotsToExport.map(s => `${formatTime(s.startTime)}–${formatTime(s.endTime)}`)];

        const tableBody: string[][] = [];
        groupsToExport.forEach(group => {
            const row: string[] = [group.name];
            slotsToExport.forEach(slot => {
                const lesson = filteredLessons.find(l =>
                    l.groupNames.includes(group.name) &&
                    formatTime(l.startTime) === formatTime(slot.startTime) &&
                    (selectedDay === 'ALL' || l.dayOfWeek === selectedDay)
                );
                row.push(lesson ? `${lesson.subjectName}\n${lesson.teacherName}\n${lesson.roomName}` : '');
            });
            tableBody.push(row);
        });

        if (format === 'excel') {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet([headers, ...tableBody]);
            XLSX.utils.book_append_sheet(wb, ws, 'Timetable');
            XLSX.writeFile(wb, `timetable_${timetable.id}.xlsx`);
        } else {
            const doc = new jsPDF({ orientation: 'landscape' });
            doc.text(`Timetable: ${timetable.name} — ${selectedDay === 'ALL' ? 'All Days' : selectedDay}`, 14, 16);
            autoTable(doc, {
                head: [headers],
                body: tableBody,
                startY: 20,
                styles: { fontSize: 8, cellPadding: 2 },
                columnStyles: { 0: { cellWidth: 30 } },
            });
            doc.save(`timetable_${timetable.id}.pdf`);
        }
        setShowExportModal(false);
    };

    const openManualModal = (assignmentId: number) => {
        setManualAssignmentId(assignmentId);
    };

    const closeManualModal = () => {
        setManualAssignmentId(null);
    };

    const handleManualPlace = async (data: { dayOfWeek: string; startTime: string; durationHours: number; roomId: number }) => {
        if (!manualAssignmentId) return;
        try {
            const success = await timetableApi.manualPlaceLesson(timetableId, manualAssignmentId, data);
            if (success) {
                await loadData();
                closeManualModal();
            } else {
                setError('Manual placement failed due to conflicts');
            }
        } catch (err) {
            setError('Manual placement error');
            console.error(err);
        }
    };

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    const handleCellClick = (group: StudyGroupResponse, timeSlot: TimeSlot) => {
        if (currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') {
            setShowAssignmentForm(true);
            // Можно передать предзаполненные данные, но пока просто открываем форму
        }
    };

    const handleLessonClick = (lesson: LessonResponse) => {
        if (currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') {
            alert(`Edit lesson ${lesson.subjectName}`);
        }
    };

    if (loading || loadingUser) return <div className="p-8 text-center">Loading...</div>;
    if (!timetable) return <div className="p-8 text-center">Timetable not found</div>;

    return (
        <ProtectedRoute>
            <header className="fixed top-0 left-0 right-0 bg-white shadow-sm border-b z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <img
                                    src="/logo_aiu.png"
                                    alt="University Logo"
                                    className="h-8 w-auto"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const fallback = document.createElement('div');
                                        fallback.className = 'h-8 w-8 bg-blue-600 rounded-lg';
                                        e.currentTarget.parentNode?.appendChild(fallback);
                                    }}
                                />
                            </div>
                            <h1 className="ml-3 text-xl font-semibold text-gray-900">
                                Timetable: {timetable.name}
                            </h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            {currentUser && (
                                <div className="text-sm text-gray-600">
                                    <span className="font-medium">{currentUser.email}</span>
                                    <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100">
                                        {currentUser.role}
                                    </span>
                                </div>
                            )}
                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="pt-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    {/* Кнопки действий */}
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Timetable Calendar</h2>
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => setShowAssignmentForm(true)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                            >
                                Add Assignment
                            </button>
                            <button
                                onClick={() => setShowGenerateModal(true)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                            >
                                Generate
                            </button>
                            <button
                                onClick={handlePublish}
                                disabled={timetable.status === 'PUBLISHED'}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                            >
                                Publish
                            </button>
                            <button
                                onClick={() => setShowExportModal(true)}
                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                            >
                                Export
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                            >
                                Delete
                            </button>
                            <button
                                onClick={() => router.push('/timetables')}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                            >
                                ← Back
                            </button>
                        </div>
                    </div>

                    {/* Фильтры */}
                    <div className="flex gap-4 mb-4">
                        <select
                            value={selectedDay}
                            onChange={e => setSelectedDay(e.target.value as DayOfWeek | 'ALL')}
                            className="border border-gray-300 rounded-lg p-2 text-sm"
                        >
                            <option value="ALL">All Days</option>
                            {DAYS_OF_WEEK.map(day => (
                                <option key={day} value={day}>{DAYS_SHORT[day]}</option>
                            ))}
                        </select>
                        <select
                            value={selectedDepartment}
                            onChange={e => setSelectedDepartment(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                            className="border border-gray-300 rounded-lg p-2 text-sm"
                        >
                            <option value="ALL">All Departments</option>
                            {faculties.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Список назначений (сворачиваемый) */}
                    <div className="mb-4">
                        <button
                            onClick={() => setShowAssignments(!showAssignments)}
                            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                        >
                            <svg
                                className={`w-4 h-4 transition-transform ${showAssignments ? 'rotate-90' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            Assignments ({assignments.length})
                        </button>
                        {showAssignments && (
                            <div className="mt-2 bg-white rounded-lg border border-gray-200 divide-y max-h-60 overflow-y-auto">
                                {assignments.map(a => (
                                    <div key={a.id} className="p-3 flex justify-between items-center text-sm">
                                        <div>
                                            <span className="font-medium">{a.subjectName}</span> – {a.teacherName} ({a.groupNames.join(', ')})
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPlacementColor(a.placementStatus)}`}>
                                                {a.placementStatus}
                                            </span>
                                            {a.requiresManualInput && (
                                                <button
                                                    onClick={() => openManualModal(a.id)}
                                                    className="text-xs text-blue-600 hover:text-blue-800"
                                                >
                                                    Place manually
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Таблица расписания */}
                    <section>
                        <TimetableGrid
                            lessons={filteredLessons}
                            groups={filteredGroups}
                            selectedDay={selectedDay}
                            timeSlots={timeSlots}
                            onCellClick={handleCellClick}
                            onLessonClick={handleLessonClick}
                        />
                    </section>
                </div>
            </main>

            {showAssignmentForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-4">New Assignment</h3>
                            <AssignmentForm
                                subjects={subjects}
                                teachers={teachers}
                                groups={groups}
                                rooms={rooms}
                                timeSlots={timeSlots}
                                onSave={async (data) => {
                                    await assignmentApi.createAssignment(timetableId, data);
                                    setShowAssignmentForm(false);
                                    loadData();
                                }}
                                onCancel={() => setShowAssignmentForm(false)}
                            />
                        </div>
                    </div>
                </div>
            )}

            <GenerateOptionsModal
                isOpen={showGenerateModal}
                onClose={() => setShowGenerateModal(false)}
                onGenerate={handleGenerate}
                timetableName={timetable.name}
            />

            <ExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onExport={handleExport}
                timetableName={timetable.name}
            />

            {generationResult && (
                <GenerationResultModal
                    result={generationResult}
                    onClose={() => setGenerationResult(null)}
                    onManualPlace={(assignmentId) => {
                        setGenerationResult(null);
                        openManualModal(assignmentId);
                    }}
                />
            )}

            {manualAssignmentId && (
                <ManualPlacementModal
                    assignmentId={manualAssignmentId}
                    rooms={rooms}
                    onPlace={handleManualPlace}
                    onClose={closeManualModal}
                />
            )}
        </ProtectedRoute>
    );
}