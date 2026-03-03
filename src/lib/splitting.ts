/**
 * Генерирует все возможные комбинации чисел 2,3,4, сумма которых равна total.
 * Возвращает массив строк вида "4+4", "3+3+2" и т.п.
 */
export function generateSplittingOptions(total: number): string[] {
    const results: string[] = [];
    const parts = [2, 3, 4];

    function backtrack(current: number[], sum: number) {
        if (sum === total) {
            results.push(current.join('+'));
            return;
        }
        if (sum > total) return;

        for (const p of parts) {
            // Чтобы избежать дубликатов (например, 2+2+4 и 2+4+2), разрешаем только неубывающие последовательности
            if (current.length === 0 || p >= current[current.length - 1]) {
                backtrack([...current, p], sum + p);
            }
        }
    }

    backtrack([], 0);

    // Добавляем опцию ручного ввода (она будет обрабатываться отдельно)
    // results.push('manual');

    return results;
}

/**
 * Проверяет, является ли строка валидным разбиением (только 2,3,4 через +)
 */
export function isValidSplitting(str: string): boolean {
    if (str === 'manual') return true;
    const parts = str.split('+').map(Number);
    return parts.every(p => [2, 3, 4].includes(p));
}

/**
 * Парсит строку разбиения в массив чисел
 */
export function parseSplitting(str: string): number[] {
    if (str === 'manual') return [];
    return str.split('+').map(Number);
}