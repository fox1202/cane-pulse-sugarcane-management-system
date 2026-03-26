import React, { useMemo } from 'react'
import {
  Box,
  Chip,
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
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type {
  MobileObservationEntryFormFields,
  MobileObservationRecord,
} from '@/services/database.service'
import type { FullObservation } from '@/types/database.types'
import {
  dedupeObservationsForAnalytics,
  getObservationDateValue,
  toFiniteObservationNumber,
} from '@/utils/observationAnalytics'
import { isValid, parseISO } from 'date-fns'

interface YieldAnalysisChartProps {
  observations: Array<FullObservation | MobileObservationRecord>
}

type AnalyticsObservation = (FullObservation | MobileObservationRecord) & {
  source_table?: string
  source_row_id?: string
  entry_form?: MobileObservationEntryFormFields
  monitoring_sheet?: MobileObservationRecord['monitoring_sheet']
  field_registry?: MobileObservationRecord['field_registry']
}

type AreaCropGroup =
  | 'Sugarcane'
  | 'Break Crop'
  | 'Fallow Period'
  | 'Unspecified'

type AnalyticsRecord = {
  id: string
  field: string
  section: string
  block: string
  fieldKey: string
  fieldLabel: string
  sectionBlock: string
  timestamp: number
  cropGroup: AreaCropGroup
  cropTypeRaw: string
  cropClass: string
  variety: string
  sugarcaneClass: string
  breakCropType: string
  soilType: string
  soilPh: number | null
  tamMm: number | null
  fieldAreaHa: number | null
}

type FieldSnapshot = {
  fieldKey: string
  field: string
  fieldLabel: string
  sectionBlock: string
  timestamp: number
  cropGroup: AreaCropGroup
  cropTypeRaw: string
  cropClass: string
  variety: string
  sugarcaneClass: string
  breakCropType: string
  soilType: string
  soilPh: number | null
  tamMm: number | null
  areaHa: number | null
}

type LegendItem = {
  label: string
  color: string
}

type RankedDatum = {
  label: string
  value: number
  color: string
  helper?: string
}

type CoverageDatum = RankedDatum & {
  fieldCount: number
}

type FieldBarDatum = RankedDatum & {
  detail: string
}

type PhBandDatum = RankedDatum & {
  range: string
}

const TOOLTIP_STYLE = {
  borderRadius: 14,
  border: '1px solid rgba(27, 94, 32, 0.14)',
  boxShadow: '0 18px 40px rgba(17, 24, 16, 0.12)',
  background: 'rgba(255,255,255,0.97)',
}

const AREA_COLORS = {
  mapped: '#1b5e20',
  sugarcane: '#56b870',
  breakCrop: '#68c3d4',
  fallow: '#f4a28c',
  unspecified: '#9db7aa',
  phAcidic: '#f08f74',
  phTarget: '#56b870',
  phAlkaline: '#68c3d4',
}

const PALETTE = [
  '#56b870',
  '#68c3d4',
  '#f4a28c',
  '#3f8f57',
  '#f6c56d',
  '#7a4f2c',
  '#8ba888',
  '#7ec9ab',
]

const DISPLAY = '"Syne", sans-serif'
const MONO = '"Space Mono", monospace'

function ChartShell({
  title,
  subtitle,
  eyebrow,
  height = 360,
  accentColor,
  children,
}: {
  title: string
  subtitle?: string
  eyebrow?: string
  height?: number
  accentColor?: string
  children: React.ReactNode
}) {
  const theme = useTheme()
  const tone = accentColor ?? theme.palette.primary.main

  return (
    <Paper
      sx={{
        p: 2.5,
        borderRadius: '28px',
        border: `1px solid ${alpha(tone, 0.16)}`,
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
            radial-gradient(circle at 100% 0%, ${alpha(tone, 0.08)} 0%, transparent 34%),
            linear-gradient(180deg, ${alpha(tone, 0.03)} 0%, transparent 100%)
          `,
        },
      }}
    >
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        {eyebrow && (
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: tone,
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
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.7, mb: 1.8, fontFamily: '"Nunito", sans-serif' }}>
            {subtitle}
          </Typography>
        )}
        <Box sx={{ height }}>
          {children}
        </Box>
      </Box>
    </Paper>
  )
}

function InsightCard({
  eyebrow,
  title,
  body,
  tone,
}: {
  eyebrow: string
  title: string
  body: string
  tone: string
}) {
  return (
    <Paper
      sx={{
        p: 2.2,
        borderRadius: '24px',
        border: `1px solid ${alpha(tone, 0.18)}`,
        background: `
          radial-gradient(circle at 100% 0%, ${alpha(tone, 0.14)} 0%, transparent 42%),
          linear-gradient(180deg, ${alpha(tone, 0.08)} 0%, rgba(255,255,255,0.96) 100%)
        `,
        boxShadow: '0 14px 36px rgba(17,24,16,0.04)',
        height: '100%',
      }}
    >
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: tone,
          mb: 1.2,
          fontFamily: MONO,
        }}
      >
        {eyebrow}
      </Typography>
      <Typography
        sx={{
          fontSize: 24,
          fontWeight: 900,
          color: 'text.primary',
          lineHeight: 1.05,
          letterSpacing: '-0.04em',
          mb: 1,
          fontFamily: DISPLAY,
        }}
      >
        {title}
      </Typography>
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.7, fontFamily: '"Nunito", sans-serif' }}>
        {body}
      </Typography>
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
  helper?: string
  tone: string
}) {
  return (
    <Paper
      sx={{
        p: 2.2,
        borderRadius: '22px',
        border: `1px solid ${alpha(tone, 0.18)}`,
        background: `
          radial-gradient(circle at 100% 0%, ${alpha(tone, 0.16)} 0%, transparent 38%),
          linear-gradient(180deg, ${alpha(tone, 0.11)} 0%, rgba(255,255,255,0.97) 100%)
        `,
        boxShadow: '0 14px 36px rgba(17,24,16,0.04)',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.22,
          backgroundImage: `linear-gradient(135deg, transparent 0%, ${alpha(tone, 0.18)} 1%, transparent 2%, transparent 100%)`,
          backgroundSize: '22px 22px',
        }}
      />
      <Box sx={{ position: 'relative', zIndex: 1 }}>
      <Box sx={{ width: 48, height: 6, borderRadius: 999, bgcolor: alpha(tone, 0.68), mb: 1.4 }} />
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: alpha(tone, 0.86),
          mb: 1,
          fontFamily: MONO,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: { xs: 26, md: 32 },
          fontWeight: 900,
          color: 'text.primary',
          lineHeight: 1.05,
          letterSpacing: '-0.04em',
          fontFamily: DISPLAY,
        }}
      >
        {value}
      </Typography>
      {helper && (
        <Typography sx={{ mt: 0.8, fontSize: 12, color: 'text.secondary', lineHeight: 1.5, fontFamily: '"Nunito", sans-serif' }}>
          {helper}
        </Typography>
      )}
      </Box>
    </Paper>
  )
}

function LegendList({ items }: { items: LegendItem[] }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.4, mb: 1.4 }}>
      {items.map((item) => (
        <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '4px',
              bgcolor: item.color,
              boxShadow: `0 0 0 3px ${alpha(item.color, 0.14)}`,
            }}
          />
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary', fontWeight: 600 }}>
            {item.label}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <Box
      sx={{
        height: '100%',
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

function AreaPieSummary({
  totalArea,
  data,
}: {
  totalArea: number
  data: CoverageDatum[]
}) {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.6 }}>
      <LegendList
        items={data.map((item) => ({ label: item.label, color: item.color }))}
      />

      <Box sx={{ flex: 1, minHeight: 220, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={72}
              outerRadius={116}
              paddingAngle={3}
              stroke="rgba(255,255,255,0.95)"
              strokeWidth={3}
            >
              {data.map((entry) => (
                <Cell key={entry.label} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: number | string | undefined, _name, entry: any) => {
                const numericValue = typeof value === 'number' ? value : Number(value || 0)
                const fieldCount = Number(entry?.payload?.fieldCount || 0)
                return [`${numericValue.toFixed(2)} ha`, `${fieldCount} field(s)`]
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
            <Typography
              sx={{
                fontSize: { xs: 24, md: 30 },
                fontWeight: 900,
                color: 'text.primary',
                lineHeight: 1,
              }}
            >
              {totalArea.toFixed(2)} ha
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
              Total mapped area
            </Typography>
          </Box>
        </Box>
      </Box>

      <Grid container spacing={1.2}>
        {data.map((item) => (
          <Grid key={item.label} size={{ xs: 12, sm: 4 }}>
            <Paper
              sx={{
                p: 1.35,
                borderRadius: '18px',
                border: `1px solid ${alpha(item.color, 0.16)}`,
                bgcolor: alpha(item.color, 0.08),
                boxShadow: 'none',
              }}
            >
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: item.color, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.45 }}>
                {item.label}
              </Typography>
              <Typography sx={{ fontSize: 16, fontWeight: 900, color: 'text.primary', lineHeight: 1.1 }}>
                {item.value.toFixed(2)} ha
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.35 }}>
                {item.fieldCount} field(s)
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

function RankedPieSummary({
  totalValue,
  totalLabel,
  data,
  valueFormatter,
}: {
  totalValue: number
  totalLabel: string
  data: RankedDatum[]
  valueFormatter: (value: number) => string
}) {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.6 }}>
      <LegendList
        items={data.map((item) => ({ label: item.label, color: item.color }))}
      />

      <Box sx={{ flex: 1, minHeight: 220, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={72}
              outerRadius={116}
              paddingAngle={3}
              stroke="rgba(255,255,255,0.95)"
              strokeWidth={3}
            >
              {data.map((entry) => (
                <Cell key={entry.label} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: number | string | undefined) => [
                valueFormatter(Number(value || 0)),
                'Mapped area',
              ]}
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
            <Typography
              sx={{
                fontSize: { xs: 24, md: 30 },
                fontWeight: 900,
                color: 'text.primary',
                lineHeight: 1,
              }}
            >
              {valueFormatter(totalValue)}
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
              {totalLabel}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Stack spacing={1}>
        {data.map((item) => (
          <Paper
            key={item.label}
            sx={{
              p: 1.15,
              borderRadius: '16px',
              border: `1px solid ${alpha(item.color, 0.16)}`,
              bgcolor: alpha(item.color, 0.06),
              boxShadow: 'none',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: 'text.primary' }}>
                {item.helper || item.label}
              </Typography>
              <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: item.color }}>
                {valueFormatter(item.value)}
              </Typography>
            </Box>
          </Paper>
        ))}
      </Stack>
    </Box>
  )
}

function CoverageRows({
  items,
  emptyMessage,
  formatValue,
}: {
  items: RankedDatum[]
  emptyMessage: string
  formatValue: (item: RankedDatum) => string
}) {
  if (items.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  const maxValue = Math.max(...items.map((item) => item.value), 0)

  return (
    <Stack spacing={1.3} sx={{ height: '100%', overflowY: 'auto', pr: 0.3 }}>
      {items.map((item) => (
        <Paper
          key={item.label}
          sx={{
            p: 1.35,
            borderRadius: '18px',
            border: `1px solid ${alpha(item.color, 0.16)}`,
            bgcolor: alpha(item.color, 0.07),
            boxShadow: 'none',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: 'text.primary' }}>
              {item.label}
            </Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: item.color }}>
              {formatValue(item)}
            </Typography>
          </Box>
          {item.helper && (
            <Typography sx={{ mt: 0.4, mb: 0.9, fontSize: 11.5, color: 'text.secondary' }}>
              {item.helper}
            </Typography>
          )}
          <LinearProgress
            variant="determinate"
            value={maxValue > 0 ? (item.value / maxValue) * 100 : 0}
            sx={{
              height: 9,
              borderRadius: 999,
              bgcolor: alpha(item.color, 0.12),
              '& .MuiLinearProgress-bar': {
                borderRadius: 999,
                bgcolor: item.color,
              },
            }}
          />
        </Paper>
      ))}
    </Stack>
  )
}

function parseOptionalDate(value?: string | null): Date | null {
  const normalized = (value ?? '').trim()
  if (!normalized) return null

  const parsed = parseISO(normalized)
  return isValid(parsed) ? parsed : null
}

function getEntryForm(observation: AnalyticsObservation): MobileObservationEntryFormFields | undefined {
  return observation.entry_form
}

function hasMeaningfulText(value?: string | null): boolean {
  return Boolean((value ?? '').trim())
}

function pickText(...values: Array<string | null | undefined>): string {
  const found = values.find((value) => hasMeaningfulText(value))
  return (found ?? '').trim()
}

function pickFinite(...values: unknown[]): number | null {
  for (const value of values) {
    const finite = toFiniteObservationNumber(value)
    if (finite !== null) {
      return finite
    }
  }
  return null
}

function pickPositiveFinite(...values: unknown[]): number | null {
  for (const value of values) {
    const finite = toFiniteObservationNumber(value)
    if (finite !== null && finite > 0) {
      return finite
    }
  }
  return null
}

function isFallbackLabel(value?: string | null): boolean {
  const normalized = (value ?? '').trim().toLowerCase()
  return !normalized || normalized.startsWith('unspecified')
}

function formatMetricValue(value: number | null, unit = '', digits = 2): string {
  if (value === null) return 'N/A'
  const rounded = value.toFixed(digits)
  return unit ? `${rounded} ${unit}` : rounded
}

function formatAreaValue(value: number): string {
  return `${value.toFixed(2)} ha`
}

function sumBy<T>(items: T[], selector: (item: T) => number): number {
  return items.reduce((sum, item) => sum + selector(item), 0)
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function toOrdinal(value: number): string {
  const mod10 = value % 10
  const mod100 = value % 100

  if (mod10 === 1 && mod100 !== 11) return `${value}st`
  if (mod10 === 2 && mod100 !== 12) return `${value}nd`
  if (mod10 === 3 && mod100 !== 13) return `${value}rd`
  return `${value}th`
}

function truncateLabel(value: string, max = 18): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

function normalizeGeometry(value: any): any | null {
  if (!value) return null

  if (typeof value === 'string') {
    try {
      return normalizeGeometry(JSON.parse(value))
    } catch {
      return null
    }
  }

  if (value.type === 'Feature') return normalizeGeometry(value.geometry)
  if (value.type === 'FeatureCollection') return normalizeGeometry(value.features?.[0]?.geometry)
  if (value.geometry) return normalizeGeometry(value.geometry)
  if (value.geom) return normalizeGeometry(value.geom)
  return value
}

function getMetersPerDegreeLatitude(latitude: number): number {
  const radians = latitude * (Math.PI / 180)
  return 111132.92 - 559.82 * Math.cos(2 * radians) + 1.175 * Math.cos(4 * radians)
}

function getMetersPerDegreeLongitude(latitude: number): number {
  const radians = latitude * (Math.PI / 180)
  return 111412.84 * Math.cos(radians) - 93.5 * Math.cos(3 * radians)
}

function getRingAreaSqMeters(ring: number[][]): number {
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

function getPolygonAreaSqMeters(rings: number[][][]): number {
  if (!Array.isArray(rings) || rings.length === 0) {
    return 0
  }

  const [outerRing = [], ...holes] = rings
  const outerArea = getRingAreaSqMeters(outerRing)
  const holeArea = holes.reduce((sum, ring) => sum + getRingAreaSqMeters(ring), 0)
  return Math.max(outerArea - holeArea, 0)
}

function getGeometryAreaHa(geometry: any): number | null {
  const normalized = normalizeGeometry(geometry)
  if (!normalized?.type) {
    return null
  }

  let areaSqMeters = 0

  if (normalized.type === 'Polygon') {
    areaSqMeters = getPolygonAreaSqMeters(normalized.coordinates ?? [])
  } else if (normalized.type === 'MultiPolygon') {
    areaSqMeters = (normalized.coordinates ?? [])
      .reduce((sum: number, polygon: number[][][]) => sum + getPolygonAreaSqMeters(polygon), 0)
  }

  if (!Number.isFinite(areaSqMeters) || areaSqMeters <= 0) {
    return null
  }

  return Number((areaSqMeters / 10_000).toFixed(2))
}

function resolveRecordAreaHa(
  observation: AnalyticsObservation,
  entryForm?: MobileObservationEntryFormFields
): number | null {
  const directArea = pickPositiveFinite(
    entryForm?.area,
    entryForm?.block_size,
    observation.monitoring_sheet?.area
  )

  if (directArea !== null) {
    return Number(directArea.toFixed(2))
  }

  return getGeometryAreaHa(
    observation.monitoring_sheet?.geom_polygon
      ?? entryForm?.geom_polygon
      ?? observation.field_registry?.geom
  )
}

function getAreaCropGroup(value?: string | null): AreaCropGroup {
  const normalized = (value ?? '').trim().toLowerCase()

  if (!normalized) return 'Unspecified'
  if (/break\s*crop|breakcrop/.test(normalized)) return 'Break Crop'
  if (/fallow|fullow/.test(normalized)) return 'Fallow Period'
  if (/sugar\s*cane|plant\s*cane|\bratoon\b|\bcane\b/.test(normalized)) return 'Sugarcane'
  return 'Unspecified'
}

function getSugarcaneClassLabel(
  cropClass?: string | null,
  ratoonNumber?: number | null,
  cropTypeRaw?: string | null
): string {
  const normalizedClass = (cropClass ?? '').trim()

  if (/plant\s*cane/i.test(normalizedClass)) {
    return 'Plant Cane'
  }

  const classMatch = normalizedClass.match(/(\d+)(?:st|nd|rd|th)?\s*ratoon/i)
  if (classMatch) {
    return `${toOrdinal(Number(classMatch[1]))} Ratoon`
  }

  if (ratoonNumber !== null && ratoonNumber !== undefined && ratoonNumber > 0) {
    return `${toOrdinal(ratoonNumber)} Ratoon`
  }

  if (normalizedClass && getAreaCropGroup(normalizedClass) === 'Sugarcane') {
    return normalizedClass
  }

  if (getAreaCropGroup(cropTypeRaw) === 'Sugarcane') {
    return 'Unspecified cane'
  }

  return ''
}

function getSugarcaneSortOrder(label: string): number {
  if (/plant\s*cane/i.test(label)) {
    return 0
  }

  const ratoonMatch = label.match(/(\d+)(?:st|nd|rd|th)?\s*ratoon/i)
  if (ratoonMatch) {
    return Number(ratoonMatch[1])
  }

  return 999
}

function getBreakCropLabel(cropClass?: string | null, variety?: string | null): string {
  const normalizedClass = (cropClass ?? '').trim()
  if (normalizedClass && getAreaCropGroup(normalizedClass) === 'Unspecified') {
    return normalizedClass
  }

  const normalizedVariety = (variety ?? '').trim()
  if (normalizedVariety) {
    return normalizedVariety
  }

  return 'Unspecified break crop'
}

function getPhBand(value: number): { label: string; range: string; color: string } {
  if (value < 5.5) {
    return {
      label: 'Acidic',
      range: 'Below 5.5 pH',
      color: AREA_COLORS.phAcidic,
    }
  }

  if (value > 7) {
    return {
      label: 'Alkaline',
      range: 'Above 7.0 pH',
      color: AREA_COLORS.phAlkaline,
    }
  }

  return {
    label: 'Working Range',
    range: '5.5 to 7.0 pH',
    color: AREA_COLORS.phTarget,
  }
}

function createCoverageData(
  fields: FieldSnapshot[],
  selector: (field: FieldSnapshot) => string,
  sortComparator?: (left: CoverageDatum, right: CoverageDatum) => number
): CoverageDatum[] {
  const grouped = new Map<string, { value: number; fieldCount: number }>()

  fields.forEach((field) => {
    if (field.areaHa === null || field.areaHa <= 0) {
      return
    }

    const label = selector(field)
    if (!label) {
      return
    }

    const existing = grouped.get(label) ?? { value: 0, fieldCount: 0 }
    existing.value += field.areaHa
    existing.fieldCount += 1
    grouped.set(label, existing)
  })

  const data = Array.from(grouped.entries())
    .map(([label, summary]) => ({
      label,
      value: Number(summary.value.toFixed(2)),
      fieldCount: summary.fieldCount,
      color: AREA_COLORS.unspecified,
    }))

  if (sortComparator) {
    data.sort(sortComparator)
  } else {
    data.sort((left, right) => right.value - left.value || left.label.localeCompare(right.label))
  }

  return data.map((item, index) => ({
    ...item,
    color: PALETTE[index % PALETTE.length],
  }))
}

export const YieldAnalysisChart: React.FC<YieldAnalysisChartProps> = ({ observations }) => {
  const theme = useTheme()

  const records = useMemo<AnalyticsRecord[]>(() => {
    const deduped = dedupeObservationsForAnalytics(observations as AnalyticsObservation[])

    return deduped.map((observation) => {
      const entryForm = getEntryForm(observation)
      const monitoring = observation.monitoring_sheet
      const recordedAtRaw = getObservationDateValue(observation)
        || entryForm?.date_recorded
        || monitoring?.date_recorded
        || ''
      const recordedAt = parseOptionalDate(recordedAtRaw) ?? new Date(0)
      const field = pickText(
        observation.field_name,
        entryForm?.selected_field,
        monitoring?.field_name
      ) || 'Unknown field'
      const section = pickText(
        observation.section_name,
        monitoring?.section_name
      )
      const block = pickText(
        observation.block_id,
        monitoring?.block_id
      )
      const rawCropType = pickText(
        entryForm?.crop_type,
        monitoring?.crop_type,
        observation.crop_information?.crop_type,
        entryForm?.crop_class,
        monitoring?.crop_class
      )
      const cropClass = pickText(entryForm?.crop_class, monitoring?.crop_class)
      const cropGroup = getAreaCropGroup(`${rawCropType} ${cropClass}`.trim() || rawCropType)
      const variety = pickText(
        observation.crop_information?.variety,
        entryForm?.variety,
        monitoring?.variety
      )
      const ratoonNumber = pickFinite(monitoring?.ratoon_number)
      const sectionBlock = [section, block].filter(Boolean).join(' / ') || 'Section / block not set'

      return {
        id: pickText(observation.client_uuid, String(observation.id)) || String(observation.id),
        field,
        section,
        block,
        fieldKey: [section.toLowerCase(), block.toLowerCase(), field.toLowerCase()].join('|'),
        fieldLabel: field,
        sectionBlock,
        timestamp: recordedAt.getTime(),
        cropGroup,
        cropTypeRaw: rawCropType || 'Unspecified',
        cropClass: cropClass || 'Unspecified',
        variety: variety || 'Unspecified',
        sugarcaneClass: cropGroup === 'Sugarcane'
          ? getSugarcaneClassLabel(cropClass, ratoonNumber, rawCropType)
          : '',
        breakCropType: cropGroup === 'Break Crop'
          ? getBreakCropLabel(cropClass, variety)
          : '',
        soilType: pickText(
          entryForm?.soil_type,
          monitoring?.soil_type,
          observation.soil_characteristics?.soil_type
        ) || 'Unspecified',
        soilPh: pickFinite(
          entryForm?.soil_ph,
          monitoring?.soil_ph,
          observation.soil_characteristics?.soil_ph
        ),
        tamMm: pickFinite(entryForm?.tamm_area, entryForm?.tam_mm, monitoring?.tam_mm),
        fieldAreaHa: resolveRecordAreaHa(observation, entryForm),
      }
    })
  }, [observations])

  const fieldSnapshots = useMemo<FieldSnapshot[]>(() => {
    const byField = new Map<string, FieldSnapshot>()

    records.forEach((record) => {
      const existing = byField.get(record.fieldKey)

      if (!existing) {
        byField.set(record.fieldKey, {
          fieldKey: record.fieldKey,
          field: record.field,
          fieldLabel: record.fieldLabel,
          sectionBlock: record.sectionBlock,
          timestamp: record.timestamp,
          cropGroup: record.cropGroup,
          cropTypeRaw: record.cropTypeRaw,
          cropClass: record.cropClass,
          variety: record.variety,
          sugarcaneClass: record.sugarcaneClass,
          breakCropType: record.breakCropType,
          soilType: record.soilType,
          soilPh: record.soilPh,
          tamMm: record.tamMm,
          areaHa: record.fieldAreaHa,
        })
        return
      }

      if (existing.areaHa === null && record.fieldAreaHa !== null) {
        existing.areaHa = record.fieldAreaHa
      }

      if (existing.cropGroup === 'Unspecified' && record.cropGroup !== 'Unspecified') {
        existing.cropGroup = record.cropGroup
      }

      if (isFallbackLabel(existing.cropTypeRaw) && !isFallbackLabel(record.cropTypeRaw)) {
        existing.cropTypeRaw = record.cropTypeRaw
      }

      if (isFallbackLabel(existing.cropClass) && !isFallbackLabel(record.cropClass)) {
        existing.cropClass = record.cropClass
      }

      if (isFallbackLabel(existing.variety) && !isFallbackLabel(record.variety)) {
        existing.variety = record.variety
      }

      if (isFallbackLabel(existing.sugarcaneClass) && !isFallbackLabel(record.sugarcaneClass)) {
        existing.sugarcaneClass = record.sugarcaneClass
      }

      if (isFallbackLabel(existing.breakCropType) && !isFallbackLabel(record.breakCropType)) {
        existing.breakCropType = record.breakCropType
      }

      if (isFallbackLabel(existing.soilType) && !isFallbackLabel(record.soilType)) {
        existing.soilType = record.soilType
      }

      if (existing.soilPh === null && record.soilPh !== null) {
        existing.soilPh = record.soilPh
      }

      if (existing.tamMm === null && record.tamMm !== null) {
        existing.tamMm = record.tamMm
      }
    })

    return Array.from(byField.values()).sort((left, right) => right.timestamp - left.timestamp)
  }, [records])

  const measuredFields = useMemo(
    () => fieldSnapshots.filter((field) => field.areaHa !== null && field.areaHa > 0),
    [fieldSnapshots]
  )

  const typedMeasuredFields = useMemo(
    () => measuredFields.filter((field) => field.cropGroup !== 'Unspecified'),
    [measuredFields]
  )

  const sugarcaneFields = useMemo(
    () => measuredFields.filter((field) => field.cropGroup === 'Sugarcane'),
    [measuredFields]
  )

  const breakCropFields = useMemo(
    () => measuredFields.filter((field) => field.cropGroup === 'Break Crop'),
    [measuredFields]
  )

  const fallowFields = useMemo(
    () => measuredFields.filter((field) => field.cropGroup === 'Fallow Period'),
    [measuredFields]
  )

  const phFields = useMemo(
    () => fieldSnapshots.filter((field) => field.soilPh !== null),
    [fieldSnapshots]
  )

  const tamFields = useMemo(
    () => fieldSnapshots.filter((field) => field.tamMm !== null),
    [fieldSnapshots]
  )

  const totalMeasuredArea = useMemo(
    () => sumBy(measuredFields, (field) => field.areaHa ?? 0),
    [measuredFields]
  )

  const totalSugarcaneArea = useMemo(
    () => sumBy(sugarcaneFields, (field) => field.areaHa ?? 0),
    [sugarcaneFields]
  )

  const totalBreakCropArea = useMemo(
    () => sumBy(breakCropFields, (field) => field.areaHa ?? 0),
    [breakCropFields]
  )

  const totalFallowArea = useMemo(
    () => sumBy(fallowFields, (field) => field.areaHa ?? 0),
    [fallowFields]
  )

  const classifiedMeasuredArea = useMemo(
    () => sumBy(typedMeasuredFields, (field) => field.areaHa ?? 0),
    [typedMeasuredFields]
  )

  const uniqueSoilTypes = useMemo(
    () => new Set(
      fieldSnapshots
        .map((field) => field.soilType)
        .filter((soilType) => !isFallbackLabel(soilType))
        .map((soilType) => soilType.toLowerCase())
    ).size,
    [fieldSnapshots]
  )

  const phValues = useMemo(
    () => phFields.map((field) => field.soilPh as number),
    [phFields]
  )

  const tamValues = useMemo(
    () => tamFields.map((field) => field.tamMm as number),
    [tamFields]
  )

  const averagePh = useMemo(() => average(phValues), [phValues])
  const averageTam = useMemo(() => average(tamValues), [tamValues])
  const minPh = useMemo(() => (phValues.length > 0 ? Math.min(...phValues) : null), [phValues])
  const maxPh = useMemo(() => (phValues.length > 0 ? Math.max(...phValues) : null), [phValues])
  const minTam = useMemo(() => (tamValues.length > 0 ? Math.min(...tamValues) : null), [tamValues])
  const maxTam = useMemo(() => (tamValues.length > 0 ? Math.max(...tamValues) : null), [tamValues])

  const heroNote = useMemo(() => {
    if (fieldSnapshots.length === 0) {
      return 'No live field records are available yet.'
    }

    if (measuredFields.length === 0) {
      return 'Live records are available, but none of the latest field snapshots include a mapped area yet.'
    }

    if (typedMeasuredFields.length === measuredFields.length) {
      return `All ${measuredFields.length} mapped fields are classified for crop coverage and ratoon grouping.`
    }

    return `${typedMeasuredFields.length} of ${measuredFields.length} mapped fields are fully classified for crop coverage.`
  }, [fieldSnapshots.length, measuredFields.length, typedMeasuredFields.length])

  const areaOverviewData = useMemo<CoverageDatum[]>(
    () => [
      {
        label: 'Sugarcane',
        value: Number(totalSugarcaneArea.toFixed(2)),
        fieldCount: sugarcaneFields.length,
        color: AREA_COLORS.sugarcane,
      },
      {
        label: 'Break Crop',
        value: Number(totalBreakCropArea.toFixed(2)),
        fieldCount: breakCropFields.length,
        color: AREA_COLORS.breakCrop,
      },
      {
        label: 'Fallow Period',
        value: Number(totalFallowArea.toFixed(2)),
        fieldCount: fallowFields.length,
        color: AREA_COLORS.fallow,
      },
    ].filter((item) => item.value > 0),
    [
      breakCropFields.length,
      fallowFields.length,
      sugarcaneFields.length,
      totalBreakCropArea,
      totalFallowArea,
      totalSugarcaneArea,
    ]
  )

  const phBandData = useMemo<PhBandDatum[]>(() => {
    const grouped = new Map<string, { value: number; range: string; color: string }>()

    phFields.forEach((field) => {
      const soilPh = field.soilPh
      if (soilPh === null) {
        return
      }

      const band = getPhBand(soilPh)
      const existing = grouped.get(band.label) ?? { value: 0, range: band.range, color: band.color }
      existing.value += 1
      grouped.set(band.label, existing)
    })

    const order = ['Acidic', 'Working Range', 'Alkaline']

    return order
      .map((label) => {
        const entry = grouped.get(label)
        if (!entry) {
          return null
        }

        return {
          label,
          value: entry.value,
          range: entry.range,
          color: entry.color,
        }
      })
      .filter((item): item is PhBandDatum => item !== null)
  }, [phFields])

  const tamFieldData = useMemo<FieldBarDatum[]>(
    () => tamFields
      .slice()
      .sort((left, right) => (right.tamMm ?? 0) - (left.tamMm ?? 0))
      .slice(0, 8)
      .map((field, index) => ({
        label: truncateLabel(field.fieldLabel, 18),
        detail: field.sectionBlock,
        value: Number((field.tamMm ?? 0).toFixed(2)),
        color: PALETTE[index % PALETTE.length],
        helper: field.fieldLabel,
      })),
    [tamFields]
  )

  const fieldAreaData = useMemo<FieldBarDatum[]>(
    () => measuredFields
      .slice()
      .sort((left, right) => (right.areaHa ?? 0) - (left.areaHa ?? 0))
      .slice(0, 8)
      .map((field, index) => ({
        label: truncateLabel(field.fieldLabel, 18),
        detail: field.sectionBlock,
        value: Number((field.areaHa ?? 0).toFixed(2)),
        color: PALETTE[index % PALETTE.length],
        helper: field.fieldLabel,
      })),
    [measuredFields]
  )

  const topFieldAreaTotal = useMemo(
    () => sumBy(fieldAreaData, (item) => item.value),
    [fieldAreaData]
  )

  const soilTypeCoverageData = useMemo(
    () => createCoverageData(
      measuredFields.filter((field) => !isFallbackLabel(field.soilType)),
      (field) => field.soilType
    ).map((item) => ({
      ...item,
      helper: `${item.fieldCount} field(s)`,
    })),
    [measuredFields]
  )

  const sugarcaneRatoonData = useMemo(
    () => createCoverageData(
      sugarcaneFields,
      (field) => field.sugarcaneClass || 'Unspecified cane',
      (left, right) => getSugarcaneSortOrder(left.label) - getSugarcaneSortOrder(right.label) || right.value - left.value
    ),
    [sugarcaneFields]
  )

  const breakCropCoverageData = useMemo(
    () => createCoverageData(
      breakCropFields,
      (field) => field.breakCropType || 'Unspecified break crop'
    ),
    [breakCropFields]
  )

  const fallowFieldData = useMemo<RankedDatum[]>(
    () => fallowFields
      .slice()
      .sort((left, right) => (right.areaHa ?? 0) - (left.areaHa ?? 0))
      .slice(0, 5)
      .map((field, index) => ({
        label: field.fieldLabel,
        value: Number((field.areaHa ?? 0).toFixed(2)),
        color: PALETTE[index % PALETTE.length],
        helper: field.sectionBlock,
      })),
    [fallowFields]
  )

  const fallowShare = useMemo(
    () => (totalMeasuredArea > 0 ? (totalFallowArea / totalMeasuredArea) * 100 : 0),
    [totalFallowArea, totalMeasuredArea]
  )

  const areaLeader = useMemo(
    () => [...areaOverviewData].sort((left, right) => right.value - left.value)[0] ?? null,
    [areaOverviewData]
  )

  const phLeader = useMemo(
    () => [...phBandData].sort((left, right) => right.value - left.value)[0] ?? null,
    [phBandData]
  )

  const tamLeader = tamFieldData[0] ?? null

  return (
    <Box sx={{ width: '100%' }}>
      <Paper
        sx={{
          mb: 2.8,
          p: { xs: 2.2, md: 3 },
          borderRadius: '34px',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
          position: 'relative',
          overflow: 'hidden',
          background: `
            radial-gradient(circle at 0% 0%, ${alpha(AREA_COLORS.sugarcane, 0.2)} 0%, transparent 30%),
            radial-gradient(circle at 100% 0%, ${alpha(AREA_COLORS.fallow, 0.18)} 0%, transparent 32%),
            linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.98) 100%)
          `,
          boxShadow: '0 20px 46px rgba(17,24,16,0.06)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            opacity: 0.26,
            backgroundImage: `linear-gradient(120deg, transparent 0%, ${alpha(theme.palette.primary.main, 0.1)} 1%, transparent 2%, transparent 100%)`,
            backgroundSize: '24px 24px',
          }}
        />

        <Grid container spacing={2.4} sx={{ position: 'relative', zIndex: 1 }}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'primary.main',
                mb: 1,
              }}
            >
              Field Intelligence Canvas
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: 28, md: 40 },
                fontWeight: 900,
                lineHeight: 1.02,
                letterSpacing: '-0.05em',
                color: 'text.primary',
                maxWidth: 680,
                mb: 1.2,
              }}
            >
              Live area, soil, and crop coverage shaped from the latest field records
            </Typography>
            <Typography sx={{ maxWidth: 720, fontSize: 13.5, lineHeight: 1.8, color: 'text.secondary', mb: 2.1 }}>
              Each chart keeps the latest usable snapshot for every field, then combines mapped area,
              pH, TAM, soil type, sugarcane ratoons, break crops, and fallow coverage into one view.
            </Typography>

            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1.6 }}>
              <Chip
                size="small"
                label={`${fieldSnapshots.length} live field snapshots`}
                sx={{ bgcolor: alpha(AREA_COLORS.mapped, 0.1), color: 'primary.dark', fontWeight: 700 }}
              />
              <Chip
                size="small"
                label={`${measuredFields.length} mapped fields`}
                sx={{ bgcolor: alpha(AREA_COLORS.sugarcane, 0.12), color: 'primary.dark', fontWeight: 700 }}
              />
              <Chip
                size="small"
                label={`${phFields.length} pH readings`}
                sx={{ bgcolor: alpha(AREA_COLORS.phTarget, 0.12), color: 'primary.dark', fontWeight: 700 }}
              />
              <Chip
                size="small"
                label={`${tamFields.length} TAM readings`}
                sx={{ bgcolor: alpha(AREA_COLORS.breakCrop, 0.14), color: 'primary.dark', fontWeight: 700 }}
              />
              <Chip
                size="small"
                label={`${uniqueSoilTypes} soil type(s)`}
                sx={{ bgcolor: alpha(AREA_COLORS.fallow, 0.14), color: 'primary.dark', fontWeight: 700 }}
              />
            </Stack>

            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.7 }}>
              {heroNote}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, lg: 5 }}>
            <Grid container spacing={1.4}>
              <Grid size={{ xs: 6 }}>
                <MetricCard
                  label="Classified Land"
                  value={formatMetricValue(classifiedMeasuredArea, 'ha')}
                  helper="Mapped area that can be placed into crop coverage and ratoon charts."
                  tone={AREA_COLORS.sugarcane}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <MetricCard
                  label="Soil Types Logged"
                  value={String(uniqueSoilTypes)}
                  helper="Distinct soil labels currently attached to live field snapshots."
                  tone={AREA_COLORS.breakCrop}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <MetricCard
                  label="Lowest pH"
                  value={formatMetricValue(minPh)}
                  helper={maxPh === null ? 'No pH range is available yet.' : `Highest pH is ${maxPh.toFixed(2)}.`}
                  tone={AREA_COLORS.phAcidic}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <MetricCard
                  label="Highest TAM"
                  value={formatMetricValue(maxTam, 'mm')}
                  helper={minTam === null ? 'No TAM range is available yet.' : `Lowest TAM is ${minTam.toFixed(0)} mm.`}
                  tone={AREA_COLORS.phAlkaline}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          mb: 3,
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, minmax(0, 1fr))',
            xl: 'repeat(12, minmax(0, 1fr))',
          },
          '& > *': { minWidth: 0 },
        }}
      >
        <Box sx={{ gridColumn: { xl: 'span 3' } }}>
          <MetricCard
            label="Latest Field Snapshots"
            value={String(fieldSnapshots.length)}
            helper="One latest dated snapshot per field for the live charts below."
            tone={AREA_COLORS.mapped}
          />
        </Box>
        <Box sx={{ gridColumn: { xl: 'span 3' } }}>
          <MetricCard
            label="Total Mapped Area"
            value={formatMetricValue(totalMeasuredArea, 'ha')}
            helper="Using recorded hectares first, then polygon geometry when hectares are missing."
            tone={AREA_COLORS.sugarcane}
          />
        </Box>
        <Box sx={{ gridColumn: { xl: 'span 3' } }}>
          <MetricCard
            label="Average Soil pH"
            value={formatMetricValue(averagePh)}
            helper={`${phFields.length} field(s) contribute to the live pH profile.`}
            tone={AREA_COLORS.phTarget}
          />
        </Box>
        <Box sx={{ gridColumn: { xl: 'span 3' } }}>
          <MetricCard
            label="Average TAM"
            value={formatMetricValue(averageTam, 'mm', 0)}
            helper={`${tamFields.length} field(s) contribute to the live TAM profile.`}
            tone={AREA_COLORS.breakCrop}
          />
        </Box>
        <Box sx={{ gridColumn: { xl: 'span 6' } }}>
          <InsightCard
            eyebrow="Coverage Lead"
            title={
              areaLeader
                ? `${areaLeader.label} leads with ${formatAreaValue(areaLeader.value)}`
                : 'Coverage snapshots are waiting for mapped classifications'
            }
            body={
              areaLeader
                ? `${areaLeader.fieldCount} mapped field(s) currently drive the biggest share of classified land coverage in this live board.`
                : 'Once the mapped fields have usable crop classifications, this card will call out the dominant land-use story automatically.'
            }
            tone={AREA_COLORS.sugarcane}
          />
        </Box>
        <Box sx={{ gridColumn: { xl: 'span 6' } }}>
          <InsightCard
            eyebrow="Field Story"
            title={
              tamLeader
                ? `${tamLeader.helper} is the strongest TAM field at ${tamLeader.value.toFixed(0)} mm`
                : phLeader
                  ? `${phLeader.label} is the dominant soil pH band`
                  : 'Water and soil signals are still building'
            }
            body={
              tamLeader
                ? `${tamLeader.detail} currently sits at the top of the TAM ranking, while ${phLeader ? `${phLeader.label.toLowerCase()} pH conditions lead the chemistry profile.` : 'soil chemistry is still collecting.'}`
                : phLeader
                  ? `${phLeader.value} field(s) are currently concentrated in the ${phLeader.range.toLowerCase()} range on the latest field snapshots.`
                  : 'As TAM and pH values arrive, this board will turn them into short editorial summaries as well as charts.'
            }
            tone={AREA_COLORS.breakCrop}
          />
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: {
            xs: '1fr',
            lg: 'repeat(2, minmax(0, 1fr))',
            xl: 'repeat(12, minmax(0, 1fr))',
          },
          alignItems: 'start',
          '& > *': { minWidth: 0 },
        }}
      >
        <Box sx={{ gridColumn: { xl: 'span 7' } }}>
          <ChartShell
            title="Crop Land Use Coverage"
            subtitle="Mapped hectares grouped into sugarcane, break crop, and fallow period using the latest classified field snapshot."
            eyebrow="Area Coverage"
            height={450}
            accentColor={AREA_COLORS.sugarcane}
          >
            {totalMeasuredArea > 0 && areaOverviewData.length > 0 ? (
              <AreaPieSummary totalArea={totalMeasuredArea} data={areaOverviewData} />
            ) : (
              <EmptyState message="Record mapped field areas and crop types to unlock the crop land coverage chart." />
            )}
          </ChartShell>
        </Box>

        <Box sx={{ gridColumn: { xl: 'span 5' } }}>
          <ChartShell
            title="Soil pH Range"
            subtitle="Latest pH reading per field grouped into acidity bands so you can see where soil chemistry is clustering."
            eyebrow="pH Profile"
            height={450}
            accentColor={AREA_COLORS.phTarget}
          >
            {phBandData.length > 0 ? (
              <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <LegendList items={phBandData.map((item) => ({ label: `${item.label} • ${item.range}`, color: item.color }))} />
                <Box sx={{ flex: 1, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={phBandData} margin={{ top: 6, right: 20, left: 0, bottom: 6 }}>
                      <CartesianGrid strokeDasharray="4 4" stroke={alpha(theme.palette.primary.main, 0.12)} vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value: number | string | undefined, _name, entry: any) => [
                          `${Number(value || 0)} field(s)`,
                          entry?.payload?.range || 'pH band',
                        ]}
                        labelFormatter={(label) => String(label)}
                      />
                      <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={42}>
                        {phBandData.map((entry) => (
                          <Cell key={entry.label} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>

                <Grid container spacing={1.2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <MetricCard
                      label="Average pH"
                      value={formatMetricValue(averagePh)}
                      helper="Mean of latest field pH values."
                      tone={AREA_COLORS.phTarget}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <MetricCard
                      label="Lowest pH"
                      value={formatMetricValue(minPh)}
                      helper="Most acidic latest field snapshot."
                      tone={AREA_COLORS.phAcidic}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <MetricCard
                      label="Highest pH"
                      value={formatMetricValue(maxPh)}
                      helper="Most alkaline latest field snapshot."
                      tone={AREA_COLORS.phAlkaline}
                    />
                  </Grid>
                </Grid>
              </Box>
            ) : (
              <EmptyState message="Soil pH charts will appear here once fields include live pH readings." />
            )}
          </ChartShell>
        </Box>

        <Box sx={{ gridColumn: { xl: 'span 4' } }}>
          <ChartShell
            title="TAM by Field"
            subtitle="Top fields ranked by their latest recorded TAM value, helping you spot the strongest water-balance readings quickly."
            eyebrow="TAM Profile"
            height={350}
            accentColor={AREA_COLORS.breakCrop}
          >
            {tamFieldData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tamFieldData} layout="vertical" margin={{ top: 4, right: 18, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke={alpha(theme.palette.primary.main, 0.12)} horizontal={false} />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                    label={{ value: 'TAM (mm)', position: 'insideBottom', offset: -2, fill: theme.palette.text.secondary, fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={94}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: number | string | undefined, _name, entry: any) => [
                      `${Number(value || 0).toFixed(0)} mm`,
                      entry?.payload?.helper || 'Field',
                    ]}
                    labelFormatter={(label) => {
                      const match = tamFieldData.find((item) => item.label === label)
                      return match?.detail || String(label)
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 12, 12, 0]} barSize={22}>
                    {tamFieldData.map((entry) => (
                      <Cell key={`${entry.label}-${entry.detail}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="TAM graphs will appear here once the live field snapshots include TAM values." />
            )}
          </ChartShell>
        </Box>

        <Box sx={{ gridColumn: { xl: 'span 4' } }}>
          <ChartShell
            title="Largest Blocks or Fields"
            subtitle="The largest mapped fields shown as an area-share pie chart, using live hectares first and polygon geometry when direct area is missing."
            eyebrow="Field Footprint"
            height={430}
            accentColor={AREA_COLORS.mapped}
          >
            {fieldAreaData.length > 0 ? (
              <RankedPieSummary
                totalValue={Number(topFieldAreaTotal.toFixed(2))}
                totalLabel="Top mapped area"
                data={fieldAreaData}
                valueFormatter={formatAreaValue}
              />
            ) : (
              <EmptyState message="The area ranking will appear here once live fields include a recorded or polygon-derived area." />
            )}
          </ChartShell>
        </Box>

        <Box sx={{ gridColumn: { xl: 'span 4' } }}>
          <ChartShell
            title="Soil Type Coverage"
            subtitle="Mapped land grouped by soil type so you can compare how much area sits under each soil profile."
            eyebrow="Soil Types"
            height={390}
            accentColor={AREA_COLORS.phAcidic}
          >
            <CoverageRows
              items={soilTypeCoverageData}
              emptyMessage="Soil type coverage will appear here once mapped fields include a soil type label."
              formatValue={(item) => formatAreaValue(item.value)}
            />
          </ChartShell>
        </Box>

        <Box sx={{ gridColumn: { xl: 'span 7' } }}>
          <ChartShell
            title="Sugarcane Area by Ratoon"
            subtitle="Sugarcane hectares grouped so Plant Cane, 1st Ratoon, 2nd Ratoon, and other ratoons stay together in clear live coverage bands."
            eyebrow="Sugarcane Classes"
            height={380}
            accentColor={AREA_COLORS.sugarcane}
          >
            {sugarcaneRatoonData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sugarcaneRatoonData} layout="vertical" margin={{ top: 4, right: 18, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke={alpha(theme.palette.primary.main, 0.12)} horizontal={false} />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                    label={{ value: 'Area (ha)', position: 'insideBottom', offset: -2, fill: theme.palette.text.secondary, fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={110}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: number | string | undefined, _name, entry: any) => [
                      `${Number(value || 0).toFixed(2)} ha`,
                      `${Number(entry?.payload?.fieldCount || 0)} field(s)`,
                    ]}
                    labelFormatter={(label) => String(label)}
                  />
                  <Bar dataKey="value" radius={[0, 12, 12, 0]} barSize={22}>
                    {sugarcaneRatoonData.map((entry) => (
                      <Cell key={entry.label} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Sugarcane ratoon coverage will appear here once mapped fields are classified as Plant Cane or ratoons." />
            )}
          </ChartShell>
        </Box>

        <Box sx={{ gridColumn: { xl: 'span 5' } }}>
          <ChartShell
            title="Break Crop Area by Crop"
            subtitle="Break crop hectares grouped by the recorded crop class so soyabeans, maize, sugarbeans, and other break crops show their own land coverage."
            eyebrow="Break Crop Mix"
            height={380}
            accentColor={AREA_COLORS.breakCrop}
          >
            {breakCropCoverageData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakCropCoverageData} layout="vertical" margin={{ top: 4, right: 18, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke={alpha(theme.palette.primary.main, 0.12)} horizontal={false} />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                    label={{ value: 'Area (ha)', position: 'insideBottom', offset: -2, fill: theme.palette.text.secondary, fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={114}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: number | string | undefined, _name, entry: any) => [
                      `${Number(value || 0).toFixed(2)} ha`,
                      `${Number(entry?.payload?.fieldCount || 0)} field(s)`,
                    ]}
                    labelFormatter={(label) => String(label)}
                  />
                  <Bar dataKey="value" radius={[0, 12, 12, 0]} barSize={22}>
                    {breakCropCoverageData.map((entry) => (
                      <Cell key={entry.label} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Break crop coverage will appear here once mapped break crop fields include a crop class or crop label." />
            )}
          </ChartShell>
        </Box>

        <Box sx={{ gridColumn: { xl: 'span 12' } }}>
          <ChartShell
            title="Fallow Period Coverage"
            subtitle="A quick view of how much mapped land is resting in fallow and which fields carry the largest fallow footprint right now."
            eyebrow="Fallow Land"
            height={380}
            accentColor={AREA_COLORS.fallow}
          >
            {fallowFields.length > 0 ? (
              <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.6 }}>
                <Grid container spacing={1.2}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <MetricCard
                      label="Fallow Area"
                      value={formatMetricValue(totalFallowArea, 'ha')}
                      helper="Total mapped land currently sitting in fallow."
                      tone={AREA_COLORS.fallow}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <MetricCard
                      label="Fallow Fields"
                      value={String(fallowFields.length)}
                      helper="Mapped fields currently tagged as fallow period."
                      tone={AREA_COLORS.breakCrop}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <MetricCard
                      label="Share of Land"
                      value={`${fallowShare.toFixed(1)}%`}
                      helper="Fallow share of the full mapped area in the live statistics set."
                      tone={AREA_COLORS.mapped}
                    />
                  </Grid>
                </Grid>

                <Box sx={{ flex: 1, minHeight: 0 }}>
                  <CoverageRows
                    items={fallowFieldData}
                    emptyMessage="No individual fallow field areas are available yet."
                    formatValue={(item) => formatAreaValue(item.value)}
                  />
                </Box>
              </Box>
            ) : (
              <EmptyState message="Fallow period coverage will appear here once mapped fields are marked as fallow period." />
            )}
          </ChartShell>
        </Box>
      </Box>
    </Box>
  )
}
