"use client";

import { useEffect, useMemo, useState } from "react";
import {
    BookOpen,
    Edit,
    Plus,
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
    MajorResponse,
    SubjectResponse,
    majorApi,
    subjectApi,
} from "@/lib";

type SortField = "name" | "code" | "totalHours" | "hoursPerWeek" | "major";
type SortDirection = "asc" | "desc";

interface FormDataState {
    name: string;
    code: string;
    totalHours: number | string;
    hoursPerWeek: number | string;
    majorId: number;
}

const EMPTY_FORM: FormDataState = {
    name: "",
    code: "",
    totalHours: 30,
    hoursPerWeek: 4,
    majorId: 0,
};

export default function SubjectsPage() {
    const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
    const [majors, setMajors] = useState<MajorResponse[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);

    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentSubject, setCurrentSubject] =
        useState<SubjectResponse | null>(null);

    const [formData, setFormData] = useState<FormDataState>(EMPTY_FORM);

    useEffect(() => {
        void loadData(true);
    }, []);

    const majorsMap = useMemo(() => {
        const map = new Map<number, string>();

        majors.forEach((major) => {
            map.set(
                major.id,
                major.shortName
                    ? `${major.shortName} — ${major.name}`
                    : major.name,
            );
        });

        return map;
    }, [majors]);

    const filteredSubjects = useMemo(() => {
        if (!searchQuery.trim()) return subjects;

        const lower = searchQuery.toLowerCase();

        return subjects.filter((subject) => {
            return (
                subject.name.toLowerCase().includes(lower) ||
                subject.code.toLowerCase().includes(lower) ||
                subject.majorName?.toLowerCase().includes(lower) ||
                subject.departmentName?.toLowerCase().includes(lower) ||
                subject.facultyName?.toLowerCase().includes(lower) ||
                subject.totalHours.toString().includes(lower) ||
                subject.hoursPerWeek.toString().includes(lower) ||
                subject.id.toString().includes(lower)
            );
        });
    }, [subjects, searchQuery]);

    const sortedSubjects = useMemo(() => {
        return [...filteredSubjects].sort((a, b) => {
            const direction = sortDirection === "asc" ? 1 : -1;

            if (sortField === "major") {
                const majorA = a.majorName || majorsMap.get(a.majorId) || "";
                const majorB = b.majorName || majorsMap.get(b.majorId) || "";

                return majorA.localeCompare(majorB) * direction;
            }

            if (sortField === "name" || sortField === "code") {
                return a[sortField].localeCompare(b[sortField]) * direction;
            }

            return (Number(a[sortField]) - Number(b[sortField])) * direction;
        });
    }, [filteredSubjects, sortField, sortDirection, majorsMap]);

    const loadData = async (initial = false) => {
        try {
            if (initial) setLoading(true);

            setError("");

            const [subjectsData, majorsData] = await Promise.all([
                subjectApi.getSubjects(),
                majorApi.getMajors(),
            ]);

            setSubjects(subjectsData);
            setMajors(majorsData);
        } catch (err) {
            console.error("Error loading subjects:", err);
            setError("Failed to load subjects");
        } finally {
            if (initial) setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData(EMPTY_FORM);
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
        const { name, value, type } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]:
                type === "number"
                    ? value === ""
                        ? ""
                        : Number(value)
                    : name === "majorId"
                        ? Number(value)
                        : value,
        }));
    };

    const validateForm = () => {
        if (!formData.name.trim()) {
            setError("Subject name is required");
            return false;
        }

        if (!formData.code.trim()) {
            setError("Subject code is required");
            return false;
        }

        if (!formData.majorId) {
            setError("Please select a major");
            return false;
        }

        if (Number(formData.totalHours) < 1) {
            setError("Total hours must be at least 1");
            return false;
        }

        if (Number(formData.hoursPerWeek) < 1) {
            setError("Hours per week must be at least 1");
            return false;
        }

        return true;
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            setError("");

            await subjectApi.createSubject({
                name: formData.name.trim(),
                code: formData.code.trim(),
                totalHours: Number(formData.totalHours),
                hoursPerWeek: Number(formData.hoursPerWeek),
                majorId: formData.majorId,
            });

            setIsCreateModalOpen(false);
            resetForm();

            await loadData();
        } catch (err: any) {
            console.error("Error creating subject:", err);
            setError(err.response?.data?.message || "Failed to create subject");
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentSubject) return;
        if (!validateForm()) return;

        try {
            setError("");

            await subjectApi.updateSubject(currentSubject.id, {
                name: formData.name.trim(),
                code: formData.code.trim(),
                totalHours: Number(formData.totalHours),
                hoursPerWeek: Number(formData.hoursPerWeek),
                majorId: formData.majorId,
            });

            setIsEditModalOpen(false);
            setCurrentSubject(null);
            resetForm();

            await loadData();
        } catch (err: any) {
            console.error("Error updating subject:", err);
            setError(err.response?.data?.message || "Failed to update subject");
        }
    };

    const handleEdit = (subject: SubjectResponse) => {
        setError("");
        setCurrentSubject(subject);

        setFormData({
            name: subject.name,
            code: subject.code,
            totalHours: subject.totalHours,
            hoursPerWeek: subject.hoursPerWeek,
            majorId: subject.majorId,
        });

        setIsEditModalOpen(true);
    };

    const handleDelete = async (subject: SubjectResponse) => {
        if (!confirm(`Delete subject "${subject.name}"?`)) return;

        try {
            setError("");

            await subjectApi.deleteSubject(subject.id);
            await loadData();
        } catch (err: any) {
            console.error("Error deleting subject:", err);
            setError(
                err.response?.data?.message ||
                "Failed to delete subject. It may have related assignments.",
            );
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedSubjects.length === 0) return;

        if (!confirm(`Delete ${selectedSubjects.length} selected subjects?`)) {
            return;
        }

        try {
            setError("");

            const results = await Promise.allSettled(
                selectedSubjects.map((id) => subjectApi.deleteSubject(id)),
            );

            const failed = results.filter(
                (result) => result.status === "rejected",
            );

            if (failed.length > 0) {
                setError(`${failed.length} subject(s) could not be deleted`);
            }

            setSelectedSubjects([]);

            await loadData();
        } catch {
            setError("Unexpected error while deleting subjects");
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedSubjects(sortedSubjects.map((subject) => subject.id));
        } else {
            setSelectedSubjects([]);
        }
    };

    const handleSelectSubject = (id: number) => {
        setSelectedSubjects((prev) =>
            prev.includes(id)
                ? prev.filter((subjectId) => subjectId !== id)
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
        setCurrentSubject(null);
        resetForm();
    };

    return (
        <AppShell>
            <PageHeader
                eyebrow="Resources"
                title="Subjects"
                description="Manage subjects and link them to the correct major."
                actions={
                    <Button onClick={openCreateModal}>
                        <Plus className="h-4 w-4" />
                        New subject
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
                            Subjects
                        </CardTitle>
                        <BookOpen className="h-4 w-4 text-blue-700" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {subjects.length}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Total subjects
                        </p>
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Majors
                        </CardTitle>
                        <Badge variant="info">Linked</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {majors.length}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Available majors
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
                            {selectedSubjects.length}
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
                                placeholder="Search by subject, code, major, department..."
                                className="h-11 rounded-xl pl-10 pr-4 shadow-sm"
                            />
                        </div>

                        {selectedSubjects.length > 0 && (
                            <Button
                                variant="destructive"
                                onClick={handleDeleteSelected}
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete selected ({selectedSubjects.length})
                            </Button>
                        )}
                    </div>
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <Skeleton
                                    key={index}
                                    className="h-14 w-full"
                                />
                            ))}
                        </div>
                    ) : sortedSubjects.length === 0 ? (
                        <EmptyState
                            title="No subjects found"
                            description="Create a subject or change the search query."
                            actionLabel="New subject"
                            onAction={openCreateModal}
                        />
                    ) : (
                        <div className="custom-scrollbar overflow-x-auto">
                            <table className="w-full min-w-[900px] text-sm">
                                <thead>
                                <tr className="border-b text-left">
                                    <th className="w-12 py-3">
                                        <input
                                            type="checkbox"
                                            checked={
                                                selectedSubjects.length ===
                                                sortedSubjects.length &&
                                                sortedSubjects.length > 0
                                            }
                                            onChange={handleSelectAll}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                    </th>
                                    <th className="py-3">
                                        {getSortLabel("name", "Subject")}
                                    </th>
                                    <th className="py-3">
                                        {getSortLabel("code", "Code")}
                                    </th>
                                    <th className="py-3">
                                        {getSortLabel("major", "Major")}
                                    </th>
                                    <th className="py-3 text-center">
                                        {getSortLabel("totalHours", "Total")}
                                    </th>
                                    <th className="py-3 text-center">
                                        {getSortLabel(
                                            "hoursPerWeek",
                                            "Per week",
                                        )}
                                    </th>
                                    <th className="py-3 text-right">
                                        Actions
                                    </th>
                                </tr>
                                </thead>

                                <tbody>
                                {sortedSubjects.map((subject) => (
                                    <tr
                                        key={subject.id}
                                        className="border-b last:border-b-0 hover:bg-accent/50"
                                    >
                                        <td className="py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedSubjects.includes(
                                                    subject.id,
                                                )}
                                                onChange={() =>
                                                    handleSelectSubject(
                                                        subject.id,
                                                    )
                                                }
                                                className="h-4 w-4 rounded border-gray-300"
                                            />
                                        </td>

                                        <td className="py-4">
                                            <div className="font-medium">
                                                {subject.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                ID: {subject.id}
                                            </div>
                                        </td>

                                        <td className="py-4">
                                            <Badge variant="secondary">
                                                {subject.code}
                                            </Badge>
                                        </td>

                                        <td className="py-4">
                                            <div className="font-medium">
                                                {subject.majorName ||
                                                    majorsMap.get(
                                                        subject.majorId,
                                                    ) ||
                                                    "Unknown"}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {subject.departmentName ||
                                                    "No department"}
                                            </div>
                                        </td>

                                        <td className="py-4 text-center">
                                            {subject.totalHours}
                                        </td>

                                        <td className="py-4 text-center">
                                            {subject.hoursPerWeek}
                                        </td>

                                        <td className="py-4">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() =>
                                                        handleEdit(subject)
                                                    }
                                                    aria-label="Edit subject"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() =>
                                                        handleDelete(subject)
                                                    }
                                                    aria-label="Delete subject"
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
                <SubjectModal
                    title={
                        isCreateModalOpen
                            ? "Create Subject"
                            : "Edit Subject"
                    }
                    formData={formData}
                    majors={majors}
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
        </AppShell>
    );
}

interface SubjectModalProps {
    title: string;
    formData: FormDataState;
    majors: MajorResponse[];
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

function SubjectModal({
                          title,
                          formData,
                          majors,
                          onClose,
                          onSubmit,
                          onChange,
                      }: SubjectModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="glass-card w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold">
                            {title}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Fill in subject information and link it to the correct major.
                        </p>
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        ✕
                    </Button>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Subject name
                        </label>
                        <Input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={onChange}
                            placeholder="Example: Algorithms and Data Structures"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Subject code
                        </label>
                        <Input
                            type="text"
                            name="code"
                            value={formData.code}
                            onChange={onChange}
                            placeholder="Example: CS-201"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Major
                        </label>
                        <select
                            name="majorId"
                            value={formData.majorId}
                            onChange={onChange}
                            required
                            className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value={0}>Select major</option>

                            {majors.map((major) => (
                                <option key={major.id} value={major.id}>
                                    {major.shortName
                                        ? `${major.shortName} — ${major.name}`
                                        : major.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Total hours
                            </label>
                            <Input
                                type="number"
                                name="totalHours"
                                value={formData.totalHours}
                                onChange={onChange}
                                min={1}
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Hours per week
                            </label>
                            <Input
                                type="number"
                                name="hoursPerWeek"
                                value={formData.hoursPerWeek}
                                onChange={onChange}
                                min={1}
                                required
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>

                        <Button type="submit">
                            Save
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}