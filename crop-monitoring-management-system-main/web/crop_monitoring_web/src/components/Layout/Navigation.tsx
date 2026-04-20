import { motion } from 'framer-motion'
import {
  Avatar,
  Box,
  Chip,
  Typography,
} from '@mui/material'
import {
  AgricultureRounded,
  AutoAwesomeRounded,
  CalendarMonthRounded,
  HomeRounded,
  InsightsRounded,
  MapRounded,
  ShieldRounded,
  SpaRounded,
  TableChartRounded,
} from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { BrandLogo } from '@/components/Brand/BrandLogo'
import {
  BRAND_DESCRIPTION,
  BRAND_NAME,
} from '@/branding/brand'
import type { UserRole } from '@/types/auth.types'
import { canAccessRoles, getRoleLabel, hasPermission, type AppPermission } from '@/utils/roleAccess'

interface NavItemDef {
  path: string
  label: string
  sub: string
  icon: React.ReactNode
  requiredPermission?: AppPermission
  allowedRoles?: readonly UserRole[]
}

const PRIMARY_NAV: NavItemDef[] = [
  { path: '/', label: 'Overview', sub: 'System pulse', icon: <HomeRounded fontSize="small" /> },
  { path: '/data', label: 'Field Records', sub: 'Observation rows', icon: <TableChartRounded fontSize="small" /> },
  { path: '/entry-forms', label: 'Entry Forms', sub: 'Web form intake', icon: <AgricultureRounded fontSize="small" /> },
  { path: '/field-statistics', label: 'Field Statistics', sub: 'Charts and coverage', icon: <InsightsRounded fontSize="small" /> },
  { path: '/calendar', label: 'Farming Calendar', sub: 'Season timing', icon: <CalendarMonthRounded fontSize="small" /> },
  { path: '/map', label: 'Map View', sub: 'Trials and boundaries', icon: <MapRounded fontSize="small" /> },
]

const ADMIN_NAV: NavItemDef[] = [
  {
    path: '/security',
    label: 'Security Center',
    sub: 'Approvals and roles',
    icon: <ShieldRounded fontSize="small" />,
    requiredPermission: 'accessBackend',
  },
]

export function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const displayName = user?.full_name?.trim() || user?.email?.split('@')[0] || 'System user'
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U'
  const roleLabel = getRoleLabel(user?.profile_role ?? user?.role)
  const navItems = [...PRIMARY_NAV, ...ADMIN_NAV].filter((item) => {
    if (item.allowedRoles && !canAccessRoles(user?.role, item.allowedRoles, user?.email)) {
      return false
    }

    return item.requiredPermission ? hasPermission(user?.role, item.requiredPermission) : true
  })

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: `
          radial-gradient(circle at 14% 6%, rgba(107,196,134,0.24) 0%, transparent 34%),
          radial-gradient(circle at 86% 14%, rgba(234,143,115,0.14) 0%, transparent 24%),
          linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,252,245,0.98) 62%, rgba(255,247,239,0.98) 100%)
        `,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        component={motion.div}
        animate={{ y: [0, -8, 0], opacity: [0.26, 0.42, 0.26] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        sx={{
          position: 'absolute',
          top: 92,
          right: -56,
          width: 150,
          height: 150,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle, rgba(234,143,115,0.18) 0%, transparent 72%)',
          color: 'rgba(201,105,77,0.38)',
          pointerEvents: 'none',
          '& svg': { fontSize: 52 },
        }}
      >
        <SpaRounded />
      </Box>

      <Box
        component={motion.div}
        animate={{ y: [0, 8, 0], opacity: [0.18, 0.3, 0.18] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        sx={{
          position: 'absolute',
          bottom: 70,
          left: -40,
          width: 120,
          height: 120,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle, rgba(103,185,201,0.18) 0%, transparent 72%)',
          color: 'rgba(61,138,153,0.38)',
          pointerEvents: 'none',
          '& svg': { fontSize: 42 },
        }}
      >
        <AutoAwesomeRounded />
      </Box>

      <Box sx={{ px: 2.4, pt: 3.1, pb: 2.1 }}>
        <Box
          sx={{
            p: 1.5,
            borderRadius: '18px',
            border: '1px solid rgba(47,127,79,0.14)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(255,249,244,0.82) 100%)',
            backdropFilter: 'blur(14px)',
            boxShadow: '0 18px 34px rgba(31,52,43,0.08)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.3 }}>
            <BrandLogo size={46} borderRadius={8} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontFamily: '"Times New Roman", Times, serif', fontWeight: 800, fontSize: 21, lineHeight: 1.02, color: 'text.primary' }}>
                {BRAND_NAME}
              </Typography>
              <Typography sx={{ fontSize: 10.5, color: 'text.secondary', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: '"Times New Roman", Times, serif', mt: 0.45 }}>
                {BRAND_DESCRIPTION}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', mt: 1.35 }}>
            <Chip
              size="small"
              icon={<AgricultureRounded sx={{ fontSize: 14 }} />}
              label="Field-ready"
              sx={{
                borderRadius: '10px',
                bgcolor: 'rgba(47,127,79,0.1)',
                color: 'primary.dark',
                '& .MuiChip-icon': { color: 'inherit' },
              }}
            />
          </Box>
        </Box>
      </Box>

      <Box sx={{ px: 2.1, flex: 1, overflowY: 'auto', pb: 2.1 }}>
        {navItems.map((item, index) => {
          const active = location.pathname === item.path

          return (
            <Box
              key={item.path}
              component={motion.button}
              type="button"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.03 * index, duration: 0.3 }}
              onClick={() => {
                navigate(item.path)
                onNavigate?.()
              }}
              sx={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 1.2,
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                p: 1.2,
                mb: 0.9,
                borderRadius: 5,
                bgcolor: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.42)',
                borderColor: active ? 'rgba(47,127,79,0.26)' : 'rgba(255,255,255,0.16)',
                borderWidth: 1,
                borderStyle: 'solid',
                boxShadow: active ? '0 18px 34px rgba(31,52,43,0.08)' : 'none',
                transition: 'all 0.22s ease',
                position: 'relative',
                overflow: 'hidden',
                '&::after': active
                  ? {
                      content: '""',
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(135deg, rgba(107,196,134,0.08) 0%, rgba(234,143,115,0.08) 100%)',
                      pointerEvents: 'none',
                    }
                  : undefined,
                '&:hover': {
                  bgcolor: active ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.76)',
                  borderColor: 'rgba(47,127,79,0.22)',
                  transform: 'translateX(3px)',
                },
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: active ? 'rgba(234,143,115,0.16)' : 'rgba(47,127,79,0.1)',
                  color: active ? 'secondary.dark' : 'primary.dark',
                  position: 'relative',
                  zIndex: 1,
                  boxShadow: active ? 'inset 0 0 0 1px rgba(234,143,115,0.16)' : 'none',
                }}
              >
                {item.icon}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1, position: 'relative', zIndex: 1 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 14.5, color: active ? 'primary.dark' : 'text.primary', lineHeight: 1.16 }}>
                  {item.label}
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.3, mt: 0.2 }}>
                  {item.sub}
                </Typography>
              </Box>
              {active && (
                <Chip
                  size="small"
                  icon={<AutoAwesomeRounded sx={{ fontSize: 12 }} />}
                  label="Open"
                  sx={{
                    height: 22,
                    fontSize: 10,
                    fontWeight: 800,
                    bgcolor: 'rgba(47,127,79,0.14)',
                    color: 'primary.dark',
                    position: 'relative',
                    zIndex: 1,
                    '& .MuiChip-icon': { color: 'inherit' },
                  }}
                />
              )}
            </Box>
          )
        })}
      </Box>

      <Box
        sx={{
          px: 2.1,
          pb: 2.3,
          pt: 1.3,
          borderTop: '1px solid rgba(47,127,79,0.12)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,248,243,0.52) 100%)',
        }}
      >
        <Box
          sx={{
            p: 1.45,
            borderRadius: '18px',
            border: '1px solid rgba(47,127,79,0.12)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(255,248,243,0.84) 100%)',
            boxShadow: '0 14px 30px rgba(31,52,43,0.06)',
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
            Current user
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Avatar sx={{ width: 42, height: 42, borderRadius: '12px' }}>{initials}</Avatar>

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

          <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', mt: 1.25 }}>
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
        </Box>
      </Box>
    </Box>
  )
}
