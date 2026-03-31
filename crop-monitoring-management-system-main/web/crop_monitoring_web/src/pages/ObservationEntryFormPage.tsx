import { useState } from 'react'
import {
    Container,
    Box,
    Typography,
    Paper,
    Button,
    CircularProgress,
    Alert,
    Snackbar,
    Stack,
} from '@mui/material'
import { AddCircleOutline, RefreshOutlined, DownloadOutlined } from '@mui/icons-material'
import { useSugarcaneMonitoring } from '@/hooks/useSugarcaneMonitoring'
import { ObservationEntryIntakeDialog } from '@/components/Data/ObservationEntryIntakeDialog'
import {
    ObservationEntryDataTable,
    SUGARCANE_MONITORING_SHEET_COLUMNS,
    buildSugarcaneMonitoringSheetRow,
} from '@/components/Data/ObservationEntryDataTable'

export function ObservationEntryFormPage() {
    const [intakeOpen, setIntakeOpen] = useState(false)
    const [saveSuccessMessage, setSaveSuccessMessage] = useState('')
    const {
        data: monitoringRows = [],
        isLoading: monitoringLoading,
        error: monitoringError,
        refetch: refetchMonitoring,
        isFetching: isFetchingMonitoring,
    } = useSugarcaneMonitoring()

    const loading = monitoringLoading
    const error = monitoringError
    const isFetching = isFetchingMonitoring

    const handleRefresh = async () => {
        await refetchMonitoring()
    }

    const handleExportCSV = () => {
        if (monitoringRows.length === 0) {
            alert('No data to export')
            return
        }

        const headers = SUGARCANE_MONITORING_SHEET_COLUMNS.map((column) => column.label)
        const rows = monitoringRows.map((record) => {
            const row = buildSugarcaneMonitoringSheetRow(record)
            return SUGARCANE_MONITORING_SHEET_COLUMNS.map((column) => row[column.key])
        })

        const csv = [headers, ...rows]
            .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n')

        const blob = new Blob([csv], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `sugarcane-monitoring-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
    }

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        )
    }

    return (
        <Container maxWidth="xl" sx={{ pb: 6, pt: 4 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
                <Button
                    variant="contained"
                    startIcon={<AddCircleOutline />}
                    onClick={() => setIntakeOpen(true)}
                >
                    Enter Record
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<RefreshOutlined />}
                    onClick={() => void handleRefresh()}
                    disabled={loading || isFetching}
                >
                    Refresh
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<DownloadOutlined />}
                    onClick={handleExportCSV}
                    disabled={monitoringRows.length === 0}
                >
                    Export CSV
                </Button>
            </Stack>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error.message}
                </Alert>
            )}

            {monitoringRows.length > 0 ? (
                <Box>
                    <ObservationEntryDataTable
                        records={monitoringRows}
                        emptyMessage="No monitoring rows match the current filter."
                    />
                </Box>
            ) : (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ color: 'text.secondary', mb: 2 }}>
                        📭 No crop monitoring entries found
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Records will appear here once live monitoring data is available or you add a new monitoring record.
                    </Typography>
                </Paper>
            )}

            <ObservationEntryIntakeDialog
                open={intakeOpen}
                onClose={() => setIntakeOpen(false)}
                onSubmitted={async () => {
                    await handleRefresh()
                }}
                onSaved={setSaveSuccessMessage}
                existingRecords={monitoringRows}
            />
            <Snackbar
                open={!!saveSuccessMessage}
                autoHideDuration={4000}
                onClose={() => setSaveSuccessMessage('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSaveSuccessMessage('')}
                    severity="success"
                    sx={{ width: '100%' }}
                >
                    {saveSuccessMessage}
                </Alert>
            </Snackbar>
        </Container>
    )
}
