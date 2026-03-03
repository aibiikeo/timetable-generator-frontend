import { useState } from 'react';
import { DayOfWeek, RoomResponse } from '@/lib/types';
import { DAYS_OF_WEEK } from '@/lib/constants';

interface Props {
    assignmentId: number;
    rooms: RoomResponse[];
    onPlace: (data: { dayOfWeek: DayOfWeek; startTime: string; durationHours: number; roomId: number }) => void;
    onClose: () => void;
}

export default function ManualPlacementModal({ assignmentId, rooms, onPlace, onClose }: Props) {
    const [day, setDay] = useState<DayOfWeek>('MONDAY');
    const [startTime, setStartTime] = useState('09:00');
    const [duration, setDuration] = useState(2);
    const [roomId, setRoomId] = useState<number | ''>('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!roomId) return;
        onPlace({ dayOfWeek: day, startTime, durationHours: duration, roomId: Number(roomId) });
    };

    const handleRoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setRoomId(value === '' ? '' : Number(value));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Manual Placement for Assignment #{assignmentId}</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Day</label>
                            <select value={day} onChange={e => setDay(e.target.value as DayOfWeek)} className="mt-1 block w-full border rounded-md p-2">
                                {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Start Time</label>
                            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="mt-1 block w-full border rounded-md p-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Duration (hours)</label>
                            <input type="number" min="1" max="8" value={duration} onChange={e => setDuration(Number(e.target.value))} className="mt-1 block w-full border rounded-md p-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Room</label>
                            <select value={roomId} onChange={handleRoomChange} className="mt-1 block w-full border rounded-md p-2" required>
                                <option value="">Select room</option>
                                {rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.capacity})</option>)}
                            </select>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Place</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}