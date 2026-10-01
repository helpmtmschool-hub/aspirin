import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../app/theme/app_colors.dart';
import '../../../core/utils/size_formatter.dart';
import '../../../domain/entities/topic.dart';
import '../../../domain/entities/note.dart';
import '../../common/empty_state_view.dart';
import '../../state/download_state.dart';

class DownloadsScreen extends ConsumerWidget {
  const DownloadsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = Theme.of(context).colorScheme.primary;

    final downloadMap = ref.watch(downloadProvider);
    final completedDownloads = downloadMap.values
        .where((d) => d.status == DownloadStatus.completed)
        .toList();

    final videoDownloads = completedDownloads.where((d) => !d.isNote).toList();
    final noteDownloads = completedDownloads.where((d) => d.isNote).toList();

    final totalBytesUsed =
        completedDownloads.fold<int>(0, (sum, item) => sum + item.totalBytes);

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Header
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'OFFLINE STORAGE',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.8,
                      color: primaryColor,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Downloaded Media',
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
            ),

            // Storage Gauge Card
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Container(
                padding: const EdgeInsets.all(16),
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
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Icon(LucideIcons.hardDrive, size: 18, color: primaryColor),
                            const SizedBox(width: 8),
                            Text(
                              'Aspirin Vault Usage',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: isDark
                                    ? AppColors.darkTextPrimary
                                    : AppColors.lightTextPrimary,
                              ),
                            ),
                          ],
                        ),
                        Text(
                          SizeFormatter.formatBytes(totalBytesUsed),
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: primaryColor,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: totalBytesUsed > 0 ? 0.28 : 0.0,
                        minHeight: 6,
                        backgroundColor: isDark
                            ? AppColors.darkBorder
                            : AppColors.lightBorder,
                        valueColor: AlwaysStoppedAnimation<Color>(primaryColor),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${videoDownloads.length} Lectures • ${noteDownloads.length} Notes',
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark
                                ? AppColors.darkTextTertiary
                                : AppColors.lightTextTertiary,
                          ),
                        ),
                        const Text(
                          'AES-256 Encrypted',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppColors.emerald,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 8),

            // Downloads List
            Expanded(
              child: completedDownloads.isEmpty
                  ? EmptyStateView(
                      icon: LucideIcons.downloadCloud,
                      title: 'No Offline Downloads',
                      message:
                          'Download lectures and clinical notes to study without an active internet connection.',
                      actionLabel: 'Browse Curriculum',
                      onAction: () => context.go('/learn'),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
                      itemCount: completedDownloads.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final item = completedDownloads[index];
                        return _buildDownloadRow(
                            context, ref, item, isDark, primaryColor);
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDownloadRow(
    BuildContext context,
    WidgetRef ref,
    DownloadItem item,
    bool isDark,
    Color primaryColor,
  ) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : AppColors.lightCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
          width: 1,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () {
            if (item.isNote) {
              final note = NoteItem(
                id: item.id,
                subjectCode: 'MED',
                title: item.title,
                pageCount: 65,
                fileSizeBytes: item.totalBytes,
                pdfUrl: '',
              );
              context.push('/notes', extra: note);
            } else {
              final topic = Topic(
                id: item.id,
                title: item.title,
                durationSeconds: 2400,
                fileSizeBytes: item.totalBytes,
                videoUrl: '',
                isWatched: false,
              );
              context.push('/player', extra: topic);
            }
          },
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: primaryColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    item.isNote ? LucideIcons.fileText : LucideIcons.video,
                    size: 20,
                    color: primaryColor,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: isDark
                              ? AppColors.darkTextPrimary
                              : AppColors.lightTextPrimary,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '${item.subjectName} • ${SizeFormatter.formatBytes(item.totalBytes)}',
                        style: TextStyle(
                          fontSize: 11,
                          color: isDark
                              ? AppColors.darkTextTertiary
                              : AppColors.lightTextTertiary,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(LucideIcons.trash2, size: 18),
                  color: isDark
                      ? AppColors.darkTextTertiary
                      : AppColors.lightTextTertiary,
                  onPressed: () {
                    _confirmDelete(context, ref, item);
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _confirmDelete(BuildContext context, WidgetRef ref, DownloadItem item) {
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: AppColors.darkCard,
          title: const Text('Remove Download?',
              style: TextStyle(color: Colors.white, fontSize: 16)),
          content: Text(
            'This will delete the encrypted offline file for "${item.title}". You will need an active connection to view it again.',
            style: const TextStyle(
                color: AppColors.darkTextSecondary, fontSize: 13),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel',
                  style: TextStyle(color: AppColors.darkTextSecondary)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
              onPressed: () {
                ref
                    .read(downloadProvider.notifier)
                    .removeDownload(item.id, isNote: item.isNote);
                Navigator.of(ctx).pop();
              },
              child: const Text('Delete', style: TextStyle(color: Colors.white)),
            ),
          ],
        );
      },
    );
  }
}
