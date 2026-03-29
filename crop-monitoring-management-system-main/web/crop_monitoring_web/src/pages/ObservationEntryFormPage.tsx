import { useState } from 'react'
import {
    Container,
    Box,
    Typography,
    Paper,
    Button,
    CircularProgress,
    Alert,
    useTheme,
    Stack,
} from '@mui/material'
import { AddCircleOutline, RefreshOutlined, DownloadOutlined } from '@mui/icons-material'
import { useObservationEntryForms } from '@/hooks/useObservationEntryForms'
import { ObservationEntryIntakeDialog } from '@/components/Data/ObservationEntryIntakeDialog'
import {
    ObservationEntryDataTable,
    OBSERVATION_ENTRY_SHEET_COLUMNS,
    buildObservationEntrySheetRow,
} from '@/components/Data/ObservationEntryDataTable'

export function ObservationEntryFormPage() {
    const theme = useTheme()
    const [intakeOpen, setIntakeOpen] = useState(false)
    const {
        data: forms = [],
        isLoading: loading,
        error,
        refetch,
        isFetching,
    } = useObservationEntryForms()

    const handleExportCSV = () => {
        if (forms.length === 0) {
            alert('No data to export')
            return
        }

        const headers = OBSERVATION_ENTRY_SHEET_COLUMNS.map((column) => column.label)
        const rows = forms.map((form) => {
            const row = buildObservationEntrySheetRow(form)
            return OBSERVATION_ENTRY_SHEET_COLUMNS.map((column) => row[column.key])
        })

        const csv = [headers, ...rows]
            .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n')

        const blob = new Blob([csv], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `crop-monitoring-entries-${new Date().toISOString().split('T')[0]}.csv`
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
            <Box sx={{ mb: 4 }}>
                <Typography variant="h3" fontWeight={900} sx={{ color: 'text.primary', mb: 1 }}>
                    Crop <span style={{ color: theme.palette.primary.light }}>Monitoring Entries</span>
                </Typography>
            </Box>

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
                    onClick={() => void refetch()}
                    disabled={loading || isFetching}
                >
                    Refresh
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<DownloadOutlined />}
                    onClick={handleExportCSV}
                    disabled={forms.length === 0}
                >
                    Export CSV
                </Button>
            </Stack>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error.message}
                </Alert>
            )}

            {forms.length > 0 ? (
                <Box>
                    <ObservationEntryDataTable
                        forms={forms}
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
                onSubmitted={() => void refetch()}
            />
        </Container>
    )
}
