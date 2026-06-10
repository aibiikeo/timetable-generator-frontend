import apiClient from './api';
import { TeacherResponse, TeacherRequest, AssignmentResponse, DeleteMode } from './types';

export const teacherApi = {
    getTeachers: async (): Promise<TeacherResponse[]> => {
        const response = await apiClient.get<TeacherResponse[]>('/api/teachers');
        return response.data;
    },
    getTeacherById: async (id: number): Promise<TeacherResponse> => {
        const response = await apiClient.get<TeacherResponse>(`/api/teachers/${id}`);
        return response.data;
    },
    createTeacher: async (teacherData: TeacherRequest): Promise<TeacherResponse> => {
        const response = await apiClient.post<TeacherResponse>('/api/teachers', teacherData);
        return response.data;
    },
    updateTeacher: async (id: number, teacherData: TeacherRequest): Promise<TeacherResponse> => {
        const response = await apiClient.put<TeacherResponse>(`/api/teachers/${id}`, teacherData);
        return response.data;
    },
    getAssignmentsByTeacherId: async (teacherId: number): Promise<AssignmentResponse[]> => {
        const response = await apiClient.get<AssignmentResponse[]>(`/api/teachers/${teacherId}/assignments`);
        return response.data;
    },
    deleteTeacher: async (id: number, mode: DeleteMode = "SIMPLE"): Promise<void> => {
        await apiClient.delete(`/api/teachers/${id}?mode=${mode}`);
    },
};