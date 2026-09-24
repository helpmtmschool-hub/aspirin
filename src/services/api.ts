import { openDB, IDBPDatabase } from 'idb';
import { 
  Subject, 
  Topic, 
  NoteItem, 
  PlatformId, 
  PlatformMetadata, 
  PlatformContent,
  Module,
  SubjectVisual
} from '../types/lms';
import { ProgressService } from './progress';

export const PLATFORMS: Record<PlatformId, PlatformMetadata> = {
  prepx_en: {
    id: 'prepx_en',
    name: 'PrepLadder Edition X (English)',
    shortName: 'PrepLadder EN',
    tagline: 'Standard English clinical faculty curriculum',
    badge: 'ENGLISH',
    badgeColor: 'from-blue-600 to-indigo-600',
    facultyHighlight: 'Dr. Deepak Marwah, Dr. Pritesh Singh',
  },
  prepx_hi: {
    id: 'prepx_hi',
    name: 'PrepLadder Edition X (Hinglish)',
    shortName: 'PrepLadder HI',
    tagline: 'Concept-rich Hinglish clinical lectures',
    badge: 'HINGLISH',
    badgeColor: 'from-amber-600 to-orange-600',
    facultyHighlight: 'Dr. Deepak Marwah, Dr. Rajesh Gubba',
  },
  cerebellum: {
    id: 'cerebellum',
    name: 'Cerebellum Academy',
    shortName: 'Cerebellum',
    tagline: 'Legendary faculty masterclasses and color review textbooks',
    badge: 'CEREBELLUM',
    badgeColor: 'from-rose-600 to-red-600',
    facultyHighlight: 'Dr. Gobind Rai Garg, Dr. Shrikant Verma, Dr. Vivek Jain',
  },
  marrow: {
    id: 'marrow',
    name: 'Marrow Edition 6',
    shortName: 'Marrow E6',
    tagline: 'Standard Edition 6 clinical QBank & clinical video masterclasses',
    badge: 'MARROW E6',
    badgeColor: 'from-emerald-600 to-teal-700',
    facultyHighlight: 'Dr. Rohan Khandelwal, Dr. Sakshi Arora, Dr. Abbas Ali',
  },
};

export const SUBJECT_VISUALS: Record<string, SubjectVisual> = {
  anatomy: {
    id: 'anatomy',
    emoji: '🦴',
    iconName: 'Bone',
    tagline: 'Gross Anatomy, Neuroanatomy, Embryology & Histology',
    prof: '1st Prof',
  },
  physiology: {
    id: 'physiology',
    emoji: '⚡',
    iconName: 'Activity',
    tagline: 'General, Nerve-Muscle, CVS, Respiratory, Renal & Neurophysiology',
    prof: '1st Prof',
  },
  biochemistry: {
    id: 'biochemistry',
    emoji: '🧬',
    iconName: 'Dna',
    tagline: 'Metabolism, Molecular Biology, Enzymology & Clinical Genetics',
    prof: '1st Prof',
  },
  pathology: {
    id: 'pathology',
    emoji: '🔬',
    iconName: 'Microscope',
    tagline: 'General Pathology, Hematology, Systemic Pathology & Neoplasia',
    prof: '2nd Prof',
  },
  pharmacology: {
    id: 'pharmacology',
    emoji: '💊',
    iconName: 'Pill',
    tagline: 'Autonomic, CNS, CVS, Antimicrobials & Chemotherapeutic Drugs',
    prof: '2nd Prof',
  },
  microbiology: {
    id: 'microbiology',
    emoji: '🦠',
    iconName: 'Bug',
    tagline: 'Bacteriology, Virology, Mycology, Parasitology & Immunology',
    prof: '2nd Prof',
  },
  forensic_medicine: {
    id: 'forensic_medicine',
    emoji: '⚖️',
    iconName: 'Scale',
    tagline: 'Medical Jurisprudence, Thanatology, Autopsy & Clinical Toxicology',
    prof: '3rd Prof Part 1',
  },
  fmt: {
    id: 'forensic_medicine',
    emoji: '⚖️',
    iconName: 'Scale',
    tagline: 'Medical Jurisprudence, Thanatology, Autopsy & Clinical Toxicology',
    prof: '3rd Prof Part 1',
  },
  psm: {
    id: 'psm',
    emoji: '🌐',
    iconName: 'Globe',
    tagline: 'Epidemiology, Biostatistics, National Health Programs & Preventive Care',
    prof: '3rd Prof Part 1',
  },
  ophthalmology: {
    id: 'ophthalmology',
    emoji: '👁️',
    iconName: 'Eye',
    tagline: 'Cornea, Cataract, Glaucoma, Retina, Strabismus & Neuro-Ophthalmology',
    prof: 'Final Prof Part 2',
  },
  ent: {
    id: 'ent',
    emoji: '👂',
    iconName: 'Ear',
    tagline: 'Otology, Audiology, Rhinology, Larynx, Head & Neck Surgery',
    prof: 'Final Prof Part 2',
  },
  medicine: {
    id: 'medicine',
    emoji: '🩺',
    iconName: 'Stethoscope',
    tagline: 'Cardiology, Pulmonology, Neurology, Nephrology, Endocrine & GI Medicine',
    prof: 'Final Prof Part 2',
  },
  surgery: {
    id: 'surgery',
    emoji: '🔪',
    iconName: 'Scissors',
    tagline: 'General Surgery, Trauma, GI Surgery, Urology, Onco-Surgery & Burns',
    prof: 'Final Prof Part 2',
  },
  obgyn: {
    id: 'obgyn',
    emoji: '🤰',
    iconName: 'Heart',
    tagline: 'Antenatal Care, Labor, High-Risk Obstetrics, Gyn-Oncology & Infertility',
    prof: 'Final Prof Part 2',
  },
  obg: {
    id: 'obgyn',
    emoji: '🤰',
    iconName: 'Heart',
    tagline: 'Antenatal Care, Labor, High-Risk Obstetrics, Gyn-Oncology & Infertility',
    prof: 'Final Prof Part 2',
  },
  pediatrics: {
    id: 'pediatrics',
    emoji: '👶',
    iconName: 'Baby',
    tagline: 'Neonatology, Growth & Milestones, Pediatric Nutrition & Infections',
    prof: 'Final Prof Part 2',
  },
  orthopedics: {
    id: 'orthopedics',
    emoji: '🩼',
    iconName: 'Bone',
    tagline: 'Trauma, Fracture Management, Arthroplasty, Spine & Sports Medicine',
    prof: 'Final Prof Part 2',
  },
  dermatology: {
    id: 'dermatology',
    emoji: '🧴',
    iconName: 'Sun',
    tagline: 'Infections, Eczema, Psoriasis, STIs, Leprosy & Dermatosurgery',
    prof: 'Final Prof Part 2',
  },
  psychiatry: {
    id: 'psychiatry',
    emoji: '🧠',
    iconName: 'Brain',
    tagline: 'Mood Disorders, Psychosis, Neuroses, Addiction & Psychopharmacology',
    prof: 'Final Prof Part 2',
  },
  radiology: {
    id: 'radiology',
    emoji: '🩻',
    iconName: 'Scan',
    tagline: 'Plain Radiography, Ultrasound, CT, MRI Sequences & Interventional Radiology',
    prof: 'Final Prof Part 2',
  },
  anesthesiology: {
    id: 'anesthesiology',
    emoji: '💉',
    iconName: 'Syringe',
    tagline: 'General & Regional Anesthesia, Airway Management & Critical Care ICU',
    prof: 'Final Prof Part 2',
  },
  anesthesia: {
    id: 'anesthesiology',
    emoji: '💉',
    iconName: 'Syringe',
    tagline: 'General & Regional Anesthesia, Airway Management & Critical Care ICU',
    prof: 'Final Prof Part 2',
  },
};

export function getSubjectVisual(subjectId: string): SubjectVisual {
  const normalized = (subjectId || '').toLowerCase().trim();
  return (
    SUBJECT_VISUALS[normalized] || {
      id: normalized,
      emoji: '🩺',
      iconName: 'BookOpen',
      tagline: 'Comprehensive Medical Curriculum',
      prof: 'MBBS Curriculum',
    }
  );
}

export function extractLectureNumber(title: string): number {
  if (!title) return 999999;
  const match = title.match(/^(?:lecture\s*)?0*(\d+)\b/i);
  return match ? parseInt(match[1], 10) : 999999;
}

export function formatDisplayTitle(rawTitle: string): string {
  if (!rawTitle) return '';
  const num = extractLectureNumber(rawTitle);
  if (num < 999999) {
    const stripped = rawTitle.replace(/^(?:lecture\s*)?0*\d+[\.\s\-_:]*/i, '').trim();
    if (stripped) {
      return `${num}. ${stripped}`;
    }
  }
  return rawTitle;
}

const DB_NAME = 'aspirin_cache_v5';
const DB_VERSION = 5;
const STORE_NAME = 'catalog_store_v5';
const CATALOG_KEY = 'master_catalog_v5';

export class LMSApiService {
  private static dbPromise: Promise<IDBPDatabase> | null = null;
  private static inMemoryCatalog: any = null;

  // Initialize IndexedDB with idb
  private static async getDB(): Promise<IDBPDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        },
      });
    }
    return this.dbPromise;
  }

  // Detect platform based on message_id or filename
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

  // Load catalog.json with IndexedDB stale-while-revalidate caching
  public static async getCatalog(): Promise<any> {
    if (this.inMemoryCatalog) {
      return this.inMemoryCatalog;
    }

    try {
      const db = await this.getDB();
      const cached = await db.get(STORE_NAME, CATALOG_KEY);
      if (cached) {
        this.inMemoryCatalog = cached;
        // Background revalidate
        this.fetchAndCacheCatalog().catch(() => {});
        return cached;
      }
    } catch (e) {
      console.warn('IndexedDB read failed, falling back to network fetch:', e);
    }

    return this.fetchAndCacheCatalog();
  }

  private static async fetchAndCacheCatalog(): Promise<any> {
    try {
      const res = await fetch('/catalog.json', { cache: 'default' });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      this.inMemoryCatalog = data;

      // Save to IndexedDB
      try {
        const db = await this.getDB();
        await db.put(STORE_NAME, data, CATALOG_KEY);
      } catch (err) {
        console.warn('Could not cache catalog to IndexedDB:', err);
      }

      return data;
    } catch (err) {
      console.error('Failed to fetch /catalog.json:', err);
      return { subjects: [] };
    }
  }

  // Get all 19 subjects with progress stats & available platforms
  public static async getSubjects(): Promise<Subject[]> {
    const catalog = await this.getCatalog();
    const progress = ProgressService.getLocalProgress();

    return (catalog.subjects || []).map((sub: any) => {
      let completedTopicsCount = 0;
      let totalTopicsCount = 0;
      const platformsSet = new Set<PlatformId>();

      const platformData: Record<PlatformId, PlatformContent> = {
        prepx_en: { platform_id: 'prepx_en', subject_id: sub.id, modules: [], notes: [] },
        prepx_hi: { platform_id: 'prepx_hi', subject_id: sub.id, modules: [], notes: [] },
        cerebellum: { platform_id: 'cerebellum', subject_id: sub.id, modules: [], notes: [] },
        marrow: { platform_id: 'marrow', subject_id: sub.id, modules: [], notes: [] },
      };

      // 1. Process Modules & Topics
      (sub.modules || []).forEach((m: any) => {
        (m.topics || []).forEach((t: any) => {
          totalTopicsCount++;
          const platform = this.detectPlatform(t);
          platformsSet.add(platform);

          const isCompleted = !!progress[t.id]?.isCompleted;
          if (isCompleted) {
            completedTopicsCount++;
          }

          const enrichedTopic: Topic = {
            id: t.id,
            subject_id: sub.id,
            module: m.name,
            platform_id: platform,
            title: t.title,
            filename: t.filename,
            file_size_bytes: t.file_size_bytes,
            file_size_mb: t.file_size_mb,
            duration_seconds: t.duration_seconds || 1800,
            duration_formatted: t.duration_formatted || '30 mins',
            telegram_chat_id: t.chat_id,
            telegram_message_id: t.message_id,
            thumbnail_url: t.thumbnail_url || `/api/thumbnail/${t.chat_id}/${t.message_id}`,
            pearls: t.pearls || [],
            is_completed: isCompleted,
            watched_seconds: progress[t.id]?.watchedSeconds || 0,
            is_bookmarked: ProgressService.isBookmarked(t.id),
            stream_url: `/api/stream/${t.chat_id}/${t.message_id}`,
          };

          // Find or create module inside platform
          let pMod = platformData[platform].modules.find((mod) => mod.name === m.name);
          if (!pMod) {
            pMod = {
              id: `${platform}_${m.id}`,
              name: m.name,
              subject_id: sub.id,
              platform_id: platform,
              topics: [],
            };
            platformData[platform].modules.push(pMod);
          }
          pMod.topics.push(enrichedTopic);
        });
      });

      // Sort topics in each module by their natural numerical sequence in title
      Object.values(platformData).forEach((pContent) => {
        pContent.modules.forEach((mod) => {
          mod.topics.sort((a, b) => extractLectureNumber(a.title) - extractLectureNumber(b.title));
        });
      });

      // 2. Process Notes
      (sub.notes || []).forEach((n: any) => {
        const platform = this.detectPlatform(n);
        platformsSet.add(platform);

        const isMaster = (n.title || '').toLowerCase().includes('dr.') || (n.file_size_mb && n.file_size_mb > 50);

        const noteItem: NoteItem = {
          id: n.id,
          subject_id: sub.id,
          platform_id: platform,
          title: n.title,
          filename: n.filename,
          file_size_bytes: n.file_size_bytes,
          file_size_mb: n.file_size_mb,
          telegram_chat_id: n.chat_id,
          telegram_message_id: n.message_id,
          date: n.date,
          is_master_textbook: isMaster,
        };
        platformData[platform].notes.push(noteItem);
      });

      // Default platforms if empty
      if (platformsSet.size === 0) {
        platformsSet.add('prepx_en');
        platformsSet.add('cerebellum');
      }

      const available_platforms = Array.from(platformsSet);

      return {
        ...sub,
        total_topics: totalTopicsCount,
        total_notes: (sub.notes || []).length,
        completed_topics: completedTopicsCount,
        progress_percentage: totalTopicsCount > 0 ? Math.round((completedTopicsCount / totalTopicsCount) * 100) : 0,
        available_platforms,
        platform_data: platformData,
        visual: getSubjectVisual(sub.id),
      };
    });
  }

  // Get specific subject with platform breakdown
  public static async getSubject(subjectId: string): Promise<Subject | null> {
    const subjects = await this.getSubjects();
    return subjects.find((s) => s.id === subjectId) || null;
  }

  // Extract all 24 Master Clinical Textbooks for the Home Shelf
  public static async getMasterTextbooks(): Promise<NoteItem[]> {
    const subjects = await this.getSubjects();
    const books: NoteItem[] = [];

    subjects.forEach((sub) => {
      Object.values(sub.platform_data || {}).forEach((pData) => {
        pData.notes.forEach((note) => {
          if (note.is_master_textbook || (note.file_size_mb && note.file_size_mb > 50)) {
            books.push(note);
          }
        });
      });
    });

    // Deduplicate by title
    const seen = new Set<string>();
    return books.filter((b) => {
      const key = b.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Curated High-Yield Shelves for Netflix Feed
  public static async getCuratedFeed(): Promise<{
    highYieldLectures: Topic[];
    firstProfPicks: Topic[];
    clinicalPicks: Topic[];
    masterBooks: NoteItem[];
  }> {
    const subjects = await this.getSubjects();
    const allTopics: Topic[] = [];

    subjects.forEach((s) => {
      Object.values(s.platform_data || {}).forEach((p) => {
        p.modules.forEach((m) => {
          allTopics.push(...m.topics);
        });
      });
    });

    const highYieldLectures = allTopics
      .filter((t) => t.pearls && t.pearls.length > 0)
      .sort((a, b) => extractLectureNumber(a.title) - extractLectureNumber(b.title))
      .slice(0, 15);

    const firstProfPicks = allTopics
      .filter((t) => ['anatomy', 'physiology', 'biochemistry'].includes(t.subject_id))
      .sort((a, b) => extractLectureNumber(a.title) - extractLectureNumber(b.title))
      .slice(0, 12);

    const clinicalPicks = allTopics
      .filter((t) => t.subject_id === 'medicine')
      .sort((a, b) => extractLectureNumber(a.title) - extractLectureNumber(b.title))
      .slice(0, 15);

    const masterBooks = await this.getMasterTextbooks();

    return {
      highYieldLectures: highYieldLectures.length > 0 ? highYieldLectures : allTopics.slice(0, 12),
      firstProfPicks,
      clinicalPicks,
      masterBooks,
    };
  }

  // Omni-Search across everything: Lectures, Notes, Subjects, Platforms
  public static async searchAll(query: string): Promise<{
    subjects: Subject[];
    topics: Topic[];
    notes: NoteItem[];
  }> {
    if (!query || query.trim().length < 2) {
      return { subjects: [], topics: [], notes: [] };
    }

    const q = query.toLowerCase().trim();
    const subjects = await this.getSubjects();

    const matchedSubjects = subjects.filter(
      (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    );

    const matchedTopics: Topic[] = [];
    const matchedNotes: NoteItem[] = [];

    subjects.forEach((sub) => {
      Object.values(sub.platform_data || {}).forEach((pData) => {
        pData.modules.forEach((mod) => {
          mod.topics.forEach((top) => {
            if (
              top.title.toLowerCase().includes(q) ||
              top.filename.toLowerCase().includes(q) ||
              (top.pearls && top.pearls.some((p) => p.toLowerCase().includes(q)))
            ) {
              if (!matchedTopics.some((t) => t.id === top.id)) {
                matchedTopics.push(top);
              }
            }
          });
        });

        pData.notes.forEach((note) => {
          if (note.title.toLowerCase().includes(q) || note.filename.toLowerCase().includes(q)) {
            if (!matchedNotes.some((n) => n.id === note.id)) {
              matchedNotes.push(note);
            }
          }
        });
      });
    });

    return {
      subjects: matchedSubjects.slice(0, 5),
      topics: matchedTopics.slice(0, 20),
      notes: matchedNotes.slice(0, 10),
    };
  }
}
