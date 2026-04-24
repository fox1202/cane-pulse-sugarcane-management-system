import { supabase } from '@/lib/supabase'
import type {
    FarmingCalendarGrowthStage,
    FarmingCalendarTask,
    FarmingCalendarTemplate,
} from '@/data/farmingCalendar'

interface FarmingCalendarTemplateRow {
    id: string
    title: string
    source_sheet: string
    workbook_title: string
    reference_label: string
    field_anchor: string
    anchor_week_number: number
    month_start: number
    month_end: number
}

interface FarmingCalendarNoteRow {
    template_id: string
    note_order: number
    note: string
}

interface FarmingCalendarGrowthStageRow {
    template_id: string
    stage_key: string
    title: string
    start_week: number
    end_week: number
    summary: string
    activity_focus: string[] | null
    stage_order: number
}

interface FarmingCalendarTaskRow {
    template_id: string
    month_number: number
    week_number: number
    week_label: string
    activity: string
}

function resolveTemplateId(value: string): FarmingCalendarTemplate['id'] | null {
    return value === 'plant' || value === 'ratoon' ? value : null
}

function resolveFieldAnchor(value: string): FarmingCalendarTemplate['fieldAnchor'] {
    return value === 'cut_date' ? 'cut_date' : 'planting_date'
}

function getNumber(value: unknown, fallback = 0): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function groupByTemplateId<T extends { template_id: string }>(rows: T[]): Map<string, T[]> {
    const grouped = new Map<string, T[]>()

    rows.forEach((row) => {
        const items = grouped.get(row.template_id) ?? []
        items.push(row)
        grouped.set(row.template_id, items)
    })

    return grouped
}

function isMissingRelationError(error: unknown): boolean {
    const code = String((error as { code?: string })?.code || '')
    const message = String((error as { message?: string })?.message || error)

    return ['42P01', 'PGRST205'].includes(code) ||
        /relation|does not exist|schema cache|could not find the table/i.test(message)
}

export async function fetchFarmingCalendarTemplatesFromDatabase(): Promise<FarmingCalendarTemplate[]> {
    const [
        templatesResult,
        notesResult,
        growthStagesResult,
        tasksResult,
    ] = await Promise.all([
        supabase
            .from('farming_calendar_templates')
            .select('id, title, source_sheet, workbook_title, reference_label, field_anchor, anchor_week_number, month_start, month_end')
            .order('month_start', { ascending: true }),
        supabase
            .from('farming_calendar_notes')
            .select('template_id, note_order, note')
            .order('template_id', { ascending: true })
            .order('note_order', { ascending: true }),
        supabase
            .from('farming_calendar_growth_stages')
            .select('template_id, stage_key, title, start_week, end_week, summary, activity_focus, stage_order')
            .order('template_id', { ascending: true })
            .order('stage_order', { ascending: true }),
        supabase
            .from('farming_calendar_tasks')
            .select('template_id, month_number, week_number, week_label, activity')
            .order('template_id', { ascending: true })
            .order('month_number', { ascending: true })
            .order('week_number', { ascending: true }),
    ])

    if (templatesResult.error) throw templatesResult.error
    if (notesResult.error) throw notesResult.error
    if (growthStagesResult.error && !isMissingRelationError(growthStagesResult.error)) {
        throw growthStagesResult.error
    }
    if (tasksResult.error) throw tasksResult.error

    const templateRows = (templatesResult.data ?? []) as FarmingCalendarTemplateRow[]
    const noteRows = (notesResult.data ?? []) as FarmingCalendarNoteRow[]
    const growthStageRows = growthStagesResult.error
        ? []
        : (growthStagesResult.data ?? []) as FarmingCalendarGrowthStageRow[]
    const taskRows = (tasksResult.data ?? []) as FarmingCalendarTaskRow[]
    const notesByTemplate = groupByTemplateId(noteRows)
    const growthStagesByTemplate = groupByTemplateId(growthStageRows)
    const tasksByTemplate = groupByTemplateId(taskRows)

    const templates = templateRows
        .map((row): FarmingCalendarTemplate | null => {
            const templateId = resolveTemplateId(row.id)

            if (!templateId) {
                return null
            }

            const notes = (notesByTemplate.get(row.id) ?? [])
                .sort((left, right) => getNumber(left.note_order) - getNumber(right.note_order))
                .map((note) => note.note)

            const growthStages: FarmingCalendarGrowthStage[] = (growthStagesByTemplate.get(row.id) ?? [])
                .sort((left, right) => getNumber(left.stage_order) - getNumber(right.stage_order))
                .map((stage) => ({
                    key: stage.stage_key,
                    title: stage.title,
                    startWeek: getNumber(stage.start_week),
                    endWeek: getNumber(stage.end_week),
                    summary: stage.summary,
                    activityFocus: Array.isArray(stage.activity_focus) ? stage.activity_focus : [],
                }))

            const tasks: FarmingCalendarTask[] = (tasksByTemplate.get(row.id) ?? [])
                .sort((left, right) =>
                    getNumber(left.month_number) - getNumber(right.month_number) ||
                    getNumber(left.week_number) - getNumber(right.week_number)
                )
                .map((task) => ({
                    month: getNumber(task.month_number),
                    weekNumber: getNumber(task.week_number),
                    weekLabel: task.week_label,
                    activity: task.activity,
                }))

            return {
                id: templateId,
                title: row.title,
                sourceSheet: row.source_sheet,
                workbookTitle: row.workbook_title,
                referenceLabel: row.reference_label,
                fieldAnchor: resolveFieldAnchor(row.field_anchor),
                anchorWeekNumber: getNumber(row.anchor_week_number),
                monthRange: [getNumber(row.month_start), getNumber(row.month_end)],
                notes,
                growthStages,
                tasks,
            }
        })
        .filter((template): template is FarmingCalendarTemplate => Boolean(template))

    if (templates.length === 0) {
        throw new Error('No farming calendar templates were returned from the database.')
    }

    return templates
}
