import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:pdfrx/pdfrx.dart';
import '../../../app/theme/app_colors.dart';
import '../../../domain/entities/note.dart';
import '../../state/download_state.dart';
import '../../state/subjects_state.dart';

class NotesReaderScreen extends ConsumerStatefulWidget {
  final NoteItem note;

  const NotesReaderScreen({
    super.key,
    required this.note,
  });

  @override
  ConsumerState<NotesReaderScreen> createState() => _NotesReaderScreenState();
}

class _NotesReaderScreenState extends ConsumerState<NotesReaderScreen> {
  final PdfViewerController _pdfController = PdfViewerController();
  int _currentPage = 1;
  int _totalPages = 0;
  bool _isNightMode = false;
  File? _decryptedTempFile;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _preparePdfSource();
  }

  Future<void> _preparePdfSource() async {
    final downloadItem = ref.read(downloadProvider)[widget.note.id];
    final isDownloaded = downloadItem?.status == DownloadStatus.completed;

    if (isDownloaded) {
      try {
        final secureVault = ref.read(secureVaultProvider);
        final cipherEngine = ref.read(cipherEngineProvider);
        final encryptedFile =
            await secureVault.getEncryptedFile(widget.note.id, isNote: true);

        if (encryptedFile.existsSync()) {
          final masterKey = await secureVault.getMasterKey();
          final bytes = await encryptedFile.readAsBytes();
          if (bytes.length > 16) {
            final iv = bytes.sublist(0, 16);
            final ciphertext = bytes.sublist(16);
            final plaintext = cipherEngine.decryptBytesAtOffset(
              key: masterKey,
              iv: iv,
              byteOffset: 0,
              ciphertext: ciphertext,
            );

            // Write to private temporary cache strictly for PDFium engine session
            final tempDir = Directory.systemTemp;
            final tempFile = File(
                '${tempDir.path}/aspirin_session_${widget.note.id}.pdf');
            await tempFile.writeAsBytes(plaintext, flush: true);
            if (mounted) {
              setState(() {
                _decryptedTempFile = tempFile;
                _isLoading = false;
              });
              return;
            }
          }
        }
      } catch (_) {}
    }

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    // Zero-residue cleanup: delete temporary decrypted PDF session file
    if (_decryptedTempFile != null && _decryptedTempFile!.existsSync()) {
      try {
        _decryptedTempFile!.deleteSync();
      } catch (_) {}
    }
    super.dispose();
  }

  void _showJumpToPageDialog() {
    final textController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: AppColors.darkCard,
          title: const Text(
            'Jump to Page',
            style: TextStyle(color: Colors.white, fontSize: 16),
          ),
          content: TextField(
            controller: textController,
            keyboardType: TextInputType.number,
            autofocus: true,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              hintText: 'Enter 1 to ${_totalPages > 0 ? _totalPages : widget.note.pageCount}',
              hintStyle: const TextStyle(color: AppColors.darkTextTertiary),
              enabledBorder: const UnderlineInputBorder(
                borderSide: BorderSide(color: AppColors.darkBorder),
              ),
              focusedBorder: const UnderlineInputBorder(
                borderSide: BorderSide(color: AppColors.marrowTeal),
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel', style: TextStyle(color: AppColors.darkTextSecondary)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.marrowTeal),
              onPressed: () {
                final pageNum = int.tryParse(textController.text);
                if (pageNum != null && pageNum >= 1) {
                  _pdfController.goToPage(pageNumber: pageNum);
                }
                Navigator.of(ctx).pop();
              },
              child: const Text('Go', style: TextStyle(color: Colors.white)),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final downloadMap = ref.watch(downloadProvider);
    final downloadItem = downloadMap[widget.note.id];
    final isDownloaded = downloadItem?.status == DownloadStatus.completed;

    return Scaffold(
      backgroundColor: _isNightMode ? Colors.black : (isDark ? AppColors.darkBackground : AppColors.lightBackground),
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () => context.pop(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.note.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
            ),
            Text(
              '${widget.note.subjectCode} • Page $_currentPage of ${_totalPages > 0 ? _totalPages : widget.note.pageCount}',
              style: TextStyle(
                fontSize: 11,
                color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
              ),
            ),
          ],
        ),
        actions: [
          // Jump to Page
          IconButton(
            icon: const Icon(LucideIcons.hash, size: 20),
            tooltip: 'Jump to Page',
            onPressed: _showJumpToPageDialog,
          ),
          // Invert / Night Mode Toggle
          IconButton(
            icon: Icon(
              _isNightMode ? LucideIcons.sun : LucideIcons.moon,
              size: 20,
            ),
            tooltip: 'Clinical Night Mode',
            onPressed: () {
              setState(() => _isNightMode = !_isNightMode);
            },
          ),
          // Download Action
          if (!isDownloaded)
            IconButton(
              icon: const Icon(LucideIcons.download, size: 20),
              tooltip: 'Download PDF',
              onPressed: () {
                ref
                    .read(downloadProvider.notifier)
                    .startNoteDownload(widget.note, 'Medicine');
              },
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ColorFiltered(
              colorFilter: _isNightMode
                  ? const ColorFilter.matrix([
                      -1, 0, 0, 0, 255, // Invert Red
                      0, -1, 0, 0, 255, // Invert Green
                      0, 0, -1, 0, 255, // Invert Blue
                      0, 0, 0, 1, 0, // Alpha
                    ])
                  : const ColorFilter.mode(Colors.transparent, BlendMode.dst),
              child: _decryptedTempFile != null && _decryptedTempFile!.existsSync()
                  ? PdfViewer.file(
                      _decryptedTempFile!.path,
                      controller: _pdfController,
                      params: PdfViewerParams(
                        onPageChanged: (page) {
                          if (page != null) setState(() => _currentPage = page);
                        },
                        onViewerReady: (document, controller) {
                          setState(() => _totalPages = document.pages.length);
                        },
                      ),
                    )
                  : PdfViewer.uri(
                      Uri.parse(widget.note.pdfUrl),
                      controller: _pdfController,
                      params: PdfViewerParams(
                        onPageChanged: (page) {
                          if (page != null) setState(() => _currentPage = page);
                        },
                        onViewerReady: (document, controller) {
                          setState(() => _totalPages = document.pages.length);
                        },
                      ),
                    ),
            ),
    );
  }
}
