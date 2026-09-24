import { Topic, UserProgressItem, UserProgressState, UserNote } from '../types/lms';

const PROGRESS_STORAGE_KEY = 'aspirin_user_progress_v2';
const BOOKMARKS_STORAGE_KEY = 'aspirin_user_bookmarks_v2';
const SYNC_INTERVAL_MS = 120_000; // 2 minutes (Cloudflare Free Tier compliant)

export class ProgressService {
  private static pendingSyncQueue: Map<string, UserProgressItem> = new Map();
  private static syncTimer: ReturnType<typeof setInterval> | null = null;
  private static isInitialized = false;
  private static tokenGetter: (() => Promise<string | null>) | null = null;
  private static currentUserId = 'aspirin_guest';

  // Set authenticated user and Clerk token provider
  public static setAuth(userId: string, tokenGetter?: () => Promise<string | null>) {
    this.currentUserId = userId || 'aspirin_guest';
    if (tokenGetter) {
      this.tokenGetter = tokenGetter;
    }
  }

  // Initialize background 2-minute sync loop & unload listener
  public static init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Start 2-minute interval
    this.syncTimer = setInterval(() => {
      this.flushPendingSync();
    }, SYNC_INTERVAL_MS);

    // Sync on page hide / tab close
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushPendingSyncBeacon();
      });
      window.addEventListener('pagehide', () => {
        this.flushPendingSyncBeacon();
      });
    }
  }

  // Get local progress state
  public static getLocalProgress(): UserProgressState {
    try {
      const stored = localStorage.getItem(PROGRESS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  // Save progress: Instant local save + queue for debounced edge sync
  public static saveProgress(
    topicId: string,
    watchedSeconds: number,
    totalSeconds: number,
    isCompleted = false,
    meta?: { subjectId?: string; platformId?: any }
  ) {
    this.init();
    const local = this.getLocalProgress();

    const progressItem: UserProgressItem = {
      topicId,
      watchedSeconds: Math.floor(watchedSeconds),
      totalSeconds: Math.floor(totalSeconds) || 1800,
      isCompleted: isCompleted || (totalSeconds > 0 && watchedSeconds / totalSeconds >= 0.9),
      isBookmarked: this.isBookmarked(topicId),
      lastWatchedAt: new Date().toISOString(),
      subjectId: meta?.subjectId || local[topicId]?.subjectId,
      platformId: meta?.platformId || local[topicId]?.platformId,
    };

    // 1. Instant local write (0ms UI latency)
    local[topicId] = progressItem;
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(local));
    } catch (e) {
      console.warn('localStorage progress save failed:', e);
    }

    // 2. Add to edge sync queue
    this.pendingSyncQueue.set(topicId, progressItem);

    // If completed, flush immediately
    if (progressItem.isCompleted) {
      this.flushPendingSync();
    }
  }

  // Flush queued progress updates to Cloudflare Edge API
  public static async flushPendingSync() {
    if (this.pendingSyncQueue.size === 0) return;

    const payload = Array.from(this.pendingSyncQueue.values());
    this.pendingSyncQueue.clear();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-id': this.currentUserId,
      };

      if (this.tokenGetter) {
        try {
          const token = await this.tokenGetter();
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
        } catch {}
      }

      await fetch('/api/progress', {
        method: 'POST',
        headers,
        body: JSON.stringify({ batch: payload, userId: this.currentUserId }),
      });
    } catch (err) {
      // Re-queue on network error
      payload.forEach((item) => {
        if (item.topicId) {
          this.pendingSyncQueue.set(item.topicId, item);
        }
      });
      console.warn('Background D1 progress sync failed, will retry:', err);
    }
  }

  // Flush on tab close via sendBeacon
  private static flushPendingSyncBeacon() {
    if (this.pendingSyncQueue.size === 0) return;
    const payload = Array.from(this.pendingSyncQueue.values());
    this.pendingSyncQueue.clear();

    try {
      const blob = new Blob([JSON.stringify({ batch: payload })], { type: 'application/json' });
      navigator.sendBeacon('/api/progress', blob);
    } catch {}
  }

  // Bookmarking System
  public static isBookmarked(topicId: string): boolean {
    const bookmarks = this.getBookmarkedMap();
    return !!bookmarks[topicId];
  }

  public static toggleBookmark(topic: Topic): boolean {
    const bookmarks = this.getBookmarkedMap();
    const isCurrently = !!bookmarks[topic.id];

    if (isCurrently) {
      delete bookmarks[topic.id];
    } else {
      bookmarks[topic.id] = topic;
    }

    try {
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
    } catch {}

    // Update progress state
    const local = this.getLocalProgress();
    if (local[topic.id]) {
      local[topic.id].isBookmarked = !isCurrently;
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(local));
    }

    return !isCurrently;
  }

  public static getBookmarkedMap(): Record<string, Topic> {
    try {
      const stored = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  public static getBookmarks(): Topic[] {
    return Object.values(this.getBookmarkedMap());
  }

  // Extract "Continue Watching" sorted by last watched timestamp
  public static getContinueWatching(allTopics: Topic[]): { topic: Topic; progress: UserProgressItem }[] {
    const progressMap = this.getLocalProgress();
    const topicsMap = new Map<string, Topic>(allTopics.map((t) => [t.id, t]));

    const inProgressList: { topic: Topic; progress: UserProgressItem }[] = [];

    Object.entries(progressMap).forEach(([topicId, item]) => {
      // Must have watched at least 15 seconds and not completed
      if (item.watchedSeconds > 15 && !item.isCompleted && item.lastWatchedAt) {
        const topic = topicsMap.get(topicId);
        if (topic) {
          inProgressList.push({ topic, progress: item });
        }
      }
    });

    // Sort descending by lastWatchedAt
    return inProgressList.sort((a, b) => {
      const tA = new Date(a.progress.lastWatchedAt || 0).getTime();
      const tB = new Date(b.progress.lastWatchedAt || 0).getTime();
      return tB - tA;
    });
  }

  // Personal Timestamped Notes System
  public static getTopicNotes(topicId: string): UserNote[] {
    try {
      const stored = localStorage.getItem('aspirin_user_notes_v2');
      const allNotes: Record<string, UserNote[]> = stored ? JSON.parse(stored) : {};
      return (allNotes[topicId] || []).sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
    } catch {
      return [];
    }
  }

  public static addTopicNote(topicId: string, timestampSeconds: number, noteText: string): UserNote {
    const stored = localStorage.getItem('aspirin_user_notes_v2');
    const allNotes: Record<string, UserNote[]> = stored ? JSON.parse(stored) : {};
    if (!allNotes[topicId]) {
      allNotes[topicId] = [];
    }

    const newNote: UserNote = {
      id: Date.now(),
      topic_id: topicId,
      timestamp_seconds: Math.floor(timestampSeconds),
      note_text: noteText.trim(),
      created_at: new Date().toISOString(),
    };

    allNotes[topicId].push(newNote);
    try {
      localStorage.setItem('aspirin_user_notes_v2', JSON.stringify(allNotes));
    } catch {}

    return newNote;
  }

  public static deleteTopicNote(topicId: string, noteId: number): void {
    const stored = localStorage.getItem('aspirin_user_notes_v2');
    const allNotes: Record<string, UserNote[]> = stored ? JSON.parse(stored) : {};
    if (allNotes[topicId]) {
      allNotes[topicId] = allNotes[topicId].filter((n) => n.id !== noteId);
      try {
        localStorage.setItem('aspirin_user_notes_v2', JSON.stringify(allNotes));
      } catch {}
    }
  }
}
