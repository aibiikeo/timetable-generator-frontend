'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth, subjectApi, facultyApi, FacultyResponse, SubjectResponse } from '@/lib';
import SubjectModal from '@/components/SubjectModal';

type SortField = 'name' | 'code' | 'totalHours' | 'hoursPerWeek' | 'faculty';
type SortDirection = 'asc' | 'desc';

interface FormDataState {
    name: string;
    code: string;
    totalHours: number | string;
    hoursPerWeek: number | string;
    facultyId: number;
}

export default function SubjectsPage() {
    const router = useRouter();
    const { logout } = useAuth();
    const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
    const [filteredSubjects, setFilteredSubjects] = useState<SubjectResponse[]>([]);
    const [faculties, setFaculties] = useState<FacultyResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentSubject, setCurrentSubject] = useState<SubjectResponse | null>(null);
    const [error, setError] = useState<string>('');
    const [formData, setFormData] = useState<FormDataState>({
        name: '',
        code: '',
        totalHours: 30,
        hoursPerWeek: 4,
        facultyId: 0,
    });

    // Сортировка
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    const nameInputRef = useRef<HTMLInputElement>(null);
    const codeInputRef = useRef<HTMLInputElement>(null);
    const facultySelectRef = useRef<HTMLSelectElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Загрузка данных при монтировании
    useEffect(() => {
        loadData(true);
    }, []);

    const facultiesMap = useMemo(() => {
        const map = new Map<number, string>();
        faculties.forEach(f => map.set(f.id, f.name));
        return map;
    }, [faculties]);

    // Сортировка предметов
    const sortedSubjects = useMemo(() => {
        return [...filteredSubjects].sort((a, b) => {
            const direction = sortDirection === 'asc' ? 1 : -1;

            if (sortField === 'faculty') {
                const facultyA = facultiesMap.get(a.facultyId) || '';
                const facultyB = facultiesMap.get(b.facultyId) || '';
                return facultyA.localeCompare(facultyB) * direction;
            }

            if (sortField === 'name' || sortField === 'code') {
                return a[sortField].localeCompare(b[sortField]) * direction;
            }

            const valueA = Number(a[sortField]);
            const valueB = Number(b[sortField]);
            return (valueA - valueB) * direction;
        });
    }, [filteredSubjects, sortField, sortDirection, facultiesMap]);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredSubjects(subjects);
            return;
        }

        const lower = searchQuery.toLowerCase();

        const filtered = subjects.filter(subject =>
            subject.name.toLowerCase().includes(lower) ||
            subject.code.toLowerCase().includes(lower) ||
            facultiesMap.get(subject.facultyId)?.toLowerCase().includes(lower) ||
            subject.totalHours.toString().includes(lower) ||
            subject.hoursPerWeek.toString().includes(lower) ||
            subject.id.toString().includes(lower)
        );

        setFilteredSubjects(filtered);
    }, [searchQuery, subjects, facultiesMap]);

    const loadData = async (initial = false) => {
        try {
            if (initial) setLoading(true);

            setError('');

            const [subjectsData, facultiesData] = await Promise.all([
                subjectApi.getSubjects(),
                facultyApi.getFaculties(),
            ]);

            setSubjects(subjectsData);
            setFilteredSubjects(subjectsData);
            setFaculties(facultiesData);

        } catch (err) {
            setError('Failed to load data');
        } finally {
            if (initial) setLoading(false);
        }
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const getSortIcon = (field: SortField) => {
        if (sortField !== field) return null;
        if (sortDirection === 'asc') {
            return (
                <svg className="w-4 h-4 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
            );
        } else {
            return (
                <svg className="w-4 h-4 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            );
        }
    };

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value, type } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]:
                type === 'number'
                    ? value === '' ? '' : Number(value)
                    : name === 'facultyId'
                        ? Number(value)
                        : value
        }));
    };

    const validateForm = (): boolean => {
        if (!formData.name.trim()) {
            setError('Subject name is required');
            return false;
        }

        if (!formData.code.trim()) {
            setError('Subject code is required');
            return false;
        }

        if (!formData.facultyId) {
            setError('Please select a faculty');
            return false;
        }

        if (Number(formData.totalHours) < 1) {
            setError('Total hours must be at least 1');
            return false;
        }

        if (Number(formData.hoursPerWeek) < 1) {
            setError('Hours per week must be at least 1');
            return false;
        }

        return true;
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (nameInputRef.current) nameInputRef.current.setCustomValidity('');
        if (codeInputRef.current) codeInputRef.current.setCustomValidity('');
        if (facultySelectRef.current) facultySelectRef.current.setCustomValidity('');

        if (!validateForm()) return;

        const submitData = {
            name: formData.name,
            code: formData.code,
            totalHours: Number(formData.totalHours),
            hoursPerWeek: Number(formData.hoursPerWeek),
            facultyId: formData.facultyId,
        };

        try {
            setError('');
            await subjectApi.createSubject(submitData);
            setIsCreateModalOpen(false);
            setFormData({ name: '', code: '', totalHours: 30, hoursPerWeek: 4, facultyId: 0 });
            await loadData();
        } catch (err: any) {
            console.error('Error creating subject:', err);
            setError(err.response?.data?.message || 'Failed to create subject');
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentSubject) return;

        if (nameInputRef.current) nameInputRef.current.setCustomValidity('');
        if (codeInputRef.current) codeInputRef.current.setCustomValidity('');
        if (facultySelectRef.current) facultySelectRef.current.setCustomValidity('');

        if (!validateForm()) return;

        const submitData = {
            name: formData.name,
            code: formData.code,
            totalHours: Number(formData.totalHours),
            hoursPerWeek: Number(formData.hoursPerWeek),
            facultyId: formData.facultyId,
        };

        try {
            setError('');
            await subjectApi.updateSubject(currentSubject.id, submitData);
            setIsEditModalOpen(false);
            setCurrentSubject(null);
            setFormData({ name: '', code: '', totalHours: 30, hoursPerWeek: 4, facultyId: 0 });
            loadData();
        } catch (err: any) {
            console.error('Error updating subject:', err);
            setError(err.response?.data?.message || 'Failed to update subject');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this subject?')) return;

        try {
            setError('');
            await subjectApi.deleteSubject(id);
            loadData();
        } catch (err: any) {
            console.error('Error deleting subject:', err);
            setError(err.response?.data?.message || 'Failed to delete subject. It may have associated assignments.');
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedSubjects.length === 0) return;

        if (!confirm(`Delete ${selectedSubjects.length} subjects?`)) return;

        try {
            setError('');

            const results = await Promise.allSettled(
                selectedSubjects.map(id => subjectApi.deleteSubject(id))
            );

            const failed = results.filter(r => r.status === 'rejected');

            if (failed.length > 0) {
                setError(`${failed.length} subjects could not be deleted`);
            }

            setSelectedSubjects([]);
            loadData();
        } catch {
            setError('Unexpected error while deleting');
        }
    };

    const handleEdit = (subject: SubjectResponse) => {
        setCurrentSubject(subject);
        setFormData({
            name: subject.name,
            code: subject.code,
            totalHours: subject.totalHours,
            hoursPerWeek: subject.hoursPerWeek,
            facultyId: subject.facultyId,
        });
        setIsEditModalOpen(true);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedSubjects(sortedSubjects.map(s => s.id));
        } else {
            setSelectedSubjects([]);
        }
    };

    const handleSelectSubject = (id: number) => {
        setSelectedSubjects(prev =>
            prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
        );
    };

    const handleCreateModalOpen = () => {
        setError('');
        setFormData({ name: '', code: '', totalHours: 30, hoursPerWeek: 4, facultyId: 0 });
        setIsCreateModalOpen(true);
    };

    const handleLogout = () => {
        logout();
        router.push('/login');
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
            {/* Header (unchanged) */}
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
                            <div className="ml-3 flex items-center space-x-4">
                                <h1 className="text-xl font-semibold text-gray-900">
                                    Subjects Management
                                </h1>
                                <button
                                    onClick={() => router.push('/home')}
                                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                                >
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Back to Home
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
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

            {/* Main Content */}
            <main className="pt-16 flex flex-col min-h-screen">
                {/* Fixed Top Panel (unchanged) */}
                <div className="bg-white border-b shadow-sm py-4 px-4 sm:px-6 lg:px-8 sticky top-16 z-40">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search subjects by name, code, faculty..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                {selectedSubjects.length > 0 && (
                                    <button
                                        onClick={handleDeleteSelected}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Delete Selected ({selectedSubjects.length})
                                    </button>
                                )}
                                <button
                                    onClick={handleCreateModalOpen}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create New Subject
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error Message (unchanged) */}
                {error && (
                    <div className="max-w-7xl mx-auto mt-4 px-4 sm:px-6 lg:px-8">
                        <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                                <div className="ml-auto pl-3">
                                    <button
                                        onClick={() => setError('')}
                                        className="text-red-700 hover:text-red-900"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Subjects List - redesigned with fixed header and scrollable rows */}
                <div className="flex-1">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-full">
                        {sortedSubjects.length === 0 ? (
                            <div className="text-center py-12 h-full flex flex-col items-center justify-center">
                                <div className="text-gray-400 mb-4 text-lg">No subjects found</div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full flex flex-col">
                                {/* Fixed Header */}
                                <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 flex-shrink-0">
                                    <div className="flex items-center">
                                        {/* Checkbox column - fixed width */}
                                        <div className="flex items-center w-12 pl-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedSubjects.length === sortedSubjects.length && sortedSubjects.length > 0}
                                                onChange={handleSelectAll}
                                                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                            />
                                        </div>
                                        {/* Grid for header columns */}
                                        <div className="grid grid-cols-12 flex-1 gap-2">
                                            <div
                                                className="col-span-3 text-sm font-medium text-gray-700 pl-2 cursor-pointer flex items-center hover:text-blue-600"
                                                onClick={() => handleSort('name')}
                                            >
                                                Name {getSortIcon('name')}
                                            </div>
                                            <div
                                                className="col-span-1 text-sm font-medium text-gray-700 cursor-pointer flex items-center hover:text-blue-600"
                                                onClick={() => handleSort('code')}
                                            >
                                                Code {getSortIcon('code')}
                                            </div>
                                            <div
                                                className="col-span-2 text-sm font-medium text-gray-700 text-center cursor-pointer flex items-center justify-center hover:text-blue-600"
                                                onClick={() => handleSort('totalHours')}
                                            >
                                                Total Hours {getSortIcon('totalHours')}
                                            </div>
                                            <div
                                                className="col-span-2 text-sm font-medium text-gray-700 text-center cursor-pointer flex items-center justify-center hover:text-blue-600"
                                                onClick={() => handleSort('hoursPerWeek')}
                                            >
                                                Hours Per Week {getSortIcon('hoursPerWeek')}
                                            </div>
                                            <div
                                                className="col-span-2 text-sm font-medium text-gray-700 cursor-pointer flex items-center hover:text-blue-600"
                                                onClick={() => handleSort('faculty')}
                                            >
                                                Faculty {getSortIcon('faculty')}
                                            </div>
                                            <div className="col-span-2 text-sm font-medium text-gray-700 text-right pr-4">
                                                Actions
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Scrollable Rows */}
                                {/*<div className="flex-1 overflow-y-auto custom-scrollbar">*/}
                                <div
                                    ref={listRef}
                                    className="flex-1 overflow-y-auto custom-scrollbar"
                                    style={{ maxHeight: 'calc(100vh - 230px)' }}
                                >
                                    {sortedSubjects.map((subject) => (
                                        <div key={subject.id} className="px-6 py-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                                            <div className="flex items-center">
                                                {/* Checkbox column - fixed width */}
                                                <div className="flex items-center w-12 pl-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSubjects.includes(subject.id)}
                                                        onChange={() => handleSelectSubject(subject.id)}
                                                        className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                    />
                                                </div>
                                                {/* Grid for row data */}
                                                <div className="grid grid-cols-12 flex-1 gap-2 items-center">
                                                    <div className="col-span-3 pl-2">
                                                        <div className="font-medium text-gray-900 truncate" title={subject.name}>
                                                            {subject.name}
                                                        </div>
                                                        <div className="text-sm text-gray-500">ID: {subject.id}</div>
                                                    </div>
                                                    <div className="col-span-1">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                            {subject.code}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-2 text-center">{subject.totalHours}</div>
                                                    <div className="col-span-2 text-center">{subject.hoursPerWeek}</div>
                                                    <div className="col-span-2 truncate" title={facultiesMap.get(subject.facultyId) || 'Unknown'}>
                                                        {facultiesMap.get(subject.facultyId) || 'Unknown'}
                                                    </div>
                                                    <div className="col-span-2 flex justify-end space-x-2 pr-4">
                                                        <button
                                                            onClick={() => handleEdit(subject)}
                                                            className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md flex items-center"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(subject.id)}
                                                            className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md flex items-center"
                                                        >
                                                            Delete
                                                        </button>
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

            <SubjectModal
                title="Create Subject"
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateSubmit}
                formData={formData}
                onChange={handleInputChange}
                faculties={faculties}
            />

            <SubjectModal
                title="Edit Subject"
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setCurrentSubject(null);
                }}
                onSubmit={handleEditSubmit}
                formData={formData}
                onChange={handleInputChange}
                faculties={faculties}
            />
        </ProtectedRoute>
    );
}