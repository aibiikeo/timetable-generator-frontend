// src/components/GenerateOptionsModal.tsx
import { useState } from 'react';
import { GenerationMode } from '@/lib/types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (mode: GenerationMode) => void;
    timetableName: string;
}

export default function GenerateOptionsModal({ isOpen, onClose, onGenerate, timetableName }: Props) {
    const [mode, setMode] = useState<GenerationMode>('NEW');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Generate Timetable: {timetableName}</h3>
                    <div className="space-y-3">
                        <label className="flex items-center space-x-3">
                            <input
                                type="radio"
                                name="mode"
                                value="NEW"
                                checked={mode === 'NEW'}
                                onChange={() => setMode('NEW')}
                                className="h-4 w-4 text-blue-600"
                            />
                            <span>New generation (clear existing lessons)</span>
                        </label>
                        <label className="flex items-center space-x-3">
                            <input
                                type="radio"
                                name="mode"
                                value="APPEND"
                                checked={mode === 'APPEND'}
                                onChange={() => setMode('APPEND')}
                                className="h-4 w-4 text-blue-600"
                            />
                            <span>Append to existing (keep old lessons)</span>
                        </label>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                            Cancel
                        </button>
                        <button onClick={() => onGenerate(mode)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                            Generate
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}