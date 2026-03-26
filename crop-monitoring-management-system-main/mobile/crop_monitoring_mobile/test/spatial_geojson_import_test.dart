import 'package:crop_monitoring_mobile/utils/spatial_geojson_import.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('parseGeoJsonSpatialFeatures maps field observation properties', () {
    const geoJson = '''
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "Field ID": "CP trial B",
        "Block ID": "Centre Pivot",
        "Irrigation Type": "Centre Pivot",
        "Water Source": "Dam 1",
        "TAM": 102.0,
        "Trial Name": "Bulk Plant",
        "Contact Person": "Dr L. T. Mpofu",
        "Yield and Quality Remarks": "Good stand"
      },
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [
          [
            [
              [31.6190, -21.0353],
              [31.6200, -21.0346],
              [31.6203, -21.0356],
              [31.6190, -21.0353]
            ]
          ]
        ]
      }
    }
  ]
}
''';

    final features = parseGeoJsonSpatialFeatures(geoJson);

    expect(features, hasLength(1));
    expect(features.first['field_id'], 'CP trial B');
    expect(features.first['field_name'], 'CP trial B');
    expect(features.first['block_id'], 'Centre Pivot');
    expect(features.first['irrigation_type'], 'Centre Pivot');
    expect(features.first['water_source'], 'Dam 1');
    expect(features.first['tam_mm'], '102');
    expect(features.first['trial_name'], 'Bulk Plant');
    expect(features.first['contact_person'], 'Dr L. T. Mpofu');
    expect(features.first['quality_remarks'], 'Good stand');
    expect(features.first['geometry']['type'], 'MultiPolygon');
    expect(features.first['attributes']['name'], 'CP trial B');
    expect((features.first['hectarage'] as double), greaterThan(0));
  });

  test('parseGeoJsonSpatialFeatures skips unnamed empty features', () {
    const geoJson = '''
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "Field ID": null,
        "Block ID": null
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [31.0, -21.0],
            [31.1, -21.0],
            [31.1, -21.1],
            [31.0, -21.0]
          ]
        ]
      }
    }
  ]
}
''';

    final features = parseGeoJsonSpatialFeatures(geoJson);

    expect(features, isEmpty);
  });
}
