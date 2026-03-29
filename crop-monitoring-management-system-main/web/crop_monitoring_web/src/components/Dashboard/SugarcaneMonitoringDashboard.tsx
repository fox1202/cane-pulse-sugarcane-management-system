import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Alert,
    Box,
    Button,
    Chip,
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
    AgricultureOutlined,
    CalendarMonthOutlined,
    LocalFloristOutlined,
    OpenInNewRounded,
    TimelineOutlined,
} from '@mui/icons-material'
import { useSugarcaneMonitoring } from '@/hooks/useSugarcaneMonitoring'
import {
    buildMonitoringCalendarSearch,
    buildMonitoringTrialCalendarLinks,
} from '@/utils/farmingCalendarLinks'

function formatDate(value?: string | null, includeTime = false): string {
    if (!value) return 'N/A'

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return value
    }

    return includeTime
        ? date.toLocaleString()
        : date.toLocaleDateString()
}

function formatNumber(value?: number | null, digits = 1): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
        return 'N/A'
    }

    return Number(value).toFixed(digits)
}

function normalizeText(value?: string | null, fallback = 'N/A'): string {
    const normalized = (value ?? '').trim()
    return normalized || fallback
}

function isMeaningfulStress(stress?: string | null): boolean {
    const normalized = (stress ?? '').trim().toLowerCase()
    return Boolean(normalized) && !['none', 'no', 'normal', 'healthy', 'optimal', 'n/a', 'na'].includes(normalized)
}

function getStressTone(stress?: string | null): 'success' | 'info' | 'warning' | 'error' | 'default' {
    const normalized = (stress ?? '').trim().toLowerCase()

    if (!normalized || ['none', 'no', 'normal', 'healthy', 'optimal'].includes(normalized)) {
        return 'success'
    }
    if (normalized === 'low') {
        return 'info'
    }
    if (normalized === 'medium' || normalized === 'moderate') {
        return 'warning'
    }

    return 'error'
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
    helper: string
    tone: string
}) {
    return (
        <Paper
            sx={{
                p: 2.2,
                borderRadius: '24px',
                border: `1px solid ${alpha(tone, 0.16)}`,
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
                <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: alpha(tone, 0.88) }}>
                    {label}
                </Typography>
            </Box>
            <Typography sx={{ fontSize: { xs: 28, md: 32 }, fontWeight: 900, letterSpacing: '-0.05em', color: 'text.primary', lineHeight: 1.05, mb: 0.8 }}>
                {value}
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.6 }}>
                {helper}
            </Typography>
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
                p: 2.5,
                borderRadius: '26px',
                border: '1px solid rgba(27, 94, 32, 0.12)',
                boxShadow: '0 18px 42px rgba(17,24,16,0.05)',
                bgcolor: 'rgba(255,255,255,0.96)',
                height: '100%',
            }}
        >
            {title && (
                <Typography sx={{ fontSize: 19, fontWeight: 900, color: 'text.primary', mb: 0.4 }}>
                    {title}
                </Typography>
            )}
            {subtitle && (
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.65, mb: 2 }}>
                    {subtitle}
                </Typography>
            )}
            {children}
        </Paper>
    )
}

export function SugarcaneMonitoringDashboard() {
    const navigate = useNavigate()
    const { data: monitoring = [], isLoading, error } = useSugarcaneMonitoring()

    const summary = useMemo(() => {
        const fieldKeys = new Set<string>()
        const varieties = new Set<string>()

        let yieldTotal = 0
        let yieldCount = 0
        let stressCount = 0

        monitoring.forEach((record) => {
            fieldKeys.add([
                normalizeText(record.section_name, ''),
                normalizeText(record.block_id, ''),
                normalizeText(record.field_name, ''),
            ].join('|'))

            const variety = normalizeText(record.variety, '')
            if (variety) {
                varieties.add(variety.toUpperCase())
            }

            if (typeof record.yield === 'number' && Number.isFinite(record.yield)) {
                yieldTotal += record.yield
                yieldCount += 1
            }

            if (isMeaningfulStress(record.stress)) {
                stressCount += 1
            }
        })

        return {
            totalRecords: monitoring.length,
            totalFields: fieldKeys.size,
            totalVarieties: varieties.size,
            averageYield: yieldCount > 0 ? yieldTotal / yieldCount : null,
            stressCount,
        }
    }, [monitoring])

    const trialCalendarLinks = useMemo(
        () => buildMonitoringTrialCalendarLinks(monitoring),
        [monitoring]
    )

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

    const handleOpenCalendar = (search: string) => {
        navigate(`/calendar?${search}`)
    }

    return (
        <Box sx={{ display: 'grid', gap: 3 }}>
            <Grid container spacing={2.4}>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <SummaryCard
                        icon={<AgricultureOutlined />}
                        label="Monitoring Records"
                        value={String(summary.totalRecords)}
                        helper="Rows currently available for analysis from the live Supabase table."
                        tone="#1b5e20"
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <SummaryCard
                        icon={<LocalFloristOutlined />}
                        label="Mapped Fields"
                        value={String(summary.totalFields)}
                        helper="Unique field, section, and block combinations represented in the dataset."
                        tone="#2f7f4f"
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <SummaryCard
                        icon={<TimelineOutlined />}
                        label="Average Yield"
                        value={summary.averageYield === null ? 'N/A' : `${formatNumber(summary.averageYield)} t/ha`}
                        helper="Average of monitoring rows that include harvest yield values."
                        tone="#d97706"
                    />
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                    <InsightPanel
                        title="Trial Calendar Links"
                    >
                        <TableContainer>
                            <Table sx={{ minWidth: 980 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Trial</TableCell>
                                        <TableCell>Field</TableCell>
                                        <TableCell>Crop Class</TableCell>
                                        <TableCell>Suitable Calendar</TableCell>
                                        <TableCell>Anchor Date</TableCell>
                                        <TableCell>Latest Update</TableCell>
                                        <TableCell align="right">Action</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {trialCalendarLinks.length > 0 ? (
                                        trialCalendarLinks.map((link) => {
                                            const calendarSearch = link.templateId ? buildMonitoringCalendarSearch(link) : ''
                                            const hasAnchorDate = Boolean(link.anchorDate)

                                            return (
                                                <TableRow key={link.key} hover>
                                                    <TableCell sx={{ minWidth: 180 }}>
                                                        <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>
                                                            {link.trialLabel}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                                                            {link.cropType || 'Crop type not set'}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ minWidth: 220 }}>
                                                        <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                                                            {link.fieldLabel}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ minWidth: 170 }}>
                                                        <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                                                            {normalizeText(link.cropClass, 'Not set')}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ minWidth: 170 }}>
                                                        <Chip
                                                            size="small"
                                                            icon={<CalendarMonthOutlined />}
                                                            label={link.templateTitle ?? 'No linked calendar'}
                                                            color={link.templateId ? 'success' : 'default'}
                                                            variant={link.templateId ? 'filled' : 'outlined'}
                                                            sx={{ fontWeight: 700 }}
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ minWidth: 190 }}>
                                                        <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                                                            {hasAnchorDate ? formatDate(link.anchorDate) : 'Date not set yet'}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                                                            {link.templateId
                                                                ? hasAnchorDate
                                                                    ? link.anchorLabel
                                                                    : `Add the ${link.anchorLabel?.toLowerCase() || 'reference date'} to date the tasks.`
                                                                : 'Only sugarcane trials can be matched right now.'}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ minWidth: 140 }}>
                                                        <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                                                            {formatDate(link.latestDate)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ minWidth: 180 }}>
                                                        <Button
                                                            size="small"
                                                            variant={hasAnchorDate ? 'contained' : 'outlined'}
                                                            endIcon={<OpenInNewRounded />}
                                                            disabled={!link.templateId}
                                                            onClick={() => handleOpenCalendar(calendarSearch)}
                                                            sx={{
                                                                borderRadius: '999px',
                                                                px: 1.8,
                                                                py: 0.8,
                                                                textTransform: 'none',
                                                                fontWeight: 800,
                                                            }}
                                                        >
                                                            {hasAnchorDate ? 'Open dated calendar' : 'Open calendar'}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={7} sx={{ py: 3.5 }}>
                                                <Typography sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center' }}>
                                                    No trial-to-calendar matches are available yet. Add crop class and planting or cut dates to monitoring records to enable linked calendars.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </InsightPanel>
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <InsightPanel
                        title="Recent Monitoring Records"
                        subtitle="Latest entries from the live table, ready for web-based review and agronomic analysis."
                    >
                        <TableContainer>
                            <Table sx={{ minWidth: 760 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Field</TableCell>
                                        <TableCell>Crop Stage</TableCell>
                                        <TableCell>Condition</TableCell>
                                        <TableCell>Irrigation</TableCell>
                                        <TableCell align="right">Yield</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {monitoring.slice(0, 12).map((record) => (
                                        <TableRow key={record.id} hover>
                                            <TableCell sx={{ minWidth: 118 }}>
                                                <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                                                    {formatDate(record.date_recorded)}
                                                </Typography>
                                                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                                                    {formatDate(record.date_recorded, true)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ minWidth: 180 }}>
                                                <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>
                                                    {normalizeText(record.field_name, 'Unknown field')}
                                                </Typography>
                                                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                                                    {record.block_id || 'Block not set'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ minWidth: 180 }}>
                                                <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                                                    {normalizeText(record.crop_stage, 'Stage not set')}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ minWidth: 190 }}>
                                                <Chip
                                                    size="small"
                                                    label={`Stress: ${normalizeText(record.stress, 'None')}`}
                                                    color={getStressTone(record.stress)}
                                                    variant="outlined"
                                                    sx={{ fontWeight: 700, width: 'fit-content' }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ minWidth: 150 }}>
                                                <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                                                    {normalizeText(record.irrigation_type, 'Not recorded')}
                                                </Typography>
                                                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                                                    Moisture: {record.soil_moisture_percentage == null ? 'N/A' : `${formatNumber(record.soil_moisture_percentage)}%`}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right" sx={{ minWidth: 110 }}>
                                                <Typography sx={{ fontWeight: 800, fontSize: 13.5 }}>
                                                    {record.yield == null ? 'N/A' : `${formatNumber(record.yield)} t/ha`}
                                                </Typography>
                                                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                                                    pH {record.soil_ph == null ? 'N/A' : formatNumber(record.soil_ph, 2)}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </InsightPanel>
                </Grid>
            </Grid>
        </Box>
    )
}
