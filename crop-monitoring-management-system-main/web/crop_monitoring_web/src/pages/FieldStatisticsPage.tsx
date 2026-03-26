import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
  alpha,
} from '@mui/material'
import { YieldAnalysisChart } from '@/components/Dashboard/YieldAnalysisChart'
import { useMobileObservationRecords } from '@/hooks/useMobileObservationRecords'

const CREAM = '#fffaf3'
const DISPLAY = '"Syne", sans-serif'
const MONO = '"Space Mono", monospace'

export function FieldStatisticsPage() {
  const {
    data: observations = [],
    isLoading,
    error,
  } = useMobileObservationRecords()

  return (
    <Box sx={{ bgcolor: CREAM, minHeight: '100vh', position: 'relative' }}>
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          background: `
            radial-gradient(ellipse 36% 24% at 12% 4%, rgba(166,226,184,0.24) 0%, transparent 68%),
            radial-gradient(ellipse 30% 24% at 88% 16%, rgba(244,162,140,0.16) 0%, transparent 70%),
            radial-gradient(ellipse 26% 22% at 78% 92%, rgba(86,184,112,0.14) 0%, transparent 72%)
          `,
        }}
      />

      <Container maxWidth="xl" sx={{ pb: 8, pt: { xs: 3, md: 4 }, position: 'relative', zIndex: 1 }}>
        <Paper
          sx={{
            mb: 3.2,
            p: { xs: 2.4, md: 3.2 },
            borderRadius: '36px',
            border: '1px solid rgba(27, 94, 32, 0.12)',
            position: 'relative',
            overflow: 'hidden',
            background: `
              radial-gradient(circle at 0% 0%, rgba(86,184,112,0.22) 0%, transparent 30%),
              radial-gradient(circle at 100% 0%, rgba(244,162,140,0.18) 0%, transparent 34%),
              linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.98) 100%)
            `,
            boxShadow: '0 22px 54px rgba(17,24,16,0.06)',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              opacity: 0.25,
              backgroundImage: 'linear-gradient(125deg, transparent 0%, rgba(27,94,32,0.12) 1%, transparent 2%, transparent 100%)',
              backgroundSize: '26px 26px',
            }}
          />

          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1.6 }}>
              <Chip
                size="small"
                label="Field Statistics Atlas"
                sx={{ bgcolor: alpha('#56b870', 0.12), color: 'primary.dark', fontWeight: 800, fontFamily: MONO, letterSpacing: '0.08em' }}
              />
              <Chip
                size="small"
                label={`${observations.length} live monitoring row${observations.length === 1 ? '' : 's'}`}
                sx={{ bgcolor: alpha('#68c3d4', 0.14), color: 'primary.dark', fontWeight: 800, fontFamily: MONO, letterSpacing: '0.04em' }}
              />
            </Stack>

            <Box sx={{ display: 'grid', gap: 2.4, gridTemplateColumns: { xs: '1fr', lg: '1.15fr 0.85fr' }, alignItems: 'start' }}>
              <Box>
                <Typography
                  sx={{
                    fontSize: { xs: 32, md: 50 },
                    fontWeight: 900,
                    color: 'text.primary',
                    mb: 1,
                    lineHeight: 0.98,
                    letterSpacing: '-0.05em',
                    fontFamily: DISPLAY,
                    maxWidth: 760,
                  }}
                >
                  Field statistics designed as a live visual board
                </Typography>
                <Typography sx={{ color: 'text.secondary', maxWidth: 760, lineHeight: 1.85, fontSize: 14, fontFamily: '"Nunito", sans-serif' }}>
                  Live field intelligence built from the latest dated record for each field, combining mapped area,
                  soil chemistry, TAM, crop classes, and land coverage in one place with varied visual presentations.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gap: 1.2,
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                }}
              >
                {[
                  { label: 'Live Rows', value: String(observations.length), tone: '#56b870' },
                  { label: 'View Style', value: 'Editorial', tone: '#68c3d4' },
                  { label: 'Charts', value: 'Diverse', tone: '#f4a28c' },
                  { label: 'Feed', value: 'Current', tone: '#1b5e20' },
                ].map((item) => (
                  <Box
                    key={item.label}
                    sx={{
                      p: 1.4,
                      borderRadius: '20px',
                      border: `1px solid ${alpha(item.tone, 0.18)}`,
                      bgcolor: alpha(item.tone, 0.08),
                    }}
                  >
                    <Typography sx={{ fontSize: 10.5, color: alpha(item.tone, 0.9), fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: MONO, mb: 0.6 }}>
                      {item.label}
                    </Typography>
                    <Typography sx={{ fontSize: 22, color: 'text.primary', fontWeight: 900, letterSpacing: '-0.04em', fontFamily: DISPLAY }}>
                      {item.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error.message}
          </Alert>
        )}

        {isLoading ? (
          <Box sx={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <YieldAnalysisChart observations={observations} />
        )}
      </Container>
    </Box>
  )
}
