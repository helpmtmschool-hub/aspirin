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
  final String? _subjectCode;
  final String? _pdfUrl;

  const NoteItem({
    required this.id,
    this.subjectId = '',
    required this.title,
    this.filename = '',
    this.fileSizeBytes = 0,
    this.telegramChatId = 0,
    this.telegramMessageId = 0,
    this.pageCount = 120,
    this.faculty,
    this.isMasterTextbook = false,
    this.isDownloaded = false,
    String? subjectCode,
    String? pdfUrl,
  })  : _subjectCode = subjectCode,
        _pdfUrl = pdfUrl;

  String get subjectCode =>
      _subjectCode ??
      (subjectId.length >= 3
          ? subjectId.substring(0, 3).toUpperCase()
          : subjectId.toUpperCase());

  String get pdfUrl =>
      _pdfUrl ??
      'https://api.aspirin.lms/stream/$telegramChatId/$telegramMessageId';

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
      subjectCode: _subjectCode,
      pdfUrl: _pdfUrl,
    );
  }
}
