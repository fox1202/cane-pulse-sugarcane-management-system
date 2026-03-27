import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
    Alert,
    Box,
    Button,
    IconButton,
    Paper,
    TextField,
    Typography,
} from '@mui/material'
import {
    AgricultureRounded,
    AutoAwesomeRounded,
    CheckCircleRounded,
    LockOutlined,
    ShieldRounded,
    SpaRounded,
    Visibility,
    VisibilityOff,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { AuthImageSlider } from '@/components/Auth/AuthImageSlider'
import { BrandLogo } from '@/components/Brand/BrandLogo'
import {
    BRAND_NAME_UPPER,
    BRAND_SYSTEM_TAGLINE,
} from '@/branding/brand'

const MotionBox = motion(Box)
const MotionPaper = motion(Paper)

function AuthMiniBadge({
    label,
    icon,
}: {
    label: string
    icon?: React.ReactNode
}) {
    return (
        <Box
            sx={{
                px: 1.2,
                py: 0.75,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                borderRadius: '999px',
                border: '1px solid rgba(47,127,79,0.14)',
                bgcolor: 'rgba(255,255,255,0.68)',
                backdropFilter: 'blur(14px)',
                boxShadow: '0 10px 22px rgba(31,52,43,0.05)',
            }}
        >
            {icon && <Box sx={{ display: 'flex', alignItems: 'center', color: 'primary.dark' }}>{icon}</Box>}
            <Typography
                sx={{
                    fontSize: '0.56rem',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'primary.dark',
                    fontFamily: '"Times New Roman", Times, serif',
                    whiteSpace: 'nowrap',
                }}
            >
                {label}
            </Typography>
        </Box>
    )
}

function FloatingGlyph({
    icon,
    top,
    left,
    right,
    bottom,
    size,
    tint,
    duration = 13,
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
                    opacity: 0.4,
                },
            }}
        >
            {icon}
        </Box>
    )
}

const fieldSx = {
    mb: 2.2,
    '& .MuiInputLabel-root': {
        color: 'rgba(31,52,43,0.55)',
        fontFamily: '"Times New Roman", Times, serif',
        fontSize: '0.68rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
    },
    '& .MuiOutlinedInput-root': {
        borderRadius: '18px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,248,243,0.84) 100%)',
        boxShadow: '0 14px 26px rgba(31,52,43,0.05)',
        '& fieldset': {
            borderColor: 'rgba(47,127,79,0.12)',
        },
        '&:hover fieldset': {
            borderColor: 'rgba(47,127,79,0.24)',
        },
        '&.Mui-focused fieldset': {
            borderColor: '#2f7f4f',
            boxShadow: '0 0 0 4px rgba(47,127,79,0.08)',
        },
    },
    '& .MuiInputBase-input': {
        fontFamily: '"Times New Roman", Times, serif',
        fontSize: '0.92rem',
        color: '#1f342b',
        py: 1.7,
    },
}

export function UpdatePasswordPage() {
    const { updatePassword } = useAuth()
    const navigate = useNavigate()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        setLoading(true)

        try {
            await updatePassword(password)
            setSuccess(true)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update password. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: { xs: 2.5, md: 4 },
                    background: `
                        radial-gradient(circle at 10% 10%, rgba(107,196,134,0.22) 0%, transparent 26%),
                        radial-gradient(circle at 90% 16%, rgba(234,143,115,0.16) 0%, transparent 24%),
                        linear-gradient(180deg, #fffdf9 0%, #f5faf4 52%, #fff8f1 100%)
                    `,
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <FloatingGlyph
                    icon={<ShieldRounded />}
                    top={24}
                    right={42}
                    size={190}
                    tint="rgba(107,196,134,0.28)"
                />
                <FloatingGlyph
                    icon={<AutoAwesomeRounded />}
                    bottom={24}
                    left={26}
                    size={150}
                    tint="rgba(103,185,201,0.22)"
                />

                <MotionPaper
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    elevation={0}
                    sx={{
                        width: '100%',
                        maxWidth: 640,
                        p: { xs: 3.2, md: 5 },
                        borderRadius: '32px',
                        textAlign: 'center',
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,248,243,0.9) 100%)',
                        border: '1px solid rgba(47,127,79,0.12)',
                        boxShadow: '0 30px 58px rgba(31,52,43,0.1)',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 'auto -90px -110px auto',
                            width: 240,
                            height: 240,
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(107,196,134,0.18) 0%, transparent 72%)',
                            pointerEvents: 'none',
                        }}
                    />

                    <Box sx={{ position: 'relative', zIndex: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap', mb: 2.2 }}>
                            <AuthMiniBadge label="Password updated" icon={<CheckCircleRounded sx={{ fontSize: 14 }} />} />
                            <AuthMiniBadge label="Secure account" icon={<ShieldRounded sx={{ fontSize: 14 }} />} />
                        </Box>

                        <Box
                            sx={{
                                width: 88,
                                height: 88,
                                mx: 'auto',
                                mb: 3,
                                borderRadius: '24px',
                                bgcolor: 'rgba(47,127,79,0.12)',
                                border: '1px solid rgba(47,127,79,0.14)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 18px 34px rgba(31,52,43,0.08)',
                            }}
                        >
                            <CheckCircleRounded sx={{ fontSize: 52, color: 'primary.dark' }} />
                        </Box>

                        <Typography sx={{ fontSize: 'clamp(2rem, 3.4vw, 2.9rem)', fontWeight: 800, letterSpacing: '-0.04em', fontFamily: '"Times New Roman", Times, serif', color: '#1f342b', mb: 1.1 }}>
                            Password
                            <Box component="span" sx={{ display: 'block', color: 'secondary.dark' }}>
                                updated
                            </Box>
                        </Typography>

                        <Typography sx={{ fontSize: '0.95rem', color: 'rgba(31,52,43,0.72)', lineHeight: 1.8, maxWidth: 500, mx: 'auto', mb: 4 }}>
                            Your account is ready again. Use the new password the next time you enter the Cane Pulse workspace.
                        </Typography>

                        <Button
                            variant="contained"
                            fullWidth
                            component={RouterLink}
                            to="/"
                            onClick={() => navigate('/')}
                            sx={{
                                py: 2,
                                borderRadius: '18px',
                                fontWeight: 800,
                                letterSpacing: '0.04em',
                                maxWidth: 320,
                                mx: 'auto',
                            }}
                        >
                            Go to Dashboard
                        </Button>
                    </Box>
                </MotionPaper>
            </Box>
        )
    }

    return (
        <Box
            sx={{
                minHeight: '100vh',
                width: '100vw',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: { xs: 2, md: 4 },
                background: `
                    radial-gradient(circle at 8% 8%, rgba(107,196,134,0.22) 0%, transparent 26%),
                    radial-gradient(circle at 92% 14%, rgba(234,143,115,0.16) 0%, transparent 24%),
                    radial-gradient(circle at 78% 84%, rgba(103,185,201,0.14) 0%, transparent 22%),
                    linear-gradient(180deg, #fffdf9 0%, #f5faf4 52%, #fff8f1 100%)
                `,
                overflow: 'hidden',
                position: 'relative',
            }}
        >
            <FloatingGlyph
                icon={<AgricultureRounded />}
                top={-30}
                right={20}
                size={220}
                tint="rgba(107,196,134,0.24)"
            />
            <FloatingGlyph
                icon={<AutoAwesomeRounded />}
                bottom={18}
                left={-14}
                size={160}
                tint="rgba(103,185,201,0.2)"
            />

            <MotionPaper
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                elevation={0}
                sx={{
                    width: '100%',
                    maxWidth: 1120,
                    minHeight: 640,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', lg: '1.02fr 0.98fr' },
                    borderRadius: '34px',
                    overflow: 'hidden',
                    border: '1px solid rgba(47,127,79,0.12)',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,248,243,0.88) 100%)',
                    boxShadow: '0 30px 60px rgba(31,52,43,0.1)',
                }}
            >
                <Box
                    sx={{
                        position: 'relative',
                        display: { xs: 'none', lg: 'flex' },
                        overflow: 'hidden',
                        borderRight: '1px solid rgba(47,127,79,0.1)',
                    }}
                >
                    <AuthImageSlider />

                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            background: `
                                radial-gradient(circle at 16% 14%, rgba(107,196,134,0.26) 0%, transparent 28%),
                                linear-gradient(180deg, rgba(248,255,250,0.22) 0%, rgba(255,248,241,0.78) 100%)
                            `,
                        }}
                    />

                    <Box
                        sx={{
                            position: 'relative',
                            zIndex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            p: 4,
                            width: '100%',
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4 }}>
                            <BrandLogo size={50} borderRadius={15} />
                            <Box>
                                <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: '#1f342b', letterSpacing: '0.12em', fontFamily: '"Times New Roman", Times, serif' }}>
                                    {BRAND_NAME_UPPER}
                                </Typography>
                                <Typography sx={{ fontSize: '0.56rem', color: 'rgba(31,52,43,0.58)', letterSpacing: '0.14em', fontFamily: '"Times New Roman", Times, serif' }}>
                                    {BRAND_SYSTEM_TAGLINE}
                                </Typography>
                            </Box>
                        </Box>

                        <Box
                            sx={{
                                maxWidth: 470,
                                p: 2.5,
                                borderRadius: '26px',
                                bgcolor: 'rgba(255,255,255,0.74)',
                                border: '1px solid rgba(255,255,255,0.58)',
                                backdropFilter: 'blur(16px)',
                                boxShadow: '0 20px 34px rgba(31,52,43,0.12)',
                            }}
                        >
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.4 }}>
                                <AuthMiniBadge label="Secure reset" icon={<ShieldRounded sx={{ fontSize: 14 }} />} />
                                <AuthMiniBadge label="Fresh credentials" icon={<SpaRounded sx={{ fontSize: 14 }} />} />
                            </Box>
                            <Typography sx={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.045em', color: '#1f342b', fontFamily: '"Times New Roman", Times, serif', mb: 1 }}>
                                Set a fresh
                                <Box component="span" sx={{ display: 'block', color: 'secondary.dark' }}>
                                    password
                                </Box>
                            </Typography>
                            <Typography sx={{ fontSize: '0.92rem', lineHeight: 1.75, color: 'rgba(31,52,43,0.72)', mb: 1.8 }}>
                                Protect the account, confirm the new secret once, and return to the dashboard with less friction.
                            </Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
                                {[
                                    { label: 'Secure entry', detail: 'New credentials are saved after validation succeeds' },
                                    { label: 'One flow', detail: 'Set and confirm in the same calm recovery screen' },
                                ].map(({ label, detail }) => (
                                    <Box
                                        key={label}
                                        sx={{
                                            p: 1.1,
                                            borderRadius: '18px',
                                            bgcolor: 'rgba(255,255,255,0.5)',
                                            border: '1px solid rgba(47,127,79,0.08)',
                                        }}
                                    >
                                        <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, color: 'primary.dark', fontFamily: '"Times New Roman", Times, serif', letterSpacing: '0.12em', textTransform: 'uppercase', mb: 0.4 }}>
                                            {label}
                                        </Typography>
                                        <Typography sx={{ fontSize: '0.74rem', color: 'rgba(31,52,43,0.66)', lineHeight: 1.55 }}>
                                            {detail}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    </Box>
                </Box>

                <Box
                    sx={{
                        p: { xs: 3, sm: 4.2, lg: 5 },
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    <Box sx={{ width: '100%', maxWidth: 470, mx: 'auto', position: 'relative' }}>
                        <Box
                            sx={{
                                position: 'absolute',
                                inset: 'auto 0 -70px auto',
                                width: 180,
                                height: 180,
                                borderRadius: '50%',
                                background: 'radial-gradient(circle, rgba(234,143,115,0.14) 0%, transparent 72%)',
                                pointerEvents: 'none',
                            }}
                        />

                        <MotionBox initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                                <AuthMiniBadge label="New password" icon={<LockOutlined sx={{ fontSize: 14 }} />} />
                                <AuthMiniBadge label="Decorative refresh" icon={<AutoAwesomeRounded sx={{ fontSize: 14 }} />} />
                            </Box>

                            <Typography sx={{ fontSize: 'clamp(2rem, 3vw, 3rem)', fontWeight: 800, letterSpacing: '-0.04em', fontFamily: '"Times New Roman", Times, serif', color: '#1f342b', lineHeight: 0.98, mb: 1.1 }}>
                                Set your
                                <Box component="span" sx={{ display: 'block', color: 'primary.dark' }}>
                                    new password
                                </Box>
                            </Typography>
                            <Typography sx={{ fontSize: '0.92rem', color: 'rgba(31,52,43,0.72)', lineHeight: 1.8, maxWidth: 420, mb: 3 }}>
                                Choose a password with at least 6 characters, then confirm it once so the account can be reopened safely.
                            </Typography>
                        </MotionBox>

                        <AnimatePresence>
                            {error && (
                                <MotionBox initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} sx={{ mb: 2.5 }}>
                                    <Alert severity="error" sx={{ borderRadius: '18px' }}>
                                        {error}
                                    </Alert>
                                </MotionBox>
                            )}
                        </AnimatePresence>

                        <form onSubmit={handleSubmit}>
                            <MotionBox initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                                <TextField
                                    label="New password"
                                    type={showPassword ? 'text' : 'password'}
                                    fullWidth
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    variant="outlined"
                                    sx={fieldSx}
                                    InputProps={{
                                        startAdornment: <LockOutlined sx={{ mr: 1.1, color: 'primary.dark' }} />,
                                        endAdornment: (
                                            <IconButton onClick={() => setShowPassword((prev) => !prev)} sx={{ color: 'text.secondary' }}>
                                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        ),
                                    }}
                                />
                            </MotionBox>

                            <MotionBox initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
                                <TextField
                                    label="Confirm password"
                                    type={showPassword ? 'text' : 'password'}
                                    fullWidth
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    variant="outlined"
                                    sx={fieldSx}
                                    InputProps={{
                                        startAdornment: <LockOutlined sx={{ mr: 1.1, color: 'primary.dark' }} />,
                                    }}
                                />
                            </MotionBox>

                            <MotionBox initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    disabled={loading}
                                    sx={{
                                        py: 2.05,
                                        borderRadius: '18px',
                                        fontWeight: 800,
                                    }}
                                >
                                    {loading ? 'Updating password...' : 'Update password'}
                                </Button>
                            </MotionBox>
                        </form>
                    </Box>
                </Box>
            </MotionPaper>
        </Box>
    )
}
