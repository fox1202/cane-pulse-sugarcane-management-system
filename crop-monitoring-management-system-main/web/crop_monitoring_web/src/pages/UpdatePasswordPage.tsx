import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
    Box,
    Paper,
    TextField,
    Button,
    Typography,
    Alert,
    IconButton,
} from '@mui/material'
import {
    LockOutlined,
    Visibility,
    VisibilityOff,
    CheckCircle,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { AuthImageSlider } from '@/components/Auth/AuthImageSlider'
import { BrandLogo } from '@/components/Brand/BrandLogo'
import { BRAND_NAME_UPPER } from '@/branding/brand'

const MotionBox = motion(Box)
const MotionPaper = motion(Paper)

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
            setError('Passwords do not match')
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

    const containerVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: { opacity: 1, scale: 1, transition: { duration: 0.8 } }
    }

    const staggerVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: { delay: 0.3 + (i * 0.1), duration: 0.4 }
        })
    }

    if (success) {
        return (
            <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: '#ffffff', alignItems: 'center', justifyContent: 'center', p: 4 }}>
                <MotionPaper
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    sx={{
                        p: 6,
                        borderRadius: 6,
                        textAlign: 'center',
                        maxWidth: 550,
                        bgcolor: '#ffffff',
                        backdropFilter: 'blur(40px)',
                        border: '1px solid rgba(27, 94, 32, 0.1)',
                        boxShadow: '0 8px 32px rgba(27, 94, 32, 0.15)',
                    }}
                >
                    <MotionBox
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 10, stiffness: 100 }}
                        sx={{ width: 100, height: 100, borderRadius: '50%', bgcolor: 'rgba(27, 94, 32, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' }}
                    >
                        <CheckCircle sx={{ fontSize: 60, color: 'primary.light' }} />
                    </MotionBox>
                    <Typography variant="h3" fontWeight={900} gutterBottom sx={{ color: 'text.primary' }}>
                        Password Updated
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'text.secondary', mb: 4, lineHeight: 1.5 }}>
                        Your password has been changed successfully.
                    </Typography>
                    <Button
                        variant="contained"
                        fullWidth
                        component={RouterLink}
                        to="/"
                        onClick={() => navigate('/')}
                        size="large"
                        sx={{ py: 2.2, borderRadius: 4, fontWeight: 800, background: 'linear-gradient(135deg, #1b5e20 0%, #43a047 100%)' }}
                    >
                        Go to Dashboard
                    </Button>
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
                p: { xs: 2, md: 4, lg: 6 },
                bgcolor: '#ffffff',
                backgroundImage: 'none',
                overflowX: 'hidden'
            }}
        >
            <MotionPaper
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                elevation={0}
                sx={{
                    width: '100%',
                    maxWidth: 1000,
                    minHeight: 600,
                    display: 'flex',
                    flexDirection: { xs: 'column-reverse', md: 'row' },
                    borderRadius: 6,
                    overflow: 'hidden',
                    bgcolor: '#ffffff',
                    border: '1px solid rgba(27, 94, 32, 0.1)',
                    boxShadow: '0 8px 32px rgba(27, 94, 32, 0.1)',
                }}
            >
                {/* Form Section */}
                <Box sx={{ flex: 1, p: { xs: 4, md: 6, lg: 8 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <MotionBox custom={0} variants={staggerVariants} initial="hidden" animate="visible" sx={{ mb: 4 }}>
                        <Typography variant="h3" fontWeight={900} gutterBottom sx={{ color: 'text.primary' }}>
                            Set New Password
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                            Your new password must be at least 6 characters long.
                        </Typography>
                    </MotionBox>

                    <AnimatePresence>
                        {error && (
                            <MotionBox initial={{ opacity: 0 }} animate={{ opacity: 1 }} sx={{ mb: 3 }}>
                                <Alert severity="error" sx={{ borderRadius: 3, bgcolor: 'rgba(27, 94, 32, 0.1)', color: '#1b5e20' }}>
                                    {error}
                                </Alert>
                            </MotionBox>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit}>
                        <MotionBox custom={1} variants={staggerVariants} initial="hidden" animate="visible">
                            <TextField
                                label="New Password"
                                type={showPassword ? 'text' : 'password'}
                                fullWidth
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                margin="normal"
                                variant="filled"
                                InputProps={{
                                    disableUnderline: true,
                                    startAdornment: <LockOutlined sx={{ mr: 1, color: 'primary.light' }} />,
                                    endAdornment: (
                                        <IconButton onClick={() => setShowPassword(!showPassword)} sx={{ color: 'rgba(0,0,0,0.6)' }}>
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    ),
                                    sx: { borderRadius: 3, bgcolor: 'rgba(0,0,0,0.03)', color: 'text.primary', p: 0.5 }
                                }}
                                InputLabelProps={{ sx: { color: 'rgba(0,0,0,0.4)', ml: 4 } }}
                            />
                        </MotionBox>

                        <MotionBox custom={2} variants={staggerVariants} initial="hidden" animate="visible">
                            <TextField
                                label="Confirm Password"
                                type={showPassword ? 'text' : 'password'}
                                fullWidth
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                margin="normal"
                                variant="filled"
                                InputProps={{
                                    disableUnderline: true,
                                    startAdornment: <LockOutlined sx={{ mr: 1, color: 'primary.light' }} />,
                                    sx: { borderRadius: 3, bgcolor: 'rgba(0,0,0,0.03)', color: 'text.primary', p: 0.5 }
                                }}
                                InputLabelProps={{ sx: { color: 'rgba(0,0,0,0.4)', ml: 4 } }}
                            />
                        </MotionBox>

                        <MotionBox custom={3} variants={staggerVariants} initial="hidden" animate="visible" sx={{ mt: 4 }}>
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                size="large"
                                disabled={loading}
                                sx={{
                                    py: 2.2,
                                    borderRadius: 4,
                                    fontWeight: 800,
                                    background: 'linear-gradient(135deg, #1b5e20 0%, #43a047 100%)',
                                    '&:hover': { transform: 'translateY(-2px)' }
                                }}
                            >
                                {loading ? 'Updating...' : 'Update Password'}
                            </Button>
                        </MotionBox>
                    </form>
                </Box>

                {/* Visual Banner Slider */}
                <Box
                    sx={{
                        flex: { xs: '0 0 200px', md: '0 0 40%' },
                        position: 'relative',
                        borderLeft: '1px solid rgba(27, 94, 32, 0.1)'
                    }}
                >
                    <AuthImageSlider />

                    {/* Brand Logo Overlay */}
                    <Box sx={{ position: 'absolute', top: 40, left: 40, zIndex: 3, display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ mr: 1.5 }}>
                            <BrandLogo size={40} borderRadius={8} />
                        </Box>
                        <Typography variant="h6" fontWeight={900} letterSpacing="1px" sx={{ color: 'text.primary', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            {BRAND_NAME_UPPER}
                        </Typography>
                    </Box>
                </Box>
            </MotionPaper>
        </Box>
    )
}
