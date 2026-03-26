import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'dart:async';

class LocationProvider with ChangeNotifier {
  Position? _currentPosition;
  double? _gpsAccuracy;
  StreamSubscription<Position>? _gpsSubscription;
  bool _isMapCached = false;
  String? _locationStatusMessage;

  Position? get currentPosition => _currentPosition;
  double? get gpsAccuracy => _gpsAccuracy;
  bool get isMapCached => _isMapCached;
  String? get locationStatusMessage => _locationStatusMessage;

  Future<Position?> startGpsTracking({
    LocationAccuracy accuracy = LocationAccuracy.high,
  }) async {
    if (!await _ensureLocationAccess()) {
      return _currentPosition;
    }

    _gpsSubscription ??=
        Geolocator.getPositionStream(
          locationSettings: LocationSettings(
            accuracy: accuracy,
            distanceFilter: 5,
          ),
        ).listen(
          _updatePosition,
          onError: (Object error) {
            debugPrint('Location stream error: $error');
            _locationStatusMessage =
                'Unable to keep GPS updated automatically.';
            notifyListeners();
          },
        );

    try {
      final lastKnown = await Geolocator.getLastKnownPosition();
      if (lastKnown != null) {
        _updatePosition(lastKnown);
      }
    } catch (e) {
      debugPrint('Unable to read last known location: $e');
    }

    return refreshCurrentPosition(
      accuracy: accuracy,
      notifyOnFailure: false,
      requireAccessCheck: false,
    );
  }

  Future<Position?> refreshCurrentPosition({
    LocationAccuracy accuracy = LocationAccuracy.high,
    bool notifyOnFailure = true,
    bool requireAccessCheck = true,
  }) async {
    if (requireAccessCheck && !await _ensureLocationAccess()) {
      return _currentPosition;
    }

    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: LocationSettings(accuracy: accuracy),
      ).timeout(const Duration(seconds: 12));
      _updatePosition(position);
      return position;
    } catch (e) {
      debugPrint('Unable to get current location: $e');
      if (notifyOnFailure) {
        _locationStatusMessage =
            'Unable to get a GPS fix yet. Move outdoors or refresh.';
        notifyListeners();
      }
      return _currentPosition;
    }
  }

  Future<void> stopGpsTracking({bool clearPosition = true}) async {
    await _gpsSubscription?.cancel();
    _gpsSubscription = null;
    if (clearPosition) {
      _currentPosition = null;
      _gpsAccuracy = null;
      _locationStatusMessage = null;
    }
    notifyListeners();
  }

  void setMapCached(bool cached) {
    _isMapCached = cached;
    notifyListeners();
  }

  Future<bool> _ensureLocationAccess() async {
    final servicesEnabled = await Geolocator.isLocationServiceEnabled();
    if (!servicesEnabled) {
      _locationStatusMessage =
          'Enable location services to fetch local weather.';
      notifyListeners();
      return false;
    }

    final permission = await Permission.location.request();
    if (!permission.isGranted) {
      _locationStatusMessage = permission.isPermanentlyDenied
          ? 'Location permission is blocked. Enable it in app settings.'
          : 'Location permission is required to use local weather updates.';
      notifyListeners();
      return false;
    }

    _locationStatusMessage = null;
    return true;
  }

  void _updatePosition(Position position) {
    _currentPosition = position;
    _gpsAccuracy = position.accuracy;
    _locationStatusMessage = null;
    notifyListeners();
  }
}
