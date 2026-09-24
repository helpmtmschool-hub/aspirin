-- Drop user-state tables to allow clean schema migration
DROP TABLE IF EXISTS user_notes;
DROP TABLE IF EXISTS user_active_sessions;
DROP TABLE IF EXISTS user_progress;

CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    prof TEXT NOT NULL,
    category TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    display_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS modules (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL,
    title TEXT NOT NULL,
    display_order INTEGER DEFAULT 1,
    FOREIGN KEY(subject_id) REFERENCES subjects(id)
);

CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL,
    module_id TEXT NOT NULL,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    duration_seconds INTEGER DEFAULT 1800,
    duration_formatted TEXT DEFAULT '30 mins',
    telegram_chat_id INTEGER NOT NULL,
    telegram_message_id INTEGER NOT NULL,
    pearls_json TEXT DEFAULT '[]',
    display_order INTEGER DEFAULT 1,
    FOREIGN KEY(subject_id) REFERENCES subjects(id),
    FOREIGN KEY(module_id) REFERENCES modules(id)
);

CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    telegram_chat_id INTEGER NOT NULL,
    telegram_message_id INTEGER NOT NULL,
    FOREIGN KEY(subject_id) REFERENCES subjects(id)
);

-- Multi-user watch progress table (2-minute debounced sync)
CREATE TABLE IF NOT EXISTS user_progress (
    user_id TEXT NOT NULL DEFAULT 'aspirin_guest',
    topic_id TEXT NOT NULL,
    watched_seconds REAL DEFAULT 0,
    total_seconds REAL DEFAULT 1800,
    is_completed INTEGER DEFAULT 0,
    is_bookmarked INTEGER DEFAULT 0,
    last_watched_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, topic_id)
);

-- 1-Device Active Session Policy Table (Anti-Account Sharing)
CREATE TABLE IF NOT EXISTS user_active_sessions (
    user_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    device_name TEXT,
    ip_address TEXT,
    user_agent TEXT,
    last_heartbeat TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Timestamped Personal Clinical Notes
CREATE TABLE IF NOT EXISTS user_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'aspirin_guest',
    topic_id TEXT NOT NULL,
    timestamp_seconds REAL NOT NULL,
    note_text TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Optimized Performance Indexes for Cloudflare D1
CREATE INDEX IF NOT EXISTS idx_topics_subject ON topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_notes_subject ON notes(subject_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_topic ON user_progress(user_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_topic ON user_notes(user_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_device ON user_active_sessions(user_id, device_id);
