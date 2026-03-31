import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
    Box,
    Paper,
    Typography,
    Link,
    IconButton,
    ButtonBase,
} from '@mui/material'
import {
    AgricultureRounded,
    AutoAwesomeRounded,
    GrassRounded,
    ShieldRounded,
    Visibility,
    VisibilityOff,
    ArrowForward,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { BrandLogo } from '@/components/Brand/BrandLogo'
import {
    BRAND_NAME_UPPER,
    BRAND_SYSTEM_TAGLINE,
} from '@/branding/brand'
import sugarcane1 from '@/assets/sugarcane_1.png'
import sugarcane2 from '@/assets/sugarcane_2.png'
import sugarcane3 from '@/assets/sugarcane_3.png'
import sugarcane4 from '@/assets/sugarcane_4.png'
import sugarcane5 from '@/assets/sugarcane_5.png'

const GOLD = '#1b5e20'
const GOLD_DIM = 'rgba(27,94,32,0.55)'
const GOLD_BORDER = 'rgba(27,94,32,0.3)'
const RED_LIVE = '#1b5e20'
const DEEP = '#f3f7f3'
const PANEL = 'rgba(255,255,255,0.84)'
const PANEL_ALT = 'rgba(255,249,244,0.9)'
const TEXT_DIM = 'rgba(35,64,52,0.5)'
const SHOWCASE_ROTATION_MS = 4200

type LoginScene = {
    image: string
    label: string
    eyebrow: string
    title: string
    description: string
    objectPosition: string
}

const LOGIN_SCENES: LoginScene[] = [
    {
        image: sugarcane1,
        label: 'Field records',
        eyebrow: 'Observation workspace',
        title: 'Review sugarcane field records from one connected workspace.',
        description: 'Cane Pulse keeps recorded observations, crop notes, and synced field data ready as soon as you sign in.',
        objectPosition: 'center 24%',
    },
    {
        image: sugarcane2,
        label: 'Map boundaries',
        eyebrow: 'Spatial coverage',
        title: 'Open mapped fields, boundaries, and cane coverage with less friction.',
        description: 'Use the map workspace to inspect field blocks, verify coverage, and move quickly through spatial sugarcane data.',
        objectPosition: 'center 48%',
    },
    {
        image: sugarcane3,
        label: 'Entry forms',
        eyebrow: 'Mobile submission flow',
        title: 'Manage sugarcane entry forms and mobile submissions in one place.',
        description: 'Field form intake, collector submissions, and synced observation entries stay organized inside the system.',
        objectPosition: 'center 36%',
    },
    {
        image: sugarcane4,
        label: 'Field statistics',
        eyebrow: 'Analytics overview',
        title: 'Track cultivated area, cane area, furrow area, and growth stages.',
        description: 'The statistics workspace helps you review mapped fields, crop coverage, and plant cane versus ratoon summaries.',
        objectPosition: 'center 40%',
    },
    {
        image: sugarcane5,
        label: 'Secure access',
        eyebrow: 'Role-based control',
        title: 'Sign in to a protected system built for admins, supervisors, and collectors.',
        description: 'Cane Pulse keeps access controlled while your field data, maps, and approvals stay ready for daily work.',
        objectPosition: 'center center',
    },
]

const LOGIN_HIGHLIGHTS = [
    {
        label: 'Field records',
        value: 'Observation rows and synced submissions in one place',
        icon: <GrassRounded sx={{ fontSize: 16 }} />,
        tint: 'rgba(107,196,134,0.16)',
    },
    {
        label: 'Map view',
        value: 'Mapped fields, boundaries, and coverage ready',
        icon: <AgricultureRounded sx={{ fontSize: 16 }} />,
        tint: 'rgba(103,185,201,0.18)',
    },
    {
        label: 'Field statistics',
        value: 'Area and growth stage summaries available',
        icon: <AutoAwesomeRounded sx={{ fontSize: 16 }} />,
        tint: 'rgba(234,143,115,0.18)',
    },
]

function AuthMiniBadge({ label, icon }: { label: string; icon?: React.ReactNode }) {
    return (
        <Box
            sx={{
                px: 1.2,
                py: 0.75,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.8,
                borderRadius: '999px',
                border: '1px solid rgba(27,94,32,0.12)',
                bgcolor: 'rgba(255,255,255,0.66)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 10px 20px rgba(35,64,52,0.05)',
            }}
        >
            {icon && (
                <Box sx={{ display: 'flex', alignItems: 'center', color: GOLD }}>
                    {icon}
                </Box>
            )}
            <Typography
                sx={{
                    fontSize: '0.56rem',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: GOLD,
                    fontFamily: '"Times New Roman", Times, serif',
                    whiteSpace: 'nowrap',
                }}
            >
                {label}
            </Typography>
        </Box>
    )
}

function FloatingLoginIcon({
    icon,
    top,
    left,
    right,
    bottom,
    size,
    tint,
    duration = 12,
}: {
    icon: React.ReactNode
    top?: number | string
    left?: number | string
    right?: number | string
    bottom?: number | string
    size: number
    tint: string
    duration?: number
}) {
    return (
        <Box
            component={motion.div}
            animate={{ y: [0, -10, 0], x: [0, 6, 0], opacity: [0.18, 0.3, 0.18] }}
            transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
            sx={{
                position: 'absolute',
                top,
                left,
                right,
                bottom,
                width: size,
                height: size,
                borderRadius: '50%',
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                justifyContent: 'center',
                background: `radial-gradient(circle, ${tint} 0%, transparent 72%)`,
                color: tint,
                pointerEvents: 'none',
                zIndex: 0,
                '& svg': {
                    fontSize: size * 0.32,
                    opacity: 0.42,
                },
            }}
        >
            {icon}
        </Box>
    )
}

function SceneThumbnail({
    scene,
    active,
    onSelect,
}: {
    scene: LoginScene
    active: boolean
    onSelect: () => void
}) {
    return (
        <ButtonBase
            onClick={onSelect}
            sx={{
                width: '100%',
                minWidth: { xs: 156, md: 0 },
                textAlign: 'left',
                borderRadius: '20px',
                overflow: 'hidden',
                border: active ? '1px solid rgba(27,94,32,0.28)' : '1px solid rgba(27,94,32,0.1)',
                bgcolor: active ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.6)',
                boxShadow: active ? '0 18px 32px rgba(35,64,52,0.12)' : '0 8px 18px rgba(35,64,52,0.05)',
                transition: 'all 0.2s ease',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 18px 32px rgba(35,64,52,0.1)',
                },
            }}
        >
            <Box sx={{ p: 1.05, width: '100%' }}>
                <Box
                    component="img"
                    src={scene.image}
                    alt={scene.label}
                    sx={{
                        width: '100%',
                        height: 104,
                        objectFit: 'cover',
                        objectPosition: scene.objectPosition,
                        borderRadius: '16px',
                        display: 'block',
                        mb: 1,
                    }}
                />
                <Typography
                    sx={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: '#234034',
                        fontFamily: '"Times New Roman", Times, serif',
                        lineHeight: 1.2,
                    }}
                >
                    {scene.label}
                </Typography>
                <Typography
                    sx={{
                        fontSize: '0.54rem',
                        color: 'rgba(35,64,52,0.58)',
                        fontFamily: '"Times New Roman", Times, serif',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        mt: 0.45,
                    }}
                >
                    {scene.eyebrow}
                </Typography>
            </Box>
        </ButtonBase>
    )
}

function FieldInput({
    label,
    value,
    onChange,
    type = 'text',
    endAdornment,
    placeholder,
    delay,
}: {
    label: string
    value: string
    onChange: (v: string) => void
    type?: string
    endAdornment?: React.ReactNode
    placeholder: string
    delay: number
}) {
    const [focused, setFocused] = useState(false)

    return (
        <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
            <Box sx={{ mb: 3 }}>
                <Typography
                    sx={{
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        letterSpacing: '0.16em',
                        color: focused ? GOLD : TEXT_DIM,
                        fontFamily: '"Times New Roman", Times, serif',
                        textTransform: 'uppercase',
                        mb: 1,
                        transition: 'color 0.2s',
                    }}
                >
                    {label}
                </Typography>
                <Box
                    sx={{
                        position: 'relative',
                        border: `1px solid ${focused ? GOLD_BORDER : 'rgba(27,94,32,0.12)'}`,
                        borderRadius: '18px',
                        background: focused
                            ? 'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,252,247,0.98) 100%)'
                            : 'linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(255,249,244,0.84) 100%)',
                        transition: 'all 0.2s ease',
                        boxShadow: focused ? '0 0 0 4px rgba(27,94,32,0.1)' : '0 10px 24px rgba(35,64,52,0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        overflow: 'hidden',
                    }}
                >
                    <Box
                        sx={{
                            width: 3,
                            alignSelf: 'stretch',
                            bgcolor: focused ? GOLD : 'transparent',
                            transition: 'background 0.2s',
                            flexShrink: 0,
                        }}
                    />
                    <Box
                        component="input"
                        type={type}
                        placeholder={placeholder}
                        value={value}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        sx={{
                            flex: 1,
                            border: 'none',
                            outline: 'none',
                            bgcolor: 'transparent',
                            color: 'text.primary',
                            fontSize: '0.92rem',
                            fontFamily: '"Times New Roman", Times, serif',
                            px: 2,
                            py: 1.65,
                            '&::placeholder': { color: TEXT_DIM, fontSize: '0.82rem' },
                        }}
                    />
                    {endAdornment && <Box sx={{ pr: 1.5 }}>{endAdornment}</Box>}
                </Box>
            </Box>
        </motion.div>
    )
}

export function LoginPage() {
    const { signIn, resendConfirmationEmail } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [infoMessage, setInfoMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [resendLoading, setResendLoading] = useState(false)
    const [showResendAction, setShowResendAction] = useState(false)
    const [activeSceneIndex, setActiveSceneIndex] = useState(0)

    useEffect(() => {
        const timer = window.setInterval(() => {
            setActiveSceneIndex((prev) => (prev + 1) % LOGIN_SCENES.length)
        }, SHOWCASE_ROTATION_MS)

        return () => window.clearInterval(timer)
    }, [])

    const activeScene = LOGIN_SCENES[activeSceneIndex]
    const nextScene = LOGIN_SCENES[(activeSceneIndex + 1) % LOGIN_SCENES.length]

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setInfoMessage('')
        setShowResendAction(false)
        setLoading(true)
        try {
            await signIn({ email, password })
            navigate('/')
        } catch (err: any) {
            const message = err.message || 'Invalid credentials'
            setError(message)
            setShowResendAction(/email(?: address)? not confirmed/i.test(message))
        } finally {
            setLoading(false)
        }
    }

    const handleResendConfirmation = async () => {
        setError('')
        setInfoMessage('')
        setResendLoading(true)

        try {
            await resendConfirmationEmail(email)
            setInfoMessage(`Confirmation email sent to ${email.trim()}. Check your inbox and spam folder.`)
        } catch (err: any) {
            setError(err.message || 'Failed to resend confirmation email.')
            setShowResendAction(true)
        } finally {
            setResendLoading(false)
        }
    }

    return (
        <Box
            sx={{
                minHeight: '100vh',
                width: '100%',
                bgcolor: DEEP,
                overflow: 'hidden',
                fontFamily: '"Times New Roman", Times, serif',
                background: `
                    radial-gradient(circle at 8% 8%, rgba(166,226,184,0.24) 0%, transparent 26%),
                    radial-gradient(circle at 90% 12%, rgba(244,162,140,0.18) 0%, transparent 24%),
                    radial-gradient(circle at 72% 78%, rgba(255,228,185,0.2) 0%, transparent 24%),
                    linear-gradient(180deg, #fbfdf8 0%, #f5faf4 52%, #fff8f1 100%)
                `,
                px: { xs: 2, sm: 3.2, lg: 4.5 },
                py: { xs: 2.2, md: 3.2 },
            }}
        >
            <Box sx={{ maxWidth: 1380, mx: 'auto', position: 'relative' }}>
                <FloatingLoginIcon
                    icon={<AgricultureRounded />}
                    top={-42}
                    right={24}
                    size={180}
                    tint="rgba(107,196,134,0.28)"
                    duration={14}
                />
                <FloatingLoginIcon
                    icon={<AutoAwesomeRounded />}
                    bottom={42}
                    left={-34}
                    size={160}
                    tint="rgba(103,185,201,0.24)"
                    duration={13}
                />
                <FloatingLoginIcon
                    icon={<ShieldRounded />}
                    top={220}
                    right={-18}
                    size={136}
                    tint="rgba(234,143,115,0.22)"
                    duration={16}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        top: -70,
                        left: -40,
                        width: 220,
                        height: 220,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(166,226,184,0.28) 0%, transparent 70%)',
                        filter: 'blur(10px)',
                        pointerEvents: 'none',
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        right: -30,
                        top: 90,
                        width: 260,
                        height: 260,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(244,162,140,0.18) 0%, transparent 72%)',
                        filter: 'blur(16px)',
                        pointerEvents: 'none',
                    }}
                />

                <Box
                    sx={{
                        position: 'relative',
                        zIndex: 1,
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.12fr) minmax(420px, 500px)' },
                        gap: { xs: 3, lg: 4 },
                        alignItems: 'center',
                    }}
                >
                    <Box sx={{ display: 'grid', gap: 2.2 }}>
                        <motion.div
                            initial={{ opacity: 0, y: -12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.55 }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: { xs: 'flex-start', sm: 'center' },
                                    justifyContent: 'space-between',
                                    gap: 1.5,
                                    flexWrap: 'wrap',
                                    mb: 1.4,
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4 }}>
                                    <BrandLogo size={50} borderRadius={15} />
                                    <Box>
                                        <Typography
                                            sx={{
                                                fontSize: '0.88rem',
                                                fontWeight: 700,
                                                color: '#234034',
                                                letterSpacing: '0.12em',
                                                fontFamily: '"Times New Roman", Times, serif',
                                                lineHeight: 1.2,
                                            }}
                                        >
                                            {BRAND_NAME_UPPER}
                                        </Typography>
                                        <Typography
                                            sx={{
                                                fontSize: '0.56rem',
                                                color: 'rgba(35,64,52,0.58)',
                                                letterSpacing: '0.14em',
                                                fontFamily: '"Times New Roman", Times, serif',
                                            }}
                                        >
                                            {BRAND_SYSTEM_TAGLINE}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>

                        </motion.div>

                        <Box
                            sx={{
                                position: 'relative',
                                minHeight: { xs: 360, sm: 430, md: 510 },
                                borderRadius: '34px',
                                overflow: 'hidden',
                                border: '1px solid rgba(27,94,32,0.12)',
                                background: '#f8fff9',
                                boxShadow: '0 30px 60px rgba(35,64,52,0.12)',
                                isolation: 'isolate',
                            }}
                        >
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeScene.label}
                                    initial={{ opacity: 0, scale: 1.04 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.985 }}
                                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        backgroundImage: `url(${activeScene.image})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: activeScene.objectPosition,
                                        filter: 'saturate(1.03) contrast(1.02) brightness(1.03)',
                                    }}
                                />
                            </AnimatePresence>

                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: `
                                        radial-gradient(circle at 14% 14%, rgba(166,226,184,0.28) 0%, transparent 28%),
                                        radial-gradient(circle at 86% 14%, rgba(255,255,255,0.38) 0%, transparent 22%),
                                        linear-gradient(180deg, rgba(248,255,250,0.12) 0%, rgba(248,255,250,0.02) 28%, rgba(255,248,241,0.32) 58%, rgba(255,248,241,0.9) 100%)
                                    `,
                                }}
                            />

                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    p: { xs: 2, sm: 2.4, md: 3 },
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 1,
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <AuthMiniBadge
                                        label={activeScene.eyebrow}
                                        icon={<GrassRounded sx={{ fontSize: 14 }} />}
                                    />
                                    <AuthMiniBadge
                                        label="Auto rotating"
                                        icon={<AutoAwesomeRounded sx={{ fontSize: 14 }} />}
                                    />
                                </Box>

                                <Box
                                    sx={{
                                        display: { xs: 'none', sm: 'block' },
                                        position: 'absolute',
                                        top: 28,
                                        right: 26,
                                        width: { sm: 154, md: 172 },
                                        p: 1,
                                        borderRadius: '22px',
                                        bgcolor: 'rgba(255,255,255,0.72)',
                                        border: '1px solid rgba(255,255,255,0.58)',
                                        backdropFilter: 'blur(16px)',
                                        boxShadow: '0 18px 30px rgba(35,64,52,0.12)',
                                    }}
                                >
                                    <Box
                                        component="img"
                                        src={nextScene.image}
                                        alt={nextScene.label}
                                        sx={{
                                            width: '100%',
                                            height: 120,
                                            objectFit: 'cover',
                                            objectPosition: nextScene.objectPosition,
                                            display: 'block',
                                            borderRadius: '16px',
                                            mb: 0.9,
                                        }}
                                    />
                                    <Typography
                                        sx={{
                                            fontSize: '0.52rem',
                                            fontWeight: 700,
                                            letterSpacing: '0.12em',
                                            textTransform: 'uppercase',
                                            color: 'rgba(35,64,52,0.6)',
                                            fontFamily: '"Times New Roman", Times, serif',
                                            mb: 0.45,
                                        }}
                                    >
                                        Up next
                                    </Typography>
                                    <Typography
                                        sx={{
                                            fontSize: '0.82rem',
                                            fontWeight: 700,
                                            color: '#234034',
                                            fontFamily: '"Times New Roman", Times, serif',
                                            lineHeight: 1.1,
                                        }}
                                    >
                                        {nextScene.label}
                                    </Typography>
                                </Box>

                                <Box
                                    sx={{
                                        maxWidth: { xs: '100%', md: 540 },
                                        p: { xs: 2, md: 2.35 },
                                        borderRadius: '26px',
                                        bgcolor: 'rgba(255,255,255,0.74)',
                                        border: '1px solid rgba(255,255,255,0.58)',
                                        backdropFilter: 'blur(14px)',
                                        boxShadow: '0 18px 34px rgba(35,64,52,0.14)',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: { xs: 12, md: 18 },
                                            right: { xs: 14, md: 20 },
                                            width: 52,
                                            height: 52,
                                            borderRadius: '18px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            bgcolor: 'rgba(255,255,255,0.54)',
                                            border: '1px solid rgba(255,255,255,0.62)',
                                            color: GOLD,
                                            boxShadow: '0 16px 32px rgba(35,64,52,0.1)',
                                        }}
                                    >
                                        <AgricultureRounded sx={{ fontSize: 24 }} />
                                    </Box>
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={`${activeScene.label}-copy`}
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -12 }}
                                            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                                        >
                                            <Typography
                                                sx={{
                                                    fontSize: '0.62rem',
                                                    fontWeight: 700,
                                                    letterSpacing: '0.18em',
                                                    textTransform: 'uppercase',
                                                    color: '#2f7f4f',
                                                    fontFamily: '"Times New Roman", Times, serif',
                                                    mb: 1.1,
                                                }}
                                            >
                                                {activeScene.label}
                                            </Typography>
                                            <Typography
                                                sx={{
                                                    fontSize: { xs: '1.4rem', md: '2rem' },
                                                    fontWeight: 800,
                                                    lineHeight: 1.02,
                                                    letterSpacing: '-0.045em',
                                                    color: '#234034',
                                                    fontFamily: '"Times New Roman", Times, serif',
                                                    mb: 1,
                                                }}
                                            >
                                                {activeScene.title}
                                            </Typography>
                                            <Typography
                                                sx={{
                                                    fontSize: { xs: '0.84rem', md: '0.92rem' },
                                                    lineHeight: 1.75,
                                                    color: 'rgba(35,64,52,0.74)',
                                                    maxWidth: 420,
                                                }}
                                            >
                                                {activeScene.description}
                                            </Typography>
                                        </motion.div>
                                    </AnimatePresence>

                                    <Box sx={{ display: 'flex', gap: 0.7, mt: 2 }}>
                                        {LOGIN_SCENES.map((scene, index) => (
                                            <Box
                                                key={scene.label}
                                                sx={{
                                                    width: index === activeSceneIndex ? 30 : 10,
                                                    height: 4,
                                                    borderRadius: '999px',
                                                    bgcolor: index === activeSceneIndex ? '#56b870' : 'rgba(35,64,52,0.16)',
                                                    transition: 'all 0.28s ease',
                                                }}
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            </Box>
                        </Box>

                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: `repeat(${LOGIN_SCENES.length}, minmax(156px, 1fr))`, md: `repeat(${LOGIN_SCENES.length}, minmax(0, 1fr))` },
                                gap: 1.2,
                                overflowX: { xs: 'auto', md: 'visible' },
                                pb: { xs: 0.5, md: 0 },
                                pr: { xs: 0.2, md: 0 },
                            }}
                        >
                            {LOGIN_SCENES.map((scene, index) => (
                                <SceneThumbnail
                                    key={scene.label}
                                    scene={scene}
                                    active={index === activeSceneIndex}
                                    onSelect={() => setActiveSceneIndex(index)}
                                />
                            ))}
                        </Box>

                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                                gap: 1.2,
                            }}
                        >
                            {LOGIN_HIGHLIGHTS.map(({ label, value, icon, tint }) => (
                                <Box
                                    key={label}
                                    sx={{
                                        p: 1.4,
                                        borderRadius: '20px',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        border: '1px solid rgba(27,94,32,0.08)',
                                        bgcolor: 'rgba(255,255,255,0.54)',
                                        boxShadow: '0 14px 26px rgba(35,64,52,0.05)',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 34,
                                            height: 34,
                                            mb: 1,
                                            borderRadius: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            bgcolor: tint,
                                            color: GOLD,
                                        }}
                                    >
                                        {icon}
                                    </Box>
                                    <Typography
                                        sx={{
                                            fontSize: '0.58rem',
                                            color: GOLD,
                                            fontFamily: '"Times New Roman", Times, serif',
                                            letterSpacing: '0.12em',
                                            textTransform: 'uppercase',
                                            mb: 0.55,
                                        }}
                                    >
                                        {label}
                                    </Typography>
                                    <Typography sx={{ fontSize: '0.82rem', color: 'rgba(35,64,52,0.68)', lineHeight: 1.55 }}>
                                        {value}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>

                    <Paper
                        elevation={0}
                        sx={{
                            position: 'relative',
                            overflow: 'hidden',
                            p: { xs: 3, sm: 4.2 },
                            borderRadius: '32px',
                            bgcolor: PANEL,
                            background: `linear-gradient(180deg, ${PANEL} 0%, ${PANEL_ALT} 100%)`,
                            border: '1px solid rgba(27,94,32,0.1)',
                            boxShadow: '0 28px 58px rgba(35,64,52,0.1)',
                            backdropFilter: 'blur(16px)',
                        }}
                    >
                        <Box
                            sx={{
                                position: 'absolute',
                                inset: 'auto -80px -100px auto',
                                width: 220,
                                height: 220,
                                borderRadius: '50%',
                                background: 'radial-gradient(circle, rgba(166,226,184,0.2) 0%, transparent 70%)',
                                pointerEvents: 'none',
                            }}
                        />

                        <Box sx={{ position: 'relative', zIndex: 1 }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.6 }}>
                                <AuthMiniBadge
                                    label="Secure sign-in"
                                    icon={<ShieldRounded sx={{ fontSize: 14 }} />}
                                />
                                <AuthMiniBadge
                                    label="Field-ready"
                                    icon={<GrassRounded sx={{ fontSize: 14 }} />}
                                />
                                <AuthMiniBadge
                                    label="Sugarcane maps"
                                    icon={<AgricultureRounded sx={{ fontSize: 14 }} />}
                                />
                            </Box>

                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                            >
                                <Box sx={{ mb: 4.2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                        <Box sx={{ width: 30, height: 2, bgcolor: GOLD, borderRadius: 1 }} />
                                        <Typography
                                            sx={{
                                                fontSize: '0.58rem',
                                                color: GOLD_DIM,
                                                fontFamily: '"Times New Roman", Times, serif',
                                                letterSpacing: '0.18em',
                                            }}
                                        >
                                            OPERATOR AUTHENTICATION
                                        </Typography>
                                    </Box>
                                    <Typography
                                        sx={{
                                            fontSize: 'clamp(2.1rem, 3.5vw, 3rem)',
                                            fontWeight: 800,
                                            color: '#234034',
                                            letterSpacing: '-0.04em',
                                            fontFamily: '"Times New Roman", Times, serif',
                                            lineHeight: 0.98,
                                            mb: 1.2,
                                        }}
                                    >
                                        Welcome back to
                                        <Box component="span" sx={{ color: GOLD, display: 'block' }}>
                                            Cane Pulse
                                        </Box>
                                    </Typography>
                                    <Typography
                                        sx={{
                                            fontSize: '0.9rem',
                                            color: 'rgba(35,64,52,0.72)',
                                            lineHeight: 1.8,
                                            maxWidth: 420,
                                            mb: 2.2,
                                        }}
                                    >
                                        Your sugarcane field management system is ready for field records, entry forms, map boundaries, and field statistics.
                                    </Typography>

                                    <Box
                                        sx={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                                            gap: 1,
                                            maxWidth: 400,
                                        }}
                                    >
                                        {[
                                            {
                                                label: 'Live maps',
                                                detail: 'Boundaries and trial blocks',
                                                icon: <AgricultureRounded sx={{ fontSize: 16 }} />,
                                                tint: 'rgba(107,196,134,0.14)',
                                            },
                                            {
                                                label: 'Protected',
                                                detail: 'Role-based operator access',
                                                icon: <ShieldRounded sx={{ fontSize: 16 }} />,
                                                tint: 'rgba(234,143,115,0.14)',
                                            },
                                        ].map(({ label, detail, icon, tint }) => (
                                            <Box
                                                key={label}
                                                sx={{
                                                    p: 1.15,
                                                    borderRadius: '18px',
                                                    border: '1px solid rgba(27,94,32,0.08)',
                                                    bgcolor: 'rgba(255,255,255,0.52)',
                                                    boxShadow: '0 14px 26px rgba(35,64,52,0.05)',
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        width: 34,
                                                        height: 34,
                                                        mb: 0.9,
                                                        borderRadius: '12px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        bgcolor: tint,
                                                        color: GOLD,
                                                    }}
                                                >
                                                    {icon}
                                                </Box>
                                                <Typography
                                                    sx={{
                                                        fontSize: '0.66rem',
                                                        fontWeight: 800,
                                                        color: '#234034',
                                                        fontFamily: '"Times New Roman", Times, serif',
                                                        mb: 0.2,
                                                    }}
                                                >
                                                    {label}
                                                </Typography>
                                                <Typography sx={{ fontSize: '0.7rem', color: 'rgba(35,64,52,0.64)', lineHeight: 1.45 }}>
                                                    {detail}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            </motion.div>

                            <AnimatePresence mode="wait">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: 1.5,
                                                p: 2,
                                                mb: 3,
                                                borderRadius: '16px',
                                                bgcolor: 'rgba(27,94,32,0.06)',
                                                border: '1px solid rgba(27,94,32,0.18)',
                                            }}
                                        >
                                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: RED_LIVE, flexShrink: 0, mt: '0.42rem' }} />
                                            <Box sx={{ flex: 1 }}>
                                                <Typography
                                                    sx={{
                                                        fontSize: '0.72rem',
                                                        color: '#1b5e20',
                                                        fontFamily: '"Times New Roman", Times, serif',
                                                        lineHeight: 1.7,
                                                    }}
                                                >
                                                    {error}
                                                </Typography>
                                                {showResendAction && (
                                                    <Box sx={{ mt: 1.5 }}>
                                                        <Box
                                                            component="button"
                                                            type="button"
                                                            onClick={handleResendConfirmation}
                                                            disabled={resendLoading || !email.trim()}
                                                            sx={{
                                                                px: 1.6,
                                                                py: 0.95,
                                                                borderRadius: '12px',
                                                                border: '1px solid rgba(27,94,32,0.18)',
                                                                bgcolor: 'rgba(255,255,255,0.72)',
                                                                color: GOLD,
                                                                cursor: resendLoading || !email.trim() ? 'not-allowed' : 'pointer',
                                                                fontFamily: '"Times New Roman", Times, serif',
                                                                fontSize: '0.63rem',
                                                                fontWeight: 700,
                                                                letterSpacing: '0.08em',
                                                                opacity: resendLoading || !email.trim() ? 0.6 : 1,
                                                                transition: 'all 0.2s ease',
                                                                '&:hover:not(:disabled)': {
                                                                    transform: 'translateY(-1px)',
                                                                    boxShadow: '0 12px 24px rgba(27,94,32,0.12)',
                                                                },
                                                            }}
                                                        >
                                                            {resendLoading ? 'SENDING CONFIRMATION...' : 'RESEND CONFIRMATION EMAIL'}
                                                        </Box>
                                                    </Box>
                                                )}
                                            </Box>
                                        </Box>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <AnimatePresence mode="wait">
                                {infoMessage && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: 1.5,
                                                p: 2,
                                                mb: 3,
                                                borderRadius: '16px',
                                                bgcolor: 'rgba(27,94,32,0.05)',
                                                border: '1px solid rgba(27,94,32,0.14)',
                                            }}
                                        >
                                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: GOLD, flexShrink: 0, mt: '0.42rem' }} />
                                            <Typography
                                                sx={{
                                                    fontSize: '0.72rem',
                                                    color: 'rgba(35,64,52,0.78)',
                                                    fontFamily: '"Times New Roman", Times, serif',
                                                    lineHeight: 1.7,
                                                }}
                                            >
                                                {infoMessage}
                                            </Typography>
                                        </Box>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <form onSubmit={handleSubmit}>
                                <FieldInput
                                    label="Email Address"
                                    value={email}
                                    onChange={setEmail}
                                    type="email"
                                    placeholder="operator@domain.com"
                                    delay={0.15}
                                />
                                <FieldInput
                                    label="Password"
                                    value={password}
                                    onChange={setPassword}
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter secure passphrase"
                                    delay={0.25}
                                    endAdornment={(
                                        <IconButton
                                            size="small"
                                            onClick={() => setShowPassword((prev) => !prev)}
                                            sx={{ color: TEXT_DIM, '&:hover': { color: GOLD }, transition: 'color 0.2s' }}
                                        >
                                            {showPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                                        </IconButton>
                                    )}
                                />

                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
                                    <Box sx={{ textAlign: 'right', mb: 4, mt: -0.5 }}>
                                        <Link
                                            component={RouterLink}
                                            to="/forgot-password"
                                            sx={{
                                                fontSize: '0.65rem',
                                                color: TEXT_DIM,
                                                fontFamily: '"Times New Roman", Times, serif',
                                                letterSpacing: '0.06em',
                                                textDecoration: 'none',
                                                '&:hover': { color: GOLD },
                                                transition: 'color 0.2s',
                                            }}
                                        >
                                            FORGOT CREDENTIALS?
                                        </Link>
                                    </Box>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4, duration: 0.5 }}
                                >
                                    <Box
                                        component="button"
                                        type="submit"
                                        disabled={loading}
                                        sx={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 1.5,
                                            py: 2.15,
                                            px: 3,
                                            borderRadius: '18px',
                                            border: 'none',
                                            cursor: loading ? 'not-allowed' : 'pointer',
                                            background: 'linear-gradient(135deg, #1b5e20 0%, #4aaf67 100%)',
                                            color: '#f9fff9',
                                            fontFamily: '"Times New Roman", Times, serif',
                                            fontSize: '0.78rem',
                                            fontWeight: 700,
                                            letterSpacing: '0.12em',
                                            boxShadow: '0 20px 38px rgba(27,94,32,0.24)',
                                            opacity: loading ? 0.7 : 1,
                                            transition: 'all 0.2s ease',
                                            '&:hover:not(:disabled)': {
                                                transform: 'translateY(-2px)',
                                                boxShadow: '0 24px 42px rgba(27,94,32,0.28)',
                                            },
                                            '&:active:not(:disabled)': {
                                                transform: 'translateY(0)',
                                            },
                                        }}
                                    >
                                        {loading ? (
                                            <>
                                                <Box
                                                    sx={{
                                                        width: 14,
                                                        height: 14,
                                                        borderRadius: '50%',
                                                        border: '2px solid rgba(249,255,249,0.35)',
                                                        borderTopColor: '#f9fff9',
                                                        animation: 'spin 0.7s linear infinite',
                                                        '@keyframes spin': {
                                                            '0%': { transform: 'rotate(0deg)' },
                                                            '100%': { transform: 'rotate(360deg)' },
                                                        },
                                                    }}
                                                />
                                                AUTHENTICATING...
                                            </>
                                        ) : (
                                            <>
                                                AUTHENTICATE &amp; ENTER
                                                <ArrowForward sx={{ fontSize: 16 }} />
                                            </>
                                        )}
                                    </Box>
                                </motion.div>
                            </form>

                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
                                <Box sx={{ mt: 4, pt: 4, borderTop: '1px solid rgba(27,94,32,0.08)', textAlign: 'center' }}>
                                    <Typography
                                        sx={{
                                            fontSize: '0.65rem',
                                            color: TEXT_DIM,
                                            fontFamily: '"Times New Roman", Times, serif',
                                            letterSpacing: '0.06em',
                                        }}
                                    >
                                        NO ACCOUNT?{' '}
                                        <Link
                                            component={RouterLink}
                                            to="/signup"
                                            sx={{
                                                color: GOLD,
                                                fontWeight: 700,
                                                textDecoration: 'none',
                                                letterSpacing: '0.08em',
                                                '&:hover': { textDecoration: 'underline' },
                                            }}
                                        >
                                            REQUEST ACCESS
                                        </Link>
                                    </Typography>
                                </Box>
                            </motion.div>

                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}>
                                <Box
                                    sx={{
                                        mt: 4.5,
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                                        gap: 1,
                                    }}
                                >
                                    {[
                                        { label: 'Records ready', value: 'Observation data and entry forms organized' },
                                        { label: 'Access secured', value: 'Role-based sign-in for your staff' },
                                        { label: 'Maps waiting', value: 'Field boundaries and coverage ready' },
                                    ].map(({ label, value }) => (
                                        <Box
                                            key={label}
                                            sx={{
                                                p: 1.35,
                                                borderRadius: '16px',
                                                border: '1px solid rgba(27,94,32,0.08)',
                                                bgcolor: 'rgba(255,255,255,0.48)',
                                            }}
                                        >
                                            <Typography
                                                sx={{
                                                    fontSize: '0.58rem',
                                                    color: GOLD,
                                                    fontFamily: '"Times New Roman", Times, serif',
                                                    letterSpacing: '0.1em',
                                                    textTransform: 'uppercase',
                                                    mb: 0.5,
                                                }}
                                            >
                                                {label}
                                            </Typography>
                                            <Typography sx={{ fontSize: '0.74rem', color: 'rgba(35,64,52,0.66)', lineHeight: 1.55 }}>
                                                {value}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                            </motion.div>
                        </Box>
                    </Paper>
                </Box>
            </Box>
        </Box>
    )
}
