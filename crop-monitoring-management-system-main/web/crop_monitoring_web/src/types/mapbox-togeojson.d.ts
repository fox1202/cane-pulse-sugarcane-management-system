declare module '@mapbox/togeojson' {
  function kml(kmlDom: Document): GeoJSON.FeatureCollection;
  export { kml };
}

declare namespace GeoJSON {
  interface FeatureCollection {
    type: 'FeatureCollection';
    features: Feature[];
  }

  interface Feature {
    type: 'Feature';
    geometry: Geometry | null;
    properties: Record<string, any>;
  }

  type Geometry = Point | LineString | Polygon | MultiPolygon | MultiPoint | MultiLineString;

  interface Point {
    type: 'Point';
    coordinates: [number, number];
  }

  interface LineString {
    type: 'LineString';
    coordinates: [number, number][];
  }

  interface Polygon {
    type: 'Polygon';
    coordinates: [number, number][][];
  }

  interface MultiPoint {
    type: 'MultiPoint';
    coordinates: [number, number][];
  }

  interface MultiLineString {
    type: 'MultiLineString';
    coordinates: [number, number][][];
  }

  interface MultiPolygon {
    type: 'MultiPolygon';
    coordinates: [number, number][][][];
  }
}
