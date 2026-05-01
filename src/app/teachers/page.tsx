"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Edit,
    Plus,
    Presentation,
    Search,
    Trash2,
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
import {
    DeleteMode,
    TeacherResponse,
    teacherApi,
} from "@/lib";

type SortField = "fullName";
type SortDirection = "asc" | "desc";

interface FormDataState {
    fullName: string;
}

const EMPTY_FORM: FormDataState = {
    fullName: "",
};

export default function TeachersPage() {
    const [teachers, setTeachers] = useState<TeacherResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTeachers, setSelectedTeachers] = useState<number[]>([]);

    const [sortField, setSortField] = useState<SortField>("fullName");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentTeacher, setCurrentTeacher] = useState<TeacherResponse | null>(null);

    const [formData, setFormData] = useState<FormDataState>(EMPTY_FORM);

    useEffect(() => {
        void loadData(true);
    }, []);

    const filteredTeachers = useMemo(() => {
        if (!searchQuery.trim()) return teachers;

        const lower = searchQuery.toLowerCase();

        return teachers.filter((teacher) => {
            return (
                teacher.fullName.toLowerCase().includes(lower) ||
                teacher.id.toString().includes(lower)
            );
        });
    }, [teachers, searchQuery]);

    const sortedTeachers = useMemo(() => {
        return [...filteredTeachers].sort((a, b) => {
            const direction = sortDirection === "asc" ? 1 : -1;
            return a[sortField].localeCompare(b[sortField]) * direction;
        });
    }, [filteredTeachers, sortField, sortDirection]);

    const loadData = async (initial = false) => {
        try {
            if (initial) setLoading(true);

            setError("");

            const data = await teacherApi.getTeachers();
            setTeachers(data);
        } catch (err) {
            console.error("Error loading teachers:", err);
            setError("Failed to load teachers");
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const validateForm = () => {
        if (!formData.fullName.trim()) {
            setError("Teacher full name is required");
            return false;
        }

        return true;
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            setError("");

            await teacherApi.createTeacher({
                fullName: formData.fullName.trim(),
            });

            setIsCreateModalOpen(false);
            resetForm();

            await loadData();
        } catch (err: any) {
            console.error("Error creating teacher:", err);
            setError(err.response?.data?.message || "Failed to create teacher");
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentTeacher) return;
        if (!validateForm()) return;

        try {
            setError("");

            await teacherApi.updateTeacher(currentTeacher.id, {
                fullName: formData.fullName.trim(),
            });

            setIsEditModalOpen(false);
            setCurrentTeacher(null);
            resetForm();

            await loadData();
        } catch (err: any) {
            console.error("Error updating teacher:", err);
            setError(err.response?.data?.message || "Failed to update teacher");
        }
    };

    const handleEdit = (teacher: TeacherResponse) => {
        setCurrentTeacher(teacher);

        setFormData({
            fullName: teacher.fullName,
        });

        setIsEditModalOpen(true);
    };

    const handleDelete = async (teacher: TeacherResponse) => {
        if (!confirm(`Delete teacher "${teacher.fullName}"?`)) return;

        try {
            setError("");

            await teacherApi.deleteTeacher(teacher.id, "SIMPLE");
            await loadData();
        } catch (err: any) {
            console.error("Error deleting teacher:", err);
            setError(
                err.response?.data?.message ||
                "Failed to delete teacher. It may have related assignments.",
            );
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedTeachers.length === 0) return;

        if (!confirm(`Delete ${selectedTeachers.length} selected teachers?`)) return;

        try {
            setError("");

            const results = await Promise.allSettled(
                selectedTeachers.map((id) =>
                    teacherApi.deleteTeacher(id, "SIMPLE" as DeleteMode),
                ),
            );

            const failed = results.filter((result) => result.status === "rejected");

            if (failed.length > 0) {
                setError(`${failed.length} teacher(s) could not be deleted`);
            }

            setSelectedTeachers([]);
            await loadData();
        } catch {
            setError("Unexpected error while deleting teachers");
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedTeachers(sortedTeachers.map((teacher) => teacher.id));
        } else {
            setSelectedTeachers([]);
        }
    };

    const handleSelectTeacher = (id: number) => {
        setSelectedTeachers((prev) =>
            prev.includes(id)
                ? prev.filter((teacherId) => teacherId !== id)
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
        setCurrentTeacher(null);
        resetForm();
    };

    return (
        <AppShell>
            <PageHeader
                eyebrow="Resources"
                title="Teachers"
                description="Manage teachers used in subject assignments and timetable generation."
                actions={
                    <Button onClick={openCreateModal}>
                        <Plus className="h-4 w-4" />
                        New teacher
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
                            Teachers
                        </CardTitle>
                        <Presentation className="h-4 w-4 text-blue-700" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{teachers.length}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Total teachers
                        </p>
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Visible
                        </CardTitle>
                        <Badge variant="info">Search</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{sortedTeachers.length}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            After filtering
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
                        <div className="text-3xl font-bold">{selectedTeachers.length}</div>
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
                                placeholder="Search by teacher name or ID..."
                                className="h-11 rounded-xl pl-10 pr-4 shadow-sm"
                            />
                        </div>

                        {selectedTeachers.length > 0 && (
                            <Button variant="destructive" onClick={handleDeleteSelected}>
                                <Trash2 className="h-4 w-4" />
                                Delete selected ({selectedTeachers.length})
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
                    ) : sortedTeachers.length === 0 ? (
                        <EmptyState
                            title="No teachers found"
                            description="Create a teacher or change the search query."
                            actionLabel="New teacher"
                            onAction={openCreateModal}
                        />
                    ) : (
                        <div className="custom-scrollbar overflow-x-auto">
                            <table className="w-full min-w-[750px] text-sm">
                                <thead>
                                <tr className="border-b text-left">
                                    <th className="w-12 py-3">
                                        <input
                                            type="checkbox"
                                            checked={
                                                selectedTeachers.length === sortedTeachers.length &&
                                                sortedTeachers.length > 0
                                            }
                                            onChange={handleSelectAll}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                    </th>
                                    <th className="py-3">{getSortLabel("fullName", "Teacher")}</th>
                                    <th className="py-3">ID</th>
                                    <th className="py-3 text-right">Actions</th>
                                </tr>
                                </thead>

                                <tbody>
                                {sortedTeachers.map((teacher) => (
                                    <tr
                                        key={teacher.id}
                                        className="border-b last:border-b-0 hover:bg-accent/50"
                                    >
                                        <td className="py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedTeachers.includes(teacher.id)}
                                                onChange={() => handleSelectTeacher(teacher.id)}
                                                className="h-4 w-4 rounded border-gray-300"
                                            />
                                        </td>

                                        <td className="py-4">
                                            <div className="font-medium">{teacher.fullName}</div>
                                        </td>

                                        <td className="py-4">
                                            <Badge variant="outline">#{teacher.id}</Badge>
                                        </td>

                                        <td className="py-4">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => handleEdit(teacher)}
                                                    aria-label="Edit teacher"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => handleDelete(teacher)}
                                                    aria-label="Delete teacher"
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
                <TeacherModal
                    title={isCreateModalOpen ? "Create Teacher" : "Edit Teacher"}
                    formData={formData}
                    onChange={handleInputChange}
                    onClose={isCreateModalOpen ? closeCreateModal : closeEditModal}
                    onSubmit={isCreateModalOpen ? handleCreateSubmit : handleEditSubmit}
                />
            )}
        </AppShell>
    );
}

interface TeacherModalProps {
    title: string;
    formData: FormDataState;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function TeacherModal({
                          title,
                          formData,
                          onClose,
                          onSubmit,
                          onChange,
                      }: TeacherModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="glass-card w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold">{title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Fill in teacher information.
                        </p>
                    </div>

                    <Button type="button" variant="ghost" size="icon" onClick={onClose}>
                        ✕
                    </Button>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Full name
                        </label>
                        <Input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={onChange}
                            placeholder="Example: Aigerim Toktogulova"
                            required
                        />
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