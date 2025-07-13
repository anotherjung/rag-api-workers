-- Migration script for RAG AI Tutorial database

-- Check if metadata column exists, if not add it
-- D1 doesn't support IF NOT EXISTS for columns, so this needs to be run carefully

-- Option 1: Create new table with metadata and migrate data
CREATE TABLE IF NOT EXISTS notes_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    metadata TEXT DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Copy existing data if table exists
-- INSERT INTO notes_new (id, text) SELECT id, text FROM notes;

-- Drop old table and rename new table
-- DROP TABLE IF EXISTS notes;
-- ALTER TABLE notes_new RENAME TO notes;

-- Option 2: Just create the table if it doesn't exist (for new installations)
CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    metadata TEXT DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);

-- Future: Full-text search support
-- CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
--     text, 
--     metadata,
--     content=notes,
--     content_rowid=id
-- );