#!/usr/bin/env node
/**
 * Database Setup Script
 *
 * Initialize PostgreSQL database with required tables
 *
 * Usage: node scripts/setup-db.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables FIRST
dotenv.config({ path: path.join(__dirname, '../.env') });

async function setupDatabase() {
  console.log('Starting database setup...\n');

  // Dynamically import db config after env vars are loaded
  const { default: pool, testConnection } = await import('../src/config/db.config.js');

  // Test connection
  const connected = await testConnection();
  if (!connected) {
    console.error('Could not connect to database. Please check your configuration.');
    process.exit(1);
  }

  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, 'init_db.sql');
    const sql = await fs.readFile(sqlPath, 'utf-8');

    // Execute SQL
    console.log('Executing database schema...');
    await pool.query(sql);

    console.log('Database schema created successfully!\n');
    console.log('Tables created:');
    console.log('   - users');
    console.log('   - calendar_history');
    console.log('\nDatabase setup complete!');

  } catch (error) {
    console.error('Database setup failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();
