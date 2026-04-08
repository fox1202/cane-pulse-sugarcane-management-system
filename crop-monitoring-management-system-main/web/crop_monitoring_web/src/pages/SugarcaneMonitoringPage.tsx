import { Box, Container } from '@mui/material'
import { SugarcaneMonitoringDashboard } from '@/components/Dashboard/SugarcaneMonitoringDashboard'

export default function SugarcaneMonitoringPage() {
    return (
        <Box
            sx={{
                minHeight: '100vh',
                pt: 3,
                pb: 5,
                backgroundImage: `
                    radial-gradient(circle at top left, rgba(219, 235, 219, 0.78), transparent 22%),
                    radial-gradient(circle at bottom right, rgba(242, 220, 201, 0.72), transparent 20%),
                    linear-gradient(180deg, #f6f7f2 0%, #eef3ea 100%)
                `,
            }}
        >
            <Container maxWidth="xl">
                <SugarcaneMonitoringDashboard />
            </Container>
        </Box>
    )
}
