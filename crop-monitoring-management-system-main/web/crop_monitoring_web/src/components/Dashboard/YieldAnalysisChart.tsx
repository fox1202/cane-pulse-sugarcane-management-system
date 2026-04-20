import React, { useMemo } from 'react'
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
  Treemap,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import type {
  MobileObservationEntryFormFields,
  MobileObservationRecord,
  PredefinedField,
} from '@/services/database.service'
import type { FullObservation } from '@/types/database.types'
import {
  dedupeObservationsForAnalytics,
  getObservationDateValue,
  toFiniteObservationNumber,
} from '@/utils/observationAnalytics'
import {
  FALLOW_PERIOD_CROP_CLASS_LABEL,
  getAreaCropGroup,
  normalizeFallowCropClassLabel,
} from '@/utils/cropGrouping'
import { isValid, parseISO } from 'date-fns'

interface YieldAnalysisChartProps {
  observations: Array<FullObservation | MobileObservationRecord>
  liveFields?: PredefinedField[]
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
  trialName: string
  section: string
  block: string
  fieldKey: string
  fieldLabel: string
  sectionBlock: string
  timestamp: number
  cropGroup: AreaCropGroup
  cropTypeRaw: string
  cropClass: string
  databaseCropClass: string
  variety: string
  sugarcaneClass: string
  breakCropType: string
  soilType: string
  soilPh: number | null
  tamMm: number | null
  fieldAreaHa: number | null
  expectedHarvestDate: string
}

type FieldSnapshot = {
  fieldKey: string
  field: string
  trialName: string
  fieldLabel: string
  section: string
  block: string
  sectionBlock: string
  timestamp: number
  cropGroup: AreaCropGroup
  cropTypeRaw: string
  cropClass: string
  databaseCropClass: string
  variety: string
  sugarcaneClass: string
  breakCropType: string
  soilType: string
  soilPh: number | null
  tamMm: number | null
  areaHa: number | null
  expectedHarvestDate: string
}

type DashboardMapSearchParams = Partial<Record<'cropType' | 'cropClass' | 'soilType' | 'phBand', string>>

type DashboardNavigation = {
  searchParams?: DashboardMapSearchParams
  focusField?: {
    fieldName: string
    sectionName?: string
    blockId?: string
    cropType?: string
  }
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
  navigation?: DashboardNavigation
}

type CoverageDatum = RankedDatum & {
  fieldCount: number
}

type FieldBarDatum = RankedDatum & {
  detail: string
}

type ExpectedHarvestField = {
  fieldKey: string
  field: string
  fieldLabel: string
  section: string
  block: string
  sectionBlock: string
  cropGroup: AreaCropGroup
  expectedHarvestDate: string
  areaHa: number | null
}

type ExpectedHarvestMonthDatum = {
  monthKey: string
  label: string
  fieldCount: number
  value: number
  areaHa: number
  helper: string
  color: string
  sortTime: number
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

const DISPLAY = '"Times New Roman", Times, serif'
const MONO = '"Times New Roman", Times, serif'

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
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.7, mb: 1.8, fontFamily: '"Times New Roman", Times, serif' }}>
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
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.7, fontFamily: '"Times New Roman", Times, serif' }}>
        {body}
      </Typography>
    </Paper>
  )
}

function MetricGroupCard({
  label,
  items,
  helper,
  tone,
  columns = 2,
}: {
  label: string
  items: Array<{
    label: string
    value: string
  }>
  helper?: string
  tone: string
  columns?: 2 | 3 | 4
}) {
  const gridTemplateColumns = columns === 4
    ? { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' }
    : columns === 3
      ? { xs: 'repeat(3, minmax(0, 1fr))' }
      : { xs: 'repeat(2, minmax(0, 1fr))' }

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
            mb: 1.2,
            fontFamily: MONO,
          }}
        >
          {label}
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gap: 1,
            gridTemplateColumns,
          }}
        >
          {items.map((item) => (
            <Box
              key={item.label}
              sx={{
                p: 1.15,
                borderRadius: '16px',
                border: `1px solid ${alpha(tone, 0.14)}`,
                bgcolor: alpha(tone, 0.06),
              }}
            >
              <Typography
                sx={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: alpha(tone, 0.8),
                  mb: 0.55,
                  fontFamily: MONO,
                }}
              >
                {item.label}
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: 18, md: 21 },
                  fontWeight: 900,
                  color: 'text.primary',
                  lineHeight: 1.08,
                  letterSpacing: '-0.03em',
                  fontFamily: DISPLAY,
                }}
              >
                {item.value}
              </Typography>
            </Box>
          ))}
        </Box>

        {helper && (
          <Typography sx={{ mt: 1.1, fontSize: 12, color: 'text.secondary', lineHeight: 1.5, fontFamily: '"Times New Roman", Times, serif' }}>
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
  onSelectCrop,
}: {
  totalArea: number
  data: CoverageDatum[]
  onSelectCrop?: (item: CoverageDatum) => void
}) {
  const orderedCoverage = [...data].sort((left, right) => right.value - left.value)
  const coverageNotes: Record<string, string> = {
    Sugarcane: 'Main footprint',
    'Break Crop': 'Rotation layer',
    'Fallow Period': 'Rest window',
    Unspecified: 'Needs review',
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.2 }}>
      <LegendList
        items={data.map((item) => ({ label: item.label, color: item.color }))}
      />

      <Box sx={{ flex: 1, minHeight: 200, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={102}
              paddingAngle={3}
              stroke="rgba(255,255,255,0.95)"
              strokeWidth={3}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.label}
                  fill={entry.color}
                  onClick={onSelectCrop ? () => onSelectCrop(entry) : undefined}
                  style={onSelectCrop ? { cursor: 'pointer' } : undefined}
                />
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

      <Paper
        sx={{
          borderRadius: '22px',
          border: `1px solid ${alpha(AREA_COLORS.sugarcane, 0.14)}`,
          bgcolor: alpha(AREA_COLORS.sugarcane, 0.035),
          boxShadow: 'none',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.8fr) 0.8fr 0.8fr 0.8fr',
            gap: 1,
            px: 1.35,
            py: 0.95,
            borderBottom: `1px solid ${alpha(AREA_COLORS.sugarcane, 0.1)}`,
            bgcolor: alpha(AREA_COLORS.sugarcane, 0.06),
          }}
        >
          <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.secondary' }}>
            Land Use
          </Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.secondary', textAlign: 'right' }}>
            Share
          </Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.secondary', textAlign: 'right' }}>
            Area
          </Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.secondary', textAlign: 'right' }}>
            Fields
          </Typography>
        </Box>

        {orderedCoverage.map((item, index) => {
          const share = totalArea > 0 ? (item.value / totalArea) * 100 : 0

          return (
            <Box
              key={item.label}
              onClick={onSelectCrop ? () => onSelectCrop(item) : undefined}
              onKeyDown={onSelectCrop ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelectCrop(item)
                }
              } : undefined}
              role={onSelectCrop ? 'button' : undefined}
              tabIndex={onSelectCrop ? 0 : undefined}
              sx={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.8fr) 0.8fr 0.8fr 0.8fr',
                gap: 1,
                alignItems: 'center',
                px: 1.35,
                py: 0.9,
                borderBottom: index === orderedCoverage.length - 1
                  ? 'none'
                  : `1px solid ${alpha(item.color, 0.08)}`,
                cursor: onSelectCrop ? 'pointer' : 'default',
                transition: onSelectCrop
                  ? 'background-color 180ms ease, transform 180ms ease'
                  : undefined,
                '&:hover': onSelectCrop ? {
                  bgcolor: alpha(item.color, 0.08),
                } : undefined,
                '&:focus-visible': onSelectCrop ? {
                  outline: `2px solid ${alpha(item.color, 0.44)}`,
                  outlineOffset: -2,
                } : undefined,
              }}
            >
              <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '999px',
                    bgcolor: item.color,
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: 'text.primary', lineHeight: 1.15 }}>
                    {item.label}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.15 }}>
                    {coverageNotes[item.label] || 'Area snapshot'}
                  </Typography>
                </Box>
              </Box>
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: item.color, textAlign: 'right' }}>
                {share.toFixed(1)}%
              </Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'text.primary', textAlign: 'right' }}>
                {item.value.toFixed(2)} ha
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', textAlign: 'right' }}>
                {item.fieldCount}
              </Typography>
            </Box>
          )
        })}
      </Paper>

    </Box>
  )
}

function RankedPieSummary({
  totalValue,
  totalLabel,
  data,
  valueFormatter,
  onSelectItem,
}: {
  totalValue: number
  totalLabel: string
  data: RankedDatum[]
  valueFormatter: (value: number) => string
  onSelectItem?: (item: RankedDatum) => void
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
                <Cell
                  key={entry.label}
                  fill={entry.color}
                  onClick={onSelectItem ? () => onSelectItem(entry) : undefined}
                  style={onSelectItem ? { cursor: 'pointer' } : undefined}
                />
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
            onClick={onSelectItem ? () => onSelectItem(item) : undefined}
            onKeyDown={onSelectItem ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelectItem(item)
              }
            } : undefined}
            role={onSelectItem ? 'button' : undefined}
            tabIndex={onSelectItem ? 0 : undefined}
            sx={{
              p: 1.15,
              borderRadius: '16px',
              border: `1px solid ${alpha(item.color, 0.16)}`,
              bgcolor: alpha(item.color, 0.06),
              boxShadow: 'none',
              cursor: onSelectItem ? 'pointer' : 'default',
              transition: onSelectItem
                ? 'transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease, border-color 180ms ease'
                : undefined,
              '&:hover': onSelectItem ? {
                transform: 'translateY(-2px)',
                borderColor: alpha(item.color, 0.28),
                bgcolor: alpha(item.color, 0.11),
                boxShadow: `0 14px 28px ${alpha(item.color, 0.14)}`,
              } : undefined,
              '&:focus-visible': onSelectItem ? {
                outline: `2px solid ${alpha(item.color, 0.52)}`,
                outlineOffset: 3,
              } : undefined,
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

      {onSelectItem && (
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary', textAlign: 'center' }}>
          Click a slice or row to open those fields on the map.
        </Typography>
      )}
    </Box>
  )
}

function CropClassTreemapTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: CoverageDatum }> }) {
  if (!active || !payload?.length) {
    return null
  }

  const item = payload[0]?.payload
  if (!item) {
    return null
  }

  return (
    <Box
      sx={{
        borderRadius: '14px',
        border: '1px solid rgba(27, 94, 32, 0.14)',
        boxShadow: '0 18px 40px rgba(17, 24, 16, 0.12)',
        background: 'rgba(255,255,255,0.97)',
        px: 1.4,
        py: 1.2,
        minWidth: 160,
      }}
    >
      <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: 'text.primary', mb: 0.35 }}>
        {item.label}
      </Typography>
      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
        {formatAreaValue(item.value)}
      </Typography>
      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
        {item.fieldCount} field(s)
      </Typography>
    </Box>
  )
}

function CropClassTreemapNode(props: any) {
  const {
    depth,
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    name,
    value,
    fieldCount,
    color,
    navigation,
    onSelectItem,
  } = props

  if (depth !== 1 || width <= 0 || height <= 0) {
    return null
  }

  const label = String(name ?? '')
  const areaValue = Number(value ?? 0)
  const areaFieldCount = Number(fieldCount ?? 0)
  const areaColor = String(color ?? AREA_COLORS.mapped)
  const item: CoverageDatum = {
    label,
    value: areaValue,
    fieldCount: areaFieldCount,
    color: areaColor,
    navigation,
  }
  const isInteractive = Boolean(onSelectItem && navigation)
  const canShowLabel = width >= 86 && height >= 34
  const canShowMeta = width >= 128 && height >= 74
  const labelColor = getReadableTextColor(areaColor)
  const labelStroke = labelColor === '#ffffff'
    ? 'rgba(16,39,21,0.55)'
    : 'rgba(255,255,255,0.72)'

  return (
    <g
      onClick={isInteractive ? () => onSelectItem(item) : undefined}
      onKeyDown={isInteractive ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelectItem(item)
        }
      } : undefined}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      style={isInteractive ? { cursor: 'pointer' } : undefined}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={16}
        ry={16}
        fill={areaColor}
        fillOpacity={0.88}
        stroke="rgba(255,255,255,0.95)"
        strokeWidth={3}
      />
      <rect
        x={x + 1.5}
        y={y + 1.5}
        width={Math.max(width - 3, 0)}
        height={Math.max(height - 3, 0)}
        rx={14}
        ry={14}
        fill="url(#cropClassTreemapGlow)"
        opacity={0.28}
      />
      {canShowLabel && (
        <text
          x={x + 12}
          y={y + 22}
          fill={labelColor}
          stroke={labelStroke}
          strokeWidth={2.8}
          paintOrder="stroke"
          fontSize={12}
          fontWeight={800}
          fontFamily={DISPLAY}
        >
          {label}
        </text>
      )}
      {canShowMeta && (
        <>
          <text
            x={x + 12}
            y={y + 44}
            fill={labelColor}
            stroke={labelStroke}
            strokeWidth={2.4}
            paintOrder="stroke"
            fontSize={12}
            fontWeight={700}
            fontFamily={MONO}
          >
            {formatAreaValue(areaValue)}
          </text>
          <text
            x={x + 12}
            y={y + 62}
            fill={labelColor}
            stroke={labelStroke}
            strokeWidth={2.2}
            paintOrder="stroke"
            fontSize={11}
            fontWeight={600}
            fontFamily={MONO}
          >
            {areaFieldCount} field(s)
          </text>
        </>
      )}
    </g>
  )
}

function CropClassTreemapSummary({
  totalValue,
  data,
  onSelectItem,
}: {
  totalValue: number
  data: CoverageDatum[]
  onSelectItem?: (item: CoverageDatum) => void
}) {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.4 }}>
      <Box
        sx={{
          flex: 1,
          minHeight: 260,
          borderRadius: '22px',
          overflow: 'hidden',
          border: `1px solid ${alpha(AREA_COLORS.mapped, 0.14)}`,
          bgcolor: alpha(AREA_COLORS.mapped, 0.04),
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="value"
            nameKey="label"
            aspectRatio={1.9}
            isAnimationActive
            stroke="rgba(255,255,255,0.95)"
            content={(props) => <CropClassTreemapNode {...props} onSelectItem={onSelectItem} />}
          >
            <defs>
              <linearGradient id="cropClassTreemapGlow" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.34" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <Tooltip content={<CropClassTreemapTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.2, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: 21, fontWeight: 900, color: 'text.primary', lineHeight: 1 }}>
          {formatAreaValue(totalValue)}
        </Typography>
        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'text.secondary', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {data.length} crop class groups
        </Typography>
      </Box>
    </Box>
  )
}

function CoverageRows({
  items,
  emptyMessage,
  formatValue,
  onSelectItem,
}: {
  items: RankedDatum[]
  emptyMessage: string
  formatValue: (item: RankedDatum) => string
  onSelectItem?: (item: RankedDatum) => void
}) {
  if (items.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  const maxValue = Math.max(...items.map((item) => item.value), 0)

  return (
    <Stack spacing={1.3} sx={{ height: '100%', overflowY: 'auto', pr: 0.3 }}>
      {items.map((item, index) => (
        <Paper
          key={`${item.label}-${item.helper ?? 'row'}-${index}`}
          onClick={onSelectItem ? () => onSelectItem(item) : undefined}
          onKeyDown={onSelectItem ? (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onSelectItem(item)
            }
          } : undefined}
          role={onSelectItem ? 'button' : undefined}
          tabIndex={onSelectItem ? 0 : undefined}
          sx={{
            p: 1.35,
            borderRadius: '18px',
            border: `1px solid ${alpha(item.color, 0.16)}`,
            bgcolor: alpha(item.color, 0.07),
            boxShadow: 'none',
            cursor: onSelectItem ? 'pointer' : 'default',
            transition: onSelectItem
              ? 'transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease, border-color 180ms ease'
              : undefined,
            '&:hover': onSelectItem ? {
              transform: 'translateY(-2px)',
              borderColor: alpha(item.color, 0.28),
              bgcolor: alpha(item.color, 0.12),
              boxShadow: `0 14px 28px ${alpha(item.color, 0.14)}`,
            } : undefined,
            '&:focus-visible': onSelectItem ? {
              outline: `2px solid ${alpha(item.color, 0.52)}`,
              outlineOffset: 3,
            } : undefined,
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

      {onSelectItem && (
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary', textAlign: 'center' }}>
          Click a row to open those fields on the map.
        </Typography>
      )}
    </Stack>
  )
}

function parseOptionalDate(value?: string | null): Date | null {
  const normalized = (value ?? '').trim()
  if (!normalized) return null

  const parsed = parseISO(normalized)
  return isValid(parsed) ? parsed : null
}

function formatMonthYear(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    year: 'numeric',
  }).format(date)
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

function resolveDatabaseCropClassLabel(cropClass?: string | null, cropType?: string | null): string {
  const normalizedClass = (cropClass ?? '').trim()
  if (normalizedClass) {
    return normalizeFallowCropClassLabel(normalizedClass)
  }

  const normalizedType = (cropType ?? '').trim()
  if (!normalizedType) {
    return 'Blank / Null'
  }

  if (getAreaCropGroup(normalizedType, { treatNoneAsFallow: true }) === 'Fallow Period') {
    return FALLOW_PERIOD_CROP_CLASS_LABEL
  }

  if (getAreaCropGroup(normalizedType, { treatNoneAsFallow: true }) === 'Sugarcane') {
    return 'Unspecified cane'
  }

  if (/^break\s*crop$/i.test(normalizedType)) {
    return 'Break Crop'
  }

  return normalizedType
}

function resolvePredefinedFieldAreaHa(field: PredefinedField): number | null {
  if (typeof field.area === 'number' && Number.isFinite(field.area) && field.area > 0) {
    return Number(field.area.toFixed(2))
  }

  const geometryArea = getGeometryAreaHa(field.geom)
  if (geometryArea !== null && geometryArea > 0) {
    return geometryArea
  }

  return null
}

function buildPredefinedFieldIdentity(field: Pick<PredefinedField, 'field_name' | 'section_name' | 'block_id'>): string {
  return [
    field.section_name,
    field.block_id,
    field.field_name,
  ]
    .map((value) => String(value ?? '').trim().toLowerCase())
    .join('|')
}

function getOptionalTimestamp(value?: string | null): number {
  const parsed = Date.parse(String(value ?? ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function getPredefinedFieldRecordedTimestamp(field: PredefinedField): number {
  return getOptionalTimestamp(field.date_recorded)
}

function isNewerPredefinedFieldRecord(candidate: PredefinedField, current: PredefinedField): boolean {
  const candidateRecorded = getPredefinedFieldRecordedTimestamp(candidate)
  const currentRecorded = getPredefinedFieldRecordedTimestamp(current)

  if (candidateRecorded !== currentRecorded) {
    return candidateRecorded > currentRecorded
  }

  const candidateUpdated = getOptionalTimestamp(candidate.updated_at)
  const currentUpdated = getOptionalTimestamp(current.updated_at)

  if (candidateUpdated !== currentUpdated) {
    return candidateUpdated > currentUpdated
  }

  const candidateCreated = getOptionalTimestamp(candidate.created_at)
  const currentCreated = getOptionalTimestamp(current.created_at)

  if (candidateCreated !== currentCreated) {
    return candidateCreated > currentCreated
  }

  return String(candidate.id ?? '') > String(current.id ?? '')
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

function getReadableTextColor(backgroundColor: string): string {
  const normalized = backgroundColor.trim().replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    return '#102715'
  }

  const red = parseInt(normalized.slice(0, 2), 16) / 255
  const green = parseInt(normalized.slice(2, 4), 16) / 255
  const blue = parseInt(normalized.slice(4, 6), 16) / 255
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue

  return luminance > 0.48 ? '#102715' : '#ffffff'
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
  const normalizedClass = (cropClass ?? '').trim().replace(/\s+/g, ' ')
  if (normalizedClass && !/^break\s*crop$/i.test(normalizedClass)) {
    return normalizedClass
  }

  const normalizedVariety = (variety ?? '').trim().replace(/\s+/g, ' ')
  if (normalizedVariety) {
    return normalizedVariety
  }

  return 'Break Crop'
}

function getMeasuredFieldCropClassLabel(field: FieldSnapshot): string {
  if (field.cropGroup === 'Sugarcane') {
    return field.sugarcaneClass || 'Unspecified cane'
  }

  if (field.cropGroup === 'Break Crop') {
    return field.breakCropType || 'Break Crop'
  }

  if (field.cropGroup === 'Fallow Period') {
    return FALLOW_PERIOD_CROP_CLASS_LABEL
  }

  return resolveDatabaseCropClassLabel(field.databaseCropClass, field.cropTypeRaw)
}

function canFilterByCropClassLabel(label: string): boolean {
  const normalized = label.trim().toLowerCase()
  return normalized !== 'blank / null'
    && normalized !== 'unspecified cane'
    && normalized !== 'break crop'
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

export const YieldAnalysisChart: React.FC<YieldAnalysisChartProps> = ({ observations, liveFields = [] }) => {
  const theme = useTheme()
  const navigate = useNavigate()

  const handleMapNavigation = (navigation?: DashboardNavigation) => {
    if (!navigation) {
      return
    }

    const params = new URLSearchParams()

    Object.entries(navigation.searchParams ?? {}).forEach(([key, value]) => {
      const normalized = (value ?? '').trim()
      if (normalized) {
        params.set(key, normalized)
      }
    })

    const search = params.toString()
    const pathname = search ? `/map?${search}` : '/map'

    if (navigation.focusField) {
      navigate(pathname, {
        state: {
          focusObservation: {
            fieldName: navigation.focusField.fieldName,
            sectionName: navigation.focusField.sectionName,
            blockId: navigation.focusField.blockId,
            cropType: navigation.focusField.cropType,
          },
        },
      })
      return
    }

    navigate(pathname)
  }

  const handleAreaCoverageSelect = (item: CoverageDatum) => {
    handleMapNavigation(item.navigation)
  }

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
      const trialName = pickText(
        entryForm?.trial_name,
        monitoring?.trial_name
      )
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
      const databaseCropClass = pickText(
        monitoring?.crop_class,
        monitoring?.crop_type,
        entryForm?.crop_class,
        entryForm?.crop_type,
        observation.crop_information?.crop_type
      )
      const cropGroup = getAreaCropGroup(`${rawCropType} ${cropClass}`.trim() || rawCropType)
      const variety = pickText(
        observation.crop_information?.variety,
        entryForm?.variety,
        monitoring?.variety
      )
      const expectedHarvestDate = pickText(
        entryForm?.expected_harvest_date,
        monitoring?.expected_harvest_date,
        observation.crop_information?.expected_harvest_date
      )
      const ratoonNumber = pickFinite(monitoring?.ratoon_number)
      const sectionBlock = [section, block].filter(Boolean).join(' / ') || 'Section / block not set'

      return {
        id: pickText(observation.client_uuid, String(observation.id)) || String(observation.id),
        field,
        trialName: trialName || field,
        section,
        block,
        fieldKey: [section.toLowerCase(), block.toLowerCase(), field.toLowerCase()].join('|'),
        fieldLabel: field,
        sectionBlock,
        timestamp: recordedAt.getTime(),
        cropGroup,
        cropTypeRaw: rawCropType || 'Unspecified',
        cropClass: cropClass || 'Unspecified',
        databaseCropClass,
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
        expectedHarvestDate,
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
          trialName: record.trialName,
          fieldLabel: record.fieldLabel,
          section: record.section,
          block: record.block,
          sectionBlock: record.sectionBlock,
          timestamp: record.timestamp,
          cropGroup: record.cropGroup,
          cropTypeRaw: record.cropTypeRaw,
          cropClass: record.cropClass,
          databaseCropClass: record.databaseCropClass,
          variety: record.variety,
          sugarcaneClass: record.sugarcaneClass,
          breakCropType: record.breakCropType,
          soilType: record.soilType,
          soilPh: record.soilPh,
          tamMm: record.tamMm,
          areaHa: record.fieldAreaHa,
          expectedHarvestDate: record.expectedHarvestDate,
        })
        return
      }

      if (existing.areaHa === null && record.fieldAreaHa !== null) {
        existing.areaHa = record.fieldAreaHa
      }

      if (!existing.section && record.section) {
        existing.section = record.section
      }

      if (!existing.block && record.block) {
        existing.block = record.block
      }

      if (isFallbackLabel(existing.trialName) && !isFallbackLabel(record.trialName)) {
        existing.trialName = record.trialName
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

      if (isFallbackLabel(existing.databaseCropClass) && !isFallbackLabel(record.databaseCropClass)) {
        existing.databaseCropClass = record.databaseCropClass
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

      if (record.expectedHarvestDate && (!existing.expectedHarvestDate || record.timestamp >= existing.timestamp)) {
        existing.expectedHarvestDate = record.expectedHarvestDate
      }
    })

    return Array.from(byField.values()).sort((left, right) => right.timestamp - left.timestamp)
  }, [records])

  const measuredFields = useMemo(
    () => fieldSnapshots.filter((field) => field.areaHa !== null && field.areaHa > 0),
    [fieldSnapshots]
  )

  const sugarcaneFields = useMemo(
    () => measuredFields.filter((field) => getAreaCropGroup(field.databaseCropClass) === 'Sugarcane'),
    [measuredFields]
  )

  const breakCropFields = useMemo(
    () => measuredFields.filter((field) => getAreaCropGroup(field.databaseCropClass) === 'Break Crop'),
    [measuredFields]
  )

  const fallowFields = useMemo(
    () => measuredFields.filter((field) => getAreaCropGroup(field.databaseCropClass) === 'Fallow Period'),
    [measuredFields]
  )

  const expectedHarvestSugarcaneFields = useMemo<ExpectedHarvestField[]>(() => {
    const byField = new Map<string, ExpectedHarvestField>()

    fieldSnapshots.forEach((field) => {
      const expectedHarvestDate = pickText(field.expectedHarvestDate)
      if (!expectedHarvestDate || !parseOptionalDate(expectedHarvestDate)) {
        return
      }

      const cropGroup = field.cropGroup === 'Sugarcane' || getAreaCropGroup(field.databaseCropClass) === 'Sugarcane'
        ? 'Sugarcane'
        : field.cropGroup

      if (cropGroup !== 'Sugarcane') {
        return
      }

      byField.set(field.fieldKey, {
        fieldKey: field.fieldKey,
        field: field.field,
        fieldLabel: field.fieldLabel,
        section: field.section,
        block: field.block,
        sectionBlock: field.sectionBlock,
        cropGroup,
        expectedHarvestDate,
        areaHa: field.areaHa,
      })
    })

    liveFields.forEach((field) => {
      const expectedHarvestDate = pickText(field.expected_harvest_date)
      if (!expectedHarvestDate || !parseOptionalDate(expectedHarvestDate)) {
        return
      }

      const cropGroup = getAreaCropGroup(`${field.crop_class ?? ''} ${field.crop_type ?? ''}`.trim() || field.crop_type || field.crop_class)
      if (cropGroup !== 'Sugarcane') {
        return
      }

      const fieldKey = buildPredefinedFieldIdentity(field)
      if (!fieldKey.replace(/\|/g, '') || byField.has(fieldKey)) {
        return
      }

      const section = String(field.section_name ?? '').trim()
      const block = String(field.block_id ?? '').trim()
      const fieldName = String(field.field_name ?? '').trim() || 'Unknown field'

      byField.set(fieldKey, {
        fieldKey,
        field: fieldName,
        fieldLabel: fieldName,
        section,
        block,
        sectionBlock: [section, block].filter(Boolean).join(' / ') || 'Section / block not set',
        cropGroup,
        expectedHarvestDate,
        areaHa: resolvePredefinedFieldAreaHa(field),
      })
    })

    return Array.from(byField.values())
  }, [fieldSnapshots, liveFields])

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

  const areaOverviewData = useMemo<CoverageDatum[]>(
    () => [
      {
        label: 'Sugarcane',
        value: Number(totalSugarcaneArea.toFixed(2)),
        fieldCount: sugarcaneFields.length,
        color: AREA_COLORS.sugarcane,
        navigation: {
          searchParams: {
            cropType: 'Sugarcane',
          },
        },
      },
      {
        label: 'Break Crop',
        value: Number(totalBreakCropArea.toFixed(2)),
        fieldCount: breakCropFields.length,
        color: AREA_COLORS.breakCrop,
        navigation: {
          searchParams: {
            cropType: 'Break Crop',
          },
        },
      },
      {
        label: 'Fallow Period',
        value: Number(totalFallowArea.toFixed(2)),
        fieldCount: fallowFields.length,
        color: AREA_COLORS.fallow,
        navigation: {
          searchParams: {
            cropType: 'Fallow Period',
          },
        },
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

  const expectedHarvestMonthData = useMemo<ExpectedHarvestMonthDatum[]>(() => {
    const grouped = new Map<string, {
      monthDate: Date
      fieldCount: number
      areaHa: number
      fields: string[]
    }>()

    expectedHarvestSugarcaneFields.forEach((field) => {
      const harvestDate = parseOptionalDate(field.expectedHarvestDate)
      if (!harvestDate) {
        return
      }

      const monthDate = new Date(harvestDate.getFullYear(), harvestDate.getMonth(), 1)
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`
      const existing = grouped.get(monthKey) ?? {
        monthDate,
        fieldCount: 0,
        areaHa: 0,
        fields: [],
      }

      existing.fieldCount += 1
      existing.areaHa += field.areaHa ?? 0
      existing.fields.push(field.fieldLabel)
      grouped.set(monthKey, existing)
    })

    return Array.from(grouped.entries())
      .sort(([, left], [, right]) => left.monthDate.getTime() - right.monthDate.getTime())
      .map(([monthKey, summary], index) => ({
        monthKey,
        label: formatMonthYear(summary.monthDate),
        fieldCount: summary.fieldCount,
        value: summary.fieldCount,
        areaHa: Number(summary.areaHa.toFixed(2)),
        helper: summary.fields.slice(0, 3).join(', '),
        color: PALETTE[index % PALETTE.length],
        sortTime: summary.monthDate.getTime(),
      }))
  }, [expectedHarvestSugarcaneFields])

  const expectedHarvestTotalArea = useMemo(
    () => sumBy(expectedHarvestMonthData, (item) => item.areaHa),
    [expectedHarvestMonthData]
  )

  const expectedHarvestPeakMonth = useMemo(
    () => [...expectedHarvestMonthData].sort((left, right) => right.fieldCount - left.fieldCount || left.sortTime - right.sortTime)[0] ?? null,
    [expectedHarvestMonthData]
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
    const items: PhBandDatum[] = []

    order.forEach((label) => {
      const entry = grouped.get(label)
      if (!entry) {
        return
      }

      items.push({
        label,
        value: entry.value,
        range: entry.range,
        color: entry.color,
        navigation: {
          searchParams: {
            cropType: 'all',
            phBand: label,
          },
        },
      })
    })

    return items
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
        navigation: {
          searchParams: {
            cropType: field.cropGroup !== 'Unspecified' ? field.cropGroup : 'all',
          },
          focusField: {
            fieldName: field.field,
            sectionName: field.section || undefined,
            blockId: field.block || undefined,
            cropType: field.cropGroup !== 'Unspecified' ? field.cropGroup : undefined,
          },
        },
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
        navigation: {
          searchParams: {
            cropType: field.cropGroup !== 'Unspecified' ? field.cropGroup : 'all',
          },
          focusField: {
            fieldName: field.field,
            sectionName: field.section || undefined,
            blockId: field.block || undefined,
            cropType: field.cropGroup !== 'Unspecified' ? field.cropGroup : undefined,
          },
        },
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
      navigation: {
        searchParams: {
          cropType: 'all',
          soilType: item.label,
        },
      },
    })),
    [measuredFields]
  )

  const cropClassAreaChartData = useMemo(
    () => {
      const baseData = measuredFields.length > 0
        ? createCoverageData(measuredFields, getMeasuredFieldCropClassLabel)
        : (() => {
          const latestByField = new Map<string, PredefinedField>()

          liveFields.forEach((field) => {
            const identity = buildPredefinedFieldIdentity(field)
            if (!identity.replace(/\|/g, '')) {
              return
            }

            const existing = latestByField.get(identity)
            if (!existing || isNewerPredefinedFieldRecord(field, existing)) {
              latestByField.set(identity, field)
            }
          })

          return Array.from(latestByField.values())
            .reduce<Map<string, { value: number; fieldCount: number }>>((grouped, field) => {
              const areaHa = resolvePredefinedFieldAreaHa(field)
              if (areaHa === null || areaHa <= 0) {
                return grouped
              }

              const label = resolveDatabaseCropClassLabel(field.crop_class, field.crop_type)
              const existing = grouped.get(label) ?? { value: 0, fieldCount: 0 }
              existing.value += areaHa
              existing.fieldCount += 1
              grouped.set(label, existing)
              return grouped
            }, new Map())
        })()

      const items = Array.isArray(baseData)
        ? baseData
        : Array.from(baseData.entries())
          .map(([label, summary]) => ({
            label,
            value: Number(summary.value.toFixed(2)),
            fieldCount: summary.fieldCount,
            color: AREA_COLORS.unspecified,
          }))
          .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label))
          .map((item, index) => ({
            ...item,
            color: PALETTE[index % PALETTE.length],
          }))

      return items.map((item) => ({
        ...item,
        navigation: (() => {
          const cropGroup = getAreaCropGroup(item.label, { treatNoneAsFallow: true })
          const searchParams: DashboardMapSearchParams = {}

          if (cropGroup !== 'Unspecified') {
            searchParams.cropType = cropGroup
          }

          if (canFilterByCropClassLabel(item.label)) {
            searchParams.cropClass = item.label
          }

          return Object.keys(searchParams).length > 0 ? { searchParams } : undefined
        })(),
      }))
    },
    [liveFields, measuredFields]
  )

  const totalCropClassArea = useMemo(
    () => measuredFields.length > 0
      ? Number(totalMeasuredArea.toFixed(2))
      : cropClassAreaChartData.reduce((sum, item) => sum + item.value, 0),
    [cropClassAreaChartData, measuredFields.length, totalMeasuredArea]
  )

  const sugarcaneRatoonData = useMemo(
    () => createCoverageData(
      sugarcaneFields,
      (field) => field.sugarcaneClass || 'Unspecified cane',
      (left, right) => getSugarcaneSortOrder(left.label) - getSugarcaneSortOrder(right.label) || right.value - left.value
    ).map((item) => ({
      ...item,
      navigation: {
        searchParams: {
          cropType: 'Sugarcane',
          cropClass: item.label,
        },
      },
    })),
    [sugarcaneFields]
  )

  const breakCropCoverageData = useMemo(
    () => createCoverageData(
      breakCropFields,
      (field) => field.breakCropType || 'Break Crop'
    ).map((item) => ({
      ...item,
      navigation: {
        searchParams: {
          cropType: 'Break Crop',
          cropClass: item.label,
        },
      },
    })),
    [breakCropFields]
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
          <Grid size={{ xs: 12 }}>
            <Grid container spacing={1.4}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <MetricGroupCard
                  label="Soil pH Summary"
                  items={[
                    { label: 'Average', value: formatMetricValue(averagePh) },
                    { label: 'Low', value: formatMetricValue(minPh) },
                    { label: 'High', value: formatMetricValue(maxPh) },
                  ]}
                  helper={phFields.length > 0
                    ? `${phFields.length} latest field reading(s) shape the current pH range.`
                    : 'No live soil pH readings are available yet.'}
                  tone={AREA_COLORS.phTarget}
                  columns={3}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <MetricGroupCard
                  label="TAM Summary"
                  items={[
                    { label: 'Average', value: formatMetricValue(averageTam, 'mm', 0) },
                    { label: 'Low', value: formatMetricValue(minTam, 'mm', 0) },
                    { label: 'High', value: formatMetricValue(maxTam, 'mm', 0) },
                  ]}
                  helper={tamFields.length > 0
                    ? `${tamFields.length} latest field reading(s) shape the current TAM range.`
                    : 'No live TAM readings are available yet.'}
                  tone={AREA_COLORS.breakCrop}
                  columns={3}
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
        <Box sx={{ gridColumn: { xl: 'span 12' } }}>
          <ChartShell
            title="Sugarcane Expected Harvest by Month"
            subtitle="Sugarcane fields grouped by expected harvest date. Bars show field count per month, with mapped hectares available in the tooltip."
            eyebrow="Harvest Forecast"
            height={470}
            accentColor={AREA_COLORS.sugarcane}
          >
            {expectedHarvestMonthData.length > 0 ? (
              <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.4 }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                    gap: 1,
                  }}
                >
                  {[
                    {
                      label: 'Fields Scheduled',
                      value: String(expectedHarvestSugarcaneFields.length),
                    },
                    {
                      label: 'Mapped Area',
                      value: formatAreaValue(expectedHarvestTotalArea),
                    },
                    {
                      label: 'Peak Month',
                      value: expectedHarvestPeakMonth
                        ? `${expectedHarvestPeakMonth.label} (${expectedHarvestPeakMonth.fieldCount})`
                        : 'N/A',
                    },
                  ].map((item) => (
                    <Paper
                      key={item.label}
                      sx={{
                        p: 1.25,
                        borderRadius: '16px',
                        border: `1px solid ${alpha(AREA_COLORS.sugarcane, 0.16)}`,
                        bgcolor: alpha(AREA_COLORS.sugarcane, 0.07),
                        boxShadow: 'none',
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: 'primary.dark',
                          mb: 0.45,
                        }}
                      >
                        {item.label}
                      </Typography>
                      <Typography sx={{ fontSize: 18, fontWeight: 900, color: 'text.primary', lineHeight: 1.1 }}>
                        {item.value}
                      </Typography>
                    </Paper>
                  ))}
                </Box>

                <Box sx={{ flex: 1, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={expectedHarvestMonthData} margin={{ top: 8, right: 18, left: 8, bottom: 48 }}>
                      <CartesianGrid strokeDasharray="4 4" stroke={alpha(theme.palette.primary.main, 0.12)} vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        angle={-22}
                        textAnchor="end"
                        height={62}
                        tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                        label={{ value: 'Expected Harvest Month', position: 'insideBottom', offset: -10, fill: theme.palette.text.secondary, fontSize: 12 }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                        allowDecimals={false}
                        label={{ value: 'Field Count', angle: -90, position: 'insideLeft', fill: theme.palette.text.secondary, fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value: number | string | undefined, _name, entry: any) => [
                          `${Number(value || 0)} field(s)`,
                          `${formatAreaValue(Number(entry?.payload?.areaHa || 0))} mapped`,
                        ]}
                        labelFormatter={(label) => {
                          const match = expectedHarvestMonthData.find((item) => item.label === label)
                          return match?.helper ? `${label} • ${match.helper}` : String(label)
                        }}
                      />
                      <Bar dataKey="fieldCount" radius={[12, 12, 0, 0]} barSize={42}>
                        {expectedHarvestMonthData.map((entry) => (
                          <Cell key={entry.monthKey} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            ) : (
              <EmptyState message="Expected harvest month statistics will appear here once sugarcane fields include expected harvest dates." />
            )}
          </ChartShell>
        </Box>

        <Box sx={{ gridColumn: { xl: 'span 7' } }}>
          <ChartShell
            title="Crop Type Land Use Coverage"
            eyebrow="Area Coverage"
            height={500}
            accentColor={AREA_COLORS.sugarcane}
          >
            {totalMeasuredArea > 0 && areaOverviewData.length > 0 ? (
              <AreaPieSummary
                totalArea={totalMeasuredArea}
                data={areaOverviewData}
                onSelectCrop={handleAreaCoverageSelect}
              />
            ) : (
              <EmptyState message="Record mapped field areas and database crop classes to unlock the crop land coverage chart." />
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
                    <BarChart data={phBandData} margin={{ top: 6, right: 20, left: 8, bottom: 26 }}>
                      <CartesianGrid strokeDasharray="4 4" stroke={alpha(theme.palette.primary.main, 0.12)} vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                        label={{ value: 'Soil pH Bands', position: 'insideBottom', offset: -8, fill: theme.palette.text.secondary, fontSize: 12 }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                        allowDecimals={false}
                        label={{ value: 'Field Count', angle: -90, position: 'insideLeft', fill: theme.palette.text.secondary, fontSize: 12 }}
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
                          <Cell
                            key={entry.label}
                            fill={entry.color}
                            onClick={() => handleMapNavigation(entry.navigation)}
                            style={{ cursor: 'pointer' }}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            ) : (
              <EmptyState message="Soil pH charts will appear here once fields include live pH readings." />
            )}
          </ChartShell>
        </Box>

        <Box sx={{ gridColumn: { xl: 'span 12' } }}>
          <ChartShell
            title="Crop Class Area Coverage"
            eyebrow="Crop Classes"
            height={430}
            accentColor={AREA_COLORS.mapped}
          >
            {cropClassAreaChartData.length > 0 ? (
              <CropClassTreemapSummary
                totalValue={Number(totalCropClassArea.toFixed(2))}
                data={cropClassAreaChartData}
                onSelectItem={handleAreaCoverageSelect}
              />
            ) : (
              <EmptyState message="Crop class area coverage will appear here once sugarcane_field_management includes mapped area and crop_class values." />
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
                      <Cell
                        key={`${entry.label}-${entry.detail}`}
                        fill={entry.color}
                        onClick={() => handleMapNavigation(entry.navigation)}
                        style={{ cursor: 'pointer' }}
                      />
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
                onSelectItem={(item) => handleMapNavigation(item.navigation)}
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
              onSelectItem={(item) => handleMapNavigation(item.navigation)}
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
                      <Cell
                        key={entry.label}
                        fill={entry.color}
                        onClick={() => handleMapNavigation(entry.navigation)}
                        style={{ cursor: 'pointer' }}
                      />
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
            eyebrow="Break Crop"
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
                      <Cell
                        key={entry.label}
                        fill={entry.color}
                        onClick={() => handleMapNavigation(entry.navigation)}
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Break crop coverage will appear here once mapped break crop fields include a crop class or crop label." />
            )}
          </ChartShell>
        </Box>

      </Box>
    </Box>
  )
}
