export type MBBSProf = 
  | '1st Prof'
  | '2nd Prof'
  | '3rd Prof Part 1'
  | 'Final Prof Part 2';

export type PlatformId = 'prepx_en' | 'prepx_hi' | 'cerebellum';

export interface PlatformMetadata {
  id: PlatformId;
  name: string;
  shortName: string;
  tagline: string;
  badge: string;
  badgeColor: string;
  facultyHighlight?: string;
}

export interface SubjectVisual {
  id: string;
  emoji: string;
  iconName: string;
  tagline: string;
  prof: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  prof: MBBSProf;
  category: 'Pre-Clinical' | 'Para-Clinical' | 'Clinical';
  icon: string;
  color: string;
  display_order: number;
  available_platforms: PlatformId[];
  total_topics: number;
  total_notes: number;
  completed_topics?: number;
  progress_percentage?: number;
  platform_data?: Record<PlatformId, PlatformContent>;
  visual?: SubjectVisual;
}

export interface PlatformContent {
  platform_id: PlatformId;
  subject_id: string;
  faculty?: string;
  modules: Module[];
  notes: NoteItem[];
  total_duration_formatted?: string;
}

export interface Module {
  id: string;
  name: string;
  subject_id?: string;
  platform_id?: PlatformId;
  topics: Topic[];
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
  file_size_mb?: number;
  duration_seconds: number;
  duration_formatted?: string;
  telegram_chat_id: number;
  telegram_message_id: number;
  thumbnail_url?: string;
  pearls?: string[];
  watched_seconds?: number;
  is_completed?: boolean;
  is_bookmarked?: boolean;
  stream_url?: string;
  last_watched_at?: string;
}

export interface NoteItem {
  id: string;
  subject_id: string;
  platform_id?: PlatformId;
  title: string;
  faculty?: string;
  filename: string;
  file_size_bytes: number;
  file_size_mb?: number;
  telegram_chat_id: number;
  telegram_message_id: number;
  date?: string;
  is_master_textbook?: boolean;
}

export interface UserNote {
  id?: number;
  topic_id: string;
  timestamp_seconds: number;
  note_text: string;
  created_at?: string;
}

export interface UserProgressItem {
  topicId?: string;
  watchedSeconds: number;
  totalSeconds: number;
  isCompleted: boolean;
  isBookmarked: boolean;
  lastWatchedAt?: string;
  subjectId?: string;
  platformId?: PlatformId;
}

export interface UserProgressState {
  [topicId: string]: UserProgressItem;
}

export interface UserBookmarkItem {
  topic: Topic;
  timestamp: string;
}

// Future QBank schema ready
export interface QBankQuestion {
  id: string;
  subject_id: string;
  module_name: string;
  stem: string;
  image_url?: string;
  options: {
    id: 'A' | 'B' | 'C' | 'D';
    text: string;
    percentage_chosen?: number;
  }[];
  correct_option: 'A' | 'B' | 'C' | 'D';
  explanation: {
    summary: string;
    key_concept: string;
    options_breakdown: Record<'A' | 'B' | 'C' | 'D', string>;
    high_yield_pearl?: string;
  };
  tags: string[];
}
