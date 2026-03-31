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
import type { SugarcaneMonitoringRecord } from '@/types/database.types'
import { formatDateOnlyLabel } from '@/utils/dateOnly'
import { buildObservationCalendarSearch } from '@/utils/farmingCalendarLinks'

interface ObservationEntryDataTableProps {
    records: SugarcaneMonitoringRecord[]
    maxRows?: number
    emptyMessage?: string
}

interface SugarcaneMonitoringSheetColumn {
    key: string
    label: string
    minWidth?: number
    wrap?: boolean
    calendarAnchor?: 'planting' | 'cutting'
    getValue: (record: SugarcaneMonitoringRecord) => string
}

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

function isHttpUrl(value: string) {
    return /^https?:\/\//i.test(value)
}

export const SUGARCANE_MONITORING_SHEET_COLUMNS: SugarcaneMonitoringSheetColumn[] = [
    { key: 'field_id', label: 'Trial', minWidth: 180, wrap: true, getValue: (record) => formatTextValue(record.field_id) },
    { key: 'block_id', label: 'block_id', minWidth: 140, getValue: (record) => formatTextValue(record.block_id) },
    { key: 'area', label: 'area', minWidth: 110, getValue: (record) => formatNumericValue(record.area) },
    { key: 'irrigation_type', label: 'irrigation_type', minWidth: 160, getValue: (record) => formatTextValue(record.irrigation_type) },
    { key: 'water_source', label: 'water_source', minWidth: 150, getValue: (record) => formatTextValue(record.water_source) },
    { key: 'tam_mm', label: 'tam', minWidth: 110, getValue: (record) => formatTextValue(record.tam_mm) },
    { key: 'soil_type', label: 'soil_type', minWidth: 130, getValue: (record) => formatTextValue(record.soil_type) },
    { key: 'soil_ph', label: 'soil_ph', minWidth: 110, getValue: (record) => formatNumericValue(record.soil_ph) },
    { key: 'field_remarks', label: 'remarks', minWidth: 240, wrap: true, getValue: (record) => formatTextValue(record.field_remarks) },
    { key: 'date_recorded', label: 'date_recorded', minWidth: 170, getValue: (record) => formatDateValue(record.date_recorded) },
    { key: 'trial_number', label: 'trial_number', minWidth: 140, getValue: (record) => formatTextValue(record.trial_number) },
    { key: 'trial_name', label: 'trial_name', minWidth: 180, wrap: true, getValue: (record) => formatTextValue(record.trial_name) },
    { key: 'contact_person', label: 'contact_person_scientist', minWidth: 210, wrap: true, getValue: (record) => formatTextValue(record.contact_person) },
    { key: 'crop_type', label: 'crop_type', minWidth: 140, getValue: (record) => formatTextValue(record.crop_type) },
    { key: 'crop_class', label: 'crop_class', minWidth: 150, getValue: (record) => formatTextValue(record.crop_class) },
    { key: 'variety', label: 'variety', minWidth: 150, getValue: (record) => formatTextValue(record.variety) },
    { key: 'planting_date', label: 'planting_date', minWidth: 160, calendarAnchor: 'planting', getValue: (record) => formatDateValue(record.planting_date) },
    { key: 'previous_cutting_date', label: 'cutting_date', minWidth: 190, calendarAnchor: 'cutting', getValue: (record) => formatDateValue(record.previous_cutting_date ?? record.previous_cutting) },
    { key: 'expected_harvest_date', label: 'expected_harvest_date', minWidth: 210, getValue: (record) => formatDateValue(record.expected_harvest_date) },
    { key: 'residue_type', label: 'residue_type', minWidth: 150, getValue: (record) => formatTextValue(record.residue_type) },
    { key: 'residue_management_method', label: 'management_method', minWidth: 240, wrap: true, getValue: (record) => formatTextValue(record.residue_management_method) },
    { key: 'residual_management_remarks', label: 'residue_remarks', minWidth: 240, wrap: true, getValue: (record) => formatTextValue(record.residual_management_remarks) },
    { key: 'fertilizer_type', label: 'fertilizer_type', minWidth: 170, getValue: (record) => formatTextValue(record.fertilizer_type) },
    { key: 'nutrient_application_date', label: 'application_date', minWidth: 190, getValue: (record) => formatDateValue(record.nutrient_application_date ?? record.fertilizer_application_date) },
    { key: 'application_rate', label: 'application_rate', minWidth: 140, getValue: (record) => formatNumericValue(record.application_rate) },
    { key: 'herbicide_name', label: 'herbicide_name', minWidth: 170, getValue: (record) => formatTextValue(record.herbicide_name) },
    { key: 'weed_application_date', label: 'weed_application_date', minWidth: 190, getValue: (record) => formatDateValue(record.weed_application_date) },
    { key: 'weed_application_rate', label: 'weed_application_rate', minWidth: 180, getValue: (record) => formatNumericValue(record.weed_application_rate) },
    { key: 'pest_remarks', label: 'pest_control', minWidth: 220, wrap: true, getValue: (record) => formatTextValue(record.pest_remarks) },
    { key: 'disease_remarks', label: 'disease_control', minWidth: 220, wrap: true, getValue: (record) => formatTextValue(record.disease_remarks) },
    { key: 'harvest_date', label: 'harvest_date', minWidth: 160, getValue: (record) => formatDateValue(record.harvest_date) },
    { key: 'yield', label: 'yield', minWidth: 120, getValue: (record) => formatNumericValue(record.yield) },
    { key: 'quality_remarks', label: 'cane_quality_remarks', minWidth: 220, wrap: true, getValue: (record) => formatTextValue(record.quality_remarks) },
]

export function buildSugarcaneMonitoringSheetRow(record: SugarcaneMonitoringRecord) {
    return Object.fromEntries(
        SUGARCANE_MONITORING_SHEET_COLUMNS.map((column) => [column.key, column.getValue(record)])
    ) as Record<string, string>
}

export function ObservationEntryDataTable({
    records,
    maxRows,
    emptyMessage = 'No monitoring rows match the current filter.',
}: ObservationEntryDataTableProps) {
    const displayedRecords = maxRows ? records.slice(0, maxRows) : records

    if (displayedRecords.length === 0) {
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
            <Table stickyHeader sx={{ minWidth: 9800 }}>
                <TableHead>
                    <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
                        {SUGARCANE_MONITORING_SHEET_COLUMNS.map((column) => (
                            <TableCell key={column.key} sx={{ minWidth: column.minWidth, fontWeight: 700 }}>
                                {column.label}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {displayedRecords.map((record, index) => {
                        const row = buildSugarcaneMonitoringSheetRow(record)
                        const plantingCalendarSearch = buildObservationCalendarSearch(record, 'planting')
                        const cuttingCalendarSearch = buildObservationCalendarSearch(record, 'cutting')

                        return (
                            <TableRow
                                key={record.id}
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
                                {SUGARCANE_MONITORING_SHEET_COLUMNS.map((column) => {
                                    const calendarSearch = column.calendarAnchor === 'planting'
                                        ? plantingCalendarSearch
                                        : column.calendarAnchor === 'cutting'
                                            ? cuttingCalendarSearch
                                            : ''
                                    const value = row[column.key]
                                    const hasCalendarLink = Boolean(calendarSearch) && value !== '-'
                                    const hasUrlLink = column.key === 'image_url' && isHttpUrl(value)

                                    return (
                                        <TableCell
                                            key={`${record.id}-${column.key}-${index}`}
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
                                                    sx={cellTextStyles(column.wrap)}
                                                >
                                                    {value}
                                                </Link>
                                            ) : hasUrlLink ? (
                                                <Link
                                                    href={value}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    underline="hover"
                                                    sx={cellTextStyles(column.wrap)}
                                                >
                                                    {value}
                                                </Link>
                                            ) : (
                                                <Typography variant="body2" sx={cellTextStyles(column.wrap)}>
                                                    {value}
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

function cellTextStyles(wrap?: boolean) {
    return {
        display: 'inline-block',
        fontSize: '0.875rem',
        lineHeight: 1.5,
        fontWeight: 600,
        whiteSpace: wrap ? 'normal' : 'nowrap',
        wordBreak: wrap ? 'break-word' : 'normal',
    }
}
