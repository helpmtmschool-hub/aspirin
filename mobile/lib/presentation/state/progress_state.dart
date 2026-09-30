import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_endpoints.dart';
import 'subjects_state.dart';

class VideoProgress {
  final String topicId;
  final int currentPositionSeconds;
  final int totalDurationSeconds;
  final bool isCompleted;
  final DateTime lastUpdated;

  const VideoProgress({
    required this.topicId,
    required this.currentPositionSeconds,
    required this.totalDurationSeconds,
    this.isCompleted = false,
    required this.lastUpdated,
  });

  double get progressRatio => totalDurationSeconds > 0
      ? (currentPositionSeconds / totalDurationSeconds).clamp(0.0, 1.0)
      : 0.0;

  VideoProgress copyWith({
    String? topicId,
    int? currentPositionSeconds,
    int? totalDurationSeconds,
    bool? isCompleted,
    DateTime? lastUpdated,
  }) {
    return VideoProgress(
      topicId: topicId ?? this.topicId,
      currentPositionSeconds:
          currentPositionSeconds ?? this.currentPositionSeconds,
      totalDurationSeconds: totalDurationSeconds ?? this.totalDurationSeconds,
      isCompleted: isCompleted ?? this.isCompleted,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }
}

class ProgressNotifier extends StateNotifier<Map<String, VideoProgress>> {
  final ApiClient apiClient;
  Timer? _debounceTimer;

  ProgressNotifier({required this.apiClient}) : super({});

  void updateProgress({
    required String topicId,
    required int positionSeconds,
    required int totalSeconds,
  }) {
    if (totalSeconds <= 0) return;

    final existing = state[topicId];
    // Rule: Auto-mark as completed if watched >= 90% of duration
    final isNowCompleted = (positionSeconds / totalSeconds) >= 0.90 ||
        (existing?.isCompleted ?? false);

    final updated = VideoProgress(
      topicId: topicId,
      currentPositionSeconds: positionSeconds,
      totalDurationSeconds: totalSeconds,
      isCompleted: isNowCompleted,
      lastUpdated: DateTime.now(),
    );

    state = {
      ...state,
      topicId: updated,
    };

    // Debounce syncing to Cloudflare D1 every 5 seconds or upon completion
    _debounceSync(updated);
  }

  void _debounceSync(VideoProgress progress) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(seconds: 4), () async {
      try {
        await apiClient.dio.post(
          ApiEndpoints.progress,
          data: {
            'topic_id': progress.topicId,
            'current_position_seconds': progress.currentPositionSeconds,
            'total_duration_seconds': progress.totalDurationSeconds,
            'is_completed': progress.isCompleted,
          },
        );
      } catch (_) {
        // Will retry on next heartbeat or next sync
      }
    });
  }

  VideoProgress? getProgress(String topicId) {
    return state[topicId];
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    super.dispose();
  }
}

final progressProvider =
    StateNotifierProvider<ProgressNotifier, Map<String, VideoProgress>>((ref) {
  final client = ref.watch(apiClientProvider);
  return ProgressNotifier(apiClient: client);
});
