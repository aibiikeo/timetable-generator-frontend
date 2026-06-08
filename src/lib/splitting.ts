export function generateSplittingOptions(total: number): string[] {
    const results: string[] = [];
    const parts = [4, 3, 2];

    function backtrack(current: number[], sum: number) {
        if (sum === total) {
            results.push(current.join("+"));
            return;
        }

        if (sum > total) return;

        for (const part of parts) {
            if (
                current.length === 0 ||
                part <= current[current.length - 1]
            ) {
                backtrack([...current, part], sum + part);
            }
        }
    }

    backtrack([], 0);

    return results;
}

export function isValidSplitting(str: string): boolean {
    const parts = str.split("+").map(Number);
    return (
        parts.length > 0 &&
        parts.every((part) => [2, 3, 4].includes(part))
    );
}

export function parseSplitting(str: string): number[] {
    return str.split("+").map(Number);
}
