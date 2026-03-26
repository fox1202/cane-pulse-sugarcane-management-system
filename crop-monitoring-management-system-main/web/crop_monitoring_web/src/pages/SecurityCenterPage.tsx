import { useState, useEffect } from 'react'
import {
    Container,
    Typography,
    Box,
    CircularProgress,
    Dialog,
    DialogContent,
    Snackbar,
    Tooltip,
    IconButton,
} from '@mui/material'
import {
    CheckCircle,
    Refresh,
    Group,
    AdminPanelSettings,
    VerifiedUser,
    Lock,
    Close,
    ShieldOutlined,
    WarningAmberOutlined,
} from '@mui/icons-material'
import { fetchPendingUsers, updateUserStatus, fetchStaff } from '@/services/staff.service'
import type { Profile } from '@/types/database.types'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const DEEP        = '#ffffff'
const PANEL       = '#ffffff'
const PANEL_ALT   = '#f5f5f5'
const VIOLET      = '#1b5e20'
const VIOLET_DIM  = 'rgba(27,94,32,0.5)'
const VIOLET_PALE = 'rgba(27,94,32,0.07)'
const VIOLET_BDR  = 'rgba(27,94,32,0.2)'
const GREEN_OK    = '#1b5e20'
const GREEN_PALE  = 'rgba(27,94,32,0.07)'
const GREEN_BDR   = 'rgba(27,94,32,0.2)'
const RED_ERR     = '#1b5e20'
const RED_PALE    = 'rgba(27,94,32,0.07)'
const RED_BDR     = 'rgba(27,94,32,0.2)'
const AMBER       = '#43a047'
const AMBER_PALE  = 'rgba(67,160,71,0.07)'
const AMBER_BDR   = 'rgba(67,160,71,0.2)'
const TEXT_DIM    = 'rgba(0,0,0,0.4)'
const TEXT_MID    = 'rgba(0,0,0,0.6)'
const TEXT_ON     = 'rgba(255,255,255,0.88)'

const getErrorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : String(error)

// ─── Shared atoms ──────────────────────────────────────────────────────────────
function GlassPanel({ children, sx = {}, accent = VIOLET }: { children: React.ReactNode; sx?: object; accent?: string }) {
    return (
        <Box sx={{
            bgcolor: PANEL,
            border: `1px solid rgba(255,255,255,0.07)`,
            borderRadius: '18px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 48px rgba(0,0,0,0.5)',
            '&::before': {
                content: '""',
                position: 'absolute', top: 0, left: 0, right: 0, height: '1.5px',
                background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            },
            ...sx,
        }}>
            <Box sx={{ position: 'relative', zIndex: 1 }}>{children}</Box>
        </Box>
    )
}

function PulseDot({ color = GREEN_OK, size = 7 }: { color?: string; size?: number }) {
    return (
        <Box sx={{ position: 'relative', width: size + 8, height: size + 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Box sx={{
                position: 'absolute', width: size + 6, height: size + 6, borderRadius: '50%',
                bgcolor: `${color}33`,
                animation: 'ping 2s cubic-bezier(0,0,.2,1) infinite',
                '@keyframes ping': { '75%,100%': { transform: 'scale(2.2)', opacity: 0 } },
            }} />
            <Box sx={{ width: size, height: size, borderRadius: '50%', bgcolor: color, boxShadow: `0 0 8px ${color}`, zIndex: 1 }} />
        </Box>
    )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 0 }}>
            <Box sx={{ width: 20, height: 1.5, bgcolor: VIOLET, borderRadius: 1, opacity: 0.6 }} />
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.1em', color: VIOLET_DIM, fontFamily: '"Space Mono", monospace', textTransform: 'uppercase' }}>
                {children}
            </Typography>
        </Box>
    )
}

// ─── Role badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
    const config: Record<string, { color: string; bg: string; border: string }> = {
        admin:      { color: VIOLET,   bg: VIOLET_PALE, border: VIOLET_BDR },
        supervisor: { color: AMBER,    bg: AMBER_PALE,  border: AMBER_BDR },
        collector:  { color: GREEN_OK, bg: GREEN_PALE,  border: GREEN_BDR },
    }
    const c = config[role.toLowerCase()] || { color: TEXT_MID, bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.12)' }
    return (
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.7, px: 1.2, py: 0.4, borderRadius: '6px', bgcolor: c.bg, border: `1px solid ${c.border}` }}>
            <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: c.color, flexShrink: 0 }} />
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: c.color, fontFamily: '"Space Mono", monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {role}
            </Typography>
        </Box>
    )
}

// ─── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { color: string; bg: string; border: string }> = {
        approved: { color: GREEN_OK, bg: GREEN_PALE, border: GREEN_BDR },
        pending:  { color: AMBER,   bg: AMBER_PALE,  border: AMBER_BDR },
        rejected: { color: RED_ERR, bg: RED_PALE,    border: RED_BDR },
    }
    const c = config[status] || config.pending
    return (
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.7, px: 1.2, py: 0.4, borderRadius: '6px', bgcolor: c.bg, border: `1px solid ${c.border}` }}>
            <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: c.color, boxShadow: `0 0 5px ${c.color}`, flexShrink: 0 }} />
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: c.color, fontFamily: '"Space Mono", monospace', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {status}
            </Typography>
        </Box>
    )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function UserAvatar({ user, size = 36 }: { user: Profile; size?: number }) {
    const initials = `${user.first_name?.[0] || user.email?.[0] || 'U'}${user.last_name?.[0] || ''}`.toUpperCase()
    const colors = [VIOLET, GREEN_OK, AMBER, '#43a047', '#1b5e20']
    const idx = (user.email?.charCodeAt(0) || 0) % colors.length
    return (
        <Box sx={{
            width: size, height: size, borderRadius: '10px', flexShrink: 0,
            bgcolor: `${colors[idx]}18`, border: `1px solid ${colors[idx]}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: colors[idx], fontWeight: 700, fontSize: size * 0.33,
            fontFamily: '"Space Mono", monospace',
        }}>
            {initials}
        </Box>
    )
}

// ─── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ title, count, icon, color, loading }: { title: string; count: number; icon: React.ReactNode; color: string; loading: boolean }) {
    return (
        <GlassPanel accent={color} sx={{ flex: '1 1 220px', p: 3.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box sx={{ p: 1.2, borderRadius: '10px', bgcolor: `${color}12`, border: `1px solid ${color}22`, color, display: 'flex' }}>
                    {icon}
                </Box>
                <PulseDot color={color} size={6} />
            </Box>
            <Typography sx={{ fontSize: loading ? '2rem' : '2.8rem', fontWeight: 800, color: 'white', fontFamily: '"Space Mono", monospace', lineHeight: 1, mb: 0.5 }}>
                {loading ? '—' : count}
            </Typography>
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.08em', color: TEXT_DIM, fontFamily: '"Space Mono", monospace', textTransform: 'uppercase' }}>
                {title}
            </Typography>
        </GlassPanel>
    )
}

// ─── Table shell ──────────────────────────────────────────────────────────────
function DataTable({ headers, children, empty }: { headers: string[]; children: React.ReactNode; empty?: React.ReactNode }) {
    return (
        <GlassPanel sx={{ overflow: 'hidden' }}>
            {/* Header row */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: headers.map((_, i) => i === headers.length - 1 ? 'auto' : '1fr').join(' '),
                px: 3, py: 1.8,
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                bgcolor: 'rgba(0,0,0,0.25)',
            }}>
                {headers.map(h => (
                    <Typography key={h} sx={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.08em', color: TEXT_DIM, fontFamily: '"Space Mono", monospace', textTransform: 'uppercase' }}>
                        {h}
                    </Typography>
                ))}
            </Box>
            {children || empty}
        </GlassPanel>
    )
}

function TableRowWrap({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.4, ease: 'easeOut' }}
        >
            <Box sx={{
                px: 3, py: 2.2,
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                transition: 'background 0.15s',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.025)' },
                '&:last-child': { borderBottom: 'none' },
            }}>
                {children}
            </Box>
        </motion.div>
    )
}

// ─── Tab nav ──────────────────────────────────────────────────────────────────
function TabBar({ tabs, active, onChange }: { tabs: { label: string; icon: React.ReactNode; badge?: number }[]; active: number; onChange: (i: number) => void }) {
    return (
        <Box sx={{ display: 'flex', gap: 1, p: 0.6, bgcolor: PANEL, borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', width: 'fit-content' }}>
            {tabs.map((tab, i) => (
                <Box
                    key={i}
                    onClick={() => onChange(i)}
                    sx={{
                        display: 'flex', alignItems: 'center', gap: 1,
                        px: 2.5, py: 1.2, borderRadius: '10px', cursor: 'pointer',
                        bgcolor: active === i ? VIOLET_PALE : 'transparent',
                        border: `1px solid ${active === i ? VIOLET_BDR : 'transparent'}`,
                        transition: 'all 0.2s ease',
                        '&:hover': active !== i ? { bgcolor: 'rgba(255,255,255,0.04)' } : {},
                    }}
                >
                    <Box sx={{ color: active === i ? VIOLET : TEXT_DIM, display: 'flex', fontSize: 17, transition: 'color 0.2s' }}>
                        {tab.icon}
                    </Box>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.06em', color: active === i ? TEXT_ON : TEXT_DIM, fontFamily: '"Space Mono", monospace', whiteSpace: 'nowrap', transition: 'color 0.2s' }}>
                        {tab.label}
                    </Typography>
                    {tab.badge != null && tab.badge > 0 && (
                        <Box sx={{ px: 0.9, py: 0.1, borderRadius: '5px', bgcolor: RED_ERR, minWidth: 20, textAlign: 'center' }}>
                            <Typography sx={{ fontSize: '0.55rem', fontWeight: 800, color: 'white', fontFamily: '"Space Mono", monospace', lineHeight: 1.6 }}>
                                {tab.badge}
                            </Typography>
                        </Box>
                    )}
                </Box>
            ))}
        </Box>
    )
}

// ─── Action button ─────────────────────────────────────────────────────────────
function ActionBtn({ label, color, outline = false, onClick, disabled }: { label: string; color: string; outline?: boolean; onClick: () => void; disabled?: boolean }) {
    return (
        <Box
            component="button"
            onClick={onClick}
            disabled={disabled}
            sx={{
                px: 2, py: 0.8, borderRadius: '7px', border: `1px solid ${color}44`,
                bgcolor: outline ? 'transparent' : `${color}12`,
                color: disabled ? TEXT_DIM : color,
                fontFamily: '"Space Mono", monospace', fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.08em',
                cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
                transition: 'all 0.2s ease',
                '&:hover:not(:disabled)': { bgcolor: `${color}20`, borderColor: `${color}66` },
            }}
        >
            {label}
        </Box>
    )
}

// ─── Confirm dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ open, type, user, onClose, onConfirm }: {
    open: boolean; type: 'approve' | 'reject'; user: Profile | null;
    onClose: () => void; onConfirm: () => void
}) {
    const isApprove = type === 'approve'
    const accent = isApprove ? GREEN_OK : RED_ERR
    return (
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{ sx: { bgcolor: PANEL_ALT, borderRadius: '18px', border: `1px solid ${accent}30`, backgroundImage: 'none', minWidth: 400, overflow: 'hidden', boxShadow: `0 24px 80px rgba(0,0,0,0.7)` } }}
        >
            {/* Accent top bar */}
            <Box sx={{ height: 2, background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
            <DialogContent sx={{ p: 4 }}>
                {/* Icon + title */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
                    <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: `${accent}12`, border: `1px solid ${accent}25`, color: accent, display: 'flex' }}>
                        {isApprove ? <VerifiedUser sx={{ fontSize: 22 }} /> : <WarningAmberOutlined sx={{ fontSize: 22 }} />}
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: TEXT_ON, fontFamily: '"Syne", sans-serif' }}>
                            {isApprove ? 'Approve Access Request' : 'Reject Access Request'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.85rem', color: TEXT_DIM, fontFamily: '"Space Mono", monospace', mt: 0.2 }}>
                            This action will trigger an email notification
                        </Typography>
                    </Box>
                </Box>

                {/* User card */}
                {user && (
                    <Box sx={{ p: 2.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <UserAvatar user={user} size={40} />
                            <Box>
                                <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: TEXT_ON, fontFamily: '"Syne", sans-serif' }}>
                                    {user.first_name} {user.last_name}
                                </Typography>
                                <Typography sx={{ fontSize: '0.82rem', color: TEXT_DIM, fontFamily: '"Space Mono", monospace', mt: 0.2 }}>
                                    {user.email}
                                </Typography>
                            </Box>
                            <Box sx={{ ml: 'auto' }}>
                                <RoleBadge role={user.role} />
                            </Box>
                        </Box>
                    </Box>
                )}

                {/* Confirm text */}
                <Typography sx={{ fontSize: '0.9rem', color: TEXT_MID, fontFamily: '"Space Mono", monospace', lineHeight: 1.8, mb: 3 }}>
                    {isApprove
                        ? 'Granting access will allow this operator to sign in and contribute field data.'
                        : 'Rejecting this request will deny system access and notify the applicant.'}
                </Typography>

                {/* Actions */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                    <ActionBtn label="CANCEL" color={TEXT_MID} outline onClick={onClose} />
                    <Box
                        component="button"
                        onClick={onConfirm}
                        sx={{
                            px: 3, py: 1.2, borderRadius: '10px', border: 'none',
                            bgcolor: accent, color: DEEP, cursor: 'pointer',
                            fontFamily: '"Space Mono", monospace', fontSize: '0.88rem', fontWeight: 800, letterSpacing: '0.1em',
                            boxShadow: `0 0 28px ${accent}50`,
                            transition: 'all 0.2s ease',
                            '&:hover': { transform: 'translateY(-1px)', boxShadow: `0 0 40px ${accent}70` },
                        }}
                    >
                        CONFIRM {isApprove ? 'APPROVAL' : 'REJECTION'}
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    )
}

// ─── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
    return (
        <Box sx={{ py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Box sx={{ color: TEXT_DIM, opacity: 0.5, display: 'flex' }}>{icon}</Box>
            <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.92rem', fontWeight: 700, color: TEXT_MID, fontFamily: '"Syne", sans-serif', mb: 0.5 }}>{title}</Typography>
                <Typography sx={{ fontSize: '0.88rem', color: TEXT_DIM, fontFamily: '"Space Mono", monospace' }}>{body}</Typography>
            </Box>
        </Box>
    )
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export function SecurityCenterPage() {
    const [tabValue, setTabValue] = useState(0)
    const [stats, setStats]       = useState({ totalPending: 0, totalStaff: 0, totalAdmins: 0 })
    const [pendingUsers, setPendingUsers] = useState<Profile[]>([])
    const [allStaff, setAllStaff]         = useState<Profile[]>([])
    const [loading, setLoading]   = useState(true)
    const [error, setError]       = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [actionLoading, setActionLoading]   = useState<string | null>(null)
    const [confirmDialog, setConfirmDialog]   = useState<{ open: boolean; type: 'approve' | 'reject'; user: Profile | null }>({ open: false, type: 'approve', user: null })

    const loadData = async () => {
        setLoading(true); setError('')
        try {
            const [pending, staff] = await Promise.all([fetchPendingUsers(), fetchStaff()])
            const p = pending || [], s = staff || []
            setPendingUsers(p); setAllStaff(s)
            setStats({ totalPending: p.length, totalStaff: s.filter(u => u.status !== 'rejected').length, totalAdmins: s.filter(u => u.role === 'admin' && u.status !== 'rejected').length })
        } catch (err) {
            setError(getErrorMessage(err) || 'Failed to load security data')
        } finally { setLoading(false) }
    }

    useEffect(() => { loadData() }, [])

    const handleAction = async () => {
        const { user, type } = confirmDialog
        if (!user) return
        setActionLoading(user.id)
        setConfirmDialog(p => ({ ...p, open: false }))
        try {
            await updateUserStatus(user.id, user.email, user.role, type === 'approve' ? 'approved' : 'rejected')
            await loadData()
            setSuccessMessage(
                type === 'approve'
                    ? 'User approved. If their Supabase auth email is still unconfirmed, they must confirm it from email before login.'
                    : 'User successfully rejected'
            )
        } catch (err) {
            setError(`Failed to ${type} user: ${getErrorMessage(err)}`)
        } finally { setActionLoading(null) }
    }

    // demote an admin to collector (or change role generally)
    const handleChangeRole = async (email: string, currentRole: string) => {
        if (currentRole !== 'admin') return
        setLoading(true)
        try {
            await import('@/services/staff.service').then(s => s.updateUserRoleByEmail(email, 'collector'))
            setSuccessMessage(`Role updated for ${email}`)
            await loadData()
        } catch (err) {
            setError(`Failed to change role: ${getErrorMessage(err)}`)
        } finally {
            setLoading(false)
        }
    }

    const tabs = [
        { label: 'Overview',        icon: <AdminPanelSettings fontSize="small" /> },
        { label: 'Access Requests', icon: <Lock fontSize="small" />, badge: stats.totalPending },
        { label: 'User Directory',  icon: <Group fontSize="small" /> },
    ]

    return (
        <Box sx={{ bgcolor: DEEP, minHeight: '100vh', py: 5, position: 'relative', fontFamily: '"Space Mono", monospace' }}>
            {/* Ambient glow */}
            <Box sx={{
                position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
                background: `
                    radial-gradient(ellipse 60% 40% at 50% 0%, rgba(27,94,32,0.07) 0%, transparent 55%),
                    radial-gradient(ellipse 40% 30% at 90% 90%, rgba(67,160,71,0.04) 0%, transparent 50%)
                `,
            }} />

            <Container maxWidth="xl" sx={{ pb: 8, position: 'relative', zIndex: 1 }}>

                {/* ── Page header ──────────────────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16,1,0.3,1] }}>
                    <Box sx={{ mb: 5, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.2 }}>
                                <Box sx={{ width: 28, height: 1.5, bgcolor: VIOLET, borderRadius: 1 }} />
                                <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.1em', color: VIOLET_DIM, fontFamily: '"Space Mono", monospace', textTransform: 'uppercase' }}>
                                    Access Control System
                                </Typography>
                            </Box>
                            <Typography sx={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 800, letterSpacing: '-0.03em', fontFamily: '"Syne", sans-serif', color: 'white', lineHeight: 1.05, mb: 0.8 }}>
                                Security{' '}
                                <Box component="span" sx={{ color: VIOLET, textShadow: `0 0 40px ${VIOLET_DIM}` }}>Center</Box>
                            </Typography>
                            <Typography sx={{ fontSize: '0.9rem', color: TEXT_DIM, maxWidth: 480, lineHeight: 1.7 }}>
                                Centralized access control, user provisioning, and security monitoring for all system operators.
                            </Typography>
                        </Box>

                        {/* Refresh */}
                        <Tooltip title="Refresh Data" placement="left">
                            <Box
                                component="button"
                                onClick={loadData}
                                disabled={loading}
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 1, px: 2.5, py: 1.3,
                                    borderRadius: '10px', border: `1px solid ${VIOLET_BDR}`,
                                    bgcolor: VIOLET_PALE, color: VIOLET, cursor: loading ? 'not-allowed' : 'pointer',
                                    fontFamily: '"Space Mono", monospace', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.1em',
                                    transition: 'all 0.2s', opacity: loading ? 0.5 : 1,
                                    '&:hover:not(:disabled)': { bgcolor: 'rgba(27,94,32,0.12)' },
                                }}
                            >
                                <Refresh sx={{ fontSize: 15, animation: loading ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } } }} />
                                REFRESH
                            </Box>
                        </Tooltip>
                    </Box>
                </motion.div>

                {/* ── Error banner ─────────────────────────────────────────── */}
                <AnimatePresence>
                    {error && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, mb: 3, borderRadius: '12px', bgcolor: RED_PALE, border: `1px solid ${RED_BDR}` }}>
                                <WarningAmberOutlined sx={{ fontSize: 15, color: RED_ERR, flexShrink: 0 }} />
                                <Typography sx={{ fontSize: '0.88rem', color: RED_ERR, fontFamily: '"Space Mono", monospace', flex: 1 }}>{error}</Typography>
                                <IconButton size="small" onClick={() => setError('')} sx={{ color: RED_ERR, p: 0.3 }}><Close sx={{ fontSize: 14 }} /></IconButton>
                            </Box>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Tab bar + content ────────────────────────────────────── */}
                <Box sx={{ mb: 4 }}>
                    <TabBar tabs={tabs} active={tabValue} onChange={setTabValue} />
                </Box>

                <AnimatePresence mode="wait">
                    {/* TAB 0: Overview */}
                    {tabValue === 0 && (
                        <motion.div key="overview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4, ease: [0.16,1,0.3,1] }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
                                <StatCard title="Pending Requests" count={stats.totalPending} icon={<Lock sx={{ fontSize: 20 }} />} color={RED_ERR} loading={loading} />
                                <StatCard title="Active Staff"     count={stats.totalStaff}   icon={<Group sx={{ fontSize: 20 }} />} color={GREEN_OK} loading={loading} />
                                <StatCard title="Administrators"   count={stats.totalAdmins}  icon={<VerifiedUser sx={{ fontSize: 20 }} />} color={VIOLET} loading={loading} />
                            </Box>

                            {/* Security posture summary */}
                            <GlassPanel sx={{ p: 4 }} accent={VIOLET}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                                    <ShieldOutlined sx={{ fontSize: 18, color: VIOLET_DIM }} />
                                    <SectionLabel>Security Posture</SectionLabel>
                                </Box>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                    {[
                                        { label: 'Access Control',    status: 'ACTIVE',   color: GREEN_OK },
                                        { label: 'Email Verification',status: 'ENABLED',  color: GREEN_OK },
                                        { label: 'Role Enforcement',  status: 'STRICT',   color: VIOLET },
                                        { label: 'Pending Reviews',   status: stats.totalPending > 0 ? `${stats.totalPending} QUEUED` : 'CLEAR', color: stats.totalPending > 0 ? AMBER : GREEN_OK },
                                    ].map(({ label, status, color }) => (
                                        <Box key={label} sx={{ flex: '1 1 180px', p: 2.5, borderRadius: '12px', bgcolor: `${color}08`, border: `1px solid ${color}18` }}>
                                            <Typography sx={{ fontSize: '0.9rem', color: TEXT_DIM, fontFamily: '"Space Mono", monospace', letterSpacing: '0.12em', mb: 1 }}>
                                                {label}
                                            </Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: color, boxShadow: `0 0 6px ${color}` }} />
                                                <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color, fontFamily: '"Space Mono", monospace' }}>
                                                    {status}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            </GlassPanel>
                        </motion.div>
                    )}

                    {/* TAB 1: Access Requests */}
                    {tabValue === 1 && (
                        <motion.div key="requests" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }}>
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10, gap: 2 }}>
                                    <CircularProgress size={24} sx={{ color: VIOLET }} thickness={2.5} />
                                    <Typography sx={{ fontSize: '0.82rem', color: TEXT_DIM, fontFamily: '"Space Mono", monospace', letterSpacing: '0.1em' }}>LOADING REQUESTS…</Typography>
                                </Box>
                            ) : pendingUsers.length === 0 ? (
                                <GlassPanel>
                                    <EmptyState icon={<CheckCircle sx={{ fontSize: 48 }} />} title="Queue is Empty" body="No pending access requests at this time" />
                                </GlassPanel>
                            ) : (
                                <DataTable headers={['Operator', 'Requested Role', 'Submitted', 'Actions']}>
                                    {pendingUsers.map((user, i) => (
                                        <TableRowWrap key={user.id} delay={i * 0.05}>
                                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', alignItems: 'center', gap: 2 }}>
                                                {/* Identity */}
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <UserAvatar user={user} />
                                                    <Box>
                                                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: TEXT_ON, fontFamily: '"Syne", sans-serif' }}>
                                                            {user.first_name} {user.last_name}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '0.9rem', color: TEXT_DIM, fontFamily: '"Space Mono", monospace', mt: 0.2 }}>
                                                            {user.email}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                {/* Role */}
                                                <RoleBadge role={user.role} />
                                                {/* Date */}
                                                <Typography sx={{ fontSize: '0.82rem', color: TEXT_MID, fontFamily: '"Space Mono", monospace' }}>
                                                    {new Date(user.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </Typography>
                                                {/* Actions */}
                                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                                    {actionLoading === user.id ? (
                                                        <CircularProgress size={16} sx={{ color: VIOLET }} />
                                                    ) : (
                                                        <>
                                                            <ActionBtn label="APPROVE" color={GREEN_OK} onClick={() => setConfirmDialog({ open: true, type: 'approve', user })} disabled={!!actionLoading} />
                                                            <ActionBtn label="REJECT"  color={RED_ERR}  onClick={() => setConfirmDialog({ open: true, type: 'reject',  user })} disabled={!!actionLoading} />
                                                        </>
                                                    )}
                                                </Box>
                                            </Box>
                                        </TableRowWrap>
                                    ))}
                                </DataTable>
                            )}
                        </motion.div>
                    )}

                    {/* TAB 2: User Directory */}
                    {tabValue === 2 && (
                        <motion.div key="directory" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }}>
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10, gap: 2 }}>
                                    <CircularProgress size={24} sx={{ color: VIOLET }} thickness={2.5} />
                                    <Typography sx={{ fontSize: '0.82rem', color: TEXT_DIM, fontFamily: '"Space Mono", monospace', letterSpacing: '0.1em' }}>LOADING DIRECTORY…</Typography>
                                </Box>
                            ) : (
                                <DataTable headers={['Staff Member', 'Role', 'Status', 'Joined']}>
                                    {allStaff.filter(u => u.status !== 'rejected').map((user, i) => (
                                        <TableRowWrap key={user.id} delay={i * 0.04}>
                                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', alignItems: 'center', gap: 2 }}>
                                                {/* Identity */}
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <UserAvatar user={user} />
                                                    <Box>
                                                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: TEXT_ON, fontFamily: '"Syne", sans-serif' }}>
                                                            {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email?.split('@')[0]}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '0.9rem', color: TEXT_DIM, fontFamily: '"Space Mono", monospace', mt: 0.2 }}>
                                                            {user.email}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                {/* Role */}
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <RoleBadge role={user.role} />
                                                    {user.role === 'admin' && (
                                                        <ActionBtn
                                                            label="DEMOTE"
                                                            color={AMBER}
                                                            onClick={() => handleChangeRole(user.email, user.role)}
                                                            disabled={loading}
                                                            outline
                                                        />
                                                    )}
                                                </Box>
                                                {/* Status */}
                                                <StatusBadge status={user.status} />
                                                {/* Date */}
                                                <Typography sx={{ fontSize: '0.82rem', color: TEXT_MID, fontFamily: '"Space Mono", monospace' }}>
                                                    {new Date(user.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </Typography>
                                            </Box>
                                        </TableRowWrap>
                                    ))}
                                </DataTable>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </Container>

            {/* Confirm dialog */}
            <ConfirmDialog
                open={confirmDialog.open}
                type={confirmDialog.type}
                user={confirmDialog.user}
                onClose={() => setConfirmDialog(p => ({ ...p, open: false }))}
                onConfirm={handleAction}
            />

            {/* Toast */}
            <Snackbar open={!!successMessage} autoHideDuration={5000} onClose={() => setSuccessMessage('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.8, borderRadius: '12px', bgcolor: PANEL_ALT, border: `1px solid ${GREEN_BDR}`, boxShadow: `0 8px 40px rgba(0,0,0,0.6)`, backdropFilter: 'blur(16px)' }}>
                    <CheckCircle sx={{ fontSize: 16, color: GREEN_OK }} />
                    <Typography sx={{ fontSize: '0.88rem', color: GREEN_OK, fontFamily: '"Space Mono", monospace', fontWeight: 700 }}>
                        {successMessage}
                    </Typography>
                    <IconButton size="small" onClick={() => setSuccessMessage('')} sx={{ color: TEXT_DIM, p: 0.2, ml: 1 }}><Close sx={{ fontSize: 13 }} /></IconButton>
                </Box>
            </Snackbar>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Space+Mono:wght@400;700&display=swap');
            `}</style>
        </Box>
    )
}
