import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:convert';
import 'dart:io';
import 'dart:async';
import 'package:uuid/uuid.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import 'package:retry/retry.dart';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';
import '../models/observation_models.dart';

int? _monitoringRowIdFromCandidate(Map<String, dynamic>? row) {
  if (row == null) return null;

  final rawId = row['id'];
  if (rawId is int) return rawId;
  if (rawId is num) return rawId.toInt();

  final text = rawId?.toString().trim() ?? '';
  if (text.isEmpty) return null;
  return int.tryParse(text) ?? double.tryParse(text)?.toInt();
}

DateTime? _monitoringRowTimestamp(Map<String, dynamic> row) {
  for (final key in const ['updated_at', 'date_recorded', 'created_at']) {
    final text = row[key]?.toString().trim() ?? '';
    if (text.isEmpty) continue;

    final parsed = DateTime.tryParse(text);
    if (parsed != null) {
      return parsed;
    }
  }

  return null;
}

@visibleForTesting
int? selectMonitoringRowIdForUpsert(
  List<Map<String, dynamic>> rows, {
  String? preferredClientUuid,
}) {
  final targetClientUuid = preferredClientUuid?.trim() ?? '';

  if (targetClientUuid.isNotEmpty) {
    for (final row in rows) {
      final rowClientUuid = row['client_uuid']?.toString().trim() ?? '';
      final rowId = _monitoringRowIdFromCandidate(row);
      if (rowId != null && rowClientUuid == targetClientUuid) {
        return rowId;
      }
    }
  }

  Map<String, dynamic>? bestRow;
  for (final row in rows) {
    final rowId = _monitoringRowIdFromCandidate(row);
    if (rowId == null) continue;

    if (bestRow == null) {
      bestRow = row;
      continue;
    }

    final rowTimestamp = _monitoringRowTimestamp(row);
    final bestTimestamp = _monitoringRowTimestamp(bestRow);
    if (rowTimestamp != null && bestTimestamp != null) {
      if (rowTimestamp.isAfter(bestTimestamp)) {
        bestRow = row;
        continue;
      }
      if (rowTimestamp.isBefore(bestTimestamp)) {
        continue;
      }
    } else if (rowTimestamp != null) {
      bestRow = row;
      continue;
    } else if (bestTimestamp != null) {
      continue;
    }

    final bestRowId = _monitoringRowIdFromCandidate(bestRow) ?? 0;
    if (rowId > bestRowId) {
      bestRow = row;
    }
  }

  return _monitoringRowIdFromCandidate(bestRow);
}

class ConnectivityCheckResult {
  final bool isReachable;
  final String? errorMessage;

  const ConnectivityCheckResult({required this.isReachable, this.errorMessage});
}

class DatabaseCheckResult {
  final bool isReachable;
  final String? errorMessage;

  const DatabaseCheckResult({required this.isReachable, this.errorMessage});
}

class DuplicateObservationException implements Exception {
  final String message;

  DuplicateObservationException([this.message = 'This record already exists.']);

  @override
  String toString() => message;
}

class SupabaseService {
  static final SupabaseClient _client = Supabase.instance.client;
  static const String _sugarcaneMonitoringTable = 'sugarcane_monitoring';
  static const String _databaseVerificationTable = _sugarcaneMonitoringTable;
  SupabaseClient get client => _client;

  Future<bool> checkBackendReachability() async {
    final result = await checkBackendReachabilityDetailed();
    return result.isReachable;
  }

  Future<ConnectivityCheckResult> checkBackendReachabilityDetailed() async {
    try {
      final restUri = Uri.parse(client.rest.url);
      final healthUri = restUri.replace(path: '/auth/v1/health', query: null);
      final headers = <String, String>{
        if ((client.headers['apikey'] ?? '').isNotEmpty)
          'apikey': client.headers['apikey']!,
      };

      final response = await http
          .get(healthUri, headers: headers)
          .timeout(const Duration(seconds: 6));

      if (response.statusCode >= 200 && response.statusCode < 500) {
        return const ConnectivityCheckResult(isReachable: true);
      }

      return ConnectivityCheckResult(
        isReachable: false,
        errorMessage:
            'Supabase health check failed with status ${response.statusCode}.',
      );
    } on TimeoutException {
      return const ConnectivityCheckResult(
        isReachable: false,
        errorMessage:
            'Supabase health check timed out after 6 seconds. Internet may be slow or the backend may be unavailable.',
      );
    } on SocketException catch (e) {
      return ConnectivityCheckResult(
        isReachable: false,
        errorMessage: 'Could not reach Supabase: ${e.message}',
      );
    } on http.ClientException catch (e) {
      return ConnectivityCheckResult(
        isReachable: false,
        errorMessage: 'HTTP client error while checking Supabase: ${e.message}',
      );
    } catch (e) {
      debugPrint('SupabaseService: Backend reachability check failed: $e');
      return ConnectivityCheckResult(
        isReachable: false,
        errorMessage: 'Supabase reachability check failed: $e',
      );
    }
  }

  Future<bool> verifyDatabaseConnection({
    bool requireAuthenticatedUser = true,
  }) async {
    final result = await verifyDatabaseConnectionDetailed(
      requireAuthenticatedUser: requireAuthenticatedUser,
    );
    return result.isReachable;
  }

  Future<DatabaseCheckResult> verifyDatabaseConnectionDetailed({
    bool requireAuthenticatedUser = true,
  }) async {
    try {
      final session = client.auth.currentSession;
      if (requireAuthenticatedUser && session == null) {
        return const DatabaseCheckResult(
          isReachable: false,
          errorMessage:
              'No authenticated Supabase session. Please log in again.',
        );
      }

      await client.from(_databaseVerificationTable).select('id').limit(1);
      return const DatabaseCheckResult(isReachable: true);
    } on PostgrestException catch (e) {
      final message = _isDatabaseVerificationTableSchemaError(e)
          ? 'Database table $_databaseVerificationTable is not ready: ${e.message}'
          : 'Database query failed${e.code == null ? '' : ' (${e.code})'}: ${e.message}';
      debugPrint('SupabaseService: Database verification failed: $message');
      return DatabaseCheckResult(isReachable: false, errorMessage: message);
    } on AuthException catch (e) {
      final message = 'Supabase authentication error: ${e.message}';
      debugPrint('SupabaseService: Database verification failed: $message');
      return DatabaseCheckResult(isReachable: false, errorMessage: message);
    } catch (e) {
      debugPrint('SupabaseService: Database verification failed: $e');
      return DatabaseCheckResult(
        isReachable: false,
        errorMessage: 'Database verification failed: $e',
      );
    }
  }

  // --- Auth ---

  Future<AuthResponse> signIn(String email, String password) async {
    return await client.auth
        .signInWithPassword(email: email, password: password)
        .timeout(const Duration(seconds: 8));
  }

  Future<AuthResponse> signUp(
    String email,
    String password, {
    Map<String, dynamic>? data,
  }) async {
    return await client.auth.signUp(
      email: email,
      password: password,
      data: data,
    );
  }

  Future<void> signOut() async {
    await client.auth.signOut();
  }

  User? get currentUser => client.auth.currentUser;

  // --- Database CRUD (Generic) ---

  Future<List<Map<String, dynamic>>> fetchAll(String table) async {
    final response = await client.from(table).select();
    return List<Map<String, dynamic>>.from(response);
  }

  Future<Map<String, dynamic>> upsert(
    String table,
    Map<String, dynamic> data,
  ) async {
    final response = await client.from(table).upsert(data).select().single();
    return response;
  }

  Future<void> delete(String table, String id) async {
    await client.from(table).delete().eq('id', id);
  }

  Future<List<Map<String, dynamic>>> fetchSugarcaneMonitoringFields() async {
    List<Map<String, dynamic>> response;
    try {
      response = List<Map<String, dynamic>>.from(
        await client
            .from(_sugarcaneMonitoringTable)
            .select()
            .order('field_name')
            .order('block_id')
            .order('date_recorded', ascending: false)
            .order('id', ascending: false),
      );
    } on PostgrestException catch (e) {
      if (!_isSugarcaneMonitoringSchemaError(e)) rethrow;

      response = List<Map<String, dynamic>>.from(
        await client
            .from(_sugarcaneMonitoringTable)
            .select()
            .order('field_id')
            .order('block_id')
            .order('date_recorded', ascending: false)
            .order('id', ascending: false),
      );
    }

    final uniqueRecords = <Map<String, dynamic>>[];
    final seenFieldKeys = <String>{};

    for (final record in response) {
      final normalized = Map<String, dynamic>.from(record);
      normalized['field_name'] =
          _nullableString(normalized['field_name']) ??
          _nullableString(normalized['field_id']);
      normalized['tam'] =
          normalized['tam'] ?? normalized['tam_mm'] ?? normalized['time'];
      normalized['ph'] =
          normalized['ph'] ?? normalized['soil_ph'] ?? normalized['pH'];
      normalized['remarks'] =
          normalized['remarks'] ?? normalized['field_remarks'];
      normalized['yield'] = normalized['yield'] ?? normalized['harvest_yield'];
      normalized['cane_quality_remarks'] =
          normalized['cane_quality_remarks'] ?? normalized['quality_remarks'];
      normalized['management_method'] =
          normalized['management_method'] ??
          normalized['residue_management_method'];
      normalized['residue_remarks'] =
          normalized['residue_remarks'] ??
          normalized['residual_management_remarks'];
      normalized['application_date'] =
          normalized['application_date'] ??
          normalized['nutrient_application_date'];
      normalized['fertiliser_type'] =
          normalized['fertiliser_type'] ?? normalized['fertilizer_type'];
      normalized['previous_cutting_date'] =
          normalized['previous_cutting_date'] ?? normalized['previous_cutting'];
      normalized['actual_cutting_date'] =
          normalized['actual_cutting_date'] ?? normalized['harvest_date'];
      normalized['herbicide_application_date'] =
          normalized['herbicide_application_date'] ??
          normalized['weed_application_date'];
      normalized['herbicide_application_rate'] =
          normalized['herbicide_application_rate'] ??
          normalized['weed_application_rate'];

      final polygon = _normalizeGeometry(
        normalized['polygon'] ??
            normalized['geom_polygon'] ??
            normalized['geometry'] ??
            normalized['spatial_data'],
      );
      if (polygon != null) {
        normalized['polygon'] = polygon;
      }

      final fieldName = _nullableString(normalized['field_name']) ?? '';
      final blockId = _nullableString(normalized['block_id']) ?? '';
      final uniqueKey = '${fieldName.toLowerCase()}|${blockId.toLowerCase()}';

      if (fieldName.isNotEmpty || blockId.isNotEmpty) {
        if (seenFieldKeys.contains(uniqueKey)) {
          continue;
        }
        seenFieldKeys.add(uniqueKey);
      }

      uniqueRecords.add(normalized);
    }

    return uniqueRecords;
  }

  // --- Blocks ---

  Future<List<Map<String, dynamic>>> fetchBlocks() async {
    try {
      final response = await client.from('blocks').select();
      return List<Map<String, dynamic>>.from(
        response,
      ).map(_normalizeBlockRecord).toList();
    } on PostgrestException catch (e) {
      if (!_isLegacyBlocksSchemaError(e)) rethrow;

      final response = await client.from('blocks').select('block_id,name,geom');
      return List<Map<String, dynamic>>.from(
        response,
      ).map(_normalizeBlockRecord).toList();
    }
  }

  Future<void> upsertBlocks(List<Map<String, dynamic>> blocks) async {
    if (blocks.isEmpty) return;

    final payload = blocks
        .map(_normalizeBlockRecord)
        .where(
          (block) => (block['block_id']?.toString().trim() ?? '').isNotEmpty,
        )
        .toList();

    if (payload.isEmpty) return;

    try {
      await client.from('blocks').upsert(payload, onConflict: 'block_id');
      return;
    } on PostgrestException catch (e) {
      if (!_isLegacyBlocksSchemaError(e)) rethrow;
      debugPrint(
        'SupabaseService: Blocks table uses a legacy schema. Retrying with compatible payload.',
      );
    }

    final legacyPayload = payload.map((block) {
      final legacyBlock = <String, dynamic>{
        'block_id': block['block_id'],
        'name': block['field_name'] ?? block['name'] ?? block['block_id'],
      };
      if (block['geom'] != null) {
        legacyBlock['geom'] = block['geom'];
      }
      return legacyBlock;
    }).toList();

    try {
      await client.from('blocks').upsert(legacyPayload, onConflict: 'block_id');
    } on PostgrestException catch (e) {
      if (!_isBlocksGeometryCompatibilityError(e) &&
          !_isLegacyBlocksSchemaError(e)) {
        rethrow;
      }

      debugPrint(
        'SupabaseService: Blocks geometry is not compatible with the live schema. Retrying without geom.',
      );

      final minimalPayload = legacyPayload
          .map(
            (block) => {'block_id': block['block_id'], 'name': block['name']},
          )
          .toList();

      await client
          .from('blocks')
          .upsert(minimalPayload, onConflict: 'block_id');
    }
  }

  Map<String, dynamic> _normalizeBlockRecord(Map<String, dynamic> block) {
    final normalized = Map<String, dynamic>.from(block);
    final blockId = normalized['block_id']?.toString().trim() ?? '';

    normalized['id'] = normalized['id']?.toString().trim().isNotEmpty == true
        ? normalized['id'].toString().trim()
        : blockId;
    normalized['block_id'] = blockId;

    normalized['section_name'] = _nullableString(normalized['section_name']);
    normalized['name'] =
        _nullableString(normalized['name']) ??
        _nullableString(normalized['field_name']) ??
        blockId;
    normalized['field_name'] =
        _nullableString(normalized['field_name']) ??
        _nullableString(normalized['name']) ??
        blockId;
    normalized['geom'] = _normalizeGeometry(normalized['geom']);

    return normalized;
  }

  bool _isLegacyBlocksSchemaError(PostgrestException error) {
    return error.code == '42703' ||
        error.code == 'PGRST204' ||
        error.message.contains('blocks.');
  }

  bool _isBlocksGeometryCompatibilityError(PostgrestException error) {
    return error.code == '22P02' ||
        error.code == '22023' ||
        error.code == '42804' ||
        error.message.toLowerCase().contains('geom');
  }

  bool _isDatabaseVerificationTableSchemaError(PostgrestException error) {
    return error.code == '42P01' ||
        error.code == '42703' ||
        error.code == 'PGRST204' ||
        error.message.contains(_databaseVerificationTable);
  }

  bool _isSugarcaneMonitoringSchemaError(PostgrestException error) {
    return error.code == '42P01' ||
        error.code == '42703' ||
        error.code == 'PGRST204' ||
        error.message.contains(_sugarcaneMonitoringTable);
  }

  dynamic _normalizeGeometry(dynamic value) {
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

  String? _nullableString(dynamic value) {
    final text = value?.toString().trim() ?? '';
    return text.isEmpty ? null : text;
  }

  int? _nullableInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    final text = value?.toString().trim() ?? '';
    if (text.isEmpty) return null;
    return int.tryParse(text) ?? double.tryParse(text)?.toInt();
  }

  void _applySavedMonitoringRowToPayload(
    Map<String, dynamic> payload,
    Map<String, dynamic> savedRow,
  ) {
    final fieldIdentification = Map<String, dynamic>.from(
      payload['field_identification'] ?? const {},
    );
    final savedId = _nullableInt(savedRow['id']);
    if (savedId != null) {
      fieldIdentification['monitoring_row_id'] = savedId;
    }
    final savedCreatedAt = _nullableString(savedRow['created_at']);
    if (savedCreatedAt != null) {
      payload['created_at'] = savedCreatedAt;
    }
    payload['field_identification'] = fieldIdentification;
  }

  Future<Map<String, dynamic>> _saveSugarcaneMonitoringRow(
    Map<String, dynamic> record,
  ) async {
    final monitoringRowId = _nullableInt(record['id']);

    if (monitoringRowId != null) {
      final updatePayload = Map<String, dynamic>.from(record)..remove('id');
      final response = await client
          .from(_sugarcaneMonitoringTable)
          .update(updatePayload)
          .eq('id', monitoringRowId)
          .select()
          .maybeSingle();

      if (response != null) {
        return Map<String, dynamic>.from(response);
      }

      final inserted = await client
          .from(_sugarcaneMonitoringTable)
          .insert(updatePayload)
          .select()
          .single();
      return Map<String, dynamic>.from(inserted);
    }

    final insertPayload = Map<String, dynamic>.from(record)..remove('id');
    final response = await client
        .from(_sugarcaneMonitoringTable)
        .insert(insertPayload)
        .select()
        .single();
    return Map<String, dynamic>.from(response);
  }

  String _fingerprintForSugarcaneRow(Map<String, dynamic> row) {
    return buildObservationFingerprint(normalizeObservationPayload(row));
  }

  Map<String, dynamic> _normalizeObservationFromSugarcaneRow(
    Map<String, dynamic> row,
  ) {
    final normalizedRow = Map<String, dynamic>.from(row);
    final rowId = _nullableInt(normalizedRow['id']);

    if ((_nullableString(normalizedRow['client_uuid']) == null) &&
        rowId != null) {
      normalizedRow['client_uuid'] = 'sugarcane-monitoring-$rowId';
    }

    return normalizeObservationPayload(normalizedRow);
  }

  Future<List<Map<String, dynamic>>> _fetchObservationCandidates({
    int? monitoringRowId,
    String? fieldId,
    String? blockId,
  }) async {
    final lookupFieldId = fieldId?.trim() ?? '';
    final lookupBlockId = blockId?.trim() ?? '';

    if (monitoringRowId != null &&
        lookupFieldId.isEmpty &&
        lookupBlockId.isEmpty) {
      final response = await client
          .from(_sugarcaneMonitoringTable)
          .select()
          .eq('id', monitoringRowId)
          .limit(12);
      return List<Map<String, dynamic>>.from(response);
    }

    Future<List<Map<String, dynamic>>> queryWithFieldColumn(
      String fieldColumn,
    ) async {
      PostgrestFilterBuilder<List<Map<String, dynamic>>> query = client
          .from(_sugarcaneMonitoringTable)
          .select();

      if (lookupFieldId.isNotEmpty) {
        query = query.eq(fieldColumn, lookupFieldId);
      }
      if (lookupBlockId.isNotEmpty) {
        query = query.eq('block_id', lookupBlockId);
      }

      final response = await query.limit(12);
      return List<Map<String, dynamic>>.from(response);
    }

    try {
      return await queryWithFieldColumn('field_id');
    } on PostgrestException catch (e) {
      if (!_isSugarcaneMonitoringSchemaError(e)) rethrow;
    }

    return queryWithFieldColumn('field_name');
  }

  Future<int?> _resolveMonitoringRowIdForSave({
    String? fieldId,
    String? blockId,
    String? preferredClientUuid,
  }) async {
    final lookupFieldId = fieldId?.trim() ?? '';
    final lookupBlockId = blockId?.trim() ?? '';
    if (lookupFieldId.isEmpty && lookupBlockId.isEmpty) {
      return null;
    }

    final rows = await _fetchObservationCandidates(
      fieldId: lookupFieldId,
      blockId: lookupBlockId,
    );
    return selectMonitoringRowIdForUpsert(
      rows,
      preferredClientUuid: preferredClientUuid,
    );
  }

  // --- Storage ---

  Future<File> compressImage(File file) async {
    final tempDir = await getTemporaryDirectory();
    final uuid = const Uuid().v4();
    final targetPath = p.join(tempDir.path, '${uuid}_compressed.jpg');

    final result = await FlutterImageCompress.compressAndGetFile(
      file.absolute.path,
      targetPath,
      quality: 70, // Slightly more aggressive compression
      minWidth: 1280, // 1280 is sufficient for clear field photos
      minHeight: 1280,
    );

    if (result == null) {
      throw Exception('Image compression failed');
    }

    return File(result.path);
  }

  Future<Map<String, String>> uploadImageWithRetry(
    String bucket,
    String path,
    File file,
  ) async {
    File? compressedFile;
    try {
      compressedFile = await compressImage(file);
      final uuid = const Uuid().v4();
      final fileName = '${DateTime.now().millisecondsSinceEpoch}_$uuid.jpg';
      final fullPath = '$path/$fileName';

      return await retry(
        () async {
          await client.storage
              .from(bucket)
              .upload(
                fullPath,
                compressedFile!,
                fileOptions: const FileOptions(
                  cacheControl: '3600',
                  upsert: false,
                ),
              )
              .timeout(const Duration(seconds: 60));

          final publicUrl = client.storage.from(bucket).getPublicUrl(fullPath);

          return {'publicUrl': publicUrl, 'fullPath': fullPath};
        },
        retryIf: (e) =>
            e is SocketException ||
            e is TimeoutException ||
            e is HandshakeException || // Catch TLS handshake failures separately
            e is HttpException ||
            e is http.ClientException ||
            e is TlsException || // Catch other TLS failures
            e.toString().contains('Connection reset by peer') ||
            e.toString().contains('Connection terminated during handshake'),
        maxAttempts: 8, // Increased attempts for very unstable networks
        delayFactor: const Duration(seconds: 2),
        randomizationFactor: 0.5,
      );
    } finally {
      // Ensure cleanup of temp file regardless of success or final failure
      if (compressedFile != null && await compressedFile.exists()) {
        try {
          await compressedFile.delete();
        } catch (e) {
          debugPrint(
            'SupabaseService: Warning - failed to cleanup temp file: $e',
          );
        }
      }
    }
  }

  // Deprecated: Internal use should switch to uploadImageWithRetry
  Future<Map<String, String>> uploadImage(
    String bucket,
    String path,
    File file,
  ) async {
    return uploadImageWithRetry(bucket, path, file);
  }

  // --- Observation Submission ---

  Future<void> saveObservation(Map<String, dynamic> payload) async {
    final normalizedPayload = normalizeObservationPayload(payload);

    final fieldIdentification = Map<String, dynamic>.from(
      normalizedPayload['field_identification'] ?? const {},
    );
    var monitoringRowId = _nullableInt(
      fieldIdentification['monitoring_row_id'],
    );
    final fieldId =
        _nullableString(fieldIdentification['field_id']) ??
        _nullableString(fieldIdentification['field_name']);
    final blockId = _nullableString(fieldIdentification['block_id']);
    final clientUuid = _nullableString(normalizedPayload['client_uuid']);

    if (monitoringRowId == null) {
      monitoringRowId = await _resolveMonitoringRowIdForSave(
        fieldId: fieldId,
        blockId: blockId,
        preferredClientUuid: clientUuid,
      );
      if (monitoringRowId != null) {
        fieldIdentification['monitoring_row_id'] = monitoringRowId;
        normalizedPayload['field_identification'] = fieldIdentification;
      }
    }

    final fingerprint =
        normalizedPayload['record_fingerprint']?.toString().trim() ??
        buildObservationFingerprint(normalizedPayload);

    final duplicateExists = await observationExistsByFingerprint(
      fingerprint,
      fieldId: fieldId,
      blockId: blockId,
      excludeMonitoringRowId: monitoringRowId,
    );
    if (duplicateExists) {
      throw DuplicateObservationException(
        'This information already exists in the database.',
      );
    }

    Map<String, dynamic> savedRow;

    try {
      savedRow = await _saveSugarcaneMonitoringRow(
        buildModernSugarcaneMonitoringRecord(normalizedPayload),
      );
    } on PostgrestException catch (e) {
      if (!_isSugarcaneMonitoringSchemaError(e)) rethrow;

      debugPrint(
        'SupabaseService: sugarcane_monitoring is using the legacy column set. Retrying with compatibility mapping.',
      );
      savedRow = await _saveSugarcaneMonitoringRow(
        buildSugarcaneMonitoringRecord(normalizedPayload),
      );
    }

    _applySavedMonitoringRowToPayload(payload, savedRow);
  }

  Future<bool> observationExistsByFingerprint(
    String fingerprint, {
    int? monitoringRowId,
    String? fieldId,
    String? blockId,
    int? excludeMonitoringRowId,
  }) async {
    final lookupFingerprint = fingerprint.trim();
    if (lookupFingerprint.isEmpty) return false;

    final lookupFieldId = fieldId?.trim() ?? '';
    final lookupBlockId = blockId?.trim() ?? '';
    final excludedRowId = excludeMonitoringRowId;
    if (monitoringRowId == null &&
        lookupFieldId.isEmpty &&
        lookupBlockId.isEmpty) {
      return false;
    }

    final rows = await _fetchObservationCandidates(
      monitoringRowId: monitoringRowId,
      fieldId: lookupFieldId,
      blockId: lookupBlockId,
    );
    for (final row in rows) {
      final rowId = _nullableInt(row['id']);
      if (excludedRowId != null && rowId == excludedRowId) {
        continue;
      }
      if (_fingerprintForSugarcaneRow(row) == lookupFingerprint) {
        return true;
      }
    }

    return false;
  }

  // --- Fetch History ---

  Future<List<Map<String, dynamic>>> getRecentObservations({
    int limit = 50,
  }) async {
    final response = await client
        .from(_sugarcaneMonitoringTable)
        .select()
        .not('date_recorded', 'is', null)
        .order('date_recorded', ascending: false)
        .limit(limit);

    return List<Map<String, dynamic>>.from(response)
        .map(
          (row) => _normalizeObservationFromSugarcaneRow(
            Map<String, dynamic>.from(row),
          ),
        )
        .toList();
  }

  Future<Map<String, dynamic>> getObservationDetails(
    dynamic observationId,
  ) async {
    final response = await client
        .from(_sugarcaneMonitoringTable)
        .select()
        .eq('id', observationId)
        .maybeSingle();

    if (response == null) throw Exception('Observation not found');

    return _normalizeObservationFromSugarcaneRow(
      Map<String, dynamic>.from(response),
    );
  }
}
