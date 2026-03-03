'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth, timetableApi } from '@/lib';
import { TimetableResponse, TimetableStatus, GenerationMode } from '@/lib/types';
import GenerateOptionsModal from '@/components/GenerateOptionsModal';
import ExportModal from '@/components/ExportModal';

type SortField = 'name' | 'createdAt' | 'status';
type SortDirection = 'asc' | 'desc';

export default function TimetablesPage() {
    const router = useRouter();
    const { logout } = useAuth();
    const [timetables, setTimetables] = useState<TimetableResponse[]>([]);
    const [filtered, setFiltered] = useState<TimetableResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selected, setSelected] = useState<number[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [selectedTimetable, setSelectedTimetable] = useState<TimetableResponse | null>(null);
    const [newTimetableName, setNewTimetableName] = useState('');
    const [error, setError] = useState('');
    const [generatingId, setGeneratingId] = useState<number | null>(null);

    const [sortField, setSortField] = useState<SortField>('createdAt');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchTimetables();
    }, []);

    useEffect(() => {
        const lower = searchQuery.toLowerCase();
        const f = timetables.filter(tt =>
            tt.name.toLowerCase().includes(lower) ||
            tt.status.toLowerCase().includes(lower)
        );
        setFiltered(f);
        setSelected([]);
    }, [searchQuery, timetables]);

    const sorted = useMemo(() => {
        const arr = [...filtered];
        arr.sort((a, b) => {
            const dir = sortDirection === 'asc' ? 1 : -1;
            if (sortField === 'name') return a.name.localeCompare(b.name) * dir;
            if (sortField === 'createdAt') return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
            if (sortField === 'status') return a.status.localeCompare(b.status) * dir;
            return 0;
        });
        return arr;
    }, [filtered, sortField, sortDirection]);

    const fetchTimetables = async () => {
        try {
            setLoading(true);
            setError('');
            const data = await timetableApi.getAllTimetables();
            setTimetables(data);
            setFiltered(data);
        } catch (err: any) {
            console.error('Error fetching timetables:', err);
            setError('Failed to load timetables');
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

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTimetableName.trim()) {
            setError('Name is required');
            return;
        }
        try {
            setError('');
            await timetableApi.createTimetable({
                name: newTimetableName,
                assignments: [],
                generationSettings: {}
            });
            setIsCreateModalOpen(false);
            setNewTimetableName('');
            fetchTimetables();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create timetable');
        }
    };

    const handleGenerateClick = (tt: TimetableResponse) => {
        setSelectedTimetable(tt);
        setIsGenerateModalOpen(true);
    };

    const handleGenerate = async (mode: GenerationMode) => {
        if (!selectedTimetable) return;
        setGeneratingId(selectedTimetable.id);
        try {
            const result = await timetableApi.generateTimetable(selectedTimetable.id, mode);
            alert(`Generated ${result.placedLessonsCount} lessons. Failed: ${result.failedVerticesCount}`);
            fetchTimetables();
        } catch (err: any) {
            alert('Generation failed');
        } finally {
            setGeneratingId(null);
            setIsGenerateModalOpen(false);
            setSelectedTimetable(null);
        }
    };

    const handlePublish = async (id: number) => {
        if (!confirm('Publish this timetable?')) return;
        try {
            await timetableApi.publishTimetable(id);
            fetchTimetables();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to publish');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this timetable?')) return;
        try {
            await timetableApi.deleteTimetable(id);
            fetchTimetables();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete');
        }
    };

    const handleExportClick = (tt: TimetableResponse) => {
        setSelectedTimetable(tt);
        setIsExportModalOpen(true);
    };

    const handleExport = async (format: 'pdf' | 'excel') => {
        if (!selectedTimetable) return;
        // Здесь можно вызвать API экспорта, если бэкенд поддерживает
        alert(`Export to ${format} for timetable "${selectedTimetable.name}" (not implemented yet)`);
        setIsExportModalOpen(false);
        setSelectedTimetable(null);
    };

    const handleDeleteSelected = async () => {
        if (selected.length === 0) return;
        if (!confirm(`Delete ${selected.length} timetables?`)) return;
        try {
            await Promise.all(selected.map(id => timetableApi.deleteTimetable(id)));
            setSelected([]);
            fetchTimetables();
        } catch (err: any) {
            setError('Failed to delete some timetables');
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelected(e.target.checked ? sorted.map(tt => tt.id) : []);
    };

    const handleSelect = (id: number) => {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    const getStatusColor = (status: TimetableStatus) => {
        switch (status) {
            case 'DRAFT': return 'bg-gray-100 text-gray-800';
            case 'GENERATED': return 'bg-green-100 text-green-800';
            case 'PARTIAL': return 'bg-yellow-100 text-yellow-800';
            case 'PUBLISHED': return 'bg-blue-100 text-blue-800';
            case 'ARCHIVED': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
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
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <img src="/logo_aiu.png" alt="Logo" className="h-8 w-auto" />
                            </div>
                            <h1 className="ml-3 text-xl font-semibold text-gray-900">Timetables Management</h1>
                            <button onClick={() => router.push('/home')} className="ml-4 text-sm text-blue-600 hover:text-blue-800 flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                Back to Home
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
                                <input type="text" placeholder="Search timetables..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                       className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <div className="flex items-center space-x-4">
                                {selected.length > 0 && (
                                    <button onClick={handleDeleteSelected} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center">
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        Delete Selected ({selected.length})
                                    </button>
                                )}
                                <button onClick={() => setIsCreateModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    Create New Timetable
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
                        {sorted.length === 0 ? (
                            <div className="text-center py-12 text-gray-400 text-lg">No timetables found</div>
                        ) : (
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full flex flex-col">
                                <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 flex-shrink-0">
                                    <div className="flex items-center">
                                        <div className="flex items-center w-12 pl-2">
                                            <input type="checkbox" checked={selected.length === sorted.length && sorted.length > 0} onChange={handleSelectAll} className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer" />
                                        </div>
                                        <div className="grid grid-cols-10 flex-1 gap-2">
                                            <div className="col-span-3 pl-2 text-sm font-medium text-gray-700 cursor-pointer flex items-center hover:text-blue-600" onClick={() => handleSort('name')}>
                                                Name {getSortIcon('name')}
                                            </div>
                                            <div className="col-span-2 text-sm font-medium text-gray-700 cursor-pointer flex items-center hover:text-blue-600" onClick={() => handleSort('createdAt')}>
                                                Created {getSortIcon('createdAt')}
                                            </div>
                                            <div className="col-span-2 text-sm font-medium text-gray-700 cursor-pointer flex items-center hover:text-blue-600" onClick={() => handleSort('status')}>
                                                Status {getSortIcon('status')}
                                            </div>
                                            <div className="col-span-3 text-sm font-medium text-gray-700 text-right pr-4">Actions</div>
                                        </div>
                                    </div>
                                </div>

                                <div ref={listRef} className="flex-1 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 230px)' }}>
                                    {sorted.map(tt => (
                                        <div key={tt.id} className="px-6 py-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                                            <div className="flex items-center">
                                                <div className="flex items-center w-12 pl-2">
                                                    <input type="checkbox" checked={selected.includes(tt.id)} onChange={() => handleSelect(tt.id)} className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer" />
                                                </div>
                                                <div className="grid grid-cols-10 flex-1 gap-2 items-center">
                                                    <div className="col-span-3 pl-2">
                                                        <div className="font-medium text-gray-900 truncate" title={tt.name}>{tt.name}</div>
                                                        <div className="text-sm text-gray-500">ID: {tt.id}</div>
                                                    </div>
                                                    <div className="col-span-2 text-sm text-gray-600">{new Date(tt.createdAt).toLocaleDateString()}</div>
                                                    <div className="col-span-2">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tt.status)}`}>{tt.status}</span>
                                                    </div>
                                                    <div className="col-span-3 flex justify-end space-x-2 pr-4">
                                                        <button onClick={() => handlePublish(tt.id)} disabled={tt.status === 'PUBLISHED'} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg" title="Publish">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                        </button>
                                                        <Link href={`/timetables/${tt.id}`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                        </Link>
                                                        <button onClick={() => handleExportClick(tt)} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg" title="Export">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4" /></svg>
                                                        </button>
                                                        <button onClick={() => handleDelete(tt.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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

            <GenerateOptionsModal
                isOpen={isGenerateModalOpen}
                onClose={() => setIsGenerateModalOpen(false)}
                onGenerate={handleGenerate}
                timetableName={selectedTimetable?.name || ''}
            />

            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onExport={handleExport}
                timetableName={selectedTimetable?.name || ''}
            />

            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-4">Create New Timetable</h3>
                            <form onSubmit={handleCreate}>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Timetable Name *</label>
                                    <input type="text" value={newTimetableName} onChange={e => setNewTimetableName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required autoFocus />
                                </div>
                                <div className="mt-6 flex justify-end space-x-3">
                                    <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </ProtectedRoute>
    );
}