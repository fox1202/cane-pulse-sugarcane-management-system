import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

function loadDotEnv(path = './.env') {
  try {
    const raw = readFileSync(path, 'utf8')
    raw.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^\s*([^#=\s]+)=(.*)$/)
      if (!match) return
      let value = match[2].trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      process.env[match[1]] = value
    })
  } catch {
    // ignore missing .env
  }
}

function stripZCoordinates(value) {
  if (!Array.isArray(value)) return value
  if (value.length >= 2 && value.every((item) => typeof item === 'number')) {
    return value.slice(0, 2)
  }
  return value.map(stripZCoordinates)
}

function firstRing(geometry) {
  if (!geometry) return []
  if (geometry.type === 'Polygon') return geometry.coordinates?.[0] ?? []
  if (geometry.type === 'MultiPolygon') return geometry.coordinates?.[0]?.[0] ?? []
  return []
}

function centroidFromGeometry(geometry) {
  if (!geometry) return { latitude: 0, longitude: 0 }
  if (geometry.type === 'Point') {
    const [longitude = 0, latitude = 0] = geometry.coordinates ?? []
    return { latitude, longitude }
  }

  const ring = firstRing(geometry)
  if (!ring.length) return { latitude: 0, longitude: 0 }

  const totals = ring.reduce(
    (acc, coord) => {
      const [longitude = 0, latitude = 0] = coord
      acc.longitude += longitude
      acc.latitude += latitude
      return acc
    },
    { latitude: 0, longitude: 0 }
  )

  return {
    latitude: totals.latitude / ring.length,
    longitude: totals.longitude / ring.length,
  }
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

async function main() {
  loadDotEnv('./.env')

  const inputPath = process.argv[2]
  if (!inputPath) {
    console.error('Usage: node scripts/import-fields-geojson.mjs <path-to-geojson>')
    process.exit(2)
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
    process.exit(2)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const geoJson = JSON.parse(readFileSync(resolve(inputPath), 'utf8'))
  const features = Array.isArray(geoJson?.features) ? geoJson.features : []

  const nameCounts = new Map()
  const polygonFeatures = features.filter((feature) =>
    ['Polygon', 'MultiPolygon'].includes(feature?.geometry?.type)
  )
  const skippedFeatures = features.length - polygonFeatures.length

  const rows = polygonFeatures.map((feature) => {
    const rawName = String(feature?.properties?.Name || feature?.properties?.name || 'Unnamed field').trim()
    const duplicateCount = (nameCounts.get(rawName) ?? 0) + 1
    nameCounts.set(rawName, duplicateCount)

    const field_name = duplicateCount === 1 ? rawName : `${rawName} (${duplicateCount})`
    const geometry = {
      ...feature.geometry,
      coordinates: stripZCoordinates(feature.geometry.coordinates),
    }
    const { latitude, longitude } = centroidFromGeometry(geometry)
    const { section_name, block_id } = deriveRegistryFields(rawName)
    const date_recorded = new Date().toISOString()

    return {
      field_name,
      section_name,
      block_id,
      latitude,
      longitude,
      date_recorded,
      geom: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
    }
  })

  if (!rows.length) {
    console.error('No Polygon or MultiPolygon features found in the GeoJSON file.')
    process.exit(3)
  }

  const { data: existingRows, error: existingError } = await supabase
    .from('fields')
    .select('field_name')

  if (existingError) {
    console.error('Failed to read existing fields:', existingError.message)
    process.exit(4)
  }

  const existingFieldNames = new Set(
    (existingRows ?? []).map((row) => String(row.field_name))
  )
  const rowsToInsert = rows.filter((row) => !existingFieldNames.has(row.field_name))

  if (!rowsToInsert.length) {
    console.log(
      JSON.stringify(
        {
          uploaded: 0,
          skipped_non_polygon_features: skippedFeatures,
          skipped_existing_rows: rows.length,
          stored_geom_type: 'Point',
          duplicate_names_renamed: [...nameCounts.entries()]
            .filter(([, count]) => count > 1)
            .map(([name, count]) => ({ name, count })),
        },
        null,
        2
      )
    )
    return
  }

  const chunkSize = 50
  let uploaded = 0

  for (let index = 0; index < rowsToInsert.length; index += chunkSize) {
    const chunk = rowsToInsert.slice(index, index + chunkSize)
    const { error } = await supabase.from('fields').insert(chunk)

    if (error) {
      console.error(`Upload failed for batch starting at row ${index + 1}:`, error.message)
      process.exit(4)
    }

    uploaded += chunk.length
    console.log(`Uploaded ${uploaded}/${rowsToInsert.length} fields`)
  }

  console.log(
    JSON.stringify(
      {
        uploaded,
        skipped_non_polygon_features: skippedFeatures,
        skipped_existing_rows: rows.length - rowsToInsert.length,
        stored_geom_type: 'Point',
        duplicate_names_renamed: [...nameCounts.entries()]
          .filter(([, count]) => count > 1)
          .map(([name, count]) => ({ name, count })),
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
