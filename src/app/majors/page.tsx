'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth, majorApi, departmentApi } from '@/lib';
import { MajorResponse, Degree } from '@/lib/types';

interface DepartmentResponse {
    id: number;
    name: string;
}

type SortField = 'name' | 'shortName' | 'degree' | 'department';
type SortDirection = 'asc' | 'desc';

export default function MajorsPage() {
    const router = useRouter();
    const { logout } = useAuth();

    const [majors, setMajors] = useState<MajorResponse[]>([]);
    const [filteredMajors, setFilteredMajors] = useState<MajorResponse[]>([]);
    const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMajors, setSelectedMajors] = useState<number[]>([]);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [currentMajor, setCurrentMajor] = useState<MajorResponse | null>(null);

    const [formData, setFormData] = useState<{
        name: string;
        shortName: string;
        degree: Degree | '';
        departmentId: number;
    }>({
        name: '',
        shortName: '',
        degree: '',
        departmentId: 0,
    });

    const [error, setError] = useState<string>('');

    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    const listRef = useRef<HTMLDivElement>(null);

    const degreeOptions: Degree[] = ['BACHELOR', 'MASTER', 'SPECIALIST'];

    const departmentMap = useMemo(() => {
        const map = new Map<number, string>();
        departments.forEach(d => map.set(d.id, d.name));
        return map;
    }, [departments]);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const lower = searchQuery.toLowerCase();

        const filtered = majors.filter(major =>
            major.name.toLowerCase().includes(lower) ||
            (major.shortName ?? '').toLowerCase().includes(lower) ||
            major.degree.toLowerCase().includes(lower) ||
            (departmentMap.get(major.departmentId) || '').toLowerCase().includes(lower)
        );

        setFilteredMajors(filtered);
        setSelectedMajors([]);
    }, [searchQuery, majors, departmentMap]);

    const sortedMajors = useMemo(() => {
        const sorted = [...filteredMajors];

        sorted.sort((a, b) => {
            let aVal = '';
            let bVal = '';

            switch (sortField) {
                case 'name':
                    aVal = a.name.toLowerCase();
                    bVal = b.name.toLowerCase();
                    break;
                case 'shortName':
                    aVal = (a.shortName ?? '').toLowerCase();
                    bVal = (b.shortName ?? '').toLowerCase();
                    break;
                case 'degree':
                    aVal = a.degree.toLowerCase();
                    bVal = b.degree.toLowerCase();
                    break;
                case 'department':
                    aVal = (departmentMap.get(a.departmentId) || '').toLowerCase();
                    bVal = (departmentMap.get(b.departmentId) || '').toLowerCase();
                    break;
            }

            return sortDirection === 'asc'
                ? aVal.localeCompare(bVal)
                : bVal.localeCompare(aVal);
        });

        return sorted;
    }, [filteredMajors, sortField, sortDirection, departmentMap]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError('');

            const [majorsData, departmentsData] = await Promise.all([
                majorApi.getMajors(),
                departmentApi.getDepartments(),
            ]);

            setMajors(majorsData);
            setFilteredMajors(majorsData);
            setDepartments(departmentsData);
        } catch (err: any) {
            console.error('Error fetching data:', err);
            setError('Failed to load majors');
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
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
        }

        return (
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        );
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.departmentId) {
            setError('Please select a department');
            return;
        }

        if (!formData.degree) {
            setError('Please select a degree');
            return;
        }

        try {
            setError('');

            await majorApi.createMajor({
                name: formData.name,
                shortName: formData.shortName.trim() || undefined,
                degree: formData.degree,
                departmentId: formData.departmentId,
            });

            setIsCreateModalOpen(false);
            setFormData({
                name: '',
                shortName: '',
                degree: '',
                departmentId: 0,
            });

            fetchData();
        } catch (err: any) {
            console.error('Error creating major:', err);
            setError(err.response?.data?.message || 'Failed to create major');
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentMajor) return;

        if (!formData.departmentId) {
            setError('Please select a department');
            return;
        }

        if (!formData.degree) {
            setError('Please select a degree');
            return;
        }

        try {
            setError('');

            await majorApi.updateMajor(currentMajor.id, {
                name: formData.name,
                shortName: formData.shortName.trim() || undefined,
                degree: formData.degree,
                departmentId: formData.departmentId,
            });

            setIsEditModalOpen(false);
            setCurrentMajor(null);
            setFormData({
                name: '',
                shortName: '',
                degree: '',
                departmentId: 0,
            });

            fetchData();
        } catch (err: any) {
            console.error('Error updating major:', err);
            setError(err.response?.data?.message || 'Failed to update major');
        }
    };

    const handleDelete = async (major: MajorResponse) => {
        if (!confirm(`Delete major "${major.name}"?`)) return;

        try {
            setError('');
            await majorApi.deleteMajor(major.id);
            fetchData();
        } catch (err: any) {
            console.error('Error deleting major:', err);
            setError(err.response?.data?.message || 'Failed to delete major');
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedMajors.length === 0) return;

        if (confirm(`Delete ${selectedMajors.length} selected majors?`)) {
            try {
                setError('');
                let failedCount = 0;

                await Promise.all(
                    selectedMajors.map(async (id) => {
                        try {
                            await majorApi.deleteMajor(id);
                        } catch {
                            failedCount++;
                        }
                    })
                );

                if (failedCount > 0) {
                    setError(`${failedCount} major(s) could not be deleted.`);
                }

                setSelectedMajors([]);
                fetchData();
            } catch {
                setError('Failed to delete some majors.');
            }
        }
    };

    const handleEdit = (major: MajorResponse) => {
        setCurrentMajor(major);
        setFormData({
            name: major.name,
            shortName: major.shortName ?? '',
            degree: major.degree,
            departmentId: major.departmentId,
        });
        setIsEditModalOpen(true);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedMajors(e.target.checked ? sortedMajors.map(m => m.id) : []);
    };

    const handleSelectMajor = (id: number) => {
        setSelectedMajors(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleCreateModalOpen = () => {
        setError('');
        setFormData({
            name: '',
            shortName: '',
            degree: '',
            departmentId: 0,
        });
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
                                    Majors Management
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

            <main className="pt-16 flex flex-col min-h-screen">
                <div className="bg-white border-b shadow-sm py-4 px-4 sm:px-6 lg:px-8 sticky top-16 z-40">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search by major, short name, degree, or department..."
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
                                {selectedMajors.length > 0 && (
                                    <button
                                        onClick={handleDeleteSelected}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Delete Selected ({selectedMajors.length})
                                    </button>
                                )}

                                <button
                                    onClick={handleCreateModalOpen}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create New Major
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

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

                <div className="flex-1">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-full">
                        {sortedMajors.length === 0 ? (
                            <div className="text-center py-12 h-full flex flex-col items-center justify-center">
                                <div className="text-gray-400 mb-4 text-lg">No majors found</div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full flex flex-col">
                                <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 flex-shrink-0">
                                    <div className="flex items-center">
                                        <div className="flex items-center w-12 pl-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedMajors.length === sortedMajors.length && sortedMajors.length > 0}
                                                onChange={handleSelectAll}
                                                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                title="Select All"
                                            />
                                        </div>

                                        <div className="grid grid-cols-12 flex-1 gap-3">
                                            <div
                                                className="col-span-3 text-sm font-medium text-gray-700 pl-2 cursor-pointer flex items-center hover:text-blue-600"
                                                onClick={() => handleSort('name')}
                                            >
                                                Name
                                                {getSortIcon('name')}
                                            </div>

                                            <div
                                                className="col-span-2 text-sm font-medium text-gray-700 cursor-pointer flex items-center hover:text-blue-600"
                                                onClick={() => handleSort('shortName')}
                                            >
                                                Short Name
                                                {getSortIcon('shortName')}
                                            </div>

                                            <div
                                                className="col-span-2 text-sm font-medium text-gray-700 cursor-pointer flex items-center hover:text-blue-600"
                                                onClick={() => handleSort('degree')}
                                            >
                                                Degree
                                                {getSortIcon('degree')}
                                            </div>

                                            <div
                                                className="col-span-3 text-sm font-medium text-gray-700 cursor-pointer flex items-center hover:text-blue-600"
                                                onClick={() => handleSort('department')}
                                            >
                                                Department
                                                {getSortIcon('department')}
                                            </div>

                                            <div className="col-span-2 text-sm font-medium text-gray-700 text-right pr-4">
                                                Actions
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    ref={listRef}
                                    className="flex-1 overflow-y-auto custom-scrollbar"
                                    style={{ maxHeight: 'calc(100vh - 230px)' }}
                                >
                                    {sortedMajors.map((major) => (
                                        <div
                                            key={major.id}
                                            className="px-6 py-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                                        >
                                            <div className="flex items-center">
                                                <div className="flex items-center w-12 pl-2 self-start pt-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedMajors.includes(major.id)}
                                                        onChange={() => handleSelectMajor(major.id)}
                                                        className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-12 flex-1 gap-3 items-start">
                                                    <div className="col-span-3 pl-2 min-w-0">
                                                        <div className="font-medium text-gray-900 whitespace-normal break-words">
                                                            {major.name}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            ID: {major.id}
                                                        </div>
                                                    </div>

                                                    <div className="col-span-2 min-w-0">
                                                        <div className="text-sm text-gray-700 whitespace-normal break-words">
                                                            {major.shortName ?? '—'}
                                                        </div>
                                                    </div>

                                                    <div className="col-span-2 min-w-0">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 whitespace-normal break-words">
                                                            {major.degree}
                                                        </span>
                                                    </div>

                                                    <div className="col-span-3 min-w-0">
                                                        <div className="text-sm text-gray-700 whitespace-normal break-words">
                                                            {departmentMap.get(major.departmentId) || 'Unknown Department'}
                                                        </div>
                                                    </div>

                                                    <div className="col-span-2 flex justify-end space-x-2 pr-4">
                                                        <button
                                                            onClick={() => handleEdit(major)}
                                                            className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md flex items-center shrink-0"
                                                        >
                                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                            Edit
                                                        </button>

                                                        <button
                                                            onClick={() => handleDelete(major)}
                                                            className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md flex items-center shrink-0"
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

            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">Create New Major</h3>
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
                                            Major Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            required
                                            placeholder="Enter major name"
                                            autoFocus
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Short Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.shortName}
                                            onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            placeholder="Enter short name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Degree *
                                        </label>
                                        <select
                                            value={formData.degree}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    degree: e.target.value === '' ? '' : (e.target.value as Degree),
                                                })
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            required
                                        >
                                            <option value="">Select degree</option>
                                            {degreeOptions.map(option => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Department *
                                        </label>
                                        <select
                                            value={formData.departmentId}
                                            onChange={(e) => setFormData({ ...formData, departmentId: Number(e.target.value) })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            required
                                        >
                                            <option value={0}>Select department</option>
                                            {departments.map(d => (
                                                <option key={d.id} value={d.id}>
                                                    {d.name}
                                                </option>
                                            ))}
                                        </select>
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
                                        Create Major
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {isEditModalOpen && currentMajor && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">Edit Major</h3>
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
                                            Major Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            required
                                            placeholder="Enter major name"
                                            autoFocus
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Short Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.shortName}
                                            onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            placeholder="Enter short name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Degree *
                                        </label>
                                        <select
                                            value={formData.degree}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    degree: e.target.value === '' ? '' : (e.target.value as Degree),
                                                })
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            required
                                        >
                                            <option value="">Select degree</option>
                                            {degreeOptions.map(option => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Department *
                                        </label>
                                        <select
                                            value={formData.departmentId}
                                            onChange={(e) => setFormData({ ...formData, departmentId: Number(e.target.value) })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            required
                                        >
                                            <option value={0}>Select department</option>
                                            {departments.map(d => (
                                                <option key={d.id} value={d.id}>
                                                    {d.name}
                                                </option>
                                            ))}
                                        </select>
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
        </ProtectedRoute>
    );
}