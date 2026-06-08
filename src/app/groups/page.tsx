"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Edit,
    Layers3,
    Plus,
    Trash2,
} from "lucide-react";

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
import { EmptyState } from "@/components/ui/empty-state";
import { FilterSelect } from "@/components/ui/filter-select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DeleteMode,
    DepartmentResponse,
    Degree,
    FacultyResponse,
    departmentApi,
    facultyApi,
    getApiErrorMessage,
    groupApi,
    majorApi,
    MajorResponse,
    StudyGroupResponse,
} from "@/lib";

type SortField = "name" | "major" | "degree" | "course" | "studentCount";
type SortDirection = "asc" | "desc";

interface FormDataState {
    name: string;
    majorId: number;
    degree: Degree;
    course: number | string;
    studentCount: number | string;
}

const EMPTY_FORM: FormDataState = {
    name: "",
    majorId: 0,
    degree: "BACHELOR",
    course: 1,
    studentCount: 25,
};

const DEGREES: Degree[] = ["BACHELOR", "MASTER", "PHD", "SPECIALIST"];

function groupDegreeLabel(degree: Degree) {
    return degree === "PHD" ? "PhD" : degree;
}

function getDegreeBadgeClass(degree: Degree) {
    switch (degree) {
        case "BACHELOR":
            return "border-emerald-200 bg-emerald-50 text-emerald-700";
        case "MASTER":
            return "border-violet-200 bg-violet-50 text-violet-700";
        case "PHD":
            return "border-amber-200 bg-amber-50 text-amber-800";
        case "SPECIALIST":
            return "border-sky-200 bg-sky-50 text-sky-700";
        default:
            return "";
    }
}

export default function GroupsPage() {
    const [groups, setGroups] = useState<StudyGroupResponse[]>([]);
    const [majors, setMajors] = useState<MajorResponse[]>([]);
    const [faculties, setFaculties] = useState<FacultyResponse[]>([]);
    const [departments, setDepartments] = useState<DepartmentResponse[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const { query: searchQuery } = usePageSearch("Search groups on this page...");
    const [facultyFilter, setFacultyFilter] = useState("all");
    const [departmentFilter, setDepartmentFilter] = useState("all");
    const [majorFilter, setMajorFilter] = useState("all");
    const [selectedGroups, setSelectedGroups] = useState<number[]>([]);

    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentGroup, setCurrentGroup] =
        useState<StudyGroupResponse | null>(null);

    const [formData, setFormData] = useState<FormDataState>(EMPTY_FORM);

    useEffect(() => {
        loadData(true);
    }, []);

    const majorsMap = useMemo(() => {
        const map = new Map<number, string>();

        majors.forEach((major) => {
            map.set(
                major.id,
                major.shortName ? `${major.shortName} - ${major.name}` : major.name,
            );
        });

        return map;
    }, [majors]);

    const filteredGroups = useMemo(() => {
        if (!searchQuery.trim()) return groups;

        const lower = searchQuery.toLowerCase();

        return groups.filter((group) => {
            const majorLabel = majorsMap.get(group.majorId) || "";

            return (
                group.name.toLowerCase().includes(lower) ||
                group.course.toString().includes(lower) ||
                group.studentCount.toString().includes(lower) ||
                group.degree.toLowerCase().includes(lower) ||
                groupDegreeLabel(group.degree).toLowerCase().includes(lower) ||
                group.majorName?.toLowerCase().includes(lower) ||
                majorLabel.toLowerCase().includes(lower)
            );
        });
    }, [groups, majorsMap, searchQuery]);

    const filterOptions = useMemo(() => {
        return {
            faculties: [...faculties].sort((a, b) => a.name.localeCompare(b.name)),
            departments: [...departments].sort((a, b) => a.name.localeCompare(b.name)),
            majors: [...majors].sort((a, b) => a.name.localeCompare(b.name)),
        };
    }, [departments, faculties, majors]);

    const filteredByDropdowns = useMemo(() => {
        return filteredGroups.filter((group) => {
            const matchesFaculty =
                facultyFilter === "all" || group.facultyId.toString() === facultyFilter;
            const matchesDepartment =
                departmentFilter === "all" ||
                group.departmentId.toString() === departmentFilter;
            const matchesMajor =
                majorFilter === "all" || group.majorId.toString() === majorFilter;

            return matchesFaculty && matchesDepartment && matchesMajor;
        });
    }, [departmentFilter, facultyFilter, filteredGroups, majorFilter]);

    const sortedGroups = useMemo(() => {
        return [...filteredByDropdowns].sort((a, b) => {
            const direction = sortDirection === "asc" ? 1 : -1;

            if (sortField === "name") {
                return a.name.localeCompare(b.name) * direction;
            }

            if (sortField === "major") {
                const majorA = a.majorName || majorsMap.get(a.majorId) || "";
                const majorB = b.majorName || majorsMap.get(b.majorId) || "";

                return majorA.localeCompare(majorB) * direction;
            }

            if (sortField === "degree") {
                return groupDegreeLabel(a.degree).localeCompare(groupDegreeLabel(b.degree)) * direction;
            }

            if (sortField === "course") {
                return (a.course - b.course) * direction;
            }

            return (a.studentCount - b.studentCount) * direction;
        });
    }, [filteredByDropdowns, sortField, sortDirection, majorsMap]);

    const loadData = async (initial = false) => {
        try {
            if (initial) setLoading(true);

            setError("");

            const [groupsData, majorsData, facultiesData, departmentsData] = await Promise.all([
                groupApi.getGroups(),
                majorApi.getMajors(),
                facultyApi.getFaculties(),
                departmentApi.getDepartments(),
            ]);

            setGroups(groupsData);
            setMajors(majorsData);
            setFaculties(facultiesData);
            setDepartments(departmentsData);
        } catch (err) {
            setError(getApiErrorMessage(err, "Failed to load study groups"));
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
            setError("Group name is required");
            return false;
        }

        if (!formData.majorId) {
            setError("Please select a major");
            return false;
        }

        if (Number(formData.course) < 1) {
            setError("Course must be at least 1");
            return false;
        }

        if (Number(formData.studentCount) < 1) {
            setError("Student count must be at least 1");
            return false;
        }

        return true;
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            setError("");

            await groupApi.createGroup({
                name: formData.name.trim(),
                majorId: formData.majorId,
                degree: formData.degree,
                course: Number(formData.course),
                studentCount: Number(formData.studentCount),
            });

            setIsCreateModalOpen(false);
            resetForm();

            await loadData();
        } catch (err) {
            setError(getApiErrorMessage(err, "Failed to create study group"));
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentGroup) return;
        if (!validateForm()) return;

        try {
            setError("");

            await groupApi.updateGroup(currentGroup.id, {
                name: formData.name.trim(),
                majorId: formData.majorId,
                degree: formData.degree,
                course: Number(formData.course),
                studentCount: Number(formData.studentCount),
            });

            setIsEditModalOpen(false);
            setCurrentGroup(null);
            resetForm();

            await loadData();
        } catch (err) {
            setError(getApiErrorMessage(err, "Failed to update study group"));
        }
    };

    const handleEdit = (group: StudyGroupResponse) => {
        setCurrentGroup(group);

        setFormData({
            name: group.name,
            majorId: group.majorId,
            degree: group.degree,
            course: group.course,
            studentCount: group.studentCount,
        });

        setIsEditModalOpen(true);
    };

    const handleDelete = async (
        group: StudyGroupResponse,
        mode: DeleteMode = "SIMPLE",
    ) => {
        if (!confirm(`Delete study group "${group.name}"?`)) return;

        try {
            setError("");

            await groupApi.deleteGroup(group.id, mode);

            await loadData();
        } catch (err) {
            setError(
                getApiErrorMessage(
                    err,
                    "Failed to delete study group. It may have related assignments or lessons.",
                ),
            );
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedGroups.length === 0) return;

        if (!confirm(`Delete ${selectedGroups.length} selected study groups?`)) {
            return;
        }

        try {
            setError("");

            const results = await Promise.allSettled(
                selectedGroups.map((id) => groupApi.deleteGroup(id, "SIMPLE")),
            );

            const failed = results.filter((result) => result.status === "rejected");

            if (failed.length > 0) {
                setError(`${failed.length} group(s) could not be deleted`);
            }

            setSelectedGroups([]);

            await loadData();
        } catch (err) {
            setError(
                getApiErrorMessage(
                    err,
                    "Unexpected error while deleting study groups",
                ),
            );
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedGroups(sortedGroups.map((group) => group.id));
        } else {
            setSelectedGroups([]);
        }
    };

    const handleSelectGroup = (id: number) => {
        setSelectedGroups((prev) =>
            prev.includes(id)
                ? prev.filter((groupId) => groupId !== id)
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
        setCurrentGroup(null);
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
                title="Study Groups"
                actions={
                    <Button onClick={openCreateModal}>
                        <Plus className="h-4 w-4" />
                        New group
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
                        <div className="grid w-full gap-3 md:grid-cols-3 lg:max-w-5xl">
                            <FilterSelect
                                value={facultyFilter}
                                onChange={setFacultyFilter}
                                ariaLabel="Filter groups by faculty"
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
                                ariaLabel="Filter groups by department"
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
                                ariaLabel="Filter groups by major"
                            >
                                <option value="all">All majors</option>
                                {filterOptions.majors.map((major) => (
                                    <option key={major.id} value={major.id}>
                                        {major.shortName || major.name}
                                    </option>
                                ))}
                            </FilterSelect>
                        </div>

                        {selectedGroups.length > 0 && (
                            <Button variant="destructive" onClick={handleDeleteSelected}>
                                <Trash2 className="h-4 w-4" />
                                Delete selected ({selectedGroups.length})
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
                    ) : sortedGroups.length === 0 ? (
                        <EmptyState
                            title="No study groups found"
                            description="Create a study group or change the current filters."
                            icon={<Layers3 className="h-7 w-7" />}
                            actionLabel="New group"
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
                                                selectedGroups.length ===
                                                sortedGroups.length &&
                                                sortedGroups.length > 0
                                            }
                                            onChange={handleSelectAll}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                    </th>
                                    <th className="py-3">
                                        {getSortLabel("name", "Group")}
                                    </th>
                                    <th className="py-3">
                                        {getSortLabel("major", "Major")}
                                    </th>
                                    <th className="py-3">
                                        {getSortLabel("degree", "Degree")}
                                    </th>
                                    <th className="py-3 text-center">
                                        {getSortLabel("course", "Course")}
                                    </th>
                                    <th className="py-3 text-right">
                                        Actions
                                    </th>
                                </tr>
                                </thead>

                                <tbody>
                                {sortedGroups.map((group) => (
                                    <tr
                                        key={group.id}
                                        className="border-b last:border-b-0 hover:bg-accent/50"
                                    >
                                        <td className="py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedGroups.includes(
                                                    group.id,
                                                )}
                                                onChange={() =>
                                                    handleSelectGroup(group.id)
                                                }
                                                className="h-4 w-4 rounded border-gray-300"
                                            />
                                        </td>

                                        <td className="py-4">
                                            <div className="font-medium">
                                                {group.name}
                                            </div>
                                        </td>

                                        <td className="py-4">
                                            <div className="font-medium">
                                                {group.majorName ||
                                                    majorsMap.get(
                                                        group.majorId,
                                                    ) ||
                                                    "Unknown"}
                                            </div>
                                        </td>

                                        <td className="py-4">
                                            <Badge
                                                variant="outline"
                                                className={getDegreeBadgeClass(group.degree)}
                                            >
                                                {groupDegreeLabel(group.degree)}
                                            </Badge>
                                        </td>

                                        <td className="py-4 text-center">
                                            <Badge variant="outline">
                                                Course {group.course}
                                            </Badge>
                                        </td>

                                        <td className="py-4">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() =>
                                                        handleEdit(group)
                                                    }
                                                    aria-label="Edit group"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() =>
                                                        handleDelete(group)
                                                    }
                                                    aria-label="Delete group"
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
                <GroupModal
                    title={isCreateModalOpen ? "Create Study Group" : "Edit Study Group"}
                    formData={formData}
                    majors={majors}
                    onChange={handleInputChange}
                    onClose={isCreateModalOpen ? closeCreateModal : closeEditModal}
                    onSubmit={isCreateModalOpen ? handleCreateSubmit : handleEditSubmit}
                />
            )}
        </AppShell>
    );
}

interface GroupModalProps {
    title: string;
    formData: FormDataState;
    majors: MajorResponse[];
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

function GroupModal({
                        title,
                        formData,
                        majors,
                        onClose,
                        onSubmit,
                        onChange,
                    }: GroupModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="glass-card w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold">{title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Link the group to a major and set course details.
                        </p>
                    </div>

                    <Button type="button" variant="ghost" size="icon" onClick={onClose}>
                        X
                    </Button>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Group name *
                        </label>
                        <Input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={onChange}
                            placeholder="Example: COM-22"
                            required
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Major *
                        </label>
                        <select
                            name="majorId"
                            value={formData.majorId}
                            onChange={onChange}
                            className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            required
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

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Degree *
                        </label>
                        <select
                            name="degree"
                            value={formData.degree}
                            onChange={onChange}
                            className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            required
                        >
                            {DEGREES.map((degree) => (
                                <option key={degree} value={degree}>
                                    {groupDegreeLabel(degree)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Course *
                            </label>
                            <Input
                                type="number"
                                name="course"
                                value={formData.course}
                                onChange={onChange}
                                min={1}
                                max={6}
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Student count *
                            </label>
                            <Input
                                type="number"
                                name="studentCount"
                                value={formData.studentCount}
                                onChange={onChange}
                                min={1}
                                required
                            />
                        </div>
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
