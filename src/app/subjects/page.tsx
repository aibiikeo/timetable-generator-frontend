"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Edit,
    Plus,
    Trash2,
} from "lucide-react";
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
    FacultyResponse,
    LessonResponse,
    MajorResponse,
    SubjectResponse,
    TimetableResponse,
    assignmentApi,
    compactGroups,
    departmentApi,
    facultyApi,
    formatAssignment,
    formatLesson,
    getDeleteRelatedRecordsMessage,
    getDeleteSuccessMessage,
    lessonApi,
    majorApi,
    subjectApi,
    timetableApi,
    uniqueItems,
} from "@/lib";

type SortField = "name" | "code" | "totalHours" | "hoursPerWeek";
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
    totalHours: 60,
    hoursPerWeek: 4,
    majorId: 0,
};

export default function SubjectsPage() {
    const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
    const [majors, setMajors] = useState<MajorResponse[]>([]);
    const [faculties, setFaculties] = useState<FacultyResponse[]>([]);
    const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
    const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
    const [lessons, setLessons] = useState<LessonResponse[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const { query: searchQuery } = usePageSearch("Search subjects on this page...");
    const [facultyFilter, setFacultyFilter] = useState("all");
    const [departmentFilter, setDepartmentFilter] = useState("all");
    const [majorFilter, setMajorFilter] = useState("all");
    const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);

    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentSubject, setCurrentSubject] =
        useState<SubjectResponse | null>(null);
    const [deleteTarget, setDeleteTarget] =
        useState<SubjectResponse | "selected" | null>(null);
    const [deleteMode, setDeleteMode] = useState<DeleteMode>("SIMPLE");
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [formData, setFormData] = useState<FormDataState>(EMPTY_FORM);

    useEffect(() => {
        void loadData(true);
    }, []);

    const filteredSubjects = useMemo(() => {
        if (!searchQuery.trim()) return subjects;

        const lower = searchQuery.toLowerCase();

        return subjects.filter((subject) => {
            return (
                subject.name.toLowerCase().includes(lower) ||
                subject.code.toLowerCase().includes(lower) ||
                subject.majorName?.toLowerCase().includes(lower) ||
                subject.totalHours.toString().includes(lower) ||
                subject.hoursPerWeek.toString().includes(lower)
            );
        });
    }, [subjects, searchQuery]);

    const filterOptions = useMemo(() => {
        return {
            faculties: [...faculties].sort((a, b) => a.name.localeCompare(b.name)),
            departments: [...departments].sort((a, b) => a.name.localeCompare(b.name)),
            majors: [...majors].sort((a, b) => a.name.localeCompare(b.name)),
        };
    }, [departments, faculties, majors]);

    const filteredByDropdowns = useMemo(() => {
        return filteredSubjects.filter((subject) => {
            const matchesFaculty =
                facultyFilter === "all" ||
                subject.facultyId.toString() === facultyFilter;
            const matchesDepartment =
                departmentFilter === "all" ||
                subject.departmentId.toString() === departmentFilter;
            const matchesMajor =
                majorFilter === "all" || subject.majorId.toString() === majorFilter;

            return matchesFaculty && matchesDepartment && matchesMajor;
        });
    }, [departmentFilter, facultyFilter, filteredSubjects, majorFilter]);

    const sortedSubjects = useMemo(() => {
        return [...filteredByDropdowns].sort((a, b) => {
            const direction = sortDirection === "asc" ? 1 : -1;

            if (sortField === "name" || sortField === "code") {
                return a[sortField].localeCompare(b[sortField]) * direction;
            }

            return (Number(a[sortField]) - Number(b[sortField])) * direction;
        });
    }, [filteredByDropdowns, sortField, sortDirection]);

    const loadData = async (initial = false) => {
        try {
            if (initial) setLoading(true);

            setError("");

            const [subjectsData, majorsData, facultiesData, departmentsData, timetablesData] = await Promise.all([
                subjectApi.getSubjects(),
                majorApi.getMajors(),
                facultyApi.getFaculties(),
                departmentApi.getDepartments(),
                timetableApi.getAllTimetables(),
            ]);
            const timetableIds = timetablesData.map((timetable: TimetableResponse) => timetable.id);
            const [assignmentsData, lessonsData] = await Promise.all([
                assignmentApi.getAssignmentsForTimetables(timetableIds),
                lessonApi.getLessonsForTimetables(timetableIds),
            ]);

            setSubjects(subjectsData);
            setMajors(majorsData);
            setFaculties(facultiesData);
            setDepartments(departmentsData);
            setAssignments(assignmentsData);
            setLessons(lessonsData);
        } catch {
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
                        {sortDirection === "asc" ? "" : ""}
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
            setError("Semester hours must be at least 1");
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

    const getDeleteDependencyGroups = () => {
        const targets =
            deleteTarget === "selected"
                ? subjects.filter((subject) => selectedSubjects.includes(subject.id))
                : deleteTarget
                    ? [deleteTarget]
                    : [];

        if (targets.length === 0) return [];

        const targetIds = new Set(targets.map((subject) => subject.id));

        return compactGroups([
            {
                label: "Assignments",
                items: uniqueItems(
                    assignments
                        .filter((assignment) => targetIds.has(assignment.subjectId))
                        .map(formatAssignment),
                ),
            },
            {
                label: "Lessons",
                items: uniqueItems(
                    lessons
                        .filter((lesson) =>
                            assignments.some(
                                (assignment) =>
                                    targetIds.has(assignment.subjectId) &&
                                    assignment.id === lesson.assignmentId,
                            ),
                        )
                        .map(formatLesson),
                ),
            },
        ]);
    };

    const openDeleteDialog = (target: SubjectResponse | "selected") => {
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
                    selectedSubjects.map((id) => subjectApi.deleteSubject(id, mode)),
                );

                const failed = results.filter(
                    (result) => result.status === "rejected",
                );

                if (failed.length > 0) {
                    const failedIds = selectedSubjects.filter(
                        (_id, index) => results[index].status === "rejected",
                    );
                    toast.error(getDeleteRelatedRecordsMessage("subject", failedIds));
                }

                setSelectedSubjects([]);
                if (failed.length === 0) {
                    toast.success(getDeleteSuccessMessage("subject", true));
                }
            } else {
                await subjectApi.deleteSubject(target.id, mode);
                toast.success(getDeleteSuccessMessage("subject"));
            }

            await loadData();
        } catch {
            toast.error(
                getDeleteRelatedRecordsMessage(
                    "subject",
                    target === "selected" ? selectedSubjects : target.id,
                ),
            );
        } finally {
            setDeleteLoading(false);
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

    useEffect(() => {
        if (new URLSearchParams(window.location.search).get("create") === "1") {
            openCreateModal();
        }
    }, []);

    return (
        <AppShell>
            <PageHeader
                eyebrow="Resources"
                title="Subjects"
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

            <Card className="glass-card">
                <CardHeader>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="grid w-full gap-3 md:grid-cols-3 lg:max-w-5xl">
                            <FilterSelect
                                value={facultyFilter}
                                onChange={setFacultyFilter}
                                ariaLabel="Filter subjects by faculty"
                            >
                                <option value="all">All faculties</option>
                                {filterOptions.faculties.map((faculty) => (
                                    <option key={faculty.id} value={faculty.id}>
                                        {faculty.name}
                                    </option>
                                ))}
                            </FilterSelect>

                            <FilterSelect
                                value={departmentFilter}
                                onChange={setDepartmentFilter}
                                ariaLabel="Filter subjects by department"
                            >
                                <option value="all">All departments</option>
                                {filterOptions.departments.map((department) => (
                                    <option key={department.id} value={department.id}>
                                        {department.name}
                                    </option>
                                ))}
                            </FilterSelect>

                            <FilterSelect
                                value={majorFilter}
                                onChange={setMajorFilter}
                                ariaLabel="Filter subjects by major"
                            >
                                <option value="all">All majors</option>
                                {filterOptions.majors.map((major) => (
                                    <option key={major.id} value={major.id}>
                                        {major.shortName || major.name}
                                    </option>
                                ))}
                            </FilterSelect>
                        </div>

                        {selectedSubjects.length > 0 && (
                            <Button
                                variant="destructive"
                                onClick={() => openDeleteDialog("selected")}
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
                            description="Create a subject or change the current filters."
                            actionLabel="New subject"
                            onAction={openCreateModal}
                        />
                    ) : (
                        <div className="custom-scrollbar overflow-x-auto">
                            <table className="w-full min-w-[760px] text-sm">
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
                                    <th className="py-3 text-center">
                                        {getSortLabel("totalHours", "Semester hours")}
                                    </th>
                                    <th className="py-3 text-center">
                                        {getSortLabel(
                                            "hoursPerWeek",
                                            "Weekly hours",
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
                                        </td>

                                        <td className="py-4">
                                            <Badge variant="secondary">
                                                {subject.code}
                                            </Badge>
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
                                                        openDeleteDialog(subject)
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

            <DeleteModeDialog
                open={Boolean(deleteTarget)}
                title={deleteTarget === "selected" ? "Delete selected subjects?" : "Delete subject?"}
                description="Choose how assignments and generated schedule data should be handled."
                entityName={deleteTarget === "selected" ? `${selectedSubjects.length} subjects` : deleteTarget ? `${deleteTarget.code} - ${deleteTarget.name}` : undefined}
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
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        X
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
                                        ? `${major.shortName} - ${major.name}`
                                        : major.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Semester hours
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
                                Weekly hours
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
