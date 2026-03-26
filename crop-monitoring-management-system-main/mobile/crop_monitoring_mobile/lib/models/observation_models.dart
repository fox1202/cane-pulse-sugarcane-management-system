import 'dart:convert';

Map<String, dynamic> normalizeObservationPayload(Map<String, dynamic> source) {
  final payload = Map<String, dynamic>.from(source);

  final fieldIdentification = _mapFrom(payload['field_identification']);
  final cropInformation = _mapFrom(payload['crop_information']);
  final cropMonitoring = _mapFrom(payload['crop_monitoring']);
  final imageReference = _mapFrom(payload['image_reference']);
  final soilCharacteristics = _mapFrom(payload['soil_characteristics']);
  final irrigationManagement = _mapFrom(payload['irrigation_management']);
  final nutrientManagement = _mapFrom(payload['nutrient_management']);
  final weedManagement = _mapFrom(payload['weed_management']);
  final cropProtection = _mapFrom(payload['crop_protection']);
  final controlMethods = _mapFrom(payload['control_methods']);
  final harvestInformation = _mapFrom(payload['harvest_information']);
  final residualManagement = _mapFrom(payload['residual_management']);

  final generalRemarks = _firstPresent([
    cropMonitoring['remarks'],
    residualManagement['remarks'],
    payload['field_remarks'],
    payload['remarks'],
  ]);
  final contactPerson = _firstPresent([
    fieldIdentification['contact_person_scientist'],
    fieldIdentification['contact_person'],
    payload['contact_person_scientist'],
    payload['contact_person'],
  ]);
  final trialNumber = _stringOrNull(
    _firstPresent([
      fieldIdentification['trial_number'],
      payload['trial_number'],
    ]),
  );
  final trialName = _stringOrNull(
    _firstPresent([fieldIdentification['trial_name'], payload['trial_name']]),
  );
  final fieldId = _stringOrNull(
    _firstPresent([fieldIdentification['field_id'], payload['field_id']]),
  );
  final monitoringRowId = _toIntOrNull(
    _firstPresent([
      fieldIdentification['monitoring_row_id'],
      payload['monitoring_row_id'],
      payload['id'],
    ]),
  );
  final cropClass = _stringOrNull(
    _firstPresent([cropInformation['crop_class'], payload['crop_class']]),
  );
  final observationTamMm = _stringOrNull(
    _firstPresent([
      fieldIdentification['tam_mm'],
      fieldIdentification['time'],
      fieldIdentification['tamm_area'],
      payload['tam_mm'],
      payload['time'],
      payload['tamm_area'],
    ]),
  );
  final area = _toDoubleOrNull(
    _firstPresent([
      fieldIdentification['area'],
      payload['area'],
      payload['block_size'],
    ]),
  );
  final blockSize = _toDoubleOrNull(
    _firstPresent([payload['block_size'], area]),
  );
  final cropInformationYield = _toDoubleOrNull(
    _firstPresent([
      cropInformation['yield'],
      payload['crop_information_yield'],
      payload['crop_yield'],
    ]),
  );
  final yieldAmount = _toDoubleOrNull(
    _firstPresent([
      harvestInformation['yield'],
      payload['harvest_yield'],
      payload['yield'],
    ]),
  );
  final geometry = _firstPresent([
    payload['geom_polygon'],
    payload['spatial_data'],
    payload['geometry'],
    payload['geom'],
    fieldIdentification['geom_polygon'],
    fieldIdentification['geometry'],
  ]);
  final recordedDate = _stringOrNull(
    _firstPresent([
      fieldIdentification['date_recorded'],
      payload['date_recorded'],
      payload['location_date'],
    ]),
  );
  final plantingDate = _stringOrNull(
    _firstPresent([cropInformation['planting_date'], payload['planting_date']]),
  );
  final expectedHarvestDate = _stringOrNull(
    _firstPresent([
      cropInformation['expected_harvest_date'],
      payload['expected_harvest_date'],
    ]),
  );
  final cuttingDate = _stringOrNull(
    _firstPresent([
      cropInformation['previous_cutting_date'],
      cropInformation['cutting_date'],
      payload['previous_cutting'],
      payload['previous_cutting_date'],
      payload['cutting_date'],
    ]),
  );
  final actualCuttingDate = _stringOrNull(
    _firstPresent([
      cropInformation['actual_cutting_date'],
      payload['actual_cutting_date'],
    ]),
  );
  final irrigationDate = _stringOrNull(
    _firstPresent([
      irrigationManagement['irrigation_date'],
      payload['irrigation_date'],
    ]),
  );
  final nutrientApplicationDate = _stringOrNull(
    _firstPresent([
      nutrientManagement['application_date'],
      payload['nutrient_application_date'],
      payload['application_date'],
    ]),
  );
  final foliarSamplingDate = _stringOrNull(
    _firstPresent([
      nutrientManagement['foliar_sampling_date'],
      payload['foliar_sampling_date'],
    ]),
  );
  final weedApplicationDate = _stringOrNull(
    _firstPresent([
      weedManagement['application_date'],
      payload['weed_application_date'],
    ]),
  );
  final harvestDate = _stringOrNull(
    _firstPresent([
      harvestInformation['harvest_date'],
      payload['harvest_date'],
    ]),
  );

  final normalized = <String, dynamic>{
    if (payload['id'] != null) 'id': payload['id'],
    'client_uuid':
        _stringOrNull(payload['client_uuid']) ??
        'offline-${DateTime.now().millisecondsSinceEpoch}',
    'field_identification': <String, dynamic>{
      'block_id':
          _stringOrNull(
            _firstPresent([
              fieldIdentification['block_id'],
              payload['block_id'],
            ]),
          ) ??
          '',
      if (fieldId != null) 'field_id': fieldId,
      if (monitoringRowId != null) 'monitoring_row_id': monitoringRowId,
      'field_name':
          _stringOrNull(
            _firstPresent([
              fieldIdentification['field_name'],
              fieldIdentification['field_id'],
              payload['field_name'],
              payload['field_id'],
              payload['selected_field'],
            ]),
          ) ??
          '',
      'latitude': _toDouble(
        _firstPresent([fieldIdentification['latitude'], payload['latitude']]),
      ),
      'longitude': _toDouble(
        _firstPresent([fieldIdentification['longitude'], payload['longitude']]),
      ),
      'gps_accuracy': _toDouble(
        _firstPresent([
          fieldIdentification['gps_accuracy'],
          payload['gps_accuracy'],
        ]),
      ),
      if (recordedDate != null) 'date_recorded': recordedDate,
      if (area != null) 'area': area,
      if (trialNumber != null) 'trial_number': trialNumber,
      if (trialName != null) 'trial_name': trialName,
      if (contactPerson != null) 'contact_person_scientist': contactPerson,
      if (contactPerson != null) 'contact_person': contactPerson,
      if (geometry != null) 'geometry': geometry,
      if (observationTamMm != null) 'tam_mm': observationTamMm,
    },
    'crop_information': <String, dynamic>{
      'crop_type':
          _stringOrNull(
            _firstPresent([cropInformation['crop_type'], payload['crop_type']]),
          ) ??
          'Sugarcane',
      'ratoon_number': _toInt(
        _firstPresent([
          cropInformation['ratoon_number'],
          payload['ratoon_number'],
        ]),
      ),
      'variety':
          _stringOrNull(
            _firstPresent([cropInformation['variety'], payload['variety']]),
          ) ??
          '',
      if (plantingDate != null) 'planting_date': plantingDate,
      if (expectedHarvestDate != null)
        'expected_harvest_date': expectedHarvestDate,
      'crop_stage':
          _stringOrNull(
            _firstPresent([
              cropInformation['crop_stage'],
              payload['crop_stage'],
            ]),
          ) ??
          'Plant',
      if (cropClass != null) 'crop_class': cropClass,
      if (cuttingDate != null) 'cutting_date': cuttingDate,
      if (cuttingDate != null) 'previous_cutting_date': cuttingDate,
      if (actualCuttingDate != null) 'actual_cutting_date': actualCuttingDate,
      if (cropInformationYield != null) 'yield': cropInformationYield,
    },
    'crop_monitoring': <String, dynamic>{
      'crop_vigor':
          _stringOrNull(
            _firstPresent([
              cropMonitoring['crop_vigor'],
              cropMonitoring['vigor'],
              payload['crop_vigor'],
              payload['vigor'],
            ]),
          ) ??
          'Good',
      'canopy_cover': _toDouble(
        _firstPresent([
          cropMonitoring['canopy_cover'],
          cropMonitoring['canopy_cover_percentage'],
          payload['canopy_cover'],
          payload['canopy_cover_percentage'],
        ]),
      ),
      'stress':
          _stringOrNull(
            _firstPresent([
              cropMonitoring['stress'],
              cropMonitoring['stress_type'],
              payload['stress'],
              payload['stress_type'],
            ]),
          ) ??
          'None',
      'remarks': generalRemarks ?? '',
    },
    'image_reference': _normalizeImageReference(payload, imageReference),
    'soil_characteristics': <String, dynamic>{
      'soil_type':
          _stringOrNull(
            _firstPresent([
              soilCharacteristics['soil_type'],
              payload['soil_type'],
            ]),
          ) ??
          '',
      'soil_texture':
          _stringOrNull(
            _firstPresent([
              soilCharacteristics['soil_texture'],
              payload['soil_texture'],
            ]),
          ) ??
          '',
      'soil_ph': _toDouble(
        _firstPresent([
          soilCharacteristics['soil_ph'],
          soilCharacteristics['ph'],
          payload['soil_ph'],
          payload['pH'],
          payload['ph'],
        ]),
        fallback: 7.0,
      ),
      'organic_matter': _toDouble(
        _firstPresent([
          soilCharacteristics['organic_matter'],
          soilCharacteristics['organic_matter_content'],
          payload['organic_matter'],
          payload['organic_matter_content'],
        ]),
      ),
      'drainage_class':
          _stringOrNull(
            _firstPresent([
              soilCharacteristics['drainage_class'],
              payload['drainage_class'],
            ]),
          ) ??
          '',
    },
    'irrigation_management': <String, dynamic>{
      'irrigation_type':
          _stringOrNull(
            _firstPresent([
              irrigationManagement['irrigation_type'],
              payload['irrigation_type'],
            ]),
          ) ??
          '',
      if (irrigationDate != null) 'irrigation_date': irrigationDate,
      'irrigation_volume': _toDouble(
        _firstPresent([
          irrigationManagement['irrigation_volume'],
          payload['irrigation_volume'],
        ]),
      ),
      'soil_moisture_percentage': _toDouble(
        _firstPresent([
          irrigationManagement['soil_moisture_percentage'],
          irrigationManagement['soil_moisture'],
          payload['soil_moisture_percentage'],
          payload['soil_moisture'],
        ]),
      ),
      'water_source':
          _stringOrNull(
            _firstPresent([
              irrigationManagement['water_source'],
              irrigationManagement['water_source_type'],
              payload['water_source'],
              payload['water_source_type'],
            ]),
          ) ??
          '',
    },
    'nutrient_management': <String, dynamic>{
      'fertilizer_type':
          _stringOrNull(
            _firstPresent([
              nutrientManagement['fertilizer_type'],
              payload['fertilizer_type'],
            ]),
          ) ??
          '',
      if (nutrientApplicationDate != null)
        'application_date': nutrientApplicationDate,
      'application_rate': _toDouble(
        _firstPresent([
          nutrientManagement['application_rate'],
          payload['application_rate'],
        ]),
      ),
      if (foliarSamplingDate != null)
        'foliar_sampling_date': foliarSamplingDate,
      'npk_ratio':
          _stringOrNull(
            _firstPresent([
              nutrientManagement['npk_ratio'],
              nutrientManagement['macronutrient_npk'],
              payload['npk_ratio'],
              payload['macronutrient_npk'],
            ]),
          ) ??
          '',
    },
    'weed_management': <String, dynamic>{
      'herbicide_name':
          _stringOrNull(
            _firstPresent([
              weedManagement['herbicide_name'],
              payload['herbicide_name'],
            ]),
          ) ??
          '',
      if (weedApplicationDate != null) 'application_date': weedApplicationDate,
      if (_firstPresent([
            weedManagement['application_rate'],
            payload['weed_application_rate'],
          ]) !=
          null)
        'application_rate': _toDouble(
          _firstPresent([
            weedManagement['application_rate'],
            payload['weed_application_rate'],
          ]),
        ),
    },
    'crop_protection': <String, dynamic>{
      'weed_type':
          _stringOrNull(
            _firstPresent([cropProtection['weed_type'], payload['weed_type']]),
          ) ??
          '',
      'weed_level':
          _stringOrNull(
            _firstPresent([
              cropProtection['weed_level'],
              cropProtection['weed_pressure'],
              payload['weed_level'],
              payload['weed_pressure'],
            ]),
          ) ??
          'Low',
      'pest_type':
          _stringOrNull(
            _firstPresent([cropProtection['pest_type'], payload['pest_type']]),
          ) ??
          '',
      'pest_severity':
          _stringOrNull(
            _firstPresent([
              cropProtection['pest_severity'],
              payload['pest_severity'],
            ]),
          ) ??
          'Low',
      'disease_type':
          _stringOrNull(
            _firstPresent([
              cropProtection['disease_type'],
              payload['disease_type'],
            ]),
          ) ??
          '',
      'disease_severity':
          _stringOrNull(
            _firstPresent([
              cropProtection['disease_severity'],
              payload['disease_severity'],
            ]),
          ) ??
          'Low',
      'remarks':
          _stringOrNull(
            _firstPresent([
              cropProtection['remarks'],
              payload['crop_protection_remarks'],
            ]),
          ) ??
          '',
      'pest_remarks':
          _stringOrNull(
            _firstPresent([
              cropProtection['pest_remarks'],
              payload['pest_remarks'],
              controlMethods['pest_control'],
              payload['pest_control'],
            ]),
          ) ??
          '',
      'disease_remarks':
          _stringOrNull(
            _firstPresent([
              cropProtection['disease_remarks'],
              payload['disease_remarks'],
              controlMethods['disease_control'],
              payload['disease_control'],
            ]),
          ) ??
          '',
    },
    'control_methods': <String, dynamic>{
      'weed_control':
          _stringOrNull(
            _firstPresent([
              controlMethods['weed_control'],
              payload['weed_control'],
            ]),
          ) ??
          '',
      'pest_control':
          _stringOrNull(
            _firstPresent([
              controlMethods['pest_control'],
              payload['pest_control'],
            ]),
          ) ??
          '',
      'disease_control':
          _stringOrNull(
            _firstPresent([
              controlMethods['disease_control'],
              payload['disease_control'],
            ]),
          ) ??
          '',
    },
    'harvest_information': <String, dynamic>{
      if (harvestDate != null) 'harvest_date': harvestDate,
      if (yieldAmount != null) 'yield': yieldAmount,
      'harvest_method':
          _stringOrNull(
            _firstPresent([
              harvestInformation['harvest_method'],
              payload['harvest_method'],
            ]),
          ) ??
          'Manual',
      if (_firstPresent([
            harvestInformation['cane_quality_remarks'],
            payload['quality_remarks'],
            payload['cane_quality_remarks'],
          ]) !=
          null)
        'cane_quality_remarks':
            _stringOrNull(
              _firstPresent([
                harvestInformation['cane_quality_remarks'],
                payload['quality_remarks'],
                payload['cane_quality_remarks'],
              ]),
            ) ??
            '',
    },
    'residual_management': <String, dynamic>{
      'residue_type':
          _stringOrNull(
            _firstPresent([
              residualManagement['residue_type'],
              payload['residue_type'],
            ]),
          ) ??
          'None',
      'management_method':
          _stringOrNull(
            _firstPresent([
              residualManagement['management_method'],
              payload['residue_management_method'],
              payload['management_method'],
            ]),
          ) ??
          'N/A',
      'remarks':
          _stringOrNull(
            _firstPresent([
              residualManagement['remarks'],
              payload['residual_management_remarks'],
              payload['residual_outcome'],
              payload['remarks'],
            ]),
          ) ??
          '',
    },
    'created_at':
        _stringOrNull(payload['created_at']) ??
        DateTime.now().toIso8601String(),
  };

  if (geometry != null) {
    normalized['spatial_data'] = geometry;
    normalized['geometry'] = geometry;
  }
  if (blockSize != null) {
    normalized['block_size'] = blockSize;
  }
  normalized['record_fingerprint'] =
      _stringOrNull(payload['record_fingerprint']) ??
      _observationFingerprintFromNormalized(normalized);

  return normalized;
}

String buildObservationFingerprint(Map<String, dynamic> source) {
  final normalized = normalizeObservationPayload(source);
  return _observationFingerprintFromNormalized(normalized);
}

Map<String, dynamic> buildSugarcaneMonitoringRecord(
  Map<String, dynamic> source,
) {
  final payload = normalizeObservationPayload(source);
  final fieldIdentification = _mapFrom(payload['field_identification']);
  final cropInformation = _mapFrom(payload['crop_information']);
  final cropMonitoring = _mapFrom(payload['crop_monitoring']);
  final cropProtection = _mapFrom(payload['crop_protection']);
  final soilCharacteristics = _mapFrom(payload['soil_characteristics']);
  final irrigationManagement = _mapFrom(payload['irrigation_management']);
  final nutrientManagement = _mapFrom(payload['nutrient_management']);
  final weedManagement = _mapFrom(payload['weed_management']);
  final harvestInformation = _mapFrom(payload['harvest_information']);
  final residualManagement = _mapFrom(payload['residual_management']);
  final monitoringRowId = _toIntOrNull(
    fieldIdentification['monitoring_row_id'],
  );
  final polygon = _firstPresent([
    payload['geometry'],
    payload['spatial_data'],
    payload['geom_polygon'],
    payload['geom'],
    fieldIdentification['geometry'],
    fieldIdentification['geom_polygon'],
  ]);
  final record = <String, dynamic>{
    if (monitoringRowId != null) 'id': monitoringRowId,
    'block_id': _stringOrNull(fieldIdentification['block_id']),
    'field_name':
        _stringOrNull(fieldIdentification['field_id']) ??
        _stringOrNull(fieldIdentification['field_name']),
    'polygon': polygon,
    'area': _toDoubleOrNull(
      _firstPresent([
        fieldIdentification['area'],
        payload['area'],
        payload['block_size'],
      ]),
    ),
    'irrigation_type': _stringOrNull(irrigationManagement['irrigation_type']),
    'water_source': _stringOrNull(irrigationManagement['water_source']),
    'tam': _toDoubleOrNull(
      _firstPresent([
        fieldIdentification['tam_mm'],
        fieldIdentification['time'],
        payload['tam_mm'],
        payload['time'],
      ]),
    ),
    'soil_type': _stringOrNull(soilCharacteristics['soil_type']),
    'ph': _toDoubleOrNull(
      _firstPresent([
        soilCharacteristics['soil_ph'],
        soilCharacteristics['ph'],
        payload['soil_ph'],
        payload['pH'],
        payload['ph'],
      ]),
    ),
    'remarks':
        _stringOrNull(cropMonitoring['remarks']) ??
        _stringOrNull(payload['field_remarks']) ??
        _stringOrNull(payload['remarks']),
    'date_recorded': _stringOrNull(fieldIdentification['date_recorded']),
    'trial_number': _stringOrNull(fieldIdentification['trial_number']),
    'trial_name': _stringOrNull(fieldIdentification['trial_name']),
    'contact_person':
        _stringOrNull(fieldIdentification['contact_person']) ??
        _stringOrNull(fieldIdentification['contact_person_scientist']),
    'crop_type': _stringOrNull(cropInformation['crop_type']),
    'crop_class': _stringOrNull(cropInformation['crop_class']),
    'planting_date': _stringOrNull(cropInformation['planting_date']),
    'previous_cutting_date':
        _stringOrNull(cropInformation['previous_cutting_date']) ??
        _stringOrNull(cropInformation['cutting_date']),
    'expected_harvest_date': _stringOrNull(
      cropInformation['expected_harvest_date'],
    ),
    'actual_cutting_date':
        _stringOrNull(harvestInformation['harvest_date']) ??
        _stringOrNull(cropInformation['actual_cutting_date']) ??
        _stringOrNull(payload['harvest_date']) ??
        _stringOrNull(payload['actual_cutting_date']),
    'yield': _toDoubleOrNull(
      _firstPresent([
        harvestInformation['yield'],
        payload['yield'],
        payload['harvest_yield'],
      ]),
    ),
    'cane_quality_remarks': _stringOrNull(
      harvestInformation['cane_quality_remarks'],
    ),
    'residue_type': _stringOrNull(residualManagement['residue_type']),
    'management_method': _stringOrNull(residualManagement['management_method']),
    'residue_remarks': _stringOrNull(residualManagement['remarks']),
    'fertiliser_type': _stringOrNull(nutrientManagement['fertilizer_type']),
    'application_date': _stringOrNull(nutrientManagement['application_date']),
    'application_rate': _toDoubleOrNull(nutrientManagement['application_rate']),
    'foliar_sampling_date': _stringOrNull(
      nutrientManagement['foliar_sampling_date'],
    ),
    'herbicide_name': _stringOrNull(weedManagement['herbicide_name']),
    'herbicide_application_date': _stringOrNull(
      weedManagement['application_date'],
    ),
    'herbicide_application_rate': _toDoubleOrNull(
      weedManagement['application_rate'],
    ),
    'pest_remarks': _stringOrNull(cropProtection['pest_remarks']),
    'disease_remarks': _stringOrNull(cropProtection['disease_remarks']),
    'created_at': _stringOrNull(payload['created_at']),
  };

  record.removeWhere((key, value) => value == null);
  return record;
}

Map<String, dynamic> buildModernSugarcaneMonitoringRecord(
  Map<String, dynamic> source,
) {
  final payload = normalizeObservationPayload(source);
  final fieldIdentification = _mapFrom(payload['field_identification']);
  final cropInformation = _mapFrom(payload['crop_information']);
  final cropMonitoring = _mapFrom(payload['crop_monitoring']);
  final cropProtection = _mapFrom(payload['crop_protection']);
  final soilCharacteristics = _mapFrom(payload['soil_characteristics']);
  final irrigationManagement = _mapFrom(payload['irrigation_management']);
  final nutrientManagement = _mapFrom(payload['nutrient_management']);
  final weedManagement = _mapFrom(payload['weed_management']);
  final harvestInformation = _mapFrom(payload['harvest_information']);
  final residualManagement = _mapFrom(payload['residual_management']);
  final monitoringRowId = _toIntOrNull(
    _firstPresent([
      fieldIdentification['monitoring_row_id'],
      payload['monitoring_row_id'],
      payload['id'],
    ]),
  );
  final geometry = _firstPresent([
    payload['geom_polygon'],
    payload['spatial_data'],
    payload['geometry'],
    payload['geom'],
    fieldIdentification['geometry'],
    fieldIdentification['geom_polygon'],
  ]);
  final record = <String, dynamic>{
    if (monitoringRowId != null) 'id': monitoringRowId,
    'field_id':
        _stringOrNull(fieldIdentification['field_id']) ??
        _stringOrNull(fieldIdentification['field_name']),
    'block_id': _stringOrNull(fieldIdentification['block_id']),
    'area': _toDoubleOrNull(
      _firstPresent([
        fieldIdentification['area'],
        payload['area'],
        payload['block_size'],
      ]),
    ),
    'irrigation_type': _stringOrNull(irrigationManagement['irrigation_type']),
    'water_source': _stringOrNull(irrigationManagement['water_source']),
    'tam_mm': _stringOrNull(
      _firstPresent([
        fieldIdentification['tam_mm'],
        fieldIdentification['time'],
        payload['tam_mm'],
        payload['time'],
      ]),
    ),
    'soil_type': _stringOrNull(soilCharacteristics['soil_type']),
    'soil_ph': _toDoubleOrNull(
      _firstPresent([
        soilCharacteristics['soil_ph'],
        soilCharacteristics['ph'],
        payload['soil_ph'],
        payload['pH'],
        payload['ph'],
      ]),
    ),
    'field_remarks':
        _stringOrNull(cropMonitoring['remarks']) ??
        _stringOrNull(payload['field_remarks']) ??
        _stringOrNull(payload['remarks']),
    'geom_polygon': geometry,
    'trial_number': _stringOrNull(fieldIdentification['trial_number']),
    'trial_name': _stringOrNull(fieldIdentification['trial_name']),
    'contact_person':
        _stringOrNull(fieldIdentification['contact_person']) ??
        _stringOrNull(fieldIdentification['contact_person_scientist']),
    'date_recorded': _stringOrNull(fieldIdentification['date_recorded']),
    'crop_type': _stringOrNull(cropInformation['crop_type']),
    'crop_class': _stringOrNull(cropInformation['crop_class']),
    'planting_date': _stringOrNull(cropInformation['planting_date']),
    'previous_cutting':
        _stringOrNull(cropInformation['previous_cutting_date']) ??
        _stringOrNull(cropInformation['cutting_date']),
    'expected_harvest_date': _stringOrNull(
      cropInformation['expected_harvest_date'],
    ),
    'residue_type': _stringOrNull(residualManagement['residue_type']),
    'residue_management_method': _stringOrNull(
      residualManagement['management_method'],
    ),
    'residual_management_remarks': _stringOrNull(residualManagement['remarks']),
    'fertilizer_type': _stringOrNull(nutrientManagement['fertilizer_type']),
    'nutrient_application_date': _stringOrNull(
      nutrientManagement['application_date'],
    ),
    'application_rate': _toDoubleOrNull(nutrientManagement['application_rate']),
    'foliar_sampling_date': _stringOrNull(
      nutrientManagement['foliar_sampling_date'],
    ),
    'herbicide_name': _stringOrNull(weedManagement['herbicide_name']),
    'weed_application_date': _stringOrNull(weedManagement['application_date']),
    'weed_application_rate': _toDoubleOrNull(
      weedManagement['application_rate'],
    ),
    'pest_remarks': _stringOrNull(cropProtection['pest_remarks']),
    'disease_remarks': _stringOrNull(cropProtection['disease_remarks']),
    'harvest_date':
        _stringOrNull(harvestInformation['harvest_date']) ??
        _stringOrNull(cropInformation['actual_cutting_date']) ??
        _stringOrNull(payload['harvest_date']) ??
        _stringOrNull(payload['actual_cutting_date']),
    'harvest_yield': _toDoubleOrNull(
      _firstPresent([
        harvestInformation['yield'],
        payload['yield'],
        payload['harvest_yield'],
      ]),
    ),
    'quality_remarks': _stringOrNull(
      harvestInformation['cane_quality_remarks'],
    ),
    'created_at': _stringOrNull(payload['created_at']),
  };

  record.removeWhere((key, value) => value == null);
  return record;
}

Map<String, dynamic> buildObservationPayloadFromSugarcaneMonitoringRow(
  Map<String, dynamic> row,
) {
  final rowId = _toIntOrNull(row['id']);
  final fieldId = _firstPresent([row['field_id'], row['field_name']]);
  final geometry = _firstPresent([
    row['geom_polygon'],
    row['polygon'],
    row['geometry'],
    row['spatial_data'],
  ]);
  final tamMm = _firstPresent([row['tam_mm'], row['tam']]);
  final soilPh = _firstPresent([row['soil_ph'], row['ph']]);
  final fieldRemarks = _firstPresent([row['field_remarks'], row['remarks']]);
  final previousCutting = _firstPresent([
    row['previous_cutting'],
    row['previous_cutting_date'],
  ]);
  final harvestDate = _firstPresent([
    row['harvest_date'],
    row['actual_cutting_date'],
  ]);
  final harvestYield = _firstPresent([row['harvest_yield'], row['yield']]);
  final qualityRemarks = _firstPresent([
    row['quality_remarks'],
    row['cane_quality_remarks'],
  ]);
  final residueManagementMethod = _firstPresent([
    row['residue_management_method'],
    row['management_method'],
  ]);
  final residualManagementRemarks = _firstPresent([
    row['residual_management_remarks'],
    row['residue_remarks'],
  ]);
  final fertilizerType = _firstPresent([
    row['fertilizer_type'],
    row['fertiliser_type'],
  ]);
  final nutrientApplicationDate = _firstPresent([
    row['nutrient_application_date'],
    row['application_date'],
  ]);
  final weedApplicationDate = _firstPresent([
    row['weed_application_date'],
    row['herbicide_application_date'],
  ]);
  final weedApplicationRate = _firstPresent([
    row['weed_application_rate'],
    row['herbicide_application_rate'],
  ]);

  final payload = <String, dynamic>{
    if (rowId != null) 'id': rowId,
    if (rowId != null) 'client_uuid': 'sugarcane-monitoring-$rowId',
    if (rowId != null) 'monitoring_row_id': rowId,
    'field_id': fieldId,
    'field_name': fieldId,
    'block_id': row['block_id'],
    'area': row['area'],
    'geom_polygon': geometry,
    'irrigation_type': row['irrigation_type'],
    'water_source': row['water_source'],
    'tam_mm': tamMm,
    'soil_type': row['soil_type'],
    'pH': soilPh,
    'field_remarks': fieldRemarks,
    'date_recorded': row['date_recorded'],
    'trial_number': row['trial_number'],
    'trial_name': row['trial_name'],
    'contact_person': row['contact_person'],
    'crop_type': row['crop_type'],
    'crop_class': row['crop_class'],
    'planting_date': row['planting_date'],
    'previous_cutting_date': previousCutting,
    'expected_harvest_date': row['expected_harvest_date'],
    'harvest_date': harvestDate,
    'yield': harvestYield,
    'cane_quality_remarks': qualityRemarks,
    'residue_type': row['residue_type'],
    'management_method': residueManagementMethod,
    'residual_management_remarks': residualManagementRemarks,
    'fertilizer_type': fertilizerType,
    'application_date': nutrientApplicationDate,
    'application_rate': row['application_rate'],
    'foliar_sampling_date': row['foliar_sampling_date'],
    'herbicide_name': row['herbicide_name'],
    'weed_application_date': weedApplicationDate,
    'weed_application_rate': weedApplicationRate,
    'pest_remarks': row['pest_remarks'],
    'disease_remarks': row['disease_remarks'],
    'created_at': row['created_at'],
    'field_identification': <String, dynamic>{
      if (rowId != null) 'monitoring_row_id': rowId,
    },
  };

  return normalizeObservationPayload(payload);
}

String buildSugarcaneMonitoringFingerprint(Map<String, dynamic> row) {
  return buildObservationFingerprint(
    buildObservationPayloadFromSugarcaneMonitoringRow(row),
  );
}

String observationDisplayName(
  Map<String, dynamic> source, {
  String fallback = 'Observation',
}) {
  final payload = normalizeObservationPayload(source);
  final fieldIdentification = _mapFrom(payload['field_identification']);
  final candidates = <dynamic>[
    fieldIdentification['field_id'],
    fieldIdentification['field_name'],
    payload['field_id'],
    payload['field_name'],
    fieldIdentification['block_id'],
  ];

  for (final candidate in candidates) {
    final value = _stringOrNull(candidate);
    if (value != null) return value;
  }

  return fallback;
}

String _observationFingerprintFromNormalized(Map<String, dynamic> normalized) {
  final fieldIdentification = _mapFrom(normalized['field_identification']);
  final cropInformation = _mapFrom(normalized['crop_information']);
  final cropMonitoring = _mapFrom(normalized['crop_monitoring']);
  final cropProtection = _mapFrom(normalized['crop_protection']);
  final soilCharacteristics = _mapFrom(normalized['soil_characteristics']);
  final irrigationManagement = _mapFrom(normalized['irrigation_management']);
  final nutrientManagement = _mapFrom(normalized['nutrient_management']);
  final weedManagement = _mapFrom(normalized['weed_management']);
  final controlMethods = _mapFrom(normalized['control_methods']);
  final harvestInformation = _mapFrom(normalized['harvest_information']);
  final residualManagement = _mapFrom(normalized['residual_management']);
  final pieces = <String>[
    'v3',
    _normalizeFingerprintDate(fieldIdentification['date_recorded']),
    _normalizeFingerprintText(fieldIdentification['field_id']),
    _normalizeFingerprintText(fieldIdentification['block_id']),
    _normalizeFingerprintText(fieldIdentification['field_name']),
    _normalizeFingerprintText(fieldIdentification['trial_number']),
    _normalizeFingerprintText(fieldIdentification['trial_name']),
    _normalizeFingerprintText(
      _firstPresent([
        fieldIdentification['contact_person'],
        fieldIdentification['contact_person_scientist'],
      ]),
    ),
    _normalizeFingerprintText(cropInformation['crop_type']),
    _normalizeFingerprintText(cropInformation['crop_class']),
    _normalizeFingerprintText(cropInformation['variety']),
    _normalizeFingerprintDate(cropInformation['planting_date']),
    _normalizeFingerprintDate(cropInformation['previous_cutting_date']),
    _normalizeFingerprintDate(cropInformation['cutting_date']),
    _normalizeFingerprintDate(cropInformation['actual_cutting_date']),
    _normalizeFingerprintDate(cropInformation['expected_harvest_date']),
    _normalizeFingerprintText(cropInformation['yield']),
    _normalizeFingerprintText(irrigationManagement['irrigation_type']),
    _normalizeFingerprintText(irrigationManagement['water_source']),
    _normalizeFingerprintText(
      _firstPresent([
        fieldIdentification['tam_mm'],
        fieldIdentification['time'],
      ]),
    ),
    _normalizeFingerprintDate(harvestInformation['harvest_date']),
    _normalizeFingerprintText(harvestInformation['yield']),
    _normalizeFingerprintText(harvestInformation['cane_quality_remarks']),
    _normalizeFingerprintText(soilCharacteristics['soil_type']),
    _normalizeFingerprintText(soilCharacteristics['soil_ph']),
    _normalizeFingerprintText(residualManagement['residue_type']),
    _normalizeFingerprintText(residualManagement['management_method']),
    _normalizeFingerprintText(residualManagement['remarks']),
    _normalizeFingerprintText(nutrientManagement['fertilizer_type']),
    _normalizeFingerprintDate(nutrientManagement['application_date']),
    _normalizeFingerprintText(nutrientManagement['application_rate']),
    _normalizeFingerprintDate(nutrientManagement['foliar_sampling_date']),
    _normalizeFingerprintText(weedManagement['herbicide_name']),
    _normalizeFingerprintDate(weedManagement['application_date']),
    _normalizeFingerprintText(weedManagement['application_rate']),
    _normalizeFingerprintText(cropProtection['remarks']),
    _normalizeFingerprintText(cropProtection['pest_remarks']),
    _normalizeFingerprintText(cropProtection['disease_remarks']),
    _normalizeFingerprintText(controlMethods['pest_control']),
    _normalizeFingerprintText(controlMethods['disease_control']),
    _normalizeFingerprintText(controlMethods['weed_control']),
    _normalizeFingerprintText(
      _firstPresent([cropMonitoring['remarks'], residualManagement['remarks']]),
    ),
  ];

  return pieces.join('|');
}

Map<String, dynamic> _normalizeImageReference(
  Map<String, dynamic> payload,
  Map<String, dynamic> imageReference,
) {
  final normalized = Map<String, dynamic>.from(imageReference);

  if (normalized['images'] is List) {
    normalized['images'] = List<dynamic>.from(normalized['images']);
  } else if (payload['images'] is List) {
    normalized['images'] = List<dynamic>.from(payload['images']);
  }

  if (normalized['image_urls'] is List) {
    normalized['image_urls'] = List<dynamic>.from(normalized['image_urls']);
  } else if (payload['image_urls'] is List) {
    normalized['image_urls'] = List<dynamic>.from(payload['image_urls']);
  }

  if (normalized.isEmpty) {
    normalized['images'] = <dynamic>[];
  }

  return normalized;
}

Map<String, dynamic> _mapFrom(dynamic value) {
  if (value is Map<String, dynamic>) {
    return Map<String, dynamic>.from(value);
  }
  if (value is Map) {
    return Map<String, dynamic>.from(value);
  }
  return <String, dynamic>{};
}

dynamic _firstPresent(Iterable<dynamic> values) {
  for (final value in values) {
    if (value == null) continue;
    if (value is String && value.trim().isEmpty) continue;
    return value;
  }
  return null;
}

String? _stringOrNull(dynamic value) {
  if (value == null) return null;
  final text = value.toString().trim();
  return text.isEmpty ? null : text;
}

String _normalizeFingerprintText(dynamic value) {
  final text = value?.toString().trim().toLowerCase() ?? '';
  return text.replaceAll(RegExp(r'\s+'), ' ');
}

String _normalizeFingerprintDate(dynamic value) {
  final text = value?.toString().trim() ?? '';
  if (text.isEmpty) return '';

  final parsed = DateTime.tryParse(text);
  if (parsed != null) {
    final month = parsed.month.toString().padLeft(2, '0');
    final day = parsed.day.toString().padLeft(2, '0');
    return '${parsed.year}-$month-$day';
  }

  return text.length >= 10
      ? text.substring(0, 10).toLowerCase()
      : text.toLowerCase();
}

double _toDouble(dynamic value, {double fallback = 0}) {
  return _toDoubleOrNull(value) ?? fallback;
}

double? _toDoubleOrNull(dynamic value) {
  if (value == null) return null;
  if (value is num) return value.toDouble();
  return double.tryParse(value.toString());
}

int _toInt(dynamic value, {int fallback = 0}) {
  if (value == null) return fallback;
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value.toString()) ?? fallback;
}

int? _toIntOrNull(dynamic value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value.toString());
}

class ObservationImage {
  final String imageUrl;
  final String? storagePath;

  ObservationImage({required this.imageUrl, this.storagePath});

  Map<String, dynamic> toMap() => {
    'image_url': imageUrl,
    if (storagePath != null) 'storage_path': storagePath,
  };

  factory ObservationImage.fromMap(dynamic map) {
    if (map is String) {
      return ObservationImage(imageUrl: map);
    }
    return ObservationImage(
      imageUrl: map['image_url'] ?? '',
      storagePath: map['storage_path'],
    );
  }
}

class ObservationModel {
  final String? id;
  final String? clientUuid;
  final FieldIdentification fieldIden;
  final CropInformation cropInfo;
  final CropMonitoring monitoring;
  final List<ObservationImage> images;
  final SoilCharacteristics soil;
  final IrrigationManagement irrigation;
  final NutrientManagement nutrient;
  final CropProtection protection;
  final ControlMethods control;
  final HarvestInformation harvest;
  final ResidualManagement residual;
  final DateTime createdAt;
  final dynamic spatialData;
  final double? blockSize;

  ObservationModel({
    this.id,
    this.clientUuid,
    required this.fieldIden,
    required this.cropInfo,
    required this.monitoring,
    required this.images,
    required this.soil,
    required this.irrigation,
    required this.nutrient,
    required this.protection,
    required this.control,
    required this.harvest,
    required this.residual,
    required this.createdAt,
    this.spatialData,
    this.blockSize,
  });

  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
      'client_uuid': clientUuid,
      'field_identification': fieldIden.toMap(),
      'crop_information': cropInfo.toMap(),
      'crop_monitoring': monitoring.toMap(),
      'image_reference': {'images': images.map((e) => e.toMap()).toList()},
      'soil_characteristics': soil.toMap(),
      'irrigation_management': irrigation.toMap(),
      'nutrient_management': nutrient.toMap(),
      'crop_protection': protection.toMap(),
      'control_methods': control.toMap(),
      'harvest_information': harvest.toMap(),
      'residual_management': residual.toMap(),
      'created_at': createdAt.toIso8601String(),
      if (spatialData != null) 'spatial_data': spatialData,
      if (blockSize != null) 'block_size': blockSize,
    };
  }

  factory ObservationModel.fromMap(Map<String, dynamic> map) {
    final normalizedMap = normalizeObservationPayload(map);
    var imgs = <ObservationImage>[];
    if (normalizedMap['image_reference'] != null) {
      if (normalizedMap['image_reference']['images'] != null) {
        imgs = (normalizedMap['image_reference']['images'] as List)
            .map((e) => ObservationImage.fromMap(e))
            .toList();
      } else if (normalizedMap['image_reference']['image_urls'] != null) {
        // Fallback for migration/legacy
        imgs = (normalizedMap['image_reference']['image_urls'] as List)
            .map((e) => ObservationImage(imageUrl: e.toString()))
            .toList();
      }
    }

    return ObservationModel(
      id: normalizedMap['id']?.toString(),
      clientUuid: normalizedMap['client_uuid'],
      fieldIden: FieldIdentification.fromMap(
        normalizedMap['field_identification'] ?? {},
      ),
      cropInfo: CropInformation.fromMap(
        normalizedMap['crop_information'] ?? {},
      ),
      monitoring: CropMonitoring.fromMap(
        normalizedMap['crop_monitoring'] ?? {},
      ),
      images: imgs,
      soil: SoilCharacteristics.fromMap(
        normalizedMap['soil_characteristics'] ?? {},
      ),
      irrigation: IrrigationManagement.fromMap(
        normalizedMap['irrigation_management'] ?? {},
      ),
      nutrient: NutrientManagement.fromMap(
        normalizedMap['nutrient_management'] ?? {},
      ),
      protection: CropProtection.fromMap(
        normalizedMap['crop_protection'] ?? {},
      ),
      control: ControlMethods.fromMap(normalizedMap['control_methods'] ?? {}),
      harvest: HarvestInformation.fromMap(
        normalizedMap['harvest_information'] ?? {},
      ),
      residual: ResidualManagement.fromMap(
        normalizedMap['residual_management'] ?? {},
      ),
      createdAt: DateTime.parse(
        normalizedMap['created_at'] ?? DateTime.now().toIso8601String(),
      ),
      spatialData: normalizedMap['spatial_data'],
      blockSize: normalizedMap['block_size'] != null
          ? (normalizedMap['block_size'] as num).toDouble()
          : null,
    );
  }
}

class FieldIdentification {
  final String sectionName;
  final String? fieldId;
  final String blockId;
  final String fieldName;
  final String? tamMm;
  final double latitude;
  final double longitude;
  final double gpsAccuracy;
  final DateTime dateRecorded;
  final double? area;
  final String? trialNumber;
  final String? trialName;
  final String? contactPersonScientist;

  FieldIdentification({
    required this.sectionName,
    this.fieldId,
    required this.blockId,
    required this.fieldName,
    this.tamMm,
    required this.latitude,
    required this.longitude,
    required this.gpsAccuracy,
    required this.dateRecorded,
    this.area,
    this.trialNumber,
    this.trialName,
    this.contactPersonScientist,
  });

  Map<String, dynamic> toMap() => {
    if (fieldId != null) 'field_id': fieldId,
    'block_id': blockId,
    'field_name': fieldName,
    if (tamMm != null) 'tam_mm': tamMm,
    'latitude': latitude,
    'longitude': longitude,
    'gps_accuracy': gpsAccuracy,
    'date_recorded': dateRecorded.toIso8601String(),
    if (area != null) 'area': area,
    if (trialNumber != null) 'trial_number': trialNumber,
    if (trialName != null) 'trial_name': trialName,
    if (contactPersonScientist != null)
      'contact_person_scientist': contactPersonScientist,
  };

  factory FieldIdentification.fromMap(Map<String, dynamic> map) =>
      FieldIdentification(
        sectionName: map['section_name'] ?? '',
        fieldId: _stringOrNull(map['field_id']),
        blockId: map['block_id'] ?? '',
        fieldName: map['field_name'] ?? '',
        tamMm: _stringOrNull(
          _firstPresent([map['tam_mm'], map['time'], map['tamm_area']]),
        ),
        latitude: (map['latitude'] ?? 0).toDouble(),
        longitude: (map['longitude'] ?? 0).toDouble(),
        gpsAccuracy: (map['gps_accuracy'] ?? 0).toDouble(),
        dateRecorded: DateTime.parse(
          map['date_recorded'] ?? DateTime.now().toIso8601String(),
        ),
        area: map['area'] != null ? (map['area'] as num).toDouble() : null,
        trialNumber: _stringOrNull(map['trial_number']),
        trialName: map['trial_name'],
        contactPersonScientist: map['contact_person_scientist'],
      );
}

class CropInformation {
  final String cropType;
  final int ratoonNumber;
  final String variety;
  final DateTime? plantingDate;
  final DateTime? expectedHarvestDate;
  final String cropStage;
  final String? cropClass;
  final DateTime? cuttingDate;

  CropInformation({
    required this.cropType,
    required this.ratoonNumber,
    required this.variety,
    required this.plantingDate,
    required this.expectedHarvestDate,
    required this.cropStage,
    this.cropClass,
    this.cuttingDate,
  });

  Map<String, dynamic> toMap() => {
    'crop_type': cropType,
    'ratoon_number': ratoonNumber,
    'variety': variety,
    if (plantingDate != null) 'planting_date': plantingDate!.toIso8601String(),
    if (expectedHarvestDate != null)
      'expected_harvest_date': expectedHarvestDate!.toIso8601String(),
    'crop_stage': cropStage,
    if (cropClass != null) 'crop_class': cropClass,
    if (cuttingDate != null) 'cutting_date': cuttingDate!.toIso8601String(),
  };

  factory CropInformation.fromMap(Map<String, dynamic> map) {
    final plantingDate = _stringOrNull(map['planting_date']);
    final expectedHarvestDate = _stringOrNull(map['expected_harvest_date']);
    final cuttingDate = _stringOrNull(map['cutting_date']);

    return CropInformation(
      cropType: map['crop_type'] ?? '',
      ratoonNumber: map['ratoon_number'] ?? 0,
      variety: map['variety'] ?? '',
      plantingDate: plantingDate != null ? DateTime.parse(plantingDate) : null,
      expectedHarvestDate: expectedHarvestDate != null
          ? DateTime.parse(expectedHarvestDate)
          : null,
      cropStage: map['crop_stage'] ?? '',
      cropClass: map['crop_class'],
      cuttingDate: cuttingDate != null ? DateTime.parse(cuttingDate) : null,
    );
  }
}

class CropMonitoring {
  final String vigor;
  final double canopyCover;
  final String stressType; // dropdown: water / nutrient / pest
  final String remarks;

  CropMonitoring({
    required this.vigor,
    required this.canopyCover,
    required this.stressType,
    required this.remarks,
  });

  Map<String, dynamic> toMap() => {
    'crop_vigor': vigor,
    'canopy_cover': canopyCover,
    'stress': stressType,
    'remarks': remarks,
  };

  factory CropMonitoring.fromMap(Map<String, dynamic> map) => CropMonitoring(
    vigor: map['crop_vigor'] ?? 'Good',
    canopyCover: (map['canopy_cover'] ?? 0).toDouble(),
    stressType: map['stress'] ?? 'None',
    remarks: map['remarks'] ?? '',
  );
}

class SoilCharacteristics {
  final String soilType;
  final String soilTexture;
  final double soilPh;
  final double organicMatterContent;
  final String drainageClass;

  SoilCharacteristics({
    required this.soilType,
    required this.soilTexture,
    required this.soilPh,
    required this.organicMatterContent,
    required this.drainageClass,
  });

  Map<String, dynamic> toMap() => {
    'soil_type': soilType,
    'soil_texture': soilTexture,
    'soil_ph': soilPh,
    'organic_matter': organicMatterContent,
    'drainage_class': drainageClass,
  };

  factory SoilCharacteristics.fromMap(Map<String, dynamic> map) =>
      SoilCharacteristics(
        soilType: map['soil_type'] ?? '',
        soilTexture: map['soil_texture'] ?? '',
        soilPh: (map['soil_ph'] ?? 7.0).toDouble(),
        organicMatterContent:
            (map['organic_matter'] ?? map['organic_matter_content'] ?? 0)
                .toDouble(),
        drainageClass: map['drainage_class'] ?? '',
      );
}

class IrrigationManagement {
  final String irrigationType;
  final DateTime? irrigationDate;
  final double irrigationVolume;
  final double soilMoisturePercentage;
  final String waterSourceType;

  IrrigationManagement({
    required this.irrigationType,
    required this.irrigationDate,
    required this.irrigationVolume,
    required this.soilMoisturePercentage,
    required this.waterSourceType,
  });

  Map<String, dynamic> toMap() => {
    'irrigation_type': irrigationType,
    if (irrigationDate != null)
      'irrigation_date': irrigationDate!.toIso8601String(),
    'irrigation_volume': irrigationVolume,
    'soil_moisture_percentage': soilMoisturePercentage,
    'water_source': waterSourceType,
  };

  factory IrrigationManagement.fromMap(Map<String, dynamic> map) {
    final irrigationDate = _stringOrNull(map['irrigation_date']);

    return IrrigationManagement(
      irrigationType: map['irrigation_type'] ?? '',
      irrigationDate: irrigationDate != null
          ? DateTime.parse(irrigationDate)
          : null,
      irrigationVolume: (map['irrigation_volume'] ?? 0).toDouble(),
      soilMoisturePercentage:
          (map['soil_moisture_percentage'] ?? map['soil_moisture'] ?? 0)
              .toDouble(),
      waterSourceType: map['water_source'] ?? map['water_source_type'] ?? '',
    );
  }
}

class NutrientManagement {
  final String fertilizerType;
  final DateTime? applicationDate;
  final double applicationRate;
  final String macronutrientNpk;

  NutrientManagement({
    required this.fertilizerType,
    required this.applicationDate,
    required this.applicationRate,
    required this.macronutrientNpk,
  });

  Map<String, dynamic> toMap() => {
    'fertilizer_type': fertilizerType,
    if (applicationDate != null)
      'application_date': applicationDate!.toIso8601String(),
    'application_rate': applicationRate,
    'npk_ratio': macronutrientNpk,
  };

  factory NutrientManagement.fromMap(Map<String, dynamic> map) {
    final applicationDate = _stringOrNull(map['application_date']);

    return NutrientManagement(
      fertilizerType: map['fertilizer_type'] ?? '',
      applicationDate: applicationDate != null
          ? DateTime.parse(applicationDate)
          : null,
      applicationRate: (map['application_rate'] ?? 0).toDouble(),
      macronutrientNpk: map['npk_ratio'] ?? map['macronutrient_npk'] ?? '',
    );
  }
}

class CropProtection {
  final String weedType;
  final String weedPressure; // dropdown: low / medium / high
  final String pestType;
  final String pestSeverity; // dropdown
  final String diseaseType;
  final String diseaseSeverity; // dropdown
  final String remarks;

  CropProtection({
    required this.weedType,
    required this.weedPressure,
    required this.pestType,
    required this.pestSeverity,
    required this.diseaseType,
    required this.diseaseSeverity,
    required this.remarks,
  });

  Map<String, dynamic> toMap() => {
    'weed_type': weedType,
    'weed_level': weedPressure,
    'pest_type': pestType,
    'pest_severity': pestSeverity,
    'disease_type': diseaseType,
    'disease_severity': diseaseSeverity,
    'remarks': remarks,
  };

  factory CropProtection.fromMap(Map<String, dynamic> map) => CropProtection(
    weedType: map['weed_type'] ?? '',
    weedPressure: map['weed_level'] ?? map['weed_pressure'] ?? 'Low',
    pestType: map['pest_type'] ?? '',
    pestSeverity: map['pest_severity'] ?? 'Low',
    diseaseType: map['disease_type'] ?? '',
    diseaseSeverity: map['disease_severity'] ?? 'Low',
    remarks: map['remarks'] ?? '',
  );
}

class ControlMethods {
  final String weedControl;
  final String pestControl;
  final String diseaseControl;

  ControlMethods({
    required this.weedControl,
    required this.pestControl,
    required this.diseaseControl,
  });

  Map<String, dynamic> toMap() => {
    'weed_control': weedControl,
    'pest_control': pestControl,
    'disease_control': diseaseControl,
  };

  factory ControlMethods.fromMap(Map<String, dynamic> map) => ControlMethods(
    weedControl: map['weed_control'] ?? '',
    pestControl: map['pest_control'] ?? '',
    diseaseControl: map['disease_control'] ?? '',
  );
}

class HarvestInformation {
  final DateTime? harvestDate;
  final double yieldAmount;
  final String harvestMethod; // Manual / Mechanized
  final String? caneQualityRemarks;

  HarvestInformation({
    required this.harvestDate,
    required this.yieldAmount,
    required this.harvestMethod,
    this.caneQualityRemarks,
  });

  Map<String, dynamic> toMap() => {
    if (harvestDate != null) 'harvest_date': harvestDate!.toIso8601String(),
    'yield': yieldAmount,
    'harvest_method': harvestMethod,
    if (caneQualityRemarks != null) 'cane_quality_remarks': caneQualityRemarks,
  };

  factory HarvestInformation.fromMap(Map<String, dynamic> map) {
    final harvestDate = _stringOrNull(map['harvest_date']);

    return HarvestInformation(
      harvestDate: harvestDate != null ? DateTime.parse(harvestDate) : null,
      yieldAmount: (map['yield'] ?? 0).toDouble(),
      harvestMethod: map['harvest_method'] ?? 'Manual',
      caneQualityRemarks: map['cane_quality_remarks'],
    );
  }
}

class ResidualManagement {
  final String residueType;
  final String managementMethod;
  final String remarks;

  ResidualManagement({
    required this.residueType,
    required this.managementMethod,
    required this.remarks,
  });

  Map<String, dynamic> toMap() => {
    'residue_type': residueType,
    'management_method': managementMethod,
    'remarks': remarks,
  };

  factory ResidualManagement.fromMap(Map<String, dynamic> map) =>
      ResidualManagement(
        residueType: map['residue_type'] ?? 'None',
        managementMethod: map['management_method'] ?? 'None',
        remarks: map['remarks'] ?? map['residual_outcome'] ?? '',
      );
}

class BlockModel {
  final String id;
  final String blockId;
  final String? sectionName;
  final String? name;
  final String? fieldName; // Auto-populated from KML attributes
  final dynamic geom;

  BlockModel({
    required this.id,
    required this.blockId,
    this.sectionName,
    this.name,
    this.fieldName,
    this.geom,
  });

  factory BlockModel.fromMap(Map<String, dynamic> map) {
    return BlockModel(
      id: map['id']?.toString() ?? '',
      blockId: map['block_id'] ?? '',
      sectionName: map['section_name'],
      name: map['name'],
      fieldName: map['field_name'],
      geom: _decodeGeometry(map['geom']),
    );
  }

  Map<String, dynamic> toMap() => {
    'id': id,
    'block_id': blockId,
    'section_name': sectionName,
    'name': name,
    'field_name': fieldName,
    'geom': geom,
  };

  static dynamic _decodeGeometry(dynamic value) {
    if (value == null) return null;

    if (value is Map<String, dynamic>) {
      return value;
    }

    if (value is Map) {
      return Map<String, dynamic>.from(value);
    }

    if (value is String && value.trim().isNotEmpty) {
      try {
        final decoded = jsonDecode(value);
        if (decoded is Map<String, dynamic>) {
          return decoded;
        }
        if (decoded is Map) {
          return Map<String, dynamic>.from(decoded);
        }
      } catch (_) {
        return value;
      }
    }

    return value;
  }
}
