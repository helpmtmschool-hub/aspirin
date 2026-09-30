import 'topic.dart';

class Module {
  final String id;
  final String subjectId;
  final String title;
  final int displayOrder;
  final List<Topic> topics;

  const Module({
    required this.id,
    required this.subjectId,
    required this.title,
    this.displayOrder = 1,
    this.topics = const [],
  });

  int get totalDurationSeconds =>
      topics.fold(0, (sum, t) => sum + t.durationSeconds);

  int get completedCount =>
      topics.where((t) => t.isCompleted).length;
}
