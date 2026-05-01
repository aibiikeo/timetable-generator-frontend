"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit, Plus, School, Search, Trash2 } from "lucide-react";

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
import { FacultyResponse, facultyApi } from "@/lib";

type SortField = "name";
type SortDirection = "asc" | "desc";

interface FormDataState {
    name: string;
}

const EMPTY_FORM: FormDataState = {
    name: "",
};

export default function FacultiesPage() {
    const [faculties, setFaculties] = useState<FacultyResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFaculties, setSelectedFaculties] = useState<number[]>([]);

    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentFaculty, setCurrentFaculty] = useState<FacultyResponse | null>(null);

    const [formData, setFormData] = useState<FormDataState>(EMPTY_FORM);

    useEffect(() => {
        void loadData(true);
    }, []);

    const filteredFaculties = useMemo(() => {
        if (!searchQuery.trim()) return faculties;

        const lower = searchQuery.toLowerCase();

        return faculties.filter((faculty) => {
            return (
                faculty.name.toLowerCase().includes(lower) ||
                faculty.id.toString().includes(lower)
            );
        });
    }, [faculties, searchQuery]);

    const sortedFaculties = useMemo(() => {
        return [...filteredFaculties].sort((a, b) => {
            const direction = sortDirection === "asc" ? 1 : -1;
            return a[sortField].localeCompare(b[sortField]) * direction;
        });
    }, [filteredFaculties, sortField, sortDirection]);

    const loadData = async (initial = false) => {
        try {
            if (initial) setLoading(true);

            setError("");

            const data = await facultyApi.getFaculties();
            setFaculties(data);
        } catch (err) {
            console.error("Error loading faculties:", err);
            setError("Failed to load faculties");
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
        if (!formData.name.trim()) {
            setError("Faculty name is required");
            return false;
        }

        return true;
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            setError("");

            await facultyApi.createFaculty({
                name: formData.name.trim(),
            });

            setIsCreateModalOpen(false);
            resetForm();

            await loadData();
        } catch (err: any) {
            console.error("Error creating faculty:", err);
            setError(err.response?.data?.message || "Failed to create faculty");
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentFaculty) return;
        if (!validateForm()) return;

        try {
            setError("");

            await facultyApi.updateFaculty(currentFaculty.id, {
                name: formData.name.trim(),
            });

            setIsEditModalOpen(false);
            setCurrentFaculty(null);
            resetForm();

            await loadData();
        } catch (err: any) {
            console.error("Error updating faculty:", err);
            setError(err.response?.data?.message || "Failed to update faculty");
        }
    };

    const handleEdit = (faculty: FacultyResponse) => {
        setCurrentFaculty(faculty);

        setFormData({
            name: faculty.name,
        });

        setIsEditModalOpen(true);
    };

    const handleDelete = async (faculty: FacultyResponse) => {
        if (!confirm(`Delete faculty "${faculty.name}"?`)) return;

        try {
            setError("");

            await facultyApi.deleteFaculty(faculty.id);
            await loadData();
        } catch (err: any) {
            console.error("Error deleting faculty:", err);
            setError(
                err.response?.data?.message ||
                "Failed to delete faculty. It may have related departments, majors or groups.",
            );
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedFaculties.length === 0) return;

        if (!confirm(`Delete ${selectedFaculties.length} selected faculties?`)) return;

        try {
            setError("");

            const results = await Promise.allSettled(
                selectedFaculties.map((id) => facultyApi.deleteFaculty(id)),
            );

            const failed = results.filter((result) => result.status === "rejected");

            if (failed.length > 0) {
                setError(`${failed.length} faculty/faculties could not be deleted`);
            }

            setSelectedFaculties([]);
            await loadData();
        } catch {
            setError("Unexpected error while deleting faculties");
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedFaculties(sortedFaculties.map((faculty) => faculty.id));
        } else {
            setSelectedFaculties([]);
        }
    };

    const handleSelectFaculty = (id: number) => {
        setSelectedFaculties((prev) =>
            prev.includes(id)
                ? prev.filter((facultyId) => facultyId !== id)
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
        setCurrentFaculty(null);
        resetForm();
    };

    return (
        <AppShell>
            <PageHeader
                eyebrow="Academic Structure"
                title="Faculties"
                description="Manage university faculties used across departments, majors and groups."
                actions={
                    <Button onClick={openCreateModal}>
                        <Plus className="h-4 w-4" />
                        New faculty
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
                            Faculties
                        </CardTitle>
                        <School className="h-4 w-4 text-blue-700" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{faculties.length}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Total faculties
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
                        <div className="text-3xl font-bold">{sortedFaculties.length}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Matching search
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
                        <div className="text-3xl font-bold">{selectedFaculties.length}</div>
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
                                placeholder="Search by faculty name..."
                                className="h-11 rounded-xl pl-10 pr-4 shadow-sm"
                            />
                        </div>

                        {selectedFaculties.length > 0 && (
                            <Button variant="destructive" onClick={handleDeleteSelected}>
                                <Trash2 className="h-4 w-4" />
                                Delete selected ({selectedFaculties.length})
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
                    ) : sortedFaculties.length === 0 ? (
                        <EmptyState
                            title="No faculties found"
                            description="Create a faculty or change the search query."
                            actionLabel="New faculty"
                            onAction={openCreateModal}
                        />
                    ) : (
                        <div className="custom-scrollbar overflow-x-auto">
                            <table className="w-full min-w-[650px] text-sm">
                                <thead>
                                <tr className="border-b text-left">
                                    <th className="w-12 py-3">
                                        <input
                                            type="checkbox"
                                            checked={
                                                selectedFaculties.length === sortedFaculties.length &&
                                                sortedFaculties.length > 0
                                            }
                                            onChange={handleSelectAll}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                    </th>
                                    <th className="py-3">{getSortLabel("name", "Faculty")}</th>
                                    <th className="py-3">ID</th>
                                    <th className="py-3 text-right">Actions</th>
                                </tr>
                                </thead>

                                <tbody>
                                {sortedFaculties.map((faculty) => (
                                    <tr
                                        key={faculty.id}
                                        className="border-b last:border-b-0 hover:bg-accent/50"
                                    >
                                        <td className="py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedFaculties.includes(faculty.id)}
                                                onChange={() => handleSelectFaculty(faculty.id)}
                                                className="h-4 w-4 rounded border-gray-300"
                                            />
                                        </td>

                                        <td className="py-4">
                                            <div className="font-medium">{faculty.name}</div>
                                        </td>

                                        <td className="py-4">
                                            <Badge variant="outline">#{faculty.id}</Badge>
                                        </td>

                                        <td className="py-4">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => handleEdit(faculty)}
                                                    aria-label="Edit faculty"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => handleDelete(faculty)}
                                                    aria-label="Delete faculty"
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
                <FacultyModal
                    title={isCreateModalOpen ? "Create Faculty" : "Edit Faculty"}
                    formData={formData}
                    onChange={handleInputChange}
                    onClose={isCreateModalOpen ? closeCreateModal : closeEditModal}
                    onSubmit={isCreateModalOpen ? handleCreateSubmit : handleEditSubmit}
                />
            )}
        </AppShell>
    );
}

interface FacultyModalProps {
    title: string;
    formData: FormDataState;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function FacultyModal({
                          title,
                          formData,
                          onClose,
                          onSubmit,
                          onChange,
                      }: FacultyModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="glass-card w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold">{title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Enter the faculty name.
                        </p>
                    </div>

                    <Button type="button" variant="ghost" size="icon" onClick={onClose}>
                        ✕
                    </Button>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Faculty name
                        </label>
                        <Input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={onChange}
                            placeholder="Example: Computer Science"
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