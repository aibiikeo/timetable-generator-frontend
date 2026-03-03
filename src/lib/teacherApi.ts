import apiClient from './api';
import { TeacherResponse, TeacherRequest, AssignmentResponse, DeleteMode } from './types';

export const teacherApi = {
    // Получить всех преподавателей
    getTeachers: async (): Promise<TeacherResponse[]> => {
        const response = await apiClient.get<TeacherResponse[]>('/api/teachers');
        return response.data;
    },

    // Получить преподавателя по ID
    getTeacherById: async (id: number): Promise<TeacherResponse> => {
        const response = await apiClient.get<TeacherResponse>(`/api/teachers/${id}`);
        return response.data;
    },

    // Создать преподавателя
    createTeacher: async (teacherData: TeacherRequest): Promise<TeacherResponse> => {
        const response = await apiClient.post<TeacherResponse>('/api/teachers', teacherData);
        return response.data;
    },

    // Обновить преподавателя
    updateTeacher: async (id: number, teacherData: TeacherRequest): Promise<TeacherResponse> => {
        const response = await apiClient.put<TeacherResponse>(`/api/teachers/${id}`, teacherData);
        return response.data;
    },

    // Получить назначения преподавателя (эндпоинт должен быть добавлен на бэкенде)
    getAssignmentsByTeacherId: async (teacherId: number): Promise<AssignmentResponse[]> => {
        const response = await apiClient.get<AssignmentResponse[]>(`/api/teachers/${teacherId}/assignments`);
        return response.data;
    },

    // Удалить преподавателя с указанным режимом
    deleteTeacher: async (id: number, mode: DeleteMode = "SIMPLE"): Promise<void> => {
        await apiClient.delete(`/api/teachers/${id}?mode=${mode}`);
    },
};