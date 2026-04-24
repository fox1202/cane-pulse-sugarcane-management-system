import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import {
    Alert,
    Box,
    Button,
    Chip,
    Container,
    CircularProgress,
    Grid,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import {
    CalendarMonthRounded,
    FlagRounded,
    GrassRounded,
    ScienceRounded,
    TaskAltRounded,
    TimelineRounded,
} from '@mui/icons-material'
import type { FarmingCalendarTemplate } from '@/data/farmingCalendar'
import { fetchFarmingCalendarTemplatesFromDatabase } from '@/services/farmingCalendar.service'
import { useFieldManagementRecords } from '@/hooks/useFieldManagementRecords'
import { formatDateOnlyLabel, getDateOnlyTimestamp, normalizeDateOnlyValue } from '@/utils/dateOnly'
import type { SugarcaneMonitoringRecord } from '@/types/database.types'

const DISPLAY_FONT = '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, "Times New Roman", serif'
const BODY_FONT = '"Avenir Next", "Trebuchet MS", "Gill Sans", sans-serif'

type TemplateTask = FarmingCalendarTemplate['tasks'][number]
type TemplateGrowthStage = FarmingCalendarTemplate['growthStages'][number]
type ScheduledTemplateTask = TemplateTask & { dueDate: string | null }
type ActivityKind = 'Nutrient' | 'Herbicide'
type FieldTaskSeverity = 'overdue' | 'today' | 'soon' | 'planned'

interface FarmingCalendarRouteContext {
    templateId: FarmingCalendarTemplate['id'] | null
    trialLabel: string | null
    fieldLabel: string | null
    cropClass: string | null
    anchorDate: string | null
}

const EMPTY_CALENDAR_TEMPLATE: FarmingCalendarTemplate = {
    id: 'plant',
    title: 'Farming Calendar',
    sourceSheet: '',
    workbookTitle: '',
    referenceLabel: 'Reference date',
    fieldAnchor: 'planting_date',
    anchorWeekNumber: 1,
    monthRange: [0, 0],
    notes: [],
    growthStages: [],
    tasks: [],
}

const FIELD_WORK_WINDOW_DAYS = 45
const FIELD_WORK_TABLE_LIMIT = 18
const EXPECTED_HARVEST_FIELD_TASKS = [
    {
        offsetDays: -84,
        weekLabel: '12 wks to harvest',
        activity: 'Request crushing allocation and confirm harvest scheduling with the mill.',
    },
    {
        offsetDays: -56,
        weekLabel: '8 wks to harvest',
        activity: 'Begin dry-off irrigation management and reduce irrigation in the lead-up to harvest.',
    },
    {
        offsetDays: -42,
        weekLabel: '6 wks to harvest',
        activity: 'Conduct final eldana, smut, and pest scouting before harvest.',
    },
    {
        offsetDays: -28,
        weekLabel: '4 wks to harvest',
        activity: 'Confirm burning program, haulage access, and field readiness for harvest.',
    },
    {
        offsetDays: -14,
        weekLabel: '2 wks to harvest',
        activity: 'Complete final dry-off and prepare burning and haulage logistics.',
    },
    {
        offsetDays: 0,
        weekLabel: 'Harvest',
        activity: 'Burning, cutting, and haulage operations commence.',
    },
] as const

interface FieldWorkRow {
    key: string
    fieldLabel: string
    cropLabel: string
    dateIso: string
    dueLabel: string
    daysUntil: number
    severity: FieldTaskSeverity
    kind: string
    activity: string
    weekLabel: string
    sourceLabel: string
    anchorLabel: string
}

interface FieldWorkSeed {
    fieldKey: string
    fieldLabel: string
    cropLabel: string
    cropClass: string
    plantingDate: string
    cutDate: string
    expectedHarvestDate: string
}

function getTodayDateOnly(): string {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function getMonthTitle(month: number): string {
    return month === 0 ? 'Kickoff' : `Month ${month}`
}

function getActivityKind(activity: string): ActivityKind {
    return /herbicide|weed|hoe/i.test(activity) ? 'Herbicide' : 'Nutrient'
}

function getActivityTone(kind: ActivityKind) {
    return kind === 'Herbicide'
        ? {
            icon: <GrassRounded fontSize="small" />,
            accent: '#d27f52',
            bg: 'rgba(244, 202, 173, 0.24)',
            border: 'rgba(210,127,82,0.24)',
            labelBg: 'rgba(244, 202, 173, 0.42)',
        }
        : {
            icon: <ScienceRounded fontSize="small" />,
            accent: '#2f7f4f',
            bg: 'rgba(86,184,112,0.18)',
            border: 'rgba(47,127,79,0.18)',
            labelBg: 'rgba(86,184,112,0.22)',
        }
}

function buildAnchoredWeekDate(
    template: FarmingCalendarTemplate,
    weekNumber: number,
    anchorDate: string
): string | null {
    const anchorTimestamp = getDateOnlyTimestamp(anchorDate)
    if (!anchorTimestamp) {
        return null
    }

    const daysFromAnchor = (weekNumber - template.anchorWeekNumber) * 7
    const nextDate = new Date(anchorTimestamp)
    nextDate.setDate(nextDate.getDate() + daysFromAnchor)

    const year = nextDate.getFullYear()
    const month = String(nextDate.getMonth() + 1).padStart(2, '0')
    const day = String(nextDate.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function getCurrentCalendarWeek(template: FarmingCalendarTemplate, anchorDate: string, referenceDate: string): number | null {
    const anchorTimestamp = getDateOnlyTimestamp(anchorDate)
    const referenceTimestamp = getDateOnlyTimestamp(referenceDate)

    if (!anchorTimestamp || !referenceTimestamp) {
        return null
    }

    const daysElapsed = Math.floor((referenceTimestamp - anchorTimestamp) / (24 * 60 * 60 * 1000))
    return template.anchorWeekNumber + Math.floor(daysElapsed / 7)
}

function getGrowthStageForWeek(
    stages: TemplateGrowthStage[],
    weekNumber: number
): TemplateGrowthStage | null {
    if (stages.length === 0) {
        return null
    }

    const exactMatch = stages.find((stage) => weekNumber >= stage.startWeek && weekNumber <= stage.endWeek)
    if (exactMatch) {
        return exactMatch
    }

    if (weekNumber < stages[0].startWeek) {
        return stages[0]
    }

    return stages[stages.length - 1]
}

function formatDueLabel(daysUntil: number): string {
    if (daysUntil === 0) return 'Today'
    if (daysUntil === 1) return 'Tomorrow'
    if (daysUntil < 0) return `${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'} overdue`
    return `In ${daysUntil} days`
}

function normalizeRouteValue(value?: string | number | null): string {
    return String(value ?? '').trim().replace(/\s+/g, ' ')
}

function addDaysToDateOnly(dateIso: string, daysToAdd: number): string | null {
    const normalized = normalizeDateOnlyValue(dateIso)
    if (!normalized) {
        return null
    }

    const [year, month, day] = normalized.split('-').map(Number)
    const nextDate = new Date(year, month - 1, day)
    nextDate.setDate(nextDate.getDate() + daysToAdd)

    const nextYear = nextDate.getFullYear()
    const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0')
    const nextDay = String(nextDate.getDate()).padStart(2, '0')
    return `${nextYear}-${nextMonth}-${nextDay}`
}

function resolveFarmingCalendarRouteContext(search: string): FarmingCalendarRouteContext {
    const params = new URLSearchParams(search)
    const templateParam = normalizeRouteValue(params.get('template'))
    const templateId = templateParam === 'plant' || templateParam === 'ratoon' ? templateParam : null

    return {
        templateId,
        trialLabel: normalizeRouteValue(params.get('trial')) || null,
        fieldLabel: normalizeRouteValue(params.get('field')) || null,
        cropClass: normalizeRouteValue(params.get('cropClass')) || null,
        anchorDate: normalizeDateOnlyValue(params.get('anchorDate')),
    }
}

function buildAnchoredCalendarTaskDate(
    template: FarmingCalendarTemplate,
    task: TemplateTask,
    anchorDate: string
): string | null {
    return addDaysToDateOnly(anchorDate, (task.weekNumber - template.anchorWeekNumber) * 7)
}

function normalizeFieldToken(value?: string | null): string {
    return (value ?? '').trim().toLowerCase()
}

function buildFieldIdentity(fieldName?: string | null, sectionName?: string | null, blockId?: string | null): string {
    const parts = [
        normalizeFieldToken(sectionName),
        normalizeFieldToken(blockId),
        normalizeFieldToken(fieldName),
    ]

    return parts.some(Boolean) ? parts.join('|') : ''
}

function buildFieldLabel(fieldName?: string | null, sectionName?: string | null, blockId?: string | null): string {
    return [fieldName, sectionName, blockId]
        .map((value) => (value ?? '').trim())
        .filter(Boolean)
        .join(' / ') || 'Unknown field'
}

function buildCropLabel(record: SugarcaneMonitoringRecord): string {
    const cropType = (record.crop_type ?? '').trim()
    const cropClass = (record.crop_class ?? '').trim()

    if (cropType && cropClass && cropType.toLowerCase() !== cropClass.toLowerCase()) {
        return `${cropType} / ${cropClass}`
    }

    return cropType || cropClass || 'Sugarcane'
}

function getFieldRecordRecencyTimestamp(record: SugarcaneMonitoringRecord): number {
    const candidates = [record.date_recorded, record.updated_at, record.created_at]

    for (const value of candidates) {
        if (!value) {
            continue
        }

        const parsed = Date.parse(value)
        if (!Number.isNaN(parsed)) {
            return parsed
        }

        const normalized = normalizeDateOnlyValue(value)
        if (normalized) {
            return getDateOnlyTimestamp(normalized)
        }
    }

    return 0
}

function isRatoonLikeField(seed: Pick<FieldWorkSeed, 'cropClass' | 'cropLabel' | 'cutDate'>): boolean {
    return /\bratoon\b/i.test(`${seed.cropClass} ${seed.cropLabel}`) || Boolean(seed.cutDate)
}

function resolveFieldTemplate(
    seed: FieldWorkSeed,
    templates: FarmingCalendarTemplate[]
): FarmingCalendarTemplate {
    const templateId: FarmingCalendarTemplate['id'] = isRatoonLikeField(seed) ? 'ratoon' : 'plant'
    return templates.find((template) => template.id === templateId) ?? templates[0] ?? EMPTY_CALENDAR_TEMPLATE
}

function getFieldAnchorDate(seed: FieldWorkSeed, template: FarmingCalendarTemplate): string | null {
    if (template.fieldAnchor === 'cut_date') {
        return normalizeDateOnlyValue(seed.cutDate || seed.plantingDate)
    }

    return normalizeDateOnlyValue(seed.plantingDate || seed.cutDate)
}

function getFieldTaskKind(activity: string): string {
    const normalized = activity.trim().toLowerCase()

    if (/harvest|haulage|burning|cutting|maturity/.test(normalized)) return 'Harvest'
    if (/fertili|ssp|map|npk|foliar|soil analysis|soil sampling|potassium|nitrogen/.test(normalized)) return 'Nutrient'
    if (/irrigation|dry-off|dry off|tam/.test(normalized)) return 'Irrigation'
    if (/herbicide|hoeing|weed/.test(normalized)) return 'Weed Control'
    if (/survey|scouting|smut|eldana|grubs|bmb|ysa|rogue|pest|disease/.test(normalized)) return 'Pest / Disease'
    if (/plant|seedcane|ridging|land preparation/.test(normalized)) return 'Establishment'
    return 'Field Activity'
}

function getFieldTaskSeverity(daysUntil: number): FieldTaskSeverity {
    if (daysUntil < 0) return 'overdue'
    if (daysUntil === 0) return 'today'
    if (daysUntil <= 14) return 'soon'
    return 'planned'
}

function sortFieldWorkRows(left: FieldWorkRow, right: FieldWorkRow): number {
    const leftOverdue = left.daysUntil < 0
    const rightOverdue = right.daysUntil < 0

    if (leftOverdue && rightOverdue) {
        return right.daysUntil - left.daysUntil
    }

    if (leftOverdue !== rightOverdue) {
        return leftOverdue ? -1 : 1
    }

    if (left.daysUntil !== right.daysUntil) {
        return left.daysUntil - right.daysUntil
    }

    if (left.dateIso !== right.dateIso) {
        return left.dateIso.localeCompare(right.dateIso)
    }

    return left.fieldLabel.localeCompare(right.fieldLabel)
}

function buildFieldWorkSeeds(records: SugarcaneMonitoringRecord[]): FieldWorkSeed[] {
    const byField = new Map<string, FieldWorkSeed>()
    const sortedRecords = [...records].sort(
        (left, right) => getFieldRecordRecencyTimestamp(right) - getFieldRecordRecencyTimestamp(left)
    )

    sortedRecords.forEach((record) => {
        const fieldKey = buildFieldIdentity(record.field_name, record.section_name, record.block_id) || `record:${record.id}`
        const seed = byField.get(fieldKey)
        const plantingDate = normalizeDateOnlyValue(record.planting_date) || ''
        const cutDate = normalizeDateOnlyValue(record.previous_cutting_date ?? record.previous_cutting) || ''
        const expectedHarvestDate = normalizeDateOnlyValue(record.expected_harvest_date) || ''
        const cropClass = (record.crop_class ?? '').trim()
        const cropLabel = buildCropLabel(record)

        if (!seed) {
            byField.set(fieldKey, {
                fieldKey,
                fieldLabel: buildFieldLabel(record.field_name, record.section_name, record.block_id),
                cropLabel,
                cropClass,
                plantingDate,
                cutDate,
                expectedHarvestDate,
            })
            return
        }

        if (!seed.cropClass && cropClass) seed.cropClass = cropClass
        if (!seed.cropLabel || seed.cropLabel === 'Sugarcane') seed.cropLabel = cropLabel
        if (!seed.plantingDate && plantingDate) seed.plantingDate = plantingDate
        if (!seed.cutDate && cutDate) seed.cutDate = cutDate
        if (!seed.expectedHarvestDate && expectedHarvestDate) seed.expectedHarvestDate = expectedHarvestDate
    })

    return Array.from(byField.values())
        .filter((seed) => seed.plantingDate || seed.cutDate || seed.expectedHarvestDate)
        .sort((left, right) => left.fieldLabel.localeCompare(right.fieldLabel))
}

function formatShortFieldDate(dateIso: string): string {
    return formatDateOnlyLabel(dateIso, { day: '2-digit', month: 'short', year: 'numeric' }) || dateIso
}

function buildFieldWorkRows(
    records: SugarcaneMonitoringRecord[],
    templates: FarmingCalendarTemplate[],
    todayIso: string
): FieldWorkRow[] {
    const todayTimestamp = getDateOnlyTimestamp(todayIso)
    if (!todayTimestamp) {
        return []
    }

    const rows = new Map<string, FieldWorkRow>()

    buildFieldWorkSeeds(records).forEach((seed) => {
        const template = resolveFieldTemplate(seed, templates)
        const anchorDate = getFieldAnchorDate(seed, template)

        if (anchorDate) {
            template.tasks.forEach((task) => {
                const dateIso = buildAnchoredCalendarTaskDate(template, task, anchorDate)
                const taskTimestamp = getDateOnlyTimestamp(dateIso)
                if (!dateIso || !taskTimestamp) {
                    return
                }

                const daysUntil = Math.round((taskTimestamp - todayTimestamp) / 86_400_000)
                const kind = getFieldTaskKind(task.activity)
                const key = `${seed.fieldKey}|${template.id}|${task.weekNumber}|${task.activity.toLowerCase()}`

                rows.set(key, {
                    key,
                    fieldLabel: seed.fieldLabel,
                    cropLabel: seed.cropLabel,
                    dateIso,
                    dueLabel: formatDueLabel(daysUntil),
                    daysUntil,
                    severity: getFieldTaskSeverity(daysUntil),
                    kind,
                    activity: task.activity,
                    weekLabel: task.weekLabel,
                    sourceLabel: template.title,
                    anchorLabel: `${template.referenceLabel}: ${formatShortFieldDate(anchorDate)}`,
                })
            })
        }

        if (seed.expectedHarvestDate) {
            EXPECTED_HARVEST_FIELD_TASKS.forEach((task) => {
                const dateIso = addDaysToDateOnly(seed.expectedHarvestDate, task.offsetDays)
                const taskTimestamp = getDateOnlyTimestamp(dateIso)
                if (!dateIso || !taskTimestamp) {
                    return
                }

                const daysUntil = Math.round((taskTimestamp - todayTimestamp) / 86_400_000)
                const kind = getFieldTaskKind(task.activity)
                const key = `${seed.fieldKey}|expected-harvest|${task.offsetDays}|${task.activity.toLowerCase()}`

                rows.set(key, {
                    key,
                    fieldLabel: seed.fieldLabel,
                    cropLabel: seed.cropLabel,
                    dateIso,
                    dueLabel: formatDueLabel(daysUntil),
                    daysUntil,
                    severity: getFieldTaskSeverity(daysUntil),
                    kind,
                    activity: task.activity,
                    weekLabel: task.weekLabel,
                    sourceLabel: 'Expected harvest',
                    anchorLabel: `Harvest: ${formatShortFieldDate(seed.expectedHarvestDate)}`,
                })
            })
        }
    })

    return Array.from(rows.values()).sort(sortFieldWorkRows)
}

function getFieldWorkChipSx(severity: FieldTaskSeverity) {
    if (severity === 'overdue') {
        return {
            bgcolor: 'rgba(210,127,82,0.18)',
            color: '#a94f2d',
            borderColor: 'rgba(210,127,82,0.24)',
        }
    }

    if (severity === 'today' || severity === 'soon') {
        return {
            bgcolor: 'rgba(214,176,44,0.2)',
            color: '#7b6100',
            borderColor: 'rgba(214,176,44,0.28)',
        }
    }

    return {
        bgcolor: 'rgba(86,184,112,0.16)',
        color: '#2f7f4f',
        borderColor: 'rgba(86,184,112,0.2)',
    }
}

function FieldWorkTable({
    rows,
    totalRows,
    isLoading,
    isFetching,
    error,
}: {
    rows: FieldWorkRow[]
    totalRows: number
    isLoading: boolean
    isFetching: boolean
    error: Error | null
}) {
    return (
        <Paper
            sx={{
                p: { xs: 1.6, md: 2.4 },
                borderRadius: '28px',
                border: '1px solid rgba(86,184,112,0.2)',
                bgcolor: 'rgba(255,255,255,0.9)',
                boxShadow: '0 24px 52px rgba(35,64,52,0.06)',
            }}
        >
            <Stack spacing={1.8}>
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1.3}
                    alignItems={{ xs: 'flex-start', md: 'center' }}
                    justifyContent="space-between"
                >
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            sx={{
                                fontSize: '0.74rem',
                                letterSpacing: '0.16em',
                                textTransform: 'uppercase',
                                fontWeight: 900,
                                color: 'rgba(35,64,52,0.56)',
                                mb: 0.45,
                                fontFamily: BODY_FONT,
                            }}
                        >
                            Field Work Table
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: { xs: '1.55rem', md: '2rem' },
                                lineHeight: 1.05,
                                fontWeight: 900,
                                color: 'var(--calendar-ink)',
                                fontFamily: DISPLAY_FONT,
                            }}
                        >
                            Work that needs to be done on fields
                        </Typography>
                        <Typography
                            sx={{
                                mt: 0.55,
                                maxWidth: 720,
                                fontSize: '0.94rem',
                                lineHeight: 1.75,
                                color: 'rgba(32,56,45,0.66)',
                                fontFamily: BODY_FONT,
                            }}
                        >
                            Calculated from live field planting dates, previous cutting dates, and expected harvest dates.
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                        <Chip
                            label={`${totalRows} scheduled`}
                            size="small"
                            sx={{
                                height: 28,
                                borderRadius: '999px',
                                bgcolor: 'rgba(86,184,112,0.16)',
                                color: 'var(--calendar-green)',
                                fontWeight: 800,
                                fontFamily: BODY_FONT,
                            }}
                        />
                        {isFetching && !isLoading ? (
                            <Chip
                                label="Updating live"
                                size="small"
                                sx={{
                                    height: 28,
                                    borderRadius: '999px',
                                    bgcolor: 'rgba(214,176,44,0.18)',
                                    color: '#806400',
                                    fontWeight: 800,
                                    fontFamily: BODY_FONT,
                                }}
                            />
                        ) : null}
                    </Stack>
                </Stack>

                {error ? (
                    <Alert severity="warning" sx={{ borderRadius: '18px' }}>
                        {error.message || 'Could not load live field records for the field work table.'}
                    </Alert>
                ) : null}

                {isLoading ? (
                    <Stack direction="row" spacing={1.3} alignItems="center" sx={{ py: 1.4 }}>
                        <CircularProgress size={22} sx={{ color: 'var(--calendar-green)' }} />
                        <Typography sx={{ fontSize: '0.94rem', color: 'rgba(32,56,45,0.7)', fontWeight: 700, fontFamily: BODY_FONT }}>
                            Loading field dates from the database.
                        </Typography>
                    </Stack>
                ) : rows.length === 0 ? (
                    <Box
                        sx={{
                            p: 2,
                            borderRadius: '20px',
                            border: '1px dashed rgba(86,184,112,0.26)',
                            bgcolor: 'rgba(247,252,248,0.78)',
                        }}
                    >
                        <Typography
                            sx={{
                                fontSize: '0.95rem',
                                lineHeight: 1.75,
                                color: 'rgba(32,56,45,0.68)',
                                fontFamily: BODY_FONT,
                            }}
                        >
                            No field work can be calculated yet. Add planting dates or expected harvest dates to the field records, then this table will populate automatically.
                        </Typography>
                    </Box>
                ) : (
                    <TableContainer
                        sx={{
                            borderRadius: '18px',
                            border: '1px solid rgba(35,64,52,0.1)',
                            overflowX: 'auto',
                        }}
                    >
                        <Table size="small" sx={{ minWidth: 920 }}>
                            <TableHead>
                                <TableRow
                                    sx={{
                                        '& th': {
                                            bgcolor: 'rgba(35,64,52,0.06)',
                                            color: 'rgba(35,64,52,0.66)',
                                            borderBottom: '1px solid rgba(35,64,52,0.1)',
                                            fontSize: '0.72rem',
                                            letterSpacing: '0.14em',
                                            textTransform: 'uppercase',
                                            fontWeight: 900,
                                            fontFamily: BODY_FONT,
                                            py: 1.15,
                                        },
                                    }}
                                >
                                    <TableCell>Field</TableCell>
                                    <TableCell>Due</TableCell>
                                    <TableCell>Task</TableCell>
                                    <TableCell>Source</TableCell>
                                    <TableCell>Crop</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((row) => {
                                    const chipSx = getFieldWorkChipSx(row.severity)

                                    return (
                                        <TableRow
                                            key={row.key}
                                            hover
                                            sx={{
                                                '& td': {
                                                    borderBottom: '1px solid rgba(35,64,52,0.08)',
                                                    py: 1.3,
                                                    verticalAlign: 'top',
                                                },
                                                '&:last-of-type td': {
                                                    borderBottom: 0,
                                                },
                                            }}
                                        >
                                            <TableCell sx={{ width: 210 }}>
                                                <Typography
                                                    sx={{
                                                        fontSize: '0.96rem',
                                                        fontWeight: 900,
                                                        color: 'var(--calendar-ink)',
                                                        fontFamily: DISPLAY_FONT,
                                                        overflowWrap: 'anywhere',
                                                    }}
                                                >
                                                    {row.fieldLabel}
                                                </Typography>
                                                <Typography
                                                    sx={{
                                                        mt: 0.35,
                                                        fontSize: '0.78rem',
                                                        color: 'rgba(32,56,45,0.56)',
                                                        fontFamily: BODY_FONT,
                                                        overflowWrap: 'anywhere',
                                                    }}
                                                >
                                                    {row.anchorLabel}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ width: 168 }}>
                                                <Stack spacing={0.65} alignItems="flex-start">
                                                    <Typography
                                                        sx={{
                                                            fontSize: '0.9rem',
                                                            fontWeight: 800,
                                                            color: 'var(--calendar-ink)',
                                                            fontFamily: BODY_FONT,
                                                        }}
                                                    >
                                                        {formatShortFieldDate(row.dateIso)}
                                                    </Typography>
                                                    <Chip
                                                        label={row.dueLabel}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{
                                                            height: 24,
                                                            borderRadius: '999px',
                                                            fontWeight: 800,
                                                            fontFamily: BODY_FONT,
                                                            ...chipSx,
                                                        }}
                                                    />
                                                </Stack>
                                            </TableCell>
                                            <TableCell sx={{ minWidth: 330 }}>
                                                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 0.7 }}>
                                                    <Chip
                                                        label={row.kind}
                                                        size="small"
                                                        sx={{
                                                            height: 22,
                                                            borderRadius: '999px',
                                                            bgcolor: 'rgba(86,184,112,0.14)',
                                                            color: 'var(--calendar-green)',
                                                            fontWeight: 800,
                                                            fontFamily: BODY_FONT,
                                                        }}
                                                    />
                                                    <Chip
                                                        label={row.weekLabel}
                                                        size="small"
                                                        sx={{
                                                            height: 22,
                                                            borderRadius: '999px',
                                                            bgcolor: 'rgba(35,64,52,0.08)',
                                                            color: 'rgba(35,64,52,0.78)',
                                                            fontWeight: 700,
                                                            fontFamily: BODY_FONT,
                                                        }}
                                                    />
                                                </Stack>
                                                <Typography
                                                    sx={{
                                                        fontSize: '0.92rem',
                                                        lineHeight: 1.65,
                                                        color: 'rgba(32,56,45,0.78)',
                                                        fontFamily: BODY_FONT,
                                                        overflowWrap: 'anywhere',
                                                    }}
                                                >
                                                    {row.activity}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ width: 150 }}>
                                                <Typography
                                                    sx={{
                                                        fontSize: '0.88rem',
                                                        fontWeight: 800,
                                                        color: 'rgba(32,56,45,0.72)',
                                                        fontFamily: BODY_FONT,
                                                        overflowWrap: 'anywhere',
                                                    }}
                                                >
                                                    {row.sourceLabel}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ width: 150 }}>
                                                <Typography
                                                    sx={{
                                                        fontSize: '0.88rem',
                                                        color: 'rgba(32,56,45,0.68)',
                                                        fontFamily: BODY_FONT,
                                                        overflowWrap: 'anywhere',
                                                    }}
                                                >
                                                    {row.cropLabel}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Stack>
        </Paper>
    )
}

function SeasonStatCard({
    icon,
    label,
    value,
    helper,
    accent,
}: {
    icon: React.ReactNode
    label: string
    value: string
    helper: string
    accent: string
}) {
    return (
        <Paper
            sx={{
                p: 2,
                height: '100%',
                borderRadius: '22px',
                border: `1px solid ${alpha(accent, 0.16)}`,
                bgcolor: alpha(accent, 0.07),
                boxShadow: 'none',
            }}
        >
            <Box
                sx={{
                    width: 42,
                    height: 42,
                    borderRadius: '14px',
                    display: 'grid',
                    placeItems: 'center',
                    mb: 1.2,
                    color: accent,
                    bgcolor: alpha(accent, 0.12),
                }}
            >
                {icon}
            </Box>
            <Typography
                sx={{
                    fontSize: '0.7rem',
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    fontWeight: 800,
                    color: alpha(accent, 0.88),
                    mb: 0.55,
                    fontFamily: BODY_FONT,
                }}
            >
                {label}
            </Typography>
            <Typography
                sx={{
                    fontSize: '1.45rem',
                    lineHeight: 1.05,
                    fontWeight: 900,
                    color: '#20382d',
                    fontFamily: DISPLAY_FONT,
                    mb: 0.45,
                }}
            >
                {value}
            </Typography>
            <Typography
                sx={{
                    fontSize: '0.83rem',
                    lineHeight: 1.55,
                    color: 'rgba(32,56,45,0.66)',
                    fontFamily: BODY_FONT,
                }}
            >
                {helper}
            </Typography>
        </Paper>
    )
}

function TemplateToggle({
    template,
    active,
    onSelect,
}: {
    template: FarmingCalendarTemplate
    active: boolean
    onSelect: () => void
}) {
    return (
        <Button
            variant={active ? 'contained' : 'outlined'}
            onClick={onSelect}
            sx={{
                minWidth: 182,
                px: 2.25,
                py: 1.1,
                borderRadius: '16px',
                textTransform: 'none',
                fontWeight: 800,
                fontFamily: BODY_FONT,
                letterSpacing: '0.01em',
                boxShadow: active ? '0 14px 28px rgba(47,127,79,0.22)' : 'none',
                bgcolor: active ? 'var(--calendar-forest)' : 'rgba(255,255,255,0.82)',
                color: active ? '#fffdf7' : 'var(--calendar-ink)',
                borderColor: active ? 'var(--calendar-forest)' : 'var(--calendar-line)',
                '&:hover': {
                    borderColor: 'var(--calendar-forest)',
                    bgcolor: active ? '#285e3d' : 'rgba(86,184,112,0.12)',
                    boxShadow: active ? '0 16px 30px rgba(47,127,79,0.24)' : 'none',
                },
            }}
        >
            {template.title}
        </Button>
    )
}

function TaskLine({ item }: { item: ScheduledTemplateTask }) {
    const kind = getActivityKind(item.activity)
    const tone = getActivityTone(kind)

    return (
        <Box
            sx={{
                p: 1.4,
                borderRadius: '18px',
                border: `1px solid ${tone.border}`,
                bgcolor: '#fffdf8',
                boxShadow: '0 10px 22px rgba(32,56,45,0.04)',
            }}
        >
            <Stack direction="row" spacing={1.25} alignItems="flex-start">
                <Box
                    sx={{
                        width: 46,
                        height: 46,
                        borderRadius: '16px',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        color: tone.accent,
                        bgcolor: tone.bg,
                    }}
                >
                    {tone.icon}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" sx={{ mb: 0.9 }}>
                        <Chip
                            label={kind}
                            size="small"
                            sx={{
                                height: 24,
                                borderRadius: '999px',
                                bgcolor: tone.labelBg,
                                color: tone.accent,
                                fontWeight: 800,
                                fontFamily: BODY_FONT,
                            }}
                        />
                        <Chip
                            label={item.weekLabel}
                            size="small"
                            sx={{
                                height: 24,
                                borderRadius: '999px',
                                bgcolor: 'rgba(35,64,52,0.08)',
                                color: 'rgba(35,64,52,0.82)',
                                fontWeight: 700,
                                fontFamily: BODY_FONT,
                            }}
                        />
                        {item.dueDate && (
                            <Chip
                                label={`Due ${formatDateOnlyLabel(item.dueDate, { day: '2-digit', month: 'short' }) || item.dueDate}`}
                                size="small"
                                sx={{
                                    height: 24,
                                    borderRadius: '999px',
                                    bgcolor: 'rgba(214,176,44,0.18)',
                                    color: '#8b6b00',
                                    fontWeight: 700,
                                    fontFamily: BODY_FONT,
                                }}
                            />
                        )}
                    </Stack>
                    <Typography
                        sx={{
                            fontSize: '0.96rem',
                            lineHeight: 1.7,
                            color: 'rgba(35,64,52,0.82)',
                            fontFamily: BODY_FONT,
                        }}
                    >
                        {item.activity}
                    </Typography>
                </Box>
            </Stack>
        </Box>
    )
}

function MonthTaskCard({
    month,
    items,
    index,
}: {
    month: number
    items: ScheduledTemplateTask[]
    index: number
}) {
    const nutrientCount = items.filter((item) => getActivityKind(item.activity) === 'Nutrient').length
    const herbicideCount = items.length - nutrientCount

    return (
        <Paper
            sx={{
                position: 'relative',
                overflow: 'hidden',
                p: { xs: 2, md: 2.2 },
                borderRadius: '26px',
                border: '1px solid rgba(86,184,112,0.18)',
                bgcolor: 'rgba(255,255,255,0.88)',
                boxShadow: '0 26px 46px rgba(35,64,52,0.07)',
                animation: 'calendarRise 0.72s cubic-bezier(0.22, 1, 0.36, 1) both',
                animationDelay: `${index * 90}ms`,
                '@keyframes calendarRise': {
                    '0%': {
                        opacity: 0,
                        transform: 'translateY(18px)',
                    },
                    '100%': {
                        opacity: 1,
                        transform: 'translateY(0)',
                    },
                },
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '5px',
                    background: 'linear-gradient(90deg, rgba(47,127,79,0.92) 0%, rgba(214,176,44,0.9) 100%)',
                },
            }}
        >
            <Stack direction="row" spacing={1.6} alignItems="flex-start" sx={{ mb: 1.8 }}>
                <Box
                    sx={{
                        width: 68,
                        height: 68,
                        borderRadius: '22px',
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: 'rgba(35,64,52,0.06)',
                        border: '1px solid rgba(35,64,52,0.08)',
                        flexShrink: 0,
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: '1.45rem',
                            fontWeight: 900,
                            color: 'var(--calendar-forest)',
                            fontFamily: DISPLAY_FONT,
                        }}
                    >
                        {month}
                    </Typography>
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                        sx={{
                            fontSize: '0.74rem',
                            letterSpacing: '0.16em',
                            textTransform: 'uppercase',
                            fontWeight: 800,
                            color: 'rgba(35,64,52,0.54)',
                            mb: 0.45,
                            fontFamily: BODY_FONT,
                        }}
                    >
                        Timeline Window
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: '1.5rem',
                            lineHeight: 1.05,
                            fontWeight: 900,
                            color: 'var(--calendar-ink)',
                            fontFamily: DISPLAY_FONT,
                            mb: 0.65,
                        }}
                    >
                        {getMonthTitle(month)}
                    </Typography>
                    <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                        <Chip
                            label={`${items.length} must-do ${items.length === 1 ? 'task' : 'tasks'}`}
                            size="small"
                            sx={{
                                height: 24,
                                borderRadius: '999px',
                                bgcolor: 'rgba(214,176,44,0.18)',
                                color: '#8b6b00',
                                fontWeight: 800,
                                fontFamily: BODY_FONT,
                            }}
                        />
                        {nutrientCount > 0 && (
                            <Chip
                                label={`${nutrientCount} nutrient`}
                                size="small"
                                sx={{
                                    height: 24,
                                    borderRadius: '999px',
                                    bgcolor: 'rgba(86,184,112,0.18)',
                                    color: '#2f7f4f',
                                    fontWeight: 700,
                                    fontFamily: BODY_FONT,
                                }}
                            />
                        )}
                        {herbicideCount > 0 && (
                            <Chip
                                label={`${herbicideCount} herbicide`}
                                size="small"
                                sx={{
                                    height: 24,
                                    borderRadius: '999px',
                                    bgcolor: 'rgba(244, 202, 173, 0.32)',
                                    color: '#c26b42',
                                    fontWeight: 700,
                                    fontFamily: BODY_FONT,
                                }}
                            />
                        )}
                    </Stack>
                </Box>
            </Stack>

            <Stack spacing={1.15}>
                {items.map((item) => (
                    <TaskLine
                        key={`${month}-${item.weekNumber}-${item.activity}`}
                        item={item}
                    />
                ))}
            </Stack>
        </Paper>
    )
}

export function FarmingCalendarPage() {
    const location = useLocation()
    const routeContext = useMemo(
        () => resolveFarmingCalendarRouteContext(location.search),
        [location.search]
    )
    const {
        data: calendarTemplates = [],
        isLoading: calendarLoading,
        isFetching: calendarFetching,
        error: calendarError,
    } = useQuery<FarmingCalendarTemplate[], Error>({
        queryKey: ['farming-calendar-templates'],
        queryFn: fetchFarmingCalendarTemplatesFromDatabase,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
    })
    const {
        data: fieldRecords = [],
        isLoading: fieldRecordsLoading,
        isFetching: fieldRecordsFetching,
        error: fieldRecordsError,
    } = useFieldManagementRecords()
    const [selectedTemplateId, setSelectedTemplateId] = useState<FarmingCalendarTemplate['id']>(
        routeContext.templateId ?? 'plant'
    )

    useEffect(() => {
        if (routeContext.templateId) {
            setSelectedTemplateId(routeContext.templateId)
        }
    }, [routeContext.templateId])

    const selectedTemplate = useMemo(
        () =>
            calendarTemplates.find((template) => template.id === selectedTemplateId) ??
            calendarTemplates[0] ??
            EMPTY_CALENDAR_TEMPLATE,
        [calendarTemplates, selectedTemplateId]
    )

    const linkedTemplateMatchesSelection = routeContext.templateId === selectedTemplate.id
    const linkedTaskDatesEnabled = linkedTemplateMatchesSelection && Boolean(routeContext.anchorDate)
    const contextLabel = routeContext.trialLabel || routeContext.fieldLabel || ''
    const todayIso = useMemo(() => getTodayDateOnly(), [])

    const fieldMonitoringRecords = useMemo(
        () => fieldRecords
            .map((record) => record.monitoring_sheet)
            .filter((record): record is SugarcaneMonitoringRecord => Boolean(record)),
        [fieldRecords]
    )

    const allScheduledTasks = useMemo(
        () => selectedTemplate.tasks
            .slice()
            .sort((left, right) => left.month - right.month || left.weekNumber - right.weekNumber)
            .map((task) => ({
                ...task,
                dueDate: linkedTaskDatesEnabled && routeContext.anchorDate
                    ? buildAnchoredCalendarTaskDate(selectedTemplate, task, routeContext.anchorDate)
                    : null,
            })),
        [linkedTaskDatesEnabled, routeContext.anchorDate, selectedTemplate]
    )

    const monthSections = useMemo(() => {
        const grouped = new Map<number, ScheduledTemplateTask[]>()

        allScheduledTasks.forEach((task) => {
            const items = grouped.get(task.month) ?? []
            items.push(task)
            grouped.set(task.month, items)
        })

        return Array.from(grouped.entries()).sort((left, right) => left[0] - right[0])
    }, [allScheduledTasks])

    const seasonSummary = useMemo(() => {
        const nutrientCount = allScheduledTasks.filter((task) => getActivityKind(task.activity) === 'Nutrient').length
        const herbicideCount = allScheduledTasks.length - nutrientCount

        return {
            totalTasks: allScheduledTasks.length,
            totalMonths: monthSections.length,
            nutrientCount,
            herbicideCount,
            monthLabels: monthSections.map(([month]) => getMonthTitle(month)),
        }
    }, [allScheduledTasks, monthSections])

    const currentCalendarWeek = useMemo(
        () => linkedTaskDatesEnabled && routeContext.anchorDate
            ? getCurrentCalendarWeek(selectedTemplate, routeContext.anchorDate, todayIso)
            : null,
        [linkedTaskDatesEnabled, routeContext.anchorDate, selectedTemplate, todayIso]
    )

    const currentGrowthStage = useMemo(
        () => currentCalendarWeek == null
            ? null
            : getGrowthStageForWeek(selectedTemplate.growthStages, currentCalendarWeek),
        [currentCalendarWeek, selectedTemplate]
    )

    const currentGrowthStageWindow = useMemo(
        () => currentGrowthStage && routeContext.anchorDate
            ? {
                startDate: buildAnchoredWeekDate(selectedTemplate, currentGrowthStage.startWeek, routeContext.anchorDate),
                endDate: buildAnchoredWeekDate(selectedTemplate, currentGrowthStage.endWeek, routeContext.anchorDate),
            }
            : null,
        [currentGrowthStage, routeContext.anchorDate, selectedTemplate]
    )

    const stageTasks = useMemo(
        () => currentGrowthStage
            ? allScheduledTasks.filter((task) =>
                task.weekNumber >= currentGrowthStage.startWeek && task.weekNumber <= currentGrowthStage.endWeek
            )
            : [],
        [allScheduledTasks, currentGrowthStage]
    )

    const datedActionItems = useMemo(() => {
        if (!linkedTaskDatesEnabled) {
            return []
        }

        return allScheduledTasks
            .filter((task): task is ScheduledTemplateTask & { dueDate: string } => Boolean(task.dueDate))
            .map((task) => {
                const daysUntil = Math.round(
                    (getDateOnlyTimestamp(task.dueDate) - getDateOnlyTimestamp(todayIso)) / (24 * 60 * 60 * 1000)
                )

                return {
                    ...task,
                    daysUntil,
                }
            })
            .filter((task) => task.daysUntil <= 21)
            .sort((left, right) => left.daysUntil - right.daysUntil)
            .slice(0, 4)
    }, [allScheduledTasks, linkedTaskDatesEnabled, todayIso])

    const stageActivityKinds = useMemo(
        () => Array.from(new Set(stageTasks.map((task) => getActivityKind(task.activity)))),
        [stageTasks]
    )

    const fieldWorkRows = useMemo(
        () => buildFieldWorkRows(fieldMonitoringRecords, calendarTemplates, todayIso),
        [calendarTemplates, fieldMonitoringRecords, todayIso]
    )

    const visibleFieldWorkRows = useMemo(() => {
        const activeRows = fieldWorkRows.filter((row) => row.daysUntil <= FIELD_WORK_WINDOW_DAYS)
        const sourceRows = activeRows.length > 0 ? activeRows : fieldWorkRows

        return sourceRows.slice(0, FIELD_WORK_TABLE_LIMIT)
    }, [fieldWorkRows])

    const fieldWorkTableLoading = fieldRecordsLoading || (calendarLoading && calendarTemplates.length === 0)
    const fieldWorkTableFetching = fieldRecordsFetching || calendarFetching

    return (
        <Box
            sx={{
                '--calendar-forest': '#234034',
                '--calendar-green': '#2f7f4f',
                '--calendar-gold': '#d6b02c',
                '--calendar-line': 'rgba(86,184,112,0.2)',
                '--calendar-ink': '#20382d',
                minHeight: '100vh',
                py: { xs: 3, md: 4.5 },
                background: `
                    radial-gradient(circle at top left, rgba(214,176,44,0.16), transparent 28%),
                    radial-gradient(circle at 90% 10%, rgba(86,184,112,0.16), transparent 22%),
                    linear-gradient(180deg, #f8f3e8 0%, #f3ecdf 100%)
                `,
            }}
        >
            <Container maxWidth="xl">
                <Stack spacing={3}>
                    {calendarError ? (
                        <Alert severity="error" sx={{ borderRadius: '18px' }}>
                            {calendarError.message || 'Could not load the farming calendar from the database. Run supabase/import_farming_calendar.sql, then refresh this page.'}
                        </Alert>
                    ) : null}

                    {calendarLoading ? (
                        <Paper
                            sx={{
                                p: 2.2,
                                borderRadius: '22px',
                                border: '1px solid rgba(86,184,112,0.18)',
                                bgcolor: 'rgba(255,255,255,0.86)',
                                boxShadow: '0 18px 38px rgba(35,64,52,0.04)',
                            }}
                        >
                            <Stack direction="row" spacing={1.4} alignItems="center">
                                <CircularProgress size={24} sx={{ color: 'var(--calendar-green)' }} />
                                <Typography sx={{ fontSize: '0.95rem', color: 'rgba(32,56,45,0.72)', fontWeight: 700, fontFamily: BODY_FONT }}>
                                    Loading farming calendar templates from the database.
                                </Typography>
                            </Stack>
                        </Paper>
                    ) : null}

                    {!calendarLoading && !calendarError && calendarFetching ? (
                        <Alert severity="info" sx={{ borderRadius: '18px' }}>
                            Refreshing farming calendar data from the database.
                        </Alert>
                    ) : null}

                    {!calendarLoading && !calendarError && calendarTemplates.length === 0 ? (
                        <Alert severity="warning" sx={{ borderRadius: '18px' }}>
                            No farming calendar rows were returned from the database. Run supabase/import_farming_calendar.sql to seed the Plant and Ratoon calendars.
                        </Alert>
                    ) : null}

                    <Paper
                        sx={{
                            position: 'relative',
                            overflow: 'hidden',
                            p: { xs: 2.2, md: 3.2 },
                            borderRadius: '34px',
                            border: '1px solid rgba(86,184,112,0.18)',
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(255,249,239,0.92) 100%)',
                            boxShadow: '0 30px 68px rgba(35,64,52,0.08)',
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                inset: 'auto -8% -38% auto',
                                width: 320,
                                height: 320,
                                borderRadius: '50%',
                                background: 'radial-gradient(circle, rgba(214,176,44,0.18) 0%, rgba(214,176,44,0) 70%)',
                            },
                            '&::after': {
                                content: '""',
                                position: 'absolute',
                                inset: '-12% auto auto -8%',
                                width: 280,
                                height: 280,
                                borderRadius: '50%',
                                background: 'radial-gradient(circle, rgba(86,184,112,0.18) 0%, rgba(86,184,112,0) 72%)',
                            },
                        }}
                    >
                        <Box sx={{ position: 'relative', zIndex: 1 }}>
                            <Grid container spacing={2.4}>
                                <Grid size={{ xs: 12, lg: 7 }}>
                                    <Typography
                                        sx={{
                                            fontSize: '0.78rem',
                                            color: 'var(--calendar-green)',
                                            letterSpacing: '0.18em',
                                            textTransform: 'uppercase',
                                            fontWeight: 900,
                                            mb: 1,
                                            fontFamily: BODY_FONT,
                                        }}
                                    >
                                        Farm Calendar
                                    </Typography>
                                    <Typography
                                        sx={{
                                            fontSize: { xs: '2.25rem', md: '3.3rem' },
                                            lineHeight: 0.98,
                                            letterSpacing: '-0.04em',
                                            color: 'var(--calendar-ink)',
                                            fontWeight: 900,
                                            fontFamily: DISPLAY_FONT,
                                            maxWidth: 680,
                                            mb: 1.2,
                                        }}
                                    >
                                        {contextLabel && linkedTemplateMatchesSelection
                                            ? `${selectedTemplate.title} plan for ${contextLabel}`
                                            : `${selectedTemplate.title} activity interface`}
                                    </Typography>
                                    <Typography
                                        sx={{
                                            fontSize: '1rem',
                                            lineHeight: 1.8,
                                            color: 'rgba(32,56,45,0.68)',
                                            maxWidth: 640,
                                            mb: 2.2,
                                            fontFamily: BODY_FONT,
                                        }}
                                    >
                                        Must-do fertiliser and herbicide timing only, arranged as a cleaner season board with linked trial dates when available.
                                    </Typography>

                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.1} useFlexGap flexWrap="wrap" sx={{ mb: 1.8 }}>
                                        {calendarTemplates.map((template) => (
                                            <TemplateToggle
                                                key={template.id}
                                                template={template}
                                                active={template.id === selectedTemplateId}
                                                onSelect={() => setSelectedTemplateId(template.id)}
                                            />
                                        ))}
                                    </Stack>

                                    {(routeContext.trialLabel || routeContext.fieldLabel || routeContext.cropClass || routeContext.anchorDate || routeContext.templateId) && (
                                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                            {routeContext.trialLabel && (
                                                <Chip
                                                    label={`Trial: ${routeContext.trialLabel}`}
                                                    sx={{
                                                        borderRadius: '999px',
                                                        bgcolor: 'rgba(86,184,112,0.14)',
                                                        border: '1px solid rgba(86,184,112,0.22)',
                                                        color: 'var(--calendar-forest)',
                                                        fontWeight: 700,
                                                        fontFamily: BODY_FONT,
                                                    }}
                                                />
                                            )}
                                            {routeContext.fieldLabel && routeContext.fieldLabel !== routeContext.trialLabel && (
                                                <Chip
                                                    label={`Field: ${routeContext.fieldLabel}`}
                                                    sx={{
                                                        borderRadius: '999px',
                                                        bgcolor: 'rgba(86,184,112,0.14)',
                                                        border: '1px solid rgba(86,184,112,0.22)',
                                                        color: 'var(--calendar-forest)',
                                                        fontWeight: 700,
                                                        fontFamily: BODY_FONT,
                                                    }}
                                                />
                                            )}
                                            {routeContext.cropClass && (
                                                <Chip
                                                    label={routeContext.cropClass}
                                                    sx={{
                                                        borderRadius: '999px',
                                                        bgcolor: 'rgba(35,64,52,0.08)',
                                                        color: 'var(--calendar-ink)',
                                                        fontWeight: 700,
                                                        fontFamily: BODY_FONT,
                                                    }}
                                                />
                                            )}
                                            {routeContext.anchorDate && linkedTemplateMatchesSelection && (
                                                <Chip
                                                    label={`${selectedTemplate.referenceLabel}: ${formatDateOnlyLabel(routeContext.anchorDate, { day: '2-digit', month: 'short', year: 'numeric' }) || routeContext.anchorDate}`}
                                                    sx={{
                                                        borderRadius: '999px',
                                                        bgcolor: 'rgba(214,176,44,0.18)',
                                                        border: '1px solid rgba(214,176,44,0.26)',
                                                        color: '#8b6b00',
                                                        fontWeight: 800,
                                                        fontFamily: BODY_FONT,
                                                    }}
                                                />
                                            )}
                                            {routeContext.templateId && !linkedTemplateMatchesSelection && (
                                                <Chip
                                                    label={`Switch back to ${calendarTemplates.find((template) => template.id === routeContext.templateId)?.title || 'the linked template'} to see dated tasks for this trial.`}
                                                    sx={{
                                                        borderRadius: '999px',
                                                        bgcolor: 'rgba(255,255,255,0.78)',
                                                        border: '1px solid rgba(214,176,44,0.22)',
                                                        color: 'rgba(32,56,45,0.72)',
                                                        fontWeight: 700,
                                                        fontFamily: BODY_FONT,
                                                    }}
                                                />
                                            )}
                                        </Stack>
                                    )}
                                </Grid>

                                <Grid size={{ xs: 12, lg: 5 }}>
                                    <Grid container spacing={1.3}>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <SeasonStatCard
                                                icon={<CalendarMonthRounded fontSize="small" />}
                                                label="Active Template"
                                                value={selectedTemplate.title}
                                                helper={`Months ${selectedTemplate.monthRange[0]} to ${selectedTemplate.monthRange[1]}`}
                                                accent="#2f7f4f"
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <SeasonStatCard
                                                icon={<TaskAltRounded fontSize="small" />}
                                                label="Must-Do Tasks"
                                                value={String(seasonSummary.totalTasks)}
                                                helper={`${seasonSummary.totalMonths} active month windows`}
                                                accent="#d6b02c"
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <SeasonStatCard
                                                icon={<ScienceRounded fontSize="small" />}
                                                label="Nutrient Passes"
                                                value={String(seasonSummary.nutrientCount)}
                                                helper="Fertiliser and split nutrient timings"
                                                accent="#2f7f4f"
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <SeasonStatCard
                                                icon={<GrassRounded fontSize="small" />}
                                                label="Herbicide Passes"
                                                value={String(seasonSummary.herbicideCount)}
                                                helper="Weed-control timing checkpoints"
                                                accent="#d27f52"
                                            />
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Box>
                    </Paper>

                    <FieldWorkTable
                        rows={visibleFieldWorkRows}
                        totalRows={fieldWorkRows.length}
                        isLoading={fieldWorkTableLoading}
                        isFetching={fieldWorkTableFetching}
                        error={fieldRecordsError}
                    />

                    <Grid container spacing={2.6} alignItems="flex-start">
                        <Grid size={{ xs: 12, lg: 4 }}>
                            <Paper
                                sx={{
                                    position: { lg: 'sticky' },
                                    top: { lg: 88 },
                                    p: 2.2,
                                    borderRadius: '28px',
                                    border: '1px solid rgba(86,184,112,0.18)',
                                    bgcolor: 'rgba(255,255,255,0.84)',
                                    boxShadow: '0 22px 44px rgba(35,64,52,0.06)',
                                }}
                            >
                                <Stack spacing={2}>
                                    <Box>
                                        <Typography
                                            sx={{
                                                fontSize: '0.74rem',
                                                letterSpacing: '0.16em',
                                                textTransform: 'uppercase',
                                                fontWeight: 800,
                                                color: 'rgba(35,64,52,0.54)',
                                                mb: 0.55,
                                                fontFamily: BODY_FONT,
                                            }}
                                        >
                                            Season Snapshot
                                        </Typography>
                                        <Typography
                                            sx={{
                                                fontSize: '1.45rem',
                                                lineHeight: 1.08,
                                                fontWeight: 900,
                                                color: 'var(--calendar-ink)',
                                                fontFamily: DISPLAY_FONT,
                                                mb: 0.8,
                                            }}
                                        >
                                            {linkedTaskDatesEnabled && routeContext.anchorDate
                                                ? 'This schedule is dated and ready to follow.'
                                                : 'This view keeps the calendar focused on action dates.'}
                                        </Typography>
                                        <Typography
                                            sx={{
                                                fontSize: '0.9rem',
                                                lineHeight: 1.75,
                                                color: 'rgba(32,56,45,0.66)',
                                                fontFamily: BODY_FONT,
                                            }}
                                        >
                                            {linkedTaskDatesEnabled && routeContext.anchorDate
                                                ? `${selectedTemplate.referenceLabel} is locked to ${formatDateOnlyLabel(routeContext.anchorDate) || routeContext.anchorDate}, so each task card now shows a real due date.`
                                                : `Add ${selectedTemplate.referenceLabel.toLowerCase()} on the monitoring record if you want the month cards to show real due dates for this trial.`}
                                        </Typography>
                                    </Box>

                                    <Paper
                                        sx={{
                                            p: 1.6,
                                            borderRadius: '22px',
                                            border: '1px solid rgba(214,176,44,0.22)',
                                            bgcolor: 'rgba(255,250,236,0.94)',
                                            boxShadow: 'none',
                                        }}
                                    >
                                        <Stack spacing={1.2}>
                                            <Stack direction="row" spacing={1.1} alignItems="center">
                                                <Box
                                                    sx={{
                                                        width: 38,
                                                        height: 38,
                                                        borderRadius: '14px',
                                                        display: 'grid',
                                                        placeItems: 'center',
                                                        bgcolor: 'rgba(214,176,44,0.16)',
                                                        color: '#8b6b00',
                                                    }}
                                                >
                                                    <FlagRounded fontSize="small" />
                                                </Box>
                                                <Box>
                                                    <Typography
                                                        sx={{
                                                            fontSize: '0.72rem',
                                                            letterSpacing: '0.14em',
                                                            textTransform: 'uppercase',
                                                            fontWeight: 800,
                                                            color: 'rgba(139,107,0,0.82)',
                                                            fontFamily: BODY_FONT,
                                                        }}
                                                    >
                                                        Reference Point
                                                    </Typography>
                                                    <Typography
                                                        sx={{
                                                            fontSize: '0.98rem',
                                                            fontWeight: 800,
                                                            color: 'var(--calendar-ink)',
                                                            fontFamily: DISPLAY_FONT,
                                                        }}
                                                    >
                                                        {selectedTemplate.referenceLabel}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                            <Typography
                                                sx={{
                                                    fontSize: '0.88rem',
                                                    lineHeight: 1.7,
                                                    color: 'rgba(32,56,45,0.68)',
                                                    fontFamily: BODY_FONT,
                                                }}
                                            >
                                                {linkedTaskDatesEnabled && routeContext.anchorDate
                                                    ? formatDateOnlyLabel(routeContext.anchorDate) || routeContext.anchorDate
                                                    : 'Not linked to a recorded date yet.'}
                                            </Typography>
                                        </Stack>
                                    </Paper>

                                    <Paper
                                        sx={{
                                            p: 1.6,
                                            borderRadius: '22px',
                                            border: '1px solid rgba(86,184,112,0.22)',
                                            bgcolor: 'rgba(247,252,248,0.96)',
                                            boxShadow: 'none',
                                        }}
                                    >
                                        <Stack spacing={1.25}>
                                            <Stack direction="row" spacing={1.1} alignItems="center">
                                                <Box
                                                    sx={{
                                                        width: 38,
                                                        height: 38,
                                                        borderRadius: '14px',
                                                        display: 'grid',
                                                        placeItems: 'center',
                                                        bgcolor: 'rgba(86,184,112,0.14)',
                                                        color: 'var(--calendar-green)',
                                                    }}
                                                >
                                                    <TimelineRounded fontSize="small" />
                                                </Box>
                                                <Box>
                                                    <Typography
                                                        sx={{
                                                            fontSize: '0.72rem',
                                                            letterSpacing: '0.14em',
                                                            textTransform: 'uppercase',
                                                            fontWeight: 800,
                                                            color: 'rgba(35,64,52,0.7)',
                                                            fontFamily: BODY_FONT,
                                                        }}
                                                    >
                                                        Growth Stage
                                                    </Typography>
                                                    <Typography
                                                        sx={{
                                                            fontSize: '1rem',
                                                            fontWeight: 800,
                                                            color: 'var(--calendar-ink)',
                                                            fontFamily: DISPLAY_FONT,
                                                        }}
                                                    >
                                                        {currentGrowthStage?.title || 'Stage not dated yet'}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                            <Typography
                                                sx={{
                                                    fontSize: '0.88rem',
                                                    lineHeight: 1.7,
                                                    color: 'rgba(32,56,45,0.68)',
                                                    fontFamily: BODY_FONT,
                                                }}
                                            >
                                                {linkedTaskDatesEnabled && currentGrowthStage
                                                    ? currentGrowthStage.summary
                                                    : `Link ${selectedTemplate.referenceLabel.toLowerCase()} to calculate the crop growth stage from the saved dates.`}
                                            </Typography>
                                            <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                                                {currentCalendarWeek != null && (
                                                    <Chip
                                                        label={`Week ${Math.max(currentCalendarWeek, 0)}`}
                                                        size="small"
                                                        sx={{
                                                            height: 24,
                                                            borderRadius: '999px',
                                                            bgcolor: 'rgba(86,184,112,0.18)',
                                                            color: 'var(--calendar-green)',
                                                            fontWeight: 800,
                                                            fontFamily: BODY_FONT,
                                                        }}
                                                    />
                                                )}
                                                {currentGrowthStageWindow?.startDate && currentGrowthStageWindow?.endDate && (
                                                    <Chip
                                                        label={`${formatDateOnlyLabel(currentGrowthStageWindow.startDate, { day: '2-digit', month: 'short' }) || currentGrowthStageWindow.startDate} to ${formatDateOnlyLabel(currentGrowthStageWindow.endDate, { day: '2-digit', month: 'short' }) || currentGrowthStageWindow.endDate}`}
                                                        size="small"
                                                        sx={{
                                                            height: 24,
                                                            borderRadius: '999px',
                                                            bgcolor: 'rgba(35,64,52,0.08)',
                                                            color: 'var(--calendar-ink)',
                                                            fontWeight: 700,
                                                            fontFamily: BODY_FONT,
                                                        }}
                                                    />
                                                )}
                                            </Stack>
                                            <Stack spacing={0.85}>
                                                {selectedTemplate.growthStages.map((stage) => {
                                                    const isActive = currentGrowthStage?.key === stage.key && linkedTaskDatesEnabled

                                                    return (
                                                        <Box
                                                            key={stage.key}
                                                            sx={{
                                                                p: 1.05,
                                                                borderRadius: '16px',
                                                                border: `1px solid ${isActive ? 'rgba(86,184,112,0.28)' : 'rgba(35,64,52,0.1)'}`,
                                                                bgcolor: isActive ? 'rgba(86,184,112,0.12)' : 'rgba(255,255,255,0.74)',
                                                            }}
                                                        >
                                                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                                                                <Typography
                                                                    sx={{
                                                                        fontSize: '0.9rem',
                                                                        fontWeight: 800,
                                                                        color: 'var(--calendar-ink)',
                                                                        fontFamily: BODY_FONT,
                                                                    }}
                                                                >
                                                                    {stage.title}
                                                                </Typography>
                                                                <Chip
                                                                    label={`Weeks ${stage.startWeek}-${stage.endWeek}`}
                                                                    size="small"
                                                                    sx={{
                                                                        height: 22,
                                                                        borderRadius: '999px',
                                                                        bgcolor: isActive ? 'rgba(255,255,255,0.86)' : 'rgba(35,64,52,0.08)',
                                                                        color: 'rgba(32,56,45,0.76)',
                                                                        fontWeight: 700,
                                                                        fontFamily: BODY_FONT,
                                                                    }}
                                                                />
                                                            </Stack>
                                                        </Box>
                                                    )
                                                })}
                                            </Stack>
                                        </Stack>
                                    </Paper>

                                    <Paper
                                        sx={{
                                            p: 1.6,
                                            borderRadius: '22px',
                                            border: '1px solid rgba(47,127,79,0.2)',
                                            bgcolor: 'rgba(255,255,255,0.92)',
                                            boxShadow: 'none',
                                        }}
                                    >
                                        <Stack spacing={1.15}>
                                            <Stack direction="row" spacing={1.1} alignItems="center">
                                                <Box
                                                    sx={{
                                                        width: 38,
                                                        height: 38,
                                                        borderRadius: '14px',
                                                        display: 'grid',
                                                        placeItems: 'center',
                                                        bgcolor: 'rgba(47,127,79,0.12)',
                                                        color: 'var(--calendar-green)',
                                                    }}
                                                >
                                                    <TaskAltRounded fontSize="small" />
                                                </Box>
                                                <Box>
                                                    <Typography
                                                        sx={{
                                                            fontSize: '0.72rem',
                                                            letterSpacing: '0.14em',
                                                            textTransform: 'uppercase',
                                                            fontWeight: 800,
                                                            color: 'rgba(35,64,52,0.7)',
                                                            fontFamily: BODY_FONT,
                                                        }}
                                                    >
                                                        Activities To Do
                                                    </Typography>
                                                    <Typography
                                                        sx={{
                                                            fontSize: '1rem',
                                                            fontWeight: 800,
                                                            color: 'var(--calendar-ink)',
                                                            fontFamily: DISPLAY_FONT,
                                                        }}
                                                    >
                                                        {datedActionItems.length > 0
                                                            ? 'Priority actions from the dates'
                                                            : currentGrowthStage
                                                                ? `${currentGrowthStage.title} focus`
                                                                : 'Link dates to date the work'}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                            <Typography
                                                sx={{
                                                    fontSize: '0.88rem',
                                                    lineHeight: 1.7,
                                                    color: 'rgba(32,56,45,0.68)',
                                                    fontFamily: BODY_FONT,
                                                }}
                                            >
                                                {datedActionItems.length > 0
                                                    ? 'These are the dated activities that need attention soonest from the linked crop schedule.'
                                                    : currentGrowthStage
                                                        ? 'These are the main activity types and field actions for the current growth stage.'
                                                        : 'Once a planting date or cut date is linked, the calendar will show the current activity priorities here.'}
                                            </Typography>
                                            {stageActivityKinds.length > 0 && (
                                                <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                                                    {stageActivityKinds.map((kind) => (
                                                        <Chip
                                                            key={kind}
                                                            label={kind}
                                                            size="small"
                                                            sx={{
                                                                height: 24,
                                                                borderRadius: '999px',
                                                                bgcolor: kind === 'Nutrient'
                                                                    ? 'rgba(86,184,112,0.18)'
                                                                    : 'rgba(244, 202, 173, 0.32)',
                                                                color: kind === 'Nutrient' ? '#2f7f4f' : '#c26b42',
                                                                fontWeight: 700,
                                                                fontFamily: BODY_FONT,
                                                            }}
                                                        />
                                                    ))}
                                                </Stack>
                                            )}
                                            <Stack spacing={0.9}>
                                                {datedActionItems.length > 0 ? (
                                                    datedActionItems.map((task) => (
                                                        <Box
                                                            key={`${task.weekNumber}-${task.activity}`}
                                                            sx={{
                                                                p: 1.05,
                                                                borderRadius: '16px',
                                                                border: '1px solid rgba(35,64,52,0.1)',
                                                                bgcolor: 'rgba(247,252,248,0.86)',
                                                            }}
                                                        >
                                                            <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" sx={{ mb: 0.55 }}>
                                                                <Chip
                                                                    label={formatDueLabel(task.daysUntil)}
                                                                    size="small"
                                                                    sx={{
                                                                        height: 22,
                                                                        borderRadius: '999px',
                                                                        bgcolor: task.daysUntil < 0
                                                                            ? 'rgba(210,127,82,0.18)'
                                                                            : task.daysUntil <= 7
                                                                                ? 'rgba(214,176,44,0.2)'
                                                                                : 'rgba(35,64,52,0.08)',
                                                                        color: task.daysUntil < 0 ? '#b25b34' : 'var(--calendar-ink)',
                                                                        fontWeight: 700,
                                                                        fontFamily: BODY_FONT,
                                                                    }}
                                                                />
                                                                <Chip
                                                                    label={task.weekLabel}
                                                                    size="small"
                                                                    sx={{
                                                                        height: 22,
                                                                        borderRadius: '999px',
                                                                        bgcolor: 'rgba(86,184,112,0.14)',
                                                                        color: 'var(--calendar-green)',
                                                                        fontWeight: 700,
                                                                        fontFamily: BODY_FONT,
                                                                    }}
                                                                />
                                                            </Stack>
                                                            <Typography
                                                                sx={{
                                                                    fontSize: '0.9rem',
                                                                    lineHeight: 1.65,
                                                                    color: 'var(--calendar-ink)',
                                                                    fontFamily: BODY_FONT,
                                                                }}
                                                            >
                                                                {task.activity}
                                                            </Typography>
                                                        </Box>
                                                    ))
                                                ) : currentGrowthStage ? (
                                                    currentGrowthStage.activityFocus.map((activity) => (
                                                        <Box
                                                            key={activity}
                                                            sx={{
                                                                p: 1.05,
                                                                borderRadius: '16px',
                                                                border: '1px solid rgba(35,64,52,0.1)',
                                                                bgcolor: 'rgba(247,252,248,0.86)',
                                                            }}
                                                        >
                                                            <Typography
                                                                sx={{
                                                                    fontSize: '0.9rem',
                                                                    lineHeight: 1.65,
                                                                    color: 'var(--calendar-ink)',
                                                                    fontFamily: BODY_FONT,
                                                                }}
                                                            >
                                                                {activity}
                                                            </Typography>
                                                        </Box>
                                                    ))
                                                ) : (
                                                    <Typography
                                                        sx={{
                                                            fontSize: '0.9rem',
                                                            lineHeight: 1.7,
                                                            color: 'rgba(32,56,45,0.66)',
                                                            fontFamily: BODY_FONT,
                                                        }}
                                                    >
                                                        Save a planting date or cut date on the monitoring record to unlock stage-based activity guidance.
                                                    </Typography>
                                                )}
                                            </Stack>
                                        </Stack>
                                    </Paper>

                                    <Box>
                                        <Typography
                                            sx={{
                                                fontSize: '0.74rem',
                                                letterSpacing: '0.16em',
                                                textTransform: 'uppercase',
                                                fontWeight: 800,
                                                color: 'rgba(35,64,52,0.54)',
                                                mb: 0.85,
                                                fontFamily: BODY_FONT,
                                            }}
                                        >
                                            Active Months
                                        </Typography>
                                        <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                                            {seasonSummary.monthLabels.map((label) => (
                                                <Chip
                                                    key={label}
                                                    label={label}
                                                    size="small"
                                                    sx={{
                                                        height: 28,
                                                        borderRadius: '999px',
                                                        bgcolor: 'rgba(35,64,52,0.08)',
                                                        color: 'var(--calendar-ink)',
                                                        fontWeight: 700,
                                                        fontFamily: BODY_FONT,
                                                    }}
                                                />
                                            ))}
                                        </Stack>
                                    </Box>

                                    <Box>
                                        <Typography
                                            sx={{
                                                fontSize: '0.74rem',
                                                letterSpacing: '0.16em',
                                                textTransform: 'uppercase',
                                                fontWeight: 800,
                                                color: 'rgba(35,64,52,0.54)',
                                                mb: 0.85,
                                                fontFamily: BODY_FONT,
                                            }}
                                        >
                                            Priority Bands
                                        </Typography>
                                        <Stack spacing={1}>
                                            <Box
                                                sx={{
                                                    p: 1.15,
                                                    borderRadius: '18px',
                                                    border: '1px solid rgba(47,127,79,0.18)',
                                                    bgcolor: 'rgba(86,184,112,0.1)',
                                                }}
                                            >
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <ScienceRounded sx={{ color: '#2f7f4f', fontSize: 18 }} />
                                                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--calendar-ink)', fontFamily: BODY_FONT }}>
                                                        Nutrient applications
                                                    </Typography>
                                                </Stack>
                                            </Box>
                                            <Box
                                                sx={{
                                                    p: 1.15,
                                                    borderRadius: '18px',
                                                    border: '1px solid rgba(210,127,82,0.18)',
                                                    bgcolor: 'rgba(244, 202, 173, 0.18)',
                                                }}
                                            >
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <GrassRounded sx={{ color: '#c26b42', fontSize: 18 }} />
                                                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--calendar-ink)', fontFamily: BODY_FONT }}>
                                                        Herbicide passes
                                                    </Typography>
                                                </Stack>
                                            </Box>
                                        </Stack>
                                    </Box>
                                </Stack>
                            </Paper>
                        </Grid>

                        <Grid size={{ xs: 12, lg: 8 }}>
                            {monthSections.length > 0 ? (
                                <Grid container spacing={2.2}>
                                    {monthSections.map(([month, items], index) => (
                                        <Grid
                                            key={month}
                                            size={{
                                                xs: 12,
                                                md: monthSections.length === 1 ? 12 : 6,
                                            }}
                                        >
                                            <MonthTaskCard
                                                month={month}
                                                items={items}
                                                index={index}
                                            />
                                        </Grid>
                                    ))}
                                </Grid>
                            ) : (
                                <Paper
                                    sx={{
                                        p: 3,
                                        borderRadius: '28px',
                                        border: '1px dashed rgba(86,184,112,0.26)',
                                        bgcolor: 'rgba(255,255,255,0.82)',
                                        textAlign: 'center',
                                        boxShadow: '0 18px 38px rgba(35,64,52,0.04)',
                                    }}
                                >
                                    <Stack spacing={1.2} alignItems="center">
                                        <Box
                                            sx={{
                                                width: 56,
                                                height: 56,
                                                borderRadius: '18px',
                                                display: 'grid',
                                                placeItems: 'center',
                                                bgcolor: 'rgba(86,184,112,0.12)',
                                                color: 'var(--calendar-green)',
                                            }}
                                        >
                                            <TimelineRounded />
                                        </Box>
                                        <Typography
                                            sx={{
                                                fontSize: '1.35rem',
                                                fontWeight: 900,
                                                color: 'var(--calendar-ink)',
                                                fontFamily: DISPLAY_FONT,
                                            }}
                                        >
                                            No calendar tasks are ready yet
                                        </Typography>
                                        <Typography
                                            sx={{
                                                maxWidth: 520,
                                                fontSize: '0.95rem',
                                                lineHeight: 1.8,
                                                color: 'rgba(32,56,45,0.66)',
                                                fontFamily: BODY_FONT,
                                            }}
                                        >
                                            This template does not have any yellow-highlighted must-do activities available right now.
                                        </Typography>
                                    </Stack>
                                </Paper>
                            )}
                        </Grid>
                    </Grid>
                </Stack>
            </Container>
        </Box>
    )
}
