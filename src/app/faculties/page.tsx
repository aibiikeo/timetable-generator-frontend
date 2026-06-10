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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DeleteMode,
    DepartmentResponse,
    FacultyResponse,
    MajorResponse,
    AssignmentResponse,
    LessonResponse,
    LunchResponse,
    StudyGroupResponse,
    SubjectResponse,
    TimetableResponse,
    assignmentApi,
    compactGroups,
    departmentApi,
    facultyApi,
    formatAssignment,
    formatLesson,
    formatLunch,
    formatTimetable,
    getApiErrorMessage,
    getDeleteRelatedRecordsMessage,
    getDeleteSuccessMessage,
    groupApi,
    lessonApi,
    lunchApi,
    majorApi,
    subjectApi,
    timetableApi,
    uniqueItems,
} from "@/lib";

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
    const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
    const [majors, setMajors] = useState<MajorResponse[]>([]);
    const [groups, setGroups] = useState<StudyGroupResponse[]>([]);
    const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
    const [timetables, setTimetables] = useState<TimetableResponse[]>([]);
    const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
    const [lessons, setLessons] = useState<LessonResponse[]>([]);
    const [lunches, setLunches] = useState<LunchResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const { query: searchQuery } = usePageSearch("Search faculties on this page...");
    const [selectedFaculties, setSelectedFaculties] = useState<number[]>([]);

    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentFaculty, setCurrentFaculty] =
        useState<FacultyResponse | null>(null);
    const [deleteTarget, setDeleteTarget] =
        useState<FacultyResponse | "selected" | null>(null);
    const [deleteMode, setDeleteMode] = useState<DeleteMode>("SIMPLE");
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [formData, setFormData] = useState<FormDataState>(EMPTY_FORM);

    useEffect(() => {
        void loadData(true);
    }, []);

    const filteredFaculties = useMemo(() => {
        if (!searchQuery.trim()) return faculties;

        const lower = searchQuery.toLowerCase();

        return faculties.filter((faculty) => {
            return faculty.name.toLowerCase().includes(lower);
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

            const [
                facultiesData,
                departmentsData,
                majorsData,
                groupsData,
                subjectsData,
                timetablesData,
            ] = await Promise.all([
                facultyApi.getFaculties(),
                departmentApi.getDepartments(),
                majorApi.getMajors(),
                groupApi.getGroups(),
                subjectApi.getSubjects(),
                timetableApi.getAllTimetables(),
            ]);
            const timetableIds = timetablesData.map((timetable) => timetable.id);
            const [assignmentsData, lessonsData, lunchesData] = await Promise.all([
                assignmentApi.getAssignmentsForTimetables(timetableIds),
                lessonApi.getLessonsForTimetables(timetableIds),
                lunchApi.getLunchesForTimetables(timetableIds),
            ]);

            setFaculties(facultiesData);
            setDepartments(departmentsData);
            setMajors(majorsData);
            setGroups(groupsData);
            setSubjects(subjectsData);
            setTimetables(timetablesData);
            setAssignments(assignmentsData);
            setLessons(lessonsData);
            setLunches(lunchesData);
        } catch (err) {
            setError(getApiErrorMessage(err, "Failed to load faculties"));
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
        } catch (err) {
            setError(getApiErrorMessage(err, "Failed to create faculty"));
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
        } catch (err) {
            setError(getApiErrorMessage(err, "Failed to update faculty"));
        }
    };

    const handleEdit = (faculty: FacultyResponse) => {
        setCurrentFaculty(faculty);

        setFormData({
            name: faculty.name,
        });

        setIsEditModalOpen(true);
    };

    const getDeleteDependencyGroups = () => {
        const targetIds =
            deleteTarget === "selected"
                ? selectedFaculties
                : deleteTarget
                    ? [deleteTarget.id]
                    : [];

        if (targetIds.length === 0) return [];

        const relatedTimetables = timetables.filter((timetable) =>
            targetIds.includes(timetable.facultyId),
        );
        const relatedTimetableIds = new Set(
            relatedTimetables.map((timetable) => timetable.id),
        );
        const relatedGroupIds = new Set(groups
            .filter((group) => targetIds.includes(group.facultyId))
            .map((group) => group.id));

        return compactGroups([
            {
                label: "Departments",
                items: departments
                    .filter((department) => targetIds.includes(department.facultyId))
                    .map((department) => department.name),
            },
            {
                label: "Majors",
                items: majors
                    .filter((major) => targetIds.includes(major.facultyId))
                    .map((major) => major.shortName ? `${major.shortName} - ${major.name}` : major.name),
            },
            {
                label: "Groups",
                items: groups
                    .filter((group) => targetIds.includes(group.facultyId))
                    .map((group) => group.name),
            },
            {
                label: "Subjects",
                items: subjects
                    .filter((subject) => targetIds.includes(subject.facultyId))
                    .map((subject) => `${subject.code} - ${subject.name}`),
            },
            {
                label: "Timetables",
                items: relatedTimetables.map(formatTimetable),
            },
            {
                label: "Assignments",
                items: uniqueItems(
                    assignments
                        .filter((assignment) => targetIds.includes(assignment.facultyId))
                        .map(formatAssignment),
                ),
            },
            {
                label: "Lessons",
                items: uniqueItems(
                    lessons
                        .filter((lesson) => targetIds.includes(lesson.facultyId))
                        .map(formatLesson),
                ),
            },
            {
                label: "Lunches",
                items: lunches
                    .filter(
                        (lunch) =>
                            relatedTimetableIds.has(lunch.timetableId) ||
                            relatedGroupIds.has(lunch.groupId),
                    )
                    .map(formatLunch),
            },
        ]);
    };

    const openDeleteDialog = (target: FacultyResponse | "selected") => {
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
                    selectedFaculties.map((id) => facultyApi.deleteFaculty(id, mode)),
                );

                const failed = results.filter((result) => result.status === "rejected");

                if (failed.length > 0) {
                    const failedIds = selectedFaculties.filter(
                        (_id, index) => results[index].status === "rejected",
                    );
                    toast.error(getDeleteRelatedRecordsMessage("faculty", failedIds));
                }

                setSelectedFaculties([]);
                if (failed.length === 0) {
                    toast.success(getDeleteSuccessMessage("faculty", true));
                }
            } else {
                await facultyApi.deleteFaculty(target.id, mode);
                toast.success(getDeleteSuccessMessage("faculty"));
            }

            await loadData();
        } catch {
            toast.error(
                getDeleteRelatedRecordsMessage(
                    "faculty",
                    target === "selected" ? selectedFaculties : target.id,
                ),
            );
        } finally {
            setDeleteLoading(false);
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

    useEffect(() => {
        if (new URLSearchParams(window.location.search).get("create") === "1") {
            openCreateModal();
        }
    }, []);

    return (
        <AppShell>
            <PageHeader
                eyebrow="Academic Structure"
                title="Faculties"
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

            <Card className="glass-card">
                {selectedFaculties.length > 0 && (
                    <CardHeader>
                        <div className="flex justify-end">
                            <Button variant="destructive" onClick={() => openDeleteDialog("selected")}>
                                <Trash2 className="h-4 w-4" />
                                Delete selected ({selectedFaculties.length})
                            </Button>
                        </div>
                    </CardHeader>
                )}

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
                            description="Create a faculty or change the current filters."
                            actionLabel="New faculty"
                            onAction={openCreateModal}
                        />
                    ) : (
                        <div className="custom-scrollbar overflow-x-auto">
                            <table className="w-full min-w-[560px] text-sm">
                                <thead>
                                <tr className="border-b text-left">
                                    <th className="w-12 py-3">
                                        <input
                                            type="checkbox"
                                            checked={
                                                selectedFaculties.length ===
                                                sortedFaculties.length &&
                                                sortedFaculties.length > 0
                                            }
                                            onChange={handleSelectAll}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                    </th>
                                    <th className="py-3">
                                        {getSortLabel("name", "Faculty")}
                                    </th>
                                    <th className="py-3 text-right">
                                        Actions
                                    </th>
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
                                                checked={selectedFaculties.includes(
                                                    faculty.id,
                                                )}
                                                onChange={() =>
                                                    handleSelectFaculty(faculty.id)
                                                }
                                                className="h-4 w-4 rounded border-gray-300"
                                            />
                                        </td>

                                        <td className="py-4">
                                            <div className="font-medium">
                                                {faculty.name}
                                            </div>
                                        </td>

                                        <td className="py-4">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() =>
                                                        handleEdit(faculty)
                                                    }
                                                    aria-label="Edit faculty"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() =>
                                                        openDeleteDialog(faculty)
                                                    }
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

            <DeleteModeDialog
                open={Boolean(deleteTarget)}
                title={deleteTarget === "selected" ? "Delete selected faculties?" : "Delete faculty?"}
                description="Choose how related departments, majors, groups, subjects and schedule data should be handled."
                entityName={deleteTarget === "selected" ? `${selectedFaculties.length} faculties` : deleteTarget?.name}
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

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                    >
                        X
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
