import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../app/theme/app_colors.dart';
import '../../../core/utils/duration_formatter.dart';
import '../../../domain/entities/topic.dart';

class ClinicalDrawer extends StatefulWidget {
  final Topic currentTopic;
  final ValueChanged<Topic>? onSelectTopic;
  final ValueChanged<int>? onSeekTimestamp;

  const ClinicalDrawer({
    super.key,
    required this.currentTopic,
    this.onSelectTopic,
    this.onSeekTimestamp,
  });

  @override
  State<ClinicalDrawer> createState() => _ClinicalDrawerState();
}

class _ClinicalDrawerState extends State<ClinicalDrawer>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = Theme.of(context).colorScheme.primary;

    return Drawer(
      backgroundColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
      child: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Clinical Navigation',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.x, size: 20),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),
            TabBar(
              controller: _tabController,
              indicatorColor: primaryColor,
              labelColor: primaryColor,
              unselectedLabelColor: isDark
                  ? AppColors.darkTextSecondary
                  : AppColors.lightTextSecondary,
              labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
              tabs: const [
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(LucideIcons.listOrdered, size: 15),
                      SizedBox(width: 6),
                      Text('Timestamps'),
                    ],
                  ),
                ),
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(LucideIcons.bookmark, size: 15),
                      SizedBox(width: 6),
                      Text('High-Yield Pearls'),
                    ],
                  ),
                ),
              ],
            ),
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  // Tab 1: Timestamps & Key Chapters
                  _buildTimestampsTab(isDark, primaryColor),

                  // Tab 2: Clinical Pearls
                  _buildPearlsTab(isDark, primaryColor),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTimestampsTab(bool isDark, Color primaryColor) {
    final chapters = [
      {'sec': 0, 'title': 'Introduction & Clinical Case Presentation'},
      {'sec': 250, 'title': 'Etiology & Risk Factor Stratification'},
      {'sec': 720, 'title': 'Pathophysiology & Cellular Mechanism'},
      {'sec': 1240, 'title': 'Diagnostic Criteria & Lab Investigations'},
      {'sec': 1890, 'title': 'First-Line Pharmacotherapy'},
      {'sec': 2340, 'title': 'Clinical Pearls & Previous NEET-PG Questions'},
    ];

    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      itemCount: chapters.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final ch = chapters[index];
        final sec = ch['sec'] as int;
        final title = ch['title'] as String;

        return Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(8),
            onTap: () {
              Navigator.of(context).pop();
              widget.onSeekTimestamp?.call(sec);
            },
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkCard : AppColors.lightCard,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                  width: 1,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      color: primaryColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(5),
                    ),
                    child: Text(
                      DurationFormatter.format(sec),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: primaryColor,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      title,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                      ),
                    ),
                  ),
                  Icon(LucideIcons.chevronRight, size: 14, color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildPearlsTab(bool isDark, Color primaryColor) {
    final pearls = [
      'Golden Rule: Always rule out acute coronary syndrome before initiating secondary beta-blocker therapy.',
      'Drug of Choice: Intravenous Adenosine is the rapid treatment of choice for acute SVT terminating at AV node.',
      'Classic Triad: Beck\'s triad (Hypotension, Distended neck veins, Muffled heart sounds) confirms Cardiac Tamponade.',
      'High-Yield ECG Sign: Electrical Alternans with low voltage QRS complexes is pathognomonic for massive pericardial effusion.',
    ];

    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      itemCount: pearls.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final pearl = pearls[index];
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkCard : AppColors.lightCard,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
              width: 1,
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                margin: const EdgeInsets.only(top: 2),
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: primaryColor.withOpacity(0.15),
                  shape: BoxShape.circle,
                ),
                child: Icon(LucideIcons.check, size: 12, color: primaryColor),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  pearl,
                  style: TextStyle(
                    fontSize: 13,
                    height: 1.4,
                    color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
