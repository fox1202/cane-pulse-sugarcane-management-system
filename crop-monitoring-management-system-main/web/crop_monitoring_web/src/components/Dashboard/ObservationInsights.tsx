import React, { useMemo } from 'react'
import {
    Box,
    Typography,
    Paper,
    LinearProgress,
    Grid,
    useTheme,
    alpha,
    Chip,
} from '@mui/material'
import {
    CheckCircleOutline,
    WarningAmberOutlined,
    TrendingUpOutlined,
    WaterDropOutlined,
} from '@mui/icons-material'
import { FullObservation } from '@/types/database.types'
import {
    getAverageObservationValue,
    isMeaningfulStressValue,
    toFiniteObservationNumber,
} from '@/utils/observationAnalytics'

interface ObservationInsightsProps {
    observations: FullObservation[]
}

export const ObservationInsights: React.FC<ObservationInsightsProps> = ({ observations }) => {
    const theme = useTheme()

    const insights = useMemo(() => {
        if (!observations || observations.length === 0) {
            return {
                totalObservations: 0,
                healthyFields: 0,
                stressedFields: 0,
                avgCanopy: 0,
                avgMoisture: 0,
                avgYield: 0,
                varietyDistribution: [] as { label: string; count: number; percentage: number }[],
                vigorDistribution: { good: 0, medium: 0, poor: 0, total: 0 },
                irrigationTypes: [] as { type: string; count: number }[],
            }
        }

        const totalObs = observations.length
        const stressedCount = observations.filter((obs) => isMeaningfulStressValue(obs.crop_monitoring?.stress)).length
        const healthyCount = totalObs - stressedCount

        const avgCanopy = getAverageObservationValue(observations, (obs) => obs.crop_monitoring?.canopy_cover) ?? 0
        const avgMoisture = getAverageObservationValue(observations, (obs) => obs.irrigation_management?.soil_moisture_percentage) ?? 0

        const yieldValues = observations
            .map((obs) => toFiniteObservationNumber(obs.harvest?.yield))
            .filter((value): value is number => value !== null && value > 0)
        const avgYield = yieldValues.length > 0
            ? yieldValues.reduce((sum, value) => sum + value, 0) / yieldValues.length
            : 0

        const varieties = new Map<string, number>()
        observations.forEach(obs => {
            const label = obs.crop_information?.variety || 'Unknown variety'
            varieties.set(label, (varieties.get(label) || 0) + 1)
        })
        const varietyDistribution = Array.from(varieties.entries())
            .map(([label, count]) => ({
                label,
                count,
                percentage: (count / totalObs) * 100,
            }))
            .sort((a, b) => b.count - a.count)

        // Vigor distribution
        let goodVigor = 0, mediumVigor = 0, poorVigor = 0
        observations.forEach(obs => {
            const vigor = obs.crop_monitoring?.crop_vigor?.toLowerCase()
            if (vigor === 'good') goodVigor++
            else if (vigor === 'medium') mediumVigor++
            else if (vigor === 'poor') poorVigor++
        })

        // Irrigation types
        const irrigationTypes = new Map<string, number>()
        observations.forEach(obs => {
            const type = obs.irrigation_management?.irrigation_type || 'Unknown'
            irrigationTypes.set(type, (irrigationTypes.get(type) || 0) + 1)
        })
        const irrigationTypeArray = Array.from(irrigationTypes.entries())
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count)

        return {
            totalObservations: totalObs,
            healthyFields: healthyCount,
            stressedFields: stressedCount,
            avgCanopy: parseFloat(avgCanopy.toFixed(1)),
            avgMoisture: parseFloat(avgMoisture.toFixed(1)),
            avgYield: parseFloat(avgYield.toFixed(2)),
            varietyDistribution,
            vigorDistribution: {
                good: goodVigor,
                medium: mediumVigor,
                poor: poorVigor,
                total: goodVigor + mediumVigor + poorVigor,
            },
            irrigationTypes: irrigationTypeArray,
        }
    }, [observations])

    if (observations.length === 0) {
        return (
            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: alpha(theme.palette.background.paper, 0.5) }}>
                <Typography color="textSecondary">No observation data available</Typography>
            </Paper>
        )
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Key Metrics */}
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.success.main, 0.08) }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <CheckCircleOutline sx={{ color: theme.palette.success.main, fontSize: 20 }} />
                            <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 600 }}>
                                Healthy Fields
                            </Typography>
                        </Box>
                        <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.success.main }}>
                            {insights.healthyFields}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                            {((insights.healthyFields / insights.totalObservations) * 100).toFixed(0)}% of total
                        </Typography>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.error.main, 0.08) }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <WarningAmberOutlined sx={{ color: theme.palette.error.main, fontSize: 20 }} />
                            <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 600 }}>
                                Stressed Fields
                            </Typography>
                        </Box>
                        <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.error.main }}>
                            {insights.stressedFields}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                            {((insights.stressedFields / insights.totalObservations) * 100).toFixed(0)}% of total
                        </Typography>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.08) }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <TrendingUpOutlined sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                            <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 600 }}>
                                Avg Canopy Cover
                            </Typography>
                        </Box>
                        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                            {insights.avgCanopy}%
                        </Typography>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.08) }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <WaterDropOutlined sx={{ color: theme.palette.info.main, fontSize: 20 }} />
                            <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 600 }}>
                                Avg Soil Moisture
                            </Typography>
                        </Box>
                        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                            {insights.avgMoisture}%
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Vigor Distribution */}
            {insights.vigorDistribution.total > 0 && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                        Crop Vigor Status
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Box sx={{ flex: 1, minWidth: 100 }}>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                                Good
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={(insights.vigorDistribution.good / insights.vigorDistribution.total) * 100}
                                sx={{ height: 8, borderRadius: 4, bgcolor: alpha(theme.palette.success.main, 0.2) }}
                            />
                            <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                                {insights.vigorDistribution.good} fields
                            </Typography>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 100 }}>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                                Medium
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={(insights.vigorDistribution.medium / insights.vigorDistribution.total) * 100}
                                sx={{ height: 8, borderRadius: 4, bgcolor: alpha(theme.palette.warning.main, 0.2) }}
                            />
                            <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                                {insights.vigorDistribution.medium} fields
                            </Typography>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 100 }}>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                                Poor
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={(insights.vigorDistribution.poor / insights.vigorDistribution.total) * 100}
                                sx={{ height: 8, borderRadius: 4, bgcolor: alpha(theme.palette.error.main, 0.2) }}
                            />
                            <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                                {insights.vigorDistribution.poor} fields
                            </Typography>
                        </Box>
                    </Box>
                </Paper>
            )}

            {/* Irrigation Types */}
            {insights.irrigationTypes.length > 0 && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                        Irrigation Methods
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {insights.irrigationTypes.map(({ type, count }) => (
                            <Chip
                                key={type}
                                label={`${type} (${count})`}
                                variant="outlined"
                                size="small"
                                color="primary"
                            />
                        ))}
                    </Box>
                </Paper>
            )}
        </Box>
    )
}
