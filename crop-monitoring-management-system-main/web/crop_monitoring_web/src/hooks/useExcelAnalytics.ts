import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Papa from 'papaparse'
import { differenceInDays, format, parseISO } from 'date-fns'
import { fetchObservations } from '@/services/database.service'
import { LIVE_DATA_UPDATED_EVENT } from '@/lib/liveData'
import type { FullObservation } from '@/types/database.types'
import {
    SUGARCANE_CROP_LABEL,
    dedupeObservationsForAnalytics,
    filterSugarcaneObservations,
    getObservationDateValue,
    getObservationFieldKey,
    normalizeObservationCropType,
    normalizeObservationText,
    toFiniteObservationNumber,
} from '@/utils/observationAnalytics'

// Fallback CSV file (observation_entry_form table has been disconnected from the web app)
// This is now a static demo/reference file for analytics fallback only
const PROVIDED_ROW_CSV = '/analytics/observation_entry_form_single_row.csv'

interface ProvidedRowCsv {
    id?: string
    client_uuid?: string
    selected_field?: string
    section_name?: string
    field_name?: string
    block_id?: string
    block_size?: string
    gps_accuracy?: string
    date_recorded?: string
    crop_class?: string
    variety?: string
    planting_date?: string
    expected_harvest_date?: string
    irrigation_type?: string
    water_source?: string
    soil_type?: string
    soil_ph?: string
    remarks?: string
    created_at?: string
}

interface MilestonePoint {
    label: string
    isoDate: string
    formattedDate: string
    daysFromPlanting: number
}

interface CycleDurationPoint {
    stage: string
    days: number
}

interface SnapshotMetric {
    label: string
    value: number
    unit: string
}

interface BreakdownPoint {
    label: string
    value: number
}

interface TimelinePoint {
    label: string
    count: number
    fullDate: string
}

interface SoilPhTimelinePoint {
    label: string
    avgPh: number
    fullDate: string
    count: number
}

interface AnalyticsRecord {
    id: string
    fieldName: string
    sectionName: string
    blockId: string
    cropClass: string
    variety: string
    dateRecorded: string
    plantingDate: string
    expectedHarvestDate: string
    harvestDate: string
    irrigationType: string
    waterSource: string
    soilType: string
    soilPh: number | null
    blockSize: number | null
    gpsAccuracy: number | null
    yieldValue: number | null
    remarks: string
}

interface AnalyticsOverview {
    totalRecords: number
    uniqueFields: number
    varietiesTracked: number
    latestRecordDate: string
}

interface AnalyticsSummary {
    cropClass: string
    leadingVariety: string
    leadingIrrigation: string
    leadingSoilType: string
    totalCycleDays: number
    elapsedCycleDays: number
    remainingCycleDays: number
    cycleProgressPercent: number
    averageYield: number | null
    averageSoilPh: number | null
    recordsWithYield: number
}

interface AnalyticsNotes {
    latestRecordDate: string
    dateRange: string
    dominantWaterSource: string
    dominantField: string
    remarksSummary: string
}

export interface ExcelAnalyticsData {
    overview: AnalyticsOverview
    summary: AnalyticsSummary
    notes: AnalyticsNotes
    milestones: MilestonePoint[]
    cycleDurations: CycleDurationPoint[]
    progressBreakdown: Array<{ label: string; days: number }>
    snapshotMetrics: SnapshotMetric[]
    activityTimeline: TimelinePoint[]
    varietyBreakdown: BreakdownPoint[]
    fieldCoverage: BreakdownPoint[]
    irrigationBreakdown: BreakdownPoint[]
    soilTypeBreakdown: BreakdownPoint[]
    soilPhBandBreakdown: BreakdownPoint[]
    soilPhTimeline: SoilPhTimelinePoint[]
}

async function fetchCsvRows<T extends object>(url: string): Promise<T[]> {
    const response = await fetch(url)

    if (!response.ok) {
        throw new Error(`Failed to load analytics file: ${url}`)
    }

    const text = await response.text()
    const result = Papa.parse<T>(text, {
        header: true,
        skipEmptyLines: true,
    })

    return result.data.filter((row) => Object.values(row).some((value) => String(value || '').trim().length > 0))
}

function displayDate(value?: string): string {
    if (!value) return '-'

    try {
        return format(parseISO(value), 'MMM dd, yyyy')
    } catch {
        return value
    }
}

function daysBetween(startIso?: string, endIso?: string): number {
    if (!startIso || !endIso) return 0

    try {
        return Math.max(differenceInDays(parseISO(endIso), parseISO(startIso)), 0)
    } catch {
        return 0
    }
}

function average(values: number[]): number {
    if (values.length === 0) {
        return 0
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length
}

function roundedAverage(values: number[]): number {
    return Math.round(average(values))
}

function safePercent(value: number, total: number): number {
    if (total <= 0) return 0
    return Math.max(0, Math.min(100, Math.round((value / total) * 100)))
}

function getMostCommonValue(values: Array<string | null | undefined>, fallback = '-'): string {
    const counts = new Map<string, { label: string; count: number }>()

    values.forEach((value) => {
        const label = (value ?? '').trim()
        if (!label) {
            return
        }

        const normalized = normalizeObservationText(label)
        const current = counts.get(normalized)
        counts.set(normalized, {
            label,
            count: (current?.count || 0) + 1,
        })
    })

    const topMatch = Array.from(counts.values()).sort((left, right) => right.count - left.count)[0]
    return topMatch?.label || fallback
}

function formatDateRange(dateValues: string[]): string {
    const timestamps = dateValues
        .map((value) => {
            const timestamp = Date.parse(value)
            return Number.isFinite(timestamp) ? timestamp : null
        })
        .filter((value): value is number => value !== null)
        .sort((left, right) => left - right)

    if (timestamps.length === 0) {
        return 'No recorded dates'
    }

    const firstDate = new Date(timestamps[0]).toISOString()
    const lastDate = new Date(timestamps[timestamps.length - 1]).toISOString()

    return timestamps.length === 1
        ? displayDate(lastDate)
        : `${displayDate(firstDate)} to ${displayDate(lastDate)}`
}

function buildBreakdown(
    values: Array<string | null | undefined>,
    options?: {
        limit?: number
        fallbackLabel?: string
        includeBlankAsFallback?: boolean
    }
): BreakdownPoint[] {
    const limit = options?.limit ?? 5
    const fallbackLabel = options?.fallbackLabel ?? 'Unspecified'
    const includeBlankAsFallback = options?.includeBlankAsFallback ?? false
    const counts = new Map<string, { label: string; value: number }>()

    values.forEach((value) => {
        const trimmed = (value ?? '').trim()
        if (!trimmed && !includeBlankAsFallback) {
            return
        }

        const label = trimmed || fallbackLabel
        const normalized = normalizeObservationText(label || fallbackLabel)
        if (!normalized) {
            return
        }

        const existing = counts.get(normalized)
        counts.set(normalized, {
            label,
            value: (existing?.value || 0) + 1,
        })
    })

    return Array.from(counts.values())
        .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label))
        .slice(0, limit)
}

function buildActivityTimeline(records: AnalyticsRecord[]): TimelinePoint[] {
    const counts = new Map<string, { count: number; timestamp: number; label: string; fullDate: string }>()

    records.forEach((record) => {
        const timestamp = Date.parse(record.dateRecorded)
        if (!Number.isFinite(timestamp)) {
            return
        }

        const isoDay = new Date(timestamp).toISOString().slice(0, 10)
        const current = counts.get(isoDay)

        counts.set(isoDay, {
            count: (current?.count || 0) + 1,
            timestamp,
            label: format(new Date(timestamp), 'MMM d'),
            fullDate: format(new Date(timestamp), 'MMMM d, yyyy'),
        })
    })

    const timeline = Array.from(counts.values())
        .sort((left, right) => left.timestamp - right.timestamp)
        .map((point) => ({
            label: point.label,
            count: point.count,
            fullDate: point.fullDate,
        }))

    return timeline.length > 10 ? timeline.slice(-10) : timeline
}

function buildSoilPhTimeline(records: AnalyticsRecord[]): SoilPhTimelinePoint[] {
    const grouped = new Map<string, { total: number; count: number; timestamp: number; label: string; fullDate: string }>()

    records.forEach((record) => {
        if (record.soilPh === null) {
            return
        }

        const timestamp = Date.parse(record.dateRecorded)
        if (!Number.isFinite(timestamp)) {
            return
        }

        const isoDay = new Date(timestamp).toISOString().slice(0, 10)
        const current = grouped.get(isoDay)

        grouped.set(isoDay, {
            total: (current?.total || 0) + record.soilPh,
            count: (current?.count || 0) + 1,
            timestamp,
            label: format(new Date(timestamp), 'MMM d'),
            fullDate: format(new Date(timestamp), 'MMMM d, yyyy'),
        })
    })

    return Array.from(grouped.values())
        .sort((left, right) => left.timestamp - right.timestamp)
        .map((point) => ({
            label: point.label,
            avgPh: Number((point.total / point.count).toFixed(2)),
            fullDate: point.fullDate,
            count: point.count,
        }))
        .slice(-10)
}

function buildSoilPhBandBreakdown(values: number[]): BreakdownPoint[] {
    const acidic = values.filter((value) => value < 5.5).length
    const balanced = values.filter((value) => value >= 5.5 && value <= 7).length
    const high = values.filter((value) => value > 7).length

    return [
        { label: 'Acidic', value: acidic },
        { label: 'Balanced', value: balanced },
        { label: 'High pH', value: high },
    ].filter((item) => item.value > 0)
}

function mapObservationToAnalyticsRecord(observation: FullObservation): AnalyticsRecord {
    return {
        id: String(observation.id || observation.client_uuid || getObservationDateValue(observation)),
        fieldName: (observation.field_name ?? '').trim() || 'Unknown field',
        sectionName: (observation.section_name ?? '').trim(),
        blockId: (observation.block_id ?? '').trim(),
        cropClass: normalizeObservationCropType(observation.crop_information?.crop_type),
        variety: (observation.crop_information?.variety ?? '').trim() || '-',
        dateRecorded: getObservationDateValue(observation),
        plantingDate: observation.crop_information?.planting_date || '',
        expectedHarvestDate: observation.crop_information?.expected_harvest_date || '',
        harvestDate: observation.harvest?.harvest_date || '',
        irrigationType: observation.irrigation_management?.irrigation_type || '',
        waterSource: observation.irrigation_management?.water_source || '',
        soilType: observation.soil_characteristics?.soil_type || '',
        soilPh: toFiniteObservationNumber(observation.soil_characteristics?.soil_ph),
        blockSize: null,
        gpsAccuracy: toFiniteObservationNumber(observation.gps_accuracy),
        yieldValue: toFiniteObservationNumber(observation.harvest?.yield),
        remarks: observation.crop_monitoring?.remarks || '',
    }
}

function mapProvidedRowToAnalyticsRecord(row: ProvidedRowCsv): AnalyticsRecord {
    const fieldName = row.field_name || row.selected_field || 'Unknown field'
    return {
        id: String(row.id || row.client_uuid || fieldName),
        fieldName,
        sectionName: row.section_name || '',
        blockId: row.block_id || '',
        cropClass: normalizeObservationCropType(row.crop_class),
        variety: row.variety || '-',
        dateRecorded: row.date_recorded || row.created_at || '',
        plantingDate: row.planting_date || '',
        expectedHarvestDate: row.expected_harvest_date || '',
        harvestDate: '',
        irrigationType: row.irrigation_type || '',
        waterSource: row.water_source || '',
        soilType: row.soil_type || '',
        soilPh: toFiniteObservationNumber(row.soil_ph),
        blockSize: toFiniteObservationNumber(row.block_size),
        gpsAccuracy: toFiniteObservationNumber(row.gps_accuracy),
        yieldValue: null,
        remarks: row.remarks || '',
    }
}

function buildAnalyticsFromRecords(records: AnalyticsRecord[]): ExcelAnalyticsData {
    const recordedDates = records.map((record) => record.dateRecorded).filter(Boolean)
    const uniqueFieldCount = new Set(
        records.map((record) =>
            getObservationFieldKey({
                field_name: record.fieldName,
                section_name: record.sectionName,
                block_id: record.blockId,
            })
        )
    ).size
    const varietiesTracked = new Set(
        records
            .map((record) => normalizeObservationText(record.variety))
            .filter(Boolean)
    ).size

    const cycleRows = records
        .map((record) => {
            const totalCycleDays = daysBetween(record.plantingDate, record.expectedHarvestDate)
            const elapsedCycleDays = daysBetween(record.plantingDate, record.dateRecorded)
            const remainingCycleDays = daysBetween(record.dateRecorded, record.expectedHarvestDate)
            const actualHarvestDays = daysBetween(record.plantingDate, record.harvestDate)

            return {
                totalCycleDays,
                elapsedCycleDays,
                remainingCycleDays,
                actualHarvestDays,
            }
        })
        .filter((record) => record.totalCycleDays > 0 || record.elapsedCycleDays > 0 || record.remainingCycleDays > 0 || record.actualHarvestDays > 0)

    const totalCycleDays = roundedAverage(cycleRows.map((record) => record.totalCycleDays).filter((value) => value > 0))
    const elapsedCycleDays = roundedAverage(cycleRows.map((record) => record.elapsedCycleDays).filter((value) => value > 0))
    const remainingCycleDays = roundedAverage(cycleRows.map((record) => record.remainingCycleDays).filter((value) => value > 0))
    const actualHarvestDays = roundedAverage(cycleRows.map((record) => record.actualHarvestDays).filter((value) => value > 0))

    const yieldValues = records
        .map((record) => record.yieldValue)
        .filter((value): value is number => value !== null && value > 0)

    const soilPhValues = records
        .map((record) => record.soilPh)
        .filter((value): value is number => value !== null)

    const blockSizeValues = records
        .map((record) => record.blockSize)
        .filter((value): value is number => value !== null && value > 0)

    const gpsAccuracyValues = records
        .map((record) => record.gpsAccuracy)
        .filter((value): value is number => value !== null && value > 0)

    const progressBreakdown = [
        { label: 'Elapsed', days: elapsedCycleDays },
        { label: 'Remaining', days: remainingCycleDays },
    ].filter((item) => item.days > 0)

    const cycleDurations: CycleDurationPoint[] = [
        { stage: 'Planting to Record', days: elapsedCycleDays },
        { stage: 'Record to Expected Harvest', days: remainingCycleDays },
        { stage: 'Full Crop Cycle', days: totalCycleDays },
    ]

    if (actualHarvestDays > 0) {
        cycleDurations.splice(2, 0, { stage: 'Planting to Actual Harvest', days: actualHarvestDays })
    }

    const milestones: MilestonePoint[] = [
        {
            label: 'Planting',
            isoDate: 'baseline',
            formattedDate: 'Baseline',
            daysFromPlanting: 0,
        },
        {
            label: 'Recorded',
            isoDate: 'average-recorded',
            formattedDate: `Average ${elapsedCycleDays} days`,
            daysFromPlanting: elapsedCycleDays,
        },
    ]

    if (actualHarvestDays > 0) {
        milestones.push({
            label: 'Actual Harvest',
            isoDate: 'average-actual-harvest',
            formattedDate: `Average ${actualHarvestDays} days`,
            daysFromPlanting: actualHarvestDays,
        })
    }

    milestones.push({
        label: 'Expected Harvest',
        isoDate: 'average-expected-harvest',
        formattedDate: `Average ${totalCycleDays} days`,
        daysFromPlanting: totalCycleDays,
    })

    const snapshotMetrics: SnapshotMetric[] = [
        {
            label: 'Average Soil pH',
            value: soilPhValues.length > 0 ? Number(average(soilPhValues).toFixed(2)) : 0,
            unit: '',
        },
        {
            label: 'Average Block Size',
            value: blockSizeValues.length > 0 ? Number(average(blockSizeValues).toFixed(2)) : 0,
            unit: 'ha',
        },
        {
            label: 'Average GPS Accuracy',
            value: gpsAccuracyValues.length > 0 ? Number(average(gpsAccuracyValues).toFixed(2)) : 0,
            unit: 'm',
        },
        {
            label: 'Average Yield',
            value: yieldValues.length > 0 ? Number(average(yieldValues).toFixed(2)) : 0,
            unit: 'kg/ha',
        },
    ].filter((item) => item.value > 0)

    const activityTimeline = buildActivityTimeline(records)
    const soilPhTimeline = buildSoilPhTimeline(records)
    const varietyBreakdown = buildBreakdown(
        records
            .map((record) => record.variety)
            .filter((value) => value && value !== '-'),
        { limit: 5 }
    )
    const fieldCoverage = buildBreakdown(records.map((record) => record.fieldName), { limit: 6 })
    const irrigationBreakdown = buildBreakdown(records.map((record) => record.irrigationType), {
        limit: 4,
        includeBlankAsFallback: true,
        fallbackLabel: 'Unspecified',
    })
    const soilTypeBreakdown = buildBreakdown(records.map((record) => record.soilType), {
        limit: 5,
        includeBlankAsFallback: true,
        fallbackLabel: 'Unspecified',
    })
    const soilPhBandBreakdown = buildSoilPhBandBreakdown(soilPhValues)

    return {
        overview: {
            totalRecords: records.length,
            uniqueFields: uniqueFieldCount,
            varietiesTracked,
            latestRecordDate: displayDate(recordedDates.sort((left, right) => (Date.parse(right) || 0) - (Date.parse(left) || 0))[0]),
        },
        summary: {
            cropClass: SUGARCANE_CROP_LABEL,
            leadingVariety: getMostCommonValue(records.map((record) => record.variety)),
            leadingIrrigation: getMostCommonValue(records.map((record) => record.irrigationType)),
            leadingSoilType: getMostCommonValue(records.map((record) => record.soilType)),
            totalCycleDays,
            elapsedCycleDays,
            remainingCycleDays,
            cycleProgressPercent: safePercent(elapsedCycleDays, totalCycleDays),
            averageYield: yieldValues.length > 0 ? Number(average(yieldValues).toFixed(2)) : null,
            averageSoilPh: soilPhValues.length > 0 ? Number(average(soilPhValues).toFixed(2)) : null,
            recordsWithYield: yieldValues.length,
        },
        notes: {
            latestRecordDate: displayDate(recordedDates.sort((left, right) => (Date.parse(right) || 0) - (Date.parse(left) || 0))[0]),
            dateRange: formatDateRange(recordedDates),
            dominantWaterSource: getMostCommonValue(records.map((record) => record.waterSource)),
            dominantField: getMostCommonValue(records.map((record) => record.fieldName)),
            remarksSummary: getMostCommonValue(records.map((record) => record.remarks), 'No remarks recorded'),
        },
        milestones,
        cycleDurations: cycleDurations.filter((item) => item.days > 0),
        progressBreakdown,
        snapshotMetrics,
        activityTimeline,
        varietyBreakdown,
        fieldCoverage,
        irrigationBreakdown,
        soilTypeBreakdown,
        soilPhBandBreakdown,
        soilPhTimeline,
    }
}

async function fetchExcelAnalytics(): Promise<ExcelAnalyticsData> {
    const liveObservations = await fetchObservations().catch((error) => {
        console.warn('Failed to load full observation analytics from Supabase, falling back to the bundled CSV.', error)
        return [] as FullObservation[]
    })

    const recordedSugarcaneObservations = dedupeObservationsForAnalytics(
        filterSugarcaneObservations(liveObservations)
    )

    if (recordedSugarcaneObservations.length > 0) {
        return buildAnalyticsFromRecords(recordedSugarcaneObservations.map(mapObservationToAnalyticsRecord))
    }

    const csvRows = await fetchCsvRows<ProvidedRowCsv>(PROVIDED_ROW_CSV)
    const fallbackRecords = csvRows
        .map(mapProvidedRowToAnalyticsRecord)
        .filter((row) => normalizeObservationText(row.cropClass) === normalizeObservationText(SUGARCANE_CROP_LABEL))

    if (fallbackRecords.length === 0) {
        throw new Error('No recorded sugarcane observation data was found in Supabase or the bundled CSV fallback.')
    }

    return buildAnalyticsFromRecords(fallbackRecords)
}

export function useExcelAnalytics() {
    const query = useQuery<ExcelAnalyticsData, Error>({
        queryKey: ['dashboard-sugarcane-analytics'],
        queryFn: fetchExcelAnalytics,
        staleTime: 10 * 1000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchInterval: 10 * 1000,
    })

    useEffect(() => {
        const handleLiveDataUpdate = () => {
            void query.refetch()
        }

        window.addEventListener(LIVE_DATA_UPDATED_EVENT, handleLiveDataUpdate)
        return () => window.removeEventListener(LIVE_DATA_UPDATED_EVENT, handleLiveDataUpdate)
    }, [query.refetch])

    return query
}
