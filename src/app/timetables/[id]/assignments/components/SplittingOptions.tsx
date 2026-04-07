'use client';

import { generateSplittingOptions } from "@/lib/splitting";

type SplittingMode = 'auto' | 'manual';

interface SplittingOptionsProps {
    totalHours: number;
    mode: SplittingMode;
    selectedValue: string;
    manualValue: string;
    onModeChange: (mode: SplittingMode) => void;
    onSelectSuggested: (value: string) => void;
    onManualChange: (value: string) => void;
    options?: string[];
}

export default function SplittingOptions({
                                             totalHours,
                                             mode,
                                             selectedValue,
                                             manualValue,
                                             onModeChange,
                                             onSelectSuggested,
                                             onManualChange,
                                             options,
                                         }: SplittingOptionsProps) {
    const generatedOptions = options || generateSplittingOptions(totalHours);

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
                Hour splitting
            </label>

            {generatedOptions.map(opt => (
                <label key={opt} className="flex items-center space-x-2">
                    <input
                        type="radio"
                        name="splitting"
                        value={opt}
                        checked={mode === 'auto' && selectedValue === opt}
                        onChange={() => {
                            onModeChange('auto');
                            onSelectSuggested(opt);
                        }}
                        className="h-4 w-4 text-blue-600"
                    />
                    <span>{opt}</span>
                </label>
            ))}

            <label className="flex items-center space-x-2">
                <input
                    type="radio"
                    name="splitting"
                    value="manual-mode"
                    checked={mode === 'manual'}
                    onChange={() => {
                        onModeChange('manual');
                    }}
                    className="h-4 w-4 text-blue-600"
                />
                <span>Enter manually:</span>
            </label>

            {mode === 'manual' && (
                <input
                    type="text"
                    value={manualValue}
                    onChange={(e) => onManualChange(e.target.value)}
                    placeholder="e.g. 4+1 or 2+2+1"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
            )}

            <p className="text-xs text-gray-500">
                Automatic options are generated using blocks of 2, 3, and 4 hours.
                The value 1 can only be used in manual input.
            </p>
        </div>
    );
}