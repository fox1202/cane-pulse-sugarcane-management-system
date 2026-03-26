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

function slugifyBlockId(value) {
  return String(value || 'boundary')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

function toMultiPolygonGeometry(geometry) {
  const normalizedCoordinates = stripZCoordinates(geometry.coordinates)
  if (geometry.type === 'MultiPolygon') {
    return {
      ...geometry,
      coordinates: normalizedCoordinates,
    }
  }

  if (geometry.type === 'Polygon') {
    return {
      type: 'MultiPolygon',
      coordinates: [normalizedCoordinates],
    }
  }

  return {
    ...geometry,
    coordinates: normalizedCoordinates,
  }
}

async function main() {
  loadDotEnv('./.env')

  const inputPath = process.argv[2]
  if (!inputPath) {
    console.error('Usage: node scripts/import-block-boundaries.mjs <path-to-geojson>')
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
    const rawName = String(feature?.properties?.Name || feature?.properties?.name || 'Unnamed boundary').trim()
    const duplicateCount = (nameCounts.get(rawName) ?? 0) + 1
    nameCounts.set(rawName, duplicateCount)

    const name = duplicateCount === 1 ? rawName : `${rawName} (${duplicateCount})`
    const block_id = duplicateCount === 1
      ? slugifyBlockId(rawName)
      : `${slugifyBlockId(rawName)}-${duplicateCount}`

    return {
      block_id,
      name,
      geom: toMultiPolygonGeometry(feature.geometry),
    }
  })

  if (!rows.length) {
    console.error('No Polygon or MultiPolygon features found in the GeoJSON file.')
    process.exit(3)
  }

  const { data: existingRows, error: existingError } = await supabase
    .from('blocks')
    .select('block_id,name')

  if (existingError) {
    console.error('Failed to read existing block boundaries:', existingError.message)
    process.exit(4)
  }

  const existingBlockIds = new Set((existingRows ?? []).map((row) => String(row.block_id)))
  const existingNames = new Set((existingRows ?? []).map((row) => String(row.name ?? '')))

  const rowsToInsert = rows.filter((row) => {
    return !existingBlockIds.has(row.block_id) && !existingNames.has(row.name)
  })

  if (!rowsToInsert.length) {
    console.log(
      JSON.stringify(
        {
          uploaded: 0,
          skipped_non_polygon_features: skippedFeatures,
          skipped_existing_rows: rows.length,
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

  const chunkSize = 40
  let uploaded = 0

  for (let index = 0; index < rowsToInsert.length; index += chunkSize) {
    const chunk = rowsToInsert.slice(index, index + chunkSize)
    const { error } = await supabase.from('blocks').insert(chunk)

    if (error) {
      console.error(`Upload failed for batch starting at row ${index + 1}:`, error.message)
      process.exit(4)
    }

    uploaded += chunk.length
    console.log(`Uploaded ${uploaded}/${rowsToInsert.length} block boundaries`)
  }

  console.log(
    JSON.stringify(
      {
        uploaded,
        skipped_non_polygon_features: skippedFeatures,
        skipped_existing_rows: rows.length - rowsToInsert.length,
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
