import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'app_colors.dart';
import 'app_typography.dart';

class AppTheme {
  static ThemeData getTheme({
    required bool isDark,
    required AppAccentTheme accentTheme,
  }) {
    final accent = AppColors.getAccent(accentTheme);

    if (isDark) {
      return ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: AppColors.darkBackground,
        primaryColor: accent,
        colorScheme: ColorScheme.dark(
          primary: accent,
          secondary: accent,
          surface: AppColors.darkSurface,
          error: AppColors.errorRose,
        ),
        textTheme: AppTypography.darkTextTheme(),
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.darkBackground,
          elevation: 0,
          scrolledUnderElevation: 0,
          systemOverlayStyle: SystemUiOverlayStyle.light,
          centerTitle: false,
        ),
        cardTheme: CardThemeData(
          color: AppColors.darkCard,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: AppColors.darkBorder, width: 1),
          ),
          margin: EdgeInsets.zero,
        ),
        dividerTheme: const DividerThemeData(
          color: AppColors.darkBorder,
          thickness: 1,
          space: 1,
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: AppColors.darkSurface,
          selectedItemColor: Colors.white,
          unselectedItemColor: AppColors.textMutedDark,
          type: BottomNavigationBarType.fixed,
          elevation: 0,
        ),
      );
    } else {
      return ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        scaffoldBackgroundColor: AppColors.lightBackground,
        primaryColor: accent,
        colorScheme: ColorScheme.light(
          primary: accent,
          secondary: accent,
          surface: AppColors.lightSurface,
          error: AppColors.errorRose,
        ),
        textTheme: AppTypography.lightTextTheme(),
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.lightBackground,
          elevation: 0,
          scrolledUnderElevation: 0,
          systemOverlayStyle: SystemUiOverlayStyle.dark,
          centerTitle: false,
        ),
        cardTheme: CardThemeData(
          color: AppColors.lightCard,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: AppColors.lightBorder, width: 1),
          ),
          margin: EdgeInsets.zero,
        ),
        dividerTheme: const DividerThemeData(
          color: AppColors.lightBorder,
          thickness: 1,
          space: 1,
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: AppColors.lightSurface,
          selectedItemColor: AppColors.textPrimaryLight,
          unselectedItemColor: AppColors.textMutedLight,
          type: BottomNavigationBarType.fixed,
          elevation: 0,
        ),
      );
    }
  }
}
