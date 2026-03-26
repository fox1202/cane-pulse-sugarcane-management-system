import 'dart:convert';

import 'package:latlong2/latlong.dart';

import 'geo_utils.dart';

List<Map<String, dynamic>> parseGeoJsonSpatialFeatures(String source) {
  final decoded = jsonDecode(source);

  if (decoded is! Map) {
    throw const FormatException('GeoJSON root must be an object.');
  }

  final root = Map<String, dynamic>.from(decoded);
  final rootType = root['type']?.toString().trim() ?? '';
  final rawFeatures = switch (rootType) {
    'FeatureCollection' => root['features'],
    'Feature' => [root],
    _ => throw FormatException('Unsupported GeoJSON type: $rootType'),
  };

  if (rawFeatures is! List) {
    throw const FormatException('GeoJSON features must be a list.');
  }

  final parsedFeatures = <Map<String, dynamic>>[];

  for (final rawFeature in rawFeatures) {
    if (rawFeature is! Map) continue;

    final feature = Map<String, dynamic>.from(rawFeature);
    final geometry = _normalizeGeometry(feature['geometry']);
    if (geometry == null) continue;

    final rings = _extractGeometryRings(geometry);
    if (rings.isEmpty) continue;

    final properties = _normalizeProperties(feature['properties']);
    final importedValues = _mapImportedValues(properties);
    final fieldName =
        _stringValue(importedValues['field_name']) ??
        _stringValue(importedValues['field_id']) ??
        _stringValue(importedValues['block_id']) ??
        _stringValue(properties['name']) ??
        'Unknown';
    final blockId = _stringValue(importedValues['block_id']) ?? '';

    if (fieldName == 'Unknown' && blockId.isEmpty) {
      continue;
    }

    final area =
        _doubleValue(importedValues['area']) ??
        GeoUtils.calculateAreaHectares(geometry) ??
        0;

    parsedFeatures.add({
      'geometry': geometry,
      'rings': rings,
      'attributes': {
        ...properties,
        'name': _stringValue(properties['name']) ?? fieldName,
      },
      'hectarage': area,
      'centroid': _calculateCentroid(rings),
      'field_id':
          _stringValue(importedValues['field_id']) ??
          _stringValue(importedValues['field_name']) ??
          fieldName,
      'field_name': fieldName,
      'block_id': blockId,
      'section_name': _stringValue(importedValues['section_name']) ?? '',
      ...importedValues,
    });
  }

  return parsedFeatures;
}

Map<String, dynamic>? _normalizeGeometry(dynamic rawGeometry) {
  if (rawGeometry is Map<String, dynamic>) {
    return rawGeometry;
  }

  if (rawGeometry is Map) {
    return Map<String, dynamic>.from(rawGeometry);
  }

  return null;
}

Map<String, dynamic> _normalizeProperties(dynamic rawProperties) {
  if (rawProperties is Map<String, dynamic>) {
    return Map<String, dynamic>.from(rawProperties);
  }

  if (rawProperties is Map) {
    return Map<String, dynamic>.from(rawProperties);
  }

  return <String, dynamic>{};
}

List<List<LatLng>> _extractGeometryRings(Map<String, dynamic> geometry) {
  final type = geometry['type']?.toString().trim() ?? '';
  final coordinates = geometry['coordinates'];

  if (type == 'Polygon' && coordinates is List) {
    return coordinates
        .whereType<List>()
        .map(_parseRing)
        .where((ring) => ring.length >= 3)
        .toList();
  }

  if (type == 'MultiPolygon' && coordinates is List) {
    final rings = <List<LatLng>>[];
    for (final polygon in coordinates.whereType<List>()) {
      for (final ring in polygon.whereType<List>()) {
        final parsedRing = _parseRing(ring);
        if (parsedRing.length >= 3) {
          rings.add(parsedRing);
        }
      }
    }
    return rings;
  }

  return const <List<LatLng>>[];
}

List<LatLng> _parseRing(List<dynamic> ring) {
  return ring
      .map((point) {
        if (point is List && point.length >= 2) {
          final lng = _doubleValue(point[0]);
          final lat = _doubleValue(point[1]);
          if (lat != null && lng != null) {
            return LatLng(lat, lng);
          }
        }
        return null;
      })
      .whereType<LatLng>()
      .toList();
}

LatLng _calculateCentroid(List<List<LatLng>> rings) {
  final points = rings.expand((ring) => ring).toList();
  if (points.isEmpty) return const LatLng(0, 0);

  var latitude = 0.0;
  var longitude = 0.0;
  for (final point in points) {
    latitude += point.latitude;
    longitude += point.longitude;
  }

  return LatLng(latitude / points.length, longitude / points.length);
}

Map<String, dynamic> _mapImportedValues(Map<String, dynamic> properties) {
  return {
    'field_id': _stringValue(
      _lookupProperty(properties, const ['field_id', 'field id']),
    ),
    'field_name': _stringValue(
      _lookupProperty(properties, const [
        'field_name',
        'field name',
        'field id',
      ]),
    ),
    'block_id': _stringValue(
      _lookupProperty(properties, const ['block_id', 'block id']),
    ),
    'section_name': _stringValue(
      _lookupProperty(properties, const ['section_name', 'section name']),
    ),
    'area': _doubleValue(_lookupProperty(properties, const ['area'])),
    'irrigation_type': _stringValue(
      _lookupProperty(properties, const ['irrigation_type', 'irrigation type']),
    ),
    'water_source': _stringValue(
      _lookupProperty(properties, const ['water_source', 'water source']),
    ),
    'tam_mm': _stringValue(
      _lookupProperty(properties, const ['tam', 'tam_mm']),
    ),
    'soil_type': _stringValue(
      _lookupProperty(properties, const ['soil_type', 'soil type']),
    ),
    'soil_ph': _doubleValue(
      _lookupProperty(properties, const ['soil_ph', 'soil ph', 'ph', 'p_h']),
    ),
    'field_remarks': _stringValue(
      _lookupProperty(properties, const ['field_remarks', 'field remarks']),
    ),
    'trial_number': _stringValue(
      _lookupProperty(properties, const ['trial_number', 'trial number']),
    ),
    'trial_name': _stringValue(
      _lookupProperty(properties, const ['trial_name', 'trial name']),
    ),
    'contact_person': _stringValue(
      _lookupProperty(properties, const ['contact_person', 'contact person']),
    ),
    'date_recorded': _dateString(
      _lookupProperty(properties, const ['date_recorded', 'date recorded']),
    ),
    'crop_type': _stringValue(
      _lookupProperty(properties, const ['crop_type', 'crop type']),
    ),
    'crop_class': _stringValue(
      _lookupProperty(properties, const ['crop_class', 'crop class']),
    ),
    'planting_date': _dateString(
      _lookupProperty(properties, const ['planting_date', 'planting date']),
    ),
    'previous_cutting': _dateString(
      _lookupProperty(properties, const [
        'previous_cutting',
        'previous cutting',
      ]),
    ),
    'expected_harvest_date': _dateString(
      _lookupProperty(properties, const [
        'expected_harvest_date',
        'expected harvest date',
      ]),
    ),
    'residue_type': _stringValue(
      _lookupProperty(properties, const ['residue_type', 'residue type']),
    ),
    'residue_management_method': _stringValue(
      _lookupProperty(properties, const [
        'residue_management_method',
        'residue management method',
        'management_method',
        'management method',
      ]),
    ),
    'residual_management_remarks': _stringValue(
      _lookupProperty(properties, const [
        'residual_management_remarks',
        'residue remarks',
        'residue_remarks',
      ]),
    ),
    'fertilizer_type': _stringValue(
      _lookupProperty(properties, const [
        'fertilizer_type',
        'fertiliser_type',
        'fertilizer type',
      ]),
    ),
    'nutrient_application_date': _dateString(
      _lookupProperty(properties, const [
        'nutrient_application_date',
        'nutrient application date',
      ]),
    ),
    'application_rate': _doubleValue(
      _lookupProperty(properties, const [
        'application_rate',
        'application rate',
      ]),
    ),
    'foliar_sampling_date': _dateString(
      _lookupProperty(properties, const [
        'foliar_sampling_date',
        'foliar sampling date',
      ]),
    ),
    'herbicide_name': _stringValue(
      _lookupProperty(properties, const ['herbicide_name', 'herbicide name']),
    ),
    'weed_application_date': _dateString(
      _lookupProperty(properties, const [
        'weed_application_date',
        'weed application date',
      ]),
    ),
    'weed_application_rate': _doubleValue(
      _lookupProperty(properties, const [
        'weed_application_rate',
        'weed application rate',
      ]),
    ),
    'pest_remarks': _stringValue(
      _lookupProperty(properties, const ['pest_remarks', 'pest remarks']),
    ),
    'disease_remarks': _stringValue(
      _lookupProperty(properties, const ['disease_remarks', 'disease remarks']),
    ),
    'harvest_date': _dateString(
      _lookupProperty(properties, const [
        'actual_harvest_date',
        'actual harvest date',
        'harvest_date',
        'harvest date',
      ]),
    ),
    'quality_remarks': _stringValue(
      _lookupProperty(properties, const [
        'yield_and_quality_remarks',
        'yield and quality remarks',
        'quality_remarks',
        'quality remarks',
      ]),
    ),
  }..removeWhere((key, value) => value == null);
}

dynamic _lookupProperty(Map<String, dynamic> properties, List<String> keys) {
  final canonicalLookup = <String, dynamic>{};
  for (final entry in properties.entries) {
    canonicalLookup[_canonicalPropertyKey(entry.key)] = entry.value;
  }

  for (final key in keys) {
    final canonicalKey = _canonicalPropertyKey(key);
    if (!canonicalLookup.containsKey(canonicalKey)) continue;

    final value = canonicalLookup[canonicalKey];
    if (_hasValue(value)) {
      return value;
    }
  }

  return null;
}

String _canonicalPropertyKey(String key) {
  return key.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '');
}

bool _hasValue(dynamic value) {
  if (value == null) return false;
  if (value is String) return value.trim().isNotEmpty;
  return true;
}

String? _stringValue(dynamic value) {
  if (value == null) return null;

  if (value is num) {
    if (value == value.roundToDouble()) {
      return value.toInt().toString();
    }
    return value.toString();
  }

  final text = value.toString().trim();
  return text.isEmpty ? null : text;
}

double? _doubleValue(dynamic value) {
  if (value == null) return null;
  if (value is num) return value.toDouble();
  final text = value.toString().trim();
  if (text.isEmpty) return null;
  return double.tryParse(text);
}

String? _dateString(dynamic value) {
  final text = _stringValue(value);
  if (text == null) return null;

  final parsed = DateTime.tryParse(text);
  return parsed?.toIso8601String() ?? text;
}
