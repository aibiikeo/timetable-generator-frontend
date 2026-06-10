import apiClient from './api';
import { UserRequest, UserResponse } from './types';

export const userApi = {
    getUsers: async (): Promise<UserResponse[]> => {
        const response = await apiClient.get<UserResponse[]>('/api/users');
        return response.data;
    },
    getUser: async (id: number): Promise<UserResponse> => {
        const response = await apiClient.get<UserResponse>(`/api/users/${id}`);
        return response.data;
    },
    createUser: async (userData: UserRequest): Promise<UserResponse> => {
        const response = await apiClient.post<UserResponse>('/api/users', userData);
        return response.data;
    },
    updateUser: async (id: number, userData: Partial<UserRequest>): Promise<UserResponse> => {
        const response = await apiClient.put<UserResponse>(`/api/users/${id}`, userData);
        return response.data;
    },
    deleteUser: async (id: number): Promise<void> => {
        await apiClient.delete(`/api/users/${id}`);
    },
    createSuperAdmin: async (userData: UserRequest): Promise<UserResponse> => {
        const response = await apiClient.post<UserResponse>('/api/users/super-admin', userData);
        return response.data;
    },
    getUserIdByEmail: async (email: string): Promise<number> => {
        const response = await apiClient.get<number>(`/api/users/id-by-email?email=${encodeURIComponent(email)}`,);
        return response.data;
    },
};