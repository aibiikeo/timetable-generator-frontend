import apiClient from './api';
import { FacultyResponse, FacultyRequest, DeleteMode } from './types';

export const facultyApi = {
    getFaculties: async (): Promise<FacultyResponse[]> => {
        const response = await apiClient.get<FacultyResponse[]>('/api/faculties');
        return response.data;
    },
    getFacultyById: async (id: number): Promise<FacultyResponse> => {
        const response = await apiClient.get<FacultyResponse>(`/api/faculties/${id}`);
        return response.data;
    },
    createFaculty: async (facultyData: FacultyRequest): Promise<FacultyResponse> => {
        const response = await apiClient.post<FacultyResponse>('/api/faculties', facultyData);
        return response.data;
    },
    updateFaculty: async (id: number, facultyData: FacultyRequest): Promise<FacultyResponse> => {
        const response = await apiClient.put<FacultyResponse>(`/api/faculties/${id}`, facultyData);
        return response.data;
    },
    deleteFaculty: async (id: number, mode: DeleteMode = "SIMPLE"): Promise<void> => {
        await apiClient.delete(`/api/faculties/${id}?mode=${mode}`);
    }
};