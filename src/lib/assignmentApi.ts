import apiClient from "./api";
import type { AssignmentRequest, AssignmentResponse } from "./types";

export const assignmentApi = {
    getAssignmentsByTimetable: async (
        timetableId: number,
    ): Promise<AssignmentResponse[]> => {
        const response = await apiClient.get<AssignmentResponse[]>(
            `/api/timetables/${timetableId}/assignments`,
        );

        return response.data;
    },

    getAssignment: async (
        timetableId: number,
        assignmentId: number,
    ): Promise<AssignmentResponse> => {
        const response = await apiClient.get<AssignmentResponse>(
            `/api/timetables/${timetableId}/assignments/${assignmentId}`,
        );

        return response.data;
    },

    createAssignment: async (
        timetableId: number,
        data: AssignmentRequest,
    ): Promise<AssignmentResponse> => {
        const response = await apiClient.post<AssignmentResponse>(
            `/api/timetables/${timetableId}/assignments`,
            data,
        );

        return response.data;
    },

    updateAssignment: async (
        timetableId: number,
        assignmentId: number,
        data: AssignmentRequest,
    ): Promise<AssignmentResponse> => {
        const response = await apiClient.put<AssignmentResponse>(
            `/api/timetables/${timetableId}/assignments/${assignmentId}`,
            data,
        );

        return response.data;
    },

    deleteAssignment: async (
        timetableId: number,
        assignmentId: number,
    ): Promise<void> => {
        await apiClient.delete(
            `/api/timetables/${timetableId}/assignments/${assignmentId}`,
        );
    },
};