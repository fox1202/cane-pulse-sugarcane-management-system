import { useMemo, useState } from 'react';
import {
    Typography,
    Box,
    useTheme,
    alpha,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Line,
    ComposedChart,
    Bar,
    ScatterChart,
    Scatter,
} from 'recharts';
import { FullObservation } from '@/types/database.types';
import { format } from 'date-fns';

interface FertilizerPerformanceChartProps {
    data: FullObservation[];
}

export const FertilizerPerformanceChart: React.FC<FertilizerPerformanceChartProps> = ({ data }) => {
    const theme = useTheme();
    const [chartType, setChartType] = useState<'rate' | 'vigor' | 'moisture'>('rate');

    const chartData = useMemo(() => {
        return data
            .filter(obs => obs.nutrient_management?.application_rate && (obs.crop_monitoring?.canopy_cover || obs.harvest?.yield))
            .map(obs => ({
                name: obs.field_name,
                rate: obs.nutrient_management?.application_rate || 0,
                canopy: obs.crop_monitoring?.canopy_cover || 0,
                yield: obs.harvest?.yield || 0,
                vigor: obs.crop_monitoring?.crop_vigor === 'good' ? 3 : obs.crop_monitoring?.crop_vigor === 'medium' ? 2 : 1,
                vigorLabel: obs.crop_monitoring?.crop_vigor || 'unknown',
                moisture: obs.irrigation_management?.soil_moisture_percentage || 0,
                date: format(new Date(obs.nutrient_management?.application_date || obs.date_recorded), 'MMM dd'),
                variety: obs.crop_information?.variety,
                fertilizer: obs.nutrient_management?.fertilizer_type,
                stress: obs.crop_monitoring?.stress === 'yes' || obs.crop_monitoring?.stress === 'Yes' ? 1 : 0,
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [data]);

    if (chartData.length === 0) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400, bgcolor: alpha(theme.palette.background.paper, 0.05), borderRadius: 4 }}>
                <Typography color="text.secondary">No performance data available for selected filters</Typography>
            </Box>
        );
    }

    // Calculate statistics
    const avgRate = (chartData.reduce((sum, d) => sum + d.rate, 0) / chartData.length).toFixed(1);
    const avgCanopy = (chartData.reduce((sum, d) => sum + d.canopy, 0) / chartData.length).toFixed(1);
    const avgYield = (chartData.reduce((sum, d) => sum + d.yield, 0) / chartData.length).toFixed(1);
    const stressedCount = chartData.filter(d => d.stress === 1).length;

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={800}>
                    Fertilizer Performance Analysis
                </Typography>
                <ToggleButtonGroup
                    value={chartType}
                    exclusive
                    onChange={(_, newType) => newType && setChartType(newType)}
                    size="small"
                >
                    <ToggleButton value="rate">vs Application Rate</ToggleButton>
                    <ToggleButton value="vigor">vs Vigor</ToggleButton>
                    <ToggleButton value="moisture">vs Moisture</ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {/* Statistics */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: 1, flex: 1, minWidth: 150 }}>
                    <Typography variant="caption" color="text.secondary">Avg Fertilizer Rate</Typography>
                    <Typography variant="h6" fontWeight={800}>{avgRate} kg/ha</Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: 1, flex: 1, minWidth: 150 }}>
                    <Typography variant="caption" color="text.secondary">Avg Canopy Cover</Typography>
                    <Typography variant="h6" fontWeight={800}>{avgCanopy}%</Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: 1, flex: 1, minWidth: 150 }}>
                    <Typography variant="caption" color="text.secondary">Avg Yield</Typography>
                    <Typography variant="h6" fontWeight={800}>{avgYield} t/ha</Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.error.main, 0.1), borderRadius: 1, flex: 1, minWidth: 150 }}>
                    <Typography variant="caption" color="text.secondary">Stressed Fields</Typography>
                    <Typography variant="h6" fontWeight={800}>{stressedCount}</Typography>
                </Box>
            </Box>

            {/* Chart */}
            <Box sx={{ height: 450 }}>
                <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'rate' ? (
                        <ComposedChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(27,94,32,0.08)" />
                            <XAxis
                                dataKey="rate"
                                name="Rate"
                                unit="kg/ha"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                            />
                            <YAxis
                                yAxisId="left"
                                name="Canopy"
                                unit="%"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                name="Yield"
                                unit="t/ha"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid rgba(27,94,32,0.2)', borderRadius: 12 }}
                                cursor={{ strokeDasharray: '3 3' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload;
                                        return (
                                            <Box sx={{ p: 2, bgcolor: '#ffffff', border: '1px solid rgba(27,94,32,0.2)', borderRadius: 3 }}>
                                                <Typography variant="subtitle2" fontWeight={800} color="primary.light">{d.name}</Typography>
                                                <Typography variant="caption" display="block" color="text.secondary">Fertilizer: {d.fertilizer}</Typography>
                                                <Box sx={{ mt: 1, borderTop: '1px solid rgba(27,94,32,0.12)', pt: 1 }}>
                                                    <Typography variant="body2">Rate: {d.rate} kg/ha</Typography>
                                                    <Typography variant="body2">Canopy: {d.canopy}%</Typography>
                                                    <Typography variant="body2">Yield: {d.yield} t/ha</Typography>
                                                    <Typography variant="body2">Vigor: {d.vigorLabel}</Typography>
                                                    <Typography variant="body2">Stressed: {d.stress === 1 ? 'Yes' : 'No'}</Typography>
                                                </Box>
                                            </Box>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: 20 }} />
                            <Bar yAxisId="left" dataKey="canopy" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} name="Canopy Cover %" barSize={30} />
                            <Line yAxisId="right" type="monotone" dataKey="yield" stroke={theme.palette.primary.light} strokeWidth={3} dot={{ r: 4 }} name="Yield (t/ha)" />
                        </ComposedChart>
                    ) : chartType === 'vigor' ? (
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(27,94,32,0.08)" />
                            <XAxis
                                type="number"
                                dataKey="vigor"
                                name="Vigor"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                            />
                            <YAxis
                                type="number"
                                dataKey="canopy"
                                name="Canopy %"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid rgba(27,94,32,0.2)', borderRadius: 12 }}
                                cursor={{ strokeDasharray: '3 3' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload;
                                        return (
                                            <Box sx={{ p: 2, bgcolor: '#ffffff', border: '1px solid rgba(27,94,32,0.2)', borderRadius: 3 }}>
                                                <Typography variant="subtitle2" fontWeight={800}>{d.name}</Typography>
                                                <Typography variant="body2">Vigor: {d.vigorLabel}</Typography>
                                                <Typography variant="body2">Canopy: {d.canopy}%</Typography>
                                                <Typography variant="body2">Yield: {d.yield} t/ha</Typography>
                                            </Box>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Scatter name="Fields" data={chartData} fill={theme.palette.primary.main} />
                        </ScatterChart>
                    ) : (
                        <ComposedChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(27,94,32,0.08)" />
                            <XAxis
                                dataKey="moisture"
                                name="Moisture"
                                unit="%"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                            />
                            <YAxis
                                yAxisId="left"
                                name="Canopy"
                                unit="%"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                name="Yield"
                                unit="t/ha"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid rgba(27,94,32,0.2)', borderRadius: 12 }}
                                cursor={{ strokeDasharray: '3 3' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload;
                                        return (
                                            <Box sx={{ p: 2, bgcolor: '#ffffff', border: '1px solid rgba(27,94,32,0.2)', borderRadius: 3 }}>
                                                <Typography variant="subtitle2" fontWeight={800}>{d.name}</Typography>
                                                <Typography variant="body2">Soil Moisture: {d.moisture}%</Typography>
                                                <Typography variant="body2">Canopy: {d.canopy}%</Typography>
                                                <Typography variant="body2">Yield: {d.yield} t/ha</Typography>
                                            </Box>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: 20 }} />
                            <Bar yAxisId="left" dataKey="canopy" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} name="Canopy Cover %" barSize={30} />
                            <Line yAxisId="right" type="monotone" dataKey="yield" stroke={theme.palette.primary.light} strokeWidth={3} dot={{ r: 4 }} name="Yield (t/ha)" />
                        </ComposedChart>
                    )}
                </ResponsiveContainer>
            </Box>
            <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'text.secondary', fontStyle: 'italic', textAlign: 'center' }}>
                * Note: Observed correlations may be influenced by external environmental variables such as rainfall, soil type, and irrigation practices.
            </Typography>
        </Box>
    );
};
