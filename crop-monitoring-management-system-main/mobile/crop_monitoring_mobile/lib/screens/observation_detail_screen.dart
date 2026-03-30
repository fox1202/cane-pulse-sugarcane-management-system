import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_map_cancellable_tile_provider/flutter_map_cancellable_tile_provider.dart';
import 'package:intl/intl.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/observation_models.dart';
import '../services/local_db.dart';
import '../services/supabase_service.dart';
import '../utils/app_colors.dart';
import '../utils/app_theme.dart';
import '../widgets/botanical_background.dart';
import '../widgets/block_map_viewer.dart';
import 'observation_form_screen.dart';

class ObservationDetailScreen extends StatefulWidget {
  final dynamic observationId;
  final bool isOffline;

  const ObservationDetailScreen({
    super.key,
    required this.observationId,
    this.isOffline = false,
  });

  @override
  State<ObservationDetailScreen> createState() =>
      _ObservationDetailScreenState();
}

class _ObservationDetailScreenState extends State<ObservationDetailScreen> {
  static const String _tileUserAgentPackageName =
      'com.example.crop_monitoring_mobile';

  final LocalDB _localDb = LocalDB();

  Map<String, dynamic>? _detail;
  bool _loading = true;

  Map<String, dynamic> get _fieldIdentification =>
      Map<String, dynamic>.from(_detail?['field_identification'] ?? const {});

  Map<String, dynamic> get _cropInformation =>
      Map<String, dynamic>.from(_detail?['crop_information'] ?? const {});

  Map<String, dynamic> get _cropMonitoring =>
      Map<String, dynamic>.from(_detail?['crop_monitoring'] ?? const {});

  Map<String, dynamic> get _soilCharacteristics =>
      Map<String, dynamic>.from(_detail?['soil_characteristics'] ?? const {});

  Map<String, dynamic> get _irrigationManagement =>
      Map<String, dynamic>.from(_detail?['irrigation_management'] ?? const {});

  Map<String, dynamic> get _nutrientManagement =>
      Map<String, dynamic>.from(_detail?['nutrient_management'] ?? const {});

  Map<String, dynamic> get _weedManagement =>
      Map<String, dynamic>.from(_detail?['weed_management'] ?? const {});

  Map<String, dynamic> get _harvestInformation =>
      Map<String, dynamic>.from(_detail?['harvest_information'] ?? const {});

  String get _fieldTitle {
    return observationDisplayName(_detail ?? const {}, fallback: 'Observation');
  }

  String get _fieldSubtitle {
    final parts = <String>[];
    final blockId = _textOrNull(_fieldIdentification['block_id']);
    final trialName = _textOrNull(_fieldIdentification['trial_name']);

    if (blockId != null && blockId != _fieldTitle) parts.add(blockId);
    if (trialName != null) parts.add(trialName);

    return parts.isEmpty
        ? 'Saved from the observation form'
        : parts.join(' • ');
  }

  String? get _recordedDateRaw {
    final rawDate =
        _fieldIdentification['date_recorded']?.toString() ??
        _detail?['created_at']?.toString() ??
        '';
    final trimmed = rawDate.trim();
    return trimmed.isEmpty ? null : trimmed;
  }

  String get _recordedDateLabel {
    final parsed = DateTime.tryParse(_recordedDateRaw ?? '');
    if (parsed == null) return 'No date';
    return DateFormat('dd MMM yyyy').format(parsed);
  }

  String? get _gpsAccuracyLabel {
    final accuracy = _toDouble(_fieldIdentification['gps_accuracy']);
    if (accuracy == null || accuracy <= 0) return null;
    return '${accuracy.toStringAsFixed(1)} m accuracy';
  }

  BlockModel? get _observationBlock {
    final geometry = _detail?['spatial_data'] ?? _detail?['geometry'];
    if (geometry == null) return null;

    final blockId =
        _textOrNull(_fieldIdentification['block_id']) ?? _fieldTitle;
    return BlockModel(
      id: _detail?['id']?.toString() ?? blockId,
      blockId: blockId,
      name: _fieldTitle,
      fieldName: _textOrNull(_fieldIdentification['field_name']) ?? _fieldTitle,
      geom: geometry,
    );
  }

  Map<String, dynamic> get _summaryData {
    final data = <String, dynamic>{};
    final blockId = _textOrNull(_fieldIdentification['block_id']);
    final blockSize = _formatArea(
      _fieldIdentification['area'] ?? _detail?['block_size'],
    );

    if (blockId != null) data['Block'] = blockId;
    if (_recordedDateRaw != null) data['Date recorded'] = _recordedDateRaw;
    if (blockSize != null) data['Block size'] = blockSize;
    if (_gpsAccuracyLabel != null) data['GPS accuracy'] = _gpsAccuracyLabel;

    return data;
  }

  Map<String, dynamic> get _observationData {
    final data = <String, dynamic>{};
    final cropClass = _textOrNull(_cropInformation['crop_class']);
    final variety = _textOrNull(_cropInformation['variety']);
    final irrigationType = _textOrNull(
      _irrigationManagement['irrigation_type'],
    );
    final waterSource = _textOrNull(_irrigationManagement['water_source']);
    final tamMmValue = _textOrNull(
      _fieldIdentification['tam_mm'] ??
          _fieldIdentification['time'] ??
          _fieldIdentification['tamm_area'],
    );
    final yieldAmount = _formatYield(_harvestInformation['yield']);
    final soilType = _textOrNull(_soilCharacteristics['soil_type']);
    final soilPh = _soilPhLabel();
    final remarks = _textOrNull(_cropMonitoring['remarks']);

    if (variety != null) data['Variety'] = variety;
    if (cropClass != null) data['Crop class'] = cropClass;
    if (irrigationType != null) data['Irrigation type'] = irrigationType;
    if (waterSource != null) data['Water source'] = waterSource;
    if (tamMmValue != null) data['TAM (mm)'] = tamMmValue;
    if (yieldAmount != null) data['Yield (t/ha)'] = yieldAmount;
    if (soilType != null) data['Soil type'] = soilType;
    if (soilPh != null) data['Soil pH'] = soilPh;
    if (remarks != null) data['Remarks'] = remarks;

    return data;
  }

  Map<String, dynamic> get _moreDetailsData {
    final data = <String, dynamic>{};
    final trialNumber = _fieldIdentification['trial_number'];
    final trialName = _textOrNull(_fieldIdentification['trial_name']);
    final contactPerson =
        _textOrNull(_fieldIdentification['contact_person_scientist']) ??
        _textOrNull(_fieldIdentification['contact_person']);
    final plantingDate = _textOrNull(_cropInformation['planting_date']);
    final cuttingDate = _textOrNull(_cropInformation['cutting_date']);
    final expectedHarvestDate = _textOrNull(
      _cropInformation['expected_harvest_date'],
    );

    if (trialNumber != null) data['Trial number'] = trialNumber;
    if (trialName != null) data['Trial name'] = trialName;
    if (contactPerson != null) data['Contact person'] = contactPerson;
    if (plantingDate != null) data['Planting date'] = plantingDate;
    if (cuttingDate != null) data['Cutting date'] = cuttingDate;
    if (expectedHarvestDate != null) {
      data['Expected harvest'] = expectedHarvestDate;
    }

    return data;
  }

  @override
  void initState() {
    super.initState();
    _loadDetail();
  }

  Future<void> _loadDetail() async {
    setState(() => _loading = true);
    try {
      if (widget.isOffline) {
        final id = widget.observationId is String
            ? int.parse(widget.observationId)
            : widget.observationId as int;
        final localRecord = await _localDb.getObservationById(id);
        if (localRecord != null) {
          _detail = normalizeObservationPayload(
            Map<String, dynamic>.from(jsonDecode(localRecord['data']) as Map),
          );
        }
      } else {
        final supabase = SupabaseService();
        _detail = await supabase.getObservationDetails(widget.observationId);
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error loading observation: $e')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  int? get _localObservationId {
    if (!widget.isOffline) return null;
    if (widget.observationId is int) return widget.observationId as int;
    return int.tryParse(widget.observationId.toString());
  }

  Future<void> _openForEditing() async {
    final detail = _detail;
    if (detail == null) return;

    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ObservationFormScreen(
          initialObservation: Map<String, dynamic>.from(detail),
          initialLocalObservationId: _localObservationId,
          initialIsOffline: widget.isOffline,
        ),
      ),
    );

    await _loadDetail();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: BotanicalBackground(
        showLeafTexture: false,
        child: SafeArea(
          child: _loading
              ? const Center(
                  child: CircularProgressIndicator(
                    color: AppColors.primaryGreen,
                  ),
                )
              : _detail == null
              ? _buildMissingState()
              : RefreshIndicator(
                  onRefresh: _loadDetail,
                  color: AppColors.primaryGreen,
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
                    children: [
                      _buildTopBar(),
                      const SizedBox(height: 18),
                      _buildHeroCard(),
                      const SizedBox(height: 22),
                      _buildDataSection(
                        title: 'Summary',
                        icon: Icons.grid_view_rounded,
                        data: _summaryData,
                      ),
                      _buildMapSection(),
                      _buildDataSection(
                        title: 'Observation',
                        icon: Icons.water_drop_rounded,
                        data: _observationData,
                      ),
                      _buildFertilizerApplicationsSection(),
                      _buildHerbicideApplicationsSection(),
                      _buildDataSection(
                        title: 'More details',
                        icon: Icons.info_outline_rounded,
                        data: _moreDetailsData,
                      ),
                      _buildImageSection(),
                    ],
                  ),
                ),
        ),
      ),
    );
  }

  Widget _buildTopBar() {
    final badge = _StatusBadge(
      icon: widget.isOffline
          ? Icons.edit_note_rounded
          : Icons.cloud_done_rounded,
      label: widget.isOffline ? 'Saved on device' : 'Saved to cloud',
      colors: widget.isOffline
          ? AppColors.warmGradient
          : AppColors.coolGradient,
    );
    const titleBlock = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Observation',
          style: TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w900,
            color: AppColors.textDark,
            letterSpacing: -0.8,
          ),
        ),
        SizedBox(height: 2),
        Text(
          'Review the saved field record.',
          style: TextStyle(
            color: AppColors.textGray,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );

    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxWidth < 430;

        if (compact) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  _CircleAction(
                    icon: Icons.arrow_back_ios_new_rounded,
                    onTap: () => Navigator.pop(context),
                  ),
                  const SizedBox(width: 10),
                  _CircleAction(
                    icon: Icons.edit_note_rounded,
                    onTap: _openForEditing,
                  ),
                  const Spacer(),
                  badge,
                ],
              ),
              const SizedBox(height: 16),
              titleBlock,
            ],
          );
        }

        return Row(
          children: [
            _CircleAction(
              icon: Icons.arrow_back_ios_new_rounded,
              onTap: () => Navigator.pop(context),
            ),
            const SizedBox(width: 10),
            _CircleAction(
              icon: Icons.edit_note_rounded,
              onTap: _openForEditing,
            ),
            const SizedBox(width: 14),
            const Expanded(child: titleBlock),
            const SizedBox(width: 12),
            badge,
          ],
        );
      },
    );
  }

  Widget _buildHeroCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white.withValues(alpha: 0.96),
            AppColors.softCream.withValues(alpha: 0.92),
          ],
        ),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: Colors.white),
        boxShadow: AppTheme.softShadow(AppColors.lightGreen),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.inputFieldGray,
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: AppColors.borderSoft),
            ),
            child: Text(
              _recordedDateLabel,
              style: const TextStyle(
                color: AppColors.forestGreen,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            _fieldTitle,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: AppColors.textDark,
              fontWeight: FontWeight.w900,
              fontSize: 28,
              letterSpacing: -0.8,
              height: 1.0,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _fieldSubtitle,
            style: const TextStyle(
              color: AppColors.textGray,
              fontWeight: FontWeight.w700,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 14),
          Wrap(spacing: 10, runSpacing: 10, children: _buildHeroPills()),
        ],
      ),
    );
  }

  List<Widget> _buildHeroPills() {
    final pills = <Widget>[];
    final blockId = _textOrNull(_fieldIdentification['block_id']);
    final variety = _textOrNull(_cropInformation['variety']);
    final blockSize = _formatArea(
      _fieldIdentification['area'] ?? _detail?['block_size'],
    );
    final tamMmValue = _textOrNull(
      _fieldIdentification['tam_mm'] ??
          _fieldIdentification['time'] ??
          _fieldIdentification['tamm_area'],
    );

    if (_gpsAccuracyLabel != null) {
      pills.add(
        _HeroPill(icon: Icons.pin_drop_rounded, label: _gpsAccuracyLabel!),
      );
    }
    if (blockId != null) {
      pills.add(_HeroPill(icon: Icons.tag_rounded, label: blockId));
    }
    if (variety != null) {
      pills.add(_HeroPill(icon: Icons.grass_rounded, label: variety));
    }
    if (blockSize != null) {
      pills.add(_HeroPill(icon: Icons.square_foot_rounded, label: blockSize));
    }
    if (tamMmValue != null) {
      pills.add(_HeroPill(icon: Icons.schedule_rounded, label: tamMmValue));
    }

    if (pills.isEmpty) {
      pills.add(
        const _HeroPill(
          icon: Icons.note_alt_rounded,
          label: 'Saved observation',
        ),
      );
    }

    return pills;
  }

  Widget _buildMapSection() {
    final latitude = _toDouble(_fieldIdentification['latitude']);
    final longitude = _toDouble(_fieldIdentification['longitude']);
    final hasCoordinates =
        latitude != null &&
        longitude != null &&
        (latitude != 0 || longitude != 0);
    final observationBlock = _observationBlock;
    final resolvedLatitude = latitude ?? 0;
    final resolvedLongitude = longitude ?? 0;

    if (!hasCoordinates && observationBlock == null) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: _SectionShell(
        title: 'Location',
        icon: Icons.map_rounded,
        child: Column(
          children: [
            if (observationBlock != null)
              BlockMapViewer(selectedBlock: observationBlock)
            else
              Container(
                height: 220,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: Colors.white),
                ),
                clipBehavior: Clip.antiAlias,
                child: FlutterMap(
                  options: MapOptions(
                    initialCenter: LatLng(latitude!, longitude!),
                    initialZoom: 16,
                  ),
                  children: [
                    TileLayer(
                      urlTemplate:
                          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: _tileUserAgentPackageName,
                      tileProvider: CancellableNetworkTileProvider(),
                    ),
                    RichAttributionWidget(
                      showFlutterMapAttribution: false,
                      attributions: [
                        TextSourceAttribution(
                          'OpenStreetMap contributors',
                          onTap: () => launchUrl(
                            Uri.parse(
                              'https://www.openstreetmap.org/copyright',
                            ),
                          ),
                        ),
                      ],
                    ),
                    MarkerLayer(
                      markers: [
                        Marker(
                          point: LatLng(latitude, longitude),
                          width: 64,
                          height: 64,
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.92),
                              shape: BoxShape.circle,
                              boxShadow: AppTheme.softShadow(
                                AppColors.primaryGreen,
                              ),
                            ),
                            child: const Icon(
                              Icons.location_on_rounded,
                              color: AppColors.forestGreen,
                              size: 34,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            if (hasCoordinates) ...[
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: _MiniMetric(
                      label: 'Latitude',
                      value: resolvedLatitude.toStringAsFixed(6),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _MiniMetric(
                      label: 'Longitude',
                      value: resolvedLongitude.toStringAsFixed(6),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              LayoutBuilder(
                builder: (context, constraints) {
                  final isWide = constraints.maxWidth >= 520;
                  final buttonWidth = isWide
                      ? (constraints.maxWidth - 12) / 2
                      : constraints.maxWidth;

                  return Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      SizedBox(
                        width: buttonWidth,
                        child: OutlinedButton.icon(
                          onPressed: () => _launchExternalMap(
                            _buildOpenStreetMapUri(
                              resolvedLatitude,
                              resolvedLongitude,
                            ),
                            'OpenStreetMap',
                          ),
                          icon: const Icon(Icons.public_rounded),
                          label: const Text('OpenStreetMap'),
                        ),
                      ),
                      SizedBox(
                        width: buttonWidth,
                        child: OutlinedButton.icon(
                          onPressed: () => _launchExternalMap(
                            _buildHybridMapUri(
                              resolvedLatitude,
                              resolvedLongitude,
                            ),
                            'hybrid map',
                          ),
                          icon: const Icon(Icons.satellite_alt_rounded),
                          label: const Text('Satellite / Hybrid'),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildImageSection() {
    final imageReference = Map<String, dynamic>.from(
      _detail?['image_reference'] ?? const {},
    );
    final images =
        imageReference['images'] ?? imageReference['image_urls'] ?? [];
    if (images is! List || images.isEmpty) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: _SectionShell(
        title: 'Photos',
        icon: Icons.photo_library_rounded,
        child: SizedBox(
          height: 176,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: images.length,
            separatorBuilder: (_, __) => const SizedBox(width: 14),
            itemBuilder: (context, index) {
              final entry = images[index];
              final imagePath = entry is Map
                  ? entry['image_url']?.toString() ?? ''
                  : entry.toString();
              final isLocalFile = !imagePath.startsWith('http');

              return Container(
                width: 176,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: Colors.white),
                  boxShadow: AppTheme.softShadow(AppColors.peach),
                ),
                clipBehavior: Clip.antiAlias,
                child: isLocalFile
                    ? Image.file(
                        File(imagePath),
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _buildImagePlaceholder(),
                      )
                    : Image.network(
                        imagePath,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _buildImagePlaceholder(),
                      ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildImagePlaceholder() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(colors: AppColors.coolGradient),
      ),
      child: const Center(
        child: Icon(
          Icons.image_not_supported_rounded,
          color: AppColors.forestGreen,
          size: 38,
        ),
      ),
    );
  }

  Widget _buildDataSection({
    required String title,
    required IconData icon,
    required dynamic data,
  }) {
    final normalized = _normalizeMap(data);
    if (normalized.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: _SectionShell(
        title: title,
        icon: icon,
        child: Column(
          children: normalized.entries.map((entry) {
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 9),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    flex: 5,
                    child: Text(
                      _formatKey(entry.key),
                      style: const TextStyle(
                        color: AppColors.textGray,
                        fontWeight: FontWeight.w700,
                        height: 1.35,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    flex: 6,
                    child: Text(
                      _formatValue(entry.value),
                      textAlign: TextAlign.end,
                      style: const TextStyle(
                        color: AppColors.textDark,
                        fontWeight: FontWeight.w800,
                        height: 1.35,
                      ),
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  List<Map<String, dynamic>> _applicationList(dynamic raw) {
    if (raw is List) {
      return raw
          .whereType<dynamic>()
          .map(_normalizeMap)
          .where((item) => item.isNotEmpty)
          .toList();
    }

    if (raw is String && raw.trim().isNotEmpty) {
      try {
        final decoded = jsonDecode(raw);
        if (decoded is List) {
          return decoded
              .whereType<dynamic>()
              .map(_normalizeMap)
              .where((item) => item.isNotEmpty)
              .toList();
        }
      } catch (_) {
        return <Map<String, dynamic>>[];
      }
    }

    return <Map<String, dynamic>>[];
  }

  Map<String, dynamic>? _currentFertilizerApplication() {
    final fertilizerType = _textOrNull(_nutrientManagement['fertilizer_type']);
    final applicationDate = _textOrNull(
      _nutrientManagement['application_date'],
    );
    final applicationRate = _nutrientManagement['application_rate'];
    final foliarSamplingDate = _textOrNull(
      _nutrientManagement['foliar_sampling_date'],
    );

    if (fertilizerType == null &&
        applicationDate == null &&
        applicationRate == null &&
        foliarSamplingDate == null) {
      return null;
    }

    return {
      'fertilizer_type': fertilizerType,
      'application_date': applicationDate,
      'application_rate': applicationRate,
      'foliar_sampling_date': foliarSamplingDate,
    };
  }

  Map<String, dynamic>? _currentHerbicideApplication() {
    final herbicideName = _textOrNull(_weedManagement['herbicide_name']);
    final applicationDate = _textOrNull(_weedManagement['application_date']);
    final applicationRate = _weedManagement['application_rate'];

    if (herbicideName == null &&
        applicationDate == null &&
        applicationRate == null) {
      return null;
    }

    return {
      'herbicide_name': herbicideName,
      'application_date': applicationDate,
      'application_rate': applicationRate,
    };
  }

  String _applicationSignature(
    Map<String, dynamic> application,
    List<String> keys,
  ) {
    return keys
        .map((key) => application[key]?.toString().trim().toLowerCase() ?? '')
        .join('|');
  }

  Widget _buildApplicationEntryCard({
    required String title,
    required Map<String, dynamic> application,
    required String nameKey,
    required String nameLabel,
    required String dateLabel,
    required String rateLabel,
    String? extraKey,
    String? extraLabel,
    bool isCurrent = false,
    bool highlight = false,
  }) {
    final rows = <MapEntry<String, dynamic>>[];
    if (_textOrNull(application[nameKey]) != null) {
      rows.add(MapEntry(nameLabel, application[nameKey]));
    }
    if (_textOrNull(application['application_date']) != null) {
      rows.add(MapEntry(dateLabel, application['application_date']));
    }
    if (application['application_rate'] != null) {
      rows.add(MapEntry(rateLabel, application['application_rate']));
    }
    if (extraKey != null &&
        extraLabel != null &&
        _textOrNull(application[extraKey]) != null) {
      rows.add(MapEntry(extraLabel, application[extraKey]));
    }

    if (rows.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: highlight
              ? [
                  AppColors.softCream.withValues(alpha: 0.96),
                  Colors.white.withValues(alpha: 0.98),
                ]
              : [
                  Colors.white.withValues(alpha: 0.94),
                  AppColors.inputFieldGray.withValues(alpha: 0.70),
                ],
        ),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: highlight ? AppColors.borderSoft : Colors.white,
        ),
        boxShadow: AppTheme.softShadow(
          highlight ? AppColors.lightGreen : AppColors.peach,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    color: AppColors.textDark,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              if (isCurrent)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.coolGradient.first.withValues(alpha: 0.9),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: const Text(
                    'Current',
                    style: TextStyle(
                      color: AppColors.forestGreen,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          ...rows.map(
            (entry) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    flex: 4,
                    child: Text(
                      entry.key,
                      style: const TextStyle(
                        color: AppColors.textGray,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 5,
                    child: Text(
                      _formatValue(entry.value),
                      textAlign: TextAlign.end,
                      style: const TextStyle(
                        color: AppColors.textDark,
                        fontWeight: FontWeight.w800,
                      ),
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

  Widget _buildApplicationSection({
    required String title,
    required IconData icon,
    required List<Map<String, dynamic>> applications,
    required Map<String, dynamic>? currentApplication,
    required List<String> signatureKeys,
    required String nameKey,
    required String nameLabel,
    required String dateLabel,
    required String rateLabel,
    String? extraKey,
    String? extraLabel,
  }) {
    if (applications.isEmpty && currentApplication == null) {
      return const SizedBox.shrink();
    }

    final currentSignature = currentApplication == null
        ? null
        : _applicationSignature(currentApplication, signatureKeys);

    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: _SectionShell(
        title: title,
        icon: icon,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (currentApplication != null) ...[
              _buildApplicationEntryCard(
                title: 'Current application',
                application: currentApplication,
                nameKey: nameKey,
                nameLabel: nameLabel,
                dateLabel: dateLabel,
                rateLabel: rateLabel,
                extraKey: extraKey,
                extraLabel: extraLabel,
                isCurrent: true,
                highlight: true,
              ),
              if (applications.isNotEmpty) const SizedBox(height: 14),
            ],
            if (applications.isNotEmpty) ...[
              const Text(
                'Saved applications',
                style: TextStyle(
                  color: AppColors.textGray,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 10),
              ...List.generate(applications.length, (index) {
                final application = applications[index];
                final isCurrent =
                    currentSignature != null &&
                    _applicationSignature(application, signatureKeys) ==
                        currentSignature;
                return Padding(
                  padding: EdgeInsets.only(
                    bottom: index == applications.length - 1 ? 0 : 12,
                  ),
                  child: _buildApplicationEntryCard(
                    title: 'Application ${index + 1}',
                    application: application,
                    nameKey: nameKey,
                    nameLabel: nameLabel,
                    dateLabel: dateLabel,
                    rateLabel: rateLabel,
                    extraKey: extraKey,
                    extraLabel: extraLabel,
                    isCurrent: isCurrent,
                  ),
                );
              }),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildFertilizerApplicationsSection() {
    return _buildApplicationSection(
      title: 'Fertilizer Applications',
      icon: Icons.compost_rounded,
      applications: _applicationList(_nutrientManagement['applications']),
      currentApplication: _currentFertilizerApplication(),
      signatureKeys: const [
        'fertilizer_type',
        'application_date',
        'application_rate',
        'foliar_sampling_date',
      ],
      nameKey: 'fertilizer_type',
      nameLabel: 'Fertilizer',
      dateLabel: 'Application date',
      rateLabel: 'Rate',
      extraKey: 'foliar_sampling_date',
      extraLabel: 'Foliar sampling',
    );
  }

  Widget _buildHerbicideApplicationsSection() {
    return _buildApplicationSection(
      title: 'Herbicide Applications',
      icon: Icons.grass_rounded,
      applications: _applicationList(_weedManagement['applications']),
      currentApplication: _currentHerbicideApplication(),
      signatureKeys: const [
        'herbicide_name',
        'application_date',
        'application_rate',
      ],
      nameKey: 'herbicide_name',
      nameLabel: 'Herbicide',
      dateLabel: 'Application date',
      rateLabel: 'Rate',
    );
  }

  Widget _buildMissingState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 108,
              height: 108,
              decoration: const BoxDecoration(
                gradient: LinearGradient(colors: AppColors.coolGradient),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.inventory_2_outlined,
                size: 52,
                color: AppColors.forestGreen,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'No observation found',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.w900,
                color: AppColors.textDark,
                letterSpacing: -0.8,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'This record could not be loaded. Go back and refresh the cane history list.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppColors.textGray,
                fontWeight: FontWeight.w700,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 18),
            OutlinedButton.icon(
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.arrow_back_rounded),
              label: const Text('Back to history'),
            ),
          ],
        ),
      ),
    );
  }

  Map<String, dynamic> _normalizeMap(dynamic raw) {
    if (raw == null) return {};
    if (raw is Map<String, dynamic>) return raw;
    if (raw is Map) return Map<String, dynamic>.from(raw);
    return {};
  }

  double? _toDouble(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '');
  }

  String? _textOrNull(dynamic value) {
    final text = value?.toString().trim() ?? '';
    return text.isEmpty ? null : text;
  }

  String? _formatArea(dynamic value) {
    final area = _toDouble(value);
    if (area == null || area <= 0) return null;
    return '${area.toStringAsFixed(area >= 100 ? 1 : 2)} ha';
  }

  String? _formatYield(dynamic value) {
    final yieldAmount = _toDouble(value);
    if (yieldAmount == null || yieldAmount <= 0) return null;
    final formatted = yieldAmount == yieldAmount.roundToDouble()
        ? yieldAmount.toStringAsFixed(0)
        : yieldAmount.toStringAsFixed(2);
    return '$formatted t/ha';
  }

  String? _soilPhLabel() {
    final soilPh = _toDouble(_soilCharacteristics['soil_ph']);
    final soilType = _textOrNull(_soilCharacteristics['soil_type']);

    if (soilPh == null) return null;
    if (soilType == null && (soilPh - 7.0).abs() < 0.0001) return null;

    return soilPh == soilPh.roundToDouble()
        ? soilPh.toStringAsFixed(1)
        : soilPh.toStringAsFixed(2);
  }

  Future<void> _launchExternalMap(Uri uri, String label) async {
    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (launched || !mounted) return;

    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text('Unable to open $label right now.')));
  }

  Uri _buildOpenStreetMapUri(double latitude, double longitude) {
    return Uri.parse(
      'https://www.openstreetmap.org/?mlat=$latitude&mlon=$longitude#map=18/$latitude/$longitude',
    );
  }

  Uri _buildHybridMapUri(double latitude, double longitude) {
    return Uri.parse('https://www.google.com/maps?q=$latitude,$longitude&t=h');
  }

  String _formatValue(dynamic value) {
    if (value == null) return 'N/A';

    if (value is String) {
      final text = value.trim();
      if (text.isEmpty) return 'N/A';

      final parsedDate = DateTime.tryParse(text);
      if (parsedDate != null) {
        return DateFormat('dd MMM yyyy').format(parsedDate);
      }
      return text;
    }

    if (value is num) {
      final asDouble = value.toDouble();
      if (asDouble == asDouble.roundToDouble()) {
        return asDouble.toInt().toString();
      }
      return asDouble.toStringAsFixed(2);
    }

    if (value is bool) return value ? 'Yes' : 'No';

    if (value is List) {
      final rendered = value
          .map(_formatValue)
          .where((item) => item != 'N/A')
          .toList();
      return rendered.isEmpty ? 'N/A' : rendered.join(', ');
    }

    if (value is Map) {
      final rendered = value.entries
          .where((entry) => entry.value != null)
          .map(
            (entry) => '${_formatKey(entry.key)}: ${_formatValue(entry.value)}',
          )
          .toList();
      return rendered.isEmpty ? 'N/A' : rendered.join(' • ');
    }

    return value.toString();
  }

  String _formatKey(String key) {
    return key
        .replaceAll('_', ' ')
        .split(' ')
        .where((part) => part.isNotEmpty)
        .map((part) => '${part[0].toUpperCase()}${part.substring(1)}')
        .join(' ');
  }
}

class _CircleAction extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _CircleAction({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.82),
          shape: BoxShape.circle,
          boxShadow: AppTheme.softShadow(AppColors.lightGreen),
        ),
        child: Icon(icon, color: AppColors.forestGreen, size: 20),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final IconData icon;
  final String label;
  final List<Color> colors;

  const _StatusBadge({
    required this.icon,
    required this.label,
    required this.colors,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: colors),
        borderRadius: BorderRadius.circular(999),
        boxShadow: AppTheme.softShadow(colors.first),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: AppColors.forestGreen, size: 16),
          const SizedBox(width: 8),
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

class _HeroPill extends StatelessWidget {
  final IconData icon;
  final String label;

  const _HeroPill({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: AppColors.forestGreen),
          const SizedBox(width: 7),
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

class _MiniMetric extends StatelessWidget {
  final String label;
  final String value;

  const _MiniMetric({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.inputFieldGray, Colors.white],
        ),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: AppColors.textGray,
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              color: AppColors.textDark,
              fontWeight: FontWeight.w900,
              fontSize: 15,
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionShell extends StatelessWidget {
  final String title;
  final IconData icon;
  final Widget child;

  const _SectionShell({
    required this.title,
    required this.icon,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.84),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: Colors.white),
        boxShadow: AppTheme.softShadow(AppColors.lightGreen),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(colors: AppColors.coolGradient),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: AppColors.forestGreen),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    color: AppColors.textDark,
                    letterSpacing: -0.4,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}
