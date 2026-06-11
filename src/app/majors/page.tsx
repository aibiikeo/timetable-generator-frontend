"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { usePageSearch } from "@/components/layout/SearchContext";
import { Badge } from "@/components/ui/badge";
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
    AssignmentResponse,
    DeleteMode,
    DepartmentResponse,
    MajorResponse,
    StudyGroupResponse,
    SubjectResponse,
    TimetableResponse,
    assignmentApi,
    compactGroups,
    departmentApi,
    formatAssignment,
    getApiErrorMessage,
    getDeleteErrorMessage,
    getDeleteSuccessMessage,
    groupApi,
    majorApi,
    subjectApi,
    timetableApi,
    uniqueItems,
} from "@/lib";

type SortField = "name" | "shortName" | "department";
type SortDirection = "asc" | "desc";

interface FormDataState {
    name: string;
    shortName: string;
    departmentId: number;
}

const EMPTY_FORM: FormDataState = {
    name: "",
    shortName: "",
    departmentId: 0,
};

export default function MajorsPage() {
    const [majors, setMajors] = useState<MajorResponse[]>([]);
    const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
    const [groups, setGroups] = useState<StudyGroupResponse[]>([]);
    const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
    const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const { query: searchQuery } = usePageSearch("Search majors on this page...");
    const [departmentFilter, setDepartmentFilter] = useState("all");
    const [selectedMajors, setSelectedMajors] = useState<number[]>([]);

    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentMajor, setCurrentMajor] = useState<MajorResponse | null>(null);
    const [deleteTarget, setDeleteTarget] =
        useState<MajorResponse | "selected" | null>(null);
    const [deleteMode, setDeleteMode] = useState<DeleteMode>("SIMPLE");
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [formData, setFormData] = useState<FormDataState>(EMPTY_FORM);

    useEffect(() => {
        void loadData(true);
    }, []);

    const departmentMap = useMemo(() => {
        return new Map(
            departments.map((department) => [department.id, department.name]),
        );
    }, [departments]);

    const filteredMajors = useMemo(() => {
        if (!searchQuery.trim()) return majors;

        const lower = searchQuery.toLowerCase();

        return majors.filter((major) => {
            return (
                major.name.toLowerCase().includes(lower) ||
                major.shortName?.toLowerCase().includes(lower) ||
                major.departmentName?.toLowerCase().includes(lower)
            );
        });
    }, [majors, searchQuery]);

    const filteredByDepartment = useMemo(() => {
        if (departmentFilter === "all") return filteredMajors;

        return filteredMajors.filter(
            (major) => major.departmentId.toString() === departmentFilter,
        );
    }, [departmentFilter, filteredMajors]);

    const sortedMajors = useMemo(() => {
        return [...filteredByDepartment].sort((a, b) => {
            const direction = sortDirection === "asc" ? 1 : -1;

            if (sortField === "department") {
                const departmentA =
                    a.departmentName || departmentMap.get(a.departmentId) || "";
                const departmentB =
                    b.departmentName || departmentMap.get(b.departmentId) || "";

                return departmentA.localeCompare(departmentB) * direction;
            }

            return (
                String(a[sortField] || "").localeCompare(
                    String(b[sortField] || ""),
                ) * direction
            );
        });
    }, [departmentMap, filteredByDepartment, sortDirection, sortField]);

    const loadData = async (initial = false) => {
        try {
            if (initial) setLoading(true);

            setError("");

            const [majorsData, departmentsData, groupsData, subjectsData, timetablesData] = await Promise.all([
                majorApi.getMajors(),
                departmentApi.getDepartments(),
                groupApi.getGroups(),
                subjectApi.getSubjects(),
                timetableApi.getAllTimetables(),
            ]);
            const timetableIds = timetablesData.map((timetable: TimetableResponse) => timetable.id);
            const assignmentsData = await assignmentApi.getAssignmentsForTimetables(timetableIds);

            setMajors(majorsData);
            setDepartments(departmentsData);
            setGroups(groupsData);
            setSubjects(subjectsData);
            setAssignments(assignmentsData);
        } catch (err) {
            setError(getApiErrorMessage(err, "Failed to load majors"));
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
            [name]: name === "departmentId" ? Number(value) : value,
        }));
    };

    const validateForm = () => {
        if (!formData.name.trim()) {
            setError("Major name is required");
            return false;
        }

        if (!formData.shortName.trim()) {
            setError("Short name is required");
            return false;
        }

        if (!formData.departmentId) {
            setError("Please select a department");
            return false;
        }

        return true;
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            setError("");

            await majorApi.createMajor({
                name: formData.name.trim(),
                shortName: formData.shortName.trim(),
                departmentId: Number(formData.departmentId),
            });

            setIsCreateModalOpen(false);
            resetForm();

            await loadData();
        } catch (err) {
            setError(getApiErrorMessage(err, "Failed to create major"));
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentMajor) return;
        if (!validateForm()) return;

        try {
            setError("");

            await majorApi.updateMajor(currentMajor.id, {
                name: formData.name.trim(),
                shortName: formData.shortName.trim(),
                departmentId: Number(formData.departmentId),
            });

            setIsEditModalOpen(false);
            setCurrentMajor(null);
            resetForm();

            await loadData();
        } catch (err) {
            setError(getApiErrorMessage(err, "Failed to update major"));
        }
    };

    const handleEdit = (major: MajorResponse) => {
        setCurrentMajor(major);

        setFormData({
            name: major.name,
            shortName: major.shortName,
            departmentId: major.departmentId,
        });

        setIsEditModalOpen(true);
    };

    const getDeleteDependencyGroups = () => {
        const targetIds =
            deleteTarget === "selected"
                ? selectedMajors
                : deleteTarget
                    ? [deleteTarget.id]
                    : [];

        if (targetIds.length === 0) return [];

        const relatedGroups = groups
            .filter((group) => targetIds.includes(group.majorId))
            .map((group) => group.name);
        const relatedSubjects = subjects
            .filter((subject) => targetIds.includes(subject.majorId))
            .map((subject) => `${subject.code} - ${subject.name}`);

        return compactGroups([
            { label: "Groups", items: relatedGroups },
            { label: "Subjects", items: relatedSubjects },
            {
                label: "Assignments",
                items: uniqueItems(
                    assignments
                        .filter((assignment) => targetIds.includes(assignment.majorId))
                        .map(formatAssignment),
                ),
            },
        ]);
    };

    const openDeleteDialog = (target: MajorResponse | "selected") => {
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
                    selectedMajors.map((id) => majorApi.deleteMajor(id, mode)),
                );

                const failed = results.filter(
                    (result): result is PromiseRejectedResult =>
                        result.status === "rejected",
                );

                if (failed.length > 0) {
                    const failedIds = selectedMajors.filter(
                        (_id, index) => results[index].status === "rejected",
                    );
                    toast.error(getDeleteErrorMessage(failed[0]?.reason, "major", failedIds));
                }

                setSelectedMajors([]);
                if (failed.length === 0) {
                    toast.success(getDeleteSuccessMessage("major", true));
                }
            } else {
                await majorApi.deleteMajor(target.id, mode);
                toast.success(getDeleteSuccessMessage("major"));
            }

            await loadData();
        } catch (err) {
            toast.error(
                getDeleteErrorMessage(
                    err,
                    "major",
                    target === "selected" ? selectedMajors : target.id,
                ),
            );
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedMajors(sortedMajors.map((major) => major.id));
        } else {
            setSelectedMajors([]);
        }
    };

    const handleSelectMajor = (id: number) => {
        setSelectedMajors((prev) =>
            prev.includes(id)
                ? prev.filter((majorId) => majorId !== id)
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
        setCurrentMajor(null);
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
                title="Majors"
                actions={
                    <Button onClick={openCreateModal}>
                        <Plus className="h-4 w-4" />
                        New major
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
                                value={departmentFilter}
                                onChange={setDepartmentFilter}
                                ariaLabel="Filter majors by department"
                            >
                                <option value="all">All departments</option>
                                {departments.map((department) => (
                                    <option key={department.id} value={department.id}>
                                        {department.name}
                                    </option>
                                ))}
                            </FilterSelect>
                        </div>

                        {selectedMajors.length > 0 && (
                            <Button variant="destructive" onClick={() => openDeleteDialog("selected")}>
                                <Trash2 className="h-4 w-4" />
                                Delete selected ({selectedMajors.length})
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
                    ) : sortedMajors.length === 0 ? (
                        <EmptyState
                            title="No majors found"
                            description="Create a major or change the current filters."
                            actionLabel="New major"
                            onAction={openCreateModal}
                        />
                    ) : (
                        <div className="custom-scrollbar overflow-x-auto">
                            <table className="w-full min-w-[860px] table-fixed text-sm">
                                <colgroup>
                                    <col className="w-12" />
                                    <col className="w-[42%]" />
                                    <col className="w-32" />
                                    <col />
                                    <col className="w-28" />
                                </colgroup>
                                <thead>
                                <tr className="border-b text-left">
                                    <th className="w-12 py-3">
                                        <input
                                            type="checkbox"
                                            checked={
                                                selectedMajors.length ===
                                                sortedMajors.length &&
                                                sortedMajors.length > 0
                                            }
                                            onChange={handleSelectAll}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                    </th>

                                    <th className="py-3">
                                        {getSortLabel("name", "Major")}
                                    </th>

                                    <th className="py-3">
                                        {getSortLabel("shortName", "Short")}
                                    </th>

                                    <th className="py-3">
                                        {getSortLabel("department", "Department")}
                                    </th>

                                    <th className="py-3 text-right">
                                        Actions
                                    </th>
                                </tr>
                                </thead>

                                <tbody>
                                {sortedMajors.map((major) => (
                                    <tr
                                        key={major.id}
                                        className="border-b last:border-b-0 hover:bg-accent/50"
                                    >
                                        <td className="py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedMajors.includes(
                                                    major.id,
                                                )}
                                                onChange={() =>
                                                    handleSelectMajor(major.id)
                                                }
                                                className="h-4 w-4 rounded border-gray-300"
                                            />
                                        </td>

                                        <td className="py-4">
                                            <div className="font-medium">
                                                {major.name}
                                            </div>
                                        </td>

                                        <td className="py-4">
                                            <Badge variant="secondary">
                                                {major.shortName}
                                            </Badge>
                                        </td>

                                        <td className="py-4">
                                            {major.departmentName ||
                                                departmentMap.get(
                                                    major.departmentId,
                                                ) ||
                                                "Unknown"}
                                        </td>

                                        <td className="py-4">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() =>
                                                        handleEdit(major)
                                                    }
                                                    aria-label="Edit major"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() =>
                                                        openDeleteDialog(major)
                                                    }
                                                    aria-label="Delete major"
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
                <MajorModal
                    title={isCreateModalOpen ? "Create Major" : "Edit Major"}
                    formData={formData}
                    departments={departments}
                    onChange={handleInputChange}
                    onClose={isCreateModalOpen ? closeCreateModal : closeEditModal}
                    onSubmit={isCreateModalOpen ? handleCreateSubmit : handleEditSubmit}
                />
            )}

            <DeleteModeDialog
                open={Boolean(deleteTarget)}
                title={deleteTarget === "selected" ? "Delete selected majors?" : "Delete major?"}
                description="Choose how related groups, subjects, assignments and schedule data should be handled."
                entityName={deleteTarget === "selected" ? `${selectedMajors.length} majors` : deleteTarget?.name}
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

interface MajorModalProps {
    title: string;
    formData: FormDataState;
    departments: DepartmentResponse[];
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

function MajorModal({
                        title,
                        formData,
                        departments,
                        onClose,
                        onSubmit,
                        onChange,
                    }: MajorModalProps) {
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
                            Major name
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
                            Short name
                        </label>
                        <Input
                            type="text"
                            name="shortName"
                            value={formData.shortName}
                            onChange={onChange}
                            placeholder="Example: SE"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Department
                        </label>
                        <select
                            name="departmentId"
                            value={formData.departmentId}
                            onChange={onChange}
                            required
                            className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value={0}>Select department</option>
                            {departments.map((department) => (
                                <option key={department.id} value={department.id}>
                                    {department.facultyName
                                        ? `${department.name} - ${department.facultyName}`
                                        : department.name}
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
