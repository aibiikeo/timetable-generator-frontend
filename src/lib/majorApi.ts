import apiClient from './api';
import { MajorResponse, MajorRequest, DeleteMode } from './types';

export const majorApi = {
    getMajors: async (): Promise<MajorResponse[]> => {
        const response = await apiClient.get<MajorResponse[]>('/api/majors');
        return response.data;
    },

    getMajorById: async (id: number): Promise<MajorResponse> => {
        const response = await apiClient.get<MajorResponse>(`/api/majors/${id}`);
        return response.data;
    },

    createMajor: async (data: MajorRequest): Promise<MajorResponse> => {
        const response = await apiClient.post<MajorResponse>('/api/majors', data);
        return response.data;
    },

    updateMajor: async (id: number, data: MajorRequest): Promise<MajorResponse> => {
        const response = await apiClient.put<MajorResponse>(`/api/majors/${id}`, data);
        return response.data;
    },

    deleteMajor: async (id: number, mode: DeleteMode = "SIMPLE"): Promise<void> => {
        await apiClient.delete(`/api/majors/${id}?mode=${mode}`);
    }
};