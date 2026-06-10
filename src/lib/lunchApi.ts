import apiClient from "./api";
import type { DeleteMode, LunchRequest, LunchResponse } from "./types";

export const lunchApi = {
    getLunchById: async (id: number): Promise<LunchResponse> => {
        const response = await apiClient.get<LunchResponse>(`/api/lunch/${id}`);
        return response.data;
    },

    getLunchesByTimetable: async (
        timetableId: number,
    ): Promise<LunchResponse[]> => {
        const response = await apiClient.get<LunchResponse[]>(
            `/api/lunch/timetable/${timetableId}`,
        );
        return response.data;
    },

    getLunchesForTimetables: async (
        timetableIds: number[],
    ): Promise<LunchResponse[]> => {
        const results = await Promise.all(
            timetableIds.map((timetableId) =>
                lunchApi.getLunchesByTimetable(timetableId),
            ),
        );

        return results.flat();
    },

    getLunchesByTimetableAndGroup: async (
        timetableId: number,
        groupId: number,
    ): Promise<LunchResponse[]> => {
        const response = await apiClient.get<LunchResponse[]>(
            `/api/lunch/timetable/${timetableId}/group/${groupId}`,
        );
        return response.data;
    },

    createLunch: async (data: LunchRequest): Promise<LunchResponse> => {
        const response = await apiClient.post<LunchResponse>("/api/lunch", data);
        return response.data;
    },

    updateLunch: async (
        id: number,
        data: LunchRequest,
    ): Promise<LunchResponse> => {
        const response = await apiClient.put<LunchResponse>(
            `/api/lunch/${id}`,
            data,
        );
        return response.data;
    },

    deleteLunch: async (id: number, mode: DeleteMode = "SIMPLE"): Promise<void> => {
        await apiClient.delete(`/api/lunch/${id}?mode=${mode}`);
    },
};
