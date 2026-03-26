import { useState, useEffect } from 'react'
import {
    Container,
    Box,
    Typography,
    Paper,
    Button,
    CircularProgress,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Collapse,
    IconButton,
} from '@mui/material'
import { ExpandMore, ExpandLess, RefreshOutlined } from '@mui/icons-material'
import { supabase } from '@/lib/supabase'

type TableRowData = Record<string, unknown>

interface TableData {
    name: string
    count: number
    data: TableRowData[]
    error: string | null
    loading: boolean
}

const getErrorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : String(error)

export function RawDataViewerPage() {
    const [tables, setTables] = useState<Record<string, TableData>>({})
    const [expanded, setExpanded] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    const tablesToCheck = [
        'observations',
        'observations_raw',
        'field_observations',
        'observation',
        'observation_images',
        'observations_raw_v1',
        'crop_information',
        'crop_monitoring',
        'harvest',
        'soil_characteristics',
        'irrigation_management',
        'nutrient_management',
        'crop_protection',
        'control_methods',
        'residual_management',
        'fields',
        'blocks',
        'profiles',
        'observation_entry_form',
        'sugarcane_monitoring',
    ]

    const loadAllData = async (): Promise<Record<string, TableData>> => {
        console.log('🔍 Fetching ALL data from database...')

        const newTables: Record<string, TableData> = {}

        for (const tableName of tablesToCheck) {
            newTables[tableName] = {
                name: tableName,
                count: 0,
                data: [],
                error: null,
                loading: true,
            }

            try {
                const { data, count, error } = await supabase
                    .from(tableName)
                    .select('*')
                    .limit(100) // First 100 records

                if (error) {
                    console.log(`❌ ${tableName}:`, error.message)
                    newTables[tableName].error = error.message
                } else {
                    console.log(`✅ ${tableName}: ${count || (data?.length ?? 0)} records`)
                    newTables[tableName].count = count || (data?.length ?? 0)
                    newTables[tableName].data = (data as TableRowData[] | null) || []
                }
            } catch (err) {
                const message = getErrorMessage(err)
                console.log(`⚠️ ${tableName}:`, message)
                newTables[tableName].error = message
            }

            newTables[tableName].loading = false
        }

        return newTables
    }

    const fetchAllData = async () => {
        setLoading(true)
        const newTables = await loadAllData()
        setTables(newTables)
        setLoading(false)
    }

    useEffect(() => {
        let isActive = true

        const loadOnMount = async () => {
            const newTables = await loadAllData()
            if (!isActive) return
            setTables(newTables)
            setLoading(false)
        }

        void loadOnMount()

        return () => {
            isActive = false
        }
    }, [])

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h3" fontWeight={900} sx={{ mb: 1 }}>
                    🔍 Raw Database <span style={{ color: '#2196f3' }}>Data Viewer</span>
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>
                    This page shows ALL data directly from your Supabase database, unfiltered. Click any table to expand.
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<RefreshOutlined />}
                    onClick={fetchAllData}
                    disabled={loading}
                >
                    {loading ? 'Fetching...' : 'Refresh All'}
                </Button>
            </Box>

            {/* Summary */}
            <Paper sx={{ p: 3, mb: 4, bgcolor: 'rgba(33, 150, 243, 0.05)', border: '1px solid rgba(33, 150, 243, 0.2)' }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                    📊 Summary
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                    <strong>Tables with data:</strong> {Object.values(tables).filter(t => t.count > 0).length} / {tablesToCheck.length}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                    <strong>Total records across all tables:</strong> {Object.values(tables).reduce((sum, t) => sum + t.count, 0)}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    <strong>Failed tables:</strong> {Object.values(tables).filter(t => t.error).length}
                </Typography>
            </Paper>

            {/* Tables */}
            <Box sx={{ display: 'grid', gap: 3 }}>
                {tablesToCheck.map((tableName) => {
                    const table = tables[tableName]
                    const isExpanded = expanded === tableName
                    const hasError = table?.error
                    const hasData = (table?.count ?? 0) > 0

                    return (
                        <Paper
                            key={tableName}
                            sx={{
                                p: 2,
                                border: hasError ? '2px solid #f44336' : hasData ? '2px solid #4caf50' : '1px solid rgba(255,255,255,0.1)',
                                bgcolor: hasError ? 'rgba(244, 67, 54, 0.05)' : hasData ? 'rgba(76, 175, 80, 0.05)' : 'rgba(255,255,255,0.02)',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setExpanded(isExpanded ? null : tableName)}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                                    {table?.loading ? (
                                        <CircularProgress size={24} />
                                    ) : hasError ? (
                                        <Typography sx={{ color: '#f44336', fontWeight: 600 }}>❌</Typography>
                                    ) : hasData ? (
                                        <Typography sx={{ color: '#4caf50', fontWeight: 600 }}>✅</Typography>
                                    ) : (
                                        <Typography sx={{ color: '#ff9800', fontWeight: 600 }}>⚠️</Typography>
                                    )}
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={600}>
                                            {tableName}
                                        </Typography>
                                        {hasError ? (
                                            <Typography variant="caption" sx={{ color: '#f44336' }}>
                                                Error: {table?.error}
                                            </Typography>
                                        ) : (
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                {table?.count ?? 0} records
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                                <IconButton size="small">
                                    {isExpanded ? <ExpandLess /> : <ExpandMore />}
                                </IconButton>
                            </Box>

                            {/* Collapsed Data */}
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                <Box sx={{ mt: 3, overflow: 'auto', maxHeight: '500px' }}>
                                    {hasData ? (
                                        <TableContainer>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
                                                        {Object.keys(table?.data[0] || {}).map((key) => (
                                                            <TableCell key={key} sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                                                                {key}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {(table?.data || []).map((row, idx) => (
                                                        <TableRow key={idx} sx={{ bgcolor: idx % 2 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                                                            {Object.values(row).map((value, cellIdx) => (
                                                                <TableCell key={cellIdx} sx={{ fontSize: '0.75rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    {value === null || value === undefined ? '-' : typeof value === 'object' ? JSON.stringify(value).substring(0, 50) : String(value).substring(0, 100)}
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    ) : hasError ? (
                                        <Alert severity="error">{table?.error}</Alert>
                                    ) : (
                                        <Alert severity="info">No data in this table</Alert>
                                    )}
                                </Box>
                            </Collapse>
                        </Paper>
                    )
                })}
            </Box>
        </Container>
    )
}
