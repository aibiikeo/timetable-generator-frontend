import apiClient from "./api";
import type { AssignmentRequest, AssignmentResponse, DeleteMode } from "./types";

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

    getAssignmentsForTimetables: async (
        timetableIds: number[],
    ): Promise<AssignmentResponse[]> => {
        const results = await Promise.all(
            timetableIds.map((timetableId) =>
                assignmentApi.getAssignmentsByTimetable(timetableId).then((assignments) =>
                    assignments.map((assignment) => ({
                        ...assignment,
                        timetableId,
                    })),
                ),
            ),
        );

        return results.flat();
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
        mode: DeleteMode = "SIMPLE",
    ): Promise<void> => {
        await apiClient.delete(
            `/api/timetables/${timetableId}/assignments/${assignmentId}?mode=${mode}`,
        );
    },
};
