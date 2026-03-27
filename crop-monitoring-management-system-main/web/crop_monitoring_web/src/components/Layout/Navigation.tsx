import { motion } from 'framer-motion'
import {
  Box,
  Typography,
  Avatar,
  Chip,
} from '@mui/material'
import {
  CalendarMonthRounded,
  HomeRounded,
  InsightsRounded,
  TableChartRounded,
  MapRounded,
} from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { BrandLogo } from '@/components/Brand/BrandLogo'
import {
  BRAND_DESCRIPTION,
  BRAND_NAME,
} from '@/branding/brand'

interface NavItemDef {
  path: string
  label: string
  sub: string
  icon: React.ReactNode
  roles?: Array<'admin' | 'supervisor' | 'collector'>
}

const PRIMARY_NAV: NavItemDef[] = [
  { path: '/', label: 'Overview', sub: 'System overview', icon: <HomeRounded fontSize="small" /> },
  { path: '/data', label: 'Field Records', sub: 'Crop observations', icon: <TableChartRounded fontSize="small" /> },
  { path: '/entry-forms', label: 'Entry Forms', sub: 'Form submissions', icon: <TableChartRounded fontSize="small" /> },
  { path: '/field-statistics', label: 'Field Statistics', sub: 'Charts and summaries', icon: <InsightsRounded fontSize="small" /> },
  { path: '/calendar', label: 'Farming Calendar', sub: 'Imported workbook', icon: <CalendarMonthRounded fontSize="small" /> },
  { path: '/monitoring', label: 'Monitoring', sub: 'Live sugarcane data', icon: <InsightsRounded fontSize="small" /> },
  { path: '/map', label: 'Map View', sub: 'Fields and boundaries', icon: <MapRounded fontSize="small" /> },
]

export function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const role = user?.role ?? 'collector'
  const displayName = user?.full_name?.trim() || user?.email?.split('@')[0] || 'System user'
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U'
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1)
  const allNav = PRIMARY_NAV

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background:
          'radial-gradient(circle at 18% 8%, rgba(166,226,184,0.38), transparent 42%), radial-gradient(circle at 88% 18%, rgba(244,162,140,0.16), transparent 28%), linear-gradient(180deg, #ffffff 0%, #f5fff8 62%, #fff7ef 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        component={motion.div}
        animate={{ y: [0, -8, 0], opacity: [0.32, 0.52, 0.32] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        sx={{
          position: 'absolute',
          top: 90,
          right: -80,
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(244,162,140,0.22) 0%, transparent 72%)',
          filter: 'blur(18px)',
          pointerEvents: 'none',
        }}
      />
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        sx={{ px: 2.3, pt: 3.1, pb: 2.1 }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 1.4,
            py: 1.2,
            borderRadius: 5,
            border: '1px solid rgba(86,184,112,0.16)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.86) 0%, rgba(255,248,242,0.82) 100%)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <BrandLogo size={44} />
          <Box>
            <Typography sx={{ fontFamily: 'Syne, Fredoka, sans-serif', fontWeight: 800, fontSize: 20, lineHeight: 1.05, color: 'text.primary' }}>
              {BRAND_NAME}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              {BRAND_DESCRIPTION}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ px: 2.1, pb: 2.5, flex: 1, overflowY: 'auto' }}>
        {allNav.map((item, index) => {
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
                mb: 0.8,
                borderRadius: 4.5,
                bgcolor: active ? 'rgba(255,255,255,0.84)' : 'rgba(255,255,255,0.36)',
                borderColor: active ? 'rgba(86,184,112,0.3)' : 'rgba(255,255,255,0.12)',
                borderWidth: 1,
                borderStyle: 'solid',
                boxShadow: active ? '0 16px 28px rgba(35,64,52,0.08)' : 'none',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
                '&::after': active ? {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(135deg, rgba(86,184,112,0.08) 0%, rgba(244,162,140,0.08) 100%)',
                  pointerEvents: 'none',
                } : undefined,
                '&:hover': {
                  bgcolor: active ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.7)',
                  borderColor: 'rgba(86,184,112,0.24)',
                  transform: 'translateX(2px)',
                },
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: active ? 'rgba(244,162,140,0.2)' : 'rgba(86,184,112,0.12)',
                  color: active ? 'secondary.dark' : 'text.secondary',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {item.icon}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1, position: 'relative', zIndex: 1 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 14, color: active ? 'primary.dark' : 'text.primary', lineHeight: 1.2 }}>
                  {item.label}
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.25 }}>
                  {item.sub}
                </Typography>
              </Box>
              {active && (
                <Chip
                  size="small"
                  label="Here"
                  sx={{
                    height: 20,
                    fontSize: 10,
                    fontWeight: 800,
                    bgcolor: 'rgba(86,184,112,0.18)',
                    color: 'primary.dark',
                    position: 'relative',
                    zIndex: 1,
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
          borderTop: '1px solid rgba(86,184,112,0.14)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,248,242,0.5) 100%)',
        }}
      >
        <Box
          sx={{
            p: 1.35,
            borderRadius: 4.5,
            border: '1px solid rgba(86,184,112,0.14)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(255,248,242,0.84) 100%)',
            boxShadow: '0 14px 28px rgba(35,64,52,0.06)',
          }}
        >
          <Typography
            sx={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'text.secondary',
              mb: 1.1,
            }}
          >
            Current User
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'transparent',
                backgroundImage: 'linear-gradient(135deg, rgba(86,184,112,0.22) 0%, rgba(244,162,140,0.2) 100%)',
                color: 'primary.dark',
                fontWeight: 800,
                fontFamily: 'Fredoka, Nunito, sans-serif',
              }}
            >
              {initials}
            </Avatar>

            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: 14,
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
                  fontSize: 11,
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

          <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', mt: 1.2 }}>
            <Chip
              size="small"
              label={roleLabel}
              sx={{
                height: 24,
                fontSize: 10,
                fontWeight: 800,
                bgcolor: 'rgba(86,184,112,0.16)',
                color: 'primary.dark',
              }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
