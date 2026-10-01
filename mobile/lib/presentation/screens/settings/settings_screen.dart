import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app/theme/app_colors.dart';
import '../../state/auth_state.dart';
import '../../state/theme_state.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = Theme.of(context).colorScheme.primary;

    final themeState = ref.watch(themeProvider);
    final authState = ref.watch(authProvider);
    final user = authState.user;

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
          children: [
            // Top Header
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'PREFERENCES',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.8,
                    color: primaryColor,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'App Settings',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),

            // Profile Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkCard : AppColors.lightCard,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                  width: 1,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: primaryColor.withOpacity(0.15),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        'DR',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: primaryColor,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user?.fullName ?? 'Dr. Siddharth Rao',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          user?.college ?? 'AIIMS New Delhi',
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          user?.email ?? 'resident.doctor@aspirin.lms',
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Theme & Branding Section
            _buildSectionHeader('APPEARANCE & BRAND', isDark),
            Container(
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkCard : AppColors.lightCard,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                  width: 1,
                ),
              ),
              child: Column(
                children: [
                  // Brand Mode Selection (Marrow vs PrepLadder)
                  ListTile(
                    leading: Icon(LucideIcons.palette, color: primaryColor),
                    title: const Text('Brand Aesthetic', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                    subtitle: Text(
                      themeState.brand == ThemeBrand.marrow ? 'Marrow Teal Edition' : 'PrepLadder Indigo Edition',
                      style: const TextStyle(fontSize: 12),
                    ),
                    trailing: SegmentedButton<ThemeBrand>(
                      segments: const [
                        ButtonSegment(
                          value: ThemeBrand.marrow,
                          label: Text('Marrow', style: TextStyle(fontSize: 11)),
                        ),
                        ButtonSegment(
                          value: ThemeBrand.prepladder,
                          label: Text('Prep', style: TextStyle(fontSize: 11)),
                        ),
                      ],
                      selected: {themeState.brand},
                      onSelectionChanged: (newSelection) {
                        ref.read(themeProvider.notifier).setBrand(newSelection.first);
                      },
                    ),
                  ),
                  Divider(height: 1, color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                  // Dark Mode Switch
                  SwitchListTile(
                    secondary: Icon(
                      themeState.themeMode == ThemeMode.dark ? LucideIcons.moon : LucideIcons.sun,
                      color: primaryColor,
                    ),
                    title: const Text('Dark Mode', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                    subtitle: const Text('Optimized for low-light clinical reading', style: TextStyle(fontSize: 12)),
                    value: themeState.themeMode == ThemeMode.dark,
                    onChanged: (_) {
                      ref.read(themeProvider.notifier).toggleThemeMode();
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Download & Security Section
            _buildSectionHeader('DOWNLOADS & SECURITY', isDark),
            Container(
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkCard : AppColors.lightCard,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                  width: 1,
                ),
              ),
              child: Column(
                children: [
                  SwitchListTile(
                    secondary: Icon(LucideIcons.wifi, color: primaryColor),
                    title: const Text('Download over Wi-Fi only', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                    subtitle: const Text('Prevent cellular data consumption for large video files', style: TextStyle(fontSize: 12)),
                    value: true,
                    onChanged: (val) {},
                  ),
                  Divider(height: 1, color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                  const ListTile(
                    leading: Icon(LucideIcons.shieldCheck, color: AppColors.emerald),
                    title: Text('Vault Encryption Status', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                    subtitle: Text('AES-256-CTR Device KeyStore Active', style: TextStyle(fontSize: 12)),
                    trailing: Text(
                      'ACTIVE',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: AppColors.emerald,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Sign Out Button
            OutlinedButton.icon(
              onPressed: () async {
                await ref.read(authProvider.notifier).signOut();
                if (context.mounted) {
                  context.go('/sign-in');
                }
              },
              icon: const Icon(LucideIcons.logOut, size: 16, color: AppColors.error),
              label: const Text('Sign Out of Account', style: TextStyle(color: AppColors.error)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppColors.error),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
            const SizedBox(height: 16),

            // Build Info
            Center(
              child: Text(
                'Aspirin LMS v1.0.0 (Build 1) • Android Internal Vault',
                style: TextStyle(
                  fontSize: 11,
                  color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.8,
          color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
        ),
      ),
    );
  }
}
