"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    CalendarDays,
    Eye,
    FileDown,
    Loader2,
    Play,
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
import ExportModal from "@/app/timetables/[id]/components/ExportModal";
import GenerateOptionsModal from "@/app/timetables/[id]/components/GenerateOptionsModal";
import { timetableApi } from "@/lib";
import type {
    GenerationMode,
    Semester,
    TimetableResponse,
    TimetableStatus,
} from "@/lib/types";

type SortField = "name" | "createdAt" | "status" | "academicYearStart";
type SortDirection = "asc" | "desc";

interface FormDataState {
    name: string;
    academicYearStart: number;
    semester: Semester;
}

const EMPTY_FORM: FormDataState = {
    name: "",
    academicYearStart: new Date().getFullYear(),
    semester: "FALL",
};

const SEMESTERS: Semester[] = ["FALL", "SPRING"];

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

        if (typeof data === "string") return data;

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
            return "Invalid timetable data. Check name, academic year and semester.";
        }
    }

    return fallback;
}

export default function TimetablesPage() {
    const [timetables, setTimetables] = useState<TimetableResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTimetables, setSelectedTimetables] = useState<number[]>([]);

    const [sortField, setSortField] = useState<SortField>("createdAt");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    const [selectedTimetable, setSelectedTimetable] =
        useState<TimetableResponse | null>(null);

    const [generatingId, setGeneratingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<FormDataState>(EMPTY_FORM);
    const [formError, setFormError] = useState("");

    useEffect(() => {
        void loadData(true);
    }, []);

    const filteredTimetables = useMemo(() => {
        if (!searchQuery.trim()) return timetables;

        const lower = searchQuery.toLowerCase();

        return timetables.filter((timetable) => {
            return (
                timetable.name.toLowerCase().includes(lower) ||
                timetable.status.toLowerCase().includes(lower) ||
                timetable.semester.toLowerCase().includes(lower) ||
                timetable.academicYearStart.toString().includes(lower) ||
                timetable.academicYearEnd.toString().includes(lower) ||
                timetable.id.toString().includes(lower)
            );
        });
    }, [timetables, searchQuery]);

    const sortedTimetables = useMemo(() => {
        return [...filteredTimetables].sort((a, b) => {
            const direction = sortDirection === "asc" ? 1 : -1;

            if (sortField === "createdAt") {
                return (
                    (new Date(a.createdAt).getTime() -
                        new Date(b.createdAt).getTime()) *
                    direction
                );
            }

            if (sortField === "academicYearStart") {
                return (a.academicYearStart - b.academicYearStart) * direction;
            }

            return (
                String(a[sortField]).localeCompare(String(b[sortField])) *
                direction
            );
        });
    }, [filteredTimetables, sortField, sortDirection]);

    const generatedCount = useMemo(() => {
        return timetables.filter(
            (item) =>
                item.status === "GENERATED" ||
                item.status === "PARTIAL" ||
                item.status === "PUBLISHED",
        ).length;
    }, [timetables]);

    const publishedCount = useMemo(() => {
        return timetables.filter((item) => item.status === "PUBLISHED").length;
    }, [timetables]);

    const loadData = async (initial = false) => {
        try {
            if (initial) setLoading(true);

            setError("");

            const data = await timetableApi.getAllTimetables();
            setTimetables(data);
        } catch {
            setError("Failed to load timetables");
        } finally {
            if (initial) setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData(EMPTY_FORM);
        setFormError("");
    };

    const getStatusVariant = (status: TimetableStatus) => {
        switch (status) {
            case "PUBLISHED":
                return "success";
            case "GENERATED":
                return "info";
            case "PARTIAL":
                return "warning";
            case "ARCHIVED":
                return "secondary";
            default:
                return "outline";
        }
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
            [name]: type === "number" ? Number(value) : value,
        }));

        setFormError("");
    };

    const validateForm = () => {
        if (!formData.name.trim()) {
            setFormError("Timetable name is required");
            return false;
        }

        if (Number(formData.academicYearStart) < 2000) {
            setFormError("Academic year start is invalid");
            return false;
        }

        if (formData.semester !== "FALL" && formData.semester !== "SPRING") {
            setFormError("Please select a valid semester");
            return false;
        }

        return true;
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            setError("");
            setFormError("");

            await timetableApi.createTimetable({
                name: formData.name.trim(),
                academicYearStart: Number(formData.academicYearStart),
                semester: formData.semester,
                generationSettings: {
                    avoidSaturday: true,
                    avoidLateLessons: true,
                    maxLessonsPerDay: 4,
                },
            });

            setIsCreateModalOpen(false);
            resetForm();

            await loadData();
        } catch (err) {
            setFormError(
                getApiErrorMessage(err, "Failed to create timetable"),
            );
        }
    };

    const handleGenerateClick = (timetable: TimetableResponse) => {
        setSelectedTimetable(timetable);
        setIsGenerateModalOpen(true);
    };

    const handleGenerate = async (mode: GenerationMode) => {
        if (!selectedTimetable) return;

        try {
            setGeneratingId(selectedTimetable.id);
            setError("");

            const result = await timetableApi.generateTimetable(
                selectedTimetable.id,
                mode,
            );

            setIsGenerateModalOpen(false);
            setSelectedTimetable(null);

            const failedText =
                result.failedVerticesCount > 0
                    ? ` Failed: ${result.failedVerticesCount}.`
                    : "";

            setError(
                `Generated ${result.placedLessonsCount} lessons.${failedText}`,
            );

            await loadData();
        } catch (err) {
            setError(getApiErrorMessage(err, "Generation failed"));
        } finally {
            setGeneratingId(null);
        }
    };

    const handlePublish = async (timetable: TimetableResponse) => {
        if (timetable.status === "PUBLISHED") return;

        if (!confirm(`Publish timetable "${timetable.name}"?`)) return;

        try {
            setError("");

            await timetableApi.publishTimetable(timetable.id);
            await loadData();
        } catch (err) {
            setError(getApiErrorMessage(err, "Failed to publish timetable"));
        }
    };

    const handleDelete = async (timetable: TimetableResponse) => {
        if (!confirm(`Delete timetable "${timetable.name}"?`)) return;

        try {
            setError("");

            await timetableApi.deleteTimetable(timetable.id);
            await loadData();
        } catch (err) {
            setError(getApiErrorMessage(err, "Failed to delete timetable"));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedTimetables.length === 0) return;

        if (!confirm(`Delete ${selectedTimetables.length} selected timetables?`)) {
            return;
        }

        try {
            setError("");

            const results = await Promise.allSettled(
                selectedTimetables.map((id) =>
                    timetableApi.deleteTimetable(id),
                ),
            );

            const failed = results.filter(
                (result) => result.status === "rejected",
            );

            if (failed.length > 0) {
                setError(`${failed.length} timetable(s) could not be deleted`);
            }

            setSelectedTimetables([]);

            await loadData();
        } catch {
            setError("Unexpected error while deleting timetables");
        }
    };

    const handleExportClick = (timetable: TimetableResponse) => {
        setSelectedTimetable(timetable);
        setIsExportModalOpen(true);
    };

    const handleExport = async (format: "pdf" | "excel") => {
        if (!selectedTimetable) return;

        setIsExportModalOpen(false);

        alert(
            `Open "${selectedTimetable.name}" and export ${format.toUpperCase()} from the timetable detail page.`,
        );

        setSelectedTimetable(null);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedTimetables(
                sortedTimetables.map((timetable) => timetable.id),
            );
        } else {
            setSelectedTimetables([]);
        }
    };

    const handleSelectTimetable = (id: number) => {
        setSelectedTimetables((prev) =>
            prev.includes(id)
                ? prev.filter((timetableId) => timetableId !== id)
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

    return (
        <AppShell>
            <PageHeader
                eyebrow="Scheduling"
                title="Timetables"
                description="Create, generate, publish and review timetable versions."
                actions={
                    <Button onClick={openCreateModal}>
                        <Plus className="h-4 w-4" />
                        New timetable
                    </Button>
                }
            />

            {error && (
                <Card
                    className={
                        error.startsWith("Generated")
                            ? "mb-6 border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "mb-6 border-red-200 bg-red-50 text-red-800"
                    }
                >
                    <CardContent className="p-4 text-sm">
                        {error}
                    </CardContent>
                </Card>
            )}

            <section className="grid gap-4 md:grid-cols-3">
                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Timetables
                        </CardTitle>
                        <CalendarDays className="h-4 w-4 text-blue-700" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {timetables.length}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Total timetable versions
                        </p>
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Generated
                        </CardTitle>
                        <Badge variant="info">Ready</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {generatedCount}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Generated, partial or published
                        </p>
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Published
                        </CardTitle>
                        <Badge variant="success">Live</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {publishedCount}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Visible as official timetable
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
                                placeholder="Search by name, year, semester, status..."
                                className="h-11 rounded-xl pl-10 pr-4 shadow-sm"
                            />
                        </div>

                        {selectedTimetables.length > 0 && (
                            <Button
                                variant="destructive"
                                onClick={handleDeleteSelected}
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete selected ({selectedTimetables.length})
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
                    ) : sortedTimetables.length === 0 ? (
                        <EmptyState
                            title="No timetables found"
                            description="Create a timetable to start scheduling."
                            actionLabel="New timetable"
                            onAction={openCreateModal}
                        />
                    ) : (
                        <div className="custom-scrollbar overflow-x-auto">
                            <table className="w-full min-w-[1150px] text-sm">
                                <thead>
                                <tr className="border-b text-left">
                                    <th className="w-12 py-3">
                                        <input
                                            type="checkbox"
                                            checked={
                                                selectedTimetables.length ===
                                                sortedTimetables.length &&
                                                sortedTimetables.length > 0
                                            }
                                            onChange={handleSelectAll}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                    </th>
                                    <th className="py-3">
                                        {getSortLabel("name", "Name")}
                                    </th>
                                    <th className="py-3">
                                        {getSortLabel(
                                            "academicYearStart",
                                            "Academic year",
                                        )}
                                    </th>
                                    <th className="py-3">Semester</th>
                                    <th className="py-3">
                                        {getSortLabel("status", "Status")}
                                    </th>
                                    <th className="py-3 text-center">
                                        Lessons
                                    </th>
                                    <th className="py-3">
                                        {getSortLabel(
                                            "createdAt",
                                            "Created",
                                        )}
                                    </th>
                                    <th className="py-3 text-right">
                                        Actions
                                    </th>
                                </tr>
                                </thead>

                                <tbody>
                                {sortedTimetables.map((timetable) => (
                                    <tr
                                        key={timetable.id}
                                        className="border-b last:border-b-0 hover:bg-accent/50"
                                    >
                                        <td className="py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedTimetables.includes(
                                                    timetable.id,
                                                )}
                                                onChange={() =>
                                                    handleSelectTimetable(
                                                        timetable.id,
                                                    )
                                                }
                                                className="h-4 w-4 rounded border-gray-300"
                                            />
                                        </td>

                                        <td className="py-4">
                                            <div className="font-medium">
                                                {timetable.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                ID: {timetable.id} · version{" "}
                                                {timetable.version}
                                            </div>
                                        </td>

                                        <td className="py-4">
                                            {timetable.academicYearStart}–
                                            {timetable.academicYearEnd}
                                        </td>

                                        <td className="py-4">
                                            <Badge variant="secondary">
                                                {timetable.semester}
                                            </Badge>
                                        </td>

                                        <td className="py-4">
                                            <Badge
                                                variant={
                                                    getStatusVariant(
                                                        timetable.status,
                                                    ) as any
                                                }
                                            >
                                                {timetable.status}
                                            </Badge>
                                        </td>

                                        <td className="py-4 text-center">
                                            {timetable.totalLessons}/
                                            {timetable.totalRequiredLessons}
                                        </td>

                                        <td className="py-4">
                                            {new Date(
                                                timetable.createdAt,
                                            ).toLocaleDateString()}
                                        </td>

                                        <td className="py-4">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    asChild
                                                    aria-label="Open timetable"
                                                >
                                                    <Link
                                                        href={`/timetables/${timetable.id}`}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() =>
                                                        handleGenerateClick(
                                                            timetable,
                                                        )
                                                    }
                                                    disabled={
                                                        generatingId ===
                                                        timetable.id
                                                    }
                                                    aria-label="Generate timetable"
                                                >
                                                    {generatingId ===
                                                    timetable.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Play className="h-4 w-4" />
                                                    )}
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() =>
                                                        handlePublish(
                                                            timetable,
                                                        )
                                                    }
                                                    disabled={
                                                        timetable.status ===
                                                        "PUBLISHED"
                                                    }
                                                    aria-label="Publish timetable"
                                                >
                                                    ✓
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() =>
                                                        handleExportClick(
                                                            timetable,
                                                        )
                                                    }
                                                    aria-label="Export timetable"
                                                >
                                                    <FileDown className="h-4 w-4" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() =>
                                                        handleDelete(
                                                            timetable,
                                                        )
                                                    }
                                                    aria-label="Delete timetable"
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

            {isCreateModalOpen && (
                <TimetableModal
                    formData={formData}
                    formError={formError}
                    onChange={handleInputChange}
                    onClose={closeCreateModal}
                    onSubmit={handleCreateSubmit}
                />
            )}

            {isGenerateModalOpen && selectedTimetable && (
                <GenerateOptionsModal
                    isOpen={isGenerateModalOpen}
                    timetableName={selectedTimetable.name}
                    onClose={() => {
                        setIsGenerateModalOpen(false);
                        setSelectedTimetable(null);
                    }}
                    onGenerate={handleGenerate}
                    loading={generatingId === selectedTimetable.id}
                />
            )}

            {isExportModalOpen && selectedTimetable && (
                <ExportModal
                    isOpen={isExportModalOpen}
                    timetableName={selectedTimetable.name}
                    onClose={() => {
                        setIsExportModalOpen(false);
                        setSelectedTimetable(null);
                    }}
                    onExport={handleExport}
                />
            )}
        </AppShell>
    );
}

interface TimetableModalProps {
    formData: FormDataState;
    formError: string;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

function TimetableModal({
                            formData,
                            formError,
                            onClose,
                            onSubmit,
                            onChange,
                        }: TimetableModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="glass-card w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold">
                            Create Timetable
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Create a timetable version before adding assignments.
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
                            Timetable name
                        </label>
                        <Input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={onChange}
                            placeholder="Example: Fall 2026 Main Schedule"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Academic year start
                        </label>
                        <Input
                            type="number"
                            name="academicYearStart"
                            value={formData.academicYearStart}
                            onChange={onChange}
                            min={2000}
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Semester
                        </label>
                        <select
                            name="semester"
                            value={formData.semester}
                            onChange={onChange}
                            required
                            className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            {SEMESTERS.map((semester) => (
                                <option key={semester} value={semester}>
                                    {semester}
                                </option>
                            ))}
                        </select>
                    </div>

                    {formError && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {formError}
                        </div>
                    )}

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