import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/sync_service.dart';
import '../services/local_db.dart';
import '../services/supabase_service.dart';

class SyncProvider with ChangeNotifier, WidgetsBindingObserver {
  final SupabaseService _supabase = SupabaseService();
  ConnectivityResult _connectivity = ConnectivityResult.none;
  int _unsyncedCount = 0;
  int _syncedCount = 0;
  int _totalRecords = 0;
  double _storageSizeMB = 0.0;
  bool _isSyncing = false;
  bool _isBackendReachable = false;
  bool _isDatabaseReachable = false;
  bool _hasAuthenticatedSession = false;
  bool _showSyncSuccess = false;
  String? _backendErrorMessage;
  String? _databaseErrorMessage;
  StreamSubscription<AuthState>? _authSubscription;
  StreamSubscription<ConnectivityResult>? _connectivitySubscription;
  Timer? _heartbeatTimer;

  int get unsyncedCount => _unsyncedCount;
  int get syncedCount => _syncedCount;
  int get totalRecords => _totalRecords;
  double get storageSizeMB => _storageSizeMB;
  bool get isSyncing => _isSyncing;
  bool get hasNetworkConnection => _connectivity != ConnectivityResult.none;
  bool get isOnline => hasNetworkConnection && _isBackendReachable;
  bool get hasAuthenticatedSession => _hasAuthenticatedSession;
  bool get canAttemptSync =>
      isOnline && (_hasAuthenticatedSession || _isDatabaseReachable);
  bool get isDatabaseConnected => isOnline && _isDatabaseReachable;
  bool get showSyncSuccess => _showSyncSuccess;
  String? get backendErrorMessage => _backendErrorMessage;
  String? get databaseErrorMessage => _databaseErrorMessage;
  String? get connectionIssueMessage {
    if (!hasNetworkConnection) {
      return 'No internet connection detected.';
    }

    if (_backendErrorMessage != null) {
      return _backendErrorMessage;
    }

    if (!_hasAuthenticatedSession && !_isDatabaseReachable) {
      return 'No authenticated Supabase session or database write access is available.';
    }

    return _databaseErrorMessage;
  }

  SyncProvider() {
    WidgetsBinding.instance.addObserver(this);
    _hasAuthenticatedSession =
        Supabase.instance.client.auth.currentSession != null;
    _authSubscription = Supabase.instance.client.auth.onAuthStateChange.listen((
      data,
    ) {
      _hasAuthenticatedSession = data.session != null;
      unawaited(_attemptAutoSync(reason: 'AuthState'));
    });
    _initConnectivity();
    _monitorConnectivity();
    _startHeartbeat();
  }

  void dismissSyncSuccess() {
    _showSyncSuccess = false;
    notifyListeners();
  }

  Future<void> _initConnectivity() async {
    _connectivity = await Connectivity().checkConnectivity();
    await _refreshSyncState();
    debugPrint(
      'InitConnectivity: connectivity=$_connectivity, backendReachable=$_isBackendReachable, databaseConnected=$isDatabaseConnected, unsynced=$_unsyncedCount',
    );
    if (canAttemptSync && _unsyncedCount > 0) {
      await startSync(refreshState: false);
    }
  }

  void _monitorConnectivity() {
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((
      result,
    ) {
      unawaited(_handleConnectivityChange(result));
    });
  }

  void _startHeartbeat() {
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 30), (timer) {
      unawaited(_attemptAutoSync(reason: 'Heartbeat'));
    });
  }

  Future<void> _handleConnectivityChange(ConnectivityResult result) async {
    _connectivity = result;
    debugPrint('MonitorConnectivity: Connectivity changed to $result');
    await _attemptAutoSync(reason: 'ConnectivityChanged');
  }

  Future<void> _refreshSyncState() async {
    await _checkBackendReachability();
    await checkUnsynced();
  }

  Future<void> _attemptAutoSync({required String reason}) async {
    await _refreshSyncState();

    if (_isSyncing) {
      debugPrint('$reason: Sync already in progress, skipping');
      return;
    }

    if (_unsyncedCount == 0) {
      debugPrint('$reason: No pending local records to sync');
      return;
    }

    if (!canAttemptSync) {
      debugPrint(
        '$reason: Pending records detected, but sync prerequisites are still unavailable',
      );
      return;
    }

    if (!isDatabaseConnected) {
      debugPrint(
        '$reason: Database read verification is unavailable, but write-compatible sync will still be attempted.',
      );
    }

    debugPrint('$reason: Auto-syncing $_unsyncedCount pending records');
    await startSync(refreshState: false);
  }

  Future<void> _checkBackendReachability() async {
    try {
      if (!hasNetworkConnection) {
        _isBackendReachable = false;
        _isDatabaseReachable = false;
        _backendErrorMessage = 'No internet connection detected.';
        _databaseErrorMessage = null;
        debugPrint(
          'CheckReachability: No connectivity detected (WiFi/Mobile OFF)',
        );
        notifyListeners();
        return;
      }

      _hasAuthenticatedSession =
          Supabase.instance.client.auth.currentSession != null;
      final backendCheck = await _supabase.checkBackendReachabilityDetailed();
      _isBackendReachable = backendCheck.isReachable;
      _backendErrorMessage = backendCheck.errorMessage;

      if (!_isBackendReachable) {
        _isDatabaseReachable = false;
        _databaseErrorMessage = null;
        debugPrint(
          'CheckReachability: Supabase backend probe failed on $_connectivity. Error=$_backendErrorMessage',
        );
      } else {
        final databaseCheck = await _supabase.verifyDatabaseConnectionDetailed(
          requireAuthenticatedUser: _hasAuthenticatedSession,
        );
        _isDatabaseReachable = databaseCheck.isReachable;
        _databaseErrorMessage = databaseCheck.errorMessage;
        debugPrint(
          'CheckReachability: backendReachable=$_isBackendReachable, hasAuthenticatedSession=$_hasAuthenticatedSession, databaseReachable=$_isDatabaseReachable, databaseError=$_databaseErrorMessage',
        );
      }
    } catch (e) {
      _isBackendReachable = false;
      _isDatabaseReachable = false;
      _backendErrorMessage = 'Unexpected sync status error: $e';
      _databaseErrorMessage = null;
      debugPrint('CheckReachability: Unexpected error: $e');
    }
    notifyListeners();
  }

  Future<void> checkUnsynced() async {
    final localDb = LocalDB();
    _unsyncedCount = await localDb.getUnsyncedRecordsCount();
    _syncedCount = await localDb.getSyncedRecordsCount();
    _totalRecords = await localDb.getTotalRecordsCount();
    _storageSizeMB = await localDb.getLocalStorageSizeMB();
    debugPrint(
      'CheckUnsynced: Unsynced=$_unsyncedCount, Synced=$_syncedCount, Total=$_totalRecords',
    );
    notifyListeners();
  }

  /// Force recheck connectivity status
  Future<void> recheckConnectivity() async {
    _connectivity = await Connectivity().checkConnectivity();
    await _refreshSyncState();
    debugPrint(
      'RecheckConnectivity: isOnline=$isOnline, isDatabaseConnected=$isDatabaseConnected, connectivity=$_connectivity, backendReachable=$_isBackendReachable',
    );
  }

  Future<void> startSync({bool refreshState = true}) async {
    if (refreshState) {
      await _refreshSyncState();
    }

    debugPrint(
      'StartSync called: isSyncing=$_isSyncing, isOnline=$isOnline, canAttemptSync=$canAttemptSync, isDatabaseConnected=$isDatabaseConnected, unsyncedCount=$_unsyncedCount',
    );

    if (_isSyncing) {
      debugPrint('StartSync: Already syncing, skipping');
      return;
    }

    if (_unsyncedCount == 0) {
      debugPrint('StartSync: No local records are waiting for sync');
      return;
    }

    if (!canAttemptSync) {
      debugPrint(
        'StartSync: Sync unavailable (connectivity=$_connectivity, backendReachable=$_isBackendReachable, hasAuthenticatedSession=$_hasAuthenticatedSession, databaseReachable=$_isDatabaseReachable)',
      );
      return;
    }

    _isSyncing = true;
    _showSyncSuccess = false;
    notifyListeners();
    try {
      debugPrint('StartSync: Beginning sync...');
      if (!isDatabaseConnected) {
        debugPrint(
          'StartSync: Proceeding in compatibility mode because the database read verification failed.',
        );
      }
      final syncService = SyncService();
      await syncService.syncAll();
      await checkUnsynced();
      _showSyncSuccess = _unsyncedCount == 0;
      debugPrint(
        'StartSync: Sync completed. Remaining unsyncedCount=$_unsyncedCount',
      );
    } catch (e) {
      debugPrint('StartSync: Sync error: $e');
      _showSyncSuccess = false;
    } finally {
      _isSyncing = false;
      notifyListeners();
    }
  }

  Future<void> clearLocalData() async {
    final localDb = LocalDB();
    await localDb.clearAllData();
    await checkUnsynced();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(_attemptAutoSync(reason: 'AppResumed'));
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _authSubscription?.cancel();
    _connectivitySubscription?.cancel();
    _heartbeatTimer?.cancel();
    super.dispose();
  }
}
