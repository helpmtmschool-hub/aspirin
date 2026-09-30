import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../app/theme/app_colors.dart';
import '../../../domain/entities/subject.dart';
import '../../common/progress_ring.dart';

class SubjectCard extends StatelessWidget {
  final Subject subject;

  const SubjectCard({
    super.key,
    required this.subject,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final subjectColor = Color(
      int.parse(subject.color.replaceFirst('#', '0xFF')),
    );

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : AppColors.lightCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
          width: 1,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () {
            context.push('/subject/${subject.id}', extra: subject);
          },
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                // Subject Code & Icon Box
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: subjectColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: subjectColor.withOpacity(0.3),
                      width: 1,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      subject.code,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: subjectColor,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 14),

                // Title & Details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        subject.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                        ),
                      ),
                      const SizedBox(height: 3),
                      if (subject.leadFaculty != null) ...[
                        Text(
                          subject.leadFaculty!,
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                          ),
                        ),
                        const SizedBox(height: 5),
                      ],
                      Row(
                        children: [
                          Icon(
                            LucideIcons.playCircle,
                            size: 13,
                            color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${subject.totalTopics} lectures',
                            style: TextStyle(
                              fontSize: 11,
                              color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Icon(
                            LucideIcons.fileText,
                            size: 13,
                            color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${subject.totalNotes} notes',
                            style: TextStyle(
                              fontSize: 11,
                              color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(width: 10),

                // Progress Indicator
                ProgressRing(
                  progress: subject.progressRatio,
                  size: 38,
                  strokeWidth: 3.5,
                  activeColor: subjectColor,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
