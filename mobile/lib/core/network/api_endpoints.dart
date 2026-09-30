import '../config/env_config.dart';

class ApiEndpoints {
  static String get baseUrl => EnvConfig.apiBaseUrl;

  // Catalog & Curriculum
  static String get subjects => '$baseUrl/subjects';
  static String subjectDetail(String id) => '$baseUrl/subjects/$id';
  static String topicDetail(String id) => '$baseUrl/topics/$id';

  // Media Streaming (Zero-Egress HTTP 302 to Azure CDN)
  static String streamUrl(int chatId, int messageId, {bool resolveOnly = false}) {
    final query = resolveOnly ? '?resolve_only=1' : '';
    return '$baseUrl/stream/$chatId/$messageId$query';
  }

  static String notesUrl(int chatId, int messageId) => '$baseUrl/notes/$chatId/$messageId';
  static String thumbnailUrl(int chatId, int messageId) => '$baseUrl/thumbnail/$chatId/$messageId';
  static String subtitlesUrl(int chatId, int messageId) => '$baseUrl/subtitles/$chatId/$messageId';

  // Watch Progress & Telemetry
  static String get progress => '$baseUrl/progress';
  static String get resumeState => '$baseUrl/sync/resume-state';
  static String get activeSession => '$baseUrl/active-session';
  static String get search => '$baseUrl/search';
}
