import type { FullObservation } from '@/types/database.types'

export const SUGARCANE_CROP_LABEL = 'Sugarcane'

type AnalyticsObservationLike = Pick<
    FullObservation,
    'client_uuid' | 'field_name' | 'section_name' | 'block_id' | 'date_recorded' | 'created_at'
> & {
    crop_information?: Pick<NonNullable<FullObservation['crop_information']>, 'crop_type' | 'variety'>
}

export const normalizeObservationText = (value?: string | null) => (value ?? '').trim().toLowerCase()

export const normalizeObservationCropType = (value?: string | null) => {
    const normalized = (value ?? '').trim()

    if (!normalized) {
        return SUGARCANE_CROP_LABEL
    }

    return /^sugar\s*cane$/i.test(normalized) ? SUGARCANE_CROP_LABEL : normalized
}

export const isSugarcaneCropType = (value?: string | null) => {
    const normalized = (value ?? '').trim()

    if (!normalized) {
        return true
    }

    return normalizeObservationText(normalizeObservationCropType(normalized)) === normalizeObservationText(SUGARCANE_CROP_LABEL)
}

export const filterSugarcaneObservations = <T extends Pick<FullObservation, 'crop_information'>>(observations: T[]) =>
    observations.filter((observation) => isSugarcaneCropType(observation.crop_information?.crop_type))

export const getObservationDateValue = (observation: Pick<FullObservation, 'date_recorded' | 'created_at'>) =>
    observation.date_recorded || observation.created_at || ''

export const getObservationDateBucket = (value?: string | null) => {
    const normalized = (value ?? '').trim()
    return normalized ? normalized.slice(0, 10) : ''
}

export const getObservationFieldLabel = (observation: Pick<FullObservation, 'field_name'>) => {
    const normalized = (observation.field_name ?? '').trim()
    return normalized || 'Unknown field'
}

export const getObservationFieldKey = (observation: Pick<FullObservation, 'field_name' | 'section_name' | 'block_id'>) => {
    return [
        normalizeObservationText(observation.section_name),
        normalizeObservationText(observation.block_id),
        normalizeObservationText(observation.field_name),
    ].join('|')
}

const getObservationTimestamp = (observation: Pick<FullObservation, 'date_recorded' | 'created_at'>) =>
    Date.parse(getObservationDateValue(observation)) || 0

export const compareObservationsByDate = <T extends Pick<FullObservation, 'date_recorded' | 'created_at'>>(left: T, right: T) =>
    getObservationTimestamp(right) - getObservationTimestamp(left)

export const dedupeObservationsForAnalytics = <T extends AnalyticsObservationLike>(observations: T[]) => {
    const dedupedObservations = new Map<string, T>()

    observations.forEach((observation) => {
        const clientUuidKey = normalizeObservationText(observation.client_uuid)
        const dedupeKey = clientUuidKey
            ? `client:${clientUuidKey}`
            : [
                getObservationFieldKey(observation),
                normalizeObservationText(observation.crop_information?.variety),
                getObservationDateBucket(getObservationDateValue(observation)),
            ].join('|')

        const existingObservation = dedupedObservations.get(dedupeKey)

        if (!existingObservation || getObservationTimestamp(observation) >= getObservationTimestamp(existingObservation)) {
            dedupedObservations.set(dedupeKey, observation)
        }
    })

    return Array.from(dedupedObservations.values()).sort(compareObservationsByDate)
}

export const isMeaningfulStressValue = (stress?: string | null) => {
    const normalizedStress = normalizeObservationText(stress)

    if (!normalizedStress) {
        return false
    }

    return !['none', 'no', 'normal', 'optimal', 'healthy', 'n/a', 'na'].includes(normalizedStress)
}

export const toFiniteObservationNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') {
        return null
    }

    const normalizedValue = Number(value)
    return Number.isFinite(normalizedValue) ? normalizedValue : null
}

export const getAverageObservationValue = (
    observations: FullObservation[],
    selector: (observation: FullObservation) => unknown
) => {
    const numericValues = observations
        .map((observation) => toFiniteObservationNumber(selector(observation)))
        .filter((value): value is number => value !== null)

    if (numericValues.length === 0) {
        return null
    }

    return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length
}

export const getUniqueObservationTextCount = (values: Array<string | null | undefined>) => {
    return new Set(
        values
            .map((value) => (value ?? '').trim())
            .filter(Boolean)
            .map((value) => value.toLowerCase())
    ).size
}
