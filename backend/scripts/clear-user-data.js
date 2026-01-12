#!/usr/bin/env node
/**
 * Clear User Data Script
 *
 * Clears all user data from the database:
 * - calendar_history table
 * - users table
 *
 * Usage: node setupScripts/clear-user-data.js
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

async function clearUserData() {
  console.log('Clear User Data - AggieAce Database');
  console.log('');

  const client = await pool.connect();

  try {
    // Start transaction
    await client.query('BEGIN');

    // Clear calendar_history first (has foreign key to users)
    console.log('Clearing calendar_history table...');
    const historyResult = await client.query('DELETE FROM calendar_history');
    console.log(`   Deleted ${historyResult.rowCount} calendar history records`);

    // Clear users table
    console.log('Clearing users table...');
    const usersResult = await client.query('DELETE FROM users');
    console.log(`   Deleted ${usersResult.rowCount} user records`);

    // Commit transaction
    await client.query('COMMIT');

    console.log('');
    console.log('User data cleared successfully!');
    console.log('');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error clearing user data:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

clearUserData();
