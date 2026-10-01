class DurationFormatter {
  /// Formats seconds to mm:ss or hh:mm:ss (e.g. 14:20 or 1:12:45)
  static String format(int seconds) {
    if (seconds <= 0) return '00:00';

    final duration = Duration(seconds: seconds);
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    final secs = duration.inSeconds.remainder(60);

    final minStr = minutes.toString().padLeft(2, '0');
    final secStr = secs.toString().padLeft(2, '0');

    if (hours > 0) {
      return '$hours:$minStr:$secStr';
    } else {
      return '$minStr:$secStr';
    }
  }

  /// Formats duration to readable human label (e.g. "45 mins" or "1.5 hrs")
  static String formatHuman(int seconds) {
    if (seconds <= 0) return '0 mins';
    final duration = Duration(seconds: seconds);
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);

    if (hours > 0) {
      if (minutes > 0) {
        return '${hours}h ${minutes}m';
      }
      return '$hours hrs';
    }
    return '$minutes mins';
  }

  /// Alias for formatHuman
  static String formatMinutes(int seconds) => formatHuman(seconds);

  /// Formats remaining time (e.g. "18m remaining")
  static String formatRemaining(double watchedSecs, double totalSecs) {
    final remaining = (totalSecs - watchedSecs).toInt();
    if (remaining <= 0) return 'Completed';
    final mins = (remaining / 60).ceil();
    if (mins >= 60) {
      final hours = (mins / 60).toStringAsFixed(1);
      return '${hours}h remaining';
    }
    return '${mins}m remaining';
  }
}
