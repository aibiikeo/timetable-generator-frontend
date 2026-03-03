import apiClient from './api';
import { LessonRequest, LessonResponse } from './types';

export const lessonApi = {
    // Получить все уроки для расписания
    getLessonsByTimetable: async (timetableId: number): Promise<LessonResponse[]> => {
        const response = await apiClient.get<LessonResponse[]>(`/api/timetables/${timetableId}/lessons`);
        return response.data;
    },

    // Получить урок по ID
    getLesson: async (timetableId: number, lessonId: number): Promise<LessonResponse> => {
        const response = await apiClient.get<LessonResponse>(`/api/timetables/${timetableId}/lessons/${lessonId}`);
        return response.data;
    },

    // Создать урок
    createLesson: async (timetableId: number, data: LessonRequest): Promise<LessonResponse> => {
        const response = await apiClient.post<LessonResponse>(`/api/timetables/${timetableId}/lessons`, data);
        return response.data;
    },

    // Обновить урок
    updateLesson: async (timetableId: number, lessonId: number, data: LessonRequest): Promise<LessonResponse> => {
        const response = await apiClient.put<LessonResponse>(`/api/timetables/${timetableId}/lessons/${lessonId}`, data);
        return response.data;
    },

    // Удалить урок
    deleteLesson: async (timetableId: number, lessonId: number): Promise<void> => {
        await apiClient.delete(`/api/timetables/${timetableId}/lessons/${lessonId}`);
    }
};