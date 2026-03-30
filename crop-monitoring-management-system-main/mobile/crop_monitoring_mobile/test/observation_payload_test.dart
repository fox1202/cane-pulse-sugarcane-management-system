import 'package:crop_monitoring_mobile/models/observation_models.dart';
import 'package:crop_monitoring_mobile/services/supabase_service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const sampleGeometry = {
    'type': 'Polygon',
    'coordinates': [
      [
        [31.0, -17.8],
        [31.1, -17.8],
        [31.1, -17.9],
        [31.0, -17.9],
        [31.0, -17.8],
      ],
    ],
  };

  test('normalizeObservationPayload converts flat legacy observations', () {
    final normalized = normalizeObservationPayload({
      'client_uuid': 'offline-123',
      'section_name': 'Section A',
      'block_id': 'B-10',
      'field_name': 'North Plot',
      'latitude': -17.8123,
      'longitude': 31.0449,
      'gps_accuracy': 4.2,
      'date_recorded': '2026-03-09T10:00:00.000',
      'trial_number': 'TR-7A',
      'trial_name': 'Irrigation Trial',
      'contact_person': 'Agronomist',
      'phone_country_code': '+263',
      'phone_number': '771234567',
      'crop_type': 'Sugarcane',
      'crop_class': 'Plant cane',
      'variety': 'ZN10',
      'planting_date': '2025-10-01T00:00:00.000',
      'cutting_date': '2026-02-01T00:00:00.000',
      'expected_harvest_date': '2026-08-01T00:00:00.000',
      'irrigation_type': 'Drip',
      'water_source': 'Canal',
      'tam_mm': '08:30',
      'yield': '96.4',
      'soil_type': 'Loam',
      'ph': '6.4',
      'remarks': 'Healthy stand',
      'created_at': '2026-03-09T10:05:00.000',
      'block_size': 12.5,
      'geometry': sampleGeometry,
    });

    expect(normalized['client_uuid'], 'offline-123');
    expect(
      normalized['field_identification'].containsKey('section_name'),
      isFalse,
    );
    expect(normalized['field_identification']['trial_number'], 'TR-7A');
    expect(
      normalized['field_identification']['contact_person_scientist'],
      'Agronomist',
    );
    expect(
      normalized['field_identification'].containsKey('phone_country_code'),
      isFalse,
    );
    expect(
      normalized['field_identification'].containsKey('phone_number'),
      isFalse,
    );
    expect(normalized['crop_information']['crop_type'], 'Sugarcane');
    expect(normalized['crop_information']['crop_class'], 'Plant cane');
    expect(normalized['crop_information']['variety'], 'ZN10');
    expect(normalized['irrigation_management']['water_source'], 'Canal');
    expect(normalized['field_identification']['tam_mm'], '08:30');
    expect(normalized['harvest_information']['yield'], 96.4);
    expect(normalized['soil_characteristics']['soil_ph'], 6.4);
    expect(normalized['crop_monitoring']['remarks'], 'Healthy stand');
    expect(normalized['residual_management']['remarks'], 'Healthy stand');
    expect(normalized['block_size'], 12.5);
    expect(normalized['spatial_data'], sampleGeometry);
    expect(normalized['geometry'], sampleGeometry);
  });

  test(
    'ObservationModel.fromMap accepts flat payloads through normalization',
    () {
      final observation = ObservationModel.fromMap({
        'section_name': 'Section B',
        'block_id': 'B-11',
        'field_name': 'South Plot',
        'latitude': -17.9,
        'longitude': 31.1,
        'gps_accuracy': 3.5,
        'date_recorded': '2026-03-09T11:00:00.000',
        'variety': 'ZN11',
        'created_at': '2026-03-09T11:05:00.000',
      });

      expect(observation.fieldIden.sectionName, '');
      expect(observation.fieldIden.blockId, 'B-11');
      expect(observation.cropInfo.variety, 'ZN11');
      expect(observation.cropInfo.cropType, 'Sugarcane');
      expect(observation.cropInfo.plantingDate, isNull);
      expect(observation.cropInfo.expectedHarvestDate, isNull);
      expect(observation.nutrient.applicationDate, isNull);
      expect(observation.harvest.harvestDate, isNull);
      expect(observation.monitoring.vigor, 'Good');
    },
  );

  test(
    'normalizeObservationPayload keeps optional dates empty when omitted',
    () {
      final normalized = normalizeObservationPayload({
        'block_id': 'B-30',
        'field_name': 'West Plot',
        'date_recorded': '2026-03-11T09:00:00.000',
        'created_at': '2026-03-11T09:05:00.000',
      });

      expect(
        normalized['field_identification']['date_recorded'],
        '2026-03-11T09:00:00.000',
      );
      expect(
        normalized['crop_information'].containsKey('planting_date'),
        isFalse,
      );
      expect(
        normalized['crop_information'].containsKey('expected_harvest_date'),
        isFalse,
      );
      expect(
        normalized['nutrient_management'].containsKey('application_date'),
        isFalse,
      );
      expect(
        normalized['irrigation_management'].containsKey('irrigation_date'),
        isFalse,
      );
      expect(
        normalized['harvest_information'].containsKey('harvest_date'),
        isFalse,
      );
    },
  );

  test('extended observation fields stay readable across normalization', () {
    final normalized = normalizeObservationPayload({
      'field_id': 'field-20',
      'block_id': 'B-20',
      'field_name': 'Central Plot',
      'geom_polygon': sampleGeometry,
      'field_remarks': 'Border rows need checking',
      'pH': '6.7',
      'date_recorded': '2026-03-10T09:00:00.000',
      'previous_cutting': '2026-01-14T00:00:00.000',
      'harvest_date': '2026-03-15T00:00:00.000',
      'harvest_yield': '92.4',
      'quality_remarks': 'Clean cane',
      'residue_type': 'Soyabeans',
      'residue_management_method': 'Mulching',
      'residual_management_remarks': 'Residue retained as cover',
      'fertilizer_type': 'Urea',
      'nutrient_application_date': '2026-02-20T00:00:00.000',
      'application_rate': '120.5',
      'crop_protection_remarks': 'Monitor leaf lesions',
      'pest_control': 'Scout weekly',
      'disease_control': 'Remove infected stools',
      'weed_control': 'Hand hoeing',
    });

    expect(normalized['field_identification']['field_id'], 'field-20');
    expect(normalized['geometry'], sampleGeometry);
    expect(
      normalized['crop_information']['previous_cutting_date'],
      '2026-01-14T00:00:00.000',
    );
    expect(normalized['harvest_information']['yield'], 92.4);
    expect(
      normalized['harvest_information']['cane_quality_remarks'],
      'Clean cane',
    );
    expect(normalized['soil_characteristics']['soil_ph'], 6.7);
    expect(
      normalized['crop_monitoring']['remarks'],
      'Border rows need checking',
    );
    expect(normalized['residual_management']['residue_type'], 'Soyabeans');
    expect(
      normalized['residual_management']['remarks'],
      'Residue retained as cover',
    );
    expect(normalized['residual_management']['management_method'], 'Mulching');
    expect(normalized['nutrient_management']['application_rate'], 120.5);
    expect(
      normalized['nutrient_management']['application_date'],
      '2026-02-20T00:00:00.000',
    );
    expect(normalized['crop_protection']['remarks'], 'Monitor leaf lesions');
    expect(normalized['control_methods']['weed_control'], 'Hand hoeing');
    expect(normalized.containsKey('comments'), isFalse);

    final record = buildModernSugarcaneMonitoringRecord(normalized);
    expect(record['field_id'], 'field-20');
    expect(record['geom_polygon'], sampleGeometry);
    expect(record['field_remarks'], 'Border rows need checking');
    expect(record['soil_ph'], 6.7);
    expect(record['previous_cutting'], '2026-01-14T00:00:00.000');
    expect(record['harvest_yield'], 92.4);
    expect(record['quality_remarks'], 'Clean cane');
    expect(record['residue_management_method'], 'Mulching');
    expect(record['nutrient_application_date'], '2026-02-20T00:00:00.000');
    expect(record['residual_management_remarks'], 'Residue retained as cover');
    expect(record['pest_remarks'], 'Scout weekly');
  });

  test(
    'buildObservationFingerprint ignores client id and timestamp changes',
    () {
      final first = buildObservationFingerprint({
        'client_uuid': 'offline-111',
        'block_id': 'B-12',
        'field_name': 'East Plot',
        'date_recorded': '2026-03-09T08:00:00.000',
        'crop_type': 'Sugarcane',
        'crop_class': 'Plant cane',
        'variety': 'ZN12',
        'tam_mm': '14:15',
        'remarks': 'Observation note',
        'created_at': '2026-03-09T08:05:00.000',
      });

      final second = buildObservationFingerprint({
        'client_uuid': 'offline-222',
        'block_id': 'B-12',
        'field_name': 'East Plot',
        'date_recorded': '2026-03-09T17:00:00.000',
        'crop_type': 'Sugarcane',
        'crop_class': 'Plant cane',
        'variety': 'ZN12',
        'tam_mm': '14:15',
        'remarks': 'Observation note',
        'created_at': '2026-03-09T17:05:00.000',
      });

      expect(first, second);
    },
  );

  test('normalizeObservationPayload keeps legacy tamm_area data readable', () {
    final normalized = normalizeObservationPayload({
      'field_name': 'Legacy Plot',
      'section_name': 'Legacy Section',
      'block_id': 'B-01',
      'latitude': -17.8,
      'longitude': 31.0,
      'gps_accuracy': 3.0,
      'date_recorded': '2026-03-09T12:00:00.000',
      'tamm_area': '09:45',
    });

    expect(normalized['field_identification']['tam_mm'], '09:45');
  });

  test('normalizeObservationPayload keeps row id and field_id readable', () {
    final normalized = normalizeObservationPayload({
      'id': 77,
      'field_id': 'CP trial B',
      'block_id': 'Centre Pivot',
      'geom_polygon': sampleGeometry,
      'tam_mm': '102',
      'soil_ph': 6.3,
      'date_recorded': '2026-03-21T14:30:28.722581',
    });

    expect(normalized['field_identification']['monitoring_row_id'], 77);
    expect(normalized['field_identification']['field_id'], 'CP trial B');
    expect(normalized['field_identification']['field_name'], 'CP trial B');
    expect(normalized['field_identification']['tam_mm'], '102');
    expect(normalized['soil_characteristics']['soil_ph'], 6.3);
    expect(normalized['geometry'], sampleGeometry);
  });

  test(
    'buildModernSugarcaneMonitoringRecord maps the current schema columns',
    () {
      final record = buildModernSugarcaneMonitoringRecord({
        'id': 114,
        'field_id': 'CP trial B',
        'block_id': 'Centre Pivot',
        'geom_polygon': sampleGeometry,
        'area': 1.614,
        'irrigation_type': 'Centre Pivot',
        'water_source': 'Dam 1',
        'tam_mm': '102',
        'soil_type': 'SaL',
        'soil_ph': 6.2,
        'field_remarks': 'Healthy stand',
        'date_recorded': '2026-03-21T14:30:28.722581',
        'trial_number': 'TR-21',
        'trial_name': 'Bulk Plant',
        'contact_person': 'Dr L. T. Mpofu',
        'crop_type': 'Sugarcane',
        'crop_class': 'Plant Cane',
        'planting_date': '2026-01-10T00:00:00.000',
        'previous_cutting': '2026-02-11T00:00:00.000',
        'expected_harvest_date': '2026-11-01T00:00:00.000',
        'harvest_date': '2026-03-20T00:00:00.000',
        'harvest_yield': 96.4,
        'quality_remarks': 'Clean cane',
        'residue_type': 'Trash',
        'residue_management_method': 'Mulching',
        'residual_management_remarks': 'Retained in field',
        'fertilizer_type': 'Urea',
        'nutrient_application_date': '2026-02-20T00:00:00.000',
        'application_rate': 120.5,
        'foliar_sampling_date': '2026-02-25T00:00:00.000',
        'herbicide_name': 'Glyphosate',
        'weed_application_date': '2026-02-18T00:00:00.000',
        'weed_application_rate': 2.5,
        'pest_remarks': 'No pest pressure',
        'disease_remarks': 'No disease pressure',
      });

      expect(record['id'], 114);
      expect(record['field_id'], 'CP trial B');
      expect(record['geom_polygon'], sampleGeometry);
      expect(record['tam_mm'], '102');
      expect(record['soil_ph'], 6.2);
      expect(record['field_remarks'], 'Healthy stand');
      expect(record['previous_cutting'], '2026-02-11T00:00:00.000');
      expect(record['residue_management_method'], 'Mulching');
      expect(record['residual_management_remarks'], 'Retained in field');
      expect(record['fertilizer_type'], 'Urea');
      expect(record['nutrient_application_date'], '2026-02-20T00:00:00.000');
      expect(record['weed_application_date'], '2026-02-18T00:00:00.000');
      expect(record['weed_application_rate'], 2.5);
      expect(record['harvest_date'], '2026-03-20T00:00:00.000');
      expect(record['harvest_yield'], 96.4);
      expect(record['quality_remarks'], 'Clean cane');
      expect(record.containsKey('field_name'), isFalse);
      expect(record.containsKey('polygon'), isFalse);
      expect(record.containsKey('tam'), isFalse);
      expect(record.containsKey('yield'), isFalse);

      const allowedColumns = {
        'id',
        'field_id',
        'block_id',
        'area',
        'irrigation_type',
        'water_source',
        'tam_mm',
        'soil_type',
        'soil_ph',
        'field_remarks',
        'geom_polygon',
        'trial_number',
        'trial_name',
        'contact_person',
        'date_recorded',
        'crop_type',
        'crop_class',
        'planting_date',
        'previous_cutting',
        'expected_harvest_date',
        'residue_type',
        'residue_management_method',
        'residual_management_remarks',
        'fertilizer_type',
        'nutrient_application_date',
        'application_rate',
        'fertilizer_applications',
        'foliar_sampling_date',
        'herbicide_name',
        'weed_application_date',
        'weed_application_rate',
        'herbicide_applications',
        'pest_remarks',
        'disease_remarks',
        'harvest_date',
        'harvest_yield',
        'quality_remarks',
        'well_known_text',
        'created_at',
        'updated_at',
      };

      expect(record.keys.every(allowedColumns.contains), isTrue);
    },
  );

  test(
    'repeated fertilizer and herbicide applications keep the latest entry as current',
    () {
      final normalized = normalizeObservationPayload({
        'field_id': 'CP trial loops',
        'block_id': 'Centre Pivot',
        'nutrient_management': {
          'applications': [
            {
              'fertilizer_type': 'Compound D',
              'application_date': '2026-01-12T00:00:00.000',
              'application_rate': '250',
            },
            {
              'fertilizer_type': 'Urea',
              'application_date': '2026-02-18T00:00:00.000',
              'application_rate': 120.5,
              'foliar_sampling_date': '2026-02-25T00:00:00.000',
            },
          ],
        },
        'weed_management': {
          'applications': [
            {
              'herbicide_name': 'Atrazine',
              'application_date': '2026-01-10T00:00:00.000',
              'application_rate': 2.0,
            },
            {
              'herbicide_name': 'Glyphosate',
              'application_date': '2026-03-01T00:00:00.000',
              'application_rate': '2.5',
            },
          ],
        },
      });

      expect(
        (normalized['nutrient_management']['applications'] as List).length,
        2,
      );
      expect(normalized['nutrient_management']['fertilizer_type'], 'Urea');
      expect(
        normalized['nutrient_management']['application_date'],
        '2026-02-18T00:00:00.000',
      );
      expect(normalized['nutrient_management']['application_rate'], 120.5);
      expect(
        normalized['nutrient_management']['foliar_sampling_date'],
        '2026-02-25T00:00:00.000',
      );
      expect((normalized['weed_management']['applications'] as List).length, 2);
      expect(normalized['weed_management']['herbicide_name'], 'Glyphosate');
      expect(
        normalized['weed_management']['application_date'],
        '2026-03-01T00:00:00.000',
      );
      expect(normalized['weed_management']['application_rate'], 2.5);
    },
  );

  test(
    'current schema rows round-trip repeated fertilizer and herbicide applications',
    () {
      final payload = normalizeObservationPayload({
        'field_id': 'CP trial loops',
        'block_id': 'Centre Pivot',
        'fertilizer_applications': [
          {
            'fertilizer_type': 'Compound D',
            'application_date': '2026-01-12T00:00:00.000',
            'application_rate': '250',
          },
          {
            'fertilizer_type': 'Urea',
            'application_date': '2026-02-18T00:00:00.000',
            'application_rate': 120.5,
            'foliar_sampling_date': '2026-02-25T00:00:00.000',
          },
        ],
        'herbicide_applications': [
          {
            'herbicide_name': 'Atrazine',
            'application_date': '2026-01-10T00:00:00.000',
            'application_rate': 2.0,
          },
          {
            'herbicide_name': 'Glyphosate',
            'application_date': '2026-03-01T00:00:00.000',
            'application_rate': '2.5',
          },
        ],
      });

      final record = buildModernSugarcaneMonitoringRecord(payload);
      expect((record['fertilizer_applications'] as List).length, 2);
      expect((record['herbicide_applications'] as List).length, 2);
      expect(record['fertilizer_type'], 'Urea');
      expect(record['herbicide_name'], 'Glyphosate');

      final rebuiltPayload = buildObservationPayloadFromSugarcaneMonitoringRow(
        record,
      );
      expect(
        (rebuiltPayload['nutrient_management']['applications'] as List).length,
        2,
      );
      expect(
        (rebuiltPayload['weed_management']['applications'] as List).length,
        2,
      );
      expect(rebuiltPayload['nutrient_management']['fertilizer_type'], 'Urea');
      expect(rebuiltPayload['weed_management']['herbicide_name'], 'Glyphosate');
    },
  );

  test(
    'buildObservationPayloadFromSugarcaneMonitoringRow reads the current schema columns',
    () {
      final row = {
        'id': 211,
        'field_id': 'CP trial B',
        'block_id': 'Centre Pivot',
        'area': 1.614,
        'geom_polygon': sampleGeometry,
        'irrigation_type': 'Centre Pivot',
        'water_source': 'Dam 1',
        'tam_mm': '102',
        'soil_type': 'SaL',
        'soil_ph': 6.2,
        'field_remarks': 'Healthy stand',
        'date_recorded': '2026-03-21T14:30:28.722581',
        'trial_number': 'TR-21',
        'trial_name': 'Bulk Plant',
        'contact_person': 'Dr L. T. Mpofu',
        'crop_type': 'Sugarcane',
        'crop_class': 'Plant Cane',
        'planting_date': '2026-01-10T00:00:00.000',
        'previous_cutting': '2026-02-11T00:00:00.000',
        'expected_harvest_date': '2026-11-01T00:00:00.000',
        'residue_type': 'Trash',
        'residue_management_method': 'Mulching',
        'residual_management_remarks': 'Retained in field',
        'fertilizer_type': 'Urea',
        'nutrient_application_date': '2026-02-20T00:00:00.000',
        'application_rate': 120.5,
        'foliar_sampling_date': '2026-02-25T00:00:00.000',
        'herbicide_name': 'Glyphosate',
        'weed_application_date': '2026-02-18T00:00:00.000',
        'weed_application_rate': 2.5,
        'pest_remarks': 'No pest pressure',
        'disease_remarks': 'No disease pressure',
        'harvest_date': '2026-03-20T00:00:00.000',
        'harvest_yield': 96.4,
        'quality_remarks': 'Clean cane',
        'created_at': '2026-03-21T15:00:00.000',
      };

      final payload = buildObservationPayloadFromSugarcaneMonitoringRow(row);

      expect(payload['field_identification']['monitoring_row_id'], 211);
      expect(payload['field_identification']['field_id'], 'CP trial B');
      expect(payload['field_identification']['field_name'], 'CP trial B');
      expect(payload['field_identification']['tam_mm'], '102');
      expect(payload['soil_characteristics']['soil_ph'], 6.2);
      expect(payload['crop_monitoring']['remarks'], 'Healthy stand');
      expect(
        payload['crop_information']['previous_cutting_date'],
        '2026-02-11T00:00:00.000',
      );
      expect(
        payload['harvest_information']['harvest_date'],
        '2026-03-20T00:00:00.000',
      );
      expect(payload['harvest_information']['yield'], 96.4);
      expect(
        payload['harvest_information']['cane_quality_remarks'],
        'Clean cane',
      );
      expect(payload['residual_management']['management_method'], 'Mulching');
      expect(payload['residual_management']['remarks'], 'Retained in field');
      expect(payload['nutrient_management']['fertilizer_type'], 'Urea');
      expect(
        payload['nutrient_management']['application_date'],
        '2026-02-20T00:00:00.000',
      );
      expect(
        payload['weed_management']['application_date'],
        '2026-02-18T00:00:00.000',
      );
      expect(payload['weed_management']['application_rate'], 2.5);
      expect(payload['geometry'], sampleGeometry);
    },
  );

  test(
    'buildSugarcaneMonitoringFingerprint matches payload rebuilt from the same row',
    () {
      final row = {
        'id': 111,
        'field_name': 'Sable J4',
        'block_id': 'Sable',
        'area': 14.75,
        'polygon': sampleGeometry,
        'irrigation_type': 'Drip',
        'water_source': 'Canal',
        'tam': 32.0,
        'soil_type': 'Loam',
        'ph': 6.4,
        'remarks': 'Healthy stand',
        'date_recorded': '2026-03-21T09:00:00.000',
        'trial_number': 'Z3-216041',
        'trial_name': 'A.V. T',
        'contact_person': 'Dr L. T. Mpofu',
        'crop_type': 'Sugarcane',
        'crop_class': 'Plant Cane',
        'planting_date': '2025-10-01T00:00:00.000',
        'previous_cutting_date': '2026-02-01T00:00:00.000',
        'expected_harvest_date': '2026-09-01T00:00:00.000',
        'actual_cutting_date': '2026-03-21T00:00:00.000',
        'yield': 96.4,
        'cane_quality_remarks': 'Clean cane',
        'residue_type': 'Trash',
        'management_method': 'Mulching',
        'residue_remarks': 'Residue retained',
        'fertiliser_type': 'Urea',
        'application_date': '2026-02-20T00:00:00.000',
        'application_rate': 120.5,
        'foliar_sampling_date': '2026-02-25T00:00:00.000',
        'herbicide_name': 'Glyphosate',
        'herbicide_application_date': '2026-02-18T00:00:00.000',
        'herbicide_application_rate': 2.5,
        'pest_remarks': 'No pest pressure',
        'disease_remarks': 'No disease pressure',
        'created_at': '2026-03-21T09:05:00.000',
      };

      final payload = buildObservationPayloadFromSugarcaneMonitoringRow(row);

      expect(
        buildSugarcaneMonitoringFingerprint(row),
        buildObservationFingerprint(payload),
      );
    },
  );

  test(
    'legacy sugarcane monitoring rows keep the same row id when rebuilt for save',
    () {
      final row = {
        'id': 327,
        'field_name': 'CP trial A',
        'block_id': 'Centre Pivot',
        'polygon': sampleGeometry,
        'area': 1.32,
        'irrigation_type': 'Center Pivot',
        'water_source': 'Dam 1',
        'tam': 102,
        'soil_type': 'SaCL',
        'ph': 6.07,
        'date_recorded': '2026-03-25',
        'crop_type': 'Fallow Period',
        'crop_class': 'None',
        'residue_type': 'None',
        'management_method': 'None',
        'application_rate': 0.0,
        'created_at': '2026-03-25T18:17:21.836931',
      };

      final payload = buildObservationPayloadFromSugarcaneMonitoringRow(row);
      final rebuiltRecord = buildSugarcaneMonitoringRecord(payload);

      expect(payload['field_identification']['monitoring_row_id'], row['id']);
      expect(rebuiltRecord['id'], row['id']);
      expect(rebuiltRecord['field_name'], row['field_name']);
      expect(rebuiltRecord['date_recorded'], row['date_recorded']);
    },
  );

  test(
    'selectMonitoringRowIdForUpsert prefers the latest matching database row',
    () {
      final selectedId = selectMonitoringRowIdForUpsert([
        {
          'id': 327,
          'field_name': 'CP trial A',
          'block_id': 'Centre Pivot',
          'created_at': '2026-03-25T00:00:00.000',
        },
        {
          'id': 433,
          'field_name': 'CP trial A',
          'block_id': 'Centre Pivot',
          'date_recorded': '2026-03-25',
          'created_at': '2026-03-25T18:17:21.836931',
          'client_uuid': 'offline-433',
        },
      ]);

      expect(selectedId, 433);
    },
  );

  test(
    'selectMonitoringRowIdForUpsert prefers a client uuid match when available',
    () {
      final selectedId = selectMonitoringRowIdForUpsert([
        {
          'id': 327,
          'field_name': 'CP trial A',
          'block_id': 'Centre Pivot',
          'created_at': '2026-03-25T00:00:00.000',
        },
        {
          'id': 433,
          'field_name': 'CP trial A',
          'block_id': 'Centre Pivot',
          'created_at': '2026-03-25T18:17:21.836931',
          'client_uuid': 'offline-433',
        },
      ], preferredClientUuid: 'offline-433');

      expect(selectedId, 433);
    },
  );

  test(
    'buildSugarcaneMonitoringFingerprint ignores form-only changes but changes for stored row updates',
    () {
      final basePayload = {
        'field_id': 'Sable J4',
        'block_id': 'Sable',
        'date_recorded': '2026-03-21T09:00:00.000',
        'trial_name': 'A.V. T',
        'contact_person': 'Dr L. T. Mpofu',
        'crop_type': 'Sugarcane',
        'crop_class': 'Plant Cane',
        'soil_type': 'Loam',
        'field_remarks': 'Healthy stand',
      };

      final sameRowFingerprint = buildSugarcaneMonitoringFingerprint(
        buildSugarcaneMonitoringRecord({
          ...basePayload,
          'phone_number': '779999999',
          'comments_remarks': 'Changed local-only note',
        }),
      );

      final baseRowFingerprint = buildSugarcaneMonitoringFingerprint(
        buildSugarcaneMonitoringRecord(basePayload),
      );

      final changedStoredRowFingerprint = buildSugarcaneMonitoringFingerprint(
        buildSugarcaneMonitoringRecord({
          ...basePayload,
          'contact_person': 'Updated Agronomist',
        }),
      );

      expect(baseRowFingerprint, sameRowFingerprint);
      expect(baseRowFingerprint, isNot(changedStoredRowFingerprint));
    },
  );
}
