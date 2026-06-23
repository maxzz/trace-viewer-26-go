export function withDigits(value: number, digits: number = 2): string {
    return value.toFixed(Math.max(Math.min(digits, 20), 0));
}

export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

export function formatBytes(bytes: number, digits: number = 1): string {
    const value = Math.max(0, Math.round(bytes));
    if (value < 1024) {
        return `${value} B`;
    }

    const units = ["KB", "MB", "GB", "TB"];
    let size = value / 1024;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    const rounded = size >= 100 ? Math.round(size) : Number(size.toFixed(digits));
    return `${rounded} ${units[unitIndex]}`;
}

export const toNumberWDefault1 = (string: string) => { //mostly for plural and pluralWord
    let n = parseInt(string);
    if (Number.isNaN(n)) {
        n = 1;
    }
    return n;
};

export function plural(n: number): string {
    return n === 1 ? '' : 's';
}

export function pluralWord(n: number, word: string) {
    return `${word}${n === 1 ? '' : 's'}`;
}

export function randomIntExclusive(min: number, max: number): number { // The maximum is exclusive and the minimum is inclusive
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled);
}

export function randomIntInclusive(min: number, max: number): number { // The maximum is inclusive and the minimum is inclusive
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min);
}
