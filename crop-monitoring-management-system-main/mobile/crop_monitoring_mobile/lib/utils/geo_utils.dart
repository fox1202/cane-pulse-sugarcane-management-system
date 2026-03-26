import 'dart:convert';
import 'dart:math' show cos, pi;

class GeoUtils {
  static Map<String, dynamic>? normalizeGeometry(dynamic rawPolygon) {
    if (rawPolygon == null) return null;

    if (rawPolygon is Map<String, dynamic>) {
      return rawPolygon;
    }

    if (rawPolygon is Map) {
      return Map<String, dynamic>.from(rawPolygon);
    }

    if (rawPolygon is String && rawPolygon.trim().isNotEmpty) {
      try {
        final decoded = jsonDecode(rawPolygon);
        if (decoded is Map<String, dynamic>) {
          return decoded;
        }
        if (decoded is Map) {
          return Map<String, dynamic>.from(decoded);
        }
      } catch (_) {
        return null;
      }
    }

    return null;
  }

  /// Simple Ray-Casting Algorithm for Point-in-Polygon
  static bool isPointInPolygon(double lat, double lng, dynamic rawPolygon) {
    final polygon = normalizeGeometry(rawPolygon);
    if (polygon == null) return false;

    // GeoJSON structure: MultiPolygon or Polygon
    String type = polygon['type'] ?? '';

    if (type == 'Polygon') {
      return _checkSinglePolygon(lat, lng, polygon['coordinates'] as List);
    } else if (type == 'MultiPolygon') {
      List multiCoords = polygon['coordinates'] as List;
      for (var coords in multiCoords) {
        if (_checkSinglePolygon(lat, lng, coords as List)) return true;
      }
    }

    return false;
  }

  static double? calculateAreaHectares(dynamic rawPolygon) {
    final polygon = normalizeGeometry(rawPolygon);
    if (polygon == null) return null;

    final type = polygon['type']?.toString() ?? '';
    double areaSquareMeters = 0;

    if (type == 'Polygon') {
      areaSquareMeters = _calculatePolygonAreaSquareMeters(
        polygon['coordinates'] as List? ?? const [],
      );
    } else if (type == 'MultiPolygon') {
      final multiCoords = polygon['coordinates'] as List? ?? const [];
      for (final coords in multiCoords) {
        if (coords is List) {
          areaSquareMeters += _calculatePolygonAreaSquareMeters(coords);
        }
      }
    } else {
      return null;
    }

    if (areaSquareMeters <= 0) return null;
    return areaSquareMeters / 10000;
  }

  static bool _checkSinglePolygon(double lat, double lng, List coordinates) {
    if (coordinates.isEmpty) return false;

    // The first ring is the exterior boundary
    List exterior = coordinates[0] as List;
    bool inside = false;

    for (int i = 0, j = exterior.length - 1; i < exterior.length; j = i++) {
      // GeoJSON uses [lng, lat]
      double xi = (exterior[i][0] as num).toDouble();
      double yi = (exterior[i][1] as num).toDouble();
      double xj = (exterior[j][0] as num).toDouble();
      double yj = (exterior[j][1] as num).toDouble();

      bool intersect =
          ((yi > lat) != (yj > lat)) &&
          (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);

      if (intersect) inside = !inside;
    }

    // TODO: Handle holes (rest of the coordinates rings) if necessary
    // If inside is true, check if it's in a hole
    if (inside && coordinates.length > 1) {
      for (int k = 1; k < coordinates.length; k++) {
        if (_checkSinglePolygon(lat, lng, [coordinates[k]])) {
          return false; // It's in a hole
        }
      }
    }

    return inside;
  }

  static double _calculatePolygonAreaSquareMeters(List coordinates) {
    if (coordinates.isEmpty) return 0;

    double area = 0;

    for (int i = 0; i < coordinates.length; i++) {
      final ring = coordinates[i];
      if (ring is! List || ring.length < 4) continue;

      final ringArea = _calculateRingAreaSquareMeters(ring);
      area += i == 0 ? ringArea : -ringArea;
    }

    return area.abs();
  }

  static double _calculateRingAreaSquareMeters(List ring) {
    final points = <List<double>>[];

    for (final point in ring) {
      if (point is! List || point.length < 2) continue;

      final lng = point[0];
      final lat = point[1];
      if (lng is! num || lat is! num) continue;

      points.add(<double>[lng.toDouble(), lat.toDouble()]);
    }

    if (points.length < 3) return 0;

    final isClosed =
        points.first[0] == points.last[0] && points.first[1] == points.last[1];
    final vertexCount = isClosed ? points.length - 1 : points.length;
    if (vertexCount < 3) return 0;

    double avgLng = 0;
    double avgLat = 0;
    for (int i = 0; i < vertexCount; i++) {
      avgLng += points[i][0];
      avgLat += points[i][1];
    }

    final originLng = _toRadians(avgLng / vertexCount);
    final originLat = _toRadians(avgLat / vertexCount);
    const earthRadiusMeters = 6371008.8;

    final projected = <List<double>>[];
    for (int i = 0; i < vertexCount; i++) {
      final lng = _toRadians(points[i][0]);
      final lat = _toRadians(points[i][1]);
      projected.add(<double>[
        earthRadiusMeters * (lng - originLng) * cos(originLat),
        earthRadiusMeters * (lat - originLat),
      ]);
    }

    double area = 0;
    for (int i = 0; i < projected.length; i++) {
      final next = (i + 1) % projected.length;
      area +=
          projected[i][0] * projected[next][1] -
          projected[next][0] * projected[i][1];
    }

    return area.abs() / 2;
  }

  static double _toRadians(double degrees) => degrees * pi / 180;
}
