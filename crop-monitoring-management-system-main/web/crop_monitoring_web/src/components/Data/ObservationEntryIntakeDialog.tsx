import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import L from 'leaflet';
import { MapContainer, Polygon, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import {
    createObservationEntryFormSubmission,
    createPredefinedField,
    getPredefinedFieldByName,
    uploadFinalEldanaSurveyPdf,
    uploadSoilTestPdf,
    uploadFoliarAnalysisPdf,
    type ObservationEntryFormSubmissionInput,
    type PredefinedField,
} from '@/services/database.service';
import { useAuth } from '@/contexts/AuthContext';
import {
    LIVE_PREDEFINED_FIELDS_QUERY_KEY,
    useLivePredefinedFields,
} from '@/hooks/useLivePredefinedFields';
import { LIVE_DATA_UPDATED_EVENT } from '@/lib/liveData';
import {
    SATELLITE_HYBRID_LABELS_SOURCE,
    SATELLITE_TILE_SOURCES,
} from '@/pages/mapView.utils';
import type {
    FertilizerApplication,
    HerbicideApplication,
    ObservationEntryForm,
    SugarcaneMonitoringRecord,
} from '@/types/database.types';
import { SUGARCANE_CROP_CLASS_OPTIONS } from '@/utils/cropClassOptions';
import { FALLOW_PERIOD_CROP_CLASS_LABEL } from '@/utils/cropGrouping';
import { buildObservationCalendarSearch } from '@/utils/farmingCalendarLinks';
import { parseKMLFile, extractGeometryFromKML, isValidKMLFile, extractPointsFromKML, createPolygonFromPoints, sortPointsForPolygon, type KMLParseResult, type KMLPoint } from '@/utils/kmlImport';

interface ObservationEntryIntakeDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmitted: () => Promise<void> | void;
    onSaved?: (message: string) => void;
    existingRecords: SugarcaneMonitoringRecord[];
}

const IRRIGATION_TYPE_OPTIONS = [
    'Furrow',
    'Overhead Sprinkler',
    'Center Pivot',
    'Sub Surface Drip',
];

const WATER_SOURCE_OPTIONS = ['Dam 1', 'Dam 2', 'Dam 3'];
const CONTACT_PERSON_OPTIONS = [
    'DR L.T. MPOFU',
    'DR T.P. CHIBARABADA',
    'DR G. MABAYA',
    'MR S. CHINORUMBA',
    'MR P. ZVOUTETE',
    'C MUKANGA',
    'MR SHAYANOWAKO',
];
const CONTACT_PERSON_ALIAS_LOOKUP = new Map<string, string>([
    ['drltmpofu', 'DR L.T. MPOFU'],
    ['drmpofu', 'DR L.T. MPOFU'],
    ['drtpchibarabada', 'DR T.P. CHIBARABADA'],
    ['drchibarabada', 'DR T.P. CHIBARABADA'],
    ['drgmabaya', 'DR G. MABAYA'],
    ['drmabaya', 'DR G. MABAYA'],
    ['mrschinorumba', 'MR S. CHINORUMBA'],
    ['mrchinorumba', 'MR S. CHINORUMBA'],
    ['mrpzvoutete', 'MR P. ZVOUTETE'],
    ['mrzvoutete', 'MR P. ZVOUTETE'],
    ['cmukanga', 'C MUKANGA'],
    ['mrmukanga', 'C MUKANGA'],
    ['mrshayanowako', 'MR SHAYANOWAKO'],
    ['shayanowako', 'MR SHAYANOWAKO'],
]);
const SOIL_TYPE_OPTIONS = [
    'SAND',
    'LOAMY SAND',
    'SANDY LOAM (SAL)',
    'LOAM',
    'SILT LOAM',
    'SILT',
    'SACL',
    'CLAY LOAM',
    'SILTY CLAY LOAM',
    'SANDY CLAY (SAC)',
    'SILTY CLAY',
    'CLAY',
];
const SOIL_TYPE_ALIAS_LOOKUP = new Map<string, string>([
    ['SANDY LOAM', 'SANDY LOAM (SAL)'],
    ['SAL', 'SANDY LOAM (SAL)'],
    ['SANDY CLAY', 'SANDY CLAY (SAC)'],
    ['SAC', 'SANDY CLAY (SAC)'],
    ['SANDY CLAY LOAM', 'SACL'],
    ['SACL', 'SACL'],
]);
const CROP_TYPE_OPTIONS = ['Sugarcane', 'Break Crop', 'Fallow Period'];
const BREAK_CROP_CLASS_OPTIONS = ['Soyabeans', 'Sugarbeans', 'Sunnhemp', 'Velvet Beans', 'Maize'];
const FALLOW_CROP_CLASS_OPTIONS = [FALLOW_PERIOD_CROP_CLASS_LABEL];
const RESIDUE_TYPE_OPTIONS = ['Soyabeans', 'Sugarbeans', 'Sunnhemp', 'Velvet Beans', 'Sugarcane', 'None'];
const RESIDUE_MANAGEMENT_METHOD_OPTIONS = ['Ploughed in', 'Parting', 'Broadcasting', 'None'];
const DRAW_NEW_FIELD_VALUE = '__draw_new_field__';
const UPLOAD_KML_FIELD_VALUE = '__upload_kml_field__';
const DEFAULT_DRAW_CENTER: [number, number] = [-18.922, 31.134];
const MAX_APPLICATION_LOOPS = 10;
const WHITE_SELECT_MENU_PROPS = {
    PaperProps: {
        sx: {
            mt: 0.8,
            borderRadius: '18px',
            border: '1px solid rgba(86,184,112,0.22)',
            bgcolor: '#ffffff',
            background: '#ffffff',
            backgroundImage: 'none',
            backdropFilter: 'none',
            boxShadow: '0 22px 42px rgba(35,64,52,0.16)',
            maxHeight: '70vh',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            '& .MuiMenu-list': {
                py: 0.5,
                bgcolor: '#ffffff',
            },
            '& .MuiMenuItem-root': {
                bgcolor: '#ffffff',
                whiteSpace: 'normal',
                lineHeight: 1.35,
            },
            '& .MuiMenuItem-root.Mui-selected': {
                bgcolor: 'rgba(86,184,112,0.14)',
            },
            '& .MuiMenuItem-root.Mui-selected:hover': {
                bgcolor: 'rgba(86,184,112,0.2)',
            },
            '& .MuiMenuItem-root:hover': {
                bgcolor: 'rgba(244,162,140,0.12)',
            },
        },
    },
};

function normalizeSoilTypeLabel(value?: string | null) {
    const normalized = String(value ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
    if (!normalized) return '';
    return SOIL_TYPE_ALIAS_LOOKUP.get(normalized) ?? normalized;
}

function getContactPersonLookupKey(value?: string | null) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

function normalizeContactPersonLabel(value?: string | null) {
    const key = getContactPersonLookupKey(value);
    if (!key) return '';
    return CONTACT_PERSON_ALIAS_LOOKUP.get(key) ?? String(value ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
}

type DrawPoint = [number, number];

function buildPolygonGeometryFromPoints(points: DrawPoint[]): { type: 'Polygon'; coordinates: number[][][] } | undefined {
    if (points.length < 3) {
        return undefined;
    }

    const ring = points.map(([latitude, longitude]) => [longitude, latitude]);
    const [firstLongitude, firstLatitude] = ring[0];

    return {
        type: 'Polygon',
        coordinates: [[
            ...ring,
            [firstLongitude, firstLatitude],
        ]],
    };
}

function getPointCentroid(points: DrawPoint[]): { latitude: number; longitude: number } | null {
    if (points.length === 0) {
        return null;
    }

    const latitude = points.reduce((sum, [value]) => sum + value, 0) / points.length;
    const longitude = points.reduce((sum, [, value]) => sum + value, 0) / points.length;

    return {
        latitude: Number(latitude.toFixed(6)),
        longitude: Number(longitude.toFixed(6)),
    };
}

function DrawingMapClickCapture({ onAddPoint }: { onAddPoint: (point: DrawPoint) => void }) {
    useMapEvents({
        click(event) {
            onAddPoint([
                Number(event.latlng.lat.toFixed(6)),
                Number(event.latlng.lng.toFixed(6)),
            ]);
        },
    });

    return null;
}

function DrawingMapViewport({
    points,
    fallbackCenter,
}: {
    points: DrawPoint[]
    fallbackCenter: [number, number]
}) {
    const map = useMap();

    useEffect(() => {
        if (points.length === 0) {
            map.setView(fallbackCenter, 14, { animate: true });
            return;
        }

        const bounds = L.latLngBounds(points.map(([latitude, longitude]) => [latitude, longitude] as [number, number]));
        if (bounds.isValid()) {
            map.fitBounds(bounds.pad(0.35), { padding: [18, 18], animate: true, duration: 0.8 });
        }
    }, [fallbackCenter, map, points]);

    return null;
}

function createEmptySubmission(collectorId: string): ObservationEntryFormSubmissionInput {
    return {
        collector_id: collectorId,
        selected_field: '',
        field_id: '',
        section_name: '',
        field_name: '',
        block_id: '',
        area: undefined,
        block_size: undefined,
        geom_polygon: undefined,
        latitude: 0,
        longitude: 0,
        gps_accuracy: 0,
        date_recorded: '',
        trial_number: '',
        trial_name: '',
        contact_person: '',
        phone_country_code: '',
        phone_number: '',
        crop_type: 'Sugarcane',
        crop_class: '',
        variety: '',
        ploughing_date: '',
        planting_date: '',
        soil_sampling_date: '',
        soil_test_pdf_url: '',
        foliar_analysis_pdf_url: '',
        final_eldana_survey_pdf_url: '',
        previous_cutting_date: '',
        cutting_date: '',
        expected_harvest_date: '',
        irrigation_type: '',
        water_source: '',
        tam_mm: '',
        tamm_area: undefined,
        soil_type: '',
        soil_ph: undefined,
        field_remarks: '',
        residue_type: '',
        residue_management_method: '',
        residual_management_remarks: '',
        fertilizer_type: '',
        nutrient_application_date: '',
        application_rate: undefined,
        fertilizer_applications: [],
        foliar_sampling_date: '',
        herbicide_name: '',
        weed_application_date: '',
        weed_application_rate: undefined,
        herbicide_applications: [],
        pest_remarks: '',
        disease_remarks: '',
        harvest_date: '',
        yield: undefined,
        quality_remarks: '',
        remarks: '',
    };
}

function isPdfFile(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function buildPdfFieldKey(formData: ObservationEntryFormSubmissionInput): string {
    return [
        formData.section_name,
        formData.block_id,
        formData.field_name,
    ].filter(Boolean).join('_') || 'unknown';
}

function parseOptionalNumericInput(value: string): number | undefined {
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    const compact = trimmed.replace(/\s+/g, '').replace(/[^0-9,.-]/g, '');
    if (!compact) return undefined;

    let candidate = compact;
    const hasComma = candidate.includes(',');
    const hasDot = candidate.includes('.');

    if (hasComma && hasDot) {
        candidate = candidate.lastIndexOf(',') > candidate.lastIndexOf('.')
            ? candidate.replace(/\./g, '').replace(/,/g, '.')
            : candidate.replace(/,/g, '');
    } else if (hasComma) {
        candidate = candidate.replace(/,/g, '.');
    }

    const parsed = Number(candidate);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function getCropClassOptionsForCropType(cropType?: string | null): string[] {
    const normalized = (cropType ?? '').trim().toLowerCase();

    if (normalized === 'break crop') {
        return BREAK_CROP_CLASS_OPTIONS;
    }

    if (normalized === 'fallow period' || normalized === 'furrow period') {
        return FALLOW_CROP_CLASS_OPTIONS;
    }

    return SUGARCANE_CROP_CLASS_OPTIONS;
}

function normalizeGeometry(value: any): any | null {
    if (!value) return null;
    if (typeof value === 'string') {
        try {
            return normalizeGeometry(JSON.parse(value));
        } catch {
            return null;
        }
    }
    if (value.type === 'Feature') return normalizeGeometry(value.geometry);
    if (value.type === 'FeatureCollection') return normalizeGeometry(value.features?.[0]?.geometry);
    if (value.geometry) return normalizeGeometry(value.geometry);
    if (value.geom) return normalizeGeometry(value.geom);
    return value;
}

function getMetersPerDegreeLatitude(latitude: number): number {
    const radians = latitude * (Math.PI / 180);
    return 111132.92 - 559.82 * Math.cos(2 * radians) + 1.175 * Math.cos(4 * radians);
}

function getMetersPerDegreeLongitude(latitude: number): number {
    const radians = latitude * (Math.PI / 180);
    return 111412.84 * Math.cos(radians) - 93.5 * Math.cos(3 * radians);
}

function getRingAreaSqMeters(ring: number[][]): number {
    if (!Array.isArray(ring) || ring.length < 3) {
        return 0;
    }

    const latitudes = ring
        .map((point) => Number(point?.[1]))
        .filter((value) => Number.isFinite(value));

    if (latitudes.length === 0) {
        return 0;
    }

    const meanLatitude = latitudes.reduce((sum, value) => sum + value, 0) / latitudes.length;
    const metersPerLat = getMetersPerDegreeLatitude(meanLatitude);
    const metersPerLon = getMetersPerDegreeLongitude(meanLatitude);

    let area = 0;

    for (let index = 0; index < ring.length; index += 1) {
        const current = ring[index] ?? [];
        const next = ring[(index + 1) % ring.length] ?? [];
        const currentX = Number(current[0]) * metersPerLon;
        const currentY = Number(current[1]) * metersPerLat;
        const nextX = Number(next[0]) * metersPerLon;
        const nextY = Number(next[1]) * metersPerLat;

        if (![currentX, currentY, nextX, nextY].every(Number.isFinite)) {
            continue;
        }

        area += currentX * nextY - nextX * currentY;
    }

    return Math.abs(area) / 2;
}

function getPolygonAreaSqMeters(rings: number[][][]): number {
    if (!Array.isArray(rings) || rings.length === 0) {
        return 0;
    }

    const [outerRing = [], ...holes] = rings;
    const outerArea = getRingAreaSqMeters(outerRing);
    const holeArea = holes.reduce((sum, ring) => sum + getRingAreaSqMeters(ring), 0);
    return Math.max(outerArea - holeArea, 0);
}

function estimateGeometryAreaHa(geometry: any): number | undefined {
    const normalized = normalizeGeometry(geometry);
    if (!normalized?.type) {
        return undefined;
    }

    let areaSqMeters = 0;

    if (normalized.type === 'Polygon') {
        areaSqMeters = getPolygonAreaSqMeters(normalized.coordinates ?? []);
    } else if (normalized.type === 'MultiPolygon') {
        areaSqMeters = (normalized.coordinates ?? [])
            .reduce((sum: number, polygon: number[][][]) => sum + getPolygonAreaSqMeters(polygon), 0);
    }

    if (!Number.isFinite(areaSqMeters) || areaSqMeters <= 0) {
        return undefined;
    }

    return Number((areaSqMeters / 10_000).toFixed(2));
}

function inferFieldIdFromKMLFeatureName(value?: string | null): string {
    const raw = String(value ?? '').trim();
    if (!raw || raw.toLowerCase() === 'unnamed feature') {
        return '';
    }

    const cleaned = raw
        .replace(/\s*[-_]\s*(polygon|multi\s*polygon|multipolygon|boundary|field)\s*$/i, '')
        .replace(/\s+(polygon|multi\s*polygon|multipolygon|boundary|field)\s*$/i, '')
        .trim();

    return cleaned || raw;
}

function SectionHeading({ title }: { title: string }) {
    return (
        <Typography
            variant="subtitle2"
            sx={{
                color: 'text.secondary',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
            }}
        >
            {title}
        </Typography>
    );
}

function buildFreshFormData(
    currentSubmission: ObservationEntryFormSubmissionInput,
    collectorId: string,
    matchedField?: PredefinedField
): ObservationEntryFormSubmissionInput {
    const empty = createEmptySubmission(collectorId);
    const preserved = {
        ...currentSubmission,
        collector_id: collectorId,
    };
    const resolvedCropType = matchedField?.crop_type || preserved.crop_type || empty.crop_type;
    if (!matchedField) {
        return {
            ...preserved,
            selected_field: '',
            field_id: '',
            field_name: '',
            section_name: '',
            block_id: '',
            area: undefined,
            block_size: undefined,
            latitude: 0,
            longitude: 0,
            spatial_data: undefined,
            geom_polygon: undefined,
            crop_type: resolvedCropType,
            expected_harvest_date: preserved.expected_harvest_date || '',
        };
    }

    const fieldArea = matchedField.area ?? estimateGeometryAreaHa(matchedField.geom);

    return {
        ...preserved,
        field_id: matchedField.field_name,
        selected_field: matchedField.field_name,
        field_name: matchedField.field_name,
        section_name: matchedField.section_name,
        block_id: matchedField.block_id,
        area: fieldArea,
        block_size: fieldArea,
        latitude: matchedField.latitude ?? empty.latitude,
        longitude: matchedField.longitude ?? empty.longitude,
        spatial_data: matchedField.geom ?? undefined,
        geom_polygon: matchedField.geom ?? undefined,
        crop_type: resolvedCropType,
        expected_harvest_date: preserved.expected_harvest_date || '',
        irrigation_type: matchedField.irrigation_type || preserved.irrigation_type || '',
        water_source: matchedField.water_source || preserved.water_source || '',
        tam_mm: matchedField.tam_mm || preserved.tam_mm || '',
        tamm_area: matchedField.tamm_area ?? preserved.tamm_area,
        soil_type: normalizeSoilTypeLabel(matchedField.soil_type || preserved.soil_type),
        soil_ph: matchedField.soil_ph ?? preserved.soil_ph,
    };
}

function buildFollowUpTrialUpdateData(
    currentSubmission: ObservationEntryFormSubmissionInput,
    collectorId: string,
    matchedField?: PredefinedField
): ObservationEntryFormSubmissionInput {
    return {
        ...buildFreshFormData(currentSubmission, collectorId, matchedField),
        date_recorded: '',
    };
}

function buildEmptyFertilizerApplication(): FertilizerApplication {
    return {
        fertilizer_type: '',
        application_date: '',
        application_rate: undefined,
        foliar_sampling_date: '',
    };
}

function buildEmptyHerbicideApplication(): HerbicideApplication {
    return {
        herbicide_name: '',
        application_date: '',
        application_rate: undefined,
    };
}

function normalizeDateInputValue(value?: string | null): string {
    if (!value) return '';

    const directDate = value.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(directDate)) {
        return directDate;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toISOString().slice(0, 10);
}

function normalizeFertilizerApplicationInput(value: FertilizerApplication | null | undefined): FertilizerApplication | null {
    if (!value) return null;

    const fertilizerType = String(value.fertilizer_type ?? '').trim();
    const applicationDate = normalizeDateInputValue(value.application_date);
    const applicationRate = typeof value.application_rate === 'number' && Number.isFinite(value.application_rate)
        ? value.application_rate
        : undefined;
    const foliarSamplingDate = normalizeDateInputValue(value.foliar_sampling_date);

    if (!fertilizerType && !applicationDate && applicationRate == null && !foliarSamplingDate) {
        return null;
    }

    return {
        fertilizer_type: fertilizerType,
        application_date: applicationDate || undefined,
        application_rate: applicationRate,
        foliar_sampling_date: foliarSamplingDate || undefined,
    };
}

function normalizeHerbicideApplicationInput(value: HerbicideApplication | null | undefined): HerbicideApplication | null {
    if (!value) return null;

    const herbicideName = String(value.herbicide_name ?? '').trim();
    const applicationDate = normalizeDateInputValue(value.application_date);
    const applicationRate = typeof value.application_rate === 'number' && Number.isFinite(value.application_rate)
        ? value.application_rate
        : undefined;

    if (!herbicideName && !applicationDate && applicationRate == null) {
        return null;
    }

    return {
        herbicide_name: herbicideName,
        application_date: applicationDate || undefined,
        application_rate: applicationRate,
    };
}

function getCurrentFertilizerApplication(
    applications: FertilizerApplication[]
): FertilizerApplication | null {
    if (applications.length === 0) {
        return null;
    }

    let best = applications[0] ?? null;
    let bestDate = best ? new Date(String(best.application_date ?? '')).getTime() : Number.NaN;

    for (const application of applications.slice(1)) {
        const nextDate = new Date(String(application.application_date ?? '')).getTime();

        if (!Number.isFinite(nextDate) && !Number.isFinite(bestDate)) {
            best = application;
            continue;
        }

        if (Number.isFinite(nextDate) && (!Number.isFinite(bestDate) || nextDate >= bestDate)) {
            best = application;
            bestDate = nextDate;
        }
    }

    return best;
}

function getCurrentFertilizerApplicationIndex(
    applications: FertilizerApplication[]
): number {
    if (applications.length === 0) {
        return 0;
    }

    let bestIndex = 0;
    let bestDate = new Date(String(applications[0]?.application_date ?? '')).getTime();

    for (let index = 1; index < applications.length; index += 1) {
        const nextDate = new Date(String(applications[index]?.application_date ?? '')).getTime();

        if (!Number.isFinite(nextDate) && !Number.isFinite(bestDate)) {
            bestIndex = index;
            continue;
        }

        if (Number.isFinite(nextDate) && (!Number.isFinite(bestDate) || nextDate >= bestDate)) {
            bestIndex = index;
            bestDate = nextDate;
        }
    }

    return bestIndex;
}

function getCurrentHerbicideApplication(
    applications: HerbicideApplication[]
): HerbicideApplication | null {
    if (applications.length === 0) {
        return null;
    }

    let best = applications[0] ?? null;
    let bestDate = best ? new Date(String(best.application_date ?? '')).getTime() : Number.NaN;

    for (const application of applications.slice(1)) {
        const nextDate = new Date(String(application.application_date ?? '')).getTime();

        if (!Number.isFinite(nextDate) && !Number.isFinite(bestDate)) {
            best = application;
            continue;
        }

        if (Number.isFinite(nextDate) && (!Number.isFinite(bestDate) || nextDate >= bestDate)) {
            best = application;
            bestDate = nextDate;
        }
    }

    return best;
}

function normalizeLookupValue(value?: string | number | null): string {
    return String(value ?? '').trim().toLowerCase();
}

function getEntryTimestamp(entry: SugarcaneMonitoringRecord): number {
    const candidate = entry.date_recorded || entry.updated_at || entry.created_at;
    if (!candidate) {
        return 0;
    }

    const timestamp = new Date(candidate).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
}

function matchesFieldObservation(field: PredefinedField, entry: SugarcaneMonitoringRecord): boolean {
    const fieldName = normalizeLookupValue(field.field_name);
    const blockId = normalizeLookupValue(field.block_id);
    const sectionName = normalizeLookupValue(field.section_name);

    const entryFieldNames = [
        entry.field_name,
        entry.field_id,
    ].map((value) => normalizeLookupValue(value));

    const hasFieldNameMatch = entryFieldNames.some((value) => value && value === fieldName);
    const entryBlockId = normalizeLookupValue(entry.block_id);
    const entrySectionName = normalizeLookupValue(entry.section_name);

    if (blockId && entryBlockId && blockId === entryBlockId) {
        if (!fieldName) {
            return true;
        }

        return hasFieldNameMatch;
    }

    if (!hasFieldNameMatch) {
        return false;
    }

    if (sectionName && entrySectionName && sectionName !== entrySectionName) {
        return false;
    }

    return true;
}

function findLatestRecordForField(
    field: PredefinedField,
    records: SugarcaneMonitoringRecord[]
): SugarcaneMonitoringRecord | null {
    return records
        .filter((entry) => matchesFieldObservation(field, entry))
        .sort((left, right) => getEntryTimestamp(right) - getEntryTimestamp(left))[0] ?? null;
}

function isObservationEntryFormRecord(
    entry: ObservationEntryForm | SugarcaneMonitoringRecord
): entry is ObservationEntryForm {
    return 'selected_field' in entry || 'spatial_data' in entry || 'gps_accuracy' in entry;
}

function buildLoadedSavedRecordData(
    savedEntry: ObservationEntryForm | SugarcaneMonitoringRecord,
    collectorId: string,
    matchedField?: PredefinedField
): ObservationEntryFormSubmissionInput {
    const isEntryForm = isObservationEntryFormRecord(savedEntry);
    const selectedField = matchedField?.field_name
        || (isEntryForm ? savedEntry.selected_field : undefined)
        || savedEntry.field_name
        || savedEntry.field_id
        || '';
    const fieldId = savedEntry.field_id || matchedField?.field_name || savedEntry.field_name || '';
    const fieldName = matchedField?.field_name || savedEntry.field_name || savedEntry.field_id || '';
    const sectionName = matchedField?.section_name || savedEntry.section_name || '';
    const blockId = matchedField?.block_id || savedEntry.block_id || '';
    const area = isEntryForm
        ? savedEntry.area ?? savedEntry.block_size
        : savedEntry.area;
    const blockSize = isEntryForm
        ? savedEntry.block_size ?? savedEntry.area
        : savedEntry.area;
    const spatialData = isEntryForm
        ? savedEntry.spatial_data ?? savedEntry.geom_polygon
        : savedEntry.geom_polygon;
    const geomPolygon = isEntryForm
        ? savedEntry.geom_polygon ?? savedEntry.spatial_data
        : savedEntry.geom_polygon;
    const latitude = savedEntry.latitude;
    const longitude = savedEntry.longitude;
    const previousCuttingDate = isEntryForm
        ? savedEntry.previous_cutting_date || savedEntry.cutting_date || ''
        : savedEntry.previous_cutting_date || savedEntry.previous_cutting || '';
    const cuttingDate = isEntryForm
        ? savedEntry.cutting_date || savedEntry.previous_cutting_date || ''
        : savedEntry.previous_cutting_date || savedEntry.previous_cutting || '';
    const nutrientApplicationDate = isEntryForm
        ? savedEntry.nutrient_application_date || ''
        : savedEntry.nutrient_application_date || savedEntry.fertilizer_application_date || '';
    const tamArea = isEntryForm ? savedEntry.tamm_area : undefined;
    const fertilizerApplications = (savedEntry.fertilizer_applications ?? [])
        .map((item) => normalizeFertilizerApplicationInput(item))
        .filter((item): item is FertilizerApplication => item !== null);
    const herbicideApplications = (savedEntry.herbicide_applications ?? [])
        .map((item) => normalizeHerbicideApplicationInput(item))
        .filter((item): item is HerbicideApplication => item !== null);
    const remarks = savedEntry.remarks || savedEntry.field_remarks || '';
    const derivedExpectedHarvestDate = savedEntry.expected_harvest_date || '';

    const loaded = buildFreshFormData(
        {
            ...savedEntry,
            selected_field: selectedField,
            field_id: fieldId,
            field_name: fieldName,
            section_name: sectionName,
            block_id: blockId,
            area,
            block_size: blockSize,
            spatial_data: spatialData,
            geom_polygon: geomPolygon,
            latitude: latitude ?? 0,
            longitude: longitude ?? 0,
            gps_accuracy: isEntryForm ? savedEntry.gps_accuracy ?? 0 : 0,
            previous_cutting_date: previousCuttingDate,
            cutting_date: cuttingDate,
            nutrient_application_date: nutrientApplicationDate,
            tamm_area: tamArea,
            remarks,
            collector_id: collectorId || savedEntry.collector_id || '',
        },
        collectorId,
        matchedField
    );

    return {
        ...loaded,
        collector_id: collectorId || savedEntry.collector_id || '',
        selected_field: selectedField,
        field_id: fieldId,
        field_name: fieldName,
        section_name: sectionName,
        block_id: blockId,
        area: area ?? loaded.area,
        block_size: blockSize ?? loaded.block_size,
        spatial_data: spatialData ?? loaded.spatial_data,
        geom_polygon: geomPolygon ?? loaded.geom_polygon,
        latitude: latitude ?? loaded.latitude,
        longitude: longitude ?? loaded.longitude,
        gps_accuracy: isEntryForm ? savedEntry.gps_accuracy ?? loaded.gps_accuracy ?? 0 : 0,
        date_recorded: savedEntry.date_recorded || '',
        trial_number: savedEntry.trial_number ?? '',
        trial_name: savedEntry.trial_name || '',
        contact_person: normalizeContactPersonLabel(savedEntry.contact_person),
        phone_country_code: isEntryForm ? savedEntry.phone_country_code || '' : '',
        phone_number: isEntryForm ? savedEntry.phone_number || '' : '',
        crop_type: savedEntry.crop_type || loaded.crop_type,
        crop_class: savedEntry.crop_class || '',
        variety: savedEntry.variety || '',
        ploughing_date: savedEntry.ploughing_date || '',
        planting_date: savedEntry.planting_date || '',
        soil_sampling_date: savedEntry.soil_sampling_date || '',
        soil_test_pdf_url: savedEntry.soil_test_pdf_url || '',
        foliar_analysis_pdf_url: savedEntry.foliar_analysis_pdf_url || '',
        final_eldana_survey_pdf_url: savedEntry.final_eldana_survey_pdf_url || '',
        previous_cutting_date: previousCuttingDate,
        cutting_date: cuttingDate,
        expected_harvest_date: derivedExpectedHarvestDate,
        irrigation_type: savedEntry.irrigation_type || loaded.irrigation_type || '',
        water_source: savedEntry.water_source || loaded.water_source || '',
        tam_mm: savedEntry.tam_mm || loaded.tam_mm || '',
        tamm_area: tamArea ?? loaded.tamm_area,
        soil_type: normalizeSoilTypeLabel(savedEntry.soil_type || loaded.soil_type),
        soil_ph: savedEntry.soil_ph ?? loaded.soil_ph,
        field_remarks: savedEntry.field_remarks || savedEntry.remarks || '',
        residue_type: savedEntry.residue_type || '',
        residue_management_method: savedEntry.residue_management_method || '',
        residual_management_remarks: savedEntry.residual_management_remarks || '',
        fertilizer_type: savedEntry.fertilizer_type || '',
        nutrient_application_date: nutrientApplicationDate,
        application_rate: savedEntry.application_rate,
        fertilizer_applications: fertilizerApplications,
        foliar_sampling_date: savedEntry.foliar_sampling_date || '',
        herbicide_name: savedEntry.herbicide_name || '',
        weed_application_date: savedEntry.weed_application_date || '',
        weed_application_rate: savedEntry.weed_application_rate,
        herbicide_applications: herbicideApplications,
        pest_remarks: savedEntry.pest_remarks || '',
        disease_remarks: savedEntry.disease_remarks || '',
        harvest_date: savedEntry.harvest_date || '',
        yield: savedEntry.yield ?? (!isEntryForm ? savedEntry.harvest_yield : undefined),
        quality_remarks: savedEntry.quality_remarks || '',
        remarks,
    };
}

function buildMonitoringFieldRegistry(records: SugarcaneMonitoringRecord[]): PredefinedField[] {
    const sortedRecords = [...records].sort((left, right) => getEntryTimestamp(right) - getEntryTimestamp(left));
    const byFieldName = new Map<string, PredefinedField>();

    sortedRecords.forEach((record) => {
        const fieldName = String(record.field_name || record.field_id || '').trim();
        if (!fieldName) {
            return;
        }

        const key = normalizeLookupValue(fieldName);
        const existing = byFieldName.get(key);

        if (!existing) {
            byFieldName.set(key, {
                id: record.id,
                field_name: fieldName,
                section_name: record.section_name || '',
                block_id: record.block_id || '',
                latitude: record.latitude ?? 0,
                longitude: record.longitude ?? 0,
                geom: record.geom_polygon,
                crop_type: record.crop_type || undefined,
                date_recorded: record.date_recorded || undefined,
                created_at: record.created_at || undefined,
                updated_at: record.updated_at || undefined,
                observation_count: 1,
            });
            return;
        }

        existing.section_name = existing.section_name || record.section_name || '';
        existing.block_id = existing.block_id || record.block_id || '';
        existing.latitude = existing.latitude || record.latitude || 0;
        existing.longitude = existing.longitude || record.longitude || 0;
        existing.geom = existing.geom ?? record.geom_polygon;
        existing.crop_type = existing.crop_type || record.crop_type || undefined;
        existing.date_recorded = existing.date_recorded || record.date_recorded || undefined;
        existing.created_at = existing.created_at || record.created_at || undefined;
        existing.updated_at = existing.updated_at || record.updated_at || undefined;
        existing.observation_count = (existing.observation_count ?? 0) + 1;
    });

    return Array.from(byFieldName.values())
        .sort((left, right) => left.field_name.localeCompare(right.field_name, undefined, { sensitivity: 'base' }));
}

function buildFieldRegistryKey(field: Pick<PredefinedField, 'field_name' | 'section_name' | 'block_id'>): string {
    const compositeKey = [
        normalizeLookupValue(field.field_name),
        normalizeLookupValue(field.section_name),
        normalizeLookupValue(field.block_id),
    ].join('|');

    if (compositeKey !== '||') {
        return compositeKey;
    }

    return normalizeLookupValue(field.field_name);
}

function isSameRegistryField(left: PredefinedField, right: PredefinedField): boolean {
    if (left.id && right.id && String(left.id) === String(right.id)) {
        return true;
    }

    const leftKey = buildFieldRegistryKey(left);
    const rightKey = buildFieldRegistryKey(right);

    if (leftKey && rightKey && leftKey === rightKey) {
        return true;
    }

    const leftName = normalizeLookupValue(left.field_name);
    const rightName = normalizeLookupValue(right.field_name);
    const leftBlock = normalizeLookupValue(left.block_id);
    const rightBlock = normalizeLookupValue(right.block_id);

    return Boolean(leftName && leftName === rightName && (!leftBlock || !rightBlock || leftBlock === rightBlock));
}

function buildSelectableFieldRegistry(
    liveFields: PredefinedField[],
    records: SugarcaneMonitoringRecord[]
): PredefinedField[] {
    const merged = new Map<string, PredefinedField>();
    const monitoringFields = buildMonitoringFieldRegistry(records);

    [...liveFields, ...monitoringFields].forEach((field, index) => {
        const key = buildFieldRegistryKey(field) || `field-${index}`;
        if (!merged.has(key)) {
            merged.set(key, field);
        }
    });

    return Array.from(merged.values())
        .sort((left, right) => left.field_name.localeCompare(right.field_name, undefined, { sensitivity: 'base' }));
}

function mergeCreatedFieldIntoRegistry(fields: PredefinedField[] | undefined, createdField: PredefinedField): PredefinedField[] {
    let didReplace = false;
    const mergedFields = (fields ?? []).map((field) => {
        if (!isSameRegistryField(field, createdField)) {
            return field;
        }

        didReplace = true;
        return { ...field, ...createdField };
    });

    if (!didReplace) {
        mergedFields.push(createdField);
    }

    return buildSelectableFieldRegistry(mergedFields, []);
}

function findExistingFieldForKMLImport(
    fields: PredefinedField[],
    fieldName: string,
    blockId?: string,
    sectionName?: string
): PredefinedField | null {
    const normalizedFieldName = normalizeLookupValue(fieldName);
    const normalizedBlockId = normalizeLookupValue(blockId);
    const normalizedSectionName = normalizeLookupValue(sectionName);

    if (!normalizedFieldName) {
        return null;
    }

    const nameMatches = fields.filter((field) =>
        normalizeLookupValue(field.field_name) === normalizedFieldName
    );

    if (nameMatches.length === 0) {
        return null;
    }

    const blockMatch = normalizedBlockId
        ? nameMatches.find((field) => normalizeLookupValue(field.block_id) === normalizedBlockId)
        : undefined;

    if (blockMatch) {
        return blockMatch;
    }

    const sectionMatch = normalizedSectionName
        ? nameMatches.find((field) => normalizeLookupValue(field.section_name) === normalizedSectionName)
        : undefined;

    return sectionMatch ?? nameMatches[0] ?? null;
}

function formatFieldIdentity(fieldName: string, blockId?: string, sectionName?: string): string {
    const parts = [
        fieldName.trim(),
        blockId?.trim() ? `Field ID ${blockId.trim()}` : '',
        sectionName?.trim() ? `Section ${sectionName.trim()}` : '',
    ].filter(Boolean);

    return parts.join(' - ');
}

export const ObservationEntryIntakeDialog: React.FC<ObservationEntryIntakeDialogProps> = ({
    open,
    onClose,
    onSubmitted,
    onSaved,
    existingRecords,
}) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const dialogContentRef = useRef<HTMLDivElement | null>(null);
    const [formData, setFormData] = useState<ObservationEntryFormSubmissionInput>(createEmptySubmission(user?.id || ''));
    const [saving, setSaving] = useState(false);
    const [pdfUploading, setPdfUploading] = useState(false);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const [foliarPdfUploading, setFoliarPdfUploading] = useState(false);
    const [foliarPdfError, setFoliarPdfError] = useState<string | null>(null);
    const [eldanaPdfUploading, setEldanaPdfUploading] = useState(false);
    const [eldanaPdfError, setEldanaPdfError] = useState<string | null>(null);
    const [saveMode, setSaveMode] = useState<'close' | 'add_another' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [parseSummary, setParseSummary] = useState<string | null>(null);
    const [isCreatingCustomField, setIsCreatingCustomField] = useState(false);
    const [drawPoints, setDrawPoints] = useState<DrawPoint[]>([]);
    const [isUploadingKML, setIsUploadingKML] = useState(false);
    const [_kmlFile, setKmlFile] = useState<File | null>(null);
    const [kmlFeatures, setKmlFeatures] = useState<KMLParseResult['features']>([]);
    const [selectedKMLFeatureIndex, setSelectedKMLFeatureIndex] = useState<number>(0);
    const [kmlError, setKmlError] = useState<string | null>(null);
    const [kmlPoints, setKmlPoints] = useState<KMLPoint[]>([]);
    const [selectedPointIndices, setSelectedPointIndices] = useState<Set<number>>(new Set());
    const [kmlMode, setKmlMode] = useState<'geometry' | 'points'>('geometry');
    const kmlFileInputRef = useRef<HTMLInputElement>(null);

    const {
        data: livePredefinedFields = [],
        error: livePredefinedFieldsError,
    } = useLivePredefinedFields({
        enabled: open,
        staleTime: 60_000,
    });

    const predefinedFields = useMemo(
        () => buildSelectableFieldRegistry(livePredefinedFields, existingRecords),
        [existingRecords, livePredefinedFields]
    );

    useEffect(() => {
        if (!open) return;

        setFormData(createEmptySubmission(user?.id || ''));
        setError(null);
        setParseSummary(null);
        setPdfUploading(false);
        setPdfError(null);
        setFoliarPdfUploading(false);
        setFoliarPdfError(null);
        setEldanaPdfUploading(false);
        setEldanaPdfError(null);
        setSaveMode(null);
        setIsCreatingCustomField(false);
        setDrawPoints([]);
        setIsUploadingKML(false);
        setKmlFile(null);
        setKmlFeatures([]);
        setSelectedKMLFeatureIndex(0);
        setKmlError(null);
        setKmlPoints([]);
        setSelectedPointIndices(new Set());
        setKmlMode('geometry');
    }, [open, user?.id]);

    const selectedField = useMemo(
        () => getPredefinedFieldByName(predefinedFields, formData.field_name),
        [predefinedFields, formData.field_name]
    );

    const fertilizerApplicationRows = useMemo(() => {
        const rows = Array.isArray(formData.fertilizer_applications)
            ? formData.fertilizer_applications.slice(0, MAX_APPLICATION_LOOPS)
            : [];

        if (rows.length > 0) {
            return rows;
        }

        if (
            formData.fertilizer_type ||
            formData.nutrient_application_date ||
            formData.application_rate != null ||
            formData.foliar_sampling_date
        ) {
            return [{
                fertilizer_type: formData.fertilizer_type || '',
                application_date: normalizeDateInputValue(formData.nutrient_application_date),
                application_rate: formData.application_rate,
                foliar_sampling_date: normalizeDateInputValue(formData.foliar_sampling_date),
            }];
        }

        return [buildEmptyFertilizerApplication()];
    }, [
        formData.application_rate,
        formData.fertilizer_applications,
        formData.fertilizer_type,
        formData.foliar_sampling_date,
        formData.nutrient_application_date,
    ]);

    const herbicideApplicationRows = useMemo(() => {
        const rows = Array.isArray(formData.herbicide_applications)
            ? formData.herbicide_applications.slice(0, MAX_APPLICATION_LOOPS)
            : [];

        if (rows.length > 0) {
            return rows;
        }

        if (
            formData.herbicide_name ||
            formData.weed_application_date ||
            formData.weed_application_rate != null
        ) {
            return [{
                herbicide_name: formData.herbicide_name || '',
                application_date: normalizeDateInputValue(formData.weed_application_date),
                application_rate: formData.weed_application_rate,
            }];
        }

        return [buildEmptyHerbicideApplication()];
    }, [
        formData.herbicide_applications,
        formData.herbicide_name,
        formData.weed_application_date,
        formData.weed_application_rate,
    ]);

    const currentFertilizerApplication = useMemo(
        () => getCurrentFertilizerApplication(
            fertilizerApplicationRows
                .map((item) => normalizeFertilizerApplicationInput(item))
                .filter((item): item is FertilizerApplication => item !== null)
        ),
        [fertilizerApplicationRows]
    );

    const currentHerbicideApplication = useMemo(
        () => getCurrentHerbicideApplication(
            herbicideApplicationRows
                .map((item) => normalizeHerbicideApplicationInput(item))
                .filter((item): item is HerbicideApplication => item !== null)
        ),
        [herbicideApplicationRows]
    );

    const drawingMapCenter = useMemo<[number, number]>(() => {
        const coordinateFields = predefinedFields.filter((field) =>
            Number.isFinite(field.latitude) &&
            Number.isFinite(field.longitude) &&
            (field.latitude !== 0 || field.longitude !== 0)
        );

        if (coordinateFields.length === 0) {
            return DEFAULT_DRAW_CENTER;
        }

        const latitude = coordinateFields.reduce((sum, field) => sum + field.latitude, 0) / coordinateFields.length;
        const longitude = coordinateFields.reduce((sum, field) => sum + field.longitude, 0) / coordinateFields.length;

        return [
            Number(latitude.toFixed(6)),
            Number(longitude.toFixed(6)),
        ];
    }, [predefinedFields]);

    const drawnGeometry = useMemo(
        () => buildPolygonGeometryFromPoints(drawPoints),
        [drawPoints]
    );

    const drawnCentroid = useMemo(
        () => getPointCentroid(drawPoints),
        [drawPoints]
    );

    const drawnArea = useMemo(
        () => estimateGeometryAreaHa(drawnGeometry),
        [drawnGeometry]
    );

    const selectableFieldOptions = useMemo(() => {
        return predefinedFields
            .map((field) => ({
                value: field.field_name,
                sectionName: field.section_name || '',
                blockId: field.block_id || '',
            }))
            .sort((left, right) =>
                left.value.localeCompare(right.value, undefined, { sensitivity: 'base' })
            );
    }, [predefinedFields]);

    const cropClassOptions = useMemo(() => {
        const options = getCropClassOptionsForCropType(formData.crop_type);
        if (formData.crop_class && !options.includes(formData.crop_class)) {
            return [formData.crop_class, ...options];
        }

        return options;
    }, [formData.crop_class, formData.crop_type]);

    const plantingCalendarSearch = useMemo(
        () => buildObservationCalendarSearch(formData, 'planting'),
        [
            formData.block_id,
            formData.crop_class,
            formData.field_name,
            formData.planting_date,
            formData.previous_cutting_date,
            formData.section_name,
            formData.selected_field,
            formData.trial_name,
            formData.trial_number,
        ]
    );

    const cuttingCalendarSearch = useMemo(
        () => buildObservationCalendarSearch(formData, 'cutting'),
        [
            formData.block_id,
            formData.crop_class,
            formData.cutting_date,
            formData.field_name,
            formData.previous_cutting_date,
            formData.section_name,
            formData.selected_field,
            formData.trial_name,
            formData.trial_number,
        ]
    );

    const updateField = (field: keyof ObservationEntryFormSubmissionInput, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleAreaChange = (value: string) => {
        const parsedArea = parseOptionalNumericInput(value);

        setFormData((prev) => ({
            ...prev,
            area: parsedArea,
            block_size: parsedArea,
        }));
    };

    const handlePlantingDateChange = (value: string) => {
        setFormData((prev) => ({
            ...prev,
            planting_date: value,
        }));
    };

    const handlePreviousCuttingDateChange = (value: string) => {
        setFormData((prev) => ({
            ...prev,
            previous_cutting_date: value,
            cutting_date: value,
        }));
    };

    const handleHarvestDateChange = (value: string) => {
        setFormData((prev) => ({
            ...prev,
            harvest_date: value,
        }));
    };

    const applyFertilizerApplicationRows = (rows: FertilizerApplication[]) => {
        const limitedRows = rows.slice(0, MAX_APPLICATION_LOOPS);
        const current = getCurrentFertilizerApplication(
            limitedRows
                .map((item) => normalizeFertilizerApplicationInput(item))
                .filter((item): item is FertilizerApplication => item !== null)
        );

        setFormData((prev) => ({
            ...prev,
            fertilizer_applications: limitedRows,
            fertilizer_type: current?.fertilizer_type || '',
            nutrient_application_date: current?.application_date || '',
            application_rate: current?.application_rate,
            foliar_sampling_date: current?.foliar_sampling_date || '',
        }));
    };

    const applyHerbicideApplicationRows = (rows: HerbicideApplication[]) => {
        const limitedRows = rows.slice(0, MAX_APPLICATION_LOOPS);
        const current = getCurrentHerbicideApplication(
            limitedRows
                .map((item) => normalizeHerbicideApplicationInput(item))
                .filter((item): item is HerbicideApplication => item !== null)
        );

        setFormData((prev) => ({
            ...prev,
            herbicide_applications: limitedRows,
            herbicide_name: current?.herbicide_name || '',
            weed_application_date: current?.application_date || '',
            weed_application_rate: current?.application_rate,
        }));
    };

    const handleFertilizerApplicationChange = (
        index: number,
        field: keyof FertilizerApplication,
        value: string | number | undefined
    ) => {
        const nextRows = fertilizerApplicationRows.map((item) => ({ ...item }));
        while (nextRows.length <= index) {
            nextRows.push(buildEmptyFertilizerApplication());
        }

        nextRows[index] = {
            ...nextRows[index],
            [field]: value,
        };

        applyFertilizerApplicationRows(nextRows);
    };

    const handleFoliarSamplingDateChange = (value: string) => {
        const nextRows = fertilizerApplicationRows.map((item) => ({ ...item }));

        if (nextRows.length === 0) {
            nextRows.push(buildEmptyFertilizerApplication());
        }

        const currentIndex = getCurrentFertilizerApplicationIndex(nextRows);
        nextRows[currentIndex] = {
            ...nextRows[currentIndex],
            foliar_sampling_date: value,
        };

        applyFertilizerApplicationRows(nextRows);
    };

    const handleHerbicideApplicationChange = (
        index: number,
        field: keyof HerbicideApplication,
        value: string | number | undefined
    ) => {
        const nextRows = herbicideApplicationRows.map((item) => ({ ...item }));
        while (nextRows.length <= index) {
            nextRows.push(buildEmptyHerbicideApplication());
        }

        nextRows[index] = {
            ...nextRows[index],
            [field]: value,
        };

        applyHerbicideApplicationRows(nextRows);
    };

    const handleAddFertilizerApplication = () => {
        if (fertilizerApplicationRows.length >= MAX_APPLICATION_LOOPS) {
            return;
        }

        applyFertilizerApplicationRows([
            ...fertilizerApplicationRows,
            buildEmptyFertilizerApplication(),
        ]);
    };

    const handleAddHerbicideApplication = () => {
        if (herbicideApplicationRows.length >= MAX_APPLICATION_LOOPS) {
            return;
        }

        applyHerbicideApplicationRows([
            ...herbicideApplicationRows,
            buildEmptyHerbicideApplication(),
        ]);
    };

    const handleRemoveFertilizerApplication = (index: number) => {
        applyFertilizerApplicationRows(
            fertilizerApplicationRows.filter((_, currentIndex) => currentIndex !== index)
        );
    };

    const handleRemoveHerbicideApplication = (index: number) => {
        applyHerbicideApplicationRows(
            herbicideApplicationRows.filter((_, currentIndex) => currentIndex !== index)
        );
    };

    useEffect(() => {
        if (!isCreatingCustomField) {
            return;
        }

        setFormData((prev) => ({
            ...prev,
            area: drawnArea,
            block_size: drawnArea,
            spatial_data: drawnGeometry ?? undefined,
            geom_polygon: drawnGeometry ?? undefined,
            latitude: drawnCentroid?.latitude ?? 0,
            longitude: drawnCentroid?.longitude ?? 0,
        }));
    }, [drawnArea, drawnCentroid, drawnGeometry, isCreatingCustomField]);

    const handleFieldSelection = (fieldName: string) => {
        setError(null);

        if (fieldName === DRAW_NEW_FIELD_VALUE) {
            setIsCreatingCustomField(true);
            setDrawPoints([]);
            setIsUploadingKML(false);
            setParseSummary(null);
            setFormData(() => buildFreshFormData(
                createEmptySubmission(user?.id || ''),
                user?.id || '',
            ));
            return;
        }

        if (fieldName === UPLOAD_KML_FIELD_VALUE) {
            setIsUploadingKML(true);
            setIsCreatingCustomField(false);
            setDrawPoints([]);
            setParseSummary(null);
            setKmlFile(null);
            setKmlFeatures([]);
            setKmlError(null);
            setFormData(() => buildFreshFormData(
                createEmptySubmission(user?.id || ''),
                user?.id || '',
            ));
            // Trigger file input dialog
            setTimeout(() => kmlFileInputRef.current?.click(), 100);
            return;
        }

        const match = getPredefinedFieldByName(predefinedFields, fieldName);
        setIsCreatingCustomField(false);
        setIsUploadingKML(false);
        setDrawPoints([]);

        if (!match) {
            return;
        }

        setParseSummary(null);
        const latestRecord = findLatestRecordForField(match, existingRecords);

        if (latestRecord) {
            const collectorId = user?.id || latestRecord.collector_id || '';
            setParseSummary('Current database information was loaded for this field. Edit the selected field row and save to update it.');
            setFormData(() => buildLoadedSavedRecordData(latestRecord, collectorId, match));
            return;
        }

        setFormData(() => buildFreshFormData(
            createEmptySubmission(user?.id || ''),
            user?.id || '',
            match,
        ));
    };

    const handleAddDrawPoint = (point: DrawPoint) => {
        setDrawPoints((prev) => [...prev, point]);
    };

    const handleUndoDrawPoint = () => {
        setDrawPoints((prev) => prev.slice(0, -1));
    };

    const handleClearDrawPoints = () => {
        setDrawPoints([]);
    };

    const handleKMLFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!isValidKMLFile(file)) {
            setKmlError('Please select a valid KML or KMZ file (.kml or .kmz)');
            return;
        }

        setKmlError(null);
        setKmlFile(file);

        try {
            const result = await parseKMLFile(file);

            if (result.error || result.features.length === 0) {
                setKmlError(result.error || 'No features found in KML/KMZ file');
                setKmlFeatures([]);
                setKmlPoints([]);
                return;
            }

            setKmlFeatures(result.features);
            setSelectedKMLFeatureIndex(0);

            // Also extract points from the KML/KMZ file
            const points = extractPointsFromKML(result.features);
            setKmlPoints(points);

            // Auto-detect if we have geometry or points and set mode accordingly
            if (points.length >= 3) {
                setKmlMode('points');
                setSelectedPointIndices(new Set(points.map((_, i) => i)));
            } else {
                setKmlMode('geometry');
            }

            const firstPolygonFeatureIndex = result.features.findIndex((feature) => extractGeometryFromKML([feature]));
            const firstPolygonFeature = firstPolygonFeatureIndex >= 0 ? result.features[firstPolygonFeatureIndex] : null;
            const firstGeometryResult = firstPolygonFeature ? extractGeometryFromKML([firstPolygonFeature]) : null;

            if (firstPolygonFeature && firstGeometryResult) {
                const { geometry, centroid } = firstGeometryResult;
                const estimatedArea = estimateGeometryAreaHa(geometry);
                const fieldName = firstPolygonFeature.name || 'Imported Field';
                const inferredFieldId = inferFieldIdFromKMLFeatureName(fieldName);

                setSelectedKMLFeatureIndex(firstPolygonFeatureIndex);
                setFormData((prev) => ({
                    ...prev,
                    selected_field: fieldName,
                    field_id: fieldName,
                    field_name: fieldName,
                    block_id: prev.block_id?.trim() ? prev.block_id : inferredFieldId,
                    area: prev.area ?? estimatedArea,
                    block_size: prev.block_size ?? prev.area ?? estimatedArea,
                    spatial_data: geometry,
                    geom_polygon: geometry,
                    latitude: centroid?.latitude ?? prev.latitude ?? 0,
                    longitude: centroid?.longitude ?? prev.longitude ?? 0,
                }));
            }
        } catch (err: any) {
            setKmlError(`Failed to parse KML/KMZ file: ${err.message}`);
            setKmlFeatures([]);
            setKmlPoints([]);
        }
    };

    const handleSelectKMLFeature = (index: number) => {
        setSelectedKMLFeatureIndex(index);
        setKmlError(null);

        const selectedFeature = kmlFeatures[index];
        if (!selectedFeature) return;

        const geometryResult = extractGeometryFromKML([selectedFeature]);
        if (!geometryResult) {
            setKmlError('Selected KML feature does not contain a valid polygon or multi-polygon geometry');
            return;
        }

        const { geometry, centroid } = geometryResult;
        const estimatedArea = estimateGeometryAreaHa(geometry);

        // Update form data with KML geometry
        const fieldName = selectedFeature.name || 'Imported Field';
        const inferredFieldId = inferFieldIdFromKMLFeatureName(fieldName);
        setFormData((prev) => ({
            ...prev,
            selected_field: fieldName,
            field_id: fieldName,
            field_name: fieldName,
            block_id: prev.block_id?.trim() ? prev.block_id : inferredFieldId,
            area: prev.area ?? estimatedArea,
            block_size: prev.block_size ?? prev.area ?? estimatedArea,
            spatial_data: geometry,
            geom_polygon: geometry,
            latitude: centroid?.latitude ?? prev.latitude ?? 0,
            longitude: centroid?.longitude ?? prev.longitude ?? 0,
        }));
    };

    const handleCancelKMLUpload = () => {
        setIsUploadingKML(false);
        setKmlFile(null);
        setKmlFeatures([]);
        setSelectedKMLFeatureIndex(0);
        setKmlError(null);
        setFormData(() => buildFreshFormData(
            createEmptySubmission(user?.id || ''),
            user?.id || '',
        ));
    };

    const handleTogglePointSelection = (index: number) => {
        const newSelection = new Set(selectedPointIndices);
        if (newSelection.has(index)) {
            newSelection.delete(index);
        } else {
            newSelection.add(index);
        }
        setSelectedPointIndices(newSelection);
    };

    const handleCreatePolygonFromPoints = () => {
        if (selectedPointIndices.size < 3) {
            setKmlError('You need to select at least 3 points to create a polygon');
            return;
        }

        // Get selected points in order
        const selectedPoints = Array.from(selectedPointIndices)
            .sort((a, b) => a - b)
            .map((i) => kmlPoints[i]);

        // Sort points counter-clockwise to form a valid polygon
        const sortedPoints = sortPointsForPolygon(selectedPoints);

        // Create polygon from sorted points
        const polygonResult = createPolygonFromPoints(sortedPoints);
        if (!polygonResult) {
            setKmlError('Failed to create polygon from selected points');
            return;
        }

        const { geometry, centroid } = polygonResult;
        const estimatedArea = estimateGeometryAreaHa(geometry);

        // Update form data with polygon geometry
        setFormData((prev) => ({
            ...prev,
            area: prev.area ?? estimatedArea,
            block_size: prev.block_size ?? prev.area ?? estimatedArea,
            spatial_data: geometry,
            geom_polygon: geometry,
            latitude: centroid?.latitude ?? prev.latitude ?? 0,
            longitude: centroid?.longitude ?? prev.longitude ?? 0,
        }));

        setKmlError(null);
    };

    const handleSelectAllPoints = () => {
        setSelectedPointIndices(new Set(kmlPoints.map((_, i) => i)));
    };

    const handleClearPointSelection = () => {
        setSelectedPointIndices(new Set());
    };

    const handleSubmit = async (mode: 'close' | 'add_another' = 'close') => {
        setSaving(true);
        setSaveMode(mode);
        setError(null);
        setParseSummary(null);

        try {
            if (!formData.field_name && !isCreatingCustomField && !isUploadingKML) {
                throw new Error('Please select a field before saving.');
            }

            if (pdfUploading || foliarPdfUploading || eldanaPdfUploading) {
                throw new Error('Please wait for the PDF uploads to finish before saving.');
            }

            let resolvedField = selectedField;
            let registryFields = predefinedFields;
            let allowExistingRowOverwrite = false;
            let overwroteKMLBoundary = false;
            let createdNewFieldRow = false;
            let updatedExistingFieldRow = false;

            if (isCreatingCustomField) {
                const normalizedFieldName = formData.field_name.trim();
                const hasExistingField = predefinedFields.some((field) =>
                    field.field_name.trim().toLowerCase() === normalizedFieldName.toLowerCase()
                );

                if (!normalizedFieldName) {
                    throw new Error('Please enter a new trial or field name.');
                }

                if (hasExistingField) {
                    throw new Error('That field name already exists in the field management table. Please select it from the list instead.');
                }

                if (!formData.block_id?.trim()) {
                    throw new Error('Please enter a block ID for the new field or trial.');
                }

                if (!drawnGeometry || drawPoints.length < 3) {
                    throw new Error('Please draw the new field or trial boundary on the map using at least 3 points.');
                }

                if (!drawnCentroid) {
                    throw new Error('Unable to calculate the center of the drawn field boundary.');
                }

                const createdField = await createPredefinedField({
                    field_name: normalizedFieldName,
                    section_name: formData.section_name || '',
                    block_id: formData.block_id,
                    latitude: drawnCentroid.latitude,
                    longitude: drawnCentroid.longitude,
                    geom: drawnGeometry,
                    created_by: user?.id,
                    crop_type: formData.crop_type,
                    date_recorded: formData.date_recorded || undefined,
                });

                queryClient.setQueryData<PredefinedField[]>(
                    LIVE_PREDEFINED_FIELDS_QUERY_KEY,
                    (currentFields) => mergeCreatedFieldIntoRegistry(currentFields, createdField)
                );

                resolvedField = createdField;
                allowExistingRowOverwrite = Boolean(createdField.id);
                createdNewFieldRow = true;

                setIsCreatingCustomField(false);
                setDrawPoints([]);
                setFormData((prev) => buildFreshFormData(
                    {
                        ...prev,
                        field_name: normalizedFieldName,
                        block_id: createdField.block_id,
                        area: drawnArea,
                        block_size: drawnArea,
                        spatial_data: drawnGeometry,
                        geom_polygon: drawnGeometry,
                        latitude: drawnCentroid.latitude,
                        longitude: drawnCentroid.longitude,
                    },
                    user?.id || prev.collector_id || '',
                    createdField,
                ));
            }

            if (isUploadingKML) {
                const normalizedFieldName = formData.field_name.trim();
                const normalizedBlockId = formData.block_id?.trim() || inferFieldIdFromKMLFeatureName(normalizedFieldName);
                const normalizedSectionName = formData.section_name?.trim() ?? '';
                const kmlGeometry = formData.geom_polygon || formData.spatial_data;

                if (!normalizedFieldName) {
                    throw new Error('Please enter a name for the field imported from KML.');
                }

                if (!normalizedBlockId) {
                    throw new Error('Please enter a Field ID for the KML/KMZ-imported field.');
                }

                if (!kmlGeometry) {
                    throw new Error('No valid geometry was extracted from the KML/KMZ file.');
                }

                if (!formData.latitude || !formData.longitude) {
                    throw new Error('Unable to calculate the center of the KML/KMZ geometry.');
                }

                const existingKMLField = findExistingFieldForKMLImport(
                    predefinedFields,
                    normalizedFieldName,
                    normalizedBlockId,
                    normalizedSectionName
                );
                const kmlArea = formData.area ?? formData.block_size ?? estimateGeometryAreaHa(kmlGeometry);

                if (existingKMLField) {
                    const existingIdentity = formatFieldIdentity(
                        existingKMLField.field_name,
                        existingKMLField.block_id,
                        existingKMLField.section_name
                    );
                    const uploadedIdentity = formatFieldIdentity(
                        normalizedFieldName,
                        normalizedBlockId,
                        normalizedSectionName
                    );
                    const shouldOverwrite = window.confirm(
                        `The KML/KMZ field "${existingIdentity}" is already in the database. Do you want to overwrite it with the uploaded KML/KMZ boundary "${uploadedIdentity}"?`
                    );

                    if (!shouldOverwrite) {
                        throw new Error('KML upload cancelled. The existing database boundary was not changed.');
                    }

                    const overwrittenField: PredefinedField = {
                        ...existingKMLField,
                        field_name: normalizedFieldName,
                        section_name: normalizedSectionName || existingKMLField.section_name || '',
                        block_id: normalizedBlockId || existingKMLField.block_id || '',
                        area: kmlArea ?? existingKMLField.area,
                        latitude: formData.latitude,
                        longitude: formData.longitude,
                        geom: kmlGeometry,
                        crop_type: formData.crop_type || existingKMLField.crop_type,
                        date_recorded: formData.date_recorded || existingKMLField.date_recorded,
                    };

                    queryClient.setQueryData<PredefinedField[]>(
                        LIVE_PREDEFINED_FIELDS_QUERY_KEY,
                        (currentFields) => mergeCreatedFieldIntoRegistry(currentFields, overwrittenField)
                    );

                    registryFields = mergeCreatedFieldIntoRegistry(registryFields, overwrittenField);
                    resolvedField = overwrittenField;
                    allowExistingRowOverwrite = true;
                    overwroteKMLBoundary = true;
                } else {
                    const createdField = await createPredefinedField({
                        field_name: normalizedFieldName,
                        section_name: normalizedSectionName,
                        block_id: normalizedBlockId,
                        latitude: formData.latitude,
                        longitude: formData.longitude,
                        geom: kmlGeometry,
                        created_by: user?.id,
                        crop_type: formData.crop_type,
                        date_recorded: formData.date_recorded || undefined,
                    });

                    queryClient.setQueryData<PredefinedField[]>(
                        LIVE_PREDEFINED_FIELDS_QUERY_KEY,
                        (currentFields) => mergeCreatedFieldIntoRegistry(currentFields, createdField)
                    );

                    registryFields = mergeCreatedFieldIntoRegistry(registryFields, createdField);
                    resolvedField = createdField;
                    allowExistingRowOverwrite = Boolean(createdField.id);
                    createdNewFieldRow = true;
                }

                setIsUploadingKML(false);
                setKmlFile(null);
                setKmlFeatures([]);
                setFormData((prev) => buildFreshFormData(
                    {
                        ...prev,
                        field_name: normalizedFieldName,
                        block_id: resolvedField?.block_id || normalizedBlockId,
                        area: kmlArea,
                        block_size: kmlArea,
                        spatial_data: kmlGeometry,
                        geom_polygon: kmlGeometry,
                        latitude: formData.latitude,
                        longitude: formData.longitude,
                    },
                    user?.id || prev.collector_id || '',
                    resolvedField ?? undefined,
                ));
            }

            if (!resolvedField) {
                throw new Error('Please choose a field or trial from the field management table.');
            }

            if (resolvedField.id) {
                allowExistingRowOverwrite = true;
                updatedExistingFieldRow = !overwroteKMLBoundary && !createdNewFieldRow;
            }

            const submission = {
                ...formData,
                collector_id: user?.id || formData.collector_id,
                selected_field: resolvedField.field_name || formData.selected_field,
                field_id: resolvedField.field_name || formData.field_id,
                field_name: resolvedField.field_name || formData.field_name,
                section_name: resolvedField.section_name || formData.section_name,
                block_id: resolvedField.block_id || formData.block_id,
                area: formData.area ?? formData.block_size ?? resolvedField.area,
                block_size: formData.block_size ?? formData.area ?? resolvedField.area,
                spatial_data: formData.spatial_data ?? resolvedField.geom ?? undefined,
                geom_polygon: formData.geom_polygon ?? resolvedField.geom ?? undefined,
                latitude: formData.latitude ?? resolvedField.latitude ?? 0,
                longitude: formData.longitude ?? resolvedField.longitude ?? 0,
                contact_person: normalizeContactPersonLabel(formData.contact_person),
                soil_type: normalizeSoilTypeLabel(formData.soil_type),
            };

            const submissionFields = registryFields.some((field) =>
                field.field_name.trim().toLowerCase() === resolvedField.field_name.trim().toLowerCase()
            )
                ? registryFields
                : [resolvedField, ...registryFields];

            const savedEntry = await createObservationEntryFormSubmission(
                submission,
                submissionFields,
                { allowExistingRowOverwrite }
            );

            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['field-records'] }),
                queryClient.invalidateQueries({ queryKey: ['sugarcane-monitoring'] }),
                queryClient.invalidateQueries({ queryKey: ['mobile-observation-records'] }),
                queryClient.invalidateQueries({ queryKey: ['dashboard-sugarcane-analytics'] }),
                queryClient.invalidateQueries({ queryKey: LIVE_PREDEFINED_FIELDS_QUERY_KEY }),
                ...(isCreatingCustomField || isUploadingKML ? [queryClient.invalidateQueries({ queryKey: ['observation-entry-forms'] })] : []),
            ]);

            window.dispatchEvent(new CustomEvent(LIVE_DATA_UPDATED_EVENT));

            await onSubmitted();
            onSaved?.(overwroteKMLBoundary
                ? 'KML/KMZ boundary overwritten and saved to the database.'
                : updatedExistingFieldRow
                    ? 'Existing field row updated in the database.'
                    : createdNewFieldRow
                        ? 'New field row saved to the database.'
                : 'Successfully saved to the database.');

            if (mode === 'add_another') {
                const collectorId = user?.id || submission.collector_id || '';

                setParseSummary('Successfully saved to the database. Current values stay visible for the next entry. Enter the next record date and adjust anything that changed, then save again.');
                setFormData(buildFollowUpTrialUpdateData(savedEntry, collectorId, resolvedField));
                setIsCreatingCustomField(false);
                setDrawPoints([]);
                dialogContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save the observation entry form.');
            dialogContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setSaving(false);
            setSaveMode(null);
        }
    };

    return (
            <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>Enter Field Observation Record</DialogTitle>
            <DialogContent ref={dialogContentRef} dividers>
                <Stack spacing={2.5}>
                    {error && <Alert severity="error">{error}</Alert>}
                    {parseSummary && <Alert severity="success">{parseSummary}</Alert>}
                    {livePredefinedFieldsError && (
                        <Alert severity="warning">
                            Could not load the live field management table. Showing any matching monitoring fields as a fallback.
                        </Alert>
                    )}

                    <Box>
                    <SectionHeading title="1. Field Information" />
                    <Grid container spacing={2}>
                        {isCreatingCustomField && (
                            <Grid size={{ xs: 12 }}>
                                <Alert severity="info" sx={{ mb: 1 }}>
                                    If the trial or field is missing from the registry, enter its name, then click the map to place boundary points. Add at least 3 points.
                                </Alert>
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        borderRadius: 3,
                                        overflow: 'hidden',
                                        borderColor: 'rgba(86,184,112,0.24)',
                                        bgcolor: 'rgba(255,255,255,0.96)',
                                    }}
                                >
                                    <Box sx={{ height: 320, width: '100%' }}>
                                        <MapContainer
                                            center={drawingMapCenter}
                                            zoom={14}
                                            style={{ height: '100%', width: '100%' }}
                                            scrollWheelZoom
                                        >
                                            <TileLayer
                                                attribution={SATELLITE_TILE_SOURCES[0].attribution}
                                                url={SATELLITE_TILE_SOURCES[0].url}
                                            />
                                            <TileLayer
                                                attribution={SATELLITE_HYBRID_LABELS_SOURCE.attribution}
                                                url={SATELLITE_HYBRID_LABELS_SOURCE.url}
                                                opacity={0.72}
                                            />
                                            <DrawingMapClickCapture onAddPoint={handleAddDrawPoint} />
                                            <DrawingMapViewport points={drawPoints} fallbackCenter={drawingMapCenter} />
                                            {drawPoints.length >= 2 && (
                                                <Polyline
                                                    positions={drawPoints}
                                                    pathOptions={{ color: '#2f7f4f', weight: 3 }}
                                                />
                                            )}
                                            {drawPoints.length >= 3 && (
                                                <Polygon
                                                    positions={drawPoints}
                                                    pathOptions={{
                                                        color: '#1b5e20',
                                                        weight: 3,
                                                        fillColor: '#56b870',
                                                        fillOpacity: 0.22,
                                                    }}
                                                />
                                            )}
                                        </MapContainer>
                                    </Box>
                                    <Stack
                                        direction={{ xs: 'column', sm: 'row' }}
                                        spacing={1.5}
                                        alignItems={{ xs: 'stretch', sm: 'center' }}
                                        justifyContent="space-between"
                                        sx={{ p: 2 }}
                                    >
                                        <Typography variant="body2" color="text.secondary">
                                            {drawPoints.length < 3
                                                ? `${drawPoints.length} point(s) placed. Add at least 3 points to complete the boundary.`
                                                : `Boundary ready with ${drawPoints.length} point(s). Estimated area: ${drawnArea ?? 'N/A'} ha.`}
                                        </Typography>
                                        <Stack direction="row" spacing={1}>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={handleUndoDrawPoint}
                                                disabled={drawPoints.length === 0}
                                            >
                                                Undo Last Point
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="text"
                                                onClick={handleClearDrawPoints}
                                                disabled={drawPoints.length === 0}
                                            >
                                                Clear Drawing
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </Paper>
                            </Grid>
                        )}
                        {isUploadingKML && (
                            <Grid size={{ xs: 12 }}>
                                {kmlError && <Alert severity="error" sx={{ mb: 1 }}>{kmlError}</Alert>}
                                {kmlFeatures.length > 0 ? (
                                    <Paper
                                        variant="outlined"
                                        sx={{
                                            borderRadius: 3,
                                            p: 2,
                                            borderColor: 'rgba(86,184,112,0.24)',
                                            bgcolor: 'rgba(255,255,255,0.96)',
                                        }}
                                    >
                                        <Stack spacing={2}>
                                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                                <Button
                                                    variant={kmlMode === 'geometry' ? 'contained' : 'outlined'}
                                                    onClick={() => setKmlMode('geometry')}
                                                    sx={{ flex: 1 }}
                                                >
                                                    Use Polygon Geometry
                                                </Button>
                                                {kmlPoints.length >= 3 && (
                                                    <Button
                                                        variant={kmlMode === 'points' ? 'contained' : 'outlined'}
                                                        onClick={() => setKmlMode('points')}
                                                        sx={{ flex: 1 }}
                                                    >
                                                        Create from Points ({kmlPoints.length})
                                                    </Button>
                                                )}
                                            </Stack>

                                            {kmlMode === 'geometry' && (
                                                <Stack spacing={1}>
                                                    <Alert severity="success">
                                                        Found {kmlFeatures.length} feature(s) in the KML/KMZ file. Select the one to use as the field boundary:
                                                    </Alert>
                                                    <Stack spacing={1}>
                                                        {kmlFeatures.map((feature, index) => (
                                                            <Button
                                                                key={index}
                                                                onClick={() => handleSelectKMLFeature(index)}
                                                                variant={selectedKMLFeatureIndex === index ? 'contained' : 'outlined'}
                                                                fullWidth
                                                                sx={{
                                                                    textAlign: 'left',
                                                                    justifyContent: 'flex-start',
                                                                    py: 1.5,
                                                                }}
                                                            >
                                                                <Typography variant="body2">
                                                                    {feature.name || `Feature ${index + 1}`}
                                                                    {feature.geometry?.type && ` - ${feature.geometry.type}`}
                                                                </Typography>
                                                            </Button>
                                                        ))}
                                                    </Stack>
                                                </Stack>
                                            )}

                                            {kmlMode === 'points' && kmlPoints.length >= 3 && (
                                                <Stack spacing={1.5}>
                                                    <Alert severity="info">
                                                        Found {kmlPoints.length} point(s) in the KML/KMZ file. Select at least 3 points to create a polygon boundary:
                                                    </Alert>
                                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            onClick={handleSelectAllPoints}
                                                            sx={{ flex: 1 }}
                                                        >
                                                            Select All
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            onClick={handleClearPointSelection}
                                                            sx={{ flex: 1 }}
                                                        >
                                                            Clear Selection
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            onClick={handleCreatePolygonFromPoints}
                                                            disabled={selectedPointIndices.size < 3}
                                                            sx={{ flex: 1 }}
                                                        >
                                                            Create Polygon ({selectedPointIndices.size})
                                                        </Button>
                                                    </Stack>
                                                    <Stack
                                                        spacing={1}
                                                        sx={{
                                                            maxHeight: '300px',
                                                            overflowY: 'auto',
                                                            border: '1px solid rgba(0,0,0,0.12)',
                                                            borderRadius: 1,
                                                            p: 1,
                                                        }}
                                                    >
                                                        {kmlPoints.map((point, index) => (
                                                            <Button
                                                                key={index}
                                                                onClick={() => handleTogglePointSelection(index)}
                                                                variant={selectedPointIndices.has(index) ? 'contained' : 'outlined'}
                                                                fullWidth
                                                                size="small"
                                                                sx={{
                                                                    textAlign: 'left',
                                                                    justifyContent: 'flex-start',
                                                                    py: 1,
                                                                }}
                                                            >
                                                                <Stack direction="column" spacing={0.5} alignItems="flex-start">
                                                                    <Typography variant="body2">
                                                                        {point.name}
                                                                    </Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        Lat: {point.latitude}, Lng: {point.longitude}
                                                                    </Typography>
                                                                </Stack>
                                                            </Button>
                                                        ))}
                                                    </Stack>
                                                </Stack>
                                            )}
                                        </Stack>
                                    </Paper>
                                ) : (
                                    <Paper
                                        variant="outlined"
                                        sx={{
                                            borderRadius: 3,
                                            p: 2,
                                            borderColor: 'rgba(86,184,112,0.24)',
                                            bgcolor: 'rgba(255,255,255,0.96)',
                                        }}
                                    >
                                        <Stack spacing={2} alignItems="center">
                                            <CloudUpload sx={{ fontSize: 48, color: 'text.secondary' }} />
                                            <Typography variant="body1" align="center">
                                                Click the "Upload Field from KML/KMZ" option above, or select a KML or KMZ file:
                                            </Typography>
                                            <Button
                                                variant="contained"
                                                startIcon={<CloudUpload />}
                                                onClick={() => kmlFileInputRef.current?.click()}
                                            >
                                                Choose KML/KMZ File
                                            </Button>
                                        </Stack>
                                    </Paper>
                                )}
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                    <Button
                                        size="small"
                                        variant="text"
                                        onClick={handleCancelKMLUpload}
                                    >
                                        Cancel KML/KMZ Upload
                                    </Button>
                                </Box>
                            </Grid>
                        )}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                select
                                fullWidth
                                label="Field Name"
                                value={isCreatingCustomField ? DRAW_NEW_FIELD_VALUE : isUploadingKML ? UPLOAD_KML_FIELD_VALUE : formData.field_name}
                                onChange={(e) => handleFieldSelection(e.target.value)}
                                helperText={isCreatingCustomField
                                    ? 'Drawing a new field or trial. Save the form to add it to the field management table and monitoring records.'
                                    : isUploadingKML
                                    ? 'Import field boundary from a KML or KMZ file. Save to add it to the field management table and monitoring records.'
                                    : 'Choose a field from the field management table, or draw a new one.'}
                                SelectProps={{
                                    MenuProps: WHITE_SELECT_MENU_PROPS,
                                }}
                            >
                                {selectableFieldOptions.map((field) => (
                                    <MenuItem
                                        key={`${field.blockId}-${field.sectionName}-${field.value}`}
                                        value={field.value}
                                    >
                                        {field.value}
                                    </MenuItem>
                                ))}
                                <MenuItem value={DRAW_NEW_FIELD_VALUE} sx={{ fontWeight: 800, color: 'primary.main' }}>
                                    Draw New Trial / Field
                                </MenuItem>
                            </TextField>
                            <input
                                ref={kmlFileInputRef}
                                type="file"
                                accept=".kml,.kmz"
                                style={{ display: 'none' }}
                                onChange={handleKMLFileSelect}
                            />
                        </Grid>
                        {isCreatingCustomField || isUploadingKML ? (
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    label={isCreatingCustomField ? "New Trial / Field Name" : "Field Name"}
                                    value={formData.field_name || ''}
                                    onChange={(e) => updateField('field_name', e.target.value)}
                                    helperText={isCreatingCustomField
                                        ? "This name will be saved into the field management table for future use."
                                        : "Enter a name for this field imported from KML/KMZ."}
                                />
                            </Grid>
                        ) : (
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    label="Field ID"
                                    value={selectedField?.block_id || formData.block_id || ''}
                                    InputProps={{ readOnly: true }}
                                    disabled
                                />
                            </Grid>
                        )}
                        {(isCreatingCustomField || isUploadingKML) && (
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    label="Field ID"
                                    value={formData.block_id || ''}
                                    onChange={(e) => updateField('block_id', e.target.value)}
                                    helperText={isCreatingCustomField
                                        ? "Set the block where this new field or trial belongs."
                                        : "Auto-filled from the KML feature name; edit if needed."}
                                />
                            </Grid>
                        )}
                        <Grid size={{ xs: 12, md: isCreatingCustomField || isUploadingKML ? 6 : 4 }}>
                            <TextField
                                type="number"
                                fullWidth
                                label="Hectares (ha)"
                                value={formData.area ?? formData.block_size ?? ''}
                                onChange={(e) => handleAreaChange(e.target.value)}
                                inputProps={{ min: 0, step: '0.01' }}
                                helperText={isCreatingCustomField
                                    ? 'Area is estimated from the drawn boundary first, but you can edit it before saving.'
                                    : isUploadingKML
                                    ? 'Area can be calculated from the KML/KMZ geometry or edited before saving.'
                                    : 'Auto-filled from the selected field, but editable before saving.'}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                select
                                fullWidth
                                label="Irrigation Type"
                                value={formData.irrigation_type || ''}
                                onChange={(e) => updateField('irrigation_type', e.target.value)}
                            >
                                {IRRIGATION_TYPE_OPTIONS.map((option) => (
                                    <MenuItem key={option} value={option}>
                                        {option}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                select
                                fullWidth
                                label="Water Source"
                                value={formData.water_source || ''}
                                onChange={(e) => updateField('water_source', e.target.value)}
                            >
                                {WATER_SOURCE_OPTIONS.map((option) => (
                                    <MenuItem key={option} value={option}>
                                        {option}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                fullWidth
                                label="TAM"
                                value={formData.tam_mm || ''}
                                onChange={(e) => updateField('tam_mm', e.target.value)}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                select
                                fullWidth
                                label="Soil Type"
                                value={normalizeSoilTypeLabel(formData.soil_type)}
                                onChange={(e) => updateField('soil_type', e.target.value)}
                            >
                                {SOIL_TYPE_OPTIONS.map((option) => (
                                    <MenuItem key={option} value={option}>
                                        {option}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                type="number"
                                fullWidth
                                label="pH"
                                value={formData.soil_ph ?? ''}
                                onChange={(e) => updateField('soil_ph', parseOptionalNumericInput(e.target.value))}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 8 }}>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Field Remarks"
                                value={formData.field_remarks || formData.remarks || ''}
                                onChange={(e) => setFormData((prev) => ({
                                    ...prev,
                                    field_remarks: e.target.value,
                                    remarks: e.target.value,
                                }))}
                            />
                        </Grid>
                    </Grid>
                    </Box>

                    <Box>
                    <SectionHeading title="2. Trial Information" />
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 3 }}>
                            <TextField
                                fullWidth
                                label="Trial Number"
                                value={formData.trial_number ?? ''}
                                onChange={(e) => updateField('trial_number', e.target.value)}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 5 }}>
                            <TextField
                                fullWidth
                                label="Trial Name"
                                value={formData.trial_name || ''}
                                onChange={(e) => updateField('trial_name', e.target.value)}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                select
                                fullWidth
                                label="Contact Person"
                                value={normalizeContactPersonLabel(formData.contact_person)}
                                onChange={(e) => updateField('contact_person', e.target.value)}
                                SelectProps={{
                                    MenuProps: WHITE_SELECT_MENU_PROPS,
                                }}
                            >
                                {CONTACT_PERSON_OPTIONS.map((option) => (
                                    <MenuItem key={option} value={option}>
                                        {option}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                type="date"
                                fullWidth
                                label="Date Recorded"
                                InputLabelProps={{ shrink: true }}
                                value={formData.date_recorded || ''}
                                onChange={(e) => updateField('date_recorded', e.target.value)}
                            />
                        </Grid>
                    </Grid>
                    </Box>

                    <Box>
                    <SectionHeading title="3. Crop Information" />
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                select
                                fullWidth
                                label="Crop Type"
                                value={formData.crop_type || 'Sugarcane'}
                                onChange={(e) => {
                                    const nextCropType = e.target.value;
                                    const nextOptions = getCropClassOptionsForCropType(nextCropType);
                                    setFormData((prev) => ({
                                        ...prev,
                                        crop_type: nextCropType,
                                        crop_class: nextOptions.includes(prev.crop_class || '') ? prev.crop_class : '',
                                    }));
                                }}
                                SelectProps={{
                                    MenuProps: WHITE_SELECT_MENU_PROPS,
                                }}
                            >
                                {CROP_TYPE_OPTIONS.map((option) => (
                                    <MenuItem key={option} value={option}>
                                        {option}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                select
                                fullWidth
                                label="Crop Class"
                                value={formData.crop_class || ''}
                                onChange={(e) => updateField('crop_class', e.target.value)}
                                SelectProps={{
                                    MenuProps: WHITE_SELECT_MENU_PROPS,
                                }}
                            >
                                {cropClassOptions.map((option) => (
                                    <MenuItem key={option} value={option}>
                                        {option}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                type="date"
                                fullWidth
                                label="Ploughing Date"
                                InputLabelProps={{ shrink: true }}
                                value={formData.ploughing_date || ''}
                                onChange={(e) => updateField('ploughing_date', e.target.value)}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                type="date"
                                fullWidth
                                label="Planting Date"
                                InputLabelProps={{ shrink: true }}
                                value={formData.planting_date || ''}
                                onChange={(e) => handlePlantingDateChange(e.target.value)}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                type="date"
                                fullWidth
                                label="Soil Sampling Date"
                                InputLabelProps={{ shrink: true }}
                                value={formData.soil_sampling_date || ''}
                                onChange={(e) => updateField('soil_sampling_date', e.target.value)}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 8 }}>
                            <Box
                                sx={{
                                    border: '1px solid',
                                    borderColor: pdfError ? 'error.main' : 'rgba(0,0,0,0.23)',
                                    borderRadius: 1,
                                    p: 1.5,
                                    position: 'relative',
                                    '&:hover': { borderColor: 'text.primary' },
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    sx={{
                                        position: 'absolute',
                                        top: -10,
                                        left: 10,
                                        bgcolor: 'background.paper',
                                        px: 0.5,
                                        color: pdfError ? 'error.main' : 'text.secondary',
                                        fontSize: '0.75rem',
                                    }}
                                >
                                    Soil Test Report (PDF)
                                </Typography>
                                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        component="label"
                                        disabled={pdfUploading}
                                        sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                                    >
                                        {pdfUploading ? (
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <CircularProgress size={14} />
                                                <span>Uploading…</span>
                                            </Stack>
                                        ) : (
                                            formData.soil_test_pdf_url ? 'Replace PDF' : 'Upload PDF'
                                        )}
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            hidden
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0]
                                                if (!file) return
                                                if (!isPdfFile(file)) {
                                                    setPdfError('Please select a PDF file.')
                                                    e.target.value = ''
                                                    return
                                                }
                                                setPdfError(null)
                                                setPdfUploading(true)
                                                try {
                                                    const url = await uploadSoilTestPdf(file, buildPdfFieldKey(formData))
                                                    updateField('soil_test_pdf_url', url)
                                                } catch (err) {
                                                    setPdfError(err instanceof Error ? err.message : 'Upload failed')
                                                } finally {
                                                    setPdfUploading(false)
                                                    e.target.value = ''
                                                }
                                            }}
                                        />
                                    </Button>
                                    {formData.soil_test_pdf_url ? (
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography
                                                component="a"
                                                href={formData.soil_test_pdf_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                sx={{
                                                    fontSize: '0.78rem',
                                                    color: 'primary.main',
                                                    textDecoration: 'underline',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    flex: 1,
                                                    minWidth: 0,
                                                }}
                                            >
                                                View uploaded PDF
                                            </Typography>
                                            <Button
                                                size="small"
                                                color="error"
                                                variant="text"
                                                sx={{ flexShrink: 0, minWidth: 0, p: 0.5 }}
                                                onClick={() => {
                                                    updateField('soil_test_pdf_url', '')
                                                    setPdfError(null)
                                                }}
                                            >
                                                Remove
                                            </Button>
                                        </Stack>
                                    ) : (
                                        <Typography variant="caption" color="text.secondary">
                                            No file uploaded
                                        </Typography>
                                    )}
                                </Stack>
                                {pdfError && (
                                    <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                                        {pdfError}
                                    </Typography>
                                )}
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                type="date"
                                fullWidth
                                label="Foliar Sampling Date"
                                InputLabelProps={{ shrink: true }}
                                value={normalizeDateInputValue(formData.foliar_sampling_date)}
                                onChange={(e) => handleFoliarSamplingDateChange(e.target.value)}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 8 }}>
                            <Box
                                sx={{
                                    border: '1px solid',
                                    borderColor: foliarPdfError ? 'error.main' : 'rgba(0,0,0,0.23)',
                                    borderRadius: 1,
                                    p: 1.5,
                                    position: 'relative',
                                    '&:hover': { borderColor: 'text.primary' },
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    sx={{
                                        position: 'absolute',
                                        top: -10,
                                        left: 10,
                                        bgcolor: 'background.paper',
                                        px: 0.5,
                                        color: foliarPdfError ? 'error.main' : 'text.secondary',
                                        fontSize: '0.75rem',
                                    }}
                                >
                                    Foliar Analysis Results (PDF)
                                </Typography>
                                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        component="label"
                                        disabled={foliarPdfUploading}
                                        sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                                    >
                                        {foliarPdfUploading ? (
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <CircularProgress size={14} />
                                                <span>Uploading…</span>
                                            </Stack>
                                        ) : (
                                            formData.foliar_analysis_pdf_url ? 'Replace PDF' : 'Upload PDF'
                                        )}
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            hidden
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0]
                                                if (!file) return
                                                if (!isPdfFile(file)) {
                                                    setFoliarPdfError('Please select a PDF file.')
                                                    e.target.value = ''
                                                    return
                                                }
                                                setFoliarPdfError(null)
                                                setFoliarPdfUploading(true)
                                                try {
                                                    const url = await uploadFoliarAnalysisPdf(file, buildPdfFieldKey(formData))
                                                    updateField('foliar_analysis_pdf_url', url)
                                                } catch (err) {
                                                    setFoliarPdfError(err instanceof Error ? err.message : 'Upload failed')
                                                } finally {
                                                    setFoliarPdfUploading(false)
                                                    e.target.value = ''
                                                }
                                            }}
                                        />
                                    </Button>
                                    {formData.foliar_analysis_pdf_url ? (
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography
                                                component="a"
                                                href={formData.foliar_analysis_pdf_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                sx={{
                                                    fontSize: '0.78rem',
                                                    color: 'primary.main',
                                                    textDecoration: 'underline',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    flex: 1,
                                                    minWidth: 0,
                                                }}
                                            >
                                                View uploaded PDF
                                            </Typography>
                                            <Button
                                                size="small"
                                                color="error"
                                                variant="text"
                                                sx={{ flexShrink: 0, minWidth: 0, p: 0.5 }}
                                                onClick={() => {
                                                    updateField('foliar_analysis_pdf_url', '')
                                                    setFoliarPdfError(null)
                                                }}
                                            >
                                                Remove
                                            </Button>
                                        </Stack>
                                    ) : (
                                        <Typography variant="caption" color="text.secondary">
                                            No file uploaded
                                        </Typography>
                                    )}
                                </Stack>
                                {foliarPdfError && (
                                    <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                                        {foliarPdfError}
                                    </Typography>
                                )}
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                type="date"
                                fullWidth
                                label="Previous Cutting Date"
                                InputLabelProps={{ shrink: true }}
                                value={formData.previous_cutting_date || formData.cutting_date || ''}
                                onChange={(e) => handlePreviousCuttingDateChange(e.target.value)}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                type="date"
                                fullWidth
                                label="Expected Harvest Date"
                                InputLabelProps={{ shrink: true }}
                                value={formData.expected_harvest_date || ''}
                                onChange={(e) => updateField('expected_harvest_date', e.target.value)}
                            />
                        </Grid>
                        {(plantingCalendarSearch || cuttingCalendarSearch) && (
                            <Grid size={{ xs: 12 }}>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} useFlexGap flexWrap="wrap">
                                    {plantingCalendarSearch && (
                                        <Button
                                            component="a"
                                            href={`/calendar?${plantingCalendarSearch}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            variant="outlined"
                                            size="small"
                                            sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 700 }}
                                        >
                                            Open Planting Calendar
                                        </Button>
                                    )}
                                    {cuttingCalendarSearch && (
                                        <Button
                                            component="a"
                                            href={`/calendar?${cuttingCalendarSearch}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            variant="outlined"
                                            size="small"
                                            sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 700 }}
                                        >
                                            Open Cutting Calendar
                                        </Button>
                                    )}
                                </Stack>
                            </Grid>
                        )}
                    </Grid>
                    </Box>

                    <Box>
                    <SectionHeading title="4. Residue Management" />
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                select
                                fullWidth
                                label="Residue Type"
                                value={formData.residue_type || ''}
                                onChange={(e) => updateField('residue_type', e.target.value)}
                            >
                                {RESIDUE_TYPE_OPTIONS.map((option) => (
                                    <MenuItem key={option} value={option}>
                                        {option}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                select
                                fullWidth
                                label="Residue Management Method"
                                value={formData.residue_management_method || ''}
                                onChange={(e) => updateField('residue_management_method', e.target.value)}
                            >
                                {RESIDUE_MANAGEMENT_METHOD_OPTIONS.map((option) => (
                                    <MenuItem key={option} value={option}>
                                        {option}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Residue Remarks"
                                value={formData.residual_management_remarks || ''}
                                onChange={(e) => updateField('residual_management_remarks', e.target.value)}
                            />
                        </Grid>
                    </Grid>
                    </Box>

                    <Box>
                    <SectionHeading title="5. Nutrient Management" />
                    <Stack spacing={2}>
                        <Paper
                            variant="outlined"
                            sx={{
                                borderRadius: 3,
                                p: 2,
                                borderColor: 'rgba(86,184,112,0.2)',
                                bgcolor: 'rgba(255,255,255,0.78)',
                            }}
                        >
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
                                Current Fertilizer Application
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                {currentFertilizerApplication
                                    ? [
                                        currentFertilizerApplication.fertilizer_type || '',
                                        currentFertilizerApplication.application_rate != null
                                            ? `Rate ${currentFertilizerApplication.application_rate}`
                                            : '',
                                    ].filter(Boolean).join(' | ')
                                    : 'No fertilizer application added yet.'}
                            </Typography>
                        </Paper>

                        {fertilizerApplicationRows.map((application, index) => (
                            <Paper
                                key={`fertilizer-application-${index}`}
                                variant="outlined"
                                sx={{
                                    borderRadius: 3,
                                    p: 2,
                                    borderColor: 'rgba(86,184,112,0.18)',
                                    bgcolor: 'rgba(255,255,255,0.82)',
                                }}
                            >
                                <Stack spacing={2}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                            Fertilizer Application
                                        </Typography>
                                        {index > 0 && (
                                            <Button
                                                size="small"
                                                variant="text"
                                                color="inherit"
                                                onClick={() => handleRemoveFertilizerApplication(index)}
                                            >
                                                Remove
                                            </Button>
                                        )}
                                    </Stack>
                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <TextField
                                                fullWidth
                                                label="Fertilizer Type"
                                                value={application.fertilizer_type || ''}
                                                onChange={(e) => handleFertilizerApplicationChange(index, 'fertilizer_type', e.target.value)}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <TextField
                                                type="date"
                                                fullWidth
                                                label="Application Date"
                                                InputLabelProps={{ shrink: true }}
                                                value={normalizeDateInputValue(application.application_date)}
                                                onChange={(e) => handleFertilizerApplicationChange(index, 'application_date', e.target.value)}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <TextField
                                                type="number"
                                                fullWidth
                                                label="Application Rate"
                                                value={application.application_rate ?? ''}
                                                onChange={(e) => handleFertilizerApplicationChange(index, 'application_rate', parseOptionalNumericInput(e.target.value))}
                                            />
                                        </Grid>
                                    </Grid>
                                </Stack>
                            </Paper>
                        ))}

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="flex-end">
                            <Button
                                variant="outlined"
                                onClick={handleAddFertilizerApplication}
                                disabled={fertilizerApplicationRows.length >= MAX_APPLICATION_LOOPS}
                            >
                                Add Fertilizer Application
                            </Button>
                        </Stack>
                    </Stack>
                    </Box>

                    <Box>
                    <SectionHeading title="6. Weed Management" />
                    <Stack spacing={2}>
                        <Paper
                            variant="outlined"
                            sx={{
                                borderRadius: 3,
                                p: 2,
                                borderColor: 'rgba(86,184,112,0.2)',
                                bgcolor: 'rgba(255,255,255,0.78)',
                            }}
                        >
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
                                Current Herbicide Application
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                {currentHerbicideApplication
                                    ? [
                                        currentHerbicideApplication.herbicide_name || '',
                                        currentHerbicideApplication.application_rate != null
                                            ? `Rate ${currentHerbicideApplication.application_rate}`
                                            : '',
                                    ].filter(Boolean).join(' | ')
                                    : 'No herbicide application added yet.'}
                            </Typography>
                        </Paper>

                        {herbicideApplicationRows.map((application, index) => (
                            <Paper
                                key={`herbicide-application-${index}`}
                                variant="outlined"
                                sx={{
                                    borderRadius: 3,
                                    p: 2,
                                    borderColor: 'rgba(86,184,112,0.18)',
                                    bgcolor: 'rgba(255,255,255,0.82)',
                                }}
                            >
                                <Stack spacing={2}>
                                    {index > 0 && (
                                        <Stack direction="row" justifyContent="flex-end">
                                            <Button
                                                size="small"
                                                variant="text"
                                                color="inherit"
                                                onClick={() => handleRemoveHerbicideApplication(index)}
                                            >
                                                Remove
                                            </Button>
                                        </Stack>
                                    )}
                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <TextField
                                                fullWidth
                                                label="Herbicide Name"
                                                value={application.herbicide_name || ''}
                                                onChange={(e) => handleHerbicideApplicationChange(index, 'herbicide_name', e.target.value)}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <TextField
                                                type="date"
                                                fullWidth
                                                label="Application Date"
                                                InputLabelProps={{ shrink: true }}
                                                value={normalizeDateInputValue(application.application_date)}
                                                onChange={(e) => handleHerbicideApplicationChange(index, 'application_date', e.target.value)}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <TextField
                                                type="number"
                                                fullWidth
                                                label="Application Rate"
                                                value={application.application_rate ?? ''}
                                                onChange={(e) => handleHerbicideApplicationChange(index, 'application_rate', parseOptionalNumericInput(e.target.value))}
                                            />
                                        </Grid>
                                    </Grid>
                                </Stack>
                            </Paper>
                        ))}

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="flex-end">
                            <Button
                                variant="outlined"
                                onClick={handleAddHerbicideApplication}
                                disabled={herbicideApplicationRows.length >= MAX_APPLICATION_LOOPS}
                            >
                                Add Herbicide Application
                            </Button>
                        </Stack>
                    </Stack>
                    </Box>

                    <Box>
                    <SectionHeading title="7. Crop Protection" />
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Pest Remarks"
                                value={formData.pest_remarks || ''}
                                onChange={(e) => updateField('pest_remarks', e.target.value)}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Disease Remarks"
                                value={formData.disease_remarks || ''}
                                onChange={(e) => updateField('disease_remarks', e.target.value)}
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Box
                                sx={{
                                    border: '1px solid',
                                    borderColor: eldanaPdfError ? 'error.main' : 'rgba(0,0,0,0.23)',
                                    borderRadius: 1,
                                    p: 1.5,
                                    position: 'relative',
                                    '&:hover': { borderColor: 'text.primary' },
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    sx={{
                                        position: 'absolute',
                                        top: -10,
                                        left: 10,
                                        bgcolor: 'background.paper',
                                        px: 0.5,
                                        color: eldanaPdfError ? 'error.main' : 'text.secondary',
                                        fontSize: '0.75rem',
                                    }}
                                >
                                    Final Eldana Survey (PDF)
                                </Typography>
                                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        component="label"
                                        disabled={eldanaPdfUploading}
                                        sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                                    >
                                        {eldanaPdfUploading ? (
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <CircularProgress size={14} />
                                                <span>Uploading…</span>
                                            </Stack>
                                        ) : (
                                            formData.final_eldana_survey_pdf_url ? 'Replace PDF' : 'Upload PDF'
                                        )}
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            hidden
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                if (!isPdfFile(file)) {
                                                    setEldanaPdfError('Please select a PDF file for the final eldana survey.');
                                                    e.target.value = '';
                                                    return;
                                                }
                                                setEldanaPdfError(null);
                                                setEldanaPdfUploading(true);
                                                try {
                                                    const url = await uploadFinalEldanaSurveyPdf(file, buildPdfFieldKey(formData));
                                                    updateField('final_eldana_survey_pdf_url', url);
                                                } catch (err) {
                                                    setEldanaPdfError(err instanceof Error ? err.message : 'Upload failed');
                                                } finally {
                                                    setEldanaPdfUploading(false);
                                                    e.target.value = '';
                                                }
                                            }}
                                        />
                                    </Button>
                                    {formData.final_eldana_survey_pdf_url ? (
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography
                                                component="a"
                                                href={formData.final_eldana_survey_pdf_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                sx={{
                                                    fontSize: '0.78rem',
                                                    color: 'primary.main',
                                                    textDecoration: 'underline',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    flex: 1,
                                                    minWidth: 0,
                                                }}
                                            >
                                                View uploaded PDF
                                            </Typography>
                                            <Button
                                                size="small"
                                                color="error"
                                                variant="text"
                                                sx={{ flexShrink: 0, minWidth: 0, p: 0.5 }}
                                                onClick={() => {
                                                    updateField('final_eldana_survey_pdf_url', '');
                                                    setEldanaPdfError(null);
                                                }}
                                            >
                                                Remove
                                            </Button>
                                        </Stack>
                                    ) : (
                                        <Typography variant="caption" color="text.secondary">
                                            Optional upload
                                        </Typography>
                                    )}
                                </Stack>
                                {eldanaPdfError && (
                                    <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                                        {eldanaPdfError}
                                    </Typography>
                                )}
                            </Box>
                        </Grid>
                    </Grid>
                    </Box>

                    <Box>
                    <SectionHeading title="8. Harvest Information" />
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                type="date"
                                fullWidth
                                label="Harvest Date"
                                InputLabelProps={{ shrink: true }}
                                value={formData.harvest_date || ''}
                                onChange={(e) => handleHarvestDateChange(e.target.value)}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                type="number"
                                fullWidth
                                label="Yield"
                                value={formData.yield ?? ''}
                                onChange={(e) => updateField('yield', parseOptionalNumericInput(e.target.value))}
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                label="Quality Remarks"
                                value={formData.quality_remarks || ''}
                                onChange={(e) => updateField('quality_remarks', e.target.value)}
                            />
                        </Grid>
                    </Grid>
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions
                sx={{
                    px: 3,
                    pb: 2.4,
                    pt: 1.6,
                    gap: 1.2,
                    flexWrap: 'wrap',
                }}
            >
                <Button
                    onClick={onClose}
                    sx={{
                        borderRadius: '999px',
                        px: 2.1,
                        fontWeight: 700,
                        textTransform: 'none',
                    }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={() => handleSubmit('close')}
                    variant="contained"
                    disabled={saving || pdfUploading || foliarPdfUploading || eldanaPdfUploading}
                    sx={{
                        borderRadius: '999px',
                        px: 2.5,
                        py: 0.95,
                        fontWeight: 800,
                        textTransform: 'none',
                        boxShadow: '0 14px 28px rgba(86,184,112,0.22)',
                    }}
                >
                    {saving && saveMode === 'close' ? 'Saving...' : 'Save Form'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
