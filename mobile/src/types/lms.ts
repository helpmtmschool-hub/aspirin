export type MBBSProf = 
  | '1st Prof'
  | '2nd Prof'
  | '3rd Prof Part 1'
  | 'Final Prof Part 2';

export type PlatformId = 'prepx_en' | 'prepx_hi' | 'cerebellum' | 'marrow';

export interface SubjectVisual {
  id: string;
  emoji: string;
  iconName: string;
  tagline: string;
  prof: MBBSProf;
}

export interface Topic {
  id: string;
  subject_id: string;
  module_id?: string;
  module?: string;
  platform_id?: PlatformId;
  title: string;
  filename: string;
  file_size_bytes: number;
  file_size_mb: number;
  duration_seconds: number;
  duration_formatted: string;
  chat_id?: number;
  message_id?: number;
  telegram_chat_id?: number;
  telegram_message_id?: number;
  thumbnail_url?: string;
  stream_url?: string;
  pearls?: string[];
  is_completed?: boolean;
  is_bookmarked?: boolean;
  watched_seconds?: number;
  last_watched_at?: string;
}

export interface Module {
  id: string;
  name: string;
  subject_id?: string;
  platform_id?: PlatformId;
  topics: Topic[];
}

export interface NoteItem {
  id: string;
  title: string;
  subject_id: string;
  platform_id?: PlatformId;
  file_size_bytes?: number;
  file_size_mb?: number;
  telegram_chat_id?: number;
  telegram_message_id?: number;
  download_url?: string;
  pages_count?: number;
  is_master_textbook?: boolean;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  prof: MBBSProf;
  category: 'Pre-Clinical' | 'Para-Clinical' | 'Clinical';
  icon: string;
  color: string;
  total_topics: number;
  total_notes: number;
  completed_topics?: number;
  progress_percentage?: number;
  available_platforms?: PlatformId[];
  modules?: Module[];
  notes?: NoteItem[];
}
