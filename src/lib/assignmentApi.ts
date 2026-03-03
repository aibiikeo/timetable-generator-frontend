import apiClient from './api';
import { AssignmentResponse } from './types';

export const assignmentApi = {
    // Получить все назначения для конкретного расписания
    getAssignmentsByTimetable: async (timetableId: number): Promise<AssignmentResponse[]> => {
        const response = await apiClient.get<AssignmentResponse[]>(`/api/timetables/${timetableId}/assignments`);
        return response.data;
    },

    // Получить назначение по ID
    getAssignment: async (timetableId: number, assignmentId: number): Promise<AssignmentResponse> => {
        const response = await apiClient.get<AssignmentResponse>(`/api/timetables/${timetableId}/assignments/${assignmentId}`);
        return response.data;
    },

    // Создать новое назначение
    createAssignment: async (timetableId: number, data: any): Promise<AssignmentResponse> => {
        const response = await apiClient.post<AssignmentResponse>(`/api/timetables/${timetableId}/assignments`, data);
        return response.data;
    },

    // Обновить назначение
    updateAssignment: async (timetableId: number, assignmentId: number, data: any): Promise<AssignmentResponse> => {
        const response = await apiClient.put<AssignmentResponse>(`/api/timetables/${timetableId}/assignments/${assignmentId}`, data);
        return response.data;
    },

    // Удалить назначение
    deleteAssignment: async (timetableId: number, assignmentId: number): Promise<void> => {
        await apiClient.delete(`/api/timetables/${timetableId}/assignments/${assignmentId}`);
    }
};