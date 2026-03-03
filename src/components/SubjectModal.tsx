'use client';

import { FacultyResponse } from '@/lib';

interface FormDataState {
    name: string;
    code: string;
    totalHours: number | string;
    hoursPerWeek: number | string;
    facultyId: number;
}

interface Props {
    title: string;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    formData: FormDataState;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    faculties: FacultyResponse[];
}

export default function SubjectModal({
                                         title,
                                         isOpen,
                                         onClose,
                                         onSubmit,
                                         formData,
                                         onChange,
                                         faculties,
                                     }: Props) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold">{title}</h3>
                        <button onClick={onClose}>✕</button>
                    </div>

                    <form onSubmit={onSubmit} className="space-y-4">
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={onChange}
                            placeholder="Subject name"
                            className="w-full border p-2 rounded"
                        />

                        <input
                            type="text"
                            name="code"
                            value={formData.code}
                            onChange={onChange}
                            placeholder="Code"
                            className="w-full border p-2 rounded"
                        />

                        <select
                            name="facultyId"
                            value={formData.facultyId}
                            onChange={onChange}
                            className="w-full border p-2 rounded"
                        >
                            <option value={0}>Select Faculty</option>
                            {faculties.map(f => (
                                <option key={f.id} value={f.id}>
                                    {f.name}
                                </option>
                            ))}
                        </select>

                        <input
                            type="number"
                            name="totalHours"
                            value={formData.totalHours}
                            onChange={onChange}
                            min="1"
                            className="w-full border p-2 rounded"
                        />

                        <input
                            type="number"
                            name="hoursPerWeek"
                            value={formData.hoursPerWeek}
                            onChange={onChange}
                            min="1"
                            className="w-full border p-2 rounded"
                        />

                        <div className="flex justify-end gap-3 mt-4">
                            <button type="button" onClick={onClose} className="border px-4 py-2 rounded">
                                Cancel
                            </button>
                            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
                                Save
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
