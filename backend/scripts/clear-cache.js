#!/usr/bin/env node
/**
 * Clear Cache Script
 *
 * Clears the syllabus cache from the database:
 * - syllabus_cache table
 *
 * Usage: node setupScripts/clear-cache.js
 */

import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'aggieace',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function clearCache() {
  console.log('Clear Cache - AggieAce Database');
  console.log('');

  const client = await pool.connect();

  try {
    // Clear syllabus_cache table
    console.log('Clearing syllabus_cache table...');
    const cacheResult = await client.query('DELETE FROM syllabus_cache');
    console.log(`   Deleted ${cacheResult.rowCount} cached syllabus records`);

    console.log('');
    console.log('Cache cleared successfully!');
    console.log('');

  } catch (error) {
    console.error('Error clearing cache:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

clearCache();
