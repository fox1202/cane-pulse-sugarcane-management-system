import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
    Box,
    Paper,
    TextField,
    Typography,
    Alert,
    MenuItem,
    IconButton,
    InputAdornment,
    Button,
} from '@mui/material'
import {
    Visibility,
    VisibilityOff,
    ArrowBack,
    PersonOutline,
    EmailOutlined,
    LockOutlined,
    BadgeOutlined,
    CheckCircle,
    SignalCellularAlt,
    ArrowForward,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { requestSignUp } from '@/services/staff.service'
import { AuthImageSlider } from '@/components/Auth/AuthImageSlider'
import { BrandLogo } from '@/components/Brand/BrandLogo'
import {
    BRAND_NAME_UPPER,
    BRAND_SYSTEM_TAGLINE,
} from '@/branding/brand'

const GOLD = '#1b5e20'
const GOLD_DIM = 'rgba(27,94,32,0.55)'
const PANEL = 'rgba(255,255,255,0.86)'
const PANEL_ALT = 'rgba(255,249,244,0.92)'
const TEXT_DIM = 'rgba(0,0,0,0.45)'

function AuthMiniBadge({ label }: { label: string }) {
    return (
        <Box
            sx={{
                px: 1.1,
                py: 0.7,
                borderRadius: '12px',
                border: '1px solid rgba(27,94,32,0.14)',
                bgcolor: 'rgba(255,255,255,0.68)',
                backdropFilter: 'blur(12px)',
            }}
        >
            <Typography
                sx={{
                    fontSize: '0.56rem',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: GOLD,
                    fontFamily: '"Space Mono", monospace',
                    whiteSpace: 'nowrap',
                }}
            >
                {label}
            </Typography>
        </Box>
    )
}

const authFieldSx = {
    mb: 2.2,
    '& .MuiInputLabel-root': {
        color: 'rgba(35,64,52,0.52)',
        fontFamily: '"Space Mono", monospace',
        fontSize: '0.72rem',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
    },
    '& .MuiOutlinedInput-root': {
        borderRadius: '16px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(255,249,244,0.82) 100%)',
        boxShadow: '0 10px 24px rgba(35,64,52,0.04)',
        '& fieldset': {
            borderColor: 'rgba(27,94,32,0.12)',
        },
        '&:hover fieldset': {
            borderColor: 'rgba(27,94,32,0.24)',
        },
        '&.Mui-focused fieldset': {
            borderColor: GOLD,
            boxShadow: '0 0 0 4px rgba(27,94,32,0.1)',
        },
    },
    '& .MuiInputBase-input': {
        fontFamily: '"Space Mono", monospace',
        fontSize: '0.9rem',
        color: '#234034',
        py: 1.7,
    },
    '& .MuiFormHelperText-root': {
        ml: 0.3,
        color: 'rgba(35,64,52,0.52)',
        fontSize: '0.7rem',
    },
}

export function SignUpPage() {
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [role, setRole] = useState<'admin' | 'supervisor'>('supervisor')
    const [showPassword, setShowPassword] = useState(false)

    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await requestSignUp({
                email,
                password,
                first_name: firstName,
                last_name: lastName,
                role,
            })
            setSuccess(true)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit request. Please try again.')
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
                        radial-gradient(circle at 10% 10%, rgba(166,226,184,0.22) 0%, transparent 26%),
                        radial-gradient(circle at 90% 18%, rgba(244,162,140,0.14) 0%, transparent 22%),
                        linear-gradient(180deg, #fbfdf8 0%, #f5faf4 52%, #fff8f1 100%)
                    `,
                }}
            >
                <Paper
                    elevation={0}
                    sx={{
                        width: '100%',
                        maxWidth: 620,
                        p: { xs: 3.2, md: 5 },
                        borderRadius: '28px',
                        textAlign: 'center',
                        background: `linear-gradient(180deg, ${PANEL} 0%, ${PANEL_ALT} 100%)`,
                        border: '1px solid rgba(27,94,32,0.1)',
                        boxShadow: '0 30px 58px rgba(35,64,52,0.1)',
                    }}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap', mb: 2.2 }}>
                        <AuthMiniBadge label="Check email" />
                        <AuthMiniBadge label="Review pending" />
                    </Box>

                    <Box
                        sx={{
                            width: 88,
                            height: 88,
                            mx: 'auto',
                            mb: 3,
                            borderRadius: '22px',
                            bgcolor: 'rgba(27,94,32,0.08)',
                            border: '1px solid rgba(27,94,32,0.14)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <CheckCircle sx={{ fontSize: 52, color: GOLD }} />
                    </Box>

                    <Typography
                        sx={{
                            fontSize: 'clamp(2rem, 3.4vw, 2.8rem)',
                            fontWeight: 800,
                            letterSpacing: '-0.04em',
                            fontFamily: '"Syne", sans-serif',
                            color: '#234034',
                            mb: 1.1,
                        }}
                    >
                        Registration
                        <Box component="span" sx={{ display: 'block', color: GOLD }}>
                            submitted
                        </Box>
                    </Typography>

                    <Typography sx={{ fontSize: '0.95rem', color: 'rgba(35,64,52,0.7)', lineHeight: 1.8, maxWidth: 480, mx: 'auto', mb: 4 }}>
                        Your access request for <strong>{email}</strong> has been received. Confirm the email from your inbox first, then wait for an administrator to approve the account before signing in.
                    </Typography>

                    <Button
                        variant="contained"
                        fullWidth
                        component={RouterLink}
                        to="/login"
                        sx={{
                            py: 2,
                            borderRadius: '16px',
                            fontWeight: 800,
                            letterSpacing: '0.08em',
                            boxShadow: '0 18px 36px rgba(27,94,32,0.22)',
                        }}
                    >
                        Return to Login
                    </Button>
                </Paper>
            </Box>
        )
    }

    return (
        <Box
            sx={{
                minHeight: '100vh',
                width: '100vw',
                display: 'flex',
                background: `
                    radial-gradient(circle at 8% 8%, rgba(166,226,184,0.22) 0%, transparent 26%),
                    radial-gradient(circle at 92% 16%, rgba(244,162,140,0.14) 0%, transparent 22%),
                    linear-gradient(180deg, #fbfdf8 0%, #f5faf4 52%, #fff8f1 100%)
                `,
                overflow: 'hidden',
            }}
        >
            <Box
                sx={{
                    display: { xs: 'none', lg: 'flex' },
                    flex: '0 0 50%',
                    position: 'relative',
                    borderRight: '1px solid rgba(27,94,32,0.08)',
                    overflow: 'hidden',
                }}
            >
                <Box sx={{ position: 'absolute', inset: 0 }}>
                    <AuthImageSlider />
                </Box>

                <Box sx={{ position: 'relative', zIndex: 3, display: 'flex', flexDirection: 'column', height: '100%', p: 5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <BrandLogo size={40} borderRadius={10} />
                            <Box>
                                <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: 'text.primary', letterSpacing: '0.12em', fontFamily: '"Space Mono", monospace', lineHeight: 1.2 }}>
                                    {BRAND_NAME_UPPER}
                                </Typography>
                                <Typography sx={{ fontSize: '0.52rem', color: TEXT_DIM, letterSpacing: '0.16em', fontFamily: '"Space Mono", monospace' }}>
                                    {BRAND_SYSTEM_TAGLINE}
                                </Typography>
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.7, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.62)', border: `1px solid rgba(27,94,32,0.16)`, backdropFilter: 'blur(12px)' }}>
                            <SignalCellularAlt sx={{ fontSize: 12, color: GOLD }} />
                            <Typography sx={{ fontSize: '0.55rem', color: GOLD, fontFamily: '"Space Mono", monospace', letterSpacing: '0.1em' }}>
                                ACCESS REQUESTS OPEN
                            </Typography>
                        </Box>
                    </Box>

                </Box>
            </Box>

            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    p: { xs: 2.5, sm: 4, lg: 5 },
                    position: 'relative',
                }}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        background: `
                            radial-gradient(ellipse 72% 58% at 50% 50%, rgba(27,94,32,0.04) 0%, transparent 65%),
                            radial-gradient(ellipse 36% 30% at 88% 12%, rgba(244,162,140,0.08) 0%, transparent 60%)
                        `,
                    }}
                />

                <Box sx={{ width: '100%', maxWidth: 560, position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: { xs: 'flex', lg: 'none' }, alignItems: 'center', gap: 1.5, mb: 3.2 }}>
                        <BrandLogo size={36} borderRadius={9} />
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'text.primary', letterSpacing: '0.12em', fontFamily: '"Space Mono", monospace' }}>
                            {BRAND_NAME_UPPER}
                        </Typography>
                    </Box>

                    <Box sx={{ display: { xs: 'block', lg: 'none' }, mb: 2.6 }}>
                        <Box sx={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(27,94,32,0.12)', boxShadow: '0 22px 44px rgba(35,64,52,0.08)' }}>
                            <AuthImageSlider />
                        </Box>
                    </Box>

                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 3, sm: 4.2 },
                            borderRadius: '28px',
                            background: `linear-gradient(180deg, ${PANEL} 0%, ${PANEL_ALT} 100%)`,
                            border: '1px solid rgba(27,94,32,0.1)',
                            boxShadow: '0 28px 58px rgba(35,64,52,0.1)',
                            backdropFilter: 'blur(16px)',
                        }}
                    >
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.4 }}>
                            <AuthMiniBadge label="Supervisor access" />
                            <AuthMiniBadge label="Admin approval" />
                            <AuthMiniBadge label="Sugarcane workflow" />
                        </Box>

                        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                            <Button
                                startIcon={<ArrowBack />}
                                component={RouterLink}
                                to="/login"
                                sx={{
                                    mb: 2.2,
                                    px: 0,
                                    minWidth: 0,
                                    color: GOLD,
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                    '&:hover': {
                                        bgcolor: 'transparent',
                                        color: '#2f7f4f',
                                    },
                                }}
                            >
                                Back to Login
                            </Button>

                            <Box sx={{ mb: 3.8 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                    <Box sx={{ width: 30, height: 2, bgcolor: GOLD, borderRadius: 1 }} />
                                    <Typography sx={{ fontSize: '0.58rem', color: GOLD_DIM, fontFamily: '"Space Mono", monospace', letterSpacing: '0.18em' }}>
                                        REGISTRATION REQUEST
                                    </Typography>
                                </Box>
                                <Typography
                                    sx={{
                                        fontSize: 'clamp(2rem, 3.3vw, 2.9rem)',
                                        fontWeight: 800,
                                        color: 'text.primary',
                                        letterSpacing: '-0.035em',
                                        fontFamily: '"Syne", sans-serif',
                                        lineHeight: 1.02,
                                        mb: 1.2,
                                    }}
                                >
                                    Request access to
                                    <Box component="span" sx={{ color: GOLD, display: 'block' }}>
                                        Cane Pulse
                                    </Box>
                                </Typography>
                                <Typography sx={{ fontSize: '0.86rem', color: 'rgba(35,64,52,0.68)', lineHeight: 1.8, maxWidth: 400 }}>
                                    Apply for supervisor or administrator access to Cane Pulse, the sugarcane management system, and we will route your request for approval.
                                </Typography>
                            </Box>
                        </motion.div>

                        <AnimatePresence>
                            {error && (
                                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                    <Alert severity="error" sx={{ mb: 2.4, borderRadius: '14px', bgcolor: 'rgba(27,94,32,0.06)', color: GOLD }}>
                                        {error}
                                    </Alert>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={handleSubmit}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.6 }}>
                                <TextField
                                    label="First Name"
                                    fullWidth
                                    required
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    variant="outlined"
                                    sx={authFieldSx}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <PersonOutline sx={{ color: GOLD, fontSize: 18 }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                                <TextField
                                    label="Last Name"
                                    fullWidth
                                    required
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    variant="outlined"
                                    sx={authFieldSx}
                                />
                            </Box>

                            <TextField
                                label="Company Email"
                                type="email"
                                fullWidth
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                variant="outlined"
                                sx={authFieldSx}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <EmailOutlined sx={{ color: GOLD, fontSize: 18 }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <TextField
                                label="Requested Role"
                                select
                                fullWidth
                                required
                                value={role}
                                onChange={(e) => setRole(e.target.value as 'admin' | 'supervisor')}
                                variant="outlined"
                                helperText="Supervisor and administrator roles are manually reviewed before activation."
                                sx={authFieldSx}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <BadgeOutlined sx={{ color: GOLD, fontSize: 18 }} />
                                        </InputAdornment>
                                    ),
                                }}
                            >
                                <MenuItem value="supervisor">Regional Supervisor</MenuItem>
                                <MenuItem value="admin">System Administrator</MenuItem>
                            </TextField>

                            <TextField
                                label="Secure Password"
                                type={showPassword ? 'text' : 'password'}
                                fullWidth
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                variant="outlined"
                                sx={authFieldSx}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LockOutlined sx={{ color: GOLD, fontSize: 18 }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: TEXT_DIM }}>
                                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }}>
                                <Box
                                    component="button"
                                    type="submit"
                                    disabled={loading}
                                    sx={{
                                        width: '100%',
                                        mt: 1.6,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 1.4,
                                        py: 2.1,
                                        px: 3,
                                        borderRadius: '16px',
                                        border: 'none',
                                        bgcolor: GOLD,
                                        color: '#f9fff9',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        fontFamily: '"Space Mono", monospace',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        letterSpacing: '0.12em',
                                        boxShadow: '0 18px 36px rgba(27,94,32,0.24)',
                                        opacity: loading ? 0.72 : 1,
                                        transition: 'all 0.2s ease',
                                        '&:hover:not(:disabled)': {
                                            transform: 'translateY(-2px)',
                                            boxShadow: '0 24px 42px rgba(27,94,32,0.28)',
                                        },
                                    }}
                                >
                                    {loading ? 'SUBMITTING REQUEST...' : 'SEND ACCESS REQUEST'}
                                    {!loading && <ArrowForward sx={{ fontSize: 16 }} />}
                                </Box>
                            </motion.div>
                        </form>

                        <Box sx={{ mt: 4, pt: 4, borderTop: '1px solid rgba(27,94,32,0.08)', textAlign: 'center' }}>
                            <Typography sx={{ fontSize: '0.65rem', color: TEXT_DIM, fontFamily: '"Space Mono", monospace', letterSpacing: '0.06em' }}>
                                ALREADY APPROVED?{' '}
                                <Box
                                    component={RouterLink}
                                    to="/login"
                                    sx={{
                                        color: GOLD,
                                        fontWeight: 700,
                                        textDecoration: 'none',
                                        letterSpacing: '0.08em',
                                        '&:hover': { textDecoration: 'underline' },
                                    }}
                                >
                                    RETURN TO LOGIN
                                </Box>
                            </Typography>
                        </Box>
                    </Paper>
                </Box>
            </Box>
        </Box>
    )
}
