// src/lib/api.ts
import axios, {
    AxiosError,
    AxiosResponse,
    InternalAxiosRequestConfig,
} from 'axios';
import {
    AuthResponse,
    ApiError,
    LoginRequest,
    RefreshTokenRequest,
    UserRequest,
    UserResponse,
} from './types';

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/* =======================
   Storage keys
======================= */

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

/* =======================
   Axios instance
======================= */

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
});

/* =======================
   Token helpers
======================= */

const getAccessToken = () =>
    typeof window !== 'undefined'
        ? localStorage.getItem(ACCESS_TOKEN_KEY)
        : null;

const getRefreshToken = () =>
    typeof window !== 'undefined'
        ? localStorage.getItem(REFRESH_TOKEN_KEY)
        : null;

const setTokens = (accessToken: string, refreshToken: string) => {
    if (typeof window === 'undefined') return;

    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

const clearTokens = () => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
};

/* =======================
   Request interceptor
======================= */

apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = getAccessToken();

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        console.log(
            `[API] ${config.method?.toUpperCase()} ${config.url}`
        );

        return config;
    },
    (error) => Promise.reject(error)
);

/* =======================
   Response interceptor
======================= */

apiClient.interceptors.response.use(
    (response: AxiosResponse) => {
        console.log(
            `[API] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`
        );
        return response;
    },
    async (error: AxiosError<ApiError>) => {
        const originalRequest =
            error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url?.includes('/auth/refresh') &&
            !originalRequest.url?.includes('/auth/login')
        ) {
            console.log('[API Interceptor] 401 on protected route, attempting refresh');

            originalRequest._retry = true;

            try {
                const refreshToken = getRefreshToken();
                if (!refreshToken) {
                    console.error('[API] No refresh token available');
                    throw new Error('No refresh token');
                }

                console.log('[API] Attempting token refresh with refresh token');
                const response = await apiClient.post<AuthResponse>(
                    '/auth/refresh',
                    { refreshToken } as RefreshTokenRequest
                );

                const { access_token, refresh_token } = response.data;

                if (!access_token || !refresh_token) {
                    console.error('[API] Invalid refresh response - tokens missing');
                    throw new Error('Invalid refresh response');
                }

                console.log('[API] Token refresh successful, setting new tokens');
                setTokens(access_token, refresh_token);

                // Очищаем старые заголовки и устанавливаем новые
                delete originalRequest.headers.Authorization;
                originalRequest.headers.Authorization = `Bearer ${access_token}`;

                console.log('[API] Retrying original request with new token');
                return apiClient(originalRequest);
            } catch (refreshError: any) {
                console.error('[API] Token refresh failed:', refreshError.message);
                clearTokens();

                if (typeof window !== 'undefined') {
                    console.log('[API] Redirecting to login');
                    window.location.href = '/login';
                }

                return Promise.reject(refreshError);
            }
        } else if (error.response?.status === 401 && originalRequest.url?.includes('/auth/login')) {
            return Promise.reject(error);
        }

        return Promise.reject(error);
    }
);

/* =======================
   API methods
======================= */

export const api = {
    // Auth
    login: async (data: LoginRequest) => {
        const response = await apiClient.post<AuthResponse>(
            '/auth/login',
            data
        );

        const { access_token, refresh_token } = response.data;

        if (!access_token || !refresh_token) {
            throw new Error('Invalid login response');
        }

        setTokens(access_token, refresh_token);

        return response;
    },

    refreshToken: (data: RefreshTokenRequest) =>
        apiClient.post<AuthResponse>('/auth/refresh', data),

    // Users
    getUsers: () => apiClient.get<UserResponse[]>('/api/users'),

    getUser: (id: number) =>
        apiClient.get<UserResponse>(`/api/users/${id}`),

    createUser: (data: UserRequest) =>
        apiClient.post<UserResponse>('/api/users', data),

    updateUser: (id: number, data: Partial<UserRequest>) =>
        apiClient.put<UserResponse>(`/api/users/${id}`, data),

    deleteUser: (id: number) =>
        apiClient.delete<void>(`/api/users/${id}`),

    createSuperAdmin: (data: UserRequest) =>
        apiClient.post<UserResponse>('/api/users/super-admin', data),

    getUserIdByEmail: (email: string) =>
        apiClient.get<{ id: number }>(
            `/api/users/id-by-email?email=${encodeURIComponent(email)}`
        ),

    // Utils
    setTokens,
    clearTokens,
    getAccessToken,
};

/* =======================
   useAuth hook
======================= */

export const useAuth = () => {
    const logout = () => {
        clearTokens();
        localStorage.removeItem('userEmail');
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
    };

    return {
        isAuthenticated: !!getAccessToken(),
        logout,
    };
};

export default apiClient;
