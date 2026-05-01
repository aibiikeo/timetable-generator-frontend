import { api, userApi } from "@/lib";
import type { UserRole, UserResponse } from "@/lib/types";

const USER_EMAIL_KEY = "userEmail";
const USER_ROLE_KEY = "userRole";

export function getStoredUserRole(): UserRole | null {
    if (typeof window === "undefined") return null;

    const role = localStorage.getItem(USER_ROLE_KEY);

    if (role === "SUPER_ADMIN" || role === "ADMIN") {
        return role;
    }

    return null;
}

export function setStoredUserRole(role: UserRole) {
    if (typeof window === "undefined") return;

    localStorage.setItem(USER_ROLE_KEY, role);
}

export function clearStoredUserRole() {
    if (typeof window === "undefined") return;

    localStorage.removeItem(USER_ROLE_KEY);
}

export function getStoredUserEmail() {
    if (typeof window === "undefined") return null;

    return localStorage.getItem(USER_EMAIL_KEY);
}

export async function loadCurrentUserByStoredEmail(): Promise<UserResponse | null> {
    const email = getStoredUserEmail();
    const token = api.getAccessToken?.();

    if (!email || !token) return null;

    const userId = await userApi.getUserIdByEmail(email);
    const user = await userApi.getUser(userId);

    setStoredUserRole(user.role);

    return user;
}

export function isSuperAdmin() {
    return getStoredUserRole() === "SUPER_ADMIN";
}