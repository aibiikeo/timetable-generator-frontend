import { useState } from 'react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onExport: (format: 'pdf' | 'excel') => void;
    timetableName: string;
}

export default function ExportModal({ isOpen, onClose, onExport, timetableName }: Props) {
    const [format, setFormat] = useState<'pdf' | 'excel'>('pdf');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Export Timetable: {timetableName}</h3>
                    <div className="space-y-3">
                        <label className="flex items-center space-x-3">
                            <input
                                type="radio"
                                name="format"
                                value="pdf"
                                checked={format === 'pdf'}
                                onChange={() => setFormat('pdf')}
                                className="h-4 w-4 text-blue-600"
                            />
                            <span>PDF</span>
                        </label>
                        <label className="flex items-center space-x-3">
                            <input
                                type="radio"
                                name="format"
                                value="excel"
                                checked={format === 'excel'}
                                onChange={() => setFormat('excel')}
                                className="h-4 w-4 text-blue-600"
                            />
                            <span>Excel (XLSX)</span>
                        </label>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                            Cancel
                        </button>
                        <button onClick={() => onExport(format)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                            Export
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}