import apiClient from "./api";
import {
    DeleteMode,
    FacultyResponse,
    StudyGroupRequest,
    StudyGroupResponse,
} from "./types";

export const groupApi = {
    getGroups: async (): Promise<StudyGroupResponse[]> => {
        const response = await apiClient.get<StudyGroupResponse[]>("/api/groups");
        return response.data;
    },

    getGroupById: async (id: number): Promise<StudyGroupResponse> => {
        const response = await apiClient.get<StudyGroupResponse>(`/api/groups/${id}`);
        return response.data;
    },

    getGroupsByFacultyId: async (facultyId: number): Promise<StudyGroupResponse[]> => {
        const response = await apiClient.get<StudyGroupResponse[]>(
            `/api/groups/faculty/${facultyId}`,
        );
        return response.data;
    },

    getGroupsByDepartmentId: async (
        departmentId: number,
    ): Promise<StudyGroupResponse[]> => {
        const response = await apiClient.get<StudyGroupResponse[]>(
            `/api/groups/department/${departmentId}`,
        );
        return response.data;
    },

    getGroupsByMajorId: async (majorId: number): Promise<StudyGroupResponse[]> => {
        const response = await apiClient.get<StudyGroupResponse[]>(
            `/api/groups/major/${majorId}`,
        );
        return response.data;
    },

    createGroup: async (
        groupData: StudyGroupRequest,
    ): Promise<StudyGroupResponse> => {
        const response = await apiClient.post<StudyGroupResponse>(
            "/api/groups",
            groupData,
        );
        return response.data;
    },

    updateGroup: async (
        id: number,
        groupData: StudyGroupRequest,
    ): Promise<StudyGroupResponse> => {
        const response = await apiClient.put<StudyGroupResponse>(
            `/api/groups/${id}`,
            groupData,
        );
        return response.data;
    },

    deleteGroup: async (
        id: number,
        mode: DeleteMode = "SIMPLE",
    ): Promise<void> => {
        await apiClient.delete(`/api/groups/${id}?mode=${mode}`);
    },

    getAllFaculties: async (): Promise<FacultyResponse[]> => {
        const response = await apiClient.get<FacultyResponse[]>("/api/faculties");
        return response.data;
    },

    // Backward-compatible aliases
    getAllGroups: async (): Promise<StudyGroupResponse[]> => {
        return groupApi.getGroups();
    },

    getGroupsByFaculty: async (
        facultyId: number,
    ): Promise<StudyGroupResponse[]> => {
        return groupApi.getGroupsByFacultyId(facultyId);
    },

    getGroupsByDepartment: async (
        departmentId: number,
    ): Promise<StudyGroupResponse[]> => {
        return groupApi.getGroupsByDepartmentId(departmentId);
    },

    getGroupsByMajor: async (majorId: number): Promise<StudyGroupResponse[]> => {
        return groupApi.getGroupsByMajorId(majorId);
    },

    updateGroupFull: async (
        id: number,
        groupData: StudyGroupRequest,
    ): Promise<StudyGroupResponse> => {
        return groupApi.updateGroup(id, groupData);
    },
};