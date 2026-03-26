import { useEffect, useState } from 'react'
import { Box, Typography } from '@mui/material'
import { AnimatePresence, motion } from 'framer-motion'

import sugarcane1 from '@/assets/sugarcane_1.png'
import sugarcane2 from '@/assets/sugarcane_2.png'
import sugarcane3 from '@/assets/sugarcane_3.png'
import sugarcane4 from '@/assets/sugarcane_4.png'
import sugarcane5 from '@/assets/sugarcane_5.png'

type SliderVariant = 'auth' | 'hero'

type SlideDefinition = {
    image: string
    eyebrow: string
    title: string
    description: string
    location: string
    metrics: string[]
}

type SugarcanePhoto = {
    image: string
    label: string
    objectPosition: string
    rotation: number
}

const slides: SlideDefinition[] = [
    {
        image: sugarcane1,
        eyebrow: 'Canopy Overview',
        title: 'Precision sugarcane intelligence at your fingertips.',
        description: 'A calmer visual layer for field teams, blending sugarcane imagery with clear monitoring context before maps, forms, and analytics open.',
        location: 'Season 2025/26',
        metrics: ['Canopy 78%', 'Moisture 42%', '14 active blocks'],
    },
    {
        image: sugarcane2,
        eyebrow: 'Irrigation Rhythm',
        title: 'Water decisions grounded in real crop texture.',
        description: 'Irrigation timing, crop condition, and field context stay visible without burying the screen under extra panels.',
        location: 'Block 04',
        metrics: ['Valve stable', '24C field temp', 'Flow on track'],
    },
    {
        image: sugarcane3,
        eyebrow: 'Health Watch',
        title: 'Stress patterns are easier to read in a quieter layout.',
        description: 'Disease and vigor cues stay prominent while the interface stays focused on sugarcane observations, not decoration.',
        location: 'Section East',
        metrics: ['Stress low', 'Leaf scan ready', 'Patrol logged'],
    },
    {
        image: sugarcane4,
        eyebrow: 'Harvest Outlook',
        title: 'Yield-facing visuals with a more composed dashboard feel.',
        description: 'Harvest readiness, route planning, and crop maturity can be understood at a glance with less visual noise.',
        location: 'Trial E',
        metrics: ['Brix rising', 'Crew aligned', 'Route planned'],
    },
    {
        image: sugarcane5,
        eyebrow: 'Spatial Coverage',
        title: 'Map-ready sugarcane scenes that support boundary thinking.',
        description: 'The imagery echoes field coverage and recorded boundaries while keeping the experience clean enough for daily use.',
        location: 'Coverage sync',
        metrics: ['106 fields', 'Boundary ready', 'Center locked'],
    },
]

const FRAME_INTERVAL_MS = 5200

const sugarcanePhotoGrid: SugarcanePhoto[] = [
    { image: sugarcane1, label: 'Fresh cane', objectPosition: 'center center', rotation: -4 },
    { image: sugarcane2, label: 'Golden rows', objectPosition: 'center 42%', rotation: 3 },
    { image: sugarcane3, label: 'Soft canopy', objectPosition: 'center 36%', rotation: -2 },
    { image: sugarcane4, label: 'Harvest glow', objectPosition: 'center 40%', rotation: 4 },
    { image: sugarcane5, label: 'Field curve', objectPosition: 'center center', rotation: -3 },
    { image: sugarcane1, label: 'Bright leaves', objectPosition: 'center 24%', rotation: 2 },
    { image: sugarcane2, label: 'Sugar view', objectPosition: 'center 60%', rotation: -4 },
    { image: sugarcane3, label: 'Green patch', objectPosition: 'center 55%', rotation: 3 },
    { image: sugarcane4, label: 'Sunlit cane', objectPosition: 'center 62%', rotation: -2 },
    { image: sugarcane5, label: 'Boundary field', objectPosition: 'center 28%', rotation: 4 },
]

function MetricTile({ label }: { label: string }) {
    return (
        <Box
            sx={{
                px: 1.3,
                py: 1.05,
                borderRadius: '12px',
                bgcolor: 'rgba(255,255,255,0.56)',
                border: '1px solid rgba(86,184,112,0.16)',
                backdropFilter: 'blur(10px)',
            }}
        >
            <Typography
                sx={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#234034',
                    fontFamily: '"Space Mono", monospace',
                    whiteSpace: 'nowrap',
                }}
            >
                {label}
            </Typography>
        </Box>
    )
}

function SugarcanePhotoTile({ photo, index }: { photo: SugarcanePhoto; index: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 14, rotate: photo.rotation - 2 }}
            animate={{ opacity: 1, y: 0, rotate: photo.rotation }}
            transition={{
                delay: 0.08 + (index * 0.03),
                duration: 0.45,
                ease: [0.16, 1, 0.3, 1],
            }}
        >
            <Box
                sx={{
                    position: 'relative',
                    aspectRatio: '1 / 1',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.58)',
                    boxShadow: '0 14px 28px rgba(35,64,52,0.12)',
                    background: 'rgba(255,255,255,0.7)',
                }}
            >
                <Box
                    component="img"
                    src={photo.image}
                    alt={photo.label}
                    sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: photo.objectPosition,
                        display: 'block',
                        filter: 'saturate(1.04) contrast(1.03) brightness(1.02)',
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 'auto 8px 8px 8px',
                        px: 0.7,
                        py: 0.45,
                        borderRadius: '999px',
                        bgcolor: 'rgba(255,255,255,0.78)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(27,94,32,0.12)',
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: '0.46rem',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: '#234034',
                            fontFamily: '"Space Mono", monospace',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {photo.label}
                    </Typography>
                </Box>
            </Box>
        </motion.div>
    )
}

export function AuthImageSlider({
    variant = 'auth',
    showPhotoGrid = false,
}: {
    variant?: SliderVariant
    showPhotoGrid?: boolean
}) {
    const [index, setIndex] = useState(0)

    useEffect(() => {
        const timer = window.setInterval(() => {
            setIndex((prev) => (prev + 1) % slides.length)
        }, FRAME_INTERVAL_MS)

        return () => window.clearInterval(timer)
    }, [])

    const activeSlide = slides[index]
    const isHero = variant === 'hero'

    return (
        <Box
            sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: isHero ? { xs: 380, md: 520 } : { xs: 320, sm: 360, md: 420 },
                borderRadius: isHero ? '28px' : 'inherit',
                overflow: 'hidden',
                bgcolor: '#f7fbf6',
                isolation: 'isolate',
                border: isHero ? '1px solid rgba(86,184,112,0.14)' : undefined,
                boxShadow: isHero ? '0 26px 56px rgba(35,64,52,0.12)' : undefined,
            }}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={`${variant}-${index}`}
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                        position: 'absolute',
                        inset: -24,
                        backgroundImage: `url(${activeSlide.image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'saturate(1.01) contrast(1.01) brightness(1.02)',
                    }}
                />
            </AnimatePresence>

            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 1,
                    background: `
                        radial-gradient(circle at 15% 18%, rgba(166,226,184,0.24) 0%, transparent 30%),
                        radial-gradient(circle at 86% 14%, rgba(244,162,140,0.16) 0%, transparent 24%),
                        linear-gradient(180deg, rgba(252,255,252,0.1) 0%, rgba(250,252,247,0.14) 22%, rgba(255,248,241,0.56) 58%, rgba(255,248,241,0.9) 100%)
                    `,
                }}
            />

            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 2,
                    pointerEvents: 'none',
                    background: 'linear-gradient(90deg, rgba(24,49,39,0.08) 0%, transparent 26%, transparent 74%, rgba(24,49,39,0.08) 100%)',
                }}
            />

            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 3,
                    px: { xs: 2, md: isHero ? 3.2 : 2.6 },
                    py: { xs: 2, md: isHero ? 3 : 2.4 },
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1.5,
                        flexWrap: 'wrap',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'wrap' }}>
                        <Box
                            sx={{
                                px: 1.15,
                                py: 0.55,
                                borderRadius: '10px',
                                bgcolor: 'rgba(27,94,32,0.92)',
                                boxShadow: '0 10px 22px rgba(35,64,52,0.12)',
                            }}
                        >
                            <Typography
                                sx={{
                                    fontSize: '0.58rem',
                                    fontWeight: 800,
                                    letterSpacing: '0.16em',
                                    textTransform: 'uppercase',
                                    color: '#f8fff9',
                                    fontFamily: '"Space Mono", monospace',
                                }}
                            >
                                Broadcast
                            </Typography>
                        </Box>
                        <Typography
                            sx={{
                                fontSize: '0.66rem',
                                fontWeight: 700,
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                color: 'rgba(35,64,52,0.72)',
                                fontFamily: '"Space Mono", monospace',
                            }}
                        >
                            Sugarcane management active
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            px: 1.15,
                            py: 0.65,
                            borderRadius: '10px',
                            bgcolor: 'rgba(255,250,245,0.72)',
                            border: '1px solid rgba(244,162,140,0.22)',
                            backdropFilter: 'blur(12px)',
                        }}
                    >
                        <Typography
                            sx={{
                                fontSize: '0.58rem',
                                fontWeight: 700,
                                letterSpacing: '0.14em',
                                textTransform: 'uppercase',
                                color: '#de7c64',
                                fontFamily: '"Space Mono", monospace',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {activeSlide.location}
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ mt: 'auto', maxWidth: isHero ? 620 : 540 }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`${variant}-content-${index}`}
                            initial={{ opacity: 0, y: 22 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -14 }}
                            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <Box
                                sx={{
                                    p: { xs: 2.2, md: isHero ? 3.1 : 2.7 },
                                    borderRadius: '20px',
                                    background: 'linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,247,240,0.86) 100%)',
                                    border: '1px solid rgba(255,255,255,0.52)',
                                    backdropFilter: 'blur(16px)',
                                    boxShadow: '0 22px 42px rgba(35,64,52,0.14)',
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontSize: '0.62rem',
                                        fontWeight: 700,
                                        letterSpacing: '0.18em',
                                        textTransform: 'uppercase',
                                        color: '#2f7f4f',
                                        fontFamily: '"Space Mono", monospace',
                                        mb: 1.1,
                                    }}
                                >
                                    {activeSlide.eyebrow}
                                </Typography>

                                <Typography
                                    sx={{
                                        fontSize: isHero ? { xs: '1.7rem', md: '2.45rem' } : { xs: '1.2rem', md: '1.65rem' },
                                        fontWeight: 800,
                                        lineHeight: 1.02,
                                        letterSpacing: '-0.04em',
                                        color: '#234034',
                                        fontFamily: '"Syne", serif',
                                        maxWidth: isHero ? 560 : 470,
                                        mb: 1.2,
                                    }}
                                >
                                    {activeSlide.title}
                                </Typography>

                                <Typography
                                    sx={{
                                        fontSize: isHero ? '0.95rem' : '0.84rem',
                                        lineHeight: 1.7,
                                        color: 'rgba(35,64,52,0.76)',
                                        maxWidth: isHero ? 520 : 440,
                                        mb: 2.1,
                                    }}
                                >
                                    {activeSlide.description}
                                </Typography>

                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                                        gap: 1,
                                        mb: 2.2,
                                    }}
                                >
                                    {activeSlide.metrics.map((metric) => (
                                        <MetricTile key={metric} label={metric} />
                                    ))}
                                </Box>

                                {showPhotoGrid && (
                                    <Box sx={{ mb: 2.1 }}>
                                        <Typography
                                            sx={{
                                                fontSize: '0.58rem',
                                                fontWeight: 700,
                                                letterSpacing: '0.16em',
                                                textTransform: 'uppercase',
                                                color: 'rgba(35,64,52,0.58)',
                                                fontFamily: '"Space Mono", monospace',
                                                mb: 1.1,
                                            }}
                                        >
                                            Sugarcane gallery
                                        </Typography>
                                        <Box
                                            sx={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                                                gap: 0.9,
                                            }}
                                        >
                                            {sugarcanePhotoGrid.map((photo, photoIndex) => (
                                                <SugarcanePhotoTile
                                                    key={`${photo.label}-${photoIndex}`}
                                                    photo={photo}
                                                    index={photoIndex}
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                )}

                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 1.5,
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            fontSize: '0.62rem',
                                            fontWeight: 700,
                                            letterSpacing: '0.14em',
                                            textTransform: 'uppercase',
                                            color: 'rgba(35,64,52,0.58)',
                                            fontFamily: '"Space Mono", monospace',
                                        }}
                                    >
                                        Slide {String(index + 1).padStart(2, '0')} of {String(slides.length).padStart(2, '0')}
                                    </Typography>

                                    <Box sx={{ display: 'flex', gap: 0.65, alignItems: 'center' }}>
                                        {slides.map((_, slideIndex) => (
                                            <Box
                                                key={slideIndex}
                                                sx={{
                                                    width: slideIndex === index ? 30 : 12,
                                                    height: 4,
                                                    borderRadius: '4px',
                                                    bgcolor: slideIndex === index ? '#56b870' : 'rgba(35,64,52,0.18)',
                                                    transition: 'all 0.28s ease',
                                                }}
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            </Box>
                        </motion.div>
                    </AnimatePresence>
                </Box>
            </Box>
        </Box>
    )
}
