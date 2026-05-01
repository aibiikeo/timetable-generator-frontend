"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Edit,
    GraduationCap,
    Layers3,
    Plus,
    Search,
    Trash2,
    Users,
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
    MajorResponse,
    StudyGroupResponse,
    groupApi,
    majorApi,
} from "@/lib";

type SortField = "name" | "major" | "course" | "studentCount";
type SortDirection = "asc" | "desc";

interface FormDataState {
    name: string;
    majorId: number;
    course: number | string;
    studentCount: number | string;
}

const EMPTY_FORM: FormDataState = {
    name: "",
    majorId: 0,
    course: 1,
    studentCount: 25,
};

export default function GroupsPage() {
    const [groups, setGroups] = useState<StudyGroupResponse[]>([]);
    const [majors, setMajors] = useState<MajorResponse[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedGroups, setSelectedGroups] = useState<number[]>([]);

    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentGroup, setCurrentGroup] = useState<StudyGroupResponse | null>(null);

    const [formData, setFormData] = useState<FormDataState>(EMPTY_FORM);

    useEffect(() => {
        loadData(true);
    }, []);

    const majorsMap = useMemo(() => {
        const map = new Map<number, string>();

        majors.forEach((major) => {
            map.set(
                major.id,
                major.shortName ? `${major.shortName} — ${major.name}` : major.name,
            );
        });

        return map;
    }, [majors]);

    const filteredGroups = useMemo(() => {
        if (!searchQuery.trim()) return groups;

        const lower = searchQuery.toLowerCase();

        return groups.filter((group) => {
            return (
                group.name.toLowerCase().includes(lower) ||
                group.id.toString().includes(lower) ||
                group.course.toString().includes(lower) ||
                group.studentCount.toString().includes(lower) ||
                group.majorName?.toLowerCase().includes(lower) ||
                group.departmentName?.toLowerCase().includes(lower) ||
                group.facultyName?.toLowerCase().includes(lower)
            );
        });
    }, [groups, searchQuery]);

    const sortedGroups = useMemo(() => {
        return [...filteredGroups].sort((a, b) => {
            const direction = sortDirection === "asc" ? 1 : -1;

            if (sortField === "name") {
                return a.name.localeCompare(b.name) * direction;
            }

            if (sortField === "major") {
                const majorA = a.majorName || majorsMap.get(a.majorId) || "";
                const majorB = b.majorName || majorsMap.get(b.majorId) || "";

                return majorA.localeCompare(majorB) * direction;
            }

            if (sortField === "course") {
                return (a.course - b.course) * direction;
            }

            return (a.studentCount - b.studentCount) * direction;
        });
    }, [filteredGroups, sortField, sortDirection, majorsMap]);

    const loadData = async (initial = false) => {
        try {
            if (initial) setLoading(true);

            setError("");

            const [groupsData, majorsData] = await Promise.all([
                groupApi.getGroups(),
                majorApi.getMajors(),
            ]);

            setGroups(groupsData);
            setMajors(majorsData);
        } catch (err) {
            console.error("Error loading study groups:", err);
            setError("Failed to load study groups");
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
                course: Number(formData.course),
                studentCount: Number(formData.studentCount),
            });

            setIsCreateModalOpen(false);
            resetForm();

            await loadData();
        } catch (err: any) {
            console.error("Error creating study group:", err);
            setError(err.response?.data?.message || "Failed to create study group");
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
                course: Number(formData.course),
                studentCount: Number(formData.studentCount),
            });

            setIsEditModalOpen(false);
            setCurrentGroup(null);
            resetForm();

            await loadData();
        } catch (err: any) {
            console.error("Error updating study group:", err);
            setError(err.response?.data?.message || "Failed to update study group");
        }
    };

    const handleEdit = (group: StudyGroupResponse) => {
        setCurrentGroup(group);

        setFormData({
            name: group.name,
            majorId: group.majorId,
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
        } catch (err: any) {
            console.error("Error deleting study group:", err);
            setError(
                err.response?.data?.message ||
                "Failed to delete study group. It may have related assignments or lessons.",
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
        } catch {
            setError("Unexpected error while deleting study groups");
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

    return (
        <AppShell>
            <PageHeader
                eyebrow="Academic Structure"
                title="Study Groups"
                description="Manage student groups and link them to the correct major."
                actions={
                    <Button
                        onClick={() => {
                            setError("");
                            resetForm();
                            setIsCreateModalOpen(true);
                        }}
                    >
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

            <section className="grid gap-4 md:grid-cols-3">
                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Study groups
                        </CardTitle>
                        <Users className="h-4 w-4 text-blue-700" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{groups.length}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Total groups
                        </p>
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Majors
                        </CardTitle>
                        <GraduationCap className="h-4 w-4 text-violet-700" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{majors.length}</div>
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
                        <div className="text-3xl font-bold">{selectedGroups.length}</div>
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
                                placeholder="Search by group, major, department..."
                                className="h-11 rounded-xl pl-10 pr-4 shadow-sm"
                            />
                        </div>

                        {selectedGroups.length > 0 && (
                            <Button
                                variant="destructive"
                                onClick={handleDeleteSelected}
                            >
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
                            description="Create a study group or change the search query."
                            icon={<Layers3 className="h-7 w-7" />}
                            actionLabel="New group"
                            onAction={() => {
                                setError("");
                                resetForm();
                                setIsCreateModalOpen(true);
                            }}
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
                                                selectedGroups.length === sortedGroups.length &&
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
                                    <th className="py-3 text-center">
                                        {getSortLabel("course", "Course")}
                                    </th>
                                    <th className="py-3 text-center">
                                        {getSortLabel("studentCount", "Students")}
                                    </th>
                                    <th className="py-3 text-right">Actions</th>
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
                                                checked={selectedGroups.includes(group.id)}
                                                onChange={() => handleSelectGroup(group.id)}
                                                className="h-4 w-4 rounded border-gray-300"
                                            />
                                        </td>

                                        <td className="py-4">
                                            <div className="font-medium">{group.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                ID: {group.id}
                                            </div>
                                        </td>

                                        <td className="py-4">
                                            <div className="font-medium">
                                                {group.majorName ||
                                                    majorsMap.get(group.majorId) ||
                                                    "Unknown"}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {group.departmentName || "No department"}
                                            </div>
                                        </td>

                                        <td className="py-4 text-center">
                                            <Badge variant="outline">
                                                Course {group.course}
                                            </Badge>
                                        </td>

                                        <td className="py-4 text-center">
                                            {group.studentCount}
                                        </td>

                                        <td className="py-4">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => handleEdit(group)}
                                                    aria-label="Edit group"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => handleDelete(group)}
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

            {isCreateModalOpen && (
                <GroupModal
                    title="Create Study Group"
                    formData={formData}
                    majors={majors}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSubmit={handleCreateSubmit}
                    onChange={handleInputChange}
                />
            )}

            {isEditModalOpen && currentGroup && (
                <GroupModal
                    title="Edit Study Group"
                    formData={formData}
                    majors={majors}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setCurrentGroup(null);
                    }}
                    onSubmit={handleEditSubmit}
                    onChange={handleInputChange}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
                <div className="p-6">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">
                                {title}
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Group must be linked to a major.
                            </p>
                        </div>

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={onClose}
                            aria-label="Close modal"
                        >
                            ✕
                        </Button>
                    </div>

                    <form onSubmit={onSubmit} className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-foreground">
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
                            <label className="mb-1 block text-sm font-medium text-foreground">
                                Major *
                            </label>
                            <select
                                name="majorId"
                                value={formData.majorId}
                                onChange={onChange}
                                className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                required
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

                        <div>
                            <label className="mb-1 block text-sm font-medium text-foreground">
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
                            <label className="mb-1 block text-sm font-medium text-foreground">
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

                        <div className="mt-8 flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                            >
                                Cancel
                            </Button>

                            <Button type="submit">Save</Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}