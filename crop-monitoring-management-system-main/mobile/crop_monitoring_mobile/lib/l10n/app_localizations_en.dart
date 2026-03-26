// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'CanePulse';

  @override
  String get welcomeBack => 'Welcome back,';

  @override
  String get fieldOperations => 'SUGARCANE OPERATIONS';

  @override
  String get newObservation => 'New Cane Observation';

  @override
  String get captureRealTimeData => 'Capture real-time cane data';

  @override
  String get observationHistory => 'Sugarcane History';

  @override
  String get viewManageRecords => 'View and manage cane records';

  @override
  String get weatherReport => 'CANE WEATHER';

  @override
  String get dataHealth => 'CANE DATA HEALTH';

  @override
  String get cloudSynced => 'CLOUD SYNCED';

  @override
  String get offlinePending => 'OFFLINE PENDING';

  @override
  String get systemHealthy => 'System Ready';

  @override
  String get syncing => 'Syncing...';

  @override
  String get login => 'Login';

  @override
  String get register => 'Register';

  @override
  String get email => 'Email';

  @override
  String get password => 'Password';

  @override
  String get forgotPassword => 'Forgot Password?';

  @override
  String get resetPassword => 'Reset Password';
}
