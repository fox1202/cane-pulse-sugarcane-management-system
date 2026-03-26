import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import '../models/observation_models.dart';
import '../utils/app_colors.dart';

class BlockMapViewer extends StatelessWidget {
  final BlockModel? selectedBlock;
  final Position? currentPosition;

  const BlockMapViewer({
    super.key,
    required this.selectedBlock,
    this.currentPosition,
  });

  Map<String, dynamic>? _normalizeGeometry(dynamic rawGeometry) {
    if (rawGeometry == null) return null;

    if (rawGeometry is Map<String, dynamic>) {
      return rawGeometry;
    }

    if (rawGeometry is Map) {
      return Map<String, dynamic>.from(rawGeometry);
    }

    if (rawGeometry is String && rawGeometry.trim().isNotEmpty) {
      try {
        final decoded = jsonDecode(rawGeometry);
        if (decoded is Map<String, dynamic>) {
          return decoded;
        }
        if (decoded is Map) {
          return Map<String, dynamic>.from(decoded);
        }
      } catch (e) {
        debugPrint('Error decoding geometry JSON: $e');
      }
    }

    return null;
  }

  /// Convert GeoJSON geometry to a list of polygon rings.
  List<List<LatLng>> _parseGeometryToPolygons(dynamic rawGeometry) {
    final geometry = _normalizeGeometry(rawGeometry);
    if (geometry == null) return [];

    try {
      final type = geometry['type'] as String? ?? '';
      final coordinates = geometry['coordinates'];

      if (type == 'Polygon' && coordinates is List) {
        if (coordinates.isEmpty) return [];
        final ring = _parseRingToPoints(coordinates[0]);
        return ring.isEmpty ? [] : [ring];
      } else if (type == 'MultiPolygon' && coordinates is List) {
        return coordinates
            .whereType<List>()
            .map(
              (polygonCoordinates) => polygonCoordinates.isNotEmpty
                  ? _parseRingToPoints(polygonCoordinates[0])
                  : <LatLng>[],
            )
            .where((ring) => ring.isNotEmpty)
            .toList();
      }
    } catch (e) {
      debugPrint('Error parsing geometry: $e');
    }

    return [];
  }

  List<LatLng> _parseRingToPoints(dynamic rawRing) {
    if (rawRing is! List) return [];

    return rawRing
        .map((coord) {
          if (coord is List && coord.length >= 2) {
            final lng = (coord[0] as num).toDouble();
            final lat = (coord[1] as num).toDouble();
            return LatLng(lat, lng);
          }
          return null;
        })
        .whereType<LatLng>()
        .toList();
  }

  /// Calculate centroid of polygon
  LatLng _calculateCentroid(List<List<LatLng>> polygons) {
    final points = polygons.expand((polygon) => polygon).toList();
    if (points.isEmpty) {
      return const LatLng(20.5937, 78.9629); // Default to India center
    }

    double lat = 0, lng = 0;
    for (final point in points) {
      lat += point.latitude;
      lng += point.longitude;
    }
    return LatLng(lat / points.length, lng / points.length);
  }

  @override
  Widget build(BuildContext context) {
    final polygonRings = _parseGeometryToPolygons(selectedBlock?.geom);
    final polygonPoints = polygonRings.expand((ring) => ring).toList();

    if (selectedBlock == null || polygonPoints.isEmpty) {
      return Container(
        height: 250,
        margin: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.borderSoft, width: 2),
          color: AppColors.sageGreen.withOpacity(0.2),
        ),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.map_outlined,
                size: 48,
                color: AppColors.primaryGreen.withOpacity(0.5),
              ),
              const SizedBox(height: 12),
              const Text(
                'Select a block to view boundaries',
                style: TextStyle(color: AppColors.textGray, fontSize: 14),
              ),
            ],
          ),
        ),
      );
    }

    final centroid = _calculateCentroid(polygonRings);
    final currentLoc = currentPosition != null
        ? LatLng(currentPosition!.latitude, currentPosition!.longitude)
        : null;
    final isInsideBlock = currentLoc != null
        ? _isPointInAnyPolygon(currentLoc, polygonRings)
        : false;

    return Container(
      height: 300,
      margin: const EdgeInsets.symmetric(vertical: 16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderSoft, width: 2),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          FlutterMap(
            options: MapOptions(initialCenter: centroid, initialZoom: 16),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.example.canepulse',
              ),
              // Draw polygon for block boundary
              PolygonLayer(
                polygons: polygonRings
                    .map(
                      (ring) => Polygon(
                        points: ring,
                        color: AppColors.primaryGreen.withOpacity(0.3),
                        borderColor: AppColors.primaryGreen,
                        borderStrokeWidth: 2.5,
                        isFilled: true,
                      ),
                    )
                    .toList(),
              ),
              // Draw current position marker if available
              if (currentLoc != null)
                MarkerLayer(
                  markers: [
                    Marker(
                      point: currentLoc,
                      width: 40,
                      height: 40,
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.blue,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.blue.withOpacity(0.3),
                              blurRadius: 8,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.near_me,
                          color: Colors.white,
                          size: 20,
                        ),
                      ),
                    ),
                  ],
                ),
              // Draw centroid marker
              MarkerLayer(
                markers: [
                  Marker(
                    point: centroid,
                    width: 50,
                    height: 50,
                    child: Container(
                      decoration: BoxDecoration(
                        color: AppColors.primaryGreen,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primaryGreen.withOpacity(0.4),
                            blurRadius: 8,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.location_on,
                        color: Colors.white,
                        size: 24,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          // Legend overlay
          Positioned(
            top: 12,
            right: 12,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 150),
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.95),
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 4,
                      spreadRadius: 1,
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 14,
                          height: 14,
                          decoration: BoxDecoration(
                            color: AppColors.primaryGreen.withOpacity(0.3),
                            border: Border.all(
                              color: AppColors.primaryGreen,
                              width: 1.5,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Flexible(
                          child: Text(
                            'Block',
                            style: TextStyle(
                              fontSize: 10,
                              color: AppColors.textDark,
                              fontWeight: FontWeight.w600,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 12,
                          height: 12,
                          decoration: const BoxDecoration(
                            color: AppColors.primaryGreen,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Flexible(
                          child: Text(
                            'Center',
                            style: TextStyle(
                              fontSize: 10,
                              color: AppColors.textDark,
                              fontWeight: FontWeight.w600,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    if (currentLoc != null) ...[
                      const SizedBox(height: 6),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 12,
                            height: 12,
                            decoration: const BoxDecoration(
                              color: Colors.blue,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          const Flexible(
                            child: Text(
                              'You',
                              style: TextStyle(
                                fontSize: 10,
                                color: AppColors.textDark,
                                fontWeight: FontWeight.w600,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
          // Block info card
          Positioned(
            bottom: 12,
            left: 12,
            right: 12,
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.95),
                borderRadius: BorderRadius.circular(10),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 4,
                    spreadRadius: 1,
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    selectedBlock!.name ?? selectedBlock!.blockId,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textDark,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Block ID: ${selectedBlock!.blockId}',
                    style: const TextStyle(fontSize: 11, color: AppColors.textGray),
                  ),
                  if (currentLoc != null) ...[
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Icon(
                          isInsideBlock ? Icons.check_circle : Icons.warning,
                          size: 14,
                          color: isInsideBlock
                              ? AppColors.successGreen
                              : AppColors.errorRed,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          isInsideBlock
                              ? 'Inside block boundary'
                              : 'Outside block boundary',
                          style: TextStyle(
                            fontSize: 11,
                            color: isInsideBlock
                                ? AppColors.successGreen
                                : AppColors.errorRed,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  bool _isPointInAnyPolygon(LatLng point, List<List<LatLng>> polygons) {
    for (final polygon in polygons) {
      if (_isPointInSinglePolygon(point, polygon)) {
        return true;
      }
    }
    return false;
  }

  /// Simple point-in-polygon check
  bool _isPointInSinglePolygon(LatLng point, List<LatLng> polygon) {
    int intersectCount = 0;
    for (int i = 0; i < polygon.length - 1; i++) {
      final p1 = polygon[i];
      final p2 = polygon[i + 1];

      if ((p1.latitude > point.latitude) != (p2.latitude > point.latitude)) {
        final xinters =
            (p2.longitude - p1.longitude) *
                (point.latitude - p1.latitude) /
                (p2.latitude - p1.latitude) +
            p1.longitude;
        if (point.longitude < xinters) {
          intersectCount++;
        }
      }
    }
    return (intersectCount % 2) == 1;
  }
}
