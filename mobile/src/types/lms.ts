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
  module?: string;
  title: string;
  filename: string;
  file_size_bytes: number;
  file_size_mb: number;
  duration_seconds: number;
  duration_formatted: string;
  chat_id?: number;
  message_id?: number;
  stream_url?: string;
  pearls?: string[];
  is_completed?: boolean;
}

export interface Module {
  id: string;
  name: string;
  subject_id?: string;
  topics: Topic[];
}

export interface NoteItem {
  id: string;
  title: string;
  subject_id: string;
  file_size_bytes?: number;
  file_size_mb?: number;
  download_url?: string;
  pages_count?: number;
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
  modules?: Module[];
  notes?: NoteItem[];
}
