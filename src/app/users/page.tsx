"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Edit,
    Loader2,
    Plus,
    Search,
    ShieldCheck,
    Trash2,
    Users,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getStoredUserRole, loadCurrentUserByStoredEmail } from "@/lib/authRole";
import {
    UserResponse,
    UserRole,
    userApi,
} from "@/lib";

type SortField = "email" | "role";
type SortDirection = "asc" | "desc";

interface FormDataState {
    email: string;
    password: string;
    role: UserRole;
}

interface FormErrors {
    email?: string;
    password?: string;
    role?: string;
    general?: string;
}

const EMPTY_FORM: FormDataState = {
    email: "",
    password: "",
    role: "ADMIN",
};

const USER_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN"];

function getApiErrorMessage(error: unknown, fallback: string) {
    if (
        typeof error === "object" &&
        error !== null &&
        "response" in error
    ) {
        const axiosError = error as {
            response?: {
                data?: unknown;
                status?: number;
            };
        };

        const data = axiosError.response?.data;

        if (typeof data === "string") {
            return data;
        }

        if (typeof data === "object" && data !== null) {
            const body = data as {
                message?: string;
                error?: string;
                details?: string;
            };

            if (body.message) return body.message;
            if (body.error) return body.error;
            if (body.details) return body.details;
        }

        if (axiosError.response?.status === 400) {
            return "Invalid data. Check email, password and role.";
        }

        if (axiosError.response?.status === 403) {
            return "You do not have permission to perform this action.";
        }

        if (axiosError.response?.status === 409) {
            return "This user already exists.";
        }
    }

    return fallback;
}

function mapUserApiErrorToFormErrors(message: string): FormErrors {
    const lower = message.toLowerCase();

    if (
        lower.includes("email") ||
        lower.includes("already in use") ||
        lower.includes("already exists")
    ) {
        return {
            email: message,
        };
    }

    if (
        lower.includes("password") ||
        lower.includes("пароль")
    ) {
        return {
            password: message,
        };
    }

    if (
        lower.includes("role") ||
        lower.includes("роль")
    ) {
        return {
            role: message,
        };
    }

    return {
        general: message,
    };
}

export default function UsersPage() {
    const router = useRouter();

    const [users, setUsers] = useState<UserResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

    const [sortField, setSortField] = useState<SortField>("email");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);

    const [formData, setFormData] = useState<FormDataState>(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState<FormErrors>({});

    const [checkingAccess, setCheckingAccess] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);

    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) return users;

        const lower = searchQuery.toLowerCase();

        return users.filter((user) => {
            return (
                user.email.toLowerCase().includes(lower) ||
                user.role.toLowerCase().includes(lower) ||
                user.id.toString().includes(lower)
            );
        });
    }, [users, searchQuery]);

    const sortedUsers = useMemo(() => {
        return [...filteredUsers].sort((a, b) => {
            const direction = sortDirection === "asc" ? 1 : -1;

            return (
                String(a[sortField]).localeCompare(String(b[sortField])) *
                direction
            );
        });
    }, [filteredUsers, sortField, sortDirection]);

    const superAdminCount = useMemo(() => {
        return users.filter((user) => user.role === "SUPER_ADMIN").length;
    }, [users]);

    const loadData = async (initial = false) => {
        try {
            if (initial) setLoading(true);

            setError("");

            const data = await userApi.getUsers();
            setUsers(data);
        } catch {
            setError("Failed to load users");
        } finally {
            if (initial) setLoading(false);
        }
    };

    useEffect(() => {
        const checkAccess = async () => {
            try {
                let role = getStoredUserRole();

                if (!role) {
                    const user = await loadCurrentUserByStoredEmail();
                    role = user?.role ?? null;
                }

                if (role !== "SUPER_ADMIN") {
                    setHasAccess(false);
                    router.replace("/home");
                    return;
                }

                setHasAccess(true);
            } catch {
                setHasAccess(false);
                router.replace("/home");
            } finally {
                setCheckingAccess(false);
            }
        };

        void checkAccess();
    }, [router]);

    useEffect(() => {
        if (!checkingAccess && hasAccess) {
            void loadData(true);
        }
    }, [checkingAccess, hasAccess]);

    const resetForm = () => {
        setFormData(EMPTY_FORM);
        setFormErrors({});
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection((current) =>
                current === "asc" ? "desc" : "asc",
            );
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const getSortLabel = (field: SortField, label: string) => {
        const isActive = sortField === field;

        return (
            <button
                type="button"
                onClick={() => handleSort(field)}
                className="inline-flex items-center gap-1 font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
                {label}
                {isActive && (
                    <span className="text-xs">
                        {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                )}
            </button>
        );
    };

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        setFormErrors((prev) => ({
            ...prev,
            [name]: undefined,
            general: undefined,
        }));
    };

    const validateForm = (mode: "create" | "edit") => {
        const nextErrors: FormErrors = {};
        const email = formData.email.trim();
        const password = formData.password.trim();

        if (!email) {
            nextErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            nextErrors.email = "Enter a valid email address";
        }

        if (mode === "create" && !password) {
            nextErrors.password = "Password is required for a new user";
        } else if (password && password.length < 6) {
            nextErrors.password = "Password must be at least 6 characters";
        }

        if (formData.role !== "ADMIN" && formData.role !== "SUPER_ADMIN") {
            nextErrors.role = "Please select a valid role";
        }

        setFormErrors(nextErrors);

        return Object.keys(nextErrors).length === 0;
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm("create")) return;

        try {
            setError("");
            setFormErrors({});

            await userApi.createUser({
                email: formData.email.trim(),
                password: formData.password.trim(),
                role: formData.role,
            });

            setIsCreateModalOpen(false);
            resetForm();

            await loadData();
        } catch (err) {
            const message = getApiErrorMessage(err, "Failed to create user");
            setFormErrors(mapUserApiErrorToFormErrors(message));
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentUser) return;
        if (!validateForm("edit")) return;

        try {
            setError("");
            setFormErrors({});

            await userApi.updateUser(currentUser.id, {
                email: formData.email.trim(),
                role: formData.role,
                ...(formData.password.trim()
                    ? { password: formData.password.trim() }
                    : {}),
            });

            setIsEditModalOpen(false);
            setCurrentUser(null);
            resetForm();

            await loadData();
        } catch (err) {
            const message = getApiErrorMessage(err, "Failed to update user");
            setFormErrors(mapUserApiErrorToFormErrors(message));
        }
    };

    const handleEdit = (user: UserResponse) => {
        setError("");
        setFormErrors({});
        setCurrentUser(user);

        setFormData({
            email: user.email,
            password: "",
            role: user.role,
        });

        setIsEditModalOpen(true);
    };

    const handleDelete = async (user: UserResponse) => {
        if (!confirm(`Delete user "${user.email}"?`)) return;

        try {
            setError("");

            await userApi.deleteUser(user.id);
            await loadData();
        } catch (err) {
            setError(getApiErrorMessage(err, "Failed to delete user"));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedUsers.length === 0) return;

        if (!confirm(`Delete ${selectedUsers.length} selected users?`)) return;

        try {
            setError("");

            const results = await Promise.allSettled(
                selectedUsers.map((id) => userApi.deleteUser(id)),
            );

            const failed = results.filter(
                (result) => result.status === "rejected",
            );

            if (failed.length > 0) {
                setError(`${failed.length} user(s) could not be deleted`);
            }

            setSelectedUsers([]);
            await loadData();
        } catch {
            setError("Unexpected error while deleting users");
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedUsers(sortedUsers.map((user) => user.id));
        } else {
            setSelectedUsers([]);
        }
    };

    const handleSelectUser = (id: number) => {
        setSelectedUsers((prev) =>
            prev.includes(id)
                ? prev.filter((userId) => userId !== id)
                : [...prev, id],
        );
    };

    const openCreateModal = () => {
        setError("");
        resetForm();
        setIsCreateModalOpen(true);
    };

    const closeCreateModal = () => {
        setIsCreateModalOpen(false);
        resetForm();
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setCurrentUser(null);
        resetForm();
    };

    return (
        <AppShell>
            {checkingAccess ? (
                <div className="flex min-h-[60vh] items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                        <p className="mt-3 text-sm text-muted-foreground">
                            Checking access...
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    <PageHeader
                        eyebrow="Administration"
                        title="Users"
                        description="Manage administrator accounts and system access roles."
                        actions={
                            <Button onClick={openCreateModal}>
                                <Plus className="h-4 w-4" />
                                New user
                            </Button>
                        }
                    />

                    {error && (
                        <Card className="mb-6 border-red-200 bg-red-50 text-red-800">
                            <CardContent className="p-4 text-sm">
                                {error}
                            </CardContent>
                        </Card>
                    )}

                    <section className="grid gap-4 md:grid-cols-3">
                        <Card className="glass-card">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Users
                                </CardTitle>
                                <Users className="h-4 w-4 text-blue-700" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">
                                    {users.length}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Total accounts
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="glass-card">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Super admins
                                </CardTitle>
                                <ShieldCheck className="h-4 w-4 text-violet-700" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">
                                    {superAdminCount}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Full access accounts
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="glass-card">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Selected
                                </CardTitle>
                                <Badge variant="secondary">Bulk</Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">
                                    {selectedUsers.length}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Selected rows
                                </p>
                            </CardContent>
                        </Card>
                    </section>

                    <Card className="glass-card mt-6">
                        <CardHeader>
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="relative w-full max-w-xl">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) =>
                                            setSearchQuery(e.target.value)
                                        }
                                        placeholder="Search by email, role or ID..."
                                        className="h-11 rounded-xl pl-10 pr-4 shadow-sm"
                                    />
                                </div>

                                {selectedUsers.length > 0 && (
                                    <Button
                                        variant="destructive"
                                        onClick={handleDeleteSelected}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete selected ({selectedUsers.length})
                                    </Button>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent>
                            {loading ? (
                                <div className="space-y-3">
                                    {Array.from({ length: 6 }).map(
                                        (_, index) => (
                                            <Skeleton
                                                key={index}
                                                className="h-14 w-full"
                                            />
                                        ),
                                    )}
                                </div>
                            ) : sortedUsers.length === 0 ? (
                                <EmptyState
                                    title="No users found"
                                    description="Create a user or change the search query."
                                    actionLabel="New user"
                                    onAction={openCreateModal}
                                />
                            ) : (
                                <div className="custom-scrollbar overflow-x-auto">
                                    <table className="w-full min-w-[850px] text-sm">
                                        <thead>
                                        <tr className="border-b text-left">
                                            <th className="w-12 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        selectedUsers.length ===
                                                        sortedUsers.length &&
                                                        sortedUsers.length > 0
                                                    }
                                                    onChange={handleSelectAll}
                                                    className="h-4 w-4 rounded border-gray-300"
                                                />
                                            </th>
                                            <th className="py-3">
                                                {getSortLabel("email", "Email")}
                                            </th>
                                            <th className="py-3">
                                                {getSortLabel("role", "Role")}
                                            </th>
                                            <th className="py-3">ID</th>
                                            <th className="py-3 text-right">
                                                Actions
                                            </th>
                                        </tr>
                                        </thead>

                                        <tbody>
                                        {sortedUsers.map((user) => (
                                            <tr
                                                key={user.id}
                                                className="border-b last:border-b-0 hover:bg-accent/50"
                                            >
                                                <td className="py-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedUsers.includes(
                                                            user.id,
                                                        )}
                                                        onChange={() =>
                                                            handleSelectUser(
                                                                user.id,
                                                            )
                                                        }
                                                        className="h-4 w-4 rounded border-gray-300"
                                                    />
                                                </td>

                                                <td className="py-4">
                                                    <div className="font-medium">
                                                        {user.email}
                                                    </div>
                                                </td>

                                                <td className="py-4">
                                                    <Badge
                                                        variant={
                                                            user.role ===
                                                            "SUPER_ADMIN"
                                                                ? "warning"
                                                                : "secondary"
                                                        }
                                                    >
                                                        {user.role}
                                                    </Badge>
                                                </td>

                                                <td className="py-4">
                                                    <Badge variant="outline">
                                                        #{user.id}
                                                    </Badge>
                                                </td>

                                                <td className="py-4">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            onClick={() =>
                                                                handleEdit(user)
                                                            }
                                                            aria-label="Edit user"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            onClick={() =>
                                                                handleDelete(user)
                                                            }
                                                            aria-label="Delete user"
                                                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {(isCreateModalOpen || isEditModalOpen) && (
                        <UserModal
                            title={
                                isCreateModalOpen
                                    ? "Create User"
                                    : "Edit User"
                            }
                            mode={isCreateModalOpen ? "create" : "edit"}
                            formData={formData}
                            formErrors={formErrors}
                            onChange={handleInputChange}
                            onClose={
                                isCreateModalOpen
                                    ? closeCreateModal
                                    : closeEditModal
                            }
                            onSubmit={
                                isCreateModalOpen
                                    ? handleCreateSubmit
                                    : handleEditSubmit
                            }
                        />
                    )}
                </>
            )}
        </AppShell>
    );
}

interface UserModalProps {
    title: string;
    mode: "create" | "edit";
    formData: FormDataState;
    formErrors: FormErrors;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

function UserModal({
                       title,
                       mode,
                       formData,
                       formErrors,
                       onClose,
                       onSubmit,
                       onChange,
                   }: UserModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="glass-card w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold">{title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {mode === "create"
                                ? "Create a new administrator account."
                                : "Update account details. Leave password empty to keep the old one."}
                        </p>
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                    >
                        ✕
                    </Button>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Email
                        </label>

                        <Input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={onChange}
                            placeholder="admin@example.com"
                            required
                            className={
                                formErrors.email
                                    ? "border-red-300 focus-visible:ring-red-400"
                                    : undefined
                            }
                        />

                        {formErrors.email && (
                            <p className="mt-1.5 text-sm text-red-600">
                                {formErrors.email}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Password
                        </label>

                        <Input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={onChange}
                            placeholder={
                                mode === "create"
                                    ? "Required for new user"
                                    : "Leave empty to keep current password"
                            }
                            required={mode === "create"}
                            className={
                                formErrors.password
                                    ? "border-red-300 focus-visible:ring-red-400"
                                    : undefined
                            }
                        />

                        {formErrors.password && (
                            <p className="mt-1.5 text-sm text-red-600">
                                {formErrors.password}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Role
                        </label>

                        <select
                            name="role"
                            value={formData.role}
                            onChange={onChange}
                            required
                            className={`flex h-10 w-full rounded-lg border bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 ${
                                formErrors.role
                                    ? "border-red-300 focus-visible:ring-red-400"
                                    : "border-input focus-visible:ring-ring"
                            }`}
                        >
                            {USER_ROLES.map((role) => (
                                <option key={role} value={role}>
                                    {role}
                                </option>
                            ))}
                        </select>

                        {formErrors.role && (
                            <p className="mt-1.5 text-sm text-red-600">
                                {formErrors.role}
                            </p>
                        )}
                    </div>

                    {formErrors.general && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {formErrors.general}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit">Save</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}