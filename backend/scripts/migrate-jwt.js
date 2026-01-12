#!/usr/bin/env node
/**
 * JWT Migration Script
 *
 * Adds refresh_tokens table to existing AggieAce databases
 * Run this if you already have a database and need to add JWT support
 *
 * Usage: node scripts/migrate-jwt.js
 */

import 'dotenv/config';
import pool from '../src/config/database.config.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateJWT() {
  const client = await pool.connect();
  
  try {
    console.log('Starting JWT migration...');
    
    // Check if refresh_tokens table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'refresh_tokens'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✓ refresh_tokens table already exists. Skipping migration.');
      return;
    }
    
    // Read and execute migration SQL
    const migrationSQL = `
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

      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_is_revoked ON refresh_tokens(is_revoked);
    `;
    
    await client.query(migrationSQL);
    console.log('✓ Successfully created refresh_tokens table and indexes');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateJWT()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
