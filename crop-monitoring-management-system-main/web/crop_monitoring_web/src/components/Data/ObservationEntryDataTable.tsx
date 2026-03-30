import {
    Link,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material'
import type { ObservationEntryForm } from '@/types/database.types'
import { formatDateOnlyLabel } from '@/utils/dateOnly'
import { buildObservationCalendarSearch } from '@/utils/farmingCalendarLinks'

interface ObservationEntryDataTableProps {
    forms: ObservationEntryForm[]
    maxRows?: number
    emptyMessage?: string
}

export interface ObservationEntrySheetRow {
    recordId: string
    clientUuid: string
    collectorId: string
    selectedField: string
    fieldName: string
    dateRecorded: string
    fieldId: string
    section: string
    blockId: string
    area: string
    blockSize: string
    boundary: string
    latitude: string
    longitude: string
    gpsAccuracy: string
    irrigationType: string
    waterSource: string
    tam: string
    tamArea: string
    soilType: string
    soilPh: string
    fieldRemarks: string
    trialNumber: string
    trialName: string
    contactPerson: string
    phoneCountryCode: string
    phoneNumber: string
    cropType: string
    cropClass: string
    variety: string
    plantingDate: string
    previousCuttingDate: string
    cuttingDate: string
    expectedHarvestDate: string
    stress: string
    residueType: string
    residueManagementMethod: string
    residueRemarks: string
    fertilizerType: string
    nutrientApplicationDate: string
    applicationRate: string
    fertilizerApplications: string
    foliarSamplingDate: string
    herbicideName: string
    weedApplicationDate: string
    weedApplicationRate: string
    herbicideApplications: string
    pestRemarks: string
    diseaseRemarks: string
    harvestDate: string
    yield: string
    harvestMethod: string
    qualityRemarks: string
    remarks: string
    sourceTable: string
    created: string
    updated: string
}

interface ObservationEntrySheetColumn {
    key: keyof ObservationEntrySheetRow
    label: string
    minWidth?: number
    wrap?: boolean
}

export const OBSERVATION_ENTRY_SHEET_COLUMNS: ObservationEntrySheetColumn[] = [
    { key: 'selectedField', label: 'Selected Field', minWidth: 180, wrap: true },
    { key: 'fieldName', label: 'Field Name', minWidth: 180, wrap: true },
    { key: 'fieldId', label: 'Field ID', minWidth: 160, wrap: true },
    { key: 'dateRecorded', label: 'Date Recorded', minWidth: 150 },
    { key: 'section', label: 'Section', minWidth: 150, wrap: true },
    { key: 'blockId', label: 'Block ID', minWidth: 140 },
    { key: 'area', label: 'Area (ha)', minWidth: 110 },
    { key: 'blockSize', label: 'Block Size (ha)', minWidth: 130 },
    { key: 'boundary', label: 'Boundary', minWidth: 220, wrap: true },
    { key: 'latitude', label: 'Latitude', minWidth: 130 },
    { key: 'longitude', label: 'Longitude', minWidth: 130 },
    { key: 'gpsAccuracy', label: 'GPS Accuracy', minWidth: 130 },
    { key: 'irrigationType', label: 'Irrigation Type', minWidth: 150 },
    { key: 'waterSource', label: 'Water Source', minWidth: 150 },
    { key: 'tam', label: 'TAM (mm)', minWidth: 110 },
    { key: 'tamArea', label: 'TAM Area', minWidth: 120 },
    { key: 'soilType', label: 'Soil Type', minWidth: 130 },
    { key: 'soilPh', label: 'Soil pH', minWidth: 110 },
    { key: 'fieldRemarks', label: 'Field Remarks', minWidth: 230, wrap: true },
    { key: 'trialNumber', label: 'Trial Number', minWidth: 130 },
    { key: 'trialName', label: 'Trial Name', minWidth: 180, wrap: true },
    { key: 'contactPerson', label: 'Contact Person', minWidth: 180, wrap: true },
    { key: 'phoneCountryCode', label: 'Phone Code', minWidth: 120 },
    { key: 'phoneNumber', label: 'Phone Number', minWidth: 150 },
    { key: 'cropType', label: 'Crop Type', minWidth: 140 },
    { key: 'cropClass', label: 'Crop Class', minWidth: 150 },
    { key: 'variety', label: 'Variety', minWidth: 160, wrap: true },
    { key: 'plantingDate', label: 'Planting Date', minWidth: 150 },
    { key: 'previousCuttingDate', label: 'Previous Cutting Date', minWidth: 180 },
    { key: 'cuttingDate', label: 'Cutting Date', minWidth: 150 },
    { key: 'expectedHarvestDate', label: 'Expected Harvest Date', minWidth: 180 },
    { key: 'stress', label: 'Stress', minWidth: 150, wrap: true },
    { key: 'residueType', label: 'Residue Type', minWidth: 140 },
    { key: 'residueManagementMethod', label: 'Residue Management Method', minWidth: 220, wrap: true },
    { key: 'residueRemarks', label: 'Residue Remarks', minWidth: 230, wrap: true },
    { key: 'fertilizerType', label: 'Fertilizer Type', minWidth: 160 },
    { key: 'nutrientApplicationDate', label: 'Nutrient Application Date', minWidth: 200 },
    { key: 'applicationRate', label: 'Application Rate', minWidth: 140 },
    { key: 'fertilizerApplications', label: 'Fertilizer Applications', minWidth: 280, wrap: true },
    { key: 'foliarSamplingDate', label: 'Foliar Sampling Date', minWidth: 180 },
    { key: 'herbicideName', label: 'Herbicide Name', minWidth: 160 },
    { key: 'weedApplicationDate', label: 'Weed Application Date', minWidth: 180 },
    { key: 'weedApplicationRate', label: 'Weed Application Rate', minWidth: 170 },
    { key: 'herbicideApplications', label: 'Herbicide Applications', minWidth: 280, wrap: true },
    { key: 'pestRemarks', label: 'Pest Remarks', minWidth: 220, wrap: true },
    { key: 'diseaseRemarks', label: 'Disease Remarks', minWidth: 220, wrap: true },
    { key: 'harvestDate', label: 'Harvest Date', minWidth: 150 },
    { key: 'yield', label: 'Yield', minWidth: 120 },
    { key: 'harvestMethod', label: 'Harvest Method', minWidth: 160, wrap: true },
    { key: 'qualityRemarks', label: 'Quality Remarks', minWidth: 220, wrap: true },
    { key: 'remarks', label: 'General Remarks', minWidth: 220, wrap: true },
    { key: 'sourceTable', label: 'Source Table', minWidth: 150 },
    { key: 'created', label: 'Created', minWidth: 180 },
    { key: 'updated', label: 'Updated', minWidth: 180 },
]

function formatTextValue(value?: string | number | null) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? String(value) : '-'
    }

    if (typeof value === 'string') {
        return value.trim() || '-'
    }

    return '-'
}

function formatNumericValue(value?: number | null, maximumFractionDigits = 2) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '-'

    return value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits,
    })
}

function formatCoordinateValue(value?: number | null) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '-'
    return value.toFixed(5)
}

function formatGeometrySummary(value: unknown) {
    if (!value) return '-'

    if (typeof value === 'string') {
        const trimmed = value.trim()
        if (!trimmed) return '-'

        try {
            return formatGeometrySummary(JSON.parse(trimmed))
        } catch {
            return trimmed
        }
    }

    if (typeof value !== 'object') {
        return String(value)
    }

    const geometry = value as {
        type?: string
        coordinates?: unknown[]
        geometry?: unknown
    }

    if (geometry.geometry) {
        return formatGeometrySummary(geometry.geometry)
    }

    const type = geometry.type ?? 'Geometry'
    const coordinates = Array.isArray(geometry.coordinates) ? geometry.coordinates : []

    if (type === 'Polygon') {
        const firstRing = Array.isArray(coordinates[0]) ? coordinates[0] : []
        return `${type} (${firstRing.length} points)`
    }

    if (type === 'MultiPolygon') {
        return `${type} (${coordinates.length} polygons)`
    }

    if (type === 'Point' && Array.isArray(coordinates)) {
        return `${type} (${coordinates.join(', ')})`
    }

    return type
}

function formatApplicationListSummary(
    value: unknown,
    typeKey: 'fertilizer_type' | 'herbicide_name',
    includeFoliar = false
) {
    if (!Array.isArray(value) || value.length === 0) {
        return '-'
    }

    const parts = value
        .filter((item) => typeof item === 'object' && item !== null)
        .map((item, index) => {
            const application = item as Record<string, unknown>
            const values = [
                String(application[typeKey] ?? '').trim(),
                String(application.application_date ?? '').trim(),
                application.application_rate != null ? `Rate ${application.application_rate}` : '',
                includeFoliar && application.foliar_sampling_date
                    ? `Foliar ${String(application.foliar_sampling_date).trim()}`
                    : '',
            ].filter(Boolean)

            return values.length > 0 ? `${index + 1}. ${values.join(' | ')}` : ''
        })
        .filter(Boolean)

    return parts.length > 0 ? parts.join('; ') : '-'
}

function formatDateValue(value?: string | null) {
    if (!value) return '-'

    const dateOnlyLabel = formatDateOnlyLabel(value)
    if (dateOnlyLabel) {
        return dateOnlyLabel
    }

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
        return String(value)
    }

    return parsed.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    })
}

function formatDateTimeValue(value?: string | null) {
    if (!value) return '-'

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
        return formatDateValue(value)
    }

    return parsed.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export function buildObservationEntrySheetRow(form: ObservationEntryForm): ObservationEntrySheetRow {
    return {
        recordId: formatTextValue(form.id),
        clientUuid: formatTextValue(form.client_uuid),
        collectorId: formatTextValue(form.collector_id),
        selectedField: formatTextValue(form.selected_field),
        fieldName: formatTextValue(form.field_name),
        dateRecorded: formatDateValue(form.date_recorded),
        fieldId: formatTextValue(form.field_id),
        section: formatTextValue(form.section_name),
        blockId: formatTextValue(form.block_id),
        area: formatNumericValue(form.area ?? form.block_size),
        blockSize: formatNumericValue(form.block_size ?? form.area),
        boundary: formatGeometrySummary(form.geom_polygon ?? form.spatial_data),
        latitude: formatCoordinateValue(form.latitude),
        longitude: formatCoordinateValue(form.longitude),
        gpsAccuracy: formatNumericValue(form.gps_accuracy, 3),
        irrigationType: formatTextValue(form.irrigation_type),
        waterSource: formatTextValue(form.water_source),
        tam: formatTextValue(form.tam_mm || (form.tamm_area != null ? formatNumericValue(form.tamm_area) : '')),
        tamArea: formatNumericValue(form.tamm_area),
        soilType: formatTextValue(form.soil_type),
        soilPh: formatNumericValue(form.soil_ph),
        fieldRemarks: formatTextValue(form.field_remarks || form.remarks),
        trialNumber: formatTextValue(form.trial_number),
        trialName: formatTextValue(form.trial_name),
        contactPerson: formatTextValue(form.contact_person),
        phoneCountryCode: formatTextValue(form.phone_country_code),
        phoneNumber: formatTextValue(form.phone_number),
        cropType: formatTextValue(form.crop_type),
        cropClass: formatTextValue(form.crop_class),
        variety: formatTextValue(form.variety),
        plantingDate: formatDateValue(form.planting_date),
        previousCuttingDate: formatDateValue(form.previous_cutting_date || form.cutting_date),
        cuttingDate: formatDateValue(form.cutting_date || form.previous_cutting_date),
        expectedHarvestDate: formatDateValue(form.expected_harvest_date),
        stress: formatTextValue(form.stress),
        residueType: formatTextValue(form.residue_type),
        residueManagementMethod: formatTextValue(form.residue_management_method),
        residueRemarks: formatTextValue(form.residual_management_remarks),
        fertilizerType: formatTextValue(form.fertilizer_type),
        nutrientApplicationDate: formatDateValue(form.nutrient_application_date),
        applicationRate: formatNumericValue(form.application_rate),
        fertilizerApplications: formatApplicationListSummary(form.fertilizer_applications, 'fertilizer_type', true),
        foliarSamplingDate: formatDateValue(form.foliar_sampling_date),
        herbicideName: formatTextValue(form.herbicide_name),
        weedApplicationDate: formatDateValue(form.weed_application_date),
        weedApplicationRate: formatNumericValue(form.weed_application_rate),
        herbicideApplications: formatApplicationListSummary(form.herbicide_applications, 'herbicide_name'),
        pestRemarks: formatTextValue(form.pest_remarks),
        diseaseRemarks: formatTextValue(form.disease_remarks),
        harvestDate: formatDateValue(form.harvest_date),
        yield: formatNumericValue(form.yield),
        harvestMethod: formatTextValue(form.harvest_method),
        qualityRemarks: formatTextValue(form.quality_remarks),
        remarks: formatTextValue(form.remarks),
        sourceTable: formatTextValue(form.source_table),
        created: formatDateTimeValue(form.created_at),
        updated: formatDateTimeValue(form.updated_at),
    }
}

export function ObservationEntryDataTable({
    forms,
    maxRows,
    emptyMessage = 'No monitoring rows match the current filter.',
}: ObservationEntryDataTableProps) {
    const displayedForms = maxRows ? forms.slice(0, maxRows) : forms

    if (displayedForms.length === 0) {
        return (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {emptyMessage}
                </Typography>
            </Paper>
        )
    }

    return (
        <TableContainer
            component={Paper}
            sx={{
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                borderRadius: 2,
                overflowX: 'auto',
            }}
        >
            <Table stickyHeader sx={{ minWidth: 8600 }}>
                <TableHead>
                    <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
                        {OBSERVATION_ENTRY_SHEET_COLUMNS.map((column) => (
                            <TableCell key={column.key} sx={{ minWidth: column.minWidth, fontWeight: 700 }}>
                                {column.label}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {displayedForms.map((form, index) => {
                        const row = buildObservationEntrySheetRow(form)
                        const plantingCalendarSearch = buildObservationCalendarSearch(form, 'planting')
                        const cuttingCalendarSearch = buildObservationCalendarSearch(form, 'cutting')

                        return (
                            <TableRow
                                key={form.id}
                                hover
                                sx={{
                                    '&:nth-of-type(even)': {
                                        bgcolor: 'rgba(255,255,255,0.02)',
                                    },
                                    '&:hover': {
                                        bgcolor: 'rgba(255,255,255,0.05)',
                                    },
                                }}
                            >
                                {OBSERVATION_ENTRY_SHEET_COLUMNS.map((column) => {
                                    const calendarSearch = column.key === 'plantingDate'
                                        ? plantingCalendarSearch
                                        : column.key === 'cuttingDate' || column.key === 'previousCuttingDate'
                                            ? cuttingCalendarSearch
                                            : ''
                                    const hasCalendarLink = Boolean(calendarSearch) && row[column.key] !== '-'

                                    return (
                                        <TableCell
                                            key={`${form.id}-${column.key}-${index}`}
                                            sx={{
                                                minWidth: column.minWidth,
                                                verticalAlign: 'top',
                                            }}
                                        >
                                            {hasCalendarLink ? (
                                                <Link
                                                    href={`/calendar?${calendarSearch}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    underline="hover"
                                                    sx={{
                                                        display: 'inline-block',
                                                        fontSize: '0.875rem',
                                                        lineHeight: 1.5,
                                                        fontWeight: 600,
                                                        whiteSpace: column.wrap ? 'normal' : 'nowrap',
                                                        wordBreak: column.wrap ? 'break-word' : 'normal',
                                                    }}
                                                >
                                                    {row[column.key]}
                                                </Link>
                                            ) : (
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        whiteSpace: column.wrap ? 'normal' : 'nowrap',
                                                        wordBreak: column.wrap ? 'break-word' : 'normal',
                                                        lineHeight: 1.5,
                                                    }}
                                                >
                                                    {row[column.key]}
                                                </Typography>
                                            )}
                                        </TableCell>
                                    )
                                })}
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    )
}
