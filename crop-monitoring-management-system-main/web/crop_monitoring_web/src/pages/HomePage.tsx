import React, { useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
    Alert,
    Box,
    CircularProgress,
    Container,
    Grid,
    Snackbar,
    Typography,
} from '@mui/material'
import {
    AgricultureOutlined,
    ArrowForward,
    MapOutlined,
    TableChartOutlined,
} from '@mui/icons-material'
import { motion, useInView } from 'framer-motion'
import {
    Cell,
    Pie,
    PieChart as RechartsPieChart,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
} from 'recharts'
import { getFarmingCalendarTemplate, type FarmingCalendarTemplate } from '@/data/farmingCalendar'
import { useSugarcaneMonitoring } from '@/hooks/useSugarcaneMonitoring'
import { fetchLivePredefinedFields, type PredefinedField } from '@/services/database.service'
import type { SugarcaneMonitoringRecord } from '@/types/database.types'
import { formatDateOnlyLabel, getDateOnlyTimestamp, normalizeDateOnlyValue } from '@/utils/dateOnly'

const MINT = '#56b870'
const MINT_DARK = '#2f7f4f'
const MINT_PALE = 'rgba(86,184,112,0.12)'
const MINT_BORDER = 'rgba(86,184,112,0.2)'
const PEACH = '#f4a28c'
const PEACH_DARK = '#de7c64'
const PEACH_PALE = 'rgba(244,162,140,0.14)'
const SKY = '#68c3d4'
const SAND = '#c4b090'
const CREAM = '#fffaf3'
const PANEL = 'rgba(255,255,255,0.94)'
const PANEL_ALT = 'rgba(255,248,242,0.96)'
const TEXT_DIM = 'rgba(35,64,52,0.52)'
const TEXT_MID = 'rgba(35,64,52,0.72)'

function SoftPattern() {
    return (
        <Box
            sx={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 0,
                borderRadius: 'inherit',
                backgroundImage: `
                    repeating-linear-gradient(135deg, transparent 0, transparent 14px, rgba(86,184,112,0.035) 14px, rgba(86,184,112,0.035) 16px),
                    radial-gradient(circle at 1px 1px, rgba(244,162,140,0.12) 1px, transparent 0)
                `,
                backgroundSize: 'auto, 22px 22px',
                opacity: 0.85,
            }}
        />
    )
}

function StatusBadge({ text, tone = 'mint' }: { text: string; tone?: 'mint' | 'peach' }) {
    const palette = tone === 'peach'
        ? {
            bg: PEACH_PALE,
            border: 'rgba(244,162,140,0.24)',
            glow: 'rgba(244,162,140,0.28)',
            text: PEACH_DARK,
        }
        : {
            bg: MINT_PALE,
            border: MINT_BORDER,
            glow: 'rgba(86,184,112,0.26)',
            text: MINT_DARK,
        }

    return (
        <Box
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                px: 1.6,
                py: 0.7,
                border: `1px solid ${palette.border}`,
                borderRadius: '999px',
                bgcolor: palette.bg,
                backdropFilter: 'blur(10px)',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 10px 24px rgba(35,64,52,0.06)',
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '60%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
                    animation: 'badgeShimmer 3.4s ease-in-out infinite',
                },
                '@keyframes badgeShimmer': {
                    '0%': { left: '-100%' },
                    '100%': { left: '180%' },
                },
            }}
        >
            <Box
                sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: palette.text,
                    boxShadow: `0 0 0 4px ${palette.glow}`,
                    animation: 'badgeBlink 1.2s step-end infinite',
                    '@keyframes badgeBlink': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0.5 },
                    },
                }}
            />
            <Typography
                sx={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    color: palette.text,
                    fontFamily: '"Times New Roman", Times, serif',
                    textTransform: 'uppercase',
                }}
            >
                {text}
            </Typography>
        </Box>
    )
}

interface FieldSnapshot {
    fieldKey: string
    fieldLabel: string
    cropType: string
    areaHa: number | null
    isTrial: boolean
    recordedDate: string
}

interface AreaFieldSnapshot {
    fieldKey: string
    fieldLabel: string
    cropType: string
    areaHa: number
}

type AreaCropGroup = 'Sugarcane' | 'Break Crop' | 'Furrow Period' | 'Unspecified'

interface AreaOverviewDatum {
    label: string
    areaHa: number
    color: string
    fieldCount: number
}

interface CalendarFieldSeed {
    fieldKey: string
    fieldLabel: string
    cropType: string
    cropClass: string
    plantingDate: string
    cutDate: string
    recordedDate: string
}

type TaskSeverity = 'overdue' | 'today' | 'soon' | 'planned'

interface UpcomingTask {
    key: string
    kind: string
    activity: string
    dateIso: string
    fieldLabel: string
    cropType: string
    weekLabel: string
    scheduleType: string
    severity: TaskSeverity
    daysUntil: number
}

interface CalendarScheduleWarning {
    key: string
    fieldLabel: string
    title: string
    detail: string
    dateIso: string | null
    source: CalendarAnchorSource | null
}

type CalendarAnchorSource = 'planting_date' | 'cut_date' | 'recorded_date'

function normalizeFieldToken(value?: string | null): string {
    return (value ?? '').trim().toLowerCase()
}

function buildFieldIdentity(fieldName?: string | null, sectionName?: string | null, blockId?: string | null): string {
    return [
        normalizeFieldToken(sectionName),
        normalizeFieldToken(blockId),
        normalizeFieldToken(fieldName),
    ].join('|')
}

function buildFieldLabel(fieldName?: string | null, sectionName?: string | null, blockId?: string | null): string {
    return [fieldName, sectionName, blockId]
        .map((value) => (value ?? '').trim())
        .filter(Boolean)
        .join(' / ') || 'Unknown field'
}

function normalizeGeometry(value: any): any | null {
    if (!value) return null
    if (typeof value === 'string') {
        try {
            return normalizeGeometry(JSON.parse(value))
        } catch {
            return null
        }
    }
    if (value.type === 'Feature') return normalizeGeometry(value.geometry)
    if (value.type === 'FeatureCollection') return normalizeGeometry(value.features?.[0]?.geometry)
    if (value.geometry) return normalizeGeometry(value.geometry)
    if (value.geom) return normalizeGeometry(value.geom)
    return value
}

function getMetersPerDegreeLatitude(latitude: number): number {
    const radians = latitude * (Math.PI / 180)
    return 111132.92 - 559.82 * Math.cos(2 * radians) + 1.175 * Math.cos(4 * radians)
}

function getMetersPerDegreeLongitude(latitude: number): number {
    const radians = latitude * (Math.PI / 180)
    return 111412.84 * Math.cos(radians) - 93.5 * Math.cos(3 * radians)
}

function getRingAreaSqMeters(ring: number[][]): number {
    if (!Array.isArray(ring) || ring.length < 3) {
        return 0
    }

    const latitudes = ring
        .map((point) => Number(point?.[1]))
        .filter((value) => Number.isFinite(value))

    if (latitudes.length === 0) {
        return 0
    }

    const meanLatitude = latitudes.reduce((sum, value) => sum + value, 0) / latitudes.length
    const metersPerLat = getMetersPerDegreeLatitude(meanLatitude)
    const metersPerLon = getMetersPerDegreeLongitude(meanLatitude)

    let area = 0

    for (let index = 0; index < ring.length; index += 1) {
        const current = ring[index] ?? []
        const next = ring[(index + 1) % ring.length] ?? []
        const currentX = Number(current[0]) * metersPerLon
        const currentY = Number(current[1]) * metersPerLat
        const nextX = Number(next[0]) * metersPerLon
        const nextY = Number(next[1]) * metersPerLat

        if (![currentX, currentY, nextX, nextY].every(Number.isFinite)) {
            continue
        }

        area += currentX * nextY - nextX * currentY
    }

    return Math.abs(area) / 2
}

function getPolygonAreaSqMeters(rings: number[][][]): number {
    if (!Array.isArray(rings) || rings.length === 0) {
        return 0
    }

    const [outerRing = [], ...holes] = rings
    const outerArea = getRingAreaSqMeters(outerRing)
    const holeArea = holes.reduce((sum, ring) => sum + getRingAreaSqMeters(ring), 0)
    return Math.max(outerArea - holeArea, 0)
}

function getGeometryAreaHa(geometry: any): number | null {
    const normalized = normalizeGeometry(geometry)
    if (!normalized?.type) {
        return null
    }

    let areaSqMeters = 0

    if (normalized.type === 'Polygon') {
        areaSqMeters = getPolygonAreaSqMeters(normalized.coordinates ?? [])
    } else if (normalized.type === 'MultiPolygon') {
        areaSqMeters = (normalized.coordinates ?? [])
            .reduce((sum: number, polygon: number[][][]) => sum + getPolygonAreaSqMeters(polygon), 0)
    }

    if (!Number.isFinite(areaSqMeters) || areaSqMeters <= 0) {
        return null
    }

    return Number((areaSqMeters / 10_000).toFixed(2))
}

function resolveMonitoringAreaHa(record: SugarcaneMonitoringRecord): number | null {
    if (typeof record.area === 'number' && Number.isFinite(record.area) && record.area > 0) {
        return Number(record.area.toFixed(2))
    }

    const recordGeometryArea = getGeometryAreaHa(record.geom_polygon)
    if (recordGeometryArea !== null && recordGeometryArea > 0) {
        return recordGeometryArea
    }

    return null
}

function resolvePredefinedFieldAreaHa(field: PredefinedField): number | null {
    if (typeof field.area === 'number' && Number.isFinite(field.area) && field.area > 0) {
        return Number(field.area.toFixed(2))
    }

    const fieldGeometryArea = getGeometryAreaHa(field.geom)
    if (fieldGeometryArea !== null && fieldGeometryArea > 0) {
        return fieldGeometryArea
    }

    return null
}

function getTodayDateOnly(): string {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function isTrialLike(value?: string | null): boolean {
    return /\btrial\b/i.test((value ?? '').trim())
}

function getAreaCropGroup(value?: string | null): AreaCropGroup {
    const normalized = (value ?? '').trim().toLowerCase()

    if (!normalized) return 'Unspecified'
    if (/break\s*crop|breakcrop/.test(normalized)) return 'Break Crop'
    if (/fallow|furrow|fullow/.test(normalized)) return 'Furrow Period'
    if (/sugar\s*cane|plant\s*cane|\bratoon\b|\bcane\b/.test(normalized)) return 'Sugarcane'
    return 'Unspecified'
}

function formatAreaHa(value: number): string {
    return `${value.toFixed(2)} ha`
}

function getDueLabel(daysUntil: number): string {
    if (daysUntil === 0) return 'Today'
    if (daysUntil === -1) return '1 day overdue'
    if (daysUntil < 0) return `${Math.abs(daysUntil)} days overdue`
    if (daysUntil === 1) return 'Tomorrow'
    return `In ${daysUntil} days`
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

function isRatoonLikeCrop(value?: string | null): boolean {
    return /\bratoon\b/i.test((value ?? '').trim())
}

function getCalendarTemplateForField(seed: CalendarFieldSeed): FarmingCalendarTemplate {
    return getFarmingCalendarTemplate(isRatoonLikeCrop(seed.cropClass) || Boolean(seed.cutDate) ? 'ratoon' : 'plant')
}

function getCalendarAnchorMeta(
    seed: CalendarFieldSeed,
    template: FarmingCalendarTemplate
): { dateIso: string | null; source: CalendarAnchorSource | null } {
    if (template.fieldAnchor === 'cut_date') {
        const cutDate = normalizeDateOnlyValue(seed.cutDate)
        if (cutDate) return { dateIso: cutDate, source: 'cut_date' }

        const plantingDate = normalizeDateOnlyValue(seed.plantingDate)
        if (plantingDate) return { dateIso: plantingDate, source: 'planting_date' }

        const recordedDate = normalizeDateOnlyValue(seed.recordedDate)
        if (recordedDate) return { dateIso: recordedDate, source: 'recorded_date' }

        return { dateIso: null, source: null }
    }

    const plantingDate = normalizeDateOnlyValue(seed.plantingDate)
    if (plantingDate) return { dateIso: plantingDate, source: 'planting_date' }

    const cutDate = normalizeDateOnlyValue(seed.cutDate)
    if (cutDate) return { dateIso: cutDate, source: 'cut_date' }

    const recordedDate = normalizeDateOnlyValue(seed.recordedDate)
    if (recordedDate) return { dateIso: recordedDate, source: 'recorded_date' }

    return { dateIso: null, source: null }
}

function getCalendarAnchorSourceLabel(source: CalendarAnchorSource | null): string {
    switch (source) {
        case 'planting_date':
            return 'Planting date'
        case 'cut_date':
            return 'Cut date'
        case 'recorded_date':
            return 'Recorded date'
        default:
            return 'Dates missing'
    }
}

function buildCalendarScheduleWarning(
    seed: CalendarFieldSeed,
    template: FarmingCalendarTemplate,
    anchorMeta: { dateIso: string | null; source: CalendarAnchorSource | null }
): CalendarScheduleWarning | null {
    const expectedSource: CalendarAnchorSource = template.fieldAnchor === 'cut_date' ? 'cut_date' : 'planting_date'

    if (!anchorMeta.source) {
        return {
            key: `${seed.fieldKey}|missing-schedule-date`,
            fieldLabel: seed.fieldLabel,
            title: 'Missing schedule dates',
            detail: 'No planting date, cut date, or recorded date is saved yet, so the Farming Calendar cannot calculate alerts for this field.',
            dateIso: null,
            source: null,
        }
    }

    if (anchorMeta.source === expectedSource) {
        return null
    }

    if (anchorMeta.source === 'recorded_date') {
        return {
            key: `${seed.fieldKey}|recorded-date-fallback`,
            fieldLabel: seed.fieldLabel,
            title: 'Using recorded date',
            detail: `The ${expectedSource === 'cut_date' ? 'cut date' : 'planting date'} is missing, so the schedule is using the saved database record date instead.`,
            dateIso: anchorMeta.dateIso,
            source: anchorMeta.source,
        }
    }

    if (expectedSource === 'cut_date') {
        return {
            key: `${seed.fieldKey}|cut-date-fallback`,
            fieldLabel: seed.fieldLabel,
            title: 'Cut date missing',
            detail: 'This ratoon schedule is temporarily anchored to the planting date until a cut date is recorded.',
            dateIso: anchorMeta.dateIso,
            source: anchorMeta.source,
        }
    }

    return {
        key: `${seed.fieldKey}|planting-date-fallback`,
        fieldLabel: seed.fieldLabel,
        title: 'Planting date missing',
        detail: 'This plant cane schedule is temporarily anchored to the cut date until a planting date is recorded.',
        dateIso: anchorMeta.dateIso,
        source: anchorMeta.source,
    }
}

function isCalendarRelevantCrop(cropType?: string | null, cropClass?: string | null): boolean {
    const combined = `${cropType ?? ''} ${cropClass ?? ''}`.trim()
    return getAreaCropGroup(combined) === 'Sugarcane'
}

function getCalendarTaskKind(activity: string): string {
    const normalized = activity.trim().toLowerCase()

    if (/harvest|haulage|burning|cutting|maturity/.test(normalized)) return 'Harvest'
    if (/fertili|ssp|map|npk|foliar|soil analysis|soil sampling|potassium|nitrogen/.test(normalized)) return 'Nutrient'
    if (/irrigation|dry-off|dry off|tam/.test(normalized)) return 'Irrigation'
    if (/herbicide|hoeing|weed/.test(normalized)) return 'Weed Control'
    if (/survey|scouting|smut|eldana|grubs|bmb|ysa|rogue/.test(normalized)) return 'Pest / Disease'
    if (/plant|seedcane|ridging|land preparation/.test(normalized)) return 'Establishment'
    return 'Field Activity'
}

function isNutrientCalendarTask(activity: string): boolean {
    return getCalendarTaskKind(activity) === 'Nutrient'
}

function getTaskSeverity(daysUntil: number): TaskSeverity {
    if (daysUntil < 0) return 'overdue'
    if (daysUntil === 0) return 'today'
    if (daysUntil <= 14) return 'soon'
    return 'planned'
}

function sortUpcomingTasks(left: UpcomingTask, right: UpcomingTask): number {
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

    return left.fieldLabel.localeCompare(right.fieldLabel)
}

function getCalendarWarningPriority(warning: CalendarScheduleWarning): number {
    if (warning.source === null) return 0
    if (warning.source === 'recorded_date') return 1
    return 2
}

function sortCalendarWarnings(left: CalendarScheduleWarning, right: CalendarScheduleWarning): number {
    const leftPriority = getCalendarWarningPriority(left)
    const rightPriority = getCalendarWarningPriority(right)

    if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority
    }

    const leftTimestamp = left.dateIso ? getDateOnlyTimestamp(left.dateIso) : Number.POSITIVE_INFINITY
    const rightTimestamp = right.dateIso ? getDateOnlyTimestamp(right.dateIso) : Number.POSITIVE_INFINITY

    if (leftTimestamp !== rightTimestamp) {
        return leftTimestamp - rightTimestamp
    }

    return left.fieldLabel.localeCompare(right.fieldLabel)
}

function OverviewInsightCard({
    eyebrow,
    title,
    children,
}: {
    eyebrow?: string
    title?: string
    children: React.ReactNode
}) {
    return (
        <Box
            sx={{
                position: 'relative',
                p: 3.2,
                height: '100%',
                overflow: 'hidden',
                borderRadius: '28px',
                border: `1px solid ${MINT_BORDER}`,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,248,242,0.95) 100%)',
                boxShadow: '0 18px 40px rgba(35,64,52,0.08)',
            }}
        >
            <SoftPattern />
            <Box sx={{ position: 'relative', zIndex: 1 }}>
                {eyebrow ? (
                    <Typography
                        sx={{
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            letterSpacing: '0.16em',
                            color: TEXT_DIM,
                            textTransform: 'uppercase',
                            fontFamily: '"Times New Roman", Times, serif',
                            mb: 1.3,
                        }}
                    >
                        {eyebrow}
                    </Typography>
                ) : null}
                {title ? (
                    <Typography
                        sx={{
                            fontSize: '1.35rem',
                            fontWeight: 800,
                            color: 'text.primary',
                            letterSpacing: '-0.02em',
                            fontFamily: '"Times New Roman", Times, serif',
                            mb: 2.2,
                        }}
                    >
                        {title}
                    </Typography>
                ) : null}
                {children}
            </Box>
        </Box>
    )
}

function TaskRow({ task }: { task: UpcomingTask }) {
    const dueTone = task.severity === 'overdue' ? 'peach' : 'mint'

    return (
        <Box
            sx={{
                display: 'flex',
                gap: 1.3,
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                p: 1.5,
                borderRadius: '18px',
                border: '1px solid rgba(86,184,112,0.16)',
                bgcolor: 'rgba(255,255,255,0.72)',
            }}
        >
            <Box sx={{ minWidth: 0 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 0.8 }}>
                    <StatusBadge text={task.kind} tone={task.kind === 'Nutrient' ? 'peach' : 'mint'} />
                    <StatusBadge text={task.weekLabel} tone="mint" />
                </Box>
                <Typography sx={{ fontSize: '0.86rem', color: TEXT_MID, lineHeight: 1.6 }}>
                    {task.fieldLabel}
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', color: 'text.primary', lineHeight: 1.6, mt: 0.25 }}>
                    {task.activity}
                </Typography>
                <Typography sx={{ fontSize: '0.76rem', color: TEXT_DIM, lineHeight: 1.6, mt: 0.25 }}>
                    {task.scheduleType} calendar · {task.cropType || 'Crop type not set'}
                </Typography>
            </Box>
            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: task.severity === 'overdue' ? PEACH_DARK : MINT_DARK, mb: 0.2 }}>
                    {formatDateOnlyLabel(task.dateIso, { day: '2-digit', month: 'short', year: 'numeric' }) || task.dateIso}
                </Typography>
                <StatusBadge text={getDueLabel(task.daysUntil)} tone={dueTone} />
            </Box>
        </Box>
    )
}

function CalendarWarningRow({ warning }: { warning: CalendarScheduleWarning }) {
    return (
        <Box
            sx={{
                display: 'flex',
                gap: 1.3,
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                p: 1.5,
                borderRadius: '18px',
                border: '1px solid rgba(244,162,140,0.2)',
                bgcolor: 'rgba(255,248,242,0.82)',
            }}
        >
            <Box sx={{ minWidth: 0 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 0.8 }}>
                    <StatusBadge text="Schedule warning" tone="peach" />
                    <StatusBadge text={getCalendarAnchorSourceLabel(warning.source)} tone="peach" />
                </Box>
                <Typography sx={{ fontSize: '0.86rem', color: TEXT_MID, lineHeight: 1.6 }}>
                    {warning.fieldLabel}
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', color: 'text.primary', lineHeight: 1.6, mt: 0.25, fontWeight: 700 }}>
                    {warning.title}
                </Typography>
                <Typography sx={{ fontSize: '0.76rem', color: TEXT_DIM, lineHeight: 1.6, mt: 0.25 }}>
                    {warning.detail}
                </Typography>
            </Box>
            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: PEACH_DARK, mb: 0.2 }}>
                    {warning.dateIso
                        ? formatDateOnlyLabel(warning.dateIso, { day: '2-digit', month: 'short', year: 'numeric' }) || warning.dateIso
                        : 'No date saved'}
                </Typography>
                <StatusBadge text={warning.dateIso ? 'Database date' : 'Action needed'} tone="peach" />
            </Box>
        </Box>
    )
}

function AreaPieChart({
    data,
    totalAreaHa,
}: {
    data: AreaOverviewDatum[]
    totalAreaHa: number
}) {
    const chartData = data.filter((entry) => entry.areaHa > 0)

    if (totalAreaHa <= 0) {
        return (
            <Box
                sx={{
                    minHeight: 320,
                    borderRadius: '24px',
                    border: '1px dashed rgba(86,184,112,0.24)',
                    bgcolor: 'rgba(255,255,255,0.56)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: 2.2,
                    textAlign: 'center',
                }}
            >
                <Typography sx={{ fontSize: '0.9rem', color: TEXT_MID, lineHeight: 1.7, maxWidth: 260 }}>
                    No mapped hectare totals are available yet for the latest dated crop records.
                </Typography>
            </Box>
        )
    }

    if (chartData.length === 0) {
        return (
            <Box
                sx={{
                    minHeight: 320,
                    borderRadius: '24px',
                    border: '1px dashed rgba(86,184,112,0.24)',
                    bgcolor: 'rgba(255,255,255,0.56)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: 2.2,
                    textAlign: 'center',
                }}
            >
                <Typography sx={{ fontSize: '0.9rem', color: TEXT_MID, lineHeight: 1.7, maxWidth: 300 }}>
                    Mapped area was found, but those fields are not yet classified as Sugarcane, Break Crop, or Furrow Period.
                </Typography>
            </Box>
        )
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.6, mb: 1.8 }}>
                {chartData.map((entry) => (
                    <Box key={entry.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.9 }}>
                        <Box
                            sx={{
                                width: 14,
                                height: 14,
                                borderRadius: '5px',
                                bgcolor: entry.color,
                                boxShadow: `0 0 0 3px ${entry.color}22`,
                                flexShrink: 0,
                            }}
                        />
                        <Typography sx={{ fontSize: '0.86rem', color: TEXT_MID, fontWeight: 700 }}>
                            {entry.label}
                        </Typography>
                    </Box>
                ))}
            </Box>

            <Box sx={{ position: 'relative', height: { xs: 300, sm: 320 } }}>
                <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                        <Pie
                            data={chartData}
                            dataKey="areaHa"
                            nameKey="label"
                            cx="50%"
                            cy="56%"
                            innerRadius={66}
                            outerRadius={112}
                            paddingAngle={3}
                            stroke="rgba(255,255,255,0.95)"
                            strokeWidth={4}
                        >
                            {chartData.map((entry) => (
                                <Cell key={entry.label} fill={entry.color} />
                            ))}
                        </Pie>
                        <RechartsTooltip
                            formatter={(value, name) => {
                                const numericValue = typeof value === 'number' ? value : Number(value ?? 0)
                                return [`${numericValue.toFixed(2)} ha`, String(name)]
                            }}
                            contentStyle={{
                                borderRadius: 14,
                                border: '1px solid rgba(86,184,112,0.16)',
                                boxShadow: '0 14px 32px rgba(35,64,52,0.1)',
                            }}
                        />
                    </RechartsPieChart>
                </ResponsiveContainer>
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Box sx={{ textAlign: 'center', px: 2 }}>
                        <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: 'text.primary', fontFamily: '"Times New Roman", Times, serif', lineHeight: 1 }}>
                            {formatAreaHa(totalAreaHa)}
                        </Typography>
                        <Typography sx={{ fontSize: '0.74rem', color: TEXT_DIM, fontFamily: '"Times New Roman", Times, serif', letterSpacing: '0.16em', textTransform: 'uppercase', mt: 0.6, fontWeight: 700 }}>
                            Total mapped area
                        </Typography>
                    </Box>
                </Box>
            </Box>

            <Box
                sx={{
                    mt: 1.6,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(140px, 1fr))' },
                    gap: 1,
                }}
            >
                {chartData.map((entry) => (
                    <Box
                        key={`${entry.label}-fields`}
                        sx={{
                            p: 1.2,
                            borderRadius: '16px',
                            border: '1px solid rgba(86,184,112,0.12)',
                            bgcolor: 'rgba(255,255,255,0.74)',
                        }}
                    >
                        <Typography
                            sx={{
                                fontSize: '0.68rem',
                                color: TEXT_DIM,
                                fontFamily: '"Times New Roman", Times, serif',
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                mb: 0.45,
                            }}
                        >
                            {entry.label}
                        </Typography>
                        <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: 'text.primary', fontFamily: '"Times New Roman", Times, serif', lineHeight: 1.1 }}>
                            {entry.fieldCount}
                        </Typography>
                        <Typography sx={{ fontSize: '0.78rem', color: TEXT_MID, mt: 0.2 }}>
                            field{entry.fieldCount === 1 ? '' : 's'}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Box>
    )
}

function ModuleCard({
    title,
    desc,
    path,
    icon,
    badge,
    delay = 0,
    accent = false,
    loadMode = 'navigate-only',
}: {
    title: string
    desc: string
    path: string
    icon: React.ReactNode
    badge?: string
    delay?: number
    accent?: boolean
    loadMode?: 'navigate-only' | 'monitoring-records'
}) {
    const navigate = useNavigate()
    const [hovered, setHovered] = useState(false)
    const [loading, setLoading] = useState(false)
    const [snackOpen, setSnackOpen] = useState(false)
    const [snackMsg, setSnackMsg] = useState('')
    const [snackSeverity, setSnackSeverity] = useState<'success' | 'error' | 'info'>('info')

    const handleCloseSnack = () => setSnackOpen(false)

    async function handleClick() {
        try {
            setLoading(true)
            if (loadMode === 'monitoring-records') {
                const { fetchMobileObservationRecords } = await import('@/services/database.service')
                const data = await fetchMobileObservationRecords()
                setSnackMsg(`Live monitoring feed: fetched ${data.length} dated field record(s)`)
                setSnackSeverity('success')
                setSnackOpen(true)
                setTimeout(() => navigate(path), 600)
                return
            }

            navigate(path)
        } catch (error: unknown) {
            console.error('ModuleCard backend error', error)
            const message = error instanceof Error ? error.message : 'Backend call failed'
            setSnackMsg(message)
            setSnackSeverity('error')
            setSnackOpen(true)
        } finally {
            setLoading(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{ height: '100%' }}
        >
            <Box
                onClick={() => { if (!loading) handleClick() }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                sx={{
                    position: 'relative',
                    p: 3.5,
                    height: '100%',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    borderRadius: '30px',
                    border: `1px solid ${accent ? 'rgba(244,162,140,0.24)' : MINT_BORDER}`,
                    background: accent
                        ? 'linear-gradient(180deg, rgba(255,250,246,0.98) 0%, rgba(255,240,233,0.98) 100%)'
                        : 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,255,249,0.96) 100%)',
                    boxShadow: hovered
                        ? '0 28px 48px rgba(35,64,52,0.12)'
                        : '0 16px 34px rgba(35,64,52,0.07)',
                    transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        background: accent
                            ? 'radial-gradient(circle at 100% 0%, rgba(244,162,140,0.14) 0%, transparent 42%)'
                            : 'radial-gradient(circle at 100% 0%, rgba(86,184,112,0.1) 0%, transparent 42%)',
                        opacity: hovered ? 1 : 0.75,
                        transition: 'opacity 0.3s ease',
                    },
                }}
            >
                <SoftPattern />
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                        <Box
                            sx={{
                                width: 56,
                                height: 56,
                                borderRadius: '20px',
                                bgcolor: accent ? PEACH_PALE : MINT_PALE,
                                border: `1px solid ${accent ? 'rgba(244,162,140,0.22)' : MINT_BORDER}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: accent ? PEACH_DARK : MINT_DARK,
                                transition: 'transform 0.3s ease',
                                transform: hovered ? 'rotate(-4deg) scale(1.04)' : 'none',
                            }}
                        >
                            {icon}
                        </Box>
                        {badge ? (
                            <Typography
                                sx={{
                                    fontSize: '0.62rem',
                                    color: TEXT_DIM,
                                    fontFamily: '"Times New Roman", Times, serif',
                                    letterSpacing: '0.12em',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {badge}
                            </Typography>
                        ) : null}
                    </Box>

                    <Typography
                        sx={{
                            fontSize: '1.35rem',
                            fontWeight: 800,
                            color: 'text.primary',
                            letterSpacing: '-0.02em',
                            fontFamily: '"Times New Roman", Times, serif',
                            mb: 1,
                        }}
                    >
                        {title}
                    </Typography>
                    <Typography sx={{ fontSize: '0.9rem', color: TEXT_MID, lineHeight: 1.7, mb: 4 }}>
                        {desc}
                    </Typography>

                    <Box
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.7,
                            color: accent ? PEACH_DARK : MINT_DARK,
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            fontFamily: '"Times New Roman", Times, serif',
                        }}
                    >
                        Open module
                        <ArrowForward
                            sx={{
                                fontSize: 15,
                                transform: hovered ? 'translateX(4px)' : 'translateX(0)',
                                transition: 'transform 0.2s ease',
                            }}
                        />
                    </Box>
                </Box>
                {loading && (
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 5,
                            bgcolor: 'rgba(255,255,255,0.68)',
                            backdropFilter: 'blur(4px)',
                        }}
                    >
                        <CircularProgress sx={{ color: accent ? PEACH_DARK : MINT_DARK }} />
                    </Box>
                )}
            </Box>
            <Snackbar open={snackOpen} autoHideDuration={4000} onClose={handleCloseSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnack} severity={snackSeverity} sx={{ width: '100%' }}>
                    {snackMsg}
                </Alert>
            </Snackbar>
        </motion.div>
    )
}

function ProtocolStep({ step, index, inView }: { step: string; index: number; inView: boolean }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: index * 0.07, duration: 0.5, ease: 'easeOut' }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 2,
                    p: 2.1,
                    height: '100%',
                    borderRadius: '22px',
                    border: `1px solid ${MINT_BORDER}`,
                    bgcolor: 'rgba(255,255,255,0.72)',
                    transition: 'transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        bgcolor: 'rgba(255,250,246,0.94)',
                        borderColor: 'rgba(244,162,140,0.24)',
                    },
                }}
            >
                <Box
                    sx={{
                        minWidth: 34,
                        height: 34,
                        borderRadius: '14px',
                        bgcolor: 'rgba(244,162,140,0.16)',
                        border: '1px solid rgba(244,162,140,0.22)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}
                >
                    <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: PEACH_DARK, fontFamily: '"Times New Roman", Times, serif' }}>
                        {String(index + 1).padStart(2, '0')}
                    </Typography>
                </Box>
                <Typography sx={{ fontSize: '0.88rem', color: TEXT_MID, lineHeight: 1.75, pt: 0.15 }}>
                    {step}
                </Typography>
            </Box>
        </motion.div>
    )
}

export function HomePage() {
    const {
        data: monitoring = [],
        isLoading: monitoringLoading,
        error: monitoringError,
    } = useSugarcaneMonitoring({ includeUndated: true })
    const {
        data: liveFields = [],
        isLoading: fieldsLoading,
        error: fieldsError,
    } = useQuery<PredefinedField[], Error>({
        queryKey: ['overview-live-fields'],
        queryFn: fetchLivePredefinedFields,
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
    })

    const fieldSnapshots = useMemo<FieldSnapshot[]>(() => {
        const latestByField = new Map<string, FieldSnapshot>()

        liveFields.forEach((field) => {
            const fieldKey = buildFieldIdentity(field.field_name, field.section_name, field.block_id)
            if (!fieldKey || fieldKey === '||') {
                return
            }

            latestByField.set(fieldKey, {
                fieldKey,
                fieldLabel: buildFieldLabel(field.field_name, field.section_name, field.block_id),
                cropType: (field.crop_type ?? '').trim() || 'Unspecified',
                areaHa: resolvePredefinedFieldAreaHa(field),
                isTrial: [field.field_name, field.section_name, field.block_id].some((value) => isTrialLike(value)),
                recordedDate: normalizeDateOnlyValue(field.date_recorded) || '',
            })
        })

        const sortedMonitoring = [...monitoring].sort(
            (left, right) => getDateOnlyTimestamp(normalizeDateOnlyValue(right.date_recorded) || '')
                - getDateOnlyTimestamp(normalizeDateOnlyValue(left.date_recorded) || '')
        )

        sortedMonitoring.forEach((record) => {
            const fieldKey = buildFieldIdentity(record.field_name, record.section_name, record.block_id)
            if (!fieldKey || fieldKey === '||') {
                return
            }

            const cropType = (record.crop_type ?? record.crop_class ?? '').trim() || 'Unspecified'
            const areaHa = resolveMonitoringAreaHa(record)
            const recordedDate = normalizeDateOnlyValue(record.date_recorded) || ''
            const existing = latestByField.get(fieldKey)

            if (!existing) {
                latestByField.set(fieldKey, {
                    fieldKey,
                    fieldLabel: buildFieldLabel(record.field_name, record.section_name, record.block_id),
                    cropType,
                    areaHa,
                    isTrial: [record.field_name, record.section_name, record.block_id].some((value) => isTrialLike(value)),
                    recordedDate,
                })
                return
            }

            if ((existing.cropType === 'Unspecified' || !existing.cropType) && cropType !== 'Unspecified') {
                existing.cropType = cropType
            }
            if ((existing.areaHa === null || existing.areaHa <= 0) && areaHa !== null && areaHa > 0) {
                existing.areaHa = areaHa
            }
            if (!existing.recordedDate && recordedDate) {
                existing.recordedDate = recordedDate
            }
        })

        return Array.from(latestByField.values())
            .sort((left, right) => getDateOnlyTimestamp(right.recordedDate) - getDateOnlyTimestamp(left.recordedDate))
    }, [liveFields, monitoring])

    const calendarFieldSeeds = useMemo<CalendarFieldSeed[]>(() => {
        const sortedMonitoring = [...monitoring].sort(
            (left, right) => getDateOnlyTimestamp(right.date_recorded) - getDateOnlyTimestamp(left.date_recorded)
        )
        const byField = new Map<string, CalendarFieldSeed>()

        sortedMonitoring.forEach((record) => {
            const fieldKey = buildFieldIdentity(record.field_name, record.section_name, record.block_id)
            if (!fieldKey || fieldKey === '||') {
                return
            }

            const existing = byField.get(fieldKey)
            const cropType = (record.crop_type ?? '').trim()
            const cropClass = (record.crop_class ?? record.crop_type ?? '').trim()
            const plantingDate = normalizeDateOnlyValue(record.planting_date) || ''
            const cutDate = normalizeDateOnlyValue(record.previous_cutting_date ?? record.previous_cutting) || ''
            const recordedDate = normalizeDateOnlyValue(record.date_recorded) || ''

            if (!existing) {
                byField.set(fieldKey, {
                    fieldKey,
                    fieldLabel: buildFieldLabel(record.field_name, record.section_name, record.block_id),
                    cropType,
                    cropClass,
                    plantingDate,
                    cutDate,
                    recordedDate,
                })
                return
            }

            if (!existing.cropType && cropType) existing.cropType = cropType
            if (!existing.cropClass && cropClass) existing.cropClass = cropClass
            if (!existing.plantingDate && plantingDate) existing.plantingDate = plantingDate
            if (!existing.cutDate && cutDate) existing.cutDate = cutDate
            if (!existing.recordedDate && recordedDate) existing.recordedDate = recordedDate
        })

        return Array.from(byField.values())
            .filter((seed) => isCalendarRelevantCrop(seed.cropType, seed.cropClass))
            .sort((left, right) => left.fieldLabel.localeCompare(right.fieldLabel))
    }, [monitoring])

    const upcomingTaskItems = useMemo<UpcomingTask[]>(() => {
        const todayIso = getTodayDateOnly()
        const todayTimestamp = getDateOnlyTimestamp(todayIso)
        const uniqueTasks = new Map<string, UpcomingTask>()

        calendarFieldSeeds.forEach((seed) => {
            const template = getCalendarTemplateForField(seed)
            const anchorMeta = getCalendarAnchorMeta(seed, template)
            const anchorDate = anchorMeta.dateIso

            if (!anchorDate) {
                return
            }

            template.tasks.forEach((task) => {
                const dateIso = addDaysToDateOnly(
                    anchorDate,
                    (task.weekNumber - template.anchorWeekNumber) * 7
                )

                if (!dateIso) {
                    return
                }

                const taskTimestamp = getDateOnlyTimestamp(dateIso)
                const daysUntil = Math.round((taskTimestamp - todayTimestamp) / 86_400_000)

                const kind = getCalendarTaskKind(task.activity)
                const taskKey = `${seed.fieldKey}|${template.id}|${task.weekNumber}|${kind}|${task.activity.toLowerCase()}`

                if (!uniqueTasks.has(taskKey)) {
                    uniqueTasks.set(taskKey, {
                        key: taskKey,
                        kind,
                        activity: task.activity,
                        dateIso,
                        fieldLabel: seed.fieldLabel,
                        cropType: seed.cropType || seed.cropClass || 'Sugarcane',
                        weekLabel: task.weekLabel,
                        scheduleType: template.title,
                        severity: getTaskSeverity(daysUntil),
                        daysUntil,
                    })
                }
            })
        })

        return Array.from(uniqueTasks.values()).sort(sortUpcomingTasks)
    }, [calendarFieldSeeds])
    const calendarWarnings = useMemo<CalendarScheduleWarning[]>(() => {
        const warnings = new Map<string, CalendarScheduleWarning>()

        calendarFieldSeeds.forEach((seed) => {
            const template = getCalendarTemplateForField(seed)
            const anchorMeta = getCalendarAnchorMeta(seed, template)
            const warning = buildCalendarScheduleWarning(seed, template, anchorMeta)

            if (warning && !warnings.has(warning.key)) {
                warnings.set(warning.key, warning)
            }
        })

        return Array.from(warnings.values()).sort(sortCalendarWarnings)
    }, [calendarFieldSeeds])

    const mappedAreaFields = useMemo<AreaFieldSnapshot[]>(() => {
        return fieldSnapshots
            .filter((snapshot) => snapshot.areaHa !== null && snapshot.areaHa > 0)
            .map((snapshot) => ({
                fieldKey: snapshot.fieldKey,
                fieldLabel: snapshot.fieldLabel,
                cropType: snapshot.cropType,
                areaHa: snapshot.areaHa as number,
            }))
            .sort((left, right) => left.fieldLabel.localeCompare(right.fieldLabel))
    }, [fieldSnapshots])
    const areaSummary = useMemo(
        () => mappedAreaFields.reduce(
            (summary, snapshot) => {
                const areaHa = snapshot.areaHa ?? 0

                summary.totalMeasuredArea += areaHa

                switch (getAreaCropGroup(snapshot.cropType)) {
                    case 'Sugarcane':
                        summary.totalSugarcaneArea += areaHa
                        summary.sugarcaneFieldCount += 1
                        break
                    case 'Break Crop':
                        summary.totalBreakCropArea += areaHa
                        summary.breakCropFieldCount += 1
                        break
                    case 'Furrow Period':
                        summary.totalFallowArea += areaHa
                        summary.fallowFieldCount += 1
                        break
                    default:
                        summary.totalUnspecifiedArea += areaHa
                        summary.unspecifiedFieldCount += 1
                        break
                }

                return summary
            },
            {
                totalMeasuredArea: 0,
                totalSugarcaneArea: 0,
                totalBreakCropArea: 0,
                totalFallowArea: 0,
                totalUnspecifiedArea: 0,
                sugarcaneFieldCount: 0,
                breakCropFieldCount: 0,
                fallowFieldCount: 0,
                unspecifiedFieldCount: 0,
            }
        ),
        [mappedAreaFields]
    )
    const areaOverviewData = useMemo<AreaOverviewDatum[]>(
        () => [
            {
                label: 'Sugarcane',
                areaHa: Number(areaSummary.totalSugarcaneArea.toFixed(2)),
                color: MINT,
                fieldCount: areaSummary.sugarcaneFieldCount,
            },
            {
                label: 'Break Crop',
                areaHa: Number(areaSummary.totalBreakCropArea.toFixed(2)),
                color: SKY,
                fieldCount: areaSummary.breakCropFieldCount,
            },
            {
                label: 'Furrow Period',
                areaHa: Number(areaSummary.totalFallowArea.toFixed(2)),
                color: PEACH,
                fieldCount: areaSummary.fallowFieldCount,
            },
            {
                label: 'Unspecified',
                areaHa: Number(areaSummary.totalUnspecifiedArea.toFixed(2)),
                color: SAND,
                fieldCount: areaSummary.unspecifiedFieldCount,
            },
        ],
        [
            areaSummary.breakCropFieldCount,
            areaSummary.fallowFieldCount,
            areaSummary.sugarcaneFieldCount,
            areaSummary.totalUnspecifiedArea,
            areaSummary.totalBreakCropArea,
            areaSummary.totalFallowArea,
            areaSummary.totalSugarcaneArea,
            areaSummary.unspecifiedFieldCount,
        ]
    )
    const nextScheduledTask = upcomingTaskItems[0] ?? null
    const nextNutrientTask = upcomingTaskItems.find((task) =>
        isNutrientCalendarTask(task.activity) && task.key !== nextScheduledTask?.key
    ) ?? null
    const upcomingTasksPreview = upcomingTaskItems.slice(0, 5)
    const nextCalendarWarning = calendarWarnings[0] ?? null
    const secondaryCalendarWarning = calendarWarnings.find((warning) => warning.key !== nextCalendarWarning?.key) ?? nextCalendarWarning
    const calendarWarningsPreview = calendarWarnings.slice(0, 3)
    const overviewError = monitoringError ?? fieldsError
    const isOverviewLoading = monitoringLoading || fieldsLoading

    const protocolRef = useRef(null)
    const protocolInView = useInView(protocolRef, { once: true, margin: '-80px' })

    const steps = [
        'Select a trial from the registry or draw a new trial boundary, then confirm block and area details.',
        'Fill in irrigation, water source, TAM, soil type, pH, and field remarks in Field Information.',
        'Add trial number, trial name, contact person, and the recorded date in Trial Information.',
        'Set crop type, crop class, planting date, previous cutting date, and expected harvest date.',
        'Capture residue type, management method, and residue remarks for the current field cycle.',
        'Record fertilizer type, nutrient application date, application rate, and foliar sampling date.',
        'Add weed application details together with pest and disease remarks from the current visit.',
        'Complete harvest date, yield, and quality remarks, then save or edit the form before submission.',
    ]
    const totalSteps = steps.length

    return (
        <Box sx={{ bgcolor: CREAM, minHeight: '100vh', position: 'relative', fontFamily: '"Times New Roman", Times, serif' }}>
            <Box
                sx={{
                    position: 'fixed',
                    inset: 0,
                    pointerEvents: 'none',
                    zIndex: 0,
                    background: `
                        radial-gradient(ellipse 38% 26% at 18% 2%, rgba(166,226,184,0.26) 0%, transparent 68%),
                        radial-gradient(ellipse 28% 22% at 85% 20%, rgba(244,162,140,0.16) 0%, transparent 72%),
                        radial-gradient(ellipse 34% 24% at 92% 92%, rgba(86,184,112,0.14) 0%, transparent 72%)
                    `,
                }}
            />

            <Container maxWidth="xl" sx={{ pb: 10, pt: { xs: 3, md: 4 }, position: 'relative', zIndex: 1 }}>
                {overviewError && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {overviewError.message}
                    </Alert>
                )}

                {isOverviewLoading ? (
                    <Box sx={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 8 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        <Grid container spacing={3} sx={{ mb: 8 }}>
                            <Grid size={{ xs: 12, lg: 6 }}>
                                <OverviewInsightCard
                                    eyebrow="Area Summary"
                                    title="Mapped Area Overview"
                                >
                                    <Typography sx={{ fontSize: '0.95rem', color: TEXT_MID, lineHeight: 1.8, maxWidth: 540, mb: 2.4 }}>
                                        Latest hectares from sugarcane_field_management, grouped by crop type: sugarcane, break crop, and furrow period.
                                    </Typography>
                                    <AreaPieChart
                                        data={areaOverviewData}
                                        totalAreaHa={Number(areaSummary.totalMeasuredArea.toFixed(2))}
                                    />
                                </OverviewInsightCard>
                            </Grid>

                            <Grid size={{ xs: 12, lg: 6 }}>
                                <OverviewInsightCard>
                                    <Grid container spacing={1.4} sx={{ mb: 2.2 }}>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <Box sx={{ p: 1.6, borderRadius: '18px', border: '1px solid rgba(86,184,112,0.16)', bgcolor: 'rgba(255,255,255,0.74)', height: '100%' }}>
                                                <Typography sx={{ fontSize: '0.74rem', color: TEXT_DIM, fontFamily: '"Times New Roman", Times, serif', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 0.6 }}>
                                                    Closest calendar task
                                                </Typography>
                                                {nextScheduledTask ? (
                                                    <>
                                                        <Typography sx={{ fontSize: '1.02rem', fontWeight: 800, color: 'text.primary', mb: 0.35 }}>
                                                            {formatDateOnlyLabel(nextScheduledTask.dateIso) || nextScheduledTask.dateIso}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '0.88rem', color: TEXT_MID, lineHeight: 1.6 }}>
                                                            {nextScheduledTask.fieldLabel}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '0.8rem', color: 'text.primary', lineHeight: 1.6, mt: 0.35 }}>
                                                            {nextScheduledTask.activity}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '0.76rem', color: PEACH_DARK, mt: 0.6 }}>
                                                            {getDueLabel(nextScheduledTask.daysUntil)}
                                                        </Typography>
                                                    </>
                                                ) : nextCalendarWarning ? (
                                                    <>
                                                        <Typography sx={{ fontSize: '0.96rem', fontWeight: 800, color: 'text.primary', mb: 0.35 }}>
                                                            {nextCalendarWarning.title}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '0.88rem', color: TEXT_MID, lineHeight: 1.6 }}>
                                                            {nextCalendarWarning.fieldLabel}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '0.8rem', color: 'text.primary', lineHeight: 1.6, mt: 0.35 }}>
                                                            {nextCalendarWarning.detail}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '0.76rem', color: PEACH_DARK, mt: 0.6 }}>
                                                            {nextCalendarWarning.dateIso
                                                                ? `Using ${formatDateOnlyLabel(nextCalendarWarning.dateIso) || nextCalendarWarning.dateIso} from the database.`
                                                                : 'Save a planting date, cut date, or recorded date to generate alerts.'}
                                                        </Typography>
                                                    </>
                                                ) : (
                                                    <Typography sx={{ fontSize: '0.88rem', color: TEXT_MID, lineHeight: 1.6 }}>
                                                        No calendar task or date warnings are available from the current database dates.
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <Box sx={{ p: 1.6, borderRadius: '18px', border: '1px solid rgba(86,184,112,0.16)', bgcolor: 'rgba(255,255,255,0.74)', height: '100%' }}>
                                                <Typography sx={{ fontSize: '0.74rem', color: TEXT_DIM, fontFamily: '"Times New Roman", Times, serif', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 0.6 }}>
                                                    Next nutrient warning
                                                </Typography>
                                                {nextNutrientTask ? (
                                                    <>
                                                        <Typography sx={{ fontSize: '1.02rem', fontWeight: 800, color: 'text.primary', mb: 0.35 }}>
                                                            {formatDateOnlyLabel(nextNutrientTask.dateIso) || nextNutrientTask.dateIso}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '0.88rem', color: TEXT_MID, lineHeight: 1.6 }}>
                                                            {nextNutrientTask.fieldLabel}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '0.8rem', color: 'text.primary', lineHeight: 1.6, mt: 0.35 }}>
                                                            {nextNutrientTask.activity}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '0.76rem', color: PEACH_DARK, mt: 0.6 }}>
                                                            {getDueLabel(nextNutrientTask.daysUntil)}
                                                        </Typography>
                                                    </>
                                                ) : secondaryCalendarWarning ? (
                                                    <>
                                                        <Typography sx={{ fontSize: '0.96rem', fontWeight: 800, color: 'text.primary', mb: 0.35 }}>
                                                            {secondaryCalendarWarning.title}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '0.88rem', color: TEXT_MID, lineHeight: 1.6 }}>
                                                            {secondaryCalendarWarning.fieldLabel}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '0.8rem', color: 'text.primary', lineHeight: 1.6, mt: 0.35 }}>
                                                            {secondaryCalendarWarning.detail}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '0.76rem', color: PEACH_DARK, mt: 0.6 }}>
                                                            {secondaryCalendarWarning.dateIso
                                                                ? 'That fallback date is also being used to time nutrient alerts.'
                                                                : 'Nutrient alerts will appear once a planting, cut, or recorded date is saved.'}
                                                        </Typography>
                                                    </>
                                                ) : (
                                                    <Typography sx={{ fontSize: '0.88rem', color: TEXT_MID, lineHeight: 1.6 }}>
                                                        No nutrient task or schedule warning is available right now from the current database dates.
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Grid>
                                    </Grid>

                                    <Typography sx={{ fontSize: '0.74rem', color: TEXT_DIM, fontFamily: '"Times New Roman", Times, serif', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 1 }}>
                                        Upcoming tasks
                                    </Typography>
                                    {upcomingTasksPreview.length > 0 ? (
                                        <Box sx={{ display: 'grid', gap: 1 }}>
                                            {upcomingTasksPreview.map((task) => (
                                                <TaskRow key={task.key} task={task} />
                                            ))}
                                        </Box>
                                    ) : calendarWarningsPreview.length > 0 ? (
                                        <Box sx={{ display: 'grid', gap: 1 }}>
                                            {calendarWarningsPreview.map((warning) => (
                                                <CalendarWarningRow key={warning.key} warning={warning} />
                                            ))}
                                        </Box>
                                    ) : (
                                        <Typography sx={{ fontSize: '0.9rem', color: TEXT_MID, lineHeight: 1.75 }}>
                                            No calendar task or date warnings are available from the current database dates.
                                        </Typography>
                                    )}
                                    {upcomingTasksPreview.length > 0 && calendarWarningsPreview.length > 0 ? (
                                        <>
                                            <Typography sx={{ fontSize: '0.74rem', color: TEXT_DIM, fontFamily: '"Times New Roman", Times, serif', textTransform: 'uppercase', letterSpacing: '0.12em', mt: 1.8, mb: 1 }}>
                                                Schedule warnings
                                            </Typography>
                                            <Box sx={{ display: 'grid', gap: 1 }}>
                                                {calendarWarningsPreview.map((warning) => (
                                                    <CalendarWarningRow key={warning.key} warning={warning} />
                                                ))}
                                            </Box>
                                        </>
                                    ) : null}
                                </OverviewInsightCard>
                            </Grid>
                        </Grid>

                    </>
                )}

                <Grid container spacing={3} sx={{ mb: 8 }}>
                    {[
                        {
                            title: 'Field Records',
                            desc: 'Review live crop observations that have real recorded dates, such as 25 March 2026.',
                            path: '/data',
                            icon: <TableChartOutlined sx={{ fontSize: 26 }} />,
                            delay: 0.15,
                            accent: false,
                            loadMode: 'monitoring-records' as const,
                        },
                        {
                            title: 'Map View',
                            desc: 'Move into the spatial workspace for boundaries, centroids, and hybrid basemap context in one place.',
                            path: '/map',
                            icon: <MapOutlined sx={{ fontSize: 26 }} />,
                            delay: 0.25,
                            accent: false,
                        },
                        {
                            title: 'Monitoring',
                            desc: 'Open the live monitoring feed with agronomy summaries, recent field activity, and analysis-ready records.',
                            path: '/monitoring',
                            icon: <AgricultureOutlined sx={{ fontSize: 26 }} />,
                            delay: 0.35,
                            accent: true,
                        },
                    ].map((item) => (
                        <Grid size={{ xs: 12, md: 4 }} key={item.title} sx={{ display: 'flex' }}>
                            <ModuleCard {...item} />
                        </Grid>
                    ))}
                </Grid>

                <Box ref={protocolRef}>
                    <Box
                        sx={{
                            position: 'relative',
                            overflow: 'hidden',
                            borderRadius: '34px',
                            border: `1px solid ${MINT_BORDER}`,
                            background: `linear-gradient(180deg, ${PANEL} 0%, ${PANEL_ALT} 100%)`,
                            boxShadow: '0 20px 46px rgba(35,64,52,0.08)',
                        }}
                    >
                        <SoftPattern />
                        <Box sx={{ height: 4, background: `linear-gradient(90deg, ${MINT}, ${PEACH}, transparent)` }} />

                        <Box sx={{ position: 'relative', zIndex: 1, p: { xs: 3.2, md: 5.5 } }}>
                            <Grid container spacing={5} alignItems="flex-start">
                                <Grid size={{ xs: 12, md: 4 }}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={protocolInView ? { opacity: 1, y: 0 } : {}}
                                        transition={{ duration: 0.7 }}
                                    >
                                        <StatusBadge text="Web form flow" />
                                        <Typography
                                            sx={{
                                                fontSize: 'clamp(1.7rem, 3vw, 2.4rem)',
                                                fontWeight: 800,
                                                fontFamily: '"Times New Roman", Times, serif',
                                                letterSpacing: '-0.03em',
                                                color: 'text.primary',
                                                lineHeight: 1.12,
                                                mt: 2.2,
                                                mb: 2,
                                            }}
                                        >
                                            Collection steps that feel{' '}
                                            <Box component="span" sx={{ color: PEACH_DARK }}>
                                                calm and clear
                                            </Box>
                                        </Typography>
                                        <Typography sx={{ fontSize: '0.92rem', color: TEXT_MID, lineHeight: 1.8, mb: 3.2 }}>
                                            This checklist now mirrors the current web intake form so each section follows the same order users see while capturing live field records.
                                        </Typography>

                                        <Box sx={{ mb: 1 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                                                <Typography sx={{ fontSize: '0.62rem', color: TEXT_DIM, fontFamily: '"Times New Roman", Times, serif', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                                                    Steps ready
                                                </Typography>
                                                <Typography sx={{ fontSize: '0.62rem', color: MINT_DARK, fontFamily: '"Times New Roman", Times, serif' }}>
                                                    {totalSteps} / {totalSteps}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ height: 8, borderRadius: 99, bgcolor: 'rgba(86,184,112,0.08)', overflow: 'hidden' }}>
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={protocolInView ? { width: '100%' } : {}}
                                                    transition={{ delay: 0.3, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                                                    style={{
                                                        height: '100%',
                                                        borderRadius: 999,
                                                        background: `linear-gradient(90deg, ${MINT}, ${PEACH})`,
                                                    }}
                                                />
                                            </Box>
                                        </Box>
                                    </motion.div>
                                </Grid>

                                <Grid size={{ xs: 12, md: 8 }}>
                                    <Grid container spacing={1.2}>
                                        {steps.map((step, index) => (
                                            <Grid size={{ xs: 12, sm: 6 }} key={step}>
                                                <ProtocolStep step={step} index={index} inView={protocolInView} />
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Box>

                        <AgricultureOutlined
                            sx={{
                                position: 'absolute',
                                bottom: -18,
                                right: -18,
                                fontSize: 180,
                                opacity: 0.05,
                                color: MINT,
                                transform: 'rotate(-10deg)',
                            }}
                        />
                    </Box>
                </Box>
            </Container>
        </Box>
    )
}
