-- AggieAce Database Schema
-- Create tables for storing user calendar history

-- Create users table to track Google users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create calendar_history table to store generated calendars
CREATE TABLE IF NOT EXISTS calendar_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_name VARCHAR(255) NOT NULL,
    section_number VARCHAR(50) NOT NULL,
    semester_start DATE NOT NULL,
    semester_end DATE NOT NULL,
    timezone VARCHAR(100) NOT NULL,
    ics_file_path VARCHAR(500) NOT NULL,
    ics_file_content TEXT NOT NULL,
    pdf_file_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user
        FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- Create syllabus_cache table for SHA-256 hash-based caching
-- This avoids reprocessing identical syllabi through the LLM
CREATE TABLE IF NOT EXISTS syllabus_cache (
    id SERIAL PRIMARY KEY,
    sha256_hash VARCHAR(64) UNIQUE NOT NULL,
    ics_file_path VARCHAR(500) NOT NULL,
    ics_file_content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_calendar_history_user_id ON calendar_history(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_history_created_at ON calendar_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_syllabus_cache_hash ON syllabus_cache(sha256_hash);

-- Add updated_at trigger for users table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Refresh Tokens Table for JWT Authentication
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(256) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_revoked BOOLEAN DEFAULT FALSE,
    user_agent VARCHAR(500),
    ip_address VARCHAR(45)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_is_revoked ON refresh_tokens(is_revoked);
