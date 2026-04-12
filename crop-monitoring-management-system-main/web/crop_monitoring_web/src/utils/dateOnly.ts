const MONTH_NUMBER_BY_NAME: Record<string, number> = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12,
}

function padDatePart(value: number): string {
    return String(value).padStart(2, '0')
}

function buildNormalizedDate(year: number, month: number, day: number): string | null {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
        return null
    }

    const candidate = new Date(year, month - 1, day)
    if (
        candidate.getFullYear() !== year ||
        candidate.getMonth() !== month - 1 ||
        candidate.getDate() !== day
    ) {
        return null
    }

    return `${year}-${padDatePart(month)}-${padDatePart(day)}`
}

function getMonthNumber(token?: string): number | null {
    if (!token) return null
    return MONTH_NUMBER_BY_NAME[token.trim().toLowerCase()] ?? null
}

export function normalizeDateOnlyValue(value: unknown): string | null {
    const normalized = String(value ?? '').trim().replace(/\s+/g, ' ')
    if (!normalized) {
        return null
    }

    const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/)
    if (isoMatch) {
        return buildNormalizedDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]))
    }

    const dmyNumericMatch = normalized.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/)
    if (dmyNumericMatch) {
        const day = Number(dmyNumericMatch[1])
        const month = Number(dmyNumericMatch[2])
        const rawYear = dmyNumericMatch[3]
        const year = rawYear.length === 2 ? Number(`20${rawYear}`) : Number(rawYear)
        return buildNormalizedDate(year, month, day)
    }

    const dmyTextMatch = normalized.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
    if (dmyTextMatch) {
        const day = Number(dmyTextMatch[1])
        const month = getMonthNumber(dmyTextMatch[2])
        const year = Number(dmyTextMatch[3])
        return month ? buildNormalizedDate(year, month, day) : null
    }

    const mdyTextMatch = normalized.match(/^([A-Za-z]+)\s+(\d{1,2})(?:,)?\s+(\d{4})$/)
    if (mdyTextMatch) {
        const month = getMonthNumber(mdyTextMatch[1])
        const day = Number(mdyTextMatch[2])
        const year = Number(mdyTextMatch[3])
        return month ? buildNormalizedDate(year, month, day) : null
    }

    const parsed = new Date(normalized)
    if (Number.isNaN(parsed.getTime())) {
        return null
    }

    return buildNormalizedDate(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate())
}

export function hasDateOnlyValue(value: unknown): boolean {
    return Boolean(normalizeDateOnlyValue(value))
}

export function formatDateOnlyLabel(
    value: unknown,
    options?: Intl.DateTimeFormatOptions
): string | null {
    const normalized = normalizeDateOnlyValue(value)
    if (!normalized) {
        return null
    }

    const [year, month, day] = normalized.split('-').map(Number)
    const displayDate = new Date(year, month - 1, day)

    return displayDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        ...options,
    })
}

export function getDateOnlyTimestamp(value: unknown): number {
    const normalized = normalizeDateOnlyValue(value)
    if (!normalized) {
        return 0
    }

    const [year, month, day] = normalized.split('-').map(Number)
    return new Date(year, month - 1, day).getTime()
}

export function addYearsToDateOnly(value: unknown, years: number): string | null {
    const normalized = normalizeDateOnlyValue(value)
    if (!normalized || !Number.isInteger(years)) {
        return null
    }

    const [year, month, day] = normalized.split('-').map(Number)
    const exact = buildNormalizedDate(year + years, month, day)
    if (exact) {
        return exact
    }

    // Keep leap-day values usable in non-leap years.
    if (month === 2 && day === 29) {
        return buildNormalizedDate(year + years, 2, 28)
    }

    return null
}

export function deriveSugarcaneExpectedHarvestDate(
    plantingDate: unknown,
    cropType?: unknown,
    explicitExpectedHarvestDate?: unknown,
    previousCuttingDate?: unknown,
    harvestDate?: unknown
): string | null {
    const explicit = normalizeDateOnlyValue(explicitExpectedHarvestDate)
    if (explicit) {
        return explicit
    }

    const normalizedCropType = String(cropType ?? '').trim().toLowerCase()
    if (normalizedCropType && normalizedCropType !== 'sugarcane') {
        return null
    }

    return (
        addYearsToDateOnly(plantingDate, 1)
        || addYearsToDateOnly(previousCuttingDate, 1)
        || normalizeDateOnlyValue(harvestDate)
    )
}
