import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../app/theme/app_colors.dart';
import '../../../core/utils/size_formatter.dart';
import '../../../domain/entities/note.dart';

class HighYieldNotesCarousel extends StatelessWidget {
  final List<NoteItem> notes;

  const HighYieldNotesCarousel({
    super.key,
    required this.notes,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (notes.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'HIGH-YIELD CLINICAL NOTES',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.8,
                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                ),
              ),
              Icon(
                LucideIcons.fileText,
                size: 16,
                color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 130,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemCount: notes.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final note = notes[index];
              return _buildNoteCard(context, note, isDark);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildNoteCard(BuildContext context, NoteItem note, bool isDark) {
    final primaryColor = Theme.of(context).colorScheme.primary;

    return Container(
      width: 230,
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
            context.push('/notes', extra: note);
          },
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: primaryColor.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        note.subjectCode,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: primaryColor,
                        ),
                      ),
                    ),
                    Text(
                      '${note.pageCount} Pages',
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
                      ),
                    ),
                  ],
                ),
                Text(
                  note.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    height: 1.3,
                    color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                  ),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      SizeFormatter.formatBytes(note.fileSizeBytes),
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
                      ),
                    ),
                    Row(
                      children: [
                        Text(
                          'Read PDF',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: primaryColor,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Icon(LucideIcons.chevronRight, size: 12, color: primaryColor),
                      ],
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
}
