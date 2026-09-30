import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../domain/entities/subject.dart';
import '../domain/entities/topic.dart';
import '../domain/entities/note.dart';
import '../presentation/common/custom_bottom_nav.dart';
import '../presentation/screens/auth/medical_sign_in_screen.dart';
import '../presentation/screens/home/home_screen.dart';
import '../presentation/screens/learn/learn_screen.dart';
import '../presentation/screens/downloads/downloads_screen.dart';
import '../presentation/screens/settings/settings_screen.dart';
import '../presentation/screens/search/instant_search_modal.dart';
import '../presentation/screens/subject_detail/subject_detail_screen.dart';
import '../presentation/screens/player/video_player_screen.dart';
import '../presentation/screens/notes/notes_reader_screen.dart';
import '../presentation/state/download_state.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/home',
    routes: [
      // Auth Screen
      GoRoute(
        path: '/sign-in',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const MedicalSignInScreen(),
      ),

      // Instant Search Screen
      GoRoute(
        path: '/search',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const InstantSearchModal(),
      ),

      // Subject Detail Screen
      GoRoute(
        path: '/subject/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          final subject = state.extra as Subject?;
          return SubjectDetailScreen(subjectId: id, initialSubject: subject);
        },
      ),

      // Video Player Screen
      GoRoute(
        path: '/player',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) {
          final topic = state.extra as Topic? ??
              Topic(
                id: 'demo_topic',
                title: 'Acute Coronary Syndrome & MI Management',
                durationSeconds: 2840,
                fileSizeBytes: 240 * 1024 * 1024,
                videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                isWatched: false,
              );
          return VideoPlayerScreen(topic: topic);
        },
      ),

      // Clinical Notes Reader Screen
      GoRoute(
        path: '/notes',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) {
          final note = state.extra as NoteItem? ??
              NoteItem(
                id: 'demo_note',
                subjectCode: 'MED',
                title: 'High-Yield Clinical Medicine Review',
                pageCount: 84,
                fileSizeBytes: 42 * 1024 * 1024,
                pdfUrl: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf',
              );
          return NotesReaderScreen(note: note);
        },
      ),

      // Bottom Navigation Stateful Shell
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          final downloadMap = ref.watch(downloadProvider);
          final activeDownloadsCount = downloadMap.values
              .where((d) => d.status == DownloadStatus.downloading)
              .length;

          return Scaffold(
            extendBody: true,
            body: navigationShell,
            bottomNavigationBar: CustomBottomNav(
              currentIndex: navigationShell.currentIndex,
              activeDownloadsCount: activeDownloadsCount,
              onTap: (index) => navigationShell.goBranch(
                index,
                initialLocation: index == navigationShell.currentIndex,
              ),
            ),
          );
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/home',
                builder: (context, state) => const HomeScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/learn',
                builder: (context, state) => const LearnScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/downloads',
                builder: (context, state) => const DownloadsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/settings',
                builder: (context, state) => const SettingsScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});
