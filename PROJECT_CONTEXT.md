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
└── 03_Cerebellum_Academy/
    ├── 00_Notes_PDF/               <-- 24 Master PDF Textbooks
    │   ├── Anatomy (Dr. Shrikant Verma).pdf (955 MB)
    │   ├── Biochemistry (Dr. Ankur Jain).pdf (515 MB)
    │   ├── Biochemistry (Dr. Smily Pruthi).pdf (182 MB)
    │   └── ...
    ├── 01_Anatomy/
    ├── 03_Biochemistry_Dr_Ankur_Jain/
    ├── 03_Biochemistry_Dr_Smily_Pruthi/
    ├── 06_Microbiology_Dr_Devyani_Puri/
    ├── 06_Microbiology_Dr_Priyanka_Sachdev/
    └── ... (22 Faculty Subject Tracks)
```

---

## 4. 🗃️ Master Channel Index (`engine/prepx_sections.json`)

* **Channel ID:** `-1003709841202`
* **Total Messages:** 4,015 (Msgs 3 to 4017)
* **Real Media Files:** ~3,950+ lectures and PDFs (~60 text divider separators)
* **Platform Distribution:**
  1. `prepx_en` (PrepLadder English): **1,214 items** across 19 subjects (Msgs 3–1216)
  2. `prepx_hi` (PrepLadder Hinglish): **1,165 items** across 19 subjects (Msgs 1217–2381)
  3. `cerebellum` (Cerebellum Academy): **1,636 items** across 22 faculty tracks (Msgs 2382–4017)
  4. `notes_pdf`: **24 master textbooks** (Msgs 3994–4017)

### Academic Clinical Priority Sorting
The migration queue automatically prioritizes lectures in this clinical hierarchy:
1. **PrepLadder Medicine First:** English (Msgs 689–830) ➔ Hinglish (Msgs 1857–2001)
2. **PrepLadder Final Year (Clinical):** Surgery ➔ OBG ➔ Pediatrics ➔ Orthopedics ➔ Dermatology ➔ Psychiatry ➔ Radiology ➔ Anesthesia
3. **PrepLadder Remaining Years:**
   - 3rd Prof: Ophthalmology ➔ ENT ➔ PSM ➔ FMT
   - 2nd Prof: Pathology ➔ Pharmacology ➔ Microbiology
   - 1st Prof: Anatomy ➔ Physiology ➔ Biochemistry
4. **Cerebellum Academy (Same Clinical Order):**
   - Medicine ➔ Final Year ➔ Remaining Years ➔ Notes PDF

---

## 5. 🛡️ 100% Anti-Ban Telegram MTProto Specifications

To prevent any rate limits or account bans on the user's Telegram account (`Sain` `@Sain1919`, User ID `5188277368`):
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
