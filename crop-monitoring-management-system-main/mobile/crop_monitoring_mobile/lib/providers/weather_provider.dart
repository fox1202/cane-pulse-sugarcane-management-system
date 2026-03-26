import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;

class CropRecommendation {
  final String name;
  final String description;
  final IconData icon;

  CropRecommendation({
    required this.name,
    required this.description,
    required this.icon,
  });
}

class WeatherProvider with ChangeNotifier {
  static const Duration _minimumRefreshInterval = Duration(minutes: 15);
  static const double _minimumRefreshDistanceMeters = 1500;

  double _temperature = 0;
  double _humidity = 0;
  String _weatherCondition = 'Waiting for update';
  double _rainfallChance = 0;
  double _windSpeed = 0;
  String _locationName = 'Waiting for location';
  DateTime? _lastWeatherUpdate;
  bool _isWeatherLoading = false;
  String? _weatherError;
  double? _lastFetchedLatitude;
  double? _lastFetchedLongitude;

  double get temperature => _temperature;
  double get humidity => _humidity;
  String get weatherCondition => _weatherCondition;
  double get rainfallChance => _rainfallChance;
  double get windSpeed => _windSpeed;
  String get locationName => _locationName;
  DateTime? get lastWeatherUpdate => _lastWeatherUpdate;
  bool get isWeatherLoading => _isWeatherLoading;
  bool get hasWeatherData => _lastWeatherUpdate != null;
  String? get weatherError => _weatherError;

  Future<void> refreshWeather(
    Position? currentPosition,
    bool isOnline, {
    bool force = false,
  }) async {
    if (currentPosition == null) {
      _weatherError = 'Waiting for a GPS fix.';
      if (!hasWeatherData) {
        _weatherCondition = 'Locating';
        _locationName = 'Waiting for location';
      }
      notifyListeners();
      return;
    }

    if (!isOnline) {
      _weatherError = 'Internet connection unavailable.';
      if (!hasWeatherData) {
        _locationName = _formatCoordinateLabel(currentPosition);
        _weatherCondition = 'Offline';
      }
      notifyListeners();
      return;
    }

    if (!force && _shouldSkipFetch(currentPosition)) {
      return;
    }

    _isWeatherLoading = true;
    _weatherError = null;
    notifyListeners();

    try {
      final lat = currentPosition.latitude.toStringAsFixed(4);
      final lon = currentPosition.longitude.toStringAsFixed(4);
      final forecastUri = Uri.parse(
        'https://api.open-meteo.com/v1/forecast'
        '?latitude=$lat'
        '&longitude=$lon'
        '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,is_day'
        '&hourly=precipitation_probability'
        '&forecast_days=1'
        '&timezone=auto',
      );
      final reverseGeocodeUri = Uri.parse(
        'https://geocoding-api.open-meteo.com/v1/reverse'
        '?latitude=$lat'
        '&longitude=$lon'
        '&language=en'
        '&format=json'
        '&count=1',
      );

      final forecastResponse = await http
          .get(forecastUri)
          .timeout(const Duration(seconds: 10));
      if (forecastResponse.statusCode != 200) {
        throw Exception(
          'Weather request failed with status ${forecastResponse.statusCode}.',
        );
      }

      final locationResponse = await _safeGet(reverseGeocodeUri);
      final forecastData =
          json.decode(forecastResponse.body) as Map<String, dynamic>;
      final currentData = Map<String, dynamic>.from(
        forecastData['current'] as Map<String, dynamic>? ?? const {},
      );

      if (currentData.isEmpty) {
        throw Exception('Weather response did not include current conditions.');
      }

      _temperature = _toDouble(currentData['temperature_2m']);
      _humidity = _toDouble(currentData['relative_humidity_2m']);
      _windSpeed = _toDouble(currentData['wind_speed_10m']);
      _weatherCondition = _describeWeatherCode(
        _toInt(currentData['weather_code']),
        _toInt(currentData['is_day']) == 1,
      );
      _rainfallChance = _resolveRainfallChance(forecastData, currentData);
      _locationName = _resolveLocationName(
        locationResponse,
        currentPosition,
        timezone: forecastData['timezone']?.toString(),
      );
      _lastWeatherUpdate =
          DateTime.tryParse(currentData['time']?.toString() ?? '') ??
          DateTime.now();
      _lastFetchedLatitude = currentPosition.latitude;
      _lastFetchedLongitude = currentPosition.longitude;
    } catch (e) {
      debugPrint('Weather refresh error: $e');
      _weatherError = 'Unable to refresh local weather right now.';
      if (!hasWeatherData) {
        _locationName = _formatCoordinateLabel(currentPosition);
        _weatherCondition = 'Unavailable';
      }
    } finally {
      _isWeatherLoading = false;
      notifyListeners();
    }
  }

  List<CropRecommendation> getRecommendedCrops() {
    final recommendations = <CropRecommendation>[];

    if (_temperature >= 24 && _temperature <= 34 && _humidity >= 55) {
      recommendations.add(
        CropRecommendation(
          name: 'Sugarcane Growth Window',
          description:
              'Temperature and humidity are strong for active cane growth and canopy expansion.',
          icon: Icons.grass_rounded,
        ),
      );
    }

    if (_rainfallChance < 25) {
      recommendations.add(
        CropRecommendation(
          name: 'Sugarcane Irrigation Watch',
          description:
              'Low rain probability means irrigation timing should be checked for young cane and dry blocks.',
          icon: Icons.water_drop_rounded,
        ),
      );
    }

    if (_humidity >= 80) {
      recommendations.add(
        CropRecommendation(
          name: 'Sugarcane Disease Watch',
          description:
              'High humidity can increase leaf disease pressure, so inspect dense cane rows closely.',
          icon: Icons.health_and_safety_rounded,
        ),
      );
    }

    if (_windSpeed >= 20) {
      recommendations.add(
        CropRecommendation(
          name: 'Sugarcane Lodging Risk',
          description:
              'Higher wind speeds may stress tall cane, especially soft or waterlogged stands.',
          icon: Icons.air_rounded,
        ),
      );
    }

    if (recommendations.isEmpty) {
      recommendations.add(
        CropRecommendation(
          name: 'Sugarcane Field Check',
          description:
              'Conditions look stable, so use routine scouting to confirm cane vigor, moisture, and stand health.',
          icon: Icons.agriculture_rounded,
        ),
      );
    }

    return recommendations;
  }

  bool _shouldSkipFetch(Position currentPosition) {
    if (_isWeatherLoading ||
        _lastWeatherUpdate == null ||
        _lastFetchedLatitude == null ||
        _lastFetchedLongitude == null) {
      return false;
    }

    final recentlyUpdated =
        DateTime.now().difference(_lastWeatherUpdate!) <
        _minimumRefreshInterval;
    if (!recentlyUpdated) return false;

    final movedDistance = Geolocator.distanceBetween(
      _lastFetchedLatitude!,
      _lastFetchedLongitude!,
      currentPosition.latitude,
      currentPosition.longitude,
    );

    return movedDistance < _minimumRefreshDistanceMeters;
  }

  Future<Map<String, dynamic>?> _safeGet(Uri uri) async {
    try {
      final response = await http.get(uri).timeout(const Duration(seconds: 10));
      if (response.statusCode != 200) {
        return null;
      }
      return json.decode(response.body) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  double _resolveRainfallChance(
    Map<String, dynamic> forecastData,
    Map<String, dynamic> currentData,
  ) {
    final hourlyData = Map<String, dynamic>.from(
      forecastData['hourly'] as Map<String, dynamic>? ?? const {},
    );
    final times = List<String>.from(hourlyData['time'] as List? ?? const []);
    final precipitation = List<num>.from(
      hourlyData['precipitation_probability'] as List? ?? const [],
    );

    if (times.isEmpty || precipitation.isEmpty) {
      return 0;
    }

    final currentTime = currentData['time']?.toString() ?? '';
    final targetHour = currentTime.length >= 13
        ? currentTime.substring(0, 13)
        : currentTime;

    final index = times.indexWhere((time) {
      final hour = time.length >= 13 ? time.substring(0, 13) : time;
      return hour == targetHour;
    });

    final safeIndex = index >= 0 ? index : 0;
    return precipitation[safeIndex].toDouble();
  }

  String _resolveLocationName(
    Map<String, dynamic>? locationData,
    Position currentPosition, {
    String? timezone,
  }) {
    final results = List<Map<String, dynamic>>.from(
      locationData?['results'] as List? ?? const [],
    );
    if (results.isEmpty) {
      return _formatTimezoneLocation(timezone) ??
          _formatCoordinateLabel(currentPosition);
    }

    final firstResult = results.first;
    final parts = <String>[];
    for (final value in [
      firstResult['name'],
      firstResult['admin1'],
      firstResult['country'],
    ]) {
      final text = value?.toString().trim() ?? '';
      if (text.isEmpty || parts.contains(text)) continue;
      parts.add(text);
    }

    return parts.isEmpty
        ? (_formatTimezoneLocation(timezone) ??
              _formatCoordinateLabel(currentPosition))
        : parts.join(', ');
  }

  String? _formatTimezoneLocation(String? timezone) {
    final raw = timezone?.trim() ?? '';
    if (raw.isEmpty || !raw.contains('/')) return null;

    final segments = raw
        .split('/')
        .where((segment) => segment.trim().isNotEmpty)
        .toList();
    if (segments.isEmpty) return null;

    final label = segments.last.replaceAll('_', ' ').trim();
    if (label.isEmpty) return null;
    return label;
  }

  String _formatCoordinateLabel(Position position) {
    return '${position.latitude.toStringAsFixed(3)}, ${position.longitude.toStringAsFixed(3)}';
  }

  double _toDouble(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }

  int _toInt(dynamic value) {
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }

  String _describeWeatherCode(int code, bool isDay) {
    switch (code) {
      case 0:
        return isDay ? 'Clear' : 'Clear night';
      case 1:
      case 2:
        return 'Partly cloudy';
      case 3:
        return 'Cloudy';
      case 45:
      case 48:
        return 'Fog';
      case 51:
      case 53:
      case 55:
      case 56:
      case 57:
        return 'Drizzle';
      case 61:
      case 63:
      case 65:
      case 66:
      case 67:
      case 80:
      case 81:
      case 82:
        return 'Rain';
      case 71:
      case 73:
      case 75:
      case 77:
      case 85:
      case 86:
        return 'Snow';
      case 95:
      case 96:
      case 99:
        return 'Thunderstorm';
      default:
        return 'Overcast';
    }
  }
}
