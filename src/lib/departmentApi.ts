import apiClient from './api';
import { DepartmentResponse, DepartmentRequest, DeleteMode } from './types';

export const departmentApi = {
    getDepartments: async (): Promise<DepartmentResponse[]> => {
        const response = await apiClient.get<DepartmentResponse[]>('/api/departments');
        return response.data;
    },

    getDepartmentById: async (id: number): Promise<DepartmentResponse> => {
        const response = await apiClient.get<DepartmentResponse>(`/api/departments/${id}`);
        return response.data;
    },

    createDepartment: async (data: DepartmentRequest): Promise<DepartmentResponse> => {
        const response = await apiClient.post<DepartmentResponse>('/api/departments', data);
        return response.data;
    },

    updateDepartment: async (id: number, data: DepartmentRequest): Promise<DepartmentResponse> => {
        const response = await apiClient.put<DepartmentResponse>(`/api/departments/${id}`, data);
        return response.data;
    },

    deleteDepartment: async (id: number, mode: DeleteMode = "SIMPLE"): Promise<void> => {
        await apiClient.delete(`/api/departments/${id}?mode=${mode}`);
    }
};