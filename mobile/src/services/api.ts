import { Subject, Topic, NoteItem, MBBSProf, PlatformId, Module } from '../types/lms';

// Live production website domain on Cloudflare Pages
export const DEFAULT_API_BASE = 'https://aspirin-lms.pages.dev';

export interface SubjectClayTheme {
  bg: string;
  text: string;
  badge: string;
  isDark: boolean;
}

export function getSubjectClayTheme(subjectId: string): SubjectClayTheme {
  switch (subjectId.toLowerCase()) {
    case 'anatomy':
      return { bg: '#ffb084', text: '#0a0a0a', badge: 'rgba(10, 10, 10, 0.1)', isDark: false };
    case 'physiology':
      return { bg: '#e8b94a', text: '#0a0a0a', badge: 'rgba(10, 10, 10, 0.1)', isDark: false };
    case 'biochemistry':
      return { bg: '#f5f0e0', text: '#0a0a0a', badge: 'rgba(10, 10, 10, 0.1)', isDark: false };
    case 'pathology':
      return { bg: '#b8a4ed', text: '#0a0a0a', badge: 'rgba(10, 10, 10, 0.1)', isDark: false };
    case 'pharmacology':
      return { bg: '#a4d4c5', text: '#0a0a0a', badge: 'rgba(10, 10, 10, 0.1)', isDark: false };
    case 'microbiology':
      return { bg: '#f5f0e0', text: '#0a0a0a', badge: 'rgba(10, 10, 10, 0.1)', isDark: false };
    case 'forensic_medicine':
      return { bg: '#faf5e8', text: '#0a0a0a', badge: 'rgba(10, 10, 10, 0.1)', isDark: false };
    case 'psm':
      return { bg: '#a4d4c5', text: '#0a0a0a', badge: 'rgba(10, 10, 10, 0.1)', isDark: false };
    case 'ophthalmology':
      return { bg: '#ff6b5a', text: '#0a0a0a', badge: 'rgba(10, 10, 10, 0.1)', isDark: false };
    case 'ent':
      return { bg: '#ffb084', text: '#0a0a0a', badge: 'rgba(10, 10, 10, 0.1)', isDark: false };
    case 'medicine':
      return { bg: '#1a3a3a', text: '#ffffff', badge: 'rgba(255, 255, 255, 0.18)', isDark: true };
    case 'surgery':
      return { bg: '#ff4d8b', text: '#ffffff', badge: 'rgba(255, 255, 255, 0.22)', isDark: true };
    case 'obgyn':
      return { bg: '#b8a4ed', text: '#0a0a0a', badge: 'rgba(10, 10, 10, 0.1)', isDark: false };
    case 'pediatrics':
      return { bg: '#e8b94a', text: '#0a0a0a', badge: 'rgba(10, 10, 10, 0.1)', isDark: false };
    case 'orthopedics':
      return { bg: '#f5f0e0', text: '#0a0a0a', badge: 'rgba(10, 10, 10, 0.1)', isDark: false };
    case 'dermatology':
      return { bg: '#ffb084', text: '#0a0a0a', badge: 'rgba(10, 10, 10, 0.1)', isDark: false };
    case 'psychiatry':
      return { bg: '#b8a4ed', text: '#0a0a0a', badge: 'rgba(10, 10, 10, 0.1)', isDark: false };
    case 'radiology':
      return { bg: '#1a3a3a', text: '#ffffff', badge: 'rgba(255, 255, 255, 0.18)', isDark: true };
    case 'anesthesiology':
      return { bg: '#faf5e8', text: '#0a0a0a', badge: 'rgba(10, 10, 10, 0.1)', isDark: false };
    default:
      return { bg: '#f5f0e0', text: '#0a0a0a', badge: 'rgba(10, 10, 10, 0.1)', isDark: false };
  }
}

// Natural numerical order extractor for topic titles (e.g. "01. Heart Failure" -> 1)
function extractLectureNumber(title: string): number {
  const match = (title || '').match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 9999;
}

export class MobileLmsApi {
  private static apiBase: string = DEFAULT_API_BASE;
  private static catalogCache: Subject[] | null = null;
  private static directUrlCache: Map<string, { url: string; timestamp: number }> = new Map();

  public static setApiBase(url: string) {
    this.apiBase = url.replace(/\/$/, '');
  }

  public static getApiBase(): string {
    return this.apiBase;
  }

  // Detect platform based on message_id or filename exactly like web app
  public static detectPlatform(item: { chat_id?: number; message_id?: number; filename?: string; title?: string }): PlatformId {
    const fn = (item.filename || item.title || '').toLowerCase();
    const msgId = item.message_id || 0;
    const chatId = item.chat_id || 0;

    if (chatId === -1003264222864 || fn.includes('marrow') || (item.title && item.title.toLowerCase().includes('marrow'))) {
      return 'marrow';
    }
    if (fn.includes('cerebellu') || fn.includes('dr.') || fn.includes('dr ') || msgId >= 2382) {
      return 'cerebellum';
    }
    if (fn.includes('hinglish') || (msgId >= 1217 && msgId < 2382)) {
      return 'prepx_hi';
    }
    return 'prepx_en';
  }

  /**
   * Constructs video streaming URL pointing to the live website's edge stream endpoint
   */
  public static getStreamUrl(topic: Topic): string {
    const cId = topic.chat_id || topic.telegram_chat_id;
    const mId = topic.message_id || topic.telegram_message_id;

    if (cId && mId) {
      return `${this.apiBase}/api/stream/${cId}/${mId}`;
    }
    if (topic.stream_url) {
      if (topic.stream_url.startsWith('http')) return topic.stream_url;
      return `${this.apiBase}${topic.stream_url}`;
    }
    return '';
  }

  /**
   * Probes the live edge endpoint to resolve the direct 302 SharePoint / Azure CDN download URL
   * enabling zero-redirect, zero-buffering native playback
   */
  public static async resolveDirectStreamUrl(streamUrl: string): Promise<string> {
    if (!streamUrl || !streamUrl.includes('/api/stream/')) {
      return streamUrl;
    }

    const cached = this.directUrlCache.get(streamUrl);
    // SharePoint temporary tokens are valid for ~45 minutes; cache for 30 minutes
    if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) {
      return cached.url;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(streamUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const location = response.headers.get('location');
      if (location && location.startsWith('http')) {
        this.directUrlCache.set(streamUrl, { url: location, timestamp: Date.now() });
        return location;
      }
    } catch {
      // If probe times out or network restricts HEAD/manual redirect, fall back gracefully to the original URL
    }

    return streamUrl;
  }

  /**
   * Constructs thumbnail URL pointing to the live website's Azure CDN thumbnail endpoint
   */
  public static getThumbnailUrl(topic: Topic): string {
    const cId = topic.chat_id || topic.telegram_chat_id;
    const mId = topic.message_id || topic.telegram_message_id;

    if (cId && mId) {
      return `${this.apiBase}/api/thumbnail/${cId}/${mId}`;
    }
    return topic.thumbnail_url || '';
  }

  /**
   * Constructs notes streaming URL pointing to the live website's notes endpoint
   */
  public static getNoteUrl(note: NoteItem): string {
    const cId = note.telegram_chat_id;
    const mId = note.telegram_message_id;
    if (cId && mId) {
      return `${this.apiBase}/api/notes/${cId}/${mId}`;
    }
    return note.download_url || '';
  }

  /**
   * Fetches the full master catalog from the live website (catalog.json)
   * exactly matching the web app's LMSApiService.getSubjects()
   */
  public static async getSubjects(): Promise<Subject[]> {
    if (this.catalogCache && this.catalogCache.length > 0) {
      return this.catalogCache;
    }

    try {
      const response = await fetch(`${this.apiBase}/catalog.json`, {
        headers: { 'Accept': 'application/json' },
      });
      if (response.ok) {
        const catalog = await response.json();
        if (catalog.subjects && Array.isArray(catalog.subjects)) {
          const processedSubjects: Subject[] = catalog.subjects.map((sub: any) => {
            const rawModules = sub.modules || [];
            let totalTopicsCount = 0;

            const enrichedModules: Module[] = rawModules.map((m: any) => {
              const rawTopics = m.topics || [];
              totalTopicsCount += rawTopics.length;

              const enrichedTopics: Topic[] = rawTopics.map((t: any) => {
                const cId = t.chat_id;
                const mId = t.message_id;
                const platform = this.detectPlatform(t);

                return {
                  id: t.id || `${sub.id}_top_${mId || Math.random()}`,
                  subject_id: sub.id,
                  module: m.name,
                  platform_id: platform,
                  title: t.title || 'Untitled Lecture',
                  filename: t.filename || '',
                  file_size_bytes: t.file_size_bytes || 0,
                  file_size_mb: t.file_size_mb || 0,
                  duration_seconds: t.duration_seconds || 1800,
                  duration_formatted: t.duration_formatted || '30 mins',
                  chat_id: cId,
                  message_id: mId,
                  telegram_chat_id: cId,
                  telegram_message_id: mId,
                  thumbnail_url: `${this.apiBase}/api/thumbnail/${cId}/${mId}`,
                  stream_url: `${this.apiBase}/api/stream/${cId}/${mId}`,
                  pearls: t.pearls || [],
                  is_completed: false,
                };
              });

              // Sort lectures in numerical order
              enrichedTopics.sort((a, b) => extractLectureNumber(a.title) - extractLectureNumber(b.title));

              return {
                id: m.id || `${sub.id}_mod_${m.name}`,
                name: m.name,
                subject_id: sub.id,
                topics: enrichedTopics,
              };
            });

            const enrichedNotes: NoteItem[] = (sub.notes || []).map((n: any) => ({
              id: n.id || `${sub.id}_note_${n.message_id || Math.random()}`,
              title: n.title,
              subject_id: sub.id,
              file_size_mb: n.file_size_mb,
              file_size_bytes: n.file_size_bytes,
              telegram_chat_id: n.chat_id,
              telegram_message_id: n.message_id,
              download_url: `${this.apiBase}/api/notes/${n.chat_id}/${n.message_id}`,
              pages_count: n.pages_count || 50,
            }));

            return {
              id: sub.id,
              name: sub.name,
              code: sub.code || sub.id.toUpperCase().slice(0, 4),
              prof: sub.prof || '1st Prof',
              category: sub.category || 'Clinical',
              icon: sub.icon || 'book-open',
              color: sub.color || getSubjectClayTheme(sub.id).bg,
              total_topics: totalTopicsCount,
              total_notes: enrichedNotes.length,
              progress_percentage: sub.progress_percentage || 0,
              modules: enrichedModules,
              notes: enrichedNotes,
            };
          });

          this.catalogCache = processedSubjects;
          return processedSubjects;
        }
      }
    } catch (e) {
      console.warn('[MobileLmsApi] Failed to fetch live catalog from edge, falling back to local dataset:', e);
    }

    const fallbacks = this.getFallbackSubjects();
    this.catalogCache = fallbacks;
    return fallbacks;
  }

  /**
   * Curated Feed exactly matching web app's getCuratedFeed()
   */
  public static async getCuratedFeed(): Promise<{
    highYieldLectures: Topic[];
    firstProfPicks: Topic[];
    clinicalPicks: Topic[];
    masterBooks: NoteItem[];
  }> {
    const subjects = await this.getSubjects();

    const highYieldLectures: Topic[] = [];
    const firstProfPicks: Topic[] = [];
    const clinicalPicks: Topic[] = [];
    const masterBooks: NoteItem[] = [];

    subjects.forEach((s) => {
      (s.modules || []).forEach((m) => {
        m.topics.forEach((t) => {
          if (t.pearls && t.pearls.length > 0 && highYieldLectures.length < 8) {
            highYieldLectures.push(t);
          }
          if (s.prof === '1st Prof' && firstProfPicks.length < 8) {
            firstProfPicks.push(t);
          }
          if (s.prof === 'Final Prof Part 2' && clinicalPicks.length < 8) {
            clinicalPicks.push(t);
          }
        });
      });

      (s.notes || []).forEach((n) => {
        if (masterBooks.length < 6) {
          masterBooks.push(n);
        }
      });
    });

    return {
      highYieldLectures,
      firstProfPicks,
      clinicalPicks,
      masterBooks: masterBooks.length > 0 ? masterBooks : this.getFallbackBooks(),
    };
  }

  public static getFallbackBooks(): NoteItem[] {
    return [
      {
        id: 'book_med_harrison',
        title: 'Harrison Clinical Medicine Mastery Review Notes',
        subject_id: 'medicine',
        file_size_mb: 68.4,
        pages_count: 142,
      },
      {
        id: 'book_path_robbins',
        title: 'Robbins Pathology High-Yield Histology Atlas',
        subject_id: 'pathology',
        file_size_mb: 52.1,
        pages_count: 98,
      },
      {
        id: 'book_surg_bailey',
        title: 'Bailey & Love Operative Surgery Practical Manual',
        subject_id: 'surgery',
        file_size_mb: 44.5,
        pages_count: 110,
      },
      {
        id: 'book_peds_ghai',
        title: 'Essential Pediatrics Clinical Case Vignettes',
        subject_id: 'pediatrics',
        file_size_mb: 38.0,
        pages_count: 76,
      },
    ];
  }

  /**
   * Rich 19 MBBS subjects fallback matching public/catalog.json
   */
  public static getFallbackSubjects(): Subject[] {
    return [
      // 1st Prof
      {
        id: 'anatomy',
        name: 'Anatomy',
        code: 'ANAT',
        prof: '1st Prof',
        category: 'Pre-Clinical',
        icon: 'bone',
        color: '#ffb084',
        total_topics: 184,
        total_notes: 42,
        progress_percentage: 12,
        modules: [
          {
            id: 'mod_anat_neuro',
            name: 'PrepLadder X - Neuroanatomy & Brainstem',
            topics: [
              {
                id: 'anat_top_1',
                subject_id: 'anatomy',
                module: 'PrepLadder X - Neuroanatomy & Brainstem',
                title: '01. Brainstem Internal Architecture & Cranial Nerves',
                filename: '01_brainstem_cranial_nerves.mp4',
                file_size_bytes: 145000000,
                file_size_mb: 138.2,
                duration_seconds: 2450,
                duration_formatted: '40m 50s',
                stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                pearls: [
                  'Rule of 4 for brainstem stroke localization (4 midline, 4 side)',
                  'Nucleus Ambiguus supplies muscles of 4th and 6th pharyngeal arches (CN IX, X, XI)',
                  'Weber syndrome = Ipsilateral CN III palsy + contralateral hemiparesis'
                ]
              },
              {
                id: 'anat_top_2',
                subject_id: 'anatomy',
                module: 'PrepLadder X - Neuroanatomy & Brainstem',
                title: '02. Circle of Willis & Cerebrovascular Syndromes',
                filename: '02_circle_of_willis.mp4',
                file_size_bytes: 128000000,
                file_size_mb: 122.0,
                duration_seconds: 1980,
                duration_formatted: '33m 00s',
                stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
                pearls: [
                  'Berry aneurysms most common at Anterior Communicating Artery',
                  'PICA infarct causes Wallenberg lateral medullary syndrome'
                ]
              }
            ]
          }
        ],
        notes: [
          {
            id: 'note_anat_1',
            title: 'Neuroanatomy Cross-Sections & Cranial Nerves Atlas',
            subject_id: 'anatomy',
            file_size_mb: 24.5,
            pages_count: 64,
          }
        ]
      },
      {
        id: 'physiology',
        name: 'Physiology',
        code: 'PHYS',
        prof: '1st Prof',
        category: 'Pre-Clinical',
        icon: 'activity',
        color: '#e8b94a',
        total_topics: 162,
        total_notes: 38,
        progress_percentage: 24,
        modules: [
          {
            id: 'mod_phys_cvs',
            name: 'Guyton Clinical Cardiovascular Physiology',
            topics: [
              {
                id: 'phys_top_1',
                subject_id: 'physiology',
                module: 'Guyton Clinical Cardiovascular Physiology',
                title: '01. Cardiac Action Potential & Ion Channels',
                filename: '01_cardiac_ap.mp4',
                file_size_bytes: 110000000,
                file_size_mb: 104.9,
                duration_seconds: 1850,
                duration_formatted: '30m 50s',
                stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                pearls: [
                  'Phase 0 depolarization mediated by fast Na+ channels (INa)',
                  'Phase 2 plateau mediated by L-type Ca2+ channels (ICa-L)',
                  'SA and AV nodes have slow Ca2+ dependent phase 0 (no fast Na+ channels)'
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'biochemistry',
        name: 'Biochemistry',
        code: 'BIO',
        prof: '1st Prof',
        category: 'Pre-Clinical',
        icon: 'flask-conical',
        color: '#f5f0e0',
        total_topics: 140,
        total_notes: 30,
        progress_percentage: 18,
      },
      // 2nd Prof
      {
        id: 'pathology',
        name: 'Pathology',
        code: 'PATH',
        prof: '2nd Prof',
        category: 'Para-Clinical',
        icon: 'microscope',
        color: '#b8a4ed',
        total_topics: 220,
        total_notes: 55,
        progress_percentage: 35,
        modules: [
          {
            id: 'mod_path_heme',
            name: 'Robbins Hematopathology & Leukemias',
            topics: [
              {
                id: 'path_top_1',
                subject_id: 'pathology',
                module: 'Robbins Hematopathology & Leukemias',
                title: '01. Acute Myeloid Leukemia (AML) & Cytogenetics',
                filename: '01_aml_cytogenetics.mp4',
                file_size_bytes: 160000000,
                file_size_mb: 152.6,
                duration_seconds: 2700,
                duration_formatted: '45m 00s',
                stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
                pearls: [
                  'Auer rods = crystalline aggregates of fused myeloperoxidase granules',
                  't(15;17) PML-RARA in APML (M3) responds to ATRA + Arsenic Trioxide',
                  'Risk of severe DIC triggered by release of procoagulant granules'
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'pharmacology',
        name: 'Pharmacology',
        code: 'PHARM',
        prof: '2nd Prof',
        category: 'Para-Clinical',
        icon: 'pill',
        color: '#a4d4c5',
        total_topics: 195,
        total_notes: 48,
        progress_percentage: 42,
      },
      {
        id: 'microbiology',
        name: 'Microbiology',
        code: 'MICRO',
        prof: '2nd Prof',
        category: 'Para-Clinical',
        icon: 'bug',
        color: '#f5f0e0',
        total_topics: 175,
        total_notes: 40,
        progress_percentage: 8,
      },
      {
        id: 'forensic_medicine',
        name: 'Forensic Medicine & Tox',
        code: 'FMT',
        prof: '2nd Prof',
        category: 'Para-Clinical',
        icon: 'shield-alert',
        color: '#faf5e8',
        total_topics: 92,
        total_notes: 22,
        progress_percentage: 0,
      },
      // 3rd Prof Part 1
      {
        id: 'psm',
        name: 'Community Medicine (PSM)',
        code: 'PSM',
        prof: '3rd Prof Part 1',
        category: 'Clinical',
        icon: 'users',
        color: '#a4d4c5',
        total_topics: 160,
        total_notes: 35,
        progress_percentage: 15,
      },
      {
        id: 'ophthalmology',
        name: 'Ophthalmology',
        code: 'OPHTH',
        prof: '3rd Prof Part 1',
        category: 'Clinical',
        icon: 'eye',
        color: '#ff6b5a',
        total_topics: 110,
        total_notes: 26,
        progress_percentage: 50,
      },
      {
        id: 'ent',
        name: 'Otorhinolaryngology (ENT)',
        code: 'ENT',
        prof: '3rd Prof Part 1',
        category: 'Clinical',
        icon: 'ear',
        color: '#ffb084',
        total_topics: 98,
        total_notes: 24,
        progress_percentage: 30,
      },
      // Final Prof Part 2
      {
        id: 'medicine',
        name: 'General Medicine',
        code: 'MED',
        prof: 'Final Prof Part 2',
        category: 'Clinical',
        icon: 'stethoscope',
        color: '#1a3a3a',
        total_topics: 340,
        total_notes: 85,
        progress_percentage: 65,
        modules: [
          {
            id: 'mod_med_cardio',
            name: 'Harrison Clinical Cardiology Masterclass',
            topics: [
              {
                id: 'med_top_1',
                subject_id: 'medicine',
                module: 'Harrison Clinical Cardiology Masterclass',
                title: '01. Heart Failure with Reduced EF: Guideline-Directed Medical Therapy',
                filename: '01_hfref_gdmt.mp4',
                file_size_bytes: 185000000,
                file_size_mb: 176.4,
                duration_seconds: 3100,
                duration_formatted: '51m 40s',
                stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
                pearls: [
                  'Four pillars of GDMT: ARNI (Sacubitril/Valsartan), Beta-blocker, MRA (Spironolactone), SGLT2i (Dapagliflozin)',
                  'Beta-blockers proven for mortality: Carvedilol, Metoprolol succinate, Bisoprolol',
                  'S3 gallop correlates with elevated left ventricular filling pressure (>20 mmHg)'
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'surgery',
        name: 'General Surgery',
        code: 'SURG',
        prof: 'Final Prof Part 2',
        category: 'Clinical',
        icon: 'scissors',
        color: '#ff4d8b',
        total_topics: 280,
        total_notes: 70,
        progress_percentage: 40,
      },
      {
        id: 'obgyn',
        name: 'Obstetrics & Gynaecology',
        code: 'OBG',
        prof: 'Final Prof Part 2',
        category: 'Clinical',
        icon: 'baby',
        color: '#b8a4ed',
        total_topics: 210,
        total_notes: 50,
        progress_percentage: 28,
      },
      {
        id: 'pediatrics',
        name: 'Pediatrics',
        code: 'PEDS',
        prof: 'Final Prof Part 2',
        category: 'Clinical',
        icon: 'heart-pulse',
        color: '#e8b94a',
        total_topics: 145,
        total_notes: 36,
        progress_percentage: 19,
      },
      {
        id: 'orthopedics',
        name: 'Orthopedics',
        code: 'ORTHO',
        prof: 'Final Prof Part 2',
        category: 'Clinical',
        icon: 'bone',
        color: '#f5f0e0',
        total_topics: 95,
        total_notes: 20,
        progress_percentage: 55,
      },
      {
        id: 'dermatology',
        name: 'Dermatology & Venereology',
        code: 'DERM',
        prof: 'Final Prof Part 2',
        category: 'Clinical',
        icon: 'sparkles',
        color: '#ffb084',
        total_topics: 80,
        total_notes: 18,
        progress_percentage: 75,
      },
      {
        id: 'psychiatry',
        name: 'Psychiatry',
        code: 'PSYCH',
        prof: 'Final Prof Part 2',
        category: 'Clinical',
        icon: 'brain',
        color: '#b8a4ed',
        total_topics: 65,
        total_notes: 14,
        progress_percentage: 10,
      },
      {
        id: 'radiology',
        name: 'Radiodiagnosis',
        code: 'RADIO',
        prof: 'Final Prof Part 2',
        category: 'Clinical',
        icon: 'scan',
        color: '#1a3a3a',
        total_topics: 78,
        total_notes: 22,
        progress_percentage: 33,
      },
      {
        id: 'anesthesia',
        name: 'Anesthesiology',
        code: 'ANES',
        prof: 'Final Prof Part 2',
        category: 'Clinical',
        icon: 'shield-check',
        color: '#faf5e8',
        total_topics: 54,
        total_notes: 12,
        progress_percentage: 5,
      },
    ];
  }
}
