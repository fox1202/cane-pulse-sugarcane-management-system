class SupabaseConfig {
  static const String _defaultUrl = 'https://dtbqnjtebfrogousqwfq.supabase.co';
  static const String _defaultAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0YnFuanRlYmZyb2dvdXNxd2ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NjkwMjksImV4cCI6MjA4OTU0NTAyOX0.XByi-pBw0u_8jITmdUvjI1-cwE8EnCFM1wfjIKhVcds';

  static const String url = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: _defaultUrl,
  );

  static const String anonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: _defaultAnonKey,
  );

  static void validate() {
    if (url.trim().isEmpty || anonKey.trim().isEmpty) {
      throw StateError(
        'Supabase configuration is missing. Provide SUPABASE_URL and '
        'SUPABASE_ANON_KEY, or update lib/config/supabase_config.dart.',
      );
    }
  }
}
