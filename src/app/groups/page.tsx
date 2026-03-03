'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth, groupApi, facultyApi, StudyGroupResponse, StudyGroupRequest, FacultyResponse } from '@/lib';

// Типы для сортировки
type SortField = 'name' | 'faculty' | 'course' | 'students';
type SortDirection = 'asc' | 'desc';

// Тип для формы с возможностью пустых строк для числовых полей
interface FormDataState {
    name: string;
    facultyId: number;
    course: number | string;
    studentCount: number | string;
}

export default function GroupsPage() {
    const router = useRouter();
    const { logout } = useAuth();
    const [groups, setGroups] = useState<StudyGroupResponse[]>([]);
    const [filteredGroups, setFilteredGroups] = useState<StudyGroupResponse[]>([]);
    const [faculties, setFaculties] = useState<FacultyResponse[]>([]);
    const [facultiesMap, setFacultiesMap] = useState<Map<number, string>>(new Map());
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentGroup, setCurrentGroup] = useState<StudyGroupResponse | null>(null);
    const [error, setError] = useState<string>('');
    const [formData, setFormData] = useState<FormDataState>({
        name: '',
        facultyId: 0,
        course: 1,
        studentCount: 0,
    });

    // Сортировка
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    const listRef = useRef<HTMLDivElement>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);
    const courseInputRef = useRef<HTMLInputElement>(null);
    const facultySelectRef = useRef<HTMLSelectElement>(null);

    // Получение названия факультета по ID из карты (перемещено выше useMemo)
    const getFacultyNameById = useCallback((facultyId: number): string => {
        const facultyName = facultiesMap.get(facultyId);
        if (facultyName) {
            return facultyName;
        }

        // Если факультет не найден в карте, попробуем найти в массиве
        const faculty = faculties.find(f => f.id === facultyId);
        if (faculty) {
            return faculty.name;
        }

        // Если все еще не найдено, вернем "Unknown Faculty"
        return "Unknown Faculty";
    }, [facultiesMap, faculties]);

    // Загрузка данных при монтировании
    useEffect(() => {
        loadData();
    }, []);

    // Создание карты факультетов для быстрого поиска
    useEffect(() => {
        if (faculties.length > 0) {
            const map = new Map<number, string>();
            faculties.forEach(faculty => {
                map.set(faculty.id, faculty.name);
            });
            setFacultiesMap(map);
        }
    }, [faculties]);

    // Фильтрация групп при изменении поискового запроса
    // useEffect(() => {
    //     const filtered = groups.filter(group => {
    //         const groupName = group.name.toLowerCase();
    //         const facultyName = getFacultyNameById(group.facultyId).toLowerCase();
    //         const query = searchQuery.toLowerCase();
    //         return groupName.includes(query) || facultyName.includes(query);
    //     });
    //     setFilteredGroups(filtered);
    //     setSelectedGroups([]);
    // }, [searchQuery, groups, facultiesMap, getFacultyNameById]);
    useEffect(() => {
        const q = searchQuery.trim().toLowerCase();

        const filtered = groups.filter(group => {
            const groupName = group.name.toLowerCase();
            const facultyName = getFacultyNameById(group.facultyId).toLowerCase();
            const course = String(group.course);
            const students = String(group.studentCount ?? '');

            return (
                groupName.includes(q) ||
                facultyName.includes(q) ||
                course.includes(q) ||
                students.includes(q)
            );
        });

        setFilteredGroups(filtered);
        setSelectedGroups([]);
    }, [searchQuery, groups, getFacultyNameById]);

    // Сортировка групп
    const sortedGroups = useMemo(() => {
        const sorted = [...filteredGroups];

        sorted.sort((a, b) => {
            let aValue: string | number;
            let bValue: string | number;

            switch (sortField) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'faculty':
                    aValue = getFacultyNameById(a.facultyId).toLowerCase();
                    bValue = getFacultyNameById(b.facultyId).toLowerCase();
                    break;
                case 'course':
                    aValue = a.course;
                    bValue = b.course;
                    break;
                case 'students':
                    aValue = a.studentCount || 0;
                    bValue = b.studentCount || 0;
                    break;
                default:
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
            }

            if (sortDirection === 'asc') {
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return aValue.localeCompare(bValue);
                } else {
                    return (aValue as number) - (bValue as number);
                }
            } else {
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return bValue.localeCompare(aValue);
                } else {
                    return (bValue as number) - (aValue as number);
                }
            }
        });

        return sorted;
    }, [filteredGroups, sortField, sortDirection, getFacultyNameById]);

    // Загрузка всех данных
    const loadData = async () => {
        try {
            setLoading(true);
            setError('');
            const [groupsData, facultiesData] = await Promise.all([
                groupApi.getAllGroups(),
                facultyApi.getFaculties(),
            ]);
            setGroups(groupsData);
            setFilteredGroups(groupsData);
            setFaculties(facultiesData);
        } catch (err: any) {
            console.error('Error loading data:', err);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    // Обработка сортировки
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            // Если уже сортируем по этому полю, меняем направление
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // Если выбрано новое поле, сортируем по возрастанию
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Получение иконки для стрелки сортировки
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

    // Обработка изменений в форме
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'number') {
            // Для числовых полей: если значение пустое, сохраняем как пустую строку
            // Если есть значение, преобразуем в число
            if (value === '') {
                setFormData({
                    ...formData,
                    [name]: '',
                } as FormDataState);
            } else {
                const numValue = parseInt(value, 10);
                if (!isNaN(numValue)) {
                    setFormData({
                        ...formData,
                        [name]: numValue,
                    } as FormDataState);
                }
            }
        } else {
            if (name === 'facultyId') {
                setFormData({
                    ...formData,
                    [name]: parseInt(value, 10) || 0,
                } as FormDataState);
            } else {
                setFormData({
                    ...formData,
                    [name]: value,
                } as FormDataState);
            }
        }
    };

    // Валидация формы
    const validateForm = (): boolean => {
        // Явно приводим типы для проверки
        const name = formData.name;
        const facultyId = formData.facultyId;

        if (!name.trim()) {
            if (nameInputRef.current) {
                nameInputRef.current.focus();
                nameInputRef.current.setCustomValidity('Please fill out this field');
                nameInputRef.current.reportValidity();
            }
            return false;
        }

        if (facultyId <= 0) {
            if (facultySelectRef.current) {
                facultySelectRef.current.focus();
                facultySelectRef.current.setCustomValidity('Please select a faculty');
                facultySelectRef.current.reportValidity();
            }
            return false;
        }

        // Для курса проверяем, что это число между 1 и 6
        const courseValue = typeof formData.course === 'string' ?
            (formData.course.trim() === '' ? 1 : parseInt(formData.course, 10)) :
            formData.course;

        if (isNaN(courseValue as number) || courseValue < 1 || courseValue > 6) {
            setError('Course must be between 1 and 6');
            if (courseInputRef.current) {
                courseInputRef.current.focus();
                courseInputRef.current.setCustomValidity('Course must be between 1 and 6');
                courseInputRef.current.reportValidity();
            }
            return false;
        }

        return true;
    };

    // Создание новой группы
    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Сбрасываем кастомные сообщения валидации
        if (nameInputRef.current) nameInputRef.current.setCustomValidity('');
        if (facultySelectRef.current) facultySelectRef.current.setCustomValidity('');
        if (courseInputRef.current) courseInputRef.current.setCustomValidity('');

        if (!validateForm()) {
            return;
        }

        // Подготавливаем данные для отправки
        const courseValue = typeof formData.course === 'string' ?
            (formData.course.trim() === '' ? 1 : parseInt(formData.course, 10)) :
            formData.course;

        const studentCountValue = typeof formData.studentCount === 'string' ?
            (formData.studentCount.trim() === '' ? 0 : parseInt(formData.studentCount, 10)) :
            formData.studentCount;

        const submitData: StudyGroupRequest = {
            name: formData.name,
            facultyId: formData.facultyId,
            course: courseValue as number,
            studentCount: studentCountValue as number,
        };

        try {
            setError('');
            await groupApi.createGroup(submitData);
            setIsCreateModalOpen(false);
            setFormData({
                name: '',
                facultyId: 0,
                course: 1,
                studentCount: 0,
            });
            loadData();
        } catch (err: any) {
            console.error('Error creating group:', err);
            setError(err.response?.data?.message || 'Failed to create group');
        }
    };

    // Открытие модального окна редактирования
    const handleEdit = (group: StudyGroupResponse) => {
        setCurrentGroup(group);
        setFormData({
            name: group.name,
            facultyId: group.facultyId,
            course: group.course,
            studentCount: group.studentCount,
        });
        setIsEditModalOpen(true);
    };

    // Сохранение изменений группы
    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentGroup) return;

        // Сбрасываем кастомные сообщения валидации
        if (nameInputRef.current) nameInputRef.current.setCustomValidity('');
        if (facultySelectRef.current) facultySelectRef.current.setCustomValidity('');
        if (courseInputRef.current) courseInputRef.current.setCustomValidity('');

        if (!validateForm()) {
            return;
        }

        // Подготавливаем данные для отправки
        const courseValue = typeof formData.course === 'string' ?
            (formData.course.trim() === '' ? 1 : parseInt(formData.course, 10)) :
            formData.course;

        const studentCountValue = typeof formData.studentCount === 'string' ?
            (formData.studentCount.trim() === '' ? 0 : parseInt(formData.studentCount, 10)) :
            formData.studentCount;

        const submitData: StudyGroupRequest = {
            name: formData.name,
            facultyId: formData.facultyId,
            course: courseValue as number,
            studentCount: studentCountValue as number,
        };

        try {
            setError('');
            await groupApi.updateGroupFull(currentGroup.id, submitData);
            setIsEditModalOpen(false);
            setCurrentGroup(null);
            setFormData({
                name: '',
                facultyId: 0,
                course: 1,
                studentCount: 0,
            });
            loadData();
        } catch (err: any) {
            console.error('Error updating group:', err);
            setError(err.response?.data?.message || 'Failed to update group');
        }
    };

    // Удаление группы
    const handleDelete = async (groupId: number) => {
        if (!confirm('Are you sure you want to delete this group?')) return;

        try {
            setError('');
            await groupApi.deleteGroup(groupId);
            loadData();
        } catch (err: any) {
            console.error('Error deleting group:', err);
            setError(err.response?.data?.message || 'Failed to delete group. The group may have associated lessons.');
        }
    };

    // Массовое удаление выбранных групп
    const handleDeleteSelected = async () => {
        if (selectedGroups.length === 0) return;

        if (!confirm(`Are you sure you want to delete ${selectedGroups.length} selected groups?`)) return;

        try {
            setError('');
            const deletePromises = selectedGroups.map(id =>
                groupApi.deleteGroup(id).catch(err => {
                    console.error(`Error deleting group ${id}:`, err);
                })
            );
            await Promise.all(deletePromises);
            setSelectedGroups([]);
            loadData();
        } catch (err: any) {
            console.error('Error deleting selected groups:', err);
            setError('Failed to delete some groups. Some groups may have associated lessons.');
        }
    };

    // Выбор/отмена выбора всех групп
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedGroups(sortedGroups.map(g => g.id));
        } else {
            setSelectedGroups([]);
        }
    };

    // Выбор отдельной группы
    const handleSelectGroup = (id: number) => {
        setSelectedGroups(prev =>
            prev.includes(id)
                ? prev.filter(groupId => groupId !== id)
                : [...prev, id]
        );
    };

    // Открытие модального окна создания
    const handleCreateModalOpen = () => {
        setError('');
        setFormData({
            name: '',
            facultyId: 0,
            course: 1,
            studentCount: 0,
        });
        setIsCreateModalOpen(true);
    };

    // Выход из системы
    const handleLogout = () => {
        console.log('[Logout] Initiating logout...');
        logout();
        router.push('/login');
    };

    // Показать состояние загрузки
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
            {/* Fixed Header */}
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
                                    Study Groups Management
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
                {/* Fixed Top Panel with Search and Actions */}
                <div className="bg-white border-b shadow-sm py-4 px-4 sm:px-6 lg:px-8 sticky top-16 z-40">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search groups by name or faculty..."
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
                                {selectedGroups.length > 0 && (
                                    <button
                                        onClick={handleDeleteSelected}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Delete Selected ({selectedGroups.length})
                                    </button>
                                )}
                                <button
                                    onClick={handleCreateModalOpen}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create New Group
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

                {/* Groups List - Takes All Remaining Space */}
                <div className="flex-1">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-full">
                        {sortedGroups.length === 0 ? (
                            <div className="text-center py-12 h-full flex flex-col items-center justify-center">
                                <div className="text-gray-400 mb-4 text-lg">No groups found</div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full flex flex-col">
                                {/* Table Header - Fixed */}
                                <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 flex-shrink-0">
                                    <div className="flex items-center">
                                        <div className="flex items-center w-12 pl-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedGroups.length === sortedGroups.length && sortedGroups.length > 0}
                                                onChange={handleSelectAll}
                                                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                title="Select All"
                                            />
                                        </div>
                                        <div className="grid grid-cols-12 flex-1">
                                            <div
                                                className="col-span-3 text-sm font-medium text-gray-700 pl-2 cursor-pointer flex items-center hover:text-blue-600"
                                                onClick={() => handleSort('name')}
                                            >
                                                Group Name
                                                {getSortIcon('name')}
                                            </div>
                                            <div
                                                className="col-span-4 text-sm font-medium text-gray-700 cursor-pointer flex items-center hover:text-blue-600"
                                                onClick={() => handleSort('faculty')}
                                            >
                                                Faculty
                                                {getSortIcon('faculty')}
                                            </div>
                                            <div
                                                className="col-span-1 text-sm font-medium text-gray-700 text-center cursor-pointer flex items-center justify-center hover:text-blue-600"
                                                onClick={() => handleSort('course')}
                                            >
                                                Course
                                                {getSortIcon('course')}
                                            </div>
                                            <div
                                                className="col-span-2 text-sm font-medium text-gray-700 text-center cursor-pointer flex items-center justify-center hover:text-blue-600"
                                                onClick={() => handleSort('students')}
                                            >
                                                Students
                                                {getSortIcon('students')}
                                            </div>
                                            <div className="col-span-2 text-sm font-medium text-gray-700 text-right pr-4">Actions</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Scrollable Groups List */}
                                <div
                                    ref={listRef}
                                    className="flex-1 overflow-y-auto custom-scrollbar"
                                    style={{ maxHeight: 'calc(100vh - 230px)' }}
                                >
                                    {sortedGroups.map((group) => (
                                        <div key={group.id} className="px-6 py-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                                            <div className="flex items-center">
                                                <div className="flex items-center w-12 pl-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedGroups.includes(group.id)}
                                                        onChange={() => handleSelectGroup(group.id)}
                                                        className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-12 flex-1 items-center">
                                                    <div className="col-span-3 pl-2">
                                                        <div className="font-medium text-gray-900 truncate" title={group.name}>
                                                            {group.name}
                                                        </div>
                                                        <div className="text-sm text-gray-500">ID: {group.id}</div>
                                                    </div>
                                                    <div className="col-span-4">
                                                        <div className="text-gray-700">{getFacultyNameById(group.facultyId)}</div>
                                                    </div>
                                                    <div className="col-span-1 text-center">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                            {group.course}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-2 text-center">
                                                        <div className="text-gray-700">{group.studentCount}</div>
                                                    </div>
                                                    <div className="col-span-2 flex justify-end space-x-2 pr-4">
                                                        <button
                                                            onClick={() => handleEdit(group)}
                                                            className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md flex items-center"
                                                        >
                                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(group.id)}
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

            {/* Create Group Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">Create New Study Group</h3>
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
                                            Group Name *
                                        </label>
                                        <input
                                            ref={nameInputRef}
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            required
                                            placeholder="e.g., PI-21-1"
                                            autoFocus
                                            onInvalid={(e) => {
                                                const target = e.target as HTMLInputElement;
                                                target.setCustomValidity('Please fill out this field');
                                            }}
                                            onInput={(e) => {
                                                const target = e.target as HTMLInputElement;
                                                target.setCustomValidity('');
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Faculty *
                                        </label>
                                        <select
                                            ref={facultySelectRef}
                                            name="facultyId"
                                            value={formData.facultyId}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            required
                                            onInvalid={(e) => {
                                                const target = e.target as HTMLSelectElement;
                                                target.setCustomValidity('Please select a faculty');
                                            }}
                                            onInput={(e) => {
                                                const target = e.target as HTMLSelectElement;
                                                target.setCustomValidity('');
                                            }}
                                        >
                                            <option value={0}>Select Faculty</option>
                                            {faculties.map((faculty) => (
                                                <option key={faculty.id} value={faculty.id}>
                                                    {faculty.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Course *
                                            </label>
                                            <input
                                                ref={courseInputRef}
                                                type="number"
                                                name="course"
                                                value={formData.course === '' ? '' : formData.course}
                                                onChange={handleInputChange}
                                                min="1"
                                                max="6"
                                                step="1"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                required
                                                onInvalid={(e) => {
                                                    const target = e.target as HTMLInputElement;
                                                    if (target.validity.valueMissing) {
                                                        target.setCustomValidity('Please fill out this field');
                                                    } else if (target.validity.rangeOverflow) {
                                                        target.setCustomValidity('Value must be less than or equal to 6');
                                                    } else if (target.validity.rangeUnderflow) {
                                                        target.setCustomValidity('Value must be greater than or equal to 1');
                                                    }
                                                }}
                                                onInput={(e) => {
                                                    const target = e.target as HTMLInputElement;
                                                    target.setCustomValidity('');
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Number of Students
                                            </label>
                                            <input
                                                type="number"
                                                name="studentCount"
                                                value={formData.studentCount === '' ? '' : formData.studentCount}
                                                onChange={handleInputChange}
                                                min="0"
                                                step="1"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            />
                                        </div>
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
                                        Create Group
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Group Modal */}
            {isEditModalOpen && currentGroup && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">Edit Study Group</h3>
                                <button
                                    onClick={() => {
                                        setIsEditModalOpen(false);
                                        setCurrentGroup(null);
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
                                            Group Name *
                                        </label>
                                        <input
                                            ref={nameInputRef}
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            required
                                            placeholder="e.g., PI-21-1"
                                            autoFocus
                                            onInvalid={(e) => {
                                                const target = e.target as HTMLInputElement;
                                                target.setCustomValidity('Please fill out this field');
                                            }}
                                            onInput={(e) => {
                                                const target = e.target as HTMLInputElement;
                                                target.setCustomValidity('');
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Faculty *
                                        </label>
                                        <select
                                            ref={facultySelectRef}
                                            name="facultyId"
                                            value={formData.facultyId}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            required
                                            onInvalid={(e) => {
                                                const target = e.target as HTMLSelectElement;
                                                target.setCustomValidity('Please select a faculty');
                                            }}
                                            onInput={(e) => {
                                                const target = e.target as HTMLSelectElement;
                                                target.setCustomValidity('');
                                            }}
                                        >
                                            <option value={0}>Select Faculty</option>
                                            {faculties.map((faculty) => (
                                                <option key={faculty.id} value={faculty.id}>
                                                    {faculty.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Course *
                                            </label>
                                            <input
                                                ref={courseInputRef}
                                                type="number"
                                                name="course"
                                                value={formData.course === '' ? '' : formData.course}
                                                onChange={handleInputChange}
                                                min="1"
                                                max="6"
                                                step="1"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                required
                                                onInvalid={(e) => {
                                                    const target = e.target as HTMLInputElement;
                                                    if (target.validity.valueMissing) {
                                                        target.setCustomValidity('Please fill out this field');
                                                    } else if (target.validity.rangeOverflow) {
                                                        target.setCustomValidity('Value must be less than or equal to 6');
                                                    } else if (target.validity.rangeUnderflow) {
                                                        target.setCustomValidity('Value must be greater than or equal to 1');
                                                    }
                                                }}
                                                onInput={(e) => {
                                                    const target = e.target as HTMLInputElement;
                                                    target.setCustomValidity('');
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Number of Students
                                            </label>
                                            <input
                                                type="number"
                                                name="studentCount"
                                                value={formData.studentCount === '' ? '' : formData.studentCount}
                                                onChange={handleInputChange}
                                                min="0"
                                                step="1"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8 flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditModalOpen(false);
                                            setCurrentGroup(null);
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