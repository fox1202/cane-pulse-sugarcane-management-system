import { useState, useEffect } from 'react'
import {
    Box,
    Button,
    Container,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    CircularProgress,
    Chip,
    Grid,
    Card,
    CardContent,
} from '@mui/material'
import { CheckCircleOutline, ErrorOutline, WarningAmberOutlined } from '@mui/icons-material'
import { supabase } from '@/lib/supabase'

interface TableInfo {
    name: string
    exists: boolean
    rowCount: number | null
    error: string | null
    status: 'success' | 'error' | 'loading' | 'warning'
}

interface TestResult {
    name: string
    status: 'success' | 'error' | 'warning'
    message: string
    details?: unknown
}

const getErrorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : String(error)

export default function SupabaseConnectionTest() {
    const [loading, setLoading] = useState(true)
    const [connectionTests, setConnectionTests] = useState<TestResult[]>([])
    const [tables, setTables] = useState<TableInfo[]>([])
    const [envVariables, setEnvVariables] = useState<{ key: string; value: string; valid: boolean }[]>([])
    const [refreshing, setRefreshing] = useState(false)

    const candidateTables = [
        'observations',
        'observation',
        'field_observations',
        'observations_raw',
        'observations_raw_v1',
        'crop_information',
        'crop_monitoring',
        'soil_characteristics',
        'irrigation_management',
        'nutrient_management',
        'crop_protection',
        'control_methods',
        'harvest',
        'residual_management',
        'images',
        'observation_images',
        'blocks',
        'fields',
        'profiles',
        'sugarcane_monitoring',
    ]

    async function runTests() {
        setRefreshing(true)
        const tests: TestResult[] = []
        const tableResults: TableInfo[] = []

        console.log('🧪 Starting Supabase connection tests...')

        // Test 1: Environment Variables
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
        const envVars = [
            { key: 'VITE_SUPABASE_URL', value: supabaseUrl || '', valid: !!supabaseUrl },
            { key: 'VITE_SUPABASE_ANON_KEY', value: supabaseKey ? supabaseKey.substring(0, 20) + '...' : '', valid: !!supabaseKey },
        ]
        setEnvVariables(envVars)

        if (!supabaseUrl || !supabaseKey) {
            tests.push({
                name: 'Environment Variables',
                status: 'error',
                message: 'Missing Supabase environment variables',
                details: 'Check your .env file for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY',
            })
            setConnectionTests(tests)
            setRefreshing(false)
            return
        }

        tests.push({
            name: 'Environment Variables',
            status: 'success',
            message: 'Both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured',
        })

        // Test 2: Supabase Client Initialization
        try {
            if (supabase) {
                tests.push({
                    name: 'Supabase Client',
                    status: 'success',
                    message: 'Supabase client is initialized',
                })
            }
        } catch (error) {
            tests.push({
                name: 'Supabase Client',
                status: 'error',
                message: 'Failed to initialize Supabase client',
                details: getErrorMessage(error),
            })
        }

        // Test 3: Basic Connectivity (try to fetch users table or any accessible table)
        try {
            console.log('🔗 Testing connectivity...')
            const { data: authData, error: authError } = await supabase.auth.getSession()
            
            if (authError) {
                tests.push({
                    name: 'Authentication Status',
                    status: 'warning',
                    message: 'Auth check returned a warning',
                    details: authError.message,
                })
            } else {
                tests.push({
                    name: 'Authentication Status',
                    status: authData?.session ? 'success' : 'warning',
                    message: authData?.session ? 'User is authenticated' : 'No active user session (using anon key)',
                })
            }
        } catch (error) {
            tests.push({
                name: 'Authentication Status',
                status: 'error',
                message: 'Failed to check authentication',
                details: getErrorMessage(error),
            })
        }

        // Test 4: Table Detection
        console.log('📊 Checking database tables...')
        for (const tableName of candidateTables) {
            try {
                const { count, error } = await supabase
                    .from(tableName)
                    .select('*', { count: 'exact', head: true })

                if (error) {
                    const msg = String(error.message || error)
                    const tableExists = !/relation|does not exist|undefined table/i.test(msg)
                    tableResults.push({
                        name: tableName,
                        exists: tableExists,
                        rowCount: null,
                        error: msg,
                        status: tableExists ? 'warning' : 'error',
                    })
                } else {
                    tableResults.push({
                        name: tableName,
                        exists: true,
                        rowCount: count,
                        error: null,
                        status: 'success',
                    })
                }
            } catch (err) {
                tableResults.push({
                    name: tableName,
                    exists: false,
                    rowCount: null,
                    error: getErrorMessage(err),
                    status: 'error',
                })
            }
        }

        // Test 5: Sample Data Query
        const existingTables = tableResults.filter(t => t.exists && t.rowCount && t.rowCount > 0)
        if (existingTables.length > 0) {
            try {
                const testTable = existingTables[0]
                console.log(`🧪 Testing sample query on table: ${testTable.name}`)
                const { data, error } = await supabase
                    .from(testTable.name)
                    .select('*')
                    .limit(1)

                if (error) {
                    tests.push({
                        name: 'Sample Data Query',
                        status: 'error',
                        message: `Failed to query ${testTable.name} table`,
                        details: error.message,
                    })
                } else {
                    tests.push({
                        name: 'Sample Data Query',
                        status: 'success',
                        message: `Successfully queried ${testTable.name} table`,
                        details: `Sample record structure: ${JSON.stringify(data?.[0])}`,
                    })
                }
            } catch (error) {
                tests.push({
                    name: 'Sample Data Query',
                    status: 'error',
                    message: 'Failed to execute sample query',
                    details: getErrorMessage(error),
                })
            }
        } else {
            tests.push({
                name: 'Sample Data Query',
                status: 'warning',
                message: 'No tables with data found for sample query',
            })
        }

        // Test 6: Observations Table Specific
        try {
            console.log('🔍 Testing observations table specifically...')
            const { data, count, error } = await supabase
                .from('observations')
                .select('*', { count: 'exact' })
                .limit(5)

            if (error) {
                if (/relation|does not exist/.test(error.message)) {
                    tests.push({
                        name: 'Observations Table',
                        status: 'error',
                        message: 'observations table does not exist',
                        details: 'Create the observations table or check if data is in a different table',
                    })
                } else {
                    tests.push({
                        name: 'Observations Table',
                        status: 'error',
                        message: 'Failed to query observations table',
                        details: error.message,
                    })
                }
            } else {
                tests.push({
                    name: 'Observations Table',
                    status: 'success',
                    message: `observations table contains ${count || 0} records`,
                    details: data && data.length > 0 ? `Sample: ${JSON.stringify(data[0])}` : 'Table is empty',
                })
            }
        } catch (error) {
            tests.push({
                name: 'Observations Table',
                status: 'error',
                message: 'Exception testing observations table',
                details: getErrorMessage(error),
            })
        }

        setConnectionTests(tests)
        setTables(tableResults.sort((a, b) => {
            // Sort by: success first, then by exists, then by name
            const aScore = a.status === 'success' ? 0 : a.status === 'warning' ? 1 : 2
            const bScore = b.status === 'success' ? 0 : b.status === 'warning' ? 1 : 2
            if (aScore !== bScore) return aScore - bScore
            return a.name.localeCompare(b.name)
        }))
        setRefreshing(false)
        console.log('✅ Supabase connection tests completed')
    }

    useEffect(() => {
        runTests()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setLoading(false)
    }, [connectionTests])

    const successCount = connectionTests.filter(t => t.status === 'success').length
    const errorCount = connectionTests.filter(t => t.status === 'error').length
    const warningCount = connectionTests.filter(t => t.status === 'warning').length
    const tableExistCount = tables.filter(t => t.exists).length
    const tableWithDataCount = tables.filter(t => t.rowCount && t.rowCount > 0).length

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2 }}>
                    🔗 Supabase Connection Diagnostics
                </Typography>
                <Typography variant="body1" color="textSecondary">
                    Comprehensive test of your Supabase connection, configuration, and data availability.
                </Typography>
            </Box>

            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{ bgcolor: 'success.light', color: 'success.dark' }}>
                        <CardContent>
                            <Typography color="inherit" variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                ✅ Passed Tests
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                                {successCount}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{ bgcolor: 'warning.light', color: 'warning.dark' }}>
                        <CardContent>
                            <Typography color="inherit" variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                ⚠️ Warnings
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                                {warningCount}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{ bgcolor: 'error.light', color: 'error.dark' }}>
                        <CardContent>
                            <Typography color="inherit" variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                ❌ Failed Tests
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                                {errorCount}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{ bgcolor: 'info.light', color: 'info.dark' }}>
                        <CardContent>
                            <Typography color="inherit" variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                📊 Tables Found
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                                {tableExistCount}/{tables.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Action Buttons */}
            <Box sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button variant="contained" onClick={runTests} disabled={refreshing}>
                    {refreshing ? <CircularProgress size={20} sx={{ mr: 1 }} /> : '🔄'} Refresh Tests
                </Button>
                <Button
                    variant="outlined"
                    onClick={() => {
                        console.log('📋 Connection Test Results:', {
                            connectionTests,
                            tables: tables.filter(t => t.exists),
                            summary: { successCount, warningCount, errorCount, tableExistCount, tableWithDataCount },
                        })
                        alert('Results copied to console (F12)')
                    }}
                >
                    📋 Copy to Console
                </Button>
            </Box>

            {/* Environment Variables Section */}
            <Paper sx={{ mb: 4, p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                    🔑 Environment Variables
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {envVariables.map(env => (
                        <Box key={env.key} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 1 }}>
                            {env.valid ? (
                                <CheckCircleOutline sx={{ color: 'success.main' }} />
                            ) : (
                                <ErrorOutline sx={{ color: 'error.main' }} />
                            )}
                            <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 200 }}>
                                {env.key}
                            </Typography>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', flex: 1 }}>
                                {env.value || '(empty)'}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            </Paper>

            {/* Connection Tests Section */}
            <Paper sx={{ mb: 4, p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                    🧪 Connection Tests
                </Typography>
                {loading ? (
                    <CircularProgress />
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {connectionTests.map((test, idx) => (
                            <Box key={idx} sx={{ p: 2, border: '1px solid rgba(0,0,0,0.1)', borderRadius: 1, bgcolor: 'rgba(0,0,0,0.01)' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                    {test.status === 'success' && <CheckCircleOutline sx={{ color: 'success.main' }} />}
                                    {test.status === 'warning' && <WarningAmberOutlined sx={{ color: 'warning.main' }} />}
                                    {test.status === 'error' && <ErrorOutline sx={{ color: 'error.main' }} />}
                                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                        {test.name}
                                    </Typography>
                                    <Chip
                                        label={test.status.toUpperCase()}
                                        size="small"
                                        color={test.status === 'success' ? 'success' : test.status === 'warning' ? 'warning' : 'error'}
                                        variant="outlined"
                                    />
                                </Box>
                                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                                    {test.message}
                                </Typography>
                                {test.details != null && (
                                    <Box sx={{ p: 1.5, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.75rem', maxHeight: 200, overflow: 'auto' }}>
                                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                            {typeof test.details === 'string' ? test.details : JSON.stringify(test.details, null, 2)}
                                        </pre>
                                    </Box>
                                )}
                            </Box>
                        ))}
                    </Box>
                )}
            </Paper>

            {/* Tables Section */}
            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                    📊 Database Tables ({tableExistCount}/{tables.length} exist, {tableWithDataCount} have data)
                </Typography>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.05)' }}>
                                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Table Name</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">
                                    Row Count
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Error Details</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {tables.map(table => (
                                <TableRow key={table.name} sx={{ bgcolor: table.status === 'success' ? 'rgba(76,175,80,0.05)' : table.status === 'warning' ? 'rgba(255,193,7,0.05)' : 'rgba(244,67,54,0.05)' }}>
                                    <TableCell>
                                        {table.status === 'success' ? (
                                            <CheckCircleOutline sx={{ color: 'success.main' }} />
                                        ) : table.status === 'warning' ? (
                                            <WarningAmberOutlined sx={{ color: 'warning.main' }} />
                                        ) : (
                                            <ErrorOutline sx={{ color: 'error.main', opacity: 0.5 }} />
                                        )}
                                    </TableCell>
                                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                                        {table.name}
                                    </TableCell>
                                    <TableCell align="right">
                                        {table.rowCount !== null ? (
                                            <Chip label={table.rowCount} size="small" color={table.rowCount > 0 ? 'success' : 'default'} />
                                        ) : (
                                            <Typography variant="caption" color="textSecondary">
                                                N/A
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {table.error ? (
                                            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'error.main' }}>
                                                {table.error}
                                            </Typography>
                                        ) : (
                                            <Typography variant="caption" color="textSecondary">
                                                —
                                            </Typography>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Data Tables Summary */}
                <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        📌 Key Tables:
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {(() => {
                            const obsTable = tables.find(t => t.name === 'observations')
                            const obsTables = tables.filter(t => t.exists && t.name.includes('observation'))
                            return (
                                <>
                                    <Typography variant="caption">
                                        <strong>Observations:</strong>{' '}
                                        {obsTable ? (
                                            <>
                                                ✅ Found ({obsTable.rowCount || 0} rows)
                                            </>
                                        ) : obsTables.length > 0 ? (
                                            <>
                                                ⚠️ Not found. Similar tables: {obsTables.map(t => t.name).join(', ')}
                                            </>
                                        ) : (
                                            <>❌ Not found</>
                                        )}
                                    </Typography>
                                    {tables.filter(t => t.exists && /crop_information|crop_monitoring|harvest/i.test(t.name)).length > 0 && (
                                        <Typography variant="caption">
                                            <strong>Related Tables:</strong> {tables.filter(t => t.exists && /crop_information|crop_monitoring|harvest/i.test(t.name)).map(t => `${t.name} (${t.rowCount} rows)`).join(', ')}
                                        </Typography>
                                    )}
                                </>
                            )
                        })()}
                    </Box>
                </Box>
            </Paper>
        </Container>
    )
}
