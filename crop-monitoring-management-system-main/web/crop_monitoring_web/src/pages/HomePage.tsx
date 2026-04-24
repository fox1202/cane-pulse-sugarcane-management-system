import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
    Alert,
    Box,
    CircularProgress,
    Container,
    Grid,
    Snackbar,
    Typography,
} from '@mui/material'
import {
    AgricultureOutlined,
    AirOutlined,
    ArrowForward,
    CloudOutlined,
    DeviceThermostatOutlined,
    GrainOutlined,
    MapOutlined,
    TableChartOutlined,
    ThunderstormOutlined,
    WaterDropOutlined,
    WbSunnyOutlined,
} from '@mui/icons-material'
import { motion, useInView } from 'framer-motion'
import {
    Cell,
    Pie,
    PieChart as RechartsPieChart,
    ResponsiveContainer,
} from 'recharts'
import { useAuth } from '@/contexts/AuthContext'
import type { PredefinedField } from '@/services/database.service'
import { useLivePredefinedFields } from '@/hooks/useLivePredefinedFields'
import { canAccessRoles } from '@/utils/roleAccess'
import { summarizeLiveFieldLandUse } from '@/utils/liveFieldLandUse'

const MINT = '#56b870'
const MINT_DARK = '#2f7f4f'
const MINT_PALE = 'rgba(86,184,112,0.12)'
const MINT_BORDER = 'rgba(86,184,112,0.2)'
const PEACH = '#f4a28c'
const PEACH_DARK = '#de7c64'
const PEACH_PALE = 'rgba(244,162,140,0.14)'
const SKY = '#68c3d4'
const SAND = '#c4b090'
const CREAM = '#fffaf3'
const PANEL = 'rgba(255,255,255,0.94)'
const PANEL_ALT = 'rgba(255,248,242,0.96)'
const TEXT_DIM = 'rgba(35,64,52,0.52)'
const TEXT_MID = 'rgba(35,64,52,0.72)'
const WEATHER_REFRESH_MS = 10 * 60 * 1000
const DEFAULT_WEATHER_COORDINATES = {
    latitude: -21.0365,
    longitude: 31.6146,
    label: 'ZSAES field area',
    source: 'fallback' as const,
    fieldCount: 0,
}

function SoftPattern() {
    return (
        <Box
            sx={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 0,
                borderRadius: 'inherit',
                backgroundImage: `
                    repeating-linear-gradient(135deg, transparent 0, transparent 14px, rgba(86,184,112,0.035) 14px, rgba(86,184,112,0.035) 16px),
                    radial-gradient(circle at 1px 1px, rgba(244,162,140,0.12) 1px, transparent 0)
                `,
                backgroundSize: 'auto, 22px 22px',
                opacity: 0.85,
            }}
        />
    )
}

function StatusBadge({ text, tone = 'mint' }: { text: string; tone?: 'mint' | 'peach' }) {
    const palette = tone === 'peach'
        ? {
            bg: PEACH_PALE,
            border: 'rgba(244,162,140,0.24)',
            glow: 'rgba(244,162,140,0.28)',
            text: PEACH_DARK,
        }
        : {
            bg: MINT_PALE,
            border: MINT_BORDER,
            glow: 'rgba(86,184,112,0.26)',
            text: MINT_DARK,
        }

    return (
        <Box
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                px: 1.6,
                py: 0.7,
                border: `1px solid ${palette.border}`,
                borderRadius: '999px',
                bgcolor: palette.bg,
                backdropFilter: 'blur(10px)',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 10px 24px rgba(35,64,52,0.06)',
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '60%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
                    animation: 'badgeShimmer 3.4s ease-in-out infinite',
                },
                '@keyframes badgeShimmer': {
                    '0%': { left: '-100%' },
                    '100%': { left: '180%' },
                },
            }}
        >
            <Box
                sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: palette.text,
                    boxShadow: `0 0 0 4px ${palette.glow}`,
                    animation: 'badgeBlink 1.2s step-end infinite',
                    '@keyframes badgeBlink': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0.5 },
                    },
                }}
            />
            <Typography
                sx={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    color: palette.text,
                    fontFamily: '"Times New Roman", Times, serif',
                    textTransform: 'uppercase',
                }}
            >
                {text}
            </Typography>
        </Box>
    )
}

interface AreaOverviewDatum {
    label: string
    areaHa: number
    color: string
    fieldCount: number
}

interface WeatherCoordinates {
    latitude: number
    longitude: number
    label: string
    source: 'device-location' | 'field-centroid' | 'fallback'
    fieldCount: number
    accuracyMeters?: number
}

interface OpenMeteoCurrent {
    time?: string
    temperature_2m?: number
    relative_humidity_2m?: number
    apparent_temperature?: number
    precipitation?: number
    weather_code?: number
    wind_speed_10m?: number
    wind_direction_10m?: number
}

interface OpenMeteoResponse {
    timezone?: string
    current?: OpenMeteoCurrent
}

interface WeatherReading {
    observedAt: string | null
    timezone: string
    temperatureC: number | null
    feelsLikeC: number | null
    humidityPercent: number | null
    precipitationMm: number | null
    windSpeedKmh: number | null
    windDirectionDegrees: number | null
    weatherCode: number | null
}

function formatAreaHa(value: number): string {
    return `${value.toFixed(2)} ha`
}

function isValidWeatherCoordinate(latitude: number, longitude: number): boolean {
    return Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        Math.abs(latitude) <= 90 &&
        Math.abs(longitude) <= 180 &&
        !(latitude === 0 && longitude === 0)
}

function roundWeatherCoordinate(value: number): number {
    return Number(value.toFixed(4))
}

function getDeviceWeatherCoordinates(position: GeolocationPosition): WeatherCoordinates {
    return {
        latitude: roundWeatherCoordinate(position.coords.latitude),
        longitude: roundWeatherCoordinate(position.coords.longitude),
        label: 'Current device location',
        source: 'device-location',
        fieldCount: 0,
        accuracyMeters: Number.isFinite(position.coords.accuracy)
            ? Math.round(position.coords.accuracy)
            : undefined,
    }
}

function getFieldWeatherCoordinates(fields: PredefinedField[]): WeatherCoordinates {
    const fieldCoordinates = fields
        .map((field) => ({
            latitude: Number(field.latitude),
            longitude: Number(field.longitude),
        }))
        .filter(({ latitude, longitude }) => isValidWeatherCoordinate(latitude, longitude))

    if (fieldCoordinates.length === 0) {
        return DEFAULT_WEATHER_COORDINATES
    }

    const totals = fieldCoordinates.reduce(
        (summary, point) => ({
            latitude: summary.latitude + point.latitude,
            longitude: summary.longitude + point.longitude,
        }),
        { latitude: 0, longitude: 0 }
    )

    return {
        latitude: roundWeatherCoordinate(totals.latitude / fieldCoordinates.length),
        longitude: roundWeatherCoordinate(totals.longitude / fieldCoordinates.length),
        label: fieldCoordinates.length === 1
            ? '1 mapped field centroid'
            : `${fieldCoordinates.length} mapped fields centroid`,
        source: 'field-centroid',
        fieldCount: fieldCoordinates.length,
    }
}

function toNullableWeatherNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function formatWeatherNumber(value: number | null, suffix: string, fractionDigits = 0): string {
    return value === null ? '--' : `${value.toFixed(fractionDigits)}${suffix}`
}

function formatTemperature(value: number | null): string {
    return formatWeatherNumber(value, '°C')
}

function formatObservedTime(value: string | null): string {
    if (!value) {
        return 'Updating'
    }

    const parsed = new Date(value)

    if (Number.isNaN(parsed.getTime())) {
        return value
    }

    return new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
    }).format(parsed)
}

function getWeatherConditionLabel(code: number | null): string {
    if (code === null) return 'Live weather'
    if (code === 0) return 'Clear'
    if (code === 1) return 'Mostly clear'
    if (code === 2) return 'Partly cloudy'
    if (code === 3) return 'Cloudy'
    if ([45, 48].includes(code)) return 'Fog'
    if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle'
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain'
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Wintry weather'
    if ([95, 96, 99].includes(code)) return 'Thunderstorm'
    return 'Current conditions'
}

function getWindDirectionLabel(degrees: number | null): string {
    if (degrees === null) {
        return '--'
    }

    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    const index = Math.round(degrees / 45) % directions.length
    return directions[index]
}

async function fetchCurrentWeather(coordinates: WeatherCoordinates): Promise<WeatherReading> {
    const params = new URLSearchParams({
        latitude: coordinates.latitude.toFixed(5),
        longitude: coordinates.longitude.toFixed(5),
        current: [
            'temperature_2m',
            'relative_humidity_2m',
            'apparent_temperature',
            'precipitation',
            'weather_code',
            'wind_speed_10m',
            'wind_direction_10m',
        ].join(','),
        timezone: 'auto',
        forecast_days: '1',
    })
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`)

    if (!response.ok) {
        throw new Error('Live weather service did not respond')
    }

    const data = await response.json() as OpenMeteoResponse
    const current = data.current

    if (!current) {
        throw new Error('Live weather service returned no current conditions')
    }

    return {
        observedAt: current.time ?? null,
        timezone: data.timezone ?? '',
        temperatureC: toNullableWeatherNumber(current.temperature_2m),
        feelsLikeC: toNullableWeatherNumber(current.apparent_temperature),
        humidityPercent: toNullableWeatherNumber(current.relative_humidity_2m),
        precipitationMm: toNullableWeatherNumber(current.precipitation),
        windSpeedKmh: toNullableWeatherNumber(current.wind_speed_10m),
        windDirectionDegrees: toNullableWeatherNumber(current.wind_direction_10m),
        weatherCode: toNullableWeatherNumber(current.weather_code),
    }
}

function OverviewInsightCard({
    eyebrow,
    title,
    children,
}: {
    eyebrow?: string
    title?: string
    children: React.ReactNode
}) {
    return (
        <Box
            sx={{
                position: 'relative',
                p: 3.2,
                height: '100%',
                overflow: 'hidden',
                borderRadius: '28px',
                border: `1px solid ${MINT_BORDER}`,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,248,242,0.95) 100%)',
                boxShadow: '0 18px 40px rgba(35,64,52,0.08)',
            }}
        >
            <SoftPattern />
            <Box sx={{ position: 'relative', zIndex: 1 }}>
                {eyebrow ? (
                    <Typography
                        sx={{
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            letterSpacing: '0.16em',
                            color: TEXT_DIM,
                            textTransform: 'uppercase',
                            fontFamily: '"Times New Roman", Times, serif',
                            mb: 1.3,
                        }}
                    >
                        {eyebrow}
                    </Typography>
                ) : null}
                {title ? (
                    <Typography
                        sx={{
                            fontSize: '1.35rem',
                            fontWeight: 800,
                            color: 'text.primary',
                            letterSpacing: '-0.02em',
                            fontFamily: '"Times New Roman", Times, serif',
                            mb: 2.2,
                        }}
                    >
                        {title}
                    </Typography>
                ) : null}
                {children}
            </Box>
        </Box>
    )
}

function WeatherConditionIcon({ code }: { code: number | null }) {
    const iconSx = { fontSize: 54 }

    if (code !== null && [95, 96, 99].includes(code)) {
        return <ThunderstormOutlined sx={iconSx} />
    }

    if (code !== null && [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
        return <GrainOutlined sx={iconSx} />
    }

    if (code !== null && (code >= 2 || [45, 48].includes(code))) {
        return <CloudOutlined sx={iconSx} />
    }

    return <WbSunnyOutlined sx={iconSx} />
}

function WeatherMetric({
    icon,
    label,
    value,
    helper,
}: {
    icon: React.ReactNode
    label: string
    value: string
    helper?: string
}) {
    return (
        <Box
            sx={{
                p: 1.45,
                borderRadius: '18px',
                border: '1px solid rgba(86,184,112,0.14)',
                bgcolor: 'rgba(255,255,255,0.72)',
                minHeight: 104,
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1 }}>
                <Box
                    sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '12px',
                        bgcolor: MINT_PALE,
                        border: `1px solid ${MINT_BORDER}`,
                        color: MINT_DARK,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}
                >
                    {icon}
                </Box>
                <Typography sx={{ fontSize: '0.68rem', color: TEXT_DIM, fontFamily: '"Times New Roman", Times, serif', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    {label}
                </Typography>
            </Box>
            <Typography sx={{ fontSize: '1.12rem', fontWeight: 800, color: 'text.primary', fontFamily: '"Times New Roman", Times, serif', lineHeight: 1.1 }}>
                {value}
            </Typography>
            {helper ? (
                <Typography sx={{ fontSize: '0.76rem', color: TEXT_MID, lineHeight: 1.5, mt: 0.45 }}>
                    {helper}
                </Typography>
            ) : null}
        </Box>
    )
}

function WeatherInsightCard({ fallbackCoordinates }: { fallbackCoordinates: WeatherCoordinates }) {
    const [deviceCoordinates, setDeviceCoordinates] = useState<WeatherCoordinates | null>(null)
    const [locationStatus, setLocationStatus] = useState<'checking' | 'tracking' | 'fallback'>('checking')
    const [locationError, setLocationError] = useState<string | null>(null)

    useEffect(() => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            setLocationStatus('fallback')
            setLocationError('Device location is unavailable')
            return undefined
        }

        let isMounted = true
        const applyPosition = (position: GeolocationPosition) => {
            if (!isMounted) return

            const nextCoordinates = getDeviceWeatherCoordinates(position)
            setDeviceCoordinates((currentCoordinates) => {
                if (
                    currentCoordinates?.latitude === nextCoordinates.latitude &&
                    currentCoordinates?.longitude === nextCoordinates.longitude &&
                    currentCoordinates?.accuracyMeters === nextCoordinates.accuracyMeters
                ) {
                    return currentCoordinates
                }

                return nextCoordinates
            })
            setLocationStatus('tracking')
            setLocationError(null)
        }

        const handleError = (positionError: GeolocationPositionError) => {
            if (!isMounted) return

            setLocationStatus('fallback')
            setLocationError(
                positionError.code === positionError.PERMISSION_DENIED
                    ? 'Location permission denied'
                    : 'Device location unavailable'
            )
        }

        const watchId = navigator.geolocation.watchPosition(
            applyPosition,
            handleError,
            {
                enableHighAccuracy: true,
                maximumAge: 30_000,
                timeout: 15_000,
            }
        )

        return () => {
            isMounted = false
            navigator.geolocation.clearWatch(watchId)
        }
    }, [])

    const coordinates = deviceCoordinates ?? fallbackCoordinates
    const {
        data: weather,
        isLoading,
        isFetching,
        error,
    } = useQuery<WeatherReading, Error>({
        queryKey: ['overview-live-weather', coordinates.latitude, coordinates.longitude],
        queryFn: () => fetchCurrentWeather(coordinates),
        staleTime: WEATHER_REFRESH_MS,
        refetchInterval: WEATHER_REFRESH_MS,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: 1,
    })

    const weatherCode = weather?.weatherCode ?? null
    const conditionLabel = getWeatherConditionLabel(weatherCode)
    const observedLabel = weather
        ? `Observed ${formatObservedTime(weather.observedAt)}`
        : isLoading
            ? 'Fetching latest reading'
            : 'Live reading paused'
    const locationLabel = coordinates.source === 'device-location'
        ? coordinates.label
        : coordinates.source === 'field-centroid'
            ? coordinates.label
            : 'Default field area'
    const locationBadge = coordinates.source === 'device-location'
        ? 'Device location'
        : locationStatus === 'checking'
            ? 'Locating'
            : coordinates.source === 'field-centroid'
                ? 'Field centroid'
                : 'ZSAES area'
    const coordinateLabel = `${Math.abs(coordinates.latitude).toFixed(3)}°${coordinates.latitude >= 0 ? 'N' : 'S'}, ${Math.abs(coordinates.longitude).toFixed(3)}°${coordinates.longitude >= 0 ? 'E' : 'W'}${coordinates.accuracyMeters ? ` · ±${coordinates.accuracyMeters} m` : ''}`
    const windValue = weather?.windSpeedKmh == null
        ? '--'
        : `${formatWeatherNumber(weather.windSpeedKmh, ' km/h')} ${getWindDirectionLabel(weather.windDirectionDegrees)}`

    return (
        <OverviewInsightCard eyebrow="Live Weather" title="Field Weather">
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                <StatusBadge text={error ? 'Weather offline' : isFetching ? 'Updating' : 'Live weather'} tone={error ? 'peach' : 'mint'} />
                <StatusBadge text={locationBadge} tone={coordinates.source === 'device-location' ? 'mint' : 'peach'} />
            </Box>

            <Box
                sx={{
                    p: { xs: 2, sm: 2.2 },
                    borderRadius: '22px',
                    border: error ? '1px solid rgba(244,162,140,0.24)' : '1px solid rgba(86,184,112,0.16)',
                    bgcolor: error ? 'rgba(255,248,242,0.82)' : 'rgba(255,255,255,0.76)',
                    mb: 1.2,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: '0.78rem', color: TEXT_DIM, fontFamily: '"Times New Roman", Times, serif', letterSpacing: '0.12em', textTransform: 'uppercase', mb: 0.65 }}>
                            {locationLabel}
                        </Typography>
                        <Typography sx={{ fontSize: 'clamp(2.2rem, 5vw, 3.35rem)', fontWeight: 800, color: 'text.primary', fontFamily: '"Times New Roman", Times, serif', lineHeight: 1 }}>
                            {formatTemperature(weather?.temperatureC ?? null)}
                        </Typography>
                        <Typography sx={{ fontSize: '0.95rem', color: TEXT_MID, lineHeight: 1.5, mt: 0.7 }}>
                            {error ? 'Live weather unavailable' : `${conditionLabel} · ${observedLabel}`}
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            width: 86,
                            height: 86,
                            borderRadius: '26px',
                            bgcolor: error ? PEACH_PALE : MINT_PALE,
                            border: `1px solid ${error ? 'rgba(244,162,140,0.26)' : MINT_BORDER}`,
                            color: error ? PEACH_DARK : MINT_DARK,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        {isLoading && !weather ? <CircularProgress size={34} sx={{ color: error ? PEACH_DARK : MINT_DARK }} /> : <WeatherConditionIcon code={weatherCode} />}
                    </Box>
                </Box>
                <Typography sx={{ fontSize: '0.76rem', color: TEXT_DIM, lineHeight: 1.6, mt: 1.4 }}>
                    {coordinateLabel}{weather?.timezone ? ` · ${weather.timezone}` : ''}
                </Typography>
                {error ? (
                    <Typography sx={{ fontSize: '0.82rem', color: PEACH_DARK, lineHeight: 1.6, mt: 1 }}>
                        {error.message}
                    </Typography>
                ) : null}
                {!error && locationError && coordinates.source !== 'device-location' ? (
                    <Typography sx={{ fontSize: '0.82rem', color: PEACH_DARK, lineHeight: 1.6, mt: 1 }}>
                        {locationError}; using {coordinates.source === 'field-centroid' ? 'field centroid' : 'default field area'}.
                    </Typography>
                ) : null}
            </Box>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                    gap: 1,
                }}
            >
                <WeatherMetric
                    icon={<DeviceThermostatOutlined sx={{ fontSize: 18 }} />}
                    label="Feels Like"
                    value={formatTemperature(weather?.feelsLikeC ?? null)}
                    helper="Apparent temperature"
                />
                <WeatherMetric
                    icon={<WaterDropOutlined sx={{ fontSize: 18 }} />}
                    label="Humidity"
                    value={formatWeatherNumber(weather?.humidityPercent ?? null, '%')}
                    helper="Relative humidity"
                />
                <WeatherMetric
                    icon={<GrainOutlined sx={{ fontSize: 18 }} />}
                    label="Rain"
                    value={formatWeatherNumber(weather?.precipitationMm ?? null, ' mm', 1)}
                    helper="Current precipitation"
                />
                <WeatherMetric
                    icon={<AirOutlined sx={{ fontSize: 18 }} />}
                    label="Wind"
                    value={windValue}
                    helper="10 m wind speed"
                />
            </Box>
        </OverviewInsightCard>
    )
}

function AreaPieChart({
    data,
    totalAreaHa,
}: {
    data: AreaOverviewDatum[]
    totalAreaHa: number
}) {
    const chartData = data.filter((entry) => entry.areaHa > 0)
    const [hoveredAreaLabel, setHoveredAreaLabel] = useState<string | null>(null)
    const activeEntry = chartData.find((entry) => entry.label === hoveredAreaLabel) ?? chartData[0] ?? null

    if (totalAreaHa <= 0) {
        return (
            <Box
                sx={{
                    minHeight: 320,
                    borderRadius: '24px',
                    border: '1px dashed rgba(86,184,112,0.24)',
                    bgcolor: 'rgba(255,255,255,0.56)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: 2.2,
                    textAlign: 'center',
                }}
            >
                <Typography sx={{ fontSize: '0.9rem', color: TEXT_MID, lineHeight: 1.7, maxWidth: 260 }}>
                    No mapped hectare totals are available yet for the latest dated crop records.
                </Typography>
            </Box>
        )
    }

    if (chartData.length === 0) {
        return (
            <Box
                sx={{
                    minHeight: 320,
                    borderRadius: '24px',
                    border: '1px dashed rgba(86,184,112,0.24)',
                    bgcolor: 'rgba(255,255,255,0.56)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: 2.2,
                    textAlign: 'center',
                }}
            >
                <Typography sx={{ fontSize: '0.9rem', color: TEXT_MID, lineHeight: 1.7, maxWidth: 300 }}>
                    Mapped area was found, but those fields are not yet classified as Sugarcane, Break Crop, or Fallow Period.
                </Typography>
            </Box>
        )
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.6, mb: 1.8 }}>
                {chartData.map((entry) => (
                    <Box key={entry.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.9 }}>
                        <Box
                            sx={{
                                width: 14,
                                height: 14,
                                borderRadius: '5px',
                                bgcolor: entry.color,
                                boxShadow: `0 0 0 3px ${entry.color}22`,
                                flexShrink: 0,
                            }}
                        />
                        <Typography sx={{ fontSize: '0.86rem', color: TEXT_MID, fontWeight: 700 }}>
                            {entry.label}
                        </Typography>
                    </Box>
                ))}
            </Box>

            <Box sx={{ position: 'relative', height: { xs: 300, sm: 320 } }}>
                {activeEntry ? (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 8,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 2,
                            minWidth: 190,
                            maxWidth: 'calc(100% - 24px)',
                            px: 1.25,
                            py: 0.9,
                            borderRadius: '16px',
                            border: `1px solid ${activeEntry.color}33`,
                            bgcolor: 'rgba(255,255,255,0.94)',
                            boxShadow: '0 14px 32px rgba(35,64,52,0.1)',
                            pointerEvents: 'none',
                            backdropFilter: 'blur(12px)',
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.35 }}>
                            <Box
                                sx={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '999px',
                                    bgcolor: activeEntry.color,
                                    flexShrink: 0,
                                }}
                            />
                            <Typography sx={{ fontSize: '0.88rem', fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
                                {activeEntry.label}
                            </Typography>
                        </Box>
                        <Typography sx={{ fontSize: '0.8rem', color: 'text.primary', fontWeight: 700, lineHeight: 1.35 }}>
                            {formatAreaHa(activeEntry.areaHa)} • {activeEntry.fieldCount} field{activeEntry.fieldCount === 1 ? '' : 's'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.72rem', color: TEXT_MID, lineHeight: 1.35, mt: 0.15 }}>
                            {totalAreaHa > 0 ? `${((activeEntry.areaHa / totalAreaHa) * 100).toFixed(1)}% of mapped area` : '0.0% of mapped area'}
                        </Typography>
                    </Box>
                ) : null}
                <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                        <Pie
                            data={chartData}
                            dataKey="areaHa"
                            nameKey="label"
                            cx="50%"
                            cy="56%"
                            innerRadius={66}
                            outerRadius={112}
                            paddingAngle={3}
                            stroke="rgba(255,255,255,0.95)"
                            strokeWidth={4}
                        >
                            {chartData.map((entry) => (
                                <Cell
                                    key={entry.label}
                                    fill={entry.color}
                                    onMouseEnter={() => setHoveredAreaLabel(entry.label)}
                                    onMouseLeave={() => setHoveredAreaLabel(null)}
                                />
                            ))}
                        </Pie>
                    </RechartsPieChart>
                </ResponsiveContainer>
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Box sx={{ textAlign: 'center', px: 2 }}>
                        <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: 'text.primary', fontFamily: '"Times New Roman", Times, serif', lineHeight: 1 }}>
                            {formatAreaHa(totalAreaHa)}
                        </Typography>
                        <Typography sx={{ fontSize: '0.74rem', color: TEXT_DIM, fontFamily: '"Times New Roman", Times, serif', letterSpacing: '0.16em', textTransform: 'uppercase', mt: 0.6, fontWeight: 700 }}>
                            Total mapped area
                        </Typography>
                    </Box>
                </Box>
            </Box>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(140px, 1fr))' },
                    gap: 1,
                }}
            >
                {chartData.map((entry) => (
                    <Box
                        key={`${entry.label}-fields`}
                        sx={{
                            p: 1.2,
                            borderRadius: '16px',
                            border: '1px solid rgba(86,184,112,0.12)',
                            bgcolor: 'rgba(255,255,255,0.74)',
                        }}
                    >
                        <Typography
                            sx={{
                                fontSize: '0.68rem',
                                color: TEXT_DIM,
                                fontFamily: '"Times New Roman", Times, serif',
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                mb: 0.45,
                            }}
                        >
                            {entry.label}
                        </Typography>
                        <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: 'text.primary', fontFamily: '"Times New Roman", Times, serif', lineHeight: 1.1 }}>
                            {formatAreaHa(entry.areaHa)}
                        </Typography>
                        <Typography sx={{ fontSize: '0.78rem', color: TEXT_MID, mt: 0.2, lineHeight: 1.6 }}>
                            {entry.fieldCount} field{entry.fieldCount === 1 ? '' : 's'} • {totalAreaHa > 0 ? `${((entry.areaHa / totalAreaHa) * 100).toFixed(1)}%` : '0.0%'} of mapped area
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Box>
    )
}

function ModuleCard({
    title,
    desc,
    path,
    icon,
    badge,
    delay = 0,
    accent = false,
    loadMode = 'navigate-only',
}: {
    title: string
    desc: string
    path: string
    icon: React.ReactNode
    badge?: string
    delay?: number
    accent?: boolean
    loadMode?: 'navigate-only' | 'monitoring-records'
}) {
    const navigate = useNavigate()
    const [hovered, setHovered] = useState(false)
    const [loading, setLoading] = useState(false)
    const [snackOpen, setSnackOpen] = useState(false)
    const [snackMsg, setSnackMsg] = useState('')
    const [snackSeverity, setSnackSeverity] = useState<'success' | 'error' | 'info'>('info')

    const handleCloseSnack = () => setSnackOpen(false)

    async function handleClick() {
        try {
            setLoading(true)
            if (loadMode === 'monitoring-records') {
                const { fetchMobileObservationRecords } = await import('@/services/database.service')
                const data = await fetchMobileObservationRecords()
                setSnackMsg(`Live monitoring feed: fetched ${data.length} dated field record(s)`)
                setSnackSeverity('success')
                setSnackOpen(true)
                setTimeout(() => navigate(path), 600)
                return
            }

            navigate(path)
        } catch (error: unknown) {
            console.error('ModuleCard backend error', error)
            const message = error instanceof Error ? error.message : 'Backend call failed'
            setSnackMsg(message)
            setSnackSeverity('error')
            setSnackOpen(true)
        } finally {
            setLoading(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{ height: '100%' }}
        >
            <Box
                onClick={() => { if (!loading) handleClick() }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                sx={{
                    position: 'relative',
                    p: 3.5,
                    height: '100%',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    borderRadius: '30px',
                    border: `1px solid ${accent ? 'rgba(244,162,140,0.24)' : MINT_BORDER}`,
                    background: accent
                        ? 'linear-gradient(180deg, rgba(255,250,246,0.98) 0%, rgba(255,240,233,0.98) 100%)'
                        : 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,255,249,0.96) 100%)',
                    boxShadow: hovered
                        ? '0 28px 48px rgba(35,64,52,0.12)'
                        : '0 16px 34px rgba(35,64,52,0.07)',
                    transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        background: accent
                            ? 'radial-gradient(circle at 100% 0%, rgba(244,162,140,0.14) 0%, transparent 42%)'
                            : 'radial-gradient(circle at 100% 0%, rgba(86,184,112,0.1) 0%, transparent 42%)',
                        opacity: hovered ? 1 : 0.75,
                        transition: 'opacity 0.3s ease',
                    },
                }}
            >
                <SoftPattern />
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                        <Box
                            sx={{
                                width: 56,
                                height: 56,
                                borderRadius: '20px',
                                bgcolor: accent ? PEACH_PALE : MINT_PALE,
                                border: `1px solid ${accent ? 'rgba(244,162,140,0.22)' : MINT_BORDER}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: accent ? PEACH_DARK : MINT_DARK,
                                transition: 'transform 0.3s ease',
                                transform: hovered ? 'rotate(-4deg) scale(1.04)' : 'none',
                            }}
                        >
                            {icon}
                        </Box>
                        {badge ? (
                            <Typography
                                sx={{
                                    fontSize: '0.62rem',
                                    color: TEXT_DIM,
                                    fontFamily: '"Times New Roman", Times, serif',
                                    letterSpacing: '0.12em',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {badge}
                            </Typography>
                        ) : null}
                    </Box>

                    <Typography
                        sx={{
                            fontSize: '1.35rem',
                            fontWeight: 800,
                            color: 'text.primary',
                            letterSpacing: '-0.02em',
                            fontFamily: '"Times New Roman", Times, serif',
                            mb: 1,
                        }}
                    >
                        {title}
                    </Typography>
                    <Typography sx={{ fontSize: '0.9rem', color: TEXT_MID, lineHeight: 1.7, mb: 4 }}>
                        {desc}
                    </Typography>

                    <Box
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.7,
                            color: accent ? PEACH_DARK : MINT_DARK,
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            fontFamily: '"Times New Roman", Times, serif',
                        }}
                    >
                        Open module
                        <ArrowForward
                            sx={{
                                fontSize: 15,
                                transform: hovered ? 'translateX(4px)' : 'translateX(0)',
                                transition: 'transform 0.2s ease',
                            }}
                        />
                    </Box>
                </Box>
                {loading && (
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 5,
                            bgcolor: 'rgba(255,255,255,0.68)',
                            backdropFilter: 'blur(4px)',
                        }}
                    >
                        <CircularProgress sx={{ color: accent ? PEACH_DARK : MINT_DARK }} />
                    </Box>
                )}
            </Box>
            <Snackbar open={snackOpen} autoHideDuration={4000} onClose={handleCloseSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnack} severity={snackSeverity} sx={{ width: '100%' }}>
                    {snackMsg}
                </Alert>
            </Snackbar>
        </motion.div>
    )
}

function ProtocolStep({ step, index, inView }: { step: string; index: number; inView: boolean }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: index * 0.07, duration: 0.5, ease: 'easeOut' }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 2,
                    p: 2.1,
                    height: '100%',
                    borderRadius: '22px',
                    border: `1px solid ${MINT_BORDER}`,
                    bgcolor: 'rgba(255,255,255,0.72)',
                    transition: 'transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        bgcolor: 'rgba(255,250,246,0.94)',
                        borderColor: 'rgba(244,162,140,0.24)',
                    },
                }}
            >
                <Box
                    sx={{
                        minWidth: 34,
                        height: 34,
                        borderRadius: '14px',
                        bgcolor: 'rgba(244,162,140,0.16)',
                        border: '1px solid rgba(244,162,140,0.22)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}
                >
                    <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: PEACH_DARK, fontFamily: '"Times New Roman", Times, serif' }}>
                        {String(index + 1).padStart(2, '0')}
                    </Typography>
                </Box>
                <Typography sx={{ fontSize: '0.88rem', color: TEXT_MID, lineHeight: 1.75, pt: 0.15 }}>
                    {step}
                </Typography>
            </Box>
        </motion.div>
    )
}

export function HomePage() {
    const { user } = useAuth()
    const {
        data: liveFields = [],
        isLoading: fieldsLoading,
        error: fieldsError,
    } = useLivePredefinedFields()

    const weatherCoordinates = useMemo(
        () => getFieldWeatherCoordinates(liveFields),
        [liveFields]
    )

    const landUseSummary = useMemo(
        () => summarizeLiveFieldLandUse(liveFields),
        [liveFields]
    )
    const areaOverviewData = useMemo<AreaOverviewDatum[]>(
        () => landUseSummary.items.map((item) => ({
            label: item.label,
            areaHa: item.areaHa,
            color: item.label === 'Sugarcane'
                ? MINT
                : item.label === 'Break Crop'
                    ? SKY
                    : item.label === 'Fallow Period'
                        ? PEACH
                        : SAND,
            fieldCount: item.fieldCount,
        })),
        [landUseSummary]
    )
    const overviewError = fieldsError
    const isOverviewLoading = fieldsLoading

    const protocolRef = useRef(null)
    const protocolInView = useInView(protocolRef, { once: true, margin: '-80px' })

    const steps = [
        'Select a trial from the registry or draw a new trial boundary, then confirm block and area details.',
        'Fill in irrigation, water source, TAM, soil type, pH, and field remarks in Field Information.',
        'Add trial number, trial name, contact person, and the recorded date in Trial Information.',
        'Set crop type, crop class, planting date, previous cutting date, and expected harvest date.',
        'Capture residue type, management method, and residue remarks for the current field cycle.',
        'Record fertilizer type, nutrient application date, application rate, and foliar sampling date.',
        'Add weed application details together with pest and disease remarks from the current visit.',
        'Complete harvest date, yield, and quality remarks, then save or edit the form before submission.',
    ]
    const totalSteps = steps.length
    const canUseFieldRecords = canAccessRoles(user?.role, ['admin', 'supervisor'], user?.email)
    const moduleCards = [
        {
            title: 'Map View',
            desc: 'Move into the spatial workspace for boundaries, centroids, and hybrid basemap context in one place.',
            path: '/map',
            icon: <MapOutlined sx={{ fontSize: 26 }} />,
            delay: 0.15,
            accent: false,
        },
        ...(canUseFieldRecords ? [
            {
                title: 'Field Records',
                desc: 'Review live crop observations that have real recorded dates, such as 25 March 2026.',
                path: '/data',
                icon: <TableChartOutlined sx={{ fontSize: 26 }} />,
                delay: 0.25,
                accent: false,
                loadMode: 'monitoring-records' as const,
            },
        ] : []),
    ]

    return (
        <Box sx={{ bgcolor: CREAM, minHeight: '100vh', position: 'relative', fontFamily: '"Times New Roman", Times, serif' }}>
            <Box
                sx={{
                    position: 'fixed',
                    inset: 0,
                    pointerEvents: 'none',
                    zIndex: 0,
                    background: `
                        radial-gradient(ellipse 38% 26% at 18% 2%, rgba(166,226,184,0.26) 0%, transparent 68%),
                        radial-gradient(ellipse 28% 22% at 85% 20%, rgba(244,162,140,0.16) 0%, transparent 72%),
                        radial-gradient(ellipse 34% 24% at 92% 92%, rgba(86,184,112,0.14) 0%, transparent 72%)
                    `,
                }}
            />

            <Container maxWidth="xl" sx={{ pb: 10, pt: { xs: 3, md: 4 }, position: 'relative', zIndex: 1 }}>
                {overviewError && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {overviewError.message}
                    </Alert>
                )}

                {isOverviewLoading ? (
                    <Box sx={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 8 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        <Grid container spacing={3} sx={{ mb: 8 }}>
                            <Grid size={{ xs: 12, lg: 6 }}>
                                <OverviewInsightCard
                                    eyebrow="Area Summary"
                                    title="Mapped Area Overview"
                                >
                                    <Typography sx={{ fontSize: '0.95rem', color: TEXT_MID, lineHeight: 1.8, maxWidth: 540, mb: 2.4 }}>
                                        Exact hectares from the current database, grouped by crop type so the total mapped area matches the live field records.
                                    </Typography>
                                    <AreaPieChart
                                        data={areaOverviewData}
                                        totalAreaHa={landUseSummary.totalMeasuredArea}
                                    />
                                </OverviewInsightCard>
                            </Grid>

                            <Grid size={{ xs: 12, lg: 6 }}>
                                <WeatherInsightCard fallbackCoordinates={weatherCoordinates} />
                            </Grid>
                        </Grid>

                    </>
                )}

                <Grid container spacing={3} sx={{ mb: 8 }}>
                    {moduleCards.map((item) => (
                        <Grid size={{ xs: 12, md: 6 }} key={item.title} sx={{ display: 'flex' }}>
                            <ModuleCard {...item} />
                        </Grid>
                    ))}
                </Grid>

                <Box ref={protocolRef}>
                    <Box
                        sx={{
                            position: 'relative',
                            overflow: 'hidden',
                            borderRadius: '34px',
                            border: `1px solid ${MINT_BORDER}`,
                            background: `linear-gradient(180deg, ${PANEL} 0%, ${PANEL_ALT} 100%)`,
                            boxShadow: '0 20px 46px rgba(35,64,52,0.08)',
                        }}
                    >
                        <SoftPattern />
                        <Box sx={{ height: 4, background: `linear-gradient(90deg, ${MINT}, ${PEACH}, transparent)` }} />

                        <Box sx={{ position: 'relative', zIndex: 1, p: { xs: 3.2, md: 5.5 } }}>
                            <Grid container spacing={5} alignItems="flex-start">
                                <Grid size={{ xs: 12, md: 4 }}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={protocolInView ? { opacity: 1, y: 0 } : {}}
                                        transition={{ duration: 0.7 }}
                                    >
                                        <StatusBadge text="Web form flow" />
                                        <Typography
                                            sx={{
                                                fontSize: 'clamp(1.7rem, 3vw, 2.4rem)',
                                                fontWeight: 800,
                                                fontFamily: '"Times New Roman", Times, serif',
                                                letterSpacing: '-0.03em',
                                                color: 'text.primary',
                                                lineHeight: 1.12,
                                                mt: 2.2,
                                                mb: 2,
                                            }}
                                        >
                                            Collection steps that feel{' '}
                                            <Box component="span" sx={{ color: PEACH_DARK }}>
                                                calm and clear
                                            </Box>
                                        </Typography>
                                        <Typography sx={{ fontSize: '0.92rem', color: TEXT_MID, lineHeight: 1.8, mb: 3.2 }}>
                                            This checklist now mirrors the current web intake form so each section follows the same order users see while capturing live field records.
                                        </Typography>

                                        <Box sx={{ mb: 1 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                                                <Typography sx={{ fontSize: '0.62rem', color: TEXT_DIM, fontFamily: '"Times New Roman", Times, serif', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                                                    Steps ready
                                                </Typography>
                                                <Typography sx={{ fontSize: '0.62rem', color: MINT_DARK, fontFamily: '"Times New Roman", Times, serif' }}>
                                                    {totalSteps} / {totalSteps}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ height: 8, borderRadius: 99, bgcolor: 'rgba(86,184,112,0.08)', overflow: 'hidden' }}>
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={protocolInView ? { width: '100%' } : {}}
                                                    transition={{ delay: 0.3, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                                                    style={{
                                                        height: '100%',
                                                        borderRadius: 999,
                                                        background: `linear-gradient(90deg, ${MINT}, ${PEACH})`,
                                                    }}
                                                />
                                            </Box>
                                        </Box>
                                    </motion.div>
                                </Grid>

                                <Grid size={{ xs: 12, md: 8 }}>
                                    <Grid container spacing={1.2}>
                                        {steps.map((step, index) => (
                                            <Grid size={{ xs: 12, sm: 6 }} key={step}>
                                                <ProtocolStep step={step} index={index} inView={protocolInView} />
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Box>

                        <AgricultureOutlined
                            sx={{
                                position: 'absolute',
                                bottom: -18,
                                right: -18,
                                fontSize: 180,
                                opacity: 0.05,
                                color: MINT,
                                transform: 'rotate(-10deg)',
                            }}
                        />
                    </Box>
                </Box>
            </Container>
        </Box>
    )
}
