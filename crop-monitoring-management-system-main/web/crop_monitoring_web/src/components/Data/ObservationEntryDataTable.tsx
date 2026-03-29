import {
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

interface ObservationEntryDataTableProps {
    forms: ObservationEntryForm[]
    maxRows?: number
    emptyMessage?: string
}

export interface ObservationEntrySheetRow {
    dateRecorded: string
    fieldId: string
    section: string
    blockId: string
    area: string
    irrigationType: string
    waterSource: string
    tam: string
    soilType: string
    soilPh: string
    fieldRemarks: string
    trialNumber: string
    trialName: string
    contactPerson: string
    cropType: string
    cropClass: string
    plantingDate: string
    previousCuttingDate: string
    expectedHarvestDate: string
    stress: string
    residueType: string
    residueManagementMethod: string
    residueRemarks: string
    fertilizerType: string
    nutrientApplicationDate: string
    applicationRate: string
    foliarSamplingDate: string
    herbicideName: string
    weedApplicationDate: string
    weedApplicationRate: string
    pestRemarks: string
    diseaseRemarks: string
    harvestDate: string
    yield: string
    qualityRemarks: string
    created: string
}

interface ObservationEntrySheetColumn {
    key: keyof ObservationEntrySheetRow
    label: string
    minWidth?: number
    wrap?: boolean
}

export const OBSERVATION_ENTRY_SHEET_COLUMNS: ObservationEntrySheetColumn[] = [
    { key: 'dateRecorded', label: 'Date Recorded', minWidth: 150 },
    { key: 'fieldId', label: 'Trials', minWidth: 170 },
    { key: 'blockId', label: 'Block ID', minWidth: 140 },
    { key: 'area', label: 'Area (ha)', minWidth: 110 },
    { key: 'irrigationType', label: 'Irrigation Type', minWidth: 150 },
    { key: 'waterSource', label: 'Water Source', minWidth: 150 },
    { key: 'tam', label: 'TAM (mm)', minWidth: 110 },
    { key: 'soilType', label: 'Soil Type', minWidth: 130 },
    { key: 'soilPh', label: 'Soil pH', minWidth: 110 },
    { key: 'fieldRemarks', label: 'Field Remarks', minWidth: 230, wrap: true },
    { key: 'trialNumber', label: 'Trial Number', minWidth: 130 },
    { key: 'trialName', label: 'Trial Name', minWidth: 180, wrap: true },
    { key: 'contactPerson', label: 'Contact Person', minWidth: 180, wrap: true },
    { key: 'cropType', label: 'Crop Type', minWidth: 140 },
    { key: 'cropClass', label: 'Crop Class', minWidth: 150 },
    { key: 'plantingDate', label: 'Planting Date', minWidth: 150 },
    { key: 'previousCuttingDate', label: 'Previous Cutting Date', minWidth: 180 },
    { key: 'expectedHarvestDate', label: 'Expected Harvest Date', minWidth: 180 },
    { key: 'residueType', label: 'Residue Type', minWidth: 140 },
    { key: 'residueManagementMethod', label: 'Residue Management Method', minWidth: 220, wrap: true },
    { key: 'residueRemarks', label: 'Residue Remarks', minWidth: 230, wrap: true },
    { key: 'fertilizerType', label: 'Fertilizer Type', minWidth: 160 },
    { key: 'nutrientApplicationDate', label: 'Nutrient Application Date', minWidth: 200 },
    { key: 'applicationRate', label: 'Application Rate', minWidth: 140 },
    { key: 'foliarSamplingDate', label: 'Foliar Sampling Date', minWidth: 180 },
    { key: 'herbicideName', label: 'Herbicide Name', minWidth: 160 },
    { key: 'weedApplicationDate', label: 'Weed Application Date', minWidth: 180 },
    { key: 'weedApplicationRate', label: 'Weed Application Rate', minWidth: 170 },
    { key: 'pestRemarks', label: 'Pest Remarks', minWidth: 220, wrap: true },
    { key: 'diseaseRemarks', label: 'Disease Remarks', minWidth: 220, wrap: true },
    { key: 'harvestDate', label: 'Harvest Date', minWidth: 150 },
    { key: 'yield', label: 'Yield', minWidth: 120 },
    { key: 'qualityRemarks', label: 'Quality Remarks', minWidth: 220, wrap: true },
    { key: 'created', label: 'Created', minWidth: 180 },
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
        dateRecorded: formatDateValue(form.date_recorded),
        fieldId: formatTextValue(form.field_name || form.selected_field || form.field_id),
        section: formatTextValue(form.section_name),
        blockId: formatTextValue(form.block_id),
        area: formatNumericValue(form.area ?? form.block_size),
        irrigationType: formatTextValue(form.irrigation_type),
        waterSource: formatTextValue(form.water_source),
        tam: formatTextValue(form.tam_mm || (form.tamm_area != null ? formatNumericValue(form.tamm_area) : '')),
        soilType: formatTextValue(form.soil_type),
        soilPh: formatNumericValue(form.soil_ph),
        fieldRemarks: formatTextValue(form.field_remarks || form.remarks),
        trialNumber: formatTextValue(form.trial_number),
        trialName: formatTextValue(form.trial_name),
        contactPerson: formatTextValue(form.contact_person),
        cropType: formatTextValue(form.crop_type),
        cropClass: formatTextValue(form.crop_class),
        plantingDate: formatDateValue(form.planting_date),
        previousCuttingDate: formatDateValue(form.previous_cutting_date || form.cutting_date),
        expectedHarvestDate: formatDateValue(form.expected_harvest_date),
        stress: formatTextValue(form.stress),
        residueType: formatTextValue(form.residue_type),
        residueManagementMethod: formatTextValue(form.residue_management_method),
        residueRemarks: formatTextValue(form.residual_management_remarks),
        fertilizerType: formatTextValue(form.fertilizer_type),
        nutrientApplicationDate: formatDateValue(form.nutrient_application_date),
        applicationRate: formatNumericValue(form.application_rate),
        foliarSamplingDate: formatDateValue(form.foliar_sampling_date),
        herbicideName: formatTextValue(form.herbicide_name),
        weedApplicationDate: formatDateValue(form.weed_application_date),
        weedApplicationRate: formatNumericValue(form.weed_application_rate),
        pestRemarks: formatTextValue(form.pest_remarks),
        diseaseRemarks: formatTextValue(form.disease_remarks),
        harvestDate: formatDateValue(form.harvest_date),
        yield: formatNumericValue(form.yield),
        qualityRemarks: formatTextValue(form.quality_remarks),
        created: formatDateTimeValue(form.created_at),
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
            <Table stickyHeader sx={{ minWidth: 5600 }}>
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
                                {OBSERVATION_ENTRY_SHEET_COLUMNS.map((column) => (
                                    <TableCell
                                        key={`${form.id}-${column.key}-${index}`}
                                        sx={{
                                            minWidth: column.minWidth,
                                            verticalAlign: 'top',
                                        }}
                                    >
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
                                    </TableCell>
                                ))}
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    )
}
