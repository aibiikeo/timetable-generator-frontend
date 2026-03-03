// src/app/home/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth, api, UserResponse } from '@/lib';

// Типы для сущностей
interface EntityCard {
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    endpoint: string;
    count?: number;
}

export default function HomePage() {
    const { logout } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);
    const [loadingUser, setLoadingUser] = useState(true);

    // Загружаем данные текущего пользователя
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                // Получаем всех пользователей и находим текущего по email из localStorage
                const users = await api.getUsers();
                const userEmail = localStorage.getItem('userEmail');

                if (userEmail) {
                    const foundUser = users.data.find(user => user.email === userEmail);
                    if (foundUser) {
                        setCurrentUser(foundUser);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch current user:', error);
            } finally {
                setLoadingUser(false);
            }
        };

        fetchCurrentUser();
    }, []);

    // Сущности для Dashboard
    const allEntities: EntityCard[] = [
        { id: 'users', title: 'Users', description: 'Manage user accounts and permissions', icon: '👥', color: 'blue', endpoint: '/users' },
        { id: 'timetables', title: 'Timetables', description: 'Create and manage timetables', icon: '📅', color: 'green', endpoint: '/timetables' },
        { id: 'subjects', title: 'Subjects', description: 'Manage course subjects', icon: '📚', color: 'orange', endpoint: '/subjects' },
        { id: 'teachers', title: 'Teachers', description: 'Manage teaching staff', icon: '👨‍🏫', color: 'purple', endpoint: '/teachers' },
        { id: 'groups', title: 'Study Groups', description: 'Manage student groups', icon: '👥', color: 'indigo', endpoint: '/groups' },
        { id: 'faculties', title: 'Faculties', description: 'Manage faculties and departments', icon: '🏛️', color: 'red', endpoint: '/faculties' },
        { id: 'rooms', title: 'Rooms', description: 'Manage classrooms and labs', icon: '🏫', color: 'pink', endpoint: '/rooms' },
    ];

    // Фильтруем сущности в зависимости от роли пользователя
    const entities = currentUser?.role === 'ADMIN'
        ? allEntities.filter(entity => entity.id !== 'users')
        : allEntities;

    // Быстрые действия (самые используемые)
    const quickActions = [
        { id: 'create-timetable', title: 'Create New Timetable', description: 'Start a new timetable generation', endpoint: '/timetables/new' },
        { id: 'view-current', title: 'View Current Timetable', description: 'Check published schedule', endpoint: '/timetables/current' },
        { id: 'generate-lessons', title: 'Generate Lessons', description: 'Auto-generate lessons from assignments', endpoint: '/generation' },
        { id: 'manage-assignments', title: 'Manage Assignments', description: 'Configure teaching assignments', endpoint: '/assignments' },
        { id: 'add-teacher', title: 'Add New Teacher', description: 'Register teaching staff', endpoint: '/teachers/new' },
        { id: 'room-availability', title: 'Room Availability', description: 'Check room schedules', endpoint: '/rooms/availability' },
    ];

    const handleLogout = () => {
        console.log('[Logout] Initiating logout...');
        logout();
        router.push('/login');
    };

    const handleQuickAction = (endpoint: string) => {
        router.push(endpoint);
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
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
                                <h1 className="ml-3 text-xl font-semibold text-gray-900">
                                    Timetable Generator
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

                {/* Main Content - с отступом для фиксированного header */}
                <main className="pt-16">
                    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Dashboard — 2/3 ширины */}
                            <div className="lg:col-span-2">
                                <div className="mb-4 sticky top-16">
                                    <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
                                </div>

                                <div className="max-h-[calc(100vh-12rem)] overflow-y-auto pr-2 custom-scrollbar scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
                                    {loading || loadingUser ? (
                                        <div className="flex justify-center items-center h-64">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                                            {entities.map((entity) => (
                                                <Link
                                                    key={entity.id}
                                                    href={entity.endpoint}
                                                    className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200 hover:shadow-md transition-shadow hover:border-blue-300"
                                                >
                                                    <div className="p-6">
                                                        <div className="flex items-start">
                                                            <div className={`flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center ${
                                                                entity.color === 'blue' ? 'bg-blue-100' :
                                                                    entity.color === 'green' ? 'bg-green-100' :
                                                                        entity.color === 'purple' ? 'bg-purple-100' :
                                                                            entity.color === 'orange' ? 'bg-orange-100' :
                                                                                entity.color === 'indigo' ? 'bg-indigo-100' :
                                                                                    entity.color === 'pink' ? 'bg-pink-100' :
                                                                                        entity.color === 'teal' ? 'bg-teal-100' :
                                                                                            'bg-red-100'
                                                            }`}>
                                                                <span className="text-xl">{entity.icon}</span>
                                                            </div>
                                                            <div className="ml-4">
                                                                <h3 className="text-lg font-semibold text-gray-900">{entity.title}</h3>
                                                                <p className="text-sm text-gray-500 mt-1">{entity.description}</p>
                                                                <div className="mt-3">
                                                                    <span className="text-xs font-medium text-blue-600 hover:text-blue-800">
                                                                        View & Manage →
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Quick Actions — 1/3 ширины */}
                            <div className="lg:col-span-1">
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                                    <div className="space-y-4 max-h-[calc(100vh-15rem)] overflow-y-auto pr-2 custom-scrollbar scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
                                        {quickActions.map((action) => (
                                            <button
                                                key={action.id}
                                                onClick={() => handleQuickAction(action.endpoint)}
                                                className="w-full p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left bg-white hover:bg-blue-50"
                                            >
                                                <div className="font-medium text-gray-900">{action.title}</div>
                                                <div className="text-sm text-gray-500 mt-1">{action.description}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}