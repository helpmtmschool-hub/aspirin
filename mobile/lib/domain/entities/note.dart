class NoteItem {
  final String id;
  final String subjectId;
  final String title;
  final String filename;
  final int fileSizeBytes;
  final int telegramChatId;
  final int telegramMessageId;
  final int pageCount;
  final String? faculty;
  final bool isMasterTextbook;
  final bool isDownloaded;

  const NoteItem({
    required this.id,
    required this.subjectId,
    required this.title,
    required this.filename,
    required this.fileSizeBytes,
    required this.telegramChatId,
    required this.telegramMessageId,
    this.pageCount = 120,
    this.faculty,
    this.isMasterTextbook = false,
    this.isDownloaded = false,
  });

  NoteItem copyWith({
    bool? isDownloaded,
  }) {
    return NoteItem(
      id: id,
      subjectId: subjectId,
      title: title,
      filename: filename,
      fileSizeBytes: fileSizeBytes,
      telegramChatId: telegramChatId,
      telegramMessageId: telegramMessageId,
      pageCount: pageCount,
      faculty: faculty,
      isMasterTextbook: isMasterTextbook,
      isDownloaded: isDownloaded ?? this.isDownloaded,
    );
  }
}
