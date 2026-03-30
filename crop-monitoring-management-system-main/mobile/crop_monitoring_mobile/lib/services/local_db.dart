import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io';

import '../models/observation_models.dart';

class LocalDB {
  static final LocalDB _instance = LocalDB._internal();
  static const String _blocksSourceDraftKey = '__blocks_source';
  factory LocalDB() => _instance;
  LocalDB._internal();

  static Database? _db;

  Future<Database> get db async {
    if (_db != null) return _db!;
    _db = await initDb();
    return _db!;
  }

  Future<Database> initDb() async {
    Directory documentsDirectory = await getApplicationDocumentsDirectory();
    String path = join(documentsDirectory.path, 'crop_monitoring.db');
    return await openDatabase(
      path,
      version: 4,
      onCreate: (Database db, int version) async {
        await db.execute('''
          CREATE TABLE observations(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data TEXT,
            synced INTEGER DEFAULT 0
          )
        ''');
        await db.execute('''
          CREATE TABLE fields(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data TEXT,
            synced INTEGER DEFAULT 0
          )
        ''');
        await db.execute('''
          CREATE TABLE drafts(
            key TEXT PRIMARY KEY,
            data TEXT
          )
        ''');
        await db.execute('''
          CREATE TABLE blocks(
            id TEXT PRIMARY KEY,
            block_id TEXT UNIQUE,
            data TEXT
          )
        ''');
      },
      onUpgrade: (Database db, int oldVersion, int newVersion) async {
        if (oldVersion < 2) {
          await db.execute('''
            CREATE TABLE fields(
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              data TEXT,
              synced INTEGER DEFAULT 0
            )
          ''');
        }
        if (oldVersion < 3) {
          await db.execute('''
            CREATE TABLE drafts(
              key TEXT PRIMARY KEY,
              data TEXT
            )
          ''');
        }
        if (oldVersion < 4) {
          await db.execute('''
            CREATE TABLE blocks(
              id TEXT PRIMARY KEY,
              block_id TEXT UNIQUE,
              data TEXT
            )
          ''');
        }
      },
    );
  }

  // Insert observation
  Future<int> insertObservation(Map<String, dynamic> data) async {
    final dbClient = await db;

    // Ensure offline records have a unique identifier for idempotency
    if (data['client_uuid'] == null) {
      final String timestamp = DateTime.now().millisecondsSinceEpoch.toString();
      final String random = (100000 + (DateTime.now().microsecond % 900000))
          .toString();
      data['client_uuid'] = 'offline-$timestamp-$random';
    }

    data['record_fingerprint'] = buildObservationFingerprint(data);

    return await dbClient.insert('observations', {
      'data': jsonEncode(data),
      'synced': 0,
    });
  }

  // Insert field
  Future<int> insertField(Map<String, dynamic> data) async {
    final dbClient = await db;
    return await dbClient.insert('fields', {
      'data': jsonEncode(data),
      'synced': 0,
    });
  }

  // Get unsynced observations
  Future<List<Map<String, dynamic>>> getUnsyncedObservations() async {
    final dbClient = await db;
    // Order by ID desc (newest first for local processing)
    return await dbClient.query('observations', where: 'synced = 0');
  }

  // Get ALL observations (synced + unsynced)
  Future<List<Map<String, dynamic>>> getAllObservations() async {
    final dbClient = await db;
    // Order by ID desc (newest first)
    return await dbClient.query('observations', orderBy: 'id DESC');
  }

  // Get unsynced fields
  Future<List<Map<String, dynamic>>> getUnsyncedFields() async {
    final dbClient = await db;
    return await dbClient.query('fields', where: 'synced = 0');
  }

  // Get ALL fields
  Future<List<Map<String, dynamic>>> getAllFields() async {
    final dbClient = await db;
    return await dbClient.query('fields', orderBy: 'id DESC');
  }

  // Get single observation by local ID
  Future<Map<String, dynamic>?> getObservationById(int id) async {
    final dbClient = await db;
    final List<Map<String, dynamic>> results = await dbClient.query(
      'observations',
      where: 'id = ?',
      whereArgs: [id],
    );
    if (results.isNotEmpty) {
      return results.first;
    }
    return null;
  }

  Future<int?> findObservationIdByClientUuid(String? clientUuid) async {
    final lookup = clientUuid?.trim() ?? '';
    if (lookup.isEmpty) return null;

    final records = await getAllObservations();
    for (final record in records) {
      final payload = Map<String, dynamic>.from(
        jsonDecode(record['data'] as String) as Map,
      );
      final candidate = payload['client_uuid']?.toString().trim() ?? '';
      if (candidate != lookup) continue;

      final rawId = record['id'];
      if (rawId is int) return rawId;
      return int.tryParse(rawId?.toString() ?? '');
    }

    return null;
  }

  Future<int> saveOrUpdateObservation(
    Map<String, dynamic> data, {
    int? localId,
    required bool synced,
  }) async {
    final dbClient = await db;
    final resolvedId =
        localId ??
        await findObservationIdByClientUuid(data['client_uuid']?.toString());
    final payload = {'data': jsonEncode(data), 'synced': synced ? 1 : 0};

    if (resolvedId != null) {
      await dbClient.update(
        'observations',
        payload,
        where: 'id = ?',
        whereArgs: [resolvedId],
      );
      return resolvedId;
    }

    return dbClient.insert('observations', payload);
  }

  Future<bool> hasObservationFingerprint(
    String fingerprint, {
    int? excludeLocalId,
    String? excludeClientUuid,
  }) async {
    final records = await getAllObservations();
    final excludedClientUuid = excludeClientUuid?.trim() ?? '';

    for (final record in records) {
      final rawId = record['id'];
      final localId = rawId is int
          ? rawId
          : int.tryParse(rawId?.toString() ?? '');
      if (excludeLocalId != null && localId == excludeLocalId) {
        continue;
      }

      final payload = Map<String, dynamic>.from(
        jsonDecode(record['data'] as String) as Map,
      );
      final clientUuid = payload['client_uuid']?.toString().trim() ?? '';
      if (excludedClientUuid.isNotEmpty && clientUuid == excludedClientUuid) {
        continue;
      }

      final existingFingerprint = buildObservationFingerprint(payload);

      if (existingFingerprint == fingerprint) {
        return true;
      }
    }

    return false;
  }

  // Mark observation as synced
  Future<int> markAsSynced(int id) async {
    final dbClient = await db;
    return await dbClient.update(
      'observations',
      {'synced': 1},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  // Mark field as synced
  Future<int> markFieldAsSynced(int id) async {
    final dbClient = await db;
    return await dbClient.update(
      'fields',
      {'synced': 1},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  // Save draft
  Future<void> saveDraft(String key, Map<String, dynamic> data) async {
    final dbClient = await db;
    await dbClient.insert('drafts', {
      'key': key,
      'data': jsonEncode(data),
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  // Get draft
  Future<Map<String, dynamic>?> getDraft(String key) async {
    final dbClient = await db;
    final List<Map<String, dynamic>> maps = await dbClient.query(
      'drafts',
      where: 'key = ?',
      whereArgs: [key],
    );
    if (maps.isNotEmpty) {
      return jsonDecode(maps.first['data']);
    }
    return null;
  }

  // Clear draft
  Future<void> clearDraft(String key) async {
    final dbClient = await db;
    await dbClient.delete('drafts', where: 'key = ?', whereArgs: [key]);
  }

  // Save multiple blocks at once
  Future<void> syncBlocks(List<Map<String, dynamic>> blocks) async {
    final dbClient = await db;
    await dbClient.transaction((txn) async {
      // Clear existing blocks for clean sync
      await txn.delete('blocks');
      for (var block in blocks) {
        await txn.insert('blocks', {
          'id': block['id'],
          'block_id': block['block_id'],
          'data': jsonEncode(block),
        });
      }
    });
  }

  Future<bool> ensureBlocksCacheMatchesSource(String source) async {
    final normalizedSource = source.trim();
    if (normalizedSource.isEmpty) return false;

    final existing = await getDraft(_blocksSourceDraftKey);
    final previousSource = existing?['value']?.toString().trim() ?? '';
    final sourceChanged =
        previousSource.isNotEmpty && previousSource != normalizedSource;

    if (sourceChanged) {
      final dbClient = await db;
      await dbClient.delete('blocks');
    }

    await saveDraft(_blocksSourceDraftKey, {'value': normalizedSource});
    return sourceChanged;
  }

  // Get all blocks
  Future<List<Map<String, dynamic>>> getAllBlocks() async {
    final dbClient = await db;
    final results = await dbClient.query('blocks');
    return results
        .map((e) => jsonDecode(e['data'] as String) as Map<String, dynamic>)
        .toList();
  }

  // Save a single block (insert or replace)
  Future<void> saveBlock(Map<String, dynamic> block) async {
    final dbClient = await db;
    await dbClient.insert('blocks', {
      'id': block['id'] ?? '',
      'block_id': block['block_id'] ?? '',
      'data': jsonEncode(block),
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  // Clear all data (observations, fields, drafts, blocks) AND physical images
  Future<void> clearAllData() async {
    final dbClient = await db;
    await dbClient.delete('observations');
    await dbClient.delete('fields');
    await dbClient.delete('drafts');
    await dbClient.delete('blocks');
    await deleteAllImages();
  }

  Future<void> deleteAllImages() async {
    try {
      final cacheDir = await getTemporaryDirectory();
      if (await cacheDir.exists()) {
        final List<FileSystemEntity> files = cacheDir.listSync(recursive: true);
        for (var file in files) {
          if (file is File) {
            final fileName = basename(file.path).toLowerCase();
            if (fileName.contains('image_picker') ||
                fileName.endsWith('.jpg') ||
                fileName.endsWith('.png') ||
                fileName.endsWith('.jpeg')) {
              try {
                await file.delete();
              } catch (e) {
                debugPrint('Failed to delete file ${file.path}: $e');
              }
            }
          }
        }
      }
    } catch (e) {
      debugPrint('Error deleting all images: $e');
    }
  }

  // --- Statistics Helpers ---

  Future<int> getTotalRecordsCount() async {
    final dbClient = await db;
    final obsCount =
        Sqflite.firstIntValue(
          await dbClient.rawQuery('SELECT COUNT(*) FROM observations'),
        ) ??
        0;
    final fieldsCount =
        Sqflite.firstIntValue(
          await dbClient.rawQuery('SELECT COUNT(*) FROM fields'),
        ) ??
        0;
    return obsCount + fieldsCount;
  }

  Future<int> getSyncedRecordsCount() async {
    final dbClient = await db;
    final obsCount =
        Sqflite.firstIntValue(
          await dbClient.rawQuery(
            'SELECT COUNT(*) FROM observations WHERE synced = 1',
          ),
        ) ??
        0;
    final fieldsCount =
        Sqflite.firstIntValue(
          await dbClient.rawQuery(
            'SELECT COUNT(*) FROM fields WHERE synced = 1',
          ),
        ) ??
        0;
    return obsCount + fieldsCount;
  }

  Future<int> getUnsyncedRecordsCount() async {
    final dbClient = await db;
    final obsCount =
        Sqflite.firstIntValue(
          await dbClient.rawQuery(
            'SELECT COUNT(*) FROM observations WHERE synced = 0',
          ),
        ) ??
        0;
    final fieldsCount =
        Sqflite.firstIntValue(
          await dbClient.rawQuery(
            'SELECT COUNT(*) FROM fields WHERE synced = 0',
          ),
        ) ??
        0;
    return obsCount + fieldsCount;
  }

  Future<double> getLocalStorageSizeMB() async {
    try {
      // images are stored in the app's document directory by the image picker
      // but since we keep paths in the DB, we should iterate over those or the whole directory
      // For simplicity and accuracy of "Crop Photos", we'll check the directory where picked images go.
      // ImagePicker usually puts them in cache.

      // Let's get the cache directory and check for images
      final cacheDir = await getTemporaryDirectory();
      int totalSize = 0;

      if (await cacheDir.exists()) {
        final List<FileSystemEntity> files = cacheDir.listSync(recursive: true);
        for (var file in files) {
          if (file is File) {
            final fileName = basename(file.path).toLowerCase();
            if (fileName.contains('image_picker') ||
                fileName.endsWith('.jpg') ||
                fileName.endsWith('.png') ||
                fileName.endsWith('.jpeg')) {
              totalSize += await file.length();
            }
          }
        }
      }

      return totalSize / (1024 * 1024); // Convert to MB
    } catch (e) {
      debugPrint('Error calculating storage size: $e');
      return 0.0;
    }
  }

  // --- Image Helpers ---

  Future<List<File>> getLocalImages() async {
    try {
      final cacheDir = await getTemporaryDirectory();
      List<File> imageFiles = [];

      if (await cacheDir.exists()) {
        final List<FileSystemEntity> files = cacheDir.listSync(recursive: true);
        for (var file in files) {
          if (file is File) {
            final fileName = basename(file.path).toLowerCase();
            if (fileName.contains('image_picker') ||
                fileName.endsWith('.jpg') ||
                fileName.endsWith('.png') ||
                fileName.endsWith('.jpeg')) {
              imageFiles.add(file);
            }
          }
        }
      }
      // Sort by date modified (newest first)
      imageFiles.sort(
        (a, b) => b.lastModifiedSync().compareTo(a.lastModifiedSync()),
      );
      return imageFiles;
    } catch (e) {
      debugPrint('Error getting local images: $e');
      return [];
    }
  }

  Future<void> deleteImage(String path) async {
    try {
      final file = File(path);
      if (await file.exists()) {
        await file.delete();
      }
    } catch (e) {
      debugPrint('Error deleting image: $e');
    }
  }
}
