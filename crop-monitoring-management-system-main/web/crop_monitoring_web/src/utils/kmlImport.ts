import * as togeojson from '@mapbox/togeojson';
import { strFromU8, unzipSync } from 'fflate';

export interface KMLParseResult {
    features: {
        name?: string;
        geometry?: any;
        properties?: Record<string, any>;
    }[];
    error?: string;
}

function isKMZFile(file: File): boolean {
    const fileName = file.name.toLowerCase();

    return fileName.endsWith('.kmz') || file.type === 'application/vnd.google-earth.kmz';
}

async function extractKMLTextFromKMZ(file: File): Promise<string> {
    const archive = unzipSync(new Uint8Array(await file.arrayBuffer()));
    const kmlEntryName = Object.keys(archive)
        .filter((entryName) => {
            const normalizedName = entryName.toLowerCase();

            return normalizedName.endsWith('.kml') && !normalizedName.startsWith('__macosx/');
        })
        .sort((left, right) => {
            const leftIsDoc = left.toLowerCase().endsWith('/doc.kml') || left.toLowerCase() === 'doc.kml';
            const rightIsDoc = right.toLowerCase().endsWith('/doc.kml') || right.toLowerCase() === 'doc.kml';

            if (leftIsDoc === rightIsDoc) return left.localeCompare(right);
            return leftIsDoc ? -1 : 1;
        })[0];

    if (!kmlEntryName) {
        throw new Error('No KML file was found inside the KMZ archive.');
    }

    const kmlData = archive[kmlEntryName];
    if (!kmlData) {
        throw new Error(`The KML file inside ${file.name} could not be read.`);
    }

    const kmlString = strFromU8(kmlData).trim();

    if (!kmlString) {
        throw new Error(`The KML file inside ${file.name} is empty.`);
    }

    return kmlString;
}

async function readKMLTextFromFile(file: File): Promise<string> {
    if (isKMZFile(file)) {
        return extractKMLTextFromKMZ(file);
    }

    return file.text();
}

/**
 * Parse a KML or KMZ file and extract features with their geometries
 * Converts KML to GeoJSON format
 */
export async function parseKMLFile(file: File): Promise<KMLParseResult> {
    try {
        const kmlString = await readKMLTextFromFile(file);

        if (!kmlString) {
            return {
                features: [],
                error: 'File is empty',
            };
        }

        // Parse KML string to XML
        const parser = new DOMParser();
        const kmlDOM = parser.parseFromString(kmlString, 'text/xml');

        // Check for parsing errors
        if (kmlDOM.getElementsByTagName('parsererror').length > 0) {
            return {
                features: [],
                error: 'Invalid KML/KMZ file format',
            };
        }

        // Convert KML to GeoJSON using togeojson
        const geoJSON = togeojson.kml(kmlDOM);

        if (!geoJSON.features || geoJSON.features.length === 0) {
            return {
                features: [],
                error: 'No features found in KML/KMZ file',
            };
        }

        // Extract features with their properties and geometries
        const features = geoJSON.features.map((feature: any) => ({
            name: feature.properties?.name || feature.properties?.Name || 'Unnamed Feature',
            geometry: feature.geometry,
            properties: feature.properties,
        }));

        return {
            features,
        };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);

        return {
            features: [],
            error: `Failed to parse KML/KMZ file: ${message}`,
        };
    }
}

/**
 * Extract the first valid polygon or multipolygon geometry from KML features
 * Returns the geometry and centroid coordinates
 */
export function extractGeometryFromKML(
    features: KMLParseResult['features']
): {
    geometry: any;
    centroid?: { latitude: number; longitude: number };
} | null {
    for (const feature of features) {
        if (!feature.geometry) continue;

        const geometry = feature.geometry;

        // Handle Polygon
        if (geometry.type === 'Polygon' && geometry.coordinates.length > 0) {
            const centroid = calculatePolygonCentroid(geometry.coordinates[0]);
            return { geometry, centroid };
        }

        // Handle MultiPolygon - use the first polygon
        if (geometry.type === 'MultiPolygon' && geometry.coordinates.length > 0) {
            const firstPolygon = geometry.coordinates[0];
            if (firstPolygon.length > 0) {
                const centroid = calculatePolygonCentroid(firstPolygon[0]);
                return {
                    geometry: {
                        type: 'Polygon',
                        coordinates: firstPolygon,
                    },
                    centroid,
                };
            }
        }

        // Handle LineString - convert to polygon by buffering (if we had a buffer function)
        // For now, skip it
        if (geometry.type === 'LineString') {
            continue;
        }

        // Handle Point - skip for now as it's not a useful boundary
        if (geometry.type === 'Point') {
            continue;
        }
    }

    return null;
}

/**
 * Calculate the centroid (center point) of a polygon from its coordinates
 */
export function calculatePolygonCentroid(
    coordinates: [number, number][]
): { latitude: number; longitude: number } {
    if (coordinates.length === 0) {
        return { latitude: 0, longitude: 0 };
    }

    let area = 0;
    let x = 0;
    let y = 0;

    for (let i = 0; i < coordinates.length - 1; i++) {
        const [lng1, lat1] = coordinates[i];
        const [lng2, lat2] = coordinates[i + 1];

        const crossProduct = lng1 * lat2 - lng2 * lat1;
        area += crossProduct;
        x += (lng1 + lng2) * crossProduct;
        y += (lat1 + lat2) * crossProduct;
    }

    area /= 2;

    if (area === 0) {
        // Fallback to simple average if area is zero
        const avgLat = coordinates.reduce((sum, [_, lat]) => sum + lat, 0) / coordinates.length;
        const avgLng = coordinates.reduce((sum, [lng, _]) => sum + lng, 0) / coordinates.length;
        return { latitude: avgLat, longitude: avgLng };
    }

    return {
        latitude: Number((y / (6 * area)).toFixed(6)),
        longitude: Number((x / (6 * area)).toFixed(6)),
    };
}

/**
 * Validate that a file is a KML or KMZ file
 */
export function isValidKMLFile(file: File): boolean {
    const validExtensions = ['.kml', '.kmz'];
    const validMimeTypes = [
        'application/vnd.google-earth.kml+xml',
        'application/vnd.google-earth.kmz',
        'application/vnd.google-earth.kmz+xml',
        'application/zip',
        'application/x-zip-compressed',
        'application/octet-stream',
    ];

    const fileName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some((ext) => fileName.endsWith(ext));
    const hasValidMimeType = validMimeTypes.includes(file.type) || file.type === '';

    return hasValidExtension || hasValidMimeType;
}

export interface KMLPoint {
    name?: string;
    latitude: number;
    longitude: number;
    coordinates: [number, number]; // [longitude, latitude] for GeoJSON compatibility
    order?: number;
}

/**
 * Extract all Point features from KML
 * Returns an array of points that can be used to draw a polygon
 */
export function extractPointsFromKML(features: KMLParseResult['features']): KMLPoint[] {
    const points: KMLPoint[] = [];

    for (let i = 0; i < features.length; i++) {
        const feature = features[i];
        if (!feature.geometry) continue;

        const geometry = feature.geometry;

        // Handle Point geometry
        if (geometry.type === 'Point' && geometry.coordinates.length >= 2) {
            const [longitude, latitude] = geometry.coordinates;
            points.push({
                name: feature.name || `Point ${points.length + 1}`,
                latitude: Number(latitude.toFixed(6)),
                longitude: Number(longitude.toFixed(6)),
                coordinates: [longitude, latitude],
                order: points.length + 1,
            });
        }

        // Handle MultiPoint geometry
        if (geometry.type === 'MultiPoint' && geometry.coordinates.length > 0) {
            for (const coord of geometry.coordinates) {
                if (coord.length >= 2) {
                    const [longitude, latitude] = coord;
                    points.push({
                        name: feature.name || `Point ${points.length + 1}`,
                        latitude: Number(latitude.toFixed(6)),
                        longitude: Number(longitude.toFixed(6)),
                        coordinates: [longitude, latitude],
                        order: points.length + 1,
                    });
                }
            }
        }

        // Handle LineString - extract vertices as points
        if (geometry.type === 'LineString' && geometry.coordinates.length > 0) {
            for (const coord of geometry.coordinates) {
                if (coord.length >= 2) {
                    const [longitude, latitude] = coord;
                    points.push({
                        name: feature.name || `Point ${points.length + 1}`,
                        latitude: Number(latitude.toFixed(6)),
                        longitude: Number(longitude.toFixed(6)),
                        coordinates: [longitude, latitude],
                        order: points.length + 1,
                    });
                }
            }
        }

        // Handle Polygon vertices - extract as points
        if (geometry.type === 'Polygon' && geometry.coordinates.length > 0) {
            const exteriorRing = geometry.coordinates[0];
            for (const coord of exteriorRing) {
                if (coord.length >= 2) {
                    const [longitude, latitude] = coord;
                    points.push({
                        name: feature.name || `Point ${points.length + 1}`,
                        latitude: Number(latitude.toFixed(6)),
                        longitude: Number(longitude.toFixed(6)),
                        coordinates: [longitude, latitude],
                        order: points.length + 1,
                    });
                }
            }
        }
    }

    return points;
}

/**
 * Create a polygon from an array of points
 * Points must be ordered correctly to form a valid polygon
 * Automatically closes the polygon (first point = last point)
 */
export function createPolygonFromPoints(points: KMLPoint[]): {
    geometry: any;
    centroid: { latitude: number; longitude: number };
} | null {
    if (points.length < 3) {
        return null; // Need at least 3 points to form a polygon
    }

    // Convert points to coordinate array [longitude, latitude] format
    const coordinates = points.map((p) => p.coordinates);

    // Close the polygon: add first point at the end if it's not already
    const closedCoordinates = [...coordinates];
    if (
        closedCoordinates.length > 0 &&
        (closedCoordinates[closedCoordinates.length - 1][0] !== closedCoordinates[0][0] ||
            closedCoordinates[closedCoordinates.length - 1][1] !== closedCoordinates[0][1])
    ) {
        closedCoordinates.push(closedCoordinates[0]);
    }

    const geometry = {
        type: 'Polygon',
        coordinates: [closedCoordinates],
    };

    // Extract ring without the closing point for centroid calculation
    const coordinatesForCentroid = coordinates.map((coord) => [coord[1], coord[0]] as [number, number]);
    const centroid = calculatePolygonCentroid(coordinatesForCentroid);

    return { geometry, centroid };
}

/**
 * Sort points in counter-clockwise order to form a valid polygon
 * Uses the shoelace formula to determine order
 */
export function sortPointsForPolygon(points: KMLPoint[]): KMLPoint[] {
    if (points.length <= 2) return points;

    // Calculate centroid of all points
    const centerLat = points.reduce((sum, p) => sum + p.latitude, 0) / points.length;
    const centerLng = points.reduce((sum, p) => sum + p.longitude, 0) / points.length;

    // Sort by angle from centroid
    const sortedPoints = [...points].sort((a, b) => {
        const angleA = Math.atan2(a.latitude - centerLat, a.longitude - centerLng);
        const angleB = Math.atan2(b.latitude - centerLat, b.longitude - centerLng);
        return angleA - angleB;
    });

    // Update order
    return sortedPoints.map((p, index) => ({
        ...p,
        order: index + 1,
    }));
}
