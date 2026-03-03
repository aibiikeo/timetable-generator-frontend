import apiClient from './api';
import { StudyGroupResponse, StudyGroupRequest, FacultyResponse } from './types';

export const groupApi = {
    // Получить группы по факультету
    getGroupsByFacultyId: async (facultyId: number): Promise<StudyGroupResponse[]> => {
        const response = await apiClient.get<StudyGroupResponse[]>(`/api/groups/faculty/${facultyId}`);
        return response.data;
    },

    // Получить все группы
    getGroups: async (): Promise<StudyGroupResponse[]> => {
        const response = await apiClient.get<StudyGroupResponse[]>('/api/groups');
        return response.data;
    },

    // Удалить группу
    deleteGroup: async (id: number): Promise<void> => {
        await apiClient.delete(`/api/groups/${id}`);
    },

    // Обновить группу (чтобы отвязать от факультета)
    updateGroup: async (id: number, data: Partial<StudyGroupResponse>): Promise<StudyGroupResponse> => {
        const response = await apiClient.put<StudyGroupResponse>(`/api/groups/${id}`, data);
        return response.data;
    },

    // ===== ДОБАВЛЕННЫЕ МЕТОДЫ =====

    // Получить группу по ID
    getGroupById: async (id: number): Promise<StudyGroupResponse> => {
        const response = await apiClient.get<StudyGroupResponse>(`/api/groups/${id}`);
        return response.data;
    },

    // Создать новую группу (полная версия с StudyGroupRequest)
    createGroup: async (groupData: StudyGroupRequest): Promise<StudyGroupResponse> => {
        const response = await apiClient.post<StudyGroupResponse>('/api/groups', groupData);
        return response.data;
    },

    // Получить все факультеты (для фильтрации)
    getAllFaculties: async (): Promise<FacultyResponse[]> => {
        const response = await apiClient.get<FacultyResponse[]>('/api/faculties');
        return response.data;
    },

    // Обновить группу (полная версия с StudyGroupRequest)
    updateGroupFull: async (id: number, groupData: StudyGroupRequest): Promise<StudyGroupResponse> => {
        const response = await apiClient.put<StudyGroupResponse>(`/api/groups/${id}`, groupData);
        return response.data;
    },

    // ===== АЛИАСЫ ДЛЯ УДОБСТВА =====

    // Алиас для getAllGroups (компатибильность)
    getAllGroups: async (): Promise<StudyGroupResponse[]> => {
        return groupApi.getGroups();
    },

    // Алиас для getGroupsByFacultyId (компатибильность)
    getGroupsByFaculty: async (facultyId: number): Promise<StudyGroupResponse[]> => {
        return groupApi.getGroupsByFacultyId(facultyId);
    }
};