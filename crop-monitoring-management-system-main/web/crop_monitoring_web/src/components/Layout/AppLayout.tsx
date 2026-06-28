import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  ButtonBase,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Drawer,
  IconButton,
  Popover,
  Toolbar,
  Typography,
} from '@mui/material'
import {
  AgricultureRounded,
  AutoAwesomeRounded,
  CalendarMonthRounded,
  DescriptionRounded,
  HomeRounded,
  InsightsRounded,
  LockResetRounded,
  LogoutRounded,
  MapRounded,
  Menu as MenuIcon,
  ShieldRounded,
  SpaRounded,
  TableChartRounded,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { Navigation } from './Navigation'
import { isOnline } from '@/services/offline.service'
import { BRAND_DESCRIPTION, BRAND_NAME } from '@/branding/brand'
import { getRoleLabel } from '@/utils/roleAccess'

const DRAWER_WIDTH = 308

const PAGE_META: Record<string, { eyebrow: string; title: string; note?: string; icon: React.ReactNode }> = {
  '/': {
    eyebrow: 'Overview',
    title: 'Field Pulse',
    icon: <HomeRounded fontSize="small" />,
  },
  '/data': {
    eyebrow: 'Records',
    title: 'Field Records',
    note: 'Review observation rows, intake details, and record quality with a cleaner table workspace.',
    icon: <TableChartRounded fontSize="small" />,
  },
  '/entry-forms': {
    eyebrow: 'Workflow',
    title: 'Entry Forms',
    note: 'Capture web submissions, trial details, and agronomy sections in the refreshed intake flow.',
    icon: <DescriptionRounded fontSize="small" />,
  },
  '/field-statistics': {
    eyebrow: 'Analytics',
    title: 'Field Statistics',
    icon: <InsightsRounded fontSize="small" />,
  },
  '/map': {
    eyebrow: 'Spatial',
    title: 'Map View',
    note: 'Inspect trial boundaries, live polygons, and field context on a clearer spatial canvas.',
    icon: <MapRounded fontSize="small" />,
  },
  '/calendar': {
    eyebrow: 'Timing',
    title: 'Farming Calendar',
    note: 'Follow season windows, month tasks, and calendar-linked actions from the imported workbook.',
    icon: <CalendarMonthRounded fontSize="small" />,
  },
  '/security': {
    eyebrow: 'Control',
    title: 'Security Center',
    note: 'Manage protected access, approvals, and system oversight from the admin surface.',
    icon: <ShieldRounded fontSize="small" />,
  },
  '/change-password': {
    eyebrow: 'Account',
    title: 'Change Password',
    note: 'Update your account password whenever you need to refresh your sign-in details.',
    icon: <LockResetRounded fontSize="small" />,
  },
}

function ShellGlyph({
  icon,
  top,
  left,
  right,
  bottom,
  size,
  tint,
  rotate = 0,
  duration = 14,
}: {
  icon: React.ReactNode
  top?: number | string
  left?: number | string
  right?: number | string
  bottom?: number | string
  size: number
  tint: string
  rotate?: number
  duration?: number
}) {
  return (
    <Box
      component={motion.div}
      animate={{ y: [0, -10, 0], x: [0, 6, 0], opacity: [0.18, 0.3, 0.18] }}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
      sx={{
        position: 'fixed',
        top,
        left,
        right,
        bottom,
        width: size,
        height: size,
        display: { xs: 'none', md: 'flex' },
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${tint} 0%, transparent 70%)`,
        color: tint,
        filter: 'blur(0px)',
        pointerEvents: 'none',
        zIndex: 0,
        transform: `rotate(${rotate}deg)`,
        '& svg': {
          fontSize: size * 0.34,
          opacity: 0.34,
        },
      }}
    >
      {icon}
    </Box>
  )
}

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [offline, setOffline] = useState(!isOnline())
  const [profileAnchor, setProfileAnchor] = useState<HTMLElement | null>(null)
  const { user, signOut } = useAuth()

  useEffect(() => {
    const handleOnline = () => setOffline(false)
    const handleOffline = () => setOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const pageMeta = useMemo(
    () => PAGE_META[location.pathname] ?? {
      eyebrow: 'Workspace',
      title: BRAND_NAME,
      note: BRAND_DESCRIPTION,
      icon: <AutoAwesomeRounded fontSize="small" />,
    },
    [location.pathname]
  )
  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev)
  }
  const rawDisplayName = user?.full_name?.trim() || user?.email?.split('@')[0] || 'System user'
  const displayName = rawDisplayName.replace(/\s+User$/i, '').trim() || rawDisplayName
  const roleLabel = getRoleLabel(user?.profile_role ?? user?.role)
  const profileImageUrl =
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    user?.user_metadata?.image_url ||
    user?.user_metadata?.photo_url
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U'

  const handleChangePassword = () => {
    setProfileAnchor(null)
    navigate('/change-password')
  }

  const handleLogout = async () => {
    try {
      setProfileAnchor(null)
      await signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Logout error:', error)
    }
  }
  const mustChangePassword = user?.must_change_password === true && location.pathname !== '/change-password'

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <ShellGlyph
        icon={<SpaRounded />}
        top={-80}
        right={-70}
        size={280}
        tint="rgba(107,196,134,0.26)"
        rotate={-12}
        duration={13}
      />
      <ShellGlyph
        icon={<AgricultureRounded />}
        bottom={-110}
        left={220}
        size={340}
        tint="rgba(234,143,115,0.18)"
        rotate={8}
        duration={16}
      />
      <ShellGlyph
        icon={<AutoAwesomeRounded />}
        top={150}
        left={-60}
        size={220}
        tint="rgba(103,185,201,0.22)"
        rotate={-18}
        duration={15}
      />

      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          zIndex: (theme) => theme.zIndex.drawer + 1,
          px: { xs: 1, md: 1.6 },
          pt: { xs: 1.2, md: 1.5 },
          bgcolor: 'transparent',
          boxShadow: 'none',
          borderBottom: 'none',
        }}
      >
        <Toolbar
          sx={{
            minHeight: { xs: '92px !important', md: '126px !important' },
            px: { xs: 2, md: 3 },
            py: { xs: 0, md: 1.4 },
            gap: 1.5,
            alignItems: 'center',
            borderRadius: '0 0 32px 32px',
            border: '1px solid rgba(47,127,79,0.14)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,248,243,0.88) 100%)',
            boxShadow: '0 18px 42px rgba(31,52,43,0.08)',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              background: `
                radial-gradient(circle at 92% 16%, rgba(234,143,115,0.12) 0%, transparent 18%),
                radial-gradient(circle at 10% 90%, rgba(107,196,134,0.12) 0%, transparent 18%)
              `,
              pointerEvents: 'none',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 'auto 30px 0 30px',
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(47,127,79,0.22), rgba(234,143,115,0.16), transparent)',
            },
          }}
        >
          <IconButton
            onClick={handleDrawerToggle}
            sx={{
              display: { md: 'none' },
              border: '1px solid rgba(47,127,79,0.22)',
              bgcolor: 'rgba(255,255,255,0.8)',
              color: 'primary.dark',
              '&:hover': { bgcolor: 'rgba(47,127,79,0.08)' },
            }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4, minWidth: 0, flex: 1, pt: { md: 1 } }}>
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(47,127,79,0.12)',
                color: 'primary.dark',
                boxShadow: 'inset 0 0 0 1px rgba(47,127,79,0.12)',
                flexShrink: 0,
              }}
            >
              {pageMeta.icon}
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontFamily: '"Times New Roman", Times, serif', fontWeight: 800, fontSize: { xs: 22, md: 28 }, color: 'text.primary', lineHeight: 1.02 }}>
                {pageMeta.title}
              </Typography>
              {pageMeta.note ? (
                <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.45, mt: 0.4, maxWidth: 620, display: { xs: 'none', md: 'block' } }}>
                  {pageMeta.note}
                </Typography>
              ) : null}
            </Box>
          </Box>

          <ButtonBase
            onClick={(event) => setProfileAnchor(event.currentTarget)}
            aria-label="Open profile details"
            sx={{
              display: { xs: 'none', md: 'block' },
              width: 290,
              flexShrink: 0,
              p: 1.45,
              textAlign: 'left',
              borderRadius: '18px',
              border: '1px solid rgba(47,127,79,0.12)',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,248,243,0.86) 100%)',
              boxShadow: '0 14px 30px rgba(31,52,43,0.06)',
              position: 'relative',
              zIndex: 1,
              '&:focus-visible': {
                outline: '2px solid rgba(47,127,79,0.28)',
                outlineOffset: 2,
              },
            }}
          >
            <Typography
              sx={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'text.secondary',
                fontFamily: '"Times New Roman", Times, serif',
                mb: 1.1,
              }}
            >
              Profile
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <Avatar src={profileImageUrl} sx={{ width: 42, height: 42, borderRadius: '12px' }}>{initials}</Avatar>

              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: 14.5,
                    color: 'text.primary',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {displayName}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 11.5,
                    color: 'text.secondary',
                    lineHeight: 1.35,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user?.email || 'No email available'}
                </Typography>
              </Box>
            </Box>
          </ButtonBase>

          <Popover
            anchorEl={profileAnchor}
            open={Boolean(profileAnchor)}
            onClose={() => setProfileAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              sx: {
                width: 290,
                mt: 1,
                p: 1.45,
                borderRadius: '18px',
                border: '1px solid rgba(47,127,79,0.12)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,248,243,0.94) 100%)',
                boxShadow: '0 20px 44px rgba(31,52,43,0.14)',
              },
            }}
          >
            <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                <Chip
                  size="small"
                  label={roleLabel}
                  sx={{
                    height: 24,
                    borderRadius: '10px',
                    fontSize: 10,
                    fontWeight: 800,
                    bgcolor: 'rgba(47,127,79,0.12)',
                    color: 'primary.dark',
                  }}
                />
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.8, mt: 1.25 }}>
                <ButtonBase
                  onClick={handleChangePassword}
                  aria-label="Change password"
                  sx={{
                    minHeight: 34,
                    borderRadius: '12px',
                    border: '1px solid rgba(47,127,79,0.14)',
                    bgcolor: 'rgba(47,127,79,0.08)',
                    color: 'primary.dark',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.55,
                    px: 0.8,
                    fontSize: 11,
                    fontWeight: 800,
                    fontFamily: '"Times New Roman", Times, serif',
                    '& svg': { fontSize: 16 },
                    '&:hover': { bgcolor: 'rgba(47,127,79,0.14)' },
                  }}
                >
                  <LockResetRounded />
                  Password
                </ButtonBase>
                <ButtonBase
                  onClick={() => void handleLogout()}
                  aria-label="Logout"
                  sx={{
                    minHeight: 34,
                    borderRadius: '12px',
                    border: '1px solid rgba(234,143,115,0.22)',
                    bgcolor: 'rgba(234,143,115,0.1)',
                    color: 'secondary.dark',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.55,
                    px: 0.8,
                    fontSize: 11,
                    fontWeight: 800,
                    fontFamily: '"Times New Roman", Times, serif',
                    '& svg': { fontSize: 16 },
                    '&:hover': { bgcolor: 'rgba(234,143,115,0.16)' },
                  }}
                >
                  <LogoutRounded />
                  Logout
                </ButtonBase>
              </Box>
          </Popover>
        </Toolbar>
      </AppBar>

      <Dialog
        open={mustChangePassword}
        maxWidth="xs"
        fullWidth
        disableEscapeKeyDown
        aria-labelledby="default-password-title"
      >
        <DialogContent
          sx={{
            p: 3,
            borderRadius: '18px',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,248,243,0.96) 100%)',
          }}
        >
          <Typography
            id="default-password-title"
            sx={{
              fontFamily: '"Times New Roman", Times, serif',
              fontSize: 22,
              fontWeight: 800,
              color: 'text.primary',
              mb: 1,
            }}
          >
            Change Your Password
          </Typography>
          <Typography sx={{ fontSize: 14, color: 'text.secondary', lineHeight: 1.6 }}>
            Your account is still using the default password. For security, please create your own password before continuing.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 0, bgcolor: 'rgba(255,248,243,0.96)' }}>
          <Button
            variant="contained"
            startIcon={<LockResetRounded />}
            onClick={handleChangePassword}
            sx={{
              borderRadius: '12px',
              fontWeight: 800,
              textTransform: 'none',
            }}
          >
            Change Password
          </Button>
        </DialogActions>
      </Dialog>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
        >
          <Navigation onNavigate={() => setMobileOpen(false)} />
        </Drawer>

        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
        >
          <Navigation />
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: { xs: '110px', md: '146px' },
          px: { xs: 1.6, md: 3.2 },
          pb: 4,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {offline && (
            <Alert
              severity="warning"
              sx={{
                mb: 2.4,
                borderRadius: 5,
                border: '1px solid rgba(206,106,123,0.18)',
                bgcolor: 'rgba(255,247,248,0.92)',
                color: '#a7495a',
              }}
            >
              Offline mode is active. Your changes stay on the device and will sync back once the connection is restored.
            </Alert>
          )}
          <Outlet />
        </motion.div>
      </Box>
    </Box>
  )
}
