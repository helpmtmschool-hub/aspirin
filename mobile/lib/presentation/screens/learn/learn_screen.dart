import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app/theme/app_colors.dart';
import '../../../domain/entities/subject.dart';
import '../../common/empty_state_view.dart';
import '../../state/subjects_state.dart';
import 'platform_switcher_tabs.dart';
import 'prof_accordion_section.dart';

class LearnScreen extends ConsumerWidget {
  const LearnScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = Theme.of(context).colorScheme.primary;

    final filteredSubjectsAsync = ref.watch(filteredSubjectsProvider);
    final selectedProf = ref.watch(selectedProfFilterProvider);

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Header
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '19 MBBS SUBJECTS',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.8,
                          color: primaryColor,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Clinical Curriculum',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: isDark
                              ? AppColors.darkTextPrimary
                              : AppColors.lightTextPrimary,
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    onPressed: () {
                      ref.invalidate(allSubjectsProvider);
                    },
                    icon: Icon(
                      LucideIcons.rotateCw,
                      size: 20,
                      color: isDark
                          ? AppColors.darkTextSecondary
                          : AppColors.lightTextSecondary,
                    ),
                  ),
                ],
              ),
            ),

            // Platform Switcher Tabs (PrepLadder EN, Marrow E6, Cerebellum)
            const PlatformSwitcherTabs(),
            const SizedBox(height: 12),

            // Prof Filter Pills (All, 1st, 2nd, 3rd Pt 1, Final Pt 2)
            SizedBox(
              height: 32,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  _buildProfChip(
                    context,
                    label: 'All Profs',
                    isSelected: selectedProf == null,
                    onTap: () {
                      ref.read(selectedProfFilterProvider.notifier).state = null;
                    },
                    isDark: isDark,
                    primaryColor: primaryColor,
                  ),
                  for (final prof in MBBSProf.values)
                    Padding(
                      padding: const EdgeInsets.only(left: 8),
                      child: _buildProfChip(
                        context,
                        label: prof.label,
                        isSelected: selectedProf == prof,
                        onTap: () {
                          ref.read(selectedProfFilterProvider.notifier).state =
                              selectedProf == prof ? null : prof;
                        },
                        isDark: isDark,
                        primaryColor: primaryColor,
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Main Content Area
            Expanded(
              child: filteredSubjectsAsync.when(
                data: (subjects) {
                  if (subjects.isEmpty) {
                    return const EmptyStateView(
                      icon: LucideIcons.bookX,
                      title: 'No Subjects Found',
                      message: 'Try selecting a different platform or clearing your search filter.',
                    );
                  }

                  // Group subjects by MBBS Prof
                  final prof1 = subjects.where((s) => s.prof == MBBSProf.prof1).toList();
                  final prof2 = subjects.where((s) => s.prof == MBBSProf.prof2).toList();
                  final prof3Pt1 = subjects.where((s) => s.prof == MBBSProf.prof3Part1).toList();
                  final prof3Pt2 = subjects.where((s) => s.prof == MBBSProf.prof3Part2).toList();

                  return ListView(
                    padding: const EdgeInsets.only(bottom: 96),
                    children: [
                      if (prof1.isNotEmpty)
                        ProfAccordionSection(
                          prof: MBBSProf.prof1,
                          subjects: prof1,
                          initialExpanded: true,
                        ),
                      if (prof2.isNotEmpty)
                        ProfAccordionSection(
                          prof: MBBSProf.prof2,
                          subjects: prof2,
                          initialExpanded: true,
                        ),
                      if (prof3Pt1.isNotEmpty)
                        ProfAccordionSection(
                          prof: MBBSProf.prof3Part1,
                          subjects: prof3Pt1,
                          initialExpanded: true,
                        ),
                      if (prof3Pt2.isNotEmpty)
                        ProfAccordionSection(
                          prof: MBBSProf.prof3Part2,
                          subjects: prof3Pt2,
                          initialExpanded: true,
                        ),
                    ],
                  );
                },
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (err, _) => EmptyStateView(
                  icon: LucideIcons.alertCircle,
                  title: 'Unable to Load Curriculum',
                  message: err.toString(),
                  actionLabel: 'Retry',
                  onAction: () => ref.invalidate(allSubjectsProvider),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfChip(
    BuildContext context, {
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
    required bool isDark,
    required Color primaryColor,
  }) {
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => onTap(),
      backgroundColor: isDark ? AppColors.darkCard : AppColors.lightCard,
      selectedColor: primaryColor.withOpacity(0.18),
      checkmarkColor: primaryColor,
      side: BorderSide(
        color: isSelected
            ? primaryColor
            : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
      ),
      labelStyle: TextStyle(
        fontSize: 11,
        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
        color: isSelected
            ? primaryColor
            : (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
      visualDensity: VisualDensity.compact,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    );
  }
}
