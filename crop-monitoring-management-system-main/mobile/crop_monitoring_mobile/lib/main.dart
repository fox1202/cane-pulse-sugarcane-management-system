import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'l10n/app_localizations.dart';
import 'package:provider/provider.dart';
import 'screens/welcome_screen.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/observations_list_screen.dart';
import 'screens/observation_form_screen.dart';
import 'screens/observation_detail_screen.dart';
// import 'screens/field_form_screen.dart'; // Deleted
import 'screens/about_screen.dart';
import 'screens/forgot_password_screen.dart';
import 'screens/weather_detail_screen.dart';
import 'providers/auth_provider.dart';
import 'providers/sync_provider.dart';
import 'providers/weather_provider.dart';
import 'providers/location_provider.dart';
import 'providers/ui_provider.dart';
import 'services/auth_preferences_service.dart';
import 'utils/app_theme.dart';
import 'config/supabase_config.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SupabaseConfig.validate();

  await Supabase.initialize(
    url: SupabaseConfig.url,
    anonKey: SupabaseConfig.anonKey,
  );

  final initialRoute = await _resolveInitialRoute();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => SyncProvider()),
        ChangeNotifierProvider(create: (_) => WeatherProvider()),
        ChangeNotifierProvider(create: (_) => LocationProvider()),
        ChangeNotifierProvider(create: (_) => UIProvider()),
      ],
      child: MyApp(initialRoute: initialRoute),
    ),
  );
}

Future<String> _resolveInitialRoute() async {
  final authPreferences = AuthPreferencesService();
  final hasSession = Supabase.instance.client.auth.currentSession != null;
  final shouldRestoreSession = await authPreferences.shouldRestoreSession();
  final canRestoreOfflineSession = await authPreferences
      .canRestoreOfflineSession();
  final connectivity = await Connectivity().checkConnectivity();
  final hasInternetConnection = connectivity != ConnectivityResult.none;

  if (shouldRestoreSession && hasSession) {
    return '/dashboard';
  }

  if (!hasInternetConnection &&
      shouldRestoreSession &&
      canRestoreOfflineSession) {
    return '/dashboard';
  }

  if (shouldRestoreSession && hasInternetConnection) {
    return '/login';
  }

  if (hasSession) {
    await Supabase.instance.client.auth.signOut();
    return '/login';
  }

  return '/welcome';
}

class MyApp extends StatelessWidget {
  final String initialRoute;

  const MyApp({Key? key, this.initialRoute = '/welcome'}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CanePulse',
      debugShowCheckedModeBanner: false,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [Locale('en', '')],
      theme: AppTheme.lightTheme,
      initialRoute: initialRoute,
      routes: {
        '/welcome': (context) => const WelcomeScreen(),
        '/login': (context) => const LoginScreen(),
        '/register': (context) => const RegisterScreen(),
        '/dashboard': (context) => const DashboardScreen(),
        '/home': (context) => const ObservationsListScreen(),
        '/add-observation': (context) => const ObservationFormScreen(),
        // '/add-field': (context) => const FieldFormScreen(), // Unified into observation form
        '/about': (context) => const AboutScreen(),
        '/forgot-password': (context) => const ForgotPasswordScreen(),
        '/weather-detail': (context) => const WeatherDetailScreen(),
      },
      onGenerateRoute: (settings) {
        if (settings.name == '/observation-detail') {
          final id = settings.arguments as int;
          return MaterialPageRoute(
            builder: (context) => ObservationDetailScreen(observationId: id),
          );
        }
        return null;
      },
    );
  }
}
