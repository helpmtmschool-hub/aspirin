import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTypography {
  static TextTheme darkTextTheme() {
    return TextTheme(
      // Display & Headlines: Outfit (Clean, authoritative, medical display)
      displayLarge: GoogleFonts.outfit(
        fontSize: 32,
        fontWeight: FontWeight.w700,
        color: AppColors.textPrimaryDark,
        letterSpacing: -0.5,
      ),
      displayMedium: GoogleFonts.outfit(
        fontSize: 26,
        fontWeight: FontWeight.w600,
        color: AppColors.textPrimaryDark,
        letterSpacing: -0.3,
      ),
      headlineMedium: GoogleFonts.outfit(
        fontSize: 20,
        fontWeight: FontWeight.w600,
        color: AppColors.textPrimaryDark,
        letterSpacing: -0.2,
      ),
      headlineSmall: GoogleFonts.outfit(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: AppColors.textPrimaryDark,
      ),

      // Titles: Outfit
      titleLarge: GoogleFonts.outfit(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: AppColors.textPrimaryDark,
      ),
      titleMedium: GoogleFonts.plusJakartaSans(
        fontSize: 15,
        fontWeight: FontWeight.w600,
        color: AppColors.textPrimaryDark,
      ),
      titleSmall: GoogleFonts.plusJakartaSans(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: AppColors.textSecondaryDark,
      ),

      // Body & Clinical Data: Plus Jakarta Sans (Extremely legible for pharmacology/anatomy terms)
      bodyLarge: GoogleFonts.plusJakartaSans(
        fontSize: 15,
        fontWeight: FontWeight.w400,
        color: AppColors.textPrimaryDark,
        height: 1.45,
      ),
      bodyMedium: GoogleFonts.plusJakartaSans(
        fontSize: 13,
        fontWeight: FontWeight.w400,
        color: AppColors.textSecondaryDark,
        height: 1.4,
      ),
      bodySmall: GoogleFonts.plusJakartaSans(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        color: AppColors.textMutedDark,
      ),

      // Labels & Metadata
      labelLarge: GoogleFonts.plusJakartaSans(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        color: AppColors.textPrimaryDark,
        letterSpacing: 0.2,
      ),
      labelSmall: GoogleFonts.plusJakartaSans(
        fontSize: 11,
        fontWeight: FontWeight.w500,
        color: AppColors.textMutedDark,
      ),
    );
  }

  static TextTheme lightTextTheme() {
    return TextTheme(
      displayLarge: GoogleFonts.outfit(
        fontSize: 32,
        fontWeight: FontWeight.w700,
        color: AppColors.textPrimaryLight,
        letterSpacing: -0.5,
      ),
      displayMedium: GoogleFonts.outfit(
        fontSize: 26,
        fontWeight: FontWeight.w600,
        color: AppColors.textPrimaryLight,
        letterSpacing: -0.3,
      ),
      headlineMedium: GoogleFonts.outfit(
        fontSize: 20,
        fontWeight: FontWeight.w600,
        color: AppColors.textPrimaryLight,
        letterSpacing: -0.2,
      ),
      headlineSmall: GoogleFonts.outfit(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: AppColors.textPrimaryLight,
      ),
      titleLarge: GoogleFonts.outfit(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: AppColors.textPrimaryLight,
      ),
      titleMedium: GoogleFonts.plusJakartaSans(
        fontSize: 15,
        fontWeight: FontWeight.w600,
        color: AppColors.textPrimaryLight,
      ),
      titleSmall: GoogleFonts.plusJakartaSans(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: AppColors.textSecondaryLight,
      ),
      bodyLarge: GoogleFonts.plusJakartaSans(
        fontSize: 15,
        fontWeight: FontWeight.w400,
        color: AppColors.textPrimaryLight,
        height: 1.45,
      ),
      bodyMedium: GoogleFonts.plusJakartaSans(
        fontSize: 13,
        fontWeight: FontWeight.w400,
        color: AppColors.textSecondaryLight,
        height: 1.4,
      ),
      bodySmall: GoogleFonts.plusJakartaSans(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        color: AppColors.textMutedLight,
      ),
      labelLarge: GoogleFonts.plusJakartaSans(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        color: AppColors.textPrimaryLight,
        letterSpacing: 0.2,
      ),
      labelSmall: GoogleFonts.plusJakartaSans(
        fontSize: 11,
        fontWeight: FontWeight.w500,
        color: AppColors.textMutedLight,
      ),
    );
  }
}
