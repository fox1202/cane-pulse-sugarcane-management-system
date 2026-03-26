import React, { useMemo } from 'react'
import {
    Box,
    Typography,
    Paper,
    useTheme,
    alpha,
} from '@mui/material'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
    Legend,
    Tooltip as RechartsTooltip,
} from 'recharts'
import { FullObservation } from '@/types/database.types'
import { format, parseISO } from 'date-fns'
import {
    isMeaningfulStressValue,
    toFiniteObservationNumber,
} from '@/utils/observationAnalytics'

interface ObservationTrendsProps {
    observations: FullObservation[]
}

type TrendGroup = {
    date: string
    canopyAvg: number
    moistureAvg: number
    yieldAvg: number
    canopyCount: number
    moistureCount: number
    yieldCount: number
    stressedCount: number
    healthyCount: number
    totalCount: number
}

export const ObservationTrends: React.FC<ObservationTrendsProps> = ({ observations }) => {
    const theme = useTheme()

    const trendData = useMemo(() => {
        if (!observations || observations.length === 0) return []

        // Group observations by date
        const groupedByDate = new Map<string, TrendGroup>()

        observations.forEach(obs => {
            const date = format(parseISO(obs.date_recorded), 'yyyy-MM-dd')
            const existing = groupedByDate.get(date) || {
                date,
                canopyAvg: 0,
                moistureAvg: 0,
                yieldAvg: 0,
                canopyCount: 0,
                moistureCount: 0,
                yieldCount: 0,
                stressedCount: 0,
                healthyCount: 0,
                totalCount: 0,
            }

            const canopy = toFiniteObservationNumber(obs.crop_monitoring?.canopy_cover)
            const moisture = toFiniteObservationNumber(obs.irrigation_management?.soil_moisture_percentage)
            const yieldValue = toFiniteObservationNumber(obs.harvest?.yield)

            if (canopy !== null) {
                existing.canopyAvg += canopy
                existing.canopyCount++
            }

            if (moisture !== null) {
                existing.moistureAvg += moisture
                existing.moistureCount++
            }

            if (yieldValue !== null && yieldValue > 0) {
                existing.yieldAvg += yieldValue
                existing.yieldCount++
            }

            if (isMeaningfulStressValue(obs.crop_monitoring?.stress)) {
                existing.stressedCount++
            } else {
                existing.healthyCount++
            }
            existing.totalCount++
            groupedByDate.set(date, existing)
        })

        // Calculate averages and sort by date
        return Array.from(groupedByDate.values())
            .map(group => ({
                date: format(parseISO(group.date), 'MMM dd'),
                canopy: parseFloat(((group.canopyCount > 0 ? group.canopyAvg / group.canopyCount : 0)).toFixed(1)),
                moisture: parseFloat(((group.moistureCount > 0 ? group.moistureAvg / group.moistureCount : 0)).toFixed(1)),
                yield: parseFloat(((group.yieldCount > 0 ? group.yieldAvg / group.yieldCount : 0)).toFixed(2)),
                healthy: group.healthyCount,
                stressed: group.stressedCount,
            }))
            .sort((a, b) => {
                const dateA = new Date(a.date).getTime()
                const dateB = new Date(b.date).getTime()
                return dateA - dateB
            })
    }, [observations])

    if (trendData.length === 0) {
        return (
            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: alpha(theme.palette.background.paper, 0.5) }}>
                <Typography color="textSecondary">No trend data available</Typography>
            </Paper>
        )
    }

    return (
        <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                Field Health Trends Over Time
            </Typography>
            <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(27,94,32,0.08)" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                        />
                        <RechartsTooltip
                            contentStyle={{
                                backgroundColor: '#ffffff',
                                border: `1px solid ${theme.palette.primary.main}`,
                                borderRadius: 8,
                            }}
                            cursor={{ strokeDasharray: '3 3' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: 20 }} />
                        <Line
                            type="monotone"
                            dataKey="canopy"
                            stroke={theme.palette.primary.main}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            name="Avg Canopy Cover %"
                        />
                        <Line
                            type="monotone"
                            dataKey="moisture"
                            stroke={theme.palette.info.main}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            name="Avg Soil Moisture %"
                        />
                        <Line
                            type="monotone"
                            dataKey="yield"
                            stroke={theme.palette.success.main}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            name="Avg Yield (t/ha)"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </Box>
            <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'text.secondary', fontStyle: 'italic', textAlign: 'center' }}>
                Trends based on daily average values from all observations
            </Typography>
        </Paper>
    )
}
