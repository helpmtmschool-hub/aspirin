import { Subject, Topic, NoteItem, UserNote, UserProgressState } from '../types/lms';

const PROGRESS_STORAGE_KEY = 'aspirin_lms_user_progress';
const OLD_PROGRESS_STORAGE_KEY = 'yui_lms_user_progress';
const NOTES_STORAGE_KEY = 'aspirin_lms_user_notes';
const OLD_NOTES_STORAGE_KEY = 'yui_lms_user_notes';

export class LMSApiService {
  private static catalogCache: any = null;

  // Local fallback storage helper
  static getLocalProgress(): UserProgressState {
    try {
      const stored = localStorage.getItem(PROGRESS_STORAGE_KEY) || localStorage.getItem(OLD_PROGRESS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  static setLocalProgress(progress: UserProgressState) {
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      console.error('Failed to write progress to localStorage', e);
    }
  }

  // Load catalog.json
  static async getCatalog(): Promise<any> {
    if (this.catalogCache) return this.catalogCache;
    try {
      const res = await fetch('/catalog.json');
      if (!res.ok) throw new Error('Catalog json not available');
      this.catalogCache = await res.json();
      return this.catalogCache;
    } catch (err) {
      console.warn('Could not fetch catalog.json:', err);
      return { subjects: [] };
    }
  }

  // 1. Get all 19 subjects with progress stats
  static async getSubjects(): Promise<Subject[]> {
    // Try Cloudflare D1 API first
    try {
      const res = await fetch('/api/subjects');
      if (res.ok) {
        const data = await res.json();
        if (data.subjects && data.subjects.length > 0) {
          return data.subjects;
        }
      }
    } catch {
      // Fall through to catalog.json fallback
    }

    // Fallback: Read catalog.json & merge with localStorage
    const catalog = await this.getCatalog();
    const localProgress = this.getLocalProgress();

    return catalog.subjects.map((sub: any) => {
      let completedCount = 0;
      const allTopics: Topic[] = [];
      (sub.modules || []).forEach((m: any) => {
        (m.topics || []).forEach((t: any) => {
          allTopics.push(t);
          if (localProgress[t.id]?.isCompleted) {
            completedCount++;
          }
        });
      });

      const total = allTopics.length;
      return {
        ...sub,
        total_topics: total,
        completed_topics: completedCount,
        progress_percentage: total > 0 ? Math.round((completedCount / total) * 100) : 0,
      };
    });
  }

  // 2. Get specific subject with modules & notes
  static async getSubject(id: string): Promise<{ subject: Subject; modules: any[]; notes: NoteItem[] }> {
    try {
      const res = await fetch(`/api/subjects/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.subject) return data;
      }
    } catch {
      // Fall through
    }

    // Fallback
    const catalog = await this.getCatalog();
    const localProgress = this.getLocalProgress();
    const subject = catalog.subjects.find((s: any) => s.id === id);

    if (!subject) throw new Error(`Subject ${id} not found`);

    const modules = (subject.modules || []).map((mod: any) => ({
      ...mod,
      topics: (mod.topics || []).map((t: any) => {
        const p = localProgress[t.id];
        return {
          ...t,
          watched_seconds: p?.watchedSeconds || 0,
          is_completed: p?.isCompleted || false,
          is_bookmarked: p?.isBookmarked || false,
        };
      }),
    }));

    return {
      subject,
      modules,
      notes: subject.notes || [],
    };
  }

  // 3. Get topic detail
  static async getTopic(id: string): Promise<Topic> {
    try {
      const res = await fetch(`/api/topics/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.id) return data;
      }
    } catch {
      // Fall through
    }

    const catalog = await this.getCatalog();
    const localProgress = this.getLocalProgress();

    for (const sub of catalog.subjects) {
      for (const mod of sub.modules || []) {
        for (const t of mod.topics || []) {
          if (t.id === id) {
            const p = localProgress[id];
            return {
              ...t,
              subject_name: sub.name,
              watched_seconds: p?.watchedSeconds || 0,
              is_completed: p?.isCompleted || false,
              is_bookmarked: p?.isBookmarked || false,
              stream_url: `/api/stream/${t.chat_id}/${t.message_id}`,
              user_notes: this.getLocalUserNotes(id),
            };
          }
        }
      }
    }
    throw new Error(`Topic ${id} not found`);
  }

  // 4. Save progress
  static async saveProgress(
    topicId: string,
    watchedSeconds: number,
    totalSeconds: number,
    isCompleted: boolean,
    isBookmarked?: boolean
  ) {
    // 1. Update localStorage
    const local = this.getLocalProgress();
    local[topicId] = {
      watchedSeconds,
      totalSeconds: totalSeconds || 1800,
      isCompleted,
      isBookmarked: isBookmarked !== undefined ? isBookmarked : (local[topicId]?.isBookmarked || false),
      lastWatchedAt: new Date().toISOString(),
    };
    this.setLocalProgress(local);

    // 2. Fire and forget to Cloudflare D1
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId,
          watchedSeconds,
          totalSeconds,
          isCompleted: isCompleted ? 1 : 0,
          isBookmarked: isBookmarked ? 1 : 0,
        }),
      });
    } catch {
      // Offline / local mode is completely fine
    }
  }

  // 5. User timestamped notes
  static getLocalUserNotes(topicId: string): UserNote[] {
    try {
      const raw = localStorage.getItem(NOTES_STORAGE_KEY) || localStorage.getItem(OLD_NOTES_STORAGE_KEY);
      const all = JSON.parse(raw || '{}');
      return all[topicId] || [];
    } catch {
      return [];
    }
  }

  static async saveUserNote(topicId: string, timestampSeconds: number, noteText: string): Promise<UserNote> {
    const newNote: UserNote = {
      id: Date.now(),
      topic_id: topicId,
      timestamp_seconds: timestampSeconds,
      note_text: noteText,
      created_at: new Date().toISOString(),
    };

    // Save locally
    try {
      const all = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) || '{}');
      if (!all[topicId]) all[topicId] = [];
      all[topicId].push(newNote);
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.error(e);
    }

    // Try Cloudflare D1
    try {
      await fetch('/api/user-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, timestampSeconds, noteText }),
      });
    } catch {}

    return newNote;
  }

  // 6. Global Search
  static async search(query: string): Promise<{ topics: Topic[]; notes: NoteItem[] }> {
    if (!query.trim()) return { topics: [], notes: [] };

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.topics || data.notes) return data;
      }
    } catch {}

    // Fallback search across catalog.json
    const catalog = await this.getCatalog();
    const q = query.toLowerCase();
    const matchedTopics: Topic[] = [];
    const matchedNotes: NoteItem[] = [];

    for (const sub of catalog.subjects) {
      for (const mod of sub.modules || []) {
        for (const t of mod.topics || []) {
          const inTitle = t.title.toLowerCase().includes(q);
          const inFilename = t.filename.toLowerCase().includes(q);
          const inPearls = (t.pearls || []).some((p: string) => p.toLowerCase().includes(q));
          if (inTitle || inFilename || inPearls) {
            matchedTopics.push({ ...t, subject_name: sub.name });
          }
        }
      }

      for (const n of sub.notes || []) {
        if (n.title.toLowerCase().includes(q) || n.filename.toLowerCase().includes(q)) {
          matchedNotes.push({ ...n, subject_name: sub.name });
        }
      }
    }

    return {
      topics: matchedTopics.slice(0, 30),
      notes: matchedNotes.slice(0, 15),
    };
  }

  static getStreamUrl(chatId: number, messageId: number): string {
    return `/api/stream/${chatId}/${messageId}`;
  }

  static getNoteUrl(chatId: number, messageId: number): string {
    return `/api/notes/${chatId}/${messageId}`;
  }

  // 7. Get All High-Yield Pearls across all subjects
  static async getAllPearls(): Promise<Array<{
    topic: Topic;
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    subjectColor: string;
    prof: string;
    pearls: string[];
  }>> {
    const catalog = await this.getCatalog();
    const result: Array<any> = [];

    for (const sub of catalog.subjects || []) {
      for (const mod of sub.modules || []) {
        for (const t of mod.topics || []) {
          if (t.pearls && t.pearls.length > 0) {
            result.push({
              topic: { ...t, subject_name: sub.name },
              subjectId: sub.id,
              subjectName: sub.name,
              subjectCode: sub.code,
              subjectColor: sub.color,
              prof: sub.prof,
              pearls: t.pearls,
            });
          }
        }
      }
    }
    return result;
  }

  // 8. Get All Practical Notes across all subjects
  static async getAllNotes(): Promise<Array<NoteItem & {
    subjectName: string;
    subjectCode: string;
    subjectColor: string;
    prof: string;
  }>> {
    const catalog = await this.getCatalog();
    const result: Array<any> = [];

    for (const sub of catalog.subjects || []) {
      for (const n of sub.notes || []) {
        result.push({
          ...n,
          subjectName: sub.name,
          subjectCode: sub.code,
          subjectColor: sub.color,
          prof: sub.prof,
        });
      }
    }
    return result;
  }

  // 9. Get Bookmarked Topics
  static async getBookmarks(): Promise<Topic[]> {
    const catalog = await this.getCatalog();
    const local = this.getLocalProgress();
    const bookmarked: Topic[] = [];

    for (const sub of catalog.subjects || []) {
      for (const mod of sub.modules || []) {
        for (const t of mod.topics || []) {
          if (local[t.id]?.isBookmarked) {
            bookmarked.push({
              ...t,
              subject_name: sub.name,
              is_bookmarked: true,
              watched_seconds: local[t.id].watchedSeconds,
              is_completed: local[t.id].isCompleted,
            });
          }
        }
      }
    }
    return bookmarked;
  }
}

