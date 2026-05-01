"use client";

import { useEffect, useMemo, useState } from "react";
import {
    DoorOpen,
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
    RoomResponse,
    RoomType,
    roomApi,
} from "@/lib";

type SortField = "name" | "capacity" | "type";
type SortDirection = "asc" | "desc";

interface FormDataState {
    name: string;
    capacity: number | string;
    type: RoomType;
}

const EMPTY_FORM: FormDataState = {
    name: "",
    capacity: 25,
    type: "CLASSROOM",
};

const ROOM_TYPES: RoomType[] = ["CLASSROOM", "COMPUTER_LAB", "ANY"];

export default function RoomsPage() {
    const [rooms, setRooms] = useState<RoomResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRooms, setSelectedRooms] = useState<number[]>([]);

    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentRoom, setCurrentRoom] = useState<RoomResponse | null>(null);

    const [formData, setFormData] = useState<FormDataState>(EMPTY_FORM);

    useEffect(() => {
        void loadData(true);
    }, []);

    const filteredRooms = useMemo(() => {
        if (!searchQuery.trim()) return rooms;

        const lower = searchQuery.toLowerCase();

        return rooms.filter((room) => {
            return (
                room.name.toLowerCase().includes(lower) ||
                room.type.toLowerCase().includes(lower) ||
                room.capacity.toString().includes(lower) ||
                room.id.toString().includes(lower)
            );
        });
    }, [rooms, searchQuery]);

    const sortedRooms = useMemo(() => {
        return [...filteredRooms].sort((a, b) => {
            const direction = sortDirection === "asc" ? 1 : -1;

            if (sortField === "capacity") {
                return (a.capacity - b.capacity) * direction;
            }

            return String(a[sortField]).localeCompare(String(b[sortField])) * direction;
        });
    }, [filteredRooms, sortField, sortDirection]);

    const totalCapacity = useMemo(() => {
        return rooms.reduce((sum, room) => sum + room.capacity, 0);
    }, [rooms]);

    const loadData = async (initial = false) => {
        try {
            if (initial) setLoading(true);

            setError("");

            const data = await roomApi.getRooms();
            setRooms(data);
        } catch (err) {
            console.error("Error loading rooms:", err);
            setError("Failed to load rooms");
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
                    : value,
        }));
    };

    const validateForm = () => {
        if (!formData.name.trim()) {
            setError("Room name is required");
            return false;
        }

        if (Number(formData.capacity) < 1) {
            setError("Capacity must be at least 1");
            return false;
        }

        if (!formData.type) {
            setError("Please select room type");
            return false;
        }

        return true;
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            setError("");

            await roomApi.createRoom({
                name: formData.name.trim(),
                capacity: Number(formData.capacity),
                type: formData.type,
            });

            setIsCreateModalOpen(false);
            resetForm();

            await loadData();
        } catch (err: any) {
            console.error("Error creating room:", err);
            setError(err.response?.data?.message || "Failed to create room");
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentRoom) return;
        if (!validateForm()) return;

        try {
            setError("");

            await roomApi.updateRoom(currentRoom.id, {
                name: formData.name.trim(),
                capacity: Number(formData.capacity),
                type: formData.type,
            });

            setIsEditModalOpen(false);
            setCurrentRoom(null);
            resetForm();

            await loadData();
        } catch (err: any) {
            console.error("Error updating room:", err);
            setError(err.response?.data?.message || "Failed to update room");
        }
    };

    const handleEdit = (room: RoomResponse) => {
        setCurrentRoom(room);

        setFormData({
            name: room.name,
            capacity: room.capacity,
            type: room.type,
        });

        setIsEditModalOpen(true);
    };

    const handleDelete = async (room: RoomResponse) => {
        if (!confirm(`Delete room "${room.name}"?`)) return;

        try {
            setError("");

            await roomApi.deleteRoom(room.id);
            await loadData();
        } catch (err: any) {
            console.error("Error deleting room:", err);
            setError(
                err.response?.data?.message ||
                "Failed to delete room. It may be used in lessons.",
            );
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedRooms.length === 0) return;

        if (!confirm(`Delete ${selectedRooms.length} selected rooms?`)) return;

        try {
            setError("");

            const results = await Promise.allSettled(
                selectedRooms.map((id) => roomApi.deleteRoom(id)),
            );

            const failed = results.filter((result) => result.status === "rejected");

            if (failed.length > 0) {
                setError(`${failed.length} room(s) could not be deleted`);
            }

            setSelectedRooms([]);
            await loadData();
        } catch {
            setError("Unexpected error while deleting rooms");
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedRooms(sortedRooms.map((room) => room.id));
        } else {
            setSelectedRooms([]);
        }
    };

    const handleSelectRoom = (id: number) => {
        setSelectedRooms((prev) =>
            prev.includes(id)
                ? prev.filter((roomId) => roomId !== id)
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
        setCurrentRoom(null);
        resetForm();
    };

    return (
        <AppShell>
            <PageHeader
                eyebrow="Resources"
                title="Rooms"
                description="Manage classrooms, computer labs and room capacity."
                actions={
                    <Button onClick={openCreateModal}>
                        <Plus className="h-4 w-4" />
                        New room
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
                            Rooms
                        </CardTitle>
                        <DoorOpen className="h-4 w-4 text-blue-700" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{rooms.length}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Total rooms
                        </p>
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Capacity
                        </CardTitle>
                        <Badge variant="info">Seats</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totalCapacity}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Total available seats
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
                        <div className="text-3xl font-bold">{selectedRooms.length}</div>
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
                                placeholder="Search by room, type, capacity..."
                                className="h-11 rounded-xl pl-10 pr-4 shadow-sm"
                            />
                        </div>

                        {selectedRooms.length > 0 && (
                            <Button variant="destructive" onClick={handleDeleteSelected}>
                                <Trash2 className="h-4 w-4" />
                                Delete selected ({selectedRooms.length})
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
                    ) : sortedRooms.length === 0 ? (
                        <EmptyState
                            title="No rooms found"
                            description="Create a room or change the search query."
                            actionLabel="New room"
                            onAction={openCreateModal}
                        />
                    ) : (
                        <div className="custom-scrollbar overflow-x-auto">
                            <table className="w-full min-w-[850px] text-sm">
                                <thead>
                                <tr className="border-b text-left">
                                    <th className="w-12 py-3">
                                        <input
                                            type="checkbox"
                                            checked={
                                                selectedRooms.length === sortedRooms.length &&
                                                sortedRooms.length > 0
                                            }
                                            onChange={handleSelectAll}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                    </th>
                                    <th className="py-3">{getSortLabel("name", "Room")}</th>
                                    <th className="py-3 text-center">
                                        {getSortLabel("capacity", "Capacity")}
                                    </th>
                                    <th className="py-3">{getSortLabel("type", "Type")}</th>
                                    <th className="py-3">ID</th>
                                    <th className="py-3 text-right">Actions</th>
                                </tr>
                                </thead>

                                <tbody>
                                {sortedRooms.map((room) => (
                                    <tr
                                        key={room.id}
                                        className="border-b last:border-b-0 hover:bg-accent/50"
                                    >
                                        <td className="py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedRooms.includes(room.id)}
                                                onChange={() => handleSelectRoom(room.id)}
                                                className="h-4 w-4 rounded border-gray-300"
                                            />
                                        </td>

                                        <td className="py-4">
                                            <div className="font-medium">{room.name}</div>
                                        </td>

                                        <td className="py-4 text-center">
                                            {room.capacity}
                                        </td>

                                        <td className="py-4">
                                            <Badge variant="secondary">{room.type}</Badge>
                                        </td>

                                        <td className="py-4">
                                            <Badge variant="outline">#{room.id}</Badge>
                                        </td>

                                        <td className="py-4">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => handleEdit(room)}
                                                    aria-label="Edit room"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => handleDelete(room)}
                                                    aria-label="Delete room"
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
                <RoomModal
                    title={isCreateModalOpen ? "Create Room" : "Edit Room"}
                    formData={formData}
                    onChange={handleInputChange}
                    onClose={isCreateModalOpen ? closeCreateModal : closeEditModal}
                    onSubmit={isCreateModalOpen ? handleCreateSubmit : handleEditSubmit}
                />
            )}
        </AppShell>
    );
}

interface RoomModalProps {
    title: string;
    formData: FormDataState;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

function RoomModal({
                       title,
                       formData,
                       onClose,
                       onSubmit,
                       onChange,
                   }: RoomModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="glass-card w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold">{title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Fill in room information.
                        </p>
                    </div>

                    <Button type="button" variant="ghost" size="icon" onClick={onClose}>
                        ✕
                    </Button>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Room name
                        </label>
                        <Input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={onChange}
                            placeholder="Example: 204 or Lab A"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Capacity
                        </label>
                        <Input
                            type="number"
                            name="capacity"
                            value={formData.capacity}
                            onChange={onChange}
                            min={1}
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Room type
                        </label>
                        <select
                            name="type"
                            value={formData.type}
                            onChange={onChange}
                            required
                            className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            {ROOM_TYPES.map((type) => (
                                <option key={type} value={type}>
                                    {type}
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