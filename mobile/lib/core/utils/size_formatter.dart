class SizeFormatter {
  /// Formats byte count to human-readable string (e.g. 45.2 MB or 1.2 GB)
  static String format(int bytes) {
    if (bytes <= 0) return '0 B';

    const suffixes = ['B', 'KB', 'MB', 'GB', 'TB'];
    var i = 0;
    double count = bytes.toDouble();

    while (count >= 1024 && i < suffixes.length - 1) {
      count /= 1024;
      i++;
    }

    if (i == 0) return '$bytes B';
    return '${count.toStringAsFixed(1)} ${suffixes[i]}';
  }

  /// Alias for format
  static String formatBytes(int bytes) => format(bytes);
}
