import apiClient from "./api";
import type {
    QuickActionOptionResponse,
    QuickActionSettingsRequest,
    QuickActionSettingsResponse,
} from "./types";

export const quickActionApi = {
    async getOptions() {
        const response = await apiClient.get<QuickActionOptionResponse[]>(
            "/api/quick-actions/options",
        );
        return response.data;
    },

    async getSettings() {
        const response = await apiClient.get<QuickActionSettingsResponse>(
            "/api/quick-actions/settings",
        );
        return response.data;
    },

    async updateSettings(data: QuickActionSettingsRequest) {
        const response = await apiClient.put<QuickActionSettingsResponse>(
            "/api/quick-actions/settings",
            data,
        );
        return response.data;
    },

    async recordUsage(actionId: string) {
        const response = await apiClient.post<QuickActionSettingsResponse>(
            `/api/quick-actions/${actionId}/usage`,
        );
        return response.data;
    },
};
