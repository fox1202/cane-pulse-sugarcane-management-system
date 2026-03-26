import { useEffect, useState } from 'react'
import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, CircularProgress } from '@mui/material'
import { supabase } from '@/lib/supabase'

type Result = {
  table: string
  exists: boolean
  count?: number | null
  error?: string
}

const candidateTables = [
  'observations',
  'observation',
  'field_observations',
  'observations_raw',
  'crop_information',
  'crop_info',
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
  'observation_entry_form',
  'sugarcane_monitoring',
]

export default function DebugDbPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Result[]>([])

  async function runChecks() {
    setLoading(true)
    const out: Result[] = []

    for (const table of candidateTables) {
      try {
        // Try to select a count for the table
        const { data, error, count } = await supabase.from(table).select('id', { count: 'exact' })

        if (error) {
          // If error mentions relation does not exist, mark as not exists
          const msg = String(error.message || error)
          const exists = !/relation|does not exist|undefined table/i.test(msg)
          out.push({ table, exists: exists, error: msg })
        } else {
          out.push({ table, exists: true, count: count ?? (data ? data.length : 0) })
        }
      } catch (err: any) {
        out.push({ table, exists: false, error: String(err.message || err) })
      }
    }

    setResults(out)
    setLoading(false)
  }

  useEffect(() => {
    runChecks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom>Database Table Diagnostics</Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>This page attempts to detect common table names and row counts so you can verify where mobile app data is stored.</Typography>

      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={runChecks} disabled={loading}>Refresh</Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Table</TableCell>
                <TableCell>Exists</TableCell>
                <TableCell>Row Count</TableCell>
                <TableCell>Error</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map(r => (
                <TableRow key={r.table}>
                  <TableCell>{r.table}</TableCell>
                  <TableCell>{r.exists ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{typeof r.count === 'number' ? r.count : '-'}</TableCell>
                  <TableCell>{r.error ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}
