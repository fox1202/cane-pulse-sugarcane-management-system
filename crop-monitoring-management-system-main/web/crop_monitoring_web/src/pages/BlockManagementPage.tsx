import { useState, useCallback } from 'react'
import {
    Container,
    Box,
    Typography,
    CircularProgress,
    alpha,
    Grid,
} from '@mui/material'
import {
    CloudUpload,
    MapOutlined,
    CheckCircleOutline,
    ErrorOutline,
    Layers,
    FolderZip,
    HexagonOutlined,
    PublicOutlined,
    ArrowForward,
} from '@mui/icons-material'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import shp from 'shpjs'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { MapCenterObject } from '@/components/Map/MapCenterObject'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const INK        = '#ffffff'
const INK_PANEL  = '#fafafa'
const AMBER      = '#1b5e20'
const AMBER_DIM  = 'rgba(27,94,32,0.5)'
const AMBER_PALE = 'rgba(27,94,32,0.07)'
const AMBER_BDR  = 'rgba(27,94,32,0.2)'
const TEAL       = '#43a047'
const TEAL_PALE  = 'rgba(67,160,71,0.06)'
const TEAL_BDR   = 'rgba(67,160,71,0.18)'
const RED_ERR    = '#1b5e20'
const GREEN_OK   = '#1b5e20'
const TEXT_DIM   = 'rgba(0,0,0,0.4)'
const TEXT_MID   = 'rgba(0,0,0,0.6)'

// ─── Helpers ───────────────────────────────────────────────────────────────────
function MapRecenter({ data }: { data: any }) {
    const map = useMap()
    if (data) {
        try {
            const layer = L.geoJSON(data)
            map.fitBounds(layer.getBounds(), { padding: [40, 40], animate: true, duration: 1 })
        } catch (_) {}
    }
    return null
}

// ─── Shared UI atoms ───────────────────────────────────────────────────────────
function GlassPanel({ children, sx = {}, accent = AMBER }: { children: React.ReactNode; sx?: object; accent?: string }) {
    return (
        <Box sx={{
            bgcolor: INK_PANEL,
            border: `1px solid rgba(255,255,255,0.07)`,
            borderRadius: '18px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 48px rgba(0,0,0,0.55)',
            '&::before': {
                content: '""',
                position: 'absolute', top: 0, left: 0, right: 0, height: '1.5px',
                background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            },
            ...sx,
        }}>
            {/* faint grid texture */}
            <Box sx={{
                position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
                backgroundImage: `
                    linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)
                `,
                backgroundSize: '28px 28px',
                borderRadius: 'inherit',
            }} />
            <Box sx={{ position: 'relative', zIndex: 1 }}>{children}</Box>
        </Box>
    )
}

function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2.5 }}>
            {icon && <Box sx={{ color: AMBER_DIM, display: 'flex', fontSize: 15 }}>{icon}</Box>}
            <Box sx={{ width: 20, height: 1.5, bgcolor: AMBER, borderRadius: 1, opacity: 0.6 }} />
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', color: AMBER_DIM, fontFamily: '"Space Mono", monospace', textTransform: 'uppercase' }}>
                {children}
            </Typography>
        </Box>
    )
}

function StyledInput({ label, value, onChange, placeholder }: {
    label: string; value: string; onChange: (v: string) => void; placeholder: string
}) {
    const [focused, setFocused] = useState(false)
    return (
        <Box sx={{ mb: 3.5 }}>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.16em', color: focused ? AMBER : TEXT_DIM, fontFamily: '"Space Mono", monospace', textTransform: 'uppercase', mb: 1, transition: 'color 0.2s' }}>
                {label}
            </Typography>
            <Box sx={{
                border: `1px solid ${focused ? AMBER_BDR : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '10px',
                bgcolor: focused ? AMBER_PALE : 'rgba(255,255,255,0.03)',
                display: 'flex', alignItems: 'center', overflow: 'hidden',
                boxShadow: focused ? `0 0 0 3px rgba(27,94,32,0.07)` : 'none',
                transition: 'all 0.2s ease',
            }}>
                <Box sx={{ width: 3, alignSelf: 'stretch', bgcolor: focused ? AMBER : 'transparent', transition: 'background 0.2s', flexShrink: 0 }} />
                <Box
                    component="input"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value.toUpperCase())}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    sx={{
                        flex: 1, border: 'none', outline: 'none', bgcolor: 'transparent',
                        color: 'white', fontSize: '0.88rem', fontFamily: '"Space Mono", monospace',
                        px: 2, py: 1.8, letterSpacing: '0.08em',
                        '&::placeholder': { color: TEXT_DIM, fontSize: '0.78rem', fontFamily: '"Space Mono", monospace' },
                    }}
                />
            </Box>
        </Box>
    )
}

// ─── Upload drop zone ──────────────────────────────────────────────────────────
function DropZone({ file, isLoading, onChange }: {
    file: File | null; isLoading: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
    const [dragOver, setDragOver] = useState(false)

    return (
        <Box sx={{ mb: 3.5 }}>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.16em', color: TEXT_DIM, fontFamily: '"Space Mono", monospace', textTransform: 'uppercase', mb: 1 }}>
                Geospatial Source (.ZIP / .SHP)
            </Typography>
            <input type="file" accept=".zip,.shp" id="shapefile-upload" hidden onChange={onChange} />
            <label htmlFor="shapefile-upload">
                <Box
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    sx={{
                        border: `1.5px dashed ${dragOver ? AMBER : file ? TEAL_BDR : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '14px',
                        bgcolor: dragOver ? AMBER_PALE : file ? TEAL_PALE : 'rgba(255,255,255,0.02)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        py: 4, px: 3, cursor: 'pointer', transition: 'all 0.25s ease',
                        '&:hover': { borderColor: AMBER, bgcolor: AMBER_PALE },
                        minHeight: 130,
                    }}
                >
                    {isLoading ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                            <CircularProgress size={28} sx={{ color: AMBER }} thickness={2.5} />
                            <Typography sx={{ fontSize: '0.65rem', color: AMBER_DIM, fontFamily: '"Space Mono", monospace', letterSpacing: '0.1em' }}>
                                PARSING SHAPEFILE…
                            </Typography>
                        </Box>
                    ) : file ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                            <FolderZip sx={{ fontSize: 30, color: TEAL }} />
                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: TEAL, fontFamily: '"Space Mono", monospace', textAlign: 'center', letterSpacing: '0.04em' }}>
                                {file.name}
                            </Typography>
                            <Typography sx={{ fontSize: '0.58rem', color: TEXT_DIM, fontFamily: '"Space Mono", monospace' }}>
                                {(file.size / 1024).toFixed(1)} KB · Click to replace
                            </Typography>
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                            <CloudUpload sx={{ fontSize: 30, color: TEXT_DIM }} />
                            <Typography sx={{ fontSize: '0.72rem', color: TEXT_MID, fontFamily: '"Space Mono", monospace', letterSpacing: '0.06em' }}>
                                Drop shapefile here
                            </Typography>
                            <Typography sx={{ fontSize: '0.58rem', color: TEXT_DIM, fontFamily: '"Space Mono", monospace' }}>
                                .zip bundle or .shp file accepted
                            </Typography>
                        </Box>
                    )}
                </Box>
            </label>
        </Box>
    )
}

// ─── Status banner ─────────────────────────────────────────────────────────────
function StatusBanner({ status }: { status: { type: 'success' | 'error' | 'info'; message: string } | null }) {
    const config = {
        success: { color: GREEN_OK, bg: 'rgba(74,222,128,0.07)', border: 'rgba(74,222,128,0.2)', icon: <CheckCircleOutline sx={{ fontSize: 15 }} /> },
        error:   { color: RED_ERR,  bg: 'rgba(27,94,32,0.07)',  border: 'rgba(27,94,32,0.2)',  icon: <ErrorOutline sx={{ fontSize: 15 }} /> },
        info:    { color: AMBER,    bg: AMBER_PALE,              border: AMBER_BDR,              icon: <CircularProgress size={13} thickness={3} sx={{ color: AMBER }} /> },
    }
    return (
        <AnimatePresence mode="wait">
            {status && (
                <motion.div
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: 8, height: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <Box sx={{
                        display: 'flex', alignItems: 'flex-start', gap: 1.2, p: 1.8, mb: 3,
                        borderRadius: '10px',
                        bgcolor: config[status.type].bg,
                        border: `1px solid ${config[status.type].border}`,
                    }}>
                        <Box sx={{ color: config[status.type].color, mt: 0.15, flexShrink: 0 }}>
                            {config[status.type].icon}
                        </Box>
                        <Typography sx={{ fontSize: '0.72rem', color: config[status.type].color, fontFamily: '"Space Mono", monospace', lineHeight: 1.6 }}>
                            {status.message}
                        </Typography>
                    </Box>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

// ─── Feature summary pill ──────────────────────────────────────────────────────
function FeaturePill({ label, value, color = AMBER }: { label: string; value: string | number; color?: string }) {
    return (
        <Box sx={{ textAlign: 'center', px: 2, py: 1.5, borderRadius: '10px', bgcolor: alpha(color, 0.06), border: `1px solid ${alpha(color, 0.18)}` }}>
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color, fontFamily: '"Space Mono", monospace', lineHeight: 1, mb: 0.4 }}>
                {value}
            </Typography>
            <Typography sx={{ fontSize: '0.55rem', color: TEXT_DIM, fontFamily: '"Space Mono", monospace', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {label}
            </Typography>
        </Box>
    )
}

// ─── Map empty state ───────────────────────────────────────────────────────────
function MapEmptyState() {
    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
            {/* Animated concentric rings */}
            <Box sx={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {[60, 90, 120].map((size, i) => (
                    <Box key={size} sx={{
                        position: 'absolute',
                        width: size, height: size,
                        borderRadius: '50%',
                        border: `1px solid ${AMBER_BDR}`,
                        animation: `ringPulse ${2 + i * 0.5}s ease-in-out infinite`,
                        animationDelay: `${i * 0.3}s`,
                        '@keyframes ringPulse': {
                            '0%,100%': { opacity: 0.2, transform: 'scale(1)' },
                            '50%': { opacity: 0.5, transform: 'scale(1.05)' },
                        },
                    }} />
                ))}
                <MapOutlined sx={{ fontSize: 36, color: AMBER_DIM, zIndex: 1 }} />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: TEXT_MID, fontFamily: '"Syne", sans-serif', mb: 0.5 }}>
                    Boundary Preview Pending
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: TEXT_DIM, fontFamily: '"Space Mono", monospace', lineHeight: 1.7, maxWidth: 280 }}>
                    Upload a zipped shapefile to render<br />sector boundaries on the live map
                </Typography>
            </Box>
        </Box>
    )
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export function BlockManagementPage() {
    const { user } = useAuth()
    const [file, setFile]       = useState<File | null>(null)
    const [blockId, setBlockId] = useState('')
    const [geoJson, setGeoJson] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving]   = useState(false)
    const [status, setStatus]   = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return
        setFile(selectedFile)
        setIsLoading(true)
        setStatus(null)
        setGeoJson(null)
        try {
            const arrayBuffer = await selectedFile.arrayBuffer()
            const data = await shp(arrayBuffer)
            const features = Array.isArray(data) ? data[0].features : data.features
            if (!features?.length) throw new Error('No valid vector features found in shapefile.')
            const isValid = features.every((f: any) =>
                f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'
            )
            if (!isValid) throw new Error('Shapefile must contain Polygon or MultiPolygon geometries.')
            setGeoJson(Array.isArray(data) ? data[0] : data)
            setStatus({ type: 'success', message: `Parsed ${features.length} sector${features.length > 1 ? 's' : ''} successfully. Preview rendered on map.` })
        } catch (err: any) {
            setStatus({ type: 'error', message: `Invalid Shapefile: ${err.message}` })
            setFile(null)
        } finally {
            setIsLoading(false)
        }
    }, [])

    const handleUpload = async () => {
        if (!blockId.trim()) { setStatus({ type: 'error', message: 'Please enter a unique Block ID.' }); return }
        if (!geoJson)         { setStatus({ type: 'error', message: 'Please upload a valid shapefile first.' }); return }

        setIsSaving(true)
        setStatus({ type: 'info', message: 'Synchronizing geometry with PostGIS spatial database…' })

        try {
            const { data: existing } = await supabase.from('blocks').select('block_id').eq('block_id', blockId.trim()).single()
            if (existing) throw new Error(`Block ID "${blockId}" already exists. Use a unique identifier.`)

            let finalGeom = geoJson.features[0].geometry
            if (geoJson.features.length > 1) {
                const allPolygons: any[] = []
                geoJson.features.forEach((f: any) => {
                    if (f.geometry.type === 'Polygon') allPolygons.push(f.geometry.coordinates)
                    else if (f.geometry.type === 'MultiPolygon') allPolygons.push(...f.geometry.coordinates)
                })
                finalGeom = { type: 'MultiPolygon', coordinates: allPolygons }
            }

            const { error } = await supabase.from('blocks').insert({ block_id: blockId.trim(), geom: finalGeom, created_by: user?.id })
            if (error) throw error

            setStatus({ type: 'success', message: `Block ${blockId} indexed and synchronized with GIS database.` })
            setFile(null); setBlockId(''); setGeoJson(null)
        } catch (err: any) {
            setStatus({ type: 'error', message: `Database Error: ${err.message}` })
        } finally {
            setIsSaving(false)
        }
    }

    const featureCount = geoJson?.features?.length ?? 0

    return (
        <Box sx={{ bgcolor: INK, minHeight: '100vh', py: 5, position: 'relative' }}>
            {/* Ambient gradient */}
            <Box sx={{
                position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
                background: `
                    radial-gradient(ellipse 60% 40% at 20% 0%, rgba(27,94,32,0.05) 0%, transparent 55%),
                    radial-gradient(ellipse 50% 35% at 85% 100%, rgba(67,160,71,0.04) 0%, transparent 55%)
                `,
            }} />

            <Container maxWidth="xl" sx={{ pb: 6, position: 'relative', zIndex: 1 }}>

                {/* ── Page header ──────────────────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16,1,0.3,1] }}>
                    <Box sx={{ mb: 6 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                            <Box sx={{ width: 28, height: 1.5, bgcolor: AMBER, borderRadius: 1 }} />
                            <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em', color: AMBER_DIM, fontFamily: '"Space Mono", monospace', textTransform: 'uppercase' }}>
                                GIS Ingestion Engine
                            </Typography>
                        </Box>
                        <Typography sx={{
                            fontSize: 'clamp(2rem, 4vw, 3rem)',
                            fontWeight: 800,
                            letterSpacing: '-0.03em',
                            fontFamily: '"Syne", sans-serif',
                            lineHeight: 1.05,
                            color: 'white',
                            mb: 0.8,
                        }}>
                            Block{' '}
                            <Box component="span" sx={{ color: AMBER, textShadow: `0 0 40px ${AMBER_DIM}` }}>
                                Management
                            </Box>
                        </Typography>
                        <Typography sx={{ fontSize: '0.85rem', color: TEXT_DIM, maxWidth: 520, lineHeight: 1.7 }}>
                            Upload cadastral shapefiles to define and index official agricultural sector boundaries in the spatial database.
                        </Typography>
                    </Box>
                </motion.div>

                <Grid container spacing={3.5} alignItems="stretch">

                    {/* ── Left: Control Panel ──────────────────────────────── */}
                    <Grid size={{ xs: 12, lg: 4 }}>
                        <motion.div
                            initial={{ opacity: 0, x: -24 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15, duration: 0.7, ease: [0.16,1,0.3,1] }}
                            style={{ height: '100%' }}
                        >
                            <GlassPanel sx={{ height: '100%', p: 4 }}>

                                {/* Block ID input */}
                                <SectionLabel icon={<HexagonOutlined sx={{ fontSize: 15 }} />}>
                                    Block Identifier
                                </SectionLabel>
                                <StyledInput
                                    label="Unique Block ID"
                                    value={blockId}
                                    onChange={setBlockId}
                                    placeholder="e.g. SEC-A-102"
                                />

                                {/* File upload */}
                                <SectionLabel icon={<FolderZip sx={{ fontSize: 15 }} />}>
                                    Shapefile Source
                                </SectionLabel>
                                <DropZone file={file} isLoading={isLoading} onChange={handleFileChange} />

                                {/* Status message */}
                                <StatusBanner status={status} />

                                {/* Submit */}
                                <Box
                                    component="button"
                                    onClick={handleUpload}
                                    disabled={!file || !blockId || isSaving || isLoading}
                                    sx={{
                                        width: '100%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5,
                                        py: 2, px: 3, borderRadius: '12px', border: 'none',
                                        cursor: (!file || !blockId || isSaving || isLoading) ? 'not-allowed' : 'pointer',
                                        bgcolor: (!file || !blockId || isSaving || isLoading) ? 'rgba(255,255,255,0.05)' : AMBER,
                                        color: (!file || !blockId || isSaving || isLoading) ? TEXT_DIM : INK,
                                        fontFamily: '"Space Mono", monospace',
                                        fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em',
                                        boxShadow: (!file || !blockId || isSaving || isLoading) ? 'none' : `0 0 40px ${AMBER_DIM}, 0 4px 20px rgba(0,0,0,0.5)`,
                                        transition: 'all 0.25s ease',
                                        '&:hover:not(:disabled)': {
                                            transform: 'translateY(-2px)',
                                            boxShadow: `0 0 60px ${AMBER_DIM}, 0 8px 30px rgba(0,0,0,0.5)`,
                                        },
                                        mb: 4,
                                    }}
                                >
                                    {isSaving ? (
                                        <>
                                            <CircularProgress size={13} thickness={3} sx={{ color: INK }} />
                                            SYNCHRONIZING GIS…
                                        </>
                                    ) : (
                                        <>
                                            INDEX NEW BLOCK
                                            <ArrowForward sx={{ fontSize: 15 }} />
                                        </>
                                    )}
                                </Box>

                                {/* Compatibility specs */}
                                <Box>
                                    <SectionLabel icon={<Layers sx={{ fontSize: 15 }} />}>Compatibility Matrix</SectionLabel>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                                        {[
                                            { icon: <PublicOutlined sx={{ fontSize: 13 }} />, text: 'WGS84 coordinate system preferred' },
                                            { icon: <FolderZip sx={{ fontSize: 13 }} />, text: 'Zipped bundle — .shp, .dbf, .shx' },
                                            { icon: <HexagonOutlined sx={{ fontSize: 13 }} />, text: 'Polygon or MultiPolygon geometry only' },
                                            { icon: <Layers sx={{ fontSize: 13 }} />, text: 'Single or multi-feature collections' },
                                        ].map(({ icon, text }) => (
                                            <Box key={text} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.2, borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <Box sx={{ color: AMBER_DIM, display: 'flex', flexShrink: 0 }}>{icon}</Box>
                                                <Typography sx={{ fontSize: '0.68rem', color: TEXT_MID, fontFamily: '"Space Mono", monospace', lineHeight: 1.5 }}>
                                                    {text}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            </GlassPanel>
                        </motion.div>
                    </Grid>

                    {/* ── Right: Map Preview ───────────────────────────────── */}
                    <Grid size={{ xs: 12, lg: 8 }}>
                        <motion.div
                            initial={{ opacity: 0, x: 24 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.25, duration: 0.7, ease: [0.16,1,0.3,1] }}
                            style={{ height: '100%' }}
                        >
                            <GlassPanel sx={{ height: '100%', minHeight: 680, overflow: 'hidden', p: 0 }} accent={TEAL}>
                                {/* Map header bar */}
                                <Box sx={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    px: 3.5, py: 2.5,
                                    borderBottom: `1px solid rgba(255,255,255,0.06)`,
                                    bgcolor: 'rgba(0,0,0,0.2)',
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{
                                                width: 7, height: 7, borderRadius: '50%',
                                                bgcolor: geoJson ? TEAL : TEXT_DIM,
                                                boxShadow: geoJson ? `0 0 8px ${TEAL}` : 'none',
                                                animation: geoJson ? 'mapPulse 2s ease-in-out infinite' : 'none',
                                                '@keyframes mapPulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
                                            }} />
                                            <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', color: geoJson ? TEAL : TEXT_DIM, fontFamily: '"Space Mono", monospace', textTransform: 'uppercase' }}>
                                                {geoJson ? 'Boundary Active' : 'Awaiting Input'}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Stats row when geoJson loaded */}
                                    <AnimatePresence>
                                        {geoJson && (
                                            <motion.div
                                                initial={{ opacity: 0, x: 16 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.4 }}
                                            >
                                                <Box sx={{ display: 'flex', gap: 1.5 }}>
                                                    <FeaturePill label="Sectors" value={featureCount} color={TEAL} />
                                                    <FeaturePill label="Projection" value="WGS84" color={AMBER} />
                                                    <FeaturePill label="Type" value="POLY" color={TEXT_MID} />
                                                </Box>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Box>

                                {/* Map body */}
                                <Box sx={{ height: 'calc(100% - 66px)', position: 'relative', minHeight: 580 }}>
                                    <AnimatePresence mode="wait">
                                        {!geoJson ? (
                                            <motion.div
                                                key="empty"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                style={{ height: '100%' }}
                                            >
                                                <MapEmptyState />
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="map"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ duration: 0.5 }}
                                                style={{ height: '100%' }}
                                            >
                                                <MapContainer
                                                    center={[-1.2921, 36.8219]}
                                                    zoom={13}
                                                    style={{ height: '100%', width: '100%' }}
                                                    zoomControl={false}
                                                >
                                                    <TileLayer
                                                        attribution='&copy; Google'
                                                        url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                                                    />
                                                    <MapRecenter data={geoJson} />
                                                    <GeoJSON
                                                        data={geoJson}
                                                        style={{
                                                            color: AMBER,
                                                            weight: 3,
                                                            fillOpacity: 0.15,
                                                            fillColor: TEAL,
                                                            dashArray: undefined,
                                                        }}
                                                    />
                                                </MapContainer>
                                                <MapCenterObject color={AMBER} label="Map Center" size={54} />

                                                {/* Floating projection tag */}
                                                <Box sx={{
                                                    position: 'absolute', top: 16, right: 16, zIndex: 1000,
                                                    bgcolor: 'rgba(7,8,10,0.88)',
                                                    border: `1px solid ${AMBER_BDR}`,
                                                    backdropFilter: 'blur(16px)',
                                                    borderRadius: '10px',
                                                    px: 2, py: 1.5,
                                                    '&::before': {
                                                        content: '""',
                                                        position: 'absolute', top: 0, left: 0, right: 0, height: '1.5px',
                                                        background: `linear-gradient(90deg, transparent, ${AMBER}, transparent)`,
                                                        borderRadius: '10px 10px 0 0',
                                                    },
                                                }}>
                                                    <Typography sx={{ fontSize: '0.55rem', color: AMBER_DIM, fontFamily: '"Space Mono", monospace', letterSpacing: '0.14em', mb: 0.3 }}>
                                                        SPATIAL REFERENCE
                                                    </Typography>
                                                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'white', fontFamily: '"Space Mono", monospace', letterSpacing: '0.06em' }}>
                                                        EPSG:4326 · WGS 84
                                                    </Typography>
                                                    <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                                        <Typography sx={{ fontSize: '0.62rem', color: TEAL, fontFamily: '"Space Mono", monospace', fontWeight: 700 }}>
                                                            {featureCount} sector{featureCount !== 1 ? 's' : ''} loaded
                                                        </Typography>
                                                    </Box>
                                                </Box>

                                                {/* Corner brackets */}
                                                {[
                                                    { top: 0, left: 0, borderTop: `2px solid ${AMBER_DIM}`, borderLeft: `2px solid ${AMBER_DIM}` },
                                                    { top: 0, right: 0, borderTop: `2px solid ${AMBER_DIM}`, borderRight: `2px solid ${AMBER_DIM}` },
                                                    { bottom: 0, left: 0, borderBottom: `2px solid ${AMBER_DIM}`, borderLeft: `2px solid ${AMBER_DIM}` },
                                                    { bottom: 0, right: 0, borderBottom: `2px solid ${AMBER_DIM}`, borderRight: `2px solid ${AMBER_DIM}` },
                                                ].map((pos, i) => (
                                                    <Box key={i} sx={{ position: 'absolute', width: 22, height: 22, zIndex: 999, opacity: 0.5, ...pos }} />
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Box>
                            </GlassPanel>
                        </motion.div>
                    </Grid>
                </Grid>
            </Container>

            {/* Leaflet + font overrides */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Space+Mono:wght@400;700&display=swap');

                .leaflet-control-zoom {
                    border: 1px solid ${AMBER_BDR} !important;
                    border-radius: 10px !important;
                    overflow: hidden;
                    background: rgba(7,8,10,0.9) !important;
                    backdrop-filter: blur(12px);
                    box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;
                }
                .leaflet-control-zoom a {
                    background: transparent !important;
                    color: ${AMBER_DIM} !important;
                    border-bottom: 1px solid rgba(27,94,32,0.1) !important;
                    font-size: 16px !important;
                    width: 30px !important;
                    height: 30px !important;
                    line-height: 30px !important;
                }
                .leaflet-control-zoom a:hover {
                    background: ${AMBER_PALE} !important;
                    color: ${AMBER} !important;
                }
                .leaflet-control-attribution {
                    background: rgba(7,8,10,0.8) !important;
                    color: rgba(255,255,255,0.25) !important;
                    font-size: 9px !important;
                    backdrop-filter: blur(8px);
                    border-radius: 6px 0 0 0 !important;
                    border: 1px solid rgba(255,255,255,0.05) !important;
                }
                .leaflet-control-attribution a { color: ${AMBER_DIM} !important; }
            `}</style>
        </Box>
    )
}
