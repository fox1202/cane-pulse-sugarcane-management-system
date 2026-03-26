import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

function stripZCoordinates(value) {
  if (!Array.isArray(value)) return value
  if (value.length >= 2 && value.every((item) => typeof item === 'number')) {
    return value.slice(0, 2)
  }
  return value.map(stripZCoordinates)
}

function deriveRegistryFields(rawName) {
  const name = String(rawName || 'Unnamed field').trim()
  const prefixed = name.match(/^(Sable|Impala|CP)\s+(.+)$/i)

  if (prefixed) {
    return {
      section_name: prefixed[1].toUpperCase(),
      block_id: prefixed[2].trim().toUpperCase(),
    }
  }

  const firstToken = name.split(/\s+/)[0] || 'GENERAL'
  const normalizedBlock =
    firstToken.toLowerCase() === 'untitled'
      ? 'UNTITLED'
      : firstToken.toUpperCase()

  return {
    section_name: 'ZSAES TRIAL SITES',
    block_id: normalizedBlock,
  }
}

function toTsLiteral(value, indent = 0) {
  const spacing = ' '.repeat(indent)
  if (value === null) return 'null'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'string') return JSON.stringify(value)

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    const items = value.map((item) => `${' '.repeat(indent + 4)}${toTsLiteral(item, indent + 4)}`)
    return `[\n${items.join(',\n')}\n${spacing}]`
  }

  const entries = Object.entries(value)
  if (entries.length === 0) return '{}'
  const items = entries.map(([key, item]) => `${' '.repeat(indent + 4)}${key}: ${toTsLiteral(item, indent + 4)}`)
  return `{\n${items.join(',\n')}\n${spacing}}`
}

function buildFeature(feature, displayName) {
  const geometry = {
    type: feature.geometry.type,
    coordinates: stripZCoordinates(feature.geometry.coordinates),
  }
  const { section_name, block_id } = deriveRegistryFields(displayName)

  return {
    type: 'Feature',
    properties: {
      field_name: displayName,
      section_name,
      block_id,
    },
    geometry,
  }
}

function main() {
  const inputPath = process.argv[2]
  const outputPath = process.argv[3] || './src/data/hardcodedFieldShapefile.ts'

  if (!inputPath) {
    console.error('Usage: node scripts/generate-hardcoded-field-shapefile.mjs <path-to-geojson> [output-path]')
    process.exit(2)
  }

  const geoJson = JSON.parse(readFileSync(resolve(inputPath), 'utf8'))
  const features = Array.isArray(geoJson?.features) ? geoJson.features : []

  const nameCounts = new Map()
  const polygonFeatures = features.filter((feature) =>
    ['Polygon', 'MultiPolygon'].includes(feature?.geometry?.type)
  )

  const normalizedFeatures = polygonFeatures.map((feature) => {
    const rawName = String(feature?.properties?.Name || feature?.properties?.name || 'Unnamed field').trim()
    const duplicateCount = (nameCounts.get(rawName) ?? 0) + 1
    nameCounts.set(rawName, duplicateCount)
    const displayName = duplicateCount === 1 ? rawName : `${rawName} (${duplicateCount})`
    return buildFeature(feature, displayName)
  })

  const featureCollectionLiteral = toTsLiteral(
    {
      type: 'FeatureCollection',
      features: normalizedFeatures,
    },
    0
  )

  const output = `import type { Field } from '@/types/database.types'

type FieldGeometry =
    | {
        type: 'Polygon'
        coordinates: number[][][]
    }
    | {
        type: 'MultiPolygon'
        coordinates: number[][][][]
    }

interface HardcodedFieldProperties {
    field_name: string
    section_name: string
    block_id: string
    crop_type?: string
    latest_stress?: string
    latest_moisture?: number
    observation_count?: number
    is_sprayed?: boolean
    last_spray_date?: string
    latest_observation_date?: string
    updated_at?: string
}

interface HardcodedFieldFeature {
    type: 'Feature'
    properties: HardcodedFieldProperties
    geometry: FieldGeometry
}

interface HardcodedFieldFeatureCollection {
    type: 'FeatureCollection'
    features: HardcodedFieldFeature[]
}

export interface HardcodedFieldRecord extends Field {
    latest_observation_date?: string
    updated_at?: string
}

export const HARDCODED_FIELD_SHAPEFILE: HardcodedFieldFeatureCollection = ${featureCollectionLiteral}

function firstRing(geometry: FieldGeometry): number[][] {
    if (geometry.type === 'Polygon') return geometry.coordinates[0] ?? []
    return geometry.coordinates[0]?.[0] ?? []
}

function centroidFromGeometry(geometry: FieldGeometry): { latitude: number; longitude: number } {
    const ring = firstRing(geometry)
    if (ring.length === 0) {
        return { latitude: 0, longitude: 0 }
    }

    const totals = ring.reduce(
        (acc, [lng, lat]) => {
            acc.lng += lng
            acc.lat += lat
            return acc
        },
        { lng: 0, lat: 0 }
    )

    return {
        latitude: totals.lat / ring.length,
        longitude: totals.lng / ring.length,
    }
}

export const HARDCODED_FIELDS: HardcodedFieldRecord[] = HARDCODED_FIELD_SHAPEFILE.features.map((feature) => {
    const center = centroidFromGeometry(feature.geometry)
    return {
        field_name: feature.properties.field_name,
        section_name: feature.properties.section_name,
        block_id: feature.properties.block_id,
        latitude: center.latitude,
        longitude: center.longitude,
        crop_type: feature.properties.crop_type,
        latest_stress: feature.properties.latest_stress,
        latest_moisture: feature.properties.latest_moisture,
        observation_count: feature.properties.observation_count ?? 0,
        is_sprayed: feature.properties.is_sprayed,
        last_spray_date: feature.properties.last_spray_date,
        latest_observation_date: feature.properties.latest_observation_date,
        updated_at: feature.properties.updated_at,
    }
})
`

  writeFileSync(resolve(outputPath), output)
  console.log(`Generated ${normalizedFeatures.length} field boundaries at ${resolve(outputPath)}`)
}

main()
