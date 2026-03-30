import {
    getFarmingCalendarTemplate,
    type FarmingCalendarTask,
    type FarmingCalendarTemplate,
} from '@/data/farmingCalendar'
import type { SugarcaneMonitoringRecord } from '@/types/database.types'
import { getDateOnlyTimestamp, normalizeDateOnlyValue } from '@/utils/dateOnly'

interface TrialCalendarSeed {
    key: string
    trialLabel: string
    fieldLabel: string
    cropType: string
    cropClass: string
    plantingDate: string
    cutDate: string
    latestDate: string
}

export interface MonitoringTrialCalendarLink {
    key: string
    trialLabel: string
    fieldLabel: string
    cropType: string
    cropClass: string
    latestDate: string
    templateId: FarmingCalendarTemplate['id'] | null
    templateTitle: string | null
    anchorDate: string | null
    anchorLabel: string | null
}

export interface FarmingCalendarRouteContext {
    templateId: FarmingCalendarTemplate['id'] | null
    trialLabel: string | null
    fieldLabel: string | null
    cropClass: string | null
    anchorDate: string | null
}

export interface ObservationCalendarSource {
    selected_field?: string
    field_name?: string
    section_name?: string
    block_id?: string
    trial_name?: string
    trial_number?: string | number
    crop_type?: string
    crop_class?: string
    planting_date?: string
    previous_cutting_date?: string
    cutting_date?: string
}

export type ObservationCalendarAnchor = 'planting' | 'cutting'

function normalizeValue(value?: string | number | null): string {
    return String(value ?? '').trim().replace(/\s+/g, ' ')
}

function normalizeToken(value?: string | number | null): string {
    return normalizeValue(value).toLowerCase()
}

function isSugarcaneLike(value?: string | null): boolean {
    return /sugar\s*cane|plant\s*cane|\bratoon\b|\bcane\b/i.test(normalizeValue(value))
}

function isRatoonLike(value?: string | null): boolean {
    return /\bratoon\b/i.test(normalizeValue(value))
}

function buildFieldLabel(record: Pick<SugarcaneMonitoringRecord, 'field_name' | 'section_name' | 'block_id'>): string {
    return [record.field_name, record.section_name, record.block_id]
        .map((value) => normalizeValue(value))
        .filter(Boolean)
        .join(' / ') || 'Unknown field'
}

function buildTrialLabel(record: SugarcaneMonitoringRecord): string {
    const trialName = normalizeValue(record.trial_name)
    if (trialName) {
        return trialName
    }

    const trialNumber = normalizeValue(record.trial_number)
    if (trialNumber) {
        return `Trial ${trialNumber}`
    }

    return buildFieldLabel(record)
}

function buildTrialIdentity(record: SugarcaneMonitoringRecord): string {
    return [
        normalizeToken(record.trial_name),
        normalizeToken(record.trial_number),
        normalizeToken(record.section_name),
        normalizeToken(record.block_id),
        normalizeToken(record.field_name),
    ].join('|')
}

function buildObservationFieldLabel(record: ObservationCalendarSource): string {
    return [record.selected_field || record.field_name, record.section_name, record.block_id]
        .map((value) => normalizeValue(value))
        .filter(Boolean)
        .join(' / ') || 'Unknown field'
}

function buildObservationTrialLabel(record: ObservationCalendarSource): string {
    const trialName = normalizeValue(record.trial_name)
    if (trialName) {
        return trialName
    }

    const trialNumber = normalizeValue(record.trial_number)
    if (trialNumber) {
        return `Trial ${trialNumber}`
    }

    return buildObservationFieldLabel(record)
}

function resolveTemplateId(seed: TrialCalendarSeed): FarmingCalendarTemplate['id'] | null {
    if (!isSugarcaneLike(`${seed.cropType} ${seed.cropClass}`)) {
        return null
    }

    return isRatoonLike(seed.cropClass) || Boolean(seed.cutDate) ? 'ratoon' : 'plant'
}

function resolveAnchorDate(
    seed: Pick<TrialCalendarSeed, 'plantingDate' | 'cutDate'>,
    template: FarmingCalendarTemplate
): string | null {
    if (template.fieldAnchor === 'cut_date') {
        return normalizeDateOnlyValue(seed.cutDate || seed.plantingDate)
    }

    return normalizeDateOnlyValue(seed.plantingDate || seed.cutDate)
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

export function buildMonitoringTrialCalendarLinks(
    monitoring: SugarcaneMonitoringRecord[]
): MonitoringTrialCalendarLink[] {
    const sortedMonitoring = [...monitoring].sort(
        (left, right) => getDateOnlyTimestamp(right.date_recorded) - getDateOnlyTimestamp(left.date_recorded)
    )
    const byTrial = new Map<string, TrialCalendarSeed>()

    sortedMonitoring.forEach((record) => {
        const key = buildTrialIdentity(record)
        if (!key || key === '||||') {
            return
        }

        const existing = byTrial.get(key)
        const trialLabel = buildTrialLabel(record)
        const fieldLabel = buildFieldLabel(record)
        const cropType = normalizeValue(record.crop_type)
        const cropClass = normalizeValue(record.crop_class)
        const plantingDate = normalizeDateOnlyValue(record.planting_date) || ''
        const cutDate = normalizeDateOnlyValue(record.previous_cutting_date ?? record.previous_cutting) || ''
        const latestDate = normalizeDateOnlyValue(record.date_recorded) || ''

        if (!existing) {
            byTrial.set(key, {
                key,
                trialLabel,
                fieldLabel,
                cropType,
                cropClass,
                plantingDate,
                cutDate,
                latestDate,
            })
            return
        }

        if (!existing.trialLabel && trialLabel) existing.trialLabel = trialLabel
        if (!existing.fieldLabel && fieldLabel) existing.fieldLabel = fieldLabel
        if (!existing.cropType && cropType) existing.cropType = cropType
        if (!existing.cropClass && cropClass) existing.cropClass = cropClass
        if (!existing.plantingDate && plantingDate) existing.plantingDate = plantingDate
        if (!existing.cutDate && cutDate) existing.cutDate = cutDate
    })

    return Array.from(byTrial.values())
        .map((seed) => {
            const templateId = resolveTemplateId(seed)
            const template = templateId ? getFarmingCalendarTemplate(templateId) : null
            const anchorDate = template ? resolveAnchorDate(seed, template) : null

            return {
                key: seed.key,
                trialLabel: seed.trialLabel || seed.fieldLabel,
                fieldLabel: seed.fieldLabel,
                cropType: seed.cropType,
                cropClass: seed.cropClass,
                latestDate: seed.latestDate,
                templateId,
                templateTitle: template?.title ?? null,
                anchorDate,
                anchorLabel: template?.referenceLabel ?? null,
            }
        })
        .sort((left, right) => {
            const templateComparison = (left.templateTitle ?? 'zzz').localeCompare(right.templateTitle ?? 'zzz')
            if (templateComparison !== 0) {
                return templateComparison
            }

            const trialComparison = left.trialLabel.localeCompare(right.trialLabel, undefined, { sensitivity: 'base' })
            if (trialComparison !== 0) {
                return trialComparison
            }

            return left.fieldLabel.localeCompare(right.fieldLabel, undefined, { sensitivity: 'base' })
        })
}

export function buildMonitoringCalendarSearch(link: MonitoringTrialCalendarLink): string {
    const params = new URLSearchParams()

    if (link.templateId) params.set('template', link.templateId)
    if (link.trialLabel) params.set('trial', link.trialLabel)
    if (link.fieldLabel) params.set('field', link.fieldLabel)
    if (link.cropClass) params.set('cropClass', link.cropClass)
    if (link.anchorDate) params.set('anchorDate', link.anchorDate)

    return params.toString()
}

export function buildObservationCalendarSearch(
    record: ObservationCalendarSource,
    anchor: ObservationCalendarAnchor
): string {
    const anchorDate = normalizeDateOnlyValue(
        anchor === 'planting'
            ? record.planting_date
            : record.cutting_date || record.previous_cutting_date
    )

    if (!anchorDate) {
        return ''
    }

    const params = new URLSearchParams()
    params.set('template', anchor === 'planting' ? 'plant' : 'ratoon')

    const trialLabel = buildObservationTrialLabel(record)
    const fieldLabel = buildObservationFieldLabel(record)
    const cropClass = normalizeValue(record.crop_class)

    if (trialLabel) params.set('trial', trialLabel)
    if (fieldLabel) params.set('field', fieldLabel)
    if (cropClass) params.set('cropClass', cropClass)
    params.set('anchorDate', anchorDate)

    return params.toString()
}

export function resolveFarmingCalendarRouteContext(search: string): FarmingCalendarRouteContext {
    const params = new URLSearchParams(search)
    const templateParam = normalizeValue(params.get('template'))
    const templateId = templateParam === 'plant' || templateParam === 'ratoon' ? templateParam : null

    return {
        templateId,
        trialLabel: normalizeValue(params.get('trial')) || null,
        fieldLabel: normalizeValue(params.get('field')) || null,
        cropClass: normalizeValue(params.get('cropClass')) || null,
        anchorDate: normalizeDateOnlyValue(params.get('anchorDate')),
    }
}

export function buildAnchoredCalendarTaskDate(
    template: FarmingCalendarTemplate,
    task: FarmingCalendarTask,
    anchorDate: string
): string | null {
    return addDaysToDateOnly(anchorDate, (task.weekNumber - template.anchorWeekNumber) * 7)
}
