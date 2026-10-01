import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app/theme/app_colors.dart';
import '../../../core/utils/duration_formatter.dart';
import '../../../core/utils/size_formatter.dart';
import '../../../domain/entities/subject.dart';
import '../../../domain/entities/module.dart';
import '../../../domain/entities/topic.dart';
import '../../../domain/entities/note.dart';
import '../../common/empty_state_view.dart';
import '../../common/progress_ring.dart';
import '../../state/download_state.dart';
import '../../state/progress_state.dart';
import '../../state/subjects_state.dart';

class SubjectDetailScreen extends ConsumerStatefulWidget {
  final String subjectId;
  final Subject? initialSubject;

  const SubjectDetailScreen({
    super.key,
    required this.subjectId,
    this.initialSubject,
  });

  @override
  ConsumerState<SubjectDetailScreen> createState() => _SubjectDetailScreenState();
}

class _SubjectDetailScreenState extends ConsumerState<SubjectDetailScreen>
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

    final subjectDetailAsync = ref.watch(subjectDetailProvider(widget.subjectId));
    final subject = subjectDetailAsync.value ?? widget.initialSubject;

    final subjectColor = subject != null
        ? Color(int.parse(subject.color.replaceFirst('#', '0xFF')))
        : primaryColor;

    final modulesAsync = ref.watch(subjectModulesProvider(widget.subjectId));
    final notesAsync = ref.watch(subjectNotesProvider(widget.subjectId));

    return Scaffold(
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) {
          return [
            SliverAppBar(
              expandedHeight: 180,
              pinned: true,
              leading: IconButton(
                icon: const Icon(LucideIcons.arrowLeft),
                onPressed: () => context.pop(),
              ),
              backgroundColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
              flexibleSpace: FlexibleSpaceBar(
                background: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 50, 20, 20),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: subjectColor.withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  subject?.code ?? 'MBBS',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    color: subjectColor,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                subject?.name ?? 'Subject Details',
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                  color: isDark
                                      ? AppColors.darkTextPrimary
                                      : AppColors.lightTextPrimary,
                                ),
                              ),
                              if (subject?.leadFaculty != null) ...[
                                const SizedBox(height: 4),
                                Text(
                                  subject!.leadFaculty!,
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: isDark
                                        ? AppColors.darkTextSecondary
                                        : AppColors.lightTextSecondary,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        if (subject != null)
                          ProgressRing(
                            progress: subject.progressRatio,
                            size: 54,
                            strokeWidth: 4.5,
                            activeColor: subjectColor,
                          ),
                      ],
                    ),
                  ),
                ),
              ),
              bottom: TabBar(
                controller: _tabController,
                indicatorColor: primaryColor,
                labelColor: primaryColor,
                unselectedLabelColor: isDark
                    ? AppColors.darkTextSecondary
                    : AppColors.lightTextSecondary,
                labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                tabs: [
                  Tab(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(LucideIcons.playCircle, size: 16),
                        const SizedBox(width: 8),
                        Text('Lectures (${subject?.totalTopics ?? 0})'),
                      ],
                    ),
                  ),
                  Tab(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(LucideIcons.fileText, size: 16),
                        const SizedBox(width: 8),
                        Text('Notes (${subject?.totalNotes ?? 0})'),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ];
        },
        body: TabBarView(
          controller: _tabController,
          children: [
            // Tab 1: Lectures & Modules Tree
            _buildLecturesTab(modulesAsync, subject?.name ?? 'Medicine', isDark, primaryColor),

            // Tab 2: Clinical Notes List
            _buildNotesTab(notesAsync, subject?.name ?? 'Medicine', isDark, primaryColor),
          ],
        ),
      ),
    );
  }

  Widget _buildLecturesTab(
    AsyncValue<List<Module>> modulesAsync,
    String subjectName,
    bool isDark,
    Color primaryColor,
  ) {
    return modulesAsync.when(
      data: (modules) {
        if (modules.isEmpty) {
          return const EmptyStateView(
            icon: LucideIcons.videoOff,
            title: 'No Lectures Available',
            message: 'Lectures for this subject are currently synchronizing.',
          );
        }

        return ListView.separated(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          itemCount: modules.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (context, index) {
            final module = modules[index];
            return _buildModuleAccordion(module, subjectName, isDark, primaryColor);
          },
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, _) => EmptyStateView(
        icon: LucideIcons.alertCircle,
        title: 'Failed to load modules',
        message: err.toString(),
      ),
    );
  }

  Widget _buildModuleAccordion(
    Module module,
    String subjectName,
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
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          initiallyExpanded: true,
          tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          leading: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: primaryColor.withOpacity(0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(LucideIcons.folder, size: 18, color: primaryColor),
          ),
          title: Text(
            module.title,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
            ),
          ),
          subtitle: Text(
            '${module.topics.length} Lectures • ${DurationFormatter.formatMinutes(module.totalDurationSeconds)}',
            style: TextStyle(
              fontSize: 11,
              color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
            ),
          ),
          children: module.topics.map((topic) {
            return _buildTopicRow(topic, subjectName, isDark, primaryColor);
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildTopicRow(
    Topic topic,
    String subjectName,
    bool isDark,
    Color primaryColor,
  ) {
    final progressMap = ref.watch(progressProvider);
    final downloadMap = ref.watch(downloadProvider);

    final topicProgress = progressMap[topic.id];
    final isWatched = topicProgress?.isCompleted ?? topic.isWatched;
    final downloadItem = downloadMap[topic.id];
    final isDownloaded = downloadItem?.status == DownloadStatus.completed;
    final isDownloading = downloadItem?.status == DownloadStatus.downloading;

    return Container(
      decoration: BoxDecoration(
        border: Border(
          top: BorderSide(
            color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
            width: 0.8,
          ),
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            context.push('/player', extra: topic);
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                // Watched indicator or play icon
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: isWatched
                        ? AppColors.emerald.withOpacity(0.15)
                        : (isDark ? AppColors.darkSurface : AppColors.lightSurface),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    isWatched ? LucideIcons.check : LucideIcons.play,
                    size: 13,
                    color: isWatched ? AppColors.emerald : primaryColor,
                  ),
                ),
                const SizedBox(width: 12),

                // Topic Title and Duration
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        topic.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: isDark
                              ? AppColors.darkTextPrimary
                              : AppColors.lightTextPrimary,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          Text(
                            DurationFormatter.format(topic.durationSeconds),
                            style: TextStyle(
                              fontSize: 11,
                              color: isDark
                                  ? AppColors.darkTextTertiary
                                  : AppColors.lightTextTertiary,
                            ),
                          ),
                          if (isWatched) ...[
                            const SizedBox(width: 8),
                            const Text(
                              'Completed',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: AppColors.emerald,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),

                // Download Button
                IconButton(
                  onPressed: isDownloading
                      ? null
                      : () {
                          if (isDownloaded) {
                            ref
                                .read(downloadProvider.notifier)
                                .removeDownload(topic.id, isNote: false);
                          } else {
                            ref
                                .read(downloadProvider.notifier)
                                .startTopicDownload(topic, subjectName);
                          }
                        },
                  icon: isDownloading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Icon(
                          isDownloaded
                              ? LucideIcons.checkCircle
                              : LucideIcons.download,
                          size: 18,
                          color: isDownloaded
                              ? AppColors.emerald
                              : (isDark
                                  ? AppColors.darkTextSecondary
                                  : AppColors.lightTextSecondary),
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNotesTab(
    AsyncValue<List<NoteItem>> notesAsync,
    String subjectName,
    bool isDark,
    Color primaryColor,
  ) {
    return notesAsync.when(
      data: (notes) {
        if (notes.isEmpty) {
          return const EmptyStateView(
            icon: LucideIcons.fileX,
            title: 'No Notes Found',
            message: 'High-yield review PDFs for this subject will appear here.',
          );
        }

        return ListView.separated(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          itemCount: notes.length,
          separatorBuilder: (_, __) => const SizedBox(height: 10),
          itemBuilder: (context, index) {
            final note = notes[index];
            return _buildNoteItemRow(note, subjectName, isDark, primaryColor);
          },
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, _) => EmptyStateView(
        icon: LucideIcons.alertCircle,
        title: 'Failed to load notes',
        message: err.toString(),
      ),
    );
  }

  Widget _buildNoteItemRow(
    NoteItem note,
    String subjectName,
    bool isDark,
    Color primaryColor,
  ) {
    final downloadMap = ref.watch(downloadProvider);
    final downloadItem = downloadMap[note.id];
    final isDownloaded = downloadItem?.status == DownloadStatus.completed;
    final isDownloading = downloadItem?.status == DownloadStatus.downloading;

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
            context.push('/notes', extra: note);
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
                  child: Icon(LucideIcons.fileText, size: 20, color: primaryColor),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        note.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: isDark
                              ? AppColors.darkTextPrimary
                              : AppColors.lightTextPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${note.pageCount} Pages • ${SizeFormatter.formatBytes(note.fileSizeBytes)}',
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
                  onPressed: isDownloading
                      ? null
                      : () {
                          if (isDownloaded) {
                            ref
                                .read(downloadProvider.notifier)
                                .removeDownload(note.id, isNote: true);
                          } else {
                            ref
                                .read(downloadProvider.notifier)
                                .startNoteDownload(note, subjectName);
                          }
                        },
                  icon: isDownloading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Icon(
                          isDownloaded
                              ? LucideIcons.checkCircle
                              : LucideIcons.download,
                          size: 18,
                          color: isDownloaded
                              ? AppColors.emerald
                              : (isDark
                                  ? AppColors.darkTextSecondary
                                  : AppColors.lightTextSecondary),
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
