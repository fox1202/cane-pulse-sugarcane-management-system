import { getFarmingCalendarTemplate, type FarmingCalendarTemplate } from '@/data/farmingCalendar'
import type { PredefinedField } from '@/services/database.service'
import { getAreaCropGroup } from '@/utils/cropGrouping'
import type { SugarcaneMonitoringRecord } from '@/types/database.types'
import { getDateOnlyTimestamp, normalizeDateOnlyValue } from '@/utils/dateOnly'

interface CalendarFieldSeed {
    fieldKey: string
    fieldLabel: string
    cropType: string
    cropClass: string
    plantingDate: string
    cutDate: string
    recordedDate: string
}

interface MonitoringFieldLookups {
    byIdentity: Map<string, PredefinedField>
    byName: Map<string, PredefinedField[]>
}

export type TaskSeverity = 'overdue' | 'today' | 'soon' | 'planned'

export interface UpcomingTaskNotice {
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

function buildMonitoringFieldLookups(fields: PredefinedField[]): MonitoringFieldLookups {
    const byIdentity = new Map<string, PredefinedField>()
    const byName = new Map<string, PredefinedField[]>()

    fields.forEach((field) => {
        const identity = buildFieldIdentity(field.field_name, field.section_name, field.block_id)
        if (identity !== '||' && !byIdentity.has(identity)) {
            byIdentity.set(identity, field)
        }

        const nameKey = normalizeFieldToken(field.field_name)
        if (!nameKey) {
            return
        }

        const group = byName.get(nameKey) ?? []
        group.push(field)
        byName.set(nameKey, group)
    })

    return { byIdentity, byName }
}

function resolveMonitoringField(
    record: Pick<SugarcaneMonitoringRecord, 'field_name' | 'section_name' | 'block_id'>,
    lookups: MonitoringFieldLookups
): PredefinedField | null {
    const exact = lookups.byIdentity.get(buildFieldIdentity(record.field_name, record.section_name, record.block_id))
    if (exact) {
        return exact
    }

    const nameMatches = lookups.byName.get(normalizeFieldToken(record.field_name)) ?? []
    return nameMatches.length === 1 ? nameMatches[0] : null
}

function getTodayDateOnly(): string {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
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

function getCalendarAnchorDate(seed: CalendarFieldSeed, template: FarmingCalendarTemplate): string | null {
    if (template.fieldAnchor === 'cut_date') {
        return normalizeDateOnlyValue(seed.cutDate || seed.plantingDate || seed.recordedDate)
    }

    return normalizeDateOnlyValue(seed.plantingDate || seed.cutDate || seed.recordedDate)
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

function getTaskSeverity(daysUntil: number): TaskSeverity {
    if (daysUntil < 0) return 'overdue'
    if (daysUntil === 0) return 'today'
    if (daysUntil <= 14) return 'soon'
    return 'planned'
}

function sortUpcomingTasks(left: UpcomingTaskNotice, right: UpcomingTaskNotice): number {
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

export function getTaskDueLabel(daysUntil: number): string {
    if (daysUntil === 0) return 'Today'
    if (daysUntil === -1) return '1 day overdue'
    if (daysUntil < 0) return `${Math.abs(daysUntil)} days overdue`
    if (daysUntil === 1) return 'Tomorrow'
    return `In ${daysUntil} days`
}

export function buildUpcomingTaskNotices(
    monitoring: SugarcaneMonitoringRecord[],
    predefinedFields: PredefinedField[]
): UpcomingTaskNotice[] {
    const fieldLookups = buildMonitoringFieldLookups(predefinedFields)
    const byField = new Map<string, CalendarFieldSeed>()

    const sortedMonitoring = [...monitoring].sort(
        (left, right) => getDateOnlyTimestamp(normalizeDateOnlyValue(right.date_recorded) || '')
            - getDateOnlyTimestamp(normalizeDateOnlyValue(left.date_recorded) || '')
    )

    sortedMonitoring.forEach((record) => {
        const fieldKey = buildFieldIdentity(record.field_name, record.section_name, record.block_id)
        const existing = byField.get(fieldKey)
        const linkedField = resolveMonitoringField(record, fieldLookups)
        const cropType = (record.crop_type ?? linkedField?.crop_type ?? '').trim()
        const cropClass = (record.crop_class ?? '').trim()
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

    const calendarFieldSeeds = Array.from(byField.values())
        .filter((seed) => isCalendarRelevantCrop(seed.cropType, seed.cropClass))
        .sort((left, right) => left.fieldLabel.localeCompare(right.fieldLabel))

    const todayIso = getTodayDateOnly()
    const todayTimestamp = getDateOnlyTimestamp(todayIso)
    const uniqueTasks = new Map<string, UpcomingTaskNotice>()

    calendarFieldSeeds.forEach((seed) => {
        const template = getCalendarTemplateForField(seed)
        const anchorDate = getCalendarAnchorDate(seed, template)

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
}
