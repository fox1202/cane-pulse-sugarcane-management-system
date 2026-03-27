import { useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Grid,
    Box,
    Chip,
    alpha,
    useTheme,
    Paper,
} from '@mui/material'
import {
    AccessTime,
    StorageRounded,
    PersonOutlineRounded,
    GrassRounded,
    MyLocationRounded,
    NotesRounded,
    Image as ImageIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'
import L from 'leaflet'
import { MapContainer, TileLayer, CircleMarker, GeoJSON, useMap } from 'react-leaflet'
import type { FullObservation } from '@/types/database.types'
import type { MobileObservationEntryFormFields, MobileObservationRecord } from '@/services/database.service'
import { MapCenterObject } from '@/components/Map/MapCenterObject'
import {
    SATELLITE_HYBRID_LABELS_SOURCE,
    SATELLITE_TILE_SOURCES,
    centroidFromGeometry,
    getMobileSpatialGeometry,
    getRenderableBoundaryGeometry,
} from '@/pages/mapView.utils'
import { normalizeDateOnlyValue } from '@/utils/dateOnly'

type ObservationDetailRecord = FullObservation | MobileObservationRecord

interface ObservationDetailDialogProps {
    open: boolean
    onClose: () => void
    observation: ObservationDetailRecord | null
    onGenerateReport: (obs: ObservationDetailRecord) => void
}

interface DetailItemProps {
    label: string
    value: string | number
}

interface DetailCardProps {
    title: string
    subtitle?: string
    children: React.ReactNode
}

interface SummaryTileProps {
    label: string
    value: string | number
}

function isMobileObservationRecord(observation: ObservationDetailRecord): observation is MobileObservationRecord {
    return 'source_table' in observation
}

function getCurrentSheet(observation: ObservationDetailRecord) {
    return isMobileObservationRecord(observation) ? observation.monitoring_sheet : undefined
}

function hasValue(value: unknown): boolean {
    if (value === null || value === undefined) return false
    if (typeof value === 'string') return value.trim().length > 0
    return true
}

function formatDateTime(value?: string): string {
    if (!value) return '-'

    const dateOnly = normalizeDateOnlyValue(value)
    if (dateOnly && value.trim() === dateOnly) {
        return formatSimpleDate(dateOnly)
    }

    try {
        return format(new Date(value), 'MMM dd, yyyy • HH:mm')
    } catch {
        return value
    }
}

function formatCoordinate(value?: number): string {
    if (typeof value !== 'number' || Number.isNaN(value)) return '-'
    return value.toFixed(5)
}

function formatSimpleDate(value?: string): string {
    if (!value) return '-'

    try {
        return format(new Date(value), 'MMM dd, yyyy')
    } catch {
        return value
    }
}

function formatSyncStatus(value?: boolean): string {
    if (value === true) return 'Synced'
    if (value === false) return 'Pending Sync'
    return '-'
}

function formatSourceLabel(sourceTable?: string): string {
    if (!sourceTable) return 'observations'
    if (sourceTable === 'sugarcane_monitoring') return 'Monitoring record'
    return sourceTable.replace(/_/g, ' ')
}

function MapPreviewFitter({
    geometry,
    center,
}: {
    geometry: any | null
    center: [number, number] | null
}) {
    const map = useMap()

    useEffect(() => {
        if (geometry) {
            try {
                const bounds = L.geoJSON(geometry).getBounds()
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [24, 24], animate: true, duration: 1 })
                    return
                }
            } catch (error) {
                console.warn('Unable to fit polygon preview bounds.', error)
            }
        }

        if (center) {
            map.setView(center, 15, { animate: true, duration: 1 })
        }
    }, [map, geometry, center])

    return null
}

function DetailItem({ label, value }: DetailItemProps) {
    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: '140px 1fr',
                gap: 2,
                py: 1.25,
                borderBottom: '1px solid rgba(47,159,90,0.12)',
                '&:last-child': { borderBottom: 'none', pb: 0 },
            }}
        >
            <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}>
                {label}
            </Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', wordBreak: 'break-word' }}>
                {value}
            </Typography>
        </Box>
    )
}

function DetailCard({ title, subtitle, children }: DetailCardProps) {
    return (
        <Paper
            sx={{
                p: 3,
                borderRadius: 4,
                bgcolor: '#f8fcf9',
                border: '1px solid rgba(47,159,90,0.12)',
                boxShadow: 'none',
                height: '100%',
            }}
        >
            <Typography sx={{ fontSize: 16, fontWeight: 900, color: 'text.primary', mb: 0.4 }}>
                {title}
            </Typography>
            {subtitle && (
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>
                    {subtitle}
                </Typography>
            )}
            {children}
        </Paper>
    )
}

function SummaryTile({ label, value }: SummaryTileProps) {
    return (
        <Paper
            sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: '#ffffff',
                border: '1px solid rgba(47,159,90,0.14)',
                boxShadow: 'none',
            }}
        >
            <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.6 }}>
                {label}
            </Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 800, color: 'text.primary', wordBreak: 'break-word' }}>
                {value}
            </Typography>
        </Paper>
    )
}

function formatPhoneNumber(entryForm?: MobileObservationEntryFormFields): string {
    if (!entryForm) return '-'

    const parts = [entryForm.phone_country_code, entryForm.phone_number]
        .filter((value) => typeof value === 'string' && value.trim().length > 0)

    return parts.length > 0 ? parts.join(' ') : '-'
}

export const ObservationDetailDialog = ({
    open,
    onClose,
    observation,
    onGenerateReport,
}: ObservationDetailDialogProps) => {
    const theme = useTheme()

    if (!observation) return null

    const currentSheet = getCurrentSheet(observation)
    const sourceTable = isMobileObservationRecord(observation) ? observation.source_table : 'observations'
    const sourceLabel = formatSourceLabel(sourceTable)
    const displayId = currentSheet?.id || observation.client_uuid || observation.id
    const hasImages = Boolean(observation.images?.length)
    const entryForm = isMobileObservationRecord(observation) ? observation.entry_form : undefined
    const fieldRegistry = isMobileObservationRecord(observation) ? observation.field_registry : undefined
    const previewGeometry = isMobileObservationRecord(observation)
        ? getMobileSpatialGeometry(observation)
        : getRenderableBoundaryGeometry((observation as any)?.geom_polygon)
    const preferredLatitude = currentSheet?.latitude
        ?? entryForm?.latitude
        ?? fieldRegistry?.latitude
        ?? observation.latitude
    const preferredLongitude = currentSheet?.longitude
        ?? entryForm?.longitude
        ?? fieldRegistry?.longitude
        ?? observation.longitude
    const coordinateCenter = typeof preferredLatitude === 'number'
        && typeof preferredLongitude === 'number'
        && !Number.isNaN(preferredLatitude)
        && !Number.isNaN(preferredLongitude)
        && (preferredLatitude !== 0 || preferredLongitude !== 0)
        ? [preferredLatitude, preferredLongitude] as [number, number]
        : null
    const previewCenter = centroidFromGeometry(previewGeometry) ?? coordinateCenter
    const hasCoordinates = Boolean(coordinateCenter)
    const hasMapPreview = Boolean(previewGeometry || previewCenter)
    const displayFieldName = currentSheet?.field_name
        || currentSheet?.field_id
        || entryForm?.selected_field
        || observation.field_name
        || 'Untitled Record'
    const displayBlockId = currentSheet?.block_id || observation.block_id
    const displayRecordedAt = currentSheet?.date_recorded || entryForm?.date_recorded || observation.date_recorded
    const displayCropType = currentSheet?.crop_class
        || currentSheet?.crop_type
        || entryForm?.crop_class
        || entryForm?.crop_type
        || observation.crop_information?.crop_type
    const displayStress = currentSheet?.stress || entryForm?.stress || observation.crop_monitoring?.stress

    const identityItems = [
        { label: 'Client UUID', value: observation.client_uuid },
        { label: 'Collector ID', value: observation.collector_id },
        { label: 'Record ID', value: currentSheet?.id || observation.id },
        { label: 'Source Row ID', value: isMobileObservationRecord(observation) ? observation.source_row_id : undefined },
        { label: 'Created', value: formatDateTime(currentSheet?.created_at || entryForm?.created_at || observation.created_at) },
    ].filter((item) => hasValue(item.value))

    const fieldItems = [
        { label: 'Field Name', value: displayFieldName },
        { label: 'Selected Field', value: entryForm?.selected_field },
        { label: 'Block', value: displayBlockId },
        { label: 'Recorded', value: formatDateTime(displayRecordedAt) },
    ].filter((item) => hasValue(item.value))

    const cropItems = [
        { label: 'Crop Type', value: currentSheet?.crop_type || entryForm?.crop_type || observation.crop_information?.crop_type },
        { label: 'Crop Class', value: currentSheet?.crop_class || entryForm?.crop_class },
        { label: 'Variety', value: currentSheet?.variety || entryForm?.variety || observation.crop_information?.variety },
        { label: 'Growth Stage', value: currentSheet?.crop_stage || observation.crop_information?.crop_stage },
        { label: 'Planting Date', value: formatSimpleDate(currentSheet?.planting_date || entryForm?.planting_date || observation.crop_information?.planting_date) },
        { label: 'Expected Harvest', value: formatSimpleDate(currentSheet?.expected_harvest_date || entryForm?.expected_harvest_date || observation.crop_information?.expected_harvest_date) },
    ].filter((item) => hasValue(item.value))

    const observationItems = [
        { label: 'Stress', value: displayStress },
        { label: 'Crop Vigor', value: currentSheet?.crop_vigor || entryForm?.crop_vigor || observation.crop_monitoring?.crop_vigor },
        { label: 'Remarks', value: currentSheet?.field_remarks || currentSheet?.remarks || entryForm?.field_remarks || entryForm?.remarks || observation.crop_monitoring?.remarks },
    ].filter((item) => hasValue(item.value))

    const entryFormPrimaryItems = [
        { label: 'Selected Field', value: entryForm?.selected_field || observation.field_name },
        { label: 'Block Size', value: entryForm?.block_size },
        { label: 'Date Recorded', value: formatSimpleDate(entryForm?.date_recorded || observation.date_recorded) },
        { label: 'Trial Number', value: entryForm?.trial_number },
        { label: 'Trial Name', value: entryForm?.trial_name },
        { label: 'Contact Person', value: entryForm?.contact_person },
        { label: 'Phone Number', value: formatPhoneNumber(entryForm) },
        { label: 'Crop Class', value: entryForm?.crop_class || observation.crop_information?.crop_type },
        { label: 'Spatial Data', value: entryForm?.spatial_data ? 'Available' : undefined },
        { label: 'Form Created', value: formatDateTime(entryForm?.created_at || observation.created_at) },
        { label: 'Form Updated', value: formatDateTime(entryForm?.updated_at) },
    ].filter((item) => hasValue(item.value) && item.value !== '-')

    const entryFormFieldItems = [
        { label: 'Irrigation Type', value: entryForm?.irrigation_type || observation.irrigation_management?.irrigation_type },
        { label: 'Water Source', value: entryForm?.water_source || observation.irrigation_management?.water_source },
        { label: 'TAMM Area (mm)', value: entryForm?.tamm_area },
        { label: 'Soil Type', value: entryForm?.soil_type || observation.soil_characteristics?.soil_type },
        { label: 'pH', value: entryForm?.soil_ph },
        { label: 'Remarks', value: entryForm?.remarks || observation.crop_monitoring?.remarks },
        { label: 'Planting Date', value: formatSimpleDate(entryForm?.planting_date || observation.crop_information?.planting_date) },
        { label: 'Cutting Date', value: formatSimpleDate(entryForm?.cutting_date) },
        { label: 'Expected Harvest Date', value: formatSimpleDate(entryForm?.expected_harvest_date || observation.crop_information?.expected_harvest_date) },
    ].filter((item) => hasValue(item.value) && item.value !== '-')

    const fieldRegistryItems = [
        { label: 'Field Row ID', value: fieldRegistry?.id },
        { label: 'Created By', value: fieldRegistry?.created_by },
        { label: 'Field Created', value: formatDateTime(fieldRegistry?.created_at) },
        { label: 'Field Recorded', value: formatDateTime(fieldRegistry?.date_recorded) },
        { label: 'Sync Status', value: formatSyncStatus(fieldRegistry?.is_synced) },
        { label: 'Local Updated', value: formatDateTime(fieldRegistry?.local_updated_at) },
        { label: 'Updated', value: formatDateTime(fieldRegistry?.updated_at) },
    ].filter((item) => hasValue(item.value) && item.value !== '-')

    const gpsItems = [
        { label: 'Latitude', value: formatCoordinate(preferredLatitude) },
        { label: 'Longitude', value: formatCoordinate(preferredLongitude) },
    ]

    const topSummary = [
        { label: 'Field', value: displayFieldName || '-' },
        { label: 'Crop', value: displayCropType || '-' },
    ]

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 5,
                    bgcolor: '#f3f8f4',
                    backgroundImage: 'none',
                    border: '1px solid rgba(47,159,90,0.16)',
                    overflow: 'hidden',
                },
            }}
        >
            <Box
                sx={{
                    px: { xs: 2.5, md: 4 },
                    py: { xs: 2.5, md: 3.5 },
                    background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.13)} 0%, rgba(255,255,255,0.98) 100%)`,
                    borderBottom: '1px solid rgba(47,159,90,0.12)',
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                    <Box>
                        <Typography sx={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'primary.main', mb: 1.1 }}>
                            Field Observation Record
                        </Typography>
                        <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 900, color: 'text.primary', lineHeight: 1.05, mb: 1.5 }}>
                            {displayFieldName}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.2, alignItems: 'center' }}>
                            {hasValue(displayBlockId) && (
                                <Chip size="small" label={displayBlockId} sx={{ bgcolor: 'rgba(47,159,90,0.08)', color: 'primary.dark', fontWeight: 700 }} />
                            )}
                            <Chip size="small" icon={<AccessTime />} label={formatDateTime(displayRecordedAt)} sx={{ bgcolor: 'rgba(0,0,0,0.04)', color: 'text.secondary', fontWeight: 700 }} />
                        </Box>
                    </Box>
                    <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                        <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 800, mb: 0.8 }}>
                            ID: {displayId}
                        </Typography>
                        <Chip
                            size="small"
                            icon={<StorageRounded />}
                            label={sourceLabel}
                            sx={{ bgcolor: 'rgba(47,159,90,0.1)', color: 'primary.dark', fontWeight: 800, textTransform: 'capitalize' }}
                        />
                    </Box>
                </Box>

                <Grid container spacing={1.5} sx={{ mt: 2.2 }}>
                    {topSummary.map((item) => (
                        <Grid key={item.label} size={{ xs: 12, sm: 6, md: 3 }}>
                            <SummaryTile label={item.label} value={item.value} />
                        </Grid>
                    ))}
                </Grid>
            </Box>

            <DialogContent sx={{ p: { xs: 2.5, md: 3.5 }, bgcolor: '#f3f8f4' }}>
                <Grid container spacing={2.5}>
                    {identityItems.length > 0 && (
                        <Grid size={{ xs: 12, md: 6 }}>
                            <DetailCard title="Record Identity" subtitle="Source and sync details from the selected row">
                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                    {identityItems.map((item) => (
                                        <DetailItem key={item.label} label={item.label} value={item.value as string | number} />
                                    ))}
                                </Box>
                            </DetailCard>
                        </Grid>
                    )}

                    {fieldItems.length > 0 && (
                        <Grid size={{ xs: 12, md: 6 }}>
                            <DetailCard title="Field Assignment" subtitle="Location values currently available in the table">
                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                    {fieldItems.map((item) => (
                                        <DetailItem key={item.label} label={item.label} value={item.value as string | number} />
                                    ))}
                                </Box>
                            </DetailCard>
                        </Grid>
                    )}

                    {cropItems.length > 0 && (
                        <Grid size={{ xs: 12, md: 6 }}>
                            <DetailCard title="Crop Snapshot" subtitle="Only the crop fields present on this record are shown">
                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                    {cropItems.map((item) => (
                                        <DetailItem key={item.label} label={item.label} value={item.value as string | number} />
                                    ))}
                                </Box>
                            </DetailCard>
                        </Grid>
                    )}

                    {observationItems.length > 0 && (
                        <Grid size={{ xs: 12, md: 6 }}>
                            <DetailCard title="Observation Notes" subtitle="Monitoring values captured for this row">
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {observationItems.map((item) => (
                                        <DetailItem key={item.label} label={item.label} value={item.value as string | number} />
                                    ))}
                                </Box>
                            </DetailCard>
                        </Grid>
                    )}

                    {entryFormPrimaryItems.length > 0 && (
                        <Grid size={{ xs: 12, md: 6 }}>
                            <DetailCard title="Field Record Form" subtitle="Primary entry fields collected from the mobile form">
                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                    {entryFormPrimaryItems.map((item) => (
                                        <DetailItem key={item.label} label={item.label} value={item.value as string | number} />
                                    ))}
                                </Box>
                            </DetailCard>
                        </Grid>
                    )}

                    {entryFormFieldItems.length > 0 && (
                        <Grid size={{ xs: 12, md: 6 }}>
                            <DetailCard title="Field Conditions" subtitle="Irrigation, soil, schedule, and remarks stored on the form">
                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                    {entryFormFieldItems.map((item) => (
                                        <DetailItem key={item.label} label={item.label} value={item.value as string | number} />
                                    ))}
                                </Box>
                            </DetailCard>
                        </Grid>
                    )}

                    {fieldRegistryItems.length > 0 && (
                        <Grid size={{ xs: 12, md: 6 }}>
                            <DetailCard title="Field Registry Row" subtitle="Linked values from the live fields table">
                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                    {fieldRegistryItems.map((item) => (
                                        <DetailItem key={item.label} label={item.label} value={item.value as string | number} />
                                    ))}
                                </Box>
                            </DetailCard>
                        </Grid>
                    )}

                    <Grid size={{ xs: 12, md: hasImages ? 6 : 12 }}>
                        <DetailCard title="GPS Capture" subtitle="Coordinates and map preview">
                            <Grid container spacing={1.5} sx={{ mb: 2 }}>
                                {gpsItems.map((item) => (
                                    <Grid key={item.label} size={{ xs: 12, sm: 4 }}>
                                        <SummaryTile label={item.label} value={item.value} />
                                    </Grid>
                                ))}
                            </Grid>
                            {hasMapPreview && previewCenter ? (
                                <Box sx={{ height: 260, width: '100%', borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(47,159,90,0.14)' }}>
                                    <MapContainer
                                        center={previewCenter}
                                        zoom={15}
                                        style={{ height: '100%', width: '100%' }}
                                        zoomControl={false}
                                    >
                                        <TileLayer
                                            url={SATELLITE_TILE_SOURCES[0].url}
                                            attribution={SATELLITE_TILE_SOURCES[0].attribution}
                                        />
                                        <TileLayer
                                            url={SATELLITE_HYBRID_LABELS_SOURCE.url}
                                            attribution={SATELLITE_HYBRID_LABELS_SOURCE.attribution}
                                            opacity={0.7}
                                        />
                                        <MapPreviewFitter geometry={previewGeometry} center={previewCenter} />
                                        {previewGeometry && (
                                            <GeoJSON
                                                data={previewGeometry}
                                                style={() => ({
                                                    color: theme.palette.primary.main,
                                                    weight: 3,
                                                    opacity: 1,
                                                    fillColor: alpha(theme.palette.primary.main, 0.28),
                                                    fillOpacity: 0.28,
                                                })}
                                            />
                                        )}
                                        {hasCoordinates && coordinateCenter && (
                                            <CircleMarker
                                                center={coordinateCenter}
                                                radius={6}
                                                pathOptions={{ color: '#ffffff', fillColor: theme.palette.primary.dark, fillOpacity: 0.96 }}
                                            />
                                        )}
                                    </MapContainer>
                                    <MapCenterObject color={theme.palette.primary.main} size={42} />
                                </Box>
                            ) : (
                                <Paper sx={{ p: 3, borderRadius: 3, bgcolor: '#ffffff', border: '1px dashed rgba(47,159,90,0.2)', boxShadow: 'none' }}>
                                    <Typography sx={{ fontWeight: 800, color: 'text.primary', mb: 0.4 }}>
                                        No map preview available
                                    </Typography>
                                    <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
                                        This record does not currently include usable polygon geometry or coordinates.
                                    </Typography>
                                </Paper>
                            )}
                        </DetailCard>
                    </Grid>

                    {hasImages && (
                        <Grid size={{ xs: 12, md: 6 }}>
                            <DetailCard title="Captured Media" subtitle="Images linked to this observation">
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1.5 }}>
                                    {observation.images?.map((image) => (
                                        <Box
                                            key={image.id}
                                            component="img"
                                            src={image.image_url}
                                            alt="Observation capture"
                                            sx={{
                                                width: '100%',
                                                height: 160,
                                                objectFit: 'cover',
                                                borderRadius: 3,
                                                border: '1px solid rgba(47,159,90,0.14)',
                                            }}
                                        />
                                    ))}
                                </Box>
                            </DetailCard>
                        </Grid>
                    )}

                    {!cropItems.length && !observationItems.length && (
                        <Grid size={{ xs: 12 }}>
                            <Paper
                                sx={{
                                    p: 3,
                                    borderRadius: 4,
                                    bgcolor: '#ffffff',
                                    border: '1px dashed rgba(47,159,90,0.22)',
                                    boxShadow: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                }}
                            >
                                <NotesRounded sx={{ color: 'primary.main' }} />
                                <Box>
                                    <Typography sx={{ fontWeight: 800, color: 'text.primary' }}>
                                        No additional agronomy fields on this row
                                    </Typography>
                                    <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
                                        This dialog is now source-aware, so it only renders the values that exist in the selected table record.
                                    </Typography>
                                </Box>
                            </Paper>
                        </Grid>
                    )}
                </Grid>
            </DialogContent>

            <DialogActions
                sx={{
                    px: { xs: 2.5, md: 4 },
                    py: 3,
                    bgcolor: '#edf5ef',
                    borderTop: '1px solid rgba(47,159,90,0.12)',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 1.5,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                    <PersonOutlineRounded fontSize="small" />
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                        {observation.collector_id || 'Collector not recorded'}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.2, flexWrap: 'wrap' }}>
                    <Button onClick={onClose} sx={{ color: 'text.secondary', fontWeight: 800 }}>
                        Close View
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={hasImages ? <ImageIcon /> : hasCoordinates ? <MyLocationRounded /> : <GrassRounded />}
                        onClick={() => onGenerateReport(observation)}
                        sx={{
                            borderRadius: 999,
                            px: 2.6,
                            fontWeight: 900,
                            boxShadow: 'none',
                        }}
                    >
                        Download Report PDF
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    )
}
