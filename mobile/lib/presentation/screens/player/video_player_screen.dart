import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:media_kit_video/media_kit_video.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import '../../../app/theme/app_colors.dart';
import '../../../core/utils/duration_formatter.dart';
import '../../../domain/entities/topic.dart';
import '../../state/download_state.dart';
import '../../state/progress_state.dart';
import 'fast_player_service.dart';
import 'clinical_drawer.dart';

class VideoPlayerScreen extends ConsumerStatefulWidget {
  final Topic topic;

  const VideoPlayerScreen({
    super.key,
    required this.topic,
  });

  @override
  ConsumerState<VideoPlayerScreen> createState() => _VideoPlayerScreenState();
}

class _VideoPlayerScreenState extends ConsumerState<VideoPlayerScreen> {
  late final FastPlayerService _playerService;
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  bool _showControls = true;
  Timer? _hideTimer;
  bool _isPlaying = true;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;
  StreamSubscription? _posSub;
  StreamSubscription? _durSub;
  StreamSubscription? _playSub;
  int _seekRipple = 0; // -10 or +10 for visual seek feedback
  double _brightness = 0.8;
  double _volume = 0.8;
  String? _gestureOverlayText;
  IconData? _gestureOverlayIcon;
  Timer? _gestureOverlayTimer;

  @override
  void initState() {
    super.initState();
    WakelockPlus.enable();
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);

    _playerService = FastPlayerService();
    _initAndPlay();
  }

  Future<void> _initAndPlay() async {
    await _playerService.initialize();

    final isDownloaded = ref.read(downloadProvider.notifier).isDownloaded(widget.topic.id);
    final savedProgress = ref.read(progressProvider)[widget.topic.id];
    final startSec = savedProgress?.currentPositionSeconds ?? 0;

    await _playerService.loadVideo(
      videoUrl: widget.topic.videoUrl,
      topicId: widget.topic.id,
      isLocalEncrypted: isDownloaded,
      initialSeekSeconds: startSec,
    );

    _posSub = _playerService.player.stream.position.listen((pos) {
      if (mounted) {
        setState(() => _position = pos);
        // Report progress to Riverpod state
        ref.read(progressProvider.notifier).updateProgress(
              topicId: widget.topic.id,
              positionSeconds: pos.inSeconds,
              totalSeconds: _duration.inSeconds > 0
                  ? _duration.inSeconds
                  : widget.topic.durationSeconds,
            );
      }
    });

    _durSub = _playerService.player.stream.duration.listen((dur) {
      if (mounted && dur > Duration.zero) {
        setState(() => _duration = dur);
      }
    });

    _playSub = _playerService.player.stream.playing.listen((playing) {
      if (mounted) {
        setState(() => _isPlaying = playing);
      }
    });

    _startHideTimer();
  }

  void _startHideTimer() {
    _hideTimer?.cancel();
    _hideTimer = Timer(const Duration(seconds: 4), () {
      if (mounted && _isPlaying) {
        setState(() => _showControls = false);
      }
    });
  }

  void _toggleControls() {
    setState(() => _showControls = !_showControls);
    if (_showControls) {
      _startHideTimer();
    }
  }

  void _onDoubleTapSeek(bool isForward) {
    HapticFeedback.lightImpact();
    final delta = isForward ? 10 : -10;
    _playerService.seekRelative(delta);

    setState(() {
      _seekRipple = delta;
      _showControls = true;
    });

    Future.delayed(const Duration(milliseconds: 600), () {
      if (mounted) {
        setState(() => _seekRipple = 0);
      }
    });

    _startHideTimer();
  }

  void _onBrightnessDrag(DragUpdateDetails details) {
    final delta = -details.primaryDelta! / 150;
    setState(() {
      _brightness = (_brightness + delta).clamp(0.05, 1.0);
      _gestureOverlayText = 'Brightness ${(_brightness * 100).toInt()}%';
      _gestureOverlayIcon = LucideIcons.sun;
    });
    _resetGestureOverlayTimer();
  }

  void _onVolumeDrag(DragUpdateDetails details) {
    final delta = -details.primaryDelta! / 150;
    setState(() {
      _volume = (_volume + delta).clamp(0.0, 1.0);
      _playerService.player.setVolume((_volume * 100).toDouble());
      _gestureOverlayText = 'Volume ${(_volume * 100).toInt()}%';
      _gestureOverlayIcon = _volume == 0 ? LucideIcons.volumeX : LucideIcons.volume2;
    });
    _resetGestureOverlayTimer();
  }

  void _resetGestureOverlayTimer() {
    _gestureOverlayTimer?.cancel();
    _gestureOverlayTimer = Timer(const Duration(milliseconds: 900), () {
      if (mounted) {
        setState(() {
          _gestureOverlayText = null;
          _gestureOverlayIcon = null;
        });
      }
    });
  }

  void _openSpeedPicker() {
    final primaryColor = Theme.of(context).colorScheme.primary;

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.darkSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Playback Speed',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: FastPlayerService.supportedSpeeds.map((speed) {
                    final isSelected = _playerService.currentSpeed == speed;
                    return ChoiceChip(
                      label: Text('${speed}x'),
                      selected: isSelected,
                      selectedColor: primaryColor,
                      backgroundColor: AppColors.darkCard,
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.white : AppColors.darkTextSecondary,
                        fontWeight: FontWeight.w700,
                      ),
                      onSelected: (_) {
                        _playerService.setSpeed(speed);
                        Navigator.of(ctx).pop();
                        setState(() {});
                      },
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  void dispose() {
    _hideTimer?.cancel();
    _posSub?.cancel();
    _durSub?.cancel();
    _playSub?.cancel();
    _playerService.dispose();
    WakelockPlus.disable();
    SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final totalDuration = _duration.inSeconds > 0
        ? _duration
        : Duration(seconds: widget.topic.durationSeconds);

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: Colors.black,
      endDrawer: ClinicalDrawer(
        currentTopic: widget.topic,
        onSeekTimestamp: (sec) {
          _playerService.player.seek(Duration(seconds: sec));
        },
      ),
      body: SafeArea(
        child: Stack(
          children: [
            // Video Surface
            Center(
              child: Video(
                controller: _playerService.controller,
                controls: NoVideoControls,
              ),
            ),

            // Gesture Detector Layer (Tap to toggle controls, Double-tap to seek, Vertical drag for brightness & volume)
            Positioned.fill(
              child: Row(
                children: [
                  // Left half (-10s seek, vertical swipe for Brightness)
                  Expanded(
                    child: GestureDetector(
                      behavior: HitTestBehavior.translucent,
                      onTap: _toggleControls,
                      onDoubleTap: () => _onDoubleTapSeek(false),
                      onVerticalDragUpdate: _onBrightnessDrag,
                    ),
                  ),
                  // Right half (+10s seek, vertical swipe for Volume)
                  Expanded(
                    child: GestureDetector(
                      behavior: HitTestBehavior.translucent,
                      onTap: _toggleControls,
                      onDoubleTap: () => _onDoubleTapSeek(true),
                      onVerticalDragUpdate: _onVolumeDrag,
                    ),
                  ),
                ],
              ),
            ),

            // Seek Ripple Indicator
            if (_seekRipple != 0)
              Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.75),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _seekRipple > 0 ? LucideIcons.fastForward : LucideIcons.rewind,
                        color: Colors.white,
                        size: 22,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${_seekRipple > 0 ? '+' : ''}$_seekRipple s',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            // Brightness / Volume Gesture HUD Indicator
            if (_gestureOverlayText != null && _gestureOverlayIcon != null)
              Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.8),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.white24, width: 1),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(_gestureOverlayIcon, color: Colors.white, size: 22),
                      const SizedBox(width: 10),
                      Text(
                        _gestureOverlayText!,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            // Controls Overlay
            if (_showControls)
              Positioned.fill(
                child: Container(
                  color: Colors.black45,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Top Bar
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        child: Row(
                          children: [
                            IconButton(
                              icon: const Icon(LucideIcons.arrowLeft, color: Colors.white),
                              onPressed: () => context.pop(),
                            ),
                            Expanded(
                              child: Text(
                                widget.topic.title,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                            IconButton(
                              icon: const Icon(LucideIcons.pictureInPicture, color: Colors.white),
                              tooltip: 'Picture in Picture',
                              onPressed: () => _playerService.enterPictureInPicture(),
                            ),
                            IconButton(
                              icon: const Icon(LucideIcons.panelRightOpen, color: Colors.white),
                              tooltip: 'Clinical Drawer',
                              onPressed: () => _scaffoldKey.currentState?.openEndDrawer(),
                            ),
                          ],
                        ),
                      ),

                      // Center Playback Controls
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          IconButton(
                            iconSize: 32,
                            icon: const Icon(LucideIcons.rewind, color: Colors.white),
                            onPressed: () => _onDoubleTapSeek(false),
                          ),
                          const SizedBox(width: 24),
                          Container(
                            decoration: BoxDecoration(
                              color: AppColors.marrowTeal.withOpacity(0.9),
                              shape: BoxShape.circle,
                            ),
                            child: IconButton(
                              iconSize: 42,
                              icon: Icon(
                                _isPlaying ? LucideIcons.pause : LucideIcons.play,
                                color: Colors.white,
                              ),
                              onPressed: () {
                                _playerService.player.playOrPause();
                                _startHideTimer();
                              },
                            ),
                          ),
                          const SizedBox(width: 24),
                          IconButton(
                            iconSize: 32,
                            icon: const Icon(LucideIcons.fastForward, color: Colors.white),
                            onPressed: () => _onDoubleTapSeek(true),
                          ),
                        ],
                      ),

                      // Bottom Scrub Bar & Speed Pill
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        child: Column(
                          children: [
                            SliderTheme(
                              data: SliderTheme.of(context).copyWith(
                                activeTrackColor: AppColors.marrowTeal,
                                inactiveTrackColor: Colors.white24,
                                thumbColor: AppColors.marrowTeal,
                                thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
                                overlayShape: const RoundSliderOverlayShape(overlayRadius: 12),
                              ),
                              child: Slider(
                                value: _position.inSeconds
                                    .clamp(0, totalDuration.inSeconds)
                                    .toDouble(),
                                max: totalDuration.inSeconds > 0
                                    ? totalDuration.inSeconds.toDouble()
                                    : 1.0,
                                onChanged: (val) {
                                  _playerService.player.seek(Duration(seconds: val.toInt()));
                                  _startHideTimer();
                                },
                              ),
                            ),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  '${DurationFormatter.format(_position.inSeconds)} / ${DurationFormatter.format(totalDuration.inSeconds)}',
                                  style: const TextStyle(
                                    color: Colors.white70,
                                    fontSize: 12,
                                  ),
                                ),
                                Row(
                                  children: [
                                    TextButton(
                                      onPressed: _openSpeedPicker,
                                      style: TextButton.styleFrom(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                        backgroundColor: Colors.white12,
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                      ),
                                      child: Text(
                                        '${_playerService.currentSpeed}x',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.w700,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
