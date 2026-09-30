# 🏥 Aspirin LMS: Flutter Android Application Specification

**Platform:** Android (Optimized for Android 8.0+ / API 26 to Android 15 / API 35)  
**Target Audience:** MBBS Students (1st–Final Prof), Interns, and Medical PG Aspirants (NEET PG, INI-CET, FMGE, USMLE)  
**Aesthetic Inspiration:** Marrow (Clinical depth & sleek dark theme) & PrepLadder (Structured syllabus & rapid recall)  
**Cloud Backend & Storage:** Microsoft SharePoint (25 TB Document Library) delivered via Cloudflare Workers Edge CDN  

---

## 1. Product Vision & Principles

Aspirin LMS Mobile brings the high-yield learning experience of India's premier medical PG prep platforms into a native, high-performance Flutter mobile application. Medical students routinely spend 6–10 hours a day studying heavy video lectures and clinical revision notes. The application is built around five non-negotiable principles:

1. **Zero-Friction Re-entry:** The Home screen prioritizes immediate resumption of the last watched video lecture with exact timestamp persistence.
2. **Clinical NMC Hierarchy:** Complete curriculum navigation structured strictly around the 19 MBBS subjects categorized by University Professional Exam phases.
3. **Multi-Platform Content Aggregation:** Seamless switching between PrepLadder (English/Hinglish), Marrow Edition 6, and Cerebellum Academy.
4. **Zero-Buffering High-Bitrate Playback:** 100+ Mbps direct streaming via Microsoft Azure CDN with full HTTP 206 byte-range seeking up to 2.5x speed without audio distortion.
5. **Resilient Background Offline Downloads:** Download full lectures (150MB–800MB) and comprehensive PDF textbooks (up to 950MB) via native Android foreground services that survive phone sleep and app suspension.

---

## 2. Design System & Aesthetics (Marrow vs. PrepLadder)

### 2.1 The Dual-Theme Archetype
The app supports an intelligent theme engine allowing students to switch between the signature visual styles of both leading platforms:

| Visual Attribute | Marrow Archetype | PrepLadder Archetype | Aspirin Hybrid Specification |
| :--- | :--- | :--- | :--- |
| **Primary Accent** | Marrow Teal (`#00A389`) | PrepLadder Indigo (`#6366F1`) | Dual switchable accent tokens with dynamic glow filters |
| **Dark Canvas** | Deep Medical Slate (`#0B0F19`) | Midnight Navy (`#0F172A`) | Pure OLED Black (`#000000`) & Deep Slate (`#0B0F19`) |
| **Card Style** | Minimalist 1px border (`#1E293B`) | Elevated cards with badges | Frosted dark cards with subtle 1px border & elevation |
| **Active Indicators** | Teal dot & progress ring | Indigo pill & badge | Circular progress rings with active glow accents |

### 2.2 Palette Tokens
```dart
class AspirinColors {
  // Canvas & Surfaces
  static const Color darkBackground = Color(0xFF0B0F19);
  static const Color darkSurface = Color(0xFF131B2E);
  static const Color darkCard = Color(0xFF1E293B);
  static const Color darkBorder = Color(0xFF334155);

  static const Color lightBackground = Color(0xFFF8FAFC);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightCard = Color(0xFFFFFFFF);
  static const Color lightBorder = Color(0xFFE2E8F0);

  // Marrow Theme
  static const Color marrowTeal = Color(0xFF00A389);
  static const Color marrowTealLight = Color(0xFF00D1B0);
  static const Color marrowTealGlow = Color(0x3300A389);

  // PrepLadder Theme
  static const Color prepIndigo = Color(0xFF6366F1);
  static const Color prepIndigoLight = Color(0xFF818CF8);
  static const Color prepIndigoGlow = Color(0x336366F1);

  // Status & Feedback
  static const Color highYieldAmber = Color(0xFFF59E0B);
  static const Color verifiedEmerald = Color(0xFF10B981);
  static const Color warningRose = Color(0xFFF43F5E);
}
```

### 2.3 Typography
* **Heading & Display:** `Outfit` (600/700 weight) for subject titles, lecture headings, and professional exam banners.
* **Body & Data:** `Plus Jakarta Sans` or `Inter` (400/500/600 weight) for extreme clarity when rendering dense clinical terms, dosages, and diagnostic criteria.

---

## 3. Screen Specifications & Wireframe Hierarchy

### 3.1 App Shell & Navigation
The root application utilizes a persistent bottom navigation bar (`GoRouter` StatefulShellRoute):
* 🏠 **Home**: Quick search, last watched video hero card, continue subjects, recommended notes.
* 📚 **Learn**: Full 19 MBBS subjects syllabus categorized by university prof, with platform toggle.
* 💾 **Downloads**: Device storage breakdown, downloaded lectures, downloaded clinical notes.
* ⚙️ **Settings**: Appearance mode, video streaming quality, storage management, cloud sync status.
* *(Note: Practice / QBank is explicitly excluded from scope).*

---

### 3.2 🏠 Home Screen ("Command Center")

```
┌──────────────────────────────────────────────────────────┐
│  [Avatar]  Aspirin Medical LMS       🔥 14 Days  [Cloud] │
├──────────────────────────────────────────────────────────┤
│  🔍  Search 3,950+ topics, faculty, pearls...      [⚙️]  │
├──────────────────────────────────────────────────────────┤
│  ┌─ RESUME WHERE YOU LEFT ─────────────────────────────┐ │
│  │ ┌──────────────┐  General Surgery • Final Prof      │ │
│  │ │ [Thumbnail]  │  Intestinal Obstruction & Volvulus │ │
│  │ │ 34:12 / 52:00│  Dr. Rohan Khandelwal              │ │
│  │ └──────────────┘  [████████████░░░░] 18m remaining  │ │
│  │                                 [ ▶ RESUME LECTURE ]│ │
│  └─────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────┤
│  CONTINUE YOUR SUBJECTS                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Pharmacology │  │ Pathology    │  │ Anatomy      │    │
│  │ (68% Done)   │  │ (42% Done)   │  │ (91% Done)   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
├──────────────────────────────────────────────────────────┤
│  HIGH-YIELD CLINICAL NOTES & ATLASES                     │
│  ┌────────────────────────┐  ┌────────────────────────┐  │
│  │ Anatomy Master Atlas   │  │ Robbins Review Notes   │  │
│  │ 955 MB • 420 Pages     │  │ 180 MB • 160 Pages     │  │
│  │ [Read PDF]  [Download] │  │ [Read PDF]  [Download] │  │
│  └────────────────────────┘  └────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

1. **Top App Bar:**
   * User profile chip with clinical year tag (e.g. *Final Year Student*).
   * Study streak indicator with daily watch goal tracker (`🔥 14-day streak • 3.2 hrs today`).
   * Connection status icon (Online green pulse / Offline amber badge).

2. **Prominent Search Bar:**
   * Tapping navigates into the full-screen Instant Search Delegate.
   * Subtle pill styling with glassmorphism border and instant accessibility.

3. **"Resume Where I Left" Hero Card (Top Visual Hierarchy):**
   * High-contrast card with subtle gradient highlight matching the active theme accent.
   * High-resolution video thumbnail generated dynamically from SharePoint or cached locally.
   * Badge showing subject name and university prof phase.
   * Topic title, faculty name, and elapsed vs total duration.
   * Progress bar with exact remaining minutes (`18m remaining`).
   * Primary action button: **"Resume Lecture"** jumping straight into the video player at the exact saved second.

4. **"Continue Your Subjects" Carousel:**
   * Horizontal slider of active subjects with circular progress gauges.

5. **"High-Yield Clinical Notes & Atlases":**
   * Curated quick links to master PDF review books and lecture slides.

---

### 3.3 📚 Learn Screen ("19 Subjects by Prof")

```
┌──────────────────────────────────────────────────────────┐
│  📚 Curriculum Syllabus                                  │
├──────────────────────────────────────────────────────────┤
│  [ PrepLadder (EN) ] [ PrepLadder (HI) ] [ Marrow E6 ]   │
├──────────────────────────────────────────────────────────┤
│  ▼ 1ST PROF (PRE-CLINICAL)                      3 Subjects│
│  ┌─────────────────────────────────────────────────────┐ │
│  │ 🦴 Anatomy                                   84% ◯  │ │
│  │    84 Lectures • 12 Modules • 14 Notes • 48 hrs     │ │
│  ├─────────────────────────────────────────────────────┤ │
│  │ 🫀 Physiology                                60% ◯  │ │
│  │    62 Lectures • 9 Modules • 10 Notes • 36 hrs      │ │
│  ├─────────────────────────────────────────────────────┤ │
│  │ 🧬 Biochemistry                              45% ◯  │ │
│  │    50 Lectures • 7 Modules • 8 Notes • 28 hrs       │ │
│  └─────────────────────────────────────────────────────┘ │
│  ► 2ND PROF (PARA-CLINICAL)                     4 Subjects│
│  ► 3RD PROF PART 1 (MINOR CLINICAL)             3 Subjects│
│  ► FINAL PROF PART 2 (MAJOR CLINICAL)           9 Subjects│
└──────────────────────────────────────────────────────────┘
```

1. **Platform Selector Segmented Control:**
   * Horizontal scrollable pill buttons:
     * `PrepLadder Edition X (English)`
     * `PrepLadder Edition X (Hinglish)`
     * `Marrow Edition 6`
     * `Cerebellum Academy`
   * Switching platforms dynamically filters the subject catalog, lecture counts, and faculty rosters.

2. **4 University Prof Accordions:**
   * **1st Prof (Pre-Clinical):** Anatomy, Physiology, Biochemistry.
   * **2nd Prof (Para-Clinical):** Pathology, Pharmacology, Microbiology, Forensic Medicine & Toxicology.
   * **3rd Prof Part 1 (Minor Clinical):** Community Medicine (PSM), Ophthalmology, ENT.
   * **Final Prof Part 2 (Major Clinical):** General Medicine, General Surgery, OB/GYN, Pediatrics, Orthopedics, Dermatology, Psychiatry, Radiology, Anesthesiology.

3. **Subject Card Elements:**
   * Custom medical specialty icon.
   * Subject title & syllabus metrics (`Lectures • Modules • Notes • Hours`).
   * Circular progress ring showing verified topic completion.
   * Tapping opens the **Subject Detail Screen**.

---

### 3.4 📖 Subject Detail Screen

* **Hero Banner:** Subject title, lead faculty avatar, total watch duration, overall progress bar.
* **Platform Filter Dropdown:** Quick switcher for comparing curriculum versions.
* **Tab Navigation:**
  * **Tab 1: Lectures (Videos)**
    * Grouped into collapsible **Modules / Chapters** (e.g. *Module 1: Upper Limb Anatomy - 12 Lectures*).
    * Lecture items show:
      * Status indicator: Checked (Completed), Half-circle (In Progress), Play (Unwatched).
      * Lecture title and duration (`28:15`).
      * **Download Action Button**: Cloud icon (available) ➔ Animated circular progress (downloading) ➔ Solid checkmark (saved offline).
  * **Tab 2: Notes & Review Books (PDFs)**
    * Accompanying lecture slides, review guides, and full textbooks.
    * Metadata: File size (`45.2 MB`), page count (`184 pages`), offline download button.
    * Tapping immediately opens the built-in PDF viewer.

---

### 3.5 🎬 High-Yield Clinical Video Player

Built using `media_kit` (MPV native wrapper) for high-performance hardware decoding on Android.

```
┌──────────────────────────────────────────────────────────┐
│ [←] Topic Title: Intestinal Obstruction             [⚙️] │
│                                                          │
│                     [ ⏪ 10s ]  [ ⏸ ]  [ ⏩ 10s ]          │
│                                                          │
│ 14:20 ═════════════════●════════════════════════ 42:15   │
│ [1.0x] [1.25x] [1.5x] [1.75x] [2.0x] [2.5x]    [⛶ Full]  │
├──────────────────────────────────────────────────────────┤
│  [ Module Playlist ]  [ Clinical Pearls ]  [ My Notes ]  │
├──────────────────────────────────────────────────────────┤
│  • Next: Sigmoid Volvulus & Cecal Volvulus (24:10)       │
│  • Next: Intussusception in Children (18:30)             │
└──────────────────────────────────────────────────────────┘
```

1. **Player Core & Gestures:**
   * 16:9 viewport with automatic landscape sensor rotation.
   * Left-half vertical swipe: Screen brightness adjustment.
   * Right-half vertical swipe: Media volume adjustment.
   * Double-tap on left/right screen half: Instant 10s rewind / fast-forward.
   * Native Android **Picture-in-Picture (PiP)** mode for multitasking while referencing notes.
2. **Speed Selector & Memory:**
   * Dedicated speed pills: `0.75x`, `1.0x`, `1.25x`, `1.5x`, `1.75x`, `2.0x`, `2.5x` with pitch-corrected audio.
   * **Persistent Speed Memory:** The app remembers the student's preferred playback speed across sessions.
3. **Audio-Only Mode (Screen-Off Listening):**
   * Dedicated headphone/listen mode toggle. Turns off video rendering and continues streaming audio while the phone screen is locked or in other apps (ideal for ward duty and commutes).
4. **Automatic 90% Completion Threshold:**
   * When `watched_seconds >= total_seconds * 0.90`, the lecture is automatically marked as `is_completed = 1` with a green checkmark in the syllabus and synced to the cloud.
5. **Video Quality Selector:**
   * Settings menu offering: `Auto`, `1080p (Full HD)`, `720p (HD)`, `480p (Data Saver)`.
6. **Clinical Drawer (Below Video):**
   * **Playlist:** Next/previous lectures in the active module with auto-play countdown.
   * **High-Yield Pearls & Treasures:** Key exam mnemonics, tables, and recall criteria pinned to this video.
   * **Timestamped Personal Notes:** Students can take notes pinned to the current timestamp (e.g. `14:20 - Rule of 9s in Burns`).

---

### 3.6 📄 Clinical Notes & PDF Reader (`pdfrx`)
* **Engine:** Built on `pdfrx` (PDFium native backend) to render 500MB–950MB master textbooks smoothly.
* **Features:**
  * Multi-touch pinch-to-zoom with sub-pixel rendering.
  * Inverted / Dark Reading Mode for late-night ward reading.
  * Page scrubber slider with quick-jump thumbnail previews.
  * Bookmark manager for flagging high-yield pages.

---

### 3.7 💾 Downloads Screen & Offline Storage
* **Storage Consumption Bar:**
  * Free device storage (GB).
  * Space used by Aspirin video lectures (GB).
  * Space used by Aspirin clinical notes (MB).
* **Downloaded Media Lists:**
  * Tabbed view: `Videos` and `Notes`.
  * Filter by subject and platform.
  * Individual delete or batch cleanup.
  * Offline indicators ensuring 100% functionality without internet.
* **Network Preference:**
  * Toggle in Settings: `"Download only on Wi-Fi"`.

---

## 4. Marrow & PrepLadder Feature Parity Matrix (In-Scope)

This matrix audits all signature learning and video features from **Marrow** and **PrepLadder** that fall within our scope (excluding QBank/Tests):

| Domain | Standard Feature | Marrow Equivalent | PrepLadder Equivalent | Aspirin Implementation Status |
| :--- | :--- | :--- | :--- | :--- |
| **Video Playback** | **One-Tap Auto-Resume** | "Continue Watching" | "Jump Back In" | ✅ **Implemented**: Hero card on Home with exact second resume & time left |
| **Video Playback** | **90% Completion Threshold** | Watched Checkmark | Completed Ring | ✅ **Implemented**: Auto-marks topic completed at 90% watch time |
| **Video Playback** | **0.75x to 2.5x Speeds** | Standard 0.5x–2.0x | Standard 0.75x–2.5x | ✅ **Implemented**: 7 speed presets with pitch correction (`scaletempo2`) |
| **Video Playback** | **Persistent Speed Memory** | Remembers speed | Remembers speed | ✅ **Implemented**: Global user preference stored in local settings |
| **Video Playback** | **Audio-Only / Screen-Off Mode** | Audio Mode | Background Play | ✅ **Implemented**: Native foreground audio service for ward rounds |
| **Video Playback** | **Gesture Controls** | ±10s double-tap, swipe | ±10s seek, swipe vol | ✅ **Implemented**: Left-half brightness, right-half volume, double-tap 10s seek |
| **Video Playback** | **Picture-in-Picture (PiP)** | Android PiP | Android PiP | ✅ **Implemented**: Native Android PiP for note-taking multitasking |
| **Video Playback** | **Timestamped Annotations** | Bookmarks & Notes | Video Bookmarks | ✅ **Implemented**: Pin personal notes to exact timestamp with search |
| **Curriculum** | **19 MBBS Subjects by Prof** | 1st to Final Prof | 1st to 4th Year | ✅ **Implemented**: 4 NMC University Prof collapsible accordions |
| **Curriculum** | **Module / Chapter Hierarchy** | Structured Syllabus | Subject Modules | ✅ **Implemented**: Collapsible chapters with duration & completion dots |
| **Curriculum** | **Platform / Language Switcher** | Edition Switcher | English vs. Hinglish | ✅ **Implemented**: 4-way platform toggle (PrepX EN, PrepX HI, Marrow E6, Cerebellum) |
| **High-Yield Recall** | **Pearls & Treasures** | **Marrow Pearls** | **PrepLadder Treasures** | ✅ **Implemented**: High-Yield Pearls/Treasures drawer in player & notes |
| **Notes & Atlases** | **Master Review Textbooks** | Edition Notes | Revision Books | ✅ **Implemented**: 24 Master textbooks + individual topic review slides |
| **Notes & Atlases** | **In-App PDF Viewer** | Embedded PDF | Integrated Notes | ✅ **Implemented**: PDFium engine (`pdfrx`) with night mode, zoom, & bookmarks |
| **Downloads** | **Background Media Transfers** | Offline Videos | Offline Downloads | ✅ **Implemented**: `background_downloader` WorkManager with speed notification |
| **Downloads** | **Wi-Fi Only Preference** | Wi-Fi Only Switch | Wi-Fi Only Switch | ✅ **Implemented**: Settings toggle preventing cellular data consumption |
| **Downloads** | **Storage Management** | Clear Cache | Manage Storage | ✅ **Implemented**: Storage breakdown gauge with batch delete |
| **Home & Search** | **Prominent Global Search** | Search Bar | Universal Search | ✅ **Implemented**: Fast debounced search across topics, faculty, & pearls |
| **Home & Search** | **Study Streak & Daily Goals** | Daily Streak | ME Tab Analytics | ✅ **Implemented**: Study streak counter + daily watch hour goal tracker |
| **Home & Search** | **"Continue Subjects" Tracker** | Recent Subjects | Subject Progress | ✅ **Implemented**: Horizontal carousel with circular completion percentages |

