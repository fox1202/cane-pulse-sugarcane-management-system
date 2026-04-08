import {
    getFarmingCalendarTemplate,
    type FarmingCalendarGrowthStage,
    type FarmingCalendarTemplate,
} from '@/data/farmingCalendar'
import { getDateOnlyTimestamp, normalizeDateOnlyValue } from '@/utils/dateOnly'

export interface GrowthStageSource {
    crop_type?: string | null
    crop_class?: string | null
    crop_stage?: string | null
    planting_date?: string | null
    previous_cutting?: string | null
    previous_cutting_date?: string | null
    cutting_date?: string | null
    date_recorded?: string | null
}

export interface GrowthStageResolution {
    stage: string | null
    stageKey: string | null
    stageSummary: string | null
    activityFocus: string[]
    templateId: FarmingCalendarTemplate['id'] | null
    templateTitle: string | null
    anchorDate: string | null
    anchorLabel: string | null
    weekNumber: number | null
}

function normalizeText(value?: string | null): string {
    return String(value ?? '').trim()
}

function getTodayDateOnly(): string {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function isFallowLike(value?: string | null): boolean {
    return /fallow|furrow|fullow|\bnone\b/i.test(normalizeText(value))
}

function getCurrentCalendarWeek(
    template: FarmingCalendarTemplate,
    anchorDate: string,
    referenceDate: string
): number | null {
    const anchorTimestamp = getDateOnlyTimestamp(anchorDate)
    const referenceTimestamp = getDateOnlyTimestamp(referenceDate)

    if (!anchorTimestamp || !referenceTimestamp) {
        return null
    }

    const daysElapsed = Math.floor((referenceTimestamp - anchorTimestamp) / 86_400_000)
    return template.anchorWeekNumber + Math.floor(daysElapsed / 7)
}

function getGrowthStageForWeek(
    stages: FarmingCalendarGrowthStage[],
    weekNumber: number
): FarmingCalendarGrowthStage | null {
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

export function deriveGrowthStage(
    source: GrowthStageSource,
    referenceDateValue?: string | null
): GrowthStageResolution {
    const fallbackStage = normalizeText(source.crop_stage) || null
    const cropSignal = `${normalizeText(source.crop_type)} ${normalizeText(source.crop_class)}`.trim()

    if (isFallowLike(cropSignal)) {
        return {
            stage: fallbackStage,
            stageKey: null,
            stageSummary: null,
            activityFocus: [],
            templateId: null,
            templateTitle: null,
            anchorDate: null,
            anchorLabel: null,
            weekNumber: null,
        }
    }

    const plantingDate = normalizeDateOnlyValue(source.planting_date)
    const cuttingDate = normalizeDateOnlyValue(
        source.previous_cutting_date || source.previous_cutting || source.cutting_date
    )
    const templateId: FarmingCalendarTemplate['id'] | null = plantingDate
        ? 'plant'
        : cuttingDate
            ? 'ratoon'
            : null

    if (!templateId) {
        return {
            stage: fallbackStage,
            stageKey: null,
            stageSummary: null,
            activityFocus: [],
            templateId: null,
            templateTitle: null,
            anchorDate: null,
            anchorLabel: null,
            weekNumber: null,
        }
    }

    const anchorDate = templateId === 'plant' ? plantingDate : cuttingDate
    const referenceDate = normalizeDateOnlyValue(referenceDateValue ?? source.date_recorded) || getTodayDateOnly()

    if (!anchorDate) {
        return {
            stage: fallbackStage,
            stageKey: null,
            stageSummary: null,
            activityFocus: [],
            templateId,
            templateTitle: templateId ? getFarmingCalendarTemplate(templateId).title : null,
            anchorDate: null,
            anchorLabel: templateId === 'plant' ? 'Planting date' : 'Cutting date',
            weekNumber: null,
        }
    }

    const template = getFarmingCalendarTemplate(templateId)
    const weekNumber = getCurrentCalendarWeek(template, anchorDate, referenceDate)
    const stage = weekNumber === null ? null : getGrowthStageForWeek(template.growthStages, weekNumber)

    return {
        stage: stage?.title ?? fallbackStage,
        stageKey: stage?.key ?? null,
        stageSummary: stage?.summary ?? null,
        activityFocus: stage?.activityFocus ?? [],
        templateId,
        templateTitle: template.title,
        anchorDate,
        anchorLabel: templateId === 'plant' ? 'Planting date' : 'Cutting date',
        weekNumber,
    }
}

export function deriveGrowthStageLabel(
    source: GrowthStageSource,
    referenceDateValue?: string | null
): string | null {
    return deriveGrowthStage(source, referenceDateValue).stage
}
