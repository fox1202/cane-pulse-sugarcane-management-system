import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
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
import { alpha } from '@mui/material/styles'
import {
    CalendarMonthRounded,
    FlagRounded,
    GrassRounded,
    ScienceRounded,
    TaskAltRounded,
    TimelineRounded,
} from '@mui/icons-material'
import { FARMING_CALENDAR_TEMPLATES, type FarmingCalendarTemplate } from '@/data/farmingCalendar'
import { formatDateOnlyLabel, getDateOnlyTimestamp } from '@/utils/dateOnly'
import {
    buildAnchoredCalendarTaskDate,
    resolveFarmingCalendarRouteContext,
} from '@/utils/farmingCalendarLinks'

const DISPLAY_FONT = '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, "Times New Roman", serif'
const BODY_FONT = '"Avenir Next", "Trebuchet MS", "Gill Sans", sans-serif'

type TemplateTask = FarmingCalendarTemplate['tasks'][number]
type TemplateGrowthStage = FarmingCalendarTemplate['growthStages'][number]
type ScheduledTemplateTask = TemplateTask & { dueDate: string | null }
type ActivityKind = 'Nutrient' | 'Herbicide'

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
    const [selectedTemplateId, setSelectedTemplateId] = useState<FarmingCalendarTemplate['id']>(
        routeContext.templateId ?? 'plant'
    )

    useEffect(() => {
        if (routeContext.templateId) {
            setSelectedTemplateId(routeContext.templateId)
        }
    }, [routeContext.templateId])

    const selectedTemplate = useMemo(
        () => FARMING_CALENDAR_TEMPLATES.find((template) => template.id === selectedTemplateId) ?? FARMING_CALENDAR_TEMPLATES[0],
        [selectedTemplateId]
    )

    const linkedTemplateMatchesSelection = routeContext.templateId === selectedTemplate.id
    const linkedTaskDatesEnabled = linkedTemplateMatchesSelection && Boolean(routeContext.anchorDate)
    const contextLabel = routeContext.trialLabel || routeContext.fieldLabel || ''
    const todayIso = useMemo(() => getTodayDateOnly(), [])

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
                                        {FARMING_CALENDAR_TEMPLATES.map((template) => (
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
                                                    label={`Switch back to ${FARMING_CALENDAR_TEMPLATES.find((template) => template.id === routeContext.templateId)?.title || 'the linked template'} to see dated tasks for this trial.`}
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
