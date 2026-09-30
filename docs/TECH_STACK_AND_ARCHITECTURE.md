# 🏗️ Technical Stack & Software Architecture

This document defines the architectural patterns, state management standards, database schema, and dependency registry for the Aspirin LMS Flutter Android app.

---

## 1. Architectural Philosophy: Clean Architecture + Feature-First

The application adopts **Clean Architecture** layered within **Feature Folders** to ensure loose coupling, high testability, and clear separation of concerns.

```
lib/
├── app/                           # Global Application Configuration
│   ├── app.dart                   # MaterialApp.router with global providers
│   ├── router.dart                # GoRouter shell route definitions
│   └── theme/                     # Marrow Teal & PrepLadder Indigo theme tokens
├── core/                          # Cross-Cutting Infrastructure
│   ├── constants/                 # API endpoints, storage keys, channel IDs
│   ├── network/                   # Dio HTTP client, interceptors, error handling
│   ├── storage/                   # Drift SQLite database, SecureStorage
│   └── utils/                     # Formatters (duration, bytes, NMC prof labels)
├── features/                      # Modular Business Features
│   ├── home/                      # Home screen, resume hero card, continue subjects
│   ├── learn/                     # 19 subjects grid, prof accordions, platform toggle
│   ├── subject_detail/            # Modules list, lecture items, notes list
│   ├── player/                    # media_kit video player, gestures, clinical drawer
│   ├── notes_reader/              # pdfrx clinical PDF viewer, night mode
│   ├── downloads/                 # background_downloader service, storage gauge
│   ├── search/                    # Global debounced instant search overlay
│   └── settings/                  # Themes, download quality, device session info
```

### Layer Breakdown per Feature:
* **`presentation/`**: Flutter UI Widgets, Screens, and Riverpod `AsyncNotifier` state controllers.
* **`domain/`**: Pure Dart Entities, Value Objects, and abstract Repository interfaces. No Flutter UI imports.
* **`data/`**: Data Transfer Objects (DTOs), API Clients, Local Database DAOs, and concrete Repository implementations.

---

## 2. State Management Standard: Riverpod 2.x

The app uses `flutter_riverpod` with `@riverpod` annotations and `AsyncNotifier` to ensure compile-time type safety, automatic disposal of unused resources, and declarative state caching.

### 2.1 State Management Rules:
1. **No `setState` for Business Logic:** Screens must remain declarative. Local ephemeral widget state (e.g. animation controllers) may use `StatefulWidget`, but all data operations go through Riverpod providers.
2. **AutoDispose by Default:** Providers attached to specific screens (like a subject's modules list) automatically dispose when the student navigates away, saving RAM on budget Android devices.
3. **Optimistic Updates:** Toggling lecture completion or bookmarks updates the UI instantly, while the background sync worker queues the change for Cloudflare D1.

### 2.2 Example: Active Platform & Curriculum Notifier
```dart
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'platform_provider.g.dart';

enum PlatformId { prepxEn, prepxHi, marrowE6, cerebellum }

@riverpod
class ActivePlatformNotifier extends _$ActivePlatformNotifier {
  @override
  PlatformId build() {
    // Default to PrepLadder Edition X English
    return PlatformId.prepxEn;
  }

  void switchPlatform(PlatformId platform) {
    state = platform;
  }
}
```

---

## 3. Local Database Schema: Drift (Type-Safe SQLite)

To support **100% offline study** in hospital basements or areas with poor cellular reception, the local Drift SQLite database replicates the Cloudflare D1 relational schema:

```dart
import 'package:drift/drift.dart';

class SubjectsTable extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get code => text()();
  TextColumn get prof => text()(); // 1st Prof, 2nd Prof, 3rd Prof Part 1, Final Prof Part 2
  TextColumn get category => text()(); // Pre-Clinical, Para-Clinical, Clinical
  TextColumn get icon => text()();
  TextColumn get color => text()();
  IntColumn get displayOrder => integer()();

  @override
  Set<Column> get primaryKey => {id};
}

class ModulesTable extends Table {
  TextColumn get id => text()();
  TextColumn get subjectId => text().references(SubjectsTable, #id)();
  TextColumn get title => text()();
  IntColumn get displayOrder => integer().withDefault(const Constant(1))();

  @override
  Set<Column> get primaryKey => {id};
}

class TopicsTable extends Table {
  TextColumn get id => text()();
  TextColumn get subjectId => text().references(SubjectsTable, #id)();
  TextColumn get moduleId => text().references(ModulesTable, #id)();
  TextColumn get title => text()();
  TextColumn get filename => text()();
  IntColumn get fileSizeBytes => integer()();
  IntColumn get durationSeconds => integer().withDefault(const Constant(1800))();
  TextColumn get durationFormatted => text().withDefault(const Constant('30 mins'))();
  IntColumn get telegramChatId => integer()();
  IntColumn get telegramMessageId => integer()();
  TextColumn get pearlsJson => text().withDefault(const Constant('[]'))();
  IntColumn get displayOrder => integer().withDefault(const Constant(1))();

  @override
  Set<Column> get primaryKey => {id};
}

class NotesTable extends Table {
  TextColumn get id => text()();
  TextColumn get subjectId => text().references(SubjectsTable, #id)();
  TextColumn get title => text()();
  TextColumn get filename => text()();
  IntColumn get fileSizeBytes => integer()();
  IntColumn get telegramChatId => integer()();
  IntColumn get telegramMessageId => integer()();

  @override
  Set<Column> get primaryKey => {id};
}

class UserProgressTable extends Table {
  TextColumn get userId => text().withDefault(const Constant('aspirin_guest'))();
  TextColumn get topicId => text().references(TopicsTable, #id)();
  RealColumn get watchedSeconds => real().withDefault(const Constant(0.0))();
  RealColumn get totalSeconds => real().withDefault(const Constant(1800.0))();
  IntColumn get isCompleted => integer().withDefault(const Constant(0))();
  IntColumn get isBookmarked => integer().withDefault(const Constant(0))();
  DateTimeColumn get lastWatchedAt => dateTime().nullable()();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {userId, topicId};
}

class OfflineDownloadsTable extends Table {
  TextColumn get id => text()(); // topicId or noteId
  TextColumn get mediaType => text()(); // 'video' | 'note'
  TextColumn get localFilePath => text()();
  IntColumn get fileSizeBytes => integer()();
  TextColumn get downloadStatus => text()(); // 'queued', 'downloading', 'completed', 'paused', 'failed'
  RealColumn get downloadProgress => real().withDefault(const Constant(0.0))();
  DateTimeColumn get completedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}
```

---

## 4. Key Flutter Dependencies & Package Registry

```yaml
name: aspirin_lms
description: "Aspirin Medical LMS: High-Yield Lecture Streaming & Notes for Android"
publish_to: "none"
version: 1.0.0+1

environment:
  sdk: ">=3.4.0 <4.0.0"
  flutter: ">=3.24.0"

dependencies:
  flutter:
    sdk: flutter

  # UI & Styling
  google_fonts: ^6.2.1
  lucide_icons: ^0.257.0
  shimmer: ^3.0.0
  flutter_svg: ^2.0.10+1

  # Navigation & Routing
  go_router: ^14.2.7

  # State Management
  flutter_riverpod: ^2.5.1
  riverpod_annotation: ^2.3.5

  # Video Playback Engine (Hardware Accelerated MPV)
  media_kit: ^1.1.11
  media_kit_video: ^1.2.5
  media_kit_libs_android_video: ^1.3.8

  # Clinical Notes & PDF Rendering
  pdfrx: ^1.0.86

  # Native Background Downloads
  background_downloader: ^8.5.1

  # Local Type-Safe Database
  drift: ^2.18.0
  drift_flutter: ^0.1.0
  sqlite3_flutter_libs: ^0.5.24

  # Networking & API
  dio: ^5.6.0
  connectivity_plus: ^6.0.5

  # Authentication
  clerk_flutter: ^0.0.18-beta

  # Device Hardware & Utilities
  path_provider: ^2.1.4
  wakelock_plus: ^1.2.8
  flutter_secure_storage: ^9.2.2
  device_info_plus: ^10.1.1

dev_dependencies:
  flutter_test:
    sdk: flutter
  build_runner: ^2.4.11
  riverpod_generator: ^2.4.0
  drift_dev: ^2.18.0
  flutter_lints: ^4.0.0
```

---

## 5. Security & Account Sharing Protection

1. **Local Secure Keystore (`flutter_secure_storage`):**
   * Stores user session tokens, Clerk credentials, and hardware device UUID in the Android hardware-backed Keystore (`KeyStore` API).
2. **Device Hardware Fingerprinting:**
   * Uses `device_info_plus` to generate a unique SHA-256 device fingerprint (`build.fingerprint` + `androidId`).
   * Validated on every video stream request against Cloudflare D1 `user_active_sessions` to enforce the **1-Device Active Session Policy**.
