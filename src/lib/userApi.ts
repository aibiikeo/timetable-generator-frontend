import apiClient from './api';
import { UserRequest, UserResponse } from './types';

export const userApi = {
    // Get all users
    getUsers: async (): Promise<UserResponse[]> => {
        const response = await apiClient.get<UserResponse[]>('/api/users');
        return response.data;
    },

    // Get user by ID
    getUser: async (id: number): Promise<UserResponse> => {
        const response = await apiClient.get<UserResponse>(`/api/users/${id}`);
        return response.data;
    },

    // Create user
    createUser: async (userData: UserRequest): Promise<UserResponse> => {
        const response = await apiClient.post<UserResponse>('/api/users', userData);
        return response.data;
    },

    // Update user
    updateUser: async (id: number, userData: Partial<UserRequest>): Promise<UserResponse> => {
        const response = await apiClient.put<UserResponse>(`/api/users/${id}`, userData);
        return response.data;
    },

    // Delete user
    deleteUser: async (id: number): Promise<void> => {
        await apiClient.delete(`/api/users/${id}`);
    },

    // Create super admin (optional, kept for completeness)
    createSuperAdmin: async (userData: UserRequest): Promise<UserResponse> => {
        const response = await apiClient.post<UserResponse>('/api/users/super-admin', userData);
        return response.data;
    },

    // Get user ID by email
    getUserIdByEmail: async (email: string): Promise<number> => {
        const response = await apiClient.get<number>(`/api/users/id-by-email?email=${encodeURIComponent(email)}`,);
        return response.data;
    },
};