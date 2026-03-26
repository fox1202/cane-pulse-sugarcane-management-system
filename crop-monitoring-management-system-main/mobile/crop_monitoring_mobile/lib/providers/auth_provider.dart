import 'dart:async';
import 'dart:io';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/auth_preferences_service.dart';
import '../services/supabase_service.dart';

class AuthProvider with ChangeNotifier {
  final SupabaseService _supabase = SupabaseService();
  final AuthPreferencesService _authPreferences = AuthPreferencesService();
  bool _isAuthenticated = false;
  bool _isOfflineSession = false;
  Map<String, dynamic>? _user;
  String? _userRole;
  String? _lastErrorMessage;

  bool get isAuthenticated => _isAuthenticated;
  bool get isOfflineSession => _isOfflineSession;
  Map<String, dynamic>? get user => _user;
  String? get userRole => _userRole;
  String? get lastErrorMessage => _lastErrorMessage;

  AuthProvider() {
    _applySession(_supabase.client.auth.currentSession);
    _restoreOfflineSessionIfNeeded();
    _initSupabaseAuth();
  }

  void _initSupabaseAuth() {
    _supabase.client.auth.onAuthStateChange.listen((data) {
      _applySession(data.session);
    });
  }

  Future<void> _applySession(Session? session) async {
    _isAuthenticated = session != null;

    if (!_isAuthenticated) {
      _isOfflineSession = false;
      _user = null;
      _userRole = null;
      notifyListeners();
      return;
    }

    _isOfflineSession = false;
    final activeSession = session!;
    _user = {'username': activeSession.user.email?.split('@').first ?? 'User'};
    _userRole =
        activeSession.user.appMetadata['role'] ??
        activeSession.user.userMetadata?['role'] ??
        'collector';
    notifyListeners();

    try {
      final profileData = await _supabase.client
          .from('profiles')
          .select('role')
          .eq('id', activeSession.user.id)
          .maybeSingle();
      if (profileData != null && profileData['role'] != null) {
        _userRole = profileData['role'];
      }
    } catch (e) {
      debugPrint('Error fetching profile role: $e');
    }

    await _cacheOfflineProfileIfRemembered(
      email: activeSession.user.email ?? '',
      username: _user?['username']?.toString() ?? 'User',
      role: _userRole ?? 'collector',
    );

    notifyListeners();
  }

  Future<void> _restoreOfflineSessionIfNeeded() async {
    if (_supabase.client.auth.currentSession != null) return;

    final connectivity = await Connectivity().checkConnectivity();
    if (connectivity != ConnectivityResult.none) {
      return;
    }

    final canRestoreOffline = await _authPreferences.canRestoreOfflineSession();
    if (!canRestoreOffline) return;

    final profile = await _authPreferences.getRestorableOfflineProfile();
    if (profile == null) return;

    _isAuthenticated = true;
    _isOfflineSession = true;
    _user = {'username': profile['username'] ?? 'User'};
    _userRole = profile['role'] ?? 'collector';
    notifyListeners();
  }

  Future<void> _cacheOfflineProfileIfRemembered({
    required String email,
    required String username,
    required String role,
  }) async {
    if (email.trim().isEmpty) return;

    final shouldRemember = await _authPreferences.shouldRestoreSession();
    if (!shouldRemember) return;

    await _authPreferences.saveOfflineProfile(
      email: email,
      username: username,
      role: role,
    );
  }

  Future<bool> _loginWithOfflineProfile(String email) async {
    final offlineProfile = await _authPreferences.getOfflineProfileForEmail(
      email,
    );

    if (offlineProfile == null) {
      _lastErrorMessage =
          'No saved offline access found for this account. Login once online with Remember Me enabled.';
      return false;
    }

    _isAuthenticated = true;
    _isOfflineSession = true;
    _user = {'username': offlineProfile['username'] ?? 'User'};
    _userRole = offlineProfile['role'] ?? 'collector';
    _lastErrorMessage = null;
    notifyListeners();
    return true;
  }

  Future<bool> login(
    String email,
    String password, {
    bool rememberSession = false,
  }) async {
    _lastErrorMessage = null;
    final normalizedEmail = email.trim();

    try {
      final connectivity = await Connectivity().checkConnectivity();
      if (connectivity == ConnectivityResult.none) {
        return await _loginWithOfflineProfile(normalizedEmail);
      }

      final backendCheck = await _supabase.checkBackendReachabilityDetailed();
      if (!backendCheck.isReachable) {
        _lastErrorMessage =
            backendCheck.errorMessage ??
            'Internet is available, but Supabase could not be reached.';
        return false;
      }

      final response = await _supabase.signIn(email, password);
      final session = response.session;
      if (session == null) {
        _lastErrorMessage = 'Login failed. Please check your credentials.';
        return false;
      }

      _isOfflineSession = false;

      if (rememberSession) {
        final userEmail = session.user.email ?? normalizedEmail;
        await _authPreferences.saveRememberedLogin(
          rememberSession: true,
          email: userEmail,
        );
        await _authPreferences.saveOfflineProfile(
          email: userEmail,
          username: userEmail.split('@').first,
          role:
              session.user.appMetadata['role'] ??
              session.user.userMetadata?['role'] ??
              _userRole ??
              'collector',
        );
      } else {
        await _authPreferences.clearRememberedLogin();
      }

      return true;
    } on TimeoutException {
      _lastErrorMessage =
          'Internet is available, but Supabase sign-in timed out. Please try again.';
      return false;
    } on SocketException catch (e) {
      _lastErrorMessage =
          'Internet is available, but Supabase could not be reached: ${e.message}';
      return false;
    } on AuthException catch (e) {
      _lastErrorMessage = e.message;
      debugPrint('Supabase Login Error: $e');
      return false;
    } catch (e) {
      debugPrint('Supabase Login Error: $e');
      _lastErrorMessage =
          'Login failed. Please check your credentials and connection.';
      return false;
    }
  }

  Future<bool> register(Map<String, dynamic> userData) async {
    try {
      final response = await _supabase.signUp(
        userData['email'],
        userData['password'],
        data: {
          'first_name': userData['first_name'],
          'last_name': userData['last_name'],
        },
      );
      return response.user != null;
    } catch (e) {
      debugPrint('Supabase Register Error: $e');
      return false;
    }
  }

  Future<void> logout() async {
    await _authPreferences.clearRememberedLogin();
    await _supabase.signOut();
  }
}
