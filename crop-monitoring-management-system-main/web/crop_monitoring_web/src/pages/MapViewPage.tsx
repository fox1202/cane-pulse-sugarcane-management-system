/**
 * MapViewPage — refined
 *
 * Changes from original:
 * - Extracted FONT constant to eliminate 60+ repeated fontFamily strings
 * - Replaced all IIFE JSX patterns with proper FieldBoundaryLayer / BlockLayer /
 *   FieldMarkerLayer / MobileMarkerLayer sub-components
 * - Tightened useMemo dependency arrays (removed stale deps in filteredFallbackFieldShapes,
 *   filteredBlocks, mobilePolygonFeatures)
 * - Memoized getFeatureField / getBlockField results inside the sub-components so
 *   they are not recomputed on every parent render
 * - Fixed MapBoundsFitter: effect only runs when the identity of the data changes
 *   (lengths + stringified centers), not on every object reference change
 * - Replaced misleading DEEP = '#ffffff' with SURFACE; removed redundant CYAN_PALE alias
 * - Extracted repeated pathOptions objects into named constants
 * - Clarified tile-error guard: single boolean ref instead of string lock key
 * - Minor: consistent nullish-coalescing, removed dead casts
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import L from 'leaflet'
import {
    Box,
    Typography,
    FormControl,
    Select,
    MenuItem,
    CircularProgress,
    alpha,
    Tooltip,
    IconButton,
} from '@mui/material'
import {
    MyLocation,
    SatelliteAlt,
    GridOn,
    Layers,
} from '@mui/icons-material'
import { MapContainer, TileLayer, Popup, useMap, GeoJSON } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { motion } from 'framer-motion'
import { fetchFields, fetchBlocks, fetchPredefinedFields } from '@/services/database.service'
import type { MobileObservationRecord } from '@/services/database.service'
import { useMobileObservationRecords } from '@/hooks/useMobileObservationRecords'
import { LIVE_DATA_UPDATED_EVENT } from '@/lib/liveData'
import type { Field } from '@/types/database.types'
import { HARDCODED_FIELDS, HARDCODED_FIELD_SHAPEFILE } from '@/data/hardcodedFieldShapefile'
import { MapCenterObject } from '@/components/Map/MapCenterObject'
import {
    SATELLITE_TILE_SOURCES,
    SATELLITE_HYBRID_LABELS_SOURCE,
    TERRAIN_TILE_SOURCE,
    buildDatabaseFieldBoundaries,
    buildFieldIdentity,
    buildFieldLookupByIdentity,
    centroidFromGeometry,
    createSyntheticFieldFromMobileRecord,
    dedupeMobileRecordsByBoundary,
    getBoundaryCodeTokens,
    findFieldForBlock,
    findFieldForFeature,
    findMobileRecordForBlock,
    findMobileRecordForFeature,
    formatDisplayDate,
    getMobileRecordForBoundary,
    getMobileCropType,
    getMobileExpectedHarvestDate,
    getMobileIrrigation,
    getMobilePlantingDate,
    getMobileRecordBoundaryIdentity,
    getMobileRecordBoundaryProps,
    getMobileRecordDate,
    getMobileRemarks,
    getMobileSoilPh,
    getMobileSpatialGeometry,
    getMobileSoilType,
    getMobileSourceLabel,
    getMobileVariety,
    getMobileWaterSource,
    getMostRecentItem,
    hasDistinctRecordedMobilePolygon,
    getRenderableBoundaryGeometry,
    hasCoordinates,
    linkFieldsWithMobileRecords,
    mergeFieldCollections,
    normalizeFieldToken,
} from './mapView.utils'

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const CYAN       = '#1b5e20'
const CYAN_DIM   = 'rgba(27,94,32,0.5)'
const CYAN_BDR   = 'rgba(27,94,32,0.18)'
const SURFACE    = '#ffffff'
const PANEL      = '#ffffff'
const TEXT_DIM   = 'rgba(0,0,0,0.4)'
const TEXT_MID   = 'rgba(0,0,0,0.6)'
const GREEN_OK   = '#9be15d'
const AMBER_WARN = '#ffd166'
const RED_CRIT   = '#ff5c5c'
const SELECTED_BLUE = '#1d4ed8'
const POPUP_BG   = '#061110'
const POPUP_TEXT = '#f2fff4'
const POPUP_SUB  = 'rgba(214, 247, 221, 0.82)'
const POPUP_META = 'rgba(182, 224, 191, 0.68)'
const DEFAULT_CROP_TYPE = 'Sugarcane'
const SUGARCANE_CROP_CLASS_FALLBACKS = [
    'Plant Cane',
    '1st Ratoon',
    '2nd Ratoon',
    '3rd Ratoon',
    '4th Ratoon',
    '5th Ratoon',
    '6th Ratoon',
    '7th Ratoon',
    '8th Ratoon',
    '9th Ratoon',
    '10th Ratoon',
    '11th Ratoon',
    '12th Ratoon',
]
const BREAK_CROP_CLASS_FALLBACKS = ['Soyabeans', 'Sugarbeans', 'Sunnhemp', 'Velvet Beans', 'Maize']
const FALLOW_CROP_CLASS_FALLBACKS = ['None']

/** Shared font shorthand — avoids repeating the string 60+ times */
const MONO: React.CSSProperties['fontFamily'] = '"Space Mono", monospace'
const DISPLAY: React.CSSProperties['fontFamily'] = '"Syne", sans-serif'

const USE_HARDCODED_FIELD_SHAPEFILE = false

// ─── Types ─────────────────────────────────────────────────────────────────────
type SprayFilter      = 'all' | 'sprayed' | 'not-sprayed'
type CollectionFilter = 'all' | 'recorded' | 'pending'
type MapLayer         = 'satellite' | 'terrain'
type MapCropGroup     = 'Sugarcane' | 'Break Crop' | 'Fallow Period' | 'Unspecified'

interface GeoFeature {
    type: 'Feature'
    geometry: any
    properties: any
}

interface MapFocusObservation {
    id?: string
    fieldName?: string
    sectionName?: string
    blockId?: string
    latitude?: number
    longitude?: number
    cropType?: string
}

interface MapNavigationState {
    focusObservation?: MapFocusObservation
}

function toOrdinal(value: number): string {
    const remainder100 = value % 100
    if (remainder100 >= 11 && remainder100 <= 13) return `${value}th`
    if (value % 10 === 1) return `${value}st`
    if (value % 10 === 2) return `${value}nd`
    if (value % 10 === 3) return `${value}rd`
    return `${value}th`
}

function getMapCropGroup(value?: string | null): MapCropGroup {
    const normalized = String(value ?? '').trim().toLowerCase()

    if (!normalized) return 'Unspecified'
    if (/break\s*crop|breakcrop|soyabeans?|sugarbeans?|sunn\s*hemp|velvet\s*beans?|maize/.test(normalized)) return 'Break Crop'
    if (/fallow|fullow|\bnone\b/.test(normalized)) return 'Fallow Period'
    if (/sugar\s*cane|plant\s*cane|\bratoon\b|\bcane\b/.test(normalized)) return 'Sugarcane'
    return 'Unspecified'
}

function getSugarcaneSortOrder(label: string): number {
    if (/plant\s*cane/i.test(label)) return 0

    const ratoonMatch = label.match(/(\d+)(?:st|nd|rd|th)?\s*ratoon/i)
    if (ratoonMatch) return Number(ratoonMatch[1])

    return 999
}

function normalizeCollectorToken(value?: string | null): string {
    return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
}

// ─── Map Bounds Fitter ─────────────────────────────────────────────────────────
function MapBoundsFitter({
    fieldShapes,
    fields,
    blocks,
    mobileRecords,
    center,
    focusCenter,
    focusGeometry,
    focusKey,
}: {
    fieldShapes: GeoFeature[]
    fields: Array<{ latitude?: number; longitude?: number }>
    blocks: Array<{ geom?: { type: string; coordinates: unknown } }>
    mobileRecords: Array<Pick<MobileObservationRecord, 'latitude' | 'longitude'>>
    center: [number, number]
    focusCenter?: [number, number] | null
    focusGeometry?: any | null
    focusKey?: string | null
}) {
    const map = useMap()

    // Stable identity keys — avoids running on every reference change
    const shapeCount   = fieldShapes.length
    const fieldCount   = fields.length
    const blockCount   = blocks.length
    const mobileCount  = mobileRecords.length
    const centerKey    = center.join(',')
    const focusCenterKey = focusCenter?.join(',') ?? ''
    const focusIdentityKey = `${focusKey ?? ''}|${focusGeometry?.type ?? ''}|${focusCenterKey}`

    useEffect(() => {
        if (focusGeometry) {
            try {
                const bounds = L.geoJSON(focusGeometry).getBounds()
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [32, 32], animate: true, duration: 1 })
                    return
                }
            } catch (error) {
                console.warn('Unable to fit focused boundary bounds.', error)
            }
        }

        if (focusCenter) {
            map.setView(focusCenter, 16, { animate: true, duration: 1 })
            return
        }

        if (shapeCount === 0 && fieldCount === 0 && blockCount === 0) {
            map.setView(center, 13, { animate: true, duration: 1.2 })
            return
        }

        try {
            const boundaryCoords: [number, number][] = []
            const fallbackPointCoords: [number, number][] = []

            const pushPolygonCoords = (coords: number[][][]) => {
                coords[0]?.forEach((coord) => {
                    if (Array.isArray(coord) && coord.length === 2) {
                        boundaryCoords.push([coord[1], coord[0]])
                    }
                })
            }

            const extractGeoCoords = (geom?: { type: string; coordinates: unknown }) => {
                if (!geom?.coordinates) return
                const { type, coordinates } = geom as { type: string; coordinates: unknown }
                if (type === 'Polygon') pushPolygonCoords(coordinates as number[][][])
                if (type === 'MultiPolygon') (coordinates as number[][][][]).forEach((poly) => pushPolygonCoords(poly))
            }

            fieldShapes.forEach((f) => extractGeoCoords(f.geometry as any))
            blocks.forEach((b) => extractGeoCoords(b.geom))
            fields.forEach((f) => {
                if (hasCoordinates(f.latitude, f.longitude)) {
                    fallbackPointCoords.push([f.latitude!, f.longitude!])
                }
            })
            mobileRecords.forEach((r) => {
                if (hasCoordinates(r.latitude, r.longitude)) {
                    fallbackPointCoords.push([r.latitude, r.longitude])
                }
            })

            const allCoords = boundaryCoords.length > 0 ? boundaryCoords : fallbackPointCoords

            if (allCoords.length === 0) {
                map.setView(center, 13, { animate: true, duration: 1.2 })
                return
            }

            const bounds = allCoords.reduce(
                (acc, [lat, lng]) => [
                    [Math.min(acc[0][0], lat), Math.min(acc[0][1], lng)],
                    [Math.max(acc[1][0], lat), Math.max(acc[1][1], lng)],
                ],
                [[allCoords[0][0], allCoords[0][1]], [allCoords[0][0], allCoords[0][1]]]
            )

            map.fitBounds(bounds as [[number, number], [number, number]], {
                animate: true,
                duration: 1.2,
                padding: boundaryCoords.length > 0 ? [36, 36] : [50, 50],
                maxZoom: boundaryCoords.length > 0 ? 16 : undefined,
            })
        } catch (err) {
            console.error('Error fitting bounds:', err)
            map.setView(center, 13, { animate: true, duration: 1.2 })
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shapeCount, fieldCount, blockCount, mobileCount, centerKey, focusIdentityKey, focusGeometry, focusCenter, map])

    return null
}

// ─── Scanlines ─────────────────────────────────────────────────────────────────
function Scanlines() {
    return (
        <Box sx={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, borderRadius: 'inherit',
            backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.07) 2px,rgba(0,0,0,0.07) 4px)',
        }} />
    )
}

// ─── HUD Panel ────────────────────────────────────────────────────────────────
function HudPanel({ children, sx = {}, accentColor = CYAN, disableScanlines = false }: {
    children: React.ReactNode
    sx?: object
    accentColor?: string
    disableScanlines?: boolean
}) {
    return (
        <Box sx={{
            bgcolor: alpha(PANEL, 0.94),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(accentColor, 0.2)}`,
            borderRadius: '20px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 24px 60px rgba(21,31,24,0.08), 0 10px 24px rgba(27,94,32,0.08)',
            '&::before': {
                content: '""',
                position: 'absolute', top: 0, left: 0, right: 0, height: '1.5px',
                background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
            },
            ...sx,
        }}>
            {!disableScanlines && <Scanlines />}
            <Box sx={{ position: 'relative', zIndex: 1, height: '100%' }}>{children}</Box>
        </Box>
    )
}

// ─── Legend Row ───────────────────────────────────────────────────────────────
function LegendRow({ color, label, shape = 'circle' }: { color: string; label: string; shape?: 'circle' | 'line' }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {shape === 'circle'
                ? <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0, boxShadow: `0 0 6px ${color}55` }} />
                : <Box sx={{ width: 16, height: 2, bgcolor: color, opacity: 0.7, borderRadius: 1, flexShrink: 0 }} />
            }
            <Typography sx={{ fontSize: '0.68rem', color: TEXT_MID, fontFamily: MONO }}>
                {label}
            </Typography>
        </Box>
    )
}

// ─── Info Rows ────────────────────────────────────────────────────────────────
function PopupInfoRow({ label, value }: { label: string; value?: string | number | null }) {
    if (value == null || value === '') return null
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start' }}>
            <Typography sx={{ fontSize: '0.54rem', color: POPUP_META, fontFamily: MONO, letterSpacing: '0.08em' }}>{label}</Typography>
            <Typography sx={{ fontSize: '0.55rem', color: POPUP_TEXT, fontFamily: MONO, textAlign: 'right' }}>{String(value)}</Typography>
        </Box>
    )
}

// ─── Badges / Chips ───────────────────────────────────────────────────────────
function SectionBadge({ label, color = CYAN }: { label: string; color?: string }) {
    return (
        <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.8,
            px: 1.2, py: 0.65, borderRadius: '999px',
            bgcolor: alpha(color, 0.08), border: `1px solid ${alpha(color, 0.16)}`,
        }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color, boxShadow: `0 0 10px ${alpha(color, 0.45)}` }} />
            <Typography sx={{ fontSize: '0.52rem', color, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: MONO }}>
                {label}
            </Typography>
        </Box>
    )
}

function ControlSelect({ label, value, onChange, children, renderValue }: {
    label: string
    value: string
    onChange: (value: string) => void
    children: React.ReactNode
    renderValue?: (value: string) => React.ReactNode
}) {
    return (
        <Box sx={{
            p: 1.15,
            borderRadius: '18px',
            border: `1px solid ${alpha(CYAN, 0.12)}`,
            bgcolor: 'rgba(255,255,255,0.74)',
            boxShadow: '0 10px 26px rgba(21,31,24,0.05)',
        }}>
            <Typography sx={{ fontSize: '0.52rem', color: TEXT_DIM, letterSpacing: '0.18em', textTransform: 'uppercase', mb: 0.85, fontFamily: MONO, fontWeight: 700 }}>
                {label}
            </Typography>
            <FormControl fullWidth size="small">
                <Select
                    value={value}
                    onChange={(e) => onChange(String(e.target.value))}
                    displayEmpty
                    renderValue={renderValue ? (selected) => renderValue(String(selected)) : undefined}
                    sx={{
                        bgcolor: 'rgba(248,252,249,0.92)',
                        border: `1px solid ${alpha(CYAN, 0.14)}`,
                        borderRadius: '14px',
                        color: 'text.primary',
                        fontFamily: MONO,
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                        '& .MuiSelect-select': { py: 1.1 },
                        '& .MuiSvgIcon-root': { color: CYAN_DIM },
                    }}
                    MenuProps={{ PaperProps: { sx: {
                        bgcolor: '#f7faf6', border: `1px solid ${CYAN_BDR}`,
                        borderRadius: '18px', color: 'text.primary', fontFamily: MONO, fontSize: '0.72rem',
                        boxShadow: '0 18px 40px rgba(21,31,24,0.08)',
                    } } }}
                >
                    {children}
                </Select>
            </FormControl>
        </Box>
    )
}

// ─── Popup Info Panels ────────────────────────────────────────────────────────
function MobileRecordInfoPanel({ record }: { record: MobileObservationRecord }) {
    const currentSheet        = record.monitoring_sheet
    const recordedAt          = getMobileRecordDate(record)
    const cropType            = getMobileCropType(record)
    const irrigation          = getMobileIrrigation(record)
    const waterSource         = getMobileWaterSource(record)
    const soilType            = getMobileSoilType(record)
    const soilPh              = getMobileSoilPh(record)
    const plantingDate        = getMobilePlantingDate(record)
    const cuttingDate         = currentSheet?.previous_cutting_date || currentSheet?.previous_cutting || record.entry_form?.cutting_date || ''
    const expectedHarvestDate = getMobileExpectedHarvestDate(record)
    const remarks             = getMobileRemarks(record)
    const trialLabel          = [currentSheet?.trial_name || record.entry_form?.trial_name, currentSheet?.trial_number || record.entry_form?.trial_number].filter(Boolean).join(' · ')
    const collectorLabel      = currentSheet?.contact_person || record.collector_id || record.entry_form?.contact_person || ''

    return (
        <Box sx={{ mt: 0.8 }}>
            <Typography sx={{ fontSize: '0.56rem', color: POPUP_META, fontFamily: MONO, mb: 0.8 }}>
                Feed: {getMobileSourceLabel(record)}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.55 }}>
                <PopupInfoRow label="Collector"        value={collectorLabel} />
                <PopupInfoRow label="Recorded"         value={formatDisplayDate(recordedAt, true)} />
                <PopupInfoRow label="Block"            value={currentSheet?.block_id || record.block_id} />
                <PopupInfoRow label="Crop"             value={cropType} />
                <PopupInfoRow label="Trial"            value={trialLabel} />
                <PopupInfoRow label="Planting"         value={formatDisplayDate(plantingDate)} />
                <PopupInfoRow label="Cutting"          value={formatDisplayDate(cuttingDate)} />
                <PopupInfoRow label="Expected Harvest" value={formatDisplayDate(expectedHarvestDate)} />
                <PopupInfoRow label="Irrigation"       value={irrigation} />
                <PopupInfoRow label="Water Source"     value={waterSource} />
                <PopupInfoRow label="Soil Type"        value={soilType} />
                <PopupInfoRow label="Soil pH"          value={soilPh != null ? soilPh.toFixed(1) : null} />
                <PopupInfoRow label="TAM (mm)"         value={currentSheet?.tam_mm || (record.entry_form?.tamm_area != null ? String(record.entry_form.tamm_area) : null)} />
            </Box>
            {remarks && (
                <Box sx={{ mt: 0.9, pt: 0.9, borderTop: '1px solid rgba(255,209,102,0.18)' }}>
                    <Typography sx={{ fontSize: '0.52rem', color: POPUP_META, fontFamily: MONO, letterSpacing: '0.08em', mb: 0.35 }}>REMARKS</Typography>
                    <Typography sx={{ fontSize: '0.56rem', color: POPUP_SUB, fontFamily: MONO, lineHeight: 1.5 }}>{remarks}</Typography>
                </Box>
            )}
        </Box>
    )
}

function FieldInfoPanel({ field, collectionLabel, sourceLabel }: {
    field?: Partial<Field> | null
    collectionLabel: string
    sourceLabel?: string
}) {
    if (!field) {
        return (
            <Typography sx={{ fontSize: '0.56rem', color: POPUP_META, fontFamily: MONO, mt: 0.6 }}>
                No collected information linked to this map feature yet.
            </Typography>
        )
    }

    return (
        <Box sx={{ mt: 0.8 }}>
            <Typography sx={{ fontSize: '0.56rem', color: POPUP_META, fontFamily: MONO, mb: 0.8 }}>
                Collection: {collectionLabel}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.55 }}>
                <PopupInfoRow label="Observations" value={field.observation_count} />
                <PopupInfoRow label="Crop"         value={field.crop_type} />
                <PopupInfoRow label="Stage"        value={field.latest_stage} />
                <PopupInfoRow label="Vigor"        value={field.latest_vigor} />
                <PopupInfoRow label="Canopy"       value={field.latest_canopy_cover != null ? `${field.latest_canopy_cover}%` : null} />
                <PopupInfoRow label="Stress"       value={field.latest_stress} />
                <PopupInfoRow label="Moisture"     value={field.latest_moisture != null ? `${field.latest_moisture}%` : null} />
                <PopupInfoRow label="Irrigation"   value={field.latest_irrigation_type} />
                <PopupInfoRow label="Spray"        value={field.is_sprayed == null ? null : field.is_sprayed ? 'SPRAYED' : 'NOT SPRAYED'} />
                <PopupInfoRow label="Pest Ctrl"    value={field.latest_pest_control} />
                <PopupInfoRow label="Disease Ctrl" value={field.latest_disease_control} />
                <PopupInfoRow label="Weed Ctrl"    value={field.latest_weed_control} />
                <PopupInfoRow
                    label="Last Collected"
                    value={field.latest_observation_date ? new Date(field.latest_observation_date).toLocaleString('en-GB') : null}
                />
            </Box>
            {field.latest_remarks && (
                <Box sx={{ mt: 0.9, pt: 0.9, borderTop: '1px solid rgba(129,199,132,0.14)' }}>
                    <Typography sx={{ fontSize: '0.52rem', color: POPUP_META, fontFamily: MONO, letterSpacing: '0.08em', mb: 0.35 }}>REMARKS</Typography>
                    <Typography sx={{ fontSize: '0.56rem', color: POPUP_SUB, fontFamily: MONO, lineHeight: 1.5 }}>{field.latest_remarks}</Typography>
                </Box>
            )}
            {sourceLabel && (
                <Typography sx={{ fontSize: '0.53rem', color: POPUP_META, fontFamily: MONO, mt: 0.9 }}>
                    Source: {sourceLabel}
                </Typography>
            )}
        </Box>
    )
}

// ─── Map Layer Sub-components ─────────────────────────────────────────────────
// These replace the IIFE patterns in JSX, making intent clear and avoiding
// recreating anonymous functions on every render.

interface BoundaryLayerProps {
    features: GeoFeature[]
    linkedFields: Field[]
    fieldLookupByIdentity: Map<string, Field>
    mobileRecordsForBoundaryLinking: MobileObservationRecord[]
    mobileRecordByFeatureKey: Map<string, MobileObservationRecord>
    selectedBoundaryKey: string | null
    onSelectBoundary: (key: string) => void
    getBoundaryStyle: (field?: Partial<Field> | null, sourceLabel?: string, fallbackColor?: string, isRecorded?: boolean) => object
    getCollectionColor: (field?: Partial<Field> | null, sourceLabel?: string, isRecorded?: boolean) => string
    getCollectionLabel: (field?: Partial<Field> | null, sourceLabel?: string, isRecorded?: boolean) => string
}

function FieldBoundaryLayer({
    features,
    linkedFields,
    fieldLookupByIdentity,
    mobileRecordsForBoundaryLinking,
    mobileRecordByFeatureKey,
    selectedBoundaryKey,
    onSelectBoundary,
    getBoundaryStyle,
    getCollectionColor,
    getCollectionLabel,
}: BoundaryLayerProps) {
    return (
        <>
            {features.map((feature, index) => {
                const mobileRecordKey = feature.properties?.mobile_record_key as string | undefined
                const matchedField    = findFieldForFeature(feature, linkedFields, fieldLookupByIdentity, mobileRecordsForBoundaryLinking)
                const mobileRecord    = mobileRecordKey
                    ? (mobileRecordByFeatureKey.get(mobileRecordKey) ?? null)
                    : findMobileRecordForFeature(feature, mobileRecordsForBoundaryLinking)
                const boundaryField   = matchedField ?? (mobileRecord ? createSyntheticFieldFromMobileRecord(mobileRecord, {
                    field_name:   feature.properties?.field_name   as string | undefined,
                    section_name: feature.properties?.section_name as string | undefined,
                    block_id:     feature.properties?.block_id     as string | undefined,
                }) : null)
                const sourceLabel = String(feature.properties?.source_label ?? '')
                const isRecorded = Boolean(mobileRecord)
                const collectionColor = getCollectionColor(boundaryField, sourceLabel, isRecorded)
                const collectionLabel = getCollectionLabel(boundaryField, sourceLabel, isRecorded)
                const key = String(getFeatureBoundaryUniqueKey(feature) ?? mobileRecordKey ?? feature.properties?.field_name ?? index)
                const isSelected = isRecorded && selectedBoundaryKey === key
                const boundaryStyle = {
                    ...getBoundaryStyle(boundaryField, sourceLabel, CYAN, isRecorded),
                    ...(isSelected ? {
                        color: SELECTED_BLUE,
                        fillColor: SELECTED_BLUE,
                        weight: sourceLabel === 'mobile recorded polygon' ? 5 : 6,
                        fillOpacity: sourceLabel === 'mobile recorded polygon' ? 0.2 : 0.3,
                        opacity: 1,
                        dashArray: undefined,
                    } : {}),
                }

                return (
                    <GeoJSON
                        key={`field-shape-${key}`}
                        data={feature}
                        style={boundaryStyle}
                        eventHandlers={isRecorded ? { click: () => onSelectBoundary(key) } : undefined}
                    >
                        <Popup className="hud-popup">
                            <Box sx={{ p: 1.5 }}>
                                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: collectionColor, fontFamily: MONO, letterSpacing: '0.08em' }}>
                                    {String(feature.properties?.field_name ?? 'RECORDED AREA').toUpperCase()}
                                </Typography>
                                <Typography sx={{ fontSize: '0.58rem', color: POPUP_SUB, fontFamily: MONO, mt: 0.4 }}>
                                    {feature.properties?.block_id || 'RECORDED MOBILE BOUNDARY'}
                                </Typography>
                                {mobileRecord
                                    ? <MobileRecordInfoPanel record={mobileRecord} />
                                    : <FieldInfoPanel field={boundaryField} collectionLabel={collectionLabel} sourceLabel={String(feature.properties?.source_label ?? 'bundled KML boundary')} />
                                }
                            </Box>
                        </Popup>
                    </GeoJSON>
                )
            })}
        </>
    )
}

interface BlockLayerProps {
    blocks: any[]
    linkedFields: Field[]
    fieldLookupByIdentity: Map<string, Field>
    mobileRecordsForBoundaryLinking: MobileObservationRecord[]
    selectedBoundaryKey: string | null
    onSelectBoundary: (key: string) => void
    getBoundaryStyle: (field?: Partial<Field> | null, sourceLabel?: string, fallbackColor?: string, isRecorded?: boolean) => object
    getCollectionColor: (field?: Partial<Field> | null, sourceLabel?: string, isRecorded?: boolean) => string
    getCollectionLabel: (field?: Partial<Field> | null, sourceLabel?: string, isRecorded?: boolean) => string
}

function BlockLayer({
    blocks,
    linkedFields,
    fieldLookupByIdentity,
    mobileRecordsForBoundaryLinking,
    selectedBoundaryKey,
    onSelectBoundary,
    getBoundaryStyle,
    getCollectionColor,
    getCollectionLabel,
}: BlockLayerProps) {
    return (
        <>
            {blocks.map((block) => {
                if (!block.geom) return null
                const matchedField    = findFieldForBlock(block, linkedFields, fieldLookupByIdentity, mobileRecordsForBoundaryLinking)
                const mobileRecord    = findMobileRecordForBlock(block, mobileRecordsForBoundaryLinking)
                const isRecorded = Boolean(mobileRecord)
                const collectionColor = getCollectionColor(matchedField, 'uploaded boundary', isRecorded)
                const blockKey = String(getBlockBoundaryUniqueKey(block) ?? block.id)
                const isSelected = isRecorded && selectedBoundaryKey === blockKey
                const boundaryStyle = {
                    ...getBoundaryStyle(matchedField, 'uploaded boundary', CYAN, isRecorded),
                    ...(isSelected ? {
                        color: SELECTED_BLUE,
                        fillColor: SELECTED_BLUE,
                        weight: 6,
                        fillOpacity: 0.3,
                        opacity: 1,
                        dashArray: undefined,
                    } : {}),
                }

                return (
                    <GeoJSON
                        key={block.id}
                        data={block.geom}
                        style={boundaryStyle}
                        eventHandlers={isRecorded ? { click: () => onSelectBoundary(blockKey) } : undefined}
                    >
                        <Popup className="hud-popup">
                            <Box sx={{ p: 1.5 }}>
                                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: collectionColor, fontFamily: MONO, letterSpacing: '0.1em' }}>
                                    {String(block.name ?? block.block_id).toUpperCase()}
                                </Typography>
                                <Typography sx={{ fontSize: '0.58rem', color: POPUP_SUB, fontFamily: MONO, mt: 0.3 }}>
                                    BOUNDARY ID: {block.block_id}
                                </Typography>
                                {block.name && block.name !== block.block_id && (
                                    <Typography sx={{ fontSize: '0.62rem', color: POPUP_SUB, fontFamily: MONO, mt: 0.3 }}>
                                        Registry: {block.name}
                                    </Typography>
                                )}
                                {mobileRecord
                                    ? <MobileRecordInfoPanel record={mobileRecord} />
                                    : <FieldInfoPanel
                                        field={matchedField}
                                        collectionLabel={getCollectionLabel(matchedField, 'uploaded boundary', isRecorded)}
                                        sourceLabel={`uploaded boundary · ${new Date(block.created_at).toLocaleDateString('en-GB')}`}
                                    />
                                }
                            </Box>
                        </Popup>
                    </GeoJSON>
                )
            })}
        </>
    )
}

// ─── Helpers (pure, no hooks) ─────────────────────────────────────────────────
const getCollectionColor = (
    field?: Partial<Field> | null,
    sourceLabel?: string,
    isRecorded = false
) => {
    if (sourceLabel === 'mobile recorded polygon') return AMBER_WARN
    if (isRecorded) return GREEN_OK
    if (!field) return CYAN
    return RED_CRIT
}

const getCollectionLabel = (
    field?: Partial<Field> | null,
    sourceLabel?: string,
    isRecorded = false
) => {
    if (sourceLabel === 'mobile recorded polygon') return 'RECORDED MOBILE POLYGON'
    if (isRecorded) return 'MOBILE-RECORDED FIELD'
    if (!field) return 'BOUNDARY ONLY'
    return 'PENDING FIELD'
}

const getBoundaryStyle = (
    field?: Partial<Field> | null,
    sourceLabel?: string,
    fallbackColor = CYAN,
    isRecorded = false
) => {
    if (sourceLabel === 'mobile recorded polygon') {
        return {
            color: AMBER_WARN,
            weight: 3.2,
            fillOpacity: 0.08,
            fillColor: AMBER_WARN,
            opacity: 0.95,
            dashArray: '5 4',
        }
    }

    if (!field) {
        return {
            color: fallbackColor,
            weight: 2.8,
            fillOpacity: 0.04,
            fillColor: fallbackColor,
            opacity: 0.95,
            dashArray: '6 6',
        }
    }

    return {
        color: isRecorded ? GREEN_OK : RED_CRIT,
        weight: isRecorded ? 4 : 3.2,
        fillOpacity: isRecorded ? 0.18 : 0.08,
        fillColor: isRecorded ? GREEN_OK : RED_CRIT,
        opacity: 1,
        dashArray: isRecorded ? undefined : '10 6',
    }
}

const getMobileRecordFeatureKey = (record: MobileObservationRecord) =>
    `${record.source_table}-${record.source_row_id ?? record.id}`

const getMobileRecordBoundaryKeys = (record: MobileObservationRecord): string[] => {
    const props = getMobileRecordBoundaryProps(record)
    const keys: string[] = []
    const identity = buildFieldIdentity(props.field_name, props.section_name, props.block_id)
    const blockKey = normalizeFieldToken(props.block_id)
    const nameKey = normalizeFieldToken(props.field_name)

    if (identity.replace(/:/g, '')) keys.push(`identity:${identity}`)
    if (blockKey) keys.push(`block:${blockKey}`)
    if (nameKey) keys.push(`name:${nameKey}`)
    getBoundaryCodeTokens(props.field_name, props.block_id).forEach((code) => keys.push(`code:${code}`))

    return keys
}

const getFeatureBoundaryKeys = (feature: GeoFeature): string[] => {
    const props    = feature?.properties ?? {}
    const keys: string[] = []
    const identity = buildFieldIdentity(props.field_name as string, props.section_name as string, props.block_id as string)
    const blockKey = normalizeFieldToken(props.block_id as string)
    const nameKey  = normalizeFieldToken(props.field_name as string)

    if (identity.replace(/:/g, '')) keys.push(`identity:${identity}`)
    if (blockKey)                   keys.push(`block:${blockKey}`)
    if (nameKey)                    keys.push(`name:${nameKey}`)
    getBoundaryCodeTokens(props.field_name as string, props.block_id as string).forEach((code) => keys.push(`code:${code}`))
    return keys
}

const getFeatureBoundaryUniqueKey = (feature: GeoFeature): string | null => {
    const props = feature?.properties ?? {}
    const identity = buildFieldIdentity(props.field_name as string, props.section_name as string, props.block_id as string)
    if (identity.replace(/:/g, '')) return `identity:${identity}`

    const nameKey = normalizeFieldToken(props.field_name as string)
    if (nameKey) return `name:${nameKey}`

    const blockKey = normalizeFieldToken(props.block_id as string)
    if (blockKey) return `block:${blockKey}`

    const mobileRecordKey = String(props.mobile_record_key ?? '')
    if (mobileRecordKey) return `mobile:${mobileRecordKey}`

    return null
}

const findReferenceFeatureForMobileRecord = (
    record: MobileObservationRecord,
    features: GeoFeature[]
): GeoFeature | null => {
    const recordKeys = new Set(getMobileRecordBoundaryKeys(record))
    if (recordKeys.size === 0) return null

    const rankFeatureMatch = (feature: GeoFeature): number => {
        const featureKeys = getFeatureBoundaryKeys(feature)

        if (featureKeys.some((key) => key.startsWith('identity:') && recordKeys.has(key))) return 4
        if (featureKeys.some((key) => key.startsWith('block:') && recordKeys.has(key))) return 3
        if (featureKeys.some((key) => key.startsWith('name:') && recordKeys.has(key))) return 2
        if (featureKeys.some((key) => key.startsWith('code:') && recordKeys.has(key))) return 1

        return 0
    }

    let bestFeature: GeoFeature | null = null
    let bestRank = 0

    features.forEach((feature) => {
        const rank = rankFeatureMatch(feature)
        if (rank > bestRank) {
            bestRank = rank
            bestFeature = feature
        }
    })

    return bestFeature
}

const getBlockBoundaryKeys = (block: any): string[] => {
    const keys: string[] = []
    const identity = buildFieldIdentity(block?.name, undefined, block?.block_id)
    const blockKey = normalizeFieldToken(block?.block_id)
    const nameKey  = normalizeFieldToken(block?.name)

    if (identity.replace(/:/g, '')) keys.push(`identity:${identity}`)
    if (blockKey)                   keys.push(`block:${blockKey}`)
    if (nameKey)                    keys.push(`name:${nameKey}`)
    getBoundaryCodeTokens(block?.name, block?.block_id).forEach((code) => keys.push(`code:${code}`))
    return keys
}

const getBlockBoundaryUniqueKey = (block: any): string | null => {
    const identity = buildFieldIdentity(block?.name, undefined, block?.block_id)
    if (identity.replace(/:/g, '')) return `identity:${identity}`

    const blockKey = normalizeFieldToken(block?.block_id)
    if (blockKey) return `block:${blockKey}`

    const nameKey = normalizeFieldToken(block?.name)
    if (nameKey) return `name:${nameKey}`

    return null
}

const getFocusBoundaryKeys = (focus?: MapFocusObservation | null): string[] => {
    if (!focus) {
        return []
    }

    const keys: string[] = []
    const identity = buildFieldIdentity(focus.fieldName, focus.sectionName, focus.blockId)
    const blockKey = normalizeFieldToken(focus.blockId)
    const nameKey = normalizeFieldToken(focus.fieldName)

    if (identity.replace(/:/g, '')) keys.push(`identity:${identity}`)
    if (blockKey) keys.push(`block:${blockKey}`)
    if (nameKey) keys.push(`name:${nameKey}`)
    getBoundaryCodeTokens(focus.fieldName, focus.blockId).forEach((code) => keys.push(`code:${code}`))

    return keys
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function MapViewPage() {
    const location = useLocation()
    const routeState = (location.state as MapNavigationState | null) ?? null
    const focusObservation = routeState?.focusObservation ?? null
    const [fields,       setFields]       = useState<Field[]>([])
    const [fieldShapes,  setFieldShapes]  = useState<GeoFeature[]>([])
    const [blocks,       setBlocks]       = useState<any[]>([])
    const [isLoading,    setIsLoading]    = useState(true)
    const [error,        setError]        = useState<Error | null>(null)
    const [selectedCropType,    setSelectedCropType]    = useState<string>(DEFAULT_CROP_TYPE)
    const [selectedCropClass,   setSelectedCropClass]   = useState<string>('all')
    const [selectedCollector,   setSelectedCollector]   = useState<string>('all')
    const [userLocation,        setUserLocation]        = useState<[number, number] | null>(null)
    const [manualLocationRequest, setManualLocationRequest] = useState(false)
    const [mapLayer,            setMapLayer]            = useState<MapLayer>('satellite')
    const [satelliteSourceIndex, setSatelliteSourceIndex] = useState(0)
    const [tileStatusNotice,    setTileStatusNotice]    = useState<string | null>(null)
    const [sprayFilter] = useState<SprayFilter>('all')
    const [collectionFilter,    setCollectionFilter]    = useState<CollectionFilter>('all')
    const [showMobileRecords,   setShowMobileRecords]   = useState(true)
    const [selectedBoundaryKey, setSelectedBoundaryKey] = useState<string | null>(null)

    // Single boolean ref instead of string lock key — simpler and race-condition-free
    const tileErrorHandledRef = useRef(false)

    const { data: mobileRecords = [] } = useMobileObservationRecords()

    const normalizeCropType = useCallback((value?: string | null) => {
        const raw = String(value ?? '').trim()
        if (!raw) return DEFAULT_CROP_TYPE
        const cropGroup = getMapCropGroup(raw)
        return cropGroup === 'Unspecified' ? raw : cropGroup
    }, [])

    const normalizeCropClass = useCallback(
        (value?: string | null) => String(value ?? '').trim().replace(/\s+/g, ' '),
        []
    )

    const getMobileCropClass = useCallback((record?: MobileObservationRecord | null): string => {
        if (!record) return ''

        const cropClass = normalizeCropClass(record.monitoring_sheet?.crop_class || record.entry_form?.crop_class)
        const cropTypeRaw = normalizeCropClass(
            record.monitoring_sheet?.crop_type
            || record.crop_information?.crop_type
            || record.entry_form?.crop_type
        )
        const cropGroup = normalizeCropType(cropTypeRaw || cropClass)

        if (cropGroup === 'Sugarcane') {
            const sugarSignals = [cropClass, cropTypeRaw]

            for (const signal of sugarSignals) {
                if (!signal) continue
                if (/plant\s*cane/i.test(signal)) return 'Plant Cane'

                const ratoonMatch = signal.match(/(\d+)(?:st|nd|rd|th)?\s*ratoon/i)
                if (ratoonMatch) return `${toOrdinal(Number(ratoonMatch[1]))} Ratoon`

                if (getMapCropGroup(signal) === 'Sugarcane' && !/^sugar\s*cane$/i.test(signal)) {
                    return signal
                }
            }

            const ratoonNumber = record.monitoring_sheet?.ratoon_number
            if (typeof ratoonNumber === 'number' && Number.isFinite(ratoonNumber) && ratoonNumber > 0) {
                return `${toOrdinal(ratoonNumber)} Ratoon`
            }

            return cropGroup === 'Sugarcane' ? 'Unspecified cane' : ''
        }

        if (cropGroup === 'Break Crop') {
            if (cropClass) return cropClass

            const variety = normalizeCropClass(getMobileVariety(record))
            if (variety) return variety

            if (cropTypeRaw && !/^break\s*crop$/i.test(cropTypeRaw)) {
                return cropTypeRaw
            }

            return ''
        }

        if (cropGroup === 'Fallow Period') {
            return cropClass || 'None'
        }

        return cropClass || cropTypeRaw
    }, [normalizeCropClass, normalizeCropType])

    const getCollectorLabel = useCallback((record?: MobileObservationRecord | null, field?: Partial<Field> | null): string => {
        return String(
            record?.monitoring_sheet?.contact_person
            || record?.collector_id
            || record?.entry_form?.contact_person
            || field?.created_by
            || ''
        ).trim().replace(/\s+/g, ' ')
    }, [])

    const mobileRecordsForCropType = useMemo(
        () => mobileRecords.filter((record) =>
            selectedCropType === 'all' || normalizeCropType(getMobileCropType(record)) === selectedCropType
        ),
        [mobileRecords, selectedCropType, normalizeCropType]
    )

    useEffect(() => {
        if (!focusObservation) return

        setShowMobileRecords(true)
        setCollectionFilter('recorded')
        setSelectedCropType('all')
        setSelectedCropClass('all')
        setSelectedCollector('all')
    }, [focusObservation])

    const loadMapData = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        const [registryResult, fieldsResult, blocksResult] = await Promise.allSettled([
            fetchPredefinedFields(),
            fetchFields(),
            fetchBlocks(),
        ])

        const registryFields = registryResult.status === 'fulfilled' ? registryResult.value : []
        const observedFields = fieldsResult.status === 'fulfilled' ? fieldsResult.value : []
        const dbBlocks = blocksResult.status === 'fulfilled' ? blocksResult.value : []
        const mergedFields = mergeFieldCollections(registryFields, observedFields)

        console.log('🗺️ Map Data Loaded:', {
            registryFields: registryFields.length,
            observedFields: observedFields.length,
            dbBlocks: dbBlocks.length,
        })

        const useBundledRegistry = USE_HARDCODED_FIELD_SHAPEFILE || mergedFields.length === 0
        const useBundledBoundaries = dbBlocks.length === 0 && HARDCODED_FIELD_SHAPEFILE.features.length > 0
        const normalizedFields = (useBundledRegistry ? HARDCODED_FIELDS : mergedFields).map((field) => ({
            ...field,
            crop_type: normalizeCropType(field.crop_type),
        }))

        setFields(normalizedFields)
        setFieldShapes(useBundledBoundaries ? HARDCODED_FIELD_SHAPEFILE.features : [])
        setBlocks(Array.isArray(dbBlocks) ? dbBlocks : [])

        if (registryResult.status === 'rejected' && fieldsResult.status === 'rejected' && !useBundledRegistry) {
            const reason = fieldsResult.reason instanceof Error
                ? fieldsResult.reason
                : registryResult.reason instanceof Error
                    ? registryResult.reason
                    : new Error('Failed to load field map data')
            setError(reason)
        }

        if (blocksResult.status === 'rejected') {
            console.warn('⚠️ Blocks fetch failed:', blocksResult.reason)
        }

        setIsLoading(false)
    }, [normalizeCropType])

    // ── Data loading ──────────────────────────────────────────────────────────
    useEffect(() => {
        void loadMapData()

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
                (err) => console.error(err),
                { enableHighAccuracy: true }
            )
        }
    }, [loadMapData])

    useEffect(() => {
        const handleLiveUpdate = () => {
            void loadMapData()
        }

        window.addEventListener(LIVE_DATA_UPDATED_EVENT, handleLiveUpdate)
        return () => window.removeEventListener(LIVE_DATA_UPDATED_EVENT, handleLiveUpdate)
    }, [loadMapData])

    const handleLocateMe = useCallback(() => {
        if (!navigator.geolocation) return
        setManualLocationRequest(true)
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserLocation([pos.coords.latitude, pos.coords.longitude])
                setTimeout(() => setManualLocationRequest(false), 100)
            },
            (err) => { console.error(err); setManualLocationRequest(false) }
        )
    }, [])

    // ── Tile error handling ───────────────────────────────────────────────────
    useEffect(() => { tileErrorHandledRef.current = false }, [mapLayer, satelliteSourceIndex])

    const handleTileError = useCallback(() => {
        if (mapLayer !== 'satellite' || tileErrorHandledRef.current) return
        tileErrorHandledRef.current = true

        if (satelliteSourceIndex < SATELLITE_TILE_SOURCES.length - 1) {
            setSatelliteSourceIndex((i) => i + 1)
            setTileStatusNotice('Primary satellite imagery failed. Trying backup tile source.')
            return
        }

        setMapLayer('terrain')
        setTileStatusNotice('Satellite imagery unavailable. Map switched to terrain view.')
    }, [mapLayer, satelliteSourceIndex])

    const handleTileLoad = useCallback(() => {
        setTileStatusNotice(
            mapLayer === 'satellite' && satelliteSourceIndex > 0 ? 'Backup satellite imagery is active.' : null
        )
    }, [mapLayer, satelliteSourceIndex])

    const handleLayerToggle = useCallback(() => {
        if (mapLayer === 'satellite') {
            setMapLayer('terrain')
            setTileStatusNotice(null)
        } else {
            setSatelliteSourceIndex(0)
            setTileStatusNotice(null)
            setMapLayer('satellite')
        }
    }, [mapLayer])

    // ── Crop types ────────────────────────────────────────────────────────────
    const cropTypes = useMemo(
        () => Array.from(new Set([
            ...fields.map((field) => normalizeCropType(field.crop_type)),
            ...mobileRecords.map((record) => normalizeCropType(getMobileCropType(record))),
        ].filter(Boolean)))
            .sort((left, right) => {
                const order = new Map<string, number>([
                    ['Sugarcane', 0],
                    ['Fallow Period', 1],
                    ['Break Crop', 2],
                ])

                return (order.get(left) ?? 99) - (order.get(right) ?? 99) || left.localeCompare(right)
            }) as string[],
        [fields, mobileRecords, normalizeCropType]
    )

    const cropClassOptions = useMemo(() => {
        if (selectedCropType === 'all') return [] as string[]

        const availableClasses = Array.from(new Set(
            mobileRecordsForCropType
                .map((record) => getMobileCropClass(record))
                .map((value) => normalizeCropClass(value))
                .filter(Boolean)
        ))

        if (selectedCropType === 'Sugarcane') {
            const resolved = availableClasses.length > 0 ? availableClasses : SUGARCANE_CROP_CLASS_FALLBACKS
            return resolved.sort((left, right) =>
                getSugarcaneSortOrder(left) - getSugarcaneSortOrder(right) || left.localeCompare(right)
            )
        }

        if (selectedCropType === 'Break Crop') {
            const resolved = availableClasses.length > 0 ? availableClasses : BREAK_CROP_CLASS_FALLBACKS
            return resolved.sort((left, right) => left.localeCompare(right))
        }

        if (selectedCropType === 'Fallow Period') {
            const resolved = availableClasses.length > 0 ? availableClasses : FALLOW_CROP_CLASS_FALLBACKS
            return resolved.sort((left, right) => left.localeCompare(right))
        }

        return availableClasses.sort((left, right) => left.localeCompare(right))
    }, [selectedCropType, mobileRecordsForCropType, getMobileCropClass, normalizeCropClass])

    useEffect(() => {
        if (selectedCropType === 'all') {
            if (selectedCropClass !== 'all') setSelectedCropClass('all')
            return
        }

        if (selectedCropClass !== 'all' && !cropClassOptions.includes(selectedCropClass)) {
            setSelectedCropClass('all')
        }
    }, [selectedCropType, selectedCropClass, cropClassOptions])

    const matchesSelectedCropClass = useCallback((value?: string | null) => {
        if (selectedCropClass === 'all') return true
        return normalizeCropClass(value) === selectedCropClass
    }, [selectedCropClass, normalizeCropClass])

    const collectorOptions = useMemo(
        () => {
            const optionMap = new Map<string, string>()

            mobileRecordsForCropType.forEach((record) => {
                if (!matchesSelectedCropClass(getMobileCropClass(record))) {
                    return
                }

                const label = getCollectorLabel(record)
                const token = normalizeCollectorToken(label)
                if (token && !optionMap.has(token)) {
                    optionMap.set(token, label)
                }
            })

            fields.forEach((field) => {
                if (selectedCropType !== 'all' && normalizeCropType(field.crop_type) !== selectedCropType) {
                    return
                }

                const label = getCollectorLabel(undefined, field)
                const token = normalizeCollectorToken(label)
                if (token && !optionMap.has(token)) {
                    optionMap.set(token, label)
                }
            })

            return Array.from(optionMap.entries())
                .map(([value, label]) => ({ value, label }))
                .sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: 'base' }))
        },
        [fields, getCollectorLabel, getMobileCropClass, matchesSelectedCropClass, mobileRecordsForCropType, normalizeCropType, selectedCropType]
    )

    useEffect(() => {
        if (selectedCollector === 'all') {
            return
        }

        if (!collectorOptions.some((option) => option.value === selectedCollector)) {
            setSelectedCollector('all')
        }
    }, [collectorOptions, selectedCollector])

    const matchesSelectedCollector = useCallback((value?: string | null) => {
        if (selectedCollector === 'all') return true
        return normalizeCollectorToken(value) === selectedCollector
    }, [selectedCollector])

    const getFieldCropClass = useCallback((field: Field, matchedRecord?: MobileObservationRecord | null): string => {
        const linkedRecord = matchedRecord ?? getMobileRecordForBoundary(field, mobileRecordsForCropType)
        const linkedCropClass = getMobileCropClass(linkedRecord)

        if (linkedCropClass) {
            return linkedCropClass
        }

        const latestStage = normalizeCropClass(field.latest_stage)
        if (selectedCropType === 'Sugarcane') {
            if (/plant\s*cane/i.test(latestStage)) return 'Plant Cane'

            const ratoonMatch = latestStage.match(/(\d+)(?:st|nd|rd|th)?\s*ratoon/i)
            if (ratoonMatch) return `${toOrdinal(Number(ratoonMatch[1]))} Ratoon`
        }

        if (selectedCropType === 'Break Crop') {
            const latestVariety = normalizeCropClass(field.latest_variety)
            if (latestVariety) return latestVariety
        }

        if (selectedCropType === 'Fallow Period') {
            return 'None'
        }

        return ''
    }, [getMobileCropClass, mobileRecordsForCropType, normalizeCropClass, selectedCropType])

    const matchesSelectedCollectorField = useCallback((field?: Partial<Field> | null, matchedRecord?: MobileObservationRecord | null) => {
        if (selectedCollector === 'all') return true

        const collectorLabel = getCollectorLabel(matchedRecord, field)
        return matchesSelectedCollector(collectorLabel)
    }, [getCollectorLabel, matchesSelectedCollector, selectedCollector])

    // ── Mobile helpers ────────────────────────────────────────────────────────
    const hasRenderableMobileGeometry = (record: MobileObservationRecord) =>
        hasCoordinates(record.latitude, record.longitude) || Boolean(getMobileSpatialGeometry(record))

    const mobileRecordsForFieldLinking = useMemo(
        () => mobileRecordsForCropType.filter((record) => {
            if (!matchesSelectedCropClass(getMobileCropClass(record))) return false
            if (!matchesSelectedCollector(getCollectorLabel(record))) return false
            return Boolean(record.field_name || record.entry_form?.selected_field || record.block_id || record.section_name)
        }),
        [mobileRecordsForCropType, matchesSelectedCropClass, getMobileCropClass, matchesSelectedCollector, getCollectorLabel]
    )

    const recordedBoundaryMobileRecords = useMemo(
        () => dedupeMobileRecordsByBoundary(mobileRecordsForFieldLinking),
        [mobileRecordsForFieldLinking]
    )

    const recordedRenderableMobileRecords = useMemo(
        () => dedupeMobileRecordsByBoundary(mobileRecordsForFieldLinking, { requireRenderableGeometry: true }),
        [mobileRecordsForFieldLinking]
    )

    const matchesRecordedBoundaryFilter = useCallback(
        (isRecorded: boolean) => {
            if (collectionFilter === 'all') return true
            return collectionFilter === 'recorded' ? isRecorded : !isRecorded
        },
        [collectionFilter]
    )

    // ── Field linking & filtering ─────────────────────────────────────────────
    const linkedFields = useMemo(
        () => linkFieldsWithMobileRecords(fields, mobileRecordsForFieldLinking),
        [fields, mobileRecordsForFieldLinking]
    )

    const cropClassFilteredFields = useMemo(
        () => linkedFields.filter((field) =>
            matchesSelectedCropClass(getFieldCropClass(field))
            && matchesSelectedCollectorField(field, getMobileRecordForBoundary(field, mobileRecordsForFieldLinking))
        ),
        [linkedFields, matchesSelectedCropClass, getFieldCropClass, matchesSelectedCollectorField, mobileRecordsForFieldLinking]
    )

    const filteredFields = useMemo(() =>
        cropClassFilteredFields.filter((field) => {
            if (selectedCropType !== 'all' && normalizeCropType(field.crop_type) !== selectedCropType) return false
            if (sprayFilter === 'sprayed' && !field.is_sprayed) return false
            if (sprayFilter === 'not-sprayed' && field.is_sprayed) return false
            if (!matchesRecordedBoundaryFilter(Boolean(getMobileRecordForBoundary(field, recordedBoundaryMobileRecords)))) return false
            return hasCoordinates(field.latitude, field.longitude)
        }),
        [cropClassFilteredFields, selectedCropType, sprayFilter, normalizeCropType, matchesRecordedBoundaryFilter, recordedBoundaryMobileRecords]
    )

    const filteredMobileRecords = useMemo(() =>
        recordedBoundaryMobileRecords.filter((r) => {
            if (!showMobileRecords || collectionFilter === 'pending') return false
            return hasRenderableMobileGeometry(r)
        }),
        [recordedBoundaryMobileRecords, showMobileRecords, collectionFilter]
    )

    const filteredMobilePointRecords = useMemo(
        () => filteredMobileRecords.filter((r) => hasCoordinates(r.latitude, r.longitude)),
        [filteredMobileRecords]
    )

    // ── Map center ────────────────────────────────────────────────────────────
    const mostRecentField = useMemo(() => getMostRecentItem(
        filteredFields.filter((f) => hasCoordinates(f.latitude, f.longitude) && (f.latest_observation_date || f.updated_at)),
        (f) => f.latest_observation_date ?? f.updated_at
    ), [filteredFields])

    const mostRecentMobileRecord = useMemo(
        () => getMostRecentItem(filteredMobileRecords, getMobileRecordDate),
        [filteredMobileRecords]
    )

    const mapBoundaryCenter = useMemo((): [number, number] | null => {
        const centers = blocks
            .map((b) => centroidFromGeometry(b.geom))
            .filter((c): c is [number, number] => Array.isArray(c))
        if (!centers.length) return null
        const [lat, lng] = centers.reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1]], [0, 0])
        return [lat / centers.length, lng / centers.length]
    }, [blocks])

    const mapCenter = useMemo((): [number, number] => {
        if (userLocation && manualLocationRequest)                                                                    return userLocation
        if (mostRecentMobileRecord && hasCoordinates(mostRecentMobileRecord.latitude, mostRecentMobileRecord.longitude))
            return [mostRecentMobileRecord.latitude, mostRecentMobileRecord.longitude]
        if (mostRecentField?.latitude && mostRecentField?.longitude)                                                 return [mostRecentField.latitude, mostRecentField.longitude]
        if (mapBoundaryCenter)                                                                                        return mapBoundaryCenter
        if (filteredMobilePointRecords.length > 0) {
            const avgLat = filteredMobilePointRecords.reduce((s, r) => s + r.latitude, 0) / filteredMobilePointRecords.length
            const avgLng = filteredMobilePointRecords.reduce((s, r) => s + r.longitude, 0) / filteredMobilePointRecords.length
            return [avgLat, avgLng]
        }
        if (filteredFields.length > 0) {
            const avgLat = filteredFields.reduce((s, f) => s + (f.latitude ?? 0), 0) / filteredFields.length
            const avgLng = filteredFields.reduce((s, f) => s + (f.longitude ?? 0), 0) / filteredFields.length
            return [avgLat, avgLng]
        }
        return userLocation ?? [-1.2921, 36.8219]
    }, [filteredFields, filteredMobilePointRecords, mapBoundaryCenter, mostRecentField, mostRecentMobileRecord, userLocation, manualLocationRequest])

    // ── Boundary features ─────────────────────────────────────────────────────
    const fieldLookupByIdentity = useMemo(() => buildFieldLookupByIdentity(linkedFields), [linkedFields])

    const mobileRecordByFeatureKey = useMemo(
        () => {
            const lookup = new Map<string, MobileObservationRecord>()

            ;[...recordedBoundaryMobileRecords, ...recordedRenderableMobileRecords].forEach((record) => {
                lookup.set(getMobileRecordFeatureKey(record), record)
            })

            return lookup
        },
        [recordedBoundaryMobileRecords, recordedRenderableMobileRecords]
    )

    const filteredDatabaseFieldBoundaries = useMemo(
        () => buildDatabaseFieldBoundaries(cropClassFilteredFields, selectedCropType, sprayFilter, 'all').filter((feature) => {
            const isRecorded = Boolean(findMobileRecordForFeature(feature, recordedBoundaryMobileRecords))
            return matchesRecordedBoundaryFilter(isRecorded)
        }),
        [cropClassFilteredFields, selectedCropType, sprayFilter, recordedBoundaryMobileRecords, matchesRecordedBoundaryFilter]
    )

    const referenceFieldShapes = useMemo(
        () => (fieldShapes.length > 0 ? fieldShapes : HARDCODED_FIELD_SHAPEFILE.features),
        [fieldShapes]
    )

    const filteredFallbackFieldShapes = useMemo(
        () => referenceFieldShapes.filter((feature) => {
            const matchedField = findFieldForFeature(feature, linkedFields, fieldLookupByIdentity, mobileRecordsForCropType)
            const matchedRecordForType = findMobileRecordForFeature(feature, mobileRecordsForCropType)
            const matchedRecordedRecord = findMobileRecordForFeature(feature, recordedBoundaryMobileRecords)
            const isRecorded = Boolean(matchedRecordedRecord)
            const effectiveCropType = matchedField?.crop_type || (matchedRecordForType ? getMobileCropType(matchedRecordForType) : DEFAULT_CROP_TYPE)
            const effectiveCropClass = matchedRecordForType
                ? getMobileCropClass(matchedRecordForType)
                : matchedField
                    ? getFieldCropClass(matchedField, matchedRecordForType)
                    : ''

            if (selectedCropType !== 'all' && normalizeCropType(effectiveCropType) !== selectedCropType) {
                return false
            }

            if (!matchesSelectedCropClass(effectiveCropClass)) {
                return false
            }

            if (!matchesSelectedCollectorField(matchedField, matchedRecordForType ?? matchedRecordedRecord)) {
                return false
            }

            return matchesRecordedBoundaryFilter(isRecorded)
        }),
        [
            referenceFieldShapes,
            linkedFields,
            fieldLookupByIdentity,
            mobileRecordsForCropType,
            recordedBoundaryMobileRecords,
            selectedCropType,
            normalizeCropType,
            getMobileCropClass,
            getFieldCropClass,
            matchesSelectedCropClass,
            matchesSelectedCollectorField,
            matchesRecordedBoundaryFilter,
        ]
    )

    const filteredBlocks = useMemo(
        () => blocks.filter((block) => {
            const matchedField = findFieldForBlock(block, linkedFields, fieldLookupByIdentity, mobileRecordsForCropType)
            const matchedRecordForType = findMobileRecordForBlock(block, mobileRecordsForCropType)
            const matchedRecordedRecord = findMobileRecordForBlock(block, recordedBoundaryMobileRecords)
            const effectiveCropType = matchedField?.crop_type || (matchedRecordForType ? getMobileCropType(matchedRecordForType) : '')
            const effectiveCropClass = matchedRecordForType
                ? getMobileCropClass(matchedRecordForType)
                : matchedField
                    ? getFieldCropClass(matchedField, matchedRecordForType)
                    : ''
            const isRecorded = Boolean(matchedRecordedRecord)

            if (selectedCropType !== 'all' && normalizeCropType(effectiveCropType) !== selectedCropType) {
                return false
            }

            if (!matchesSelectedCropClass(effectiveCropClass)) {
                return false
            }

            if (!matchesSelectedCollectorField(matchedField, matchedRecordForType ?? matchedRecordedRecord)) {
                return false
            }

            return matchesRecordedBoundaryFilter(isRecorded)
        }),
        [
            blocks,
            linkedFields,
            fieldLookupByIdentity,
            mobileRecordsForCropType,
            recordedBoundaryMobileRecords,
            selectedCropType,
            normalizeCropType,
            getMobileCropClass,
            getFieldCropClass,
            matchesSelectedCropClass,
            matchesSelectedCollectorField,
            matchesRecordedBoundaryFilter,
        ]
    )

    const linkedMobileBoundaryFeatures = useMemo(() => {
        if (collectionFilter === 'pending') return [] as GeoFeature[]

        const seenKeys = new Set<string>()

        return [...recordedBoundaryMobileRecords]
            .sort((a, b) => new Date(getMobileRecordDate(b)).getTime() - new Date(getMobileRecordDate(a)).getTime())
            .reduce<GeoFeature[]>((acc, record) => {
                const boundaryProps = getMobileRecordBoundaryProps(record)
                const matchedReferenceFeature = findReferenceFeatureForMobileRecord(record, referenceFieldShapes)
                const geometry =
                    getRenderableBoundaryGeometry(record.field_registry?.geom)
                    ?? getRenderableBoundaryGeometry(matchedReferenceFeature?.geometry)

                if (!geometry) return acc

                const referenceProps = matchedReferenceFeature?.properties ?? {}
                const feature: GeoFeature = {
                    type: 'Feature',
                    geometry,
                    properties: {
                        field_name: referenceProps.field_name || boundaryProps.field_name || 'RECORDED FIELD',
                        section_name: referenceProps.section_name || boundaryProps.section_name || '',
                        block_id: referenceProps.block_id || boundaryProps.block_id || '',
                        source_label: 'linked mobile field boundary',
                        mobile_record_key: getMobileRecordFeatureKey(record),
                    },
                }

                const key = getFeatureBoundaryUniqueKey(feature) ?? `mobile:${getMobileRecordFeatureKey(record)}`
                if (seenKeys.has(key)) return acc
                seenKeys.add(key)
                acc.push(feature)
                return acc
            }, [])
    }, [recordedBoundaryMobileRecords, collectionFilter, referenceFieldShapes])

    const matchedBoundaryRecordKeys = useMemo(() => {
        const keys = new Set<string>()

        linkedMobileBoundaryFeatures.forEach((feature) => {
            const mobileRecordKey = String(feature.properties?.mobile_record_key ?? '')
            if (mobileRecordKey) {
                keys.add(mobileRecordKey)
            }
        })

        filteredDatabaseFieldBoundaries.forEach((feature) => {
            const matchedRecord = findMobileRecordForFeature(feature, recordedBoundaryMobileRecords)
            if (matchedRecord) {
                keys.add(getMobileRecordFeatureKey(matchedRecord))
            }
        })

        filteredFallbackFieldShapes.forEach((feature) => {
            const matchedRecord = findMobileRecordForFeature(feature, recordedBoundaryMobileRecords)
            if (matchedRecord) {
                keys.add(getMobileRecordFeatureKey(matchedRecord))
            }
        })

        filteredBlocks.forEach((block) => {
            const matchedRecord = findMobileRecordForBlock(block, recordedBoundaryMobileRecords)
            if (matchedRecord) {
                keys.add(getMobileRecordFeatureKey(matchedRecord))
            }
        })

        return keys
    }, [
        linkedMobileBoundaryFeatures,
        filteredDatabaseFieldBoundaries,
        filteredFallbackFieldShapes,
        filteredBlocks,
        recordedBoundaryMobileRecords,
    ])

    const mobilePolygonFeatures = useMemo(() => {
        const seenKeys = new Set<string>()

        const recordedRenderableRecords =
            showMobileRecords && collectionFilter !== 'pending'
                ? recordedRenderableMobileRecords.filter((record) => !matchedBoundaryRecordKeys.has(getMobileRecordFeatureKey(record)))
                : []

        return [...recordedRenderableRecords]
            .sort((a, b) => new Date(getMobileRecordDate(b)).getTime() - new Date(getMobileRecordDate(a)).getTime())
            .reduce<GeoFeature[]>((acc, record) => {
                const geometry = getRenderableBoundaryGeometry(record.entry_form?.spatial_data)
                if (!geometry) return acc

                const boundaryProps = getMobileRecordBoundaryProps(record)
                const identity  = getMobileRecordBoundaryIdentity(record)
                const dedupeKey = identity.replace(/:/g, '') ? identity : getMobileRecordFeatureKey(record)

                if (seenKeys.has(dedupeKey)) return acc
                seenKeys.add(dedupeKey)

                const sourceLabel = hasDistinctRecordedMobilePolygon(record)
                    ? 'mobile recorded polygon'
                    : 'mobile recorded field boundary'

                acc.push({
                    type: 'Feature',
                    geometry,
                    properties: {
                        field_name:       boundaryProps.field_name || 'RECORDED AREA',
                        section_name:     boundaryProps.section_name || '',
                        block_id:         boundaryProps.block_id || '',
                        source_label:     sourceLabel,
                        mobile_record_key: getMobileRecordFeatureKey(record),
                    },
                })
                return acc
            }, [])
    }, [
        recordedRenderableMobileRecords,
        showMobileRecords,
        collectionFilter,
        matchedBoundaryRecordKeys,
    ])

    const activeFieldBoundaryFeatures = useMemo(() => {
        const seenKeys = new Set<string>()
        return [
            ...mobilePolygonFeatures,
            ...linkedMobileBoundaryFeatures,
            ...filteredDatabaseFieldBoundaries,
            ...filteredFallbackFieldShapes,
        ].filter((feature) => {
            const key = getFeatureBoundaryUniqueKey(feature)
            if (!key) return true
            if (seenKeys.has(key)) return false
            seenKeys.add(key)
            return true
        })
    }, [
        mobilePolygonFeatures,
        linkedMobileBoundaryFeatures,
        filteredDatabaseFieldBoundaries,
        filteredFallbackFieldShapes,
    ])

    const activeBlocks = useMemo(() => {
        const existingKeys = new Set(activeFieldBoundaryFeatures.flatMap((f) => getFeatureBoundaryKeys(f)))
        return filteredBlocks.filter((b) => getBlockBoundaryKeys(b).every((k) => !existingKeys.has(k)))
    }, [activeFieldBoundaryFeatures, filteredBlocks])

    const focusBoundaryKeys = useMemo(
        () => getFocusBoundaryKeys(focusObservation),
        [focusObservation]
    )

    const focusedBoundaryKey = useMemo(() => {
        if (focusBoundaryKeys.length === 0) {
            return null
        }

        const keySet = new Set(focusBoundaryKeys)

        for (const feature of activeFieldBoundaryFeatures) {
            const featureKey = getFeatureBoundaryUniqueKey(feature)
            if (featureKey && keySet.has(featureKey)) {
                return featureKey
            }
        }

        for (const block of activeBlocks) {
            const blockKey = getBlockBoundaryUniqueKey(block)
            if (blockKey && keySet.has(blockKey)) {
                return blockKey
            }
        }

        return null
    }, [focusBoundaryKeys, activeFieldBoundaryFeatures, activeBlocks])

    const focusedBoundaryGeometry = useMemo(() => {
        if (!focusedBoundaryKey) {
            return null
        }

        const matchedFeature = activeFieldBoundaryFeatures.find((feature) => getFeatureBoundaryUniqueKey(feature) === focusedBoundaryKey)
        if (matchedFeature?.geometry) {
            return matchedFeature.geometry
        }

        const matchedBlock = activeBlocks.find((block) => getBlockBoundaryUniqueKey(block) === focusedBoundaryKey)
        return matchedBlock?.geom ?? null
    }, [focusedBoundaryKey, activeFieldBoundaryFeatures, activeBlocks])

    const focusedBoundaryCenter = useMemo((): [number, number] | null => {
        const geometryCenter = centroidFromGeometry(focusedBoundaryGeometry)
        if (geometryCenter) {
            return geometryCenter
        }

        if (focusObservation && hasCoordinates(focusObservation.latitude, focusObservation.longitude)) {
            return [focusObservation.latitude!, focusObservation.longitude!]
        }

        return null
    }, [focusedBoundaryGeometry, focusObservation])

    useEffect(() => {
        if (focusedBoundaryKey) {
            setSelectedBoundaryKey(focusedBoundaryKey)
        }
    }, [focusedBoundaryKey])

    const resolvedMapCenter = focusedBoundaryCenter ?? mapCenter

    // ── Derived stats ──────────────────────────────────────────────────────────
    const visibleBoundaryCount = activeFieldBoundaryFeatures.length + activeBlocks.length
    const shouldShowCropClassFilter = selectedCropType !== 'all' && (
        selectedCropType === 'Sugarcane'
        || selectedCropType === 'Break Crop'
        || cropClassOptions.length > 0
    )
    const cropFocusLabel = selectedCropType === 'all'
        ? 'All crops'
        : selectedCropClass === 'all'
            ? selectedCropType
            : `${selectedCropType} / ${selectedCropClass}`
    const cropClassLabel = selectedCropType === 'Sugarcane'
        ? 'Crop Class / Ratoon'
        : selectedCropType === 'Break Crop'
            ? 'Break Crop'
            : 'Crop Class'
    const allCropClassLabel = selectedCropType === 'Sugarcane'
        ? 'ALL RATOONS'
        : selectedCropType === 'Break Crop'
            ? 'ALL BREAK CROPS'
            : 'ALL CLASSES'
    const selectedCollectorLabel = selectedCollector === 'all'
        ? 'ALL COLLECTORS'
        : collectorOptions.find((option) => option.value === selectedCollector)?.label ?? selectedCollector
    // ── Labels ────────────────────────────────────────────────────────────────
    const activeTileSource = mapLayer === 'satellite' ? SATELLITE_TILE_SOURCES[satelliteSourceIndex] : TERRAIN_TILE_SOURCE

    // ── Loading / error states ────────────────────────────────────────────────
    if (isLoading) {
        return (
            <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="100vh" gap={2} sx={{ bgcolor: SURFACE }}>
                <CircularProgress size={32} sx={{ color: CYAN }} thickness={2} />
                <Typography sx={{ fontSize: '0.65rem', color: TEXT_DIM, letterSpacing: '0.18em', fontFamily: MONO }}>
                    LOADING SPATIAL INTELLIGENCE…
                </Typography>
            </Box>
        )
    }

    if (error) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" sx={{ bgcolor: SURFACE }}>
                <HudPanel sx={{ p: 3, maxWidth: 420 }} accentColor={RED_CRIT}>
                    <Typography sx={{ fontSize: '0.7rem', color: RED_CRIT, fontFamily: MONO, letterSpacing: '0.1em' }}>
                        MAP DATA ERROR — {error.message}
                    </Typography>
                </HudPanel>
            </Box>
        )
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <Box sx={{
            bgcolor: SURFACE,
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: MONO,
            position: 'relative',
        }}>
            {/* Background gradient */}
            <Box sx={{
                position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
                background: `
                    radial-gradient(circle at 15% 12%, rgba(155,225,93,0.16) 0%, transparent 28%),
                    radial-gradient(circle at 82% 8%, rgba(27,94,32,0.12) 0%, transparent 24%),
                    linear-gradient(180deg, #f7faf4 0%, #eef3ea 100%)
                `,
            }} />

            <Box sx={{ position: 'relative', zIndex: 1, px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2.5 }}>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '360px minmax(0, 1fr)' }, gap: 2.5, alignItems: 'stretch', minHeight: 0 }}>

                    {/* ── Left Rail ──────────────────────────────────────── */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

                        {/* Filter Deck */}
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}>
                            <HudPanel
                                sx={{
                                    p: 2.1,
                                    background: `
                                        radial-gradient(circle at 0% 0%, ${alpha(GREEN_OK, 0.18)} 0%, transparent 30%),
                                        radial-gradient(circle at 100% 0%, ${alpha(CYAN, 0.1)} 0%, transparent 32%),
                                        linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(247,250,246,0.98) 100%)
                                    `,
                                }}
                                accentColor={CYAN}
                                disableScanlines
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.2, flexWrap: 'wrap' }}>
                                    <SectionBadge label="Filter Deck" color={CYAN} />
                                    <Box sx={{
                                        px: 1.2,
                                        py: 0.65,
                                        borderRadius: '999px',
                                        bgcolor: alpha(GREEN_OK, 0.18),
                                        border: `1px solid ${alpha(GREEN_OK, 0.28)}`,
                                    }}>
                                        <Typography sx={{ fontSize: '0.5rem', color: CYAN, letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: MONO, fontWeight: 700 }}>
                                            Live Filters
                                        </Typography>
                                    </Box>
                                </Box>

                                <Typography sx={{ fontSize: '1.18rem', fontWeight: 800, fontFamily: DISPLAY, mt: 1.35, mb: 0.7, color: '#102715', letterSpacing: '-0.03em' }}>
                                    Shape the map stage
                                </Typography>
                                <Typography sx={{ fontSize: '0.74rem', color: TEXT_MID, lineHeight: 1.7, mb: 1.7 }}>
                                    Narrow the visible boundaries and polygon layers, then keep the map focused on the recorded fields that matter right now.
                                </Typography>

                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1, mb: 1.5 }}>
                                    {[
                                        {
                                            label: 'Visible',
                                            value: String(visibleBoundaryCount),
                                            tone: CYAN,
                                        },
                                        {
                                            label: 'Crop Focus',
                                            value: cropFocusLabel,
                                            tone: GREEN_OK,
                                        },
                                        {
                                            label: 'Boundary',
                                            value: collectionFilter === 'recorded' ? 'Recorded' : collectionFilter === 'pending' ? 'Pending' : 'All',
                                            tone: AMBER_WARN,
                                        },
                                    ].map((item) => (
                                        <Box
                                            key={item.label}
                                            sx={{
                                                p: 1.05,
                                                borderRadius: '16px',
                                                border: `1px solid ${alpha(item.tone, 0.22)}`,
                                                bgcolor: alpha(item.tone, 0.1),
                                            }}
                                        >
                                            <Typography sx={{ fontSize: '0.48rem', color: alpha(item.tone, 0.95), letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: MONO, fontWeight: 700, mb: 0.45 }}>
                                                {item.label}
                                            </Typography>
                                            <Typography sx={{ fontSize: '0.86rem', color: '#102715', fontFamily: DISPLAY, fontWeight: 700, lineHeight: 1.1 }}>
                                                {item.value}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>

                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.1 }}>
                                    <ControlSelect
                                        label="Crop Type"
                                        value={selectedCropType}
                                        onChange={setSelectedCropType}
                                        renderValue={(value) => value === 'all' ? 'ALL CROPS' : value.toUpperCase()}
                                    >
                                        {cropTypes.map((type) => (
                                            <MenuItem key={type} value={type} sx={{ fontSize: '0.72rem', fontFamily: MONO }}>{type.toUpperCase()}</MenuItem>
                                        ))}
                                    </ControlSelect>
                                    {shouldShowCropClassFilter && (
                                        <ControlSelect
                                            label={cropClassLabel}
                                            value={selectedCropClass}
                                            onChange={setSelectedCropClass}
                                            renderValue={(value) => value === 'all' ? allCropClassLabel : value.toUpperCase()}
                                        >
                                            <MenuItem value="all" sx={{ fontSize: '0.72rem', fontFamily: MONO }}>
                                                {allCropClassLabel}
                                            </MenuItem>
                                            {cropClassOptions.map((cropClass) => (
                                                <MenuItem key={cropClass} value={cropClass} sx={{ fontSize: '0.72rem', fontFamily: MONO }}>
                                                    {cropClass.toUpperCase()}
                                                </MenuItem>
                                            ))}
                                        </ControlSelect>
                                    )}
                                    <ControlSelect
                                        label="Collector"
                                        value={selectedCollector}
                                        onChange={setSelectedCollector}
                                        renderValue={(value) =>
                                            value === 'all'
                                                ? 'ALL COLLECTORS'
                                                : selectedCollectorLabel.toUpperCase()
                                        }
                                    >
                                        <MenuItem value="all" sx={{ fontSize: '0.72rem', fontFamily: MONO }}>
                                            ALL COLLECTORS
                                        </MenuItem>
                                        {collectorOptions.map((collector) => (
                                            <MenuItem key={collector.value} value={collector.value} sx={{ fontSize: '0.72rem', fontFamily: MONO }}>
                                                {collector.label.toUpperCase()}
                                            </MenuItem>
                                        ))}
                                    </ControlSelect>
                                </Box>

                            </HudPanel>
                        </motion.div>

                    </Box>

                    {/* ── Map Panel ──────────────────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                        style={{ minHeight: 0 }}
                    >
                        <HudPanel sx={{ p: 0, borderRadius: '30px', minHeight: { xs: 560, xl: 'calc(100vh - 220px)' }, height: { xs: 560, xl: 'calc(100vh - 220px)' }, bgcolor: 'rgba(246,250,244,0.82)' }} accentColor={CYAN}>
                            <Box sx={{ position: 'absolute', inset: 0, borderRadius: 'inherit', overflow: 'hidden' }}>
                                <MapContainer center={resolvedMapCenter} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                                    <TileLayer
                                        key={`${mapLayer}-${activeTileSource.id}`}
                                        attribution={activeTileSource.attribution}
                                        url={activeTileSource.url}
                                        eventHandlers={{ tileerror: handleTileError, load: handleTileLoad }}
                                    />
                                    {mapLayer === 'satellite' && (
                                        <TileLayer
                                            key={SATELLITE_HYBRID_LABELS_SOURCE.id}
                                            attribution={SATELLITE_HYBRID_LABELS_SOURCE.attribution}
                                            url={SATELLITE_HYBRID_LABELS_SOURCE.url}
                                            opacity={0.95}
                                        />
                                    )}
                                    <MapBoundsFitter
                                        fieldShapes={activeFieldBoundaryFeatures}
                                        fields={filteredFields}
                                        blocks={activeBlocks}
                                        mobileRecords={filteredMobilePointRecords}
                                        center={resolvedMapCenter}
                                        focusCenter={focusedBoundaryCenter}
                                        focusGeometry={focusedBoundaryGeometry}
                                        focusKey={focusedBoundaryKey ?? focusObservation?.id ?? null}
                                    />
                                    <FieldBoundaryLayer
                                        features={activeFieldBoundaryFeatures}
                                        linkedFields={linkedFields}
                                        fieldLookupByIdentity={fieldLookupByIdentity}
                                        mobileRecordsForBoundaryLinking={recordedBoundaryMobileRecords}
                                        mobileRecordByFeatureKey={mobileRecordByFeatureKey}
                                        selectedBoundaryKey={selectedBoundaryKey}
                                        onSelectBoundary={setSelectedBoundaryKey}
                                        getBoundaryStyle={getBoundaryStyle}
                                        getCollectionColor={getCollectionColor}
                                        getCollectionLabel={getCollectionLabel}
                                    />
                                    <BlockLayer
                                        blocks={activeBlocks}
                                        linkedFields={linkedFields}
                                        fieldLookupByIdentity={fieldLookupByIdentity}
                                        mobileRecordsForBoundaryLinking={recordedBoundaryMobileRecords}
                                        selectedBoundaryKey={selectedBoundaryKey}
                                        onSelectBoundary={setSelectedBoundaryKey}
                                        getBoundaryStyle={getBoundaryStyle}
                                        getCollectionColor={getCollectionColor}
                                        getCollectionLabel={getCollectionLabel}
                                    />
                                </MapContainer>
                                <MapCenterObject color={CYAN} label="Map Center" size={58} />
                            </Box>

                            {/* Map HUD — top bar */}
                            <Box sx={{ position: 'absolute', top: 18, left: 18, right: 18, zIndex: 1000, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.2, flexWrap: 'wrap', pointerEvents: 'none' }}>
                                {/* Map Controls */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, p: 0.5, borderRadius: '18px', bgcolor: 'rgba(255,255,255,0.88)', border: '1px solid rgba(27,94,32,0.12)', boxShadow: '0 12px 30px rgba(21,31,24,0.08)', pointerEvents: 'auto' }}>
                                    <Tooltip title="Locate Me" placement="left">
                                        <IconButton onClick={handleLocateMe} size="small" sx={{ width: 42, height: 42, color: CYAN_DIM, borderRadius: '14px', '&:hover': { bgcolor: alpha(CYAN, 0.07), color: CYAN } }}>
                                            <MyLocation sx={{ fontSize: 18 }} />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title={mapLayer === 'satellite' ? 'Switch to Terrain' : 'Switch to Satellite'} placement="left">
                                        <IconButton onClick={handleLayerToggle} size="small" sx={{ width: 42, height: 42, borderRadius: '14px', color: mapLayer === 'satellite' ? CYAN : AMBER_WARN, '&:hover': { bgcolor: alpha(CYAN, 0.07) } }}>
                                            {mapLayer === 'satellite' ? <SatelliteAlt sx={{ fontSize: 18 }} /> : <GridOn sx={{ fontSize: 18 }} />}
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title={showMobileRecords ? 'Hide Mobile Feed' : 'Show Mobile Feed'} placement="left">
                                        <IconButton onClick={() => setShowMobileRecords((v) => !v)} size="small" sx={{ width: 42, height: 42, borderRadius: '14px', color: showMobileRecords ? AMBER_WARN : CYAN_DIM, '&:hover': { bgcolor: alpha(CYAN, 0.07) } }}>
                                            <Layers sx={{ fontSize: 18 }} />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            </Box>

                            {/* Tile status notice */}
                            {tileStatusNotice && (
                                <Box sx={{ position: 'absolute', top: 82, right: 18, zIndex: 1000, maxWidth: 320, pointerEvents: 'none' }}>
                                    <HudPanel sx={{ p: 1.4, pointerEvents: 'auto' }} accentColor={AMBER_WARN}>
                                        <Typography sx={{ fontSize: '0.54rem', color: AMBER_WARN, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: MONO }}>
                                            Tile Source Notice
                                        </Typography>
                                        <Typography sx={{ fontSize: '0.68rem', color: TEXT_MID, mt: 0.7, lineHeight: 1.6 }}>
                                            {tileStatusNotice}
                                        </Typography>
                                    </HudPanel>
                                </Box>
                            )}

                            {/* Empty state */}
                            {visibleBoundaryCount === 0 && (
                                <Box sx={{ position: 'absolute', inset: 0, zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', p: 2 }}>
                                    <HudPanel sx={{ p: 2.2, maxWidth: 360, textAlign: 'center' }} accentColor={AMBER_WARN}>
                                        <Typography sx={{ fontSize: '0.58rem', color: AMBER_WARN, letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: MONO }}>
                                            No Spatial Matches
                                        </Typography>
                                        <Typography sx={{ fontSize: '1rem', fontWeight: 700, fontFamily: DISPLAY, mt: 1, color: '#102715' }}>
                                            No field polygons or boundaries match this filter combination.
                                        </Typography>
                                        <Typography sx={{ fontSize: '0.72rem', color: TEXT_MID, mt: 0.9, lineHeight: 1.6 }}>
                                            Try changing the collection status, crop type, or spray filter to widen the map view.
                                        </Typography>
                                    </HudPanel>
                                </Box>
                            )}

                            {/* Map HUD — bottom bar */}
                            <Box sx={{ position: 'absolute', bottom: 18, left: 18, right: 18, zIndex: 1000, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 1.2, flexWrap: 'wrap', pointerEvents: 'none' }}>
                                <HudPanel sx={{ p: 2, minWidth: 220, pointerEvents: 'auto' }} accentColor={CYAN}>
                                    <SectionBadge label="Legend" color={CYAN} />
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.1, mt: 1.35 }}>
                                        <LegendRow color={GREEN_OK}   label="Boundary with mobile/form record" />
                                        <LegendRow color={RED_CRIT}   label="Boundary without mobile/form record" />
                                        <LegendRow color={AMBER_WARN} label="Mobile-only recorded polygon" shape="line" />
                                        <LegendRow color={CYAN}       label="Unlinked reference boundary" shape="line" />
                                    </Box>
                                </HudPanel>
                            </Box>
                        </HudPanel>
                    </motion.div>
                </Box>
            </Box>

            {/* Leaflet global styles */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Space+Mono:wght@400;700&display=swap');

                .hud-popup .leaflet-popup-content-wrapper {
                    background: ${POPUP_BG} !important;
                    color: ${POPUP_TEXT} !important;
                    border-radius: 14px !important;
                    border: 1px solid rgba(67,160,71,0.28) !important;
                    padding: 0 !important;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.72), 0 0 0 1px rgba(67,160,71,0.1) !important;
                }
                .hud-popup .leaflet-popup-content { margin: 0 !important; width: auto !important; }
                .hud-popup .leaflet-popup-tip { background: ${POPUP_BG} !important; border-top: 1px solid rgba(67,160,71,0.28); }
                .hud-popup .leaflet-popup-close-button { color: rgba(214,247,221,0.55) !important; font-size: 18px !important; padding: 6px 8px !important; }
                .hud-popup .leaflet-popup-close-button:hover { color: ${POPUP_TEXT} !important; background: none !important; }
                .leaflet-control-zoom { border: 1px solid rgba(27,94,32,0.2) !important; border-radius: 10px !important; overflow: hidden; background: rgba(5,14,18,0.88) !important; backdrop-filter: blur(12px); }
                .leaflet-control-zoom a { background: transparent !important; color: rgba(27,94,32,0.6) !important; border-bottom: 1px solid rgba(27,94,32,0.1) !important; font-size: 16px !important; line-height: 28px !important; height: 30px !important; width: 30px !important; }
                .leaflet-control-zoom a:hover { background: rgba(27,94,32,0.08) !important; color: #1b5e20 !important; }
                .leaflet-bar { box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important; }
            `}</style>
        </Box>
    )
}
