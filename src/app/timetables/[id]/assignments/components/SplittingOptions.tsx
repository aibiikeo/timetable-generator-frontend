'use client';

import { useState } from 'react';
import {generateSplittingOptions} from "@/lib/splitting";

interface SplittingOptionsProps {
    totalHours: number;
    value: string;               // текущее выбранное значение (например, "4+4" или "manual")
    onChange: (value: string) => void;
    options?: string[];           // можно передать готовые опции, если они уже сгенерированы
}

export default function SplittingOptions({ totalHours, value, onChange, options }: SplittingOptionsProps) {
    const [manualInput, setManualInput] = useState('');
    const generatedOptions = options || generateSplittingOptions(totalHours);
    const [isManual, setIsManual] = useState(value === 'manual');

    const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setManualInput(val);
        onChange('manual'); // сохраняем признак ручного режима, но само значение будем передавать отдельно
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
                Разбиение часов
            </label>

            {generatedOptions.map(opt => (
                <label key={opt} className="flex items-center space-x-2">
                    <input
                        type="radio"
                        name="splitting"
                        value={opt}
                        checked={!isManual && value === opt}
                        onChange={() => {
                            setIsManual(false);
                            onChange(opt);
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
                    value="manual"
                    checked={isManual}
                    onChange={() => {
                        setIsManual(true);
                        onChange('manual');
                    }}
                    className="h-4 w-4 text-blue-600"
                />
                <span>Ввести вручную:</span>
            </label>

            {isManual && (
                <input
                    type="text"
                    value={manualInput}
                    onChange={handleManualChange}
                    placeholder="например, 4+4 или 2+2+2+2"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
            )}

            <p className="text-xs text-gray-500">
                Варианты генерируются из чисел 2, 3, 4. Ручной ввод должен соответствовать формату "2+3+4".
            </p>
        </div>
    );
}