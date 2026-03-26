import { useMemo } from 'react'
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    Divider,
    Grid,
    LinearProgress,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    alpha,
    useTheme,
} from '@mui/material'
import {
    AgricultureOutlined,
    LocalFloristOutlined,
    SpaOutlined,
    TimelineOutlined,
    WarningAmberOutlined,
    WaterDropOutlined,
} from '@mui/icons-material'
import { useSugarcaneMonitoring } from '@/hooks/useSugarcaneMonitoring'

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

function getVigorProgress(vigor?: string | null): number {
    const normalized = (vigor ?? '').trim().toLowerCase()

    if (normalized === 'excellent') return 95
    if (normalized === 'good') return 82
    if (normalized === 'fair' || normalized === 'medium') return 60
    if (normalized === 'poor' || normalized === 'low') return 35

    return 50
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
    title: string
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
            <Typography sx={{ fontSize: 19, fontWeight: 900, color: 'text.primary', mb: 0.4 }}>
                {title}
            </Typography>
            {subtitle && (
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.65, mb: 2 }}>
                    {subtitle}
                </Typography>
            )}
            {children}
        </Paper>
    )
}

function FieldRow({ label, count, latestYield }: { label: string; count: number; latestYield: number | null }) {
    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 1.2,
                py: 1.2,
            }}
        >
            <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: 'text.primary' }}>
                    {label}
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {count} record{count === 1 ? '' : 's'}
                </Typography>
            </Box>
            <Chip
                label={latestYield === null ? 'Yield N/A' : `${formatNumber(latestYield)} t/ha`}
                size="small"
                sx={{ fontWeight: 700, bgcolor: 'rgba(86,184,112,0.12)', color: 'primary.dark' }}
            />
        </Box>
    )
}

export function SugarcaneMonitoringDashboard() {
    const theme = useTheme()
    const { data: monitoring = [], isLoading, error } = useSugarcaneMonitoring()

    const summary = useMemo(() => {
        const fieldKeys = new Set<string>()
        const varieties = new Set<string>()

        let yieldTotal = 0
        let yieldCount = 0
        let canopyTotal = 0
        let canopyCount = 0
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

            if (typeof record.canopy_cover === 'number' && Number.isFinite(record.canopy_cover)) {
                canopyTotal += record.canopy_cover
                canopyCount += 1
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
            averageCanopy: canopyCount > 0 ? canopyTotal / canopyCount : null,
            stressCount,
        }
    }, [monitoring])

    const topFields = useMemo(() => {
        const grouped = new Map<string, { count: number; latestYield: number | null }>()

        monitoring.forEach((record) => {
            const label = [record.field_name, record.section_name, record.block_id]
                .map((part) => normalizeText(part, ''))
                .filter(Boolean)
                .join(' / ') || 'Unknown field'

            const existing = grouped.get(label)
            if (!existing) {
                grouped.set(label, {
                    count: 1,
                    latestYield: typeof record.yield === 'number' && Number.isFinite(record.yield) ? record.yield : null,
                })
                return
            }

            existing.count += 1
            if (existing.latestYield === null && typeof record.yield === 'number' && Number.isFinite(record.yield)) {
                existing.latestYield = record.yield
            }
        })

        return Array.from(grouped.entries())
            .map(([label, value]) => ({ label, ...value }))
            .sort((left, right) => right.count - left.count)
            .slice(0, 6)
    }, [monitoring])

    const latestRecord = monitoring[0]

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

    return (
        <Box sx={{ display: 'grid', gap: 3 }}>
            <Paper
                sx={{
                    p: { xs: 2.5, md: 3.2 },
                    borderRadius: '30px',
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
                    background: `
                        radial-gradient(circle at 8% 0%, rgba(86,184,112,0.16) 0%, transparent 32%),
                        radial-gradient(circle at 100% 0%, rgba(244,162,140,0.18) 0%, transparent 26%),
                        linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,248,242,0.94) 100%)
                    `,
                    boxShadow: '0 22px 48px rgba(17,24,16,0.07)',
                }}
            >
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
                    <Box>
                        <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'primary.main', mb: 1 }}>
                            Live Monitoring
                        </Typography>
                        <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 900, lineHeight: 1.04, letterSpacing: '-0.05em', color: 'text.primary', mb: 1 }}>
                            Sugarcane analysis is now reading from the live monitoring table
                        </Typography>
                        <Typography sx={{ maxWidth: 760, fontSize: 14, color: 'text.secondary', lineHeight: 1.8 }}>
                            This dashboard summarizes the latest field activity, crop condition, irrigation context, and harvest indicators from the live record feed.
                        </Typography>
                    </Box>
                    <Stack spacing={1} alignItems={{ xs: 'flex-start', md: 'flex-end' }}>
                        <Chip label={`${summary.totalRecords} records loaded`} sx={{ fontWeight: 800, bgcolor: 'rgba(86,184,112,0.14)', color: 'primary.dark' }} />
                        <Chip label={`Latest sync: ${formatDate(latestRecord?.date_recorded, true)}`} sx={{ fontWeight: 700, bgcolor: 'rgba(244,162,140,0.16)', color: 'secondary.dark' }} />
                    </Stack>
                </Stack>
            </Paper>

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
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <SummaryCard
                        icon={<WarningAmberOutlined />}
                        label="Stress Flags"
                        value={String(summary.stressCount)}
                        helper="Records with a meaningful non-normal stress value."
                        tone="#c2410c"
                    />
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, xl: 8 }}>
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
                                                    {[record.section_name, record.block_id].filter(Boolean).join(' / ') || 'Section and block not set'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ minWidth: 180 }}>
                                                <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                                                    {normalizeText(record.crop_stage, 'Stage not set')}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ minWidth: 190 }}>
                                                <Stack spacing={1}>
                                                    <Chip
                                                        size="small"
                                                        label={`Stress: ${normalizeText(record.stress, 'None')}`}
                                                        color={getStressTone(record.stress)}
                                                        variant="outlined"
                                                        sx={{ fontWeight: 700, width: 'fit-content' }}
                                                    />
                                                    <Box>
                                                        <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 0.4 }}>
                                                            Crop vigor: {normalizeText(record.crop_vigor, 'Not recorded')}
                                                        </Typography>
                                                        <LinearProgress
                                                            variant="determinate"
                                                            value={getVigorProgress(record.crop_vigor)}
                                                            sx={{
                                                                height: 8,
                                                                borderRadius: 999,
                                                                bgcolor: 'rgba(0,0,0,0.06)',
                                                                '& .MuiLinearProgress-bar': {
                                                                    borderRadius: 999,
                                                                    bgcolor: getStressTone(record.stress) === 'error' ? '#d32f2f' : theme.palette.primary.main,
                                                                },
                                                            }}
                                                        />
                                                    </Box>
                                                </Stack>
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

                <Grid size={{ xs: 12, xl: 4 }}>
                    <Stack spacing={3}>
                        <InsightPanel
                            title="Field Activity"
                            subtitle="Fields with the heaviest monitoring activity in the current dataset."
                        >
                            {topFields.length === 0 ? (
                                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                                    No field activity is available yet.
                                </Typography>
                            ) : (
                                <Box>
                                    {topFields.map((field, index) => (
                                        <Box key={field.label}>
                                            <FieldRow label={field.label} count={field.count} latestYield={field.latestYield} />
                                            {index < topFields.length - 1 && <Divider />}
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </InsightPanel>

                        <InsightPanel
                            title="Latest Agronomy Snapshot"
                            subtitle="Quick look at the newest record loaded from Supabase."
                        >
                            <Stack spacing={1.3}>
                                <Chip
                                    label={normalizeText(latestRecord.field_name, 'Unknown field')}
                                    sx={{ alignSelf: 'flex-start', fontWeight: 800, bgcolor: 'rgba(86,184,112,0.14)', color: 'primary.dark' }}
                                />
                                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                                    Recorded on {formatDate(latestRecord.date_recorded, true)}
                                </Typography>
                                <Typography sx={{ fontSize: 13.5, color: 'text.primary' }}>
                                    Crop stage: <strong>{normalizeText(latestRecord.crop_stage, 'Not recorded')}</strong>
                                </Typography>
                                <Typography sx={{ fontSize: 13.5, color: 'text.primary' }}>
                                    Water source: <strong>{normalizeText(latestRecord.water_source, 'Not recorded')}</strong>
                                </Typography>
                                <Typography sx={{ fontSize: 13.5, color: 'text.primary' }}>
                                    Canopy cover: <strong>{latestRecord.canopy_cover == null ? 'N/A' : `${formatNumber(latestRecord.canopy_cover)}%`}</strong>
                                </Typography>
                                <Typography sx={{ fontSize: 13.5, color: 'text.primary' }}>
                                    Average canopy across dataset: <strong>{summary.averageCanopy === null ? 'N/A' : `${formatNumber(summary.averageCanopy)}%`}</strong>
                                </Typography>
                                <Chip
                                    label={`Stress: ${normalizeText(latestRecord.stress, 'None')}`}
                                    color={getStressTone(latestRecord.stress)}
                                    variant="outlined"
                                    sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
                                />
                                <Divider sx={{ my: 0.6 }} />
                                <Stack direction="row" spacing={1.2} flexWrap="wrap" useFlexGap>
                                    <Chip icon={<WaterDropOutlined />} label={normalizeText(latestRecord.irrigation_type, 'No irrigation')} variant="outlined" />
                                    <Chip icon={<SpaOutlined />} label={normalizeText(latestRecord.crop_vigor, 'Vigor N/A')} variant="outlined" />
                                    <Chip icon={<LocalFloristOutlined />} label={normalizeText(latestRecord.fertilizer_type, 'Fertilizer N/A')} variant="outlined" />
                                </Stack>
                                {latestRecord.remarks && (
                                    <Paper sx={{ p: 1.6, borderRadius: '16px', bgcolor: 'rgba(0,0,0,0.025)' }}>
                                        <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.6 }}>
                                            Remarks
                                        </Typography>
                                        <Typography sx={{ fontSize: 13, color: 'text.primary', lineHeight: 1.7 }}>
                                            {latestRecord.remarks}
                                        </Typography>
                                    </Paper>
                                )}
                            </Stack>
                        </InsightPanel>
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    )
}
