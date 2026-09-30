import 'package:flutter/material.dart';
import '../../app/theme/app_colors.dart';

class ProgressRing extends StatelessWidget {
  final double progress; // 0.0 to 1.0
  final double size;
  final double strokeWidth;
  final Color? activeColor;
  final Color? backgroundColor;
  final Widget? child;

  const ProgressRing({
    super.key,
    required this.progress,
    this.size = 44,
    this.strokeWidth = 3.5,
    this.activeColor,
    this.backgroundColor,
    this.child,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = activeColor ?? Theme.of(context).colorScheme.primary;
    final trackColor = backgroundColor ??
        (isDark ? AppColors.darkBorder : AppColors.lightBorder);

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CircularProgressIndicator(
            value: progress.clamp(0.0, 1.0),
            strokeWidth: strokeWidth,
            strokeCap: StrokeCap.round,
            backgroundColor: trackColor,
            valueColor: AlwaysStoppedAnimation<Color>(primaryColor),
          ),
          if (child != null)
            child!
          else
            Text(
              '${(progress * 100).toInt()}%',
              style: TextStyle(
                fontSize: size * 0.28,
                fontWeight: FontWeight.w700,
                color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
              ),
            ),
        ],
      ),
    );
  }
}
