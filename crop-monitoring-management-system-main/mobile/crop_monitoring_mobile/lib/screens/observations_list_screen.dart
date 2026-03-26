import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../models/observation_models.dart';
import '../providers/sync_provider.dart';
import '../providers/ui_provider.dart';
import '../services/local_db.dart';
import '../services/supabase_service.dart';
import '../utils/app_colors.dart';
import '../utils/app_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/botanical_background.dart';
import '../widgets/dynamic_sugarcane_backdrop.dart';
import '../widgets/gradient_button.dart';
import '../widgets/shimmer_loading.dart';
import 'observation_detail_screen.dart';
import 'observation_form_screen.dart';
import 'storage_management_screen.dart';

enum _TamFilter { all, withTam, missing }

class ObservationsListScreen extends StatefulWidget {
  const ObservationsListScreen({super.key});

  @override
  State<ObservationsListScreen> createState() => _ObservationsListScreenState();
}

class _ObservationsListScreenState extends State<ObservationsListScreen> {
  final SupabaseService _supabase = SupabaseService();
  final LocalDB _localDb = LocalDB();

  List<Map<String, dynamic>> _history = [];
  bool _isLoading = true;
  String _searchQuery = '';
  SyncProvider? _syncProvider;
  bool _reloadAfterCurrentLoad = false;
  bool _lastIsSyncing = false;
  int _lastUnsyncedCount = 0;
  bool _lastIsDatabaseConnected = false;
  _TamFilter _tamFilter = _TamFilter.all;

  Map<String, dynamic> _buildHistoryItemFromObservation(
    Map<String, dynamic> data, {
    required dynamic id,
    required String status,
    required bool isLocal,
  }) {
    final fieldIdentification = Map<String, dynamic>.from(
      data['field_identification'] ?? const {},
    );
    final cropInformation = Map<String, dynamic>.from(
      data['crop_information'] ?? const {},
    );
    final harvestInformation = Map<String, dynamic>.from(
      data['harvest_information'] ?? const {},
    );
    final blockId = fieldIdentification['block_id'] ?? '';

    return {
      'id': id,
      'title': observationDisplayName(data, fallback: 'Unnamed Field'),
      'subtitle': _composeLocationLine(blockId),
      'block': blockId,
      'date': DateTime.tryParse(
        fieldIdentification['date_recorded']?.toString() ??
            data['created_at']?.toString() ??
            '',
      ),
      'status': status,
      'crop':
          cropInformation['variety'] ??
          cropInformation['crop_class'] ??
          cropInformation['crop_type'] ??
          'Sugarcane',
      'tam_mm':
          fieldIdentification['tam_mm'] ??
          fieldIdentification['tamm_area'] ??
          fieldIdentification['time'] ??
          '',
      'yield': harvestInformation['yield'],
      'is_local': isLocal,
      'raw_data': data,
    };
  }

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();

    final syncProvider = context.read<SyncProvider>();
    if (_syncProvider == syncProvider) return;

    _syncProvider?.removeListener(_handleSyncProviderChanged);
    _syncProvider = syncProvider;
    _lastIsSyncing = syncProvider.isSyncing;
    _lastUnsyncedCount = syncProvider.unsyncedCount;
    _lastIsDatabaseConnected = syncProvider.isDatabaseConnected;
    _syncProvider?.addListener(_handleSyncProviderChanged);
  }

  void _handleSyncProviderChanged() {
    final syncProvider = _syncProvider;
    if (syncProvider == null || !mounted) return;

    final syncFinished = _lastIsSyncing && !syncProvider.isSyncing;
    final pendingChanged = _lastUnsyncedCount != syncProvider.unsyncedCount;
    final databaseCameOnline =
        !_lastIsDatabaseConnected && syncProvider.isDatabaseConnected;

    _lastIsSyncing = syncProvider.isSyncing;
    _lastUnsyncedCount = syncProvider.unsyncedCount;
    _lastIsDatabaseConnected = syncProvider.isDatabaseConnected;

    if (!syncFinished && !pendingChanged && !databaseCameOnline) {
      return;
    }

    if (_isLoading) {
      _reloadAfterCurrentLoad = true;
      return;
    }

    unawaited(_loadHistory());
  }

  Future<void> _loadHistory() async {
    setState(() => _isLoading = true);

    final syncProvider = _syncProvider ?? context.read<SyncProvider>();

    try {
      final localRecords = await _localDb.getAllObservations();

      final combinedList = localRecords.map((record) {
        final data = normalizeObservationPayload(
          Map<String, dynamic>.from(jsonDecode(record['data']) as Map),
        );
        return _buildHistoryItemFromObservation(
          data,
          id: record['id'],
          status: record['synced'] == 1 ? 'Synced' : 'Draft',
          isLocal: true,
        );
      }).toList();

      if (syncProvider.isDatabaseConnected) {
        try {
          final remoteRecords = await _supabase.getRecentObservations();
          for (final remote in remoteRecords) {
            final existsLocally = combinedList.any(
              (local) =>
                  local['raw_data']['client_uuid'] == remote['client_uuid'],
            );

            if (!existsLocally) {
              combinedList.add(
                _buildHistoryItemFromObservation(
                  normalizeObservationPayload(
                    Map<String, dynamic>.from(remote),
                  ),
                  id: remote['id'],
                  status: 'History',
                  isLocal: false,
                ),
              );
            }
          }
        } catch (e) {
          debugPrint('Error fetching remote history: $e');
        }
      }

      combinedList.sort((a, b) {
        final dateA = a['date'] as DateTime?;
        final dateB = b['date'] as DateTime?;
        if (dateA == null) return 1;
        if (dateB == null) return -1;
        return dateB.compareTo(dateA);
      });

      if (!mounted) return;
      setState(() {
        _history = combinedList;
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error loading history: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    } finally {
      if (_reloadAfterCurrentLoad && mounted) {
        _reloadAfterCurrentLoad = false;
        unawaited(_loadHistory());
      }
    }
  }

  String _composeLocationLine(dynamic blockId) {
    final value = blockId?.toString().trim() ?? '';
    return value.isEmpty ? 'Saved observation' : value;
  }

  @override
  void dispose() {
    _syncProvider?.removeListener(_handleSyncProviderChanged);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final searchFilteredList = _searchQuery.isEmpty
        ? _history
        : _history.where((item) {
            final title = item['title'].toString().toLowerCase();
            final subtitle = item['subtitle'].toString().toLowerCase();
            final crop = item['crop'].toString().toLowerCase();
            final query = _searchQuery.toLowerCase();
            return title.contains(query) ||
                subtitle.contains(query) ||
                crop.contains(query) ||
                item['block'].toString().toLowerCase().contains(query) ||
                _tamLabel(item).toLowerCase().contains(query);
          }).toList();
    final displayedList = searchFilteredList.where((item) {
      switch (_tamFilter) {
        case _TamFilter.all:
          return true;
        case _TamFilter.withTam:
          return _hasTamValue(item);
        case _TamFilter.missing:
          return !_hasTamValue(item);
      }
    }).toList();

    final syncProvider = context.watch<SyncProvider>();
    final uiProvider = context.watch<UIProvider>();
    final isFieldMode = uiProvider.isFieldMode;
    final latestItem = _history.isEmpty ? null : _history.first;
    final draftCount = _history
        .where((item) => item['status'].toString() == 'Draft')
        .length;
    final syncedCount = _history
        .where(
          (item) =>
              item['status'].toString() == 'Synced' ||
              item['status'].toString() == 'History',
        )
        .length;
    final localCount = _history
        .where((item) => item['is_local'] == true)
        .length;
    final tamCount = _history.where(_hasTamValue).length;
    final missingTamCount = _history.length - tamCount;

    return Scaffold(
      drawer: const AppDrawer(),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const ObservationFormScreen()),
          );
          _loadHistory();
        },
        label: const Text(
          'Add Record',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        icon: const Icon(Icons.add_rounded),
      ),
      body: BotanicalBackground(
        showLeafTexture: !isFieldMode,
        textureOpacity: isFieldMode ? 0 : 0.06,
        gradientColors: isFieldMode
            ? const [Colors.white, Color(0xFFF8FAF5), Color(0xFFF2F5ED)]
            : null,
        child: SafeArea(
          child: _buildScrollableBody(
            syncProvider: syncProvider,
            isFieldMode: isFieldMode,
            displayedList: displayedList,
            latestItem: latestItem,
            draftCount: draftCount,
            syncedCount: syncedCount,
            localCount: localCount,
            tamCount: tamCount,
            missingTamCount: missingTamCount,
          ),
        ),
      ),
    );
  }

  Widget _buildScrollableBody({
    required SyncProvider syncProvider,
    required bool isFieldMode,
    required List<Map<String, dynamic>> displayedList,
    required Map<String, dynamic>? latestItem,
    required int draftCount,
    required int syncedCount,
    required int localCount,
    required int tamCount,
    required int missingTamCount,
  }) {
    final topSection = Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
      child: Column(
        children: [
          _buildHeader(syncProvider),
          const SizedBox(height: 18),
          if (isFieldMode)
            Column(
              children: [
                _buildSearchBar(),
                if (_searchQuery.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  _buildSearchResultBanner(displayedList.length),
                ],
                if (_history.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  _buildTamFilterBar(
                    totalCount: _history.length,
                    tamCount: tamCount,
                    missingTamCount: missingTamCount,
                  ),
                ],
                const SizedBox(height: 16),
                _buildSimpleOverviewBlock(
                  syncProvider: syncProvider,
                  latestItem: latestItem,
                  draftCount: draftCount,
                  syncedCount: syncedCount,
                ),
              ],
            )
          else
            Column(
              children: [
                _buildHeroSummary(
                  totalCount: _history.length,
                  draftCount: draftCount,
                  syncedCount: syncedCount,
                  latestItem: latestItem,
                ),
                const SizedBox(height: 18),
                _buildSearchBar(),
                if (_searchQuery.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  _buildSearchResultBanner(displayedList.length),
                ],
                if (_history.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  _buildTamFilterBar(
                    totalCount: _history.length,
                    tamCount: tamCount,
                    missingTamCount: missingTamCount,
                  ),
                ],
                const SizedBox(height: 16),
                _buildStatusDashboard(
                  syncProvider,
                  draftCount: draftCount,
                  syncedCount: syncedCount,
                  localCount: localCount,
                ),
              ],
            ),
          const SizedBox(height: 16),
        ],
      ),
    );

    if (_isLoading) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          topSection,
          for (int index = 0; index < 4; index++)
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 14),
              child: ShimmerLoading.card(height: 120),
            ),
          const SizedBox(height: 120),
        ],
      );
    }

    return RefreshIndicator(
      onRefresh: _loadHistory,
      color: AppColors.primaryGreen,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          topSection,
          if (displayedList.isEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 120),
              child: _history.isEmpty
                  ? _buildEmptyState()
                  : _buildFilteredEmptyState(),
            )
          else ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 0),
              child: isFieldMode
                  ? _buildSimpleCollectionHeader(
                      visibleCount: displayedList.length,
                      totalCount: _history.length,
                    )
                  : _buildCollectionHeader(
                      visibleCount: displayedList.length,
                      totalCount: _history.length,
                    ),
            ),
            for (final item in displayedList)
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 0),
                child: isFieldMode
                    ? _buildSimpleHistoryCard(item)
                    : _buildHistoryCard(item),
              ),
            const SizedBox(height: 120),
          ],
        ],
      ),
    );
  }

  Widget _buildHeader(SyncProvider syncProvider) {
    return Row(
      children: [
        Builder(
          builder: (drawerContext) => _CircleAction(
            icon: Icons.menu_rounded,
            onTap: () => Scaffold.of(drawerContext).openDrawer(),
          ),
        ),
        const SizedBox(width: 14),
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Observations',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  color: AppColors.textDark,
                  letterSpacing: -1.0,
                ),
              ),
              SizedBox(height: 2),
              Text(
                'Search saved records, drafts, and synced observations.',
                style: TextStyle(
                  color: AppColors.textGray,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 12),
        _CircleAction(
          icon: Icons.cloud_sync_rounded,
          onTap: () => syncProvider.startSync(),
          badge: syncProvider.unsyncedCount > 0
              ? '${syncProvider.unsyncedCount}'
              : null,
          loading: syncProvider.isSyncing,
        ),
        const SizedBox(width: 10),
        _CircleAction(icon: Icons.refresh_rounded, onTap: _loadHistory),
      ],
    );
  }

  Widget _buildSearchBar() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.white.withValues(alpha: 0.92),
            AppColors.softCream.withValues(alpha: 0.84),
          ],
        ),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: Colors.white),
        boxShadow: AppTheme.softShadow(AppColors.lightGreen),
      ),
      child: TextField(
        onChanged: (value) => setState(() => _searchQuery = value),
        decoration: InputDecoration(
          hintText: 'Search fields, sections, blocks, TAM, or yield...',
          prefixIcon: Container(
            margin: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: AppColors.coolGradient),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(
              Icons.search_rounded,
              color: AppColors.forestGreen,
            ),
          ),
          prefixIconConstraints: const BoxConstraints(
            minHeight: 0,
            minWidth: 0,
          ),
          filled: false,
          border: InputBorder.none,
          suffixIcon: _searchQuery.isEmpty
              ? null
              : IconButton(
                  onPressed: () => setState(() => _searchQuery = ''),
                  icon: const Icon(
                    Icons.close_rounded,
                    color: AppColors.textGray,
                  ),
                ),
        ),
      ),
    );
  }

  Widget _buildHeroSummary({
    required int totalCount,
    required int draftCount,
    required int syncedCount,
    required Map<String, dynamic>? latestItem,
  }) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(34),
        boxShadow: AppTheme.softShadow(AppColors.primaryGreen),
      ),
      child: Stack(
        children: [
          Positioned.fill(
            child: DynamicSugarcaneBackdrop(
              borderRadius: BorderRadius.circular(34),
              overlayGradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withValues(alpha: 0.08),
                  AppColors.forestGreen.withValues(alpha: 0.62),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 18, 18, 20),
            child: LayoutBuilder(
              builder: (context, constraints) {
                final isCompact = constraints.maxWidth < 370;

                final latestNoteCard = Container(
                  constraints: BoxConstraints(
                    maxWidth: isCompact ? constraints.maxWidth : 172,
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.24),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'LATEST NOTE',
                        style: TextStyle(
                          color: Colors.white70,
                          fontWeight: FontWeight.w800,
                          fontSize: 10,
                          letterSpacing: 1.1,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        latestItem == null
                            ? 'No records yet'
                            : '${latestItem['title']}',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 15,
                          height: 1.15,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        latestItem == null || latestItem['date'] == null
                            ? 'Create a fresh cane observation to start the archive.'
                            : DateFormat(
                                'dd MMM yyyy',
                              ).format(latestItem['date'] as DateTime),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white70,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                          height: 1.3,
                        ),
                      ),
                    ],
                  ),
                );

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (isCompact) ...[
                      _buildArchiveChip(),
                      const SizedBox(height: 12),
                      latestNoteCard,
                    ] else
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildArchiveChip(),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Align(
                              alignment: Alignment.topRight,
                              child: latestNoteCard,
                            ),
                          ),
                        ],
                      ),
                    const SizedBox(height: 18),
                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.16),
                        borderRadius: BorderRadius.circular(28),
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.22),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'OBSERVATION HISTORY',
                            style: TextStyle(
                              color: Colors.white70,
                              fontWeight: FontWeight.w800,
                              fontSize: 11,
                              letterSpacing: 1.2,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Pretty cane records,\nready to review.',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                              fontSize: isCompact ? 24 : 27,
                              letterSpacing: -0.9,
                              height: 0.98,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            latestItem == null
                                ? 'Your drawer archive will feel richer once you save the first field note.'
                                : latestItem['subtitle']
                                      .toString()
                                      .trim()
                                      .isEmpty
                                ? 'Open the freshest cane note, then review drafts and synced records in one place.'
                                : '${latestItem['subtitle']} is the freshest record in your archive.',
                            style: const TextStyle(
                              color: Colors.white70,
                              fontWeight: FontWeight.w700,
                              fontSize: 12,
                              height: 1.35,
                            ),
                          ),
                          const SizedBox(height: 14),
                          Wrap(
                            spacing: 10,
                            runSpacing: 10,
                            children: [
                              _HeroMetric(
                                icon: Icons.inventory_2_rounded,
                                label: '$totalCount total',
                              ),
                              _HeroMetric(
                                icon: Icons.edit_note_rounded,
                                label: '$draftCount drafts',
                              ),
                              _HeroMetric(
                                icon: Icons.cloud_done_rounded,
                                label: '$syncedCount synced',
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildArchiveChip() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.84),
        borderRadius: BorderRadius.circular(999),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.auto_stories_rounded,
            size: 16,
            color: AppColors.forestGreen,
          ),
          SizedBox(width: 8),
          Text(
            'Cane Pulse archive',
            style: TextStyle(
              color: AppColors.forestGreen,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchResultBanner(int count) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.filter_alt_rounded,
            color: AppColors.forestGreen,
            size: 18,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              count == 1
                  ? '1 record matches "${_searchQuery.trim()}".'
                  : '$count records match "${_searchQuery.trim()}".',
              style: const TextStyle(
                color: AppColors.forestGreen,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTamFilterBar({
    required int totalCount,
    required int tamCount,
    required int missingTamCount,
  }) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Wrap(
        spacing: 10,
        runSpacing: 10,
        children: [
          _buildTamFilterChip(
            filter: _TamFilter.all,
            label: 'All',
            count: totalCount,
          ),
          _buildTamFilterChip(
            filter: _TamFilter.withTam,
            label: 'With TAM',
            count: tamCount,
          ),
          _buildTamFilterChip(
            filter: _TamFilter.missing,
            label: 'Missing TAM',
            count: missingTamCount,
          ),
        ],
      ),
    );
  }

  Widget _buildTamFilterChip({
    required _TamFilter filter,
    required String label,
    required int count,
  }) {
    final selected = _tamFilter == filter;

    return InkWell(
      onTap: () => setState(() => _tamFilter = filter),
      borderRadius: BorderRadius.circular(999),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          gradient: selected
              ? const LinearGradient(colors: AppColors.primaryGradient)
              : LinearGradient(
                  colors: [
                    Colors.white.withValues(alpha: 0.92),
                    AppColors.softCream.withValues(alpha: 0.88),
                  ],
                ),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: selected
                ? Colors.transparent
                : AppColors.borderSoft.withValues(alpha: 0.9),
          ),
          boxShadow: selected
              ? AppTheme.softShadow(AppColors.primaryGreen)
              : const [],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              filter == _TamFilter.missing
                  ? Icons.error_outline_rounded
                  : filter == _TamFilter.withTam
                  ? Icons.check_circle_outline_rounded
                  : Icons.tune_rounded,
              size: 15,
              color: selected ? Colors.white : AppColors.forestGreen,
            ),
            const SizedBox(width: 8),
            Text(
              '$label ($count)',
              style: TextStyle(
                color: selected ? Colors.white : AppColors.forestGreen,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusDashboard(
    SyncProvider syncProvider, {
    required int draftCount,
    required int syncedCount,
    required int localCount,
  }) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 720;
        final cardWidth = isWide
            ? (constraints.maxWidth - 28) / 3
            : constraints.maxWidth;

        return Wrap(
          spacing: 14,
          runSpacing: 14,
          children: [
            SizedBox(
              width: cardWidth,
              child: _StatusCard(
                title: 'Sync health',
                icon: Icons.sync_rounded,
                label:
                    '${syncProvider.syncedCount} / ${syncProvider.totalRecords}',
                caption: syncProvider.isSyncing
                    ? 'Cloud sync running'
                    : 'Records uploaded',
                colors: AppColors.coolGradient,
                progress: syncProvider.totalRecords == 0
                    ? 0
                    : syncProvider.syncedCount / syncProvider.totalRecords,
              ),
            ),
            SizedBox(
              width: cardWidth,
              child: _StatusCard(
                title: 'Draft tray',
                icon: Icons.edit_note_rounded,
                label: '$draftCount local',
                caption: draftCount == 0
                    ? 'No unfinished notes'
                    : 'Ready to finish or sync',
                colors: AppColors.warmGradient,
              ),
            ),
            SizedBox(
              width: cardWidth,
              child: GestureDetector(
                onTap: () async {
                  await Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const StorageManagementScreen(),
                    ),
                  );
                  await syncProvider.startSync();
                  await syncProvider.checkUnsynced();
                },
                child: _StatusCard(
                  title: 'Stored media',
                  icon: Icons.photo_library_rounded,
                  label: '${syncProvider.storageSizeMB.toStringAsFixed(1)} MB',
                  caption: localCount == 0
                      ? 'Manage offline storage'
                      : '$syncedCount polished records ready',
                  colors: AppColors.primaryGradient,
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildCollectionHeader({
    required int visibleCount,
    required int totalCount,
  }) {
    final helper = _buildCollectionHelperText(
      visibleCount: visibleCount,
      totalCount: totalCount,
    );

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Container(
        padding: const EdgeInsets.fromLTRB(18, 16, 18, 16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              Colors.white.withValues(alpha: 0.92),
              AppColors.softCream.withValues(alpha: 0.88),
            ],
          ),
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: Colors.white),
          boxShadow: AppTheme.softShadow(AppColors.sageGreen),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: AppColors.coolGradient),
                borderRadius: BorderRadius.circular(18),
              ),
              child: const Icon(
                Icons.inventory_2_rounded,
                color: AppColors.forestGreen,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Recent records',
                    style: TextStyle(
                      color: AppColors.textDark,
                      fontWeight: FontWeight.w900,
                      fontSize: 18,
                      letterSpacing: -0.4,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    helper,
                    style: const TextStyle(
                      color: AppColors.textGray,
                      fontWeight: FontWeight.w700,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.inputFieldGray,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: AppColors.borderSoft),
              ),
              child: Text(
                '$visibleCount',
                style: const TextStyle(
                  color: AppColors.forestGreen,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSimpleOverviewBlock({
    required SyncProvider syncProvider,
    required Map<String, dynamic>? latestItem,
    required int draftCount,
    required int syncedCount,
  }) {
    final latestTitle = latestItem == null
        ? 'No saved observations yet'
        : latestItem['title'].toString().trim().isEmpty
        ? 'Unnamed field'
        : latestItem['title'].toString().trim();
    final latestDate = latestItem?['date'] as DateTime?;
    final latestSubtitle = latestItem == null
        ? 'Use Add Record to capture the first field note.'
        : latestDate == null
        ? 'Most recent saved record'
        : 'Latest update: ${DateFormat('dd MMM yyyy').format(latestDate)}';

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
          const Text(
            'Observation library',
            style: TextStyle(
              color: AppColors.textDark,
              fontSize: 20,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.4,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            latestTitle,
            style: const TextStyle(
              color: AppColors.forestGreen,
              fontSize: 16,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            latestSubtitle,
            style: const TextStyle(
              color: AppColors.textGray,
              fontWeight: FontWeight.w700,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _InlineChip(
                icon: Icons.inventory_2_rounded,
                label: '${_history.length} total',
              ),
              _InlineChip(
                icon: Icons.edit_note_rounded,
                label: '$draftCount drafts',
              ),
              _InlineChip(
                icon: Icons.cloud_done_rounded,
                label: '$syncedCount synced',
              ),
              _InlineChip(
                icon: syncProvider.isSyncing
                    ? Icons.sync_rounded
                    : Icons.cloud_sync_rounded,
                label: syncProvider.unsyncedCount == 0
                    ? 'All synced'
                    : '${syncProvider.unsyncedCount} pending',
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSimpleCollectionHeader({
    required int visibleCount,
    required int totalCount,
  }) {
    final label = _searchQuery.isEmpty && _tamFilter == _TamFilter.all
        ? '$totalCount records'
        : '$visibleCount matches';

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          const Expanded(
            child: Text(
              'Recent observations',
              style: TextStyle(
                color: AppColors.textDark,
                fontSize: 18,
                fontWeight: FontWeight.w900,
                letterSpacing: -0.3,
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.86),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: AppColors.borderSoft),
            ),
            child: Text(
              label,
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

  Widget _buildHistoryCard(Map<String, dynamic> item) {
    final status = item['status'] as String;
    final scheme = _statusScheme(status);
    final title = item['title'].toString().trim().isEmpty
        ? 'Unnamed Field'
        : item['title'].toString().trim();
    final subtitle = item['subtitle'].toString().trim();
    final date = item['date'] as DateTime?;
    final crop = item['crop'].toString().trim().isEmpty
        ? 'Sugarcane'
        : item['crop'].toString().trim();
    final section = item['section'].toString().trim();
    final block = item['block'].toString().trim();
    final tamMmValue = _tamLabel(item);
    final hasTamValue = tamMmValue.isNotEmpty;
    final yieldValue = item['yield'];
    final yieldAmount = yieldValue is num
        ? yieldValue.toDouble()
        : double.tryParse(yieldValue?.toString() ?? '');
    final sourceLabel = item['is_local'] == true
        ? status == 'Draft'
              ? 'Local draft'
              : 'Device copy'
        : 'Cloud record';
    final highlights = <({String label, String value, List<Color> colors})>[
      if (block.isNotEmpty)
        (label: 'Block', value: block, colors: AppColors.coolGradient),
      if (hasTamValue)
        (label: 'TAM (mm)', value: tamMmValue, colors: AppColors.warmGradient),
      if (yieldAmount != null)
        (
          label: 'Yield',
          value: '${yieldAmount.toStringAsFixed(1)} t/ha',
          colors: AppColors.primaryGradient,
        ),
    ];

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: InkWell(
        onTap: () => _openRecordDetails(item),
        borderRadius: BorderRadius.circular(32),
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.white.withValues(alpha: 0.96),
                (hasTamValue ? scheme.colors.last : AppColors.errorRed)
                    .withValues(alpha: 0.18),
                AppColors.softCream.withValues(alpha: 0.90),
              ],
            ),
            borderRadius: BorderRadius.circular(32),
            border: Border.all(
              color: (hasTamValue ? scheme.colors.first : AppColors.errorRed)
                  .withValues(alpha: 0.24),
            ),
            boxShadow: AppTheme.softShadow(
              hasTamValue ? scheme.colors.first : AppColors.errorRed,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      scheme.colors.first.withValues(alpha: 0.28),
                      scheme.colors.last.withValues(alpha: 0.18),
                    ],
                  ),
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(32),
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 58,
                      height: 58,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(colors: scheme.colors),
                        borderRadius: BorderRadius.circular(22),
                      ),
                      child: Icon(scheme.icon, color: AppColors.forestGreen),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 11,
                              vertical: 7,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.88),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              sourceLabel,
                              style: const TextStyle(
                                color: AppColors.forestGreen,
                                fontWeight: FontWeight.w800,
                                fontSize: 11,
                              ),
                            ),
                          ),
                          const SizedBox(height: 10),
                          Text(
                            title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 20,
                              color: AppColors.textDark,
                              letterSpacing: -0.6,
                              height: 1.05,
                            ),
                          ),
                          if (subtitle.isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Text(
                              subtitle,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: AppColors.textGray,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    const Icon(
                      Icons.arrow_outward_rounded,
                      size: 20,
                      color: AppColors.forestGreen,
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        _InlineChip(icon: Icons.grass_rounded, label: crop),
                        _InlineChip(
                          icon: Icons.calendar_today_rounded,
                          label: date != null
                              ? DateFormat('MMM dd, yyyy').format(date)
                              : 'No date',
                        ),
                        _InlineChip(
                          icon: scheme.icon,
                          label: status,
                          colors: scheme.colors,
                          filled: true,
                        ),
                        if (!hasTamValue)
                          const _InlineChip(
                            icon: Icons.error_outline_rounded,
                            label: 'TAM missing',
                            filled: true,
                            colors: [Color(0xFFFFD7D7), Color(0xFFFFEFEF)],
                          ),
                        if (section.isNotEmpty)
                          _InlineChip(icon: Icons.map_rounded, label: section),
                      ],
                    ),
                    if (highlights.isNotEmpty) ...[
                      const SizedBox(height: 14),
                      LayoutBuilder(
                        builder: (context, constraints) {
                          final isWide = constraints.maxWidth >= 520;
                          final tileWidth = isWide
                              ? (constraints.maxWidth - 10) / 2
                              : constraints.maxWidth;

                          return Wrap(
                            spacing: 10,
                            runSpacing: 10,
                            children: [
                              for (final highlight in highlights)
                                SizedBox(
                                  width: highlights.length == 1
                                      ? constraints.maxWidth
                                      : tileWidth,
                                  child: _ObservationHighlightCard(
                                    label: highlight.label,
                                    value: highlight.value,
                                    colors: highlight.colors,
                                  ),
                                ),
                            ],
                          );
                        },
                      ),
                    ],
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 13,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.72),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: scheme.colors.first.withValues(alpha: 0.18),
                        ),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              !hasTamValue
                                  ? 'Add TAM to show this field on the dashboard.'
                                  : status == 'Draft'
                                  ? 'Finish this field note and sync it when ready.'
                                  : 'Open the full cane observation to review details.',
                              style: const TextStyle(
                                color: AppColors.forestGreen,
                                fontWeight: FontWeight.w800,
                                height: 1.35,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          const Icon(
                            Icons.chevron_right_rounded,
                            color: AppColors.forestGreen,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: () => _openRecordForEditing(item),
                        icon: Icon(
                          hasTamValue
                              ? Icons.edit_note_rounded
                              : Icons.add_chart_rounded,
                        ),
                        label: Text(hasTamValue ? 'Edit record' : 'Add TAM'),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSimpleHistoryCard(Map<String, dynamic> item) {
    final status = item['status'] as String;
    final scheme = _statusScheme(status);
    final title = item['title'].toString().trim().isEmpty
        ? 'Unnamed Field'
        : item['title'].toString().trim();
    final subtitle = item['subtitle'].toString().trim();
    final date = item['date'] as DateTime?;
    final crop = item['crop'].toString().trim().isEmpty
        ? 'Sugarcane'
        : item['crop'].toString().trim();
    final tamMmValue = _tamLabel(item);
    final hasTamValue = tamMmValue.isNotEmpty;
    final yieldValue = item['yield'];
    final yieldAmount = yieldValue is num
        ? yieldValue.toDouble()
        : double.tryParse(yieldValue?.toString() ?? '');

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _openRecordDetails(item),
        borderRadius: BorderRadius.circular(24),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.white.withValues(alpha: 0.96),
                (hasTamValue ? scheme.colors.last : AppColors.errorRed)
                    .withValues(alpha: 0.14),
              ],
            ),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: (hasTamValue ? scheme.colors.first : AppColors.errorRed)
                  .withValues(alpha: 0.18),
            ),
            boxShadow: AppTheme.softShadow(
              hasTamValue ? scheme.colors.first : AppColors.errorRed,
            ),
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
                          title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AppColors.textDark,
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.4,
                          ),
                        ),
                        if (subtitle.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            subtitle,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColors.textGray,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  _InlineChip(
                    icon: scheme.icon,
                    label: status,
                    colors: scheme.colors,
                    filled: true,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  _InlineChip(icon: Icons.grass_rounded, label: crop),
                  _InlineChip(
                    icon: Icons.calendar_today_rounded,
                    label: date == null
                        ? 'No date'
                        : DateFormat('dd MMM yyyy').format(date),
                  ),
                  if (hasTamValue)
                    _InlineChip(
                      icon: Icons.access_time_rounded,
                      label: 'TAM $tamMmValue',
                    ),
                  if (!hasTamValue)
                    const _InlineChip(
                      icon: Icons.error_outline_rounded,
                      label: 'TAM missing',
                      filled: true,
                      colors: [Color(0xFFFFD7D7), Color(0xFFFFEFEF)],
                    ),
                  if (yieldAmount != null)
                    _InlineChip(
                      icon: Icons.bar_chart_rounded,
                      label: '${yieldAmount.toStringAsFixed(1)} t/ha',
                    ),
                ],
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => _openRecordForEditing(item),
                  icon: Icon(
                    hasTamValue
                        ? Icons.edit_note_rounded
                        : Icons.add_chart_rounded,
                  ),
                  label: Text(hasTamValue ? 'Edit record' : 'Add TAM'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 110,
              height: 110,
              decoration: const BoxDecoration(
                gradient: LinearGradient(colors: AppColors.coolGradient),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.inventory_2_outlined,
                size: 56,
                color: AppColors.forestGreen,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'No records yet',
              style: TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.w900,
                color: AppColors.textDark,
                letterSpacing: -0.8,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Add an observation to start building your record list.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppColors.textGray,
                fontWeight: FontWeight.w700,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 22),
            GradientButton(
              text: 'Create Cane Log',
              icon: Icons.add_rounded,
              onPressed: () async {
                await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const ObservationFormScreen(),
                  ),
                );
                _loadHistory();
              },
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _loadHistory,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Refresh list'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilteredEmptyState() {
    final filterLabel = switch (_tamFilter) {
      _TamFilter.withTam => 'with TAM values',
      _TamFilter.missing => 'missing TAM values',
      _TamFilter.all => 'matching your current filters',
    };

    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 96,
              height: 96,
              decoration: const BoxDecoration(
                gradient: LinearGradient(colors: AppColors.coolGradient),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.filter_alt_off_rounded,
                size: 48,
                color: AppColors.forestGreen,
              ),
            ),
            const SizedBox(height: 22),
            const Text(
              'No matching records',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w900,
                color: AppColors.textDark,
                letterSpacing: -0.6,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _searchQuery.isEmpty
                  ? 'There are no records $filterLabel right now.'
                  : 'There are no records $filterLabel for "${_searchQuery.trim()}".',
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppColors.textGray,
                fontWeight: FontWeight.w700,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 20),
            OutlinedButton.icon(
              onPressed: () {
                setState(() {
                  _tamFilter = _TamFilter.all;
                  _searchQuery = '';
                });
              },
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Clear filters'),
            ),
          ],
        ),
      ),
    );
  }

  _StatusScheme _statusScheme(String status) {
    switch (status) {
      case 'Draft':
        return const _StatusScheme(
          icon: Icons.edit_note_rounded,
          colors: AppColors.warmGradient,
        );
      case 'Synced':
        return const _StatusScheme(
          icon: Icons.cloud_done_rounded,
          colors: AppColors.coolGradient,
        );
      case 'History':
      default:
        return const _StatusScheme(
          icon: Icons.history_rounded,
          colors: AppColors.primaryGradient,
        );
    }
  }

  String _tamLabel(Map<String, dynamic> item) {
    final raw = item['tam_mm']?.toString().trim() ?? '';
    return raw.toLowerCase() == 'null' ? '' : raw;
  }

  bool _hasTamValue(Map<String, dynamic> item) => _tamLabel(item).isNotEmpty;

  String _buildCollectionHelperText({
    required int visibleCount,
    required int totalCount,
  }) {
    final filterLabel = switch (_tamFilter) {
      _TamFilter.all => null,
      _TamFilter.withTam => 'with TAM only',
      _TamFilter.missing => 'missing TAM only',
    };

    if (_searchQuery.isNotEmpty) {
      return '$visibleCount matching records for "${_searchQuery.trim()}".';
    }

    if (filterLabel != null) {
      return '$visibleCount records $filterLabel.';
    }

    return '$totalCount records arranged from newest to oldest.';
  }

  int? _localObservationId(Map<String, dynamic> item) {
    final rawId = item['id'];
    if (rawId is int) return rawId;
    return int.tryParse(rawId?.toString() ?? '');
  }

  Future<void> _openRecordDetails(Map<String, dynamic> item) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ObservationDetailScreen(
          observationId: item['id'],
          isOffline: item['is_local'] == true,
        ),
      ),
    );
    await _loadHistory();
  }

  Future<void> _openRecordForEditing(Map<String, dynamic> item) async {
    final rawData = item['raw_data'];
    if (rawData is! Map) return;

    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ObservationFormScreen(
          initialObservation: Map<String, dynamic>.from(rawData),
          initialLocalObservationId: item['is_local'] == true
              ? _localObservationId(item)
              : null,
          initialIsOffline: item['is_local'] == true,
        ),
      ),
    );
    await _loadHistory();
  }
}

class _CircleAction extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final String? badge;
  final bool loading;

  const _CircleAction({
    required this.icon,
    required this.onTap,
    this.badge,
    this.loading = false,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(999),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.82),
              shape: BoxShape.circle,
              boxShadow: AppTheme.softShadow(AppColors.lightGreen),
            ),
            child: loading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2.4),
                  )
                : Icon(icon, color: AppColors.forestGreen, size: 20),
          ),
        ),
        if (badge != null)
          Positioned(
            top: -2,
            right: -2,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
              decoration: const BoxDecoration(
                color: AppColors.errorRed,
                borderRadius: BorderRadius.all(Radius.circular(999)),
              ),
              child: Text(
                badge!,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _StatusCard extends StatelessWidget {
  final String title;
  final String label;
  final String caption;
  final IconData icon;
  final List<Color> colors;
  final double? progress;

  const _StatusCard({
    required this.title,
    required this.label,
    required this.caption,
    required this.icon,
    required this.colors,
    this.progress,
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
            Colors.white.withValues(alpha: 0.94),
            colors.last.withValues(alpha: 0.18),
          ],
        ),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: Colors.white),
        boxShadow: AppTheme.softShadow(colors.first),
      ),
      child: Stack(
        children: [
          Positioned(
            right: -8,
            top: -8,
            child: Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: colors.last.withValues(alpha: 0.22),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: colors),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Icon(icon, color: AppColors.forestGreen),
              ),
              const SizedBox(height: 14),
              Text(
                title,
                style: const TextStyle(
                  color: AppColors.textGray,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  color: AppColors.textDark,
                  letterSpacing: -0.6,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                caption,
                style: const TextStyle(
                  color: AppColors.forestGreen,
                  fontWeight: FontWeight.w700,
                ),
              ),
              if (progress != null) ...[
                const SizedBox(height: 12),
                ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 8,
                    backgroundColor: AppColors.sageGreen,
                    valueColor: const AlwaysStoppedAnimation<Color>(
                      AppColors.forestGreen,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _InlineChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool filled;
  final List<Color>? colors;

  const _InlineChip({
    required this.icon,
    required this.label,
    this.filled = false,
    this.colors,
  });

  @override
  Widget build(BuildContext context) {
    final background = filled
        ? null
        : const LinearGradient(
            colors: [AppColors.inputFieldGray, Colors.white],
          );

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        gradient: filled && colors != null
            ? LinearGradient(colors: colors!)
            : background,
        color: filled ? null : null,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: filled ? Colors.transparent : AppColors.borderSoft,
        ),
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

class _ObservationHighlightCard extends StatelessWidget {
  final String label;
  final String value;
  final List<Color> colors;

  const _ObservationHighlightCard({
    required this.label,
    required this.value,
    required this.colors,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            colors.first.withValues(alpha: 0.24),
            colors.last.withValues(alpha: 0.16),
            Colors.white.withValues(alpha: 0.96),
          ],
        ),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: colors.first.withValues(alpha: 0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: AppColors.textGray,
              fontWeight: FontWeight.w800,
              fontSize: 12,
              letterSpacing: 0.2,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              color: AppColors.textDark,
              fontWeight: FontWeight.w900,
              fontSize: 18,
              letterSpacing: -0.4,
              height: 1.05,
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroMetric extends StatelessWidget {
  final IconData icon;
  final String label;

  const _HeroMetric({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: Colors.white),
          const SizedBox(width: 7),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusScheme {
  final IconData icon;
  final List<Color> colors;

  const _StatusScheme({required this.icon, required this.colors});
}
