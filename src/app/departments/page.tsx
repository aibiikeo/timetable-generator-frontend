"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { usePageSearch } from "@/components/layout/SearchContext";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
} from "@/components/ui/card";
import { DeleteModeDialog } from "@/components/ui/delete-mode-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterSelect } from "@/components/ui/filter-select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DeleteMode,
    DepartmentResponse,
    FacultyResponse,
    MajorResponse,
    StudyGroupResponse,
    SubjectResponse,
    departmentApi,
    facultyApi,
    getApiErrorMessage,
    getDeleteRelatedRecordsMessage,
    getDeleteSuccessMessage,
    groupApi,
    majorApi,
    subjectApi,
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
    const [majors, setMajors] = useState<MajorResponse[]>([]);
    const [groups, setGroups] = useState<StudyGroupResponse[]>([]);
    const [subjects, setSubjects] = useState<SubjectResponse[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const { query: searchQuery } = usePageSearch("Search departments on this page...");
    const [facultyFilter, setFacultyFilter] = useState("all");
    const [selectedDepartments, setSelectedDepartments] = useState<number[]>([]);

    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentDepartment, setCurrentDepartment] =
        useState<DepartmentResponse | null>(null);
    const [deleteTarget, setDeleteTarget] =
        useState<DepartmentResponse | "selected" | null>(null);
    const [deleteMode, setDeleteMode] = useState<DeleteMode>("SIMPLE");
    const [deleteLoading, setDeleteLoading] = useState(false);

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
                facultyName.toLowerCase().includes(lower)
            );
        });
    }, [departments, facultyMap, searchQuery]);

    const filteredByFaculty = useMemo(() => {
        if (facultyFilter === "all") return filteredDepartments;

        return filteredDepartments.filter(
            (department) => department.facultyId.toString() === facultyFilter,
        );
    }, [facultyFilter, filteredDepartments]);

    const sortedDepartments = useMemo(() => {
        return [...filteredByFaculty].sort((a, b) => {
            const direction = sortDirection === "asc" ? 1 : -1;

            if (sortField === "faculty") {
                const facultyA = a.facultyName || facultyMap.get(a.facultyId) || "";
                const facultyB = b.facultyName || facultyMap.get(b.facultyId) || "";

                return facultyA.localeCompare(facultyB) * direction;
            }

            return a.name.localeCompare(b.name) * direction;
        });
    }, [filteredByFaculty, facultyMap, sortDirection, sortField]);

    const loadData = async (initial = false) => {
        try {
            if (initial) setLoading(true);

            setError("");

            const [departmentsData, facultiesData, majorsData, groupsData, subjectsData] = await Promise.all([
                departmentApi.getDepartments(),
                facultyApi.getFaculties(),
                majorApi.getMajors(),
                groupApi.getGroups(),
                subjectApi.getSubjects(),
            ]);

            setDepartments(departmentsData);
            setFaculties(facultiesData);
            setMajors(majorsData);
            setGroups(groupsData);
            setSubjects(subjectsData);
        } catch (err) {
            setError(getApiErrorMessage(err, "Failed to load departments"));
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
                        {sortDirection === "asc" ? "" : ""}
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
        } catch (err) {
            setError(getApiErrorMessage(err, "Failed to create department"));
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
        } catch (err) {
            setError(getApiErrorMessage(err, "Failed to update department"));
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

    const getDeleteDependencyGroups = () => {
        const targetIds =
            deleteTarget === "selected"
                ? selectedDepartments
                : deleteTarget
                    ? [deleteTarget.id]
                    : [];

        if (targetIds.length === 0) return [];

        return [
            {
                label: "Majors",
                items: majors
                    .filter((major) => targetIds.includes(major.departmentId))
                    .map((major) => major.shortName ? `${major.shortName} - ${major.name}` : major.name),
            },
            {
                label: "Groups",
                items: groups
                    .filter((group) => targetIds.includes(group.departmentId))
                    .map((group) => group.name),
            },
            {
                label: "Subjects",
                items: subjects
                    .filter((subject) => targetIds.includes(subject.departmentId))
                    .map((subject) => `${subject.code} - ${subject.name}`),
            },
        ].filter((group) => group.items.length > 0);
    };

    const openDeleteDialog = (target: DepartmentResponse | "selected") => {
        setError("");
        setDeleteMode("SIMPLE");
        setDeleteTarget(target);
    };

    const closeDeleteDialog = () => {
        if (deleteLoading) return;
        setDeleteTarget(null);
        setDeleteMode("SIMPLE");
    };

    const confirmDelete = async (mode: DeleteMode) => {
        if (!deleteTarget) return;
        const target = deleteTarget;

        try {
            setDeleteLoading(true);
            setError("");
            setDeleteTarget(null);
            setDeleteMode("SIMPLE");

            if (target === "selected") {
                const results = await Promise.allSettled(
                    selectedDepartments.map((id) => departmentApi.deleteDepartment(id, mode)),
                );

                const failed = results.filter((result) => result.status === "rejected");

                if (failed.length > 0) {
                    const failedIds = selectedDepartments.filter(
                        (_id, index) => results[index].status === "rejected",
                    );
                    toast.error(getDeleteRelatedRecordsMessage("department", failedIds));
                }

                setSelectedDepartments([]);
                if (failed.length === 0) {
                    toast.success(getDeleteSuccessMessage("department", true));
                }
            } else {
                await departmentApi.deleteDepartment(target.id, mode);
                toast.success(getDeleteSuccessMessage("department"));
            }

            await loadData();
        } catch {
            toast.error(
                getDeleteRelatedRecordsMessage(
                    "department",
                    target === "selected" ? selectedDepartments : target.id,
                ),
            );
        } finally {
            setDeleteLoading(false);
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

    useEffect(() => {
        if (new URLSearchParams(window.location.search).get("create") === "1") {
            openCreateModal();
        }
    }, []);

    return (
        <AppShell>
            <PageHeader
                eyebrow="Academic Structure"
                title="Departments"
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

            <Card className="glass-card">
                <CardHeader>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="grid w-full gap-3 md:grid-cols-2 lg:max-w-3xl">
                            <FilterSelect
                                value={facultyFilter}
                                onChange={setFacultyFilter}
                                ariaLabel="Filter departments by faculty"
                            >
                                <option value="all">All faculties</option>
                                {faculties.map((faculty) => (
                                    <option key={faculty.id} value={faculty.id}>
                                        {faculty.name}
                                    </option>
                                ))}
                            </FilterSelect>
                        </div>

                        {selectedDepartments.length > 0 && (
                            <Button variant="destructive" onClick={() => openDeleteDialog("selected")}>
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
                            description="Create a department or change the current filters."
                            actionLabel="New department"
                            onAction={openCreateModal}
                        />
                    ) : (
                        <div className="custom-scrollbar overflow-x-auto">
                            <table className="w-full min-w-[720px] text-sm">
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
                                    <th className="py-3 text-right">
                                        Actions
                                    </th>
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
                                                checked={selectedDepartments.includes(
                                                    department.id,
                                                )}
                                                onChange={() =>
                                                    handleSelectDepartment(department.id)
                                                }
                                                className="h-4 w-4 rounded border-gray-300"
                                            />
                                        </td>

                                        <td className="py-4">
                                            <div className="font-medium">
                                                {department.name}
                                            </div>
                                        </td>

                                        <td className="py-4">
                                            {department.facultyName ||
                                                facultyMap.get(department.facultyId) ||
                                                "Unknown"}
                                        </td>

                                        <td className="py-4">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() =>
                                                        handleEdit(department)
                                                    }
                                                    aria-label="Edit department"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() =>
                                                        openDeleteDialog(department)
                                                    }
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
                    title={
                        isCreateModalOpen
                            ? "Create Department"
                            : "Edit Department"
                    }
                    formData={formData}
                    faculties={faculties}
                    onChange={handleInputChange}
                    onClose={isCreateModalOpen ? closeCreateModal : closeEditModal}
                    onSubmit={
                        isCreateModalOpen
                            ? handleCreateSubmit
                            : handleEditSubmit
                    }
                />
            )}

            <DeleteModeDialog
                open={Boolean(deleteTarget)}
                title={deleteTarget === "selected" ? "Delete selected departments?" : "Delete department?"}
                description="Choose how related majors, groups, subjects and schedule data should be handled."
                entityName={deleteTarget === "selected" ? `${selectedDepartments.length} departments` : deleteTarget?.name}
                dependencyGroups={getDeleteDependencyGroups()}
                selectedMode={deleteMode}
                loading={deleteLoading}
                onModeChange={setDeleteMode}
                onCancel={closeDeleteDialog}
                onConfirm={confirmDelete}
            />
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
                    </div>

                    <Button type="button" variant="ghost" size="icon" onClick={onClose}>
                        X
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
