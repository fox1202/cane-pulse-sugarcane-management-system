import { supabase } from '@/lib/supabase'
import type {
    FertilizerApplication,
    FullObservation,
    Field,
    HerbicideApplication,
    ObservationEntryForm,
    ObservationFilters,
    SugarcaneMonitoringRecord,
} from '@/types/database.types'
import { HARDCODED_FIELDS, HARDCODED_FIELD_SHAPEFILE } from '@/data/hardcodedFieldShapefile'
import { hasDateOnlyValue, normalizeDateOnlyValue } from '@/utils/dateOnly'
import { deriveGrowthStageLabel } from '@/utils/growthStage'

const USE_HARDCODED_FIELD_REGISTRY = false
const FIELD_REGISTRY_TABLE_NAMES = ['sugarcane_field_management'] as const
const MONITORING_TABLE_NAME = FIELD_REGISTRY_TABLE_NAMES[0]

export interface PredefinedField extends Field {
    id?: string
    geom?: any
    soil_ph?: number
}

export interface CreatePredefinedFieldInput {
    field_name: string
    section_name?: string
    block_id: string
    latitude: number
    longitude: number
    geom: any
    created_by?: string
    crop_type?: string
    date_recorded?: string
}

export interface MobileObservationEntryFormFields {
    selected_field?: string
    field_id?: string
    area?: number
    block_size?: number
    spatial_data?: any
    geom_polygon?: any
    irrigation_type?: string
    water_source?: string
    tam_mm?: string
    tamm_area?: number
    soil_type?: string
    soil_ph?: number
    field_remarks?: string
    remarks?: string
    date_recorded?: string
    trial_number?: string | number
    trial_name?: string
    contact_person?: string
    phone_country_code?: string
    phone_number?: string
    crop_type?: string
    crop_class?: string
    variety?: string
    planting_date?: string
    previous_cutting_date?: string
    cutting_date?: string
    expected_harvest_date?: string
    residue_type?: string
    residue_management_method?: string
    residual_management_remarks?: string
    fertilizer_type?: string
    nutrient_application_date?: string
    application_rate?: number
    fertilizer_applications?: FertilizerApplication[]
    foliar_sampling_date?: string
    herbicide_name?: string
    weed_application_date?: string
    weed_application_rate?: number
    herbicide_applications?: HerbicideApplication[]
    pest_remarks?: string
    disease_remarks?: string
    harvest_date?: string
    yield?: number
    quality_remarks?: string
    created_at?: string
    updated_at?: string
}

export interface ObservationEntryFormSubmissionInput {
    client_uuid?: string
    collector_id?: string
    selected_field?: string
    field_id?: string
    section_name: string
    field_name: string
    block_id?: string
    area?: number
    block_size?: number
    spatial_data?: any
    geom_polygon?: any
    latitude?: number
    longitude?: number
    gps_accuracy?: number
    date_recorded?: string
    trial_number?: string | number
    trial_name?: string
    contact_person?: string
    phone_country_code?: string
    phone_number?: string
    crop_type?: string
    crop_class?: string
    variety?: string
    planting_date?: string
    previous_cutting_date?: string
    cutting_date?: string
    expected_harvest_date?: string
    irrigation_type?: string
    water_source?: string
    tam_mm?: string
    tamm_area?: number
    soil_type?: string
    soil_ph?: number
    field_remarks?: string
    stress?: string
    residue_type?: string
    residue_management_method?: string
    residual_management_remarks?: string
    fertilizer_type?: string
    nutrient_application_date?: string
    application_rate?: number
    fertilizer_applications?: FertilizerApplication[]
    foliar_sampling_date?: string
    herbicide_name?: string
    weed_application_date?: string
    weed_application_rate?: number
    herbicide_applications?: HerbicideApplication[]
    pest_remarks?: string
    disease_remarks?: string
    harvest_date?: string
    yield?: number
    harvest_method?: string
    quality_remarks?: string
    remarks?: string
}

export interface ObservationEntryImportRow {
    rowNumber: number
    submission: ObservationEntryFormSubmissionInput
}

export interface ObservationEntryBulkImportResult {
    insertedCount: number
    failureCount: number
    failures: string[]
}

export interface MobileObservationRecord extends FullObservation {
    source_table: string
    source_row_id?: string
    entry_form?: Partial<ObservationEntryForm>
    field_registry?: PredefinedField | null
    monitoring_sheet?: SugarcaneMonitoringRecord
}

const isMissingRelationError = (error: unknown): boolean =>
    /relation|does not exist|undefined table|schema cache/i.test(
        String((error as { message?: string })?.message || error)
    )

const isSugarcaneMonitoringSchemaError = (error: unknown): boolean => {
    const code = String((error as { code?: string })?.code || '')
    const message = String((error as { message?: string })?.message || error).toLowerCase()

    return [
        '42703',
        '42P01',
        'PGRST204',
    ].includes(code) ||
        message.includes('schema cache') ||
        message.includes('column') ||
        message.includes('does not exist')
}

function extractMissingSugarcaneMonitoringColumn(error: unknown): string | null {
    const message = String((error as { message?: string })?.message || error)
    const match = [
        /could not find the ['"]([^'"]+)['"] column/i,
        /column ['"]([^'"]+)['"] of relation/i,
        /column ['"]([^'"]+)['"] does not exist/i,
    ]
        .map((pattern) => message.match(pattern))
        .find(Boolean)

    return match?.[1] ?? null
}

async function persistFieldManagementMonitoringRowWithSchemaFallback(
    payload: Record<string, unknown>,
    rowId?: string | number | null
): Promise<{ data: Record<string, unknown>; droppedColumns: string[] }> {
    let currentPayload: Record<string, unknown> = { ...payload }
    const droppedColumns: string[] = []
    let lastError: unknown = null
    const attemptedSignatures = new Set<string>()

    while (Object.keys(currentPayload).length > 0) {
        const payloadSignature = JSON.stringify(Object.keys(currentPayload).sort())
        if (attemptedSignatures.has(payloadSignature)) {
            break
        }
        attemptedSignatures.add(payloadSignature)

        const query = rowId == null
            ? supabase.from(MONITORING_TABLE_NAME).insert(currentPayload)
            : supabase.from(MONITORING_TABLE_NAME).update(currentPayload).eq('id', String(rowId))

        const result = await query
            .select('*')
            .single()

        if (!result.error && result.data) {
            return {
                data: result.data as Record<string, unknown>,
                droppedColumns,
            }
        }

        lastError = result.error

        if (!isSugarcaneMonitoringSchemaError(result.error)) {
            break
        }

        const missingColumn = extractMissingSugarcaneMonitoringColumn(result.error)
        if (!missingColumn || !(missingColumn in currentPayload)) {
            break
        }

        delete currentPayload[missingColumn]
        droppedColumns.push(missingColumn)
    }

    throw lastError ?? new Error('Could not persist the field management row with the available schema.')
}

function normalizeLookupToken(value?: string | null): string {
    return (value ?? '').trim().toLowerCase()
}

function listOfMaps(value: unknown): Record<string, unknown>[] {
    if (Array.isArray(value)) {
        return value
            .filter((item) => typeof item === 'object' && item !== null)
            .map((item) => ({ ...(item as Record<string, unknown>) }))
    }

    if (typeof value === 'string' && value.trim()) {
        try {
            return listOfMaps(JSON.parse(value))
        } catch {
            return []
        }
    }

    return []
}

function normalizeFertilizerApplication(value: unknown): FertilizerApplication | null {
    const source = typeof value === 'object' && value !== null
        ? (value as Record<string, unknown>)
        : {}

    const normalized: FertilizerApplication = {}
    const loopNumber = toNullableNumber(source.loop_number)
    const fertilizerType = toNullableString(source.fertilizer_type)
    const applicationDate = toNullableDateValue(source.application_date)
    const applicationRate = toNullableNumber(source.application_rate)
    const foliarSamplingDate = toNullableDateValue(source.foliar_sampling_date)

    if (loopNumber != null) normalized.loop_number = toLoopNumber(loopNumber, 1)
    if (fertilizerType) normalized.fertilizer_type = fertilizerType
    if (applicationDate) normalized.application_date = applicationDate
    if (applicationRate != null) normalized.application_rate = applicationRate
    if (foliarSamplingDate) normalized.foliar_sampling_date = foliarSamplingDate

    return Object.keys(normalized).length > 0 ? normalized : null
}

function normalizeHerbicideApplication(value: unknown): HerbicideApplication | null {
    const source = typeof value === 'object' && value !== null
        ? (value as Record<string, unknown>)
        : {}

    const normalized: HerbicideApplication = {}
    const loopNumber = toNullableNumber(source.loop_number)
    const herbicideName = toNullableString(source.herbicide_name)
    const applicationDate = toNullableDateValue(source.application_date)
    const applicationRate = toNullableNumber(source.application_rate)

    if (loopNumber != null) normalized.loop_number = toLoopNumber(loopNumber, 1)
    if (herbicideName) normalized.herbicide_name = herbicideName
    if (applicationDate) normalized.application_date = applicationDate
    if (applicationRate != null) normalized.application_rate = applicationRate

    return Object.keys(normalized).length > 0 ? normalized : null
}

function normalizeFertilizerApplications(
    value: unknown,
    fallback?: {
        fertilizer_type?: unknown
        nutrient_application_date?: unknown
        application_rate?: unknown
        foliar_sampling_date?: unknown
    }
): FertilizerApplication[] {
    const normalized = listOfMaps(value)
        .map(normalizeFertilizerApplication)
        .filter((item): item is FertilizerApplication => item !== null)

    if (normalized.length > 0) {
        return normalized.slice(0, 10)
    }

    const single = normalizeFertilizerApplication({
        fertilizer_type: fallback?.fertilizer_type,
        application_date: fallback?.nutrient_application_date,
        application_rate: fallback?.application_rate,
        foliar_sampling_date: fallback?.foliar_sampling_date,
    })

    return single ? [single] : []
}

function normalizeHerbicideApplications(
    value: unknown,
    fallback?: {
        herbicide_name?: unknown
        weed_application_date?: unknown
        weed_application_rate?: unknown
    }
): HerbicideApplication[] {
    const normalized = listOfMaps(value)
        .map(normalizeHerbicideApplication)
        .filter((item): item is HerbicideApplication => item !== null)

    if (normalized.length > 0) {
        return normalized.slice(0, 10)
    }

    const single = normalizeHerbicideApplication({
        herbicide_name: fallback?.herbicide_name,
        application_date: fallback?.weed_application_date,
        application_rate: fallback?.weed_application_rate,
    })

    return single ? [single] : []
}

function extractFertilizerApplicationsFromColumns(row: Record<string, unknown>): FertilizerApplication[] {
    const applications: FertilizerApplication[] = []

    for (let loop = 1; loop <= 10; loop += 1) {
        const application = normalizeFertilizerApplication({
            loop_number: loop,
            fertilizer_type: row[`fertilizer_type_${loop}`],
            application_date: row[`fertilizer_application_date_${loop}`],
            application_rate: row[`fertilizer_application_rate_${loop}`],
        })

        if (application) {
            applications.push(application)
        }
    }

    return applications
}

function extractHerbicideApplicationsFromColumns(row: Record<string, unknown>): HerbicideApplication[] {
    const applications: HerbicideApplication[] = []

    for (let loop = 1; loop <= 10; loop += 1) {
        const application = normalizeHerbicideApplication({
            loop_number: loop,
            herbicide_name: row[`herbicide_name_${loop}`],
            application_date: row[`herbicide_application_date_${loop}`],
            application_rate: row[`herbicide_application_rate_${loop}`],
        })

        if (application) {
            applications.push(application)
        }
    }

    return applications
}

function buildFertilizerApplicationColumns(applications: FertilizerApplication[]): Record<string, unknown> {
    const payload: Record<string, unknown> = {}

    for (let loop = 1; loop <= 10; loop += 1) {
        const application = applications[loop - 1]
        payload[`fertilizer_type_${loop}`] = toNullableString(application?.fertilizer_type)
        payload[`fertilizer_application_date_${loop}`] = toNullableDateValue(application?.application_date)
        payload[`fertilizer_application_rate_${loop}`] = toNullableNumber(application?.application_rate)
        payload[`fertilizer_application_remarks_${loop}`] = null
    }

    return payload
}

function buildHerbicideApplicationColumns(applications: HerbicideApplication[]): Record<string, unknown> {
    const payload: Record<string, unknown> = {}

    for (let loop = 1; loop <= 10; loop += 1) {
        const application = applications[loop - 1]
        payload[`herbicide_name_${loop}`] = toNullableString(application?.herbicide_name)
        payload[`herbicide_application_date_${loop}`] = toNullableDateValue(application?.application_date)
        payload[`herbicide_application_rate_${loop}`] = toNullableNumber(application?.application_rate)
        payload[`herbicide_application_remarks_${loop}`] = null
    }

    return payload
}

function getCurrentApplicationFromList<T extends { application_date?: string }>(
    applications: T[]
): T | null {
    if (applications.length === 0) {
        return null
    }

    let best = applications[0] ?? null
    let bestDate = best ? new Date(String(best.application_date ?? '')).getTime() : Number.NaN

    for (const application of applications.slice(1)) {
        const nextDate = new Date(String(application.application_date ?? '')).getTime()

        if (!Number.isFinite(nextDate) && !Number.isFinite(bestDate)) {
            best = application
            continue
        }

        if (Number.isFinite(nextDate) && (!Number.isFinite(bestDate) || nextDate >= bestDate)) {
            best = application
            bestDate = nextDate
        }
    }

    return best
}

function extractLookupFieldCode(value?: string | null): string {
    const normalized = normalizeLookupToken(value).replace(/[^a-z0-9]+/g, ' ')
    const matches = normalized.match(/[a-z]+\d+[a-z0-9]*/g)
    return matches?.[matches.length - 1] ?? ''
}

function hasActiveFilterValue(value?: string | null): value is string {
    const normalized = normalizeLookupToken(value)
    return normalized.length > 0 && normalized !== 'all'
}

function buildFieldLookupKey(fieldName?: string | null, sectionName?: string | null, blockId?: string | null): string {
    return [normalizeLookupToken(fieldName), normalizeLookupToken(sectionName), normalizeLookupToken(blockId)].join('|')
}

function buildFieldLookupMaps(fields: PredefinedField[]) {
    const byIdentity = new Map<string, PredefinedField>()
    const bySection = new Map<string, PredefinedField>()
    const byName = new Map<string, PredefinedField>()
    const byBlock = new Map<string, PredefinedField>()
    const byCode = new Map<string, PredefinedField[]>()

    fields.forEach((field) => {
        const identityKey = buildFieldLookupKey(field.field_name, field.section_name, field.block_id)
        const sectionKey = [normalizeLookupToken(field.field_name), normalizeLookupToken(field.section_name)].join('|')
        const nameKey = normalizeLookupToken(field.field_name)
        const blockKey = normalizeLookupToken(field.block_id)

        if (!byIdentity.has(identityKey)) {
            byIdentity.set(identityKey, field)
        }

        if (sectionKey !== '|' && !bySection.has(sectionKey)) {
            bySection.set(sectionKey, field)
        }

        if (nameKey && !byName.has(nameKey)) {
            byName.set(nameKey, field)
        }

        if (blockKey && !byBlock.has(blockKey)) {
            byBlock.set(blockKey, field)
        }

        ;[extractLookupFieldCode(field.field_name), extractLookupFieldCode(field.block_id)].forEach((codeKey) => {
            if (!codeKey) return
            const group = byCode.get(codeKey) ?? []
            if (!group.includes(field)) {
                group.push(field)
            }
            byCode.set(codeKey, group)
        })
    })

    return { byIdentity, bySection, byName, byBlock, byCode }
}

function resolveLinkedFieldRegistry(
    row: {
        field_name?: string | null
        field_id?: string | null
        selected_field?: string | null
        section_name?: string | null
        block_id?: string | null
    },
    lookups: ReturnType<typeof buildFieldLookupMaps>
): PredefinedField | null {
    const seenCandidateNames = new Set<string>()
    const candidateNames = [row.selected_field, row.field_name, row.field_id].filter((value): value is string => {
        const normalized = normalizeLookupToken(value)
        if (!normalized || seenCandidateNames.has(normalized)) {
            return false
        }

        seenCandidateNames.add(normalized)
        return true
    })

    for (const name of candidateNames) {
        const identityMatch = lookups.byIdentity.get(buildFieldLookupKey(name, row.section_name, row.block_id))
        if (identityMatch) {
            return identityMatch
        }
    }

    for (const name of candidateNames) {
        const sectionMatch = lookups.bySection.get([normalizeLookupToken(name), normalizeLookupToken(row.section_name)].join('|'))
        if (sectionMatch) {
            return sectionMatch
        }
    }

    for (const name of candidateNames) {
        const nameMatch = lookups.byName.get(normalizeLookupToken(name))
        if (nameMatch) {
            return nameMatch
        }
    }

    const blockMatch = lookups.byBlock.get(normalizeLookupToken(row.block_id))
    if (blockMatch) {
        return blockMatch
    }

    const codeCandidates = [
        extractLookupFieldCode(row.field_name),
        extractLookupFieldCode(row.field_id),
        extractLookupFieldCode(row.selected_field),
        extractLookupFieldCode(row.block_id),
    ].filter(Boolean)

    for (const code of codeCandidates) {
        const codeMatches = lookups.byCode.get(code) ?? []
        if (codeMatches.length === 1) {
            return codeMatches[0]
        }
    }

    return null
}

function hasMeaningfulCoordinate(value?: number | null): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value !== 0
}

function preferRegistryCoordinate(
    currentValue?: number | null,
    registryValue?: number | null
): number | undefined {
    if (hasMeaningfulCoordinate(currentValue)) return currentValue
    if (hasMeaningfulCoordinate(registryValue)) return registryValue
    if (typeof currentValue === 'number' && Number.isFinite(currentValue)) return currentValue
    if (typeof registryValue === 'number' && Number.isFinite(registryValue)) return registryValue
    return undefined
}

function toNullableString(value: unknown): string | null {
    if (typeof value !== 'string') return value == null ? null : String(value)
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
}

function toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null

    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null
    }

    const compact = String(value).trim().replace(/\s+/g, '').replace(/[^0-9,.-]/g, '')
    if (!compact) return null

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
    return Number.isFinite(parsed) ? parsed : null
}

function firstNonEmptyString(...values: unknown[]): string | undefined {
    for (const value of values) {
        const normalized = toNullableString(value)
        if (normalized) {
            return normalized
        }
    }

    return undefined
}

function firstNumericValue(...values: unknown[]): number | undefined {
    for (const value of values) {
        const normalized = toNullableNumber(value)
        if (normalized !== null) {
            return normalized
        }
    }

    return undefined
}

function normalizeRecordedDateValue(value: unknown): string | null {
    return normalizeDateOnlyValue(value)
}

function toNullableDateValue(value: unknown): string | null {
    return normalizeDateOnlyValue(value)
}

function hasUsableRecordedDate(value: unknown): boolean {
    return hasDateOnlyValue(value)
}

function toLoopNumber(value: unknown, fallback: number): number {
    const numeric = toNullableNumber(value)
    if (numeric == null || !Number.isFinite(numeric) || numeric <= 0) {
        return fallback
    }

    return Math.max(1, Math.round(numeric))
}

function normalizeFieldGeometry(value: unknown): Record<string, unknown> | null {
    if (!value) return null

    if (typeof value === 'string') {
        try {
            return normalizeFieldGeometry(JSON.parse(value))
        } catch {
            return null
        }
    }

    if (typeof value !== 'object') {
        return null
    }

    const source = value as Record<string, unknown>

    if (typeof source.type === 'string') {
        if (source.type === 'Feature') return normalizeFieldGeometry(source.geometry)
        if (source.type === 'FeatureCollection') {
            const [firstFeature] = Array.isArray(source.features) ? source.features : []
            return normalizeFieldGeometry(firstFeature)
        }

        return source
    }

    return normalizeFieldGeometry(
        source.geometry
        ?? source.geom
        ?? source.geom_polygon
        ?? source.spatial_data
        ?? null
    )
}

function deriveFieldCoordinatesFromGeometry(
    geometryValue: unknown
): { latitude: number; longitude: number } | null {
    const geometry = normalizeFieldGeometry(geometryValue)
    if (!geometry) return null

    if (geometry.type === 'Point' && Array.isArray(geometry.coordinates)) {
        const [longitude, latitude] = geometry.coordinates
        if (typeof latitude === 'number' && typeof longitude === 'number') {
            return { latitude, longitude }
        }

        return null
    }

    const coordinatesSource = geometry.coordinates
    const coordinates = geometry.type === 'Polygon' && Array.isArray(coordinatesSource)
        ? coordinatesSource[0]
        : geometry.type === 'MultiPolygon' && Array.isArray(coordinatesSource)
            ? Array.isArray(coordinatesSource[0]) ? coordinatesSource[0][0] : null
            : null

    if (!Array.isArray(coordinates) || coordinates.length === 0) {
        return null
    }

    const totals = coordinates.reduce(
        (acc, point) => {
            const [longitude, latitude] = Array.isArray(point) ? point : []
            if (typeof latitude === 'number' && typeof longitude === 'number') {
                acc.latitude += latitude
                acc.longitude += longitude
                acc.count += 1
            }

            return acc
        },
        { latitude: 0, longitude: 0, count: 0 }
    )

    if (totals.count === 0) {
        return null
    }

    return {
        latitude: totals.latitude / totals.count,
        longitude: totals.longitude / totals.count,
    }
}

function mapPredefinedFieldRow(row: Record<string, unknown>): PredefinedField {
    const geometry = row.geom ?? row.geom_polygon ?? row.geometry ?? null
    const derivedCoordinates = deriveFieldCoordinatesFromGeometry(geometry)

    return {
        id: toNullableString(row.id) ?? undefined,
        field_name: firstNonEmptyString(row.field_name, row.Trial, row.trial) ?? '',
        section_name: firstNonEmptyString(row.section_name, row.section_name_id, row.section) ?? '',
        block_id: firstNonEmptyString(row.block_id) ?? '',
        area: toNullableNumber(row.area) ?? undefined,
        latitude: toNullableNumber(row.latitude) ?? derivedCoordinates?.latitude ?? 0,
        longitude: toNullableNumber(row.longitude) ?? derivedCoordinates?.longitude ?? 0,
        irrigation_type: toNullableString(row.irrigation_type) ?? undefined,
        water_source: toNullableString(row.water_source) ?? undefined,
        tam_mm: firstNonEmptyString(row.tam_mm, row.tam, row.TAM) ?? undefined,
        tamm_area: toNullableNumber(row.tamm_area ?? row.tam_area) ?? undefined,
        soil_type: toNullableString(row.soil_type) ?? undefined,
        soil_ph: firstNumericValue(row.soil_ph, row.ph, row.pH) ?? undefined,
        created_at: toNullableString(row.created_at) ?? undefined,
        created_by: toNullableString(row.created_by) ?? undefined,
        date_recorded: toNullableString(row.date_recorded) ?? undefined,
        crop_type: toNullableString(row.crop_type) ?? undefined,
        is_synced: typeof row.is_synced === 'boolean' ? row.is_synced : undefined,
        local_updated_at: toNullableString(row.local_updated_at) ?? undefined,
        updated_at: toNullableString(row.updated_at) ?? undefined,
        geom: geometry,
        observation_count: toNullableNumber(row.observation_count) ?? 0,
    }
}

function sortPredefinedFields(fields: PredefinedField[]): PredefinedField[] {
    return [...fields].sort((left, right) => {
        const byFieldName = left.field_name.localeCompare(right.field_name, undefined, {
            numeric: true,
            sensitivity: 'base',
        })

        if (byFieldName !== 0) {
            return byFieldName
        }

        return left.block_id.localeCompare(right.block_id, undefined, {
            numeric: true,
            sensitivity: 'base',
        })
    })
}

function buildFieldRegistryInsertPayload(
    tableName: (typeof FIELD_REGISTRY_TABLE_NAMES)[number],
    payload: Record<string, unknown>
): Record<string, unknown> {
    if (tableName === 'sugarcane_field_management') {
        return {
            Trial: toNullableString(payload.field_name),
            block_id: toNullableString(payload.block_id),
            latitude: toNullableNumber(payload.latitude),
            longitude: toNullableNumber(payload.longitude),
            geom_polygon: payload.geom ?? null,
            crop_type: toNullableString(payload.crop_type),
            date_recorded: toNullableDateValue(payload.date_recorded),
            created_at: new Date().toISOString(),
        }
    }

    return payload
}

async function fetchFieldRegistryRowsWithFallback(): Promise<{
    fields: PredefinedField[]
    tableName: (typeof FIELD_REGISTRY_TABLE_NAMES)[number] | null
}> {
    for (const tableName of FIELD_REGISTRY_TABLE_NAMES) {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')

        if (error) {
            if (isMissingRelationError(error)) {
                continue
            }

            throw error
        }

        return {
            fields: sortPredefinedFields((data ?? []).map((row) => mapPredefinedFieldRow(row as Record<string, unknown>))),
            tableName,
        }
    }

    return {
        fields: [],
        tableName: null,
    }
}

async function createFieldRegistryRowWithFallback(
    payload: Record<string, unknown>
): Promise<PredefinedField> {
    for (const tableName of FIELD_REGISTRY_TABLE_NAMES) {
        const { data, error } = await supabase
            .from(tableName)
            .insert(buildFieldRegistryInsertPayload(tableName, payload))
            .select('*')
            .single()

        if (error) {
            if (isMissingRelationError(error)) {
                continue
            }

            throw error
        }

        return mapPredefinedFieldRow(data as Record<string, unknown>)
    }

    throw new Error('The field registry table is not available, so new fields cannot be created yet.')
}

function getHardcodedPredefinedFields(): PredefinedField[] {
    return HARDCODED_FIELDS.map((field, idx) => ({
        ...field,
        id: `hardcoded-${idx}`,
        geom: HARDCODED_FIELD_SHAPEFILE.features[idx]?.geometry,
        observation_count: field.observation_count ?? 0,
    }))
}

function applyRegistryFieldToSubmission(
    submission: ObservationEntryFormSubmissionInput,
    linkedField: PredefinedField
): ObservationEntryFormSubmissionInput {
    return {
        ...submission,
        selected_field: linkedField.field_name || submission.selected_field || submission.field_name,
        field_name: linkedField.field_name || submission.field_name,
        section_name: linkedField.section_name || submission.section_name,
        block_id: linkedField.block_id || submission.block_id,
        latitude: preferRegistryCoordinate(submission.latitude, linkedField.latitude),
        longitude: preferRegistryCoordinate(submission.longitude, linkedField.longitude),
        spatial_data: submission.spatial_data ?? linkedField.geom,
        crop_class: submission.crop_class || linkedField.crop_type || '',
    }
}

async function resolveObservationEntrySubmission(
    submission: ObservationEntryFormSubmissionInput,
    predefinedFields?: PredefinedField[]
): Promise<{
    submission: ObservationEntryFormSubmissionInput
    linkedField: PredefinedField | null
}> {
    const registryFields = predefinedFields ?? await fetchPredefinedFields().catch(() => [] as PredefinedField[])
    if (registryFields.length === 0) {
        return { submission, linkedField: null }
    }

    const linkedField = resolveLinkedFieldRegistry(
        {
            field_name: submission.field_name,
            field_id: submission.field_id,
            selected_field: submission.selected_field,
            section_name: submission.section_name,
            block_id: submission.block_id,
        },
        buildFieldLookupMaps(registryFields)
    )

    if (!linkedField) {
        return { submission, linkedField: null }
    }

    return {
        submission: applyRegistryFieldToSubmission(submission, linkedField),
        linkedField,
    }
}

function normalizeSugarcaneMonitoringRow(row: Record<string, unknown>): SugarcaneMonitoringRecord {
    const fieldName = firstNonEmptyString(row.field_name, row.field_id, row.Trial, row.trial) ?? ''
    const recordedDate = normalizeRecordedDateValue(row.date_recorded) || ''
    const previousCutting = toNullableDateValue(
        row.previous_cutting ?? row.previous_cutting_date ?? row.cutting_date
    ) ?? undefined
    const nutrientApplicationDate = toNullableDateValue(
        row.nutrient_application_date ?? row.fertilizer_application_date ?? row.application_date
    ) ?? undefined
    const weedApplicationDate = toNullableDateValue(row.weed_application_date) ?? undefined
    const harvestDate = toNullableDateValue(row.harvest_date ?? row.actual_cutting_date) ?? undefined
    const geometry = row.geom_polygon ?? row.geom ?? row.geometry ?? row.spatial_data ?? undefined
    const derivedCoordinates = deriveFieldCoordinatesFromGeometry(geometry)
    const fertilizerApplications = normalizeFertilizerApplications(row.fertilizer_applications ?? extractFertilizerApplicationsFromColumns(row), {
        fertilizer_type: row.fertilizer_type,
        nutrient_application_date: nutrientApplicationDate,
        application_rate: row.application_rate,
        foliar_sampling_date: row.foliar_sampling_date,
    })
    const herbicideApplications = normalizeHerbicideApplications(row.herbicide_applications ?? extractHerbicideApplicationsFromColumns(row), {
        herbicide_name: row.herbicide_name ?? row.weed_control,
        weed_application_date: weedApplicationDate,
        weed_application_rate: row.weed_application_rate ?? row.herbicide_application_rate,
    })
    const currentFertilizerApplication = getCurrentApplicationFromList(fertilizerApplications)
    const currentHerbicideApplication = getCurrentApplicationFromList(herbicideApplications)
    const derivedCropStage = deriveGrowthStageLabel({
        crop_type: toNullableString(row.crop_type),
        crop_class: toNullableString(row.crop_class),
        crop_stage: toNullableString(row.crop_stage),
        planting_date: toNullableDateValue(row.planting_date),
        previous_cutting: previousCutting,
        previous_cutting_date: previousCutting,
        date_recorded: recordedDate,
    })

    return {
        id: String(row.id || ''),
        field_name: fieldName,
        field_id: firstNonEmptyString(row.field_id, row.field_name, row.Trial, row.trial) ?? undefined,
        section_name: firstNonEmptyString(row.section_name, row.section, row.section_name_id) ?? undefined,
        block_id: toNullableString(row.block_id) ?? undefined,
        area: firstNumericValue(row.area) ?? undefined,
        geom_polygon: geometry,
        latitude: toNullableNumber(row.latitude) ?? derivedCoordinates?.latitude ?? undefined,
        longitude: toNullableNumber(row.longitude) ?? derivedCoordinates?.longitude ?? undefined,
        date_recorded: recordedDate,
        crop_type: toNullableString(row.crop_type) ?? undefined,
        crop_class: toNullableString(row.crop_class) ?? undefined,
        variety: toNullableString(row.variety) ?? undefined,
        ratoon_number: toNullableNumber(row.ratoon_number) ?? undefined,
        crop_stage: derivedCropStage ?? undefined,
        planting_date: toNullableDateValue(row.planting_date) ?? undefined,
        previous_cutting: previousCutting,
        previous_cutting_date: previousCutting,
        expected_harvest_date: toNullableDateValue(row.expected_harvest_date) ?? undefined,
        stress: toNullableString(row.stress) ?? undefined,
        tam_mm: firstNonEmptyString(row.tam_mm, row.tam) ?? undefined,
        soil_type: toNullableString(row.soil_type) ?? undefined,
        soil_texture: toNullableString(row.soil_texture) ?? undefined,
        soil_ph: firstNumericValue(row.soil_ph, row.ph, row.pH) ?? undefined,
        organic_matter: toNullableNumber(row.organic_matter) ?? undefined,
        drainage_class: toNullableString(row.drainage_class) ?? undefined,
        irrigation_type: toNullableString(row.irrigation_type) ?? undefined,
        irrigation_date: toNullableDateValue(row.irrigation_date) ?? undefined,
        irrigation_volume: toNullableNumber(row.irrigation_volume) ?? undefined,
        soil_moisture_percentage: toNullableNumber(row.soil_moisture_percentage) ?? undefined,
        water_source: toNullableString(row.water_source) ?? undefined,
        trial_number: toNullableString(row.trial_number) ?? undefined,
        trial_name: toNullableString(row.trial_name) ?? undefined,
        contact_person: firstNonEmptyString(row.contact_person, row.contact_person_scientist) ?? undefined,
        field_remarks: firstNonEmptyString(row.field_remarks, row.remarks) ?? undefined,
        fertilizer_type: currentFertilizerApplication?.fertilizer_type ?? toNullableString(row.fertilizer_type) ?? undefined,
        fertilizer_application_date: currentFertilizerApplication?.application_date ?? nutrientApplicationDate,
        nutrient_application_date: currentFertilizerApplication?.application_date ?? nutrientApplicationDate,
        application_rate: currentFertilizerApplication?.application_rate ?? toNullableNumber(row.application_rate) ?? undefined,
        fertilizer_applications: fertilizerApplications.length > 0 ? fertilizerApplications : undefined,
        npk_ratio: toNullableString(row.npk_ratio) ?? undefined,
        foliar_sampling_date: currentFertilizerApplication?.foliar_sampling_date ?? toNullableDateValue(row.foliar_sampling_date) ?? undefined,
        herbicide_name: currentHerbicideApplication?.herbicide_name ?? firstNonEmptyString(row.herbicide_name, row.weed_control) ?? undefined,
        weed_application_date: currentHerbicideApplication?.application_date ?? weedApplicationDate,
        weed_application_rate: currentHerbicideApplication?.application_rate ?? firstNumericValue(row.weed_application_rate, row.herbicide_application_rate) ?? undefined,
        herbicide_applications: herbicideApplications.length > 0 ? herbicideApplications : undefined,
        weed_type: toNullableString(row.weed_type) ?? undefined,
        weed_level: toNullableString(row.weed_level) ?? undefined,
        pest_type: toNullableString(row.pest_type) ?? undefined,
        pest_severity: toNullableString(row.pest_severity) ?? undefined,
        disease_type: toNullableString(row.disease_type) ?? undefined,
        disease_severity: toNullableString(row.disease_severity) ?? undefined,
        pest_remarks: firstNonEmptyString(row.pest_remarks, row.pest_control) ?? undefined,
        disease_remarks: firstNonEmptyString(row.disease_remarks, row.disease_control) ?? undefined,
        weed_control: firstNonEmptyString(row.weed_control, row.herbicide_name) ?? undefined,
        pest_control: firstNonEmptyString(row.pest_control, row.pest_remarks) ?? undefined,
        disease_control: firstNonEmptyString(row.disease_control, row.disease_remarks) ?? undefined,
        harvest_date: harvestDate,
        harvest_yield: firstNumericValue(row.harvest_yield, row.yield) ?? undefined,
        yield: firstNumericValue(row.harvest_yield, row.yield) ?? undefined,
        harvest_method: toNullableString(row.harvest_method) ?? undefined,
        quality_remarks: firstNonEmptyString(row.quality_remarks, row.cane_quality_remarks) ?? undefined,
        residue_type: toNullableString(row.residue_type) ?? undefined,
        residue_management_method: firstNonEmptyString(row.residue_management_method, row.management_method) ?? undefined,
        residual_management_remarks: firstNonEmptyString(row.residual_management_remarks, row.residue_remarks) ?? undefined,
        collector_id: toNullableString(row.collector_id) ?? undefined,
        remarks: firstNonEmptyString(row.remarks, row.field_remarks) ?? undefined,
        image_url: toNullableString(row.image_url) ?? undefined,
        well_known_text: toNullableString(row.well_known_text) ?? undefined,
        raw_values: { ...row },
        created_at: String(row.created_at || ''),
        updated_at: String(row.updated_at || row.created_at || ''),
    }
}

function mapSugarcaneMonitoringRowToObservation(row: SugarcaneMonitoringRecord): MobileObservationRecord {
    return {
        id: row.id,
        client_uuid: row.id,
        collector_id: row.collector_id || '',
        section_name: row.section_name || '',
        block_id: row.block_id || '',
        field_name: row.field_name || '',
        latitude: row.latitude ?? 0,
        longitude: row.longitude ?? 0,
        gps_accuracy: 0,
        date_recorded: row.date_recorded,
        created_at: row.created_at,
        crop_information: {
            id: row.id,
            observation_id: row.id,
            crop_type: row.crop_type || 'Sugarcane',
            ratoon_number: row.ratoon_number ?? 0,
            variety: row.variety || '',
            planting_date: row.planting_date || '',
            expected_harvest_date: row.expected_harvest_date || '',
            crop_stage: row.crop_stage || '',
        },
        crop_monitoring: {
            id: row.id,
            observation_id: row.id,
            stress: row.stress || '',
            remarks: row.remarks || '',
        },
        soil_characteristics: {
            id: row.id,
            observation_id: row.id,
            soil_type: row.soil_type || '',
            soil_texture: row.soil_texture || '',
            soil_ph: row.soil_ph ?? 0,
            organic_matter: row.organic_matter ?? 0,
            drainage_class: row.drainage_class || '',
        },
        irrigation_management: {
            id: row.id,
            observation_id: row.id,
            irrigation_type: row.irrigation_type || '',
            irrigation_date: row.irrigation_date || '',
            irrigation_volume: row.irrigation_volume ?? 0,
            soil_moisture_percentage: row.soil_moisture_percentage ?? 0,
            water_source: row.water_source || '',
        },
        nutrient_management: row.fertilizer_type || row.application_rate || row.npk_ratio
            ? {
                id: row.id,
                observation_id: row.id,
                fertilizer_type: row.fertilizer_type || '',
                application_date: row.nutrient_application_date || row.fertilizer_application_date || '',
                application_rate: row.application_rate ?? 0,
                npk_ratio: row.npk_ratio || '',
            }
            : undefined,
        crop_protection: (row.weed_type || row.pest_type || row.disease_type || row.pest_remarks || row.disease_remarks)
            ? {
                id: row.id,
                observation_id: row.id,
                weed_type: row.weed_type || '',
                weed_level: row.weed_level || '',
                pest_type: row.pest_type || '',
                pest_severity: row.pest_severity || '',
                disease_type: row.disease_type || '',
                disease_severity: row.disease_severity || '',
                remarks: row.pest_remarks || row.disease_remarks || row.remarks || '',
            }
            : undefined,
        control_methods: (row.weed_control || row.pest_control || row.disease_control || row.herbicide_name)
            ? {
                id: row.id,
                observation_id: row.id,
                weed_control: row.weed_control || row.herbicide_name || '',
                pest_control: row.pest_control || row.pest_remarks || '',
                disease_control: row.disease_control || row.disease_remarks || '',
            }
            : undefined,
        harvest: row.harvest_date || row.harvest_yield || row.yield || row.harvest_method
            ? {
                id: row.id,
                observation_id: row.id,
                harvest_date: row.harvest_date || '',
                yield: row.harvest_yield ?? row.yield ?? 0,
                harvest_method: row.harvest_method || '',
            }
            : undefined,
        residual_management: row.residue_type || row.residue_management_method
            ? {
                id: row.id,
                observation_id: row.id,
                residue_type: row.residue_type || '',
                management_method: row.residue_management_method || '',
                remarks: row.residual_management_remarks || row.remarks || '',
            }
            : undefined,
        images: row.image_url
            ? [{
                id: row.id,
                observation_id: row.id,
                image_url: row.image_url,
                taken_at: row.created_at,
                uploaded_by: row.collector_id || 'system',
            }]
            : undefined,
        source_table: MONITORING_TABLE_NAME,
        source_row_id: row.id,
        monitoring_sheet: row,
    }
}

function mapSugarcaneMonitoringRowToEntryForm(
    row: SugarcaneMonitoringRecord,
    linkedField?: PredefinedField | null
): ObservationEntryForm {
    const fertilizerApplications = normalizeFertilizerApplications(row.fertilizer_applications, {
        fertilizer_type: row.fertilizer_type,
        nutrient_application_date: row.nutrient_application_date ?? row.fertilizer_application_date,
        application_rate: row.application_rate,
        foliar_sampling_date: row.foliar_sampling_date,
    })
    const herbicideApplications = normalizeHerbicideApplications(row.herbicide_applications, {
        herbicide_name: row.herbicide_name ?? row.weed_control,
        weed_application_date: row.weed_application_date,
        weed_application_rate: row.weed_application_rate,
    })
    const currentFertilizerApplication = getCurrentApplicationFromList(fertilizerApplications)
    const currentHerbicideApplication = getCurrentApplicationFromList(herbicideApplications)

    return {
        id: row.id,
        client_uuid: row.id,
        collector_id: row.collector_id,
        selected_field: row.field_name || linkedField?.field_name || row.field_id,
        section_name: row.section_name || linkedField?.section_name || '',
        field_name: row.field_name || row.field_id || linkedField?.field_name || '',
        field_id: row.field_id || row.field_name || linkedField?.field_name || '',
        block_id: row.block_id || linkedField?.block_id || '',
        area: row.area ?? undefined,
        block_size: row.area ?? undefined,
        spatial_data: row.geom_polygon ?? linkedField?.geom ?? null,
        geom_polygon: row.geom_polygon ?? linkedField?.geom ?? null,
        latitude: preferRegistryCoordinate(row.latitude, linkedField?.latitude) ?? row.latitude,
        longitude: preferRegistryCoordinate(row.longitude, linkedField?.longitude) ?? row.longitude,
        gps_accuracy: undefined,
        date_recorded: row.date_recorded,
        trial_number: row.trial_number ?? undefined,
        trial_name: row.trial_name || '',
        contact_person: row.contact_person || '',
        phone_country_code: '',
        phone_number: '',
        crop_type: row.crop_type || 'Sugarcane',
        crop_class: row.crop_class || row.crop_type || linkedField?.crop_type || '',
        variety: row.variety || '',
        planting_date: row.planting_date || '',
        previous_cutting_date: row.previous_cutting_date || row.previous_cutting || '',
        cutting_date: row.previous_cutting_date || row.previous_cutting || '',
        expected_harvest_date: row.expected_harvest_date || '',
        irrigation_type: row.irrigation_type || '',
        water_source: row.water_source || '',
        tam_mm: row.tam_mm || '',
        tamm_area: toNullableNumber(row.tam_mm) ?? undefined,
        soil_type: row.soil_type || '',
        soil_ph: row.soil_ph ?? undefined,
        field_remarks: row.field_remarks || row.remarks || '',
        stress: row.stress || '',
        residue_type: row.residue_type || '',
        residue_management_method: row.residue_management_method || '',
        residual_management_remarks: row.residual_management_remarks || '',
        fertilizer_type: currentFertilizerApplication?.fertilizer_type || row.fertilizer_type || '',
        nutrient_application_date: currentFertilizerApplication?.application_date || row.nutrient_application_date || row.fertilizer_application_date || '',
        application_rate: currentFertilizerApplication?.application_rate ?? row.application_rate ?? undefined,
        fertilizer_applications: fertilizerApplications.length > 0 ? fertilizerApplications : undefined,
        foliar_sampling_date: currentFertilizerApplication?.foliar_sampling_date || row.foliar_sampling_date || '',
        herbicide_name: currentHerbicideApplication?.herbicide_name || row.herbicide_name || row.weed_control || '',
        weed_application_date: currentHerbicideApplication?.application_date || row.weed_application_date || '',
        weed_application_rate: currentHerbicideApplication?.application_rate ?? row.weed_application_rate ?? undefined,
        herbicide_applications: herbicideApplications.length > 0 ? herbicideApplications : undefined,
        pest_remarks: row.pest_remarks || row.pest_control || '',
        disease_remarks: row.disease_remarks || row.disease_control || '',
        harvest_date: row.harvest_date || '',
        yield: row.harvest_yield ?? row.yield ?? undefined,
        harvest_method: row.harvest_method || '',
        quality_remarks: row.quality_remarks || '',
        remarks: row.field_remarks || row.remarks || '',
        source_table: MONITORING_TABLE_NAME,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }
}

function buildSugarcaneFieldManagementPayload(submission: ObservationEntryFormSubmissionInput) {
    const fertilizerApplications = normalizeFertilizerApplications(submission.fertilizer_applications, {
        fertilizer_type: submission.fertilizer_type,
        nutrient_application_date: submission.nutrient_application_date,
        application_rate: submission.application_rate,
        foliar_sampling_date: submission.foliar_sampling_date,
    })
    const herbicideApplications = normalizeHerbicideApplications(submission.herbicide_applications, {
        herbicide_name: submission.herbicide_name,
        weed_application_date: submission.weed_application_date,
        weed_application_rate: submission.weed_application_rate,
    })
    const currentFertilizerApplication = getCurrentApplicationFromList(fertilizerApplications)
    const currentHerbicideApplication = getCurrentApplicationFromList(herbicideApplications)
    const derivedCropStage = deriveGrowthStageLabel({
        crop_type: submission.crop_type,
        crop_class: submission.crop_class,
        planting_date: submission.planting_date,
        previous_cutting_date: submission.previous_cutting_date,
        cutting_date: submission.cutting_date,
        date_recorded: submission.date_recorded,
    })

    return {
        Trial: toNullableString(submission.field_name || submission.field_id),
        field_name: toNullableString(submission.field_name || submission.field_id),
        section_name: toNullableString(submission.section_name),
        block_id: toNullableString(submission.block_id),
        collector_id: toNullableString(submission.collector_id),
        latitude: toNullableNumber(submission.latitude),
        longitude: toNullableNumber(submission.longitude),
        area: toNullableNumber(submission.area ?? submission.block_size),
        irrigation_type: toNullableString(submission.irrigation_type),
        water_source: toNullableString(submission.water_source),
        tam: toNullableNumber(submission.tam_mm ?? submission.tamm_area),
        soil_type: toNullableString(submission.soil_type),
        soil_ph: toNullableNumber(submission.soil_ph),
        remarks: toNullableString(submission.remarks || submission.field_remarks),
        date_recorded: toNullableDateValue(submission.date_recorded),
        trial_number: toNullableString(submission.trial_number),
        trial_name: toNullableString(submission.trial_name),
        contact_person_scientist: toNullableString(submission.contact_person),
        crop_type: toNullableString(submission.crop_type || submission.crop_class) || 'Sugarcane',
        crop_class: toNullableString(submission.crop_class),
        variety: toNullableString(submission.variety),
        crop_stage: toNullableString(derivedCropStage),
        stress: toNullableString(submission.stress),
        planting_date: toNullableDateValue(submission.planting_date),
        cutting_date: toNullableDateValue(submission.previous_cutting_date || submission.cutting_date),
        expected_harvest_date: toNullableDateValue(submission.expected_harvest_date),
        residue_type: toNullableString(submission.residue_type),
        management_method: toNullableString(submission.residue_management_method),
        residue_remarks: toNullableString(submission.residual_management_remarks),
        field_remarks: toNullableString(submission.field_remarks),
        fertilizer_type: toNullableString(currentFertilizerApplication?.fertilizer_type ?? submission.fertilizer_type),
        application_date: toNullableDateValue(currentFertilizerApplication?.application_date ?? submission.nutrient_application_date),
        application_rate: toNullableNumber(currentFertilizerApplication?.application_rate ?? submission.application_rate),
        foliar_sampling_date: toNullableDateValue(currentFertilizerApplication?.foliar_sampling_date ?? submission.foliar_sampling_date),
        herbicide_name: toNullableString(currentHerbicideApplication?.herbicide_name ?? submission.herbicide_name),
        weed_application_date: toNullableDateValue(currentHerbicideApplication?.application_date ?? submission.weed_application_date),
        weed_application_rate: toNullableNumber(currentHerbicideApplication?.application_rate ?? submission.weed_application_rate),
        pest_control: toNullableString(submission.pest_remarks),
        disease_control: toNullableString(submission.disease_remarks),
        harvest_date: toNullableDateValue(submission.harvest_date),
        yield: toNullableNumber(submission.yield),
        harvest_method: toNullableString(submission.harvest_method),
        cane_quality_remarks: toNullableString(submission.quality_remarks),
        geom_polygon: submission.geom_polygon ?? submission.spatial_data ?? null,
        ...buildFertilizerApplicationColumns(fertilizerApplications),
        ...buildHerbicideApplicationColumns(herbicideApplications),
    }
}

function normalizeComparableText(value: unknown): string | null {
    const normalized = toNullableString(value)
    return normalized ? normalized.replace(/\s+/g, ' ').trim().toLowerCase() : null
}

function normalizeComparableNumber(value: unknown, precision: number = 6): number | null {
    const normalized = toNullableNumber(value)
    return normalized == null ? null : Number(normalized.toFixed(precision))
}

function sortSerializableValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map((item) => sortSerializableValue(item))
    }

    if (value && typeof value === 'object') {
        return Object.keys(value as Record<string, unknown>)
            .sort((left, right) => left.localeCompare(right))
            .reduce<Record<string, unknown>>((acc, key) => {
                const normalized = sortSerializableValue((value as Record<string, unknown>)[key])
                if (normalized !== undefined) {
                    acc[key] = normalized
                }
                return acc
            }, {})
    }

    return value
}

function buildComparableFertilizerApplications(
    value: unknown,
    fallback?: {
        fertilizer_type?: unknown
        nutrient_application_date?: unknown
        application_rate?: unknown
        foliar_sampling_date?: unknown
    }
) {
    return normalizeFertilizerApplications(value, fallback)
        .map((application) => ({
            loop_number: toLoopNumber(application.loop_number, 1),
            fertilizer_type: normalizeComparableText(application.fertilizer_type),
            application_date: toNullableDateValue(application.application_date),
            application_rate: normalizeComparableNumber(application.application_rate),
            foliar_sampling_date: toNullableDateValue(application.foliar_sampling_date),
        }))
        .sort((left, right) => (
            left.loop_number - right.loop_number
            || String(left.application_date ?? '').localeCompare(String(right.application_date ?? ''))
            || String(left.fertilizer_type ?? '').localeCompare(String(right.fertilizer_type ?? ''))
        ))
}

function buildComparableHerbicideApplications(
    value: unknown,
    fallback?: {
        herbicide_name?: unknown
        weed_application_date?: unknown
        weed_application_rate?: unknown
    }
) {
    return normalizeHerbicideApplications(value, fallback)
        .map((application) => ({
            loop_number: toLoopNumber(application.loop_number, 1),
            herbicide_name: normalizeComparableText(application.herbicide_name),
            application_date: toNullableDateValue(application.application_date),
            application_rate: normalizeComparableNumber(application.application_rate),
        }))
        .sort((left, right) => (
            left.loop_number - right.loop_number
            || String(left.application_date ?? '').localeCompare(String(right.application_date ?? ''))
            || String(left.herbicide_name ?? '').localeCompare(String(right.herbicide_name ?? ''))
        ))
}

function buildSubmissionDuplicateFingerprint(submission: ObservationEntryFormSubmissionInput): string {
    const fingerprint = {
        field_name: normalizeComparableText(firstNonEmptyString(submission.field_name, submission.field_id, submission.selected_field)),
        section_name: normalizeComparableText(submission.section_name),
        block_id: normalizeComparableText(submission.block_id),
        area: normalizeComparableNumber(submission.area ?? submission.block_size, 4),
        date_recorded: toNullableDateValue(submission.date_recorded),
        trial_number: normalizeComparableText(submission.trial_number),
        trial_name: normalizeComparableText(submission.trial_name),
        contact_person: normalizeComparableText(submission.contact_person),
        crop_type: normalizeComparableText(submission.crop_type),
        crop_class: normalizeComparableText(submission.crop_class),
        variety: normalizeComparableText(submission.variety),
        planting_date: toNullableDateValue(submission.planting_date),
        previous_cutting_date: toNullableDateValue(submission.previous_cutting_date ?? submission.cutting_date),
        expected_harvest_date: toNullableDateValue(submission.expected_harvest_date),
        irrigation_type: normalizeComparableText(submission.irrigation_type),
        water_source: normalizeComparableText(submission.water_source),
        tam: normalizeComparableNumber(submission.tam_mm ?? submission.tamm_area, 4),
        soil_type: normalizeComparableText(submission.soil_type),
        soil_ph: normalizeComparableNumber(submission.soil_ph, 4),
        field_remarks: normalizeComparableText(firstNonEmptyString(submission.field_remarks, submission.remarks)),
        stress: normalizeComparableText(submission.stress),
        residue_type: normalizeComparableText(submission.residue_type),
        residue_management_method: normalizeComparableText(submission.residue_management_method),
        residual_management_remarks: normalizeComparableText(submission.residual_management_remarks),
        fertilizer_applications: buildComparableFertilizerApplications(submission.fertilizer_applications, {
            fertilizer_type: submission.fertilizer_type,
            nutrient_application_date: submission.nutrient_application_date,
            application_rate: submission.application_rate,
            foliar_sampling_date: submission.foliar_sampling_date,
        }),
        herbicide_applications: buildComparableHerbicideApplications(submission.herbicide_applications, {
            herbicide_name: submission.herbicide_name,
            weed_application_date: submission.weed_application_date,
            weed_application_rate: submission.weed_application_rate,
        }),
        pest_remarks: normalizeComparableText(submission.pest_remarks),
        disease_remarks: normalizeComparableText(submission.disease_remarks),
        harvest_date: toNullableDateValue(submission.harvest_date),
        yield: normalizeComparableNumber(submission.yield, 4),
        harvest_method: normalizeComparableText(submission.harvest_method),
        quality_remarks: normalizeComparableText(submission.quality_remarks),
        geometry: sortSerializableValue(normalizeFieldGeometry(submission.geom_polygon ?? submission.spatial_data)),
    }

    return JSON.stringify(fingerprint)
}

function buildMonitoringRowDuplicateFingerprint(row: SugarcaneMonitoringRecord): string {
    const fingerprint = {
        field_name: normalizeComparableText(firstNonEmptyString(row.field_name, row.field_id)),
        section_name: normalizeComparableText(row.section_name),
        block_id: normalizeComparableText(row.block_id),
        area: normalizeComparableNumber(row.area, 4),
        date_recorded: toNullableDateValue(row.date_recorded),
        trial_number: normalizeComparableText(row.trial_number),
        trial_name: normalizeComparableText(row.trial_name),
        contact_person: normalizeComparableText(row.contact_person),
        crop_type: normalizeComparableText(row.crop_type),
        crop_class: normalizeComparableText(row.crop_class),
        variety: normalizeComparableText(row.variety),
        planting_date: toNullableDateValue(row.planting_date),
        previous_cutting_date: toNullableDateValue(row.previous_cutting_date ?? row.previous_cutting),
        expected_harvest_date: toNullableDateValue(row.expected_harvest_date),
        irrigation_type: normalizeComparableText(row.irrigation_type),
        water_source: normalizeComparableText(row.water_source),
        tam: normalizeComparableNumber(row.tam_mm, 4),
        soil_type: normalizeComparableText(row.soil_type),
        soil_ph: normalizeComparableNumber(row.soil_ph, 4),
        field_remarks: normalizeComparableText(firstNonEmptyString(row.field_remarks, row.remarks)),
        stress: normalizeComparableText(row.stress),
        residue_type: normalizeComparableText(row.residue_type),
        residue_management_method: normalizeComparableText(row.residue_management_method),
        residual_management_remarks: normalizeComparableText(row.residual_management_remarks),
        fertilizer_applications: buildComparableFertilizerApplications(row.fertilizer_applications, {
            fertilizer_type: row.fertilizer_type,
            nutrient_application_date: row.nutrient_application_date ?? row.fertilizer_application_date,
            application_rate: row.application_rate,
            foliar_sampling_date: row.foliar_sampling_date,
        }),
        herbicide_applications: buildComparableHerbicideApplications(row.herbicide_applications, {
            herbicide_name: row.herbicide_name,
            weed_application_date: row.weed_application_date,
            weed_application_rate: row.weed_application_rate,
        }),
        pest_remarks: normalizeComparableText(row.pest_remarks),
        disease_remarks: normalizeComparableText(row.disease_remarks),
        harvest_date: toNullableDateValue(row.harvest_date),
        yield: normalizeComparableNumber(row.harvest_yield ?? row.yield, 4),
        harvest_method: normalizeComparableText(row.harvest_method),
        quality_remarks: normalizeComparableText(row.quality_remarks),
        geometry: sortSerializableValue(normalizeFieldGeometry(row.geom_polygon)),
    }

    return JSON.stringify(fingerprint)
}

async function findDuplicateFieldManagementSubmission(
    submission: ObservationEntryFormSubmissionInput,
    currentRowId?: string | number | null
): Promise<{ kind: 'duplicate' | 'unchanged'; row: SugarcaneMonitoringRecord } | null> {
    const recordedDate = toNullableDateValue(submission.date_recorded)
    const query = supabase
        .from(MONITORING_TABLE_NAME)
        .select('*')
    const { data, error } = recordedDate
        ? await query.eq('date_recorded', recordedDate)
        : await query.is('date_recorded', null)

    if (error) {
        if (isMissingRelationError(error)) {
            return null
        }

        throw error
    }

    const fingerprint = buildSubmissionDuplicateFingerprint(submission)
    const matches = (data ?? [])
        .map((row) => normalizeSugarcaneMonitoringRow(row as Record<string, unknown>))
        .filter((row) => buildMonitoringRowDuplicateFingerprint(row) === fingerprint)

    const otherMatch = matches.find((row) => String(row.id) !== String(currentRowId ?? ''))
    if (otherMatch) {
        return { kind: 'duplicate', row: otherMatch }
    }

    const currentMatch = matches.find((row) => String(row.id) === String(currentRowId ?? ''))
    if (currentMatch) {
        return { kind: 'unchanged', row: currentMatch }
    }

    return null
}

export async function fetchPredefinedFields(): Promise<PredefinedField[]> {
    if (USE_HARDCODED_FIELD_REGISTRY) {
        return getHardcodedPredefinedFields()
    }

    const { fields: liveFields } = await fetchFieldRegistryRowsWithFallback()
    return liveFields
}

export async function createPredefinedField(input: CreatePredefinedFieldInput): Promise<PredefinedField> {
    const payload = {
        field_name: toNullableString(input.field_name),
        section_name: toNullableString(input.section_name) ?? '',
        block_id: toNullableString(input.block_id),
        latitude: toNullableNumber(input.latitude),
        longitude: toNullableNumber(input.longitude),
        geom: input.geom ?? null,
        created_by: toNullableString(input.created_by),
        crop_type: toNullableString(input.crop_type),
        date_recorded: toNullableDateValue(input.date_recorded),
    }

    return createFieldRegistryRowWithFallback(payload)
}

export async function fetchLivePredefinedFields(): Promise<PredefinedField[]> {
    const { fields } = await fetchFieldRegistryRowsWithFallback()
    return fields
}

export function getPredefinedFieldByName(
    fields: PredefinedField[],
    fieldName?: string | null
): PredefinedField | null {
    if (!fieldName) return null
    return fields.find((field) => field.field_name === fieldName) ?? null
}

export async function fetchSugarcaneMonitoringRows(
    filters?: ObservationFilters,
    options?: { includeUndated?: boolean }
): Promise<SugarcaneMonitoringRecord[]> {
    let query = supabase
        .from(MONITORING_TABLE_NAME)
        .select('*')

    if (!options?.includeUndated) {
        query = query.not('date_recorded', 'is', null)
    }

    query = query.order('date_recorded', { ascending: false, nullsFirst: false })

    const { data, error } = await query

    if (error) {
        if (isMissingRelationError(error)) {
            return []
        }
        throw error
    }

    let normalizedRows = (data ?? [])
        .map((row) => normalizeSugarcaneMonitoringRow(row as Record<string, unknown>))

    if (!options?.includeUndated) {
        normalizedRows = normalizedRows.filter((row) => hasUsableRecordedDate(row.date_recorded))
    }

    if (hasActiveFilterValue(filters?.cropType)) {
        const expected = normalizeLookupToken(filters.cropType)
        normalizedRows = normalizedRows.filter((row) => normalizeLookupToken(row.crop_type) === expected)
    }
    if (hasActiveFilterValue(filters?.variety)) {
        const expected = normalizeLookupToken(filters.variety)
        normalizedRows = normalizedRows.filter((row) => normalizeLookupToken(row.variety) === expected)
    }
    if (hasActiveFilterValue(filters?.fieldName)) {
        const expected = normalizeLookupToken(filters.fieldName)
        normalizedRows = normalizedRows.filter((row) => normalizeLookupToken(row.field_name) === expected)
    }
    if (hasActiveFilterValue(filters?.section)) {
        const expected = normalizeLookupToken(filters.section)
        normalizedRows = normalizedRows.filter((row) => normalizeLookupToken(row.section_name) === expected)
    }
    if (hasActiveFilterValue(filters?.block)) {
        const expected = normalizeLookupToken(filters.block)
        normalizedRows = normalizedRows.filter((row) => normalizeLookupToken(row.block_id) === expected)
    }
    if (filters?.startDate) {
        normalizedRows = normalizedRows.filter((row) => row.date_recorded >= filters.startDate!)
    }
    if (filters?.endDate) {
        normalizedRows = normalizedRows.filter((row) => row.date_recorded <= filters.endDate!)
    }
    if (hasActiveFilterValue(filters?.stressLevel)) {
        const expected = normalizeLookupToken(filters.stressLevel)
        normalizedRows = normalizedRows.filter((row) => normalizeLookupToken(row.stress) === expected)
    }

    return normalizedRows
}

export async function fetchSugarcaneMonitoringObservations(
    filters?: ObservationFilters,
    options?: { includeUndated?: boolean }
): Promise<MobileObservationRecord[]> {
    const rows = await fetchSugarcaneMonitoringRows(filters, options)
    if (rows.length === 0) {
        return []
    }

    const registryFields = await fetchPredefinedFields().catch(() => [] as PredefinedField[])
    const lookups = registryFields.length > 0 ? buildFieldLookupMaps(registryFields) : null

    return rows.map((row) => {
        const observation = mapSugarcaneMonitoringRowToObservation(row)
        const linkedField = lookups
            ? resolveLinkedFieldRegistry(
                {
                    field_name: row.field_name,
                    field_id: row.field_id,
                    selected_field: row.field_name || row.field_id,
                    section_name: row.section_name,
                    block_id: row.block_id,
                },
                lookups
            )
            : null

        return {
            ...observation,
            field_registry: linkedField,
            entry_form: mapSugarcaneMonitoringRowToEntryForm(row, linkedField),
        }
    })
}

export async function fetchMobileObservationRecords(
    options?: { includeUndated?: boolean }
): Promise<MobileObservationRecord[]> {
    return fetchSugarcaneMonitoringObservations(undefined, options)
}

export async function fetchObservations(_filters?: ObservationFilters): Promise<FullObservation[]> {
    return []
}

export async function fetchObservationById(_id: string): Promise<FullObservation | null> {
    return null
}

export async function deleteObservation(_id: string): Promise<void> {
    throw new Error('Deleting legacy observations is not connected in this web build.')
}

export async function deleteMobileObservationRecord(_record: FullObservation | MobileObservationRecord): Promise<void> {
    throw new Error('Deleting monitoring records is not connected in this web build.')
}

export async function deleteAllObservations(): Promise<{ deletedCount: number }> {
    throw new Error('Bulk deletion is not connected in this web build.')
}

export async function createObservation(observation: FullObservation): Promise<FullObservation> {
    return observation
}

export async function fetchFields(): Promise<Field[]> {
    return fetchPredefinedFields()
}

export async function fetchCropTypes(): Promise<string[]> {
    const rows = await fetchSugarcaneMonitoringRows().catch(() => [] as SugarcaneMonitoringRecord[])
    const fieldRegistry = await fetchPredefinedFields().catch(() => [] as PredefinedField[])

    const cropTypes = new Set<string>()

    rows.forEach((row) => {
        const cropType = (row.crop_type ?? '').trim()
        if (cropType) cropTypes.add(cropType)
    })

    fieldRegistry.forEach((field) => {
        const cropType = (field.crop_type ?? '').trim()
        if (cropType) cropTypes.add(cropType)
    })

    return Array.from(cropTypes).sort((left, right) => left.localeCompare(right))
}

export async function fetchFieldNames(): Promise<string[]> {
    const fields = await fetchPredefinedFields()
    return Array.from(new Set(fields.map((field) => field.field_name).filter(Boolean)))
        .sort((left, right) => left.localeCompare(right))
}

export async function updateMobileObservationRecord(_record: FullObservation | MobileObservationRecord): Promise<void> {
    throw new Error('Updating legacy mobile records is not connected in this web build.')
}

export async function updateObservation(_observation: FullObservation): Promise<void> {
    throw new Error('Updating legacy observations is not connected in this web build.')
}

export async function fetchBlocks() {
    const { data, error } = await supabase
        .from('blocks')
        .select('*')

    if (error) {
        if (isMissingRelationError(error)) {
            return []
        }
        throw error
    }

    return data ?? []
}

export async function fetchAllCropInformation() {
    return []
}

export async function fetchAllCropMonitoring() {
    return []
}

export async function fetchAllSoilCharacteristics() {
    return []
}

export async function fetchAllIrrigationManagement() {
    return []
}

export async function fetchAllNutrientManagement() {
    return []
}

export async function fetchAllCropProtection() {
    return []
}

export async function fetchAllControlMethods() {
    return []
}

export async function fetchAllHarvest() {
    return []
}

export async function fetchAllResidualManagement() {
    return []
}

export async function fetchAllImages() {
    return []
}

export async function fetchAllData() {
    const { fetchStaff } = await import('@/services/staff.service')

    const [
        observations,
        blocks,
        cropInformation,
        cropMonitoring,
        soilCharacteristics,
        irrigationManagement,
        nutrientManagement,
        cropProtection,
        controlMethods,
        harvestInformation,
        residualManagement,
        observationImages,
        profiles,
    ] = await Promise.all([
        fetchObservations(),
        fetchBlocks(),
        fetchAllCropInformation(),
        fetchAllCropMonitoring(),
        fetchAllSoilCharacteristics(),
        fetchAllIrrigationManagement(),
        fetchAllNutrientManagement(),
        fetchAllCropProtection(),
        fetchAllControlMethods(),
        fetchAllHarvest(),
        fetchAllResidualManagement(),
        fetchAllImages(),
        fetchStaff(),
    ])

    return {
        observations,
        blocks,
        cropInformation,
        cropMonitoring,
        soilCharacteristics,
        irrigationManagement,
        nutrientManagement,
        cropProtection,
        controlMethods,
        harvestInformation,
        residualManagement,
        observationImages,
        profiles,
    }
}

export async function uploadObservationImage(_file: File, _observationId: string): Promise<string> {
    throw new Error('Image upload is not connected in this web build.')
}

export async function createObservationEntryFormSubmission(
    submission: ObservationEntryFormSubmissionInput,
    predefinedFields?: PredefinedField[]
): Promise<ObservationEntryForm> {
    const { submission: resolvedSubmission, linkedField } = await resolveObservationEntrySubmission(submission, predefinedFields)
    const duplicateMatch = await findDuplicateFieldManagementSubmission(
        resolvedSubmission,
        linkedField?.id ?? null
    )

    if (duplicateMatch) {
        const label = firstNonEmptyString(
            resolvedSubmission.trial_name,
            resolvedSubmission.field_name,
            resolvedSubmission.field_id,
            resolvedSubmission.block_id
        ) ?? 'this field'
        const recordedDate = toNullableDateValue(resolvedSubmission.date_recorded)
        const recordTiming = recordedDate ? ` on ${recordedDate}` : ' without a recorded date'

        if (duplicateMatch.kind === 'unchanged') {
            throw new Error(`The saved record for ${label}${recordTiming} already matches this data. Change at least one value before saving again.`)
        }

        throw new Error(`An identical record for ${label}${recordTiming} already exists in the monitoring records.`)
    }

    const payload = buildSugarcaneFieldManagementPayload(resolvedSubmission)
    const { data, droppedColumns } = await persistFieldManagementMonitoringRowWithSchemaFallback(
        payload,
        linkedField?.id ?? null
    )

    if (droppedColumns.length > 0) {
        console.warn(
            'Persisted sugarcane field management row after omitting unsupported columns from the live schema:',
            droppedColumns
        )
    }

    return mapSugarcaneMonitoringRowToEntryForm(
        normalizeSugarcaneMonitoringRow(data),
        linkedField
    )
}

export async function bulkCreateObservationEntryFormSubmissions(
    rows: ObservationEntryImportRow[]
): Promise<ObservationEntryBulkImportResult> {
    const failures: string[] = []
    let insertedCount = 0
    const predefinedFields = await fetchPredefinedFields().catch(() => [] as PredefinedField[])

    for (const row of rows) {
        try {
            await createObservationEntryFormSubmission(row.submission, predefinedFields)
            insertedCount += 1
        } catch (error: any) {
            failures.push(`Row ${row.rowNumber}: ${error?.message || 'Failed to import row.'}`)
        }
    }

    return {
        insertedCount,
        failureCount: failures.length,
        failures,
    }
}

export function isMobileObservationRecord(observation: any): observation is MobileObservationRecord {
    return typeof observation === 'object' && observation !== null && 'source_table' in observation
}

export function getMobileRecordDate(record: MobileObservationRecord): string {
    return record.date_recorded || record.created_at || ''
}

export function getFullObservationDate(obs: FullObservation): string {
    return obs.date_recorded || obs.created_at || ''
}

export async function refreshProfileFromAuth(): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
        return null
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, status, created_at')
        .eq('id', session.user.id)
        .maybeSingle()

    if (error) {
        throw error
    }

    return data ?? null
}

export type { FullObservation, Field, ObservationEntryForm, ObservationFilters, SugarcaneMonitoringRecord }
