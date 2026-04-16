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
} from 'recharts'
import { HARVEST_PROXIMITY_TASKS } from '@/data/farmingCalendar'
import { useSugarcaneMonitoring } from '@/hooks/useSugarcaneMonitoring'
import { fetchLivePredefinedFields, type PredefinedField } from '@/services/database.service'
import { getAreaCropGroup } from '@/utils/cropGrouping'
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

interface AreaFieldSnapshot {
    fieldKey: string
    fieldLabel: string
    cropType: string
    areaHa: number
}

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
    expectedHarvestDate: string
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
}

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

function formatAreaHa(value: number): string {
    return `${value.toFixed(2)} ha`
}

function getOptionalDateTimestamp(value?: string | null): number {
    const normalized = (value ?? '').trim()

    if (!normalized) {
        return 0
    }

    const parsed = Date.parse(normalized)
    return Number.isFinite(parsed) ? parsed : 0
}

function isFieldRecordNewer(candidate: PredefinedField, current: PredefinedField): boolean {
    const candidateRecordedDate = getDateOnlyTimestamp(normalizeDateOnlyValue(candidate.date_recorded) || '')
    const currentRecordedDate = getDateOnlyTimestamp(normalizeDateOnlyValue(current.date_recorded) || '')

    if (candidateRecordedDate !== currentRecordedDate) {
        return candidateRecordedDate > currentRecordedDate
    }

    const candidateUpdatedAt = getOptionalDateTimestamp(candidate.updated_at)
    const currentUpdatedAt = getOptionalDateTimestamp(current.updated_at)

    if (candidateUpdatedAt !== currentUpdatedAt) {
        return candidateUpdatedAt > currentUpdatedAt
    }

    const candidateCreatedAt = getOptionalDateTimestamp(candidate.created_at)
    const currentCreatedAt = getOptionalDateTimestamp(current.created_at)

    if (candidateCreatedAt !== currentCreatedAt) {
        return candidateCreatedAt > currentCreatedAt
    }

    return String(candidate.id ?? '') > String(current.id ?? '')
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

function isCalendarRelevantCrop(cropType?: string | null, cropClass?: string | null): boolean {
    const combined = `${cropType ?? ''} ${cropClass ?? ''}`.trim()
    return getAreaCropGroup(combined) === 'Sugarcane'
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

function sortCalendarWarnings(left: CalendarScheduleWarning, right: CalendarScheduleWarning): number {
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
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1.3,
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                p: 1.5,
                borderRadius: '18px',
                border: '1px solid rgba(86,184,112,0.16)',
                bgcolor: 'rgba(255,255,255,0.72)',
            }}
        >
            <Box sx={{ minWidth: 0, flex: 1 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 0.8 }}>
                    <StatusBadge text={task.kind} tone="mint" />
                    <StatusBadge text={task.weekLabel} tone="mint" />
                </Box>
                <Typography sx={{ fontSize: '0.86rem', color: TEXT_MID, lineHeight: 1.6, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                    {task.fieldLabel}
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', color: 'text.primary', lineHeight: 1.6, mt: 0.25, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                    {task.activity}
                </Typography>
                <Typography sx={{ fontSize: '0.76rem', color: TEXT_DIM, lineHeight: 1.6, mt: 0.25, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                    Linked to {task.scheduleType} · {task.cropType || 'Sugarcane'}
                </Typography>
            </Box>
            <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, flexShrink: 0 }}>
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
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1.3,
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                p: 1.5,
                borderRadius: '18px',
                border: '1px solid rgba(244,162,140,0.2)',
                bgcolor: 'rgba(255,248,242,0.82)',
            }}
        >
            <Box sx={{ minWidth: 0, flex: 1 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 0.8 }}>
                    <StatusBadge text="Expected harvest" tone="peach" />
                    <StatusBadge text="Action needed" tone="peach" />
                </Box>
                <Typography sx={{ fontSize: '0.86rem', color: TEXT_MID, lineHeight: 1.6, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                    {warning.fieldLabel}
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', color: 'text.primary', lineHeight: 1.6, mt: 0.25, fontWeight: 700, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                    {warning.title}
                </Typography>
                <Typography sx={{ fontSize: '0.76rem', color: TEXT_DIM, lineHeight: 1.6, mt: 0.25, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                    {warning.detail}
                </Typography>
            </Box>
            <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, flexShrink: 0 }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: PEACH_DARK, mb: 0.2 }}>
                    {warning.dateIso
                        ? formatDateOnlyLabel(warning.dateIso, { day: '2-digit', month: 'short', year: 'numeric' }) || warning.dateIso
                        : 'Missing date'}
                </Typography>
                <StatusBadge text={warning.dateIso ? 'Linked date' : 'No harvest date'} tone="peach" />
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
    const [hoveredAreaLabel, setHoveredAreaLabel] = useState<string | null>(null)
    const activeEntry = chartData.find((entry) => entry.label === hoveredAreaLabel) ?? chartData[0] ?? null

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
                    Mapped area was found, but those fields are not yet classified as Sugarcane, Break Crop, or Fallow Period.
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
                {activeEntry ? (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 8,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 2,
                            minWidth: 190,
                            maxWidth: 'calc(100% - 24px)',
                            px: 1.25,
                            py: 0.9,
                            borderRadius: '16px',
                            border: `1px solid ${activeEntry.color}33`,
                            bgcolor: 'rgba(255,255,255,0.94)',
                            boxShadow: '0 14px 32px rgba(35,64,52,0.1)',
                            pointerEvents: 'none',
                            backdropFilter: 'blur(12px)',
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.35 }}>
                            <Box
                                sx={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '999px',
                                    bgcolor: activeEntry.color,
                                    flexShrink: 0,
                                }}
                            />
                            <Typography sx={{ fontSize: '0.88rem', fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
                                {activeEntry.label}
                            </Typography>
                        </Box>
                        <Typography sx={{ fontSize: '0.8rem', color: 'text.primary', fontWeight: 700, lineHeight: 1.35 }}>
                            {formatAreaHa(activeEntry.areaHa)} • {activeEntry.fieldCount} field{activeEntry.fieldCount === 1 ? '' : 's'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.72rem', color: TEXT_MID, lineHeight: 1.35, mt: 0.15 }}>
                            {totalAreaHa > 0 ? `${((activeEntry.areaHa / totalAreaHa) * 100).toFixed(1)}% of mapped area` : '0.0% of mapped area'}
                        </Typography>
                    </Box>
                ) : null}
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
                                <Cell
                                    key={entry.label}
                                    fill={entry.color}
                                    onMouseEnter={() => setHoveredAreaLabel(entry.label)}
                                    onMouseLeave={() => setHoveredAreaLabel(null)}
                                />
                            ))}
                        </Pie>
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
                            {formatAreaHa(entry.areaHa)}
                        </Typography>
                        <Typography sx={{ fontSize: '0.78rem', color: TEXT_MID, mt: 0.2, lineHeight: 1.6 }}>
                            {entry.fieldCount} field{entry.fieldCount === 1 ? '' : 's'} • {totalAreaHa > 0 ? `${((entry.areaHa / totalAreaHa) * 100).toFixed(1)}%` : '0.0%'} of mapped area
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
            const expectedHarvestDate = normalizeDateOnlyValue(record.expected_harvest_date) || ''

            if (!existing) {
                byField.set(fieldKey, {
                    fieldKey,
                    fieldLabel: buildFieldLabel(record.field_name, record.section_name, record.block_id),
                    cropType,
                    cropClass,
                    expectedHarvestDate,
                })
                return
            }

            if (!existing.cropType && cropType) existing.cropType = cropType
            if (!existing.cropClass && cropClass) existing.cropClass = cropClass
            if (!existing.expectedHarvestDate && expectedHarvestDate) existing.expectedHarvestDate = expectedHarvestDate
        })

        return Array.from(byField.values())
            .filter((seed) =>
                isCalendarRelevantCrop(seed.cropType, seed.cropClass) &&
                Boolean(normalizeDateOnlyValue(seed.expectedHarvestDate))
            )
            .sort((left, right) => left.fieldLabel.localeCompare(right.fieldLabel))
    }, [monitoring])

    const upcomingTaskItems = useMemo<UpcomingTask[]>(() => {
        const todayIso = getTodayDateOnly()
        const todayTimestamp = getDateOnlyTimestamp(todayIso)
        const uniqueTasks = new Map<string, UpcomingTask>()

        calendarFieldSeeds.forEach((seed) => {
            const harvestDate = normalizeDateOnlyValue(seed.expectedHarvestDate)
            if (harvestDate) {
                HARVEST_PROXIMITY_TASKS.forEach((task) => {
                    const dateIso = addDaysToDateOnly(harvestDate, task.offsetDays)

                    if (!dateIso) {
                        return
                    }

                    const taskTimestamp = getDateOnlyTimestamp(dateIso)
                    const daysUntil = Math.round((taskTimestamp - todayTimestamp) / 86_400_000)

                    const taskKey = `${seed.fieldKey}|expected-harvest|${harvestDate}|${task.offsetDays}`

                    if (!uniqueTasks.has(taskKey)) {
                        uniqueTasks.set(taskKey, {
                            key: taskKey,
                            kind: 'Harvest',
                            activity: task.activity,
                            dateIso,
                            fieldLabel: seed.fieldLabel,
                            cropType: seed.cropType || seed.cropClass || 'Sugarcane',
                            weekLabel: task.weekLabel,
                            scheduleType: 'expected harvest date',
                            severity: getTaskSeverity(daysUntil),
                            daysUntil,
                        })
                    }
                })
            }
        })

        return Array.from(uniqueTasks.values()).sort(sortUpcomingTasks)
    }, [calendarFieldSeeds])
    const calendarWarnings = useMemo<CalendarScheduleWarning[]>(() => {
        const warnings = new Map<string, CalendarScheduleWarning>()

        calendarFieldSeeds.forEach((seed) => {
            if (normalizeDateOnlyValue(seed.expectedHarvestDate)) {
                return
            }

            const warning: CalendarScheduleWarning = {
                key: `${seed.fieldKey}|missing-expected-harvest-date`,
                fieldLabel: seed.fieldLabel,
                title: 'Expected harvest date missing',
                detail: 'Add an expected harvest date to this sugarcane field so the Overview can calculate harvest checkpoints.',
                dateIso: null,
            }

            if (!warnings.has(warning.key)) {
                warnings.set(warning.key, warning)
            }
        })

        return Array.from(warnings.values()).sort(sortCalendarWarnings)
    }, [calendarFieldSeeds])

    const mappedAreaFields = useMemo<AreaFieldSnapshot[]>(() => {
        const latestLiveFields = new Map<string, PredefinedField>()

        liveFields.forEach((field) => {
            const fieldKey = buildFieldIdentity(field.field_name, field.section_name, field.block_id)

            if (!fieldKey || fieldKey === '||') {
                return
            }

            const existing = latestLiveFields.get(fieldKey)

            if (!existing || isFieldRecordNewer(field, existing)) {
                latestLiveFields.set(fieldKey, field)
            }
        })

        return Array.from(latestLiveFields.values())
            .map((field) => ({
                fieldKey: buildFieldIdentity(field.field_name, field.section_name, field.block_id),
                fieldLabel: buildFieldLabel(field.field_name, field.section_name, field.block_id),
                cropType: (field.crop_type ?? '').trim() || 'Unspecified',
                areaHa: resolvePredefinedFieldAreaHa(field),
            }))
            .filter((snapshot) => snapshot.areaHa !== null && snapshot.areaHa > 0)
            .map((snapshot) => ({
                ...snapshot,
                areaHa: snapshot.areaHa as number,
            }))
            .sort((left, right) => left.fieldLabel.localeCompare(right.fieldLabel))
    }, [liveFields])
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
                    case 'Fallow Period':
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
                label: 'Fallow Period',
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
    const nextHarvestTask = upcomingTaskItems[0] ?? null
    const secondaryHarvestTask = upcomingTaskItems.find((task) => task.key !== nextHarvestTask?.key) ?? null
    const upcomingTasksPreview = upcomingTaskItems.slice(0, 5)
    const nextHarvestWarning = calendarWarnings[0] ?? null
    const secondaryHarvestWarning = calendarWarnings.find((warning) => warning.key !== nextHarvestWarning?.key) ?? null
    const harvestLinkageWarning = nextHarvestTask ? nextHarvestWarning : secondaryHarvestWarning
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
                                        Exact hectares from the current database, grouped by crop type so the total mapped area matches the live field records.
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
                                                    Closest harvest task
                                                </Typography>
                                                {nextHarvestTask ? (
                                                    <>
                                                        <Typography sx={{ fontSize: '1.02rem', fontWeight: 800, color: 'text.primary', mb: 0.35 }}>
                                                            {formatDateOnlyLabel(nextHarvestTask.dateIso) || nextHarvestTask.dateIso}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '0.88rem', color: TEXT_MID, lineHeight: 1.6 }}>
                                                            {nextHarvestTask.fieldLabel}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '0.8rem', color: 'text.primary', lineHeight: 1.6, mt: 0.35 }}>
                                                            {nextHarvestTask.activity}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '0.76rem', color: PEACH_DARK, mt: 0.6 }}>
                                                            {getDueLabel(nextHarvestTask.daysUntil)}
                                                        </Typography>
                                                    </>
                                                ) : nextHarvestWarning ? (
                                                    <>
                                                        <Typography sx={{ fontSize: '0.96rem', fontWeight: 800, color: 'text.primary', mb: 0.35 }}>
                                                            {nextHarvestWarning.title}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '0.88rem', color: TEXT_MID, lineHeight: 1.6 }}>
                                                            {nextHarvestWarning.fieldLabel}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '0.8rem', color: 'text.primary', lineHeight: 1.6, mt: 0.35 }}>
                                                            {nextHarvestWarning.detail}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '0.76rem', color: PEACH_DARK, mt: 0.6 }}>
                                                            Save the expected harvest date to generate harvest checkpoints.
                                                        </Typography>
                                                    </>
                                                ) : (
                                                    <Typography sx={{ fontSize: '0.88rem', color: TEXT_MID, lineHeight: 1.6 }}>
                                                        No harvest tasks are available yet. Add expected harvest dates to sugarcane fields to generate them.
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <Box sx={{ p: 1.6, borderRadius: '18px', border: '1px solid rgba(86,184,112,0.16)', bgcolor: 'rgba(255,255,255,0.74)', height: '100%' }}>
                                                <Typography sx={{ fontSize: '0.74rem', color: TEXT_DIM, fontFamily: '"Times New Roman", Times, serif', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 0.6 }}>
                                                    Expected harvest linkage
                                                </Typography>
                                                {harvestLinkageWarning ? (
                                                    <>
                                                        <Typography sx={{ fontSize: '0.96rem', fontWeight: 800, color: 'text.primary', mb: 0.35 }}>
                                                            {harvestLinkageWarning.title}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '0.88rem', color: TEXT_MID, lineHeight: 1.6 }}>
                                                            {harvestLinkageWarning.fieldLabel}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '0.8rem', color: 'text.primary', lineHeight: 1.6, mt: 0.35 }}>
                                                            {harvestLinkageWarning.detail}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '0.76rem', color: PEACH_DARK, mt: 0.6 }}>
                                                            This field is not linked to a harvest plan until the expected harvest date is saved.
                                                        </Typography>
                                                    </>
                                                ) : secondaryHarvestTask ? (
                                                    <>
                                                        <Typography sx={{ fontSize: '1.02rem', fontWeight: 800, color: 'text.primary', mb: 0.35 }}>
                                                            {formatDateOnlyLabel(secondaryHarvestTask.dateIso) || secondaryHarvestTask.dateIso}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '0.88rem', color: TEXT_MID, lineHeight: 1.6 }}>
                                                            {secondaryHarvestTask.fieldLabel}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '0.8rem', color: 'text.primary', lineHeight: 1.6, mt: 0.35 }}>
                                                            {secondaryHarvestTask.activity}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '0.76rem', color: PEACH_DARK, mt: 0.6 }}>
                                                            {getDueLabel(secondaryHarvestTask.daysUntil)}
                                                        </Typography>
                                                    </>
                                                ) : (
                                                    <Typography sx={{ fontSize: '0.88rem', color: TEXT_MID, lineHeight: 1.6 }}>
                                                        Expected harvest dates are linked for the current sugarcane harvest tasks.
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Grid>
                                    </Grid>

                                    <Typography sx={{ fontSize: '0.74rem', color: TEXT_DIM, fontFamily: '"Times New Roman", Times, serif', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 1 }}>
                                        Upcoming harvest tasks
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
                                            No harvest tasks are available yet. Save expected harvest dates for sugarcane fields to build this list.
                                        </Typography>
                                    )}
                                    {upcomingTasksPreview.length > 0 && calendarWarningsPreview.length > 0 ? (
                                        <>
                                            <Typography sx={{ fontSize: '0.74rem', color: TEXT_DIM, fontFamily: '"Times New Roman", Times, serif', textTransform: 'uppercase', letterSpacing: '0.12em', mt: 1.8, mb: 1 }}>
                                                Missing expected harvest dates
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
                            title: 'Map View',
                            desc: 'Move into the spatial workspace for boundaries, centroids, and hybrid basemap context in one place.',
                            path: '/map',
                            icon: <MapOutlined sx={{ fontSize: 26 }} />,
                            delay: 0.15,
                            accent: false,
                        },
                        {
                            title: 'Field Records',
                            desc: 'Review live crop observations that have real recorded dates, such as 25 March 2026.',
                            path: '/data',
                            icon: <TableChartOutlined sx={{ fontSize: 26 }} />,
                            delay: 0.25,
                            accent: false,
                            loadMode: 'monitoring-records' as const,
                        },
                    ].map((item) => (
                        <Grid size={{ xs: 12, md: 6 }} key={item.title} sx={{ display: 'flex' }}>
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
