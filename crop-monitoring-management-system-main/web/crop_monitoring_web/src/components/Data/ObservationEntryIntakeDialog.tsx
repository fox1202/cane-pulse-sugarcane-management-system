import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { EditNoteRounded, UploadFileOutlined } from '@mui/icons-material';
import L from 'leaflet';
import { MapContainer, Polygon, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import {
    bulkCreateObservationEntryFormSubmissions,
    createPredefinedField,
    createObservationEntryFormSubmission,
    fetchPredefinedFields,
    getPredefinedFieldByName,
    type ObservationEntryFormSubmissionInput,
    type PredefinedField,
} from '@/services/database.service';
import { useAuth } from '@/contexts/AuthContext';
import {
    downloadObservationEntryCsvTemplate,
    parseObservationEntryCsv,
} from '@/utils/csvObservationImport';
import {
    buildObservationEntrySubmissionFromPdf,
    extractTextFromPdf,
    parseObservationPdfText,
} from '@/utils/pdfObservationImport';

interface ObservationEntryIntakeDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmitted: () => Promise<void> | void;
}

const IRRIGATION_TYPE_OPTIONS = [
    'Furrow',
    'Overhead Sprinkler',
    'Center Pivot',
    'Sub Surface Drip',
];

const WATER_SOURCE_OPTIONS = ['Dam 1', 'Dam 2', 'Dam 3'];
const SOIL_TYPE_OPTIONS = ['SaL', 'SaC', 'SaCL'];
const CROP_TYPE_OPTIONS = ['Sugarcane', 'Break Crop', 'Fallow Period'];
const SUGARCANE_CROP_CLASS_OPTIONS = [
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
];
const BREAK_CROP_CLASS_OPTIONS = ['Soyabeans', 'Sugarbeans', 'Sunnhemp', 'Velvet Beans', 'Maize'];
const FALLOW_CROP_CLASS_OPTIONS = ['None'];
const RESIDUE_TYPE_OPTIONS = ['Soyabeans', 'Sugarbeans', 'Sunnhemp', 'Velvet Beans', 'None'];
const RESIDUE_MANAGEMENT_METHOD_OPTIONS = ['Ploughed in', 'Parting', 'Broadcasting', 'None'];
const DRAW_NEW_FIELD_VALUE = '__draw_new_field__';
const DEFAULT_DRAW_CENTER: [number, number] = [-18.922, 31.134];
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
        planting_date: '',
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
        foliar_sampling_date: '',
        herbicide_name: '',
        weed_application_date: '',
        weed_application_rate: undefined,
        pest_remarks: '',
        disease_remarks: '',
        harvest_date: '',
        yield: undefined,
        quality_remarks: '',
        remarks: '',
    };
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

    if (normalized === 'fallow period') {
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
            crop_type: preserved.crop_type || empty.crop_type,
        };
    }

    return {
        ...preserved,
        field_id: matchedField.field_name,
        selected_field: matchedField.field_name,
        field_name: matchedField.field_name,
        section_name: matchedField.section_name,
        block_id: matchedField.block_id,
        area: estimateGeometryAreaHa(matchedField.geom),
        block_size: estimateGeometryAreaHa(matchedField.geom),
        latitude: matchedField.latitude ?? empty.latitude,
        longitude: matchedField.longitude ?? empty.longitude,
        spatial_data: matchedField.geom ?? undefined,
        geom_polygon: matchedField.geom ?? undefined,
        crop_type: matchedField.crop_type || preserved.crop_type || empty.crop_type,
    };
}

export const ObservationEntryIntakeDialog: React.FC<ObservationEntryIntakeDialogProps> = ({
    open,
    onClose,
    onSubmitted,
}) => {
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const csvInputRef = useRef<HTMLInputElement | null>(null);
    const dialogContentRef = useRef<HTMLDivElement | null>(null);
    const [predefinedFields, setPredefinedFields] = useState<PredefinedField[]>([]);
    const [formData, setFormData] = useState<ObservationEntryFormSubmissionInput>(createEmptySubmission(user?.id || ''));
    const [loadingFields, setLoadingFields] = useState(false);
    const [parsingPdf, setParsingPdf] = useState(false);
    const [importingCsv, setImportingCsv] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [parseSummary, setParseSummary] = useState<string | null>(null);
    const [parseWarnings, setParseWarnings] = useState<string[]>([]);
    const [isCreatingCustomField, setIsCreatingCustomField] = useState(false);
    const [drawPoints, setDrawPoints] = useState<DrawPoint[]>([]);

    useEffect(() => {
        if (!open) return;

        setFormData(createEmptySubmission(user?.id || ''));
        setError(null);
        setParseSummary(null);
        setParseWarnings([]);
        setIsCreatingCustomField(false);
        setDrawPoints([]);
    }, [open, user?.id]);

    useEffect(() => {
        if (!open) return;

        let mounted = true;

        const loadFields = async () => {
            setLoadingFields(true);
            try {
                const fields = await fetchPredefinedFields();
                if (mounted) {
                    setPredefinedFields(fields);
                }
            } catch (err: any) {
                if (mounted) {
                    setError(err.message || 'Failed to load predefined fields.');
                }
            } finally {
                if (mounted) {
                    setLoadingFields(false);
                }
            }
        };

        loadFields();

        return () => {
            mounted = false;
        };
    }, [open]);

    const selectedField = useMemo(
        () => getPredefinedFieldByName(predefinedFields, formData.field_name),
        [predefinedFields, formData.field_name]
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

    const updateField = (field: keyof ObservationEntryFormSubmissionInput, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
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
        if (fieldName === DRAW_NEW_FIELD_VALUE) {
            setIsCreatingCustomField(true);
            setDrawPoints([]);
            setFormData((prev) => buildFreshFormData(
                prev,
                user?.id || prev.collector_id || '',
            ));
            return;
        }

        const match = getPredefinedFieldByName(predefinedFields, fieldName);
        setIsCreatingCustomField(false);
        setDrawPoints([]);

        if (!match) {
            return;
        }

        setFormData((prev) => buildFreshFormData(
            prev,
            user?.id || prev.collector_id || '',
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

    const handlePdfSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) return;

        setParsingPdf(true);
        setError(null);

        try {
            const text = await extractTextFromPdf(file);
            const parsed = parseObservationPdfText(text);
            const draft = buildObservationEntrySubmissionFromPdf(parsed, user?.id || '', predefinedFields);

            setFormData((prev) => ({
                ...prev,
                ...draft,
                collector_id: user?.id || prev.collector_id,
            }));
            setParseWarnings(parsed.warnings);
            setParseSummary(`Parsed ${Object.keys(parsed.extractedFields).length} field(s) from ${file.name}. Review before saving.`);
        } catch (err: any) {
            console.error('Failed to parse PDF:', err);
            setError(err.message || 'Failed to read the PDF file.');
        } finally {
            setParsingPdf(false);
        }
    };

    const handleCsvSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) return;

        setImportingCsv(true);
        setError(null);
        setParseSummary(null);
        setParseWarnings([]);

        try {
            const text = await file.text();
            const parsed = parseObservationEntryCsv(text, user?.id || '', predefinedFields);
            const result = await bulkCreateObservationEntryFormSubmissions(parsed.rows);

            await onSubmitted();

            setParseWarnings([...parsed.warnings, ...result.failures]);
            setParseSummary(
                `CSV import complete: ${result.insertedCount} inserted and ${result.failureCount} failed from ${parsed.parsedRowCount} parsed row(s). Duplicates are allowed.`
            );
        } catch (err: any) {
            console.error('Failed to import CSV:', err);
            setError(err.message || 'Failed to import the CSV file.');
        } finally {
            setImportingCsv(false);
        }
    };

    const handleSubmit = async () => {
        setSaving(true);
        setError(null);

        try {
            if (!formData.field_name && !isCreatingCustomField) {
                throw new Error('Please select a field before saving.');
            }

            let resolvedField = selectedField;
            let registryFields = predefinedFields;

            if (isCreatingCustomField) {
                const normalizedFieldName = formData.field_name.trim();
                const hasExistingField = predefinedFields.some((field) =>
                    field.field_name.trim().toLowerCase() === normalizedFieldName.toLowerCase()
                );

                if (!normalizedFieldName) {
                    throw new Error('Please enter a new trial or field name.');
                }

                if (hasExistingField) {
                    throw new Error('That field name already exists in the registry. Please select it from the list instead.');
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
                    date_recorded: formData.date_recorded,
                });

                registryFields = [...predefinedFields, createdField]
                    .sort((left, right) => left.field_name.localeCompare(right.field_name, undefined, { sensitivity: 'base' }));
                resolvedField = createdField;

                setPredefinedFields(registryFields);
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

            if (!resolvedField) {
                throw new Error('Please choose a predefined field from the registry.');
            }

            if (!formData.date_recorded) {
                throw new Error('Date recorded is required.');
            }

            const submission = {
                ...formData,
                collector_id: user?.id || formData.collector_id,
                selected_field: resolvedField.field_name || formData.selected_field,
                field_id: resolvedField.field_name || formData.field_id,
                field_name: resolvedField.field_name || formData.field_name,
                section_name: resolvedField.section_name || formData.section_name,
                block_id: resolvedField.block_id || formData.block_id,
                spatial_data: formData.spatial_data ?? resolvedField.geom ?? undefined,
                geom_polygon: formData.geom_polygon ?? resolvedField.geom ?? undefined,
                latitude: formData.latitude ?? resolvedField.latitude ?? 0,
                longitude: formData.longitude ?? resolvedField.longitude ?? 0,
            };

            await createObservationEntryFormSubmission(submission, registryFields);

            await onSubmitted();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save the observation entry form.');
        } finally {
            setSaving(false);
        }
    };

    const handleEditForm = () => {
        dialogContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>Upload CSV/PDF or Manually Enter Field Observation Form</DialogTitle>
            <DialogContent ref={dialogContentRef} dividers>
                <Stack spacing={2.5}>
                    <Alert severity="info">
                        Upload a text-based PDF to auto-fill one form, upload a CSV for bulk import, or leave it blank and type the details manually.
                    </Alert>

                    {error && <Alert severity="error">{error}</Alert>}
                    {parseSummary && <Alert severity="success">{parseSummary}</Alert>}
                    {parseWarnings.length > 0 && (
                        <Alert severity="warning">
                            {parseWarnings.join(' ')}
                        </Alert>
                    )}

                    <Box
                        sx={{
                            border: '1px dashed rgba(47,159,90,0.35)',
                            borderRadius: 3,
                            p: 2.5,
                            bgcolor: 'rgba(47,159,90,0.04)',
                        }}
                    >
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
                            <Button
                                variant="outlined"
                                startIcon={parsingPdf ? <CircularProgress size={16} /> : <UploadFileOutlined />}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={parsingPdf || importingCsv || loadingFields}
                            >
                                {parsingPdf ? 'Reading PDF...' : 'Upload PDF to Autofill'}
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={importingCsv ? <CircularProgress size={16} /> : <UploadFileOutlined />}
                                onClick={() => csvInputRef.current?.click()}
                                disabled={parsingPdf || importingCsv || loadingFields}
                            >
                                {importingCsv ? 'Importing CSV...' : 'Upload CSV for Bulk Import'}
                            </Button>
                            <Button
                                variant="text"
                                onClick={downloadObservationEntryCsvTemplate}
                                disabled={parsingPdf || importingCsv}
                            >
                                Download CSV Template
                            </Button>
                            <Typography variant="body2" color="text.secondary">
                                PDF works best with selectable text. CSV supports multiple columns, keeps blank cells empty, and allows duplicates.
                            </Typography>
                        </Stack>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="application/pdf"
                            hidden
                            onChange={handlePdfSelect}
                        />
                        <input
                            ref={csvInputRef}
                            type="file"
                            accept=".csv,text/csv"
                            hidden
                            onChange={handleCsvSelect}
                        />
                    </Box>

                    <SectionHeading title="1. Field Information" />
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                select
                                fullWidth
                                label="Trials"
                                value={isCreatingCustomField ? DRAW_NEW_FIELD_VALUE : formData.field_name}
                                onChange={(e) => handleFieldSelection(e.target.value)}
                                disabled={loadingFields}
                                helperText={isCreatingCustomField
                                    ? 'Drawing a new field or trial. Save the form to add it to the registry.'
                                    : 'Can’t find it in the list? Choose "Draw New Trial / Field".'}
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
                        </Grid>
                        {isCreatingCustomField ? (
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    label="New Trial / Field Name"
                                    value={formData.field_name || ''}
                                    onChange={(e) => updateField('field_name', e.target.value)}
                                    helperText="This name will be saved into the field registry for future use."
                                />
                            </Grid>
                        ) : (
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    label="Block ID"
                                    value={selectedField?.block_id || formData.block_id || ''}
                                    InputProps={{ readOnly: true }}
                                    disabled
                                />
                            </Grid>
                        )}
                        {isCreatingCustomField && (
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    label="Block ID"
                                    value={formData.block_id || ''}
                                    onChange={(e) => updateField('block_id', e.target.value)}
                                    helperText="Set the block where this new field or trial belongs."
                                />
                            </Grid>
                        )}
                        <Grid size={{ xs: 12, md: isCreatingCustomField ? 6 : 4 }}>
                            <TextField
                                fullWidth
                                label="Area"
                                value={formData.area ?? formData.block_size ?? ''}
                                InputProps={{ readOnly: true }}
                                disabled
                                helperText={isCreatingCustomField ? 'Area is estimated from the drawn boundary.' : undefined}
                            />
                        </Grid>
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
                                                attribution="&copy; OpenStreetMap contributors"
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
                                value={formData.soil_type || ''}
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
                                fullWidth
                                label="Contact Person"
                                value={formData.contact_person || ''}
                                onChange={(e) => updateField('contact_person', e.target.value)}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                type="date"
                                fullWidth
                                label="Date Recorded"
                                required
                                InputLabelProps={{ shrink: true }}
                                value={formData.date_recorded || ''}
                                onChange={(e) => updateField('date_recorded', e.target.value)}
                            />
                        </Grid>
                    </Grid>

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
                                label="Planting Date"
                                InputLabelProps={{ shrink: true }}
                                value={formData.planting_date || ''}
                                onChange={(e) => updateField('planting_date', e.target.value)}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                type="date"
                                fullWidth
                                label="Previous Cutting Date"
                                InputLabelProps={{ shrink: true }}
                                value={formData.previous_cutting_date || formData.cutting_date || ''}
                                onChange={(e) => setFormData((prev) => ({
                                    ...prev,
                                    previous_cutting_date: e.target.value,
                                    cutting_date: e.target.value,
                                }))}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                type="date"
                                fullWidth
                                label="Expected Harvest Date"
                                InputLabelProps={{ shrink: true }}
                                value={formData.expected_harvest_date || ''}
                                onChange={(e) => updateField('expected_harvest_date', e.target.value)}
                            />
                        </Grid>
                    </Grid>

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

                    <SectionHeading title="5. Nutrient Management" />
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                fullWidth
                                label="Fertilizer Type"
                                value={formData.fertilizer_type || ''}
                                onChange={(e) => updateField('fertilizer_type', e.target.value)}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                type="date"
                                fullWidth
                                label="Nutrient Application Date"
                                InputLabelProps={{ shrink: true }}
                                value={formData.nutrient_application_date || ''}
                                onChange={(e) => updateField('nutrient_application_date', e.target.value)}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                type="number"
                                fullWidth
                                label="Application Rate"
                                value={formData.application_rate ?? ''}
                                onChange={(e) => updateField('application_rate', parseOptionalNumericInput(e.target.value))}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                type="date"
                                fullWidth
                                label="Foliar Sampling Date"
                                InputLabelProps={{ shrink: true }}
                                value={formData.foliar_sampling_date || ''}
                                onChange={(e) => updateField('foliar_sampling_date', e.target.value)}
                            />
                        </Grid>
                    </Grid>

                    <SectionHeading title="6. Weed Management" />
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                fullWidth
                                label="Herbicide Name"
                                value={formData.herbicide_name || ''}
                                onChange={(e) => updateField('herbicide_name', e.target.value)}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                type="date"
                                fullWidth
                                label="Weed Application Date"
                                InputLabelProps={{ shrink: true }}
                                value={formData.weed_application_date || ''}
                                onChange={(e) => updateField('weed_application_date', e.target.value)}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                type="number"
                                fullWidth
                                label="Weed Application Rate"
                                value={formData.weed_application_rate ?? ''}
                                onChange={(e) => updateField('weed_application_rate', parseOptionalNumericInput(e.target.value))}
                            />
                        </Grid>
                    </Grid>

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
                    </Grid>

                    <SectionHeading title="8. Harvest Information" />
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                type="date"
                                fullWidth
                                label="Harvest Date"
                                InputLabelProps={{ shrink: true }}
                                value={formData.harvest_date || ''}
                                onChange={(e) => updateField('harvest_date', e.target.value)}
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
                    onClick={handleEditForm}
                    variant="outlined"
                    disabled={saving || parsingPdf || importingCsv || loadingFields}
                    startIcon={<EditNoteRounded />}
                    sx={{
                        borderRadius: '999px',
                        px: 2.3,
                        py: 0.95,
                        borderColor: 'rgba(86,184,112,0.42)',
                        bgcolor: 'rgba(255,255,255,0.86)',
                        color: '#2f7f4f',
                        fontWeight: 800,
                        textTransform: 'none',
                        boxShadow: '0 10px 24px rgba(86,184,112,0.1)',
                        '&:hover': {
                            borderColor: 'rgba(86,184,112,0.66)',
                            bgcolor: 'rgba(86,184,112,0.08)',
                            boxShadow: '0 12px 28px rgba(86,184,112,0.14)',
                        },
                    }}
                >
                    Edit Form
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={saving || parsingPdf || importingCsv || loadingFields}
                    sx={{
                        borderRadius: '999px',
                        px: 2.5,
                        py: 0.95,
                        fontWeight: 800,
                        textTransform: 'none',
                        boxShadow: '0 14px 28px rgba(86,184,112,0.22)',
                    }}
                >
                    {saving ? 'Saving...' : 'Save Form'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
