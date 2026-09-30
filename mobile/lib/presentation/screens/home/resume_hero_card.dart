import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../app/theme/app_colors.dart';
import '../../../core/utils/duration_formatter.dart';
import '../../../domain/entities/topic.dart';

class ResumeHeroCard extends StatelessWidget {
  final Topic? topic;

  const ResumeHeroCard({
    super.key,
    this.topic,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = Theme.of(context).colorScheme.primary;

    if (topic == null) {
      return _buildStartCard(context, isDark, primaryColor);
    }

    final durationSec = topic!.durationSeconds;
    // Default demo resume position if not set
    final currentSec = durationSec > 0 ? (durationSec * 0.65).round() : 1200;
    final remainingSec = durationSec - currentSec;
    final progress = durationSec > 0 ? (currentSec / durationSec).clamp(0.0, 1.0) : 0.0;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : AppColors.lightCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
          width: 1,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () {
            context.push('/player', extra: topic);
          },
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                      decoration: BoxDecoration(
                        color: primaryColor.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        children: [
                          Icon(LucideIcons.playCircle, size: 13, color: primaryColor),
                          const SizedBox(width: 5),
                          Text(
                            'RESUME WHERE YOU LEFT',
                            style: TextStyle(
                              color: primaryColor,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      '${DurationFormatter.formatMinutes(remainingSec)} left',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  topic!.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    height: 1.3,
                    color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Text(
                      'Medicine',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: primaryColor,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      width: 4,
                      height: 4,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Dr. Rakesh Nair',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 5,
                    backgroundColor: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                    valueColor: AlwaysStoppedAnimation<Color>(primaryColor),
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '${DurationFormatter.format(currentSec)} / ${DurationFormatter.format(durationSec)}',
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
                      ),
                    ),
                    ElevatedButton.icon(
                      onPressed: () {
                        context.push('/player', extra: topic);
                      },
                      icon: const Icon(LucideIcons.play, size: 14),
                      label: const Text('Resume Lecture'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        visualDensity: VisualDensity.compact,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStartCard(BuildContext context, bool isDark, Color primaryColor) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : AppColors.lightCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(LucideIcons.bookOpen, size: 16, color: primaryColor),
              const SizedBox(width: 8),
              Text(
                'START YOUR PREPARATION',
                style: TextStyle(
                  color: primaryColor,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            'Explore 19 Clinical & Pre-Clinical Subjects',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Master high-yield concepts curated by India\'s top medical faculty.',
            style: TextStyle(
              fontSize: 13,
              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
            ),
          ),
          const SizedBox(height: 14),
          ElevatedButton.icon(
            onPressed: () => context.go('/learn'),
            icon: const Icon(LucideIcons.arrowRight, size: 14),
            label: const Text('Browse All Subjects'),
            style: ElevatedButton.styleFrom(
              backgroundColor: primaryColor,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              visualDensity: VisualDensity.compact,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
