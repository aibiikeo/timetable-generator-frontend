import axios from "axios";
import type {
    PublicTimetableFilterOptionsResponse,
    PublicTimetableQuery,
    PublicTimetableScheduleResponse,
} from "./types";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const publicApiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
    timeout: 60000,
});

function buildPublicTimetableParams(query: PublicTimetableQuery = {}) {
    const params = new URLSearchParams();

    Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            params.set(key, String(value));
        }
    });

    return params;
}

export const publicTimetableApi = {
    getFilterOptions: async (
        query: Pick<PublicTimetableQuery, "facultyId" | "departmentId"> = {},
    ): Promise<PublicTimetableFilterOptionsResponse> => {
        const params = buildPublicTimetableParams(query);
        const response = await publicApiClient.get<PublicTimetableFilterOptionsResponse>(
            `/api/aiu-timetable/filters${params.size ? `?${params}` : ""}`,
        );

        return response.data;
    },

    getSchedule: async (
        query: PublicTimetableQuery = {},
    ): Promise<PublicTimetableScheduleResponse> => {
        const params = buildPublicTimetableParams(query);
        const response = await publicApiClient.get<PublicTimetableScheduleResponse>(
            `/api/aiu-timetable${params.size ? `?${params}` : ""}`,
        );

        return response.data;
    },
};
