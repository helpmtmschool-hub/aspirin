class Topic {
  final String id;
  final String subjectId;
  final String moduleId;
  final String title;
  final String filename;
  final int fileSizeBytes;
  final int durationSeconds;
  final String durationFormatted;
  final int telegramChatId;
  final int telegramMessageId;
  final List<String> pearls;
  final double watchedSeconds;
  final bool isCompleted;
  final bool isBookmarked;
  final String? faculty;
  final String? directStreamUrl;
  final bool isDownloaded;

  const Topic({
    required this.id,
    required this.subjectId,
    required this.moduleId,
    required this.title,
    required this.filename,
    required this.fileSizeBytes,
    required this.durationSeconds,
    required this.durationFormatted,
    required this.telegramChatId,
    required this.telegramMessageId,
    this.pearls = const [],
    this.watchedSeconds = 0.0,
    this.isCompleted = false,
    this.isBookmarked = false,
    this.faculty,
    this.directStreamUrl,
    this.isDownloaded = false,
  });

  /// Percentage completed (0.0 to 1.0)
  double get progressFraction {
    if (durationSeconds <= 0) return 0.0;
    final frac = watchedSeconds / durationSeconds;
    return frac.clamp(0.0, 1.0);
  }

  Topic copyWith({
    double? watchedSeconds,
    bool? isCompleted,
    bool? isBookmarked,
    String? directStreamUrl,
    bool? isDownloaded,
  }) {
    return Topic(
      id: id,
      subjectId: subjectId,
      moduleId: moduleId,
      title: title,
      filename: filename,
      fileSizeBytes: fileSizeBytes,
      durationSeconds: durationSeconds,
      durationFormatted: durationFormatted,
      telegramChatId: telegramChatId,
      telegramMessageId: telegramMessageId,
      pearls: pearls,
      watchedSeconds: watchedSeconds ?? this.watchedSeconds,
      isCompleted: isCompleted ?? this.isCompleted,
      isBookmarked: isBookmarked ?? this.isBookmarked,
      faculty: faculty,
      directStreamUrl: directStreamUrl ?? this.directStreamUrl,
      isDownloaded: isDownloaded ?? this.isDownloaded,
    );
  }
}
