import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../app/theme/app_colors.dart';
import '../../common/empty_state_view.dart';
import '../../common/prominent_search_bar.dart';
import '../../state/subjects_state.dart';
import '../learn/subject_card.dart';

class InstantSearchModal extends ConsumerStatefulWidget {
  const InstantSearchModal({super.key});

  @override
  ConsumerState<InstantSearchModal> createState() => _InstantSearchModalState();
}

enum SearchFilterType { all, videos, notes, pearls }

class _InstantSearchModalState extends ConsumerState<InstantSearchModal> {
  final TextEditingController _searchController = TextEditingController();
  String _query = '';
  SearchFilterType _filterType = SearchFilterType.all;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = Theme.of(context).colorScheme.primary;
    final allSubjectsAsync = ref.watch(allSubjectsProvider);

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Search Header Bar
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 12, 16, 8),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(LucideIcons.arrowLeft),
                    onPressed: () => context.pop(),
                  ),
                  Expanded(
                    child: ProminentSearchBar(
                      controller: _searchController,
                      readOnly: false,
                      onChanged: (val) {
                        setState(() => _query = val.trim().toLowerCase());
                      },
                      onClear: () {
                        setState(() => _query = '');
                      },
                    ),
                  ),
                ],
              ),
            ),

            // Search Filter Chips (Phase 5.2)
            SizedBox(
              height: 34,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  _buildChip('All Results', SearchFilterType.all, isDark, primaryColor),
                  const SizedBox(width: 8),
                  _buildChip('Videos Only', SearchFilterType.videos, isDark, primaryColor),
                  const SizedBox(width: 8),
                  _buildChip('Notes Only', SearchFilterType.notes, isDark, primaryColor),
                  const SizedBox(width: 8),
                  _buildChip('High-Yield Pearls', SearchFilterType.pearls, isDark, primaryColor),
                ],
              ),
            ),
            const SizedBox(height: 8),

            // Results List
            Expanded(
              child: allSubjectsAsync.when(
                data: (subjects) {
                  final filtered = subjects.where((s) {
                    final matchName = s.name.toLowerCase().contains(_query);
                    final matchCode = s.code.toLowerCase().contains(_query);
                    final matchFaculty = s.leadFaculty != null &&
                        s.leadFaculty!.toLowerCase().contains(_query);
                    final matchesQuery = _query.isEmpty || matchName || matchCode || matchFaculty;

                    if (!matchesQuery) return false;

                    switch (_filterType) {
                      case SearchFilterType.all:
                        return true;
                      case SearchFilterType.videos:
                        return s.totalTopics > 0;
                      case SearchFilterType.notes:
                        return s.totalNotes > 0;
                      case SearchFilterType.pearls:
                        return s.totalTopics > 0;
                    }
                  }).toList();

                  if (filtered.isEmpty) {
                    return EmptyStateView(
                      icon: LucideIcons.searchX,
                      title: 'No Matches Found',
                      message:
                          'No subjects or faculty matched "$_query". Check your spelling or try another medical query.',
                    );
                  }

                  return ListView.separated(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      return SubjectCard(subject: filtered[index]);
                    },
                  );
                },
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (err, _) => EmptyStateView(
                  icon: LucideIcons.alertCircle,
                  title: 'Search Unavailable',
                  message: err.toString(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
  Widget _buildChip(
    String label,
    SearchFilterType type,
    bool isDark,
    Color primaryColor,
  ) {
    final isSelected = _filterType == type;

    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) {
        setState(() => _filterType = type);
      },
      backgroundColor: isDark ? AppColors.darkCard : AppColors.lightCard,
      selectedColor: primaryColor.withOpacity(0.18),
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
            : (isDark
                ? AppColors.darkTextSecondary
                : AppColors.lightTextSecondary),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
      visualDensity: VisualDensity.compact,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    );
  }
}
