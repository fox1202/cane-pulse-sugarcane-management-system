// ignore_for_file: unused_element, unused_field

import 'dart:convert';
import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import '../config/supabase_config.dart';
import '../providers/sync_provider.dart';
import '../services/local_db.dart';
import '../services/supabase_service.dart';
import '../models/observation_models.dart';
import '../utils/app_colors.dart';
import '../utils/app_theme.dart';
import '../widgets/botanical_background.dart';
import '../utils/geo_utils.dart';

class ObservationFormScreen extends StatefulWidget {
  final Map<String, dynamic>? initialObservation;
  final int? initialLocalObservationId;
  final bool initialIsOffline;

  const ObservationFormScreen({
    super.key,
    this.initialObservation,
    this.initialLocalObservationId,
    this.initialIsOffline = false,
  });

  @override
  State<ObservationFormScreen> createState() => _ObservationFormScreenState();
}

class _ObservationFormScreenState extends State<ObservationFormScreen> {
  static const String _datePickerPlaceholder = 'dd/mm/year';
  static const LocationSettings _singleFixLocationSettings = LocationSettings(
    accuracy: LocationAccuracy.high,
  );
  static const LocationSettings _liveLocationSettings = LocationSettings(
    accuracy: LocationAccuracy.high,
    distanceFilter: 3,
  );
  static const List<String> _irrigationTypeOptions = [
    'Furrow',
    'Overhead Sprinkler',
    'Center Pivot',
    'Sub Surface Drip',
  ];
  static const List<String> _waterSourceOptions = ['Dam 1', 'Dam 2', 'Dam 3'];
  static const List<String> _soilTypeOptions = ['SaL', 'SaC', 'SaCL'];
  static const List<String> _cropTypeOptions = [
    'Sugarcane',
    'Break Crop',
    'Fallow Period',
  ];
  static const List<String> _sugarcaneCropClassOptions = [
    'Plant Cane',
    '1st Ratoon',
    '2nd Ratoon',
    '3rd Ratoon',
    '4th Ratoon',
    '5th Ratoon',
    '6th Ratoon',
    '7th Ratoon',
    '8th Ratoon',
    '9th Ratoon',
    '10th Ratoon',
    '11th Ratoon',
    '12th Ratoon',
  ];
  static const List<String> _breakCropClassOptions = [
    'Soyabeans',
    'Sugarbeans',
    'Sunnhemp',
    'Velvet Beans',
    'Maize',
  ];
  static const List<String> _fallowCropClassOptions = ['None'];
  static const List<String> _residueTypeOptions = [
    'Soyabeans',
    'Sugarbeans',
    'Sunnhemp',
    'Velvet Beans',
    'None',
  ];
  static const List<String> _residueManagementMethodOptions = [
    'Ploughed in',
    'Parting',
    'Broadcasting',
    'None',
  ];
  final _formKey = GlobalKey<FormState>();
  final _localDb = LocalDB();
  bool _submitting = false;
  bool _isLoadingSelectedFieldRecord = false;
  Map<String, dynamic>? _selectedFieldLatestObservation;
  int? _selectedFieldLatestObservationLocalId;
  bool _selectedFieldLatestObservationIsLocal = false;
  Map<String, dynamic>? _editingSourceObservation;
  int? _editingLocalObservationId;
  int? _editingMonitoringRowId;
  String? _editingClientUuid;
  DateTime? _editingCreatedAt;

  /* ================= SECTION A: FIELD ID ================= */
  final _sectionNameCtrl = TextEditingController();
  final _fieldIdCtrl = TextEditingController();
  final _blockIdCtrl =
      TextEditingController(); // We'll keep this but the dropdown will set it
  final _fieldNameCtrl = TextEditingController();
  final _areaCtrl = TextEditingController();
  Position? _currentPosition;
  StreamSubscription<Position>? _locationSubscription;
  bool _isCollectingLocation = false;
  String? _locationStatusMessage;
  DateTime? _dateRecorded = DateTime.now();

  List<BlockModel> _availableBlocks = [];
  List<Map<String, dynamic>> _availableMonitoringFields = [];
  Map<String, dynamic>? _selectedMonitoringFieldRecord;
  int? _selectedMonitoringFieldRecordId;
  BlockModel? _selectedBlock;
  bool _isLoadingBlocks = true;
  bool _isLoadingMonitoringFields = true;
  bool _isInsideBlock = false; // For validation status highlight
  double? _selectedBlockHectares;
  String? _blocksStatusMessage;
  String? _monitoringFieldsStatusMessage;

  /* ================= SECTION B: BASIC INFO ================= */
  final _trialNumberCtrl = TextEditingController();
  final _trialNameCtrl = TextEditingController();
  final _contactPersonCtrl = TextEditingController();
  final _cropTypeCtrl = TextEditingController(text: 'Sugarcane');
  final _cropClassCtrl = TextEditingController();
  final _cropYieldCtrl = TextEditingController();

  /* ================= SECTION C: CROP DATES ================= */
  DateTime? _plantingDate;
  DateTime? _cuttingDate;
  DateTime? _actualCuttingDate;
  DateTime? _expectedHarvestDate;
  DateTime? _harvestDate;

  /* ================= SECTION D: WATER & SOIL ================= */
  final _irrigationTypeCtrl = TextEditingController();
  final _waterSourceCtrl = TextEditingController();
  final _tamMmCtrl = TextEditingController();
  final _soilTypeCtrl = TextEditingController();
  final _phCtrl = TextEditingController();
  final _remarksCtrl = TextEditingController();
  final _harvestYieldCtrl = TextEditingController();
  final _caneQualityRemarksCtrl = TextEditingController();
  final _residueTypeCtrl = TextEditingController();
  final _managementMethodCtrl = TextEditingController();
  final _residualRemarksCtrl = TextEditingController();
  final _fertilizerTypeCtrl = TextEditingController();
  final _applicationRateCtrl = TextEditingController();
  DateTime? _applicationDate;
  DateTime? _foliarSamplingDate;
  DateTime? _weedApplicationDate;
  final _weedApplicationRateCtrl = TextEditingController();
  final _pestControlCtrl = TextEditingController();
  final _diseaseControlCtrl = TextEditingController();
  final _weedControlCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _initializeApp();
  }

  Future<void> _initializeApp() async {
    await _loadDraft();
    _startAutoLocationTracking();
    await _fetchBlocks();
    await _fetchMonitoringFields(
      restoreSelection: widget.initialObservation == null,
    );
    if (widget.initialObservation != null) {
      _openInitialObservationForEditing();
    } else {
      await _loadLatestSelectedFieldRecord();
    }
    _checkBlockProximity();
  }

  void _openInitialObservationForEditing() {
    final initialObservation = widget.initialObservation;
    if (initialObservation == null) return;

    setState(() {
      _selectedFieldLatestObservation = normalizeObservationPayload(
        Map<String, dynamic>.from(initialObservation),
      );
      _selectedFieldLatestObservationLocalId = widget.initialLocalObservationId;
      _selectedFieldLatestObservationIsLocal = widget.initialIsOffline;
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _startUpdatingSavedFieldRecord(adoptSavedRecordIdentity: true);
    });
  }

  bool get _isEditingObservation =>
      _editingClientUuid?.trim().isNotEmpty == true;

  bool get _hasSavedGpsForEditing =>
      _editingLatitude != null && _editingLongitude != null;

  double? get _editingLatitude => _extractDoubleFromEditingField('latitude');

  double? get _editingLongitude => _extractDoubleFromEditingField('longitude');

  double? get _editingGpsAccuracy =>
      _extractDoubleFromEditingField('gps_accuracy');

  bool get _isEditingSelectedFieldLatestRecord {
    final selectedClientUuid = _selectedFieldLatestObservation?['client_uuid']
        ?.toString()
        .trim();
    final editingClientUuid = _editingClientUuid?.trim();
    return selectedClientUuid != null &&
        selectedClientUuid.isNotEmpty &&
        editingClientUuid == selectedClientUuid;
  }

  String _fieldLabelForBlock(BlockModel block) {
    final fieldName = block.fieldName?.trim() ?? '';
    if (fieldName.isNotEmpty) return fieldName;

    final name = block.name?.trim() ?? '';
    if (name.isNotEmpty) return name;

    final blockId = block.blockId.trim();
    return blockId.isNotEmpty ? blockId : 'Unknown field';
  }

  String _fieldIdForBlock(BlockModel block) {
    final id = block.id.trim();
    if (id.isNotEmpty) return id;
    return _blockSelectionValue(block);
  }

  String _dropdownLabelForBlock(BlockModel block) {
    final parts = <String>[_fieldIdForBlock(block)];
    final fieldName = _fieldLabelForBlock(block);
    final blockId = block.blockId.trim();
    final sectionName = block.sectionName?.trim() ?? '';

    if (fieldName.isNotEmpty && fieldName != parts.first) {
      parts.add(fieldName);
    }
    if (blockId.isNotEmpty && !parts.contains(blockId)) {
      parts.add(blockId);
    }
    if (sectionName.isNotEmpty) {
      parts.add(sectionName);
    }

    return parts.join(' • ');
  }

  String _blockSelectionValue(BlockModel block) {
    final blockId = block.blockId.trim();
    if (blockId.isNotEmpty) return blockId;

    final id = block.id.trim();
    if (id.isNotEmpty) return id;

    return _fieldLabelForBlock(block);
  }

  BlockModel? _findBlockBySelectionValue(
    String? value, {
    List<BlockModel>? blocks,
  }) {
    if (value == null || value.trim().isEmpty) return null;

    final source = blocks ?? _availableBlocks;

    try {
      return source.firstWhere((block) => _blockSelectionValue(block) == value);
    } catch (_) {
      return null;
    }
  }

  void _syncSelectedBlockToForm(
    BlockModel? block, {
    bool preserveFieldName = false,
  }) {
    _selectedBlock = block;

    if (block == null) {
      _selectedBlockHectares = null;
      _setAreaFieldValue(null);
      return;
    }

    final sectionName = block.sectionName?.trim() ?? '';
    if (sectionName.isNotEmpty) {
      _sectionNameCtrl.text = sectionName;
    } else if (_sectionNameCtrl.text.trim().isEmpty) {
      _sectionNameCtrl.text = _fieldLabelForBlock(block);
    }

    final caneName = _fieldLabelForBlock(block);
    if (!preserveFieldName || _fieldNameCtrl.text.trim().isEmpty) {
      _fieldNameCtrl.text = caneName;
    }

    _selectedBlockHectares = GeoUtils.calculateAreaHectares(block.geom);
    _setAreaFieldValue(_selectedBlockHectares);
  }

  void _setAreaFieldValue(double? area) {
    _areaCtrl.text = area == null ? '' : area.toStringAsFixed(2);
  }

  String _normalizeLookupValue(String? value) =>
      value?.trim().toLowerCase() ?? '';

  String _canonicalDropdownToken(String? value) {
    final token = value?.trim().toLowerCase() ?? '';
    switch (token) {
      case 'disease control':
        return 'disease';
      case 'breakcrop':
        return 'break crop';
      case 'fallow':
      case 'fullow':
      case 'fullow period':
      case 'fallow period':
        return 'fallow period';
      case 'sunhemp':
        return 'sunnhemp';
      case 'soybeans':
        return 'soyabeans';
      case 'sugarbean':
        return 'sugarbeans';
      case 'n/a':
        return 'none';
      default:
        return token;
    }
  }

  String _normalizeCropTypeValue(String? value) {
    final token = _canonicalDropdownToken(value);
    switch (token) {
      case 'sugarcane':
        return 'Sugarcane';
      case 'break crop':
      case 'soyabeans':
      case 'sugarbeans':
      case 'sunnhemp':
      case 'velvet beans':
      case 'maize':
        return 'Break Crop';
      case 'fallow period':
      case 'none':
        return 'Fallow Period';
      default:
        return _matchDropdownOption(value, _cropTypeOptions) ??
            _cropTypeOptions.first;
    }
  }

  List<String> _cropClassOptionsForType(String? cropType) {
    switch (_normalizeCropTypeValue(cropType)) {
      case 'Break Crop':
        return _breakCropClassOptions;
      case 'Fallow Period':
        return _fallowCropClassOptions;
      default:
        return _sugarcaneCropClassOptions;
    }
  }

  void _syncCropClassForCropType({String? cropType, String? cropClass}) {
    final rawCropType = cropType ?? _cropTypeCtrl.text;
    final normalizedCropType = _normalizeCropTypeValue(rawCropType);
    final options = _cropClassOptionsForType(normalizedCropType);
    final matchedClass =
        _matchDropdownOption(cropClass ?? _cropClassCtrl.text, options) ??
        _matchDropdownOption(rawCropType, options);

    _cropTypeCtrl.text = normalizedCropType;

    if (normalizedCropType == 'Fallow Period') {
      _cropClassCtrl.text = options.first;
      return;
    }

    _cropClassCtrl.text = matchedClass ?? '';
  }

  String? _matchDropdownOption(String? value, List<String> options) {
    final candidate = value?.trim() ?? '';
    if (candidate.isEmpty) return null;
    final candidateToken = _canonicalDropdownToken(candidate);

    for (final option in options) {
      if (_canonicalDropdownToken(option) == candidateToken) {
        return option;
      }
    }

    return null;
  }

  String _normalizeDropdownValue(
    String? value,
    List<String> options, {
    String fallback = '',
  }) {
    return _matchDropdownOption(value, options) ?? fallback;
  }

  DateTime? _tryParseDate(dynamic value) {
    final raw = value?.toString().trim() ?? '';
    if (raw.isEmpty) return null;
    return DateTime.tryParse(raw);
  }

  double? _toNullableDouble(dynamic value) {
    if (value is num) return value.toDouble();
    final raw = value?.toString().trim() ?? '';
    if (raw.isEmpty) return null;
    return double.tryParse(raw);
  }

  int? _toNullableInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    final raw = value?.toString().trim() ?? '';
    if (raw.isEmpty) return null;
    return int.tryParse(raw) ?? double.tryParse(raw)?.toInt();
  }

  int? _monitoringFieldRecordId(Map<String, dynamic> record) {
    return _toNullableInt(record['id']);
  }

  String _monitoringFieldIdLabel(Map<String, dynamic> record) {
    final fieldId = record['field_name']?.toString().trim() ?? '';
    if (fieldId.isNotEmpty) return fieldId;

    final blockId = record['block_id']?.toString().trim() ?? '';
    if (blockId.isNotEmpty) return blockId;

    final id = _monitoringFieldRecordId(record);
    return id == null ? 'Unknown field' : 'Field $id';
  }

  String _monitoringFieldBlockId(Map<String, dynamic> record) {
    return record['block_id']?.toString().trim() ?? '';
  }

  String _monitoringFieldDropdownLabel(Map<String, dynamic> record) {
    final fieldId = _monitoringFieldIdLabel(record);
    final blockId = _monitoringFieldBlockId(record);
    final recordId = _monitoringFieldRecordId(record);

    var sameFieldCount = 0;
    var exactDuplicateCount = 0;
    for (final candidate in _availableMonitoringFields) {
      if (_monitoringFieldIdLabel(candidate) == fieldId) {
        sameFieldCount += 1;
      }
      if (_monitoringFieldIdLabel(candidate) != fieldId ||
          _monitoringFieldBlockId(candidate) != blockId) {
        continue;
      }
      exactDuplicateCount += 1;
    }

    final shouldShowBlock = sameFieldCount > 1 &&
        blockId.isNotEmpty &&
        blockId != fieldId;
    final baseLabel = shouldShowBlock ? '$fieldId • $blockId' : fieldId;

    if (exactDuplicateCount > 1) {
      return recordId == null ? baseLabel : '$baseLabel • Row $recordId';
    }

    return baseLabel;
  }

  Map<String, dynamic>? _findMonitoringFieldRecordById(int? id) {
    if (id == null) return null;

    for (final record in _availableMonitoringFields) {
      if (_monitoringFieldRecordId(record) == id) {
        return record;
      }
    }

    return null;
  }

  double? _monitoringFieldArea(Map<String, dynamic> record) {
    return _toNullableDouble(record['area']) ??
        GeoUtils.calculateAreaHectares(record['polygon']);
  }

  BlockModel _buildMonitoringFieldBlock(Map<String, dynamic> record) {
    final fieldId = _monitoringFieldIdLabel(record);
    final blockId = _monitoringFieldBlockId(record);
    final id = _monitoringFieldRecordId(record)?.toString() ?? '';

    return BlockModel(
      id: id,
      blockId: blockId,
      name: fieldId,
      fieldName: fieldId,
      geom: record['polygon'],
    );
  }

  void _applyMonitoringFieldSelection(
    Map<String, dynamic> record, {
    bool refreshSavedFieldRecord = true,
  }) {
    final fieldId = _monitoringFieldIdLabel(record);
    final blockId = _monitoringFieldBlockId(record);
    final area = _monitoringFieldArea(record);
    final monitoringBlock = _buildMonitoringFieldBlock(record);

    setState(() {
      _selectedMonitoringFieldRecord = Map<String, dynamic>.from(record);
      _selectedMonitoringFieldRecordId = _monitoringFieldRecordId(record);
      _selectedBlock = monitoringBlock;
      _selectedBlockHectares = area;
      _fieldIdCtrl.text = fieldId;
      _blockIdCtrl.text = blockId;
      _fieldNameCtrl.text = fieldId;
      _setAreaFieldValue(area);
    });

    _checkBlockProximity();
    unawaited(_saveDraft());
    if (refreshSavedFieldRecord) {
      unawaited(_loadLatestSelectedFieldRecord());
    }
  }

  void _applyMonitoringFieldRecord(
    Map<String, dynamic> record, {
    bool keepDateRecorded = true,
    bool refreshSavedFieldRecord = true,
    bool autoLoadSavedRecord = false,
  }) {
    final fieldId = _monitoringFieldIdLabel(record);
    final blockId = _monitoringFieldBlockId(record);
    final area = _monitoringFieldArea(record);
    final monitoringBlock = _buildMonitoringFieldBlock(record);

    setState(() {
      _editingSourceObservation = null;
      _editingLocalObservationId = null;
      _editingMonitoringRowId = null;
      _editingClientUuid = null;
      _editingCreatedAt = null;
      _selectedMonitoringFieldRecord = Map<String, dynamic>.from(record);
      _selectedMonitoringFieldRecordId = _monitoringFieldRecordId(record);
      _selectedBlock = monitoringBlock;
      _selectedBlockHectares = area;

      _sectionNameCtrl.clear();
      _fieldIdCtrl.text = fieldId;
      _blockIdCtrl.text = blockId;
      _fieldNameCtrl.text = fieldId;
      _setAreaFieldValue(area);

      _trialNumberCtrl.text = record['trial_number']?.toString() ?? '';
      _trialNameCtrl.text = record['trial_name']?.toString() ?? '';
      _contactPersonCtrl.text = record['contact_person']?.toString() ?? '';
      _cropYieldCtrl.clear();

      _syncCropClassForCropType(
        cropType: record['crop_type']?.toString() ?? _cropTypeOptions.first,
        cropClass: record['crop_class']?.toString(),
      );

      _plantingDate = _tryParseDate(record['planting_date']);
      _cuttingDate = _tryParseDate(record['previous_cutting_date']);
      _actualCuttingDate = _tryParseDate(record['actual_cutting_date']);
      _expectedHarvestDate = _tryParseDate(record['expected_harvest_date']);
      _harvestDate = _tryParseDate(record['actual_cutting_date']);

      _irrigationTypeCtrl.text = _normalizeDropdownValue(
        record['irrigation_type']?.toString(),
        _irrigationTypeOptions,
      );
      _waterSourceCtrl.text = _normalizeDropdownValue(
        record['water_source']?.toString(),
        _waterSourceOptions,
      );
      _tamMmCtrl.text = record['tam']?.toString() ?? '';
      _soilTypeCtrl.text = _normalizeDropdownValue(
        record['soil_type']?.toString(),
        _soilTypeOptions,
      );
      _phCtrl.text = record['ph']?.toString() ?? '';
      _remarksCtrl.text = record['remarks']?.toString() ?? '';

      _harvestYieldCtrl.text = record['yield']?.toString() ?? '';
      _caneQualityRemarksCtrl.text =
          record['cane_quality_remarks']?.toString() ?? '';
      _residueTypeCtrl.text = _normalizeDropdownValue(
        record['residue_type']?.toString(),
        _residueTypeOptions,
        fallback: _residueTypeOptions.last,
      );
      _managementMethodCtrl.text = _normalizeDropdownValue(
        record['management_method']?.toString(),
        _residueManagementMethodOptions,
        fallback: _residueManagementMethodOptions.last,
      );
      _residualRemarksCtrl.text = record['residue_remarks']?.toString() ?? '';
      _fertilizerTypeCtrl.text = record['fertiliser_type']?.toString() ?? '';
      _applicationDate = _tryParseDate(record['application_date']);
      _applicationRateCtrl.text = record['application_rate']?.toString() ?? '';
      _foliarSamplingDate = _tryParseDate(record['foliar_sampling_date']);
      _weedControlCtrl.text = record['herbicide_name']?.toString() ?? '';
      _weedApplicationDate = _tryParseDate(
        record['herbicide_application_date'],
      );
      _weedApplicationRateCtrl.text =
          record['herbicide_application_rate']?.toString() ?? '';
      _pestControlCtrl.text = record['pest_remarks']?.toString() ?? '';
      _diseaseControlCtrl.text = record['disease_remarks']?.toString() ?? '';

      if (!keepDateRecorded) {
        _dateRecorded =
            _tryParseDate(record['date_recorded']) ?? DateTime.now();
      } else {
        _dateRecorded ??= DateTime.now();
      }
    });

    _checkBlockProximity();
    unawaited(_saveDraft());
    if (refreshSavedFieldRecord) {
      unawaited(
        _loadLatestSelectedFieldRecord(autoLoadIntoForm: autoLoadSavedRecord),
      );
    }
  }

  double? _extractDoubleFromEditingField(String key) {
    final fieldIdentification = Map<String, dynamic>.from(
      _editingSourceObservation?['field_identification'] ?? const {},
    );
    return _toNullableDouble(fieldIdentification[key]);
  }

  bool _matchesSelectedBlockRecord(
    BlockModel block,
    Map<String, dynamic> payload,
  ) {
    final normalized = normalizeObservationPayload(payload);
    final fieldIdentification = Map<String, dynamic>.from(
      normalized['field_identification'] ?? const {},
    );

    final blockId = _normalizeLookupValue(block.blockId);
    final fieldName = _normalizeLookupValue(_fieldLabelForBlock(block));

    final recordBlockId = _normalizeLookupValue(
      fieldIdentification['block_id']?.toString(),
    );
    final recordFieldName = _normalizeLookupValue(
      fieldIdentification['field_name']?.toString(),
    );
    final selectedMonitoringRowId = _selectedMonitoringFieldRecordId;
    final recordMonitoringRowId = _toNullableInt(
      fieldIdentification['monitoring_row_id'],
    );

    if (selectedMonitoringRowId != null && recordMonitoringRowId != null) {
      return selectedMonitoringRowId == recordMonitoringRowId;
    }

    if (blockId.isNotEmpty && blockId == recordBlockId) {
      if (fieldName.isEmpty || recordFieldName.isEmpty) {
        return true;
      }
      return fieldName == recordFieldName;
    }

    if (fieldName.isEmpty || fieldName != recordFieldName) {
      return false;
    }

    return true;
  }

  DateTime? _recordedAtFromObservation(Map<String, dynamic> payload) {
    final normalized = normalizeObservationPayload(payload);
    final fieldIdentification = Map<String, dynamic>.from(
      normalized['field_identification'] ?? const {},
    );
    return _tryParseDate(
          fieldIdentification['date_recorded'] ?? normalized['created_at'],
        ) ??
        _tryParseDate(normalized['created_at']);
  }

  bool _matchesLatestSelectedFieldInformation(
    Map<String, dynamic> observationData,
  ) {
    final latestObservation = _selectedFieldLatestObservation;
    if (latestObservation == null) {
      return false;
    }

    final currentRecord = Map<String, dynamic>.from(
      buildModernSugarcaneMonitoringRecord(observationData),
    )..remove('id');
    final latestRecord = Map<String, dynamic>.from(
      buildModernSugarcaneMonitoringRecord(latestObservation),
    )..remove('id');

    return buildSugarcaneMonitoringFingerprint(currentRecord) ==
        buildSugarcaneMonitoringFingerprint(latestRecord);
  }

  void _showExistingFieldSnackBar() {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('This information already exists in the database.'),
        backgroundColor: Colors.orange,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  String _selectedBlockTrackingValue(BlockModel block) {
    return [
      block.id.trim(),
      block.blockId.trim(),
      _fieldLabelForBlock(block).trim(),
    ].join('|');
  }

  Future<void> _loadLatestSelectedFieldRecord({
    bool autoLoadIntoForm = false,
  }) async {
    final selectedBlock = _selectedBlock;
    if (selectedBlock == null) {
      if (!mounted) return;
      setState(() {
        _isLoadingSelectedFieldRecord = false;
        _selectedFieldLatestObservation = null;
        _selectedFieldLatestObservationLocalId = null;
        _selectedFieldLatestObservationIsLocal = false;
      });
      return;
    }

    final selectionValue = _selectedBlockTrackingValue(selectedBlock);

    if (mounted) {
      setState(() {
        _isLoadingSelectedFieldRecord = true;
      });
    }

    Map<String, dynamic>? latestObservation;
    int? latestLocalId;
    var latestIsLocal = false;
    DateTime? latestRecordedAt;

    final localRecords = await _localDb.getAllObservations();
    for (final record in localRecords) {
      final raw = Map<String, dynamic>.from(
        jsonDecode(record['data'] as String) as Map,
      );
      if (!_matchesSelectedBlockRecord(selectedBlock, raw)) continue;

      final candidate = normalizeObservationPayload(raw);
      final candidateDate = _recordedAtFromObservation(candidate);
      if (latestObservation == null ||
          (candidateDate != null &&
              (latestRecordedAt == null ||
                  candidateDate.isAfter(latestRecordedAt)))) {
        latestObservation = candidate;
        latestLocalId = record['id'] as int?;
        latestIsLocal = true;
        latestRecordedAt = candidateDate;
      }
    }

    final syncProvider = mounted ? context.read<SyncProvider>() : null;
    if (syncProvider?.isDatabaseConnected == true) {
      try {
        final remoteRecords = await SupabaseService().getRecentObservations(
          limit: 150,
        );
        for (final remote in remoteRecords) {
          if (!_matchesSelectedBlockRecord(selectedBlock, remote)) continue;

          final candidate = normalizeObservationPayload(remote);
          final candidateDate = _recordedAtFromObservation(candidate);
          if (latestObservation == null ||
              (candidateDate != null &&
                  (latestRecordedAt == null ||
                      candidateDate.isAfter(latestRecordedAt)))) {
            latestObservation = candidate;
            latestLocalId = null;
            latestIsLocal = false;
            latestRecordedAt = candidateDate;
          }
        }
      } catch (e) {
        debugPrint('Error loading saved field record: $e');
      }
    }

    if (!mounted) return;
    if (_selectedBlock == null ||
        _selectedBlockTrackingValue(_selectedBlock!) != selectionValue) {
      return;
    }

    setState(() {
      _selectedFieldLatestObservation = latestObservation;
      _selectedFieldLatestObservationLocalId = latestLocalId;
      _selectedFieldLatestObservationIsLocal = latestIsLocal;
      _isLoadingSelectedFieldRecord = false;
    });

    if (!autoLoadIntoForm || latestObservation == null) {
      return;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (_selectedBlock == null ||
          _selectedBlockTrackingValue(_selectedBlock!) != selectionValue) {
        return;
      }
      _startUpdatingSavedFieldRecord(
        showFeedback: false,
        keepDateRecorded: true,
      );
    });
  }

  void _resetObservationFieldsForNewEntry() {
    final preservedMonitoringFieldRecord =
        _selectedMonitoringFieldRecord == null
        ? null
        : Map<String, dynamic>.from(_selectedMonitoringFieldRecord!);
    final preservedBlock = _selectedBlock;

    setState(() {
      _editingSourceObservation = null;
      _editingLocalObservationId = null;
      _editingMonitoringRowId = null;
      _editingClientUuid = null;
      _editingCreatedAt = null;
      _dateRecorded = DateTime.now();
      _fieldIdCtrl.clear();
      _trialNumberCtrl.clear();
      _trialNameCtrl.clear();
      _contactPersonCtrl.clear();
      _cropTypeCtrl.text = 'Sugarcane';
      _cropClassCtrl.clear();
      _cropYieldCtrl.clear();
      _areaCtrl.clear();
      _plantingDate = null;
      _cuttingDate = null;
      _actualCuttingDate = null;
      _expectedHarvestDate = null;
      _harvestDate = null;
      _irrigationTypeCtrl.clear();
      _waterSourceCtrl.clear();
      _tamMmCtrl.clear();
      _soilTypeCtrl.clear();
      _phCtrl.clear();
      _remarksCtrl.clear();
      _harvestYieldCtrl.clear();
      _caneQualityRemarksCtrl.clear();
      _residueTypeCtrl.clear();
      _managementMethodCtrl.clear();
      _residualRemarksCtrl.clear();
      _fertilizerTypeCtrl.clear();
      _applicationDate = null;
      _foliarSamplingDate = null;
      _weedApplicationDate = null;
      _applicationRateCtrl.clear();
      _weedApplicationRateCtrl.clear();
      _pestControlCtrl.clear();
      _diseaseControlCtrl.clear();
      _weedControlCtrl.clear();
      if (preservedMonitoringFieldRecord != null) {
        _sectionNameCtrl.clear();
        _fieldIdCtrl.clear();
        _blockIdCtrl.clear();
        _fieldNameCtrl.clear();
        _selectedBlockHectares = null;
        _setAreaFieldValue(null);
      } else if (preservedBlock != null) {
        _syncSelectedBlockToForm(preservedBlock);
      } else {
        _sectionNameCtrl.clear();
        _fieldIdCtrl.clear();
        _blockIdCtrl.clear();
        _fieldNameCtrl.clear();
        _selectedBlockHectares = null;
        _setAreaFieldValue(null);
      }
    });

    if (preservedMonitoringFieldRecord != null) {
      _applyMonitoringFieldRecord(preservedMonitoringFieldRecord);
      return;
    }

    _checkBlockProximity();
    unawaited(_saveDraft());
  }

  void _startUpdatingSavedFieldRecord({
    bool showFeedback = true,
    bool keepDateRecorded = false,
    bool adoptSavedRecordIdentity = true,
  }) {
    final latestRecord = _selectedFieldLatestObservation;
    if (latestRecord == null) return;

    final normalized = normalizeObservationPayload(latestRecord);
    final fieldIdentification = Map<String, dynamic>.from(
      normalized['field_identification'] ?? const {},
    );
    final cropInformation = Map<String, dynamic>.from(
      normalized['crop_information'] ?? const {},
    );
    final soilCharacteristics = Map<String, dynamic>.from(
      normalized['soil_characteristics'] ?? const {},
    );
    final irrigationManagement = Map<String, dynamic>.from(
      normalized['irrigation_management'] ?? const {},
    );
    final nutrientManagement = Map<String, dynamic>.from(
      normalized['nutrient_management'] ?? const {},
    );
    final weedManagement = Map<String, dynamic>.from(
      normalized['weed_management'] ?? const {},
    );
    final cropProtection = Map<String, dynamic>.from(
      normalized['crop_protection'] ?? const {},
    );
    final controlMethods = Map<String, dynamic>.from(
      normalized['control_methods'] ?? const {},
    );
    final harvestInformation = Map<String, dynamic>.from(
      normalized['harvest_information'] ?? const {},
    );
    final cropMonitoring = Map<String, dynamic>.from(
      normalized['crop_monitoring'] ?? const {},
    );
    final residualManagement = Map<String, dynamic>.from(
      normalized['residual_management'] ?? const {},
    );
    final matchedBlock = _findBlockBySelectionValue(
      fieldIdentification['block_id']?.toString(),
    );
    final monitoringRowId = _toNullableInt(
      fieldIdentification['monitoring_row_id'],
    );
    final savedArea = _toNullableDouble(
      fieldIdentification['area'] ?? normalized['block_size'],
    );
    final recordedAt = _tryParseDate(
      fieldIdentification['date_recorded'] ?? normalized['created_at'],
    );
    final currentFieldId = _fieldIdCtrl.text.trim();
    final currentBlockId = _blockIdCtrl.text.trim();
    final visibleFieldId = currentFieldId.isNotEmpty
        ? currentFieldId
        : fieldIdentification['field_id']?.toString() ??
              fieldIdentification['field_name']?.toString() ??
              '';
    final visibleBlockId = currentBlockId.isNotEmpty
        ? currentBlockId
        : fieldIdentification['block_id']?.toString() ?? '';

    setState(() {
      if (matchedBlock != null) {
        _syncSelectedBlockToForm(matchedBlock, preserveFieldName: true);
      } else {
        _selectedBlockHectares = savedArea;
        _setAreaFieldValue(savedArea);
      }

      if (adoptSavedRecordIdentity) {
        _editingSourceObservation = normalized;
        _editingLocalObservationId = _selectedFieldLatestObservationLocalId;
        _editingMonitoringRowId = monitoringRowId;
        _editingClientUuid = normalized['client_uuid']?.toString().trim();
        _editingCreatedAt = _tryParseDate(normalized['created_at']);
      } else {
        _editingSourceObservation = null;
        _editingLocalObservationId = null;
        _editingMonitoringRowId = null;
        _editingClientUuid = null;
        _editingCreatedAt = null;
      }
      _dateRecorded = keepDateRecorded
          ? (_dateRecorded ?? DateTime.now())
          : (recordedAt ?? _dateRecorded ?? DateTime.now());
      if (adoptSavedRecordIdentity) {
        _selectedMonitoringFieldRecordId = monitoringRowId;
        _selectedMonitoringFieldRecord =
            _findMonitoringFieldRecordById(monitoringRowId) ??
            _selectedMonitoringFieldRecord;
      }

      _fieldIdCtrl.text = visibleFieldId;
      _blockIdCtrl.text = visibleBlockId;
      _fieldNameCtrl.text =
          fieldIdentification['field_name']?.toString() ?? visibleFieldId;
      if (matchedBlock != null) {
        _setAreaFieldValue(_selectedBlockHectares);
      }
      _trialNumberCtrl.text =
          fieldIdentification['trial_number']?.toString() ?? '';
      _trialNameCtrl.text = fieldIdentification['trial_name']?.toString() ?? '';
      _contactPersonCtrl.text =
          fieldIdentification['contact_person']?.toString() ??
          fieldIdentification['contact_person_scientist']?.toString() ??
          '';
      _cropTypeCtrl.text = _normalizeCropTypeValue(
        cropInformation['crop_type']?.toString(),
      );
      _syncCropClassForCropType(
        cropClass: cropInformation['crop_class']?.toString(),
      );
      _cropYieldCtrl.clear();
      _plantingDate = _tryParseDate(cropInformation['planting_date']);
      _cuttingDate = _tryParseDate(
        cropInformation['previous_cutting_date'] ??
            cropInformation['cutting_date'],
      );
      _actualCuttingDate = null;
      _expectedHarvestDate = _tryParseDate(
        cropInformation['expected_harvest_date'],
      );
      _irrigationTypeCtrl.text = _normalizeDropdownValue(
        irrigationManagement['irrigation_type']?.toString(),
        _irrigationTypeOptions,
      );
      _waterSourceCtrl.text = _normalizeDropdownValue(
        irrigationManagement['water_source']?.toString(),
        _waterSourceOptions,
      );
      _tamMmCtrl.text =
          fieldIdentification['tam_mm']?.toString() ??
          fieldIdentification['time']?.toString() ??
          '';
      _soilTypeCtrl.text = _normalizeDropdownValue(
        soilCharacteristics['soil_type']?.toString(),
        _soilTypeOptions,
      );
      _phCtrl.text =
          soilCharacteristics['soil_ph']?.toString() ??
          normalized['pH']?.toString() ??
          '';
      _remarksCtrl.text =
          cropMonitoring['remarks']?.toString() ??
          normalized['field_remarks']?.toString() ??
          residualManagement['remarks']?.toString() ??
          '';
      _harvestDate = _tryParseDate(harvestInformation['harvest_date']);
      _harvestYieldCtrl.text = harvestInformation['yield']?.toString() ?? '';
      _caneQualityRemarksCtrl.text =
          harvestInformation['cane_quality_remarks']?.toString() ??
          normalized['quality_remarks']?.toString() ??
          '';
      _residueTypeCtrl.text = _normalizeDropdownValue(
        residualManagement['residue_type']?.toString(),
        _residueTypeOptions,
        fallback: _residueTypeOptions.last,
      );
      _managementMethodCtrl.text = _normalizeDropdownValue(
        residualManagement['management_method']?.toString() ??
            normalized['residue_management_method']?.toString(),
        _residueManagementMethodOptions,
        fallback: _residueManagementMethodOptions.last,
      );
      _residualRemarksCtrl.text =
          residualManagement['remarks']?.toString() ?? '';
      _fertilizerTypeCtrl.text =
          nutrientManagement['fertilizer_type']?.toString() ?? '';
      _applicationDate = _tryParseDate(
        nutrientManagement['application_date'] ??
            normalized['nutrient_application_date'],
      );
      _applicationRateCtrl.text =
          nutrientManagement['application_rate']?.toString() ?? '';
      _foliarSamplingDate = _tryParseDate(
        nutrientManagement['foliar_sampling_date'],
      );
      _weedControlCtrl.text =
          weedManagement['herbicide_name']?.toString() ??
          controlMethods['weed_control']?.toString() ??
          '';
      _weedApplicationDate = _tryParseDate(weedManagement['application_date']);
      _weedApplicationRateCtrl.text =
          weedManagement['application_rate']?.toString() ?? '';
      _pestControlCtrl.text =
          cropProtection['pest_remarks']?.toString() ??
          controlMethods['pest_control']?.toString() ??
          '';
      _diseaseControlCtrl.text =
          cropProtection['disease_remarks']?.toString() ??
          controlMethods['disease_control']?.toString() ??
          '';
    });

    _checkBlockProximity();
    unawaited(_saveDraft());

    if (!mounted || !showFeedback) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Current saved information loaded. Update what changed, then save.',
        ),
        backgroundColor: Color(0xFF2E7D32),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _fetchBlocks() async {
    if (mounted) {
      setState(() {
        _isLoadingBlocks = true;
        _blocksStatusMessage = null;
      });
    }

    try {
      await _localDb.ensureBlocksCacheMatchesSource(SupabaseConfig.url);
      List<Map<String, dynamic>> blocksData = await _localDb.getAllBlocks();

      try {
        final supabase = SupabaseService();
        final remoteBlocks = await supabase.fetchBlocks();
        await _localDb.syncBlocks(remoteBlocks);
        blocksData = remoteBlocks;
      } catch (e) {
        debugPrint('Error refreshing blocks from Supabase: $e');
      }

      debugPrint(
        'DEBUG Obs Form: Loaded ${blocksData.length} blocks from database',
      );
      for (int i = 0; i < blocksData.length && i < 5; i++) {
        debugPrint('DEBUG Obs Form: Block $i: ${blocksData[i]}');
      }
      final availableBlocks =
          blocksData.map((e) => BlockModel.fromMap(e)).toList()..sort(
            (a, b) => _fieldLabelForBlock(
              a,
            ).toLowerCase().compareTo(_fieldLabelForBlock(b).toLowerCase()),
          );

      BlockModel? matchedBlock;
      if (_blockIdCtrl.text.isNotEmpty) {
        matchedBlock = _findBlockBySelectionValue(
          _blockIdCtrl.text,
          blocks: availableBlocks,
        );
      }

      setState(() {
        _availableBlocks = availableBlocks;
        _isLoadingBlocks = false;
        _blocksStatusMessage = availableBlocks.isEmpty
            ? 'No field labels were found. Pull to retry or sync blocks first.'
            : null;
        if (matchedBlock != null) {
          _syncSelectedBlockToForm(matchedBlock, preserveFieldName: true);
        } else {
          _selectedBlock = null;
          _selectedBlockHectares = null;
          _setAreaFieldValue(null);
        }
        debugPrint(
          'DEBUG Obs Form: Converted to ${_availableBlocks.length} BlockModels',
        );
      });
      _checkBlockProximity();
    } catch (e) {
      debugPrint('Error fetching blocks: $e');
      if (!mounted) return;
      setState(() {
        _isLoadingBlocks = false;
        _blocksStatusMessage =
            'Unable to load field labels. Check sync or database access.';
      });
    }
  }

  Future<void> _fetchMonitoringFields({bool restoreSelection = true}) async {
    if (mounted) {
      setState(() {
        _isLoadingMonitoringFields = true;
        _monitoringFieldsStatusMessage = null;
      });
    }

    try {
      final records = await SupabaseService().fetchSugarcaneMonitoringFields();

      if (!mounted) return;
      setState(() {
        _availableMonitoringFields = records;
        _isLoadingMonitoringFields = false;
        _monitoringFieldsStatusMessage = records.isEmpty
            ? 'No imported field rows were found in sugarcane_monitoring.'
            : null;
      });

      if (!restoreSelection) return;

      final selectedId = _selectedMonitoringFieldRecordId;
      Map<String, dynamic>? selectedRecord = _findMonitoringFieldRecordById(
        selectedId,
      );
      if (selectedRecord == null) {
        for (final record in _availableMonitoringFields) {
          final fieldId = _monitoringFieldIdLabel(record);
          final blockId = _monitoringFieldBlockId(record);
          if (fieldId != _fieldIdCtrl.text.trim()) continue;
          if (_blockIdCtrl.text.trim().isNotEmpty &&
              blockId != _blockIdCtrl.text.trim()) {
            continue;
          }
          selectedRecord = record;
          break;
        }
      }
      if (selectedRecord != null) {
        _applyMonitoringFieldSelection(
          selectedRecord,
          refreshSavedFieldRecord: false,
        );
      } else if (_selectedMonitoringFieldRecordId != null ||
          _selectedMonitoringFieldRecord != null) {
        setState(() {
          _selectedMonitoringFieldRecordId = null;
          _selectedMonitoringFieldRecord = null;
        });
        unawaited(_saveDraft());
      }
    } catch (e) {
      debugPrint('Error fetching sugarcane monitoring rows: $e');
      if (!mounted) return;
      setState(() {
        _availableMonitoringFields = [];
        _isLoadingMonitoringFields = false;
        _monitoringFieldsStatusMessage =
            'Unable to load imported field rows from Supabase.';
      });
    }
  }

  Future<bool> _ensureLocationAccess() async {
    final servicesEnabled = await Geolocator.isLocationServiceEnabled();
    if (!servicesEnabled) {
      if (mounted) {
        setState(() {
          _isCollectingLocation = false;
          _locationStatusMessage =
              'Enable location services to auto-capture GPS.';
        });
      }
      return false;
    }

    final permission = await Permission.location.request();
    if (!permission.isGranted) {
      if (mounted) {
        setState(() {
          _isCollectingLocation = false;
          _locationStatusMessage = permission.isPermanentlyDenied
              ? 'Location permission is blocked. Enable it in app settings.'
              : 'Location permission is required to auto-capture GPS.';
        });
      }
      return false;
    }

    return true;
  }

  bool _shouldPersistPosition(Position position) {
    if (_currentPosition == null) return true;

    final movedMeters = Geolocator.distanceBetween(
      _currentPosition!.latitude,
      _currentPosition!.longitude,
      position.latitude,
      position.longitude,
    );
    final accuracyImproved = position.accuracy + 1 < _currentPosition!.accuracy;

    return movedMeters >= 3 || accuracyImproved;
  }

  void _handleLocationUpdate(Position position) {
    final shouldPersist = _shouldPersistPosition(position);

    if (!mounted) return;

    setState(() {
      _currentPosition = position;
      _isCollectingLocation = false;
      _locationStatusMessage = null;
    });
    _checkBlockProximity();

    if (shouldPersist) {
      _saveDraft();
    }
  }

  Future<void> _startAutoLocationTracking() async {
    if (mounted) {
      setState(() {
        _isCollectingLocation = true;
        _locationStatusMessage = null;
      });
    }

    if (!await _ensureLocationAccess()) return;

    try {
      final lastKnown = await Geolocator.getLastKnownPosition();
      if (lastKnown != null) {
        _handleLocationUpdate(lastKnown);
      }
    } catch (e) {
      debugPrint('Error loading last known location: $e');
    }

    await _locationSubscription?.cancel();
    _locationSubscription =
        Geolocator.getPositionStream(
          locationSettings: _liveLocationSettings,
        ).listen(
          _handleLocationUpdate,
          onError: (Object error) {
            debugPrint('Location stream error: $error');
            if (!mounted) return;
            setState(() {
              _isCollectingLocation = false;
              _locationStatusMessage =
                  'Unable to keep GPS updated automatically.';
            });
          },
        );

    await _getLocation(requireAccessCheck: false, showBusyState: false);
  }

  Future<void> _getLocation({
    bool requireAccessCheck = true,
    bool showBusyState = true,
  }) async {
    if (showBusyState && mounted) {
      setState(() {
        _isCollectingLocation = true;
        _locationStatusMessage = null;
      });
    }

    if (requireAccessCheck && !await _ensureLocationAccess()) return;

    try {
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: _singleFixLocationSettings,
      );
      _handleLocationUpdate(pos);
    } catch (e) {
      debugPrint('Error getting location: $e');
      if (mounted) {
        setState(() {
          _locationStatusMessage =
              'Unable to get a GPS fix yet. Move outdoors or refresh.';
        });
      }
    } finally {
      if (showBusyState && mounted && _currentPosition == null) {
        setState(() => _isCollectingLocation = false);
      }
    }
  }

  void _checkBlockProximity() {
    if (_currentPosition == null) {
      setState(() => _isInsideBlock = false);
      return;
    }

    if (_selectedBlock == null && _availableBlocks.isNotEmpty) {
      BlockModel? matchedBlock;
      for (final block in _availableBlocks) {
        try {
          if (block.geom != null &&
              GeoUtils.isPointInPolygon(
                _currentPosition!.latitude,
                _currentPosition!.longitude,
                block.geom,
              )) {
            matchedBlock = block;
            break;
          }
        } catch (e) {
          debugPrint('Error auto-linking field from GPS: $e');
        }
      }

      if (matchedBlock != null) {
        setState(() {
          _syncSelectedBlockToForm(matchedBlock);
          _isInsideBlock = true;
        });
        unawaited(_saveDraft());
        unawaited(_loadLatestSelectedFieldRecord());
        return;
      }
    }

    if (_selectedBlock == null || _selectedBlock!.geom == null) {
      setState(() => _isInsideBlock = false);
      return;
    }

    try {
      final inside = GeoUtils.isPointInPolygon(
        _currentPosition!.latitude,
        _currentPosition!.longitude,
        _selectedBlock!.geom,
      );
      setState(() => _isInsideBlock = inside);
    } catch (e) {
      debugPrint('Error checking proximity: $e');
    }
  }

  Future<void> _saveDraft() async {
    final Map<String, dynamic> draft = {
      // Field Identification
      'selected_monitoring_field_id': _selectedMonitoringFieldRecordId,
      'field_id': _fieldIdCtrl.text,
      'block_id': _blockIdCtrl.text,
      'field_name': _fieldNameCtrl.text,
      'area': _areaCtrl.text,
      // Basic Info
      'date_recorded': _dateRecorded?.toIso8601String(),
      'trial_number': _trialNumberCtrl.text,
      'trial_name': _trialNameCtrl.text,
      'contact_person': _contactPersonCtrl.text,
      'crop_type': _cropTypeCtrl.text,
      'crop_class': _cropClassCtrl.text,
      'crop_information_yield': _cropYieldCtrl.text,
      // Crop Dates
      'planting_date': _plantingDate?.toIso8601String(),
      'has_planting_date': _plantingDate != null,
      'previous_cutting': _cuttingDate?.toIso8601String(),
      'previous_cutting_date': _cuttingDate?.toIso8601String(),
      'has_cutting_date': _cuttingDate != null,
      'actual_cutting_date': _actualCuttingDate?.toIso8601String(),
      'has_actual_cutting_date': _actualCuttingDate != null,
      'expected_harvest_date': _expectedHarvestDate?.toIso8601String(),
      'has_expected_harvest_date': _expectedHarvestDate != null,
      'harvest_date': _harvestDate?.toIso8601String(),
      'has_harvest_date': _harvestDate != null,
      // Water & Soil
      'irrigation_type': _irrigationTypeCtrl.text,
      'water_source': _waterSourceCtrl.text,
      'tam_mm': _tamMmCtrl.text,
      'soil_type': _soilTypeCtrl.text,
      'pH': _phCtrl.text,
      'ph': _phCtrl.text,
      'field_remarks': _remarksCtrl.text,
      'remarks': _remarksCtrl.text,
      'geom_polygon': _selectedBlock?.geom,
      'harvest_yield': _harvestYieldCtrl.text,
      'quality_remarks': _caneQualityRemarksCtrl.text,
      'cane_quality_remarks': _caneQualityRemarksCtrl.text,
      'residue_type': _residueTypeCtrl.text,
      'residue_management_method': _managementMethodCtrl.text,
      'management_method': _managementMethodCtrl.text,
      'residual_management_remarks': _residualRemarksCtrl.text,
      'fertilizer_type': _fertilizerTypeCtrl.text,
      'nutrient_application_date': _applicationDate?.toIso8601String(),
      'application_date': _applicationDate?.toIso8601String(),
      'has_application_date': _applicationDate != null,
      'application_rate': _applicationRateCtrl.text,
      'foliar_sampling_date': _foliarSamplingDate?.toIso8601String(),
      'has_foliar_sampling_date': _foliarSamplingDate != null,
      'herbicide_name': _weedControlCtrl.text,
      'weed_application_date': _weedApplicationDate?.toIso8601String(),
      'has_weed_application_date': _weedApplicationDate != null,
      'weed_application_rate': _weedApplicationRateCtrl.text,
      'pest_remarks': _pestControlCtrl.text,
      'disease_remarks': _diseaseControlCtrl.text,
    };
    await _localDb.saveDraft('observation_form', draft);
  }

  bool _draftDateWasSelected(Map<String, dynamic> draft, String key) {
    final value = draft[key];
    if (value is bool) return value;
    if (value is String) return value.toLowerCase() == 'true';
    return false;
  }

  DateTime? _readOptionalDraftDate(
    Map<String, dynamic> draft,
    String flagKey,
    dynamic rawValue,
  ) {
    if (!_draftDateWasSelected(draft, flagKey)) return null;
    return _tryParseDate(rawValue);
  }

  Future<void> _loadDraft() async {
    final draft = await _localDb.getDraft('observation_form');
    if (draft != null) {
      setState(() {
        // Field Identification
        _selectedMonitoringFieldRecordId = _toNullableInt(
          draft['selected_monitoring_field_id'],
        );
        _fieldIdCtrl.text = draft['field_id'] ?? '';
        _blockIdCtrl.text = draft['block_id'] ?? '';
        _fieldNameCtrl.text =
            draft['field_name'] ?? draft['field_id'] ?? '';
        _areaCtrl.text = draft['area'] ?? '';

        // Basic Info
        _trialNumberCtrl.text = draft['trial_number'] ?? '';
        _trialNameCtrl.text = draft['trial_name'] ?? '';
        _contactPersonCtrl.text = draft['contact_person'] ?? '';
        _cropTypeCtrl.text = _normalizeCropTypeValue(draft['crop_type']);
        _syncCropClassForCropType(cropClass: draft['crop_class']);
        _cropYieldCtrl.clear();

        // Crop Dates
        _plantingDate = _readOptionalDraftDate(
          draft,
          'has_planting_date',
          draft['planting_date'],
        );
        _cuttingDate = _readOptionalDraftDate(
          draft,
          'has_cutting_date',
          draft['previous_cutting'] ??
              draft['previous_cutting_date'] ??
              draft['cutting_date'],
        );
        _actualCuttingDate = null;
        _expectedHarvestDate = _readOptionalDraftDate(
          draft,
          'has_expected_harvest_date',
          draft['expected_harvest_date'],
        );
        _harvestDate = _readOptionalDraftDate(
          draft,
          'has_harvest_date',
          draft['harvest_date'],
        );

        // Water & Soil
        _irrigationTypeCtrl.text = _normalizeDropdownValue(
          draft['irrigation_type'],
          _irrigationTypeOptions,
        );
        _waterSourceCtrl.text = _normalizeDropdownValue(
          draft['water_source'],
          _waterSourceOptions,
        );
        _tamMmCtrl.text =
            draft['tam_mm'] ?? draft['tamm_area'] ?? draft['time'] ?? '';
        _soilTypeCtrl.text = _normalizeDropdownValue(
          draft['soil_type'],
          _soilTypeOptions,
        );
        _phCtrl.text = draft['pH'] ?? draft['ph'] ?? '';
        _remarksCtrl.text = draft['field_remarks'] ?? draft['remarks'] ?? '';
        _harvestYieldCtrl.text = draft['harvest_yield'] ?? draft['yield'] ?? '';
        _caneQualityRemarksCtrl.text =
            draft['quality_remarks'] ?? draft['cane_quality_remarks'] ?? '';
        _residueTypeCtrl.text = _normalizeDropdownValue(
          draft['residue_type'],
          _residueTypeOptions,
          fallback: _residueTypeOptions.last,
        );
        _managementMethodCtrl.text = _normalizeDropdownValue(
          draft['residue_management_method'] ?? draft['management_method'],
          _residueManagementMethodOptions,
          fallback: _residueManagementMethodOptions.last,
        );
        _residualRemarksCtrl.text = draft['residual_management_remarks'] ?? '';
        _fertilizerTypeCtrl.text = draft['fertilizer_type'] ?? '';
        _applicationDate = _readOptionalDraftDate(
          draft,
          'has_application_date',
          draft['nutrient_application_date'] ?? draft['application_date'],
        );
        _applicationRateCtrl.text = draft['application_rate'] ?? '';
        _foliarSamplingDate = _readOptionalDraftDate(
          draft,
          'has_foliar_sampling_date',
          draft['foliar_sampling_date'],
        );
        _weedControlCtrl.text =
            draft['herbicide_name'] ?? draft['weed_control'] ?? '';
        _weedApplicationDate = _readOptionalDraftDate(
          draft,
          'has_weed_application_date',
          draft['weed_application_date'],
        );
        _weedApplicationRateCtrl.text = draft['weed_application_rate'] ?? '';
        _pestControlCtrl.text =
            draft['pest_remarks'] ?? draft['pest_control'] ?? '';
        _diseaseControlCtrl.text =
            draft['disease_remarks'] ?? draft['disease_control'] ?? '';
        _dateRecorded = _tryParseDate(draft['date_recorded']) ?? DateTime.now();
      });
    }
  }

  bool _hasMeaningfulObservationContent() {
    if (_selectedMonitoringFieldRecordId != null || _selectedBlock != null) {
      return true;
    }

    final textValues = <String>[
      _fieldIdCtrl.text,
      _blockIdCtrl.text,
      _fieldNameCtrl.text,
      _areaCtrl.text,
      _trialNumberCtrl.text,
      _trialNameCtrl.text,
      _contactPersonCtrl.text,
      _cropClassCtrl.text,
      _irrigationTypeCtrl.text,
      _waterSourceCtrl.text,
      _tamMmCtrl.text,
      _soilTypeCtrl.text,
      _phCtrl.text,
      _remarksCtrl.text,
      _harvestYieldCtrl.text,
      _caneQualityRemarksCtrl.text,
      _managementMethodCtrl.text,
      _residualRemarksCtrl.text,
      _fertilizerTypeCtrl.text,
      _applicationRateCtrl.text,
      _weedApplicationRateCtrl.text,
      _weedControlCtrl.text,
      _pestControlCtrl.text,
      _diseaseControlCtrl.text,
    ];

    if (textValues.any((value) => value.trim().isNotEmpty)) {
      return true;
    }

    if (_cropTypeCtrl.text.trim().isNotEmpty &&
        _cropTypeCtrl.text.trim() != _cropTypeOptions.first) {
      return true;
    }

    if (_residueTypeCtrl.text.trim().isNotEmpty &&
        _residueTypeCtrl.text.trim() != _residueTypeOptions.last) {
      return true;
    }

    return _plantingDate != null ||
        _cuttingDate != null ||
        _actualCuttingDate != null ||
        _expectedHarvestDate != null ||
        _harvestDate != null ||
        _applicationDate != null ||
        _foliarSamplingDate != null ||
        _weedApplicationDate != null;
  }

  bool _validateBusinessRules() {
    if (!_hasMeaningfulObservationContent()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Add at least one observation detail before saving.'),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return false;
    }
    return true;
  }

  /// Calculate block size (area) from geometry in hectares
  double? _calculateBlockSize(dynamic geom) {
    try {
      if (geom == null) return null;

      // If it's already a double, return it
      if (geom is double) return geom;
      if (geom is int) return geom.toDouble();

      // If it's a map with area field
      if (geom is Map<String, dynamic>) {
        if (geom.containsKey('area')) {
          final area = geom['area'];
          if (area is num) return area.toDouble();
        }

        // Calculate area from coordinates if it's a GeoJSON polygon
        if (geom['type'] == 'Polygon' && geom['coordinates'] != null) {
          final coords = geom['coordinates'] as List;
          if (coords.isNotEmpty && coords[0] is List) {
            return _calculatePolygonArea(coords[0] as List);
          }
        }
      }
    } catch (e) {
      debugPrint('Error calculating block size: $e');
    }
    return null;
  }

  /// Calculate polygon area in hectares using Shoelace formula with lat/long
  double _calculatePolygonArea(List coordinates) {
    if (coordinates.length < 3) return 0.0;

    double area = 0.0;
    const R = 6371000; // Earth radius in meters

    for (int i = 0; i < coordinates.length - 1; i++) {
      final lat1 = (coordinates[i][1] as num).toDouble() * 3.14159 / 180;
      final lon1 = (coordinates[i][0] as num).toDouble() * 3.14159 / 180;
      final lat2 = (coordinates[i + 1][1] as num).toDouble() * 3.14159 / 180;
      final lon2 = (coordinates[i + 1][0] as num).toDouble() * 3.14159 / 180;

      area += (lon2 - lon1) * (2 + sin(lat1) + sin(lat2));
    }

    area = (area * R * R / 2).abs();
    return area / 10000; // Convert m² to hectares
  }

  Map<String, dynamic> _buildObservationData() {
    final now = DateTime.now();
    final remarks = _remarksCtrl.text.trim();
    final herbicideName = _weedControlCtrl.text.trim();
    final pestRemarks = _pestControlCtrl.text.trim();
    final diseaseRemarks = _diseaseControlCtrl.text.trim();
    final cropClass = _cropClassCtrl.text.trim();
    final cropType = _cropTypeCtrl.text.trim();
    final contactPerson = _contactPersonCtrl.text.trim();
    final trialName = _trialNameCtrl.text.trim();
    final trialNumber = _trialNumberCtrl.text.trim();
    final tamMmValue = _tamMmCtrl.text.trim();
    final nutrientApplicationRate = double.tryParse(
      _applicationRateCtrl.text.trim(),
    );
    final weedApplicationRate = double.tryParse(
      _weedApplicationRateCtrl.text.trim(),
    );
    final harvestYieldAmount = double.tryParse(_harvestYieldCtrl.text.trim());
    final calculatedBlockSize =
        _selectedBlockHectares ?? _calculateBlockSize(_selectedBlock?.geom);
    final observationSeed =
        _isEditingObservation && _editingSourceObservation != null
        ? normalizeObservationPayload(_editingSourceObservation!)
        : ObservationModel(
            clientUuid:
                _editingClientUuid ?? 'offline-${now.millisecondsSinceEpoch}',
            fieldIden: FieldIdentification(
              sectionName: '',
              fieldId: _fieldIdCtrl.text.trim().isEmpty
                  ? null
                  : _fieldIdCtrl.text.trim(),
              blockId: _blockIdCtrl.text.trim(),
              fieldName: _fieldNameCtrl.text.trim(),
              tamMm: tamMmValue.isEmpty ? null : tamMmValue,
              latitude: _currentPosition?.latitude ?? _editingLatitude ?? 0,
              longitude: _currentPosition?.longitude ?? _editingLongitude ?? 0,
              gpsAccuracy:
                  _currentPosition?.accuracy ?? _editingGpsAccuracy ?? 0,
              dateRecorded: _dateRecorded ?? now,
              area: calculatedBlockSize,
              trialNumber: trialNumber.isEmpty ? null : trialNumber,
              trialName: trialName.isEmpty ? null : trialName,
              contactPersonScientist: contactPerson.isEmpty
                  ? null
                  : contactPerson,
            ),
            cropInfo: CropInformation(
              cropType: cropType.isEmpty ? 'Sugarcane' : cropType,
              ratoonNumber: 0,
              variety: '',
              plantingDate: _plantingDate,
              expectedHarvestDate: _expectedHarvestDate,
              cropStage: 'Plant',
              cropClass: cropClass.isEmpty ? null : cropClass,
              cuttingDate: _cuttingDate,
            ),
            monitoring: CropMonitoring(
              vigor: 'Good',
              canopyCover: 0,
              stressType: 'None',
              remarks: remarks,
            ),
            images: const [],
            soil: SoilCharacteristics(
              soilType: _soilTypeCtrl.text.trim(),
              soilTexture: '',
              soilPh: double.tryParse(_phCtrl.text.trim()) ?? 7.0,
              organicMatterContent: 0,
              drainageClass: '',
            ),
            irrigation: IrrigationManagement(
              irrigationType: _irrigationTypeCtrl.text.trim(),
              irrigationDate: null,
              irrigationVolume: 0,
              soilMoisturePercentage: 0,
              waterSourceType: _waterSourceCtrl.text.trim(),
            ),
            nutrient: NutrientManagement(
              fertilizerType: _fertilizerTypeCtrl.text.trim(),
              applicationDate: _applicationDate,
              applicationRate: 0,
              macronutrientNpk: '',
            ),
            protection: CropProtection(
              weedType: '',
              weedPressure: 'Low',
              pestType: '',
              pestSeverity: 'Low',
              diseaseType: '',
              diseaseSeverity: 'Low',
              remarks: '',
            ),
            control: ControlMethods(
              weedControl: '',
              pestControl: '',
              diseaseControl: '',
            ),
            harvest: HarvestInformation(
              harvestDate: _harvestDate,
              yieldAmount: harvestYieldAmount ?? 0,
              harvestMethod: 'Manual',
              caneQualityRemarks: _caneQualityRemarksCtrl.text.trim().isEmpty
                  ? null
                  : _caneQualityRemarksCtrl.text.trim(),
            ),
            residual: ResidualManagement(
              residueType: _residueTypeCtrl.text.trim().isEmpty
                  ? 'None'
                  : _residueTypeCtrl.text.trim(),
              managementMethod: _managementMethodCtrl.text.trim().isEmpty
                  ? 'None'
                  : _managementMethodCtrl.text.trim(),
              remarks: _residualRemarksCtrl.text.trim(),
            ),
            createdAt: _editingCreatedAt ?? now,
            spatialData: _selectedBlock?.geom,
            blockSize: calculatedBlockSize,
          ).toMap();

    final observationData = normalizeObservationPayload(observationSeed);
    final fieldIdentification = Map<String, dynamic>.from(
      observationData['field_identification'] ?? const {},
    );
    final cropInformation = Map<String, dynamic>.from(
      observationData['crop_information'] ?? const {},
    );
    final cropMonitoring = Map<String, dynamic>.from(
      observationData['crop_monitoring'] ?? const {},
    );
    final soilCharacteristics = Map<String, dynamic>.from(
      observationData['soil_characteristics'] ?? const {},
    );
    final irrigationManagement = Map<String, dynamic>.from(
      observationData['irrigation_management'] ?? const {},
    );
    final nutrientManagement = Map<String, dynamic>.from(
      observationData['nutrient_management'] ?? const {},
    );
    final weedManagement = Map<String, dynamic>.from(
      observationData['weed_management'] ?? const {},
    );
    final cropProtection = Map<String, dynamic>.from(
      observationData['crop_protection'] ?? const {},
    );
    final controlMethods = Map<String, dynamic>.from(
      observationData['control_methods'] ?? const {},
    );
    final harvestInformation = Map<String, dynamic>.from(
      observationData['harvest_information'] ?? const {},
    );
    final residualManagement = Map<String, dynamic>.from(
      observationData['residual_management'] ?? const {},
    );

    observationData['client_uuid'] =
        _editingClientUuid ?? observationData['client_uuid'];
    observationData['created_at'] = (_editingCreatedAt ?? now)
        .toIso8601String();

    fieldIdentification.remove('section_name');
    if (_editingMonitoringRowId != null) {
      fieldIdentification['monitoring_row_id'] = _editingMonitoringRowId;
    } else {
      fieldIdentification.remove('monitoring_row_id');
    }
    if (_fieldIdCtrl.text.trim().isNotEmpty) {
      fieldIdentification['field_id'] = _fieldIdCtrl.text.trim();
    } else {
      fieldIdentification.remove('field_id');
    }
    fieldIdentification['block_id'] = _blockIdCtrl.text.trim();
    fieldIdentification['field_name'] = _fieldNameCtrl.text.trim();
    fieldIdentification['latitude'] =
        _currentPosition?.latitude ?? _editingLatitude ?? 0;
    fieldIdentification['longitude'] =
        _currentPosition?.longitude ?? _editingLongitude ?? 0;
    fieldIdentification['gps_accuracy'] =
        _currentPosition?.accuracy ?? _editingGpsAccuracy ?? 0;
    if (_dateRecorded != null) {
      fieldIdentification['date_recorded'] = _dateRecorded!.toIso8601String();
    } else {
      fieldIdentification.remove('date_recorded');
    }
    if (calculatedBlockSize != null) {
      fieldIdentification['area'] = calculatedBlockSize;
    } else {
      fieldIdentification.remove('area');
    }
    if (trialNumber.isNotEmpty) {
      fieldIdentification['trial_number'] = trialNumber;
    } else {
      fieldIdentification.remove('trial_number');
    }
    if (trialName.isNotEmpty) {
      fieldIdentification['trial_name'] = trialName;
    } else {
      fieldIdentification.remove('trial_name');
    }
    if (contactPerson.isNotEmpty) {
      fieldIdentification['contact_person'] = contactPerson;
      fieldIdentification['contact_person_scientist'] = contactPerson;
    } else {
      fieldIdentification.remove('contact_person');
      fieldIdentification.remove('contact_person_scientist');
    }
    if (_selectedBlock?.geom != null) {
      fieldIdentification['geom_polygon'] = _selectedBlock!.geom;
      fieldIdentification['geometry'] = _selectedBlock!.geom;
    }
    if (tamMmValue.isNotEmpty) {
      fieldIdentification['tam_mm'] = tamMmValue;
    } else {
      fieldIdentification.remove('tam_mm');
    }

    cropInformation['crop_type'] = cropType.isEmpty ? 'Sugarcane' : cropType;
    cropInformation['crop_class'] = cropClass.isEmpty ? null : cropClass;
    if (_plantingDate != null) {
      cropInformation['planting_date'] = _plantingDate!.toIso8601String();
    } else {
      cropInformation.remove('planting_date');
    }
    if (_cuttingDate != null) {
      cropInformation['cutting_date'] = _cuttingDate!.toIso8601String();
      cropInformation['previous_cutting_date'] = _cuttingDate!
          .toIso8601String();
    } else {
      cropInformation.remove('cutting_date');
      cropInformation.remove('previous_cutting_date');
    }
    cropInformation.remove('actual_cutting_date');
    if (_expectedHarvestDate != null) {
      cropInformation['expected_harvest_date'] = _expectedHarvestDate!
          .toIso8601String();
    } else {
      cropInformation.remove('expected_harvest_date');
    }
    if ((cropInformation['variety']?.toString().trim() ?? '').isEmpty) {
      cropInformation.remove('variety');
    }
    cropInformation.remove('yield');

    cropMonitoring['remarks'] = remarks;
    observationData['field_remarks'] = remarks;
    soilCharacteristics['soil_type'] = _soilTypeCtrl.text.trim();
    final soilPh = double.tryParse(_phCtrl.text.trim());
    if (soilPh != null) {
      soilCharacteristics['soil_ph'] = soilPh;
      observationData['pH'] = soilPh;
    } else {
      soilCharacteristics.remove('soil_ph');
      observationData.remove('pH');
    }
    irrigationManagement['irrigation_type'] = _irrigationTypeCtrl.text.trim();
    irrigationManagement['water_source'] = _waterSourceCtrl.text.trim();
    irrigationManagement.remove('irrigation_date');
    nutrientManagement['fertilizer_type'] = _fertilizerTypeCtrl.text.trim();
    if (_applicationDate != null) {
      nutrientManagement['application_date'] = _applicationDate!
          .toIso8601String();
      observationData['nutrient_application_date'] = _applicationDate!
          .toIso8601String();
    } else {
      nutrientManagement.remove('application_date');
      observationData.remove('nutrient_application_date');
    }
    if (nutrientApplicationRate != null) {
      nutrientManagement['application_rate'] = nutrientApplicationRate;
    } else {
      nutrientManagement.remove('application_rate');
    }
    if (_foliarSamplingDate != null) {
      nutrientManagement['foliar_sampling_date'] = _foliarSamplingDate!
          .toIso8601String();
    } else {
      nutrientManagement.remove('foliar_sampling_date');
    }

    if (herbicideName.isNotEmpty) {
      weedManagement['herbicide_name'] = herbicideName;
    } else {
      weedManagement.remove('herbicide_name');
    }
    if (_weedApplicationDate != null) {
      weedManagement['application_date'] = _weedApplicationDate!
          .toIso8601String();
    } else {
      weedManagement.remove('application_date');
    }
    if (weedApplicationRate != null) {
      weedManagement['application_rate'] = weedApplicationRate;
    } else {
      weedManagement.remove('application_rate');
    }

    if (pestRemarks.isNotEmpty) {
      cropProtection['pest_remarks'] = pestRemarks;
    } else {
      cropProtection.remove('pest_remarks');
    }
    if (diseaseRemarks.isNotEmpty) {
      cropProtection['disease_remarks'] = diseaseRemarks;
    } else {
      cropProtection.remove('disease_remarks');
    }
    controlMethods.remove('pest_control');
    controlMethods.remove('disease_control');
    controlMethods.remove('weed_control');
    final residualRemarks = _residualRemarksCtrl.text.trim();
    if (residualRemarks.isNotEmpty) {
      residualManagement['remarks'] = residualRemarks;
    } else {
      residualManagement.remove('remarks');
    }
    residualManagement['residue_type'] = _residueTypeCtrl.text.trim().isEmpty
        ? 'None'
        : _residueTypeCtrl.text.trim();
    residualManagement['management_method'] =
        _managementMethodCtrl.text.trim().isEmpty
        ? 'None'
        : _managementMethodCtrl.text.trim();
    observationData['residue_management_method'] =
        residualManagement['management_method'];
    if (_harvestDate != null) {
      harvestInformation['harvest_date'] = _harvestDate!.toIso8601String();
    } else {
      harvestInformation.remove('harvest_date');
    }
    final caneQualityRemarks = _caneQualityRemarksCtrl.text.trim();
    if (caneQualityRemarks.isNotEmpty) {
      harvestInformation['cane_quality_remarks'] = caneQualityRemarks;
      observationData['quality_remarks'] = caneQualityRemarks;
    } else {
      harvestInformation.remove('cane_quality_remarks');
      observationData.remove('quality_remarks');
    }

    if (_selectedBlock?.geom != null) {
      observationData['geom_polygon'] = _selectedBlock!.geom;
      observationData['spatial_data'] = _selectedBlock!.geom;
      observationData['geometry'] = _selectedBlock!.geom;
      fieldIdentification['geom_polygon'] = _selectedBlock!.geom;
      fieldIdentification['geometry'] = _selectedBlock!.geom;
    }

    observationData['field_identification'] = fieldIdentification;
    observationData['crop_information'] = cropInformation;
    observationData['crop_monitoring'] = cropMonitoring;
    observationData['soil_characteristics'] = soilCharacteristics;
    observationData['irrigation_management'] = irrigationManagement;
    observationData['nutrient_management'] = nutrientManagement;
    observationData['weed_management'] = weedManagement;
    observationData['crop_protection'] = cropProtection;
    observationData['control_methods'] = controlMethods;
    if (harvestYieldAmount != null) {
      harvestInformation['yield'] = harvestYieldAmount;
    } else {
      harvestInformation.remove('yield');
    }
    observationData['harvest_information'] = harvestInformation;
    observationData['residual_management'] = residualManagement;
    observationData.remove('comments');
    if (calculatedBlockSize != null) {
      observationData['block_size'] = calculatedBlockSize;
    } else {
      observationData.remove('block_size');
    }
    return normalizeObservationPayload(observationData);
  }

  // Helper for validating and normalizing enums
  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_validateBusinessRules()) return;

    setState(() => _submitting = true);

    try {
      final syncProvider = context.read<SyncProvider>();

      // Force recheck connectivity before determining online status
      await syncProvider.recheckConnectivity();
      final isDatabaseConnected = syncProvider.isDatabaseConnected;
      final canAttemptSync = syncProvider.canAttemptSync;
      final connectionIssue = canAttemptSync
          ? 'Cloud verification is limited right now. The record will keep retrying in the background.'
          : syncProvider.connectionIssueMessage ??
                'Database connection is not available right now.';

      debugPrint(
        'Submit: Connectivity recheck complete. isDatabaseConnected = $isDatabaseConnected, canAttemptSync = $canAttemptSync',
      );

      final supabase = SupabaseService();
      final localDb = _localDb;

      final observationData = _buildObservationData();
      final fingerprint =
          observationData['record_fingerprint']?.toString() ??
          buildObservationFingerprint(observationData);
      observationData['record_fingerprint'] = fingerprint;

      bool savedSuccessfully = false;

      final isEditing = _isEditingObservation;
      final isMonitoringRowUpdate = _editingMonitoringRowId != null;
      final selectedFieldId = _fieldIdCtrl.text.trim();
      final selectedBlockId = _blockIdCtrl.text.trim();
      final localDuplicate = await localDb.hasObservationFingerprint(
        fingerprint,
        excludeLocalId: _editingLocalObservationId,
        excludeClientUuid: _editingClientUuid,
      );

      if (_matchesLatestSelectedFieldInformation(observationData)) {
        if (!_isEditingSelectedFieldLatestRecord &&
            _selectedFieldLatestObservation != null) {
          _startUpdatingSavedFieldRecord(showFeedback: false);
        }
        _showExistingFieldSnackBar();
        return;
      }

      if (localDuplicate) {
        _showExistingFieldSnackBar();
        return;
      }

      // If we are online, try to save directly to Supabase
      if (isDatabaseConnected) {
        final remoteDuplicate = await supabase.observationExistsByFingerprint(
          fingerprint,
          monitoringRowId: isMonitoringRowUpdate
              ? _editingMonitoringRowId
              : null,
          fieldId: selectedFieldId.isEmpty ? null : selectedFieldId,
          blockId: selectedBlockId.isEmpty ? null : selectedBlockId,
          excludeMonitoringRowId: _editingMonitoringRowId,
        );

        if (remoteDuplicate) {
          _showExistingFieldSnackBar();
          return;
        }

        try {
          await supabase.saveObservation(observationData);
          if (isEditing) {
            await localDb.saveOrUpdateObservation(
              observationData,
              localId: _editingLocalObservationId,
              synced: true,
            );
          }
          savedSuccessfully = true;
          debugPrint('Successfully synced to Supabase!');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  isEditing
                      ? 'Observation updated in the database.'
                      : 'Saved to the database.',
                ),
                backgroundColor: const Color(0xFF2E7D32),
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        } on DuplicateObservationException {
          _showExistingFieldSnackBar();
        } catch (e) {
          debugPrint('Online save failed: $e. Saving locally for sync.');
          await localDb.saveOrUpdateObservation(
            observationData,
            localId: _editingLocalObservationId,
            synced: false,
          );
          savedSuccessfully = true;

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  isEditing
                      ? 'Updated locally. Online upload failed: $e'
                      : 'Saved locally. Online upload failed: $e',
                ),
                backgroundColor: Colors.orange,
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        }
      } else {
        await localDb.saveOrUpdateObservation(
          observationData,
          localId: _editingLocalObservationId,
          synced: false,
        );
        savedSuccessfully = true;
        debugPrint('Saved locally (Database unavailable)');

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                syncProvider.hasNetworkConnection
                    ? (canAttemptSync
                          ? (_isEditingObservation
                                ? 'Updated locally. $connectionIssue'
                                : 'Saved locally. $connectionIssue')
                          : (_isEditingObservation
                                ? 'Updated locally. Sync blocked: $connectionIssue'
                                : 'Saved locally. Sync blocked: $connectionIssue'))
                    : (_isEditingObservation
                          ? 'Updated locally (Offline) - will sync when online'
                          : 'Saved locally (Offline) - will sync when online'),
              ),
              backgroundColor: Colors.amber,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }

      if (savedSuccessfully) {
        await localDb.clearDraft('observation_form');
        await syncProvider.checkUnsynced();
        if (syncProvider.unsyncedCount > 0) {
          unawaited(syncProvider.startSync());
        }
        if (mounted) Navigator.pop(context);
      }
    } catch (e) {
      debugPrint('Critical Submission Error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error saving data: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  void dispose() {
    _locationSubscription?.cancel();
    // Field Identification
    _sectionNameCtrl.dispose();
    _fieldIdCtrl.dispose();
    _blockIdCtrl.dispose();
    _fieldNameCtrl.dispose();
    _areaCtrl.dispose();
    // Basic Info
    _trialNumberCtrl.dispose();
    _trialNameCtrl.dispose();
    _contactPersonCtrl.dispose();
    _cropTypeCtrl.dispose();
    _cropClassCtrl.dispose();
    _cropYieldCtrl.dispose();
    // Water & Soil
    _irrigationTypeCtrl.dispose();
    _waterSourceCtrl.dispose();
    _tamMmCtrl.dispose();
    _soilTypeCtrl.dispose();
    _phCtrl.dispose();
    _remarksCtrl.dispose();
    _harvestYieldCtrl.dispose();
    _caneQualityRemarksCtrl.dispose();
    _residueTypeCtrl.dispose();
    _managementMethodCtrl.dispose();
    _residualRemarksCtrl.dispose();
    _fertilizerTypeCtrl.dispose();
    _applicationRateCtrl.dispose();
    _weedApplicationRateCtrl.dispose();
    _pestControlCtrl.dispose();
    _diseaseControlCtrl.dispose();
    _weedControlCtrl.dispose();
    super.dispose();
  }

  Widget _buildStyledDatePicker({
    required String label,
    required DateTime? current,
    required ValueChanged<DateTime> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildFieldLabel(label: label),
          InkWell(
            onTap: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: current ?? DateTime.now(),
                firstDate: DateTime(2000),
                lastDate: DateTime(2100),
                builder: (context, child) => Theme(
                  data: Theme.of(context).copyWith(
                    colorScheme: const ColorScheme.light(
                      primary: AppColors.primaryGreen,
                      onPrimary: Colors.white,
                      surface: Colors.white,
                      onSurface: AppColors.textDark,
                    ),
                  ),
                  child: child!,
                ),
              );
              if (picked != null) {
                onChanged(picked);
                unawaited(_saveDraft());
              }
            },
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppColors.inputFieldGray.withValues(alpha: 0.96),
                    Colors.white.withValues(alpha: 0.92),
                  ],
                ),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: AppColors.borderSoft),
                boxShadow: AppTheme.softShadow(AppColors.lightGreen),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              child: Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: AppColors.warmGradient,
                      ),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(
                      Icons.calendar_today_rounded,
                      color: AppColors.forestGreen,
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _formatDatePickerText(current),
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: current == null
                            ? AppColors.textGray
                            : AppColors.textDark,
                      ),
                    ),
                  ),
                  Container(
                    width: 30,
                    height: 30,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.92),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.arrow_forward_ios_rounded,
                      color: AppColors.textGray,
                      size: 13,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Observation Form',
              style: TextStyle(
                color: AppColors.textDark,
                fontWeight: FontWeight.w900,
                fontSize: 22,
                letterSpacing: -0.4,
              ),
            ),
            Text(
              'GIS field observation',
              style: TextStyle(
                color: AppColors.textGray,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
      body: BotanicalBackground(
        textureOpacity: 0.1,
        textureAlignment: Alignment.topRight,
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 148),
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildPage(
                  'Observation',
                  Icons.assignment_rounded,
                  '',
                  _buildContinuousObservationChildren(),
                ),
              ],
            ),
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(18, 10, 18, 18),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Colors.white.withValues(alpha: 0.80),
                Colors.white.withValues(alpha: 0.98),
              ],
            ),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(30)),
            boxShadow: AppTheme.softShadow(AppColors.lightGreen),
          ),
          child: SizedBox(
            width: double.infinity,
            height: 52,
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: AppColors.primaryGradient,
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: AppTheme.softShadow(AppColors.primaryGreen),
              ),
              child: ElevatedButton(
                onPressed: _submitting ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(24),
                  ),
                ),
                child: _submitting
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          color: Colors.white,
                        ),
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            _isEditingObservation
                                ? 'Update Observation'
                                : 'Save Observation',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(width: 8),
                          Icon(
                            _isEditingObservation
                                ? Icons.sync_rounded
                                : Icons.check_rounded,
                            size: 16,
                          ),
                        ],
                      ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildContinuousObservationChildren() {
    return [
      _buildContinuousSectionTitle('1. Field Information'),
      _isLoadingBlocks || _isLoadingMonitoringFields
          ? const Padding(
              padding: EdgeInsets.only(bottom: 20),
              child: LinearProgressIndicator(color: AppColors.primaryGreen),
            )
          : const SizedBox.shrink(),
      _availableMonitoringFields.isEmpty && !_isLoadingMonitoringFields
          ? _buildMonitoringFieldsEmptyState()
          : _buildStyledMonitoringFieldDropdown(
              label: 'Field ID',
              icon: Icons.grid_view_rounded,
              options: _availableMonitoringFields,
              currentValue: _selectedMonitoringFieldRecordId,
              onChanged: (value) {
                final selectedRecord = _findMonitoringFieldRecordById(value);
                if (selectedRecord == null) return;
                _applyMonitoringFieldSelection(selectedRecord);
              },
            ),
      _buildResponsivePair(
        _buildStyledTextField(
          label: 'Block ID',
          controller: _blockIdCtrl,
          icon: Icons.tag_rounded,
          readOnly: true,
          hintText: 'Filled from the selected Field ID',
        ),
        _buildStyledTextField(
          label: 'Area (ha)',
          controller: _areaCtrl,
          icon: Icons.square_foot_rounded,
          readOnly: true,
          hintText: 'Filled from the selected Field ID',
        ),
      ),
      _buildResponsivePair(
        _buildStyledOptionDropdown(
          label: 'Irrigation Type',
          controller: _irrigationTypeCtrl,
          icon: Icons.opacity_rounded,
          options: _irrigationTypeOptions,
        ),
        _buildStyledOptionDropdown(
          label: 'Water Source',
          controller: _waterSourceCtrl,
          icon: Icons.water_drop_rounded,
          options: _waterSourceOptions,
        ),
      ),
      _buildResponsivePair(
        _buildStyledTextField(
          label: 'TAM',
          controller: _tamMmCtrl,
          icon: Icons.access_time_rounded,
        ),
        _buildStyledOptionDropdown(
          label: 'Soil Type',
          controller: _soilTypeCtrl,
          icon: Icons.terrain_rounded,
          options: _soilTypeOptions,
        ),
      ),
      _buildStyledTextField(
        label: 'pH',
        controller: _phCtrl,
        icon: Icons.science_rounded,
        isNumber: true,
      ),
      _buildStyledTextField(
        label: 'Field Remarks',
        controller: _remarksCtrl,
        icon: Icons.note_rounded,
        maxLines: 3,
      ),
      _buildStyledValueField(
        label: 'Geom Polygon',
        value: _geometryPolygonStatus(),
        icon: Icons.polyline_rounded,
      ),
      _buildContinuousSectionTitle('2. Trial Information'),
      _buildResponsivePair(
        _buildStyledTextField(
          label: 'Trial Number',
          controller: _trialNumberCtrl,
          icon: Icons.numbers_rounded,
        ),
        _buildStyledTextField(
          label: 'Trial Name',
          controller: _trialNameCtrl,
          icon: Icons.label_rounded,
        ),
      ),
      _buildStyledTextField(
        label: 'Contact Person',
        controller: _contactPersonCtrl,
        icon: Icons.person_rounded,
      ),
      _buildStyledDatePicker(
        label: 'Date Recorded',
        current: _dateRecorded,
        onChanged: (d) => setState(() => _dateRecorded = d),
      ),
      _buildContinuousSectionTitle('3. Crop Information'),
      _buildResponsivePair(
        _buildStyledOptionDropdown(
          label: 'Crop Type',
          controller: _cropTypeCtrl,
          icon: Icons.local_florist_rounded,
          options: _cropTypeOptions,
          onChanged: (value) {
            _cropTypeCtrl.text = value ?? _cropTypeOptions.first;
            _syncCropClassForCropType();
          },
        ),
        _buildStyledOptionDropdown(
          label: 'Crop Class',
          controller: _cropClassCtrl,
          icon: Icons.category_rounded,
          options: _cropClassOptionsForType(_cropTypeCtrl.text),
        ),
      ),
      _buildStyledDatePicker(
        label: 'Planting Date',
        current: _plantingDate,
        onChanged: (d) => setState(() => _plantingDate = d),
      ),
      _buildStyledDatePicker(
        label: 'Previous Cutting Date',
        current: _cuttingDate,
        onChanged: (d) => setState(() => _cuttingDate = d),
      ),
      _buildStyledDatePicker(
        label: 'Expected Harvest Date',
        current: _expectedHarvestDate,
        onChanged: (d) => setState(() => _expectedHarvestDate = d),
      ),
      _buildContinuousSectionTitle('4. Residue Management'),
      _buildResponsivePair(
        _buildStyledOptionDropdown(
          label: 'Residue Type',
          controller: _residueTypeCtrl,
          icon: Icons.layers_rounded,
          options: _residueTypeOptions,
        ),
        _buildStyledOptionDropdown(
          label: 'Residue Management Method',
          controller: _managementMethodCtrl,
          icon: Icons.settings_rounded,
          options: _residueManagementMethodOptions,
        ),
      ),
      _buildStyledTextField(
        label: 'Residue Remarks',
        controller: _residualRemarksCtrl,
        icon: Icons.sticky_note_2_rounded,
        maxLines: 3,
      ),
      _buildContinuousSectionTitle('5. Nutrient Management'),
      _buildStyledTextField(
        label: 'Fertilizer Type',
        controller: _fertilizerTypeCtrl,
        icon: Icons.compost_rounded,
      ),
      _buildStyledDatePicker(
        label: 'Nutrient Application Date',
        current: _applicationDate,
        onChanged: (d) => setState(() => _applicationDate = d),
      ),
      _buildStyledTextField(
        label: 'Application Rate',
        controller: _applicationRateCtrl,
        icon: Icons.scale_rounded,
        isNumber: true,
      ),
      _buildStyledDatePicker(
        label: 'Foliar Sampling Date',
        current: _foliarSamplingDate,
        onChanged: (d) => setState(() => _foliarSamplingDate = d),
      ),
      _buildContinuousSectionTitle('6. Weed Management'),
      _buildStyledTextField(
        label: 'Herbicide Name',
        controller: _weedControlCtrl,
        icon: Icons.grass_rounded,
      ),
      _buildStyledDatePicker(
        label: 'Weed Application Date',
        current: _weedApplicationDate,
        onChanged: (d) => setState(() => _weedApplicationDate = d),
      ),
      _buildStyledTextField(
        label: 'Weed Application Rate',
        controller: _weedApplicationRateCtrl,
        icon: Icons.straighten_rounded,
        isNumber: true,
      ),
      _buildContinuousSectionTitle('7. Crop Protection'),
      _buildStyledTextField(
        label: 'Pest Remarks',
        controller: _pestControlCtrl,
        icon: Icons.pest_control_rounded,
        maxLines: 3,
      ),
      _buildStyledTextField(
        label: 'Disease Remarks',
        controller: _diseaseControlCtrl,
        icon: Icons.healing_rounded,
        maxLines: 3,
      ),
      _buildContinuousSectionTitle('8. Harvest Information'),
      _buildStyledDatePicker(
        label: 'Harvest Date',
        current: _harvestDate,
        onChanged: (d) => setState(() => _harvestDate = d),
      ),
      _buildStyledTextField(
        label: 'Yield',
        controller: _harvestYieldCtrl,
        icon: Icons.show_chart_rounded,
        isNumber: true,
      ),
      _buildStyledTextField(
        label: 'Quality Remarks',
        controller: _caneQualityRemarksCtrl,
        icon: Icons.rate_review_rounded,
        maxLines: 4,
      ),
    ];
  }

  Widget _buildContinuousSectionTitle(String title, [String? helper]) {
    return Padding(
      padding: const EdgeInsets.only(top: 12, bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 10,
                height: 10,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.primaryGreen,
                ),
              ),
              const SizedBox(width: 10),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w900,
                  color: AppColors.textDark,
                  letterSpacing: -0.2,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(height: 1, color: AppColors.borderSoft),
              ),
            ],
          ),
          if (helper != null && helper.trim().isNotEmpty) ...[
            const SizedBox(height: 6),
            Padding(
              padding: const EdgeInsets.only(left: 20),
              child: Text(
                helper,
                style: const TextStyle(
                  fontSize: 12,
                  height: 1.4,
                  color: AppColors.textGray,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildFormHero() {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.white.withValues(alpha: 0.96),
            AppColors.softCream.withValues(alpha: 0.96),
            AppColors.coolGradient.first.withValues(alpha: 0.34),
          ],
        ),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: Colors.white),
        boxShadow: AppTheme.softShadow(AppColors.peach),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildHeroChip(
                      icon: Icons.edit_note_rounded,
                      label: _isEditingObservation
                          ? 'Editing record'
                          : 'New record',
                      background: _isEditingObservation
                          ? AppColors.coolGradient.first
                          : AppColors.softCream,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      _isEditingObservation
                          ? 'Update the observation'
                          : 'Observation form',
                      style: const TextStyle(
                        fontSize: 23,
                        height: 1.1,
                        letterSpacing: -0.6,
                        fontWeight: FontWeight.w900,
                        color: AppColors.textDark,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _isEditingObservation
                          ? 'Keep the layout clean, update only what changed, then save.'
                          : 'A streamlined continuous form with only the main observation inputs.',
                      style: const TextStyle(
                        fontSize: 12.5,
                        height: 1.4,
                        color: AppColors.textGray,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 14),
              Container(
                width: 58,
                height: 58,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: AppColors.coolGradient,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: AppTheme.softShadow(AppColors.dewBlue),
                ),
                child: const Icon(
                  Icons.assignment_turned_in_rounded,
                  color: AppColors.forestGreen,
                  size: 28,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _buildHeroChip(
                icon: Icons.calendar_month_rounded,
                label: _formatOptionalShortDate(_dateRecorded),
                background: Colors.white.withValues(alpha: 0.88),
              ),
              _buildHeroChip(
                icon: Icons.gps_fixed,
                label: _currentPosition == null
                    ? (_hasSavedGpsForEditing ? 'Saved GPS' : 'GPS warming up')
                    : 'GPS live',
                background: _currentPosition == null
                    ? (_hasSavedGpsForEditing
                          ? AppColors.coolGradient.first
                          : AppColors.softCream)
                    : AppColors.sageGreen,
              ),
              _buildHeroChip(
                icon: Icons.grid_view_rounded,
                label: _selectedBlock == null
                    ? 'No field selected'
                    : 'Field linked',
                background: _selectedBlock == null
                    ? AppColors.softCream
                    : AppColors.coolGradient.first,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRemovedFormHero() {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.white.withValues(alpha: 0.96),
            AppColors.softCream.withValues(alpha: 0.96),
            AppColors.coolGradient.first.withValues(alpha: 0.24),
          ],
        ),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: Colors.white),
        boxShadow: AppTheme.softShadow(AppColors.peach),
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Observation form removed',
            style: TextStyle(
              fontSize: 23,
              height: 1.1,
              letterSpacing: -0.6,
              fontWeight: FontWeight.w900,
              color: AppColors.textDark,
            ),
          ),
          SizedBox(height: 8),
          Text(
            'This screen no longer shows any observation entry fields.',
            style: TextStyle(
              fontSize: 12.5,
              height: 1.4,
              color: AppColors.textGray,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRemovedFormCard() {
    return _buildCard(
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.remove_circle_outline_rounded,
                color: AppColors.forestGreen,
                size: 22,
              ),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Observation form fields removed',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: AppColors.textDark,
                  ),
                ),
              ),
            ],
          ),
          SizedBox(height: 10),
          Text(
            'There are no observation sections, inputs, or save actions on this screen now.',
            style: TextStyle(
              fontSize: 13,
              height: 1.45,
              color: AppColors.textGray,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeroChip({
    required IconData icon,
    required String label,
    required Color background,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppColors.forestGreen),
          const SizedBox(width: 7),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: AppColors.forestGreen,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSavedFieldRecordCard() {
    if (_isLoadingSelectedFieldRecord) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: _buildCard(
          child: const Row(
            children: [
              SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppColors.primaryGreen,
                ),
              ),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Checking for saved information for this field...',
                  style: TextStyle(
                    color: AppColors.textGray,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    final latestRecord = _selectedFieldLatestObservation;
    if (latestRecord == null) {
      return const SizedBox.shrink();
    }
    final recordedAt = _recordedAtFromObservation(latestRecord);
    final sourceLabel = _selectedFieldLatestObservationIsLocal
        ? 'Device copy'
        : 'Cloud record';
    final dateLabel = recordedAt == null
        ? null
        : _formatRecordedDate(recordedAt);

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: _buildCard(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: AppColors.primaryGradient,
                ),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(
                _isEditingSelectedFieldLatestRecord
                    ? Icons.check_circle_rounded
                    : Icons.history_rounded,
                color: Colors.white,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _isEditingSelectedFieldLatestRecord
                        ? 'Editing latest saved record'
                        : 'Latest saved record available',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                      color: AppColors.textDark,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    dateLabel == null
                        ? sourceLabel
                        : '$sourceLabel • $dateLabel',
                    style: const TextStyle(
                      color: AppColors.textGray,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            if (_isEditingSelectedFieldLatestRecord)
              TextButton(
                onPressed: _resetObservationFieldsForNewEntry,
                child: const Text('Blank'),
              )
            else
              FilledButton(
                onPressed: _startUpdatingSavedFieldRecord,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primaryGreen,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 12,
                  ),
                ),
                child: const Text('Edit'),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildPage(
    String title,
    IconData icon,
    String description,
    List<Widget> children,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Colors.white.withValues(alpha: 0.88),
              AppColors.softCream.withValues(alpha: 0.76),
            ],
          ),
          borderRadius: BorderRadius.circular(30),
          border: Border.all(color: Colors.white),
          boxShadow: AppTheme.softShadow(AppColors.lightGreen),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(30),
          child: Stack(
            children: [
              Positioned.fill(
                child: IgnorePointer(
                  child: Opacity(
                    opacity: 0.1,
                    child: Align(
                      alignment: Alignment.topRight,
                      child: Transform.translate(
                        offset: const Offset(42, -24),
                        child: const Image(
                          image: AssetImage('assets/images/tropical_leaves.png'),
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              Positioned(
                right: -38,
                top: -18,
                child: IgnorePointer(
                  child: Container(
                    width: 160,
                    height: 160,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(
                        colors: [
                          AppColors.sageGreen.withValues(alpha: 0.55),
                          AppColors.sageGreen.withValues(alpha: 0),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          AppColors.coolGradient.first.withValues(alpha: 0.58),
                          Colors.white.withValues(alpha: 0.08),
                        ],
                      ),
                      borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(30),
                      ),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 46,
                          height: 46,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: AppColors.coolGradient,
                            ),
                            borderRadius: BorderRadius.circular(18),
                            boxShadow: AppTheme.softShadow(AppColors.dewBlue),
                          ),
                          child: Icon(
                            icon,
                            color: AppColors.forestGreen,
                            size: 22,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                title,
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w900,
                                  color: AppColors.textDark,
                                  letterSpacing: -0.4,
                                ),
                              ),
                              if (description.trim().isNotEmpty) ...[
                                const SizedBox(height: 6),
                                Text(
                                  description,
                                  style: const TextStyle(
                                    fontSize: 12.5,
                                    height: 1.45,
                                    color: AppColors.textGray,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                    child: Column(children: children),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStyledTextField({
    required String label,
    required TextEditingController controller,
    required IconData icon,
    bool required = false,
    bool isNumber = false,
    int maxLines = 1,
    bool readOnly = false,
    String? hintText,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildFieldLabel(label: label, required: required),
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppColors.inputFieldGray.withValues(alpha: 0.96),
                  Colors.white.withValues(alpha: 0.92),
                ],
              ),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppColors.borderSoft),
              boxShadow: AppTheme.softShadow(AppColors.lightGreen),
            ),
            child: TextFormField(
              controller: controller,
              maxLines: maxLines,
              readOnly: readOnly,
              keyboardType: isNumber
                  ? TextInputType.number
                  : TextInputType.text,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: AppColors.textDark,
              ),
              decoration: InputDecoration(
                isDense: true,
                prefixIcon: Padding(
                  padding: const EdgeInsets.only(left: 10, right: 8),
                  child: Container(
                    width: 38,
                    height: 38,
                    margin: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: readOnly
                            ? AppColors.warmGradient
                            : AppColors.coolGradient,
                      ),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(icon, color: AppColors.forestGreen, size: 18),
                  ),
                ),
                prefixIconConstraints: const BoxConstraints(
                  minHeight: 0,
                  minWidth: 0,
                ),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 16,
                ),
                hintText:
                    hintText ??
                    (readOnly
                        ? 'Filled from the selected field'
                        : 'Enter $label'),
                hintStyle: const TextStyle(
                  color: AppColors.textGray,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
              validator: required
                  ? (v) => v == null || v.isEmpty ? 'Required' : null
                  : null,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStyledValueField({
    required String label,
    required String value,
    required IconData icon,
    String placeholder = 'Filled automatically',
  }) {
    final hasValue = value.trim().isNotEmpty;

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildFieldLabel(label: label),
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppColors.inputFieldGray.withValues(alpha: 0.96),
                  Colors.white.withValues(alpha: 0.92),
                ],
              ),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppColors.borderSoft),
              boxShadow: AppTheme.softShadow(AppColors.lightGreen),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: AppColors.warmGradient,
                    ),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(icon, color: AppColors.forestGreen, size: 18),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    hasValue ? value : placeholder,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: hasValue ? AppColors.textDark : AppColors.textGray,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildResponsivePair(Widget left, Widget right) {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth < 340) {
          return Column(children: [left, right]);
        }

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: left),
            const SizedBox(width: 12),
            Expanded(child: right),
          ],
        );
      },
    );
  }

  Widget _buildStyledBlockDropdown({
    required String label,
    required IconData icon,
    required List<BlockModel> options,
    required String? currentValue,
    required ValueChanged<String?> onChanged,
    bool required = false,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildFieldLabel(label: label, required: required),
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppColors.inputFieldGray.withValues(alpha: 0.96),
                  Colors.white.withValues(alpha: 0.92),
                ],
              ),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppColors.borderSoft),
              boxShadow: AppTheme.softShadow(AppColors.lightGreen),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: DropdownButtonHideUnderline(
              child: DropdownButtonFormField<String>(
                key: ValueKey(currentValue ?? 'no-field-label-selected'),
                initialValue: currentValue,
                isExpanded: true,
                borderRadius: BorderRadius.circular(24),
                dropdownColor: const Color(0xFFF7FBF1),
                menuMaxHeight: 360,
                hint: Text(
                  'Select $label',
                  style: const TextStyle(
                    color: AppColors.textGray,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                icon: const Icon(
                  Icons.expand_more_rounded,
                  color: AppColors.forestGreen,
                ),
                decoration: InputDecoration(
                  isDense: true,
                  icon: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: AppColors.coolGradient,
                      ),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(icon, color: AppColors.forestGreen, size: 18),
                  ),
                  border: InputBorder.none,
                ),
                items: options
                    .map(
                      (b) => DropdownMenuItem(
                        value: _blockSelectionValue(b),
                        child: Text(
                          _dropdownLabelForBlock(b),
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    )
                    .toList(),
                onChanged: onChanged,
                validator: required
                    ? (v) => v == null ? 'Required' : null
                    : null,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStyledMonitoringFieldDropdown({
    required String label,
    required IconData icon,
    required List<Map<String, dynamic>> options,
    required int? currentValue,
    required ValueChanged<int?> onChanged,
  }) {
    final items = options
        .map((record) {
          final recordId = _monitoringFieldRecordId(record);
          if (recordId == null) return null;
          return DropdownMenuItem<int>(
            value: recordId,
            child: Text(
              _monitoringFieldDropdownLabel(record),
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
            ),
          );
        })
        .whereType<DropdownMenuItem<int>>()
        .toList();
    final matches = items.where((item) => item.value == currentValue).length;
    final safeCurrentValue = matches == 1 ? currentValue : null;

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildFieldLabel(label: label),
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppColors.inputFieldGray.withValues(alpha: 0.96),
                  Colors.white.withValues(alpha: 0.92),
                ],
              ),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppColors.borderSoft),
              boxShadow: AppTheme.softShadow(AppColors.lightGreen),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: DropdownButtonHideUnderline(
              child: DropdownButtonFormField<int>(
                key: ValueKey('field_id_$safeCurrentValue'),
                initialValue: safeCurrentValue,
                isExpanded: true,
                borderRadius: BorderRadius.circular(24),
                dropdownColor: const Color(0xFFF7FBF1),
                menuMaxHeight: 360,
                hint: Text(
                  'Select $label',
                  style: const TextStyle(
                    color: AppColors.textGray,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                icon: const Icon(
                  Icons.expand_more_rounded,
                  color: AppColors.forestGreen,
                ),
                decoration: InputDecoration(
                  isDense: true,
                  icon: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: AppColors.coolGradient,
                      ),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(icon, color: AppColors.forestGreen, size: 18),
                  ),
                  border: InputBorder.none,
                ),
                items: items,
                onChanged: onChanged,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStyledOptionDropdown({
    required String label,
    required TextEditingController controller,
    required IconData icon,
    required List<String> options,
    bool required = false,
    ValueChanged<String?>? onChanged,
  }) {
    final selectedValue = _matchDropdownOption(controller.text, options);

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildFieldLabel(label: label, required: required),
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppColors.inputFieldGray.withValues(alpha: 0.96),
                  Colors.white.withValues(alpha: 0.92),
                ],
              ),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppColors.borderSoft),
              boxShadow: AppTheme.softShadow(AppColors.lightGreen),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: DropdownButtonHideUnderline(
              child: DropdownButtonFormField<String>(
                key: ValueKey('${label}_$selectedValue'),
                initialValue: selectedValue,
                isExpanded: true,
                borderRadius: BorderRadius.circular(24),
                dropdownColor: const Color(0xFFF7FBF1),
                menuMaxHeight: 360,
                hint: Text(
                  'Select $label',
                  style: const TextStyle(
                    color: AppColors.textGray,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                icon: const Icon(
                  Icons.expand_more_rounded,
                  color: AppColors.forestGreen,
                ),
                decoration: InputDecoration(
                  isDense: true,
                  icon: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: AppColors.coolGradient,
                      ),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(icon, color: AppColors.forestGreen, size: 18),
                  ),
                  border: InputBorder.none,
                ),
                items: options
                    .map(
                      (option) => DropdownMenuItem(
                        value: option,
                        child: Text(
                          option,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    )
                    .toList(),
                onChanged: (value) {
                  setState(() {
                    if (onChanged != null) {
                      onChanged(value);
                    } else {
                      controller.text = value ?? '';
                    }
                  });
                  unawaited(_saveDraft());
                },
                validator: required
                    ? (value) =>
                          value == null || value.isEmpty ? 'Required' : null
                    : null,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBlocksEmptyState() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: _buildCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Field *',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: AppColors.forestGreen,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _blocksStatusMessage ??
                  'No field labels are available on this device yet.',
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textGray,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.centerLeft,
              child: OutlinedButton.icon(
                onPressed: _fetchBlocks,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Reload Fields'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMonitoringFieldsEmptyState() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: _buildCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Field ID',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: AppColors.forestGreen,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _monitoringFieldsStatusMessage ??
                  'No current Field IDs were found in sugarcane_monitoring.',
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textGray,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.centerLeft,
              child: OutlinedButton.icon(
                onPressed: () => _fetchMonitoringFields(),
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Reload Field IDs'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCard({required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.white.withValues(alpha: 0.94),
            AppColors.softCream.withValues(alpha: 0.90),
          ],
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white),
        boxShadow: AppTheme.softShadow(AppColors.lightGreen),
      ),
      child: child,
    );
  }

  Widget _buildFieldLabel({required String label, bool required = false}) {
    return Padding(
      padding: const EdgeInsets.only(left: 2, bottom: 8),
      child: Row(
        children: [
          Container(
            width: 9,
            height: 9,
            decoration: const BoxDecoration(
              color: AppColors.primaryGreen,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w900,
              color: AppColors.forestGreen,
            ),
          ),
          if (required) ...[
            const SizedBox(width: 4),
            const Text(
              '*',
              style: TextStyle(
                color: AppColors.errorRed,
                fontWeight: FontWeight.w900,
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _formatOptionalShortDate(DateTime? value) {
    if (value == null) return _datePickerPlaceholder;
    return _formatRecordedDate(value);
  }

  String _gpsPlaceholderText() {
    if (_locationStatusMessage != null &&
        _locationStatusMessage!.trim().isNotEmpty) {
      return _locationStatusMessage!;
    }
    if (_isCollectingLocation) {
      return 'Capturing GPS...';
    }
    if (_selectedBlock != null && _currentPosition != null) {
      return _isInsideBlock
          ? 'Inside selected field'
          : 'Outside selected field';
    }
    return 'Captured automatically';
  }

  String _geometryPolygonStatus() {
    final editingField = Map<String, dynamic>.from(
      _editingSourceObservation?['field_identification'] ?? const {},
    );
    final hasGeometry =
        _selectedBlock?.geom != null ||
        _editingSourceObservation?['geom_polygon'] != null ||
        _editingSourceObservation?['geometry'] != null ||
        _editingSourceObservation?['spatial_data'] != null ||
        editingField['geom_polygon'] != null ||
        editingField['geometry'] != null;
    return hasGeometry ? 'Linked' : 'Not linked';
  }

  String _formatCoordinateValue(double? value) {
    if (value == null) return '';
    return value.toStringAsFixed(6);
  }

  String _formatDatePickerText(DateTime? value) {
    if (value == null) return _datePickerPlaceholder;
    final day = value.day.toString().padLeft(2, '0');
    final month = value.month.toString().padLeft(2, '0');
    return '$day/$month/${value.year}';
  }

  String _formatRecordedDate(DateTime value) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    return '${value.day} ${months[value.month - 1]} ${value.year}';
  }
}
