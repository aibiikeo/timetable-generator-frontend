'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth, teacherApi, TeacherResponse, AssignmentResponse, DeleteMode } from '@/lib';

type SortField = 'fullName';
type SortDirection = 'asc' | 'desc';

interface DeleteOption {
    id: number;
    name: string;
    assignments: AssignmentResponse[];
}

export default function TeachersPage() {
    const router = useRouter();
    const { logout } = useAuth();
    const [teachers, setTeachers] = useState<TeacherResponse[]>([]);
    const [filteredTeachers, setFilteredTeachers] = useState<TeacherResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTeachers, setSelectedTeachers] = useState<number[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentTeacher, setCurrentTeacher] = useState<TeacherResponse | null>(null);
    const [deleteOption, setDeleteOption] = useState<DeleteOption | null>(null);
    const [selectedDeleteOption, setSelectedDeleteOption] = useState<'detach' | 'delete-all' | null>(null);
    const [loadingAssignments, setLoadingAssignments] = useState(false);
    const [formData, setFormData] = useState({ fullName: '' });
    const [error, setError] = useState('');

    // Sorting
    const [sortField, setSortField] = useState<SortField>('fullName');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchTeachers();
    }, []);

    // Filter teachers
    useEffect(() => {
        const filtered = teachers.filter(teacher =>
            teacher.fullName.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredTeachers(filtered);
        setSelectedTeachers([]);
    }, [searchQuery, teachers]);

    // Sort teachers
    const sortedTeachers = useMemo(() => {
        const sorted = [...filteredTeachers];
        sorted.sort((a, b) => {
            const aValue = a.fullName.toLowerCase();
            const bValue = b.fullName.toLowerCase();

            if (sortDirection === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });
        return sorted;
    }, [filteredTeachers, sortField, sortDirection]);

    const fetchTeachers = async () => {
        try {
            setLoading(true);
            setError('');
            const data = await teacherApi.getTeachers();
            setTeachers(data);
            setFilteredTeachers(data);
        } catch (err: any) {
            console.error('Error fetching teachers:', err);
            setError('Failed to load teachers');
        } finally {
            setLoading(false);
        }
    };

    const fetchAssignmentsForTeacher = async (teacherId: number): Promise<AssignmentResponse[]> => {
        try {
            setLoadingAssignments(true);
            return await teacherApi.getAssignmentsByTeacherId(teacherId);
        } catch (err: any) {
            console.error('Error fetching assignments:', err);
            return [];
        } finally {
            setLoadingAssignments(false);
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
        return sortDirection === 'asc' ? (
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
        ) : (
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        );
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setError('');
            await teacherApi.createTeacher(formData);
            setIsCreateModalOpen(false);
            setFormData({ fullName: '' });
            fetchTeachers();
        } catch (err: any) {
            console.error('Error creating teacher:', err);
            setError(err.response?.data?.message || 'Failed to create teacher');
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentTeacher) return;
        try {
            setError('');
            await teacherApi.updateTeacher(currentTeacher.id, formData);
            setIsEditModalOpen(false);
            setCurrentTeacher(null);
            setFormData({ fullName: '' });
            fetchTeachers();
        } catch (err: any) {
            console.error('Error updating teacher:', err);
            setError(err.response?.data?.message || 'Failed to update teacher');
        }
    };

    const handleDelete = async (teacher: TeacherResponse) => {
        try {
            setError('');
            const assignments = await fetchAssignmentsForTeacher(teacher.id);
            if (assignments.length > 0) {
                setDeleteOption({
                    id: teacher.id,
                    name: teacher.fullName,
                    assignments: assignments
                });
                setSelectedDeleteOption(null);
                setIsDeleteModalOpen(true);
            } else {
                if (confirm(`Are you sure you want to delete teacher "${teacher.fullName}"?`)) {
                    await teacherApi.deleteTeacher(teacher.id, 'SIMPLE');
                    fetchTeachers();
                }
            }
        } catch (err: any) {
            console.error('Error checking assignments:', err);
            setError('Failed to check teacher assignments');
        }
    };

    const confirmDeleteTeacherWithMode = async () => {
        if (!deleteOption || !selectedDeleteOption) return;
        try {
            setError('');
            let mode: DeleteMode;
            if (selectedDeleteOption === 'detach') {
                mode = "DETACH";
            } else {
                mode = "WITH";
            }
            await teacherApi.deleteTeacher(deleteOption.id, mode);
            setIsDeleteModalOpen(false);
            setDeleteOption(null);
            setSelectedDeleteOption(null);
            fetchTeachers();
        } catch (err: any) {
            console.error('Error deleting teacher:', err);
            setError(err.response?.data?.message || 'Failed to delete teacher');
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedTeachers.length === 0) return;

        if (confirm(`Are you sure you want to delete ${selectedTeachers.length} selected teachers? Any associated assignments and lessons will be detached (they will remain but without teacher).`)) {
            try {
                setError('');
                let failedCount = 0;
                const deletePromises = selectedTeachers.map(async (id) => {
                    try {
                        await teacherApi.deleteTeacher(id, 'SIMPLE');
                    } catch (err) {
                        console.error(`Error deleting teacher ${id}:`, err);
                        failedCount++;
                    }
                });
                await Promise.all(deletePromises);

                if (failedCount > 0) {
                    setError(`${failedCount} teacher(s) could not be deleted.`);
                }
                setSelectedTeachers([]);
                fetchTeachers();
            } catch (err: any) {
                console.error('Error deleting selected teachers:', err);
                setError('Failed to delete some teachers.');
            }
        }
    };

    const handleEdit = (teacher: TeacherResponse) => {
        setCurrentTeacher(teacher);
        setFormData({ fullName: teacher.fullName });
        setIsEditModalOpen(true);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedTeachers(sortedTeachers.map(t => t.id));
        } else {
            setSelectedTeachers([]);
        }
    };

    const handleSelectTeacher = (id: number) => {
        setSelectedTeachers(prev =>
            prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
        );
    };

    const handleCreateModalOpen = () => {
        setError('');
        setFormData({ fullName: '' });
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
            {/* Header */}
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
                                <h1 className="text-xl font-semibold text-gray-900">Teachers Management</h1>
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
                {/* Fixed Top Panel */}
                <div className="bg-white border-b shadow-sm py-4 px-4 sm:px-6 lg:px-8 sticky top-16 z-40">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search teachers by name..."
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
                                {selectedTeachers.length > 0 && (
                                    <button
                                        onClick={handleDeleteSelected}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Delete Selected ({selectedTeachers.length})
                                    </button>
                                )}
                                <button
                                    onClick={handleCreateModalOpen}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create New Teacher
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
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

                {/* Teachers List */}
                <div className="flex-1">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-full">
                        {sortedTeachers.length === 0 ? (
                            <div className="text-center py-12 h-full flex flex-col items-center justify-center">
                                <div className="text-gray-400 mb-4 text-lg">No teachers found</div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full flex flex-col">
                                {/* Table Header */}
                                <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 flex-shrink-0">
                                    <div className="flex items-center">
                                        <div className="flex items-center w-12 pl-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedTeachers.length === sortedTeachers.length && sortedTeachers.length > 0}
                                                onChange={handleSelectAll}
                                                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                title="Select All"
                                            />
                                        </div>
                                        <div className="flex flex-1 items-center">
                                            <div
                                                className="flex-1 pl-2 text-sm font-medium text-gray-700 cursor-pointer flex items-center hover:text-blue-600"
                                                onClick={() => handleSort('fullName')}
                                            >
                                                Full Name
                                                {getSortIcon('fullName')}
                                            </div>
                                            <div className="text-sm font-medium text-gray-700 text-right pr-4" style={{ width: '160px' }}>Actions</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Scrollable List */}
                                <div
                                    ref={listRef}
                                    className="flex-1 overflow-y-auto custom-scrollbar"
                                    style={{ maxHeight: 'calc(100vh - 230px)' }}
                                >
                                    {sortedTeachers.map((teacher) => (
                                        <div key={teacher.id} className="px-6 py-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                                            <div className="flex items-center">
                                                <div className="flex items-center w-12 pl-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedTeachers.includes(teacher.id)}
                                                        onChange={() => handleSelectTeacher(teacher.id)}
                                                        className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                    />
                                                </div>
                                                <div className="flex flex-1 items-center min-w-0">
                                                    <div className="flex-1 min-w-0 pl-2">
                                                        <div className="font-medium text-gray-900 truncate" title={teacher.fullName}>
                                                            {teacher.fullName}
                                                        </div>
                                                        <div className="text-sm text-gray-500">ID: {teacher.id}</div>
                                                    </div>
                                                    <div className="flex items-center space-x-2 pr-4 flex-shrink-0" style={{ width: '160px' }}>
                                                        <button
                                                            onClick={() => handleEdit(teacher)}
                                                            className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md flex items-center"
                                                        >
                                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(teacher)}
                                                            className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md flex items-center"
                                                        >
                                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
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

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">Create New Teacher</h3>
                                <button
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="text-gray-400 hover:text-gray-500 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <form onSubmit={handleCreateSubmit}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Full Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({ fullName: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            required
                                            placeholder="Enter teacher's full name"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="mt-8 flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateModalOpen(false)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Create Teacher
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && currentTeacher && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">Edit Teacher</h3>
                                <button
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="text-gray-400 hover:text-gray-500 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <form onSubmit={handleEditSubmit}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Full Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({ fullName: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            required
                                            placeholder="Enter teacher's full name"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="mt-8 flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Mode Modal */}
            {isDeleteModalOpen && deleteOption && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl transform transition-all">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Delete Teacher</h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        "{deleteOption.name}" has {deleteOption.assignments.length} associated assignment(s)
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsDeleteModalOpen(false);
                                        setDeleteOption(null);
                                        setSelectedDeleteOption(null);
                                    }}
                                    className="text-gray-400 hover:text-gray-500 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Option 1: Detach assignments */}
                                <div
                                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer"
                                    onClick={() => setSelectedDeleteOption('detach')}
                                >
                                    <div className="flex items-center">
                                        <div className={`flex-shrink-0 h-5 w-5 rounded-full border-2 ${selectedDeleteOption === 'detach' ? 'border-blue-600 bg-blue-600' : 'border-gray-300'} flex items-center justify-center mr-3`}>
                                            {selectedDeleteOption === 'detach' && (
                                                <div className="h-2 w-2 rounded-full bg-white"></div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-medium text-gray-900">Detach assignments and delete teacher</h4>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Keep assignments but remove the teacher association. Assignments will become "No Teacher".
                                            </p>
                                            <div className="mt-3">
                                                <div className="text-xs text-gray-400">Affected assignments:</div>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {deleteOption.assignments.slice(0, 5).map(assignment => (
                                                        <span key={assignment.id} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                                            {assignment.subjectName} (ID: {assignment.id})
                                                        </span>
                                                    ))}
                                                    {deleteOption.assignments.length > 5 && (
                                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                                            +{deleteOption.assignments.length - 5} more
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Option 2: Delete with assignments */}
                                <div
                                    className="border border-gray-200 rounded-lg p-4 hover:border-red-300 cursor-pointer"
                                    onClick={() => setSelectedDeleteOption('delete-all')}
                                >
                                    <div className="flex items-center">
                                        <div className={`flex-shrink-0 h-5 w-5 rounded-full border-2 ${selectedDeleteOption === 'delete-all' ? 'border-red-600 bg-red-600' : 'border-gray-300'} flex items-center justify-center mr-3`}>
                                            {selectedDeleteOption === 'delete-all' && (
                                                <div className="h-2 w-2 rounded-full bg-white"></div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-medium text-gray-900">Delete teacher with all assignments</h4>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Permanently delete the teacher and all {deleteOption.assignments.length} associated assignments.
                                                <span className="text-red-600 font-medium ml-1">This action cannot be undone.</span>
                                            </p>
                                            <div className="mt-3">
                                                <div className="text-xs text-gray-400">Assignments to be deleted:</div>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {deleteOption.assignments.slice(0, 5).map(assignment => (
                                                        <span key={assignment.id} className="px-2 py-1 bg-red-50 text-red-600 text-xs rounded border border-red-100">
                                                            {assignment.subjectName} (ID: {assignment.id})
                                                        </span>
                                                    ))}
                                                    {deleteOption.assignments.length > 5 && (
                                                        <span className="px-2 py-1 bg-red-50 text-red-600 text-xs rounded border border-red-100">
                                                            +{deleteOption.assignments.length - 5} more assignments
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Warning message for delete all */}
                                {selectedDeleteOption === 'delete-all' && deleteOption.assignments.length > 0 && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <div className="flex items-center">
                                            <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                            <span className="text-sm text-red-700">
                                                This will permanently delete {deleteOption.assignments.length} assignment(s) and all associated lessons.
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 flex justify-between items-center">
                                <div>
                                    {loadingAssignments && (
                                        <div className="flex items-center text-sm text-gray-500">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
                                            Loading assignments...
                                        </div>
                                    )}
                                </div>
                                <div className="flex space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsDeleteModalOpen(false);
                                            setDeleteOption(null);
                                            setSelectedDeleteOption(null);
                                        }}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={confirmDeleteTeacherWithMode}
                                        disabled={!selectedDeleteOption}
                                        className={`px-4 py-2 text-white rounded-lg transition-colors ${
                                            selectedDeleteOption === 'delete-all'
                                                ? 'bg-red-600 hover:bg-red-700'
                                                : 'bg-blue-600 hover:bg-blue-700'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {selectedDeleteOption === 'delete-all' ? 'Delete All' : 'Confirm Delete'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </ProtectedRoute>
    );
}