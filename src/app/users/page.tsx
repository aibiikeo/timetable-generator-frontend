'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth, userApi, UserResponse, UserRole } from '@/lib';

type SortField = 'email' | 'role';
type SortDirection = 'asc' | 'desc';

interface FormDataState {
    email: string;
    password: string;
    role: UserRole;
}

export default function UsersPage() {
    const router = useRouter();
    const { logout } = useAuth();
    const [users, setUsers] = useState<UserResponse[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);
    const [createError, setCreateError] = useState('');
    const [formData, setFormData] = useState<FormDataState>({
        email: '',
        password: '',
        role: 'ADMIN',
    });
    const [error, setError] = useState('');

    // Sorting
    const [sortField, setSortField] = useState<SortField>('email');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const listRef = useRef<HTMLDivElement>(null);
    const emailInputRef = useRef<HTMLInputElement>(null);
    const passwordInputRef = useRef<HTMLInputElement>(null);
    const roleSelectRef = useRef<HTMLSelectElement>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    // Filter users
    useEffect(() => {
        const lower = searchQuery.toLowerCase();
        const filtered = users.filter(user =>
            user.email.toLowerCase().includes(lower) ||
            user.role.toLowerCase().includes(lower) ||
            user.id.toString().includes(lower)
        );
        setFilteredUsers(filtered);
        setSelectedUsers([]);
    }, [searchQuery, users]);

    // Sort users
    const sortedUsers = useMemo(() => {
        const sorted = [...filteredUsers];
        sorted.sort((a, b) => {
            const direction = sortDirection === 'asc' ? 1 : -1;

            if (sortField === 'email') {
                return a.email.toLowerCase().localeCompare(b.email.toLowerCase()) * direction;
            } else if (sortField === 'role') {
                return a.role.localeCompare(b.role) * direction;
            }

            return 0;
        });
        return sorted;
    }, [filteredUsers, sortField, sortDirection]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError('');
            const data = await userApi.getUsers();
            setUsers(data);
            setFilteredUsers(data);
        } catch (err: any) {
            console.error('Error fetching users:', err);
            setError('Failed to load users');
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setCreateError('');
    };

    const validateForm = (isEdit: boolean): boolean => {
        if (!formData.email.trim()) {
            setCreateError('Email is required');
            emailInputRef.current?.focus();
            return false;
        }
        const password = formData.password;
        if (!isEdit && !password.trim()) {
            setError('Password is required for new users');
            passwordInputRef.current?.focus();
            return false;
        }
        if (password.trim() && password.length < 8) {
            passwordInputRef.current?.focus();
            return false;
        }
        if (!formData.role) {
            setError('Role is required');
            roleSelectRef.current?.focus();
            return false;
        }
        return true;
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm(false)) return;

        setCreateError('');

        const emailExists = users.some(
            u => u.email.toLowerCase() === formData.email.toLowerCase()
        );

        if (emailExists) {
            setCreateError('Email is already in use');
            emailInputRef.current?.focus();
            return;
        }

        try {
            setError('');
            await userApi.createUser({
                email: formData.email,
                password: formData.password,
                role: formData.role,
            });
            setIsCreateModalOpen(false);
            setFormData({ email: '', password: '', role: 'ADMIN' });
            fetchUsers();
        } catch (err: any) {
            console.error('Error creating user:', err);

            const message =
                err.response?.data?.message ||
                err.response?.data ||
                'Failed to create user';

            if (message.includes('Email is already in use')) {
                setCreateError('This email is already registered.');
                emailInputRef.current?.focus();
            } else {
                setCreateError(message);
            }
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        if (!validateForm(true)) return;

        try {
            setError('');
            const updateData: Partial<{ email: string; password: string; role: UserRole }> = {
                email: formData.email,
                role: formData.role,
            };
            if (formData.password.trim()) {
                updateData.password = formData.password;
            }
            await userApi.updateUser(currentUser.id, updateData);
            setIsEditModalOpen(false);
            setCurrentUser(null);
            setFormData({ email: '', password: '', role: 'ADMIN' });
            fetchUsers();
        } catch (err: any) {
            console.error('Error updating user:', err);
            setError(err.response?.data?.message || 'Failed to update user');
        }
    };

    const handleDelete = async (id: number) => {
        const userToDelete = users.find(u => u.id === id);

        if (userToDelete?.role === 'SUPER_ADMIN') {
            const superAdminCount = users.filter(u => u.role === 'SUPER_ADMIN').length;
            if (superAdminCount === 1) {
                setError('Cannot delete the last SUPER_ADMIN user');
                return;
            }
        }

        if (!confirm('Are you sure you want to delete this user?')) return;

        try {
            setError('');
            await userApi.deleteUser(id);
            fetchUsers();
        } catch (err: any) {
            console.error('Error deleting user:', err);
            setError(err.response?.data?.message || 'Failed to delete user');
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedUsers.length === 0) return;

        // Проверка на последнего SUPER_ADMIN
        const superAdminsToDelete = users
            .filter(u => selectedUsers.includes(u.id) && u.role === 'SUPER_ADMIN')
            .length;
        const totalSuperAdmins = users.filter(u => u.role === 'SUPER_ADMIN').length;

        if (superAdminsToDelete > 0 && superAdminsToDelete === totalSuperAdmins) {
            setError('Cannot delete all SUPER_ADMIN users');
            return;
        }

        if (!confirm(`Are you sure you want to delete ${selectedUsers.length} selected users?`)) return;

        try {
            setError('');
            const deletePromises = selectedUsers.map(id =>
                userApi.deleteUser(id).catch(err => {
                    console.error(`Error deleting user ${id}:`, err);
                })
            );
            await Promise.all(deletePromises);
            setSelectedUsers([]);
            fetchUsers();
        } catch (err: any) {
            console.error('Error deleting selected users:', err);
            setError('Failed to delete some users');
        }
    };

    const handleEdit = (user: UserResponse) => {
        setCurrentUser(user);
        setFormData({
            email: user.email,
            password: '',
            role: user.role,
        });
        setIsEditModalOpen(true);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedUsers(sortedUsers.map(u => u.id));
        } else {
            setSelectedUsers([]);
        }
    };

    const handleSelectUser = (id: number) => {
        setSelectedUsers(prev =>
            prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
        );
    };

    const handleCreateModalOpen = () => {
        setError('');
        setCreateError('');
        setFormData({ email: '', password: '', role: 'ADMIN' });
        setIsCreateModalOpen(true);
    };

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    const getRoleBadgeColor = (role: UserRole) => {
        return role === 'SUPER_ADMIN'
            ? 'bg-purple-100 text-purple-800'
            : 'bg-blue-100 text-blue-800';
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
                                <h1 className="text-xl font-semibold text-gray-900">Users Management</h1>
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
                                        placeholder="Search users by email or role..."
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
                                {selectedUsers.length > 0 && (
                                    <button
                                        onClick={handleDeleteSelected}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Delete Selected ({selectedUsers.length})
                                    </button>
                                )}
                                <button
                                    onClick={handleCreateModalOpen}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create New User
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

                {/* Users List */}
                <div className="flex-1">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-full">
                        {sortedUsers.length === 0 ? (
                            <div className="text-center py-12 h-full flex flex-col items-center justify-center">
                                <div className="text-gray-400 mb-4 text-lg">No users found</div>
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
                                                checked={selectedUsers.length === sortedUsers.length && sortedUsers.length > 0}
                                                onChange={handleSelectAll}
                                                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                title="Select All"
                                            />
                                        </div>
                                        {/* Grid for header columns */}
                                        <div className="grid grid-cols-12 flex-1 gap-2">
                                            <div
                                                className="col-span-6 text-sm font-medium text-gray-700 pl-2 cursor-pointer flex items-center hover:text-blue-600"
                                                onClick={() => handleSort('email')}
                                            >
                                                Email
                                                {getSortIcon('email')}
                                            </div>
                                            <div
                                                className="col-span-3 text-sm font-medium text-gray-700 cursor-pointer flex items-center hover:text-blue-600"
                                                onClick={() => handleSort('role')}
                                            >
                                                Role
                                                {getSortIcon('role')}
                                            </div>
                                            <div className="col-span-3 text-sm font-medium text-gray-700 text-right pr-4">
                                                Actions
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Scrollable Rows */}
                                <div
                                    ref={listRef}
                                    className="flex-1 overflow-y-auto custom-scrollbar"
                                    style={{ maxHeight: 'calc(100vh - 230px)' }}
                                >
                                    {sortedUsers.map((user) => (
                                        <div key={user.id} className="px-6 py-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                                            <div className="flex items-center">
                                                {/* Checkbox column - fixed width */}
                                                <div className="flex items-center w-12 pl-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedUsers.includes(user.id)}
                                                        onChange={() => handleSelectUser(user.id)}
                                                        className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                    />
                                                </div>
                                                {/* Grid for row data */}
                                                <div className="grid grid-cols-12 flex-1 gap-2 items-center">
                                                    <div className="col-span-6 pl-2">
                                                        <div className="font-medium text-gray-900 truncate" title={user.email}>
                                                            {user.email}
                                                        </div>
                                                        <div className="text-sm text-gray-500">ID: {user.id}</div>
                                                    </div>
                                                    <div className="col-span-3">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                                                            {user.role}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-3 flex items-center space-x-2 pr-4 justify-end">
                                                        <button
                                                            onClick={() => handleEdit(user)}
                                                            className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md flex items-center"
                                                        >
                                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(user.id)}
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
                                <h3 className="text-lg font-semibold text-gray-900">Create New User</h3>
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
                                            Email
                                        </label>
                                        <input
                                            ref={emailInputRef}
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            placeholder="user@example.com"
                                            autoFocus
                                            required
                                        />
                                        {createError && (
                                            <p className="mt-1 text-xs !text-red-500">
                                                {createError}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Password
                                        </label>
                                        <input
                                            ref={passwordInputRef}
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            required
                                            placeholder="••••••••"
                                        />
                                        {formData.password && formData.password.length > 0 && formData.password.length < 8 && (
                                            <p className="mt-1 text-xs !text-red-500">
                                                Password must be at least 8 characters long
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Role
                                        </label>
                                        <select
                                            ref={roleSelectRef}
                                            name="role"
                                            value={formData.role}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            required
                                        >
                                            <option value="ADMIN">ADMIN</option>
                                            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
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
                                        Create User
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && currentUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
                                <button
                                    onClick={() => {
                                        setIsEditModalOpen(false);
                                        setCurrentUser(null);
                                    }}
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
                                            Email
                                        </label>
                                        <input
                                            ref={emailInputRef}
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            required
                                            placeholder="user@example.com"
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Password (leave blank to keep current)
                                        </label>
                                        <input
                                            ref={passwordInputRef}
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            placeholder="New password"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Role
                                        </label>
                                        <select
                                            ref={roleSelectRef}
                                            name="role"
                                            value={formData.role}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            required
                                        >
                                            <option value="ADMIN">ADMIN</option>
                                            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="mt-8 flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditModalOpen(false);
                                            setCurrentUser(null);
                                        }}
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