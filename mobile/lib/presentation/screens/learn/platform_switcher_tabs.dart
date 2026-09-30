import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../app/theme/app_colors.dart';
import '../../state/platform_state.dart';

class PlatformSwitcherTabs extends ConsumerWidget {
  const PlatformSwitcherTabs({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = Theme.of(context).colorScheme.primary;
    final activePlatform = ref.watch(selectedPlatformProvider);

    final platforms = [
      {'id': PlatformId.prepxEn, 'label': 'PrepLadder EN'},
      {'id': PlatformId.marrowE6, 'label': 'Marrow Edition 6'},
      {'id': PlatformId.prepxHi, 'label': 'PrepLadder Hinglish'},
      {'id': PlatformId.cerebellum, 'label': 'Cerebellum'},
    ];

    return SizedBox(
      height: 38,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        scrollDirection: Axis.horizontal,
        itemCount: platforms.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final p = platforms[index];
          final id = p['id'] as PlatformId;
          final label = p['label'] as String;
          final isSelected = activePlatform == id;

          return Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(10),
              onTap: () {
                ref.read(selectedPlatformProvider.notifier).setPlatform(id);
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 14),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: isSelected
                      ? primaryColor
                      : (isDark ? AppColors.darkCard : AppColors.lightCard),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isSelected
                        ? primaryColor
                        : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
                    width: 1,
                  ),
                ),
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                    color: isSelected
                        ? Colors.white
                        : (isDark
                            ? AppColors.darkTextSecondary
                            : AppColors.lightTextSecondary),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
