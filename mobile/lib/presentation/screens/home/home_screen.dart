import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app/theme/app_colors.dart';
import '../../common/prominent_search_bar.dart';
import '../../state/auth_state.dart';
import '../../state/subjects_state.dart';
import 'resume_hero_card.dart';
import 'continue_subjects_carousel.dart';
import 'high_yield_notes_carousel.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = Theme.of(context).colorScheme.primary;

    final authState = ref.watch(authProvider);
    final lastWatchedAsync = ref.watch(lastWatchedTopicProvider);
    final continueSubjectsAsync = ref.watch(continueSubjectsProvider);
    final highYieldNotesAsync = ref.watch(highYieldNotesProvider);

    final user = authState.user;
    final greeting = _getGreeting();
    final doctorName = user?.fullName ?? 'Dr. Aspirant';

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          color: primaryColor,
          onRefresh: () async {
            ref.invalidate(lastWatchedTopicProvider);
            ref.invalidate(continueSubjectsProvider);
            ref.invalidate(highYieldNotesProvider);
          },
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              // Top Header & Search Bar
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '$greeting,',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  color: isDark
                                      ? AppColors.darkTextSecondary
                                      : AppColors.lightTextSecondary,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                doctorName,
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                  color: isDark
                                      ? AppColors.darkTextPrimary
                                      : AppColors.lightTextPrimary,
                                ),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: primaryColor.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: primaryColor.withOpacity(0.3),
                                width: 1,
                              ),
                            ),
                            child: Row(
                              children: [
                                Icon(LucideIcons.award, size: 14, color: primaryColor),
                                const SizedBox(width: 5),
                                Text(
                                  user?.targetExam ?? 'NEET-PG',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: primaryColor,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      // Prominent Search Bar
                      ProminentSearchBar(
                        readOnly: true,
                        onTap: () {
                          context.push('/search');
                        },
                      ),
                    ],
                  ),
                ),
              ),

              // Resume Where I Left Hero Card
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
                  child: lastWatchedAsync.when(
                    data: (topic) => ResumeHeroCard(topic: topic),
                    loading: () => Container(
                      height: 160,
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkCard : AppColors.lightCard,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Center(child: CircularProgressIndicator()),
                    ),
                    error: (_, __) => const ResumeHeroCard(topic: null),
                  ),
                ),
              ),

              // High-Yield Quick Stats Bar
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 18),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.darkCard : AppColors.lightCard,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                        width: 1,
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildStatItem('42 hrs', 'Watch Time', LucideIcons.clock, isDark, primaryColor),
                        _buildDivider(isDark),
                        _buildStatItem('148', 'Lectures Done', LucideIcons.checkCircle2, isDark, primaryColor),
                        _buildDivider(isDark),
                        _buildStatItem('14 Days', 'Study Streak', LucideIcons.flame, isDark, AppColors.amber),
                      ],
                    ),
                  ),
                ),
              ),

              // Continue Subjects Carousel
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 24),
                  child: continueSubjectsAsync.when(
                    data: (subjects) => ContinueSubjectsCarousel(subjects: subjects),
                    loading: () => const SizedBox(
                      height: 120,
                      child: Center(child: CircularProgressIndicator()),
                    ),
                    error: (_, __) => const SizedBox.shrink(),
                  ),
                ),
              ),

              // High Yield Clinical Notes Carousel
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 96),
                  child: highYieldNotesAsync.when(
                    data: (notes) => HighYieldNotesCarousel(notes: notes),
                    loading: () => const SizedBox(
                      height: 120,
                      child: Center(child: CircularProgressIndicator()),
                    ),
                    error: (_, __) => const SizedBox.shrink(),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatItem(
    String value,
    String label,
    IconData icon,
    bool isDark,
    Color accentColor,
  ) {
    return Row(
      children: [
        Icon(icon, size: 16, color: accentColor),
        const SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              value,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
              ),
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w500,
                color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildDivider(bool isDark) {
    return Container(
      width: 1,
      height: 28,
      color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
    );
  }
}
