import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';

import '../l10n/app_localizations.dart';
import '../models/observation_models.dart';
import '../providers/auth_provider.dart';
import '../providers/location_provider.dart';
import '../providers/sync_provider.dart';
import '../providers/ui_provider.dart';
import '../providers/weather_provider.dart';
import '../services/local_db.dart';
import '../services/supabase_service.dart';
import '../utils/app_colors.dart';
import '../utils/app_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/botanical_background.dart';
import '../widgets/dynamic_sugarcane_backdrop.dart';
import '../widgets/shimmer_loading.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  static const List<String> _analysisSectionKeys = [
    'field_identification',
    'crop_information',
    'crop_monitoring',
    'soil_characteristics',
    'irrigation_management',
    'harvest_information',
    'residual_management',
    'nutrient_management',
    'crop_protection',
    'control_methods',
  ];

  static const Map<String, String> _analysisSectionLabels = {
    'field_identification': 'Field identity',
    'crop_information': 'Crop profile',
    'crop_monitoring': 'Crop monitoring',
    'soil_characteristics': 'Soil characteristics',
    'irrigation_management': 'Water management',
    'harvest_information': 'Harvest information',
    'residual_management': 'Residual management',
    'nutrient_management': 'Nutrient management',
    'crop_protection': 'Crop protection',
    'control_methods': 'Control methods',
  };

  static const Map<String, String> _yieldBreakdownLabels = {
    'field_identification.field_name': 'Yield by field name',
    'field_identification.block_id': 'Yield by block',
    'crop_information.variety': 'Yield by variety',
    'crop_information.crop_class': 'Yield by crop class',
    'crop_information.crop_stage': 'Yield by crop stage',
    'irrigation_management.irrigation_type': 'Yield by irrigation type',
    'irrigation_management.water_source': 'Yield by water source',
    'soil_characteristics.soil_type': 'Yield by soil type',
    'soil_characteristics.soil_texture': 'Yield by soil texture',
    'crop_monitoring.crop_vigor': 'Yield by crop vigor',
    'crop_monitoring.stress': 'Yield by stress',
  };

  static const Set<String> _nonYieldBreakdownLeafKeys = {
    'yield',
    'tam_mm',
    'time',
    'soil_ph',
    'ph',
    'latitude',
    'longitude',
    'gps_accuracy',
    'date_recorded',
    'planting_date',
    'cutting_date',
    'expected_harvest_date',
    'ratoon_number',
    'canopy_cover',
    'organic_matter',
  };

  final LocalDB _localDb = LocalDB();
  final SupabaseService _supabase = SupabaseService();
  LocationProvider? _locationProvider;
  _ObservationInsights? _insights;
  bool _isInsightsLoading = true;
  String? _insightsError;

  @override
  void initState() {
    super.initState();
    _initialFetch();
  }

  Future<void> _initialFetch() async {
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      final locationProvider = context.read<LocationProvider>();
      final weatherProvider = context.read<WeatherProvider>();
      final syncProvider = context.read<SyncProvider>();

      if (_locationProvider != locationProvider) {
        _locationProvider?.removeListener(_handleLocationUpdate);
        _locationProvider = locationProvider;
        _locationProvider?.addListener(_handleLocationUpdate);
      }

      final initialPositionFuture = locationProvider.startGpsTracking(
        accuracy: LocationAccuracy.medium,
      );

      // Force recheck connectivity on app start
      await syncProvider.recheckConnectivity();
      final initialPosition = await initialPositionFuture;
      if (!mounted) return;
      await Future.wait([
        weatherProvider.refreshWeather(
          initialPosition ?? locationProvider.currentPosition,
          syncProvider.isOnline,
          force: true,
        ),
        _loadObservationInsights(),
      ]);
    });
  }

  void _handleLocationUpdate() {
    final locationProvider = _locationProvider;
    final position = locationProvider?.currentPosition;
    if (!mounted || position == null) return;

    final weatherProvider = context.read<WeatherProvider>();
    final syncProvider = context.read<SyncProvider>();
    weatherProvider.refreshWeather(position, syncProvider.isOnline);
  }

  Future<void> _loadObservationInsights({bool showLoading = true}) async {
    if (showLoading && mounted) {
      setState(() {
        _isInsightsLoading = true;
        _insightsError = null;
      });
    }

    try {
      final syncProvider = context.read<SyncProvider>();
      final recordsByKey = <String, Map<String, dynamic>>{};
      final localRecords = await _localDb.getAllObservations();

      for (final record in localRecords) {
        final raw = jsonDecode(record['data'] as String);
        final normalized = normalizeObservationPayload(
          Map<String, dynamic>.from(raw as Map),
        );
        recordsByKey[_insightRecordKey(
              normalized,
              fallback: 'local-${record['id']}',
            )] =
            normalized;
      }

      if (syncProvider.isDatabaseConnected) {
        final remoteRecords = await _supabase.getRecentObservations(limit: 200);
        for (final remote in remoteRecords) {
          final normalized = normalizeObservationPayload(
            Map<String, dynamic>.from(remote),
          );
          recordsByKey[_insightRecordKey(
                normalized,
                fallback: 'remote-${remote['id']}',
              )] =
              normalized;
        }
      }

      final insights = _buildObservationInsights(recordsByKey.values.toList());
      if (!mounted) return;
      setState(() {
        _insights = insights;
        _isInsightsLoading = false;
        _insightsError = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isInsightsLoading = false;
        _insightsError = e.toString();
      });
    }
  }

  String _insightRecordKey(
    Map<String, dynamic> record, {
    required String fallback,
  }) {
    final clientUuid = record['client_uuid']?.toString().trim() ?? '';
    if (clientUuid.isNotEmpty) return clientUuid;

    final fieldIdentification = Map<String, dynamic>.from(
      record['field_identification'] ?? const {},
    );
    final dateRecorded =
        fieldIdentification['date_recorded']?.toString().trim() ?? '';
    if (dateRecorded.isNotEmpty) {
      return '$fallback-$dateRecorded';
    }

    return fallback;
  }

  _ObservationInsights _buildObservationInsights(
    List<Map<String, dynamic>> records,
  ) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final dailyCounts = <DateTime, int>{
      for (int offset = 6; offset >= 0; offset--)
        today.subtract(Duration(days: offset)): 0,
    };
    final distinctFields = <String>{};
    final datasetFieldPaths = <String>{};
    final datasetFilledCounts = <String, int>{};
    final datasetDistinctValues = <String, Set<String>>{};
    final datasetSampleValues = <String, List<String>>{};
    final sectionFieldPaths = <String, Set<String>>{};
    final sectionFilledCounts = <String, int>{};
    final numericAccumulators = <String, _NumericAccumulator>{};
    final categoricalCounts = <String, Map<String, int>>{};
    final numericRows = <Map<String, double>>[];
    double yieldTotal = 0;
    int yieldSamples = 0;
    double tamMmTotal = 0;
    int tamMmSamples = 0;
    double soilPhTotal = 0;
    int soilPhSamples = 0;
    final yieldBreakdownBuckets = <String, Map<String, _YieldAggregate>>{};
    DateTime? latestDate;
    String latestLabel = 'No observations yet';

    for (final record in records) {
      final fieldIdentification = Map<String, dynamic>.from(
        record['field_identification'] ?? const {},
      );
      final soilCharacteristics = Map<String, dynamic>.from(
        record['soil_characteristics'] ?? const {},
      );
      final harvestInformation = Map<String, dynamic>.from(
        record['harvest_information'] ?? const {},
      );
      final datasetFields = _extractDatasetLeafFields(record);
      final numericRow = <String, double>{};

      final fieldName = observationDisplayName(record, fallback: '');
      final tamMm = _toDoubleOrNull(
        fieldIdentification['tam_mm'] ??
            fieldIdentification['time'] ??
            fieldIdentification['tamm_area'],
      );
      final yieldAmount = _toDoubleOrNull(harvestInformation['yield']);

      if (fieldName.isNotEmpty) {
        distinctFields.add(fieldName);
      }

      for (final entry in datasetFields.entries) {
        final path = entry.key;
        final value = entry.value;
        final section = path.split('.').first;

        datasetFieldPaths.add(path);
        sectionFieldPaths.putIfAbsent(section, () => <String>{}).add(path);

        if (_isFilledDatasetValue(value)) {
          datasetFilledCounts.update(
            path,
            (count) => count + 1,
            ifAbsent: () => 1,
          );
          sectionFilledCounts.update(
            section,
            (count) => count + 1,
            ifAbsent: () => 1,
          );

          final normalizedValue = value.toString().trim();
          final distinctValues = datasetDistinctValues.putIfAbsent(
            path,
            () => <String>{},
          );
          distinctValues.add(normalizedValue);
          final samples = datasetSampleValues.putIfAbsent(
            path,
            () => <String>[],
          );
          if (!samples.contains(normalizedValue) && samples.length < 3) {
            samples.add(normalizedValue);
          }
        }

        final numericValue = _toDoubleOrNull(value);
        if (numericValue != null && numericValue.isFinite) {
          numericRow[path] = numericValue;
          final accumulator = numericAccumulators.putIfAbsent(
            path,
            () => _NumericAccumulator(),
          );
          accumulator.add(numericValue);
        } else if (_isCategoricalDatasetValue(path, value)) {
          final category = value.toString().trim();
          final fieldCounts = categoricalCounts.putIfAbsent(
            path,
            () => <String, int>{},
          );
          fieldCounts.update(category, (count) => count + 1, ifAbsent: () => 1);
        }
      }

      if (numericRow.isNotEmpty) {
        numericRows.add(numericRow);
      }

      if (tamMm != null && tamMm.isFinite) {
        tamMmTotal += tamMm;
        tamMmSamples++;
      }

      if (yieldAmount != null && yieldAmount > 0) {
        yieldTotal += yieldAmount;
        yieldSamples++;

        for (final entry in datasetFields.entries) {
          if (!_isYieldBreakdownCandidate(entry.key, entry.value)) {
            continue;
          }

          final category = entry.value.toString().trim();
          final aggregates = yieldBreakdownBuckets.putIfAbsent(
            entry.key,
            () => <String, _YieldAggregate>{},
          );
          final aggregate = aggregates.putIfAbsent(
            category,
            () => _YieldAggregate(),
          );
          aggregate.total += yieldAmount;
          aggregate.count += 1;
        }
      }

      final soilPh = _toDoubleOrNull(soilCharacteristics['soil_ph']);
      if (soilPh != null && soilPh > 0) {
        soilPhTotal += soilPh;
        soilPhSamples++;
      }

      final recordedAt = DateTime.tryParse(
        fieldIdentification['date_recorded']?.toString() ??
            record['created_at']?.toString() ??
            '',
      );

      if (recordedAt != null) {
        final recordedDay = DateTime(
          recordedAt.year,
          recordedAt.month,
          recordedAt.day,
        );
        if (dailyCounts.containsKey(recordedDay)) {
          dailyCounts.update(recordedDay, (value) => value + 1);
        }

        if (latestDate == null || recordedAt.isAfter(latestDate)) {
          latestDate = recordedAt;
          latestLabel = fieldName.isEmpty ? 'Unnamed field' : fieldName;
        }
      }
    }

    final weeklyActivity = dailyCounts.entries
        .map(
          (entry) => _DailyObservationCount(day: entry.key, count: entry.value),
        )
        .toList();
    final trackedInputFields = datasetFieldPaths.length;
    final overallFilled = datasetFilledCounts.values.fold<int>(
      0,
      (sum, count) => sum + count,
    );
    final coverageMetrics = _buildSectionCoverage(
      sectionFieldPaths,
      sectionFilledCounts,
      records.length,
    );
    final yieldBreakdowns = _buildYieldBreakdowns(yieldBreakdownBuckets);
    final fieldSummaries = _buildFieldSummaries(
      datasetFieldPaths,
      datasetFilledCounts,
      datasetDistinctValues,
      datasetSampleValues,
      records.length,
    );
    final numericSummaries = _buildNumericSummaries(numericAccumulators);
    final categoricalDistributions = _buildCategoryDistributions(
      categoricalCounts,
      datasetDistinctValues,
    );
    final scatterSeries = _buildScatterSeries(numericRows, numericAccumulators);

    return _ObservationInsights(
      totalObservations: records.length,
      uniqueFields: distinctFields.length,
      trackedInputFields: trackedInputFields,
      averageYield: yieldSamples == 0 ? null : yieldTotal / yieldSamples,
      averageTamMm: tamMmSamples == 0 ? null : tamMmTotal / tamMmSamples,
      averageSoilPh: soilPhSamples == 0 ? null : soilPhTotal / soilPhSamples,
      latestFieldLabel: latestLabel,
      latestObservationDate: latestDate,
      overallCoverageRatio: _ratio(
        overallFilled,
        trackedInputFields * records.length,
      ),
      yieldCoverageRatio: _ratio(yieldSamples, records.length),
      weeklyActivity: weeklyActivity,
      coverageMetrics: coverageMetrics,
      yieldBreakdowns: yieldBreakdowns,
      fieldSummaries: fieldSummaries,
      numericSummaries: numericSummaries,
      categoricalDistributions: categoricalDistributions,
      scatterSeries: scatterSeries,
    );
  }

  double _ratio(int count, int total) {
    if (total == 0) return 0;
    return count / total;
  }

  double? _toDoubleOrNull(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toDouble();
    return double.tryParse(value.toString());
  }

  Map<String, dynamic> _extractDatasetLeafFields(Map<String, dynamic> record) {
    final extracted = <String, dynamic>{};

    for (final sectionKey in _analysisSectionKeys) {
      final sectionValue = record[sectionKey];
      if (sectionValue is Map) {
        _flattenDatasetLeafFields(
          Map<String, dynamic>.from(sectionValue),
          sectionKey,
          extracted,
        );
      }
    }

    return extracted;
  }

  void _flattenDatasetLeafFields(
    Map<String, dynamic> source,
    String prefix,
    Map<String, dynamic> output,
  ) {
    for (final entry in source.entries) {
      final value = entry.value;
      final path = '$prefix.${entry.key}';

      if (value is Map) {
        _flattenDatasetLeafFields(
          Map<String, dynamic>.from(value),
          path,
          output,
        );
        continue;
      }

      if (value is List) {
        continue;
      }

      output[path] = value;
    }
  }

  bool _isFilledDatasetValue(dynamic value) {
    if (value == null) return false;
    if (value is String) return value.trim().isNotEmpty;
    if (value is num) return value.isFinite;
    if (value is bool) return true;
    return value.toString().trim().isNotEmpty;
  }

  bool _isYieldBreakdownCandidate(String path, dynamic value) {
    if (!_isFilledDatasetValue(value)) return false;
    if (value is num || value is bool) return false;

    final leafKey = path.split('.').last;
    if (_nonYieldBreakdownLeafKeys.contains(leafKey)) {
      return false;
    }

    final text = value.toString().trim();
    if (text.isEmpty) return false;
    if (DateTime.tryParse(text) != null) return false;
    return true;
  }

  bool _isCategoricalDatasetValue(String path, dynamic value) {
    if (!_isFilledDatasetValue(value)) return false;
    if (value is num || value is bool) return false;
    final text = value.toString().trim();
    if (text.isEmpty) return false;
    if (DateTime.tryParse(text) != null) return false;
    return true;
  }

  List<_CoverageMetric> _buildSectionCoverage(
    Map<String, Set<String>> sectionFieldPaths,
    Map<String, int> sectionFilledCounts,
    int recordCount,
  ) {
    final orderedSections = sectionFieldPaths.keys.toList()
      ..sort((a, b) {
        final sectionOrder = _analysisSectionKeys.indexOf(a);
        final otherOrder = _analysisSectionKeys.indexOf(b);
        if (sectionOrder != -1 && otherOrder != -1) {
          return sectionOrder.compareTo(otherOrder);
        }
        if (sectionOrder != -1) return -1;
        if (otherOrder != -1) return 1;
        return a.compareTo(b);
      });

    final palette = <List<Color>>[
      AppColors.primaryGradient,
      AppColors.coolGradient,
      AppColors.warmGradient,
      const [AppColors.sageGreen, AppColors.dewBlue],
      const [AppColors.primaryGreen, AppColors.lightGreen],
      const [AppColors.peach, AppColors.sageGreen],
    ];
    final metrics = <_CoverageMetric>[];

    for (var index = 0; index < orderedSections.length; index++) {
      final section = orderedSections[index];
      final fieldsInSection = sectionFieldPaths[section]?.length ?? 0;
      if (fieldsInSection == 0) continue;

      final ratio = _ratio(
        sectionFilledCounts[section] ?? 0,
        recordCount * fieldsInSection,
      );
      metrics.add(
        _CoverageMetric(
          label: _analysisSectionLabels[section] ?? _titleCase(section),
          ratio: ratio,
          valueLabel: '${(ratio * 100).round()}%',
          colors: palette[index % palette.length],
        ),
      );
    }

    return metrics;
  }

  List<_YieldBreakdown> _buildYieldBreakdowns(
    Map<String, Map<String, _YieldAggregate>> buckets,
  ) {
    final breakdowns = <_YieldBreakdown>[];

    for (final entry in buckets.entries) {
      final rankedEntries = <_RankedMetric>[];
      var totalSamples = 0;

      for (final categoryEntry in entry.value.entries) {
        final aggregate = categoryEntry.value;
        if (aggregate.count == 0) continue;

        final averageYield = aggregate.total / aggregate.count;
        totalSamples += aggregate.count;
        rankedEntries.add(
          _RankedMetric(
            label: categoryEntry.key,
            value: averageYield,
            valueLabel: '${averageYield.toStringAsFixed(1)} t/ha',
          ),
        );
      }

      if (rankedEntries.length < 2) {
        continue;
      }

      rankedEntries.sort((a, b) => b.value.compareTo(a.value));
      breakdowns.add(
        _YieldBreakdown(
          title: _yieldBreakdownLabels[entry.key] ?? _titleCase(entry.key),
          dimensionPath: entry.key,
          sampleCount: totalSamples,
          entries: rankedEntries.take(4).toList(),
        ),
      );
    }

    breakdowns.sort((a, b) {
      final distinctCompare = b.entries.length.compareTo(a.entries.length);
      if (distinctCompare != 0) return distinctCompare;

      final sampleCompare = b.sampleCount.compareTo(a.sampleCount);
      if (sampleCompare != 0) return sampleCompare;

      return a.dimensionPath.compareTo(b.dimensionPath);
    });

    return breakdowns.take(2).toList();
  }

  List<_FieldSummary> _buildFieldSummaries(
    Set<String> datasetFieldPaths,
    Map<String, int> datasetFilledCounts,
    Map<String, Set<String>> datasetDistinctValues,
    Map<String, List<String>> datasetSampleValues,
    int recordCount,
  ) {
    final orderedPaths = datasetFieldPaths.toList()
      ..sort((a, b) {
        final aSection = a.split('.').first;
        final bSection = b.split('.').first;
        final aOrder = _analysisSectionKeys.indexOf(aSection);
        final bOrder = _analysisSectionKeys.indexOf(bSection);
        if (aOrder != -1 && bOrder != -1 && aOrder != bOrder) {
          return aOrder.compareTo(bOrder);
        }
        if (aOrder != -1 && bOrder == -1) return -1;
        if (aOrder == -1 && bOrder != -1) return 1;
        return a.compareTo(b);
      });

    return orderedPaths.map((path) {
      final section = path.split('.').first;
      final leaf = path.split('.').last;
      final filledCount = datasetFilledCounts[path] ?? 0;
      final distinctCount = datasetDistinctValues[path]?.length ?? 0;
      final samples = datasetSampleValues[path] ?? const <String>[];

      return _FieldSummary(
        path: path,
        sectionLabel: _analysisSectionLabels[section] ?? _titleCase(section),
        fieldLabel: _titleCase(leaf),
        completenessRatio: _ratio(filledCount, recordCount),
        filledCount: filledCount,
        distinctCount: distinctCount,
        sampleValues: samples.join(', '),
      );
    }).toList();
  }

  List<_NumericSummary> _buildNumericSummaries(
    Map<String, _NumericAccumulator> numericAccumulators,
  ) {
    final summaries = numericAccumulators.entries
        .where((entry) => entry.value.count > 0)
        .map((entry) {
          final parts = entry.key.split('.');
          final section = parts.first;
          final leaf = parts.last;
          final stats = entry.value;

          return _NumericSummary(
            path: entry.key,
            sectionLabel:
                _analysisSectionLabels[section] ?? _titleCase(section),
            fieldLabel: _titleCase(leaf),
            sampleCount: stats.count,
            average: stats.average,
            minimum: stats.minimum ?? 0,
            maximum: stats.maximum ?? 0,
          );
        })
        .toList();

    summaries.sort((a, b) {
      final sampleCompare = b.sampleCount.compareTo(a.sampleCount);
      if (sampleCompare != 0) return sampleCompare;
      return a.path.compareTo(b.path);
    });

    return summaries;
  }

  List<_CategoryDistribution> _buildCategoryDistributions(
    Map<String, Map<String, int>> categoricalCounts,
    Map<String, Set<String>> datasetDistinctValues,
  ) {
    final distributions = <_CategoryDistribution>[];

    for (final entry in categoricalCounts.entries) {
      final distinctCount = datasetDistinctValues[entry.key]?.length ?? 0;
      if (distinctCount < 2) {
        continue;
      }

      final sortedCounts = entry.value.entries.toList()
        ..sort((a, b) => b.value.compareTo(a.value));
      final totalCount = sortedCounts.fold<int>(
        0,
        (sum, item) => sum + item.value,
      );
      if (totalCount == 0) continue;

      final topEntries = sortedCounts.take(5).toList();
      final otherCount = sortedCounts
          .skip(5)
          .fold<int>(0, (sum, item) => sum + item.value);
      if (otherCount > 0) {
        topEntries.add(MapEntry('Other', otherCount));
      }

      final parts = entry.key.split('.');
      final section = parts.first;
      final leaf = parts.last;
      final sectionLabel =
          _analysisSectionLabels[section] ?? _titleCase(section);
      final fieldLabel = _titleCase(leaf);
      final slices = topEntries.map((item) {
        return _CategorySlice(
          label: item.key,
          count: item.value,
          ratio: item.value / totalCount,
        );
      }).toList();

      distributions.add(
        _CategoryDistribution(
          path: entry.key,
          sectionLabel: sectionLabel,
          fieldLabel: fieldLabel,
          title: '${_titleCase(leaf)} mix',
          subtitle: '$sectionLabel records',
          totalCount: totalCount,
          slices: slices,
        ),
      );
    }

    distributions.sort((a, b) {
      final sliceCompare = b.slices.length.compareTo(a.slices.length);
      if (sliceCompare != 0) return sliceCompare;
      return b.totalCount.compareTo(a.totalCount);
    });

    return distributions.take(2).toList();
  }

  List<_ScatterSeries> _buildScatterSeries(
    List<Map<String, double>> numericRows,
    Map<String, _NumericAccumulator> numericAccumulators,
  ) {
    if (numericRows.isEmpty || numericAccumulators.length < 2) {
      return const <_ScatterSeries>[];
    }

    final orderedNumericFields = numericAccumulators.entries.toList()
      ..sort((a, b) {
        final priorityCompare = _numericFieldPriority(
          a.key,
        ).compareTo(_numericFieldPriority(b.key));
        if (priorityCompare != 0) return priorityCompare;

        final countCompare = b.value.count.compareTo(a.value.count);
        if (countCompare != 0) return countCompare;

        return a.key.compareTo(b.key);
      });

    final yPath = orderedNumericFields.first.key;
    final series = <_ScatterSeries>[];

    for (final candidate in orderedNumericFields.skip(1)) {
      final points = <Offset>[];
      for (final row in numericRows) {
        final x = row[candidate.key];
        final y = row[yPath];
        if (x == null || y == null) continue;
        points.add(Offset(x, y));
      }

      if (points.length < 3) {
        continue;
      }

      final xParts = candidate.key.split('.');
      final yParts = yPath.split('.');
      series.add(
        _ScatterSeries(
          title: '${_titleCase(xParts.last)} vs ${_titleCase(yParts.last)}',
          xLabel: _titleCase(xParts.last),
          yLabel: _titleCase(yParts.last),
          points: points,
        ),
      );
    }

    series.sort((a, b) => b.points.length.compareTo(a.points.length));
    return series.take(2).toList();
  }

  int _numericFieldPriority(String path) {
    const priority = <String, int>{
      'harvest_information.yield': 0,
      'field_identification.tam_mm': 1,
      'field_identification.time': 2,
      'soil_characteristics.soil_ph': 3,
      'soil_characteristics.organic_matter': 4,
      'crop_monitoring.canopy_cover': 5,
      'field_identification.area': 6,
      'field_identification.gps_accuracy': 7,
      'field_identification.latitude': 8,
      'field_identification.longitude': 9,
    };
    return priority[path] ?? 100;
  }

  String _titleCase(String raw) {
    return raw
        .split('.')
        .expand((part) => part.split('_'))
        .where((part) => part.isNotEmpty)
        .map((part) => '${part[0].toUpperCase()}${part.substring(1)}')
        .join(' ');
  }

  @override
  void dispose() {
    _locationProvider?.removeListener(_handleLocationUpdate);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final syncProvider = context.watch<SyncProvider>();
    final weatherProvider = context.watch<WeatherProvider>();
    final uiProvider = context.watch<UIProvider>();
    final locationProvider = context.read<LocationProvider>();
    final isFieldMode = uiProvider.isFieldMode;

    return Scaffold(
      drawer: const AppDrawer(),
      body: BotanicalBackground(
        showLeafTexture: !isFieldMode,
        textureOpacity: isFieldMode ? 0 : 0.07,
        gradientColors: isFieldMode
            ? const [Colors.white, Color(0xFFF8FAF5), Color(0xFFF2F5ED)]
            : null,
        child: SafeArea(
          child: RefreshIndicator(
            onRefresh: () async {
              final pos = await locationProvider.refreshCurrentPosition(
                accuracy: LocationAccuracy.medium,
              );
              // Recheck connectivity first, then attempt sync
              await syncProvider.recheckConnectivity();
              await Future.wait([
                if (syncProvider.canAttemptSync) syncProvider.startSync(),
                syncProvider.checkUnsynced(),
                weatherProvider.refreshWeather(
                  pos ?? locationProvider.currentPosition,
                  syncProvider.isOnline,
                  force: true,
                ),
              ]);
              await _loadObservationInsights(showLoading: false);
            },
            color: AppColors.primaryGreen,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildTopActionRow(
                    context,
                    authProvider,
                    syncProvider,
                    uiProvider,
                  ),
                  const SizedBox(height: 24),
                  if (isFieldMode)
                    _buildSimpleDashboardContent(
                      context: context,
                      authProvider: authProvider,
                      syncProvider: syncProvider,
                      weatherProvider: weatherProvider,
                    )
                  else ...[
                    _HeroPanel(
                      username: authProvider.user?['username'] ?? 'Cane Grower',
                      role: (authProvider.userRole ?? 'Observer').toUpperCase(),
                      locationLabel: weatherProvider.locationName,
                      isFieldMode: isFieldMode,
                    ),
                    const SizedBox(height: 20),
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final stacked = constraints.maxWidth < 760;
                        final weatherCard = GestureDetector(
                          onTap: () =>
                              Navigator.pushNamed(context, '/weather-detail'),
                          child: _WeatherWidget(
                            weatherProvider: weatherProvider,
                            isFieldMode: isFieldMode,
                          ),
                        );
                        final syncCard = _SyncRadarWidget(
                          syncProvider: syncProvider,
                          isFieldMode: isFieldMode,
                        );

                        if (stacked) {
                          return Column(
                            children: [
                              weatherCard,
                              const SizedBox(height: 16),
                              syncCard,
                            ],
                          );
                        }

                        return Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(child: weatherCard),
                            const SizedBox(width: 16),
                            Expanded(child: syncCard),
                          ],
                        );
                      },
                    ),
                    const SizedBox(height: 28),
                    const _DashboardSectionHeader(
                      eyebrow: 'OBSERVATION SUMMARY',
                      title: 'Saved record insights',
                      subtitle:
                          'Review the key activity, yield, and coverage trends from your saved records.',
                    ),
                    const SizedBox(height: 16),
                    _ObservationInsightsPanel(
                      insights: _insights,
                      isLoading: _isInsightsLoading,
                      errorMessage: _insightsError,
                      isFieldMode: isFieldMode,
                      onRetry: () => _loadObservationInsights(),
                    ),
                    const SizedBox(height: 24),
                    const _RefreshHintCard(),
                    const SizedBox(height: 6),
                    const Text(
                      'Pull down anytime to refresh cane weather, GPS context, and sync progress.',
                      style: TextStyle(
                        color: AppColors.textGray,
                        fontWeight: FontWeight.w700,
                        height: 1.45,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSimpleDashboardContent({
    required BuildContext context,
    required AuthProvider authProvider,
    required SyncProvider syncProvider,
    required WeatherProvider weatherProvider,
  }) {
    final insights = _insights;
    final username = authProvider.user?['username'] ?? 'Cane grower';
    final latestDate = insights?.latestObservationDate;
    final latestLabel = latestDate == null
        ? 'No observations yet'
        : insights?.latestFieldLabel ?? 'Latest observation';
    final latestSummary = latestDate == null
        ? 'Start with one record and the app will keep the rest organized here.'
        : 'Last saved on ${_formatCompactDate(latestDate)}.';
    final latestMetricValue = _isInsightsLoading
        ? '...'
        : latestDate == null
        ? 'None yet'
        : _formatCompactDate(latestDate);
    final weatherHeadline = weatherProvider.hasWeatherData
        ? '${weatherProvider.temperature.toStringAsFixed(0)}°C • ${weatherProvider.weatherCondition}'
        : weatherProvider.isWeatherLoading
        ? 'Refreshing weather'
        : 'Weather unavailable';
    final weatherSummary =
        weatherProvider.weatherError ??
        (weatherProvider.locationName == 'Waiting for location'
            ? 'Waiting for a GPS fix so local weather can load.'
            : weatherProvider.locationName);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.white.withValues(alpha: 0.96),
                AppColors.softCream.withValues(alpha: 0.96),
                AppColors.sageGreen.withValues(alpha: 0.78),
              ],
            ),
            borderRadius: BorderRadius.circular(30),
            border: Border.all(color: Colors.white),
            boxShadow: AppTheme.softShadow(AppColors.lightGreen),
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
                        Text(
                          'Welcome back, $username',
                          style: const TextStyle(
                            color: AppColors.textDark,
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.7,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'This home screen keeps the most important work close: add a record, review recent activity, and check local weather.',
                          style: TextStyle(
                            color: AppColors.textGray,
                            fontWeight: FontWeight.w700,
                            height: 1.45,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: AppColors.primaryGradient,
                      ),
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: const Icon(
                      Icons.agriculture_rounded,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  _buildSimplePill(
                    icon: Icons.location_on_rounded,
                    label: _shortLocationLabel(weatherProvider.locationName),
                  ),
                  _buildSimplePill(
                    icon: syncProvider.isDatabaseConnected
                        ? Icons.cloud_done_rounded
                        : Icons.cloud_off_rounded,
                    label: syncProvider.isDatabaseConnected
                        ? 'Online mode'
                        : 'Offline mode',
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth >= 720;
            final cardWidth = isWide
                ? (constraints.maxWidth - 24) / 3
                : constraints.maxWidth;

            return Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                SizedBox(
                  width: cardWidth,
                  child: _SimpleHomeMetricCard(
                    label: 'Observations',
                    value: _isInsightsLoading
                        ? '...'
                        : '${insights?.totalObservations ?? 0}',
                    icon: Icons.inventory_2_rounded,
                    colors: AppColors.coolGradient,
                  ),
                ),
                SizedBox(
                  width: cardWidth,
                  child: _SimpleHomeMetricCard(
                    label: 'Fields',
                    value: _isInsightsLoading
                        ? '...'
                        : '${insights?.uniqueFields ?? 0}',
                    icon: Icons.grid_view_rounded,
                    colors: AppColors.warmGradient,
                  ),
                ),
                SizedBox(
                  width: cardWidth,
                  child: _SimpleHomeMetricCard(
                    label: 'Latest Save',
                    value: latestMetricValue,
                    icon: Icons.schedule_rounded,
                    colors: AppColors.primaryGradient,
                  ),
                ),
              ],
            );
          },
        ),
        const SizedBox(height: 24),
        const Text(
          'Quick Actions',
          style: TextStyle(
            color: AppColors.textDark,
            fontSize: 18,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.3,
          ),
        ),
        const SizedBox(height: 12),
        LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth >= 720;
            final cardWidth = isWide
                ? (constraints.maxWidth - 12) / 2
                : constraints.maxWidth;

            return Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                SizedBox(
                  width: cardWidth,
                  child: _SimpleHomeActionCard(
                    icon: Icons.add_circle_outline_rounded,
                    title: 'Add Observation',
                    subtitle: 'Capture a new field record',
                    colors: AppColors.primaryGradient,
                    onTap: () =>
                        Navigator.pushNamed(context, '/add-observation'),
                  ),
                ),
                SizedBox(
                  width: cardWidth,
                  child: _SimpleHomeActionCard(
                    icon: Icons.auto_stories_rounded,
                    title: 'View Records',
                    subtitle: 'Open saved observations',
                    colors: AppColors.coolGradient,
                    onTap: () => Navigator.pushNamed(context, '/home'),
                  ),
                ),
              ],
            );
          },
        ),
        const SizedBox(height: 24),
        _buildSimpleInfoCard(
          title: 'Weather',
          icon: Icons.wb_cloudy_rounded,
          headline: weatherHeadline,
          description: weatherSummary,
          actionLabel: 'Open weather',
          onTap: () => Navigator.pushNamed(context, '/weather-detail'),
          chips: weatherProvider.hasWeatherData
              ? [
                  _buildSimplePill(
                    icon: Icons.water_drop_rounded,
                    label: 'Rain ${weatherProvider.rainfallChance.round()}%',
                  ),
                  _buildSimplePill(
                    icon: Icons.air_rounded,
                    label:
                        'Wind ${weatherProvider.windSpeed.toStringAsFixed(0)} km/h',
                  ),
                  _buildSimplePill(
                    icon: Icons.opacity_rounded,
                    label:
                        'Humidity ${weatherProvider.humidity.toStringAsFixed(0)}%',
                  ),
                ]
              : [
                  _buildSimplePill(
                    icon: weatherProvider.isWeatherLoading
                        ? Icons.refresh_rounded
                        : Icons.gps_fixed,
                    label: weatherProvider.isWeatherLoading
                        ? 'Refreshing weather'
                        : 'Waiting for local weather',
                  ),
                ],
        ),
        const SizedBox(height: 16),
        _buildSimpleInfoCard(
          title: 'Recent Activity',
          icon: Icons.history_rounded,
          headline: latestLabel,
          description: _insightsError == null
              ? latestSummary
              : 'Insights are temporarily unavailable. You can still add and review records.',
          actionLabel: 'View records',
          onTap: () => Navigator.pushNamed(context, '/home'),
          chips: _isInsightsLoading
              ? [
                  _buildSimplePill(
                    icon: Icons.refresh_rounded,
                    label: 'Refreshing summary',
                  ),
                ]
              : _insightsError != null
              ? [
                  _buildSimplePill(
                    icon: Icons.error_outline_rounded,
                    label: 'Summary unavailable',
                  ),
                ]
              : const <Widget>[],
        ),
        const SizedBox(height: 18),
        const Text(
          'Pull down anytime to refresh weather, GPS, and sync status.',
          style: TextStyle(
            color: AppColors.textGray,
            fontWeight: FontWeight.w700,
            height: 1.45,
          ),
        ),
      ],
    );
  }

  Widget _buildSimpleInfoCard({
    required String title,
    required IconData icon,
    required String headline,
    required String description,
    required String actionLabel,
    required VoidCallback onTap,
    List<Widget> chips = const <Widget>[],
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white.withValues(alpha: 0.96),
            AppColors.softCream.withValues(alpha: 0.92),
          ],
        ),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: Colors.white),
        boxShadow: AppTheme.softShadow(AppColors.sageGreen),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: AppColors.coolGradient,
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(icon, color: AppColors.forestGreen),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    color: AppColors.textDark,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              TextButton(onPressed: onTap, child: Text(actionLabel)),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            headline,
            style: const TextStyle(
              color: AppColors.textDark,
              fontSize: 20,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            description,
            style: const TextStyle(
              color: AppColors.textGray,
              fontWeight: FontWeight.w700,
              height: 1.4,
            ),
          ),
          if (chips.isNotEmpty) ...[
            const SizedBox(height: 14),
            Wrap(spacing: 10, runSpacing: 10, children: chips),
          ],
        ],
      ),
    );
  }

  Widget _buildSimplePill({required IconData icon, required String label}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.88),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: AppColors.forestGreen),
          const SizedBox(width: 8),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 220),
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppColors.forestGreen,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _shortLocationLabel(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return 'Waiting for location';
    if (trimmed.length <= 28) return trimmed;
    return '${trimmed.substring(0, 28).trim()}...';
  }

  Widget _buildTopActionRow(
    BuildContext context,
    AuthProvider authProvider,
    SyncProvider syncProvider,
    UIProvider uiProvider,
  ) {
    final isFieldMode = uiProvider.isFieldMode;

    return Row(
      children: [
        Builder(
          builder: (drawerContext) => _HeaderAction(
            icon: Icons.menu_rounded,
            onTap: () => Scaffold.of(drawerContext).openDrawer(),
            filled: true,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.72),
              borderRadius: BorderRadius.circular(999),
              boxShadow: AppTheme.softShadow(AppColors.lightGreen),
            ),
            child: Row(
              children: [
                _PulseIndicator(active: syncProvider.unsyncedCount > 0),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    syncProvider.isDatabaseConnected
                        ? syncProvider.unsyncedCount == 0
                              ? AppLocalizations.of(context)!.cloudSynced
                              : '${syncProvider.unsyncedCount} pending sync'
                        : 'Sync attention needed',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.forestGreen,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 12),
        _HeaderAction(
          icon: isFieldMode
              ? Icons.view_agenda_rounded
              : Icons.grid_view_rounded,
          onTap: uiProvider.toggleFieldMode,
        ),
        const SizedBox(width: 10),
        _HeaderAction(
          icon: Icons.logout_rounded,
          onTap: () async {
            await authProvider.logout();
            if (!context.mounted) return;
            Navigator.pushReplacementNamed(context, '/login');
          },
        ),
      ],
    );
  }
}

class _SimpleHomeMetricCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final List<Color> colors;

  const _SimpleHomeMetricCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.colors,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white.withValues(alpha: 0.95),
            colors.last.withValues(alpha: 0.18),
          ],
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white),
        boxShadow: AppTheme.softShadow(colors.first),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: colors),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: AppColors.forestGreen),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    color: AppColors.textGray,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: const TextStyle(
                    color: AppColors.textDark,
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SimpleHomeActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final List<Color> colors;
  final VoidCallback onTap;

  const _SimpleHomeActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.colors,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.white.withValues(alpha: 0.96),
              colors.last.withValues(alpha: 0.18),
            ],
          ),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: Colors.white),
          boxShadow: AppTheme.softShadow(colors.first),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: colors),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(icon, color: AppColors.forestGreen),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: AppColors.textDark,
                      fontWeight: FontWeight.w900,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: AppColors.textGray,
                      fontWeight: FontWeight.w700,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            const Icon(
              Icons.arrow_forward_rounded,
              color: AppColors.forestGreen,
            ),
          ],
        ),
      ),
    );
  }
}

class _HeroPanel extends StatelessWidget {
  final String username;
  final String role;
  final String locationLabel;
  final bool isFieldMode;

  const _HeroPanel({
    required this.username,
    required this.role,
    required this.locationLabel,
    required this.isFieldMode,
  });

  @override
  Widget build(BuildContext context) {
    final cleanedLocation = locationLabel.trim().isEmpty
        ? 'Waiting for location'
        : locationLabel.trim();

    return LayoutBuilder(
      builder: (context, constraints) {
        final heroHeight = constraints.maxWidth < 360 ? 320.0 : 288.0;

        return Container(
          height: heroHeight,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(38),
            boxShadow: AppTheme.softShadow(AppColors.primaryGreen),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(38),
            child: Stack(
              fit: StackFit.expand,
              children: [
                DynamicSugarcaneBackdrop(
                  borderRadius: BorderRadius.circular(38),
                  overlayGradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withValues(alpha: 0.10),
                      AppColors.forestGreen.withValues(
                        alpha: isFieldMode ? 0.16 : 0.20,
                      ),
                      AppColors.forestGreen.withValues(
                        alpha: isFieldMode ? 0.74 : 0.86,
                      ),
                    ],
                  ),
                ),
                DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        AppColors.forestGreen.withValues(
                          alpha: isFieldMode ? 0.16 : 0.24,
                        ),
                        Colors.transparent,
                        AppColors.forestGreen.withValues(
                          alpha: isFieldMode ? 0.16 : 0.22,
                        ),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(22, 20, 22, 22),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: [
                          _HeroTopBadge(
                            icon: Icons.badge_rounded,
                            label: role,
                            accent: true,
                          ),
                          _HeroTopBadge(
                            icon: Icons.location_on_rounded,
                            label: cleanedLocation,
                          ),
                        ],
                      ),
                      const SizedBox(height: 26),
                      const Text(
                        'Welcome back',
                        style: TextStyle(
                          color: Colors.white70,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        username,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 32,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -1.1,
                          height: 1.0,
                        ),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'Check the latest weather, review sync, and continue your field work from one place.',
                        style: TextStyle(
                          color: Colors.white70,
                          fontWeight: FontWeight.w600,
                          height: 1.45,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _HeroTopBadge extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool accent;

  const _HeroTopBadge({
    required this.icon,
    required this.label,
    this.accent = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: accent
            ? AppColors.butterYellow.withValues(alpha: 0.94)
            : Colors.white.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: accent
              ? AppColors.peach.withValues(alpha: 0.9)
              : Colors.white.withValues(alpha: 0.22),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 16,
            color: accent ? AppColors.forestGreen : Colors.white,
          ),
          const SizedBox(width: 8),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 180),
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: accent ? AppColors.forestGreen : Colors.white,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _WeatherWidget extends StatelessWidget {
  final WeatherProvider weatherProvider;
  final bool isFieldMode;

  const _WeatherWidget({
    required this.weatherProvider,
    required this.isFieldMode,
  });

  @override
  Widget build(BuildContext context) {
    if (weatherProvider.isWeatherLoading && !weatherProvider.hasWeatherData) {
      return ShimmerLoading.card(height: 228);
    }

    if (!weatherProvider.hasWeatherData) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: isFieldMode
                ? const [Colors.white, AppColors.softCream]
                : [
                    Colors.white.withValues(alpha: 0.94),
                    AppColors.dewBlue.withValues(alpha: 0.34),
                  ],
          ),
          borderRadius: BorderRadius.circular(32),
          border: Border.all(
            color: isFieldMode
                ? AppColors.borderSoft
                : Colors.white.withValues(alpha: 0.8),
          ),
          boxShadow: AppTheme.softShadow(AppColors.dewBlue),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.my_location_rounded, color: AppColors.forestGreen),
                SizedBox(width: 10),
                Text(
                  'Finding local weather',
                  style: TextStyle(
                    color: AppColors.forestGreen,
                    fontWeight: FontWeight.w900,
                    fontSize: 18,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              weatherProvider.weatherError ??
                  'We will refresh this card as soon as GPS and network are ready.',
              style: const TextStyle(
                color: AppColors.textDark,
                fontWeight: FontWeight.w700,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              weatherProvider.locationName,
              style: const TextStyle(
                color: AppColors.textGray,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      );
    }

    final condition = weatherProvider.weatherCondition;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isFieldMode
              ? const [Colors.white, AppColors.softCream]
              : [
                  Colors.white.withValues(alpha: 0.94),
                  AppColors.dewBlue.withValues(alpha: 0.34),
                ],
        ),
        borderRadius: BorderRadius.circular(32),
        border: Border.all(
          color: isFieldMode
              ? AppColors.borderSoft
              : Colors.white.withValues(alpha: 0.8),
        ),
        boxShadow: AppTheme.softShadow(AppColors.dewBlue),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Weather',
                style: TextStyle(
                  color: AppColors.forestGreen,
                  fontWeight: FontWeight.w900,
                  fontSize: 20,
                ),
              ),
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppColors.dewBlue.withValues(alpha: 0.85),
                      AppColors.lightGreen.withValues(alpha: 0.65),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Icon(
                  _getWeatherIcon(condition),
                  color: AppColors.forestGreen,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            '${weatherProvider.temperature.toInt()}°C',
            style: const TextStyle(
              fontSize: 40,
              fontWeight: FontWeight.w900,
              color: AppColors.forestGreen,
              letterSpacing: -1.4,
              height: 0.95,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            condition,
            style: const TextStyle(
              fontWeight: FontWeight.w900,
              fontSize: 20,
              color: AppColors.textDark,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(
                Icons.location_on_rounded,
                size: 16,
                color: AppColors.textGray,
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  weatherProvider.locationName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.textGray,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _TinyMetric(
                icon: Icons.umbrella_rounded,
                label: '${weatherProvider.rainfallChance.toInt()}% rain',
                color: AppColors.dewBlue,
              ),
              _TinyMetric(
                icon: Icons.water_drop_rounded,
                label: '${weatherProvider.humidity.toInt()}% humidity',
                color: AppColors.lightGreen,
              ),
            ],
          ),
        ],
      ),
    );
  }

  IconData _getWeatherIcon(String condition) {
    switch (condition.toLowerCase()) {
      case 'clear':
      case 'clear night':
        return Icons.wb_sunny_rounded;
      case 'partly cloudy':
      case 'cloudy':
        return Icons.wb_cloudy_rounded;
      case 'overcast':
        return Icons.cloud_rounded;
      case 'drizzle':
      case 'rain':
        return Icons.beach_access_rounded;
      case 'thunderstorm':
        return Icons.thunderstorm_rounded;
      default:
        return Icons.wb_cloudy_rounded;
    }
  }
}

class _SyncRadarWidget extends StatelessWidget {
  final SyncProvider syncProvider;
  final bool isFieldMode;

  const _SyncRadarWidget({
    required this.syncProvider,
    required this.isFieldMode,
  });

  @override
  Widget build(BuildContext context) {
    if (syncProvider.isSyncing && syncProvider.totalRecords == 0) {
      return ShimmerLoading.card(height: 228);
    }

    final progress = syncProvider.totalRecords == 0
        ? 0.0
        : syncProvider.syncedCount / syncProvider.totalRecords;
    final issueMessage = syncProvider.connectionIssueMessage;
    final statusLabel = syncProvider.isDatabaseConnected
        ? 'Connected'
        : syncProvider.hasNetworkConnection
        ? 'Attention'
        : 'Offline';
    final headline = syncProvider.isSyncing
        ? 'Sending cane records'
        : !syncProvider.isDatabaseConnected &&
              syncProvider.hasNetworkConnection &&
              issueMessage != null
        ? 'Sync needs attention'
        : syncProvider.unsyncedCount == 0
        ? 'All records aligned'
        : '${syncProvider.unsyncedCount} records pending';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isFieldMode
              ? const [Colors.white, AppColors.softCream]
              : [AppColors.forestGreen, AppColors.primaryGreen],
        ),
        borderRadius: BorderRadius.circular(30),
        boxShadow: AppTheme.softShadow(AppColors.primaryGreen),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Sync',
                style: TextStyle(
                  color: isFieldMode ? AppColors.textDark : Colors.white,
                  fontWeight: FontWeight.w900,
                  fontSize: 20,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 9,
                ),
                decoration: BoxDecoration(
                  color: isFieldMode
                      ? Colors.white
                      : Colors.white.withValues(alpha: 0.16),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      syncProvider.isOnline
                          ? Icons.wifi_rounded
                          : Icons.wifi_off_rounded,
                      size: 15,
                      color: isFieldMode ? AppColors.forestGreen : Colors.white,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      statusLabel,
                      style: TextStyle(
                        color: isFieldMode
                            ? AppColors.forestGreen
                            : Colors.white,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Text(
            headline,
            style: TextStyle(
              color: isFieldMode ? AppColors.textDark : Colors.white,
              fontWeight: FontWeight.w900,
              fontSize: 24,
              height: 1.05,
              letterSpacing: -0.9,
            ),
          ),
          Text(
            syncProvider.isSyncing
                ? 'Records are moving to the cloud now.'
                : issueMessage ?? 'See whether anything still needs syncing.',
            style: TextStyle(
              color: isFieldMode ? AppColors.textGray : Colors.white70,
              fontWeight: FontWeight.w700,
              height: 1.45,
            ),
          ),
          if (!syncProvider.isDatabaseConnected && issueMessage != null) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: isFieldMode
                    ? Colors.white
                    : Colors.white.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isFieldMode
                      ? AppColors.borderSoft
                      : Colors.white.withValues(alpha: 0.14),
                ),
              ),
              child: Text(
                issueMessage,
                style: TextStyle(
                  color: isFieldMode ? AppColors.textDark : Colors.white,
                  fontWeight: FontWeight.w700,
                  height: 1.35,
                ),
              ),
            ),
          ],
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 8,
              backgroundColor: isFieldMode
                  ? AppColors.sageGreen
                  : Colors.white.withValues(alpha: 0.18),
              valueColor: AlwaysStoppedAnimation<Color>(
                isFieldMode ? AppColors.forestGreen : AppColors.butterYellow,
              ),
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _SyncStatTile(
                  label: 'Synced',
                  value: '${syncProvider.syncedCount}',
                  dark: !isFieldMode,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _SyncStatTile(
                  label: 'Pending',
                  value: '${syncProvider.unsyncedCount}',
                  dark: !isFieldMode,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _PulseIndicator extends StatefulWidget {
  final bool active;

  const _PulseIndicator({required this.active});

  @override
  State<_PulseIndicator> createState() => _PulseIndicatorState();
}

class _PulseIndicatorState extends State<_PulseIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.active) {
      return const Icon(
        Icons.check_circle_rounded,
        color: AppColors.successGreen,
        size: 14,
      );
    }

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Container(
          width: 14,
          height: 14,
          decoration: BoxDecoration(
            color: AppColors.warningAmber.withValues(
              alpha: 1 - _controller.value,
            ),
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.warningAmber, width: 2),
          ),
        );
      },
    );
  }
}

class _HeaderAction extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final bool filled;

  const _HeaderAction({
    required this.icon,
    required this.onTap,
    this.filled = false,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: filled
              ? Colors.white.withValues(alpha: 0.82)
              : Colors.white.withValues(alpha: 0.64),
          shape: BoxShape.circle,
          boxShadow: AppTheme.softShadow(AppColors.lightGreen),
        ),
        child: Icon(icon, color: AppColors.forestGreen, size: 20),
      ),
    );
  }
}

class _DashboardSectionHeader extends StatelessWidget {
  final String eyebrow;
  final String title;
  final String subtitle;

  const _DashboardSectionHeader({
    required this.eyebrow,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          eyebrow,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.3,
            color: AppColors.forestGreen,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          title,
          style: const TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w900,
            color: AppColors.textDark,
            letterSpacing: -1.0,
            height: 1.02,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          subtitle,
          style: const TextStyle(
            color: AppColors.textGray,
            fontWeight: FontWeight.w700,
            height: 1.45,
          ),
        ),
      ],
    );
  }
}

class _RefreshHintCard extends StatelessWidget {
  const _RefreshHintCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.butterYellow.withValues(alpha: 0.90),
            AppColors.peach.withValues(alpha: 0.84),
          ],
        ),
        borderRadius: BorderRadius.circular(28),
        boxShadow: AppTheme.softShadow(AppColors.peach),
      ),
      child: const Row(
        children: [
          Icon(Icons.refresh_rounded, color: AppColors.forestGreen, size: 22),
          SizedBox(width: 12),
          Expanded(
            child: Text(
              'Refresh the estate view whenever you need the latest conditions.',
              style: TextStyle(
                color: AppColors.forestGreen,
                fontWeight: FontWeight.w800,
                height: 1.35,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SyncStatTile extends StatelessWidget {
  final String label;
  final String value;
  final bool dark;

  const _SyncStatTile({
    required this.label,
    required this.value,
    this.dark = false,
  });

  @override
  Widget build(BuildContext context) {
    final background = dark
        ? Colors.white.withValues(alpha: 0.14)
        : AppColors.inputFieldGray;
    final foreground = dark ? Colors.white : AppColors.forestGreen;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: dark ? Colors.white24 : AppColors.borderSoft),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: foreground.withValues(alpha: 0.82),
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              color: foreground,
              fontSize: 18,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class _TinyMetric extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _TinyMetric({
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.22),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppColors.forestGreen),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              color: AppColors.forestGreen,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _ObservationInsights {
  final int totalObservations;
  final int uniqueFields;
  final int trackedInputFields;
  final double? averageYield;
  final double? averageTamMm;
  final double? averageSoilPh;
  final String latestFieldLabel;
  final DateTime? latestObservationDate;
  final double overallCoverageRatio;
  final double yieldCoverageRatio;
  final List<_DailyObservationCount> weeklyActivity;
  final List<_CoverageMetric> coverageMetrics;
  final List<_YieldBreakdown> yieldBreakdowns;
  final List<_FieldSummary> fieldSummaries;
  final List<_NumericSummary> numericSummaries;
  final List<_CategoryDistribution> categoricalDistributions;
  final List<_ScatterSeries> scatterSeries;

  const _ObservationInsights({
    required this.totalObservations,
    required this.uniqueFields,
    required this.trackedInputFields,
    required this.averageYield,
    required this.averageTamMm,
    required this.averageSoilPh,
    required this.latestFieldLabel,
    required this.latestObservationDate,
    required this.overallCoverageRatio,
    required this.yieldCoverageRatio,
    required this.weeklyActivity,
    required this.coverageMetrics,
    required this.yieldBreakdowns,
    required this.fieldSummaries,
    required this.numericSummaries,
    required this.categoricalDistributions,
    required this.scatterSeries,
  });
}

class _DailyObservationCount {
  final DateTime day;
  final int count;

  const _DailyObservationCount({required this.day, required this.count});
}

class _RankedMetric {
  final String label;
  final double value;
  final String valueLabel;

  const _RankedMetric({
    required this.label,
    required this.value,
    required this.valueLabel,
  });
}

class _CoverageMetric {
  final String label;
  final double ratio;
  final String valueLabel;
  final List<Color> colors;

  const _CoverageMetric({
    required this.label,
    required this.ratio,
    required this.valueLabel,
    required this.colors,
  });
}

class _YieldBreakdown {
  final String title;
  final String dimensionPath;
  final int sampleCount;
  final List<_RankedMetric> entries;

  const _YieldBreakdown({
    required this.title,
    required this.dimensionPath,
    required this.sampleCount,
    required this.entries,
  });
}

class _YieldAggregate {
  double total = 0;
  int count = 0;
}

class _NumericAccumulator {
  int count = 0;
  double total = 0;
  double? minimum;
  double? maximum;

  void add(double value) {
    count += 1;
    total += value;
    minimum = minimum == null ? value : (value < minimum! ? value : minimum);
    maximum = maximum == null ? value : (value > maximum! ? value : maximum);
  }

  double get average => count == 0 ? 0 : total / count;
}

class _FieldSummary {
  final String path;
  final String sectionLabel;
  final String fieldLabel;
  final double completenessRatio;
  final int filledCount;
  final int distinctCount;
  final String sampleValues;

  const _FieldSummary({
    required this.path,
    required this.sectionLabel,
    required this.fieldLabel,
    required this.completenessRatio,
    required this.filledCount,
    required this.distinctCount,
    required this.sampleValues,
  });
}

class _NumericSummary {
  final String path;
  final String sectionLabel;
  final String fieldLabel;
  final int sampleCount;
  final double average;
  final double minimum;
  final double maximum;

  const _NumericSummary({
    required this.path,
    required this.sectionLabel,
    required this.fieldLabel,
    required this.sampleCount,
    required this.average,
    required this.minimum,
    required this.maximum,
  });
}

class _CategoryDistribution {
  final String path;
  final String sectionLabel;
  final String fieldLabel;
  final String title;
  final String subtitle;
  final int totalCount;
  final List<_CategorySlice> slices;

  const _CategoryDistribution({
    required this.path,
    required this.sectionLabel,
    required this.fieldLabel,
    required this.title,
    required this.subtitle,
    required this.totalCount,
    required this.slices,
  });
}

class _CategorySlice {
  final String label;
  final int count;
  final double ratio;

  const _CategorySlice({
    required this.label,
    required this.count,
    required this.ratio,
  });
}

class _ScatterSeries {
  final String title;
  final String xLabel;
  final String yLabel;
  final List<Offset> points;

  const _ScatterSeries({
    required this.title,
    required this.xLabel,
    required this.yLabel,
    required this.points,
  });
}

class _ObservationInsightsPanel extends StatelessWidget {
  final _ObservationInsights? insights;
  final bool isLoading;
  final String? errorMessage;
  final bool isFieldMode;
  final VoidCallback onRetry;

  const _ObservationInsightsPanel({
    required this.insights,
    required this.isLoading,
    required this.errorMessage,
    required this.isFieldMode,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return Column(
        children: [
          ShimmerLoading.card(height: 170),
          const SizedBox(height: 16),
          ShimmerLoading.card(height: 210),
          const SizedBox(height: 16),
          ShimmerLoading.card(height: 220),
        ],
      );
    }

    if (errorMessage != null) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isFieldMode
              ? Colors.white
              : Colors.white.withValues(alpha: 0.84),
          borderRadius: BorderRadius.circular(30),
          border: Border.all(
            color: isFieldMode ? AppColors.borderSoft : Colors.white,
          ),
          boxShadow: AppTheme.softShadow(AppColors.peach),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Insight data is unavailable',
              style: TextStyle(
                color: AppColors.textDark,
                fontSize: 18,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              errorMessage!,
              style: const TextStyle(
                color: AppColors.textGray,
                fontWeight: FontWeight.w700,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 14),
            Align(
              alignment: Alignment.centerLeft,
              child: FilledButton.tonal(
                onPressed: onRetry,
                child: const Text('Retry'),
              ),
            ),
          ],
        ),
      );
    }

    final data = insights;
    if (data == null || data.totalObservations == 0) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: isFieldMode
                ? const [Colors.white, AppColors.softCream]
                : [
                    Colors.white.withValues(alpha: 0.88),
                    AppColors.softCream.withValues(alpha: 0.96),
                  ],
          ),
          borderRadius: BorderRadius.circular(30),
          border: Border.all(color: Colors.white),
          boxShadow: AppTheme.softShadow(AppColors.lightGreen),
        ),
        child: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'No observation data yet',
              style: TextStyle(
                color: AppColors.textDark,
                fontSize: 20,
                fontWeight: FontWeight.w900,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'Create or sync at least one cane observation to unlock dataset-driven coverage and yield analysis.',
              style: TextStyle(
                color: AppColors.textGray,
                fontWeight: FontWeight.w700,
                height: 1.45,
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        _ObservationSnapshotCard(data: data, isFieldMode: isFieldMode),
        const SizedBox(height: 16),
        _ActivityAndCoverageRow(data: data, isFieldMode: isFieldMode),
        const SizedBox(height: 16),
        _RankedBreakdownCard(data: data, isFieldMode: isFieldMode),
        const SizedBox(height: 16),
        _DatasetAnalysisWorkbench(data: data, isFieldMode: isFieldMode),
      ],
    );
  }
}

class _ObservationSnapshotCard extends StatelessWidget {
  final _ObservationInsights data;
  final bool isFieldMode;

  const _ObservationSnapshotCard({
    required this.data,
    required this.isFieldMode,
  });

  @override
  Widget build(BuildContext context) {
    final latestLabel = data.latestObservationDate == null
        ? 'No recent timestamp'
        : '${data.latestFieldLabel} • ${_formatCompactDate(data.latestObservationDate!)}';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isFieldMode
              ? const [AppColors.forestGreen, AppColors.primaryGreen]
              : [AppColors.forestGreen, AppColors.primaryGreen],
        ),
        borderRadius: BorderRadius.circular(36),
        boxShadow: AppTheme.softShadow(AppColors.primaryGreen),
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
                    const Text(
                      'Performance and yield snapshot',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.8,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      latestLabel,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.78),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.16),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.18),
                  ),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.insights_rounded, size: 16, color: Colors.white),
                    SizedBox(width: 8),
                    Text(
                      'Live metrics',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          LayoutBuilder(
            builder: (context, constraints) {
              final crossAxisCount = constraints.maxWidth >= 760
                  ? 4
                  : constraints.maxWidth >= 520
                  ? 3
                  : 2;
              final mainAxisExtent = crossAxisCount == 2 ? 178.0 : 166.0;
              final tiles = [
                _MetricTile(
                  title: 'Observations',
                  value: '${data.totalObservations}',
                  caption: 'All local + synced records',
                  colors: AppColors.primaryGradient,
                ),
                _MetricTile(
                  title: 'Fields covered',
                  value: '${data.uniqueFields}',
                  caption: 'Distinct cane blocks or fields',
                  colors: AppColors.coolGradient,
                ),
                _MetricTile(
                  title: 'Avg yield',
                  value: data.averageYield == null
                      ? 'N/A'
                      : '${data.averageYield!.toStringAsFixed(1)} t/ha',
                  caption: 'Across observations with yield',
                  colors: AppColors.warmGradient,
                ),
                _MetricTile(
                  title: 'Avg TAM',
                  value: data.averageTamMm == null
                      ? 'N/A'
                      : '${data.averageTamMm!.toStringAsFixed(1)} mm',
                  caption: 'Across observations with TAM',
                  colors: const [AppColors.dewBlue, AppColors.primaryGreen],
                ),
                _MetricTile(
                  title: 'Avg soil pH',
                  value: data.averageSoilPh == null
                      ? 'N/A'
                      : data.averageSoilPh!.toStringAsFixed(1),
                  caption: 'Across observations with pH',
                  colors: const [AppColors.sageGreen, AppColors.dewBlue],
                ),
                _MetricTile(
                  title: 'Form coverage',
                  value: '${(data.overallCoverageRatio * 100).round()}%',
                  caption:
                      '${data.trackedInputFields} dataset fields detected for completeness',
                  colors: const [AppColors.peach, AppColors.lightGreen],
                ),
              ];

              return GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: tiles.length,
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: crossAxisCount,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  mainAxisExtent: mainAxisExtent,
                ),
                itemBuilder: (context, index) => tiles[index],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _ActivityAndCoverageRow extends StatelessWidget {
  final _ObservationInsights data;
  final bool isFieldMode;

  const _ActivityAndCoverageRow({
    required this.data,
    required this.isFieldMode,
  });

  @override
  Widget build(BuildContext context) {
    return _PanelShell(
      title: '7-day activity',
      subtitle: 'How often field notes were captured this week',
      isFieldMode: isFieldMode,
      accent: AppColors.dewBlue,
      child: _WeeklyActivityChart(data: data.weeklyActivity),
    );
  }
}

class _RankedBreakdownCard extends StatelessWidget {
  final _ObservationInsights data;
  final bool isFieldMode;

  const _RankedBreakdownCard({required this.data, required this.isFieldMode});

  @override
  Widget build(BuildContext context) {
    if (data.yieldBreakdowns.isEmpty) {
      return _PanelShell(
        title: 'Yield analysis',
        subtitle:
            'Best-performing groups from the fields available in your dataset',
        isFieldMode: isFieldMode,
        accent: AppColors.peach,
        child: const Text(
          'Not enough yield-linked category data yet.',
          style: TextStyle(
            color: AppColors.textGray,
            fontWeight: FontWeight.w700,
          ),
        ),
      );
    }

    return _PanelShell(
      title: 'Yield analysis',
      subtitle:
          'Best-performing groups from the fields available in your dataset',
      isFieldMode: isFieldMode,
      accent: AppColors.peach,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final breakdowns = data.yieldBreakdowns;
          final stacked = constraints.maxWidth < 720 || breakdowns.length == 1;
          final palettes = <List<Color>>[
            AppColors.primaryGradient,
            AppColors.coolGradient,
          ];
          final charts = breakdowns.asMap().entries.map((entry) {
            final breakdown = entry.value;
            return _RankedBarGroup(
              title: breakdown.title,
              entries: breakdown.entries,
              colors: palettes[entry.key % palettes.length],
              emptyLabel: 'Not enough yield data yet',
            );
          }).toList();

          if (stacked) {
            return Column(
              children: charts.asMap().entries.expand((entry) {
                final widgets = <Widget>[entry.value];
                if (entry.key != charts.length - 1) {
                  widgets.add(const SizedBox(height: 18));
                }
                return widgets;
              }).toList(),
            );
          }

          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: charts[0]),
              const SizedBox(width: 16),
              Expanded(child: charts[1]),
            ],
          );
        },
      ),
    );
  }
}

class _DatasetAnalysisWorkbench extends StatelessWidget {
  final _ObservationInsights data;
  final bool isFieldMode;

  const _DatasetAnalysisWorkbench({
    required this.data,
    required this.isFieldMode,
  });

  @override
  Widget build(BuildContext context) {
    return _PanelShell(
      title: 'Pie Chart',
      subtitle: 'Category mix from the recorded dataset',
      isFieldMode: isFieldMode,
      accent: AppColors.peach,
      child: _CategoryPieCard(
        distribution: data.categoricalDistributions.isEmpty
            ? null
            : data.categoricalDistributions.first,
      ),
    );
  }
}

class _CategoryPieCard extends StatelessWidget {
  final _CategoryDistribution? distribution;

  const _CategoryPieCard({required this.distribution});

  @override
  Widget build(BuildContext context) {
    final data = distribution;
    if (data == null || data.slices.isEmpty) {
      return const Text(
        'Not enough category data yet.',
        style: TextStyle(
          color: AppColors.textGray,
          fontWeight: FontWeight.w700,
        ),
      );
    }

    final palette = <Color>[
      AppColors.primaryGreen,
      AppColors.dewBlue,
      AppColors.peach,
      AppColors.sageGreen,
      AppColors.butterYellow,
      AppColors.lightGreen,
    ];
    final dominantSlice = data.slices.reduce(
      (current, next) => current.ratio >= next.ratio ? current : next,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    data.title,
                    style: const TextStyle(
                      color: AppColors.textDark,
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.4,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    data.subtitle,
                    style: const TextStyle(
                      color: AppColors.textGray,
                      fontWeight: FontWeight.w700,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            _CategoryCountBadge(totalCount: data.totalCount),
          ],
        ),
        const SizedBox(height: 16),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.white.withValues(alpha: 0.96),
                AppColors.inputFieldGray.withValues(alpha: 0.96),
                AppColors.softCream.withValues(alpha: 0.98),
              ],
            ),
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: AppColors.borderSoft),
            boxShadow: AppTheme.softShadow(AppColors.dewBlue),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _CategoryStatusPill(
                    icon: Icons.storage_rounded,
                    label:
                        '${data.totalCount} ${data.totalCount == 1 ? 'record' : 'records'}',
                  ),
                  _CategoryStatusPill(
                    icon: Icons.star_rounded,
                    label:
                        'Top: ${dominantSlice.label} ${_formatRoundedChartPercent(dominantSlice.ratio)}',
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Center(
                child: SizedBox(
                  width: 224,
                  height: 224,
                  child: CustomPaint(
                    painter: _PieChartPainter(
                      slices: data.slices,
                      palette: palette,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          'Legend',
          style: TextStyle(
            color: AppColors.textDark,
            fontWeight: FontWeight.w900,
            fontSize: 16,
          ),
        ),
        const SizedBox(height: 10),
        ...data.slices.asMap().entries.map((entry) {
          final slice = entry.value;
          final color = palette[entry.key % palette.length];
          final roundedPercentLabel = _formatRoundedChartPercent(slice.ratio);
          final exactPercentLabel = _formatExactChartPercent(
            slice.count,
            data.totalCount,
          );
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _CategorySliceCard(
              color: color,
              slice: slice,
              totalCount: data.totalCount,
              roundedPercentLabel: roundedPercentLabel,
              exactPercentLabel: exactPercentLabel,
            ),
          );
        }),
      ],
    );
  }
}

class _CategoryCountBadge extends StatelessWidget {
  final int totalCount;

  const _CategoryCountBadge({required this.totalCount});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: AppColors.primaryGradient),
        borderRadius: BorderRadius.circular(999),
        boxShadow: AppTheme.softShadow(AppColors.primaryGreen),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.donut_small_rounded, color: Colors.white, size: 16),
          const SizedBox(width: 8),
          Text(
            '$totalCount records',
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w900,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }
}

class _CategoryStatusPill extends StatelessWidget {
  final IconData icon;
  final String label;

  const _CategoryStatusPill({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.82),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: AppColors.forestGreen),
          const SizedBox(width: 8),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 240),
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppColors.forestGreen,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CategorySliceCard extends StatelessWidget {
  final Color color;
  final _CategorySlice slice;
  final int totalCount;
  final String roundedPercentLabel;
  final String exactPercentLabel;

  const _CategorySliceCard({
    required this.color,
    required this.slice,
    required this.totalCount,
    required this.roundedPercentLabel,
    required this.exactPercentLabel,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white.withValues(alpha: 0.95),
            color.withValues(alpha: 0.12),
          ],
        ),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.borderSoft),
        boxShadow: AppTheme.softShadow(color.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 14,
                height: 14,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      slice.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textDark,
                        fontWeight: FontWeight.w900,
                        fontSize: 18,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${slice.count} of $totalCount records • $exactPercentLabel',
                      style: const TextStyle(
                        color: AppColors.textGray,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 9,
                ),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.9),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: color.withValues(alpha: 0.35)),
                ),
                child: Text(
                  roundedPercentLabel,
                  style: const TextStyle(
                    color: AppColors.forestGreen,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: slice.ratio.clamp(0.0, 1.0),
              minHeight: 10,
              backgroundColor: Colors.white.withValues(alpha: 0.75),
              valueColor: AlwaysStoppedAnimation<Color>(color),
            ),
          ),
          if (exactPercentLabel != roundedPercentLabel)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Text(
                'Chart shows $roundedPercentLabel after rounding.',
                style: const TextStyle(
                  color: AppColors.textGray,
                  fontWeight: FontWeight.w700,
                  height: 1.35,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _PanelShell extends StatelessWidget {
  final String title;
  final String subtitle;
  final bool isFieldMode;
  final Color accent;
  final Widget child;

  const _PanelShell({
    required this.title,
    required this.subtitle,
    required this.isFieldMode,
    required this.accent,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isFieldMode
              ? const [Colors.white, AppColors.softCream]
              : [
                  Colors.white.withValues(alpha: 0.90),
                  accent.withValues(alpha: 0.16),
                ],
        ),
        borderRadius: BorderRadius.circular(32),
        border: Border.all(
          color: isFieldMode ? AppColors.borderSoft : Colors.white,
        ),
        boxShadow: AppTheme.softShadow(accent),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 6,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.65),
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          const SizedBox(height: 14),
          Text(
            title,
            style: const TextStyle(
              color: AppColors.textDark,
              fontSize: 20,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: const TextStyle(
              color: AppColors.textGray,
              fontWeight: FontWeight.w700,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 18),
          child,
        ],
      ),
    );
  }
}

class _MetricTile extends StatelessWidget {
  final String title;
  final String value;
  final String caption;
  final List<Color> colors;

  const _MetricTile({
    required this.title,
    required this.value,
    required this.caption,
    required this.colors,
  });

  @override
  Widget build(BuildContext context) {
    final foreground = colors.last.computeLuminance() < 0.45
        ? Colors.white
        : AppColors.forestGreen;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: colors),
        borderRadius: BorderRadius.circular(24),
        boxShadow: AppTheme.softShadow(colors.last),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              color: foreground,
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              color: foreground,
              fontSize: 28,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.9,
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: Text(
              caption,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: foreground.withValues(alpha: 0.9),
                fontWeight: FontWeight.w700,
                height: 1.3,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _WeeklyActivityChart extends StatelessWidget {
  final List<_DailyObservationCount> data;

  const _WeeklyActivityChart({required this.data});

  @override
  Widget build(BuildContext context) {
    final highest = data.fold<int>(
      0,
      (max, item) => item.count > max ? item.count : max,
    );

    return SizedBox(
      height: 172,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: data.map((entry) {
          final heightFactor = highest == 0 ? 0.08 : entry.count / highest;
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text(
                    '${entry.count}',
                    style: const TextStyle(
                      color: AppColors.textGray,
                      fontWeight: FontWeight.w800,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Expanded(
                    child: Align(
                      alignment: Alignment.bottomCenter,
                      child: FractionallySizedBox(
                        heightFactor: heightFactor.clamp(0.08, 1.0),
                        child: Container(
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: AppColors.primaryGradient,
                            ),
                            borderRadius: BorderRadius.circular(18),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    _weekdayLabel(entry.day),
                    style: const TextStyle(
                      color: AppColors.forestGreen,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  static String _weekdayLabel(DateTime date) {
    const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    return labels[date.weekday - 1];
  }
}

class _RankedBarGroup extends StatelessWidget {
  final String title;
  final List<_RankedMetric> entries;
  final List<Color> colors;
  final String emptyLabel;

  const _RankedBarGroup({
    required this.title,
    required this.entries,
    required this.colors,
    required this.emptyLabel,
  });

  @override
  Widget build(BuildContext context) {
    if (entries.isEmpty) {
      return Text(
        emptyLabel,
        style: const TextStyle(
          color: AppColors.textGray,
          fontWeight: FontWeight.w700,
        ),
      );
    }

    final highest = entries.first.value == 0
        ? 1
        : entries.map((entry) => entry.value).reduce((a, b) => a > b ? a : b);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            color: AppColors.forestGreen,
            fontWeight: FontWeight.w900,
            fontSize: 16,
          ),
        ),
        const SizedBox(height: 14),
        ...entries.map((entry) {
          final widthFactor = entry.value / highest;
          return Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        entry.label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.textDark,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      entry.valueLabel,
                      style: const TextStyle(
                        color: AppColors.forestGreen,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: LinearProgressIndicator(
                    value: widthFactor.clamp(0.0, 1.0),
                    minHeight: 12,
                    backgroundColor: AppColors.inputFieldGray,
                    valueColor: AlwaysStoppedAnimation<Color>(colors.last),
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }
}

class _PieChartPainter extends CustomPainter {
  final List<_CategorySlice> slices;
  final List<Color> palette;

  const _PieChartPainter({required this.slices, required this.palette});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.shortestSide / 2;
    final rect = Rect.fromCircle(center: center, radius: radius);
    final trackPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 24
      ..strokeCap = StrokeCap.round
      ..color = AppColors.inputFieldGray.withValues(alpha: 0.92);
    final strokePaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 24
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(rect, -1.5708, 6.28318, false, trackPaint);

    const gapAngle = 0.04;
    var startAngle = -1.5708;
    for (var index = 0; index < slices.length; index++) {
      final rawSweep = 6.28318 * slices[index].ratio;
      final sweep = rawSweep > gapAngle ? rawSweep - gapAngle : rawSweep;
      strokePaint.color = palette[index % palette.length];
      if (sweep > 0) {
        canvas.drawArc(rect, startAngle, sweep, false, strokePaint);
      }
      startAngle += rawSweep;
    }

    final holePaint = Paint()..color = Colors.white.withValues(alpha: 0.98);
    canvas.drawCircle(center, radius * 0.53, holePaint);
    final holeBorderPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..color = AppColors.borderSoft.withValues(alpha: 0.85);
    canvas.drawCircle(center, radius * 0.53, holeBorderPaint);

    final total = slices.fold<int>(0, (sum, slice) => sum + slice.count);
    final textPainter = TextPainter(
      text: TextSpan(
        text: '$total',
        style: const TextStyle(
          color: AppColors.forestGreen,
          fontSize: 28,
          fontWeight: FontWeight.w900,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    textPainter.paint(
      canvas,
      Offset(center.dx - textPainter.width / 2, center.dy - 22),
    );

    final labelPainter = TextPainter(
      text: const TextSpan(
        text: 'records',
        style: TextStyle(
          color: AppColors.textGray,
          fontSize: 13,
          fontWeight: FontWeight.w700,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    labelPainter.paint(
      canvas,
      Offset(center.dx - labelPainter.width / 2, center.dy + 8),
    );
  }

  @override
  bool shouldRepaint(covariant _PieChartPainter oldDelegate) {
    return oldDelegate.slices != slices || oldDelegate.palette != palette;
  }
}

String _formatCompactDate(DateTime date) {
  const monthNames = [
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
  return '${date.day} ${monthNames[date.month - 1]}';
}

String _formatRoundedChartPercent(double ratio) {
  return '${(ratio * 100).round()}%';
}

String _formatExactChartPercent(int count, int totalCount) {
  if (totalCount <= 0) return '0%';

  final percent = (count / totalCount) * 100;
  final wholePercent = percent.roundToDouble();
  if ((percent - wholePercent).abs() < 0.05) {
    return '${wholePercent.toInt()}%';
  }
  return '${percent.toStringAsFixed(1)}%';
}
