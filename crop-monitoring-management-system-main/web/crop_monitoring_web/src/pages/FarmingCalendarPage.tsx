import { useMemo, useState } from 'react'
import {
    Box,
    Button,
    Chip,
    Container,
    Grid,
    Paper,
    Stack,
    Typography,
} from '@mui/material'
import {
    AccessTimeRounded,
    CalendarMonthRounded,
    DownloadRounded,
    EventNoteRounded,
    InsightsRounded,
    SpaRounded,
    TimelineRounded,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { FARMING_CALENDAR_TEMPLATES, type FarmingCalendarTemplate } from '@/data/farmingCalendar'

const CREAM = '#fffaf3'
const FOREST = '#234034'
const MINT = '#56b870'
const MINT_DARK = '#2f7f4f'
const MINT_PALE = 'rgba(86,184,112,0.12)'
const MINT_BORDER = 'rgba(86,184,112,0.18)'
const PEACH = '#f4a28c'
const PEACH_DARK = '#d97b63'
const PEACH_PALE = 'rgba(244,162,140,0.14)'
const PEACH_BORDER = 'rgba(244,162,140,0.2)'
const SKY = '#68c3d4'
const SKY_PALE = 'rgba(104,195,212,0.14)'
const SKY_BORDER = 'rgba(104,195,212,0.18)'
const PANEL = 'rgba(255,255,255,0.9)'
const PANEL_SOFT = 'rgba(255,255,255,0.72)'
const TEXT_DIM = 'rgba(35,64,52,0.56)'
const TEXT_MID = 'rgba(35,64,52,0.76)'
const CALENDAR_SECTION_ID = 'farming-calendar-month-focus'
const TASK_SECTION_ID = 'farming-calendar-task-panels'

type TemplateTask = FarmingCalendarTemplate['tasks'][number]

function getMonthPalette(month: number) {
    const palettes = [
        {
            wash: 'linear-gradient(180deg, rgba(86,184,112,0.18) 0%, rgba(255,255,255,0) 52%)',
            dot: MINT,
            chipBg: MINT_PALE,
            chipBorder: MINT_BORDER,
            chipColor: MINT_DARK,
        },
        {
            wash: 'linear-gradient(180deg, rgba(104,195,212,0.18) 0%, rgba(255,255,255,0) 52%)',
            dot: SKY,
            chipBg: SKY_PALE,
            chipBorder: SKY_BORDER,
            chipColor: '#2c7a88',
        },
        {
            wash: 'linear-gradient(180deg, rgba(244,162,140,0.18) 0%, rgba(255,255,255,0) 52%)',
            dot: PEACH,
            chipBg: PEACH_PALE,
            chipBorder: PEACH_BORDER,
            chipColor: PEACH_DARK,
        },
    ]

    return palettes[Math.abs(month) % palettes.length]
}

function SurfacePattern() {
    return (
        <Box
            sx={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                backgroundImage: `
                    radial-gradient(circle at 1px 1px, rgba(244,162,140,0.12) 1px, transparent 0),
                    repeating-linear-gradient(135deg, transparent 0, transparent 14px, rgba(86,184,112,0.032) 14px, rgba(86,184,112,0.032) 16px)
                `,
                backgroundSize: '22px 22px, auto',
                opacity: 0.9,
            }}
        />
    )
}

function StatCard({
    icon,
    label,
    value,
    tone = 'mint',
}: {
    icon: React.ReactNode
    label: string
    value: string
    tone?: 'mint' | 'peach' | 'sky'
}) {
    const palette = tone === 'peach'
        ? { bg: PEACH_PALE, border: PEACH_BORDER, color: PEACH_DARK }
        : tone === 'sky'
            ? { bg: SKY_PALE, border: SKY_BORDER, color: '#2c7a88' }
            : { bg: MINT_PALE, border: MINT_BORDER, color: MINT_DARK }

    return (
        <Box
            sx={{
                p: 2,
                borderRadius: '24px',
                border: `1px solid ${palette.border}`,
                bgcolor: PANEL_SOFT,
                boxShadow: '0 18px 40px rgba(35,64,52,0.05)',
                height: '100%',
            }}
        >
            <Box
                sx={{
                    width: 42,
                    height: 42,
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: palette.bg,
                    color: palette.color,
                    mb: 1.5,
                }}
            >
                {icon}
            </Box>
            <Typography sx={{ fontSize: '1.45rem', fontWeight: 900, color: FOREST, lineHeight: 1.05, mb: 0.4 }}>
                {value}
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: TEXT_DIM, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 800 }}>
                {label}
            </Typography>
        </Box>
    )
}

function TemplateSwitcherCard({
    template,
    active,
    onClick,
}: {
    template: FarmingCalendarTemplate
    active: boolean
    onClick: () => void
}) {
    return (
        <Box
            component={motion.button}
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.99 }}
            onClick={onClick}
            sx={{
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                p: 0,
                borderRadius: '26px',
                appearance: 'none',
                background: active
                    ? 'linear-gradient(135deg, rgba(86,184,112,0.22) 0%, rgba(255,255,255,0.96) 42%, rgba(244,162,140,0.16) 100%)'
                    : 'linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(255,248,242,0.76) 100%)',
                border: active ? '1px solid rgba(86,184,112,0.28)' : '1px solid rgba(86,184,112,0.12)',
                boxShadow: active ? '0 24px 52px rgba(86,184,112,0.12)' : '0 18px 38px rgba(35,64,52,0.05)',
                transition: 'all 0.2s ease',
            }}
        >
            <Box sx={{ p: 2.4 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                    <Box>
                        <Typography sx={{ fontSize: '1.12rem', fontWeight: 900, color: FOREST, mb: 0.45 }}>
                            {template.title}
                        </Typography>
                        <Typography sx={{ fontSize: '0.92rem', color: TEXT_MID, lineHeight: 1.65 }}>
                            Anchored to the workbook&apos;s {template.referenceLabel.toLowerCase()}.
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            minWidth: 42,
                            height: 42,
                            borderRadius: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: active ? MINT_PALE : 'rgba(35,64,52,0.05)',
                            color: active ? MINT_DARK : TEXT_DIM,
                        }}
                    >
                        <SpaRounded fontSize="small" />
                    </Box>
                </Stack>

                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.7 }}>
                    <Chip
                        size="small"
                        label={`${template.tasks.length} activities`}
                        sx={{ bgcolor: MINT_PALE, color: MINT_DARK, fontWeight: 800 }}
                    />
                    <Chip
                        size="small"
                        label={`Months ${template.monthRange[0]}-${template.monthRange[1]}`}
                        sx={{ bgcolor: PEACH_PALE, color: PEACH_DARK, fontWeight: 800 }}
                    />
                </Stack>
            </Box>
        </Box>
    )
}

function MonthRibbon({
    months,
    tasksByMonth,
    busiestMonth,
    activeMonth,
    onViewTasks,
}: {
    months: number[]
    tasksByMonth: Map<number, TemplateTask[]>
    busiestMonth: number | null
    activeMonth: number | null
    onViewTasks: (month: number) => void
}) {
    return (
        <Box
            sx={{
                p: { xs: 2.2, md: 2.6 },
                borderRadius: '30px',
                border: '1px solid rgba(86,184,112,0.14)',
                bgcolor: PANEL,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 24px 60px rgba(35,64,52,0.06)',
            }}
        >
            <SurfacePattern />
            <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.7 }}>
                    <TimelineRounded sx={{ color: MINT_DARK }} />
                    <Typography sx={{ fontSize: '0.78rem', color: TEXT_DIM, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 800 }}>
                        Season Rhythm
                    </Typography>
                </Stack>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))', xl: 'repeat(8, minmax(0, 1fr))' },
                        gap: 1.2,
                    }}
                >
                    {months.length === 0 && (
                        <Box
                            sx={{
                                gridColumn: '1 / -1',
                                p: 2,
                                borderRadius: '20px',
                                border: '1px dashed rgba(86,184,112,0.24)',
                                background: 'rgba(255,255,255,0.72)',
                            }}
                        >
                            <Typography sx={{ fontSize: '0.94rem', color: TEXT_MID, fontWeight: 700 }}>
                                No scheduled tasks are available for this template yet.
                            </Typography>
                        </Box>
                    )}
                    {months.map((month) => {
                        const activityCount = tasksByMonth.get(month)?.length ?? 0
                        const palette = getMonthPalette(month)
                        const isPeak = month === busiestMonth && activityCount > 0
                        const isActive = month === activeMonth

                        return (
                            <Box
                                key={month}
                                sx={{
                                    p: 1.45,
                                    borderRadius: '20px',
                                    border: `1px solid ${isActive ? palette.dot : palette.chipBorder}`,
                                    background: isPeak
                                        ? `${palette.wash}, rgba(255,255,255,0.94)`
                                        : 'rgba(255,255,255,0.74)',
                                    boxShadow: isActive
                                        ? `0 18px 36px ${palette.chipBg}`
                                        : 'none',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <Typography sx={{ fontSize: '0.72rem', color: TEXT_DIM, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 800, mb: 0.65 }}>
                                    Month
                                </Typography>
                                <Typography sx={{ fontSize: '1.55rem', fontWeight: 900, color: FOREST, lineHeight: 1, mb: 0.75 }}>
                                    {month}
                                </Typography>
                                <Stack direction="row" spacing={0.8} alignItems="center">
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: palette.dot }} />
                                    <Typography sx={{ fontSize: '0.84rem', color: TEXT_MID, fontWeight: 700 }}>
                                        {activityCount} task{activityCount === 1 ? '' : 's'}
                                    </Typography>
                                </Stack>
                                <Button
                                    fullWidth
                                    size="small"
                                    variant={isActive ? 'contained' : 'outlined'}
                                    onClick={() => onViewTasks(month)}
                                    sx={{
                                        mt: 1.2,
                                        borderRadius: '999px',
                                        textTransform: 'none',
                                        fontWeight: 800,
                                        fontSize: '0.76rem',
                                        py: 0.55,
                                        color: isActive ? '#fff' : palette.chipColor,
                                        bgcolor: isActive ? palette.dot : 'rgba(255,255,255,0.64)',
                                        borderColor: isActive ? palette.dot : palette.chipBorder,
                                        boxShadow: 'none',
                                        '&:hover': {
                                            borderColor: palette.dot,
                                            bgcolor: isActive ? palette.chipColor : palette.chipBg,
                                            boxShadow: 'none',
                                        },
                                    }}
                                >
                                    {isActive ? 'Calendar open' : 'Open calendar'}
                                </Button>
                            </Box>
                        )
                    })}
                </Box>
            </Box>
        </Box>
    )
}

function CalendarFocusPanel({
    month,
    items,
    sourceSheet,
    referenceLabel,
    notesCount,
    onClearSelection,
}: {
    month: number | null
    items: TemplateTask[]
    sourceSheet: string
    referenceLabel: string
    notesCount: number
    onClearSelection: () => void
}) {
    const palette = month == null ? null : getMonthPalette(month)
    const weekLabels = Array.from(new Set(items.map((item) => item.weekLabel)))

    return (
        <Paper
            id={CALENDAR_SECTION_ID}
            sx={{
                p: { xs: 2.2, md: 2.6 },
                borderRadius: '30px',
                border: month == null
                    ? '1px solid rgba(244,162,140,0.16)'
                    : `1px solid ${palette?.chipBorder}`,
                bgcolor: month == null
                    ? 'rgba(255,248,242,0.94)'
                    : 'rgba(255,255,255,0.94)',
                background: month == null
                    ? 'rgba(255,248,242,0.94)'
                    : `linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.88) 100%), ${palette?.wash}`,
                boxShadow: '0 24px 60px rgba(35,64,52,0.06)',
                height: '100%',
                position: { xl: 'sticky' },
                top: { xl: 24 },
            }}
        >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.1 }}>
                <EventNoteRounded sx={{ color: month == null ? PEACH_DARK : palette?.chipColor }} />
                <Typography sx={{ fontSize: '0.78rem', color: TEXT_DIM, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 800 }}>
                    Calendar Focus
                </Typography>
            </Stack>

            {month == null ? (
                <>
                    <Typography sx={{ fontSize: '1.16rem', fontWeight: 900, color: FOREST, mb: 0.7 }}>
                        Select a month to open the calendar
                    </Typography>
                    <Typography sx={{ fontSize: '0.94rem', color: TEXT_MID, lineHeight: 1.74, mb: 1.8 }}>
                        Choose a month from Season Rhythm and this calendar panel will show the exact work scheduled for that month.
                    </Typography>
                </>
            ) : (
                <>
                    <Stack direction="row" justifyContent="space-between" spacing={1.2} alignItems="flex-start" sx={{ mb: 1.2 }}>
                        <Box>
                            <Typography sx={{ fontSize: '1.16rem', fontWeight: 900, color: FOREST, mb: 0.55 }}>
                                Month {month} calendar
                            </Typography>
                            <Typography sx={{ fontSize: '0.94rem', color: TEXT_MID, lineHeight: 1.72 }}>
                                {items.length} scheduled task{items.length === 1 ? '' : 's'} linked to this month.
                            </Typography>
                        </Box>
                        <Chip
                            size="small"
                            label={`${items.length} task${items.length === 1 ? '' : 's'}`}
                            sx={{
                                bgcolor: palette?.chipBg,
                                color: palette?.chipColor,
                                border: `1px solid ${palette?.chipBorder}`,
                                fontWeight: 800,
                            }}
                        />
                    </Stack>

                    {weekLabels.length > 0 && (
                        <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" sx={{ mb: 1.5 }}>
                            {weekLabels.map((label) => (
                                <Chip
                                    key={label}
                                    size="small"
                                    label={label}
                                    sx={{
                                        bgcolor: 'rgba(255,255,255,0.72)',
                                        color: palette?.chipColor,
                                        border: `1px solid ${palette?.chipBorder}`,
                                        fontWeight: 800,
                                    }}
                                />
                            ))}
                        </Stack>
                    )}

                    <Stack spacing={1}>
                        {items.map((item) => (
                            <Box
                                key={`${month}-${item.weekLabel}-${item.activity}`}
                                sx={{
                                    p: 1.35,
                                    borderRadius: '18px',
                                    border: `1px solid ${palette?.chipBorder}`,
                                    bgcolor: 'rgba(255,255,255,0.78)',
                                }}
                            >
                                <Typography sx={{ fontSize: '0.72rem', color: palette?.chipColor, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 800, mb: 0.45 }}>
                                    {item.weekLabel}
                                </Typography>
                                <Typography sx={{ fontSize: '0.92rem', color: TEXT_MID, lineHeight: 1.65 }}>
                                    {item.activity}
                                </Typography>
                            </Box>
                        ))}
                    </Stack>

                    <Button
                        variant="outlined"
                        onClick={onClearSelection}
                        sx={{
                            mt: 1.6,
                            borderRadius: '999px',
                            textTransform: 'none',
                            fontWeight: 800,
                            borderColor: palette?.chipBorder,
                            color: palette?.chipColor,
                            bgcolor: 'rgba(255,255,255,0.72)',
                            '&:hover': {
                                borderColor: palette?.dot,
                                bgcolor: palette?.chipBg,
                            },
                        }}
                    >
                        Show all months again
                    </Button>
                </>
            )}

            <Stack spacing={1.1} sx={{ mt: 1.8 }}>
                <Box sx={{ p: 1.4, borderRadius: '18px', bgcolor: 'rgba(255,255,255,0.7)', border: '1px solid rgba(244,162,140,0.12)' }}>
                    <Typography sx={{ fontSize: '0.72rem', color: TEXT_DIM, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 800, mb: 0.45 }}>
                        Sheet
                    </Typography>
                    <Typography sx={{ fontSize: '0.98rem', color: FOREST, fontWeight: 800 }}>
                        {sourceSheet}
                    </Typography>
                </Box>
                <Box sx={{ p: 1.4, borderRadius: '18px', bgcolor: 'rgba(255,255,255,0.7)', border: '1px solid rgba(244,162,140,0.12)' }}>
                    <Typography sx={{ fontSize: '0.72rem', color: TEXT_DIM, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 800, mb: 0.45 }}>
                        Workbook Anchor
                    </Typography>
                    <Typography sx={{ fontSize: '0.98rem', color: FOREST, fontWeight: 800 }}>
                        {referenceLabel}
                    </Typography>
                </Box>
                <Box sx={{ p: 1.4, borderRadius: '18px', bgcolor: 'rgba(255,255,255,0.7)', border: '1px solid rgba(244,162,140,0.12)' }}>
                    <Typography sx={{ fontSize: '0.72rem', color: TEXT_DIM, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 800, mb: 0.45 }}>
                        Guidance Notes
                    </Typography>
                    <Typography sx={{ fontSize: '0.98rem', color: FOREST, fontWeight: 800 }}>
                        {notesCount} notes included
                    </Typography>
                </Box>
            </Stack>
        </Paper>
    )
}

function MonthPanel({
    month,
    items,
    delay,
}: {
    month: number
    items: TemplateTask[]
    delay: number
}) {
    const palette = getMonthPalette(month)

    return (
        <Grid size={{ xs: 12, md: 6 }}>
            <Box
                component={motion.div}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay }}
                sx={{
                    height: '100%',
                    p: 0.2,
                    borderRadius: '30px',
                    background: `linear-gradient(180deg, rgba(255,255,255,0.76) 0%, rgba(255,255,255,0.36) 100%), ${palette.wash}`,
                    boxShadow: '0 24px 56px rgba(35,64,52,0.07)',
                }}
            >
                <Box
                    sx={{
                        height: '100%',
                        borderRadius: '29px',
                        border: `1px solid ${palette.chipBorder}`,
                        bgcolor: 'rgba(255,255,255,0.9)',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    <SurfacePattern />
                    <Box sx={{ position: 'relative', zIndex: 1, p: 2.4 }}>
                        <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ mb: 2.1 }}>
                            <Stack direction="row" spacing={1.3} alignItems="center">
                                <Box
                                    sx={{
                                        minWidth: 56,
                                        height: 56,
                                        borderRadius: '18px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: palette.chipBg,
                                        color: palette.chipColor,
                                        boxShadow: `inset 0 0 0 1px ${palette.chipBorder}`,
                                    }}
                                >
                                    <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, lineHeight: 1 }}>
                                        {month}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography sx={{ fontSize: '0.76rem', color: TEXT_DIM, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 800, mb: 0.35 }}>
                                        Timeline Window
                                    </Typography>
                                    <Typography sx={{ fontSize: '1.08rem', fontWeight: 900, color: FOREST }}>
                                        Month {month}
                                    </Typography>
                                </Box>
                            </Stack>

                            <Chip
                                label={items.length > 0 ? `${items.length} active` : 'Quiet'}
                                sx={{
                                    height: 30,
                                    bgcolor: items.length > 0 ? palette.chipBg : 'rgba(35,64,52,0.06)',
                                    color: items.length > 0 ? palette.chipColor : TEXT_DIM,
                                    border: `1px solid ${items.length > 0 ? palette.chipBorder : 'rgba(35,64,52,0.08)'}`,
                                    fontWeight: 800,
                                }}
                            />
                        </Stack>

                        {items.length > 0 ? (
                            <Box sx={{ position: 'relative', pl: 1.5 }}>
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: 12,
                                        bottom: 12,
                                        left: 8,
                                        width: 2,
                                        borderRadius: '999px',
                                        background: `linear-gradient(180deg, ${palette.dot} 0%, rgba(255,255,255,0) 100%)`,
                                        opacity: 0.4,
                                    }}
                                />
                                <Stack spacing={1.25}>
                                    {items.map((item) => (
                                        <Box key={`${month}-${item.weekLabel}-${item.activity}`} sx={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', columnGap: 1.05 }}>
                                            <Box sx={{ pt: 1.2, display: 'flex', justifyContent: 'center' }}>
                                                <Box
                                                    sx={{
                                                        width: 10,
                                                        height: 10,
                                                        borderRadius: '50%',
                                                        bgcolor: palette.dot,
                                                        boxShadow: `0 0 0 4px ${palette.chipBg}`,
                                                    }}
                                                />
                                            </Box>
                                            <Box
                                                sx={{
                                                    p: 1.5,
                                                    borderRadius: '18px',
                                                    border: '1px solid rgba(35,64,52,0.08)',
                                                    bgcolor: 'rgba(255,255,255,0.8)',
                                                }}
                                            >
                                                <Typography sx={{ fontSize: '0.72rem', color: palette.chipColor, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 800, mb: 0.55 }}>
                                                    {item.weekLabel}
                                                </Typography>
                                                <Typography sx={{ fontSize: '0.95rem', color: TEXT_MID, lineHeight: 1.72 }}>
                                                    {item.activity}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    ))}
                                </Stack>
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    p: 1.75,
                                    borderRadius: '20px',
                                    border: '1px dashed rgba(35,64,52,0.14)',
                                    bgcolor: 'rgba(255,255,255,0.62)',
                                }}
                            >
                                <Typography sx={{ fontSize: '0.92rem', color: TEXT_DIM, lineHeight: 1.7 }}>
                                    This month stays open in the workbook, so there are no fixed activities listed here.
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Box>
            </Box>
        </Grid>
    )
}

export function FarmingCalendarPage() {
    const [selectedTemplateId, setSelectedTemplateId] = useState<FarmingCalendarTemplate['id']>('plant')
    const [selectedTaskMonth, setSelectedTaskMonth] = useState<number | null>(null)

    const selectedTemplate = useMemo(
        () => FARMING_CALENDAR_TEMPLATES.find((template) => template.id === selectedTemplateId) ?? FARMING_CALENDAR_TEMPLATES[0],
        [selectedTemplateId]
    )

    const months = useMemo(() => {
        const [startMonth, endMonth] = selectedTemplate.monthRange
        return Array.from({ length: endMonth - startMonth + 1 }, (_, index) => startMonth + index)
    }, [selectedTemplate])

    const tasksByMonth = useMemo(() => {
        const mapped = new Map<number, TemplateTask[]>()

        months.forEach((month) => {
            mapped.set(
                month,
                selectedTemplate.tasks
                    .filter((task) => task.month === month)
                    .sort((left, right) => left.weekNumber - right.weekNumber)
            )
        })

        return mapped
    }, [months, selectedTemplate])

    const monthsWithTasks = useMemo(
        () => months.filter((month) => (tasksByMonth.get(month)?.length ?? 0) > 0),
        [months, tasksByMonth]
    )

    const activeTaskMonth = useMemo(
        () => (selectedTaskMonth != null && monthsWithTasks.includes(selectedTaskMonth) ? selectedTaskMonth : null),
        [selectedTaskMonth, monthsWithTasks]
    )

    const visibleTaskMonths = useMemo(
        () => (activeTaskMonth == null ? monthsWithTasks : [activeTaskMonth]),
        [activeTaskMonth, monthsWithTasks]
    )

    const selectedCalendarItems = useMemo(
        () => (activeTaskMonth == null ? [] : tasksByMonth.get(activeTaskMonth) ?? []),
        [activeTaskMonth, tasksByMonth]
    )

    const busiestMonth = useMemo(() => {
        let result: number | null = null
        let highestCount = 0

        months.forEach((month) => {
            const count = tasksByMonth.get(month)?.length ?? 0
            if (count > highestCount) {
                highestCount = count
                result = month
            }
        })

        return result
    }, [months, tasksByMonth])

    const handleViewMonthTasks = (month: number) => {
        setSelectedTaskMonth(month)
        if (typeof window === 'undefined') return
        window.requestAnimationFrame(() => {
            document.getElementById(CALENDAR_SECTION_ID)?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            })
        })
    }

    const handleShowAllTaskMonths = () => {
        setSelectedTaskMonth(null)
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: CREAM, position: 'relative' }}>
            <Box
                sx={{
                    position: 'fixed',
                    inset: 0,
                    pointerEvents: 'none',
                    background: `
                        radial-gradient(ellipse 38% 26% at 12% 2%, rgba(166,226,184,0.22) 0%, transparent 68%),
                        radial-gradient(ellipse 28% 22% at 88% 14%, rgba(244,162,140,0.18) 0%, transparent 72%),
                        radial-gradient(ellipse 28% 22% at 78% 92%, rgba(104,195,212,0.16) 0%, transparent 72%)
                    `,
                }}
            />

            <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1, py: { xs: 3, md: 4 } }}>
                <Box
                    component={motion.div}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    sx={{
                        p: { xs: 2.3, md: 3.2 },
                        borderRadius: '36px',
                        border: '1px solid rgba(86,184,112,0.16)',
                        bgcolor: PANEL,
                        boxShadow: '0 34px 90px rgba(35,64,52,0.08)',
                        position: 'relative',
                        overflow: 'hidden',
                        mb: 3.2,
                    }}
                >
                    <SurfacePattern />
                    <Grid container spacing={3.2} sx={{ position: 'relative', zIndex: 1 }}>
                        <Grid size={{ xs: 12, lg: 7.5 }}>
                            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.6 }}>
                                <Chip
                                    icon={<CalendarMonthRounded />}
                                    label="Workbook Imported"
                                    sx={{
                                        height: 34,
                                        bgcolor: MINT_PALE,
                                        color: MINT_DARK,
                                        border: '1px solid rgba(86,184,112,0.2)',
                                        fontWeight: 800,
                                    }}
                                />
                                <Chip
                                    label="Uploaded on 26 March 2026"
                                    sx={{
                                        height: 34,
                                        bgcolor: PEACH_PALE,
                                        color: PEACH_DARK,
                                        border: '1px solid rgba(244,162,140,0.22)',
                                        fontWeight: 800,
                                    }}
                                />
                            </Stack>

                            <Typography sx={{ fontSize: { xs: '2.2rem', md: '3.5rem' }, fontWeight: 900, color: FOREST, lineHeight: 0.98, mb: 1.1, maxWidth: 740 }}>
                                Farming Calendar
                            </Typography>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                                <Button
                                    component="a"
                                    href="/imports/farming-calendar.xlsx"
                                    download
                                    variant="contained"
                                    startIcon={<DownloadRounded />}
                                    sx={{
                                        px: 2.3,
                                        py: 1.2,
                                        borderRadius: '999px',
                                        bgcolor: MINT,
                                        color: '#fff',
                                        fontWeight: 800,
                                        boxShadow: '0 18px 34px rgba(86,184,112,0.22)',
                                        '&:hover': {
                                            bgcolor: MINT_DARK,
                                        },
                                    }}
                                >
                                    Download Workbook
                                </Button>
                                <Typography sx={{ fontSize: '0.92rem', color: TEXT_DIM, lineHeight: 1.6 }}>
                                    Active template follows the workbook&apos;s {selectedTemplate.referenceLabel.toLowerCase()}.
                                </Typography>
                            </Stack>
                        </Grid>

                        <Grid size={{ xs: 12, lg: 4.5 }}>
                            <Box
                                sx={{
                                    p: 2.3,
                                    borderRadius: '28px',
                                    border: '1px solid rgba(35,64,52,0.08)',
                                    background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,248,242,0.84) 100%)',
                                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
                                }}
                            >
                                <Typography sx={{ fontSize: '0.78rem', color: TEXT_DIM, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 800, mb: 0.9 }}>
                                    Current Workbook View
                                </Typography>
                                <Typography sx={{ fontSize: '1.3rem', fontWeight: 900, color: FOREST, mb: 0.65 }}>
                                    {selectedTemplate.title}
                                </Typography>
                                <Typography sx={{ fontSize: '0.92rem', color: TEXT_MID, lineHeight: 1.7, mb: 1.6 }}>
                                    Source sheet: {selectedTemplate.sourceSheet}. {selectedTemplate.workbookTitle}
                                </Typography>

                                <Grid container spacing={1.2}>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <StatCard
                                            icon={<InsightsRounded fontSize="small" />}
                                            label="Activities"
                                            value={String(selectedTemplate.tasks.length)}
                                            tone="mint"
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <StatCard
                                            icon={<CalendarMonthRounded fontSize="small" />}
                                            label="Busy Months"
                                            value={String(monthsWithTasks.length)}
                                            tone="sky"
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <StatCard
                                            icon={<AccessTimeRounded fontSize="small" />}
                                            label="Peak Window"
                                            value={busiestMonth == null ? 'None' : `M${busiestMonth}`}
                                            tone="peach"
                                        />
                                    </Grid>
                                </Grid>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>

                <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 12, xl: 8.5 }}>
                        <Paper
                            sx={{
                                p: { xs: 2.2, md: 2.6 },
                                borderRadius: '30px',
                                border: '1px solid rgba(86,184,112,0.14)',
                                bgcolor: PANEL,
                                position: 'relative',
                                overflow: 'hidden',
                                boxShadow: '0 24px 60px rgba(35,64,52,0.06)',
                                mb: 3,
                            }}
                        >
                            <SurfacePattern />
                            <Box sx={{ position: 'relative', zIndex: 1 }}>
                                <Typography sx={{ fontSize: '0.78rem', color: TEXT_DIM, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 800, mb: 1.2 }}>
                                    Template Selection
                                </Typography>
                                <Grid container spacing={1.4}>
                                    {FARMING_CALENDAR_TEMPLATES.map((template) => (
                                        <Grid key={template.id} size={{ xs: 12, md: 6 }}>
                                            <TemplateSwitcherCard
                                                template={template}
                                                active={template.id === selectedTemplateId}
                                                onClick={() => setSelectedTemplateId(template.id)}
                                            />
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>
                        </Paper>

                        <MonthRibbon
                            months={monthsWithTasks}
                            tasksByMonth={tasksByMonth}
                            busiestMonth={busiestMonth}
                            activeMonth={activeTaskMonth}
                            onViewTasks={handleViewMonthTasks}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, xl: 3.5 }}>
                        <CalendarFocusPanel
                            month={activeTaskMonth}
                            items={selectedCalendarItems}
                            sourceSheet={selectedTemplate.sourceSheet}
                            referenceLabel={selectedTemplate.referenceLabel}
                            notesCount={selectedTemplate.notes.length}
                            onClearSelection={handleShowAllTaskMonths}
                        />
                    </Grid>
                </Grid>

                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, xl: 8.5 }}>
                        <Box id={TASK_SECTION_ID}>
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={1.4}
                                alignItems={{ xs: 'stretch', sm: 'center' }}
                                justifyContent="space-between"
                                sx={{ mb: 1.8 }}
                            >
                                <Box>
                                    <Typography sx={{ fontSize: '0.78rem', color: TEXT_DIM, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 800, mb: 0.45 }}>
                                        Task Windows
                                    </Typography>
                                    <Typography sx={{ fontSize: '0.98rem', color: TEXT_MID, lineHeight: 1.7 }}>
                                        {activeTaskMonth == null
                                            ? 'Use the buttons above to jump to a month and review the tasks that need to be done.'
                                            : `Showing the scheduled tasks for Month ${activeTaskMonth}.`}
                                    </Typography>
                                </Box>
                                {activeTaskMonth != null && (
                                    <Button
                                        variant="outlined"
                                        onClick={handleShowAllTaskMonths}
                                        sx={{
                                            alignSelf: { xs: 'flex-start', sm: 'center' },
                                            borderRadius: '999px',
                                            textTransform: 'none',
                                            fontWeight: 800,
                                            borderColor: MINT_BORDER,
                                            color: MINT_DARK,
                                            bgcolor: 'rgba(255,255,255,0.72)',
                                            '&:hover': {
                                                borderColor: MINT,
                                                bgcolor: MINT_PALE,
                                            },
                                        }}
                                    >
                                        Show all months
                                    </Button>
                                )}
                            </Stack>

                            {visibleTaskMonths.length > 0 ? (
                                <Grid container spacing={2.2}>
                                    {visibleTaskMonths.map((month, index) => (
                                        <MonthPanel
                                            key={month}
                                            month={month}
                                            items={tasksByMonth.get(month) ?? []}
                                            delay={0.035 * index}
                                        />
                                    ))}
                                </Grid>
                            ) : (
                                <Paper
                                    sx={{
                                        p: 2.2,
                                        borderRadius: '24px',
                                        border: '1px dashed rgba(86,184,112,0.22)',
                                        bgcolor: 'rgba(255,255,255,0.72)',
                                    }}
                                >
                                    <Typography sx={{ fontSize: '0.95rem', color: TEXT_MID, lineHeight: 1.7 }}>
                                        No scheduled tasks are available for this template yet.
                                    </Typography>
                                </Paper>
                            )}
                        </Box>
                    </Grid>

                    <Grid size={{ xs: 12, xl: 3.5 }}>
                        <Paper
                            sx={{
                                p: { xs: 2.2, md: 2.6 },
                                borderRadius: '30px',
                                border: '1px solid rgba(86,184,112,0.14)',
                                bgcolor: PANEL,
                                position: { xl: 'sticky' },
                                top: { xl: 24 },
                                boxShadow: '0 24px 60px rgba(35,64,52,0.06)',
                            }}
                        >
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.2 }}>
                                <SpaRounded sx={{ color: MINT_DARK }} />
                                <Typography sx={{ fontSize: '0.78rem', color: TEXT_DIM, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 800 }}>
                                    Field Guidance
                                </Typography>
                            </Stack>
                            <Stack spacing={1.2}>
                                {selectedTemplate.notes.map((note, index) => (
                                    <Box
                                        key={note}
                                        sx={{
                                            p: 1.45,
                                            borderRadius: '18px',
                                            border: '1px solid rgba(86,184,112,0.1)',
                                            bgcolor: 'rgba(255,255,255,0.78)',
                                            display: 'grid',
                                            gridTemplateColumns: '34px minmax(0, 1fr)',
                                            columnGap: 1,
                                            alignItems: 'start',
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: 34,
                                                height: 34,
                                                borderRadius: '12px',
                                                bgcolor: MINT_PALE,
                                                color: MINT_DARK,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.82rem',
                                                fontWeight: 900,
                                            }}
                                        >
                                            {String(index + 1).padStart(2, '0')}
                                        </Box>
                                        <Typography sx={{ fontSize: '0.92rem', color: TEXT_MID, lineHeight: 1.72 }}>
                                            {note}
                                        </Typography>
                                    </Box>
                                ))}
                            </Stack>
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    )
}
