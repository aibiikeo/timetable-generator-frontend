'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth, lessonApi, assignmentApi, roomApi } from '@/lib';
import { LessonResponse, DayOfWeek, RoomResponse, AssignmentResponse } from '@/lib/types';

type SortField = 'dayOfWeek' | 'startTime' | 'subjectName' | 'teacherName' | 'roomName';
type SortDirection = 'asc' | 'desc';

interface LessonFormData {
    assignmentId: number;
    dayOfWeek: DayOfWeek;
    startTime: string;
    durationHours: number;
    roomId?: number;
}

const days: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export default function LessonsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const timetableId = searchParams.get('timetableId');
    const { logout } = useAuth();

    const [lessons, setLessons] = useState<LessonResponse[]>([]);
    const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
    const [rooms, setRooms] = useState<RoomResponse[]>([]);
    const [filteredLessons, setFilteredLessons] = useState<LessonResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDay, setSelectedDay] = useState<DayOfWeek | 'ALL'>('ALL');
    const [selectedLessons, setSelectedLessons] = useState<number[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentLesson, setCurrentLesson] = useState<LessonResponse | null>(null);
    const [formData, setFormData] = useState<LessonFormData>({
        assignmentId: 0,
        dayOfWeek: 'MONDAY',
        startTime: '09:00',
        durationHours: 2,
        roomId: undefined,
    });
    const [error, setError] = useState('');

    // Sorting
    const [sortField, setSortField] = useState<SortField>('dayOfWeek');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!timetableId) {
            setLoading(false);
            return;
        }
        loadData();
    }, [timetableId]);

    useEffect(() => {
        if (!timetableId) return;
        const lower = searchQuery.toLowerCase();
        const filtered = lessons.filter(l =>
            l.subjectName.toLowerCase().includes(lower) ||
            l.teacherName.toLowerCase().includes(lower) ||
            l.roomName.toLowerCase().includes(lower) ||
            l.groupNames.some(g => g.toLowerCase().includes(lower))
        );
        const dayFiltered = selectedDay === 'ALL' ? filtered : filtered.filter(l => l.dayOfWeek === selectedDay);
        setFilteredLessons(dayFiltered);
        setSelectedLessons([]);
    }, [searchQuery, lessons, selectedDay]);

    const sortedLessons = useMemo(() => {
        const arr = [...filteredLessons];
        arr.sort((a, b) => {
            const dir = sortDirection === 'asc' ? 1 : -1;
            if (sortField === 'dayOfWeek') {
                const order = { MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6, SUNDAY: 7 };
                return (order[a.dayOfWeek] - order[b.dayOfWeek]) * dir;
            }
            if (sortField === 'startTime') return a.startTime.localeCompare(b.startTime) * dir;
            if (sortField === 'subjectName') return a.subjectName.localeCompare(b.subjectName) * dir;
            if (sortField === 'teacherName') return a.teacherName.localeCompare(b.teacherName) * dir;
            if (sortField === 'roomName') return a.roomName.localeCompare(b.roomName) * dir;
            return 0;
        });
        return arr;
    }, [filteredLessons, sortField, sortDirection]);

    const loadData = async () => {
        if (!timetableId) return;
        try {
            setLoading(true);
            setError('');
            const [lessonsData, assignmentsData, roomsData] = await Promise.all([
                lessonApi.getLessonsByTimetable(Number(timetableId)),
                assignmentApi.getAssignmentsByTimetable(Number(timetableId)),
                roomApi.getRooms(),
            ]);
            setLessons(lessonsData);
            setFilteredLessons(lessonsData);
            setAssignments(assignmentsData);
            setRooms(roomsData);
        } catch (err: any) {
            console.error('Error loading lessons:', err);
            setError('Failed to load lessons');
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const getSortIcon = (field: SortField) => {
        if (sortField !== field) return null;
        return sortDirection === 'asc' ? (
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
        ) : (
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        );
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!timetableId) return;
        try {
            setError('');
            await lessonApi.createLesson(Number(timetableId), formData);
            setIsCreateModalOpen(false);
            resetForm();
            loadData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create lesson');
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!timetableId || !currentLesson) return;
        try {
            await lessonApi.updateLesson(Number(timetableId), currentLesson.id, formData);
            setIsEditModalOpen(false);
            setCurrentLesson(null);
            resetForm();
            loadData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update lesson');
        }
    };

    const handleDelete = async (lessonId: number) => {
        if (!timetableId) return;
        if (!confirm('Delete this lesson?')) return;
        try {
            await lessonApi.deleteLesson(Number(timetableId), lessonId);
            loadData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete lesson');
        }
    };

    const handleDeleteSelected = async () => {
        if (!timetableId || selectedLessons.length === 0) return;
        if (!confirm(`Delete ${selectedLessons.length} lessons?`)) return;
        try {
            await Promise.all(selectedLessons.map(id => lessonApi.deleteLesson(Number(timetableId), id)));
            setSelectedLessons([]);
            loadData();
        } catch {
            setError('Failed to delete some lessons');
        }
    };

    const handleEdit = (lesson: LessonResponse) => {
        setCurrentLesson(lesson);
        setFormData({
            assignmentId: lesson.assignmentId,
            dayOfWeek: lesson.dayOfWeek,
            startTime: lesson.startTime,
            durationHours: lesson.durationHours,
            roomId: rooms.find(r => r.name === lesson.roomName)?.id, // простой поиск, можно улучшить
        });
        setIsEditModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            assignmentId: 0,
            dayOfWeek: 'MONDAY',
            startTime: '09:00',
            durationHours: 2,
            roomId: undefined,
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedLessons(e.target.checked ? sortedLessons.map(l => l.id) : []);
    };

    const handleSelect = (id: number) => {
        setSelectedLessons(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    if (!timetableId) {
        return (
            <ProtectedRoute>
                <div className="min-h-screen flex items-center justify-center">
                    <p className="text-gray-500">Select a timetable from the <button onClick={() => router.push('/timetables')} className="text-blue-600 underline">Timetables page</button></p>
                </div>
            </ProtectedRoute>
        );
    }

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
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <img src="/logo_aiu.png" alt="Logo" className="h-8 w-auto" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            </div>
                            <h1 className="ml-3 text-xl font-semibold text-gray-900">Lessons of Timetable #{timetableId}</h1>
                            <button onClick={() => router.push('/timetables')} className="ml-4 text-sm text-blue-600 hover:text-blue-800 flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                Back to Timetables
                            </button>
                        </div>
                        <button onClick={handleLogout} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">Logout</button>
                    </div>
                </div>
            </header>

            <main className="pt-16 flex flex-col min-h-screen">
                <div className="bg-white border-b shadow-sm py-4 px-4 sm:px-6 lg:px-8 sticky top-16 z-40">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex-1 relative">
                                <input type="text" placeholder="Search lessons..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                       className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <div className="flex items-center space-x-4">
                                <select value={selectedDay} onChange={e => setSelectedDay(e.target.value as DayOfWeek | 'ALL')} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                                    <option value="ALL">All days</option>
                                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                {selectedLessons.length > 0 && (
                                    <button onClick={handleDeleteSelected} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center">
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        Delete Selected ({selectedLessons.length})
                                    </button>
                                )}
                                <button onClick={() => { resetForm(); setIsCreateModalOpen(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    Add Lesson
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="max-w-7xl mx-auto mt-4 px-4">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
                            <svg className="h-5 w-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                            <p className="text-sm text-red-700 flex-1">{error}</p>
                            <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">✕</button>
                        </div>
                    </div>
                )}

                <div className="flex-1">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-full">
                        {sortedLessons.length === 0 ? (
                            <div className="text-center py-12 text-gray-400 text-lg">No lessons found</div>
                        ) : (
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full flex flex-col">
                                <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 flex-shrink-0">
                                    <div className="flex items-center">
                                        <div className="flex items-center w-12 pl-2">
                                            <input type="checkbox" checked={selectedLessons.length === sortedLessons.length && sortedLessons.length > 0} onChange={handleSelectAll} className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer" />
                                        </div>
                                        <div className="grid grid-cols-12 flex-1 gap-2">
                                            <div className="col-span-1 pl-2 text-sm font-medium text-gray-700 cursor-pointer flex items-center hover:text-blue-600" onClick={() => handleSort('dayOfWeek')}>
                                                Day {getSortIcon('dayOfWeek')}
                                            </div>
                                            <div className="col-span-1 text-sm font-medium text-gray-700 cursor-pointer flex items-center hover:text-blue-600" onClick={() => handleSort('startTime')}>
                                                Time {getSortIcon('startTime')}
                                            </div>
                                            <div className="col-span-2 text-sm font-medium text-gray-700 cursor-pointer flex items-center hover:text-blue-600" onClick={() => handleSort('subjectName')}>
                                                Subject {getSortIcon('subjectName')}
                                            </div>
                                            <div className="col-span-2 text-sm font-medium text-gray-700 cursor-pointer flex items-center hover:text-blue-600" onClick={() => handleSort('teacherName')}>
                                                Teacher {getSortIcon('teacherName')}
                                            </div>
                                            <div className="col-span-3 text-sm font-medium text-gray-700">Groups</div>
                                            <div className="col-span-2 text-sm font-medium text-gray-700 cursor-pointer flex items-center hover:text-blue-600" onClick={() => handleSort('roomName')}>
                                                Room {getSortIcon('roomName')}
                                            </div>
                                            <div className="col-span-1 text-sm font-medium text-gray-700 text-right pr-4">Actions</div>
                                        </div>
                                    </div>
                                </div>

                                <div ref={listRef} className="flex-1 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 230px)' }}>
                                    {sortedLessons.map(lesson => (
                                        <div key={lesson.id} className="px-6 py-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                                            <div className="flex items-center">
                                                <div className="flex items-center w-12 pl-2">
                                                    <input type="checkbox" checked={selectedLessons.includes(lesson.id)} onChange={() => handleSelect(lesson.id)} className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer" />
                                                </div>
                                                <div className="grid grid-cols-12 flex-1 gap-2 items-center text-sm">
                                                    <div className="col-span-1 pl-2">{lesson.dayOfWeek.slice(0,3)}</div>
                                                    <div className="col-span-1">{lesson.startTime} ({lesson.durationHours}h)</div>
                                                    <div className="col-span-2 truncate" title={lesson.subjectName}>{lesson.subjectName}</div>
                                                    <div className="col-span-2 truncate" title={lesson.teacherName}>{lesson.teacherName}</div>
                                                    <div className="col-span-3 truncate" title={lesson.groupNames.join(', ')}>{lesson.groupNames.join(', ')}</div>
                                                    <div className="col-span-2 truncate" title={lesson.roomName}>{lesson.roomName}</div>
                                                    <div className="col-span-1 flex justify-end space-x-2 pr-4">
                                                        <button onClick={() => handleEdit(lesson)} className="text-blue-600 hover:text-blue-800">✏️</button>
                                                        <button onClick={() => handleDelete(lesson.id)} className="text-red-600 hover:text-red-800">🗑️</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Create/Edit Modal */}
            {(isCreateModalOpen || isEditModalOpen) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold">{isEditModalOpen ? 'Edit Lesson' : 'Add Lesson'}</h3>
                                <button onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); setCurrentLesson(null); resetForm(); }} className="text-gray-400 hover:text-gray-500">✕</button>
                            </div>
                            <form onSubmit={isEditModalOpen ? handleEditSubmit : handleCreateSubmit}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Assignment *</label>
                                        <select value={formData.assignmentId} onChange={e => setFormData({ ...formData, assignmentId: Number(e.target.value) })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                            <option value={0}>Select assignment</option>
                                            {assignments.map(a => (
                                                <option key={a.id} value={a.id}>{a.subjectName} - {a.teacherName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Day *</label>
                                        <select value={formData.dayOfWeek} onChange={e => setFormData({ ...formData, dayOfWeek: e.target.value as DayOfWeek })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                            {days.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                                        <input type="time" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Duration (hours) *</label>
                                        <input type="number" min="1" max="8" value={formData.durationHours} onChange={e => setFormData({ ...formData, durationHours: Number(e.target.value) })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Room (optional)</label>
                                        <select value={formData.roomId || ''} onChange={e => setFormData({ ...formData, roomId: e.target.value ? Number(e.target.value) : undefined })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                            <option value="">Auto-assign</option>
                                            {rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.capacity})</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="mt-8 flex justify-end space-x-3">
                                    <button type="button" onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); setCurrentLesson(null); resetForm(); }} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </ProtectedRoute>
    );
}