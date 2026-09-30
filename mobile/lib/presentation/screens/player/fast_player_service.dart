import 'dart:async';
import 'package:flutter/services.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import '../../../core/security/cipher_engine.dart';
import '../../../core/security/secure_vault.dart';
import 'localhost_stream_proxy.dart';

class FastPlayerService {
  late final Player player;
  late final VideoController controller;
  final LocalhostStreamProxy proxy;
  StreamSubscription? _positionSub;
  double _currentSpeed = 1.0;

  static const List<double> supportedSpeeds = [
    0.75,
    1.0,
    1.25,
    1.5,
    1.75,
    2.0,
    2.5,
  ];

  FastPlayerService({
    CipherEngine? cipherEngine,
    SecureVault? secureVault,
  }) : proxy = LocalhostStreamProxy(
          cipherEngine: cipherEngine ?? CipherEngine(),
          secureVault: secureVault ?? SecureVault(),
        ) {
    player = Player(
      configuration: const PlayerConfiguration(
        pitch: true, // Pitch correction enabled for fast medical lecture playback
        bufferSize: 32 * 1024 * 1024, // 32MB forward buffer
      ),
    );
    controller = VideoController(
      player,
      configuration: const VideoControllerConfiguration(
        enableHardwareAcceleration: true,
      ),
    );
  }

  double get currentSpeed => _currentSpeed;

  Future<void> initialize() async {
    await proxy.start();
  }

  Future<void> loadVideo({
    required String videoUrl,
    required String topicId,
    required bool isLocalEncrypted,
    int initialSeekSeconds = 0,
  }) async {
    String playableSource = videoUrl;

    if (isLocalEncrypted) {
      playableSource = proxy.getLocalStreamingUrl(topicId, isNote: false);
    }

    await player.open(
      Media(
        playableSource,
        httpHeaders: {
          'User-Agent': 'AspirinLMS-Player/1.0.0 (Android)',
        },
      ),
      play: true,
    );

    if (initialSeekSeconds > 0) {
      await player.seek(Duration(seconds: initialSeekSeconds));
    }

    await player.setRate(_currentSpeed);
  }

  Future<void> setSpeed(double speed) async {
    _currentSpeed = speed;
    await player.setRate(speed);
  }

  Future<void> seekRelative(int seconds) async {
    final current = player.state.position;
    final total = player.state.duration;
    final target = current + Duration(seconds: seconds);

    if (target < Duration.zero) {
      await player.seek(Duration.zero);
    } else if (target > total) {
      await player.seek(total);
    } else {
      await player.seek(target);
    }
  }

  Future<void> enterPictureInPicture() async {
    try {
      const channel = MethodChannel('com.aspirin.lms/pip');
      await channel.invokeMethod('enterPip');
    } catch (_) {
      // Handled gracefully if PiP is not supported on device
    }
  }

  Future<void> dispose() async {
    await _positionSub?.cancel();
    await player.dispose();
    await proxy.stop();
  }
}
