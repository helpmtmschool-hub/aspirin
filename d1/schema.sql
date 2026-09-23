-- Yui LMS Cloudflare D1 Relational Database Schema
DROP TABLE IF EXISTS user_notes;
DROP TABLE IF EXISTS user_progress;
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS topics;
DROP TABLE IF EXISTS modules;
DROP TABLE IF EXISTS subjects;

CREATE TABLE subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    prof TEXT NOT NULL,
    category TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    display_order INTEGER NOT NULL
);

CREATE TABLE modules (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL,
    title TEXT NOT NULL,
    display_order INTEGER DEFAULT 1,
    FOREIGN KEY(subject_id) REFERENCES subjects(id)
);

CREATE TABLE topics (
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

CREATE TABLE notes (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    telegram_chat_id INTEGER NOT NULL,
    telegram_message_id INTEGER NOT NULL,
    FOREIGN KEY(subject_id) REFERENCES subjects(id)
);

CREATE TABLE user_progress (
    topic_id TEXT PRIMARY KEY,
    watched_seconds REAL DEFAULT 0,
    total_seconds REAL DEFAULT 1800,
    is_completed INTEGER DEFAULT 0,
    is_bookmarked INTEGER DEFAULT 0,
    last_watched_at TEXT,
    FOREIGN KEY(topic_id) REFERENCES topics(id)
);

CREATE TABLE user_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id TEXT NOT NULL,
    timestamp_seconds REAL NOT NULL,
    note_text TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(topic_id) REFERENCES topics(id)
);

CREATE INDEX idx_topics_subject ON topics(subject_id);
CREATE INDEX idx_notes_subject ON notes(subject_id);
CREATE INDEX idx_progress_topic ON user_progress(topic_id);
