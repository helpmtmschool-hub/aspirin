# Aspirin LMS (Project Context & Developer Handbook)

> **Document Purpose:** This file contains all architecture decisions, data models, cloud infrastructure credentials mapping, pipeline specs, and frontend blueprints. Any developer or AI assistant starting a new session can read this single file to immediately understand the entire system and continue building the application without missing any context.

---

## 1. 🏥 Project Overview & Identity
* **Project Name:** Aspirin LMS (Codename: `Yui` / `aspirin`)
* **Repository:** `https://github.com/helpmtmschool-hub/aspirin` (Branch: `main`)
* **Mission:** A high-performance, edge-accelerated Medical Learning Management System designed for MBBS students and NEET PG / INI-CET aspirants.
* **Core Value:** Instant, zero-buffering video streaming of **3,950+ medical lectures** and high-yield PDF clinical review notes across all **19 MBBS subjects**, organized by clinical profs and faculty tracks, backed by a **25 TB Microsoft SharePoint Document Library** and delivered via **Cloudflare Workers Edge CDN**.

---

## 2. 🏗️ High-Level System Architecture

```mermaid
flowchart TD
    subgraph Sourcing ["1. Content Sourcing (Telegram)"]
        TG["Telegram Channel: Prep X + Cerebellum<br/>ID: -1003709841202<br/>4,015 Indexed Messages"]
    end

    subgraph Pipeline ["2. Cloud Migration Pipeline (GitHub Actions)"]
        GHA["Scheduled Runner (cron: 0 */4 * * *)<br/>engine/telegram_to_onedrive.py"]
        FAST_DL["4x MTProto Worker Pool<br/>512 KiB chunks (Official TG Desktop Spec)"]
        SSD_STAGE["NVMe Temp Staging<br/>(/tmp/tmp_msg_*.mp4)"]
        OD_UP["Microsoft Graph API<br/>20 MiB chunked upload (30-60 MB/s)"]
        MANIFEST["engine/transfer_manifest.json<br/>(Git committed to main)"]

        TG -->|4 MTProto Connections| FAST_DL
        FAST_DL --> SSD_STAGE
        SSD_STAGE -->|Chunked PUT| OD_UP
        OD_UP --> MANIFEST
    end

    subgraph CloudStorage ["3. Cloud Storage (Microsoft 365)"]
        SP["25 TB SharePoint Document Library<br/>5ncjwt.sharepoint.com/Shared Documents/Aspirin_LMS/"]
        OD_UP --> SP
    end

    subgraph EdgeAPI ["4. Edge Routing (Cloudflare Pages / Workers)"]
        CF_WORKER["Hono Edge Worker<br/>functions/api/[[route]].ts"]
        TOKEN_CACHE["In-Memory OAuth Token Cache<br/>login.microsoftonline.com"]
        GRAPH_RESOLVE["Graph @microsoft.graph.downloadUrl<br/>Short-lived signed direct download link"]

        CF_WORKER --> TOKEN_CACHE
        CF_WORKER --> GRAPH_RESOLVE
        GRAPH_RESOLVE --> SP
    end

    subgraph Client ["5. Frontend Web Application (React + Vite)"]
        BROWSER["Student Browser / Web App"]
        PLAYER["Custom VideoPlayer.tsx<br/>(0.75x-2.5x, Notes, Bookmarks)"]
        PDF_VIEW["NotesAtlas.tsx & NotesViewer.tsx<br/>(High-Yield Clinical Review Books)"]

        BROWSER -->|GET /api/stream/:chat/:msg| CF_WORKER
        CF_WORKER -->|HTTP 302 Redirect (Zero CF Egress)| MS_CDN["Microsoft Global Azure CDN"]
        MS_CDN -->|Direct 100+ Mbps Byte-Range Stream| PLAYER
        BROWSER --> PDF_VIEW
    end
```

---

## 3. 📂 Storage Hierarchy (SharePoint 25 TB)

The files are structured in `/Shared Documents/Aspirin_LMS/` on `5ncjwt.sharepoint.com`:

```text
Aspirin_LMS/
├── 01_PrepLadder_X_English/
│   ├── 01_Anatomy/
│   ├── 02_Physiology/
│   ├── 03_Biochemistry/
│   ├── 04_Pathology/
│   ├── 05_Pharmacology/
│   ├── 06_Microbiology/
│   ├── 07_Forensic_Medicine/
│   ├── 08_Community_Medicine_PSM/
│   ├── 09_Ophthalmology/
│   ├── 10_ENT/
│   ├── 11_General_Medicine/        <-- Priority Tier 1 (In Progress)
│   ├── 12_General_Surgery/
│   ├── 13_Obstetrics_and_Gynecology/
│   ├── 14_Pediatrics/
│   ├── 15_Psychiatry/
│   ├── 16_Orthopedics/
│   ├── 17_Anesthesiology/
│   ├── 18_Radiology/
│   └── 19_Dermatology/
├── 02_PrepLadder_X_Hinglish/
│   ├── 01_Anatomy/ ... 19_Dermatology/
├── 03_Cerebellum_Academy/
│   ├── 00_Notes_PDF/               <-- 24 Master PDF Textbooks
│   │   ├── Anatomy (Dr. Shrikant Verma).pdf (955 MB)
│   │   ├── Biochemistry (Dr. Ankur Jain).pdf (515 MB)
│   │   ├── Biochemistry (Dr. Smily Pruthi).pdf (182 MB)
│   │   └── ...
│   ├── 01_Anatomy/
│   ├── 03_Biochemistry_Dr_Ankur_Jain/
│   ├── 03_Biochemistry_Dr_Smily_Pruthi/
│   ├── 06_Microbiology_Dr_Devyani_Puri/
│   ├── 06_Microbiology_Dr_Priyanka_Sachdev/
│   └── ... (22 Faculty Subject Tracks)
└── 04_Marrow_Edition_6/
    ├── 09_Ophthalmology/
    ├── 10_ENT/
    ├── 12_General_Surgery/         <-- Currently Active Transfer
    ├── 13_Obstetrics_and_Gynecology/
    ├── 14_Pediatrics/
    ├── 15_Psychiatry/
    ├── 16_Orthopedics/
    ├── 17_Anesthesiology/
    ├── 18_Radiology/
    └── 19_Dermatology/
    *(Note: 11_General_Medicine is strictly excluded from Marrow transfers)*
```

---

## 4. 🗃️ Master Channels Index

### Primary Channel 1: PrepLadder Edition X + Cerebellum Academy (`engine/prepx_sections.json`)
* **Telegram Channel ID:** `-1003709841202`
* **Total Messages:** 4,015 (Msgs 3 to 4017)
* **Real Media Files:** ~3,950+ lectures and PDFs (~60 text divider separators)
* **Platform Distribution:**
  1. `prepx_en` (PrepLadder English): **1,214 items** across 19 subjects (Msgs 3–1216)
  2. `prepx_hi` (PrepLadder Hinglish): **1,165 items** across 19 subjects (Msgs 1217–2381)
  3. `cerebellum` (Cerebellum Academy): **1,636 items** across 22 faculty tracks (Msgs 2382–4017)
  4. `notes_pdf`: **24 master textbooks** (Msgs 3994–4017)

### Primary Channel 2: Marrow Edition 6 Master Repository (`engine/marrow_sections.json`)
* **Telegram Channel ID:** `-1003264222864`
* **Focus Scope:** Final-Year MBBS & NEET-PG Clinical Subjects (High-Yield Clinical Videos Only).
* **Final Year Distribution (504 verified high-bitrate lectures, 0 dummy clips):**
  1. Surgery: **82 lectures** (Msgs 340–418)
  2. Obstetrics & Gynecology (OBG): **109 lectures** (Msgs 476–585)
  3. Pediatrics: **57 lectures** (Msgs 419–475)
  4. Orthopedics: **29 lectures** (Msgs 252–280)
  5. Dermatology: **28 lectures** (Msgs 281–308)
  6. Psychiatry: **24 lectures** (Msgs 1–24)
  7. Radiology: **41 lectures** (Msgs 25–65)
  8. Anesthesiology: **31 lectures** (Msgs 309–339)
  9. Ophthalmology: **40 lectures** (Msgs 211–251)
  10. ENT: **63 lectures** (Msgs 148–210)
* **Explicit Exclusion:** **Marrow Medicine is NEVER transferred.** PrepLadder Medicine serves as the primary master medicine track.

### 4-Tier Automated Queue Priority (Videos-Only Mode)
The migration pipeline (`engine/telegram_to_onedrive.py`) processes lectures in a strict clinical tier sequence:
1. **Tier 1 — Marrow Final Year (Clinical):** Surgery ➔ OBG ➔ Pediatrics ➔ Orthopedics ➔ Dermatology ➔ Psychiatry ➔ Radiology ➔ Anesthesia ➔ Ophthalmology ➔ ENT. *(Marrow Medicine strictly barred: rank 999).*
2. **Tier 2 — PrepLadder Final Year (Clinical):** `prepx_en` processed ahead of `prepx_hi`. (Includes completed PrepLadder Medicine).
3. **Tier 3 — Marrow Remaining Pre-/Para-Clinical Years:** (3rd, 2nd, and 1st Prof subjects).
4. **Tier 4 — PrepLadder Remaining Pre-/Para-Clinical Years:** `prepx_en` before `prepx_hi`.
5. **Tier 5 — Cerebellum Academy:** Remaining clinical tracks.

---

## 5. 🛡️ 100% Anti-Ban Telegram MTProto Specifications

To prevent any rate limits or account bans on the authenticated Telegram account (User ID `5188277368`):
1. **Concurrency Cap = 4:** Strictly bounded to 4 parallel chunk workers (exactly matching official Telegram Desktop client spec: `kMaxConcurrentFileRequests = 4`).
2. **Chunk Part Size = 512 KiB (`TG_PART_SIZE`):** Telegram API requires 512 KiB parts. Passing partial or odd byte sizes results in `LimitInvalidError`. Telegram automatically sends remaining partial bytes on the final chunk.
3. **Connection Pooling per DC:** Warm `MTProtoSender` connections are cached per Data Center (`self._senders_by_dc[dc_id]`), eliminating expensive cross-DC authorization handshakes on every lecture.
4. **Single Runner Locking:** GitHub Actions enforces `concurrency: group: telegram-transfer-pipeline, cancel-in-progress: false` so only 1 runner ever accesses Telegram at any time.
5. **Backoff Safety:** `FloodWaitError` triggers an automatic `e.seconds + 10s` sleep. If wait exceeds 180s, the process exits cleanly.
6. **2s Cooldown:** 2 seconds pause between consecutive files.

---

## 6. 🌐 Edge Streaming & Zero Egress Bandwidth (`functions/api/[[route]].ts`)

The streaming endpoint `GET /api/stream/:chat/:msg`:
1. Looks up the item in `cachedManifest` (`engine/transfer_manifest.json`).
2. Obtains a cached Microsoft Graph access token using the stored `refresh_token`.
3. Calls Microsoft Graph `/v1.0/sites/root/drive/items/{onedrive_item_id}?$select=@microsoft.graph.downloadUrl`.
4. Returns an **HTTP 302 Found** redirect with `Location: <@microsoft.graph.downloadUrl>`.
5. The student's browser follows the 302 and streams directly from Microsoft's global Azure CDN:
   - Zero bandwidth passes through Cloudflare Workers (100% free tier compliant).
   - High speed 100+ Mbps throughput with full `Range: bytes=X-Y` seeking and scrubbing.

---

## 7. 💻 Frontend App Architecture (`src/`)

* **Framework:** React 18 + TypeScript + Vite + Tailwind CSS + Lucide React.
* **Aesthetic Theme:** "Liquid Glass" dark clinical interface (`LiquidGlassWrapper.tsx`) inspired by Apple & Marrow LMS.
* **Component Registry:**
  - `src/App.tsx`: Main application router and state manager. Controls active views (`dashboard`, `subject`, `module`, `player`, `notes`, `pearls`).
  - `src/components/Navbar.tsx`: Search bar, curriculum switchers, theme switcher, progress stats.
  - `src/components/Sidebar.tsx`: Navigation sidebar with quick links to 19 subjects, bookmarks, and clinical pearls.
  - `src/components/SubjectGrid.tsx`: Grid of 19 MBBS subjects grouped by MBBS Prof:
    - `1st Prof`: Anatomy, Physiology, Biochemistry
    - `2nd Prof`: Pathology, Pharmacology, Microbiology
    - `3rd Prof Part 1`: Ophthalmology, ENT, Community Medicine (PSM), Forensic Medicine (FMT)
    - `Final Prof Part 2`: General Medicine, General Surgery, OBG, Pediatrics, Orthopedics, Dermatology, Psychiatry, Radiology, Anesthesiology
  - `src/components/ModuleView.tsx`: Displays subject syllabus, lecture modules, duration, and completion checkboxes.
  - `src/components/VideoPlayer.tsx`: Feature-complete video player:
    - Speed presets: 0.75x, 1.0x, 1.25x, 1.5x, 1.75x, 2.0x, 2.5x
    - Clinical bookmarking with timestamped notes
    - Keyboard shortcuts: Space (Play/Pause), Left/Right (Seek 10s), F (Fullscreen), M (Mute)
    - Auto-save watch progress to `localStorage` / D1 database
  - `src/components/NotesAtlas.tsx` & `NotesViewer.tsx`: PDF viewer for full-subject revision books and lecture slides.
  - `src/components/PearlsCenter.tsx`: Interactive flashcards and clinical mnemonics for high-yield exam points.
  - `src/components/SearchModal.tsx`: Instant modal search across all lectures, topics, faculty, and clinical pearls.
  - `src/services/api.ts`: API service for fetching subjects, modules, topics, and saving student progress.
  - `src/types/lms.ts`: TypeScript interfaces for `Subject`, `Module`, `Topic`, `NoteItem`, `UserNote`, `UserProgressState`.

---

## 8. 🔑 Credentials & Environment Map

| Key | Purpose | Where It Is Configured |
| :--- | :--- | :--- |
| `ONEDRIVE_CLIENT_ID` | Microsoft Entra App ID (`ba92c830-fac7-4d60-a0ff-8bf0b581a4c4`) | GitHub Secrets & `onedrive_token.json` |
| `ONEDRIVE_CLIENT_SECRET` | Microsoft Entra App Secret | GitHub Secrets |
| `ONEDRIVE_REFRESH_TOKEN` | Microsoft OAuth Refresh Token (permanent) | GitHub Secrets & `onedrive_token.json` |
| `ONEDRIVE_TENANT_ID` | Microsoft Tenant ID (`938a1924-0af0-4599-819b-177a1dcf8fd6`) | GitHub Secrets & `functions/api/[[route]].ts` |
| `ONEDRIVE_DRIVE_TARGET` | SharePoint target path (`sites/root/drive`) | GitHub Actions & Workflow env |
| `TELEGRAM_API_ID` | Telegram API App ID (`21798363`) | GitHub Secrets & local `credentials_telegram.json` |
| `TELEGRAM_API_HASH` | Telegram API Hash (`c1a3ebc54a9d701a2386cb6c2c9d1df5`) | GitHub Secrets & local `credentials_telegram.json` |
| `TELEGRAM_SESSION_STRING` | Telethon Authenticated User String | GitHub Secrets & local `telegram_session.session` |

---

## 9. 🚀 Next Phase Implementation Roadmap

When resuming in a new session to build or refine the app:

### Phase 1: Dynamic Catalog Generation
* Run or implement a catalog compiler (`engine/generate_catalog.py`) that joins `prepx_sections.json` with `transfer_manifest.json`.
* Write output directly to `public/catalog.json`.
* When a lecture is in `transfer_manifest.json`, set `is_available: true` and embed its direct streaming URL.

### Phase 2: Curriculum Switcher in UI
* In `src/components/Navbar.tsx` and `src/components/SubjectGrid.tsx`, add a clear tab selector:
  - 🇬🇧 **PrepLadder Edition X (English)**
  - 🇮🇳 **PrepLadder Edition X (Hinglish)**
  - 🎓 **Cerebellum Academy**
* Switching tabs immediately updates the subject list, module views, and lecture playlists to that specific curriculum.

### Phase 3: Advanced Student Experience & Offline-First Progress
* Sync student watch history, last playback position (`watched_seconds`), and bookmark notes between `localStorage` and Cloudflare D1.
* Add auto-resume: clicking "Continue Learning" jumps directly to the exact second in the last watched lecture.

### Phase 4: Production Deployment
* Build production bundle: `npm run build`
* Deploy to Cloudflare Pages: `npx wrangler pages deploy dist`

---

## 10. 🧠 Telegram Channel Quirks & Video Sequence Ground Truth

This section preserves all hard-won reverse-engineering discoveries, upload realities, and sequence anomalies uncovered across both source Telegram channels during LMS audits. Any future agent or engineer must consult these findings before modifying migration or catalog code.

### A. PrepLadder Channel (`-1003709841202`) Quirks & Sourcing Realities

1. **English vs Hinglish File Naming Asymmetry:**
   * **PrepLadder English (`prepx_en`, Msgs 3–1216):** Uploaded with clean, human-readable file metadata (e.g. `01. Introduction.mp4`, `02. Cranial Nerves.mp4`). Document attributes reliably contained the real lecture filename.
   * **PrepLadder Hinglish (`prepx_hi`, Msgs 1217–2381):** The uploader dumped raw backend internal CDN identifiers directly as filenames (e.g. `48598.mp4`, `48599.mp4`, `48600.mp4`). The actual lecture title and sequence number **only exist in the first line of the Telegram message caption**.
   * *Pipeline Rule:* If a filename matches `^\d+\.(mp4|mkv|webm|pdf)$` or is missing, the pipeline must strictly prefer `first_line_caption`. Furthermore, numbers $> 500$ (like `48598`) are detected as CDN keys and blocked from being interpreted as lecture sequence numbers.

2. **The 1.79 MB Dummy Placeholder Glitch:**
   * When the ripper or uploader encountered an error fetching a lecture from PrepLadder's backend, it substituted an 8-second dummy placeholder clip of exactly **1,878,333 bytes (~1.79 MB)** instead of failing loudly.
   * *Concrete Occurrences in Medicine (`prepx_hi`):*
     * Msg 1858 (1.79 MB): Dummy placeholder for Lecture 1 (INICET May 2025).
     * Msg 1870 (1.79 MB): Dummy placeholder for Lecture 13 (ECG and Arrhythmias).
     * Msg 1930 (1.79 MB): Dummy placeholder for Lecture 73 (Hodgkin's and Non-Hodgkin's Lymphoma).
   * *Remediation Applied:* Both uploaded 1.79 MB files on SharePoint (`/02_PrepLadder_X_Hinglish/11_General_Medicine/`) were purged via Microsoft Graph API (status 204).
   * *Pipeline Guardrail:* Any video with `total_size < 3 * 1024 * 1024` (< 3 MB) is automatically skipped and recorded in `transfer_manifest.json` as `dummy_placeholder_skipped`.

3. **End-of-Subject Patch Re-Uploads (Medicine Hinglish):**
   * The channel admin realized lectures 1, 13, and 73 were corrupted/placeholders, and re-uploaded the full high-definition videos at the very end of the Medicine section with typographical errors in their captions:
     * **Msg 1999 (82.7 MB):** True Lecture 1 (`01. Medicine INICET May 2025.mp4`).
     * **Msg 2000 (944.88 MB):** True Lecture 13 (`13. ECG and Arrhythmias.mp4`), mistakenly captioned as `14. ECG and Arrhythmias`.
     * **Msg 2001 (212.38 MB):** True Lecture 73 (`73. Hodgkins and Non-Hodgkins Lymphoma.mp4`), mistakenly captioned as `74. Hodgkins and Non-Hodgkins Lymphoma`.
   * *Remediation Applied:* In-place renaming on SharePoint was executed via Graph API PATCH calls, converting all 34 raw numeric CDN files into clean `{N}. {Title}.mp4` files and mapping the re-uploaded messages to their true sequence positions.

4. **Hinglish Catalog Isolation (`engine/sync_catalog.cjs`):**
   * To prevent Hinglish lectures from polluting the primary English clinical medicine module (`mod_med_full`), all `prepx_hi` topics are routed into dedicated module IDs (`mod_prepx_hi_${subId}`) under `PrepLadder Edition X (Hinglish) - ...`.

---

### B. Marrow Edition 6 Channel (`-1003264222864`) Ground Truth

A comprehensive caption-by-caption and document-ID audit across all 10 Final-Year clinical subjects (506 message entries total) established the following ground truth:
* **Zero Corrupted / Dummy Clips:** Unlike PrepLadder Hinglish, every single video in the Marrow channel is a full-length, high-bitrate clinical lecture (ranging from 50 MB to 1.7 GB). There are no corrupted 1.7 MB placeholder clips.
* **Marrow Medicine Invariant:** **Marrow Medicine is NEVER transferred.** PrepLadder Medicine is the official primary medicine curriculum for Aspirin LMS.

#### 1. The 6 Contiguous Clean Subjects (Zero Anomalies)
The captions in the Telegram source are 100% contiguous and perfectly sequential:
* **Pediatrics:** Lectures 1–57 (Msgs 419–475)
* **Orthopedics:** Lectures 1–29 (Msgs 252–280)
* **Anesthesiology:** Lectures 1–31 (Msgs 309–339)
* **Dermatology:** Lectures 1–28 (Msgs 281–308)
* **Psychiatry:** Lectures 1–24 (Msgs 1–24)
* **Radiology:** Lectures 1–41 (Msgs 25–65)

#### 2. The 4 Corrected Subjects (Uploader Typo & Duplicate Normalization)
Four subjects contained human uploader errors that were diagnosed and normalized in `engine/marrow_sections.json`:

* **General Surgery (Msgs 340–418 | 82 Clean Lectures):**
  * *Uploader Anomaly:* Both Msg 417 and Msg 418 shared the exact same document ID (`6161212714476637060`, 83.3 MB) and both carried the caption `78. How to Read Surgery`.
  * *Correction:* Dropped Msg 418 as a duplicate, leaving a single entry for Lecture 78. Result: A perfectly contiguous sequence of **1..82 lectures**.

* **Obstetrics & Gynecology (OBG) (Msgs 476–585 | 109 Clean Lectures):**
  * *Uploader Anomaly:* The uploader skipped number 53 in their captions:
    * Msg 528 caption: `52. Physiological Changes of Pregnancy - 2`
    * Msg 529 caption: `54. Minor Ailments of Pregnancy` (Skipped 53!)
  * *Correction:* Renumbered all subsequent 57 messages (Msgs 476..532) down by 1 (54..110 $\rightarrow$ 53..109). Result: A perfectly contiguous sequence of **1..109 lectures**.

* **Ophthalmology (Msgs 211–251 | 40 Clean Lectures):**
  * *Uploader Anomaly:* The uploader skipped number 18 in their captions:
    * Msg 227 caption: `17. Orbital and Lacrimal Diseases part 3`
    * Msg 228 file: `17. Orbital and Lacrimal Diseases part 3.mp4` (Title fix required)
    * Msg 229 caption: `19. Orbit Part 1` (Skipped 18!)
  * *Correction:* Fixed Msg 228 to `17. Orbital and Lacrimal Apparatus Part 3` and renumbered Msgs 229..251 down by 1 (19..41 $\rightarrow$ 18..40). Result: A perfectly contiguous sequence of **1..40 lectures**.

* **ENT (Ear, Nose, Throat) (Msgs 148–210 | 63 Clean Lectures):**
  * *Uploader Anomalies:*
    1. Msg 210 (850 MB) was an errant duplicate of Ophthalmology Lecture 5 (`05. Diseases of Cornea and Sclera Part 2`) mistakenly posted at the tail end of the ENT section.
    2. The uploader skipped number 52 in their captions:
       * Msg 198 caption: `51. Retropharyngeal Abscess`
       * Msg 199 caption: `53. Physiology and Clinical Evaluation of Larynx` (Skipped 52!)
  * *Correction:* Dropped Msg 210 completely. Renumbered Msgs 198..209 down by 1 (53..64 $\rightarrow$ 52..63). Result: A perfectly contiguous sequence of **1..63 lectures**.

---

### C. Pipeline Defense & Normalization Rules Summary

When writing or maintaining pipeline scripts (`engine/telegram_to_onedrive.py`, `engine/sync_catalog.cjs`):
1. **Title Typos Normalizer:** `normalize_lecture_title()` automatically catches common clinical typos in Telegram captions:
   * `surgey` ➔ `Surgery`
   * `thyriod` ➔ `Thyroid`
   * `dsz` ➔ `Disease`
   * `nutition` ➔ `Nutrition`
   * `int obstruction` ➔ `Intestinal Obstruction`
   * `uppergi` ➔ `Upper GI`
   * `medistanum` ➔ `Mediastinum`
   * `amnitic` ➔ `Amniotic`
   * `ed6` / `edition 06` ➔ `Edition 6`
2. **Sequential Format Standard:** All files saved to SharePoint and indexed in catalog must follow `{N}. {Title}.mp4` where `{N}` is an integer from `1` to `TotalLectures`.
3. **Graph API Staging & Chunks:** Microsoft Graph chunked upload sessions use **20 MiB (`20 * 1024 * 1024`)** chunks for optimal throughput (30–60 MB/s) into the 25 TB SharePoint drive.
4. **Thumbnail Generation:** Handled by edge route `/api/thumbnail/:chat/:msg` pulling cached thumbnails or preview stills without incurring external egress fees.

