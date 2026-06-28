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
const SUGARCANE_DASHBOARD_FLAT_TABLE_NAME = 'sugarcane_trial_dashboard_flat'
const FIELD_REGISTRY_TABLE_NAMES = [SUGARCANE_DASHBOARD_FLAT_TABLE_NAME] as const
const LEGACY_MONITORING_TABLE_NAME = 'sugarcane_field_management'
const OBSERVATION_READBACK_TABLE_NAMES = [LEGACY_MONITORING_TABLE_NAME, SUGARCANE_DASHBOARD_FLAT_TABLE_NAME] as const
const SUGARCANE_FIELD_TABLE_NAME: string = '__disconnected_field_registry__'
const CONTACT_PERSON_INFORMATION_TABLE_NAMES = ['Contact Person Information'] as const
const CROP_PROTECTION_TABLE_NAMES = ['sugarcane_crop_protection', 'Crop Protection'] as const
const CROP_INFORMATION_TABLE_NAMES = ['sugarcane_crop_information', 'Crop information'] as const
const FOLIAR_SAMPLING_TABLE_NAMES = ['sugarcane_foliar_sampling', 'Foliar sampling'] as const
const IMPORTANT_DATES_TABLE_NAMES = ['sugarcane_important_dates', 'Important Dates'] as const
const RESIDUAL_MANAGEMENT_TABLE_NAMES = ['sugarcane_residue_management', 'Residual Management'] as const
const SOIL_PROPERTIES_TABLE_NAMES = ['sugarcane_soil_properties', 'Soil_properties'] as const
const SUGARCANE_FERTILIZER_TABLE_NAME = 'sugarcane_fertilizer_applications'
const SUGARCANE_HERBICIDE_TABLE_NAME = 'sugarcane_herbicide_applications'
const SUGARCANE_THREE_TABLE_SOURCE_NAME = SUGARCANE_DASHBOARD_FLAT_TABLE_NAME
const NORMALIZED_HARVEST_TABLE_NAMES = ['harvest', 'harvest_information'] as const
const MAX_APPLICATION_TABLE_ROWS = 50
const MAX_FLAT_APPLICATION_COLUMNS = 10

function areSugarcaneSplitTablesDisconnected(): boolean {
    return true
}

export interface PredefinedField extends Field {
    id?: string
    source_table?: (typeof FIELD_REGISTRY_TABLE_NAMES)[number]
    geom?: any
    crop_class?: string
    ploughing_date?: string
    planting_date?: string
    previous_cutting_date?: string
    cutting_date?: string
    soil_ph?: number
    expected_harvest_date?: string
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
    ratoon_number?: number
    variety?: string
    ploughing_date?: string
    planting_date?: string
    soil_sampling_date?: string
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
    ratoon_number?: number
    variety?: string
    ploughing_date?: string
    planting_date?: string
    soil_sampling_date?: string
    soil_test_pdf_url?: string
    foliar_analysis_pdf_url?: string
    final_eldana_survey_pdf_url?: string
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

export interface CreateObservationEntryFormSubmissionOptions {
    allowExistingRowOverwrite?: boolean
    forceNewFieldRow?: boolean
}

export interface MobileObservationRecord extends FullObservation {
    source_table: string
    source_row_id?: string
    entry_form?: Partial<ObservationEntryForm>
    field_registry?: PredefinedField | null
    monitoring_sheet?: SugarcaneMonitoringRecord
}

const isMissingRelationError = (error: unknown): boolean => {
    const message = String((error as { message?: string })?.message || error)

    if (/column/i.test(message)) {
        return false
    }

    return /relation|does not exist|undefined table|schema cache/i.test(message)
}

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
        message.includes('does not exist') ||
        message.includes('no field')
}

function extractMissingSugarcaneMonitoringColumn(error: unknown): string | null {
    const message = String((error as { message?: string })?.message || error)
    const match = [
        /could not find the ['"]([^'"]+)['"] column/i,
        /column ['"]([^'"]+)['"] of relation/i,
        /column ['"]([^'"]+)['"] does not exist/i,
        /record ['"]new['"] has no field ['"]([^'"]+)['"]/i,
    ]
        .map((pattern) => message.match(pattern))
        .find(Boolean)

    return match?.[1] ?? null
}

function isInvalidIdSyntaxError(error: unknown): boolean {
    const code = String((error as { code?: string })?.code || '')
    const message = String((error as { message?: string })?.message || error).toLowerCase()

    return code === '22P02' && message.includes('invalid input syntax')
}

function isReadOnlyRelationError(error: unknown): boolean {
    const code = String((error as { code?: string })?.code || '')
    const message = String((error as { message?: string })?.message || error).toLowerCase()

    return ['42809', '55000'].includes(code) ||
        message.includes('cannot insert into view') ||
        message.includes('cannot update view') ||
        message.includes('not automatically updatable') ||
        message.includes('is not updatable')
}

function extractInvalidSyntaxValue(error: unknown): string | null {
    const message = String((error as { message?: string })?.message || error)
    const match = message.match(/invalid input syntax .*?:\s*"([^"]+)"/i)
    return match?.[1] ?? null
}

function dropColumnsMatchingInvalidSyntaxValue(
    payload: Record<string, unknown>,
    error: unknown,
    droppedColumns: string[],
    tableName?: string
): boolean {
    const invalidValue = extractInvalidSyntaxValue(error)
    if (!invalidValue) {
        return false
    }

    const protectedTextColumns = new Set([
        'field_name',
        'Trial',
        'selected_field',
        'section_name',
        'block_id',
    ])
    const matchingColumns = Object.entries(payload)
        .filter(([key, value]) =>
            toNullableString(value) === invalidValue &&
            !protectedTextColumns.has(key) &&
            (key === 'trial' || key === 'field_id' || key === 'observation_id' || key.endsWith('_id') || key === 'id')
        )
        .map(([key]) => key)

    if (matchingColumns.length === 0) {
        return false
    }

    matchingColumns.forEach((column) => {
        delete payload[column]
        droppedColumns.push(tableName ? `${tableName}.${column}` : column)
    })

    return true
}

function createClientUuid(): string {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
        return globalThis.crypto.randomUUID()
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (token) => {
        const random = Math.floor(Math.random() * 16)
        const value = token === 'x' ? random : (random & 0x3) | 0x8
        return value.toString(16)
    })
}

function normalizeLookupToken(value?: string | null): string {
    return (value ?? '').trim().toLowerCase()
}

function toPublicStorageUrl(bucket: string, value: unknown): string | undefined {
    const normalized = toNullableString(value)
    if (!normalized) return undefined

    if (/^https?:\/\//i.test(normalized)) {
        return getStorageObjectPath(bucket, normalized) ?? normalized
    }

    return normalized
}

function getStorageObjectPath(bucket: string, value: string): string | undefined {
    const normalized = value.trim()
    if (!normalized) return undefined

    if (!/^https?:\/\//i.test(normalized)) {
        return normalized
    }

    try {
        const url = new URL(normalized)
        const marker = `/storage/v1/object/`
        const markerIndex = url.pathname.indexOf(marker)
        if (markerIndex === -1) return undefined

        const objectPath = url.pathname.slice(markerIndex + marker.length)
        const bucketPrefixes = [`public/${bucket}/`, `sign/${bucket}/`]
        const bucketPrefix = bucketPrefixes.find((prefix) => objectPath.startsWith(prefix))
        if (!bucketPrefix) return undefined

        return decodeURIComponent(objectPath.slice(bucketPrefix.length))
    } catch {
        return undefined
    }
}

export async function createSignedPdfUrl(bucket: string, value: string): Promise<string> {
    if (/^https?:\/\//i.test(value) && !getStorageObjectPath(bucket, value)) {
        return value
    }

    const path = getStorageObjectPath(bucket, value)
    if (!path) {
        throw new Error('No PDF file path was found for this record.')
    }

    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10)
    if (error || !data?.signedUrl) {
        throw new Error(`Could not open PDF: ${error?.message ?? 'signed URL was not returned'}`)
    }

    return data.signedUrl
}

export async function openStoredPdf(bucket: string, value: string): Promise<void> {
    const popup = window.open('about:blank', '_blank')
    if (popup) {
        popup.opener = null
    }

    try {
        const signedUrl = await createSignedPdfUrl(bucket, value)
        if (popup) {
            popup.location.href = signedUrl
            return
        }
        window.open(signedUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
        popup?.close()
        throw error
    }
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

function getRecordValue(source: Record<string, unknown>, aliases: string[]): unknown {
    for (const alias of aliases) {
        if (alias in source) {
            return source[alias]
        }
    }

    const normalizedEntries = Object.entries(source).map(([key, value]) => [
        key.trim().toLowerCase(),
        value,
    ] as const)

    for (const alias of aliases) {
        const normalizedAlias = alias.trim().toLowerCase()
        const match = normalizedEntries.find(([key]) => key === normalizedAlias)
        if (match) {
            return match[1]
        }
    }

    return undefined
}

function normalizeFertilizerApplication(value: unknown): FertilizerApplication | null {
    const source = typeof value === 'object' && value !== null
        ? (value as Record<string, unknown>)
        : {}

    const normalized: FertilizerApplication = {}
    const id = toNullableString(getRecordValue(source, ['id']))
    const loopNumber = toNullableNumber(getRecordValue(source, ['loop_number', 'loop']))
    const fertilizerType = firstNonEmptyString(
        getRecordValue(source, ['fertilizer_type', 'fertiliser_type']),
        getRecordValue(source, ['fertilizer_application_type', 'fertiliser_application_type']),
        getRecordValue(source, ['application_type']),
        getRecordValue(source, ['type'])
    )
    const applicationDate = toNullableDateValue(
        getRecordValue(source, ['application_date'])
        ?? getRecordValue(source, ['fertilizer_application_date', 'fertiliser_application_date'])
        ?? getRecordValue(source, ['nutrient_application_date'])
    )
    const applicationRate = toNullableNumber(
        getRecordValue(source, ['application_rate'])
        ?? getRecordValue(source, ['fertilizer_application_rate', 'fertiliser_application_rate'])
    )
    const foliarSamplingDate = toNullableDateValue(getRecordValue(source, ['foliar_sampling_date']))

    if (id) normalized.id = id
    if (loopNumber != null) normalized.loop_number = toLoopNumber(loopNumber, 1)
    if (fertilizerType) normalized.fertilizer_type = fertilizerType
    if (applicationDate) normalized.application_date = applicationDate
    if (applicationRate != null) normalized.application_rate = applicationRate
    if (foliarSamplingDate) normalized.foliar_sampling_date = foliarSamplingDate

    if (!applicationDate && applicationRate == null) {
        return null
    }

    return Object.keys(normalized).length > 0 ? normalized : null
}

function normalizeHerbicideApplication(value: unknown): HerbicideApplication | null {
    const source = typeof value === 'object' && value !== null
        ? (value as Record<string, unknown>)
        : {}

    const normalized: HerbicideApplication = {}
    const id = toNullableString(getRecordValue(source, ['id']))
    const loopNumber = toNullableNumber(getRecordValue(source, ['loop_number', 'loop']))
    const herbicideName = firstNonEmptyString(
        getRecordValue(source, ['herbicide_name']),
        getRecordValue(source, ['herbicide_application_type']),
        getRecordValue(source, ['application_type']),
        getRecordValue(source, ['name'])
    )
    const applicationDate = toNullableDateValue(
        getRecordValue(source, ['application_date'])
        ?? getRecordValue(source, ['herbicide_application_date'])
        ?? getRecordValue(source, ['weed_application_date'])
    )
    const applicationRate = toNullableNumber(
        getRecordValue(source, ['application_rate'])
        ?? getRecordValue(source, ['herbicide_application_rate'])
        ?? getRecordValue(source, ['weed_application_rate'])
    )

    if (id) normalized.id = id
    if (loopNumber != null) normalized.loop_number = toLoopNumber(loopNumber, 1)
    if (herbicideName) normalized.herbicide_name = herbicideName
    if (applicationDate) normalized.application_date = applicationDate
    if (applicationRate != null) normalized.application_rate = applicationRate

    if (!applicationDate && applicationRate == null) {
        return null
    }

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
    if (Array.isArray(value)) {
        return value
            .map(normalizeFertilizerApplication)
            .filter((item): item is FertilizerApplication => item !== null)
            .slice(0, MAX_APPLICATION_TABLE_ROWS)
    }

    const normalized = listOfMaps(value)
        .map(normalizeFertilizerApplication)
        .filter((item): item is FertilizerApplication => item !== null)
    const fallbackType = firstNonEmptyString(fallback?.fertilizer_type)

    if (normalized.length > 0) {
        const knownType = normalized.find((item) => firstNonEmptyString(item.fertilizer_type))?.fertilizer_type
            ?? fallbackType

        return normalized.slice(0, MAX_APPLICATION_TABLE_ROWS).map((application) => ({
            ...application,
            fertilizer_type: application.fertilizer_type ?? knownType,
        }))
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
    if (Array.isArray(value)) {
        return value
            .map(normalizeHerbicideApplication)
            .filter((item): item is HerbicideApplication => item !== null)
            .slice(0, MAX_APPLICATION_TABLE_ROWS)
    }

    const normalized = listOfMaps(value)
        .map(normalizeHerbicideApplication)
        .filter((item): item is HerbicideApplication => item !== null)
    const fallbackName = firstNonEmptyString(fallback?.herbicide_name)

    if (normalized.length > 0) {
        const knownName = normalized.find((item) => firstNonEmptyString(item.herbicide_name))?.herbicide_name
            ?? fallbackName

        return normalized.slice(0, MAX_APPLICATION_TABLE_ROWS).map((application) => ({
            ...application,
            herbicide_name: application.herbicide_name ?? knownName,
        }))
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

    for (let loop = 1; loop <= MAX_FLAT_APPLICATION_COLUMNS; loop += 1) {
        const application = normalizeFertilizerApplication({
            loop_number: loop,
            fertilizer_type: row[`fertilizer_type_${loop}`] ?? row[`fertilizer_application_${loop}_type`],
            application_date: row[`fertilizer_application_date_${loop}`] ?? row[`fertilizer_application_${loop}_date`],
            application_rate: row[`fertilizer_application_rate_${loop}`] ?? row[`fertilizer_application_${loop}_rate`],
        })

        if (application) {
            applications.push(application)
        }
    }

    return applications
}

function extractHerbicideApplicationsFromColumns(row: Record<string, unknown>): HerbicideApplication[] {
    const applications: HerbicideApplication[] = []

    for (let loop = 1; loop <= MAX_FLAT_APPLICATION_COLUMNS; loop += 1) {
        const application = normalizeHerbicideApplication({
            loop_number: loop,
            herbicide_name: row[`herbicide_name_${loop}`] ?? row[`herbicide_application_${loop}_type`],
            application_date: row[`herbicide_application_date_${loop}`] ?? row[`herbicide_application_${loop}_date`],
            application_rate: row[`herbicide_application_rate_${loop}`] ?? row[`herbicide_application_${loop}_rate`],
        })

        if (application) {
            applications.push(application)
        }
    }

    return applications
}

function buildFertilizerApplicationColumns(applications: FertilizerApplication[]): Record<string, unknown> {
    const payload: Record<string, unknown> = {}

    for (let loop = 1; loop <= MAX_FLAT_APPLICATION_COLUMNS; loop += 1) {
        const application = applications[loop - 1]
        payload[`fertilizer_type_${loop}`] = toNullableString(application?.fertilizer_type)
        payload[`fertilizer_application_date_${loop}`] = toNullableDateValue(application?.application_date)
        payload[`fertilizer_application_rate_${loop}`] = toNullableNumber(application?.application_rate)
        payload[`fertilizer_application_remarks_${loop}`] = null
        payload[`fertilizer_application_${loop}_type`] = toNullableString(application?.fertilizer_type)
        payload[`fertilizer_application_${loop}_date`] = toNullableDateValue(application?.application_date)
        payload[`fertilizer_application_${loop}_rate`] = toNullableNumber(application?.application_rate)
        payload[`fertilizer_application_${loop}_remarks`] = null
    }

    return payload
}

function buildHerbicideApplicationColumns(applications: HerbicideApplication[]): Record<string, unknown> {
    const payload: Record<string, unknown> = {}

    for (let loop = 1; loop <= MAX_FLAT_APPLICATION_COLUMNS; loop += 1) {
        const application = applications[loop - 1]
        payload[`herbicide_name_${loop}`] = toNullableString(application?.herbicide_name)
        payload[`herbicide_application_date_${loop}`] = toNullableDateValue(application?.application_date)
        payload[`herbicide_application_rate_${loop}`] = toNullableNumber(application?.application_rate)
        payload[`herbicide_application_remarks_${loop}`] = null
        payload[`herbicide_application_${loop}_type`] = toNullableString(application?.herbicide_name)
        payload[`herbicide_application_${loop}_date`] = toNullableDateValue(application?.application_date)
        payload[`herbicide_application_${loop}_rate`] = toNullableNumber(application?.application_rate)
        payload[`herbicide_application_${loop}_remarks`] = null
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

function buildPrimaryFieldIdentity(row: {
    field_name?: string | null
    field_id?: string | null
    selected_field?: string | null
    section_name?: string | null
    block_id?: string | null
}): string {
    const name = normalizeLookupToken(row.field_name || row.field_id || row.selected_field)
    const section = normalizeLookupToken(row.section_name)
    const block = normalizeLookupToken(row.block_id)

    if (name && section && block) return `name-section-block:${name}|${section}|${block}`
    if (name && block) return `name-block:${name}|${block}`
    if (name && section) return `name-section:${name}|${section}`
    if (name) return `name:${name}`
    if (section && block) return `section-block:${section}|${block}`
    if (block) return `block:${block}`

    return ''
}

function buildStableObservationId(payload: Record<string, unknown>): string {
    const identityParts = [
        firstNonEmptyString(payload.Trial, payload.trial, payload.field_name, payload.field_id, payload.selected_field),
        firstNonEmptyString(payload.block_id),
        normalizeRecordedDateValue(firstNonEmptyString(payload.date_recorded, payload.contact_date_recorded)),
        normalizeRecordedDateValue(firstNonEmptyString(payload.planting_date)),
        normalizeRecordedDateValue(firstNonEmptyString(payload.cutting_date, payload.previous_cutting_date, payload.previous_cutting)),
    ]
        .map((value) => normalizeLookupToken(toNullableString(value)))
        .filter(Boolean)

    if (identityParts.length === 0) {
        return createClientUuid()
    }

    return `field-observation:${identityParts.join('|')}`
}

function buildFlatDashboardRowId(row: Record<string, unknown>): string {
    return (firstNonEmptyString(row.id, row.observation_id)
        ?? ([
            firstNonEmptyString(row.Trial, row.trial, row.field_name, row.field_id),
            firstNonEmptyString(row.block_id),
            normalizeRecordedDateValue(firstNonEmptyString(row.date_recorded, row.contact_date_recorded, row.harvest_date, row.actual_harvest_date)),
        ]
            .filter(Boolean)
            .join('|')))
        || createClientUuid()
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

function toNumericIdString(value: unknown): string | null {
    const normalized = toNullableString(value)
    if (!normalized || !/^\d+$/.test(normalized)) {
        return null
    }

    return normalized
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

function getSugarcaneClassNumber(cropClass?: string | null, ratoonNumber?: number | null): number | null {
    if (typeof ratoonNumber === 'number' && Number.isFinite(ratoonNumber) && ratoonNumber >= 0) {
        return Math.floor(ratoonNumber)
    }

    const normalized = String(cropClass ?? '').trim()
    if (!normalized) return null
    if (/^plant\s*cane$/i.test(normalized)) return 0

    const ratoonMatch = normalized.match(/(\d+)(?:st|nd|rd|th)?\s*ratoon/i)
    if (!ratoonMatch) return null

    const parsed = Number(ratoonMatch[1])
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
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

function mapPredefinedFieldRow(
    row: Record<string, unknown>,
    sourceTable?: (typeof FIELD_REGISTRY_TABLE_NAMES)[number]
): PredefinedField {
    const geometry = row.geom ?? row.geom_polygon ?? row.geometry ?? null
    const derivedCoordinates = deriveFieldCoordinatesFromGeometry(geometry)

    return {
        id: toNullableString(row.id) ?? undefined,
        source_table: sourceTable,
        field_name: firstNonEmptyString(row.field_name, row.field_id, row.Trial, row.trial, row.trial_name) ?? '',
        section_name: firstNonEmptyString(row.section_name, row.section_name_id, row.section) ?? '',
        block_id: firstNonEmptyString(row.block_id) ?? '',
        area: firstNumericValue(row.area, row.Area) ?? undefined,
        latitude: toNullableNumber(row.latitude) ?? derivedCoordinates?.latitude ?? 0,
        longitude: toNullableNumber(row.longitude) ?? derivedCoordinates?.longitude ?? 0,
        irrigation_type: toNullableString(row.irrigation_type) ?? undefined,
        water_source: toNullableString(row.water_source) ?? undefined,
        tam_mm: firstNonEmptyString(row.tam_mm, row.tam, row.TAM) ?? undefined,
        tamm_area: toNullableNumber(row.tamm_area ?? row.tam_area) ?? undefined,
        soil_type: toNullableString(row.soil_type) ?? undefined,
        soil_ph: firstNumericValue(row.soil_ph, row.soil_pH, row.ph, row.pH) ?? undefined,
        created_at: toNullableString(row.created_at) ?? undefined,
        created_by: toNullableString(row.created_by) ?? undefined,
        date_recorded: firstNonEmptyString(row.date_recorded, row.contact_date_recorded, row.harvest_date, row.actual_harvest_date) ?? undefined,
        crop_type: toNullableString(row.crop_type) ?? undefined,
        crop_class: toNullableString(row.crop_class) ?? undefined,
        ploughing_date: toNullableString(row.ploughing_date) ?? undefined,
        planting_date: toNullableString(row.planting_date) ?? undefined,
        previous_cutting_date: toNullableString(row.previous_cutting_date ?? row.previous_cutting) ?? undefined,
        cutting_date: toNullableString(row.cutting_date ?? row.previous_cutting_date ?? row.previous_cutting) ?? undefined,
        is_synced: typeof row.is_synced === 'boolean' ? row.is_synced : undefined,
        local_updated_at: toNullableString(row.local_updated_at) ?? undefined,
        updated_at: toNullableString(row.updated_at) ?? undefined,
        geom: geometry,
        observation_count: toNullableNumber(row.observation_count) ?? 0,
    }
}

function getPredefinedFieldTimestamp(field: PredefinedField): number {
    const candidates = [field.updated_at, field.date_recorded, field.created_at, field.local_updated_at]

    for (const candidate of candidates) {
        const time = new Date(String(candidate ?? '')).getTime()
        if (Number.isFinite(time)) {
            return time
        }
    }

    return 0
}

function buildPredefinedFieldMergeKey(field: PredefinedField): string {
    const identityKey = buildFieldLookupKey(field.field_name, field.section_name, field.block_id)

    if (identityKey.replace(/\|/g, '')) {
        return identityKey
    }

    return normalizeLookupToken(field.id)
}

function mergePredefinedFieldValues(base: PredefinedField, overlay: PredefinedField): PredefinedField {
    const merged = { ...base }

    Object.entries(overlay).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
            ;(merged as Record<string, unknown>)[key] = value
        }
    })

    return merged
}

function mergePredefinedFields(fields: PredefinedField[]): PredefinedField[] {
    const byField = new Map<string, PredefinedField>()

    fields.forEach((field) => {
        const mergeKey = buildPredefinedFieldMergeKey(field)
        if (!mergeKey) {
            return
        }

        const current = byField.get(mergeKey)
        if (!current || getPredefinedFieldTimestamp(field) >= getPredefinedFieldTimestamp(current)) {
            byField.set(mergeKey, mergePredefinedFieldValues(current ?? field, {
                ...field,
                observation_count: Math.max(current?.observation_count ?? 0, field.observation_count ?? 0),
            }))
            return
        }

        byField.set(mergeKey, mergePredefinedFieldValues(field, {
            ...current,
            observation_count: Math.max(current.observation_count ?? 0, field.observation_count ?? 0),
        }))
    })

    return Array.from(byField.values())
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
    if (tableName === SUGARCANE_FIELD_TABLE_NAME) {
        const fieldName = toNullableString(payload.field_name)

        return {
            Trial: fieldName,
            trial: fieldName,
            field_name: fieldName,
            section_name: toNullableString(payload.section_name),
            block_id: toNullableString(payload.block_id),
            latitude: toNullableNumber(payload.latitude),
            longitude: toNullableNumber(payload.longitude),
            area: toNullableNumber(payload.area),
            geom_polygon: payload.geom ?? null,
            spatial_data: payload.geom ?? null,
            collector_id: toNullableString(payload.created_by),
            crop_type: toNullableString(payload.crop_type),
            date_recorded: toNullableDateValue(payload.date_recorded),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }
    }

    return payload
}

async function fetchFieldRegistryRowsWithFallback(): Promise<{
    fields: PredefinedField[]
    tableName: (typeof FIELD_REGISTRY_TABLE_NAMES)[number] | null
}> {
    const collectedFields: PredefinedField[] = []
    let firstAvailableTableName: (typeof FIELD_REGISTRY_TABLE_NAMES)[number] | null = null

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

        firstAvailableTableName ??= tableName
        collectedFields.push(
            ...(data ?? []).map((row) => mapPredefinedFieldRow(row as Record<string, unknown>, tableName))
        )
    }

    return {
        fields: sortPredefinedFields(mergePredefinedFields(collectedFields)),
        tableName: firstAvailableTableName,
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

        return mapPredefinedFieldRow(data as Record<string, unknown>, tableName)
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
    const fieldName = firstNonEmptyString(row.Trial, row.trial, row.field_name, row.field_id) ?? ''
    const recordedDate = normalizeRecordedDateValue(
        firstNonEmptyString(row.date_recorded, row.contact_date_recorded, row.harvest_date, row.actual_harvest_date)
    ) || ''
    const previousCutting = toNullableDateValue(
        row.previous_cutting ?? row.previous_cutting_date ?? row.cutting_date ?? row.expected_previous_cutting_date
    ) ?? undefined
    const nutrientApplicationDate = toNullableDateValue(
        row.nutrient_application_date ?? row.fertilizer_application_date ?? row.application_date
    ) ?? undefined
    const weedApplicationDate = toNullableDateValue(row.weed_application_date) ?? undefined
    const harvestDate = toNullableDateValue(row.harvest_date ?? row.actual_cutting_date) ?? undefined
    const ploughingDate = toNullableDateValue(row.ploughing_date) ?? undefined
    const plantingDate = toNullableDateValue(row.planting_date) ?? undefined
    const expectedHarvestDate = toNullableDateValue(row.expected_harvest_date) ?? undefined
    const rawCropClass = toNullableString(row.crop_class) ?? undefined
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
        id: buildFlatDashboardRowId(row),
        observation_id: firstNonEmptyString(row.observation_id) ?? undefined,
        field_name: fieldName,
        field_id: firstNonEmptyString(row.field_id) ?? undefined,
        section_name: firstNonEmptyString(row.section_name, row.section, row.section_name_id) ?? undefined,
        block_id: toNullableString(row.block_id) ?? undefined,
        area: firstNumericValue(row.area, row.Area) ?? undefined,
        geom_polygon: geometry,
        latitude: toNullableNumber(row.latitude) ?? derivedCoordinates?.latitude ?? undefined,
        longitude: toNullableNumber(row.longitude) ?? derivedCoordinates?.longitude ?? undefined,
        date_recorded: recordedDate,
        crop_type: toNullableString(row.crop_type) ?? undefined,
        crop_class: rawCropClass,
        variety: toNullableString(row.variety) ?? undefined,
        ratoon_number: firstNumericValue(row.ratoon_number, row.ratoon) ?? getSugarcaneClassNumber(rawCropClass) ?? undefined,
        crop_stage: derivedCropStage ?? undefined,
        ploughing_date: ploughingDate,
        planting_date: plantingDate,
        soil_sampling_date: toNullableDateValue(row.soil_sampling_date) ?? undefined,
        soil_test_pdf_url: toPublicStorageUrl('soil-test-pdfs', row.soil_test_pdf_url ?? row.soil_test_pdf_path),
        soil_test_pdf_path: toNullableString(row.soil_test_pdf_path) ?? undefined,
        foliar_analysis_pdf_url: toNullableString(row.foliar_analysis_pdf_url) ?? undefined,
        final_eldana_survey_pdf_url: toPublicStorageUrl('final-eldana-survey-pdfs', row.final_eldana_survey_pdf_url),
        previous_cutting: previousCutting,
        previous_cutting_date: previousCutting,
        cutting_date: toNullableDateValue(row.cutting_date) ?? previousCutting,
        expected_harvest_date: expectedHarvestDate,
        stress: toNullableString(row.stress) ?? undefined,
        tam_mm: firstNonEmptyString(row.tam_mm, row.tam) ?? undefined,
        soil_type: toNullableString(row.soil_type) ?? undefined,
        soil_texture: toNullableString(row.soil_texture) ?? undefined,
        soil_ph: firstNumericValue(row.soil_ph, row.soil_pH, row.ph, row.pH) ?? undefined,
        organic_matter: toNullableNumber(row.organic_matter) ?? undefined,
        drainage_class: toNullableString(row.drainage_class) ?? undefined,
        irrigation_type: toNullableString(row.irrigation_type) ?? undefined,
        irrigation_date: toNullableDateValue(row.irrigation_date) ?? undefined,
        irrigation_volume: toNullableNumber(row.irrigation_volume) ?? undefined,
        soil_moisture_percentage: toNullableNumber(row.soil_moisture_percentage) ?? undefined,
        water_source: toNullableString(row.water_source) ?? undefined,
        trial_number: firstNonEmptyString(row.trial_number, row.contact_trial_number) ?? undefined,
        trial_name: firstNonEmptyString(row.trial_name, row.contact_trial_name) ?? undefined,
        contact_person: firstNonEmptyString(row.contact_person, row.contact_person_scientist) ?? undefined,
        field_remarks: firstNonEmptyString(row.field_remarks, row.remarks) ?? undefined,
        fertilizer_type: currentFertilizerApplication?.fertilizer_type ?? undefined,
        fertilizer_application_date: currentFertilizerApplication?.application_date ?? undefined,
        nutrient_application_date: currentFertilizerApplication?.application_date ?? undefined,
        application_rate: currentFertilizerApplication?.application_rate ?? undefined,
        fertilizer_applications: fertilizerApplications.length > 0 ? fertilizerApplications : undefined,
        npk_ratio: toNullableString(row.npk_ratio) ?? undefined,
        foliar_sampling_date: currentFertilizerApplication?.foliar_sampling_date ?? toNullableDateValue(row.foliar_sampling_date) ?? undefined,
        herbicide_name: currentHerbicideApplication?.herbicide_name ?? undefined,
        weed_application_date: currentHerbicideApplication?.application_date ?? undefined,
        weed_application_rate: currentHerbicideApplication?.application_rate ?? undefined,
        herbicide_applications: herbicideApplications.length > 0 ? herbicideApplications : undefined,
        weed_type: toNullableString(row.weed_type) ?? undefined,
        weed_level: toNullableString(row.weed_level) ?? undefined,
        pest_type: toNullableString(row.pest_type) ?? undefined,
        pest_severity: toNullableString(row.pest_severity) ?? undefined,
        disease_type: toNullableString(row.disease_type) ?? undefined,
        disease_severity: toNullableString(row.disease_severity) ?? undefined,
        pest_remarks: firstNonEmptyString(row.pest_remarks, row['pest remarks'], row['Pest remarks'], row['Pest Remarks'], row.crop_pest_remarks, row.pest_control) ?? undefined,
        disease_remarks: firstNonEmptyString(row.disease_remarks, row['disease remarks'], row['Disease remarks'], row['Disease Remarks'], row.crop_disease_remarks, row.disease_control) ?? undefined,
        weed_control: firstNonEmptyString(row.weed_control, row.herbicide_name) ?? undefined,
        pest_control: firstNonEmptyString(row.pest_control, row.pest_remarks, row['pest remarks'], row['Pest remarks'], row['Pest Remarks']) ?? undefined,
        disease_control: firstNonEmptyString(row.disease_control, row.disease_remarks, row['disease remarks'], row['Disease remarks'], row['Disease Remarks']) ?? undefined,
        harvest_date: harvestDate,
        harvest_yield: firstNumericValue(row.cane_yield, row.harvest_yield, row.yield) ?? undefined,
        yield: firstNumericValue(row.cane_yield, row.harvest_yield, row.yield) ?? undefined,
        harvest_method: toNullableString(row.harvest_method) ?? undefined,
        quality_remarks: firstNonEmptyString(row.quality_remarks, row.cane_quality_remarks) ?? undefined,
        residue_type: firstNonEmptyString(row.residue_type, row.residual_type) ?? undefined,
        residue_management_method: firstNonEmptyString(row.residue_management_method, row.residual_management_method, row.management_method) ?? undefined,
        residual_management_remarks: firstNonEmptyString(row.residual_management_remarks, row.residue_remarks, row.residual_remarks) ?? undefined,
        collector_id: toNullableString(row.collector_id) ?? undefined,
        remarks: firstNonEmptyString(row.remarks, row.field_remarks) ?? undefined,
        image_url: toNullableString(row.image_url) ?? undefined,
        well_known_text: toNullableString(row.well_known_text) ?? undefined,
        raw_values: { ...row },
        created_at: String(row.created_at || ''),
        updated_at: String(row.updated_at || row.created_at || ''),
    }
}

export function hasCompleteSugarcaneDisplayData(row: SugarcaneMonitoringRecord): boolean {
    const rawValues = row.raw_values && typeof row.raw_values === 'object' && !Array.isArray(row.raw_values)
        ? row.raw_values as Record<string, unknown>
        : {}

    return Boolean(
        firstNonEmptyString(
            row.field_name,
            row.field_id,
            rawValues.field_name,
            rawValues.trial,
            rawValues.Trial
        ) &&
        firstNonEmptyString(row.block_id, rawValues.block_id)
    )
}

function mapSugarcaneMonitoringRowToObservation(row: SugarcaneMonitoringRecord): MobileObservationRecord {
    const rawValues = row.raw_values && typeof row.raw_values === 'object' && !Array.isArray(row.raw_values)
        ? row.raw_values as Record<string, unknown>
        : {}
    const sourceTable = toNullableString(rawValues.source_table) || SUGARCANE_THREE_TABLE_SOURCE_NAME

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
            crop_type: row.crop_type || '',
            ratoon_number: row.ratoon_number ?? 0,
            variety: row.variety || '',
            ploughing_date: row.ploughing_date || '',
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
            soil_ph: row.soil_ph ?? undefined as unknown as number,
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
        harvest: row.harvest_date || row.cane_yield || row.harvest_yield || row.yield || row.harvest_method
            ? {
                id: row.id,
                observation_id: row.id,
                harvest_date: row.harvest_date || '',
                yield: row.cane_yield ?? row.harvest_yield ?? row.yield ?? 0,
                harvest_method: row.harvest_method || '',
            }
            : undefined,
        residual_management: row.residue_type || row.residue_management_method || row.raw_values?.residual_management_method
            ? {
                id: row.id,
                observation_id: row.id,
                residue_type: row.residue_type || '',
                management_method: row.residue_management_method || toNullableString(row.raw_values?.residual_management_method) || '',
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
        source_table: sourceTable,
        source_row_id: row.id,
        monitoring_sheet: row,
    }
}

function mapSugarcaneMonitoringRowToEntryForm(
    row: SugarcaneMonitoringRecord,
    linkedField?: PredefinedField | null
): ObservationEntryForm {
    const rawValues = row.raw_values && typeof row.raw_values === 'object' && !Array.isArray(row.raw_values)
        ? row.raw_values as Record<string, unknown>
        : {}
    const sourceTable = toNullableString(rawValues.source_table) || SUGARCANE_THREE_TABLE_SOURCE_NAME
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
        crop_type: row.crop_type || '',
        crop_class: row.crop_class || linkedField?.crop_class || '',
        variety: row.variety || '',
        ploughing_date: row.ploughing_date || '',
        planting_date: row.planting_date || '',
        soil_sampling_date: row.soil_sampling_date || '',
        soil_test_pdf_url: row.soil_test_pdf_url || '',
        foliar_analysis_pdf_url: row.foliar_analysis_pdf_url || '',
        final_eldana_survey_pdf_url: row.final_eldana_survey_pdf_url || '',
        previous_cutting_date: row.previous_cutting_date || row.previous_cutting || '',
        cutting_date: row.cutting_date || row.previous_cutting_date || row.previous_cutting || '',
        expected_harvest_date: row.expected_harvest_date || '',
        irrigation_type: row.irrigation_type || linkedField?.irrigation_type || '',
        water_source: row.water_source || linkedField?.water_source || '',
        tam_mm: row.tam_mm || linkedField?.tam_mm || '',
        tamm_area: toNullableNumber(row.tam_mm ?? linkedField?.tam_mm ?? linkedField?.tamm_area) ?? undefined,
        soil_type: row.soil_type || linkedField?.soil_type || '',
        soil_ph: row.soil_ph ?? linkedField?.soil_ph ?? undefined,
        field_remarks: row.field_remarks || row.remarks || '',
        stress: row.stress || '',
        residue_type: row.residue_type || '',
        residue_management_method: row.residue_management_method || toNullableString(rawValues.residual_management_method) || '',
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
        yield: row.cane_yield ?? row.harvest_yield ?? row.yield ?? undefined,
        harvest_method: row.harvest_method || '',
        quality_remarks: row.quality_remarks || '',
        remarks: row.field_remarks || row.remarks || '',
        source_table: sourceTable,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }
}

function getRowTimestamp(row: SugarcaneMonitoringRecord): number {
    const candidates = [row.date_recorded, row.updated_at, row.created_at]

    for (const candidate of candidates) {
        const time = new Date(String(candidate ?? '')).getTime()
        if (Number.isFinite(time)) {
            return time
        }
    }

    return 0
}

function isBetterFieldManagementRow(candidate: SugarcaneMonitoringRecord, current: SugarcaneMonitoringRecord): boolean {
    const candidateHasDate = hasUsableRecordedDate(candidate.date_recorded)
    const currentHasDate = hasUsableRecordedDate(current.date_recorded)

    if (candidateHasDate !== currentHasDate) {
        return candidateHasDate
    }

    return getRowTimestamp(candidate) >= getRowTimestamp(current)
}

function dedupeSugarcaneMonitoringRows(rows: SugarcaneMonitoringRecord[]): SugarcaneMonitoringRecord[] {
    const byIdentity = new Map<string, SugarcaneMonitoringRecord>()
    const passthrough: SugarcaneMonitoringRecord[] = []

    rows.forEach((row) => {
        const fieldIdentity = buildPrimaryFieldIdentity({
            field_name: row.field_name,
            field_id: row.field_id,
            selected_field: row.field_name || row.field_id,
            section_name: row.section_name,
            block_id: row.block_id,
        })
        const recordedDate = normalizeRecordedDateValue(row.date_recorded)
        const seasonDate = normalizeRecordedDateValue(row.cutting_date || row.previous_cutting_date || row.previous_cutting)
            || normalizeRecordedDateValue(row.planting_date)
            || normalizeRecordedDateValue(row.ploughing_date)
        const identity = fieldIdentity && recordedDate
            ? `field-date-season:${fieldIdentity}|${recordedDate}|${seasonDate}`
            : fieldIdentity

        if (!identity) {
            passthrough.push(row)
            return
        }

        const current = byIdentity.get(identity)
        if (!current || isBetterFieldManagementRow(row, current)) {
            byIdentity.set(identity, row)
        }
    })

    return [...byIdentity.values(), ...passthrough]
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
    const fertilizerApplicationDate = toNullableDateValue(
        currentFertilizerApplication?.application_date ?? submission.nutrient_application_date
    )
    const fertilizerApplicationRate = toNullableNumber(
        currentFertilizerApplication?.application_rate ?? submission.application_rate
    )
    const herbicideApplicationDate = toNullableDateValue(
        currentHerbicideApplication?.application_date ?? submission.weed_application_date
    )
    const herbicideApplicationRate = toNullableNumber(
        currentHerbicideApplication?.application_rate ?? submission.weed_application_rate
    )
    const fertilizerApplicationPayload = fertilizerApplications.map((application, index) => ({
        ...application,
        loop_number: application.loop_number ?? index + 1,
    }))
    const herbicideApplicationPayload = herbicideApplications.map((application, index) => ({
        ...application,
        loop_number: application.loop_number ?? index + 1,
    }))
    const derivedCropStage = deriveGrowthStageLabel({
        crop_type: submission.crop_type,
        crop_class: submission.crop_class,
        planting_date: submission.planting_date,
        previous_cutting_date: submission.previous_cutting_date,
        cutting_date: submission.cutting_date,
        date_recorded: submission.date_recorded,
    })
    const trial = toNullableString(submission.field_name || submission.field_id)

    return {
        Trial: trial,
        trial,
        field_name: trial,
        section_name: toNullableString(submission.section_name),
        block_id: toNullableString(submission.block_id),
        collector_id: toNullableString(submission.collector_id),
        latitude: toNullableNumber(submission.latitude),
        longitude: toNullableNumber(submission.longitude),
        area: toNullableNumber(submission.area ?? submission.block_size),
        Area: toNullableNumber(submission.area ?? submission.block_size),
        irrigation_type: toNullableString(submission.irrigation_type),
        water_source: toNullableString(submission.water_source),
        tam: toNullableNumber(submission.tam_mm ?? submission.tamm_area),
        soil_type: toNullableString(submission.soil_type),
        soil_ph: toNullableNumber(submission.soil_ph),
        soil_pH: toNullableNumber(submission.soil_ph),
        remarks: toNullableString(submission.remarks || submission.field_remarks),
        date_recorded: toNullableDateValue(submission.date_recorded),
        contact_date_recorded: toNullableDateValue(submission.date_recorded),
        trial_number: toNullableString(submission.trial_number),
        contact_trial_number: toNullableString(submission.trial_number),
        trial_name: toNullableString(submission.trial_name),
        contact_trial_name: toNullableString(submission.trial_name),
        contact_person: toNullableString(submission.contact_person),
        contact_person_scientist: toNullableString(submission.contact_person),
        crop_type: toNullableString(submission.crop_type || submission.crop_class) || 'Sugarcane',
        crop_class: toNullableString(submission.crop_class),
        ratoon_number: toNullableNumber(submission.ratoon_number),
        ratoon: toNullableNumber(submission.ratoon_number),
        variety: toNullableString(submission.variety),
        crop_stage: toNullableString(derivedCropStage),
        stress: toNullableString(submission.stress),
        ploughing_date: toNullableDateValue(submission.ploughing_date),
        planting_date: toNullableDateValue(submission.planting_date),
        soil_sampling_date: toNullableDateValue(submission.soil_sampling_date),
        soil_test_pdf_url: toNullableString(submission.soil_test_pdf_url),
        foliar_analysis_pdf_url: toNullableString(submission.foliar_analysis_pdf_url),
        final_eldana_survey_pdf_url: toNullableString(submission.final_eldana_survey_pdf_url),
        previous_cutting: toNullableDateValue(submission.previous_cutting_date || submission.cutting_date),
        previous_cutting_date: toNullableDateValue(submission.previous_cutting_date || submission.cutting_date),
        cutting_date: toNullableDateValue(submission.previous_cutting_date || submission.cutting_date),
        expected_harvest_date: toNullableDateValue(submission.expected_harvest_date),
        residue_type: toNullableString(submission.residue_type),
        residual_type: toNullableString(submission.residue_type),
        residue_management_method: toNullableString(submission.residue_management_method),
        management_method: toNullableString(submission.residue_management_method),
        residual_management_remarks: toNullableString(submission.residual_management_remarks),
        residue_remarks: toNullableString(submission.residual_management_remarks),
        residual_remarks: toNullableString(submission.residual_management_remarks),
        field_remarks: toNullableString(submission.field_remarks),
        fertilizer_type: toNullableString(currentFertilizerApplication?.fertilizer_type ?? submission.fertilizer_type),
        fertilizer_application_date: fertilizerApplicationDate,
        nutrient_application_date: fertilizerApplicationDate,
        application_date: fertilizerApplicationDate,
        application_rate: fertilizerApplicationRate,
        foliar_sampling_date: toNullableDateValue(currentFertilizerApplication?.foliar_sampling_date ?? submission.foliar_sampling_date),
        fertilizer_applications: fertilizerApplicationPayload.length > 0 ? fertilizerApplicationPayload : null,
        herbicide_name: toNullableString(currentHerbicideApplication?.herbicide_name ?? submission.herbicide_name),
        herbicide_application_date: herbicideApplicationDate,
        herbicide_application_rate: herbicideApplicationRate,
        weed_application_date: herbicideApplicationDate,
        weed_application_rate: herbicideApplicationRate,
        herbicide_applications: herbicideApplicationPayload.length > 0 ? herbicideApplicationPayload : null,
        pest_control: toNullableString(submission.pest_remarks),
        pest_remarks: toNullableString(submission.pest_remarks),
        crop_pest_remarks: toNullableString(submission.pest_remarks),
        disease_control: toNullableString(submission.disease_remarks),
        disease_remarks: toNullableString(submission.disease_remarks),
        crop_disease_remarks: toNullableString(submission.disease_remarks),
        harvest_date: toNullableDateValue(submission.harvest_date),
        actual_harvest_date: toNullableDateValue(submission.harvest_date),
        cane_yield: toNullableNumber(submission.yield),
        harvest_yield: toNullableNumber(submission.yield),
        yield: toNullableNumber(submission.yield),
        harvest_method: toNullableString(submission.harvest_method),
        quality_remarks: toNullableString(submission.quality_remarks),
        cane_quality_remarks: toNullableString(submission.quality_remarks),
        geom_polygon: submission.geom_polygon ?? submission.spatial_data ?? null,
        ...buildFertilizerApplicationColumns(fertilizerApplications),
        ...buildHerbicideApplicationColumns(herbicideApplications),
    }
}

const APPLICATION_PAYLOAD_COLUMNS = new Set([
    'fertilizer_type',
    'fertilizer_application_date',
    'nutrient_application_date',
    'application_date',
    'application_rate',
    'foliar_sampling_date',
    'fertilizer_applications',
    'herbicide_name',
    'herbicide_application_date',
    'herbicide_application_rate',
    'weed_application_date',
    'weed_application_rate',
    'herbicide_applications',
])

function buildSugarcaneFieldPayload(payload: Record<string, unknown>): Record<string, unknown> {
    const fieldPayload = Object.fromEntries(
        Object.entries(payload).filter(([key]) =>
            !APPLICATION_PAYLOAD_COLUMNS.has(key) &&
            !/^fertilizer_/.test(key) &&
            !/^herbicide_/.test(key)
        )
    )

    delete fieldPayload.field_id
    delete fieldPayload.id

    return fieldPayload
}

function buildObservationSectionCommonPayload(payload: Record<string, unknown>, observationId: string): Record<string, unknown> {
    const trial = firstNonEmptyString(payload.Trial, payload.trial, payload.field_name, payload.field_id)
    const now = new Date().toISOString()

    return {
        observation_id: observationId,
        client_uuid: observationId,
        Trial: trial,
        trial,
        field_name: trial,
        field_id: firstNonEmptyString(payload.field_id, trial),
        block_id: toNullableString(payload.block_id),
        section_name: toNullableString(payload.section_name),
        collector_id: toNullableString(payload.collector_id),
        created_by: toNullableString(payload.collector_id),
        date_recorded: toNullableDateValue(payload.date_recorded ?? payload.contact_date_recorded),
        created_at: now,
        updated_at: now,
    }
}

function compactPayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== undefined)
    )
}

function hasMeaningfulUpdateValue(value: unknown): boolean {
    if (value === undefined) {
        return false
    }

    if (value === null) {
        return true
    }

    if (typeof value === 'string') {
        return value.trim().length > 0
    }

    if (Array.isArray(value)) {
        return value.length > 0
    }

    return true
}

function buildNonBlankUpdatePayload(payload: Record<string, unknown>): Record<string, unknown> {
    const preservedIdentityColumns = new Set([
        'id',
        'observation_id',
        'client_uuid',
        'Trial',
        'trial',
        'field_name',
        'field_id',
        'block_id',
        'section_name',
        'collector_id',
        'created_by',
        'created_at',
        'updated_at',
        'loop_number',
    ])

    return Object.fromEntries(
        Object.entries(payload).filter(([key, value]) =>
            preservedIdentityColumns.has(key) || hasMeaningfulUpdateValue(value)
        )
    )
}

function buildContactPersonInformationPayload(payload: Record<string, unknown>, observationId: string): Record<string, unknown> {
    const dateRecorded = toNullableDateValue(payload.date_recorded ?? payload['Date recorded'])
    const trialNumber = toNullableString(payload.trial_number ?? payload.contact_trial_number ?? payload['Trial number'])
    const trialName = toNullableString(payload.trial_name ?? payload.contact_trial_name ?? payload['Trial name'])
    const contactPerson = toNullableString(payload.contact_person ?? payload.contact_person_scientist ?? payload['Contact person'] ?? payload['Contact Person'])

    return compactPayload({
        ...buildObservationSectionCommonPayload(payload, observationId),
        date_recorded: dateRecorded,
        contact_date_recorded: toNullableDateValue(payload.contact_date_recorded ?? payload.date_recorded),
        'Date recorded': dateRecorded,
        trial_number: trialNumber,
        contact_trial_number: trialNumber,
        'Trial number': trialNumber,
        trial_name: trialName,
        contact_trial_name: trialName,
        'Trial name': trialName,
        contact_person: contactPerson,
        contact_person_scientist: contactPerson,
        'Contact person': contactPerson,
        'Contact Person': contactPerson,
        remarks: toNullableString(payload.remarks ?? payload.field_remarks),
    })
}

function buildCropInformationPayload(payload: Record<string, unknown>, observationId: string): Record<string, unknown> {
    const cropType = toNullableString(payload.crop_type ?? payload['Crop Type'])
    const cropClass = toNullableString(payload.crop_class ?? payload['Crop Class'])
    const ratoonNumber = toNullableNumber(payload.ratoon_number ?? payload.ratoon)

    return compactPayload({
        ...buildObservationSectionCommonPayload(payload, observationId),
        crop_type: cropType,
        'Crop Type': cropType,
        crop_class: cropClass,
        'Crop Class': cropClass,
        ratoon_number: ratoonNumber,
        ratoon: ratoonNumber,
        variety: toNullableString(payload.variety),
        crop_stage: toNullableString(payload.crop_stage),
        crop_note: toNullableString(payload.crop_note ?? payload.remarks),
        stress: toNullableString(payload.stress),
        remarks: toNullableString(payload.remarks ?? payload.field_remarks),
    })
}

function buildFoliarSamplingPayload(payload: Record<string, unknown>, observationId: string): Record<string, unknown> {
    return compactPayload({
        ...buildObservationSectionCommonPayload(payload, observationId),
        foliar_sampling_date: toNullableDateValue(payload.foliar_sampling_date),
        foliar_analysis_pdf_url: toNullableString(payload.foliar_analysis_pdf_url),
        foliar_analysis_pdf_path: toNullableString(payload.foliar_analysis_pdf_path),
        remarks: toNullableString(payload.remarks ?? payload.field_remarks),
    })
}

function buildImportantDatesPayload(payload: Record<string, unknown>, observationId: string): Record<string, unknown> {
    return compactPayload({
        ...buildObservationSectionCommonPayload(payload, observationId),
        date_recorded: toNullableDateValue(payload.date_recorded),
        ploughing_date: toNullableDateValue(payload.ploughing_date),
        planting_date: toNullableDateValue(payload.planting_date),
        previous_cutting: toNullableDateValue(payload.previous_cutting ?? payload.previous_cutting_date ?? payload.cutting_date),
        previous_cutting_date: toNullableDateValue(payload.previous_cutting_date ?? payload.previous_cutting ?? payload.cutting_date),
        cutting_date: toNullableDateValue(payload.cutting_date ?? payload.previous_cutting_date ?? payload.previous_cutting),
        expected_previous_cutting_date: toNullableDateValue(payload.expected_previous_cutting_date),
        expected_harvest_date: toNullableDateValue(payload.expected_harvest_date),
        harvest_date: toNullableDateValue(payload.harvest_date),
        actual_harvest_date: toNullableDateValue(payload.actual_harvest_date ?? payload.harvest_date),
        cane_yield: toNullableNumber(payload.cane_yield ?? payload.harvest_yield ?? payload.yield),
        harvest_yield: toNullableNumber(payload.harvest_yield ?? payload.cane_yield ?? payload.yield),
        yield: toNullableNumber(payload.yield ?? payload.cane_yield ?? payload.harvest_yield),
        harvest_method: toNullableString(payload.harvest_method),
        quality_remarks: toNullableString(payload.quality_remarks),
        cane_quality_remarks: toNullableString(payload.cane_quality_remarks ?? payload.quality_remarks),
        final_eldana_survey_pdf_url: toNullableString(payload.final_eldana_survey_pdf_url),
        final_eldana_survey_pdf_path: toNullableString(payload.final_eldana_survey_pdf_path),
    })
}

function buildSoilPropertiesPayload(payload: Record<string, unknown>, observationId: string): Record<string, unknown> {
    const tamValue = toNullableNumber(payload.tam ?? payload.tam_mm ?? payload.tamm_area)
    const fieldRemarks = toNullableString(payload.field_remarks ?? payload['Field Remarks'] ?? payload.remarks)

    return compactPayload({
        ...buildObservationSectionCommonPayload(payload, observationId),
        irrigation_type: toNullableString(payload.irrigation_type),
        water_source: toNullableString(payload.water_source),
        soil_type: toNullableString(payload.soil_type),
        soil_texture: toNullableString(payload.soil_texture),
        soil_ph: toNullableNumber(payload.soil_ph ?? payload.soil_pH),
        soil_pH: toNullableNumber(payload.soil_pH ?? payload.soil_ph),
        ph: toNullableNumber(payload.soil_ph ?? payload.soil_pH),
        pH: toNullableNumber(payload.soil_ph ?? payload.soil_pH),
        tam: tamValue,
        TAM: tamValue,
        tam_mm: tamValue,
        tamm_area: toNullableNumber(payload.tamm_area ?? payload.tam_mm ?? payload.tam),
        tam_area: toNullableNumber(payload.tamm_area ?? payload.tam_mm ?? payload.tam),
        soil_sampling_date: toNullableDateValue(payload.soil_sampling_date),
        soil_test_pdf_url: toNullableString(payload.soil_test_pdf_url),
        soil_test_pdf_path: toNullableString(payload.soil_test_pdf_path),
        organic_matter: toNullableNumber(payload.organic_matter),
        drainage_class: toNullableString(payload.drainage_class),
        'Field Remarks': fieldRemarks,
        field_remarks: fieldRemarks,
        remarks: fieldRemarks,
    })
}

function buildCropProtectionPayload(payload: Record<string, unknown>, observationId: string): Record<string, unknown> {
    const pestRemarks = toNullableString(payload.pest_remarks ?? payload['Pest remarks'] ?? payload['pest remarks'] ?? payload.pest_control ?? payload.crop_pest_remarks)
    const diseaseRemarks = toNullableString(payload.disease_remarks ?? payload['Disease remarks'] ?? payload['disease remarks'] ?? payload.disease_control ?? payload.crop_disease_remarks)

    return compactPayload({
        ...buildObservationSectionCommonPayload(payload, observationId),
        weed_type: toNullableString(payload.weed_type),
        weed_level: toNullableString(payload.weed_level),
        pest_type: toNullableString(payload.pest_type),
        pest_severity: toNullableString(payload.pest_severity),
        disease_type: toNullableString(payload.disease_type),
        disease_severity: toNullableString(payload.disease_severity),
        'Pest remarks': pestRemarks,
        'pest remarks': pestRemarks,
        pest_remarks: pestRemarks,
        pest_control: pestRemarks,
        crop_pest_remarks: pestRemarks,
        pest_comments: pestRemarks,
        pest_comment: pestRemarks,
        pest_notes: pestRemarks,
        pest_note: pestRemarks,
        'Disease remarks': diseaseRemarks,
        'disease remarks': diseaseRemarks,
        disease_remarks: diseaseRemarks,
        disease_control: diseaseRemarks,
        crop_disease_remarks: diseaseRemarks,
        disease_comments: diseaseRemarks,
        disease_comment: diseaseRemarks,
        disease_notes: diseaseRemarks,
        disease_note: diseaseRemarks,
        weed_control: toNullableString(payload.weed_control ?? payload.herbicide_name),
        remarks: toNullableString(payload.remarks ?? payload.field_remarks),
    })
}

function buildResidualManagementPayload(payload: Record<string, unknown>, observationId: string): Record<string, unknown> {
    return compactPayload({
        ...buildObservationSectionCommonPayload(payload, observationId),
        residue_type: toNullableString(payload.residue_type ?? payload.residual_type),
        residual_type: toNullableString(payload.residual_type ?? payload.residue_type),
        residue_management_method: toNullableString(payload.residue_management_method ?? payload.residual_management_method ?? payload.management_method),
        management_method: toNullableString(payload.management_method ?? payload.residue_management_method ?? payload.residual_management_method),
        residual_management_remarks: toNullableString(payload.residual_management_remarks ?? payload.residue_remarks ?? payload.residual_remarks),
        residue_remarks: toNullableString(payload.residue_remarks ?? payload.residual_management_remarks ?? payload.residual_remarks),
        residual_remarks: toNullableString(payload.residual_remarks ?? payload.residual_management_remarks ?? payload.residue_remarks),
        remarks: toNullableString(payload.residual_management_remarks ?? payload.residue_remarks ?? payload.residual_remarks),
    })
}

function buildSugarcaneApplicationCommonPayload(
    payload: Record<string, unknown>,
    observationId: string
): Record<string, unknown> {
    return compactPayload({
        ...buildObservationSectionCommonPayload(payload, observationId),
        date_recorded: toNullableDateValue(payload.date_recorded),
        remarks: firstNonEmptyString(payload.remarks, payload.field_remarks),
    })
}

function buildSugarcaneFertilizerPayloads(
    payload: Record<string, unknown>,
    observationId: string
): Record<string, unknown>[] {
    return normalizeFertilizerApplications(payload.fertilizer_applications, {
        fertilizer_type: payload.fertilizer_type,
        nutrient_application_date: payload.nutrient_application_date ?? payload.fertilizer_application_date,
        application_rate: payload.application_rate,
        foliar_sampling_date: payload.foliar_sampling_date,
    }).map((application, index) => compactPayload({
        ...buildSugarcaneApplicationCommonPayload(payload, observationId),
        loop_number: application.loop_number ?? index + 1,
        fertilizer_type: toNullableString(application.fertilizer_type),
        fertilizer_application_type: toNullableString(application.fertilizer_type),
        application_date: toNullableDateValue(application.application_date),
        nutrient_application_date: toNullableDateValue(application.application_date),
        fertilizer_application_date: toNullableDateValue(application.application_date),
        application_rate: toNullableNumber(application.application_rate),
        foliar_sampling_date: toNullableDateValue(application.foliar_sampling_date),
    }))
}

function buildSugarcaneHerbicidePayloads(
    payload: Record<string, unknown>,
    observationId: string
): Record<string, unknown>[] {
    return normalizeHerbicideApplications(payload.herbicide_applications, {
        herbicide_name: payload.herbicide_name,
        weed_application_date: payload.weed_application_date ?? payload.herbicide_application_date,
        weed_application_rate: payload.weed_application_rate ?? payload.herbicide_application_rate,
    }).map((application, index) => compactPayload({
        ...buildSugarcaneApplicationCommonPayload(payload, observationId),
        loop_number: application.loop_number ?? index + 1,
        herbicide_name: toNullableString(application.herbicide_name),
        herbicide_application_type: toNullableString(application.herbicide_name),
        application_date: toNullableDateValue(application.application_date),
        weed_application_date: toNullableDateValue(application.application_date),
        herbicide_application_date: toNullableDateValue(application.application_date),
        application_rate: toNullableNumber(application.application_rate),
        weed_application_rate: toNullableNumber(application.application_rate),
        herbicide_application_rate: toNullableNumber(application.application_rate),
    }))
}

async function findExistingDatedApplicationRows(
    tableName: string,
    payload: Record<string, unknown>,
    dateColumns: readonly string[]
): Promise<Record<string, unknown>[]> {
    const applicationDate = toNullableDateValue(
        dateColumns
            .map((column) => payload[column])
            .find((value) => toNullableDateValue(value))
    )

    if (!applicationDate) {
        return []
    }

    const observationId = firstNonEmptyString(payload.observation_id)
    const fieldName = firstNonEmptyString(payload.Trial, payload.trial, payload.field_name, payload.field_id)
    const blockId = firstNonEmptyString(payload.block_id)
    const lookups: Array<Array<{ column: string; value: string | number }>> = []

    dateColumns.forEach((dateColumn) => {
        if (observationId) {
            lookups.push([
                { column: 'observation_id', value: observationId },
                { column: dateColumn, value: applicationDate },
            ])
        }

        if (blockId && fieldName) {
            lookups.push([
                { column: 'block_id', value: blockId },
                { column: 'field_name', value: fieldName },
                { column: dateColumn, value: applicationDate },
            ])
            lookups.push([
                { column: 'block_id', value: blockId },
                { column: 'trial', value: fieldName },
                { column: dateColumn, value: applicationDate },
            ])
            lookups.push([
                { column: 'block_id', value: blockId },
                { column: 'Trial', value: fieldName },
                { column: dateColumn, value: applicationDate },
            ])
        }

        if (fieldName) {
            lookups.push([
                { column: 'field_name', value: fieldName },
                { column: dateColumn, value: applicationDate },
            ])
            lookups.push([
                { column: 'trial', value: fieldName },
                { column: dateColumn, value: applicationDate },
            ])
            lookups.push([
                { column: 'Trial', value: fieldName },
                { column: dateColumn, value: applicationDate },
            ])
        }
    })

    for (const filters of lookups) {
        const rows = await runTargetedLookup(tableName, filters, 1)
        if (rows && rows.length > 0) {
            return rows
        }
    }

    return []
}

async function deleteDatedApplicationRows(
    tableName: string,
    payload: Record<string, unknown>,
    application: FertilizerApplication | HerbicideApplication,
    typeColumn: 'fertilizer_type' | 'herbicide_name',
    dateColumns: readonly string[]
): Promise<void> {
    const rowId = toNullableString(application.id)

    if (rowId) {
        await deleteRowsByColumn(tableName, 'id', rowId)
        return
    }

    const applicationDate = toNullableDateValue(application.application_date)
    const applicationType = firstNonEmptyString((application as Record<string, unknown>)[typeColumn])
    const applicationRate = toNullableNumber(application.application_rate)

    if (!applicationDate) {
        return
    }

    const lookupPayload = {
        ...payload,
        [typeColumn]: applicationType,
        application_rate: applicationRate,
        application_date: applicationDate,
        [dateColumns[0]]: applicationDate,
    }
    const rows = await findExistingDatedApplicationRows(tableName, lookupPayload, dateColumns)
    const matchingRows = rows.filter((row) => {
        const rowType = typeColumn === 'fertilizer_type'
            ? firstNonEmptyString(row.fertilizer_application_type, row.fertilizer_type)
            : typeColumn === 'herbicide_name'
            ? firstNonEmptyString(row.herbicide_application_type, row.herbicide_name)
            : firstNonEmptyString(row[typeColumn])
        const rowRate = toNullableNumber(row.application_rate)
        const typeMatches = !applicationType || rowType === applicationType
        const rateMatches = applicationRate == null || rowRate === applicationRate

        return typeMatches && rateMatches
    })
    const rowIds = matchingRows
        .map((row) => toNullableString(row.id))
        .filter((id): id is string => Boolean(id))

    if (rowIds.length > 0) {
        for (const existingRowId of rowIds) {
            await deleteRowsByColumn(tableName, 'id', existingRowId)
        }
        return
    }

    const fieldName = firstNonEmptyString(payload.Trial, payload.trial, payload.field_name, payload.field_id, payload.selected_field)
    const blockId = firstNonEmptyString(payload.block_id)
    const identityColumns = ['field_name', 'trial', 'Trial']

    if (!fieldName) {
        return
    }

    for (const identityColumn of identityColumns) {
        for (const dateColumn of dateColumns) {
            let query = supabase
                .from(tableName)
                .delete()
                .eq(identityColumn, fieldName)
                .eq(dateColumn, applicationDate)

            if (blockId) query = query.eq('block_id', blockId)
            if (applicationType) {
                query = query.eq(
                    typeColumn === 'fertilizer_type'
                        ? 'fertilizer_application_type'
                        : typeColumn === 'herbicide_name'
                        ? 'herbicide_application_type'
                        : typeColumn,
                    applicationType
                )
            }
            if (applicationRate != null) query = query.eq('application_rate', applicationRate)

            const { error } = await query

            if (!error || isMissingRelationError(error) || isMissingColumnError(error)) {
                continue
            }

            throw error
        }
    }
}

export async function deleteObservationFertilizerApplication(
    payload: Record<string, unknown>,
    application: FertilizerApplication
): Promise<void> {
    await deleteDatedApplicationRows(
        SUGARCANE_FERTILIZER_TABLE_NAME,
        payload,
        application,
        'fertilizer_type',
        ['application_date', 'nutrient_application_date', 'fertilizer_application_date']
    )
}

export async function deleteObservationHerbicideApplication(
    payload: Record<string, unknown>,
    application: HerbicideApplication
): Promise<void> {
    await deleteDatedApplicationRows(
        SUGARCANE_HERBICIDE_TABLE_NAME,
        payload,
        application,
        'herbicide_name',
        ['application_date', 'weed_application_date', 'herbicide_application_date']
    )
}

function buildFastLookupValues(payload: Record<string, unknown>): {
    observationId: string | null
    fieldName: string | null
    blockId: string | null
    loopNumber: number | null
} {
    return {
        observationId: firstNonEmptyString(payload.observation_id) ?? null,
        fieldName: firstNonEmptyString(payload.Trial, payload.trial, payload.field_name, payload.selected_field) ?? null,
        blockId: firstNonEmptyString(payload.block_id) ?? null,
        loopNumber: toNullableNumber(payload.loop_number) ?? null,
    }
}

async function saveSugarcaneObservationThreeTables(
    payload: Record<string, unknown>
): Promise<void> {
    const droppedColumns: string[] = []
    const observationId = firstNonEmptyString(payload.observation_id) ?? createClientUuid()

    try {
        const sectionSaves = [
            saveNormalizedRowToAvailableTables(
                CONTACT_PERSON_INFORMATION_TABLE_NAMES,
                buildContactPersonInformationPayload(payload, observationId)
            ),
            saveNormalizedRowToAvailableTables(
                CROP_PROTECTION_TABLE_NAMES,
                buildCropProtectionPayload(payload, observationId)
            ),
            saveNormalizedRowToAvailableTables(
                CROP_INFORMATION_TABLE_NAMES,
                buildCropInformationPayload(payload, observationId)
            ),
            saveNormalizedRowToAvailableTables(
                FOLIAR_SAMPLING_TABLE_NAMES,
                buildFoliarSamplingPayload(payload, observationId)
            ),
            saveNormalizedRowToAvailableTables(
                IMPORTANT_DATES_TABLE_NAMES,
                buildImportantDatesPayload(payload, observationId)
            ),
            saveNormalizedRowToAvailableTables(
                RESIDUAL_MANAGEMENT_TABLE_NAMES,
                buildResidualManagementPayload(payload, observationId)
            ),
            saveNormalizedRowToAvailableTables(
                SOIL_PROPERTIES_TABLE_NAMES,
                buildSoilPropertiesPayload(payload, observationId)
            ),
            ...buildSugarcaneFertilizerPayloads(payload, observationId).map((fertilizerPayload) =>
                insertDatedApplicationRowWithoutUpdating(
                    SUGARCANE_FERTILIZER_TABLE_NAME,
                    fertilizerPayload,
                    ['application_date', 'nutrient_application_date', 'fertilizer_application_date']
                )
            ),
            ...buildSugarcaneHerbicidePayloads(payload, observationId).map((herbicidePayload) =>
                insertDatedApplicationRowWithoutUpdating(
                    SUGARCANE_HERBICIDE_TABLE_NAME,
                    herbicidePayload,
                    ['application_date', 'weed_application_date', 'herbicide_application_date']
                )
            ),
        ]

        const results = await Promise.all(sectionSaves)
        results.flat().forEach((result) => droppedColumns.push(...result.droppedColumns))
    } catch (error) {
        if (isDuplicateUniqueConstraintError(error)) {
            throw buildMultipleEntryConstraintError(error)
        }

        throw error
    }

    const omittedColumns = droppedColumns
    if (omittedColumns.length > 0) {
        console.warn(
            'Persisted observation section rows after omitting unsupported columns from the live schema:',
            omittedColumns
        )
    }
}

async function saveObservationReadbackRow(
    payload: Record<string, unknown>
): Promise<void> {
    try {
        await saveNormalizedRowToAvailableTables(
            OBSERVATION_READBACK_TABLE_NAMES,
            compactPayload({
                observation_id: payload.observation_id,
                client_uuid: payload.client_uuid ?? payload.observation_id,
                Trial: payload.Trial,
                trial: payload.trial,
                field_name: payload.field_name,
                field_id: payload.field_id,
                selected_field: payload.selected_field,
                section_name: payload.section_name,
                block_id: payload.block_id,
                collector_id: payload.collector_id,
                latitude: payload.latitude,
                longitude: payload.longitude,
                area: payload.area,
                Area: payload.Area,
                irrigation_type: payload.irrigation_type,
                water_source: payload.water_source,
                tam: payload.tam,
                TAM: payload.tam,
                tam_mm: payload.tam_mm ?? payload.tam,
                tamm_area: payload.tamm_area ?? payload.tam,
                soil_type: payload.soil_type,
                soil_ph: payload.soil_ph,
                soil_pH: payload.soil_pH ?? payload.soil_ph,
                remarks: payload.remarks ?? payload.field_remarks,
                field_remarks: payload.field_remarks ?? payload.remarks,
                'Field Remarks': payload['Field Remarks'] ?? payload.field_remarks ?? payload.remarks,
                soil_sampling_date: payload.soil_sampling_date,
                soil_test_pdf_url: payload.soil_test_pdf_url,
                soil_test_pdf_path: payload.soil_test_pdf_path,
                date_recorded: payload.date_recorded,
                contact_date_recorded: payload.contact_date_recorded ?? payload.date_recorded,
                trial_number: payload.trial_number,
                contact_trial_number: payload.contact_trial_number ?? payload.trial_number,
                trial_name: payload.trial_name,
                contact_trial_name: payload.contact_trial_name ?? payload.trial_name,
                contact_person: payload.contact_person,
                contact_person_scientist: payload.contact_person_scientist ?? payload.contact_person,
                crop_type: payload.crop_type,
                'Crop Type': payload['Crop Type'] ?? payload.crop_type,
                crop_class: payload.crop_class,
                'Crop Class': payload['Crop Class'] ?? payload.crop_class,
                ratoon_number: payload.ratoon_number ?? payload.ratoon,
                ratoon: payload.ratoon ?? payload.ratoon_number,
                foliar_sampling_date: payload.foliar_sampling_date,
                foliar_analysis_pdf_url: payload.foliar_analysis_pdf_url,
                foliar_analysis_pdf_path: payload.foliar_analysis_pdf_path,
                final_eldana_survey_pdf_url: payload.final_eldana_survey_pdf_url,
                final_eldana_survey_pdf_path: payload.final_eldana_survey_pdf_path,
                harvest_date: payload.harvest_date,
                actual_harvest_date: payload.actual_harvest_date ?? payload.harvest_date,
                cane_yield: payload.cane_yield ?? payload.harvest_yield ?? payload.yield,
                harvest_yield: payload.harvest_yield ?? payload.cane_yield ?? payload.yield,
                yield: payload.yield ?? payload.cane_yield ?? payload.harvest_yield,
                quality_remarks: payload.quality_remarks,
                cane_quality_remarks: payload.cane_quality_remarks ?? payload.quality_remarks,
                fertilizer_type: payload.fertilizer_type,
                fertilizer_application_type: payload.fertilizer_type,
                fertilizer_application_date: payload.fertilizer_application_date ?? payload.nutrient_application_date ?? payload.application_date,
                nutrient_application_date: payload.nutrient_application_date ?? payload.fertilizer_application_date ?? payload.application_date,
                application_date: payload.application_date ?? payload.nutrient_application_date ?? payload.fertilizer_application_date,
                application_rate: payload.application_rate,
                herbicide_name: payload.herbicide_name,
                herbicide_application_type: payload.herbicide_name,
                herbicide_application_date: payload.herbicide_application_date ?? payload.weed_application_date,
                weed_application_date: payload.weed_application_date ?? payload.herbicide_application_date,
                herbicide_application_rate: payload.herbicide_application_rate ?? payload.weed_application_rate,
                weed_application_rate: payload.weed_application_rate ?? payload.herbicide_application_rate,
                pest_control: payload.pest_control ?? payload.pest_remarks,
                pest_remarks: payload.pest_remarks ?? payload.pest_control,
                'pest remarks': payload.pest_remarks ?? payload.pest_control,
                'Pest remarks': payload.pest_remarks ?? payload.pest_control,
                'Pest Remarks': payload.pest_remarks ?? payload.pest_control,
                crop_pest_remarks: payload.crop_pest_remarks ?? payload.pest_remarks ?? payload.pest_control,
                disease_control: payload.disease_control ?? payload.disease_remarks,
                disease_remarks: payload.disease_remarks ?? payload.disease_control,
                'disease remarks': payload.disease_remarks ?? payload.disease_control,
                'Disease remarks': payload.disease_remarks ?? payload.disease_control,
                'Disease Remarks': payload.disease_remarks ?? payload.disease_control,
                crop_disease_remarks: payload.crop_disease_remarks ?? payload.disease_remarks ?? payload.disease_control,
                created_at: payload.created_at,
                updated_at: payload.updated_at,
            })
        )
    } catch (error) {
        console.warn(
            'Observation section data saved, but the optional monitoring readback row could not be synced:',
            error
        )
    }
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

function getRecordTimestamp(row: Record<string, unknown>): number {
    const candidates = [row.updated_at, row.date_recorded, row.created_at]

    for (const candidate of candidates) {
        const time = new Date(String(candidate ?? '')).getTime()
        if (Number.isFinite(time)) {
            return time
        }
    }

    return 0
}

function sameLookupValue(left: unknown, right: unknown): boolean {
    const normalizedLeft = normalizeLookupToken(toNullableString(left))
    const normalizedRight = normalizeLookupToken(toNullableString(right))
    return normalizedLeft !== '' && normalizedLeft === normalizedRight
}

function getObservationYear(row: Record<string, unknown>): string | null {
    const dateValue = normalizeRecordedDateValue(firstNonEmptyString(
        row.date_recorded,
        row.contact_date_recorded,
        row.planting_date,
        row.harvest_date,
        row.actual_harvest_date,
        row.expected_harvest_date,
        row.previous_cutting_date,
        row.previous_cutting,
        row.cutting_date
    ))

    return dateValue?.slice(0, 4) ?? null
}

function getObservationRecordedDate(row: Record<string, unknown>): string | null {
    return normalizeRecordedDateValue(firstNonEmptyString(
        row.date_recorded,
        row.contact_date_recorded,
        row['Date recorded'],
        row['Date Recorded']
    ))
}

function buildTrialIdentityTokens(row: Record<string, unknown>): Set<string> {
    const values = [
        row.Trial,
        row.trial,
        row.field_name,
        row.selected_field,
        row.trial_name,
        row.trial_number,
    ]
        .map((value) => normalizeLookupToken(toNullableString(value)))
        .filter(Boolean)

    return new Set(values)
}

function rowsShareFieldIdentity(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
    const leftTrialTokens = buildTrialIdentityTokens(left)
    const rightTrialTokens = buildTrialIdentityTokens(right)

    return Array.from(leftTrialTokens).some((token) => rightTrialTokens.has(token))
}

function findMatchingRows(
    rows: Record<string, unknown>[],
    payload: Record<string, unknown>,
    extraMatcher?: (row: Record<string, unknown>, payload: Record<string, unknown>) => boolean
): Record<string, unknown>[] {
    return rows.filter((row) => {
        const observationMatch = rowsShareObservationId(row, payload)
        const baseMatch = observationMatch === true || rowsShareFieldIdentity(row, payload)

        if (!baseMatch) {
            return false
        }

        const rowYear = getObservationYear(row)
        const payloadYear = getObservationYear(payload)
        const rowRecordedDate = getObservationRecordedDate(row)
        const payloadRecordedDate = getObservationRecordedDate(payload)

        if (payloadRecordedDate && rowRecordedDate !== payloadRecordedDate) {
            return false
        }

        if (rowYear && payloadYear && rowYear !== payloadYear) {
            return false
        }

        return extraMatcher ? extraMatcher(row, payload) : true
    }).sort((left, right) => getRecordTimestamp(right) - getRecordTimestamp(left))
}

async function findExistingNormalizedRows(
    tableName: string,
    payload: Record<string, unknown>,
    extraMatcher?: (row: Record<string, unknown>, payload: Record<string, unknown>) => boolean
): Promise<Record<string, unknown>[]> {
    const rows = await fetchTargetedExistingRows(tableName, payload)
    return findMatchingRows(rows, payload, extraMatcher)
}

async function runTargetedLookup(
    tableName: string,
    filters: Array<{ column: string; value: string | number }>,
    limit = 8
): Promise<Record<string, unknown>[] | null> {
    if (filters.length === 0) {
        return null
    }

    let query = supabase
        .from(tableName)
        .select('*')
        .limit(limit)

    filters.forEach(({ column, value }) => {
        query = query.eq(column, value)
    })

    const { data, error } = await query

    if (error) {
        if (isMissingRelationError(error) || isMissingColumnError(error)) {
            return null
        }

        throw error
    }

    return (data ?? []).filter((row): row is Record<string, unknown> =>
        Boolean(row) && typeof row === 'object' && !Array.isArray(row)
    )
}

async function fetchTargetedExistingRows(
    tableName: string,
    payload: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
    const { observationId, fieldName, blockId, loopNumber } = buildFastLookupValues(payload)
    const loopFilter = loopNumber == null ? [] : [{ column: 'loop_number', value: loopNumber }]
    const withoutLoopFilter: Array<{ column: string; value: string | number }> = []
    const lookups: Array<Array<{ column: string; value: string | number }>> = []

    if (observationId) {
        lookups.push([{ column: 'observation_id', value: observationId }, ...loopFilter])
        lookups.push([{ column: 'observation_id', value: observationId }, ...withoutLoopFilter])
    }
    if (blockId && fieldName) {
        lookups.push([{ column: 'block_id', value: blockId }, { column: 'field_name', value: fieldName }, ...loopFilter])
        lookups.push([{ column: 'block_id', value: blockId }, { column: 'trial', value: fieldName }, ...loopFilter])
        lookups.push([{ column: 'block_id', value: blockId }, { column: 'Trial', value: fieldName }, ...loopFilter])
        lookups.push([{ column: 'block_id', value: blockId }, { column: 'field_name', value: fieldName }, ...withoutLoopFilter])
        lookups.push([{ column: 'block_id', value: blockId }, { column: 'trial', value: fieldName }, ...withoutLoopFilter])
        lookups.push([{ column: 'block_id', value: blockId }, { column: 'Trial', value: fieldName }, ...withoutLoopFilter])
    }
    if (fieldName) {
        lookups.push([{ column: 'field_name', value: fieldName }, ...loopFilter])
        lookups.push([{ column: 'trial', value: fieldName }, ...loopFilter])
        lookups.push([{ column: 'Trial', value: fieldName }, ...loopFilter])
        lookups.push([{ column: 'field_name', value: fieldName }, ...withoutLoopFilter])
        lookups.push([{ column: 'trial', value: fieldName }, ...withoutLoopFilter])
        lookups.push([{ column: 'Trial', value: fieldName }, ...withoutLoopFilter])
    }

    for (const filters of lookups) {
        const rows = await runTargetedLookup(tableName, filters)
        if (rows && rows.length > 0) {
            return rows
        }
    }

    return []
}

async function updateExistingNormalizedRow(
    tableName: string,
    rowId: string,
    payload: Record<string, unknown>,
    droppedColumns: string[]
): Promise<void> {
    const currentPayload: Record<string, unknown> = buildNonBlankUpdatePayload(payload)
    const attemptedColumnSets = new Set<string>()

    while (Object.keys(currentPayload).length > 0) {
        const columnSignature = Object.keys(currentPayload).sort().join('|')
        if (attemptedColumnSets.has(columnSignature)) {
            break
        }
        attemptedColumnSets.add(columnSignature)

        const { error } = await supabase
            .from(tableName)
            .update(currentPayload)
            .eq('id', rowId)

        if (!error) {
            return
        }

        if (
            isInvalidIdSyntaxError(error) &&
            dropColumnsMatchingInvalidSyntaxValue(currentPayload, error, droppedColumns, tableName)
        ) {
            continue
        }

        if (!isSugarcaneMonitoringSchemaError(error)) {
            throw error
        }

        const missingColumn = extractMissingSugarcaneMonitoringColumn(error)
        if (!missingColumn || !(missingColumn in currentPayload)) {
            throw error
        }

        delete currentPayload[missingColumn]
        droppedColumns.push(`${tableName}.${missingColumn}`)
    }
}

async function updateSugarcaneFieldByTrial(
    payload: Record<string, unknown>,
    droppedColumns: string[]
): Promise<boolean> {
    const trial = firstNonEmptyString(payload.Trial, payload.trial, payload.field_name)

    if (!trial) {
        return false
    }

    const currentPayload: Record<string, unknown> = buildNonBlankUpdatePayload({
        ...payload,
        Trial: trial,
        trial,
        field_name: firstNonEmptyString(payload.field_name, trial),
    })
    const attemptedColumnSets = new Set<string>()

    while (Object.keys(currentPayload).length > 0) {
        const columnSignature = Object.keys(currentPayload).sort().join('|')
        if (attemptedColumnSets.has(columnSignature)) {
            break
        }
        attemptedColumnSets.add(columnSignature)

        const { data, error } = await supabase
            .from(SUGARCANE_FIELD_TABLE_NAME)
            .update(currentPayload)
            .eq('Trial', trial)
            .select('Trial')

        if (!error) {
            return Array.isArray(data) && data.length > 0
        }

        if (
            isInvalidIdSyntaxError(error) &&
            dropColumnsMatchingInvalidSyntaxValue(currentPayload, error, droppedColumns, SUGARCANE_FIELD_TABLE_NAME)
        ) {
            continue
        }

        if (!isSugarcaneMonitoringSchemaError(error)) {
            throw error
        }

        const missingColumn = extractMissingSugarcaneMonitoringColumn(error)
        if (!missingColumn || !(missingColumn in currentPayload)) {
            throw error
        }

        delete currentPayload[missingColumn]
        droppedColumns.push(`${SUGARCANE_FIELD_TABLE_NAME}.${missingColumn}`)
    }

    return false
}

async function upsertSugarcaneFieldByTrial(
    payload: Record<string, unknown>,
    droppedColumns: string[]
): Promise<void> {
    const trial = firstNonEmptyString(payload.Trial, payload.trial, payload.field_name)

    if (!trial) {
        throw new Error('Cannot save sugarcane field because Trial is missing.')
    }

    if (await updateSugarcaneFieldByTrial(payload, droppedColumns)) {
        return
    }

    const currentPayload: Record<string, unknown> = {
        ...payload,
        Trial: trial,
        trial,
        field_name: firstNonEmptyString(payload.field_name, trial),
    }
    const attemptedColumnSets = new Set<string>()

    while (Object.keys(currentPayload).length > 0) {
        const columnSignature = Object.keys(currentPayload).sort().join('|')
        if (attemptedColumnSets.has(columnSignature)) {
            break
        }
        attemptedColumnSets.add(columnSignature)

        const { error } = await supabase
            .from(SUGARCANE_FIELD_TABLE_NAME)
            .upsert(currentPayload, { onConflict: 'Trial' })

        if (!error) {
            return
        }

        if (
            isInvalidIdSyntaxError(error) &&
            dropColumnsMatchingInvalidSyntaxValue(currentPayload, error, droppedColumns, SUGARCANE_FIELD_TABLE_NAME)
        ) {
            continue
        }

        if (!isSugarcaneMonitoringSchemaError(error)) {
            throw error
        }

        const missingColumn = extractMissingSugarcaneMonitoringColumn(error)
        if (!missingColumn || !(missingColumn in currentPayload)) {
            throw error
        }

        delete currentPayload[missingColumn]
        droppedColumns.push(`${SUGARCANE_FIELD_TABLE_NAME}.${missingColumn}`)
    }
}

async function updateNormalizedRowsByLookup(
    tableName: string,
    payload: Record<string, unknown>,
    droppedColumns: string[]
): Promise<boolean> {
    const { observationId, fieldName, blockId, loopNumber } = buildFastLookupValues(payload)
    const loopFilter = loopNumber == null ? [] : [{ column: 'loop_number', value: loopNumber }]
    const lookups: Array<Array<{ column: string; value: string | number }>> = []

    if (observationId) {
        lookups.push([{ column: 'observation_id', value: observationId }, ...loopFilter])
    }

    if (blockId && fieldName) {
        lookups.push([{ column: 'block_id', value: blockId }, { column: 'field_name', value: fieldName }, ...loopFilter])
        lookups.push([{ column: 'block_id', value: blockId }, { column: 'trial', value: fieldName }, ...loopFilter])
        lookups.push([{ column: 'block_id', value: blockId }, { column: 'Trial', value: fieldName }, ...loopFilter])
    }

    if (fieldName) {
        lookups.push([{ column: 'field_name', value: fieldName }, ...loopFilter])
        lookups.push([{ column: 'trial', value: fieldName }, ...loopFilter])
        lookups.push([{ column: 'Trial', value: fieldName }, ...loopFilter])
    }

    for (const filters of lookups) {
        const currentPayload: Record<string, unknown> = buildNonBlankUpdatePayload(payload)
        const attemptedColumnSets = new Set<string>()

        while (Object.keys(currentPayload).length > 0) {
            const columnSignature = Object.keys(currentPayload).sort().join('|')
            if (attemptedColumnSets.has(columnSignature)) {
                break
            }
            attemptedColumnSets.add(columnSignature)

            let query = supabase
                .from(tableName)
                .update(currentPayload)

            filters.forEach(({ column, value }) => {
                query = query.eq(column, value)
            })

            const { data, error } = await query.select('*')

            if (!error) {
                if (Array.isArray(data) && data.length > 0) {
                    return true
                }
                break
            }

            if (
                isInvalidIdSyntaxError(error) &&
                dropColumnsMatchingInvalidSyntaxValue(currentPayload, error, droppedColumns, tableName)
            ) {
                continue
            }

            if (!isSugarcaneMonitoringSchemaError(error)) {
                throw error
            }

            const missingColumn = extractMissingSugarcaneMonitoringColumn(error)
            if (!missingColumn || !(missingColumn in currentPayload)) {
                break
            }

            delete currentPayload[missingColumn]
            droppedColumns.push(`${tableName}.${missingColumn}`)
        }
    }

    return false
}

async function updateSugarcaneApplicationByTrialLoop(
    tableName: string,
    payload: Record<string, unknown>,
    droppedColumns: string[]
): Promise<boolean> {
    const trial = firstNonEmptyString(payload.Trial, payload.trial, payload.field_name)
    const loopNumber = toNullableNumber(payload.loop_number) ?? 1

    if (!trial) {
        return false
    }

    const currentPayload: Record<string, unknown> = buildNonBlankUpdatePayload({
        ...payload,
        Trial: trial,
        trial,
        field_name: firstNonEmptyString(payload.field_name, trial),
        loop_number: loopNumber,
    })
    const attemptedColumnSets = new Set<string>()

    while (Object.keys(currentPayload).length > 0) {
        const columnSignature = Object.keys(currentPayload).sort().join('|')
        if (attemptedColumnSets.has(columnSignature)) {
            break
        }
        attemptedColumnSets.add(columnSignature)

        const applicationDate = toNullableDateValue(currentPayload.application_date)
        const identityColumns = ['Trial', 'trial', 'field_name']
        let lastSchemaError: unknown = null
        let triedIdentityColumn = false

        for (const identityColumn of identityColumns) {
            const identityValue = firstNonEmptyString(currentPayload[identityColumn], trial)
            if (!identityValue) {
                continue
            }

            triedIdentityColumn = true

            let query = supabase
                .from(tableName)
                .update(currentPayload)
                .eq(identityColumn, identityValue)

            if (applicationDate) {
                query = query.eq('application_date', applicationDate)
            } else if ('loop_number' in currentPayload) {
                query = query.eq('loop_number', loopNumber)
            }

            const { data, error } = await query.select(identityColumn)

            if (!error) {
                if (Array.isArray(data) && data.length > 0) {
                    return true
                }
                continue
            }

            if (
                isInvalidIdSyntaxError(error) &&
                dropColumnsMatchingInvalidSyntaxValue(currentPayload, error, droppedColumns, tableName)
            ) {
                lastSchemaError = null
                break
            }

            if (!isSugarcaneMonitoringSchemaError(error)) {
                throw error
            }

            const missingColumn = extractMissingSugarcaneMonitoringColumn(error)
            if (missingColumn && missingColumn in currentPayload) {
                delete currentPayload[missingColumn]
                droppedColumns.push(`${tableName}.${missingColumn}`)
                lastSchemaError = null
                break
            }

            lastSchemaError = error
        }

        if (!triedIdentityColumn || lastSchemaError) {
            return false
        }
    }

    return false
}

async function updateLegacyCropProtectionRemarksByLookup(
    payload: Record<string, unknown>,
    droppedColumns: string[]
): Promise<boolean> {
    const trialCandidates = [
        firstNonEmptyString(payload.trial_number, payload.contact_trial_number),
        firstNonEmptyString(payload.Trial, payload.trial, payload.field_name, payload.field_id),
    ].filter((value): value is string => Boolean(value))
    const blockId = firstNonEmptyString(payload.block_id)
    const pestRemarks = toNullableString(payload.pest_remarks ?? payload['Pest remarks'] ?? payload['pest remarks'] ?? payload.pest_control ?? payload.crop_pest_remarks)
    const diseaseRemarks = toNullableString(payload.disease_remarks ?? payload['Disease remarks'] ?? payload['disease remarks'] ?? payload.disease_control ?? payload.crop_disease_remarks)
    const baseUpdatePayload = compactPayload({
        'Pest remarks': pestRemarks,
        'pest remarks': pestRemarks,
        pest_remarks: pestRemarks,
        pest_control: pestRemarks,
        crop_pest_remarks: pestRemarks,
        'Disease remarks': diseaseRemarks,
        'disease remarks': diseaseRemarks,
        disease_remarks: diseaseRemarks,
        disease_control: diseaseRemarks,
        crop_disease_remarks: diseaseRemarks,
        updated_at: new Date().toISOString(),
    })

    if (Object.keys(baseUpdatePayload).length <= 1) {
        return false
    }

    const lookups: Array<Array<{ column: string; value: string }>> = []
    trialCandidates.forEach((trial) => {
        if (blockId) {
            lookups.push([{ column: 'Trial', value: trial }, { column: 'block_id', value: blockId }])
        }
        lookups.push([{ column: 'Trial', value: trial }])
    })

    for (const filters of lookups) {
        const currentPayload: Record<string, unknown> = { ...baseUpdatePayload }
        const attemptedColumnSets = new Set<string>()

        while (Object.keys(currentPayload).length > 0) {
            const columnSignature = Object.keys(currentPayload).sort().join('|')
            if (attemptedColumnSets.has(columnSignature)) {
                break
            }
            attemptedColumnSets.add(columnSignature)

            let query = supabase
                .from('Crop Protection')
                .update(currentPayload)

            filters.forEach(({ column, value }) => {
                query = query.eq(column, value)
            })

            const { data, error } = await query.select('Trial')

            if (!error) {
                if (Array.isArray(data) && data.length > 0) {
                    return true
                }

                break
            }

            if (isMissingRelationError(error) || isMissingColumnError(error)) {
                break
            }

            if (!isSugarcaneMonitoringSchemaError(error)) {
                throw error
            }

            const missingColumn = extractMissingSugarcaneMonitoringColumn(error)
            if (!missingColumn || !(missingColumn in currentPayload)) {
                break
            }

            delete currentPayload[missingColumn]
            droppedColumns.push(`Crop Protection.${missingColumn}`)
        }
    }

    return false
}

async function saveNormalizedRowWithoutDuplicates(
    tableNames: readonly string[],
    payload: Record<string, unknown>,
    extraMatcher?: (row: Record<string, unknown>, payload: Record<string, unknown>) => boolean
): Promise<{ tableName: string; data: Record<string, unknown> | null; droppedColumns: string[]; operation: 'insert' | 'update' }> {
    const droppedColumns: string[] = []
    let lastError: unknown = null

    for (const tableName of tableNames) {
        if (tableName === 'Crop Protection') {
            const updatedLegacyCropProtection = await updateLegacyCropProtectionRemarksByLookup(payload, droppedColumns)
            if (updatedLegacyCropProtection) {
                return {
                    tableName,
                    data: null,
                    droppedColumns,
                    operation: 'update',
                }
            }
        }

        if (tableName === SUGARCANE_FIELD_TABLE_NAME) {
            await upsertSugarcaneFieldByTrial(payload, droppedColumns)
            return {
                tableName,
                data: null,
                droppedColumns,
                operation: 'update',
            }
        }

        if (
            tableName === SUGARCANE_FERTILIZER_TABLE_NAME ||
            tableName === SUGARCANE_HERBICIDE_TABLE_NAME
        ) {
            const updatedExistingApplication = await updateSugarcaneApplicationByTrialLoop(
                tableName,
                payload,
                droppedColumns
            )

            if (updatedExistingApplication) {
                return {
                    tableName,
                    data: null,
                    droppedColumns,
                    operation: 'update',
                }
            }
        }

        const existingRows = await findExistingNormalizedRows(tableName, payload, extraMatcher)
        const existingRowIds = existingRows
            .map((row) => toNullableString(row.id))
            .filter((id): id is string => Boolean(id))
        const currentPayload: Record<string, unknown> = { ...payload }

        if (existingRowIds.length > 0) {
            for (const existingRowId of existingRowIds) {
                await updateExistingNormalizedRow(tableName, existingRowId, currentPayload, droppedColumns)
            }

            return {
                tableName,
                data: existingRows[0] ?? null,
                droppedColumns,
                operation: 'update',
            }
        }

        if (existingRows.length > 0) {
            const updatedByLookup = await updateNormalizedRowsByLookup(tableName, currentPayload, droppedColumns)

            if (updatedByLookup) {
                return {
                    tableName,
                    data: existingRows[0] ?? null,
                    droppedColumns,
                    operation: 'update',
                }
            }
        }

        const attemptedColumnSets = new Set<string>()

        while (Object.keys(currentPayload).length > 0) {
            const columnSignature = Object.keys(currentPayload).sort().join('|')
            if (attemptedColumnSets.has(columnSignature)) {
                break
            }
            attemptedColumnSets.add(columnSignature)

            const result = await supabase
                .from(tableName)
                .insert(currentPayload)

            if (!result.error) {
                return {
                    tableName,
                    data: null,
                    droppedColumns,
                    operation: 'insert',
                }
            }

            lastError = result.error

            if (isMissingRelationError(result.error)) {
                break
            }

            if (isDuplicateUniqueConstraintError(result.error)) {
                const updatedByLookup = await updateNormalizedRowsByLookup(tableName, currentPayload, droppedColumns)

                if (updatedByLookup) {
                    return {
                        tableName,
                        data: null,
                        droppedColumns,
                        operation: 'update',
                    }
                }

                const conflictingRows = await findExistingNormalizedRows(tableName, currentPayload, extraMatcher)
                const conflictingRowIds = conflictingRows
                    .map((row) => toNullableString(row.id))
                    .filter((id): id is string => Boolean(id))

                if (conflictingRowIds.length > 0) {
                    for (const conflictingRowId of conflictingRowIds) {
                        await updateExistingNormalizedRow(tableName, conflictingRowId, currentPayload, droppedColumns)
                    }
                    return {
                        tableName,
                        data: conflictingRows[0] ?? null,
                        droppedColumns,
                        operation: 'update',
                    }
                }

                return {
                    tableName,
                    data: conflictingRows[0] ?? null,
                    droppedColumns,
                    operation: 'update',
                }
            }

            if (
                isInvalidIdSyntaxError(result.error) &&
                dropColumnsMatchingInvalidSyntaxValue(currentPayload, result.error, droppedColumns, tableName)
            ) {
                lastError = null
                continue
            }

            if (!isSugarcaneMonitoringSchemaError(result.error)) {
                throw result.error
            }

            const missingColumn = extractMissingSugarcaneMonitoringColumn(result.error)
            if (!missingColumn || !(missingColumn in currentPayload)) {
                throw result.error
            }

            delete currentPayload[missingColumn]
            droppedColumns.push(`${tableName}.${missingColumn}`)
        }
    }

    throw lastError ?? new Error(`None of these tables are available: ${tableNames.join(', ')}`)
}

async function saveNormalizedRowToAvailableTables(
    tableNames: readonly string[],
    payload: Record<string, unknown>,
    extraMatcher?: (row: Record<string, unknown>, payload: Record<string, unknown>) => boolean
): Promise<Array<{ tableName: string; data: Record<string, unknown> | null; droppedColumns: string[]; operation: 'insert' | 'update' }>> {
    const results: Array<{ tableName: string; data: Record<string, unknown> | null; droppedColumns: string[]; operation: 'insert' | 'update' }> = []
    const skippedErrors: string[] = []

    for (const tableName of tableNames) {
        try {
            results.push(await saveNormalizedRowWithoutDuplicates([tableName], payload, extraMatcher))
        } catch (error) {
            if (isMissingRelationError(error) || isSugarcaneMonitoringSchemaError(error) || isReadOnlyRelationError(error)) {
                skippedErrors.push(`${tableName}: ${String((error as { message?: string })?.message || error)}`)
                continue
            }

            throw error
        }
    }

    if (results.length > 0) {
        if (skippedErrors.length > 0) {
            console.warn(
                'Skipped unavailable observation section tables after saving to another matching table:',
                skippedErrors
            )
        }

        return results
    }

    throw new Error(`None of these tables could save the observation section: ${tableNames.join(', ')}`)
}

async function insertNormalizedRowWithoutUpdating(
    tableName: string,
    payload: Record<string, unknown>
): Promise<{ tableName: string; data: Record<string, unknown> | null; droppedColumns: string[]; operation: 'insert' | 'skipped' }> {
    const droppedColumns: string[] = []
    const currentPayload: Record<string, unknown> = { ...payload }
    const attemptedColumnSets = new Set<string>()

    while (Object.keys(currentPayload).length > 0) {
        const columnSignature = Object.keys(currentPayload).sort().join('|')
        if (attemptedColumnSets.has(columnSignature)) {
            break
        }
        attemptedColumnSets.add(columnSignature)

        const result = await supabase
            .from(tableName)
            .insert(currentPayload)

        if (!result.error) {
            return {
                tableName,
                data: null,
                droppedColumns,
                operation: 'insert',
            }
        }

        if (isDuplicateUniqueConstraintError(result.error)) {
            return {
                tableName,
                data: null,
                droppedColumns,
                operation: 'skipped',
            }
        }

        if (
            isInvalidIdSyntaxError(result.error) &&
            dropColumnsMatchingInvalidSyntaxValue(currentPayload, result.error, droppedColumns, tableName)
        ) {
            continue
        }

        if (!isSugarcaneMonitoringSchemaError(result.error)) {
            throw result.error
        }

        const missingColumn = extractMissingSugarcaneMonitoringColumn(result.error)
        if (!missingColumn || !(missingColumn in currentPayload)) {
            throw result.error
        }

        delete currentPayload[missingColumn]
        droppedColumns.push(`${tableName}.${missingColumn}`)
    }

    return {
        tableName,
        data: null,
        droppedColumns,
        operation: 'skipped',
    }
}

async function insertDatedApplicationRowWithoutUpdating(
    tableName: string,
    payload: Record<string, unknown>,
    dateColumns: readonly string[]
): Promise<{ tableName: string; data: Record<string, unknown> | null; droppedColumns: string[]; operation: 'insert' | 'skipped' }> {
    const existingRows = await findExistingDatedApplicationRows(tableName, payload, dateColumns)

    if (existingRows.length > 0) {
        const existingRow = existingRows[0] ?? null
        const typeColumn = tableName === SUGARCANE_FERTILIZER_TABLE_NAME
            ? 'fertilizer_type'
            : tableName === SUGARCANE_HERBICIDE_TABLE_NAME
            ? 'herbicide_application_type'
            : null
        const incomingType = tableName === SUGARCANE_FERTILIZER_TABLE_NAME
            ? firstNonEmptyString(payload.fertilizer_application_type, payload.fertilizer_type)
            : tableName === SUGARCANE_HERBICIDE_TABLE_NAME
            ? firstNonEmptyString(payload.herbicide_application_type, payload.herbicide_name)
            : typeColumn
            ? firstNonEmptyString(payload[typeColumn])
            : null
        const existingType = tableName === SUGARCANE_FERTILIZER_TABLE_NAME && existingRow
            ? firstNonEmptyString(existingRow.fertilizer_application_type, existingRow.fertilizer_type)
            : tableName === SUGARCANE_HERBICIDE_TABLE_NAME && existingRow
            ? firstNonEmptyString(existingRow.herbicide_application_type, existingRow.herbicide_name)
            : typeColumn && existingRow
            ? firstNonEmptyString(existingRow[typeColumn])
            : null
        const existingRowId = existingRow ? toNullableString(existingRow.id) : null

        if (typeColumn && incomingType && !existingType && existingRowId) {
            const typeUpdatePayload = tableName === SUGARCANE_FERTILIZER_TABLE_NAME
                ? {
                    fertilizer_application_type: incomingType,
                    fertilizer_type: incomingType,
                    updated_at: new Date().toISOString(),
                }
                : tableName === SUGARCANE_HERBICIDE_TABLE_NAME
                ? {
                    herbicide_application_type: incomingType,
                    herbicide_name: incomingType,
                    updated_at: new Date().toISOString(),
                }
                : { [typeColumn]: incomingType, updated_at: new Date().toISOString() }

            await updateExistingNormalizedRow(
                tableName,
                existingRowId,
                typeUpdatePayload,
                []
            )
        }

        return {
            tableName,
            data: existingRow,
            droppedColumns: [],
            operation: 'skipped',
        }
    }

    return insertNormalizedRowWithoutUpdating(tableName, payload)
}

function getRowObservationId(row: Record<string, unknown>): string | null {
    const rawValues = row.raw_values && typeof row.raw_values === 'object' && !Array.isArray(row.raw_values)
        ? row.raw_values as Record<string, unknown>
        : {}

    return firstNonEmptyString(row.observation_id, rawValues.observation_id) ?? null
}

function rowsShareObservationId(left: Record<string, unknown>, right: Record<string, unknown>): boolean | null {
    const leftObservationId = getRowObservationId(left)
    const rightObservationId = getRowObservationId(right)

    if (leftObservationId && rightObservationId) {
        return sameLookupValue(leftObservationId, rightObservationId)
    }

    if (leftObservationId) {
        return sameLookupValue(leftObservationId, right.id)
    }

    if (rightObservationId) {
        return sameLookupValue(rightObservationId, left.id)
    }

    return null
}

function isDuplicateUniqueConstraintError(error: unknown): boolean {
    const code = String((error as { code?: string })?.code || '')
    const message = String((error as { message?: string })?.message || error).toLowerCase()

    return code === '23505' && message.includes('duplicate key value violates unique constraint')
}

function extractUniqueConstraintName(error: unknown): string | null {
    const message = String((error as { message?: string })?.message || error)
    const match = message.match(/unique constraint "([^"]+)"/i)
    return match?.[1] ?? null
}

function buildMultipleEntryConstraintError(error: unknown): Error {
    const constraintName = extractUniqueConstraintName(error)
    const suffix = constraintName ? ` (${constraintName})` : ''

    return new Error(
        `The existing sugarcane field management row could not be updated because the database reported a duplicate key${suffix}. ` +
        'Refresh the field data and save again so the app can update the existing record.'
    )
}

async function fetchRowsFromFirstAvailableTable(tableNames: readonly string[]): Promise<Record<string, unknown>[]> {
    for (const tableName of tableNames) {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')

        if (error) {
            if (isMissingRelationError(error) || isSugarcaneMonitoringSchemaError(error) || isReadOnlyRelationError(error)) {
                continue
            }

            throw error
        }

        return (data ?? []).filter((row): row is Record<string, unknown> =>
            Boolean(row) && typeof row === 'object' && !Array.isArray(row)
        )
    }

    return []
}

function buildObservationMergeKeys(row: Record<string, unknown>): string[] {
    const keys = new Set<string>()
    const observationId = firstNonEmptyString(row.observation_id, row.client_uuid, row.id)
    const fieldName = firstNonEmptyString(row.Trial, row.trial, row.field_name, row.field_id, row.selected_field)
    const blockId = firstNonEmptyString(row.block_id)
    const sectionName = firstNonEmptyString(row.section_name, row.section, row.section_name_id)
    const recordedDate = normalizeRecordedDateValue(firstNonEmptyString(row.date_recorded, row.contact_date_recorded))

    if (observationId) keys.add(`observation:${normalizeLookupToken(observationId)}`)
    if (fieldName && blockId && recordedDate) keys.add(`field-block-date:${normalizeLookupToken(fieldName)}|${normalizeLookupToken(blockId)}|${recordedDate}`)
    if (fieldName && sectionName && blockId && recordedDate) keys.add(`field-section-block-date:${normalizeLookupToken(fieldName)}|${normalizeLookupToken(sectionName)}|${normalizeLookupToken(blockId)}|${recordedDate}`)
    if (fieldName && blockId) keys.add(`field-block:${normalizeLookupToken(fieldName)}|${normalizeLookupToken(blockId)}`)
    if (fieldName) keys.add(`field:${normalizeLookupToken(fieldName)}`)

    return Array.from(keys).filter((key) => key.replace(/^[^:]+:/, '').replace(/\|/g, '').length > 0)
}

function upsertSectionOverlay(
    overlays: Map<string, Record<string, unknown>>,
    sectionRow: Record<string, unknown>,
    overlay: Record<string, unknown>
) {
    const compactOverlay = compactPayload(overlay)
    if (Object.keys(compactOverlay).length === 0) {
        return
    }

    buildObservationMergeKeys(sectionRow).forEach((key) => {
        overlays.set(key, {
            ...(overlays.get(key) ?? {}),
            ...compactOverlay,
        })
    })
}

function mergeSectionOverlaysIntoRows(
    rows: Record<string, unknown>[],
    overlays: Map<string, Record<string, unknown>>
): Record<string, unknown>[] {
    return rows.map((row) => {
        const mergedOverlay = buildObservationMergeKeys(row)
            .reduce<Record<string, unknown>>((current, key) => ({
                ...current,
                ...(overlays.get(key) ?? {}),
            }), {})

        return {
            ...row,
            ...Object.fromEntries(
                Object.entries(mergedOverlay).filter(([, value]) => hasMeaningfulUpdateValue(value))
            ),
        }
    })
}

async function mergeObservationSectionRows(
    rows: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
    if (rows.length === 0) {
        return rows
    }

    const overlays = new Map<string, Record<string, unknown>>()
    const [soilRows, contactRows, cropRows, cropProtectionRows] = await Promise.all([
        fetchRowsFromFirstAvailableTable(SOIL_PROPERTIES_TABLE_NAMES),
        fetchRowsFromFirstAvailableTable(CONTACT_PERSON_INFORMATION_TABLE_NAMES),
        fetchRowsFromFirstAvailableTable(CROP_INFORMATION_TABLE_NAMES),
        fetchRowsFromFirstAvailableTable(CROP_PROTECTION_TABLE_NAMES),
    ])

    soilRows.forEach((row) => upsertSectionOverlay(overlays, row, {
        irrigation_type: row.irrigation_type,
        water_source: row.water_source,
        tam: row.tam ?? row.TAM ?? row.tam_mm ?? row.tamm_area,
        tam_mm: row.tam_mm ?? row.tam ?? row.TAM ?? row.tamm_area,
        tamm_area: row.tamm_area ?? row.tam_area ?? row.tam_mm ?? row.tam,
        soil_type: row.soil_type,
        soil_ph: row.soil_ph ?? row.soil_pH ?? row.ph ?? row.pH,
        soil_pH: row.soil_pH ?? row.soil_ph ?? row.ph ?? row.pH,
        'Field Remarks': row['Field Remarks'] ?? row.field_remarks ?? row.remarks,
        field_remarks: row.field_remarks ?? row['Field Remarks'] ?? row.remarks,
        remarks: row.remarks ?? row['Field Remarks'] ?? row.field_remarks,
    }))

    contactRows.forEach((row) => upsertSectionOverlay(overlays, row, {
        date_recorded: row.date_recorded ?? row.contact_date_recorded ?? row['Date recorded'],
        contact_date_recorded: row.contact_date_recorded ?? row.date_recorded ?? row['Date recorded'],
        'Date recorded': row['Date recorded'] ?? row.date_recorded ?? row.contact_date_recorded,
        trial_number: row.trial_number ?? row.contact_trial_number ?? row['Trial number'],
        contact_trial_number: row.contact_trial_number ?? row.trial_number ?? row['Trial number'],
        'Trial number': row['Trial number'] ?? row.trial_number ?? row.contact_trial_number,
        trial_name: row.trial_name ?? row.contact_trial_name ?? row['Trial name'],
        contact_trial_name: row.contact_trial_name ?? row.trial_name ?? row['Trial name'],
        'Trial name': row['Trial name'] ?? row.trial_name ?? row.contact_trial_name,
        contact_person: row.contact_person ?? row.contact_person_scientist ?? row['Contact person'] ?? row['Contact Person'],
        contact_person_scientist: row.contact_person_scientist ?? row.contact_person ?? row['Contact person'] ?? row['Contact Person'],
        'Contact person': row['Contact person'] ?? row['Contact Person'] ?? row.contact_person ?? row.contact_person_scientist,
        'Contact Person': row['Contact Person'] ?? row['Contact person'] ?? row.contact_person ?? row.contact_person_scientist,
    }))

    cropRows.forEach((row) => upsertSectionOverlay(overlays, row, {
        crop_type: row.crop_type ?? row['Crop Type'],
        'Crop Type': row['Crop Type'] ?? row.crop_type,
        crop_class: row.crop_class ?? row['Crop Class'],
        'Crop Class': row['Crop Class'] ?? row.crop_class,
        ratoon_number: row.ratoon_number ?? row.ratoon,
        ratoon: row.ratoon ?? row.ratoon_number,
        variety: row.variety,
        crop_stage: row.crop_stage,
        stress: row.stress,
    }))

    cropProtectionRows.forEach((row) => upsertSectionOverlay(overlays, row, {
        pest_control: row.pest_control ?? row.pest_remarks ?? row['pest remarks'] ?? row['Pest remarks'] ?? row['Pest Remarks'] ?? row.crop_pest_remarks,
        pest_remarks: row.pest_remarks ?? row['pest remarks'] ?? row['Pest remarks'] ?? row['Pest Remarks'] ?? row.crop_pest_remarks ?? row.pest_control,
        'pest remarks': row['pest remarks'] ?? row['Pest remarks'] ?? row['Pest Remarks'] ?? row.pest_remarks ?? row.crop_pest_remarks ?? row.pest_control,
        'Pest remarks': row['Pest remarks'] ?? row['pest remarks'] ?? row['Pest Remarks'] ?? row.pest_remarks ?? row.crop_pest_remarks ?? row.pest_control,
        crop_pest_remarks: row.crop_pest_remarks ?? row.pest_remarks ?? row.pest_control,
        disease_control: row.disease_control ?? row.disease_remarks ?? row['disease remarks'] ?? row['Disease remarks'] ?? row['Disease Remarks'] ?? row.crop_disease_remarks,
        disease_remarks: row.disease_remarks ?? row['disease remarks'] ?? row['Disease remarks'] ?? row['Disease Remarks'] ?? row.crop_disease_remarks ?? row.disease_control,
        'disease remarks': row['disease remarks'] ?? row['Disease remarks'] ?? row['Disease Remarks'] ?? row.disease_remarks ?? row.crop_disease_remarks ?? row.disease_control,
        'Disease remarks': row['Disease remarks'] ?? row['disease remarks'] ?? row['Disease Remarks'] ?? row.disease_remarks ?? row.crop_disease_remarks ?? row.disease_control,
        crop_disease_remarks: row.crop_disease_remarks ?? row.disease_remarks ?? row.disease_control,
    }))

    return mergeSectionOverlaysIntoRows(rows, overlays)
}

async function fetchSugarcaneThreeTableRows(options?: { includeUndated?: boolean }): Promise<Record<string, unknown>[]> {
    const fieldsResult = await supabase
        .from(SUGARCANE_DASHBOARD_FLAT_TABLE_NAME)
        .select('*')

    if (fieldsResult.error) {
        if (isMissingRelationError(fieldsResult.error) || isSugarcaneMonitoringSchemaError(fieldsResult.error)) return []
        throw fieldsResult.error
    }

    const fieldRows = (fieldsResult.data ?? []).filter((row): row is Record<string, unknown> =>
        Boolean(row) && typeof row === 'object' && !Array.isArray(row)
    )
    const filteredFieldRows = options?.includeUndated
        ? fieldRows
        : fieldRows.filter((row) => firstNonEmptyString(
            row.date_recorded,
            row.contact_date_recorded,
            row.harvest_date,
            row.actual_harvest_date
        ) != null)

    return mergeObservationSectionRows(filteredFieldRows.map((row) => ({
        ...row,
        source_table: SUGARCANE_DASHBOARD_FLAT_TABLE_NAME,
    })))
}

export async function fetchSugarcaneMonitoringRows(
    filters?: ObservationFilters,
    options?: { includeUndated?: boolean }
): Promise<SugarcaneMonitoringRecord[]> {
    const threeTableRows = await fetchSugarcaneThreeTableRows(options)
    let normalizedRows = dedupeSugarcaneMonitoringRows(threeTableRows
        .map((row) => normalizeSugarcaneMonitoringRow(row as Record<string, unknown>))
    )

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

    return normalizedRows.filter(hasCompleteSugarcaneDisplayData)
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
    await deleteRowsByColumn(SUGARCANE_DASHBOARD_FLAT_TABLE_NAME, 'id', _id)
}

function isMissingColumnError(error: unknown): boolean {
    return /column .* does not exist|undefined column|schema cache/i.test(
        String((error as { message?: string })?.message || error)
    )
}

async function deleteRowsByColumn(
    tableName: string,
    columnName: string,
    value: string,
    required = false
): Promise<void> {
    if (!value) {
        return
    }

    const { error } = await supabase
        .from(tableName)
        .delete()
        .eq(columnName, value)

    if (!error) {
        return
    }

    if (!required && (isMissingRelationError(error) || isMissingColumnError(error))) {
        return
    }

    throw error
}

function isMissingRpcFunctionError(error: unknown): boolean {
    return /could not find the function|function .* does not exist|schema cache/i.test(
        String((error as { message?: string })?.message || error)
    )
}

function getDeleteIdentityValues(record: FullObservation | MobileObservationRecord): {
    observationIds: string[]
    rowIds: string[]
    sourceTable?: string
    trial?: string
    blockId?: string
    dateRecorded?: string
} {
    const mobileRecord = 'source_table' in record ? record as MobileObservationRecord : null
    const rawValues = mobileRecord?.monitoring_sheet?.raw_values &&
        typeof mobileRecord.monitoring_sheet.raw_values === 'object' &&
        !Array.isArray(mobileRecord.monitoring_sheet.raw_values)
        ? mobileRecord.monitoring_sheet.raw_values
        : {}
    const observationIds = [
        record.id,
        mobileRecord?.monitoring_sheet?.observation_id,
        mobileRecord?.entry_form?.id,
        rawValues.observation_id,
    ]
        .map((value) => toNullableString(value))
        .filter((value): value is string => Boolean(value))

    const rowIds = [
        record.id,
        mobileRecord?.source_row_id,
        mobileRecord?.monitoring_sheet?.id,
        rawValues.id,
    ]
        .map((value) => toNullableString(value))
        .filter((value): value is string => Boolean(value))

    return {
        observationIds: Array.from(new Set(observationIds)),
        rowIds: Array.from(new Set(rowIds)),
        sourceTable: mobileRecord?.source_table,
        trial: firstNonEmptyString(
            mobileRecord?.monitoring_sheet?.field_name,
            rawValues.Trial,
            rawValues.trial,
            record.field_name
        ),
        blockId: firstNonEmptyString(
            mobileRecord?.monitoring_sheet?.block_id,
            rawValues.block_id,
            record.block_id
        ),
        dateRecorded: normalizeRecordedDateValue(firstNonEmptyString(
            mobileRecord?.monitoring_sheet?.date_recorded,
            rawValues.date_recorded,
            record.date_recorded
        )) ?? undefined,
    }
}

async function deleteSugarcaneRowsByTrialBlockDate(
    tableName: string,
    trial?: string,
    blockId?: string,
    dateRecorded?: string
): Promise<void> {
    if (!trial) {
        return
    }

    for (const columnName of ['Trial', 'trial', 'field_name']) {
        let query = supabase
            .from(tableName)
            .delete()
            .eq(columnName, trial)

        if (blockId) {
            query = query.eq('block_id', blockId)
        }

        if (dateRecorded) {
            query = query.eq('date_recorded', dateRecorded)
        }

        const { error } = await query

        if (!error || isMissingRelationError(error) || isMissingColumnError(error)) {
            continue
        }

        throw error
    }
}

async function deleteSugarcaneObservationRows(
    observationIds: string[],
    rowIds: string[],
    trial?: string,
    blockId?: string,
    dateRecorded?: string
): Promise<void> {
    for (const observationId of observationIds) {
        await deleteRowsByColumn(SUGARCANE_DASHBOARD_FLAT_TABLE_NAME, 'observation_id', observationId)
    }

    for (const rowId of rowIds) {
        await deleteRowsByColumn(SUGARCANE_DASHBOARD_FLAT_TABLE_NAME, 'id', rowId)
    }

    await deleteSugarcaneRowsByTrialBlockDate(SUGARCANE_DASHBOARD_FLAT_TABLE_NAME, trial, blockId, dateRecorded)
}

async function deleteViaSuperuserRpc(observationIds: string[], rowIds: string[]): Promise<boolean> {
    if (areSugarcaneSplitTablesDisconnected()) {
        void observationIds
        void rowIds
        return false
    }

    const { error } = await supabase.rpc('delete_sugarcane_entry_records', {
        p_observation_ids: observationIds,
        p_row_ids: rowIds,
    })

    if (!error) {
        return true
    }

    if (isMissingRpcFunctionError(error)) {
        return false
    }

    throw error
}

export async function deleteMobileObservationRecord(record: FullObservation | MobileObservationRecord): Promise<void> {
    const { observationIds, rowIds, sourceTable, trial, blockId, dateRecorded } = getDeleteIdentityValues(record)
    const didDeleteViaRpc = await deleteViaSuperuserRpc(observationIds, rowIds)

    if (didDeleteViaRpc) {
        return
    }

    await deleteSugarcaneObservationRows(observationIds, rowIds, trial, blockId, dateRecorded)

    const normalizedTables = [
        'images',
        'residual_management',
        ...NORMALIZED_HARVEST_TABLE_NAMES,
        'control_methods',
        'crop_protection',
        'nutrient_management',
        'irrigation_management',
        'soil_characteristics',
        'crop_monitoring',
        'crop_information',
    ]

    for (const observationId of observationIds) {
        for (const tableName of normalizedTables) {
            await deleteRowsByColumn(tableName, 'observation_id', observationId)
        }
    }

    for (const observationId of observationIds) {
        await deleteRowsByColumn(LEGACY_MONITORING_TABLE_NAME, 'observation_id', observationId)
    }

    if (sourceTable === LEGACY_MONITORING_TABLE_NAME) {
        const targetTable = LEGACY_MONITORING_TABLE_NAME
        for (const rowId of rowIds) {
            await deleteRowsByColumn(targetTable, 'id', rowId)
        }
    }
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

function isPdfFile(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

async function uploadPdfToStorage(bucket: string, file: File, fieldKey: string): Promise<string> {
    if (!isPdfFile(file)) {
        throw new Error('Only PDF files can be uploaded.')
    }

    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${fieldKey}/${timestamp}_${safeName}`

    const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { contentType: 'application/pdf', upsert: false })

    if (error) {
        throw new Error(`PDF upload failed: ${error.message}`)
    }

    return path
}

export async function uploadSoilTestPdf(file: File, fieldKey: string): Promise<string> {
    return uploadPdfToStorage('soil-test-pdfs', file, fieldKey)
}

export async function uploadFoliarAnalysisPdf(file: File, fieldKey: string): Promise<string> {
    return uploadPdfToStorage('foliar-analysis-pdfs', file, fieldKey)
}

export async function uploadFinalEldanaSurveyPdf(file: File, fieldKey: string): Promise<string> {
    return uploadPdfToStorage('final-eldana-survey-pdfs', file, fieldKey)
}

export async function createObservationEntryFormSubmission(
    submission: ObservationEntryFormSubmissionInput,
    predefinedFields?: PredefinedField[],
    options: CreateObservationEntryFormSubmissionOptions = {}
): Promise<ObservationEntryForm> {
    const { submission: resolvedSubmission, linkedField } = await resolveObservationEntrySubmission(submission, predefinedFields)
    const targetRowId = options.forceNewFieldRow
        ? null
        : options.allowExistingRowOverwrite
        ? linkedField?.id ?? null
        : null
    const writableTargetRowId = toNumericIdString(targetRowId)

    const payload: Record<string, unknown> = buildSugarcaneFieldManagementPayload(resolvedSubmission)
    const fieldPayload = buildSugarcaneFieldPayload(payload)
    const observationId = firstNonEmptyString(payload.observation_id) ?? buildStableObservationId(payload)
    const threeTablePayload = {
        ...payload,
        observation_id: observationId,
    }

    const data: Record<string, unknown> = {
        ...fieldPayload,
        id: writableTargetRowId ?? null,
        observation_id: observationId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }
    await saveSugarcaneObservationThreeTables(threeTablePayload)
    await saveObservationReadbackRow({
        ...threeTablePayload,
        created_at: data.created_at,
        updated_at: data.updated_at,
    })

    return mapSugarcaneMonitoringRowToEntryForm(
        normalizeSugarcaneMonitoringRow({
            ...data,
            fertilizer_applications: payload.fertilizer_applications,
            herbicide_applications: payload.herbicide_applications,
        }),
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
