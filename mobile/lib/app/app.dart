import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'router.dart';
import 'theme/app_colors.dart';
import 'theme/app_theme.dart';
import '../presentation/state/theme_state.dart';

class AspirinApp extends ConsumerWidget {
  const AspirinApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeState = ref.watch(themeProvider);
    final router = ref.watch(routerProvider);

    final accentTheme = themeState.brand == ThemeBrand.marrow
        ? AppAccentTheme.marrowTeal
        : AppAccentTheme.prepLadderIndigo;

    return MaterialApp.router(
      title: 'Aspirin Medical LMS',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.getTheme(isDark: false, accentTheme: accentTheme),
      darkTheme: AppTheme.getTheme(isDark: true, accentTheme: accentTheme),
      themeMode: themeState.themeMode,
      routerConfig: router,
    );
  }
}
