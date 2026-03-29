import { supabase } from '@/lib/supabase'
import type {
    FullObservation,
    Field,
    ObservationEntryForm,
    ObservationFilters,
    SugarcaneMonitoringRecord,
} from '@/types/database.types'
import { HARDCODED_FIELDS, HARDCODED_FIELD_SHAPEFILE } from '@/data/hardcodedFieldShapefile'
import { hasDateOnlyValue, normalizeDateOnlyValue } from '@/utils/dateOnly'

const USE_HARDCODED_FIELD_REGISTRY = false

export interface PredefinedField extends Field {
    id?: string
    geom?: any
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
    foliar_sampling_date?: string
    herbicide_name?: string
    weed_application_date?: string
    weed_application_rate?: number
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
    residue_type?: string
    residue_management_method?: string
    residual_management_remarks?: string
    fertilizer_type?: string
    nutrient_application_date?: string
    application_rate?: number
    foliar_sampling_date?: string
    herbicide_name?: string
    weed_application_date?: string
    weed_application_rate?: number
    pest_remarks?: string
    disease_remarks?: string
    harvest_date?: string
    yield?: number
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

function normalizeLookupToken(value?: string | null): string {
    return (value ?? '').trim().toLowerCase()
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

function requireRecordedDateValue(value: unknown): string {
    const normalized = normalizeRecordedDateValue(value)
    if (!normalized) {
        throw new Error('Date recorded is required and must be a valid date.')
    }

    return normalized
}

function getHardcodedPredefinedFields(): PredefinedField[] {
    return HARDCODED_FIELDS.map((field, idx) => ({
        ...field,
        id: `hardcoded-${idx}`,
        geom: HARDCODED_FIELD_SHAPEFILE.features[idx]?.geometry,
        observation_count: field.observation_count ?? 0,
    }))
}

function mergePredefinedFields(primaryFields: PredefinedField[], secondaryFields: PredefinedField[]): PredefinedField[] {
    const merged = new Map<string, PredefinedField>()

    ;[...primaryFields, ...secondaryFields].forEach((field, index) => {
        const identityKey = buildFieldLookupKey(field.field_name, field.section_name, field.block_id)
        const fallbackKey = normalizeLookupToken(field.field_name) || `field-${index}`
        const key = identityKey !== '||' ? identityKey : fallbackKey

        if (!merged.has(key)) {
            merged.set(key, field)
        }
    })

    return Array.from(merged.values())
        .sort((left, right) => left.field_name.localeCompare(right.field_name, undefined, { sensitivity: 'base' }))
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
    const fieldName = firstNonEmptyString(row.field_name, row.field_id) ?? ''
    const recordedDate = normalizeRecordedDateValue(row.date_recorded) || ''
    const previousCutting = toNullableDateValue(row.previous_cutting ?? row.previous_cutting_date) ?? undefined
    const nutrientApplicationDate = toNullableDateValue(
        row.nutrient_application_date ?? row.fertilizer_application_date ?? row.application_date
    ) ?? undefined
    const weedApplicationDate = toNullableDateValue(row.weed_application_date) ?? undefined
    const harvestDate = toNullableDateValue(row.harvest_date ?? row.actual_cutting_date) ?? undefined

    return {
        id: String(row.id || ''),
        field_name: fieldName,
        field_id: firstNonEmptyString(row.field_id, row.field_name) ?? undefined,
        section_name: toNullableString(row.section_name) ?? undefined,
        block_id: toNullableString(row.block_id) ?? undefined,
        area: firstNumericValue(row.area) ?? undefined,
        geom_polygon: row.geom_polygon ?? row.geometry ?? row.spatial_data ?? undefined,
        latitude: toNullableNumber(row.latitude) ?? undefined,
        longitude: toNullableNumber(row.longitude) ?? undefined,
        date_recorded: recordedDate,
        crop_type: toNullableString(row.crop_type) ?? undefined,
        crop_class: toNullableString(row.crop_class) ?? undefined,
        variety: toNullableString(row.variety) ?? undefined,
        ratoon_number: toNullableNumber(row.ratoon_number) ?? undefined,
        crop_stage: toNullableString(row.crop_stage) ?? undefined,
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
        contact_person: toNullableString(row.contact_person) ?? undefined,
        field_remarks: firstNonEmptyString(row.field_remarks, row.remarks) ?? undefined,
        fertilizer_type: toNullableString(row.fertilizer_type) ?? undefined,
        fertilizer_application_date: nutrientApplicationDate,
        nutrient_application_date: nutrientApplicationDate,
        application_rate: toNullableNumber(row.application_rate) ?? undefined,
        npk_ratio: toNullableString(row.npk_ratio) ?? undefined,
        foliar_sampling_date: toNullableDateValue(row.foliar_sampling_date) ?? undefined,
        herbicide_name: firstNonEmptyString(row.herbicide_name, row.weed_control) ?? undefined,
        weed_application_date: weedApplicationDate,
        weed_application_rate: firstNumericValue(row.weed_application_rate, row.herbicide_application_rate) ?? undefined,
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
        residue_management_method: toNullableString(row.residue_management_method) ?? undefined,
        residual_management_remarks: firstNonEmptyString(row.residual_management_remarks, row.residue_remarks) ?? undefined,
        collector_id: toNullableString(row.collector_id) ?? undefined,
        remarks: firstNonEmptyString(row.remarks, row.field_remarks) ?? undefined,
        image_url: toNullableString(row.image_url) ?? undefined,
        well_known_text: toNullableString(row.well_known_text) ?? undefined,
        created_at: String(row.created_at || ''),
        updated_at: String(row.updated_at || ''),
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
        source_table: 'sugarcane_monitoring',
        source_row_id: row.id,
        monitoring_sheet: row,
    }
}

function mapSugarcaneMonitoringRowToEntryForm(
    row: SugarcaneMonitoringRecord,
    linkedField?: PredefinedField | null
): ObservationEntryForm {
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
        fertilizer_type: row.fertilizer_type || '',
        nutrient_application_date: row.nutrient_application_date || row.fertilizer_application_date || '',
        application_rate: row.application_rate ?? undefined,
        foliar_sampling_date: row.foliar_sampling_date || '',
        herbicide_name: row.herbicide_name || row.weed_control || '',
        weed_application_date: row.weed_application_date || '',
        weed_application_rate: row.weed_application_rate ?? undefined,
        pest_remarks: row.pest_remarks || row.pest_control || '',
        disease_remarks: row.disease_remarks || row.disease_control || '',
        harvest_date: row.harvest_date || '',
        yield: row.harvest_yield ?? row.yield ?? undefined,
        harvest_method: row.harvest_method || '',
        quality_remarks: row.quality_remarks || '',
        remarks: row.field_remarks || row.remarks || '',
        source_table: 'sugarcane_monitoring',
        created_at: row.created_at,
        updated_at: row.updated_at,
    }
}

function buildBaseSugarcaneMonitoringPayload(submission: ObservationEntryFormSubmissionInput) {
    return {
        collector_id: toNullableString(submission.collector_id),
        field_name: toNullableString(submission.field_name || submission.field_id),
        section_name: toNullableString(submission.section_name),
        block_id: toNullableString(submission.block_id),
        latitude: toNullableNumber(submission.latitude),
        longitude: toNullableNumber(submission.longitude),
        date_recorded: requireRecordedDateValue(submission.date_recorded),
        crop_type: toNullableString(submission.crop_type || submission.crop_class) || 'Sugarcane',
        variety: toNullableString(submission.variety),
        planting_date: toNullableDateValue(submission.planting_date),
        expected_harvest_date: toNullableDateValue(submission.expected_harvest_date),
        irrigation_type: toNullableString(submission.irrigation_type),
        water_source: toNullableString(submission.water_source),
        soil_type: toNullableString(submission.soil_type),
        soil_ph: toNullableNumber(submission.soil_ph),
        fertilizer_type: toNullableString(submission.fertilizer_type),
        fertilizer_application_date: toNullableDateValue(submission.nutrient_application_date),
        application_rate: toNullableNumber(submission.application_rate),
        weed_control: toNullableString(submission.herbicide_name),
        pest_control: toNullableString(submission.pest_remarks),
        disease_control: toNullableString(submission.disease_remarks),
        harvest_date: toNullableDateValue(submission.harvest_date),
        yield: toNullableNumber(submission.yield),
        residue_type: toNullableString(submission.residue_type),
        residue_management_method: toNullableString(submission.residue_management_method),
        remarks: toNullableString(submission.remarks || submission.field_remarks),
    }
}

function buildSugarcaneMonitoringPayload(submission: ObservationEntryFormSubmissionInput) {
    return {
        ...buildBaseSugarcaneMonitoringPayload(submission),
        field_id: toNullableString(submission.field_id || submission.field_name),
        area: toNullableNumber(submission.area ?? submission.block_size),
        geom_polygon: submission.geom_polygon ?? submission.spatial_data ?? null,
        trial_number: toNullableString(submission.trial_number),
        trial_name: toNullableString(submission.trial_name),
        contact_person: toNullableString(submission.contact_person),
        crop_class: toNullableString(submission.crop_class),
        previous_cutting: toNullableDateValue(submission.previous_cutting_date || submission.cutting_date),
        tam_mm: toNullableString(submission.tam_mm) || toNullableString(submission.tamm_area),
        field_remarks: toNullableString(submission.remarks || submission.field_remarks),
        residual_management_remarks: toNullableString(submission.residual_management_remarks),
        nutrient_application_date: toNullableDateValue(submission.nutrient_application_date),
        foliar_sampling_date: toNullableDateValue(submission.foliar_sampling_date),
        herbicide_name: toNullableString(submission.herbicide_name),
        weed_application_date: toNullableDateValue(submission.weed_application_date),
        weed_application_rate: toNullableNumber(submission.weed_application_rate),
        pest_remarks: toNullableString(submission.pest_remarks),
        disease_remarks: toNullableString(submission.disease_remarks),
        harvest_yield: toNullableNumber(submission.yield),
        quality_remarks: toNullableString(submission.quality_remarks),
    }
}

export async function fetchPredefinedFields(): Promise<PredefinedField[]> {
    if (USE_HARDCODED_FIELD_REGISTRY) {
        return getHardcodedPredefinedFields()
    }

    try {
        const { data, error } = await supabase
            .from('fields')
            .select(`
                id,
                field_name,
                section_name,
                block_id,
                latitude,
                longitude,
                geom,
                created_at,
                created_by,
                date_recorded,
                is_synced,
                local_updated_at,
                updated_at
            `)
            .order('field_name', { ascending: true })

        if (error) {
            if (isMissingRelationError(error)) {
                return getHardcodedPredefinedFields()
            }
            throw error
        }

        const liveFields = (data ?? []).map((row: any) => ({
            id: row.id,
            field_name: row.field_name,
            section_name: row.section_name,
            block_id: row.block_id,
            latitude: Number(row.latitude) || 0,
            longitude: Number(row.longitude) || 0,
            created_at: row.created_at || undefined,
            created_by: row.created_by || undefined,
            date_recorded: row.date_recorded || undefined,
            is_synced: typeof row.is_synced === 'boolean' ? row.is_synced : undefined,
            local_updated_at: row.local_updated_at || undefined,
            updated_at: row.updated_at || undefined,
            geom: row.geom,
            observation_count: 0,
        }))

        if (liveFields.length === 0) {
            return getHardcodedPredefinedFields()
        }

        return mergePredefinedFields(liveFields, getHardcodedPredefinedFields())
    } catch (error) {
        console.warn('Failed to fetch predefined fields from Supabase, using bundled field registry instead.', error)
        return getHardcodedPredefinedFields()
    }
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

    const { data, error } = await supabase
        .from('fields')
        .insert(payload)
        .select(`
            id,
            field_name,
            section_name,
            block_id,
            latitude,
            longitude,
            geom,
            created_at,
            created_by,
            date_recorded,
            crop_type,
            is_synced,
            local_updated_at,
            updated_at
        `)
        .single()

    if (error) {
        if (isMissingRelationError(error)) {
            throw new Error('The field registry table is not available, so new fields cannot be created yet.')
        }

        throw error
    }

    return {
        id: data.id,
        field_name: data.field_name,
        section_name: data.section_name,
        block_id: data.block_id,
        latitude: Number(data.latitude) || 0,
        longitude: Number(data.longitude) || 0,
        created_at: data.created_at || undefined,
        created_by: data.created_by || undefined,
        date_recorded: data.date_recorded || undefined,
        crop_type: data.crop_type || undefined,
        is_synced: typeof data.is_synced === 'boolean' ? data.is_synced : undefined,
        local_updated_at: data.local_updated_at || undefined,
        updated_at: data.updated_at || undefined,
        geom: data.geom,
        observation_count: 0,
    }
}

export async function fetchLivePredefinedFields(): Promise<PredefinedField[]> {
    const { data, error } = await supabase
        .from('fields')
        .select('*')
        .order('field_name', { ascending: true })

    if (error) {
        if (isMissingRelationError(error)) {
            return []
        }
        throw error
    }

    return (data ?? []).map((row: any) => ({
        id: row.id,
        field_name: row.field_name,
        section_name: row.section_name,
        block_id: row.block_id,
        latitude: Number(row.latitude) || 0,
        longitude: Number(row.longitude) || 0,
        created_at: row.created_at || undefined,
        created_by: row.created_by || undefined,
        date_recorded: row.date_recorded || undefined,
        crop_type: row.crop_type || undefined,
        is_synced: typeof row.is_synced === 'boolean' ? row.is_synced : undefined,
        local_updated_at: row.local_updated_at || undefined,
        updated_at: row.updated_at || undefined,
        geom: row.geom,
        observation_count: 0,
    }))
}

export function getPredefinedFieldByName(
    fields: PredefinedField[],
    fieldName?: string | null
): PredefinedField | null {
    if (!fieldName) return null
    return fields.find((field) => field.field_name === fieldName) ?? null
}

export async function fetchSugarcaneMonitoringRows(filters?: ObservationFilters): Promise<SugarcaneMonitoringRecord[]> {
    let query = supabase
        .from('sugarcane_monitoring')
        .select('*')
        .not('date_recorded', 'is', null)
        .order('date_recorded', { ascending: false })

    if (hasActiveFilterValue(filters?.cropType)) {
        query = query.eq('crop_type', filters.cropType)
    }
    if (hasActiveFilterValue(filters?.variety)) {
        query = query.eq('variety', filters.variety)
    }
    if (hasActiveFilterValue(filters?.fieldName)) {
        query = query.eq('field_name', filters.fieldName)
    }
    if (hasActiveFilterValue(filters?.section)) {
        query = query.eq('section_name', filters.section)
    }
    if (hasActiveFilterValue(filters?.block)) {
        query = query.eq('block_id', filters.block)
    }
    if (filters?.startDate) {
        query = query.gte('date_recorded', filters.startDate)
    }
    if (filters?.endDate) {
        query = query.lte('date_recorded', filters.endDate)
    }
    if (hasActiveFilterValue(filters?.stressLevel)) {
        query = query.eq('stress', filters.stressLevel)
    }

    const { data, error } = await query

    if (error) {
        if (isMissingRelationError(error)) {
            return []
        }
        throw error
    }

    return (data ?? [])
        .map((row) => normalizeSugarcaneMonitoringRow(row as Record<string, unknown>))
        .filter((row) => hasUsableRecordedDate(row.date_recorded))
}

export async function fetchSugarcaneMonitoringObservations(filters?: ObservationFilters): Promise<MobileObservationRecord[]> {
    const rows = await fetchSugarcaneMonitoringRows(filters)
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

export async function fetchObservationEntryForms(): Promise<ObservationEntryForm[]> {
    const registryFields = await fetchPredefinedFields().catch(() => [] as PredefinedField[])
    const lookups = registryFields.length > 0 ? buildFieldLookupMaps(registryFields) : null

    const monitoringRows = await fetchSugarcaneMonitoringRows()
    return monitoringRows.map((row) => {
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

        return mapSugarcaneMonitoringRowToEntryForm(row, linkedField)
    })
}

export async function fetchMobileObservationRecords(): Promise<MobileObservationRecord[]> {
    return fetchSugarcaneMonitoringObservations()
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

export async function updateObservationEntryFormSubmission(
    entryFormId: number | string,
    submission: ObservationEntryFormSubmissionInput,
    predefinedFields?: PredefinedField[]
): Promise<void> {
    const { submission: resolvedSubmission } = await resolveObservationEntrySubmission(submission, predefinedFields)

    if (typeof entryFormId === 'string') {
        const payload = buildSugarcaneMonitoringPayload(resolvedSubmission)
        const fallbackPayload = buildBaseSugarcaneMonitoringPayload(resolvedSubmission)
        const { error } = await supabase
            .from('sugarcane_monitoring')
            .update(payload)
            .eq('id', entryFormId)

        if (error) {
            if (isSugarcaneMonitoringSchemaError(error)) {
                const { error: fallbackError } = await supabase
                    .from('sugarcane_monitoring')
                    .update(fallbackPayload)
                    .eq('id', entryFormId)

                if (fallbackError) {
                    throw fallbackError
                }

                return
            }

            throw error
        }

        return
    }

    const payload = {
        client_uuid: toNullableString(resolvedSubmission.client_uuid),
        collector_id: toNullableString(resolvedSubmission.collector_id),
        selected_field: toNullableString(resolvedSubmission.selected_field || resolvedSubmission.field_name),
        field_name: toNullableString(resolvedSubmission.field_name),
        section_name: toNullableString(resolvedSubmission.section_name),
        block_id: toNullableString(resolvedSubmission.block_id),
        block_size: toNullableNumber(resolvedSubmission.block_size),
        spatial_data: resolvedSubmission.spatial_data ?? null,
        latitude: toNullableNumber(resolvedSubmission.latitude),
        longitude: toNullableNumber(resolvedSubmission.longitude),
        gps_accuracy: toNullableNumber(resolvedSubmission.gps_accuracy),
        date_recorded: toNullableString(resolvedSubmission.date_recorded),
        trial_number: toNullableNumber(resolvedSubmission.trial_number),
        trial_name: toNullableString(resolvedSubmission.trial_name),
        contact_person: toNullableString(resolvedSubmission.contact_person),
        phone_country_code: toNullableString(resolvedSubmission.phone_country_code),
        phone_number: toNullableString(resolvedSubmission.phone_number),
        crop_class: toNullableString(resolvedSubmission.crop_class),
        variety: toNullableString(resolvedSubmission.variety),
        planting_date: toNullableString(resolvedSubmission.planting_date),
        cutting_date: toNullableString(resolvedSubmission.cutting_date),
        expected_harvest_date: toNullableString(resolvedSubmission.expected_harvest_date),
        irrigation_type: toNullableString(resolvedSubmission.irrigation_type),
        water_source: toNullableString(resolvedSubmission.water_source),
        tamm_area: toNullableNumber(resolvedSubmission.tamm_area),
        soil_type: toNullableString(resolvedSubmission.soil_type),
        soil_ph: toNullableNumber(resolvedSubmission.soil_ph),
        remarks: toNullableString(resolvedSubmission.remarks),
    }

    const { error } = await supabase
        .from('observation_entry_form')
        .update(payload)
        .eq('id', entryFormId)

    if (error) {
        throw error
    }
}

export async function createObservationEntryFormSubmission(
    submission: ObservationEntryFormSubmissionInput,
    predefinedFields?: PredefinedField[]
): Promise<ObservationEntryForm> {
    const { submission: resolvedSubmission, linkedField } = await resolveObservationEntrySubmission(submission, predefinedFields)
    const payload = buildSugarcaneMonitoringPayload(resolvedSubmission)
    const fallbackPayload = buildBaseSugarcaneMonitoringPayload(resolvedSubmission)

    let data: Record<string, unknown> | null = null
    let error: any = null

    const primaryResult = await supabase
        .from('sugarcane_monitoring')
        .insert(payload)
        .select('*')
        .single()

    data = primaryResult.data as Record<string, unknown> | null
    error = primaryResult.error

    if (error && isSugarcaneMonitoringSchemaError(error)) {
        const fallbackResult = await supabase
            .from('sugarcane_monitoring')
            .insert(fallbackPayload)
            .select('*')
            .single()

        data = fallbackResult.data as Record<string, unknown> | null
        error = fallbackResult.error
    }

    if (error) {
        throw error
    }

    return mapSugarcaneMonitoringRowToEntryForm(
        normalizeSugarcaneMonitoringRow(data as Record<string, unknown>),
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
