import Papa from 'papaparse'
import type {
    ObservationEntryImportRow,
    ObservationEntryFormSubmissionInput,
    PredefinedField,
} from '@/services/database.service'
import { normalizeDateOnlyValue } from '@/utils/dateOnly'

interface CsvParseResult {
    rows: ObservationEntryImportRow[]
    warnings: string[]
    parsedRowCount: number
}

type CsvColumnKey =
    | 'field_name'
    | 'section_name'
    | 'block_id'
    | 'date_recorded'
    | 'latitude'
    | 'longitude'
    | 'gps_accuracy'
    | 'trial_number'
    | 'trial_name'
    | 'contact_person'
    | 'phone_country_code'
    | 'phone_number'
    | 'crop_class'
    | 'variety'
    | 'planting_date'
    | 'cutting_date'
    | 'expected_harvest_date'
    | 'irrigation_type'
    | 'water_source'
    | 'tamm_area'
    | 'soil_type'
    | 'soil_ph'
    | 'remarks'
    | 'block_size'

export const OBSERVATION_ENTRY_CSV_TEMPLATE_COLUMNS: CsvColumnKey[] = [
    'field_name',
    'section_name',
    'block_id',
    'date_recorded',
    'latitude',
    'longitude',
    'gps_accuracy',
    'trial_number',
    'trial_name',
    'contact_person',
    'phone_country_code',
    'phone_number',
    'crop_class',
    'variety',
    'planting_date',
    'cutting_date',
    'expected_harvest_date',
    'irrigation_type',
    'water_source',
    'tamm_area',
    'soil_type',
    'soil_ph',
    'remarks',
    'block_size',
]

const CSV_HEADER_ALIASES: Record<CsvColumnKey, string[]> = {
    field_name: ['field_name', 'field name', 'selected_field', 'selected field', 'field'],
    section_name: ['section_name', 'section name', 'section'],
    block_id: ['block_id', 'block id', 'block'],
    date_recorded: ['date_recorded', 'date recorded', 'observation date', 'date'],
    latitude: ['latitude', 'lat'],
    longitude: ['longitude', 'long', 'lng', 'lon'],
    gps_accuracy: ['gps_accuracy', 'gps accuracy', 'accuracy'],
    trial_number: ['trial_number', 'trial number'],
    trial_name: ['trial_name', 'trial name'],
    contact_person: ['contact_person', 'contact person', 'contact'],
    phone_country_code: ['phone_country_code', 'phone country code', 'country code'],
    phone_number: ['phone_number', 'phone number', 'contact number', 'phone'],
    crop_class: ['crop_class', 'crop class', 'crop_type', 'crop type'],
    variety: ['variety'],
    planting_date: ['planting_date', 'planting date'],
    cutting_date: ['cutting_date', 'cutting date'],
    expected_harvest_date: ['expected_harvest_date', 'expected harvest date', 'expected harvest'],
    irrigation_type: ['irrigation_type', 'irrigation type'],
    water_source: ['water_source', 'water source'],
    tamm_area: ['tamm_area', 'tam_area', 'tamm area', 'tam area', 'tamm area (mm)', 'tam area (mm)', 'tamm', 'tam', 'tam (mm)', 'tam mm'],
    soil_type: ['soil_type', 'soil type'],
    soil_ph: ['soil_ph', 'soil pH', 'ph', 'ph level'],
    remarks: ['remarks', 'remark', 'notes'],
    block_size: ['block_size', 'block size'],
}

function normalizeHeader(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
}

function normalizeValue(value: unknown): string {
    return String(value ?? '').trim()
}

function parseOptionalNumber(value: unknown): number | undefined {
    const normalized = normalizeValue(value)
    if (!normalized) return undefined
    const compact = normalized.replace(/\s+/g, '').replace(/[^0-9,.-]/g, '')
    if (!compact) return undefined

    let candidate = compact
    const hasComma = candidate.includes(',')
    const hasDot = candidate.includes('.')

    if (hasComma && hasDot) {
        candidate = candidate.lastIndexOf(',') > candidate.lastIndexOf('.')
            ? candidate.replace(/\./g, '').replace(/,/g, '.')
            : candidate.replace(/,/g, '')
    } else if (hasComma) {
        candidate = candidate.replace(/,/g, '.')
    }

    const parsed = Number(candidate)
    return Number.isFinite(parsed) ? parsed : undefined
}

function normalizeDate(value: unknown): string {
    return normalizeDateOnlyValue(value) || ''
}

function getMappedValue(record: Record<string, unknown>, aliases: string[]): string {
    for (const alias of aliases) {
        const matchedEntry = Object.entries(record).find(([key]) => normalizeHeader(key) === normalizeHeader(alias))
        if (matchedEntry) {
            return normalizeValue(matchedEntry[1])
        }
    }

    return ''
}

function normalizeGeoJsonGeometry(value: any): any | null {
    if (!value) return null
    if (typeof value === 'string') {
        try {
            return normalizeGeoJsonGeometry(JSON.parse(value))
        } catch {
            return null
        }
    }
    if (value.type === 'Feature') return value.geometry ?? null
    if (value.type === 'FeatureCollection') return value.features?.[0]?.geometry ?? null
    if (value.geometry) return normalizeGeoJsonGeometry(value.geometry)
    if (value.geom) return normalizeGeoJsonGeometry(value.geom)
    return value
}

function isPointInsideRing(point: [number, number], ring: number[][]): boolean {
    const [x, y] = point
    let inside = false

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi = 0, yi = 0] = ring[i] ?? []
        const [xj = 0, yj = 0] = ring[j] ?? []
        const intersects = ((yi > y) !== (yj > y))
            && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi)

        if (intersects) inside = !inside
    }

    return inside
}

function geometryContainsPoint(geometry: any, latitude?: number, longitude?: number): boolean {
    if (latitude == null || longitude == null) return false

    const normalized = normalizeGeoJsonGeometry(geometry)
    if (!normalized?.type) return false

    const point: [number, number] = [longitude, latitude]

    if (normalized.type === 'Polygon') {
        const [outerRing = [], ...holes] = normalized.coordinates ?? []
        if (!outerRing.length || !isPointInsideRing(point, outerRing)) return false
        return !holes.some((ring: number[][]) => isPointInsideRing(point, ring))
    }

    if (normalized.type === 'MultiPolygon') {
        return (normalized.coordinates ?? []).some((polygon: number[][][]) => {
            const [outerRing = [], ...holes] = polygon ?? []
            if (!outerRing.length || !isPointInsideRing(point, outerRing)) return false
            return !holes.some((ring: number[][]) => isPointInsideRing(point, ring))
        })
    }

    return false
}

function findMatchingField(
    submission: ObservationEntryFormSubmissionInput,
    predefinedFields: PredefinedField[]
): PredefinedField | undefined {
    const fieldName = normalizeValue(submission.field_name)
    if (fieldName) {
        const exact = predefinedFields.find((field) => normalizeValue(field.field_name).toLowerCase() === fieldName.toLowerCase())
        if (exact) return exact
    }

    if (submission.latitude != null && submission.longitude != null) {
        return predefinedFields.find((field) => geometryContainsPoint(field.geom, submission.latitude, submission.longitude))
    }

    return undefined
}

function isEmptySubmission(submission: ObservationEntryFormSubmissionInput): boolean {
    return !Object.values(submission).some((value) => String(value ?? '').trim().length > 0)
}

function enrichSubmissionWithBoundary(
    submission: ObservationEntryFormSubmissionInput,
    predefinedFields: PredefinedField[]
): ObservationEntryFormSubmissionInput {
    const matchedField = findMatchingField(submission, predefinedFields)
    if (!matchedField) return submission

    return {
        ...submission,
        selected_field: matchedField.field_name,
        field_name: matchedField.field_name,
        section_name: submission.section_name || matchedField.section_name,
        block_id: submission.block_id || matchedField.block_id,
        latitude: submission.latitude ?? matchedField.latitude,
        longitude: submission.longitude ?? matchedField.longitude,
        spatial_data: submission.spatial_data ?? matchedField.geom,
        crop_class: submission.crop_class || matchedField.crop_type || '',
    }
}

export function parseObservationEntryCsv(
    text: string,
    collectorId: string,
    predefinedFields: PredefinedField[]
): CsvParseResult {
    const parsed = Papa.parse<Record<string, unknown>>(text, {
        header: true,
        skipEmptyLines: 'greedy',
    })

    if (parsed.errors.length > 0) {
        throw new Error(parsed.errors[0]?.message || 'Failed to parse CSV file.')
    }

    const warnings: string[] = []
    const rows: ObservationEntryImportRow[] = []

    parsed.data.forEach((record, index) => {
        const rowNumber = index + 2

        const submission: ObservationEntryFormSubmissionInput = {
            collector_id: collectorId,
            selected_field: getMappedValue(record, CSV_HEADER_ALIASES.field_name),
            field_name: getMappedValue(record, CSV_HEADER_ALIASES.field_name),
            section_name: getMappedValue(record, CSV_HEADER_ALIASES.section_name),
            block_id: getMappedValue(record, CSV_HEADER_ALIASES.block_id),
            block_size: parseOptionalNumber(getMappedValue(record, CSV_HEADER_ALIASES.block_size)),
            latitude: parseOptionalNumber(getMappedValue(record, CSV_HEADER_ALIASES.latitude)),
            longitude: parseOptionalNumber(getMappedValue(record, CSV_HEADER_ALIASES.longitude)),
            gps_accuracy: parseOptionalNumber(getMappedValue(record, CSV_HEADER_ALIASES.gps_accuracy)),
            date_recorded: normalizeDate(getMappedValue(record, CSV_HEADER_ALIASES.date_recorded)),
            trial_number: getMappedValue(record, CSV_HEADER_ALIASES.trial_number),
            trial_name: getMappedValue(record, CSV_HEADER_ALIASES.trial_name),
            contact_person: getMappedValue(record, CSV_HEADER_ALIASES.contact_person),
            phone_country_code: getMappedValue(record, CSV_HEADER_ALIASES.phone_country_code),
            phone_number: getMappedValue(record, CSV_HEADER_ALIASES.phone_number),
            crop_class: getMappedValue(record, CSV_HEADER_ALIASES.crop_class),
            variety: getMappedValue(record, CSV_HEADER_ALIASES.variety),
            planting_date: normalizeDate(getMappedValue(record, CSV_HEADER_ALIASES.planting_date)),
            cutting_date: normalizeDate(getMappedValue(record, CSV_HEADER_ALIASES.cutting_date)),
            expected_harvest_date: normalizeDate(getMappedValue(record, CSV_HEADER_ALIASES.expected_harvest_date)),
            irrigation_type: getMappedValue(record, CSV_HEADER_ALIASES.irrigation_type),
            water_source: getMappedValue(record, CSV_HEADER_ALIASES.water_source),
            tamm_area: parseOptionalNumber(getMappedValue(record, CSV_HEADER_ALIASES.tamm_area)),
            soil_type: getMappedValue(record, CSV_HEADER_ALIASES.soil_type),
            soil_ph: parseOptionalNumber(getMappedValue(record, CSV_HEADER_ALIASES.soil_ph)),
            remarks: getMappedValue(record, CSV_HEADER_ALIASES.remarks),
        }

        if (isEmptySubmission(submission)) {
            return
        }

        const enrichedSubmission = enrichSubmissionWithBoundary(submission, predefinedFields)

        if (!enrichedSubmission.field_name) {
            warnings.push(`Row ${rowNumber} was skipped because no field boundary could be matched.`)
            return
        }

        if (!enrichedSubmission.date_recorded) {
            warnings.push(`Row ${rowNumber} was skipped because Date Recorded is missing.`)
            return
        }

        rows.push({
            rowNumber,
            submission: enrichedSubmission,
        })
    })

    return {
        rows,
        warnings,
        parsedRowCount: parsed.data.length,
    }
}

export function downloadObservationEntryCsvTemplate(): void {
    const csv = Papa.unparse({
        fields: OBSERVATION_ENTRY_CSV_TEMPLATE_COLUMNS,
        data: [],
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = url
    anchor.download = 'observation-entry-form-template.csv'
    anchor.click()

    window.URL.revokeObjectURL(url)
}
