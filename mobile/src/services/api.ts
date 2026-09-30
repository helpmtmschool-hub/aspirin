import { Subject, Topic, MBBSProf, PlatformId } from '../types/lms';

// Default edge API base (can be configured via environment or settings)
export const DEFAULT_API_BASE = 'https://aspirin-edge.aspirin-hub.workers.dev';

export class MobileLmsApi {
  private static apiBase: string = DEFAULT_API_BASE;
  private static catalogCache: Subject[] | null = null;

  public static setApiBase(url: string) {
    this.apiBase = url.replace(/\/$/, '');
  }

  public static getApiBase(): string {
    return this.apiBase;
  }

  /**
   * Constructs direct video streaming URL with HTTP range-request support
   */
  public static getStreamUrl(topic: Topic): string {
    if (topic.stream_url) {
      if (topic.stream_url.startsWith('http')) return topic.stream_url;
      return `${this.apiBase}${topic.stream_url}`;
    }
    if (topic.chat_id && topic.message_id) {
      return `${this.apiBase}/api/stream/${topic.chat_id}/${topic.message_id}`;
    }
    return '';
  }

  /**
   * Fetches the 19 MBBS subjects catalog
   */
  public static async getSubjects(): Promise<Subject[]> {
    if (this.catalogCache && this.catalogCache.length > 0) {
      return this.catalogCache;
    }

    try {
      const response = await fetch(`${this.apiBase}/api/subjects`);
      if (response.ok) {
        const data = await response.json();
        if (data.subjects && Array.isArray(data.subjects)) {
          this.catalogCache = data.subjects;
          return data.subjects;
        }
      }
    } catch {
      // Edge fetch failed, fall back to embedded seed data
    }

    return this.getFallbackSubjects();
  }

  /**
   * High-yield 19 MBBS subjects fallback for immediate offline launch
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
        color: '#E11D48',
        total_topics: 184,
        total_notes: 42,
        progress_percentage: 12,
        modules: [
          {
            id: 'anat_neuro',
            name: 'PrepLadder X - Neuroanatomy & Brainstem',
            topics: [
              {
                id: 'anat_neuro_1',
                subject_id: 'anatomy',
                title: '01. Brainstem Internal Architecture & Cranial Nerves',
                filename: '01_brainstem_cranial_nerves.mp4',
                file_size_bytes: 145000000,
                file_size_mb: 138.2,
                duration_seconds: 2450,
                duration_formatted: '40m 50s',
                stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                pearls: [
                  'Rule of 4 for brainstem stroke localization (4 midline structures, 4 side structures)',
                  'Nucleus Ambiguus supplies muscles derived from 4th and 6th pharyngeal arches (CN IX, X, XI)',
                  'Weber syndrome = Ipsilateral CN III palsy + contralateral hemiparesis'
                ]
              },
              {
                id: 'anat_neuro_2',
                subject_id: 'anatomy',
                title: '02. Circle of Willis & Cerebrovascular Syndromes',
                filename: '02_circle_of_willis.mp4',
                file_size_bytes: 128000000,
                file_size_mb: 122.0,
                duration_seconds: 1980,
                duration_formatted: '33m 00s',
                stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
                pearls: [
                  'Berry aneurysms most common at Anterior Communicating Artery junction',
                  'PICA infarct causes Wallenberg lateral medullary syndrome (loss of pain/temp on ipsilateral face, contralateral body)'
                ]
              }
            ]
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
        color: '#0284C7',
        total_topics: 162,
        total_notes: 38,
        progress_percentage: 24,
      },
      {
        id: 'biochemistry',
        name: 'Biochemistry',
        code: 'BIO',
        prof: '1st Prof',
        category: 'Pre-Clinical',
        icon: 'flask-conical',
        color: '#D97706',
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
        color: '#DC2626',
        total_topics: 220,
        total_notes: 55,
        progress_percentage: 35,
      },
      {
        id: 'pharmacology',
        name: 'Pharmacology',
        code: 'PHARM',
        prof: '2nd Prof',
        category: 'Para-Clinical',
        icon: 'pill',
        color: '#7C3AED',
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
        color: '#059669',
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
        color: '#EA580C',
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
        color: '#2563EB',
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
        color: '#0D9488',
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
        color: '#4F46E5',
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
        color: '#00A389',
        total_topics: 340,
        total_notes: 85,
        progress_percentage: 65,
      },
      {
        id: 'surgery',
        name: 'General Surgery',
        code: 'SURG',
        prof: 'Final Prof Part 2',
        category: 'Clinical',
        icon: 'scissors',
        color: '#E11D48',
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
        color: '#DB2777',
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
        color: '#10B981',
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
        color: '#D97706',
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
        color: '#9333EA',
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
        color: '#6366F1',
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
        color: '#0891B2',
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
        color: '#64748B',
        total_topics: 54,
        total_notes: 12,
        progress_percentage: 5,
      },
    ];
  }
}
