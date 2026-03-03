'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth, facultyApi, groupApi, DeleteMode, StudyGroupResponse } from '@/lib';

interface Faculty {
    id: number;
    name: string;
    shortName: string;
}

interface DeleteOption {
    id: number;
    name: string;
    groups: StudyGroupResponse[];
}

type SortField = 'name' | 'shortName';
type SortDirection = 'asc' | 'desc';

export default function FacultiesPage() {
    const router = useRouter();
    const { logout } = useAuth();
    const [faculties, setFaculties] = useState<Faculty[]>([]);
    const [filteredFaculties, setFilteredFaculties] = useState<Faculty[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFaculties, setSelectedFaculties] = useState<number[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentFaculty, setCurrentFaculty] = useState<Faculty | null>(null);
    const [deleteOption, setDeleteOption] = useState<DeleteOption | null>(null);
    const [selectedDeleteOption, setSelectedDeleteOption] = useState<'detach' | 'delete-all' | null>(null);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        shortName: '',
    });
    const [error, setError] = useState<string>('');

    // Sorting
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchFaculties();
    }, []);

    // Filter faculties
    useEffect(() => {
        const filtered = faculties.filter(faculty =>
            faculty.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faculty.shortName.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredFaculties(filtered);
        setSelectedFaculties([]);
    }, [searchQuery, faculties]);

    // Sort faculties
    const sortedFaculties = useMemo(() => {
        const sorted = [...filteredFaculties];
        sorted.sort((a, b) => {
            let aValue: string, bValue: string;
            if (sortField === 'name') {
                aValue = a.name.toLowerCase();
                bValue = b.name.toLowerCase();
            } else {
                aValue = a.shortName ? a.shortName.toLowerCase() : '';
                bValue = b.shortName ? b.shortName.toLowerCase() : '';
            }
            if (sortDirection === 'asc') {
                return aValue.localeCompare(bValue);
            } else {
                return bValue.localeCompare(aValue);
            }
        });
        return sorted;
    }, [filteredFaculties, sortField, sortDirection]);

    const fetchFaculties = async () => {
        try {
            setLoading(true);
            setError('');
            const data = await facultyApi.getFaculties();
            setFaculties(data);
            setFilteredFaculties(data);
        } catch (err: any) {
            console.error('Error fetching faculties:', err);
            setError('Failed to load faculties');
        } finally {
            setLoading(false);
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
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
            );
        } else {
            return (
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            );
        }
    };

    const fetchGroupsForFaculty = async (facultyId: number): Promise<StudyGroupResponse[]> => {
        try {
            setLoadingGroups(true);
            return await groupApi.getGroupsByFacultyId(facultyId);
        } catch (err: any) {
            console.error('Error fetching groups:', err);
            return [];
        } finally {
            setLoadingGroups(false);
        }
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setError('');
            await facultyApi.createFaculty(formData);
            setIsCreateModalOpen(false);
            setFormData({ name: '', shortName: '' });
            fetchFaculties();
        } catch (err: any) {
            console.error('Error creating faculty:', err);
            setError(err.response?.data?.message || 'Failed to create faculty');
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentFaculty) return;
        try {
            setError('');
            await facultyApi.updateFaculty(currentFaculty.id, formData);
            setIsEditModalOpen(false);
            setCurrentFaculty(null);
            setFormData({ name: '', shortName: '' });
            fetchFaculties();
        } catch (err: any) {
            console.error('Error updating faculty:', err);
            setError(err.response?.data?.message || 'Failed to update faculty');
        }
    };

    const handleDelete = async (faculty: Faculty) => {
        try {
            const groups = await fetchGroupsForFaculty(faculty.id);
            if (groups.length > 0) {
                setDeleteOption({
                    id: faculty.id,
                    name: faculty.name,
                    groups: groups
                });
                setSelectedDeleteOption(null);
                setIsDeleteModalOpen(true);
            } else {
                await facultyApi.deleteFaculty(faculty.id, "SIMPLE");
                fetchFaculties();
            }
        } catch (err: any) {
            console.error('Error checking faculty groups:', err);
            setError('Failed to check faculty groups');
        }
    };

    const confirmDeleteFaculty = async () => {
        if (!deleteOption || !selectedDeleteOption) return;
        try {
            setError('');
            let mode: DeleteMode;
            if (selectedDeleteOption === 'detach') {
                mode = "DETACH";
            } else if (selectedDeleteOption === 'delete-all') {
                mode = "WITH";
            } else {
                mode = "SIMPLE";
            }
            await facultyApi.deleteFaculty(deleteOption.id, mode);
            setIsDeleteModalOpen(false);
            setDeleteOption(null);
            setSelectedDeleteOption(null);
            fetchFaculties();
        } catch (err: any) {
            console.error('Error deleting faculty:', err);
            setError(err.response?.data?.message || 'Failed to delete faculty');
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedFaculties.length === 0) return;

        if (confirm(`Are you sure you want to delete ${selectedFaculties.length} selected faculties? Any associated groups and subjects will be detached (they will remain but without faculty).`)) {
            try {
                setError('');
                let failedCount = 0;
                const deletePromises = selectedFaculties.map(async (id) => {
                    try {
                        await facultyApi.deleteFaculty(id, "SIMPLE");
                    } catch (err) {
                        console.error(`Error deleting faculty ${id}:`, err);
                        failedCount++;
                    }
                });
                await Promise.all(deletePromises);

                if (failedCount > 0) {
                    setError(`${failedCount} faculty(s) could not be deleted.`);
                }
                setSelectedFaculties([]);
                fetchFaculties();
            } catch (err: any) {
                console.error('Error deleting selected faculties:', err);
                setError('Failed to delete some faculties.');
            }
        }
    };

    const handleEdit = (faculty: Faculty) => {
        setCurrentFaculty(faculty);
        setFormData({
            name: faculty.name,
            shortName: faculty.shortName || '',
        });
        setIsEditModalOpen(true);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedFaculties(sortedFaculties.map(f => f.id));
        } else {
            setSelectedFaculties([]);
        }
    };

    const handleSelectFaculty = (id: number) => {
        setSelectedFaculties(prev =>
            prev.includes(id)
                ? prev.filter(facultyId => facultyId !== id)
                : [...prev, id]
        );
    };

    const handleCreateModalOpen = () => {
        setError('');
        setFormData({ name: '', shortName: '' });
        setIsCreateModalOpen(true);
    };

    const handleLogout = () => {
        console.log('[Logout] Initiating logout...');
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
                                <h1 className="text-xl font-semibold text-gray-900">
                                    Faculties Management
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
                {/* Fixed Top Panel */}
                <div className="bg-white border-b shadow-sm py-4 px-4 sm:px-6 lg:px-8 sticky top-16 z-40">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search faculties by name or short name..."
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
                                {selectedFaculties.length > 0 && (
                                    <button
                                        onClick={handleDeleteSelected}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Delete Selected ({selectedFaculties.length})
                                    </button>
                                )}
                                <button
                                    onClick={handleCreateModalOpen}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create New Faculty
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

                {/* Faculties List */}
                <div className="flex-1">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-full">
                        {sortedFaculties.length === 0 ? (
                            <div className="text-center py-12 h-full flex flex-col items-center justify-center">
                                <div className="text-gray-400 mb-4 text-lg">No faculties found</div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full flex flex-col">
                                {/* Table Header */}
                                <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 flex-shrink-0">
                                    <div className="flex items-center">
                                        <div className="flex items-center w-12 pl-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedFaculties.length === sortedFaculties.length && sortedFaculties.length > 0}
                                                onChange={handleSelectAll}
                                                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                title="Select All"
                                            />
                                        </div>
                                        <div className="grid grid-cols-12 flex-1">
                                            <div
                                                className="col-span-6 text-sm font-medium text-gray-700 pl-2 cursor-pointer flex items-center hover:text-blue-600"
                                                onClick={() => handleSort('name')}
                                            >
                                                Name
                                                {getSortIcon('name')}
                                            </div>
                                            <div
                                                className="col-span-4 text-sm font-medium text-gray-700 cursor-pointer flex items-center hover:text-blue-600"
                                                onClick={() => handleSort('shortName')}
                                            >
                                                Short Name
                                                {getSortIcon('shortName')}
                                            </div>
                                            <div className="col-span-2 text-sm font-medium text-gray-700 text-right pr-4">Actions</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Scrollable List */}
                                <div
                                    ref={listRef}
                                    className="flex-1 overflow-y-auto custom-scrollbar"
                                    style={{ maxHeight: 'calc(100vh - 230px)' }}
                                >
                                    {sortedFaculties.map((faculty) => (
                                        <div key={faculty.id} className="px-6 py-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                                            <div className="flex items-center">
                                                <div className="flex items-center w-12 pl-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedFaculties.includes(faculty.id)}
                                                        onChange={() => handleSelectFaculty(faculty.id)}
                                                        className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-12 flex-1 items-center">
                                                    <div className="col-span-6 pl-2">
                                                        <div className="font-medium text-gray-900 truncate" title={faculty.name}>
                                                            {faculty.name}
                                                        </div>
                                                        <div className="text-sm text-gray-500">ID: {faculty.id}</div>
                                                    </div>
                                                    <div className="col-span-4">
                                                        {faculty.shortName ? (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                {faculty.shortName}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 text-sm">Not set</span>
                                                        )}
                                                    </div>
                                                    <div className="col-span-2 flex justify-end space-x-2 pr-4">
                                                        <button
                                                            onClick={() => handleEdit(faculty)}
                                                            className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md flex items-center"
                                                        >
                                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(faculty)}
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

            {/* Create Faculty Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">Create New Faculty</h3>
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
                                            Faculty Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            required
                                            placeholder="Enter faculty name"
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Short Name (optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.shortName}
                                            onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            placeholder="Enter short name"
                                            maxLength={10}
                                        />
                                        <p className="mt-1 text-xs text-gray-500">
                                            Maximum 10 characters
                                        </p>
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
                                        Create Faculty
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Faculty Modal */}
            {isEditModalOpen && currentFaculty && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">Edit Faculty</h3>
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
                                            Faculty Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            required
                                            placeholder="Enter faculty name"
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Short Name (optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.shortName}
                                            onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            placeholder="Enter short name"
                                            maxLength={10}
                                        />
                                        <p className="mt-1 text-xs text-gray-500">
                                            Maximum 10 characters
                                        </p>
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

            {/* Delete Mode Selection Modal */}
            {isDeleteModalOpen && deleteOption && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl transform transition-all">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Delete Faculty</h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        "{deleteOption.name}" has {deleteOption.groups.length} associated study group(s)
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
                                {/* Option 1: Detach groups */}
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
                                            <h4 className="font-medium text-gray-900">Detach groups and delete faculty</h4>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Keep study groups but remove their faculty association. Groups will become "No Faculty".
                                            </p>
                                            <div className="mt-3">
                                                <div className="text-xs text-gray-400">Affected groups:</div>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {deleteOption.groups.slice(0, 5).map(group => (
                                                        <span key={group.id} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                                            {group.name}
                                                        </span>
                                                    ))}
                                                    {deleteOption.groups.length > 5 && (
                                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                                            +{deleteOption.groups.length - 5} more
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Option 2: Delete with groups */}
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
                                            <h4 className="font-medium text-gray-900">Delete faculty with all groups</h4>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Permanently delete the faculty and all {deleteOption.groups.length} associated study groups.
                                                <span className="text-red-600 font-medium ml-1">This action cannot be undone.</span>
                                            </p>
                                            <div className="mt-3">
                                                <div className="text-xs text-gray-400">Groups to be deleted:</div>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {deleteOption.groups.slice(0, 5).map(group => (
                                                        <span key={group.id} className="px-2 py-1 bg-red-50 text-red-600 text-xs rounded border border-red-100">
                                                            {group.name} ({group.studentCount} students)
                                                        </span>
                                                    ))}
                                                    {deleteOption.groups.length > 5 && (
                                                        <span className="px-2 py-1 bg-red-50 text-red-600 text-xs rounded border border-red-100">
                                                            +{deleteOption.groups.length - 5} more groups
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Warning message for delete all */}
                                {selectedDeleteOption === 'delete-all' && deleteOption.groups.length > 0 && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <div className="flex items-center">
                                            <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                            <span className="text-sm text-red-700">
                                                This will permanently delete {deleteOption.groups.length} study group(s) and all associated data.
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 flex justify-between items-center">
                                <div>
                                    {loadingGroups && (
                                        <div className="flex items-center text-sm text-gray-500">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
                                            Loading groups...
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
                                        onClick={confirmDeleteFaculty}
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