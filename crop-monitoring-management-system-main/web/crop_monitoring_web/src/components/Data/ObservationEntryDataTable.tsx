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
import { hasCompleteSugarcaneDisplayData } from '@/services/database.service'

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

const EMPTY_CELL_VALUE = '-'
const EMPTY_APPLICATION_CELL_VALUE = ''

function hasDisplayValue(value: string) {
    return value !== EMPTY_CELL_VALUE && value !== EMPTY_APPLICATION_CELL_VALUE
}

function formatApplicationCellValue(value: string) {
    return value === EMPTY_CELL_VALUE ? EMPTY_APPLICATION_CELL_VALUE : value
}

function formatTextValue(value?: string | number | null) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? String(value) : EMPTY_CELL_VALUE
    }

    if (typeof value === 'string') {
        return value.trim() || EMPTY_CELL_VALUE
    }

    return EMPTY_CELL_VALUE
}

function getTrialDisplayValue(record: SugarcaneMonitoringRecord) {
    const rawTrial = record.raw_values?.Trial ?? record.raw_values?.trial
    return formatTextValue((rawTrial as string | number | null | undefined) || record.field_name || record.field_id)
}

function formatNumericValue(value?: number | null, maximumFractionDigits = 2) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return EMPTY_CELL_VALUE

    return value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits,
    })
}

function formatDateValue(value?: string | null) {
    if (!value) return EMPTY_CELL_VALUE

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

function getVisibleFertilizerApplications(record: SugarcaneMonitoringRecord) {
    const applications = record.fertilizer_applications?.length
        ? record.fertilizer_applications
        : [{
            fertilizer_type: record.fertilizer_type,
            application_date: record.nutrient_application_date ?? record.fertilizer_application_date,
            application_rate: record.application_rate,
            foliar_sampling_date: record.foliar_sampling_date,
        }]

    return applications.filter((application) =>
        application.fertilizer_type ||
        application.application_date ||
        application.application_rate != null ||
        application.foliar_sampling_date
    )
}

function getVisibleHerbicideApplications(record: SugarcaneMonitoringRecord) {
    const applications = record.herbicide_applications?.length
        ? record.herbicide_applications
        : [{
            herbicide_name: record.herbicide_name,
            application_date: record.weed_application_date,
            application_rate: record.weed_application_rate,
        }]

    return applications.filter((application) =>
        application.herbicide_name ||
        application.application_date ||
        application.application_rate != null
    )
}

function getLatestApplicationByDate<T extends { application_date?: string }>(applications: T[]): T | undefined {
    return applications.reduce<T | undefined>((latest, application) => {
        if (!latest) {
            return application
        }

        const latestTime = new Date(String(latest.application_date ?? '')).getTime()
        const nextTime = new Date(String(application.application_date ?? '')).getTime()

        if (!Number.isFinite(nextTime)) {
            return latest
        }

        if (!Number.isFinite(latestTime) || nextTime >= latestTime) {
            return application
        }

        return latest
    }, undefined)
}

function getLatestFertilizerApplication(record: SugarcaneMonitoringRecord) {
    return getLatestApplicationByDate(getVisibleFertilizerApplications(record))
}

function getLatestHerbicideApplication(record: SugarcaneMonitoringRecord) {
    return getLatestApplicationByDate(getVisibleHerbicideApplications(record))
}

function hasCompleteCoreFieldData(record: SugarcaneMonitoringRecord) {
    return hasCompleteSugarcaneDisplayData(record)
}

const BASE_SUGARCANE_MONITORING_SHEET_COLUMNS: SugarcaneMonitoringSheetColumn[] = [
    { key: 'date_recorded', label: 'Date Recorded', minWidth: 170, getValue: (record) => formatDateValue(record.date_recorded) },
    { key: 'field_name', label: 'Trial', minWidth: 180, wrap: true, getValue: getTrialDisplayValue },
    { key: 'block_id', label: 'Block ID', minWidth: 140, getValue: (record) => formatTextValue(record.block_id) },
    { key: 'area', label: 'Area', minWidth: 110, getValue: (record) => formatNumericValue(record.area) },
    { key: 'irrigation_type', label: 'Irrigation Type', minWidth: 160, getValue: (record) => formatTextValue(record.irrigation_type) },
    { key: 'water_source', label: 'Water Source', minWidth: 150, getValue: (record) => formatTextValue(record.water_source) },
    { key: 'tam_mm', label: 'TAM', minWidth: 110, getValue: (record) => formatTextValue(record.tam_mm) },
    { key: 'soil_type', label: 'Soil Type', minWidth: 130, getValue: (record) => formatTextValue(record.soil_type) },
    { key: 'soil_ph', label: 'Soil pH', minWidth: 110, getValue: (record) => formatNumericValue(record.soil_ph) },
    { key: 'field_remarks', label: 'Remarks', minWidth: 240, wrap: true, getValue: (record) => formatTextValue(record.field_remarks) },
    { key: 'trial_number', label: 'Trial Number', minWidth: 140, getValue: (record) => formatTextValue(record.trial_number) },
    { key: 'trial_name', label: 'Trial Name', minWidth: 180, wrap: true, getValue: (record) => formatTextValue(record.trial_name) },
    { key: 'contact_person', label: 'Contact Person Scientist', minWidth: 210, wrap: true, getValue: (record) => formatTextValue(record.contact_person) },
    { key: 'crop_type', label: 'Crop Type', minWidth: 140, getValue: (record) => formatTextValue(record.crop_type) },
    { key: 'crop_class', label: 'Crop Class', minWidth: 150, getValue: (record) => formatTextValue(record.crop_class) },
    { key: 'planting_date', label: 'Planting Date', minWidth: 160, calendarAnchor: 'planting', getValue: (record) => formatDateValue(record.planting_date) },
    { key: 'previous_cutting_date', label: 'Cutting Date', minWidth: 190, calendarAnchor: 'cutting', getValue: (record) => formatDateValue(record.previous_cutting_date ?? record.previous_cutting) },
    { key: 'expected_harvest_date', label: 'Expected Harvest Date', minWidth: 210, getValue: (record) => formatDateValue(record.expected_harvest_date) },
    { key: 'residue_type', label: 'Residue Type', minWidth: 150, getValue: (record) => formatTextValue(record.residue_type) },
    { key: 'residue_management_method', label: 'Management Method', minWidth: 240, wrap: true, getValue: (record) => formatTextValue(record.residue_management_method ?? (record.raw_values?.residual_management_method as string | undefined)) },
    { key: 'residual_management_remarks', label: 'Residue Remarks', minWidth: 240, wrap: true, getValue: (record) => formatTextValue(record.residual_management_remarks) },
]

const AFTER_APPLICATION_SHEET_COLUMNS: SugarcaneMonitoringSheetColumn[] = [
    { key: 'pest_remarks', label: 'Pest Remarks', minWidth: 220, wrap: true, getValue: (record) => formatTextValue(record.pest_remarks) },
    { key: 'disease_remarks', label: 'Disease Remarks', minWidth: 220, wrap: true, getValue: (record) => formatTextValue(record.disease_remarks) },
    { key: 'harvest_date', label: 'Harvest Date', minWidth: 160, getValue: (record) => formatDateValue(record.harvest_date) },
    { key: 'yield', label: 'Yield', minWidth: 120, getValue: (record) => formatNumericValue(record.yield) },
    { key: 'quality_remarks', label: 'Cane Quality Remarks', minWidth: 220, wrap: true, getValue: (record) => formatTextValue(record.quality_remarks) },
]

function buildApplicationSheetColumns(records: SugarcaneMonitoringRecord[]): SugarcaneMonitoringSheetColumn[] {
    const columns: SugarcaneMonitoringSheetColumn[] = [
        { key: 'fertilizer_application_type', label: 'Fertilizer Application Type', minWidth: 250, getValue: (record) => formatApplicationCellValue(formatTextValue(getLatestFertilizerApplication(record)?.fertilizer_type)) },
        { key: 'fertilizer_application_date', label: 'Fertilizer Application Date', minWidth: 210, getValue: (record) => formatApplicationCellValue(formatDateValue(getLatestFertilizerApplication(record)?.application_date)) },
        { key: 'fertilizer_application_rate', label: 'Fertilizer Application Rate', minWidth: 200, getValue: (record) => formatApplicationCellValue(formatNumericValue(getLatestFertilizerApplication(record)?.application_rate)) },
        { key: 'herbicide_application_type', label: 'Herbicide Application Type', minWidth: 250, getValue: (record) => formatApplicationCellValue(formatTextValue(getLatestHerbicideApplication(record)?.herbicide_name)) },
        { key: 'herbicide_application_date', label: 'Herbicide Application Date', minWidth: 220, getValue: (record) => formatApplicationCellValue(formatDateValue(getLatestHerbicideApplication(record)?.application_date)) },
        { key: 'herbicide_application_rate', label: 'Herbicide Application Rate', minWidth: 210, getValue: (record) => formatApplicationCellValue(formatNumericValue(getLatestHerbicideApplication(record)?.application_rate)) },
    ]

    return records.length > 0 ? columns : []
}

function buildSugarcaneMonitoringSheetColumns(records: SugarcaneMonitoringRecord[]): SugarcaneMonitoringSheetColumn[] {
    return [
        ...BASE_SUGARCANE_MONITORING_SHEET_COLUMNS,
        ...buildApplicationSheetColumns(records),
        ...AFTER_APPLICATION_SHEET_COLUMNS,
    ]
}

export const SUGARCANE_MONITORING_SHEET_COLUMNS: SugarcaneMonitoringSheetColumn[] = buildSugarcaneMonitoringSheetColumns([])

export function buildSugarcaneMonitoringSheetRow(record: SugarcaneMonitoringRecord) {
    return Object.fromEntries(
        buildSugarcaneMonitoringSheetColumns([record]).map((column) => [column.key, column.getValue(record)])
    ) as Record<string, string>
}

export function ObservationEntryDataTable({
    records,
    maxRows,
    emptyMessage = 'No monitoring rows match the current filter.',
}: ObservationEntryDataTableProps) {
    const completeRecords = records.filter(hasCompleteCoreFieldData)
    const displayedRecords = maxRows ? completeRecords.slice(0, maxRows) : completeRecords
    const columns = buildSugarcaneMonitoringSheetColumns(displayedRecords)
    const tableMinWidth = Math.max(1200, columns.reduce((total, column) => total + (column.minWidth ?? 150), 0))

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
            <Table stickyHeader sx={{ minWidth: tableMinWidth }}>
                <TableHead>
                    <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
                        {columns.map((column) => (
                            <TableCell
                                key={column.key}
                                sx={{
                                    minWidth: column.minWidth,
                                    fontWeight: 700,
                                    textTransform: 'none',
                                }}
                            >
                                {column.label}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {displayedRecords.map((record, index) => {
                        const row = Object.fromEntries(
                            columns.map((column) => [
                                column.key,
                                column.getValue(record),
                            ])
                        ) as Record<string, string>
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
                                {columns.map((column) => {
                                    const calendarSearch = column.calendarAnchor === 'planting'
                                        ? plantingCalendarSearch
                                        : column.calendarAnchor === 'cutting'
                                            ? cuttingCalendarSearch
                                            : ''
                                    const value = row[column.key]
                                    const hasCalendarLink = Boolean(calendarSearch) && hasDisplayValue(value)
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
        whiteSpace: wrap ? 'pre-line' : 'nowrap',
        wordBreak: wrap ? 'break-word' : 'normal',
    }
}
