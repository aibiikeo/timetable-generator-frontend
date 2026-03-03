// src/app/rooms/page.tsx
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth, roomApi, RoomType, RoomResponse } from '@/lib';

interface Room {
    id: number;
    name: string;
    capacity: number;
    type: RoomType;
}

type SortField = 'name' | 'capacity' | 'type';
type SortDirection = 'asc' | 'desc';

export default function RoomsPage() {
    const router = useRouter();
    const { logout } = useAuth();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRooms, setSelectedRooms] = useState<number[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        capacity: 30,
        type: 'CLASSROOM' as RoomType,
    });
    const [error, setError] = useState<string>('');

    // Сортировка
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchRooms();
    }, []);

    // Фильтрация комнат
    useEffect(() => {
        const filtered = rooms.filter(room =>
            room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            room.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            room.capacity.toString().includes(searchQuery)
        );
        setFilteredRooms(filtered);
        setSelectedRooms([]);
    }, [searchQuery, rooms]);

    // Сортировка комнат
    const sortedRooms = useMemo(() => {
        const sorted = [...filteredRooms];
        sorted.sort((a, b) => {
            let aValue: any, bValue: any;

            if (sortField === 'name') {
                aValue = a.name.toLowerCase();
                bValue = b.name.toLowerCase();
            } else if (sortField === 'capacity') {
                aValue = a.capacity;
                bValue = b.capacity;
            } else {
                aValue = a.type.toLowerCase();
                bValue = b.type.toLowerCase();
            }

            if (sortDirection === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });
        return sorted;
    }, [filteredRooms, sortField, sortDirection]);

    const fetchRooms = async () => {
        try {
            setLoading(true);
            setError('');
            const data = await roomApi.getRooms();
            setRooms(data);
            setFilteredRooms(data);
        } catch (err: any) {
            console.error('Error fetching rooms:', err);
            setError('Failed to load rooms');
        } finally {
            setLoading(false);
        }
    };

    // Обработка сортировки
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Получение класса для стрелки сортировки
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

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setError('');
            await roomApi.createRoom(formData);
            setIsCreateModalOpen(false);
            setFormData({ name: '', capacity: 30, type: 'CLASSROOM' });
            fetchRooms();
        } catch (err: any) {
            console.error('Error creating room:', err);
            setError(err.response?.data?.message || 'Failed to create room');
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentRoom) return;
        try {
            setError('');
            await roomApi.updateRoom(currentRoom.id, formData);
            setIsEditModalOpen(false);
            setCurrentRoom(null);
            setFormData({ name: '', capacity: 30, type: 'CLASSROOM' });
            fetchRooms();
        } catch (err: any) {
            console.error('Error updating room:', err);
            setError(err.response?.data?.message || 'Failed to update room');
        }
    };

    const handleDelete = async (room: Room) => {
        setCurrentRoom(room);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteRoom = async () => {
        if (!currentRoom) return;
        try {
            setError('');
            await roomApi.deleteRoom(currentRoom.id);
            setIsDeleteModalOpen(false);
            setCurrentRoom(null);
            fetchRooms();
        } catch (err: any) {
            console.error('Error deleting room:', err);
            setError(err.response?.data?.message || 'Failed to delete room');
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedRooms.length === 0) return;

        if (confirm(`Are you sure you want to delete ${selectedRooms.length} selected rooms?`)) {
            try {
                setError('');
                const deletePromises = selectedRooms.map(id =>
                    roomApi.deleteRoom(id).catch(err => {
                        console.error(`Error deleting room ${id}:`, err);
                    })
                );
                await Promise.all(deletePromises);
                setSelectedRooms([]);
                fetchRooms();
            } catch (err: any) {
                console.error('Error deleting selected rooms:', err);
                setError('Failed to delete some rooms');
            }
        }
    };

    const handleEdit = (room: Room) => {
        setCurrentRoom(room);
        setFormData({
            name: room.name,
            capacity: room.capacity,
            type: room.type,
        });
        setIsEditModalOpen(true);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedRooms(sortedRooms.map(f => f.id));
        } else {
            setSelectedRooms([]);
        }
    };

    const handleSelectRoom = (id: number) => {
        setSelectedRooms(prev =>
            prev.includes(id)
                ? prev.filter(roomId => roomId !== id)
                : [...prev, id]
        );
    };

    const handleCreateModalOpen = () => {
        setError('');
        setFormData({ name: '', capacity: 30, type: 'CLASSROOM' });
        setIsCreateModalOpen(true);
    };

    const handleLogout = () => {
        console.log('[Logout] Initiating logout...');
        logout();
        router.push('/login');
    };

    const getTypeColor = (type: RoomType) => {
        switch (type) {
            case 'CLASSROOM':
                return 'bg-blue-100 text-blue-800';
            case 'COMPUTER_LAB':
                return 'bg-green-100 text-green-800';
            case 'ANY':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getTypeLabel = (type: RoomType) => {
        switch (type) {
            case 'CLASSROOM':
                return 'Classroom';
            case 'COMPUTER_LAB':
                return 'Computer Lab';
            case 'ANY':
                return 'Any';
            default:
                return type;
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
            {/* Header - Fixed при скролле */}
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
                                    Rooms Management
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
                {/* Фиксированная верхняя панель с поиском и кнопкой создания */}
                <div className="bg-white border-b shadow-sm py-4 px-4 sm:px-6 lg:px-8 sticky top-16 z-40">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search rooms by name, type, or capacity..."
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
                                {selectedRooms.length > 0 && (
                                    <button
                                        onClick={handleDeleteSelected}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Delete Selected ({selectedRooms.length})
                                    </button>
                                )}
                                <button
                                    onClick={handleCreateModalOpen}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create New Room
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

                {/* Список комнат - занимает все оставшееся пространство */}
                <div className="flex-1">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-full">
                        {sortedRooms.length === 0 ? (
                            <div className="text-center py-12 h-full flex flex-col items-center justify-center">
                                <div className="text-gray-400 mb-4 text-lg">No rooms found</div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full flex flex-col">
                                {/* Заголовок таблицы */}
                                <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 flex-shrink-0">
                                    <div className="flex items-center">
                                        <div className="flex items-center w-12 pl-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedRooms.length === sortedRooms.length && sortedRooms.length > 0}
                                                onChange={handleSelectAll}
                                                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                title="Select All"
                                            />
                                        </div>
                                        <div className="grid grid-cols-12 flex-1">
                                            <div
                                                className="col-span-4 text-sm font-medium text-gray-700 pl-2 cursor-pointer flex items-center hover:text-blue-600"
                                                onClick={() => handleSort('name')}
                                            >
                                                Room Name
                                                {getSortIcon('name')}
                                            </div>
                                            <div
                                                className="col-span-3 text-sm font-medium text-gray-700 cursor-pointer flex items-center hover:text-blue-600"
                                                onClick={() => handleSort('capacity')}
                                            >
                                                Capacity
                                                {getSortIcon('capacity')}
                                            </div>
                                            <div
                                                className="col-span-3 text-sm font-medium text-gray-700 cursor-pointer flex items-center hover:text-blue-600"
                                                onClick={() => handleSort('type')}
                                            >
                                                Type
                                                {getSortIcon('type')}
                                            </div>
                                            <div className="col-span-2 text-sm font-medium text-gray-700 text-right pr-4">Actions</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Список комнат с прокруткой */}
                                <div
                                    ref={listRef}
                                    className="flex-1 overflow-y-auto custom-scrollbar"
                                    style={{ maxHeight: 'calc(100vh - 230px)' }}
                                >
                                    {sortedRooms.map((room) => (
                                        <div key={room.id} className="px-6 py-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                                            <div className="flex items-center">
                                                <div className="flex items-center w-12 pl-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRooms.includes(room.id)}
                                                        onChange={() => handleSelectRoom(room.id)}
                                                        className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-12 flex-1 items-center">
                                                    <div className="col-span-4 pl-2">
                                                        <div className="font-medium text-gray-900 truncate" title={room.name}>
                                                            {room.name}
                                                        </div>
                                                        <div className="text-sm text-gray-500">ID: {room.id}</div>
                                                    </div>
                                                    <div className="col-span-3">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                                            {room.capacity} seats
                                                        </span>
                                                    </div>
                                                    <div className="col-span-3">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(room.type)}`}>
                                                            {getTypeLabel(room.type)}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-2 flex justify-end space-x-2 pr-4">
                                                        <button
                                                            onClick={() => handleEdit(room)}
                                                            className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md flex items-center"
                                                        >
                                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(room)}
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

            {/* Modal для создания */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">Create New Room</h3>
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
                                            Room Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            required
                                            placeholder="Enter room name (e.g., Room 101, Lab A)"
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Capacity *
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.capacity}
                                            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            required
                                            min="1"
                                            max="500"
                                            placeholder="Enter capacity"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">
                                            Number of students the room can accommodate
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Room Type *
                                        </label>
                                        <select
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value as RoomType })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            required
                                        >
                                            <option value="CLASSROOM">Classroom</option>
                                            <option value="COMPUTER_LAB">Computer Lab</option>
                                            <option value="ANY">Any</option>
                                        </select>
                                        <p className="mt-1 text-xs text-gray-500">
                                            Select the type of room
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
                                        Create Room
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal для редактирования */}
            {isEditModalOpen && currentRoom && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">Edit Room</h3>
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
                                            Room Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            required
                                            placeholder="Enter room name"
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Capacity *
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.capacity}
                                            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            required
                                            min="1"
                                            max="500"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">
                                            Number of students the room can accommodate
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Room Type *
                                        </label>
                                        <select
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value as RoomType })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            required
                                        >
                                            <option value="CLASSROOM">Classroom</option>
                                            <option value="COMPUTER_LAB">Computer Lab</option>
                                            <option value="ANY">Any</option>
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

            {/* Modal для удаления */}
            {isDeleteModalOpen && currentRoom && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">Delete Room</h3>
                                <button
                                    onClick={() => {
                                        setIsDeleteModalOpen(false);
                                        setCurrentRoom(null);
                                    }}
                                    className="text-gray-400 hover:text-gray-500 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="space-y-4">
                                <p className="text-gray-600">
                                    Are you sure you want to delete the room <span className="font-semibold text-gray-900">"{currentRoom.name}"</span>?
                                </p>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="text-gray-500">Room Name:</div>
                                        <div className="font-medium">{currentRoom.name}</div>
                                        <div className="text-gray-500">Capacity:</div>
                                        <div className="font-medium">{currentRoom.capacity} seats</div>
                                        <div className="text-gray-500">Type:</div>
                                        <div className="font-medium">{getTypeLabel(currentRoom.type)}</div>
                                    </div>
                                </div>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <div className="flex items-center">
                                        <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                        <span className="text-sm text-red-700">
                                            This action cannot be undone. Any lessons scheduled in this room will need to be reassigned.
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsDeleteModalOpen(false);
                                        setCurrentRoom(null);
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmDeleteRoom}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    Delete Room
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </ProtectedRoute>
    );
}