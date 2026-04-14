import React, { useState, useMemo, Component, ReactNode } from 'react'
import {
    Container,
    Box,
    Typography,
    Paper,
    Button,
    CircularProgress,
    Alert,
    TablePagination,
    TextField,
    InputAdornment,
    Grid,
} from '@mui/material'
import {
    DownloadOutlined,
    Search,
    RefreshOutlined,
} from '@mui/icons-material'
import { useFieldManagementRecords } from '@/hooks/useFieldManagementRecords'
import { useAuth } from '@/contexts/AuthContext'
import type { FullObservation } from '@/types/database.types'
import { ObservationDetailDialog } from '@/components/Data/ObservationDetailDialog'
import { ObservationTable } from '@/components/Data/ObservationTable'
import { ObservationEditDialog } from '@/components/Data/ObservationEditDialog'
import { exportToCSV, generatePDFReport } from '@/utils/exportUtils'
import type { MobileObservationRecord } from '@/services/database.service'
import { updateMobileObservationRecord, deleteMobileObservationRecord } from '@/services/database.service'
import { hasAdminLevelAccess } from '@/utils/roleAccess'

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: any;
}

type ObservationPageRecord = FullObservation | MobileObservationRecord

const normalizeFilterToken = (value?: string | null) => (value ?? '').trim().toLowerCase()

const isMobileObservationRecord = (observation: ObservationPageRecord): observation is MobileObservationRecord => {
    return 'source_table' in observation
}

const getEntryForm = (observation: ObservationPageRecord) => (
    isMobileObservationRecord(observation) ? observation.entry_form : undefined
)

const getMonitoringSheet = (observation: ObservationPageRecord) => (
    isMobileObservationRecord(observation) ? observation.monitoring_sheet : undefined
)

const getFieldRegistry = (observation: ObservationPageRecord) => (
    isMobileObservationRecord(observation) ? observation.field_registry : undefined
)

const getCropType = (observation: ObservationPageRecord) => (
    getMonitoringSheet(observation)?.crop_type
    || getMonitoringSheet(observation)?.crop_class
    || getEntryForm(observation)?.crop_type
    || getEntryForm(observation)?.crop_class
    || observation.crop_information?.crop_type
    || ''
)

const getVariety = (observation: ObservationPageRecord) => (
    getMonitoringSheet(observation)?.variety || getEntryForm(observation)?.variety || observation.crop_information?.variety || ''
)

const getTrialSortValue = (observation: ObservationPageRecord) => (
    getMonitoringSheet(observation)?.field_name
    || getMonitoringSheet(observation)?.field_id
    || getEntryForm(observation)?.field_name
    || getEntryForm(observation)?.field_id
    || observation.field_name
    || ''
)

const matchesSearchTerm = (observation: ObservationPageRecord, searchTerm: string) => {
    const normalizedSearch = normalizeFilterToken(searchTerm)
    if (!normalizedSearch) {
        return true
    }

    const entryForm = getEntryForm(observation)
    const currentSheet = getMonitoringSheet(observation)
    const fieldRegistry = getFieldRegistry(observation)

    const searchableText = [
        observation.field_name,
        currentSheet?.field_name,
        currentSheet?.field_id,
        entryForm?.selected_field,
        observation.section_name,
        currentSheet?.section_name,
        observation.block_id,
        currentSheet?.block_id,
        getCropType(observation),
        getVariety(observation),
        currentSheet?.trial_name,
        entryForm?.trial_name,
        currentSheet?.contact_person,
        entryForm?.contact_person,
        entryForm?.phone_number,
        currentSheet?.field_remarks,
        currentSheet?.remarks,
        entryForm?.remarks,
        fieldRegistry?.created_by,
    ]
        .map(normalizeFilterToken)
        .filter(Boolean)
        .join(' ')

    return searchableText.includes(normalizedSearch)
}

const matchesDateRange = (observation: ObservationPageRecord, startDate: string, endDate: string) => {
    if (!startDate && !endDate) return true

    const recordDate = observation.date_recorded || observation.created_at
    if (!recordDate) return true

    const recordTime = new Date(recordDate).getTime()

    if (!Number.isFinite(recordTime)) {
        return true
    }

    if (startDate) {
        const startTime = new Date(startDate).getTime()
        if (recordTime < startTime) return false
    }

    if (endDate) {
        const endTime = new Date(endDate)
        endTime.setHours(23, 59, 59, 999)
        if (recordTime > endTime.getTime()) return false
    }

    return true
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error('Uncaught error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <Box p={4}>
                    <Alert severity="error">
                        <Typography variant="h6">Something went wrong</Typography>
                        <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.toString()}</pre>
                    </Alert>
                </Box>
            );
        }

        return this.props.children;
    }
}

export function DataManagementPage() {
    return (
        <ErrorBoundary>
            <DataManagementPageContent />
        </ErrorBoundary>
    )
}

function DataManagementPageContent() {
    const { user } = useAuth()
    const { data: observationData, isLoading, error, refetch } = useFieldManagementRecords()
    const observations = useMemo(
        () => (observationData ?? []) as ObservationPageRecord[],
        [observationData]
    )

    React.useEffect(() => {
        if (observations) {
            console.log('DataManagementPage: Received', observations.length, 'observations')
            if (observations.length > 0) {
                console.log('First observation:', observations[0])
            }
        }
    }, [observations])

    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(10)
    const [searchTerm, setSearchTerm] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [viewedObservation, setViewedObservation] = useState<ObservationPageRecord | null>(null)
    const [detailOpen, setDetailOpen] = useState(false)
    const [selectedObservation, setSelectedObservation] = useState<ObservationPageRecord | null>(null)
    const [editOpen, setEditOpen] = useState(false)
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    const isAdmin = hasAdminLevelAccess(user?.role)
    const supportsEditing = true
    const canDeleteRecords = isAdmin

    const filteredObservations = useMemo(() => {
        return observations.filter((observation) =>
            matchesSearchTerm(observation, searchTerm) && matchesDateRange(observation, startDate, endDate)
        )
    }, [observations, searchTerm, startDate, endDate])

    const orderedObservations = useMemo(() => {
        return [...filteredObservations].sort((a, b) => {
            const trialComparison = getTrialSortValue(a).localeCompare(getTrialSortValue(b), undefined, {
                numeric: true,
                sensitivity: 'base',
            })

            if (trialComparison !== 0) {
                return trialComparison
            }

            return (a.date_recorded || a.created_at || '').localeCompare(b.date_recorded || b.created_at || '')
        })
    }, [filteredObservations])

    const handleView = (obs: ObservationPageRecord) => {
        setViewedObservation(obs)
        setDetailOpen(true)
    }

    const handleEdit = (obs: ObservationPageRecord) => {
        if (isMobileObservationRecord(obs) && obs.source_table !== 'observations') {
            alert('Editing is not yet available for records loaded from the live monitoring feed.')
            return
        }

        setSelectedObservation(obs)
        setEditOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!canDeleteRecords) {
            alert('Deleting is only available to administrators.')
            return
        }

        const targetRecord = observations.find((observation) => observation.id === id)
        if (!targetRecord) {
            alert('Unable to find the selected record to delete.')
            return
        }

        if (isMobileObservationRecord(targetRecord) && targetRecord.source_table !== 'observations') {
            alert('Deleting is not yet available for records loaded from the live monitoring feed.')
            return
        }

        if (window.confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
            try {
                await deleteMobileObservationRecord(targetRecord)
                setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id))
                void refetch()
            } catch (err: any) {
                console.error('Failed to delete observation:', err)
                alert(`Failed to delete the record: ${err.message || 'Unknown error'}`)
            }
        }
    }

    const handleSaveEdit = async (updatedObs: FullObservation | MobileObservationRecord) => {
        await updateMobileObservationRecord(updatedObs)
        await refetch()
    }

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10))
        setPage(0)
    }

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress color="primary" />
            </Box>
        )
    }

    if (error) {
        return (
            <Container sx={{ mt: 4 }}>
                <Alert severity="error" variant="filled">Error: {error.message}</Alert>
            </Container>
        )
    }

    const paginatedObservations = orderedObservations.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    )

    return (
        <Container maxWidth="xl" sx={{ pb: 6 }}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshOutlined />}
                        onClick={() => void refetch()}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<DownloadOutlined />}
                        onClick={() => exportToCSV(filteredObservations)}
                        disabled={filteredObservations.length === 0}
                    >
                        Export CSV
                    </Button>
                </Box>
            </Box>

            <Paper sx={{ p: 2, mb: 3, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 12, md: 5 }}>
                        <TextField
                            fullWidth
                            variant="filled"
                            placeholder="Search by field, section, crop type..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                disableUnderline: true,
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search sx={{ color: 'primary.light' }} />
                                    </InputAdornment>
                                ),
                                sx: { borderRadius: 2, bgcolor: 'transparent' },
                            }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3.5 }}>
                        <TextField
                            fullWidth
                            type="date"
                            label="From Date"
                            variant="filled"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            InputProps={{
                                disableUnderline: true,
                                sx: { borderRadius: 2, bgcolor: 'transparent' },
                            }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3.5 }}>
                        <TextField
                            fullWidth
                            type="date"
                            label="To Date"
                            variant="filled"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            InputProps={{
                                disableUnderline: true,
                                sx: { borderRadius: 2, bgcolor: 'transparent' },
                            }}
                        />
                    </Grid>
                </Grid>

                {(searchTerm || startDate || endDate) && (
                    <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Filtering {filteredObservations.length} of {observations.length} records
                        </Typography>
                    </Box>
                )}
            </Paper>

            {selectedIds.length > 0 && (
                <Box sx={{ mb: 2, p: 2, bgcolor: 'info.light', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {selectedIds.length} record{selectedIds.length !== 1 ? 's' : ''} selected
                    </Typography>
                    <Button
                        size="small"
                        variant="contained"
                        color="warning"
                        disabled={!canDeleteRecords}
                        onClick={async () => {
                            if (window.confirm(`Delete ${selectedIds.length} selected record${selectedIds.length !== 1 ? 's' : ''}? This action cannot be undone.`)) {
                                const selectedRecords = (observations || []).filter((observation) => selectedIds.includes(observation.id))

                                if (selectedRecords.length === 0) {
                                    alert('No matching records were found for deletion.')
                                    return
                                }

                                try {
                                    await Promise.all(selectedRecords.map((record) => deleteMobileObservationRecord(record)))
                                    setSelectedIds([])
                                    await refetch()
                                } catch (err: any) {
                                    alert(`Failed to delete records: ${err?.message || 'Unknown error'}`)
                                }
                            }
                        }}
                    >
                        Delete Selected
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                            const selectedObservations = filteredObservations.filter((obs) => selectedIds.includes(obs.id))
                            exportToCSV(selectedObservations)
                        }}
                    >
                        Export Selected
                    </Button>
                    <Button
                        size="small"
                        variant="text"
                        onClick={() => setSelectedIds([])}
                    >
                        Clear Selection
                    </Button>
                </Box>
            )}

            {observations.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
                        No Observation Data Found
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                        No live field-management rows are available right now.
                        {'\n'} This page listens to live monitoring records in real time and also refreshes automatically.
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={() => void refetch()}
                    >
                        Refresh Data
                    </Button>
                </Paper>
            ) : filteredObservations.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
                        No Matching Records
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                        No dated monitoring records match the current filters. Try a different search term or date range.
                    </Typography>
                    <Button
                        variant="outlined"
                        onClick={() => {
                            setSearchTerm('')
                            setStartDate('')
                            setEndDate('')
                        }}
                    >
                        Clear Filters
                    </Button>
                </Paper>
            ) : (
                <>
                    <ObservationTable
                        observations={paginatedObservations}
                        onView={handleView}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        canEdit={supportsEditing}
                        canDelete={canDeleteRecords}
                        selectedIds={selectedIds}
                        onSelectionChange={setSelectedIds}
                    />

                    <TablePagination
                        rowsPerPageOptions={[10, 25, 50]}
                        component="div"
                        count={filteredObservations.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        sx={{ color: 'text.secondary' }}
                    />
                </>
            )}

            <ObservationEditDialog
                open={editOpen}
                onClose={() => setEditOpen(false)}
                observation={selectedObservation}
                onSave={handleSaveEdit}
                mode="edit"
            />
            <ObservationDetailDialog
                open={detailOpen}
                onClose={() => setDetailOpen(false)}
                observation={viewedObservation}
                onGenerateReport={generatePDFReport}
            />
        </Container>
    )
}
