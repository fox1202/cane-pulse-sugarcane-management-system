import { useMemo } from 'react'
import {
  Box,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PredefinedField } from '@/services/database.service'

type RegistryFieldSnapshot = {
  fieldName: string
  blockId: string
  areaHa: number | null
  latitude: number | null
  longitude: number | null
  hasCoordinates: boolean
  irrigationType: string
  waterSource: string
  soilType: string
  tamLabel: string
  tamValue: number | null
}

type BreakdownDatum = {
  label: string
  value: number
  areaHa: number
  color: string
}

type RankingDatum = {
  label: string
  value: number
  helper: string
  color: string
}

type CoverageDatum = {
  label: string
  count: number
  total: number
  color: string
}

type TooltipEntry = {
  payload?: {
    areaHa?: number
    helper?: string
  }
}

const DISPLAY = '"Times New Roman", Times, serif'
const MONO = '"Times New Roman", Times, serif'
const UNSET_LABEL = 'Unspecified'
const PALETTE = ['#56b870', '#68c3d4', '#f4a28c', '#d6a554', '#8ba888', '#ce6a7b', '#7a4f2c']
const TOOLTIP_STYLE = {
  borderRadius: 14,
  border: '1px solid rgba(27, 94, 32, 0.14)',
  boxShadow: '0 18px 40px rgba(17, 24, 16, 0.12)',
  background: 'rgba(255,255,255,0.97)',
}

function Panel({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  const theme = useTheme()

  return (
    <Paper
      sx={{
        p: 2.5,
        borderRadius: '28px',
        border: `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
        boxShadow: '0 18px 44px rgba(17,24,16,0.05)',
        bgcolor: alpha(theme.palette.background.paper, 0.97),
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `
            radial-gradient(circle at 100% 0%, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 34%),
            linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, transparent 100%)
          `,
        },
      }}
    >
      <Box sx={{ position: 'relative', zIndex: 1, height: '100%' }}>
        {eyebrow && (
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'primary.dark',
              mb: 0.9,
              fontFamily: MONO,
            }}
          >
            {eyebrow}
          </Typography>
        )}
        <Typography sx={{ fontSize: 20, fontWeight: 900, color: 'text.primary', mb: 0.5, fontFamily: DISPLAY, letterSpacing: '-0.03em' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.7, mb: 1.8, fontFamily: DISPLAY }}>
            {subtitle}
          </Typography>
        )}
        {children}
      </Box>
    </Paper>
  )
}

function MetricCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string
  value: string
  helper: string
  tone: string
}) {
  return (
    <Paper
      sx={{
        p: 2.1,
        borderRadius: '24px',
        border: `1px solid ${alpha(tone, 0.18)}`,
        background: `
          radial-gradient(circle at 100% 0%, ${alpha(tone, 0.16)} 0%, transparent 40%),
          linear-gradient(180deg, ${alpha(tone, 0.08)} 0%, rgba(255,255,255,0.98) 100%)
        `,
        boxShadow: '0 14px 36px rgba(17,24,16,0.04)',
        height: '100%',
      }}
    >
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: tone,
          mb: 1.05,
          fontFamily: MONO,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: { xs: 24, md: 28 },
          fontWeight: 900,
          color: 'text.primary',
          lineHeight: 1.02,
          letterSpacing: '-0.04em',
          mb: 0.9,
          fontFamily: DISPLAY,
        }}
      >
        {value}
      </Typography>
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.6, fontFamily: DISPLAY }}>
        {helper}
      </Typography>
    </Paper>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <Box
      sx={{
        minHeight: 220,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        px: 3,
      }}
    >
      <Typography sx={{ color: 'text.secondary', fontSize: 13, lineHeight: 1.6 }}>
        {message}
      </Typography>
    </Box>
  )
}

function CoveragePanel({ items }: { items: CoverageDatum[] }) {
  return (
    <Stack spacing={1.45}>
      {items.map((item) => {
        const percentage = item.total > 0 ? (item.count / item.total) * 100 : 0

        return (
          <Box key={item.label}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 0.55 }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.primary' }}>
                {item.label}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                {item.count}/{item.total} ({formatPercentage(percentage)})
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={percentage}
              sx={{
                height: 10,
                borderRadius: 999,
                bgcolor: alpha(item.color, 0.12),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 999,
                  bgcolor: item.color,
                },
              }}
            />
          </Box>
        )
      })}
    </Stack>
  )
}

function DonutBreakdown({
  data,
  valueLabel,
  emptyMessage,
}: {
  data: BreakdownDatum[]
  valueLabel: string
  emptyMessage: string
}) {
  if (data.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <Stack spacing={1.6}>
      <Box sx={{ height: 220, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={66}
              outerRadius={104}
              paddingAngle={3}
              stroke="rgba(255,255,255,0.95)"
              strokeWidth={3}
            >
              {data.map((entry) => (
                <Cell key={entry.label} fill={entry.color} />
              ))}
            </Pie>
            <RechartsTooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: number | string | undefined, _name, entry: TooltipEntry) => {
                const numericValue = Number(value || 0)
                const areaHa = Number(entry?.payload?.areaHa || 0)
                return [`${numericValue} ${valueLabel}`, `${areaHa.toFixed(2)} ha`]
              }}
              labelFormatter={(label) => String(label)}
            />
          </PieChart>
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
            <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 900, color: 'text.primary', lineHeight: 1 }}>
              {formatCount(total)}
            </Typography>
            <Typography
              sx={{
                mt: 0.6,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'text.secondary',
              }}
            >
              Fields
            </Typography>
          </Box>
        </Box>
      </Box>

      <Stack spacing={0.95}>
        {data.map((item) => (
          <Box
            key={item.label}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              p: 1.05,
              borderRadius: '16px',
              border: `1px solid ${alpha(item.color, 0.16)}`,
              bgcolor: alpha(item.color, 0.06),
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.9, minWidth: 0 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '4px',
                  bgcolor: item.color,
                  flexShrink: 0,
                }}
              />
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.primary' }}>
                {item.label}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', whiteSpace: 'nowrap' }}>
              {item.value} • {formatArea(item.areaHa)}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Stack>
  )
}

function HorizontalRankingChart({
  data,
  valueFormatter,
  emptyMessage,
}: {
  data: RankingDatum[]
  valueFormatter: (value: number) => string
  emptyMessage: string
}) {
  if (data.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  return (
    <Box sx={{ height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 20, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(47,127,79,0.12)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} stroke="rgba(85,111,100,0.8)" />
          <YAxis
            type="category"
            dataKey="label"
            width={98}
            tick={{ fontSize: 11 }}
            stroke="rgba(85,111,100,0.8)"
            tickFormatter={(value) => truncateLabel(String(value), 16)}
          />
          <RechartsTooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value: number | string | undefined, _name, entry: TooltipEntry) => [
              valueFormatter(Number(value || 0)),
              String(entry?.payload?.helper || ''),
            ]}
            labelFormatter={(label) => String(label)}
          />
          <Bar dataKey="value" radius={[0, 12, 12, 0]}>
            {data.map((entry) => (
              <Cell key={entry.label} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  )
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: string
}) {
  return (
    <Box
      sx={{
        p: 1.2,
        borderRadius: '18px',
        border: `1px solid ${alpha(tone, 0.16)}`,
        bgcolor: alpha(tone, 0.06),
      }}
    >
      <Typography
        sx={{
          fontSize: 10.5,
          fontWeight: 800,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: alpha(tone, 0.86),
          mb: 0.55,
          fontFamily: MONO,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: { xs: 16, md: 18 },
          fontWeight: 900,
          color: 'text.primary',
          lineHeight: 1.08,
          letterSpacing: '-0.03em',
          fontFamily: DISPLAY,
        }}
      >
        {value}
      </Typography>
    </Box>
  )
}

function normalizeText(value?: string | number | null, fallback = UNSET_LABEL) {
  const normalized = String(value ?? '').trim()
  return normalized.length > 0 ? normalized : fallback
}

function normalizeKey(value?: string | null) {
  return (value ?? '').trim().toLowerCase()
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  const compact = String(value).trim().replace(/\s+/g, '').replace(/[^0-9,.-]/g, '')
  if (!compact) return null

  let candidate = compact
  const hasComma = candidate.includes(',')
  const hasDot = candidate.includes('.')

  if (hasComma && hasDot) {
    candidate = candidate.lastIndexOf(',') > candidate.lastIndexOf('.')
      ? candidate.replace(/\./g, '').replace(/,/g, '.')
      : candidate.replace(/,/g, '')
  } else if (hasComma) {
    candidate = candidate.replace(/,/g, '.')
  }

  const parsed = Number(candidate)
  return Number.isFinite(parsed) ? parsed : null
}

function average(values: number[]) {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function truncateLabel(value: string, max = 18) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

function formatCount(value: number) {
  return value.toLocaleString()
}

function formatArea(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'N/A'
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ha`
}

function formatTam(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'N/A'
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} mm`
}

function formatCoordinate(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'N/A'
  return value.toFixed(5)
}

function formatPercentage(value: number) {
  return `${value.toFixed(0)}%`
}

function normalizeGeometry(value: unknown): Record<string, unknown> | null {
  if (!value) return null

  if (typeof value === 'string') {
    try {
      return normalizeGeometry(JSON.parse(value))
    } catch {
      return null
    }
  }

  if (typeof value !== 'object') {
    return null
  }

  const candidate = value as Record<string, unknown>
  const featureType = candidate.type

  if (featureType === 'Feature') return normalizeGeometry(candidate.geometry)

  if (featureType === 'FeatureCollection') {
    const features = Array.isArray(candidate.features) ? candidate.features : []
    const firstFeature = features[0]
    const firstGeometry = typeof firstFeature === 'object' && firstFeature !== null
      ? (firstFeature as Record<string, unknown>).geometry
      : undefined

    return normalizeGeometry(firstGeometry)
  }

  if ('geometry' in candidate) return normalizeGeometry(candidate.geometry)
  if ('geom' in candidate) return normalizeGeometry(candidate.geom)
  return candidate
}

function getMetersPerDegreeLatitude(latitude: number) {
  const radians = latitude * (Math.PI / 180)
  return 111132.92 - 559.82 * Math.cos(2 * radians) + 1.175 * Math.cos(4 * radians)
}

function getMetersPerDegreeLongitude(latitude: number) {
  const radians = latitude * (Math.PI / 180)
  return 111412.84 * Math.cos(radians) - 93.5 * Math.cos(3 * radians)
}

function getRingAreaSqMeters(ring: number[][]) {
  if (!Array.isArray(ring) || ring.length < 3) {
    return 0
  }

  const latitudes = ring
    .map((point) => Number(point?.[1]))
    .filter((value) => Number.isFinite(value))

  if (latitudes.length === 0) {
    return 0
  }

  const meanLatitude = latitudes.reduce((sum, value) => sum + value, 0) / latitudes.length
  const metersPerLat = getMetersPerDegreeLatitude(meanLatitude)
  const metersPerLon = getMetersPerDegreeLongitude(meanLatitude)

  let area = 0

  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index] ?? []
    const next = ring[(index + 1) % ring.length] ?? []
    const currentX = Number(current[0]) * metersPerLon
    const currentY = Number(current[1]) * metersPerLat
    const nextX = Number(next[0]) * metersPerLon
    const nextY = Number(next[1]) * metersPerLat

    if (![currentX, currentY, nextX, nextY].every(Number.isFinite)) {
      continue
    }

    area += currentX * nextY - nextX * currentY
  }

  return Math.abs(area) / 2
}

function getPolygonAreaSqMeters(rings: number[][][]) {
  if (!Array.isArray(rings) || rings.length === 0) {
    return 0
  }

  const [outerRing = [], ...holes] = rings
  const outerArea = getRingAreaSqMeters(outerRing)
  const holeArea = holes.reduce((sum, ring) => sum + getRingAreaSqMeters(ring), 0)
  return Math.max(outerArea - holeArea, 0)
}

function getGeometryAreaHa(geometry: unknown) {
  const normalized = normalizeGeometry(geometry)
  const geometryType = normalized?.type

  if (geometryType !== 'Polygon' && geometryType !== 'MultiPolygon') {
    return null
  }

  let areaSqMeters = 0
  const coordinates = normalized?.coordinates

  if (geometryType === 'Polygon') {
    const polygonCoordinates = Array.isArray(coordinates)
      ? coordinates as number[][][]
      : []

    areaSqMeters = getPolygonAreaSqMeters(polygonCoordinates)
  } else if (geometryType === 'MultiPolygon') {
    const multiPolygonCoordinates = Array.isArray(coordinates)
      ? coordinates as number[][][][]
      : []

    areaSqMeters = multiPolygonCoordinates
      .reduce((sum: number, polygon: number[][][]) => sum + getPolygonAreaSqMeters(polygon), 0)
  }

  if (!Number.isFinite(areaSqMeters) || areaSqMeters <= 0) {
    return null
  }

  return Number((areaSqMeters / 10_000).toFixed(2))
}

function buildBreakdown(
  fields: RegistryFieldSnapshot[],
  getLabel: (field: RegistryFieldSnapshot) => string,
  max = 6
): BreakdownDatum[] {
  const grouped = new Map<string, { label: string; value: number; areaHa: number }>()

  fields.forEach((field) => {
    const label = getLabel(field)
    const key = normalizeKey(label) || label
    const current = grouped.get(key) ?? { label, value: 0, areaHa: 0 }
    current.value += 1
    current.areaHa += field.areaHa ?? 0
    grouped.set(key, current)
  })

  const sorted = Array.from(grouped.values())
    .sort((left, right) => right.value - left.value || right.areaHa - left.areaHa || left.label.localeCompare(right.label))

  const top = sorted.slice(0, max)
  const remainder = sorted.slice(max)

  if (remainder.length > 0) {
    top.push({
      label: 'Other',
      value: remainder.reduce((sum, item) => sum + item.value, 0),
      areaHa: remainder.reduce((sum, item) => sum + item.areaHa, 0),
    })
  }

  return top.map((item, index) => ({
    ...item,
    areaHa: Number(item.areaHa.toFixed(2)),
    color: PALETTE[index % PALETTE.length],
  }))
}

function buildLargestFields(fields: RegistryFieldSnapshot[], max = 6): RankingDatum[] {
  return fields
    .filter((field) => field.areaHa !== null && Number.isFinite(field.areaHa))
    .sort((left, right) => (right.areaHa ?? 0) - (left.areaHa ?? 0))
    .slice(0, max)
    .map((field, index) => ({
      label: field.fieldName,
      value: Number((field.areaHa ?? 0).toFixed(2)),
      helper: field.blockId,
      color: PALETTE[index % PALETTE.length],
    }))
}

export function FieldRegistryStatistics({ fields }: { fields: PredefinedField[] }) {
  const stats = useMemo(() => {
    const snapshots: RegistryFieldSnapshot[] = fields.map((field) => {
      const latitude = typeof field.latitude === 'number' && Number.isFinite(field.latitude) && field.latitude !== 0
        ? field.latitude
        : null
      const longitude = typeof field.longitude === 'number' && Number.isFinite(field.longitude) && field.longitude !== 0
        ? field.longitude
        : null
      const tamValue = toFiniteNumber(field.tam_mm ?? field.tamm_area)

      return {
        fieldName: normalizeText(field.field_name, 'Unnamed field'),
        blockId: normalizeText(field.block_id),
        areaHa: toFiniteNumber(field.area) ?? getGeometryAreaHa(field.geom),
        latitude,
        longitude,
        hasCoordinates: latitude !== null && longitude !== null,
        irrigationType: normalizeText(field.irrigation_type),
        waterSource: normalizeText(field.water_source),
        soilType: normalizeText(field.soil_type),
        tamLabel: normalizeText(field.tam_mm ?? field.tamm_area ?? '', ''),
        tamValue,
      }
    })

    const totalFields = snapshots.length
    const areaValues = snapshots.flatMap((field) => field.areaHa !== null ? [field.areaHa] : [])
    const tamValues = snapshots.flatMap((field) => field.tamValue !== null ? [field.tamValue] : [])
    const latitudeValues = snapshots.flatMap((field) => field.latitude !== null ? [field.latitude] : [])
    const longitudeValues = snapshots.flatMap((field) => field.longitude !== null ? [field.longitude] : [])

    const blocks = new Set(
      snapshots
        .map((field) => field.blockId)
        .filter((value) => value !== UNSET_LABEL)
    )

    const taggedProfiles = snapshots.filter((field) =>
      field.irrigationType !== UNSET_LABEL &&
      field.waterSource !== UNSET_LABEL &&
      field.soilType !== UNSET_LABEL
    ).length

    return {
      totalFields,
      distinctBlocks: blocks.size,
      totalAreaHa: areaValues.reduce((sum, value) => sum + value, 0),
      averageAreaHa: average(areaValues),
      averageTam: average(tamValues),
      maxTam: tamValues.length > 0 ? Math.max(...tamValues) : null,
      areaCount: areaValues.length,
      taggedProfiles,
      coverage: [
        { label: 'Block ID', count: snapshots.filter((field) => field.blockId !== UNSET_LABEL).length, total: totalFields, color: PALETTE[0] },
        { label: 'Field Name', count: snapshots.filter((field) => field.fieldName !== 'Unnamed field').length, total: totalFields, color: PALETTE[1] },
        { label: 'Latitude', count: snapshots.filter((field) => field.latitude !== null).length, total: totalFields, color: PALETTE[2] },
        { label: 'Longitude', count: snapshots.filter((field) => field.longitude !== null).length, total: totalFields, color: PALETTE[3] },
        { label: 'Area', count: snapshots.filter((field) => field.areaHa !== null).length, total: totalFields, color: PALETTE[4] },
        { label: 'Irrigation Type', count: snapshots.filter((field) => field.irrigationType !== UNSET_LABEL).length, total: totalFields, color: PALETTE[5] },
        { label: 'Water Source', count: snapshots.filter((field) => field.waterSource !== UNSET_LABEL).length, total: totalFields, color: PALETTE[6] },
        { label: 'TAM', count: snapshots.filter((field) => field.tamLabel.trim().length > 0).length, total: totalFields, color: PALETTE[0] },
        { label: 'Soil Type', count: snapshots.filter((field) => field.soilType !== UNSET_LABEL).length, total: totalFields, color: PALETTE[1] },
      ] satisfies CoverageDatum[],
      blockBreakdown: buildBreakdown(snapshots, (field) => field.blockId, 7),
      irrigationBreakdown: buildBreakdown(snapshots, (field) => field.irrigationType, 5),
      waterBreakdown: buildBreakdown(snapshots, (field) => field.waterSource, 5),
      soilBreakdown: buildBreakdown(snapshots, (field) => field.soilType, 5),
      largestFields: buildLargestFields(snapshots, 7),
      minLatitude: latitudeValues.length > 0 ? Math.min(...latitudeValues) : null,
      maxLatitude: latitudeValues.length > 0 ? Math.max(...latitudeValues) : null,
      minLongitude: longitudeValues.length > 0 ? Math.min(...longitudeValues) : null,
      maxLongitude: longitudeValues.length > 0 ? Math.max(...longitudeValues) : null,
      centerLatitude: average(latitudeValues),
      centerLongitude: average(longitudeValues),
      coordinateCount: snapshots.filter((field) => field.hasCoordinates).length,
    }
  }, [fields])

  if (fields.length === 0) {
    return (
      <Panel
        eyebrow="Live registry"
        title="Field statistics are ready for live monitoring records"
        subtitle="This page turns block IDs, coordinates, area, irrigation, water source, TAM, and soil type into statistics as soon as live field-management rows are available."
      >
        <EmptyState message="No live monitoring records were returned yet." />
      </Panel>
    )
  }

  return (
    <Stack spacing={2.2}>
      <Panel
        eyebrow="Live registry"
        title="Field statistics from live monitoring records"
        subtitle="This view converts your field-management registry into statistics for block coverage, mapped coordinates, field size, irrigation type, water source, TAM, and soil profile."
      >
        <Grid container spacing={1.4}>
          <Grid size={{ xs: 12, sm: 6, md: 4, xl: 2 }}>
            <MetricCard
              label="Registered fields"
              value={formatCount(stats.totalFields)}
              helper="Every unique field row currently available in the live registry."
              tone={PALETTE[0]}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, xl: 2 }}>
            <MetricCard
              label="Distinct blocks"
              value={formatCount(stats.distinctBlocks)}
              helper="How many `block_id` values are represented across the registry."
              tone={PALETTE[1]}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, xl: 2 }}>
            <MetricCard
              label="Mapped area"
              value={stats.areaCount > 0 ? formatArea(Number(stats.totalAreaHa.toFixed(2))) : 'N/A'}
              helper="Summed field area using `area` first and geometry when area is missing."
              tone={PALETTE[2]}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, xl: 2 }}>
            <MetricCard
              label="Average field size"
              value={formatArea(stats.averageAreaHa)}
              helper="Average hectares across fields with usable area values."
              tone={PALETTE[3]}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, xl: 2 }}>
            <MetricCard
              label="Coordinates"
              value={formatPercentage(stats.totalFields > 0 ? (stats.coordinateCount / stats.totalFields) * 100 : 0)}
              helper={`${stats.coordinateCount} fields have both latitude and longitude.`}
              tone={PALETTE[4]}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, xl: 2 }}>
            <MetricCard
              label="Profile complete"
              value={formatCount(stats.taggedProfiles)}
              helper="Fields already tagged with irrigation, water source, and soil type."
              tone={PALETTE[5]}
            />
          </Grid>
        </Grid>
      </Panel>

      <Grid container spacing={2.2}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Panel
            eyebrow="Distribution"
            title="Blocks by field count"
            subtitle="Top `block_id` values ranked by how many fields they contain."
          >
            <HorizontalRankingChart
              data={stats.blockBreakdown.map((item) => ({
                label: item.label,
                value: item.value,
                helper: formatArea(item.areaHa),
                color: item.color,
              }))}
              valueFormatter={(value) => `${value} field(s)`}
              emptyMessage="No block identifiers are available yet."
            />
          </Panel>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Panel
            eyebrow="Completeness"
            title="Coverage across live monitoring records"
            subtitle="How much of each column in your screenshot is already populated."
          >
            <CoveragePanel items={stats.coverage} />
          </Panel>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Panel
            eyebrow="Irrigation"
            title="Irrigation type"
            subtitle="Field count and mapped area grouped by `irrigation_type`."
          >
            <DonutBreakdown
              data={stats.irrigationBreakdown}
              valueLabel="field(s)"
              emptyMessage="No irrigation values are available yet."
            />
          </Panel>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Panel
            eyebrow="Water"
            title="Water source"
            subtitle="Field count and area grouped by `water_source`."
          >
            <DonutBreakdown
              data={stats.waterBreakdown}
              valueLabel="field(s)"
              emptyMessage="No water source values are available yet."
            />
          </Panel>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Panel
            eyebrow="Soil"
            title="Soil type"
            subtitle="Field count and area grouped by `soil_type`."
          >
            <DonutBreakdown
              data={stats.soilBreakdown}
              valueLabel="field(s)"
              emptyMessage="No soil type values are available yet."
            />
          </Panel>
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <Panel
            eyebrow="Area"
            title="Largest mapped fields"
            subtitle="Top fields ranked by area in hectares."
          >
            <HorizontalRankingChart
              data={stats.largestFields}
              valueFormatter={(value) => formatArea(value)}
              emptyMessage="No usable area values are available yet."
            />
          </Panel>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Panel
            eyebrow="Coordinates and TAM"
            title="Location spread and TAM snapshot"
            subtitle="Latitude and longitude bounds plus TAM coverage from the live registry."
          >
            <Box
              sx={{
                display: 'grid',
                gap: 1,
                gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
              }}
            >
              <StatTile label="Min latitude" value={formatCoordinate(stats.minLatitude)} tone={PALETTE[0]} />
              <StatTile label="Max latitude" value={formatCoordinate(stats.maxLatitude)} tone={PALETTE[1]} />
              <StatTile label="Center latitude" value={formatCoordinate(stats.centerLatitude)} tone={PALETTE[2]} />
              <StatTile label="Min longitude" value={formatCoordinate(stats.minLongitude)} tone={PALETTE[3]} />
              <StatTile label="Max longitude" value={formatCoordinate(stats.maxLongitude)} tone={PALETTE[4]} />
              <StatTile label="Center longitude" value={formatCoordinate(stats.centerLongitude)} tone={PALETTE[5]} />
              <StatTile
                label="Fields with TAM"
                value={formatCount(stats.coverage.find((item) => item.label === 'TAM')?.count ?? 0)}
                tone={PALETTE[6]}
              />
              <StatTile label="Average TAM" value={formatTam(stats.averageTam)} tone={PALETTE[0]} />
              <StatTile label="Max TAM" value={formatTam(stats.maxTam)} tone={PALETTE[1]} />
            </Box>
          </Panel>
        </Grid>
      </Grid>
    </Stack>
  )
}
