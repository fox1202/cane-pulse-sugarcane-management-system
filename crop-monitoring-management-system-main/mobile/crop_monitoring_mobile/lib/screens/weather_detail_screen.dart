import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'dart:ui';
import '../providers/weather_provider.dart';
import '../providers/location_provider.dart';
import '../providers/sync_provider.dart';
import '../providers/ui_provider.dart';
import '../widgets/shimmer_loading.dart';

class WeatherDetailScreen extends StatelessWidget {
  const WeatherDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final weatherProvider = context.watch<WeatherProvider>();
    final locationProvider = context.watch<LocationProvider>();
    final uiProvider = context.watch<UIProvider>();
    final isFieldMode = uiProvider.isFieldMode;

    return Scaffold(
      backgroundColor: isFieldMode ? Colors.white : Colors.white,
      body: Stack(
        children: [
          // 1. Organic Background Layers
          if (!isFieldMode) ...[
            const Positioned(
              top: -100,
              right: -100,
              child: _BlurredCircle(color: Color(0xFFC8E6C9), size: 300),
            ),
            const Positioned(
              bottom: -50,
              left: -50,
              child: _BlurredCircle(color: Color(0xFFFFF9C4), size: 250),
            ),
          ],

          SafeArea(
            child: Column(
              children: [
                // 2. Custom App Bar
                _buildAppBar(
                  context,
                  weatherProvider,
                  locationProvider,
                  uiProvider,
                ),

                Expanded(
                  child: SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Column(
                      children: [
                        const SizedBox(height: 20),

                        // 3. Main Hero Section (Weather Condition + Temp)
                        _buildHeroSection(weatherProvider),

                        const SizedBox(height: 48),

                        // 4. Detailed Stats Grid
                        _buildStatsGrid(weatherProvider, uiProvider),

                        const SizedBox(height: 48),

                        // 5. Weather advice
                        _buildCropRecommendations(weatherProvider, uiProvider),

                        const SizedBox(height: 40),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAppBar(
    BuildContext context,
    WeatherProvider weatherProvider,
    LocationProvider locationProvider,
    UIProvider uiProvider,
  ) {
    final lastUpdated = weatherProvider.lastWeatherUpdate;
    final subtitle = lastUpdated == null
        ? (locationProvider.locationStatusMessage ??
              'Using your current location when ready')
        : 'Updated ${DateFormat('EEE, d MMM • HH:mm').format(lastUpdated)}';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _HeaderIcon(
            icon: Icons.chevron_left_rounded,
            onTap: () => Navigator.pop(context),
            backgroundColor: Colors.grey.shade100,
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    weatherProvider.locationName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                      color: Color(0xFF1B5E20),
                    ),
                  ),
                  Text(
                    subtitle,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade500,
                      fontWeight: FontWeight.w500,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
          _HeaderIcon(
            icon: Icons.refresh_rounded,
            onTap: () async {
              final syncProvider = context.read<SyncProvider>();
              final latestPosition = await locationProvider
                  .refreshCurrentPosition();
              await weatherProvider.refreshWeather(
                latestPosition ?? locationProvider.currentPosition,
                syncProvider.isOnline,
                force: true,
              );
            },
            backgroundColor: const Color(0xFFE8F5E9),
            iconColor: const Color(0xFF2E7D32),
          ),
        ],
      ),
    );
  }

  Widget _buildHeroSection(WeatherProvider weatherProvider) {
    if (!weatherProvider.hasWeatherData) {
      return Column(
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(
              color: Color(0xFFE8F5E9),
              shape: BoxShape.circle,
            ),
            child: weatherProvider.isWeatherLoading
                ? const SizedBox(
                    width: 52,
                    height: 52,
                    child: CircularProgressIndicator(strokeWidth: 3),
                  )
                : const Icon(
                    Icons.my_location_rounded,
                    size: 52,
                    color: Color(0xFF2E7D32),
                  ),
          ),
          const SizedBox(height: 24),
          const Text(
            'Getting local weather',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1B5E20),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            weatherProvider.weatherError ??
                'We will update this screen as soon as your location is available.',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 14,
              color: Colors.grey,
              height: 1.5,
            ),
          ),
        ],
      );
    }

    IconData icon;
    Color iconColor;

    switch (weatherProvider.weatherCondition.toLowerCase()) {
      case 'clear':
      case 'clear night':
        icon = Icons.wb_sunny_rounded;
        iconColor = Colors.orangeAccent;
        break;
      case 'partly cloudy':
      case 'cloudy':
        icon = Icons.wb_cloudy_rounded;
        iconColor = const Color(0xFF2E7D32);
        break;
      case 'drizzle':
      case 'rain':
        icon = Icons.beach_access_rounded;
        iconColor = Colors.lightBlue;
        break;
      case 'thunderstorm':
        icon = Icons.thunderstorm_rounded;
        iconColor = Colors.deepOrange;
        break;
      default:
        icon = Icons.cloud_rounded;
        iconColor = Colors.grey;
    }

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.1),
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: iconColor.withValues(alpha: 0.15),
                blurRadius: 100,
                spreadRadius: 20,
              ),
            ],
          ),
          child: Icon(icon, size: 100, color: iconColor),
        ),
        const SizedBox(height: 24),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${weatherProvider.temperature.toInt()}',
              style: const TextStyle(
                fontSize: 96,
                fontWeight: FontWeight.bold,
                height: 1,
                color: Color(0xFF1B5E20),
                letterSpacing: -6,
              ),
            ),
            const Padding(
              padding: EdgeInsets.only(top: 12),
              child: Text(
                '°C',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey,
                ),
              ),
            ),
          ],
        ),
        Text(
          weatherProvider.weatherCondition.toUpperCase(),
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            letterSpacing: 3,
            color: Colors.grey,
          ),
        ),
      ],
    );
  }

  Widget _buildStatsGrid(
    WeatherProvider weatherProvider,
    UIProvider uiProvider,
  ) {
    final isFieldMode = uiProvider.isFieldMode;
    final hasWeatherData = weatherProvider.hasWeatherData;
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(32),
        border: Border.all(
          color: isFieldMode ? Colors.black87 : Colors.grey.shade100,
          width: isFieldMode ? 2.5 : 2,
        ),
        boxShadow: isFieldMode
            ? []
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.03),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildStatItem(
                Icons.umbrella_rounded,
                hasWeatherData
                    ? '${weatherProvider.rainfallChance.toInt()}%'
                    : '--',
                'RAIN',
                Colors.blue,
                isFieldMode,
              ),
              _buildVerticalDivider(isFieldMode),
              _buildStatItem(
                Icons.water_drop_rounded,
                hasWeatherData ? '${weatherProvider.humidity.toInt()}%' : '--',
                'HUMIDITY',
                Colors.cyan,
                isFieldMode,
              ),
              _buildVerticalDivider(isFieldMode),
              _buildStatItem(
                Icons.air_rounded,
                hasWeatherData
                    ? '${weatherProvider.windSpeed.toInt()} km/h'
                    : '--',
                'WIND',
                Colors.teal,
                isFieldMode,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(
    IconData icon,
    String value,
    String label,
    Color color,
    bool isFieldMode,
  ) {
    return Column(
      children: [
        Icon(icon, color: isFieldMode ? Colors.black : color, size: 24),
        const SizedBox(height: 12),
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: isFieldMode ? Colors.black : const Color(0xFF1B5E20),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 9,
            fontWeight: FontWeight.bold,
            color: isFieldMode ? Colors.black87 : Colors.grey,
            letterSpacing: 1,
          ),
        ),
      ],
    );
  }

  Widget _buildVerticalDivider(bool isFieldMode) {
    return Container(
      height: 40,
      width: 1,
      color: isFieldMode ? Colors.black26 : Colors.grey.shade100,
    );
  }

  Widget _buildCropRecommendations(
    WeatherProvider weatherProvider,
    UIProvider uiProvider,
  ) {
    if (weatherProvider.isWeatherLoading && !weatherProvider.hasWeatherData) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const ShimmerLoading(width: 150, height: 16, borderRadius: 4),
          const SizedBox(height: 20),
          SizedBox(
            height: 224,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: 3,
              separatorBuilder: (context, index) => const SizedBox(width: 16),
              itemBuilder: (context, index) =>
                  ShimmerLoading.card(width: 240, height: 224),
            ),
          ),
        ],
      );
    }

    if (!weatherProvider.hasWeatherData) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0xFFE8F5E9)),
        ),
        child: const Text(
          'Weather advice will appear once live weather data is available for your current location.',
          style: TextStyle(
            color: Colors.grey,
            fontWeight: FontWeight.w600,
            height: 1.5,
          ),
        ),
      );
    }

    final crops = weatherProvider.getRecommendedCrops();
    final isFieldMode = uiProvider.isFieldMode;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4),
          child: Text(
            'WEATHER ADVICE',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: isFieldMode ? Colors.black : const Color(0xFF1B5E20),
              letterSpacing: 2,
            ),
          ),
        ),
        const SizedBox(height: 20),
        SizedBox(
          height: 224,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            clipBehavior: Clip.none,
            itemCount: crops.length,
            separatorBuilder: (context, index) => const SizedBox(width: 16),
            itemBuilder: (context, index) {
              final crop = crops[index];
              return Container(
                width: 240,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: isFieldMode
                      ? null
                      : const LinearGradient(
                          colors: [Color(0xFFE8F5E9), Colors.white],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                  color: isFieldMode ? Colors.white : null,
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(
                    color: isFieldMode
                        ? Colors.black87
                        : const Color(0xFF2E7D32).withValues(alpha: 0.08),
                    width: isFieldMode ? 2 : 1,
                  ),
                  boxShadow: isFieldMode
                      ? []
                      : [
                          BoxShadow(
                            color: const Color(
                              0xFF1B5E20,
                            ).withValues(alpha: 0.04),
                            blurRadius: 15,
                            offset: const Offset(0, 8),
                          ),
                        ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: isFieldMode ? Colors.black12 : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        crop.icon,
                        color: isFieldMode
                            ? Colors.black
                            : const Color(0xFF2E7D32),
                        size: 24,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            crop.name,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                              color: isFieldMode
                                  ? Colors.black
                                  : const Color(0xFF1B5E20),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            crop.description,
                            style: TextStyle(
                              fontSize: 12,
                              color: isFieldMode
                                  ? Colors.black87
                                  : Colors.grey.shade700,
                              height: 1.4,
                            ),
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _BlurredCircle extends StatelessWidget {
  final Color color;
  final double size;

  const _BlurredCircle({required this.color, required this.size});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.3),
        shape: BoxShape.circle,
      ),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 50, sigmaY: 50),
        child: Container(color: Colors.transparent),
      ),
    );
  }
}

class _HeaderIcon extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final Color backgroundColor;
  final Color iconColor;

  const _HeaderIcon({
    required this.icon,
    required this.onTap,
    this.backgroundColor = Colors.white,
    this.iconColor = Colors.black87,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: backgroundColor,
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: iconColor, size: 24),
      ),
    );
  }
}
