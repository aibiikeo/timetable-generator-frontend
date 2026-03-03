import apiClient from './api';
import { SubjectRequest, SubjectResponse, TeacherResponse } from './types';

export const subjectApi = {
    // Получить все предметы
    getSubjects: async (): Promise<SubjectResponse[]> => {
        const response = await apiClient.get<SubjectResponse[]>('/api/subjects');
        return response.data;
    },

    // Получить предмет по ID
    getSubjectById: async (id: number): Promise<SubjectResponse> => {
        const response = await apiClient.get<SubjectResponse>(`/api/subjects/${id}`);
        return response.data;
    },

    // Создать предмет
    createSubject: async (subjectData: SubjectRequest): Promise<SubjectResponse> => {
        const response = await apiClient.post<SubjectResponse>('/api/subjects', subjectData);
        return response.data;
    },

    // Обновить предмет
    updateSubject: async (id: number, subjectData: SubjectRequest): Promise<SubjectResponse> => {
        const response = await apiClient.put<SubjectResponse>(`/api/subjects/${id}`, subjectData);
        return response.data;
    },

    // Удалить предмет
    deleteSubject: async (id: number): Promise<void> => {
        await apiClient.delete(`/api/subjects/${id}`);
    },

    // Получить предмет по коду (опционально)
    getSubjectByCode: async (code: string): Promise<SubjectResponse> => {
        const response = await apiClient.get<SubjectResponse>(`/api/subjects/code/${encodeURIComponent(code)}`);
        return response.data;
    },

    getTeachersBySubject: async (subjectId: number): Promise<TeacherResponse[]> => {
        const response = await apiClient.get<TeacherResponse[]>(`/api/subjects/${subjectId}/teachers`);
        return response.data;
    }
};