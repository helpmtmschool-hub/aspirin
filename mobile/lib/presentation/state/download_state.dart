import 'dart:async';
import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/security/cipher_engine.dart';
import '../../core/security/secure_vault.dart';
import '../../domain/entities/topic.dart';
import '../../domain/entities/note.dart';
import 'subjects_state.dart';

enum DownloadStatus {
  idle,
  queued,
  downloading,
  encrypting,
  completed,
  failed,
}

class DownloadItem {
  final String id;
  final String title;
  final String subjectName;
  final bool isNote;
  final int totalBytes;
  final int downloadedBytes;
  final double progress;
  final DownloadStatus status;
  final String? localEncryptedPath;
  final String? error;
  final DateTime createdAt;

  const DownloadItem({
    required this.id,
    required this.title,
    required this.subjectName,
    this.isNote = false,
    this.totalBytes = 0,
    this.downloadedBytes = 0,
    this.progress = 0.0,
    this.status = DownloadStatus.idle,
    this.localEncryptedPath,
    this.error,
    required this.createdAt,
  });

  DownloadItem copyWith({
    String? id,
    String? title,
    String? subjectName,
    bool? isNote,
    int? totalBytes,
    int? downloadedBytes,
    double? progress,
    DownloadStatus? status,
    String? localEncryptedPath,
    String? error,
    DateTime? createdAt,
  }) {
    return DownloadItem(
      id: id ?? this.id,
      title: title ?? this.title,
      subjectName: subjectName ?? this.subjectName,
      isNote: isNote ?? this.isNote,
      totalBytes: totalBytes ?? this.totalBytes,
      downloadedBytes: downloadedBytes ?? this.downloadedBytes,
      progress: progress ?? this.progress,
      status: status ?? this.status,
      localEncryptedPath: localEncryptedPath ?? this.localEncryptedPath,
      error: error ?? this.error,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

class DownloadNotifier extends StateNotifier<Map<String, DownloadItem>> {
  final SecureVault secureVault;
  final CipherEngine cipherEngine;

  DownloadNotifier({
    required this.secureVault,
    required this.cipherEngine,
  }) : super({}) {
    _loadExistingDownloads();
  }

  Future<void> _loadExistingDownloads() async {
    try {
      // Check private vault directories for existing encrypted files
      final videoVault = await secureVault.getVaultDirectory(subfolder: 'videos');
      final noteVault = await secureVault.getVaultDirectory(subfolder: 'notes');

      final items = <String, DownloadItem>{};

      if (videoVault.existsSync()) {
        for (final entity in videoVault.listSync()) {
          if (entity is File && entity.path.endsWith('.aspirin')) {
            final fileName = entity.uri.pathSegments.last;
            final id = fileName.replaceAll('.aspirin', '');
            final fileSize = entity.lengthSync();
            items[id] = DownloadItem(
              id: id,
              title: 'Clinical Lecture ($id)',
              subjectName: 'Medicine',
              isNote: false,
              totalBytes: fileSize,
              downloadedBytes: fileSize,
              progress: 1.0,
              status: DownloadStatus.completed,
              localEncryptedPath: entity.path,
              createdAt: entity.lastModifiedSync(),
            );
          }
        }
      }

      if (noteVault.existsSync()) {
        for (final entity in noteVault.listSync()) {
          if (entity is File && entity.path.endsWith('.aspirin')) {
            final fileName = entity.uri.pathSegments.last;
            final id = fileName.replaceAll('.aspirin', '');
            final fileSize = entity.lengthSync();
            items[id] = DownloadItem(
              id: id,
              title: 'Clinical Review Notes ($id)',
              subjectName: 'Medicine',
              isNote: true,
              totalBytes: fileSize,
              downloadedBytes: fileSize,
              progress: 1.0,
              status: DownloadStatus.completed,
              localEncryptedPath: entity.path,
              createdAt: entity.lastModifiedSync(),
            );
          }
        }
      }

      state = items;
    } catch (_) {}
  }

  Future<void> startTopicDownload(Topic topic, String subjectName) async {
    final item = DownloadItem(
      id: topic.id,
      title: topic.title,
      subjectName: subjectName,
      isNote: false,
      totalBytes: topic.fileSizeBytes > 0 ? topic.fileSizeBytes : 240 * 1024 * 1024,
      status: DownloadStatus.downloading,
      progress: 0.05,
      createdAt: DateTime.now(),
    );

    state = {...state, topic.id: item};

    // Simulate progress and encryption for demonstration
    for (int p = 15; p <= 100; p += 20) {
      await Future.delayed(const Duration(milliseconds: 300));
      final currentBytes = (item.totalBytes * (p / 100)).round();
      state = {
        ...state,
        topic.id: item.copyWith(
          progress: p / 100.0,
          downloadedBytes: currentBytes,
          status: p == 100 ? DownloadStatus.completed : DownloadStatus.downloading,
        ),
      };
    }

    final encryptedFile = await secureVault.getEncryptedFile(topic.id, isNote: false);
    // Write header placeholder if not present
    if (!encryptedFile.existsSync()) {
      encryptedFile.writeAsBytesSync(List.filled(1024, 0));
    }

    state = {
      ...state,
      topic.id: state[topic.id]!.copyWith(
        status: DownloadStatus.completed,
        localEncryptedPath: encryptedFile.path,
      ),
    };
  }

  Future<void> startNoteDownload(NoteItem note, String subjectName) async {
    final item = DownloadItem(
      id: note.id,
      title: note.title,
      subjectName: subjectName,
      isNote: true,
      totalBytes: note.fileSizeBytes > 0 ? note.fileSizeBytes : 45 * 1024 * 1024,
      status: DownloadStatus.downloading,
      progress: 0.1,
      createdAt: DateTime.now(),
    );

    state = {...state, note.id: item};

    for (int p = 25; p <= 100; p += 25) {
      await Future.delayed(const Duration(milliseconds: 250));
      final currentBytes = (item.totalBytes * (p / 100)).round();
      state = {
        ...state,
        note.id: item.copyWith(
          progress: p / 100.0,
          downloadedBytes: currentBytes,
          status: p == 100 ? DownloadStatus.completed : DownloadStatus.downloading,
        ),
      };
    }

    final encryptedFile = await secureVault.getEncryptedFile(note.id, isNote: true);
    if (!encryptedFile.existsSync()) {
      encryptedFile.writeAsBytesSync(List.filled(1024, 0));
    }

    state = {
      ...state,
      note.id: state[note.id]!.copyWith(
        status: DownloadStatus.completed,
        localEncryptedPath: encryptedFile.path,
      ),
    };
  }

  Future<void> removeDownload(String id, {bool isNote = false}) async {
    try {
      final file = await secureVault.getEncryptedFile(id, isNote: isNote);
      if (file.existsSync()) {
        file.deleteSync();
      }
    } catch (_) {}

    final updated = Map<String, DownloadItem>.from(state);
    updated.remove(id);
    state = updated;
  }

  bool isDownloaded(String id) {
    return state[id]?.status == DownloadStatus.completed;
  }

  DownloadItem? getItem(String id) {
    return state[id];
  }
}

final cipherEngineProvider = Provider<CipherEngine>((ref) => CipherEngine());

final downloadProvider =
    StateNotifierProvider<DownloadNotifier, Map<String, DownloadItem>>((ref) {
  final vault = ref.watch(secureVaultProvider);
  final cipher = ref.watch(cipherEngineProvider);
  return DownloadNotifier(secureVault: vault, cipherEngine: cipher);
});
