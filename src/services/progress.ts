import { Topic, UserProgressItem, UserProgressState, UserNote } from '../types/lms';

const PROGRESS_STORAGE_KEY = 'aspirin_user_progress_v2';
const BOOKMARKS_STORAGE_KEY = 'aspirin_user_bookmarks_v2';
const NOTES_STORAGE_KEY = 'aspirin_user_notes_v2';
const SYNC_INTERVAL_MS = 60_000; // 1 minute debounced cloud sync

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export interface ResumePositionInfo {
  shouldPrompt: boolean;
  resumeSeconds: number;
  percent: number;
  formattedTime: string;
}

export class ProgressService {
  private static pendingSyncQueue: Map<string, UserProgressItem> = new Map();
  private static syncTimer: ReturnType<typeof setInterval> | null = null;
  private static isInitialized = false;
  private static tokenGetter: (() => Promise<string | null>) | null = null;
  private static currentUserId = 'aspirin_guest';
  private static currentSyncStatus: SyncStatus = 'idle';
  private static syncListeners: Set<(status: SyncStatus) => void> = new Set();
  private static lastRemoteSyncTime = 0;

  // Set authenticated user and Clerk token provider
  public static setAuth(userId: string, tokenGetter?: () => Promise<string | null>) {
    const prevId = this.currentUserId;
    this.currentUserId = userId || 'aspirin_guest';
    if (tokenGetter) {
      this.tokenGetter = tokenGetter;
    }
    // If user changed, trigger immediate remote sync
    if (userId && userId !== prevId) {
      this.syncRemoteProgress(userId);
    }
  }

  // Subscribe to cloud sync status changes
  public static onSyncStatusChange(cb: (status: SyncStatus) => void): () => void {
    this.syncListeners.add(cb);
    cb(this.currentSyncStatus);
    return () => {
      this.syncListeners.delete(cb);
    };
  }

  private static setSyncStatus(status: SyncStatus) {
    this.currentSyncStatus = status;
    this.syncListeners.forEach((cb) => {
      try {
        cb(status);
      } catch (err) {
        console.error('Error in sync status listener:', err);
      }
    });
  }

  // Initialize background sync loop & unload listener
  public static init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Start 1-minute background interval
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

  // Pull and merge remote progress from Cloudflare D1 / server
  public static async syncRemoteProgress(userId?: string): Promise<UserProgressState> {
    const targetUser = userId || this.currentUserId;
    if (!targetUser) return this.getLocalProgress();

    this.setSyncStatus('syncing');

    try {
      const headers: Record<string, string> = {
        'x-user-id': targetUser,
      };

      if (this.tokenGetter) {
        try {
          const token = await this.tokenGetter();
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
        } catch {}
      }

      const res = await fetch(`/api/progress/${encodeURIComponent(targetUser)}`, { headers });
      if (!res.ok) {
        throw new Error(`Progress fetch failed with status ${res.status}`);
      }

      const data = await res.json();
      const remoteProg: Record<string, UserProgressItem> = data.progress || {};

      // Merge remote into local state
      const local = this.getLocalProgress();
      let hasChanges = false;

      Object.entries(remoteProg).forEach(([topicId, remoteItem]) => {
        // If this topic has an un-flushed local edit in queue, don't overwrite with older remote
        if (this.pendingSyncQueue.has(topicId)) {
          return;
        }

        const localItem = local[topicId];
        if (!localItem) {
          local[topicId] = remoteItem;
          hasChanges = true;
          return;
        }

        const remoteTime = new Date(remoteItem.lastWatchedAt || 0).getTime();
        const localTime = new Date(localItem.lastWatchedAt || 0).getTime();

        // If remote has later timestamp or is marked completed while local isn't
        if (remoteTime > localTime || (remoteItem.isCompleted && !localItem.isCompleted)) {
          local[topicId] = {
            ...localItem,
            ...remoteItem,
            watchedSeconds: Math.max(localItem.watchedSeconds, remoteItem.watchedSeconds),
            isCompleted: localItem.isCompleted || remoteItem.isCompleted,
            isBookmarked: remoteItem.isBookmarked ?? localItem.isBookmarked,
          };
          hasChanges = true;
        }
      });

      if (hasChanges) {
        try {
          localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(local));
        } catch {}
      }

      this.lastRemoteSyncTime = Date.now();
      this.setSyncStatus('synced');
      return local;
    } catch (err) {
      console.warn('[ProgressService] Cloud progress sync failed (using local offline cache):', err);
      this.setSyncStatus('error');
      return this.getLocalProgress();
    }
  }

  // Calculate intelligent resume playback metadata for a topic
  public static getResumePosition(topicId: string): ResumePositionInfo {
    const local = this.getLocalProgress();
    const item = local[topicId];

    if (!item || item.watchedSeconds <= 15 || item.isCompleted) {
      return {
        shouldPrompt: false,
        resumeSeconds: 0,
        percent: 0,
        formattedTime: '00:00',
      };
    }

    const total = item.totalSeconds || 1800;
    const percent = Math.min(99, Math.round((item.watchedSeconds / total) * 100));

    const mins = Math.floor(item.watchedSeconds / 60);
    const secs = Math.floor(item.watchedSeconds % 60);
    const formattedTime = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    return {
      shouldPrompt: true,
      resumeSeconds: item.watchedSeconds,
      percent,
      formattedTime,
    };
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

    // If completed, flush immediately to cloud
    if (progressItem.isCompleted) {
      this.flushPendingSync();
    }
  }

  // Flush queued progress updates to Cloudflare Edge API / dev server
  public static async flushPendingSync() {
    if (this.pendingSyncQueue.size === 0) return;

    const payload = Array.from(this.pendingSyncQueue.values());
    this.pendingSyncQueue.clear();

    this.setSyncStatus('syncing');

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

      const res = await fetch('/api/progress', {
        method: 'POST',
        headers,
        body: JSON.stringify({ batch: payload, userId: this.currentUserId }),
      });

      if (!res.ok) {
        throw new Error(`Cloud progress save returned ${res.status}`);
      }

      this.setSyncStatus('synced');
    } catch (err) {
      // Re-queue on network error
      payload.forEach((item) => {
        if (item.topicId) {
          this.pendingSyncQueue.set(item.topicId, item);
        }
      });
      this.setSyncStatus('error');
      console.warn('Background D1 progress sync failed, will retry:', err);
    }
  }

  // Flush on tab close via sendBeacon
  private static flushPendingSyncBeacon() {
    if (this.pendingSyncQueue.size === 0) return;
    const payload = Array.from(this.pendingSyncQueue.values());
    this.pendingSyncQueue.clear();

    try {
      const blob = new Blob([JSON.stringify({ batch: payload, userId: this.currentUserId })], {
        type: 'application/json',
      });
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
      try {
        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(local));
      } catch {}
      this.pendingSyncQueue.set(topic.id, local[topic.id]);
      this.flushPendingSync();
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

  // Personal Timestamped Notes System (Local + Cloud Sync)
  public static getTopicNotes(topicId: string): UserNote[] {
    try {
      const stored = localStorage.getItem(NOTES_STORAGE_KEY);
      const allNotes: Record<string, UserNote[]> = stored ? JSON.parse(stored) : {};
      return (allNotes[topicId] || []).sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
    } catch {
      return [];
    }
  }

  // Fetch remote notes from Cloudflare D1 / server
  public static async fetchRemoteNotes(topicId: string): Promise<UserNote[]> {
    try {
      const headers: Record<string, string> = {
        'x-user-id': this.currentUserId,
      };
      if (this.tokenGetter) {
        try {
          const token = await this.tokenGetter();
          if (token) headers['Authorization'] = `Bearer ${token}`;
        } catch {}
      }

      const res = await fetch(`/api/user-notes/${encodeURIComponent(topicId)}`, { headers });
      if (!res.ok) return this.getTopicNotes(topicId);

      const data = await res.json();
      const remoteNotes: UserNote[] = data.notes || [];

      // Merge with local notes
      const stored = localStorage.getItem(NOTES_STORAGE_KEY);
      const allNotes: Record<string, UserNote[]> = stored ? JSON.parse(stored) : {};
      const localTopicNotes = allNotes[topicId] || [];

      const mergedMap = new Map<string, UserNote>();
      localTopicNotes.forEach((n) => mergedMap.set(`${n.timestamp_seconds}_${n.note_text}`, n));
      remoteNotes.forEach((n) => mergedMap.set(`${n.timestamp_seconds}_${n.note_text}`, n));

      const mergedList = Array.from(mergedMap.values()).sort(
        (a, b) => a.timestamp_seconds - b.timestamp_seconds
      );

      allNotes[topicId] = mergedList;
      try {
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(allNotes));
      } catch {}

      return mergedList;
    } catch (e) {
      console.warn('Remote notes fetch failed, falling back to local notes:', e);
      return this.getTopicNotes(topicId);
    }
  }

  public static async addTopicNote(
    topicId: string,
    timestampSeconds: number,
    noteText: string
  ): Promise<UserNote> {
    const stored = localStorage.getItem(NOTES_STORAGE_KEY);
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
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(allNotes));
    } catch {}

    // Cloud sync in background
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-id': this.currentUserId,
      };
      if (this.tokenGetter) {
        try {
          const token = await this.tokenGetter();
          if (token) headers['Authorization'] = `Bearer ${token}`;
        } catch {}
      }

      fetch('/api/user-notes', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          topicId,
          timestampSeconds: newNote.timestamp_seconds,
          noteText: newNote.note_text,
          userId: this.currentUserId,
        }),
      }).catch((e) => console.warn('Cloud note save failed:', e));
    } catch {}

    return newNote;
  }

  public static async deleteTopicNote(topicId: string, noteId: number): Promise<void> {
    const stored = localStorage.getItem(NOTES_STORAGE_KEY);
    const allNotes: Record<string, UserNote[]> = stored ? JSON.parse(stored) : {};
    if (allNotes[topicId]) {
      allNotes[topicId] = allNotes[topicId].filter((n) => n.id !== noteId);
      try {
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(allNotes));
      } catch {}
    }

    // Cloud delete in background
    try {
      const headers: Record<string, string> = {
        'x-user-id': this.currentUserId,
      };
      if (this.tokenGetter) {
        try {
          const token = await this.tokenGetter();
          if (token) headers['Authorization'] = `Bearer ${token}`;
        } catch {}
      }

      fetch(`/api/user-notes/${noteId}`, {
        method: 'DELETE',
        headers,
      }).catch((e) => console.warn('Cloud note delete failed:', e));
    } catch {}
  }
}
