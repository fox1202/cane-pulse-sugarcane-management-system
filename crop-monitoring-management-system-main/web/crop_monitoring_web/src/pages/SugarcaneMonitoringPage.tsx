import { Box, Container } from '@mui/material'
import { SugarcaneMonitoringDashboard } from '@/components/Dashboard/SugarcaneMonitoringDashboard'

export default function SugarcaneMonitoringPage() {
    return (
        <Box sx={{ backgroundColor: '#f5f5f5', minHeight: '100vh', pt: 3, pb: 5 }}>
            <Container maxWidth="lg">
                <SugarcaneMonitoringDashboard />
            </Container>
        </Box>
    )
}
