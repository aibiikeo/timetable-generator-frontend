import apiClient from "./api";
import type { LessonRequest, LessonResponse, MoveLessonRequest, MoveLessonValidationResponse } from "./types";

export const lessonApi = {
    getLessonsByTimetable: async (
        timetableId: number,
    ): Promise<LessonResponse[]> => {
        const response = await apiClient.get<LessonResponse[]>(
            `/api/timetables/${timetableId}/lessons`,
        );

        return response.data;
    },

    getLesson: async (
        timetableId: number,
        lessonId: number,
    ): Promise<LessonResponse> => {
        const response = await apiClient.get<LessonResponse>(
            `/api/timetables/${timetableId}/lessons/${lessonId}`,
        );

        return response.data;
    },

    getLessonsForTimetables: async (
        timetableIds: number[],
    ): Promise<LessonResponse[]> => {
        const results = await Promise.all(
            timetableIds.map((timetableId) =>
                lessonApi.getLessonsByTimetable(timetableId),
            ),
        );

        return results.flat();
    },

    createLesson: async (
        timetableId: number,
        data: LessonRequest,
    ): Promise<LessonResponse> => {
        const response = await apiClient.post<LessonResponse>(
            `/api/timetables/${timetableId}/lessons`,
            data,
        );

        return response.data;
    },

    updateLesson: async (
        timetableId: number,
        lessonId: number,
        data: LessonRequest,
    ): Promise<LessonResponse> => {
        const response = await apiClient.put<LessonResponse>(
            `/api/timetables/${timetableId}/lessons/${lessonId}`,
            data,
        );

        return response.data;
    },

    validateLessonMove: async (
        timetableId: number,
        lessonId: number,
        data: MoveLessonRequest,
    ): Promise<MoveLessonValidationResponse> => {
        const response = await apiClient.post<MoveLessonValidationResponse>(
            `/api/timetables/${timetableId}/lessons/${lessonId}/move/validate`,
            data,
        );

        return response.data;
    },

    moveLesson: async (
        timetableId: number,
        lessonId: number,
        data: MoveLessonRequest,
    ): Promise<LessonResponse> => {
        const response = await apiClient.patch<LessonResponse>(
            `/api/timetables/${timetableId}/lessons/${lessonId}/move`,
            data,
        );

        return response.data;
    },

    deleteLesson: async (
        timetableId: number,
        lessonId: number,
    ): Promise<void> => {
        await apiClient.delete(
            `/api/timetables/${timetableId}/lessons/${lessonId}`,
        );
    },
};
