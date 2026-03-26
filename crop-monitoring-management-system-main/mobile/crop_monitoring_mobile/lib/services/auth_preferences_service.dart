import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuthPreferencesService {
  static const String _rememberSessionKey = 'auth.remember_session';
  static const String _rememberedEmailKey = 'auth.remembered_email';
  static const String _offlineProfileKey = 'auth.offline_profile';

  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  Future<bool> shouldRestoreSession() async {
    try {
      return await _storage.read(key: _rememberSessionKey) == 'true';
    } catch (e) {
      debugPrint('AuthPreferencesService: failed to read remember flag: $e');
      return false;
    }
  }

  Future<String?> getRememberedEmail() async {
    try {
      return await _storage.read(key: _rememberedEmailKey);
    } catch (e) {
      debugPrint('AuthPreferencesService: failed to read remembered email: $e');
      return null;
    }
  }

  Future<void> saveRememberedLogin({
    required bool rememberSession,
    required String email,
  }) async {
    try {
      if (!rememberSession) {
        await clearRememberedLogin();
        return;
      }

      await _storage.write(key: _rememberSessionKey, value: 'true');
      await _storage.write(key: _rememberedEmailKey, value: email);
    } catch (e) {
      debugPrint('AuthPreferencesService: failed to save remember state: $e');
    }
  }

  Future<void> saveOfflineProfile({
    required String email,
    required String username,
    required String role,
  }) async {
    try {
      await _storage.write(
        key: _offlineProfileKey,
        value: jsonEncode({
          'email': email.trim().toLowerCase(),
          'username': username.trim(),
          'role': role.trim(),
        }),
      );
    } catch (e) {
      debugPrint('AuthPreferencesService: failed to save offline profile: $e');
    }
  }

  Future<Map<String, String>?> getOfflineProfile() async {
    try {
      final raw = await _storage.read(key: _offlineProfileKey);
      if (raw == null || raw.isEmpty) return null;

      final decoded = jsonDecode(raw);
      if (decoded is! Map) return null;

      return {
        'email': decoded['email']?.toString() ?? '',
        'username': decoded['username']?.toString() ?? 'User',
        'role': decoded['role']?.toString() ?? 'collector',
      };
    } catch (e) {
      debugPrint('AuthPreferencesService: failed to read offline profile: $e');
      return null;
    }
  }

  Future<Map<String, String>?> getOfflineProfileForEmail(String email) async {
    return getRestorableOfflineProfile(email: email);
  }

  Future<bool> canRestoreOfflineSession() async {
    final shouldRestore = await shouldRestoreSession();
    if (!shouldRestore) return false;
    return await getRestorableOfflineProfile() != null;
  }

  Future<Map<String, String>?> getRestorableOfflineProfile({
    String? email,
  }) async {
    final shouldRestore = await shouldRestoreSession();
    if (!shouldRestore) return null;

    final normalizedEmail = email?.trim().toLowerCase();
    final profile = await getOfflineProfile();
    if (profile != null) {
      final savedEmail = (profile['email'] ?? '').trim().toLowerCase();
      if (normalizedEmail == null || normalizedEmail == savedEmail) {
        return profile;
      }
    }

    final rememberedEmail = await getRememberedEmail();
    if (rememberedEmail == null || rememberedEmail.trim().isEmpty) return null;

    final normalizedRememberedEmail = rememberedEmail.trim().toLowerCase();
    if (normalizedEmail != null &&
        normalizedEmail != normalizedRememberedEmail) {
      return null;
    }

    return {
      'email': normalizedRememberedEmail,
      'username': normalizedRememberedEmail.split('@').first,
      'role': 'collector',
    };
  }

  Future<void> clearRememberedLogin() async {
    try {
      await _storage.delete(key: _rememberSessionKey);
      await _storage.delete(key: _rememberedEmailKey);
      await _storage.delete(key: _offlineProfileKey);
    } catch (e) {
      debugPrint('AuthPreferencesService: failed to clear remember state: $e');
    }
  }
}
