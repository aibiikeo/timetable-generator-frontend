"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Edit, Plus, Search, Trash2 } from "lucide-react";

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
import {
    DepartmentResponse,
    FacultyResponse,
    departmentApi,
    facultyApi,
} from "@/lib";

type SortField = "name" | "faculty";
type SortDirection = "asc" | "desc";

interface FormDataState {
    name: string;
    facultyId: number;
}

const EMPTY_FORM: FormDataState = {
    name: "",
    facultyId: 0,
};

export default function DepartmentsPage() {
    const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
    const [faculties, setFaculties] = useState<FacultyResponse[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDepartments, setSelectedDepartments] = useState<number[]>([]);

    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentDepartment, setCurrentDepartment] =
        useState<DepartmentResponse | null>(null);

    const [formData, setFormData] = useState<FormDataState>(EMPTY_FORM);

    useEffect(() => {
        void loadData(true);
    }, []);

    const facultyMap = useMemo(() => {
        return new Map(faculties.map((faculty) => [faculty.id, faculty.name]));
    }, [faculties]);

    const filteredDepartments = useMemo(() => {
        if (!searchQuery.trim()) return departments;

        const lower = searchQuery.toLowerCase();

        return departments.filter((department) => {
            const facultyName =
                department.facultyName || facultyMap.get(department.facultyId) || "";

            return (
                department.name.toLowerCase().includes(lower) ||
                facultyName.toLowerCase().includes(lower) ||
                department.id.toString().includes(lower)
            );
        });
    }, [departments, facultyMap, searchQuery]);

    const sortedDepartments = useMemo(() => {
        return [...filteredDepartments].sort((a, b) => {
            const direction = sortDirection === "asc" ? 1 : -1;

            if (sortField === "faculty") {
                const facultyA = a.facultyName || facultyMap.get(a.facultyId) || "";
                const facultyB = b.facultyName || facultyMap.get(b.facultyId) || "";

                return facultyA.localeCompare(facultyB) * direction;
            }

            return a.name.localeCompare(b.name) * direction;
        });
    }, [filteredDepartments, facultyMap, sortDirection, sortField]);

    const loadData = async (initial = false) => {
        try {
            if (initial) setLoading(true);

            setError("");

            const [departmentsData, facultiesData] = await Promise.all([
                departmentApi.getDepartments(),
                facultyApi.getFaculties(),
            ]);

            setDepartments(departmentsData);
            setFaculties(facultiesData);
        } catch (err) {
            console.error("Error loading departments:", err);
            setError("Failed to load departments");
        } finally {
            if (initial) setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData(EMPTY_FORM);
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
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
            [name]: name === "facultyId" ? Number(value) : value,
        }));
    };

    const validateForm = () => {
        if (!formData.name.trim()) {
            setError("Department name is required");
            return false;
        }

        if (!formData.facultyId) {
            setError("Please select a faculty");
            return false;
        }

        return true;
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            setError("");

            await departmentApi.createDepartment({
                name: formData.name.trim(),
                facultyId: Number(formData.facultyId),
            });

            setIsCreateModalOpen(false);
            resetForm();

            await loadData();
        } catch (err: any) {
            console.error("Error creating department:", err);
            setError(err.response?.data?.message || "Failed to create department");
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentDepartment) return;
        if (!validateForm()) return;

        try {
            setError("");

            await departmentApi.updateDepartment(currentDepartment.id, {
                name: formData.name.trim(),
                facultyId: Number(formData.facultyId),
            });

            setIsEditModalOpen(false);
            setCurrentDepartment(null);
            resetForm();

            await loadData();
        } catch (err: any) {
            console.error("Error updating department:", err);
            setError(err.response?.data?.message || "Failed to update department");
        }
    };

    const handleEdit = (department: DepartmentResponse) => {
        setCurrentDepartment(department);

        setFormData({
            name: department.name,
            facultyId: department.facultyId,
        });

        setIsEditModalOpen(true);
    };

    const handleDelete = async (department: DepartmentResponse) => {
        if (!confirm(`Delete department "${department.name}"?`)) return;

        try {
            setError("");

            await departmentApi.deleteDepartment(department.id);
            await loadData();
        } catch (err: any) {
            console.error("Error deleting department:", err);
            setError(
                err.response?.data?.message ||
                "Failed to delete department. It may have related majors or groups.",
            );
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedDepartments.length === 0) return;

        if (!confirm(`Delete ${selectedDepartments.length} selected departments?`)) {
            return;
        }

        try {
            setError("");

            const results = await Promise.allSettled(
                selectedDepartments.map((id) => departmentApi.deleteDepartment(id)),
            );

            const failed = results.filter((result) => result.status === "rejected");

            if (failed.length > 0) {
                setError(`${failed.length} department(s) could not be deleted`);
            }

            setSelectedDepartments([]);
            await loadData();
        } catch {
            setError("Unexpected error while deleting departments");
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedDepartments(sortedDepartments.map((department) => department.id));
        } else {
            setSelectedDepartments([]);
        }
    };

    const handleSelectDepartment = (id: number) => {
        setSelectedDepartments((prev) =>
            prev.includes(id)
                ? prev.filter((departmentId) => departmentId !== id)
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
        setCurrentDepartment(null);
        resetForm();
    };

    return (
        <AppShell>
            <PageHeader
                eyebrow="Academic Structure"
                title="Departments"
                description="Manage departments and connect them with faculties."
                actions={
                    <Button onClick={openCreateModal}>
                        <Plus className="h-4 w-4" />
                        New department
                    </Button>
                }
            />

            {error && (
                <Card className="mb-6 border-red-200 bg-red-50 text-red-800">
                    <CardContent className="p-4 text-sm">{error}</CardContent>
                </Card>
            )}

            <section className="grid gap-4 md:grid-cols-3">
                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Departments
                        </CardTitle>
                        <Building2 className="h-4 w-4 text-blue-700" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{departments.length}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Total departments
                        </p>
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Faculties
                        </CardTitle>
                        <Badge variant="info">Linked</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{faculties.length}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Available faculties
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
                        <div className="text-3xl font-bold">{selectedDepartments.length}</div>
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
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by department or faculty..."
                                className="h-11 rounded-xl pl-10 pr-4 shadow-sm"
                            />
                        </div>

                        {selectedDepartments.length > 0 && (
                            <Button variant="destructive" onClick={handleDeleteSelected}>
                                <Trash2 className="h-4 w-4" />
                                Delete selected ({selectedDepartments.length})
                            </Button>
                        )}
                    </div>
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <Skeleton key={index} className="h-14 w-full" />
                            ))}
                        </div>
                    ) : sortedDepartments.length === 0 ? (
                        <EmptyState
                            title="No departments found"
                            description="Create a department or change the search query."
                            actionLabel="New department"
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
                                                selectedDepartments.length ===
                                                sortedDepartments.length &&
                                                sortedDepartments.length > 0
                                            }
                                            onChange={handleSelectAll}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                    </th>
                                    <th className="py-3">
                                        {getSortLabel("name", "Department")}
                                    </th>
                                    <th className="py-3">
                                        {getSortLabel("faculty", "Faculty")}
                                    </th>
                                    <th className="py-3">ID</th>
                                    <th className="py-3 text-right">Actions</th>
                                </tr>
                                </thead>

                                <tbody>
                                {sortedDepartments.map((department) => (
                                    <tr
                                        key={department.id}
                                        className="border-b last:border-b-0 hover:bg-accent/50"
                                    >
                                        <td className="py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedDepartments.includes(department.id)}
                                                onChange={() => handleSelectDepartment(department.id)}
                                                className="h-4 w-4 rounded border-gray-300"
                                            />
                                        </td>

                                        <td className="py-4">
                                            <div className="font-medium">{department.name}</div>
                                        </td>

                                        <td className="py-4">
                                            {department.facultyName ||
                                                facultyMap.get(department.facultyId) ||
                                                "Unknown"}
                                        </td>

                                        <td className="py-4">
                                            <Badge variant="outline">#{department.id}</Badge>
                                        </td>

                                        <td className="py-4">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => handleEdit(department)}
                                                    aria-label="Edit department"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => handleDelete(department)}
                                                    aria-label="Delete department"
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
                <DepartmentModal
                    title={isCreateModalOpen ? "Create Department" : "Edit Department"}
                    formData={formData}
                    faculties={faculties}
                    onChange={handleInputChange}
                    onClose={isCreateModalOpen ? closeCreateModal : closeEditModal}
                    onSubmit={isCreateModalOpen ? handleCreateSubmit : handleEditSubmit}
                />
            )}
        </AppShell>
    );
}

interface DepartmentModalProps {
    title: string;
    formData: FormDataState;
    faculties: FacultyResponse[];
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

function DepartmentModal({
                             title,
                             formData,
                             faculties,
                             onClose,
                             onSubmit,
                             onChange,
                         }: DepartmentModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="glass-card w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold">{title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Fill in department information and select faculty.
                        </p>
                    </div>

                    <Button type="button" variant="ghost" size="icon" onClick={onClose}>
                        ✕
                    </Button>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Department name
                        </label>
                        <Input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={onChange}
                            placeholder="Example: Software Engineering"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Faculty
                        </label>
                        <select
                            name="facultyId"
                            value={formData.facultyId}
                            onChange={onChange}
                            required
                            className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value={0}>Select faculty</option>
                            {faculties.map((faculty) => (
                                <option key={faculty.id} value={faculty.id}>
                                    {faculty.name}
                                </option>
                            ))}
                        </select>
                    </div>

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