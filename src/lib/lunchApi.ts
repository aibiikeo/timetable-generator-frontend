import apiClient from "./api";
import { LunchRequest, LunchResponse } from "./types";

export const lunchApi = {
    getLunchById: async (id: number): Promise<LunchResponse> => {
        const response = await apiClient.get<LunchResponse>(`/api/lunches/${id}`);
        return response.data;
    },

    getLunchesByTimetable: async (
        timetableId: number,
    ): Promise<LunchResponse[]> => {
        const response = await apiClient.get<LunchResponse[]>(
            `/api/lunches/timetable/${timetableId}`,
        );
        return response.data;
    },

    getLunchesByTimetableAndGroup: async (
        timetableId: number,
        groupId: number,
    ): Promise<LunchResponse[]> => {
        const response = await apiClient.get<LunchResponse[]>(
            `/api/lunches/timetable/${timetableId}/group/${groupId}`,
        );
        return response.data;
    },

    createLunch: async (data: LunchRequest): Promise<LunchResponse> => {
        const response = await apiClient.post<LunchResponse>("/api/lunches", data);
        return response.data;
    },

    updateLunch: async (
        id: number,
        data: LunchRequest,
    ): Promise<LunchResponse> => {
        const response = await apiClient.put<LunchResponse>(
            `/api/lunches/${id}`,
            data,
        );
        return response.data;
    },

    deleteLunch: async (id: number): Promise<void> => {
        await apiClient.delete(`/api/lunches/${id}`);
    },
};