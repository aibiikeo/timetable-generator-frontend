import apiClient from "./api";
import { DeleteMode, RoomRequest, RoomResponse, RoomType } from "./types";

export const roomApi = {
    getRooms: async (): Promise<RoomResponse[]> => {
        const response = await apiClient.get<RoomResponse[]>("/api/rooms");
        return response.data;
    },

    getRoomsByType: async (type: RoomType): Promise<RoomResponse[]> => {
        const response = await apiClient.get<RoomResponse[]>(
            `/api/rooms/type/${type}`,
        );
        return response.data;
    },

    getRoomById: async (id: number): Promise<RoomResponse> => {
        const response = await apiClient.get<RoomResponse>(`/api/rooms/${id}`);
        return response.data;
    },

    createRoom: async (roomData: RoomRequest): Promise<RoomResponse> => {
        const response = await apiClient.post<RoomResponse>("/api/rooms", roomData);
        return response.data;
    },

    updateRoom: async (
        id: number,
        roomData: RoomRequest,
    ): Promise<RoomResponse> => {
        const response = await apiClient.put<RoomResponse>(
            `/api/rooms/${id}`,
            roomData,
        );
        return response.data;
    },

    deleteRoom: async (
        id: number,
        mode: DeleteMode = "SIMPLE",
    ): Promise<void> => {
        await apiClient.delete(`/api/rooms/${id}?mode=${mode}`);
    },

    getAllRooms: async (): Promise<RoomResponse[]> => {
        return roomApi.getRooms();
    },
};