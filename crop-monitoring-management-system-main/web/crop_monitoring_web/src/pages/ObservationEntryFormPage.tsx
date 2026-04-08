import { useMemo, useState } from 'react'
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
import type { SugarcaneMonitoringRecord } from '@/types/database.types'

const trialSortCollator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
})

function normalizeSortText(value?: string | null) {
    return (value ?? '').replace(/\s+/g, ' ').trim()
}

function compareSortText(left?: string | null, right?: string | null) {
    return trialSortCollator.compare(normalizeSortText(left), normalizeSortText(right))
}

function compareEntryRows(left: SugarcaneMonitoringRecord, right: SugarcaneMonitoringRecord) {
    const byTrial = compareSortText(left.field_id || left.field_name, right.field_id || right.field_name)
    if (byTrial !== 0) return byTrial

    const byTrialName = compareSortText(left.trial_name, right.trial_name)
    if (byTrialName !== 0) return byTrialName

    const byBlock = compareSortText(left.block_id, right.block_id)
    if (byBlock !== 0) return byBlock

    const bySection = compareSortText(left.section_name, right.section_name)
    if (bySection !== 0) return bySection

    const byDate = compareSortText(left.date_recorded, right.date_recorded)
    if (byDate !== 0) return byDate

    return compareSortText(left.id, right.id)
}

export function ObservationEntryFormPage() {
    const [intakeOpen, setIntakeOpen] = useState(false)
    const [saveSuccessMessage, setSaveSuccessMessage] = useState('')
    const {
        data: monitoringRows = [],
        isLoading: loading,
        error,
        refetch: refetchMonitoring,
        isFetching,
    } = useSugarcaneMonitoring({ includeUndated: true })

    const tableRows = useMemo(
        () => [...monitoringRows].sort(compareEntryRows),
        [monitoringRows]
    )

    const handleRefresh = async () => {
        await refetchMonitoring()
    }

    const handleExportCSV = () => {
        if (tableRows.length === 0) {
            alert('No data to export')
            return
        }

        const headers = SUGARCANE_MONITORING_SHEET_COLUMNS.map((column) => column.label)
        const rows = tableRows.map((record) => {
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
        a.download = `sugarcane-field-management-${new Date().toISOString().split('T')[0]}.csv`
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
                    disabled={tableRows.length === 0}
                >
                    Export CSV
                </Button>
            </Stack>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error.message}
                </Alert>
            )}

            {tableRows.length > 0 ? (
                <Box>
                    <ObservationEntryDataTable
                        records={tableRows}
                        emptyMessage="No field management rows match the current filter."
                    />
                </Box>
            ) : (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ color: 'text.secondary', mb: 2 }}>
                        📭 No field management entries found
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Records will appear here once live monitoring records are available or you add a new saved entry from the intake form.
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
