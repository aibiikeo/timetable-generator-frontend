// src/lib/roomApi.ts
import apiClient from './api';
import { RoomRequest, RoomResponse } from './types';

export const roomApi = {
    // Получить все комнаты
    getRooms: async (): Promise<RoomResponse[]> => {
        const response = await apiClient.get<RoomResponse[]>('/api/rooms');
        return response.data;
    },

    // Получить комнаты по типу
    getRoomsByType: async (type: string): Promise<RoomResponse[]> => {
        const response = await apiClient.get<RoomResponse[]>(`/api/rooms/type/${type}`);
        return response.data;
    },

    // Получить комнату по ID
    getRoomById: async (id: number): Promise<RoomResponse> => {
        const response = await apiClient.get<RoomResponse>(`/api/rooms/${id}`);
        return response.data;
    },

    // Создать комнату
    createRoom: async (roomData: RoomRequest): Promise<RoomResponse> => {
        const response = await apiClient.post<RoomResponse>('/api/rooms', roomData);
        return response.data;
    },

    // Обновить комнату
    updateRoom: async (id: number, roomData: RoomRequest): Promise<RoomResponse> => {
        const response = await apiClient.put<RoomResponse>(`/api/rooms/${id}`, roomData);
        return response.data;
    },

    // Удалить комнату
    deleteRoom: async (id: number): Promise<void> => {
        await apiClient.delete(`/api/rooms/${id}`);
    },

    // Алиасы для удобства
    getAllRooms: async (): Promise<RoomResponse[]> => {
        return roomApi.getRooms();
    }
};