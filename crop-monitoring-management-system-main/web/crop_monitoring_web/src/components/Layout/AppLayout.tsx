import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  AppBar,
  Avatar,
  Badge,
  Box,
  ButtonBase,
  Chip,
  Divider,
  Drawer,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  AgricultureRounded,
  AutoAwesomeRounded,
  CalendarMonthRounded,
  DescriptionRounded,
  HomeRounded,
  InsightsRounded,
  LogoutRounded,
  MapRounded,
  Menu as MenuIcon,
  NotificationsRounded,
  RefreshRounded,
  ShieldRounded,
  SpaRounded,
  TableChartRounded,
  WifiOffRounded,
  WifiRounded,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { Navigation } from './Navigation'
import { isOnline } from '@/services/offline.service'
import { BRAND_DESCRIPTION, BRAND_NAME } from '@/branding/brand'
import { useSugarcaneMonitoring } from '@/hooks/useSugarcaneMonitoring'
import { fetchLivePredefinedFields, type PredefinedField } from '@/services/database.service'
import { formatDateOnlyLabel } from '@/utils/dateOnly'
import { buildUpcomingTaskNotices, getTaskDueLabel } from '@/utils/upcomingTaskNotices'

const DRAWER_WIDTH = 308

const PAGE_META: Record<string, { eyebrow: string; title: string; note: string; icon: React.ReactNode }> = {
  '/': {
    eyebrow: 'Overview',
    title: 'Field Pulse',
    note: 'Monitor alerts, form flow, calendar work, and mapped field activity from sugarcane_field_management.',
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
    note: 'Read mapped area, crop coverage, and chart summaries from sugarcane_field_management.',
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
  '/monitoring': {
    eyebrow: 'Live Feed',
    title: 'Monitoring',
    note: 'Track current sugarcane records, summaries, and agronomy signals as they update.',
    icon: <AgricultureRounded fontSize="small" />,
  },
  '/security': {
    eyebrow: 'Control',
    title: 'Security Center',
    note: 'Manage protected access, approvals, and system oversight from the admin surface.',
    icon: <ShieldRounded fontSize="small" />,
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
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null)
  const [statusAnchor, setStatusAnchor] = useState<null | HTMLElement>(null)
  const { signOut } = useAuth()
  const {
    data: monitoring = [],
    isLoading: monitoringLoading,
    error: monitoringError,
  } = useSugarcaneMonitoring()
  const {
    data: predefinedFields = [],
    isLoading: fieldsLoading,
    error: fieldsError,
  } = useQuery<PredefinedField[], Error>({
    queryKey: ['overview-predefined-fields'],
    queryFn: fetchLivePredefinedFields,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })

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
  const notificationTasks = useMemo(() => {
    const allTasks = buildUpcomingTaskNotices(monitoring, predefinedFields)
    const urgentTasks = allTasks.filter((task) => task.daysUntil <= 14)

    if (urgentTasks.length > 0) {
      return urgentTasks.slice(0, 6)
    }

    return allTasks.slice(0, 6)
  }, [monitoring, predefinedFields])
  const notificationsLoading = monitoringLoading || fieldsLoading
  const notificationsError = monitoringError ?? fieldsError

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev)
  }

  const handleOpenNotifications = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setNotificationAnchor(event.currentTarget)
  }

  const handleLogoutClick = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    void handleLogout()
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
            minHeight: '92px !important',
            px: { xs: 2, md: 3 },
            gap: 1.5,
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

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4, minWidth: 0, flex: 1 }}>
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
              <Chip
                size="small"
                icon={<AutoAwesomeRounded sx={{ fontSize: 14 }} />}
                label={pageMeta.eyebrow}
                sx={{
                  height: 26,
                  mb: 0.7,
                  bgcolor: 'rgba(255,255,255,0.66)',
                  color: 'primary.dark',
                  border: '1px solid rgba(47,127,79,0.14)',
                  '& .MuiChip-icon': { color: 'inherit' },
                }}
              />
              <Typography sx={{ fontFamily: '"Times New Roman", Times, serif', fontWeight: 800, fontSize: { xs: 22, md: 28 }, color: 'text.primary', lineHeight: 1.02 }}>
                {pageMeta.title}
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.45, mt: 0.4, maxWidth: 620, display: { xs: 'none', md: 'block' } }}>
                {pageMeta.note}
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
                borderRadius: '16px',
                bgcolor: 'transparent',
                position: 'relative',
                zIndex: 1,
                '&:focus-visible': {
                  outline: '2px solid rgba(47,127,79,0.28)',
                  outlineOffset: 2,
                },
              }}
            >
              <Chip
                clickable
                icon={offline ? <WifiOffRounded /> : <WifiRounded />}
                label={offline ? 'Offline' : 'Online'}
                sx={{
                  height: 34,
                  borderRadius: '14px',
                  fontWeight: 800,
                  bgcolor: offline ? 'rgba(206,106,123,0.12)' : 'rgba(47,127,79,0.12)',
                  color: offline ? '#a7495a' : 'primary.dark',
                  '& .MuiChip-icon': { color: 'inherit' },
                }}
              />
            </ButtonBase>
          </Tooltip>

          <Tooltip title="Open task notices">
            <IconButton
              onClick={handleOpenNotifications}
              aria-label="Open task notices"
              aria-haspopup="menu"
              aria-expanded={Boolean(notificationAnchor)}
              sx={{
                width: 46,
                height: 46,
                flexShrink: 0,
                position: 'relative',
                zIndex: 2,
                cursor: 'pointer',
                border: '1px solid rgba(47,127,79,0.16)',
                bgcolor: 'rgba(255,255,255,0.82)',
                color: 'primary.dark',
                borderRadius: '16px',
                boxShadow: '0 10px 24px rgba(31,52,43,0.06)',
                '&:hover': { bgcolor: 'rgba(47,127,79,0.08)' },
              }}
            >
              <Badge
                badgeContent={notificationTasks.length}
                color="success"
                max={9}
                invisible={!notificationTasks.length}
              >
                <NotificationsRounded />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Sign out">
            <ButtonBase
              onClick={handleLogoutClick}
              aria-label="Sign out"
              sx={{
                border: 'none',
                p: 0,
                borderRadius: '16px',
                bgcolor: 'transparent',
                position: 'relative',
                zIndex: 2,
                cursor: 'pointer',
                '&:focus-visible': {
                  outline: '2px solid rgba(234,143,115,0.34)',
                  outlineOffset: 2,
                },
              }}
            >
              <Chip
                clickable
                icon={<LogoutRounded />}
                label="Logout"
                sx={{
                  height: 34,
                  borderRadius: '14px',
                  fontWeight: 800,
                  bgcolor: 'rgba(234,143,115,0.12)',
                  color: 'secondary.dark',
                  '& .MuiChip-icon': { color: 'inherit' },
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
            MenuListProps={{ sx: { p: 0.6 } }}
            PaperProps={{
              sx: {
                width: 300,
                mt: 1.2,
                borderRadius: '22px !important',
                border: '1px solid rgba(47,127,79,0.16)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,248,243,0.95) 100%)',
                overflow: 'hidden',
                p: 0.6,
              },
            }}
          >
            <Box sx={{ px: 1.6, pt: 1.1, pb: 0.9 }}>
              <Typography sx={{ fontFamily: '"Times New Roman", Times, serif', fontWeight: 800, color: 'text.primary' }}>
                System status
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.45, lineHeight: 1.55 }}>
                {offline
                  ? 'The browser is offline. New edits are safe, and live sync will continue once your connection returns.'
                  : 'The browser is online and ready to sync records, calendar updates, and map activity.'}
              </Typography>
            </Box>
            <Divider sx={{ mb: 0.4 }} />
            <MenuItem onClick={handleRefreshPage} sx={{ borderRadius: 3.5, py: 1.15 }}>
              <RefreshRounded fontSize="small" sx={{ mr: 1.2, color: 'primary.dark' }} />
              <ListItemText
                primary="Refresh current page"
                secondary="Reload the latest map, records, and web-form data"
              />
            </MenuItem>
            <MenuItem onClick={() => handleNavigate('/map')} sx={{ borderRadius: 3.5, py: 1.15 }}>
              <MapRounded fontSize="small" sx={{ mr: 1.2, color: 'primary.dark' }} />
              <ListItemText
                primary="Open map view"
                secondary="Jump straight to field boundaries and recorded coverage"
              />
            </MenuItem>
          </Menu>

          <Menu
            anchorEl={notificationAnchor}
            open={Boolean(notificationAnchor)}
            onClose={() => setNotificationAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            MenuListProps={{ sx: { p: 0.6 } }}
            PaperProps={{
              sx: {
                width: 336,
                mt: 1.2,
                borderRadius: '22px !important',
                border: '1px solid rgba(47,127,79,0.16)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,248,243,0.95) 100%)',
                overflow: 'hidden',
                p: 0.6,
              },
            }}
          >
            <Box sx={{ px: 1.6, pt: 1.1, pb: 0.9 }}>
              <Typography sx={{ fontFamily: '"Times New Roman", Times, serif', fontWeight: 800, color: 'text.primary' }}>
                Upcoming tasks
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.35 }}>
                Notices for activities that need attention from the farming calendar.
              </Typography>
            </Box>
            <Divider sx={{ mb: 0.4 }} />
            {notificationsLoading && (
              <Box sx={{ px: 1.6, py: 1.4 }}>
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.5 }}>
                  Checking the latest field schedules and upcoming activities.
                </Typography>
              </Box>
            )}
            {!notificationsLoading && notificationsError && (
              <Box sx={{ px: 1.6, py: 1.4 }}>
                <Typography sx={{ fontSize: 12.5, color: 'error.main', lineHeight: 1.5 }}>
                  Task notices could not be loaded right now.
                </Typography>
              </Box>
            )}
            {!notificationsLoading && !notificationsError && notificationTasks.length === 0 && (
              <Box sx={{ px: 1.6, py: 1.4 }}>
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.5 }}>
                  No upcoming task notices yet. Add planting or cut dates to see calendar activities here.
                </Typography>
              </Box>
            )}
            {!notificationsLoading && !notificationsError && notificationTasks.map((task) => {
              const avatarTone = task.severity === 'overdue'
                ? { bg: 'rgba(206,106,123,0.14)', fg: '#a7495a' }
                : task.severity === 'today'
                  ? { bg: 'rgba(234,143,115,0.16)', fg: 'secondary.dark' }
                  : { bg: 'rgba(47,127,79,0.12)', fg: 'primary.dark' }

              return (
                <MenuItem
                  key={task.key}
                  onClick={() => handleNavigate('/calendar')}
                  sx={{ borderRadius: 3.5, alignItems: 'flex-start', gap: 1.2, py: 1.15 }}
                >
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '10px',
                      bgcolor: avatarTone.bg,
                      color: avatarTone.fg,
                    }}
                  >
                    <CalendarMonthRounded sx={{ fontSize: 18 }} />
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 12.8, color: 'text.primary', lineHeight: 1.3 }}>
                      {task.activity}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.4, mt: 0.25 }}>
                      {task.fieldLabel} · {task.weekLabel}
                    </Typography>
                    <Typography sx={{ fontSize: 11.25, color: 'text.secondary', lineHeight: 1.4, mt: 0.35 }}>
                      {getTaskDueLabel(task.daysUntil)} · {formatDateOnlyLabel(task.dateIso) ?? task.dateIso}
                    </Typography>
                  </Box>
                </MenuItem>
              )
            })}
            <Divider sx={{ mt: 0.4, mb: 0.4 }} />
            <MenuItem onClick={() => handleNavigate('/calendar')} sx={{ borderRadius: 3.5, py: 1.15 }}>
              <CalendarMonthRounded fontSize="small" sx={{ mr: 1.2, color: 'primary.dark' }} />
              <ListItemText
                primary="Open farming calendar"
                secondary="See the full schedule of activities that need to be done"
              />
            </MenuItem>
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
          mt: '110px',
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
