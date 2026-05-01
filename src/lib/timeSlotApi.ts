import apiClient from "./api";
import {
    DayOfWeek,
    TimeSlotRequest,
    TimeSlotResponse,
} from "./types";

export const timeSlotApi = {
    getTimeSlots: async (): Promise<TimeSlotResponse[]> => {
        const response = await apiClient.get<TimeSlotResponse[]>("/api/time-slots");
        return response.data;
    },

    getTimeSlot: async (id: number): Promise<TimeSlotResponse> => {
        const response = await apiClient.get<TimeSlotResponse>(
            `/api/time-slots/${id}`,
        );
        return response.data;
    },

    getTimeSlotsByDay: async (
        dayOfWeek: DayOfWeek,
    ): Promise<TimeSlotResponse[]> => {
        const response = await apiClient.get<TimeSlotResponse[]>(
            `/api/time-slots/day/${dayOfWeek}`,
        );
        return response.data;
    },

    createTimeSlot: async (
        data: TimeSlotRequest,
    ): Promise<TimeSlotResponse> => {
        const response = await apiClient.post<TimeSlotResponse>(
            "/api/time-slots",
            data,
        );
        return response.data;
    },

    updateTimeSlot: async (
        id: number,
        data: TimeSlotRequest,
    ): Promise<TimeSlotResponse> => {
        const response = await apiClient.put<TimeSlotResponse>(
            `/api/time-slots/${id}`,
            data,
        );
        return response.data;
    },

    deleteTimeSlot: async (id: number): Promise<void> => {
        await apiClient.delete(`/api/time-slots/${id}`);
    },
};