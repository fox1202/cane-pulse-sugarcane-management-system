import React, { useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    IconButton,
    Stack,
    Tooltip,
    alpha,
    useTheme,
    TableSortLabel,
    Checkbox,
} from '@mui/material'
import {
    Visibility,
    Edit,
    Delete,
} from '@mui/icons-material'
import { format } from 'date-fns'
import type { FullObservation } from '@/types/database.types'
import type { MobileObservationRecord } from '@/services/database.service'

type ObservationTableRecord = FullObservation | MobileObservationRecord

interface ObservationTableProps {
    observations: ObservationTableRecord[]
    onView: (obs: ObservationTableRecord) => void
    onEdit: (obs: ObservationTableRecord) => void
    onDelete: (id: string) => void
    canEdit?: boolean
    canDelete?: boolean
    selectedIds?: string[]
    onSelectionChange?: (ids: string[]) => void
}

type Order = 'asc' | 'desc'

interface FlattenedObservationRow {
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

interface ObservationColumn {
    key: keyof FlattenedObservationRow
    label: string
    minWidth?: number
    wrap?: boolean
}

const OBSERVATION_COLUMNS: ObservationColumn[] = [
    { key: 'dateRecorded', label: 'Date Recorded', minWidth: 150 },
    { key: 'fieldId', label: 'Trials', minWidth: 170 },
    { key: 'blockId', label: 'Block ID', minWidth: 140 },
    { key: 'area', label: 'Area (ha)', minWidth: 110 },
    { key: 'irrigationType', label: 'Irrigation Type', minWidth: 150 },
    { key: 'waterSource', label: 'Water Source', minWidth: 140 },
    { key: 'tam', label: 'TAM (mm)', minWidth: 110 },
    { key: 'soilType', label: 'Soil Type', minWidth: 120 },
    { key: 'soilPh', label: 'Soil pH', minWidth: 110 },
    { key: 'fieldRemarks', label: 'Field Remarks', minWidth: 220, wrap: true },
    { key: 'trialNumber', label: 'Trial Number', minWidth: 130 },
    { key: 'trialName', label: 'Trial Name', minWidth: 180, wrap: true },
    { key: 'contactPerson', label: 'Contact Person', minWidth: 170, wrap: true },
    { key: 'cropType', label: 'Crop Type', minWidth: 140 },
    { key: 'cropClass', label: 'Crop Class', minWidth: 150 },
    { key: 'plantingDate', label: 'Planting Date', minWidth: 150 },
    { key: 'previousCuttingDate', label: 'Previous Cutting Date', minWidth: 180 },
    { key: 'expectedHarvestDate', label: 'Expected Harvest Date', minWidth: 180 },
    { key: 'residueType', label: 'Residue Type', minWidth: 140 },
    { key: 'residueManagementMethod', label: 'Residue Management Method', minWidth: 210, wrap: true },
    { key: 'residueRemarks', label: 'Residue Remarks', minWidth: 220, wrap: true },
    { key: 'fertilizerType', label: 'Fertilizer Type', minWidth: 150 },
    { key: 'nutrientApplicationDate', label: 'Nutrient Application Date', minWidth: 200 },
    { key: 'applicationRate', label: 'Application Rate', minWidth: 140 },
    { key: 'foliarSamplingDate', label: 'Foliar Sampling Date', minWidth: 170 },
    { key: 'herbicideName', label: 'Herbicide Name', minWidth: 150 },
    { key: 'weedApplicationDate', label: 'Weed Application Date', minWidth: 180 },
    { key: 'weedApplicationRate', label: 'Weed Application Rate', minWidth: 170 },
    { key: 'pestRemarks', label: 'Pest Remarks', minWidth: 220, wrap: true },
    { key: 'diseaseRemarks', label: 'Disease Remarks', minWidth: 220, wrap: true },
    { key: 'harvestDate', label: 'Harvest Date', minWidth: 150 },
    { key: 'yield', label: 'Yield', minWidth: 120 },
    { key: 'qualityRemarks', label: 'Quality Remarks', minWidth: 220, wrap: true },
    { key: 'created', label: 'Created', minWidth: 180 },
]

function isMobileObservationRecord(observation: ObservationTableRecord): observation is MobileObservationRecord {
    return 'source_table' in observation
}

function getEntryForm(observation: ObservationTableRecord) {
    return isMobileObservationRecord(observation) ? observation.entry_form : undefined
}

function getCurrentSheet(observation: ObservationTableRecord) {
    return isMobileObservationRecord(observation) ? observation.monitoring_sheet : undefined
}

function formatDateValue(value?: string, pattern: string = 'dd MMM yyyy') {
    if (!value) return '-'

    try {
        return format(new Date(value), pattern)
    } catch {
        return value
    }
}

function formatDateTimeValue(value?: string) {
    return formatDateValue(value, 'dd MMM yyyy HH:mm')
}

function formatNumericValue(value?: number, maximumFractionDigits: number = 2) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '-'

    return value.toLocaleString(undefined, {
        maximumFractionDigits,
        minimumFractionDigits: 0,
    })
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

function toRecordedTime(value?: string) {
    if (!value) return 0
    const timestamp = new Date(value).getTime()
    return Number.isFinite(timestamp) ? timestamp : 0
}

function buildFlattenedObservationRow(observation: ObservationTableRecord): FlattenedObservationRow {
    const currentSheet = getCurrentSheet(observation)
    const entryForm = getEntryForm(observation)
    const fieldRemarks = currentSheet?.field_remarks || currentSheet?.remarks || entryForm?.field_remarks || entryForm?.remarks || observation.crop_monitoring?.remarks

    return {
        dateRecorded: formatDateValue(currentSheet?.date_recorded || entryForm?.date_recorded || observation.date_recorded),
        fieldId: formatTextValue(currentSheet?.field_id || currentSheet?.field_name || entryForm?.field_id || observation.field_name || entryForm?.selected_field),
        section: formatTextValue(currentSheet?.section_name || observation.section_name),
        blockId: formatTextValue(currentSheet?.block_id || observation.block_id),
        area: formatNumericValue(currentSheet?.area ?? entryForm?.area ?? entryForm?.block_size),
        irrigationType: formatTextValue(currentSheet?.irrigation_type || entryForm?.irrigation_type || observation.irrigation_management?.irrigation_type),
        waterSource: formatTextValue(currentSheet?.water_source || entryForm?.water_source || observation.irrigation_management?.water_source),
        tam: formatTextValue(currentSheet?.tam_mm || entryForm?.tam_mm || (entryForm?.tamm_area != null ? String(entryForm.tamm_area) : '')),
        soilType: formatTextValue(currentSheet?.soil_type || entryForm?.soil_type || observation.soil_characteristics?.soil_type),
        soilPh: formatNumericValue(currentSheet?.soil_ph ?? entryForm?.soil_ph ?? observation.soil_characteristics?.soil_ph),
        fieldRemarks: formatTextValue(fieldRemarks),
        trialNumber: formatTextValue(currentSheet?.trial_number ?? entryForm?.trial_number ?? ''),
        trialName: formatTextValue(currentSheet?.trial_name || entryForm?.trial_name),
        contactPerson: formatTextValue(currentSheet?.contact_person || entryForm?.contact_person),
        cropType: formatTextValue(currentSheet?.crop_type || entryForm?.crop_type || observation.crop_information?.crop_type),
        cropClass: formatTextValue(currentSheet?.crop_class || entryForm?.crop_class),
        plantingDate: formatDateValue(currentSheet?.planting_date || entryForm?.planting_date || observation.crop_information?.planting_date),
        previousCuttingDate: formatDateValue(currentSheet?.previous_cutting_date || currentSheet?.previous_cutting || entryForm?.previous_cutting_date || entryForm?.cutting_date),
        expectedHarvestDate: formatDateValue(currentSheet?.expected_harvest_date || entryForm?.expected_harvest_date || observation.crop_information?.expected_harvest_date),
        stress: formatTextValue(currentSheet?.stress || entryForm?.stress || observation.crop_monitoring?.stress),
        residueType: formatTextValue(currentSheet?.residue_type || entryForm?.residue_type),
        residueManagementMethod: formatTextValue(currentSheet?.residue_management_method || entryForm?.residue_management_method),
        residueRemarks: formatTextValue(currentSheet?.residual_management_remarks || entryForm?.residual_management_remarks),
        fertilizerType: formatTextValue(currentSheet?.fertilizer_type || entryForm?.fertilizer_type || observation.nutrient_management?.fertilizer_type),
        nutrientApplicationDate: formatDateValue(currentSheet?.nutrient_application_date || currentSheet?.fertilizer_application_date || entryForm?.nutrient_application_date || observation.nutrient_management?.application_date),
        applicationRate: formatNumericValue(currentSheet?.application_rate ?? entryForm?.application_rate ?? observation.nutrient_management?.application_rate),
        foliarSamplingDate: formatDateValue(currentSheet?.foliar_sampling_date || entryForm?.foliar_sampling_date),
        herbicideName: formatTextValue(currentSheet?.herbicide_name || currentSheet?.weed_control || entryForm?.herbicide_name || observation.control_methods?.weed_control),
        weedApplicationDate: formatDateValue(currentSheet?.weed_application_date || entryForm?.weed_application_date),
        weedApplicationRate: formatNumericValue(currentSheet?.weed_application_rate ?? entryForm?.weed_application_rate),
        pestRemarks: formatTextValue(currentSheet?.pest_remarks || currentSheet?.pest_control || entryForm?.pest_remarks || observation.control_methods?.pest_control || observation.crop_protection?.remarks),
        diseaseRemarks: formatTextValue(currentSheet?.disease_remarks || currentSheet?.disease_control || entryForm?.disease_remarks || observation.control_methods?.disease_control),
        harvestDate: formatDateValue(currentSheet?.harvest_date || entryForm?.harvest_date || observation.harvest?.harvest_date),
        yield: formatNumericValue(currentSheet?.harvest_yield ?? currentSheet?.yield ?? entryForm?.yield ?? observation.harvest?.yield),
        qualityRemarks: formatTextValue(currentSheet?.quality_remarks || entryForm?.quality_remarks),
        created: formatDateTimeValue(currentSheet?.created_at || entryForm?.created_at || observation.created_at),
    }
}

export const ObservationTable: React.FC<ObservationTableProps> = ({
    observations,
    onView,
    onEdit,
    onDelete,
    canEdit = true,
    canDelete = false,
    selectedIds = [],
    onSelectionChange,
}) => {
    const theme = useTheme()
    const [order, setOrder] = useState<Order>('desc')

    const sortedObservations = React.useMemo(() => {
        return [...observations].sort((a, b) => {
            const aValue = toRecordedTime(a.date_recorded)
            const bValue = toRecordedTime(b.date_recorded)

            if (bValue < aValue) return order === 'asc' ? 1 : -1
            if (bValue > aValue) return order === 'asc' ? -1 : 1
            return 0
        })
    }, [observations, order])

    const handleRequestSort = () => {
        setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    }

    const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            onSelectionChange?.(sortedObservations.map((obs) => obs.id))
        } else {
            onSelectionChange?.([])
        }
    }

    const handleSelectOne = (id: string) => {
        const newSelection = selectedIds.includes(id)
            ? selectedIds.filter((selectedId) => selectedId !== id)
            : [...selectedIds, id]

        onSelectionChange?.(newSelection)
    }

    const isAllSelected = sortedObservations.length > 0 &&
        sortedObservations.every((obs) => selectedIds.includes(obs.id))

    return (
        <TableContainer
            component={Paper}
            sx={{
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                borderRadius: 2,
                overflowX: 'auto',
            }}
        >
            <Table stickyHeader sx={{ minWidth: 6200 }}>
                <TableHead>
                    <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                        <TableCell padding="checkbox" width={40}>
                            <Checkbox
                                indeterminate={selectedIds.length > 0 && !isAllSelected}
                                checked={isAllSelected}
                                onChange={handleSelectAll}
                                title={isAllSelected ? 'Deselect all' : 'Select all'}
                            />
                        </TableCell>
                        {OBSERVATION_COLUMNS.map((column) => (
                            <TableCell key={column.key} sx={{ minWidth: column.minWidth, fontWeight: 700 }}>
                                {column.key === 'dateRecorded' ? (
                                    <TableSortLabel
                                        active
                                        direction={order}
                                        onClick={handleRequestSort}
                                    >
                                        {column.label}
                                    </TableSortLabel>
                                ) : (
                                    column.label
                                )}
                            </TableCell>
                        ))}
                        <TableCell align="right" sx={{ minWidth: 120, fontWeight: 700 }}>
                            Actions
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {sortedObservations.map((obs) => {
                        const row = buildFlattenedObservationRow(obs)

                        return (
                            <TableRow
                                key={obs.id}
                                hover
                                selected={selectedIds.includes(obs.id)}
                                sx={{
                                    '&:last-child td, &:last-child th': { border: 0 },
                                    '&.Mui-selected': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                                    '&.Mui-selected:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                                }}
                            >
                                <TableCell padding="checkbox" width={40}>
                                    <Checkbox
                                        checked={selectedIds.includes(obs.id)}
                                        onChange={() => handleSelectOne(obs.id)}
                                    />
                                </TableCell>
                                {OBSERVATION_COLUMNS.map((column) => (
                                    <TableCell
                                        key={column.key}
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
                                <TableCell align="right" sx={{ verticalAlign: 'top' }}>
                                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                                        <Tooltip title="View Record">
                                            <IconButton size="small" onClick={() => onView(obs)} color="primary">
                                                <Visibility fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        {canEdit && (
                                            <Tooltip title="Edit Record">
                                                <IconButton size="small" onClick={() => onEdit(obs)} color="info">
                                                    <Edit fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        {canDelete && (
                                            <Tooltip title="Delete Record">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => onDelete(obs.id)}
                                                    color="error"
                                                >
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                    {sortedObservations.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={OBSERVATION_COLUMNS.length + 2} align="center" sx={{ py: 6 }}>
                                <Typography color="text.secondary">No observations found matching filters.</Typography>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    )
}
