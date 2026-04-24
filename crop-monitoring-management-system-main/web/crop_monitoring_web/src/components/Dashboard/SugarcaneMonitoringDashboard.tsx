import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Grid,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    alpha,
} from '@mui/material'
import {
    ArrowOutwardRounded,
    EventAvailableOutlined,
    LocalFloristOutlined,
    TimelineOutlined,
} from '@mui/icons-material'
import { useLivePredefinedFields } from '@/hooks/useLivePredefinedFields'
import { useSugarcaneMonitoring } from '@/hooks/useSugarcaneMonitoring'
import type { SugarcaneMonitoringRecord } from '@/types/database.types'
import { formatDateOnlyLabel, getDateOnlyTimestamp, normalizeDateOnlyValue } from '@/utils/dateOnly'
import {
    buildMonitoringCalendarSearch,
    buildMonitoringTrialCalendarLinks,
} from '@/utils/farmingCalendarLinks'
import { deriveGrowthStage } from '@/utils/growthStage'
import {
    buildUpcomingTaskNotices,
    getTaskDueLabel,
    type UpcomingTaskNotice,
} from '@/utils/upcomingTaskNotices'

interface StageSnapshot {
    key: string
    trialLabel: string
    fieldLabel: string
    cropType: string
    cropClass: string
    latestDate: string
    templateId: 'plant' | 'ratoon' | null
    templateTitle: string | null
    anchorDate: string | null
    anchorLabel: string | null
    latestRecord: SugarcaneMonitoringRecord | null
    growthStage: ReturnType<typeof deriveGrowthStage>
    nextTask: UpcomingTaskNotice | null
}

function normalizeText(value?: string | number | null, fallback = 'N/A'): string {
    const normalized = String(value ?? '').trim()
    return normalized || fallback
}

function getTodayDateOnly(): string {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function formatDateLabel(value?: string | null, fallback = 'N/A'): string {
    if (!value) {
        return fallback
    }

    return formatDateOnlyLabel(value, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }) || value
}

function buildTrialIdentity(record: SugarcaneMonitoringRecord): string {
    return [
        record.trial_name,
        record.trial_number,
        record.section_name,
        record.block_id,
        record.field_name,
    ]
        .map((value) => normalizeText(value, '').toLowerCase())
        .join('|')
}

function getStageAccent(snapshot: StageSnapshot): string {
    if (snapshot.templateId === 'ratoon') {
        return '#b25b34'
    }

    if (snapshot.templateId === 'plant') {
        return '#1b5e20'
    }

    return '#627264'
}

function SummaryCard({
    icon,
    label,
    value,
    helper,
    tone,
}: {
    icon: React.ReactNode
    label: string
    value: string
    helper?: string
    tone: string
}) {
    return (
        <Paper
            sx={{
                p: 2.2,
                borderRadius: '24px',
                border: `1px solid ${alpha(tone, 0.14)}`,
                bgcolor: alpha(tone, 0.08),
                boxShadow: '0 18px 36px rgba(17,24,16,0.05)',
                height: '100%',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4, mb: 1.8 }}>
                <Box
                    sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '16px',
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: alpha(tone, 0.12),
                        color: tone,
                    }}
                >
                    {icon}
                </Box>
                <Typography
                    sx={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: alpha(tone, 0.88),
                    }}
                >
                    {label}
                </Typography>
            </Box>
            <Typography
                sx={{
                    fontSize: { xs: 28, md: 32 },
                    fontWeight: 900,
                    letterSpacing: '-0.05em',
                    color: 'text.primary',
                    lineHeight: 1.05,
                    mb: 0.8,
                }}
            >
                {value}
            </Typography>
            {helper && (
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.6 }}>
                    {helper}
                </Typography>
            )}
        </Paper>
    )
}

function InsightPanel({
    title,
    subtitle,
    children,
}: {
    title?: string
    subtitle?: string
    children: React.ReactNode
}) {
    return (
        <Paper
            sx={{
                p: { xs: 2.1, md: 2.6 },
                borderRadius: '28px',
                border: '1px solid rgba(27, 94, 32, 0.12)',
                boxShadow: '0 18px 42px rgba(17,24,16,0.05)',
                bgcolor: 'rgba(255,255,255,0.95)',
                height: '100%',
            }}
        >
            {title && (
                <Typography sx={{ fontSize: 20, fontWeight: 900, color: 'text.primary', mb: 0.45 }}>
                    {title}
                </Typography>
            )}
            {subtitle && (
                <Typography sx={{ fontSize: 12.8, color: 'text.secondary', lineHeight: 1.7, mb: 2.1 }}>
                    {subtitle}
                </Typography>
            )}
            {children}
        </Paper>
    )
}

export function SugarcaneMonitoringDashboard() {
    const navigate = useNavigate()
    const todayIso = getTodayDateOnly()
    const {
        data: monitoring = [],
        isLoading,
        error,
    } = useSugarcaneMonitoring({ includeUndated: true })
    const {
        data: predefinedFields = [],
    } = useLivePredefinedFields()

    const sortedMonitoring = useMemo(
        () => [...monitoring].sort(
            (left, right) =>
                getDateOnlyTimestamp(normalizeDateOnlyValue(right.date_recorded) || '')
                - getDateOnlyTimestamp(normalizeDateOnlyValue(left.date_recorded) || '')
        ),
        [monitoring]
    )

    const latestRecordByTrial = useMemo(() => {
        const records = new Map<string, SugarcaneMonitoringRecord>()

        sortedMonitoring.forEach((record) => {
            const key = buildTrialIdentity(record)
            if (!records.has(key)) {
                records.set(key, record)
            }
        })

        return records
    }, [sortedMonitoring])

    const upcomingTasks = useMemo(
        () => buildUpcomingTaskNotices(monitoring, predefinedFields),
        [monitoring, predefinedFields]
    )

    const tasksByFieldLabel = useMemo(() => {
        const grouped = new Map<string, UpcomingTaskNotice[]>()

        upcomingTasks.forEach((task) => {
            const items = grouped.get(task.fieldLabel) ?? []
            items.push(task)
            grouped.set(task.fieldLabel, items)
        })

        return grouped
    }, [upcomingTasks])

    const stageSnapshots = useMemo(() => {
        return buildMonitoringTrialCalendarLinks(monitoring)
            .map((link) => {
                const latestRecord = latestRecordByTrial.get(link.key) ?? null
                const growthStage = latestRecord
                    ? deriveGrowthStage(latestRecord, todayIso)
                    : deriveGrowthStage(
                        {
                            crop_type: link.cropType,
                            crop_class: link.cropClass,
                            planting_date: link.templateId === 'plant' ? link.anchorDate : null,
                            previous_cutting_date: link.templateId === 'ratoon' ? link.anchorDate : null,
                            date_recorded: link.latestDate,
                        },
                        todayIso
                    )

                return {
                    ...link,
                    latestRecord,
                    growthStage,
                    nextTask: (tasksByFieldLabel.get(link.fieldLabel) ?? [])[0] ?? null,
                }
            })
            .sort((left, right) => {
                const leftLinked = Boolean(left.growthStage.templateId && left.growthStage.anchorDate)
                const rightLinked = Boolean(right.growthStage.templateId && right.growthStage.anchorDate)

                if (leftLinked !== rightLinked) {
                    return leftLinked ? -1 : 1
                }

                const leftTaskDays = left.nextTask?.daysUntil ?? Number.MAX_SAFE_INTEGER
                const rightTaskDays = right.nextTask?.daysUntil ?? Number.MAX_SAFE_INTEGER

                if (leftTaskDays !== rightTaskDays) {
                    return leftTaskDays - rightTaskDays
                }

                return getDateOnlyTimestamp(right.latestDate) - getDateOnlyTimestamp(left.latestDate)
            })
    }, [monitoring, latestRecordByTrial, tasksByFieldLabel, todayIso])

    const summary = useMemo(() => {
        const fieldKeys = new Set<string>()

        monitoring.forEach((record) => {
            fieldKeys.add([
                normalizeText(record.section_name, ''),
                normalizeText(record.block_id, ''),
                normalizeText(record.field_name, ''),
            ].join('|'))
        })

        return {
            totalRecords: monitoring.length,
            totalFields: fieldKeys.size,
            linkedFields: stageSnapshots.filter(
                (snapshot) => Boolean(snapshot.growthStage.templateId && snapshot.growthStage.anchorDate)
            ).length,
            calendarResolvedStages: stageSnapshots.filter((snapshot) => Boolean(snapshot.growthStage.stageKey)).length,
            urgentActivities: upcomingTasks.filter((task) => task.daysUntil <= 14).length,
            missingCalendarDates: stageSnapshots.filter(
                (snapshot) => snapshot.templateId && !snapshot.anchorDate
            ).length,
            latestRecordedDate: sortedMonitoring.find((record) => normalizeDateOnlyValue(record.date_recorded))?.date_recorded ?? null,
        }
    }, [monitoring, stageSnapshots, upcomingTasks, sortedMonitoring])

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
                <CircularProgress />
            </Box>
        )
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ borderRadius: '20px' }}>
                {error.message}
            </Alert>
        )
    }

    if (monitoring.length === 0) {
        return (
            <Alert severity="info" sx={{ borderRadius: '20px' }}>
                No monitoring records are available yet.
            </Alert>
        )
    }

    const handleOpenCalendar = (search?: string) => {
        navigate(search ? `/calendar?${search}` : '/calendar')
    }

    return (
        <Box sx={{ display: 'grid', gap: 3 }}>
            <Grid container spacing={2.4}>
                <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
                    <SummaryCard
                        icon={<LocalFloristOutlined />}
                        label="Active Fields"
                        value={String(summary.totalFields)}
                        helper="Unique field, section, and block combinations active in monitoring."
                        tone="#2f7f4f"
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
                    <SummaryCard
                        icon={<TimelineOutlined />}
                        label="Calendar Linked"
                        value={String(summary.linkedFields)}
                        helper="Fields with enough date data to calculate the current calendar stage."
                        tone="#b25b34"
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
                    <SummaryCard
                        icon={<EventAvailableOutlined />}
                        label="Due In 14 Days"
                        value={String(summary.urgentActivities)}
                        helper="Upcoming tasks from the farming calendar that need near-term attention."
                        tone="#996515"
                    />
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                    <InsightPanel
                        title="Live Monitoring Tracker"
                        subtitle="Current growth stage, stage basis, next scheduled activity, and the latest live database update for each monitored field."
                    >
                        <TableContainer
                            sx={{
                                borderRadius: '28px',
                                border: '1px solid rgba(127, 148, 118, 0.18)',
                                bgcolor: 'rgba(245, 248, 241, 0.96)',
                                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.78), 0 18px 42px rgba(58, 84, 45, 0.08)',
                                overflowX: 'auto',
                            }}
                        >
                            <Table
                                sx={{
                                    minWidth: 980,
                                    borderCollapse: 'separate',
                                    borderSpacing: 0,
                                }}
                            >
                                <TableHead>
                                    <TableRow>
                                        {['Field / Trial', 'Current Stage', 'Stage Basis', 'Upcoming Activity', 'Latest Update', 'Action'].map((label, index, list) => (
                                            <TableCell
                                                key={label}
                                                sx={{
                                                    px: 2.2,
                                                    py: 2.15,
                                                    borderBottom: '1px solid rgba(127, 148, 118, 0.22)',
                                                    bgcolor: 'rgba(213, 225, 204, 0.9)',
                                                    color: '#5f7064',
                                                    fontSize: 11,
                                                    fontWeight: 800,
                                                    letterSpacing: '0.18em',
                                                    textTransform: 'uppercase',
                                                    whiteSpace: 'nowrap',
                                                    ...(index === 0 && { borderTopLeftRadius: '28px' }),
                                                    ...(index === list.length - 1 && { borderTopRightRadius: '28px' }),
                                                }}
                                            >
                                                {label}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {stageSnapshots.map((snapshot) => {
                                        const search = buildMonitoringCalendarSearch(snapshot)
                                        const accent = getStageAccent(snapshot)

                                        return (
                                            <TableRow
                                                key={snapshot.key}
                                                hover
                                                sx={{
                                                    '&:hover td': {
                                                        bgcolor: 'rgba(255,255,255,0.36)',
                                                    },
                                                    '&:last-child td:first-of-type': {
                                                        borderBottomLeftRadius: '28px',
                                                    },
                                                    '&:last-child td:last-of-type': {
                                                        borderBottomRightRadius: '28px',
                                                    },
                                                }}
                                            >
                                                <TableCell sx={monitoringCellStyles}>
                                                    <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#32453a' }}>
                                                        {snapshot.trialLabel}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: 12.2, color: 'text.secondary', mt: 0.35, lineHeight: 1.6 }}>
                                                        {snapshot.fieldLabel}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: 12.2, color: 'text.secondary', mt: 0.3 }}>
                                                        {normalizeText(snapshot.cropClass || snapshot.cropType, 'Crop class not set')}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={monitoringCellStyles}>
                                                    <Typography sx={{ fontSize: 15, fontWeight: 800, color: accent }}>
                                                        {snapshot.growthStage.stage || 'Stage not detected'}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: 12.1, color: 'text.secondary', mt: 0.35, lineHeight: 1.6 }}>
                                                        {snapshot.growthStage.weekNumber
                                                            ? `Calendar week ${snapshot.growthStage.weekNumber}`
                                                            : 'Waiting for linked calendar dates'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={monitoringCellStyles}>
                                                    <Typography sx={{ fontSize: 13.6, fontWeight: 700, color: '#32453a' }}>
                                                        {snapshot.anchorDate && snapshot.growthStage.anchorLabel
                                                            ? `${snapshot.growthStage.anchorLabel}`
                                                            : 'Reference date missing'}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: 12.1, color: 'text.secondary', mt: 0.35, lineHeight: 1.6 }}>
                                                        {snapshot.anchorDate
                                                            ? formatDateLabel(snapshot.anchorDate)
                                                            : 'Save planting or cutting date to unlock the calendar stage'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={monitoringCellStyles}>
                                                    <Typography sx={{ fontSize: 13.6, fontWeight: 700, color: '#32453a', lineHeight: 1.6 }}>
                                                        {snapshot.nextTask?.activity || 'No dated activity available yet'}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: 12.1, color: 'text.secondary', mt: 0.35, lineHeight: 1.6 }}>
                                                        {snapshot.nextTask
                                                            ? `${getTaskDueLabel(snapshot.nextTask.daysUntil)} · ${formatDateLabel(snapshot.nextTask.dateIso)}`
                                                            : 'The dashboard will show the next activity once the field calendar is linked'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={monitoringCellStyles}>
                                                    <Typography sx={{ fontSize: 13.6, fontWeight: 700, color: '#32453a' }}>
                                                        {formatDateLabel(snapshot.latestDate)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={monitoringCellStyles}>
                                                    <Button
                                                        size="small"
                                                        variant={snapshot.templateId ? 'contained' : 'outlined'}
                                                        endIcon={<ArrowOutwardRounded />}
                                                        disabled={!snapshot.templateId}
                                                        onClick={() => handleOpenCalendar(search)}
                                                        sx={{
                                                            borderRadius: '999px',
                                                            px: 1.6,
                                                            textTransform: 'none',
                                                            fontWeight: 800,
                                                            boxShadow: 'none',
                                                        }}
                                                    >
                                                        Open
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </InsightPanel>
                </Grid>
            </Grid>
        </Box>
    )
}

const monitoringCellStyles = {
    px: 2.2,
    py: 1.9,
    minWidth: 150,
    borderBottom: '1px solid rgba(127, 148, 118, 0.14)',
    color: '#32453a',
    fontSize: 14.5,
    fontWeight: 500,
    bgcolor: 'transparent',
}
