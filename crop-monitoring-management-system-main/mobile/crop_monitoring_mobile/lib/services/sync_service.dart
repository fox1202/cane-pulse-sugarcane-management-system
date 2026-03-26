import 'dart:convert';
import 'dart:io';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/material.dart';
import '../config/supabase_config.dart';
import '../models/observation_models.dart';
import 'local_db.dart';
import 'supabase_service.dart';

class SyncService {
  final LocalDB localDb = LocalDB();
  final SupabaseService supabase = SupabaseService();
  bool _isSyncing = false;

  Future<void> syncAll() async {
    if (_isSyncing) {
      debugPrint('SyncService: Already syncing, skipping');
      return;
    }

    var connectivityResult = await Connectivity().checkConnectivity();
    if (connectivityResult == ConnectivityResult.none) {
      debugPrint('SyncService: No connectivity, aborting sync');
      return;
    }

    debugPrint('SyncService: Starting sync process...');
    _isSyncing = true;
    try {
      // Verify that we still have the minimum prerequisites for sync.
      final isConnected = await _verifyDatabaseConnection();
      if (!isConnected) {
        debugPrint('SyncService: Sync prerequisites verification failed!');
        return;
      }

      await syncObservations();
      await syncBlocks();
      debugPrint('SyncService: Sync completed successfully!');
    } catch (e) {
      debugPrint('SyncService: Fatal sync error: $e');
    } finally {
      _isSyncing = false;
    }
  }

  int? _resolveLocalRecordId(dynamic rawId) {
    if (rawId is int) return rawId;
    return int.tryParse(rawId?.toString() ?? '');
  }

  Future<void> _storeSyncedObservation(
    Map<String, dynamic> record,
    Map<String, dynamic> data,
  ) async {
    final localId = _resolveLocalRecordId(record['id']);
    if (localId == null) {
      debugPrint(
        'SyncService: Could not resolve local observation id for synced payload.',
      );
      return;
    }

    await localDb.saveOrUpdateObservation(data, localId: localId, synced: true);
  }

  /// Verify sync prerequisites.
  Future<bool> _verifyDatabaseConnection() async {
    debugPrint('SyncService: Verifying sync prerequisites...');

    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      debugPrint(
        'SyncService: No authenticated user session. Falling back to database compatibility check.',
      );
    } else {
      debugPrint('SyncService: Authenticated as: ${user.email}');
    }

    final databaseCheck = await supabase.verifyDatabaseConnectionDetailed(
      requireAuthenticatedUser: user != null,
    );
    if (databaseCheck.isReachable) {
      debugPrint('SyncService: Database connection verified ✓');
      return true;
    }

    debugPrint(
      'SyncService: Database read verification failed, but sync will still attempt write-compatible uploads. ${databaseCheck.errorMessage ?? ''}',
    );
    return true;
  }

  Future<void> syncObservations() async {
    List<Map<String, dynamic>> unsynced = await localDb
        .getUnsyncedObservations();

    debugPrint('SyncService: Found ${unsynced.length} unsynced observations');

    if (unsynced.isEmpty) {
      debugPrint('SyncService: No observations to sync');
      return;
    }

    for (var record in unsynced) {
      final data = normalizeObservationPayload(
        Map<String, dynamic>.from(jsonDecode(record['data']) as Map),
      );
      final fingerprint =
          data['record_fingerprint']?.toString() ??
          buildObservationFingerprint(data);
      data['record_fingerprint'] = fingerprint;

      try {
        // 1. Handle Images if they are local paths
        // 1. Handle Images
        if (data['image_reference'] != null) {
          bool imageUploadFailed = false;

          // A. NEW FORMAT: List of objects in 'images'
          if (data['image_reference']['images'] != null) {
            List<dynamic> images = data['image_reference']['images'];
            List<Map<String, dynamic>> updatedImages = [];

            for (var img in images) {
              String url = img['image_url'];
              if (!url.startsWith('http')) {
                // Local path detected
                File file = File(url);
                if (file.existsSync()) {
                  try {
                    // Using the new robust upload with compression and retry
                    final res = await supabase.uploadImageWithRetry(
                      'crop-monitoring-photos',
                      'observations',
                      file,
                    );
                    updatedImages.add({
                      'image_url': res['publicUrl'],
                      'storage_path': res['fullPath'],
                    });
                  } catch (e) {
                    debugPrint(
                      'Sync: Image upload failed after retries for ${record['id']}: $e',
                    );
                    imageUploadFailed = true;
                    break;
                  }
                }
              } else {
                // Already valid URL
                updatedImages.add(Map<String, dynamic>.from(img));
              }
            }
            if (!imageUploadFailed) {
              data['image_reference']['images'] = updatedImages;
            }
          }
          // B. LEGACY FORMAT: List of strings in 'image_urls'
          else if (data['image_reference']['image_urls'] != null) {
            List<dynamic> urls = data['image_reference']['image_urls'];
            List<String> uploadedUrls = [];

            for (var item in urls) {
              String path = item.toString();
              if (!path.startsWith('http')) {
                File file = File(path);
                if (file.existsSync()) {
                  try {
                    final res = await supabase.uploadImageWithRetry(
                      'crop-monitoring-photos',
                      'observations',
                      file,
                    );
                    uploadedUrls.add(res['publicUrl']!);
                  } catch (e) {
                    debugPrint(
                      'Sync: Image upload failed after retries for ${record['id']}: $e',
                    );
                    imageUploadFailed = true;
                    break;
                  }
                }
              } else {
                uploadedUrls.add(path);
              }
            }
            if (!imageUploadFailed) {
              data['image_reference']['image_urls'] = uploadedUrls;
            }
          }

          if (imageUploadFailed) continue; // Skip to next record, retry later
        }

        final alreadyExists = await supabase.observationExistsByFingerprint(
          fingerprint,
        );
        if (alreadyExists) {
          debugPrint(
            'SyncService: Observation ${record['id']} already exists (fingerprint lookup). Marking as synced.',
          );
          await _storeSyncedObservation(record, data);
          continue;
        }

        // 2. Save observation
        debugPrint(
          'SyncService: Saving observation ${record['id']} to database...',
        );
        await supabase.saveObservation(data);
        await _storeSyncedObservation(record, data);
        debugPrint(
          'SyncService: ✓ Successfully synced observation ${record['id']} to Supabase',
        );
      } on DuplicateObservationException {
        debugPrint(
          'SyncService: Observation ${record['id']} already exists (fingerprint match). Marking as synced.',
        );
        await _storeSyncedObservation(record, data);
      } on PostgrestException catch (e) {
        // Rule 1 & 5: Idempotency check
        // Code 23505 = Unique violation (PostgreSQL)
        if (e.code == '23505') {
          debugPrint(
            'SyncService: Observation ${record['id']} already exists (Idempotent). Marking as synced.',
          );
          await _storeSyncedObservation(record, data);
        } else {
          debugPrint(
            'SyncService: ✗ Database error for observation ${record['id']}: Code=${e.code}, Message=${e.message}',
          );
        }
      } catch (e) {
        debugPrint(
          'SyncService: ✗ Error syncing observation ${record['id']}: $e',
        );
      }
    }
  }

  Future<void> syncBlocks() async {
    await localDb.ensureBlocksCacheMatchesSource(SupabaseConfig.url);
    final localBlocks = await localDb.getAllBlocks();

    if (localBlocks.isNotEmpty) {
      try {
        await supabase.upsertBlocks(localBlocks);
        debugPrint(
          'Sync: Successfully pushed ${localBlocks.length} local blocks to Supabase',
        );
      } catch (e) {
        debugPrint('Sync: Failed to push local blocks: $e');
      }
    }

    try {
      final List<Map<String, dynamic>> remoteBlocks = await supabase
          .fetchBlocks();
      await localDb.syncBlocks(remoteBlocks);
      debugPrint(
        'Sync: Successfully updated ${remoteBlocks.length} blocks from Supabase',
      );
    } catch (e) {
      debugPrint('Sync: Failed to sync blocks: $e');
    }
  }
}
