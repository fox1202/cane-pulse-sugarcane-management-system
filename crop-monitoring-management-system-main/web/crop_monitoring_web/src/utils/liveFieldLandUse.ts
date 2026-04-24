import type { PredefinedField } from '@/services/database.service'
import {
    getAreaCropGroup,
    normalizeFallowCropClassLabel,
    type AreaCropGroup,
} from '@/utils/cropGrouping'

export interface LiveFieldLandUseItem {
    label: AreaCropGroup
    areaHa: number
    fieldCount: number
}

export interface LiveFieldLandUseSummary {
    totalMeasuredArea: number
    items: LiveFieldLandUseItem[]
}

const LAND_USE_ORDER: AreaCropGroup[] = [
    'Sugarcane',
    'Break Crop',
    'Fallow Period',
    'Unspecified',
]

function buildPredefinedFieldIdentity(field: Pick<PredefinedField, 'field_name' | 'section_name' | 'block_id'>): string {
    return [
        field.section_name,
        field.block_id,
        field.field_name,
    ]
        .map((value) => String(value ?? '').trim().toLowerCase())
        .join('|')
}

function getOptionalTimestamp(value?: string | null): number {
    const parsed = Date.parse(String(value ?? ''))
    return Number.isFinite(parsed) ? parsed : 0
}

function isNewerPredefinedFieldRecord(candidate: PredefinedField, current: PredefinedField): boolean {
    const candidateRecorded = getOptionalTimestamp(candidate.date_recorded)
    const currentRecorded = getOptionalTimestamp(current.date_recorded)

    if (candidateRecorded !== currentRecorded) {
        return candidateRecorded > currentRecorded
    }

    const candidateUpdated = getOptionalTimestamp(candidate.updated_at)
    const currentUpdated = getOptionalTimestamp(current.updated_at)

    if (candidateUpdated !== currentUpdated) {
        return candidateUpdated > currentUpdated
    }

    const candidateCreated = getOptionalTimestamp(candidate.created_at)
    const currentCreated = getOptionalTimestamp(current.created_at)

    if (candidateCreated !== currentCreated) {
        return candidateCreated > currentCreated
    }

    return String(candidate.id ?? '') > String(current.id ?? '')
}

function normalizeGeometry(value: any): any | null {
    if (!value) return null

    if (typeof value === 'string') {
        try {
            return normalizeGeometry(JSON.parse(value))
        } catch {
            return null
        }
    }

    if (value.type === 'Feature') return normalizeGeometry(value.geometry)
    if (value.type === 'FeatureCollection') return normalizeGeometry(value.features?.[0]?.geometry)
    if (value.geometry) return normalizeGeometry(value.geometry)
    if (value.geom) return normalizeGeometry(value.geom)
    return value
}

function getMetersPerDegreeLatitude(latitude: number): number {
    const radians = latitude * (Math.PI / 180)
    return 111132.92 - 559.82 * Math.cos(2 * radians) + 1.175 * Math.cos(4 * radians)
}

function getMetersPerDegreeLongitude(latitude: number): number {
    const radians = latitude * (Math.PI / 180)
    return 111412.84 * Math.cos(radians) - 93.5 * Math.cos(3 * radians)
}

function getRingAreaSqMeters(ring: number[][]): number {
    if (!Array.isArray(ring) || ring.length < 3) {
        return 0
    }

    const latitudes = ring
        .map((point) => Number(point?.[1]))
        .filter((value) => Number.isFinite(value))

    if (latitudes.length === 0) {
        return 0
    }

    const meanLatitude = latitudes.reduce((sum, value) => sum + value, 0) / latitudes.length
    const metersPerLat = getMetersPerDegreeLatitude(meanLatitude)
    const metersPerLon = getMetersPerDegreeLongitude(meanLatitude)

    let area = 0

    for (let index = 0; index < ring.length; index += 1) {
        const current = ring[index] ?? []
        const next = ring[(index + 1) % ring.length] ?? []
        const currentX = Number(current[0]) * metersPerLon
        const currentY = Number(current[1]) * metersPerLat
        const nextX = Number(next[0]) * metersPerLon
        const nextY = Number(next[1]) * metersPerLat

        if (![currentX, currentY, nextX, nextY].every(Number.isFinite)) {
            continue
        }

        area += currentX * nextY - nextX * currentY
    }

    return Math.abs(area) / 2
}

function getPolygonAreaSqMeters(rings: number[][][]): number {
    if (!Array.isArray(rings) || rings.length === 0) {
        return 0
    }

    const [outerRing = [], ...holes] = rings
    const outerArea = getRingAreaSqMeters(outerRing)
    const holeArea = holes.reduce((sum, ring) => sum + getRingAreaSqMeters(ring), 0)
    return Math.max(outerArea - holeArea, 0)
}

function getGeometryAreaHa(geometry: any): number | null {
    const normalized = normalizeGeometry(geometry)
    if (!normalized?.type) {
        return null
    }

    let areaSqMeters = 0

    if (normalized.type === 'Polygon') {
        areaSqMeters = getPolygonAreaSqMeters(normalized.coordinates ?? [])
    } else if (normalized.type === 'MultiPolygon') {
        areaSqMeters = (normalized.coordinates ?? [])
            .reduce((sum: number, polygon: number[][][]) => sum + getPolygonAreaSqMeters(polygon), 0)
    }

    if (!Number.isFinite(areaSqMeters) || areaSqMeters <= 0) {
        return null
    }

    return Number((areaSqMeters / 10_000).toFixed(2))
}

function resolvePredefinedFieldAreaHa(field: PredefinedField): number | null {
    if (typeof field.area === 'number' && Number.isFinite(field.area) && field.area > 0) {
        return Number(field.area.toFixed(2))
    }

    const geometryArea = getGeometryAreaHa(field.geom)
    if (geometryArea !== null && geometryArea > 0) {
        return geometryArea
    }

    return null
}

function resolvePredefinedFieldLandUseLabel(field: Pick<PredefinedField, 'crop_class' | 'crop_type'>): AreaCropGroup {
    const cropClass = normalizeFallowCropClassLabel(field.crop_class)
    const cropType = String(field.crop_type ?? '').trim()
    const signal = [cropClass, cropType].filter(Boolean).join(' ').trim()

    return getAreaCropGroup(signal, { treatNoneAsFallow: true })
}

export function summarizeLiveFieldLandUse(fields: PredefinedField[]): LiveFieldLandUseSummary {
    const latestByField = new Map<string, PredefinedField>()

    fields.forEach((field) => {
        const identity = buildPredefinedFieldIdentity(field)
        if (!identity.replace(/\|/g, '')) {
            return
        }

        const existing = latestByField.get(identity)
        if (!existing || isNewerPredefinedFieldRecord(field, existing)) {
            latestByField.set(identity, field)
        }
    })

    const grouped = new Map<AreaCropGroup, { areaHa: number; fieldCount: number }>()
    let totalMeasuredArea = 0

    latestByField.forEach((field) => {
        const areaHa = resolvePredefinedFieldAreaHa(field)
        if (areaHa === null || areaHa <= 0) {
            return
        }

        const label = resolvePredefinedFieldLandUseLabel(field)
        const existing = grouped.get(label) ?? { areaHa: 0, fieldCount: 0 }
        existing.areaHa += areaHa
        existing.fieldCount += 1
        grouped.set(label, existing)
        totalMeasuredArea += areaHa
    })

    return {
        totalMeasuredArea: Number(totalMeasuredArea.toFixed(2)),
        items: LAND_USE_ORDER.map((label) => {
            const entry = grouped.get(label) ?? { areaHa: 0, fieldCount: 0 }
            return {
                label,
                areaHa: Number(entry.areaHa.toFixed(2)),
                fieldCount: entry.fieldCount,
            }
        }),
    }
}
