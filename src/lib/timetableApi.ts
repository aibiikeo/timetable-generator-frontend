import apiClient from "./api";
import {
    DeleteMode,
    GenerationMode,
    GenerationResponse,
    TimetableRequest,
    TimetableResponse,
} from "./types";

function validateId(id: number, methodName: string): void {
    if (Number.isNaN(id) || id <= 0) {
        console.error(`[${methodName}] Invalid ID:`, id);
        throw new Error(`Invalid ID: ${id}`);
    }
}

export const timetableApi = {
    getAllTimetables: async (): Promise<TimetableResponse[]> => {
        const response = await apiClient.get<TimetableResponse[]>("/api/timetables");
        return response.data;
    },

    getPublishedTimetable: async (): Promise<TimetableResponse> => {
        const response = await apiClient.get<TimetableResponse>(
            "/api/timetables/published",
        );
        return response.data;
    },

    getTimetable: async (id: number): Promise<TimetableResponse> => {
        validateId(id, "getTimetable");

        const response = await apiClient.get<TimetableResponse>(
            `/api/timetables/${id}`,
        );
        return response.data;
    },

    createTimetable: async (
        data: TimetableRequest,
    ): Promise<TimetableResponse> => {
        const response = await apiClient.post<TimetableResponse>(
            "/api/timetables",
            data,
        );
        return response.data;
    },

    updateTimetable: async (
        id: number,
        data: TimetableRequest,
    ): Promise<TimetableResponse> => {
        validateId(id, "updateTimetable");

        const response = await apiClient.put<TimetableResponse>(
            `/api/timetables/${id}`,
            data,
        );
        return response.data;
    },

    publishTimetable: async (id: number): Promise<TimetableResponse> => {
        validateId(id, "publishTimetable");

        const response = await apiClient.post<TimetableResponse>(
            `/api/timetables/${id}/publish`,
        );
        return response.data;
    },

    deleteTimetable: async (
        id: number,
        mode: DeleteMode = "SIMPLE",
    ): Promise<void> => {
        validateId(id, "deleteTimetable");

        await apiClient.delete(`/api/timetables/${id}?mode=${mode}`);
    },

    generateTimetable: async (
        id: number,
        mode: GenerationMode = "NEW",
    ): Promise<GenerationResponse> => {
        validateId(id, "generateTimetable");

        const response = await apiClient.post<GenerationResponse>(
            `/api/generation/timetables/${id}/generate?mode=${mode}`,
        );
        return response.data;
    },

    manualPlaceLesson: async (
        timetableId: number,
        assignmentId: number,
        data: {
            dayOfWeek: string;
            startTime: string;
            durationHours: number;
            roomId: number;
        },
    ): Promise<boolean> => {
        validateId(timetableId, "manualPlaceLesson");

        if (Number.isNaN(assignmentId) || assignmentId <= 0) {
            console.error("[manualPlaceLesson] Invalid assignmentId:", assignmentId);
            throw new Error(`Invalid assignmentId: ${assignmentId}`);
        }

        const params = new URLSearchParams({
            dayOfWeek: data.dayOfWeek,
            startTime: data.startTime,
            durationHours: data.durationHours.toString(),
            roomId: data.roomId.toString(),
        });

        const response = await apiClient.post<boolean>(
            `/api/generation/timetables/${timetableId}/assignments/${assignmentId}/manual-place?${params}`,
        );

        return response.data;
    },
};