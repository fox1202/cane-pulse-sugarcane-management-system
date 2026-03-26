import type { MobileObservationRecord } from '@/services/database.service'
import type { Field } from '@/types/database.types'

export type CollectionFilter = 'all' | 'recorded' | 'pending'
export type SprayFilter = 'all' | 'sprayed' | 'not-sprayed'

export interface TileSource {
    id: string
    url: string
    attribution: string
}

export interface BoundaryFeatureProperties {
    field_name?: string
    section_name?: string
    block_id?: string
    source_label?: string
    mobile_record_key?: string
}

export interface BoundaryFeature {
    type: 'Feature'
    geometry: any
    properties: BoundaryFeatureProperties
}

interface MobileBoundaryLookups {
    byComposite: Map<string, MobileObservationRecord>
    byName: Map<string, MobileObservationRecord[]>
    byBlock: Map<string, MobileObservationRecord[]>
    byCode: Map<string, MobileObservationRecord[]>
}

export const SATELLITE_TILE_SOURCES: readonly TileSource[] = [
    {
        id: 'esri-primary',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; Esri, DigitalGlobe, Earthstar Geographics',
    },
    {
        id: 'esri-backup',
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; Esri, DigitalGlobe, Earthstar Geographics',
    },
]

export const SATELLITE_HYBRID_LABELS_SOURCE: TileSource = {
    id: 'esri-hybrid-labels',
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
}

export const TERRAIN_TILE_SOURCE: TileSource = {
    id: 'osm-terrain',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
}

export function centroidFromGeometry(geometry: any): [number, number] | null {
    if (!geometry) return null

    if (geometry.type === 'Point' && Array.isArray(geometry.coordinates)) {
        const [longitude, latitude] = geometry.coordinates
        if (typeof latitude === 'number' && typeof longitude === 'number') {
            return [latitude, longitude]
        }
        return null
    }

    let ring: number[][] = []
    if (geometry.type === 'Polygon') {
        ring = geometry.coordinates?.[0] ?? []
    } else if (geometry.type === 'MultiPolygon') {
        ring = geometry.coordinates?.[0]?.[0] ?? []
    }

    if (!ring.length) return null

    const totals = ring.reduce(
        (acc, coord) => {
            const [longitude = 0, latitude = 0] = coord
            acc.latitude += latitude
            acc.longitude += longitude
            return acc
        },
        { latitude: 0, longitude: 0 }
    )

    return [totals.latitude / ring.length, totals.longitude / ring.length]
}

export function normalizeGeoJsonGeometry(value: any): any | null {
    if (!value) return null
    if (typeof value === 'string') {
        try {
            return normalizeGeoJsonGeometry(JSON.parse(value))
        } catch {
            return null
        }
    }
    if (value.type === 'Feature') return value.geometry ?? null
    if (value.type === 'FeatureCollection') return value.features?.[0]?.geometry ?? null
    if (value.geometry) return normalizeGeoJsonGeometry(value.geometry)
    if (value.geom) return normalizeGeoJsonGeometry(value.geom)
    if (value.spatial_data) return normalizeGeoJsonGeometry(value.spatial_data)
    if (value.polygon) return normalizeGeoJsonGeometry(value.polygon)
    return value
}

export function getRenderableBoundaryGeometry(value: any): any | null {
    const normalized = normalizeGeoJsonGeometry(value)
    if (normalized?.type === 'Polygon' || normalized?.type === 'MultiPolygon') {
        return normalized
    }
    return null
}

function isPointInsideRing(point: [number, number], ring: number[][]): boolean {
    const [x, y] = point
    let inside = false

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi = 0, yi = 0] = ring[i] ?? []
        const [xj = 0, yj = 0] = ring[j] ?? []

        const intersects = ((yi > y) !== (yj > y))
            && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi)

        if (intersects) inside = !inside
    }

    return inside
}

export function geometryContainsPoint(geometry: any, latitude?: number | null, longitude?: number | null): boolean {
    if (!hasCoordinates(latitude, longitude)) return false

    const normalized = normalizeGeoJsonGeometry(geometry)
    if (!normalized?.type) return false

    const point: [number, number] = [longitude as number, latitude as number]

    if (normalized.type === 'Polygon') {
        const [outerRing = [], ...holes] = normalized.coordinates ?? []
        if (!outerRing.length || !isPointInsideRing(point, outerRing)) return false
        return !holes.some((ring: number[][]) => isPointInsideRing(point, ring))
    }

    if (normalized.type === 'MultiPolygon') {
        return (normalized.coordinates ?? []).some((polygon: number[][][]) => {
            const [outerRing = [], ...holes] = polygon ?? []
            if (!outerRing.length || !isPointInsideRing(point, outerRing)) return false
            return !holes.some((ring: number[][]) => isPointInsideRing(point, ring))
        })
    }

    return false
}

export function normalizeFieldToken(value?: string | number | null): string {
    return String(value ?? '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, ' ')
}

export function extractFieldCodeToken(value?: string | number | null): string {
    const normalized = normalizeFieldToken(value).replace(/[^A-Z0-9]+/g, ' ')
    const matches = normalized.match(/[A-Z]+\d+[A-Z0-9]*/g)
    return matches?.[matches.length - 1] ?? ''
}

export function getBoundaryCodeTokens(fieldName?: string | number | null, blockId?: string | number | null): string[] {
    return Array.from(new Set([
        extractFieldCodeToken(fieldName),
        extractFieldCodeToken(blockId),
    ].filter(Boolean)))
}

export function buildFieldNameKey(fieldName?: string | null): string {
    return normalizeFieldToken(fieldName)
}

export function buildFieldIdentity(fieldName?: string | null, sectionName?: string | null, blockId?: string | null): string {
    return [
        normalizeFieldToken(sectionName),
        normalizeFieldToken(blockId),
        normalizeFieldToken(fieldName),
    ].join('::')
}

export function hasCollectedData(field?: Partial<Field> | null): boolean {
    if (!field) return false
    return Boolean(
        (field.observation_count ?? 0) > 0 ||
        field.latest_observation_date ||
        field.updated_at
    )
}

export function matchesCollectionFilter(
    field: Partial<Field> | null | undefined,
    filter: CollectionFilter
): boolean {
    if (filter === 'all') return true

    const collected = hasCollectedData(field)
    return filter === 'recorded' ? collected : !collected
}

export function hasCoordinates(latitude?: number | null, longitude?: number | null): boolean {
    return (
        typeof latitude === 'number' &&
        Number.isFinite(latitude) &&
        typeof longitude === 'number' &&
        Number.isFinite(longitude) &&
        !(latitude === 0 && longitude === 0)
    )
}

export function mergeFieldCollections(registryFields: Field[], observationFields: Field[]): Field[] {
    const registryByKey = new Map(
        registryFields.map((field) => [buildFieldIdentity(field.field_name, field.section_name, field.block_id), field])
    )
    const registryNameCounts = registryFields.reduce((counts, field) => {
        const key = buildFieldNameKey(field.field_name)
        if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
        return counts
    }, new Map<string, number>())

    const observationByKey = new Map(
        observationFields.map((field) => [buildFieldIdentity(field.field_name, field.section_name, field.block_id), field])
    )
    const observationNameGroups = observationFields.reduce((groups, field) => {
        const key = buildFieldNameKey(field.field_name)
        if (!key) return groups
        const current = groups.get(key) ?? []
        current.push(field)
        groups.set(key, current)
        return groups
    }, new Map<string, Field[]>())

    const matchedObservationKeys = new Set<string>()
    const matchedObservationNames = new Set<string>()

    const mergedRegistry = registryFields.map((field) => {
        const compositeKey = buildFieldIdentity(field.field_name, field.section_name, field.block_id)
        const nameKey = buildFieldNameKey(field.field_name)
        const exactObserved = observationByKey.get(compositeKey)
        const fallbackCandidates = observationNameGroups.get(nameKey) ?? []
        const canUseFieldNameFallback =
            !exactObserved &&
            nameKey &&
            fallbackCandidates.length === 1 &&
            (registryNameCounts.get(nameKey) ?? 0) === 1
        const observed = exactObserved ?? (canUseFieldNameFallback ? fallbackCandidates[0] : undefined)

        if (!observed) return field

        matchedObservationKeys.add(buildFieldIdentity(observed.field_name, observed.section_name, observed.block_id))
        if (nameKey) matchedObservationNames.add(nameKey)

        return {
            ...field,
            ...observed,
            field_name: field.field_name || observed.field_name,
            section_name: field.section_name || observed.section_name,
            block_id: field.block_id || observed.block_id,
            latitude: observed.latitude || field.latitude,
            longitude: observed.longitude || field.longitude,
            geom: field.geom ?? observed.geom,
        }
    })

    const observationOnly = observationFields.filter((field) => {
        const compositeKey = buildFieldIdentity(field.field_name, field.section_name, field.block_id)
        const nameKey = buildFieldNameKey(field.field_name)

        if (!registryByKey.has(compositeKey)) {
            return !(nameKey && matchedObservationNames.has(nameKey))
        }

        return !matchedObservationKeys.has(compositeKey)
    })

    return [...mergedRegistry, ...observationOnly]
}

export function formatDisplayDate(value?: string | null, withTime = false): string | null {
    if (!value) return null

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value

    return withTime
        ? parsed.toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
        : parsed.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
}

export function getTimeAgoLabel(value?: string | null): string | null {
    if (!value) return null

    const timestamp = new Date(value).getTime()
    if (Number.isNaN(timestamp)) return null

    const diff = Date.now() - timestamp
    const minutes = Math.max(Math.floor(diff / 60000), 0)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return `${minutes}m ago`
}

export function getMobileRecordDate(record: MobileObservationRecord): string {
    return record.monitoring_sheet?.date_recorded || record.date_recorded || record.entry_form?.date_recorded || record.created_at
}

export function getMobileRecordBoundaryProps(record: MobileObservationRecord): {
    field_name: string
    section_name: string
    block_id: string
} {
    const currentSheet = record.monitoring_sheet
    const selectedField = String(record.entry_form?.selected_field ?? '').trim()
    const rawFieldName = String(currentSheet?.field_name ?? currentSheet?.field_id ?? record.field_name ?? '').trim()
    const preferredFieldName = record.field_registry?.field_name
        || currentSheet?.field_name
        || currentSheet?.field_id
        || selectedField
        || rawFieldName
        || ''
    const fallbackBlockId = extractFieldCodeToken(record.field_registry?.block_id)
        || extractFieldCodeToken(currentSheet?.block_id)
        || extractFieldCodeToken(record.block_id)
        || extractFieldCodeToken(selectedField)
        || extractFieldCodeToken(rawFieldName)
        || ''

    return {
        field_name: preferredFieldName,
        section_name: record.field_registry?.section_name || currentSheet?.section_name || record.section_name || '',
        block_id: record.field_registry?.block_id || currentSheet?.block_id || record.block_id || fallbackBlockId,
    }
}

export function getMobileRecordBoundaryIdentity(record: MobileObservationRecord): string {
    const props = getMobileRecordBoundaryProps(record)
    return buildFieldIdentity(props.field_name, props.section_name, props.block_id)
}

export function getMobileRecordBoundaryKey(record: MobileObservationRecord): string {
    const identity = getMobileRecordBoundaryIdentity(record)
    if (identity.replace(/:/g, '')) return `identity:${identity}`

    const nameKey = buildFieldNameKey(getMobileRecordBoundaryProps(record).field_name)
    if (nameKey) return `name:${nameKey}`

    const blockKey = normalizeFieldToken(getMobileRecordBoundaryProps(record).block_id)
    if (blockKey) return `block:${blockKey}`

    return `record:${record.source_table}-${record.source_row_id ?? record.id}`
}

export function getMobileSpatialGeometry(record: MobileObservationRecord): any | null {
    return getRenderableBoundaryGeometry(
        record.monitoring_sheet?.geom_polygon
        ?? record.entry_form?.geom_polygon
        ?? record.entry_form?.spatial_data
        ?? record.field_registry?.geom
    )
}

function roundCoordinate(value: number): number {
    return Number(value.toFixed(6))
}

function getCanonicalRingSignature(ring: number[][]): string {
    const normalizedPoints = ring
        .filter((point) => Array.isArray(point) && point.length >= 2)
        .map(([longitude, latitude]) => `${roundCoordinate(longitude)}:${roundCoordinate(latitude)}`)

    const openRing = normalizedPoints.length > 1 && normalizedPoints[0] === normalizedPoints[normalizedPoints.length - 1]
        ? normalizedPoints.slice(0, -1)
        : normalizedPoints

    if (openRing.length === 0) return ''

    const buildRotations = (points: string[]) =>
        points.map((_, index) => [...points.slice(index), ...points.slice(0, index)].join('|'))

    const forward = buildRotations(openRing)
    const reversed = buildRotations([...openRing].reverse())

    return [...forward, ...reversed].sort()[0] ?? ''
}

function getGeometrySignature(value: any): string | null {
    const geometry = normalizeGeoJsonGeometry(value)
    if (!geometry?.type) return null

    if (geometry.type === 'Point' && Array.isArray(geometry.coordinates)) {
        const [longitude = 0, latitude = 0] = geometry.coordinates
        return `point:${roundCoordinate(longitude)}:${roundCoordinate(latitude)}`
    }

    if (geometry.type === 'Polygon') {
        const rings = (geometry.coordinates ?? [])
            .map((ring: number[][]) => getCanonicalRingSignature(ring))
            .filter(Boolean)
            .sort()

        return rings.length > 0 ? `polygon:${rings.join('||')}` : null
    }

    if (geometry.type === 'MultiPolygon') {
        const polygons = (geometry.coordinates ?? [])
            .map((polygon: number[][][]) =>
                polygon
                    .map((ring: number[][]) => getCanonicalRingSignature(ring))
                    .filter(Boolean)
                    .sort()
                    .join('|||')
            )
            .filter(Boolean)
            .sort()

        return polygons.length > 0 ? `multipolygon:${polygons.join('||||')}` : null
    }

    return JSON.stringify(geometry)
}

export function hasDistinctRecordedMobilePolygon(record: MobileObservationRecord): boolean {
    const capturedGeometry = getRenderableBoundaryGeometry(
        record.monitoring_sheet?.geom_polygon
        ?? record.entry_form?.geom_polygon
        ?? record.entry_form?.spatial_data
    )
    if (!capturedGeometry) return false

    const registryGeometry = getRenderableBoundaryGeometry(record.field_registry?.geom)
    if (!registryGeometry) return true

    return getGeometrySignature(capturedGeometry) !== getGeometrySignature(registryGeometry)
}

export function dedupeMobileRecordsByBoundary(
    records: MobileObservationRecord[],
    options?: { requireRenderableGeometry?: boolean }
): MobileObservationRecord[] {
    const requireRenderableGeometry = options?.requireRenderableGeometry ?? false
    const bestByKey = new Map<string, MobileObservationRecord>()

    const shouldReplace = (
        existing: MobileObservationRecord,
        candidate: MobileObservationRecord
    ) => {
        const existingHasGeometry = Boolean(getMobileSpatialGeometry(existing))
        const candidateHasGeometry = Boolean(getMobileSpatialGeometry(candidate))

        if (candidateHasGeometry && !existingHasGeometry) return true
        if (!candidateHasGeometry && existingHasGeometry) return false

        return new Date(getMobileRecordDate(candidate)).getTime() > new Date(getMobileRecordDate(existing)).getTime()
    }

    records.forEach((record) => {
        if (requireRenderableGeometry && !getMobileSpatialGeometry(record)) return

        const key = getMobileRecordBoundaryKey(record)
        const existing = bestByKey.get(key)

        if (!existing || shouldReplace(existing, record)) {
            bestByKey.set(key, record)
        }
    })

    return Array.from(bestByKey.values())
}

export function getMobileCropType(record: MobileObservationRecord): string {
    const rawValue = String(
        record.monitoring_sheet?.crop_type
        || record.monitoring_sheet?.crop_class
        || record.crop_information?.crop_type
        || record.entry_form?.crop_type
        || record.entry_form?.crop_class
        || ''
    ).trim()

    if (!rawValue) {
        return 'Sugarcane'
    }

    if (
        /sugar\s*cane/i.test(rawValue) ||
        /\bratoon\b/i.test(rawValue) ||
        /plant\s*cane/i.test(rawValue)
    ) {
        return 'Sugarcane'
    }

    return rawValue
}

export function getMobileVariety(record: MobileObservationRecord): string {
    return record.monitoring_sheet?.variety || record.crop_information?.variety || record.entry_form?.variety || ''
}

export function getMobileIrrigation(record: MobileObservationRecord): string {
    return record.monitoring_sheet?.irrigation_type || record.entry_form?.irrigation_type || record.irrigation_management?.irrigation_type || ''
}

export function getMobileWaterSource(record: MobileObservationRecord): string {
    return record.monitoring_sheet?.water_source || record.entry_form?.water_source || record.irrigation_management?.water_source || ''
}

export function getMobileSoilType(record: MobileObservationRecord): string {
    return record.monitoring_sheet?.soil_type || record.entry_form?.soil_type || record.soil_characteristics?.soil_type || ''
}

export function getMobileSoilPh(record: MobileObservationRecord): number | null {
    const value = record.monitoring_sheet?.soil_ph ?? record.entry_form?.soil_ph ?? record.soil_characteristics?.soil_ph
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

export function getMobilePlantingDate(record: MobileObservationRecord): string {
    return record.monitoring_sheet?.planting_date || record.entry_form?.planting_date || record.crop_information?.planting_date || ''
}

export function getMobileExpectedHarvestDate(record: MobileObservationRecord): string {
    return record.monitoring_sheet?.expected_harvest_date || record.entry_form?.expected_harvest_date || record.crop_information?.expected_harvest_date || ''
}

export function getMobileRemarks(record: MobileObservationRecord): string {
    return record.monitoring_sheet?.field_remarks || record.monitoring_sheet?.remarks || record.entry_form?.remarks || record.crop_monitoring?.remarks || ''
}

export function getMobileSourceLabel(record: MobileObservationRecord): string {
    if (record.source_table === 'sugarcane_monitoring') {
        return 'Monitoring record'
    }

    return record.source_table.replace(/_/g, ' ')
}

export function getMobileMarkerColor(_record: MobileObservationRecord): string {
    // observation_entry_form table has been disconnected - all records use the same color
    return '#ff7849'
}

export function getMostFrequentValue(values: string[]): string | null {
    if (!values.length) return null

    const counts = values.reduce((map, value) => {
        const key = value.trim()
        if (key) map.set(key, (map.get(key) ?? 0) + 1)
        return map
    }, new Map<string, number>())

    let best: string | null = null
    let max = 0

    counts.forEach((count, value) => {
        if (count > max) {
            best = value
            max = count
        }
    })

    return best
}

export function getMostRecentItem<T>(
    items: T[],
    getDate: (item: T) => string | null | undefined
): T | null {
    const withDates = items.filter((item) => getDate(item))
    if (!withDates.length) return null

    return withDates.reduce((best, item) => {
        const bestDate = new Date(getDate(best) || 0).getTime()
        const itemDate = new Date(getDate(item) || 0).getTime()
        return itemDate > bestDate ? item : best
    })
}

export function buildFieldLookupByIdentity(fields: Field[]): Map<string, Field> {
    const lookup = new Map<string, Field>()

    fields.forEach((field) => {
        const compositeKey = buildFieldIdentity(field.field_name, field.section_name, field.block_id)
        const nameOnlyKey = buildFieldNameKey(field.field_name)

        const existingComposite = lookup.get(compositeKey)
        if (!existingComposite || (hasCollectedData(field) && !hasCollectedData(existingComposite))) {
            lookup.set(compositeKey, field)
        }

        const existingNameOnly = lookup.get(nameOnlyKey)
        if (!existingNameOnly || (hasCollectedData(field) && !hasCollectedData(existingNameOnly))) {
            lookup.set(nameOnlyKey, field)
        }
    })

    return lookup
}

function buildMobileBoundaryLookups(records: MobileObservationRecord[]): MobileBoundaryLookups {
    const byComposite = new Map<string, MobileObservationRecord>()
    const byName = new Map<string, MobileObservationRecord[]>()
    const byBlock = new Map<string, MobileObservationRecord[]>()
    const byCode = new Map<string, MobileObservationRecord[]>()

    const keepMostRecent = (
        existing: MobileObservationRecord | undefined,
        candidate: MobileObservationRecord
    ) => {
        if (!existing) return candidate

        return new Date(getMobileRecordDate(candidate)).getTime() > new Date(getMobileRecordDate(existing)).getTime()
            ? candidate
            : existing
    }

    records.forEach((record) => {
        const boundaryProps = getMobileRecordBoundaryProps(record)
        const compositeKey = buildFieldIdentity(boundaryProps.field_name, boundaryProps.section_name, boundaryProps.block_id)
        const nameKey = buildFieldNameKey(boundaryProps.field_name)
        const blockKey = normalizeFieldToken(boundaryProps.block_id)

        if (compositeKey.replace(/:/g, '')) {
            byComposite.set(compositeKey, keepMostRecent(byComposite.get(compositeKey), record))
        }

        if (nameKey) {
            const group = byName.get(nameKey) ?? []
            group.push(record)
            byName.set(nameKey, group)
        }

        if (blockKey) {
            const group = byBlock.get(blockKey) ?? []
            group.push(record)
            byBlock.set(blockKey, group)
        }

        getBoundaryCodeTokens(boundaryProps.field_name, boundaryProps.block_id).forEach((codeKey) => {
            const group = byCode.get(codeKey) ?? []
            group.push(record)
            byCode.set(codeKey, group)
        })
    })

    return { byComposite, byName, byBlock, byCode }
}

export function linkFieldsWithMobileRecords(
    fields: Field[],
    mobileRecords: MobileObservationRecord[]
): Field[] {
    const lookups = buildMobileBoundaryLookups(mobileRecords)

    const pickLinkedMobileRecord = (field: Field): MobileObservationRecord | null => {
        const compositeKey = buildFieldIdentity(field.field_name, field.section_name, field.block_id)
        const exactMatch = lookups.byComposite.get(compositeKey)
        if (exactMatch) return exactMatch

        const nameKey = buildFieldNameKey(field.field_name)
        const blockKey = normalizeFieldToken(field.block_id)
        const nameMatches = lookups.byName.get(nameKey) ?? []
        const narrowedNameMatches = blockKey
            ? nameMatches.filter((record) => {
                const recordBlockKey = normalizeFieldToken(record.block_id)
                return !recordBlockKey || recordBlockKey === blockKey
            })
            : nameMatches

        if (narrowedNameMatches.length === 1) return narrowedNameMatches[0]
        if (nameMatches.length === 1) return nameMatches[0]

        const blockMatches = lookups.byBlock.get(blockKey) ?? []
        if (blockMatches.length === 1) return blockMatches[0]

        const codeMatches = getBoundaryCodeTokens(field.field_name, field.block_id)
            .flatMap((code) => lookups.byCode.get(code) ?? [])
        const uniqueCodeMatches = Array.from(new Map(
            codeMatches.map((record) => [`${record.source_table}:${record.source_row_id ?? record.id}`, record])
        ).values())

        if (uniqueCodeMatches.length === 1) return uniqueCodeMatches[0]

        const geometry = normalizeGeoJsonGeometry(field.geom)
        if (!geometry) return null

        const geometryMatches = mobileRecords.filter((record) =>
            geometryContainsPoint(geometry, record.latitude, record.longitude)
        )

        return getMostRecentItem(geometryMatches, getMobileRecordDate)
    }

    return fields.map((field) => {
        const linkedRecord = pickLinkedMobileRecord(field)
        if (!linkedRecord) return field

        const linkedDate = getMobileRecordDate(linkedRecord)

        return {
            ...field,
            field_name: field.field_name || linkedRecord.field_name,
            section_name: field.section_name || linkedRecord.section_name,
            block_id: field.block_id || linkedRecord.block_id,
            latitude: hasCoordinates(field.latitude, field.longitude) ? field.latitude : linkedRecord.latitude,
            longitude: hasCoordinates(field.latitude, field.longitude) ? field.longitude : linkedRecord.longitude,
            crop_type: field.crop_type || getMobileCropType(linkedRecord) || undefined,
            latest_variety: field.latest_variety || getMobileVariety(linkedRecord) || undefined,
            latest_stage: field.latest_stage || linkedRecord.crop_information?.crop_stage || undefined,
            latest_irrigation_type: field.latest_irrigation_type || getMobileIrrigation(linkedRecord) || undefined,
            latest_remarks: field.latest_remarks || getMobileRemarks(linkedRecord) || undefined,
            observation_count: Math.max(field.observation_count ?? 0, 1),
            latest_observation_date: field.latest_observation_date || linkedDate,
            updated_at: field.updated_at || linkedDate,
        }
    })
}

export function createSyntheticFieldFromMobileRecord(
    record: MobileObservationRecord,
    fallback?: Partial<Field>
): Field {
    const boundaryProps = getMobileRecordBoundaryProps(record)

    return {
        field_name: fallback?.field_name || boundaryProps.field_name || 'RECORDED AREA',
        section_name: fallback?.section_name || boundaryProps.section_name || '',
        block_id: fallback?.block_id || boundaryProps.block_id || '',
        latitude: fallback?.latitude ?? record.latitude,
        longitude: fallback?.longitude ?? record.longitude,
        crop_type: fallback?.crop_type || getMobileCropType(record) || undefined,
        latest_variety: fallback?.latest_variety || getMobileVariety(record) || undefined,
        latest_stage: fallback?.latest_stage || record.crop_information?.crop_stage || undefined,
        latest_vigor: fallback?.latest_vigor,
        latest_canopy_cover: fallback?.latest_canopy_cover,
        latest_stress: fallback?.latest_stress,
        latest_moisture: fallback?.latest_moisture,
        latest_irrigation_type: fallback?.latest_irrigation_type || getMobileIrrigation(record) || undefined,
        latest_pest_control: fallback?.latest_pest_control,
        latest_disease_control: fallback?.latest_disease_control,
        latest_weed_control: fallback?.latest_weed_control,
        latest_remarks: fallback?.latest_remarks || getMobileRemarks(record) || undefined,
        latest_image: fallback?.latest_image,
        observation_count: Math.max(fallback?.observation_count ?? 0, 1),
        is_sprayed: fallback?.is_sprayed,
        last_spray_date: fallback?.last_spray_date,
        latest_observation_date: fallback?.latest_observation_date || getMobileRecordDate(record),
        updated_at: fallback?.updated_at || getMobileRecordDate(record),
        geom: fallback?.geom,
    }
}

export function getMobileFieldByGeometry(
    geometry: any,
    mobileRecords: MobileObservationRecord[],
    fallback?: Partial<Field>
): Field | null {
    const normalizedGeometry = normalizeGeoJsonGeometry(geometry)
    if (!normalizedGeometry) return null

    const geometryMatches = mobileRecords.filter((record) =>
        geometryContainsPoint(normalizedGeometry, record.latitude, record.longitude)
    )

    const latestRecord = getMostRecentItem(geometryMatches, getMobileRecordDate)
    return latestRecord ? createSyntheticFieldFromMobileRecord(latestRecord, fallback) : null
}

export function getMobileRecordForBoundary(
    props: {
        field_name?: string | null
        section_name?: string | null
        block_id?: string | null
    },
    mobileRecords: MobileObservationRecord[]
): MobileObservationRecord | null {
    const compositeKey = buildFieldIdentity(props.field_name, props.section_name, props.block_id)
    const nameKey = buildFieldNameKey(props.field_name)
    const blockKey = normalizeFieldToken(props.block_id)

    const directMatches = mobileRecords.filter((record) => {
        const boundaryProps = getMobileRecordBoundaryProps(record)
        const recordCompositeKey = buildFieldIdentity(boundaryProps.field_name, boundaryProps.section_name, boundaryProps.block_id)
        if (compositeKey.replace(/:/g, '') && recordCompositeKey === compositeKey) {
            return true
        }

        const recordNameKey = buildFieldNameKey(boundaryProps.field_name)
        const recordBlockKey = normalizeFieldToken(boundaryProps.block_id)

        if (nameKey && recordNameKey === nameKey) {
            return !blockKey || !recordBlockKey || recordBlockKey === blockKey
        }

        return Boolean(blockKey) && recordBlockKey === blockKey
    })

    if (directMatches.length > 0) {
        return getMostRecentItem(directMatches, getMobileRecordDate)
    }

    const boundaryCodes = getBoundaryCodeTokens(props.field_name, props.block_id)
    if (boundaryCodes.length > 0) {
        const codeMatches = mobileRecords.filter((record) => {
            const boundaryProps = getMobileRecordBoundaryProps(record)
            return getBoundaryCodeTokens(boundaryProps.field_name, boundaryProps.block_id)
                .some((code) => boundaryCodes.includes(code))
        })

        const uniqueIdentities = new Set(
            codeMatches
                .map((record) => getMobileRecordBoundaryIdentity(record))
                .filter((identity) => identity.replace(/:/g, ''))
        )

        if (codeMatches.length === 1 || uniqueIdentities.size === 1) {
            return getMostRecentItem(codeMatches, getMobileRecordDate)
        }
    }

    return null
}

export function findMobileRecordForFeature(
    feature: any,
    mobileRecords: MobileObservationRecord[]
): MobileObservationRecord | null {
    const props = feature?.properties ?? {}

    return getMobileRecordForBoundary(
        {
            field_name: props.field_name,
            section_name: props.section_name,
            block_id: props.block_id,
        },
        mobileRecords
    ) ?? getMostRecentItem(
        mobileRecords.filter((record) =>
            geometryContainsPoint(feature?.geometry, record.latitude, record.longitude)
        ),
        getMobileRecordDate
    )
}

export function findMobileRecordForBlock(
    block: any,
    mobileRecords: MobileObservationRecord[]
): MobileObservationRecord | null {
    return getMobileRecordForBoundary(
        {
            field_name: block?.name,
            block_id: block?.block_id,
        },
        mobileRecords
    ) ?? getMostRecentItem(
        mobileRecords.filter((record) =>
            geometryContainsPoint(block?.geom, record.latitude, record.longitude)
        ),
        getMobileRecordDate
    )
}

export function findFieldForFeature(
    feature: any,
    linkedFields: Field[],
    fieldLookup: Map<string, Field>,
    mobileRecords: MobileObservationRecord[]
): Field | null {
    const props = feature?.properties ?? {}
    const featureCodes = getBoundaryCodeTokens(props.field_name, props.block_id)
    const codeMatch = featureCodes.length > 0
        ? (() => {
            const matches = linkedFields.filter((field) =>
                getBoundaryCodeTokens(field.field_name, field.block_id).some((code) => featureCodes.includes(code))
            )
            return matches.length === 1 ? matches[0] : null
        })()
        : null

    return fieldLookup.get(buildFieldIdentity(props.field_name, props.section_name, props.block_id))
        ?? fieldLookup.get(buildFieldNameKey(props.field_name))
        ?? (props.block_id
            ? linkedFields.find((field) => normalizeFieldToken(field.block_id) === normalizeFieldToken(props.block_id)) ?? null
            : null)
        ?? codeMatch
        ?? (() => {
            const matchedRecord = getMobileRecordForBoundary(
                {
                    field_name: props.field_name,
                    section_name: props.section_name,
                    block_id: props.block_id,
                },
                mobileRecords
            )

            return matchedRecord
                ? createSyntheticFieldFromMobileRecord(matchedRecord, {
                    field_name: props.field_name,
                    section_name: props.section_name,
                    block_id: props.block_id,
                })
                : null
        })()
        ?? getMobileFieldByGeometry(feature?.geometry, mobileRecords, {
            field_name: props.field_name,
            section_name: props.section_name,
            block_id: props.block_id,
        })
        ?? null
}

export function findFieldForBlock(
    block: any,
    linkedFields: Field[],
    fieldLookup: Map<string, Field>,
    mobileRecords: MobileObservationRecord[]
): Field | null {
    const blockCodes = getBoundaryCodeTokens(block?.name, block?.block_id)
    const codeMatch = blockCodes.length > 0
        ? (() => {
            const matches = linkedFields.filter((field) =>
                getBoundaryCodeTokens(field.field_name, field.block_id).some((code) => blockCodes.includes(code))
            )
            return matches.length === 1 ? matches[0] : null
        })()
        : null

    return fieldLookup.get(buildFieldIdentity(block?.name, undefined, block?.block_id))
        ?? fieldLookup.get(buildFieldNameKey(block?.name))
        ?? linkedFields.find((field) => normalizeFieldToken(field.block_id) === normalizeFieldToken(block?.block_id))
        ?? codeMatch
        ?? (() => {
            const matchedRecord = getMobileRecordForBoundary(
                {
                    field_name: block?.name,
                    block_id: block?.block_id,
                },
                mobileRecords
            )

            return matchedRecord
                ? createSyntheticFieldFromMobileRecord(matchedRecord, {
                    field_name: block?.name,
                    block_id: block?.block_id,
                })
                : null
        })()
        ?? getMobileFieldByGeometry(block?.geom, mobileRecords, {
            field_name: block?.name,
            block_id: block?.block_id,
        })
        ?? null
}

export function buildDatabaseFieldBoundaries(
    linkedFields: Field[],
    selectedCropType: string,
    sprayFilter: SprayFilter,
    collectionFilter: CollectionFilter
): BoundaryFeature[] {
    return linkedFields
        .filter((field) => {
            if (!getRenderableBoundaryGeometry(field.geom)) return false
            if (selectedCropType !== 'all' && field.crop_type !== selectedCropType) return false
            if (sprayFilter === 'sprayed' && !field.is_sprayed) return false
            if (sprayFilter === 'not-sprayed' && field.is_sprayed) return false
            return matchesCollectionFilter(field, collectionFilter)
        })
        .map((field) => ({
            type: 'Feature',
            geometry: getRenderableBoundaryGeometry(field.geom),
            properties: {
                field_name: field.field_name,
                section_name: field.section_name,
                block_id: field.block_id,
                source_label: 'database field boundary',
            },
        }))
}
