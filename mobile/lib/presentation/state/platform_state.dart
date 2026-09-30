import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/entities/subject.dart';
export '../../domain/entities/subject.dart';

class PlatformNotifier extends StateNotifier<PlatformId> {
  PlatformNotifier() : super(PlatformId.prepxEn);

  void setPlatform(PlatformId platform) {
    state = platform;
  }
}

final platformProvider = StateNotifierProvider<PlatformNotifier, PlatformId>((ref) {
  return PlatformNotifier();
});

final selectedPlatformProvider = platformProvider;
