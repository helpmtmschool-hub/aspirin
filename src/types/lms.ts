export type MBBSProf = 
  | '1st Prof'
  | '2nd Prof'
  | '3rd Prof Part 1'
  | 'Final Prof Part 2';

export interface Subject {
  id: string;
  name: string;
  code: string;
  prof: MBBSProf;
  category: 'Pre-Clinical' | 'Para-Clinical' | 'Clinical';
  icon: string;
  color: string;
  display_order: number;
  total_topics: number;
  total_notes: number;
  completed_topics?: number;
  progress_percentage?: number;
  modules?: Module[];
  notes?: NoteItem[];
}

export interface Module {
  id: string;
  name: string;
  subject_id?: string;
  topics: Topic[];
}

export interface Topic {
  id: string;
  subject_id: string;
  module_id?: string;
  module?: string;
  title: string;
  filename: string;
  file_size_bytes: number;
  file_size_mb?: number;
  duration_seconds: number;
  duration_formatted?: string;
  telegram_chat_id: number;
  telegram_message_id: number;
  pearls: string[];
  watched_seconds?: number;
  is_completed?: number | boolean;
  is_bookmarked?: number | boolean;
  stream_url?: string;
  user_notes?: UserNote[];
  date?: string;
}

export interface NoteItem {
  id: string;
  subject_id: string;
  title: string;
  filename: string;
  file_size_bytes: number;
  file_size_mb?: number;
  telegram_chat_id: number;
  telegram_message_id: number;
  date?: string;
}

export interface UserNote {
  id?: number;
  topic_id: string;
  timestamp_seconds: number;
  note_text: string;
  created_at?: string;
}

export interface UserProgressState {
  [topicId: string]: {
    watchedSeconds: number;
    totalSeconds: number;
    isCompleted: boolean;
    isBookmarked: boolean;
    lastWatchedAt?: string;
  };
}

export type LMSTheme = 'marrow' | 'prepladder' | 'night';
