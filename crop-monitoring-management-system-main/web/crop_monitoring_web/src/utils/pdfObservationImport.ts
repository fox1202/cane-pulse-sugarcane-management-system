import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { ObservationEntryFormSubmissionInput, PredefinedField } from '@/services/database.service'
import type { FullObservation } from '@/types/database.types'
import { buildObservationDraft } from '@/utils/observationDraft'
import { normalizeDateOnlyValue } from '@/utils/dateOnly'

GlobalWorkerOptions.workerSrc = pdfWorkerSrc

type ObservationPdfFieldKey =
    | 'date_recorded'
    | 'field_name'
    | 'section_name'
    | 'block_id'
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
    | 'latitude'
    | 'longitude'
    | 'gps_accuracy'

export interface ParsedObservationPdf {
    rawText: string
    extractedFields: Partial<Record<ObservationPdfFieldKey, string>>
    warnings: string[]
}

const FIELD_ALIASES: Record<ObservationPdfFieldKey, string[]> = {
    date_recorded: ['Date Recorded', 'Observation Date', 'Date'],
    field_name: ['Field Name', 'Selected Field', 'Field'],
    section_name: ['Section Name', 'Section'],
    block_id: ['Block ID', 'Block'],
    trial_number: ['Trial Number'],
    trial_name: ['Trial Name'],
    contact_person: ['Contact Person', 'Contact'],
    phone_country_code: ['Phone Country Code', 'Country Code'],
    phone_number: ['Phone Number', 'Contact Number', 'Phone'],
    crop_class: ['Crop Class', 'Crop Type'],
    variety: ['Variety'],
    planting_date: ['Planting Date'],
    cutting_date: ['Cutting Date'],
    expected_harvest_date: ['Expected Harvest Date', 'Expected Harvest'],
    irrigation_type: ['Irrigation Type'],
    water_source: ['Water Source'],
    tamm_area: ['TAMM Area (mm)', 'TAMM Area', 'TAM Area (mm)', 'TAM Area', 'TAM (mm)', 'TAM'],
    soil_type: ['Soil Type'],
    soil_ph: ['Soil pH', 'pH Level', 'pH'],
    remarks: ['Remarks', 'Notes'],
    latitude: ['Latitude'],
    longitude: ['Longitude', 'Longtitude'],
    gps_accuracy: ['GPS Accuracy', 'Accuracy'],
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeWhitespace(value: string): string {
    return value.replace(/\u00A0/g, ' ').replace(/[ \t]+/g, ' ').trim()
}

function isLikelyLabelLine(line: string): boolean {
    const normalized = normalizeWhitespace(line).toLowerCase()
    return Object.values(FIELD_ALIASES)
        .flat()
        .some((alias) => normalized === alias.toLowerCase() || normalized.startsWith(`${alias.toLowerCase()}:`))
}

function extractFieldValue(lines: string[], aliases: string[]): string | undefined {
    for (let index = 0; index < lines.length; index += 1) {
        const line = normalizeWhitespace(lines[index])
        if (!line) continue

        for (const alias of aliases) {
            const aliasPattern = escapeRegExp(alias)
            const inlineMatch = line.match(new RegExp(`^${aliasPattern}\\s*(?:[:\\-]|\\s)\\s*(.+)$`, 'i'))
            if (inlineMatch?.[1]) {
                return normalizeWhitespace(inlineMatch[1])
            }

            if (line.toLowerCase() === alias.toLowerCase()) {
                const nextLine = normalizeWhitespace(lines[index + 1] || '')
                if (nextLine && !isLikelyLabelLine(nextLine)) {
                    return nextLine
                }
            }
        }
    }

    return undefined
}

function normalizeDate(value?: string): string | undefined {
    return normalizeDateOnlyValue(value) || undefined
}

function parseOptionalNumber(value?: string): number | undefined {
    if (!value) return undefined
    const compact = String(value).replace(/\s+/g, '').replace(/[^0-9,.-]/g, '')
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

    const normalized = Number(candidate)
    return Number.isFinite(normalized) ? normalized : undefined
}

function findPredefinedFieldMatch(
    fieldName: string | undefined,
    predefinedFields: PredefinedField[]
): PredefinedField | undefined {
    if (!fieldName) return undefined

    const normalized = fieldName.trim().toLowerCase()
    return predefinedFields.find((field) => field.field_name.trim().toLowerCase() === normalized)
}

export async function extractTextFromPdf(file: File): Promise<string> {
    const data = new Uint8Array(await file.arrayBuffer())
    const pdf = await getDocument({ data }).promise
    const pageTexts: string[] = []

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
            .map((item: any) => ('str' in item ? item.str : ''))
            .join(' ')

        pageTexts.push(normalizeWhitespace(pageText))
    }

    return pageTexts.join('\n').trim()
}

export function parseObservationPdfText(text: string): ParsedObservationPdf {
    const normalizedText = text
        .replace(/\r/g, '\n')
        .replace(/\n{2,}/g, '\n')
        .trim()

    const lines = normalizedText
        .split('\n')
        .flatMap((line) => line.split(/(?=[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*:)/g))
        .map(normalizeWhitespace)
        .filter(Boolean)

    const extractedFields = Object.entries(FIELD_ALIASES).reduce<Partial<Record<ObservationPdfFieldKey, string>>>((acc, [key, aliases]) => {
        const match = extractFieldValue(lines, aliases)
        if (match) {
            acc[key as ObservationPdfFieldKey] = match
        }
        return acc
    }, {})

    const warnings: string[] = []

    if (!normalizedText) {
        warnings.push('No readable text was found in the PDF.')
    } else if (Object.keys(extractedFields).length === 0) {
        warnings.push('The PDF text was read, but no known field labels were detected.')
    }

    return {
        rawText: normalizedText,
        extractedFields,
        warnings,
    }
}

export function buildObservationDraftFromPdf(
    parsed: ParsedObservationPdf,
    collectorId: string,
    predefinedFields: PredefinedField[]
): FullObservation {
    const extractedFieldName = parsed.extractedFields.field_name
    const matchedField = findPredefinedFieldMatch(extractedFieldName, predefinedFields)
    const draft = buildObservationDraft(collectorId, {
        field_name: matchedField?.field_name || extractedFieldName || '',
        section_name: matchedField?.section_name || parsed.extractedFields.section_name || '',
        block_id: matchedField?.block_id || parsed.extractedFields.block_id || '',
        latitude: parseOptionalNumber(parsed.extractedFields.latitude) ?? matchedField?.latitude ?? 0,
        longitude: parseOptionalNumber(parsed.extractedFields.longitude) ?? matchedField?.longitude ?? 0,
        gps_accuracy: parseOptionalNumber(parsed.extractedFields.gps_accuracy) ?? 0,
        date_recorded: normalizeDate(parsed.extractedFields.date_recorded) || '',
        crop_information: {
            crop_type: parsed.extractedFields.crop_class || '',
            variety: parsed.extractedFields.variety || '',
            planting_date: normalizeDate(parsed.extractedFields.planting_date) || '',
            expected_harvest_date: normalizeDate(parsed.extractedFields.expected_harvest_date) || '',
        },
        crop_monitoring: {
            remarks: parsed.extractedFields.remarks || '',
        },
        soil_characteristics: {
            soil_type: parsed.extractedFields.soil_type || '',
            soil_ph: parseOptionalNumber(parsed.extractedFields.soil_ph) ?? 0,
        },
        irrigation_management: {
            irrigation_type: parsed.extractedFields.irrigation_type || '',
            water_source: parsed.extractedFields.water_source || '',
        },
    })

    if (matchedField?.crop_type && !draft.crop_information?.crop_type) {
        draft.crop_information = {
            ...draft.crop_information,
            crop_type: matchedField.crop_type,
        } as typeof draft.crop_information
    }

    return draft
}

export function buildObservationEntrySubmissionFromPdf(
    parsed: ParsedObservationPdf,
    collectorId: string,
    predefinedFields: PredefinedField[]
): ObservationEntryFormSubmissionInput {
    const extractedFieldName = parsed.extractedFields.field_name
    const matchedField = findPredefinedFieldMatch(extractedFieldName, predefinedFields)

    return {
        collector_id: collectorId,
        client_uuid: '',
        selected_field: matchedField?.field_name || extractedFieldName || '',
        field_name: matchedField?.field_name || extractedFieldName || '',
        section_name: matchedField?.section_name || parsed.extractedFields.section_name || '',
        block_id: matchedField?.block_id || parsed.extractedFields.block_id || '',
        latitude: parseOptionalNumber(parsed.extractedFields.latitude) ?? matchedField?.latitude ?? 0,
        longitude: parseOptionalNumber(parsed.extractedFields.longitude) ?? matchedField?.longitude ?? 0,
        gps_accuracy: parseOptionalNumber(parsed.extractedFields.gps_accuracy) ?? 0,
        date_recorded: normalizeDate(parsed.extractedFields.date_recorded) || '',
        trial_number: parsed.extractedFields.trial_number || '',
        trial_name: parsed.extractedFields.trial_name || '',
        contact_person: parsed.extractedFields.contact_person || '',
        phone_country_code: parsed.extractedFields.phone_country_code || '',
        phone_number: parsed.extractedFields.phone_number || '',
        crop_class: parsed.extractedFields.crop_class || matchedField?.crop_type || '',
        variety: parsed.extractedFields.variety || '',
        planting_date: normalizeDate(parsed.extractedFields.planting_date) || '',
        cutting_date: normalizeDate(parsed.extractedFields.cutting_date) || '',
        expected_harvest_date: normalizeDate(parsed.extractedFields.expected_harvest_date) || '',
        irrigation_type: parsed.extractedFields.irrigation_type || '',
        water_source: parsed.extractedFields.water_source || '',
        tamm_area: parseOptionalNumber(parsed.extractedFields.tamm_area) ?? undefined,
        soil_type: parsed.extractedFields.soil_type || '',
        soil_ph: parseOptionalNumber(parsed.extractedFields.soil_ph) ?? undefined,
        remarks: parsed.extractedFields.remarks || '',
    }
}
