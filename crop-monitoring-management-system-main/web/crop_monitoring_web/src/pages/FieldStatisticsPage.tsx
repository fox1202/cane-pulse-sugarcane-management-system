import {
  Alert,
  Box,
  CircularProgress,
  Container,
} from '@mui/material'
import { YieldAnalysisChart } from '@/components/Dashboard/YieldAnalysisChart'
import { useMobileObservationRecords } from '@/hooks/useMobileObservationRecords'

const CREAM = '#fffaf3'

export function FieldStatisticsPage() {
  const {
    data: observations = [],
    isLoading,
    error,
  } = useMobileObservationRecords({ includeUndated: true })

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
