import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider, CssBaseline, CircularProgress, Box, Paper, Stack, Typography } from '@mui/material'
import { AutoAwesomeRounded, SpaRounded } from '@mui/icons-material'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/Layout/AppLayout'
import { LiveQuerySync } from '@/components/LiveQuerySync'
import { LoginPage } from '@/pages/LoginPage'
import { HomePage } from '@/pages/HomePage'
import { theme } from '@/theme/theme'

// Lazy load dashboard and map pages for better performance
const MapViewPage = lazy(() => import('@/pages/MapViewPage').then(m => ({ default: m.MapViewPage })))
const DataManagementPage = lazy(() => import('@/pages/DataManagementPage').then(m => ({ default: m.DataManagementPage })))
const DataDemoPage = lazy(() => import('@/pages/DataDemoPage').then(m => ({ default: m.DataDemoPage })))
const SignUpPage = lazy(() => import('@/pages/SignUpPage').then(m => ({ default: m.SignUpPage })))
const SecurityCenterPage = lazy(() => import('@/pages/SecurityCenterPage').then(m => ({ default: m.SecurityCenterPage })))
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })))
const UpdatePasswordPage = lazy(() => import('@/pages/UpdatePasswordPage').then(m => ({ default: m.UpdatePasswordPage })))
const DebugDbPage = lazy(() => import('@/pages/DebugDbPage').then(m => ({ default: m.default })))
const SupabaseConnectionTest = lazy(() => import('@/pages/SupabaseConnectionTest').then(m => ({ default: m.default })))
const RawDataViewerPage = lazy(() => import('@/pages/RawDataViewerPage').then(m => ({ default: m.RawDataViewerPage })))
const ObservationEntryFormPage = lazy(() => import('@/pages/ObservationEntryFormPage').then(m => ({ default: m.ObservationEntryFormPage })))
const FieldStatisticsPage = lazy(() => import('@/pages/FieldStatisticsPage').then(m => ({ default: m.FieldStatisticsPage })))
const FarmingCalendarPage = lazy(() => import('@/pages/FarmingCalendarPage').then(m => ({ default: m.FarmingCalendarPage })))

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
})

// Loading fallback
function LoadingFallback() {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          px: 4.5,
          py: 3.5,
          borderRadius: 7,
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          maxWidth: 360,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -32,
            right: -24,
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(234,143,115,0.16) 0%, transparent 70%)',
          }}
        />
        <Stack spacing={1.4} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <AutoAwesomeRounded sx={{ color: 'secondary.dark', fontSize: 18 }} />
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>
              Loading Workspace
            </Typography>
            <SpaRounded sx={{ color: 'primary.dark', fontSize: 18 }} />
          </Stack>
          <CircularProgress />
          <Typography sx={{ fontWeight: 800, color: 'text.primary' }}>
            Preparing the next Cane Pulse view
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Pulling together maps, forms, and field data for the next page.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <LiveQuerySync />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/forgot-password" element={<Suspense fallback={<LoadingFallback />}><ForgotPasswordPage /></Suspense>} />
              <Route path="/update-password" element={<Suspense fallback={<LoadingFallback />}><UpdatePasswordPage /></Suspense>} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<HomePage />} />
                <Route
                  path="map"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <MapViewPage />
                    </Suspense>
                  }
                />
                <Route
                  path="data"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <DataManagementPage />
                    </Suspense>
                  }
                />
                <Route
                  path="debug-db"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <Suspense fallback={<LoadingFallback />}>
                        <DebugDbPage />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="supabase-test"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <Suspense fallback={<LoadingFallback />}>
                        <SupabaseConnectionTest />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="raw-data"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <Suspense fallback={<LoadingFallback />}>
                        <RawDataViewerPage />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="entry-forms"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <ObservationEntryFormPage />
                    </Suspense>
                  }
                />
                <Route
                  path="field-statistics"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <FieldStatisticsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="calendar"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <FarmingCalendarPage />
                    </Suspense>
                  }
                />
                <Route path="monitoring" element={<Navigate to="/" replace />} />
                <Route
                  path="demo"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <DataDemoPage />
                    </Suspense>
                  }
                />
                <Route
                  path="security"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <Suspense fallback={<LoadingFallback />}>
                        <SecurityCenterPage />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route path="blocks" element={<Navigate to="/map" replace />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
