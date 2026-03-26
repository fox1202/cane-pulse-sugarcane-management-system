
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Alert, Box, CircularProgress, Typography, Paper, Button } from '@mui/material'
import { CheckCircle, Error as ErrorIcon, Warning } from '@mui/icons-material'

type ConnectionStatus = 'loading' | 'connected' | 'error' | 'empty' | 'permission_denied'

export default function DatabaseConnectionDebugger() {
    const [status, setStatus] = useState<ConnectionStatus>('loading')
    const [details, setDetails] = useState<string | null>(null)
    const [tableName] = useState<string>('observations') // Removed setTableName
    const [retryCount, setRetryCount] = useState(0)

    useEffect(() => {
        async function checkConnection() {
            setStatus('loading')
            console.log('--- Database Connection Check Started ---')
            console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL ? 'PRESENT' : 'MISSING')
            console.log('Online Status:', navigator.onLine ? 'ONLINE' : 'OFFLINE')

            try {
                if (!navigator.onLine) {
                    throw new Error('Browser reports as OFFLINE. Check your network connection.')
                }

                // 1. Check Auth Session
                console.log('Checking Auth Session...')
                const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

                if (sessionError) {
                    console.error('Auth Check Failed:', sessionError)
                    throw new Error(`Auth Error: ${sessionError.message}`)
                }

                if (!sessionData.session) {
                    console.warn('No active session found.')
                    setStatus('permission_denied')
                    setDetails('No active session found. Please log in.')
                    return
                }

                console.log('Authenticated as:', sessionData.session.user.email)

                // 2. Check Table Access (observations)
                console.log(`Checking table access: ${tableName}`)
                const { error, count } = await supabase
                    .from(tableName)
                    .select('id', { count: 'exact', head: true })

                if (error) {
                    console.error('Database Query Error:', error)
                    // Check specific error codes
                    if (error.code === '42P01') {
                        throw new Error(`Table '${tableName}' does not exist. Migration required.`)
                    } else if (error.code === '42501' || error.message.includes('permission denied')) {
                        setStatus('permission_denied')
                        setDetails(`Permission denied for table '${tableName}'. Check RLS policies.`)
                        return
                    } else {
                        throw error
                    }
                }

                console.log(`Connection successful. Record count: ${count}`)

                // 3. Check Data Presence
                if (count === 0) {
                    setStatus('empty')
                    setDetails(`Connected to '${tableName}', but the table is empty.`)
                } else {
                    setStatus('connected')
                    setDetails(`Successfully connected. Found ${count} records in '${tableName}'.`)
                }

            } catch (err: any) {
                console.error('--- Connection Check Failed ---')
                console.error('Full Error Object:', err)
                if (err instanceof TypeError && err.message === 'Failed to fetch') {
                    console.error('This is a NetworkError! Common causes: CORS, AdBlock, or no internet.')
                }
                setStatus('error')
                setDetails(err.message || 'Unknown network or database error.')
            }
        }

        checkConnection()
    }, [tableName, retryCount])

    const handleRetry = () => setRetryCount(prev => prev + 1)

    return (
        <Paper elevation={3} sx={{ p: 3, m: 2, borderRadius: 2 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6" fontWeight="bold">Database Diagnostics</Typography>
                <Button size="small" variant="outlined" onClick={handleRetry}>Retry</Button>
            </Box>

            {status === 'loading' && (
                <Box display="flex" alignItems="center" gap={2}>
                    <CircularProgress size={20} />
                    <Typography>Checking connection to <b>{tableName}</b>...</Typography>
                </Box>
            )}

            {status === 'connected' && (
                <Alert icon={<CheckCircle fontSize="inherit" />} severity="success">
                    {details}
                </Alert>
            )}

            {status === 'empty' && (
                <Alert icon={<Warning fontSize="inherit" />} severity="warning">
                    {details}
                </Alert>
            )}

            {status === 'permission_denied' && (
                <Alert icon={<ErrorIcon fontSize="inherit" />} severity="error">
                    {details}
                </Alert>
            )}

            {status === 'error' && (
                <Alert icon={<ErrorIcon fontSize="inherit" />} severity="error">
                    <b>Connection Failed:</b> {details}
                </Alert>
            )}
        </Paper>
    )
}
