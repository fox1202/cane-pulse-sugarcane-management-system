import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  ButtonBase,
  Drawer,
  Alert,
  Avatar,
  Chip,
  Tooltip,
  Badge,
  Menu,
  MenuItem,
  Divider,
  ListItemText,
} from '@mui/material'
import {
  Menu as MenuIcon,
  LogoutRounded,
  WifiOffRounded,
  WifiRounded,
  NotificationsRounded,
  MapRounded,
  RefreshRounded,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { Navigation } from './Navigation'
import { isOnline } from '@/services/offline.service'
import { BRAND_DESCRIPTION, BRAND_NAME } from '@/branding/brand'

const DRAWER_WIDTH = 300

const PAGE_TITLES: Record<string, string> = {
  '/': 'Overview',
  '/data': BRAND_DESCRIPTION,
  '/entry-forms': 'Entry Forms',
  '/field-statistics': `${BRAND_NAME} ${BRAND_DESCRIPTION}`,
  '/map': 'Map View',
  '/security': 'Security Center',
}

const NOTIFICATIONS = [
  {
    title: 'Morning Sync Complete',
    message: 'All new field reports were synced successfully.',
    time: '3m ago',
    path: '/data',
  },
  {
    title: 'Irrigation Reminder',
    message: 'Block B2 is due for irrigation follow-up this afternoon.',
    time: '14m ago',
    path: '/map',
  },
]

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [offline, setOffline] = useState(!isOnline())
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null)
  const [statusAnchor, setStatusAnchor] = useState<null | HTMLElement>(null)
  const { signOut } = useAuth()

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

  const pageTitle = useMemo(() => PAGE_TITLES[location.pathname] ?? BRAND_NAME, [location.pathname])

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev)
  }

  const closeNotificationMenu = () => setNotificationAnchor(null)
  const closeStatusMenu = () => setStatusAnchor(null)

  const handleNavigate = (path: string) => {
    navigate(path)
    closeNotificationMenu()
    closeStatusMenu()
  }

  const handleRefreshPage = () => {
    closeStatusMenu()
    window.location.reload()
  }

  const handleLogout = async () => {
    try {
      closeNotificationMenu()
      closeStatusMenu()
      await signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <Box
        component={motion.div}
        animate={{ y: [0, -12, 0], opacity: [0.6, 0.85, 0.6] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        sx={{
          position: 'fixed',
          top: -120,
          right: -120,
          width: 420,
          height: 420,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(123,215,157,0.42) 0%, transparent 70%)',
          filter: 'blur(24px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <Box
        component={motion.div}
        animate={{ y: [0, 10, 0], opacity: [0.45, 0.7, 0.45] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        sx={{
          position: 'fixed',
          bottom: -120,
          left: 200,
          width: 460,
          height: 460,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(47,159,90,0.22) 0%, transparent 72%)',
          filter: 'blur(30px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <Box
        component={motion.div}
        animate={{ x: [0, 14, 0], y: [0, -8, 0], opacity: [0.36, 0.56, 0.36] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        sx={{
          position: 'fixed',
          top: 120,
          left: -120,
          width: 320,
          height: 320,
          borderRadius: '40%',
          background: 'radial-gradient(circle, rgba(244,162,140,0.26) 0%, transparent 70%)',
          filter: 'blur(28px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          zIndex: (theme) => theme.zIndex.drawer + 1,
          px: { xs: 1, md: 1.4 },
          pt: { xs: 1.2, md: 1.5 },
          bgcolor: 'transparent',
          boxShadow: 'none',
          borderBottom: 'none',
        }}
      >
        <Toolbar
          sx={{
            minHeight: '78px !important',
            px: { xs: 2, md: 3 },
            gap: 1.5,
            borderRadius: '0 0 28px 28px',
            border: '1px solid rgba(86,184,112,0.16)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,248,242,0.9) 100%)',
            boxShadow: '0 18px 38px rgba(35,64,52,0.07)',
            position: 'relative',
            overflow: 'hidden',
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 'auto 28px 0 28px',
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(86,184,112,0.22), rgba(244,162,140,0.18), transparent)',
            },
          }}
        >
          <IconButton
            onClick={handleDrawerToggle}
            sx={{
              display: { md: 'none' },
              border: '1px solid rgba(86,184,112,0.24)',
              bgcolor: 'rgba(255,255,255,0.78)',
              color: 'primary.dark',
              '&:hover': { bgcolor: 'rgba(86,184,112,0.1)' },
            }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontFamily: 'Syne, Fredoka, sans-serif', fontWeight: 800, fontSize: { xs: 21, md: 25 }, color: 'text.primary', lineHeight: 1.1 }}>
                {pageTitle}
              </Typography>
            </Box>
          </Box>

          <Tooltip title={offline ? 'Offline mode' : 'Connection status'}>
            <ButtonBase
              onClick={(event) => setStatusAnchor(event.currentTarget)}
              aria-label="Open connection status"
              sx={{
                border: 'none',
                p: 0,
                borderRadius: '14px',
                bgcolor: 'transparent',
                position: 'relative',
                zIndex: 1,
                pointerEvents: 'auto',
                '&:focus-visible': {
                  outline: '2px solid rgba(86,184,112,0.38)',
                  outlineOffset: 2,
                },
              }}
            >
              <Chip
                clickable
                icon={offline ? <WifiOffRounded /> : <WifiRounded />}
                label={offline ? 'Offline' : 'Online'}
                sx={{
                  height: 32,
                  borderRadius: '12px',
                  fontWeight: 800,
                  bgcolor: offline ? 'rgba(219,118,130,0.12)' : 'rgba(86,184,112,0.14)',
                  color: offline ? '#bc5564' : 'primary.dark',
                  '& .MuiChip-icon': { color: 'inherit' },
                  cursor: 'pointer',
                }}
              />
            </ButtonBase>
          </Tooltip>

          <Tooltip title="Sign out">
            <ButtonBase
              onClick={handleLogout}
              aria-label="Sign out"
              sx={{
                border: 'none',
                p: 0,
                borderRadius: '14px',
                bgcolor: 'transparent',
                position: 'relative',
                zIndex: 1,
                pointerEvents: 'auto',
                '&:focus-visible': {
                  outline: '2px solid rgba(244,162,140,0.36)',
                  outlineOffset: 2,
                },
              }}
            >
              <Chip
                clickable
                icon={<LogoutRounded />}
                label="Logout"
                sx={{
                  height: 32,
                  borderRadius: '12px',
                  fontWeight: 800,
                  bgcolor: 'rgba(244,162,140,0.14)',
                  color: 'secondary.dark',
                  '& .MuiChip-icon': { color: 'inherit' },
                  cursor: 'pointer',
                }}
              />
            </ButtonBase>
          </Tooltip>

          <Menu
            anchorEl={statusAnchor}
            open={Boolean(statusAnchor)}
            onClose={closeStatusMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            MenuListProps={{
              sx: {
                p: 0.5,
              },
            }}
            PaperProps={{
              sx: {
                width: 280,
                mt: 1.2,
                borderRadius: '18px !important',
                border: '1px solid rgba(86,184,112,0.18)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,248,242,0.95) 100%)',
                overflow: 'hidden',
                p: 0.5,
              },
            }}
          >
            <Box sx={{ px: 1.5, pt: 1, pb: 0.8 }}>
              <Typography sx={{ fontFamily: 'Syne, Fredoka, sans-serif', fontWeight: 700, color: 'text.primary' }}>
                System status
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.4 }}>
                {offline ? 'The browser is offline. Live sync will resume once the connection returns.' : 'The browser is online and ready to sync recorded data.'}
              </Typography>
            </Box>
            <Divider sx={{ mb: 0.4 }} />
              <MenuItem onClick={handleRefreshPage} sx={{ borderRadius: 3, py: 1.1 }}>
                <RefreshRounded fontSize="small" sx={{ mr: 1.2, color: 'primary.dark' }} />
                <ListItemText
                  primary="Refresh current page"
                  secondary="Reload the latest map and form data"
                />
              </MenuItem>
              <MenuItem onClick={() => handleNavigate('/map')} sx={{ borderRadius: 3, py: 1.1 }}>
                <MapRounded fontSize="small" sx={{ mr: 1.2, color: 'primary.dark' }} />
                <ListItemText
                  primary="Open map view"
                  secondary="Jump straight to field boundaries and recorded coverage"
                />
            </MenuItem>
          </Menu>

          <IconButton
            onClick={(e) => setNotificationAnchor(e.currentTarget)}
            aria-label="Open notifications"
            sx={{
              width: 44,
              height: 44,
              border: '1px solid rgba(86,184,112,0.22)',
              bgcolor: 'rgba(255,255,255,0.82)',
              color: 'primary.dark',
              borderRadius: '12px',
              position: 'relative',
              zIndex: 1,
              pointerEvents: 'auto',
              '&:hover': { bgcolor: 'rgba(86,184,112,0.12)' },
            }}
          >
            <Badge badgeContent={NOTIFICATIONS.length} color="success" sx={{ '& .MuiBadge-badge': { fontWeight: 800 } }}>
              <NotificationsRounded />
            </Badge>
          </IconButton>

          <Menu
            anchorEl={notificationAnchor}
            open={Boolean(notificationAnchor)}
            onClose={() => setNotificationAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            MenuListProps={{
              sx: {
                p: 0.5,
              },
            }}
            PaperProps={{
              sx: {
                width: 320,
                mt: 1.2,
                borderRadius: '18px !important',
                border: '1px solid rgba(86,184,112,0.18)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,248,242,0.95) 100%)',
                overflow: 'hidden',
                p: 0.5,
              },
            }}
          >
            <Box sx={{ px: 1.5, pt: 1, pb: 0.8 }}>
              <Typography sx={{ fontFamily: 'Syne, Fredoka, sans-serif', fontWeight: 700, color: 'text.primary' }}>Little updates</Typography>
            </Box>
            <Divider sx={{ mb: 0.4 }} />
            {NOTIFICATIONS.map((note) => (
              <MenuItem key={note.title} onClick={() => handleNavigate(note.path)} sx={{ borderRadius: 3, alignItems: 'flex-start', gap: 1.2, py: 1.2 }}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: 'rgba(244,162,140,0.18)', color: 'secondary.dark', fontSize: 14 }}>✦</Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 13, color: 'text.primary', lineHeight: 1.2 }}>{note.title}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.3 }}>{note.message}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.4 }}>{note.time}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Menu>
        </Toolbar>
      </AppBar>

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
          mt: '98px',
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
                mb: 2.2,
                borderRadius: 5,
                border: '1px solid rgba(219,118,130,0.2)',
                bgcolor: 'rgba(255,246,247,0.92)',
                color: '#bc5564',
              }}
            >
              Offline mode enabled. Changes will sync once your connection is back.
            </Alert>
          )}
          <Outlet />
        </motion.div>
      </Box>
    </Box>
  )
}
