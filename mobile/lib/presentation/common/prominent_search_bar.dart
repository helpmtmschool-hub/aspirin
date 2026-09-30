import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../app/theme/app_colors.dart';

class ProminentSearchBar extends StatelessWidget {
  final TextEditingController? controller;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onTap;
  final VoidCallback? onClear;
  final bool readOnly;
  final String hintText;
  final Widget? trailing;

  const ProminentSearchBar({
    super.key,
    this.controller,
    this.onChanged,
    this.onTap,
    this.onClear,
    this.readOnly = false,
    this.hintText = 'Search 19 subjects, faculty, or clinical topics...',
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      height: 48,
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : AppColors.lightCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
          width: 1,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Row(
              children: [
                Icon(
                  LucideIcons.search,
                  size: 18,
                  color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: readOnly
                      ? Text(
                          hintText,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 14,
                            color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
                          ),
                        )
                      : TextField(
                          controller: controller,
                          onChanged: onChanged,
                          style: TextStyle(
                            fontSize: 14,
                            color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                          ),
                          decoration: InputDecoration(
                            isDense: true,
                            contentPadding: EdgeInsets.zero,
                            border: InputBorder.none,
                            hintText: hintText,
                            hintStyle: TextStyle(
                              fontSize: 14,
                              color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
                            ),
                          ),
                        ),
                ),
                if (trailing != null)
                  trailing!
                else if (controller != null && controller!.text.isNotEmpty)
                  GestureDetector(
                    onTap: () {
                      controller?.clear();
                      onClear?.call();
                    },
                    child: Icon(
                      LucideIcons.x,
                      size: 16,
                      color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
