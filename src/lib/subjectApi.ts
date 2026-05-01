import apiClient from "./api";
import {
    DeleteMode,
    SubjectRequest,
    SubjectResponse,
    TeacherResponse,
} from "./types";

export const subjectApi = {
    getSubjects: async (): Promise<SubjectResponse[]> => {
        const response = await apiClient.get<SubjectResponse[]>("/api/subjects");
        return response.data;
    },

    getSubjectById: async (id: number): Promise<SubjectResponse> => {
        const response = await apiClient.get<SubjectResponse>(`/api/subjects/${id}`);
        return response.data;
    },

    getSubjectsByFacultyId: async (
        facultyId: number,
    ): Promise<SubjectResponse[]> => {
        const response = await apiClient.get<SubjectResponse[]>(
            `/api/subjects/faculty/${facultyId}`,
        );
        return response.data;
    },

    getSubjectsByDepartmentId: async (
        departmentId: number,
    ): Promise<SubjectResponse[]> => {
        const response = await apiClient.get<SubjectResponse[]>(
            `/api/subjects/department/${departmentId}`,
        );
        return response.data;
    },

    getSubjectsByMajorId: async (majorId: number): Promise<SubjectResponse[]> => {
        const response = await apiClient.get<SubjectResponse[]>(
            `/api/subjects/major/${majorId}`,
        );
        return response.data;
    },

    createSubject: async (
        subjectData: SubjectRequest,
    ): Promise<SubjectResponse> => {
        const response = await apiClient.post<SubjectResponse>(
            "/api/subjects",
            subjectData,
        );
        return response.data;
    },

    updateSubject: async (
        id: number,
        subjectData: SubjectRequest,
    ): Promise<SubjectResponse> => {
        const response = await apiClient.put<SubjectResponse>(
            `/api/subjects/${id}`,
            subjectData,
        );
        return response.data;
    },

    deleteSubject: async (
        id: number,
        mode: DeleteMode = "SIMPLE",
    ): Promise<void> => {
        await apiClient.delete(`/api/subjects/${id}?mode=${mode}`);
    },

    getSubjectByCode: async (code: string): Promise<SubjectResponse> => {
        const response = await apiClient.get<SubjectResponse>(
            `/api/subjects/code/${encodeURIComponent(code)}`,
        );
        return response.data;
    },

    getTeachersBySubject: async (subjectId: number): Promise<TeacherResponse[]> => {
        const response = await apiClient.get<TeacherResponse[]>(
            `/api/subjects/${subjectId}/teachers`,
        );
        return response.data;
    },

    getSubjectsByFaculty: async (
        facultyId: number,
    ): Promise<SubjectResponse[]> => {
        return subjectApi.getSubjectsByFacultyId(facultyId);
    },

    getSubjectsByDepartment: async (
        departmentId: number,
    ): Promise<SubjectResponse[]> => {
        return subjectApi.getSubjectsByDepartmentId(departmentId);
    },

    getSubjectsByMajor: async (majorId: number): Promise<SubjectResponse[]> => {
        return subjectApi.getSubjectsByMajorId(majorId);
    },
};