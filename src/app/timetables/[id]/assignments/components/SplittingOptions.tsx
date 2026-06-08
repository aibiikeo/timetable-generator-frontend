"use client";

interface SplittingOptionsProps {
    options: string[];
    value: string;
    manual: boolean;
    onChange: (value: string) => void;
    onManualChange: (value: string) => void;
    onManualToggle: (manual: boolean) => void;
}

export default function SplittingOptions({
                                             options,
                                             value,
                                             manual,
                                             onChange,
                                             onManualChange,
                                             onManualToggle,
                                         }: SplittingOptionsProps) {
    return (
        <div className="space-y-2">
            <label className="mb-2 block text-sm font-medium">
                Lesson split
            </label>

            <select
                value={manual ? "manual" : value}
                onChange={(event) => {
                    if (event.target.value === "manual") {
                        onManualToggle(true);
                        return;
                    }

                    onManualToggle(false);
                    onChange(event.target.value);
                }}
                disabled={options.length === 0}
                className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
            >
                {options.length === 0 ? (
                    <option value="">No valid split</option>
                ) : (
                    options.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))
                )}

                <option value="manual">Manual</option>
            </select>

            {manual && (
                <input
                    type="text"
                    value={value}
                    onChange={(event) => onManualChange(event.target.value)}
                    placeholder="2+2+2"
                    className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                />
            )}

        </div>
    );
}
