// src/lib/api.ts
import axios, {
    AxiosError,
    AxiosResponse,
    InternalAxiosRequestConfig,
} from "axios";
import {
    ApiError,
    AuthResponse,
    LoginRequest,
    RefreshTokenRequest,
    UserRequest,
    UserResponse,
} from "./types";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
    timeout: 60000,
});

const getAccessToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
};

const getRefreshToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
};

const setTokens = (accessToken: string, refreshToken?: string | null) => {
    if (typeof window === "undefined") return;

    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);

    if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
};

const clearTokens = () => {
    if (typeof window === "undefined") return;

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem("userEmail");
};

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong") {
    if (axios.isAxiosError<ApiError>(error)) {
        return (
            error.response?.data?.message ||
            error.response?.data?.details ||
            error.message ||
            fallback
        );
    }

    if (error instanceof Error) {
        return error.message;
    }

    return fallback;
}

apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = getAccessToken();

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError<ApiError>) => {
        const originalRequest =
            error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        const isUnauthorized = error.response?.status === 401;
        const isRefreshRequest = originalRequest?.url?.includes("/auth/refresh");
        const isLoginRequest = originalRequest?.url?.includes("/auth/login");

        if (
            isUnauthorized &&
            originalRequest &&
            !originalRequest._retry &&
            !isRefreshRequest &&
            !isLoginRequest
        ) {
            originalRequest._retry = true;

            try {
                const refreshToken = getRefreshToken();

                if (!refreshToken) {
                    throw new Error("No refresh token");
                }

                const response = await apiClient.post<AuthResponse>(
                    "/auth/refresh",
                    { refreshToken } satisfies RefreshTokenRequest,
                );

                const { access_token, refresh_token } = response.data;

                if (!access_token) {
                    throw new Error("Invalid refresh response");
                }

                setTokens(access_token, refresh_token ?? refreshToken);

                originalRequest.headers.Authorization = `Bearer ${access_token}`;

                return apiClient(originalRequest);
            } catch (refreshError) {
                clearTokens();

                if (typeof window !== "undefined") {
                    window.location.href = "/login";
                }

                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    },
);

export const api = {
    login: async (data: LoginRequest) => {
        const response = await apiClient.post<AuthResponse>("/auth/login", data);

        const { access_token, refresh_token } = response.data;

        if (!access_token || !refresh_token) {
            throw new Error("Invalid login response");
        }

        setTokens(access_token, refresh_token);

        return response;
    },

    refreshToken: async (data: RefreshTokenRequest) => {
        const response = await apiClient.post<AuthResponse>("/auth/refresh", data);

        const { access_token, refresh_token } = response.data;

        if (!access_token) {
            throw new Error("Invalid refresh response");
        }

        setTokens(access_token, refresh_token ?? data.refreshToken);

        return response;
    },

    getUsers: () => apiClient.get<UserResponse[]>("/api/users"),

    getUser: (id: number) =>
        apiClient.get<UserResponse>(`/api/users/${id}`),

    createUser: (data: UserRequest) =>
        apiClient.post<UserResponse>("/api/users", data),

    updateUser: (id: number, data: Partial<UserRequest>) =>
        apiClient.put<UserResponse>(`/api/users/${id}`, data),

    deleteUser: (id: number) =>
        apiClient.delete<void>(`/api/users/${id}`),

    createSuperAdmin: (data: UserRequest) =>
        apiClient.post<UserResponse>("/api/users/super-admin", data),

    getUserIdByEmail: (email: string) =>
        apiClient.get<{ id: number }>(
            `/api/users/id-by-email?email=${encodeURIComponent(email)}`,
        ),

    setTokens,
    clearTokens,
    getAccessToken,
    getRefreshToken,
};

export const useAuth = () => {
    const logout = () => {
        clearTokens();

        if (typeof window !== "undefined") {
            window.location.href = "/login";
        }
    };

    return {
        isAuthenticated: !!getAccessToken(),
        logout,
    };
};

export default apiClient;