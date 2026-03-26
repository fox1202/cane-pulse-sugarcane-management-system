import 'package:flutter/material.dart';

import 'app_colors.dart';

class AppTheme {
  static ThemeData get lightTheme {
    final base = ThemeData(useMaterial3: true);
    const colorScheme = ColorScheme(
      brightness: Brightness.light,
      primary: AppColors.primaryGreen,
      onPrimary: Colors.white,
      secondary: AppColors.peach,
      onSecondary: AppColors.textDark,
      error: AppColors.errorRed,
      onError: Colors.white,
      surface: AppColors.cardWhite,
      onSurface: AppColors.textDark,
    );

    final textTheme = base.textTheme
        .apply(bodyColor: AppColors.textDark, displayColor: AppColors.textDark)
        .copyWith(
          headlineLarge: base.textTheme.headlineLarge?.copyWith(
            fontWeight: FontWeight.w800,
            letterSpacing: -1.4,
          ),
          headlineMedium: base.textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.w800,
            letterSpacing: -1.0,
          ),
          titleLarge: base.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w700,
            letterSpacing: -0.4,
          ),
          bodyLarge: base.textTheme.bodyLarge?.copyWith(height: 1.35),
          bodyMedium: base.textTheme.bodyMedium?.copyWith(
            color: AppColors.textGray,
            height: 1.4,
          ),
        );

    return base.copyWith(
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.backgroundGray,
      canvasColor: AppColors.cardWhite,
      shadowColor: AppColors.forestGreen.withValues(alpha: 0.12),
      dividerColor: AppColors.borderSoft,
      textTheme: textTheme,
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        foregroundColor: AppColors.textDark,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: AppColors.cardWhite,
        surfaceTintColor: Colors.transparent,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(28),
          side: const BorderSide(color: AppColors.borderSoft),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.textDark,
        contentTextStyle: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w600,
        ),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primaryGreen,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(58),
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(22),
          ),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.forestGreen,
          side: const BorderSide(color: AppColors.borderSoft, width: 1.4),
          minimumSize: const Size.fromHeight(56),
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(22),
          ),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
        ),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: AppColors.forestGreen,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.inputFieldGray,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 18,
          vertical: 18,
        ),
        hintStyle: const TextStyle(
          color: AppColors.textGray,
          fontWeight: FontWeight.w500,
        ),
        labelStyle: const TextStyle(
          color: AppColors.textGray,
          fontWeight: FontWeight.w600,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(22),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(22),
          borderSide: const BorderSide(color: AppColors.borderSoft),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(22),
          borderSide: const BorderSide(
            color: AppColors.primaryGreen,
            width: 1.6,
          ),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(22),
          borderSide: const BorderSide(color: AppColors.errorRed),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(22),
          borderSide: const BorderSide(color: AppColors.errorRed, width: 1.6),
        ),
      ),
      checkboxTheme: CheckboxThemeData(
        fillColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return AppColors.primaryGreen;
          }
          return Colors.transparent;
        }),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
        side: const BorderSide(color: AppColors.borderSoft, width: 1.6),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: AppColors.primaryGreen,
        linearTrackColor: AppColors.sageGreen,
      ),
      chipTheme: base.chipTheme.copyWith(
        backgroundColor: AppColors.inputFieldGray,
        selectedColor: AppColors.sageGreen,
        side: const BorderSide(color: AppColors.borderSoft),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        labelStyle: const TextStyle(
          color: AppColors.textDark,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  static List<BoxShadow> softShadow([Color color = AppColors.forestGreen]) {
    return [
      BoxShadow(
        color: color.withValues(alpha: 0.10),
        blurRadius: 30,
        offset: const Offset(0, 14),
      ),
      BoxShadow(
        color: color.withValues(alpha: 0.04),
        blurRadius: 12,
        offset: const Offset(0, 4),
      ),
    ];
  }
}
