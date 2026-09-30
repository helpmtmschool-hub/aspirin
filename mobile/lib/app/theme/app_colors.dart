import 'package:flutter/material.dart';

enum AppAccentTheme {
  marrowTeal,
  prepLadderIndigo,
}

class AppColors {
  // Dark Canvas & Surfaces (Clinical Dark Mode - Default)
  static const Color darkBackground = Color(0xFF0B0F19);
  static const Color darkSurface = Color(0xFF131B2E);
  static const Color darkCard = Color(0xFF1E293B);
  static const Color darkCardHover = Color(0xFF28354D);
  static const Color darkBorder = Color(0xFF334155);

  // Light Canvas & Surfaces (Clinical Day Mode)
  static const Color lightBackground = Color(0xFFF8FAFC);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightCard = Color(0xFFFFFFFF);
  static const Color lightCardHover = Color(0xFFF1F5F9);
  static const Color lightBorder = Color(0xFFE2E8F0);

  // Marrow Theme Accent Tokens
  static const Color marrowTeal = Color(0xFF00A389);
  static const Color marrowTealLight = Color(0xFF00D1B0);
  static const Color marrowTealDark = Color(0xFF007A66);
  static const Color marrowTealGlow = Color(0x3300A389);

  // PrepLadder Theme Accent Tokens
  static const Color prepIndigo = Color(0xFF6366F1);
  static const Color prepIndigoLight = Color(0xFF818CF8);
  static const Color prepIndigoDark = Color(0xFF4F46E5);
  static const Color prepIndigoGlow = Color(0x336366F1);

  // Text Hierarchy
  static const Color textPrimaryDark = Color(0xFFF8FAFC);
  static const Color textSecondaryDark = Color(0xFF94A3B8);
  static const Color textMutedDark = Color(0xFF64748B);

  static const Color textPrimaryLight = Color(0xFF0F172A);
  static const Color textSecondaryLight = Color(0xFF475569);
  static const Color textMutedLight = Color(0xFF94A3B8);

  // Clinical Status & Semantic Feedback
  static const Color highYieldAmber = Color(0xFFF59E0B);
  static const Color completedEmerald = Color(0xFF10B981);
  static const Color inProgressSky = Color(0xFF38BDF8);
  static const Color errorRose = Color(0xFFF43F5E);

  // Dynamic Accent Resolution
  static Color getAccent(AppAccentTheme theme) {
    switch (theme) {
      case AppAccentTheme.marrowTeal:
        return marrowTeal;
      case AppAccentTheme.prepLadderIndigo:
        return prepIndigo;
    }
  }

  static Color getAccentGlow(AppAccentTheme theme) {
    switch (theme) {
      case AppAccentTheme.marrowTeal:
        return marrowTealGlow;
      case AppAccentTheme.prepLadderIndigo:
        return prepIndigoGlow;
    }
  }

  // Convenient Aliases
  static const Color darkTextPrimary = textPrimaryDark;
  static const Color darkTextSecondary = textSecondaryDark;
  static const Color darkTextTertiary = textMutedDark;

  static const Color lightTextPrimary = textPrimaryLight;
  static const Color lightTextSecondary = textSecondaryLight;
  static const Color lightTextTertiary = textMutedLight;

  static const Color amber = highYieldAmber;
  static const Color emerald = completedEmerald;
  static const Color error = errorRose;
  static const Color sky = inProgressSky;
}
