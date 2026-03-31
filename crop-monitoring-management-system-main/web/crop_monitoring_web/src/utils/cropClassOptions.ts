export const MAX_SUGARCANE_RATOON = 25;

function toOrdinal(value: number): string {
    const remainder100 = value % 100;
    if (remainder100 >= 11 && remainder100 <= 13) return `${value}th`;
    if (value % 10 === 1) return `${value}st`;
    if (value % 10 === 2) return `${value}nd`;
    if (value % 10 === 3) return `${value}rd`;
    return `${value}th`;
}

export const SUGARCANE_CROP_CLASS_OPTIONS = [
    'Plant Cane',
    ...Array.from({ length: MAX_SUGARCANE_RATOON }, (_, index) => `${toOrdinal(index + 1)} Ratoon`),
];
