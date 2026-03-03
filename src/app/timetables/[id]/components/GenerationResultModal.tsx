import { GenerationResponse } from '@/lib/types';

interface Props {
    result: GenerationResponse;
    onClose: () => void;
    onManualPlace: (assignmentId: number) => void;
}

export default function GenerationResultModal({ result, onClose, onManualPlace }: Props) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Generation Result</h3>
                    <div className="space-y-2">
                        <p>Total vertices: {result.totalVertices}</p>
                        <p>Placed lessons: {result.placedLessonsCount}</p>
                        <p>Failed vertices: {result.failedVerticesCount}</p>
                        <p>Status: {result.status}</p>
                    </div>
                    {result.failedAssignments.length > 0 && (
                        <div className="mt-4">
                            <h4 className="font-medium mb-2">Failed Assignments:</h4>
                            <ul className="space-y-2">
                                {result.failedAssignments.map(f => (
                                    <li key={f.assignmentId} className="flex justify-between items-center p-2 bg-red-50 rounded">
                                        <span>Assignment #{f.assignmentId}: {f.reason}</span>
                                        <button
                                            onClick={() => onManualPlace(f.assignmentId)}
                                            className="text-sm text-blue-600 hover:text-blue-800"
                                        >
                                            Place manually
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <div className="mt-6 flex justify-end">
                        <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}