#!/usr/bin/env node
/**
 * Setup Test Database Script
 *
 * Creates a test database for integration testing
 *
 * Usage: node scripts/setup-test-db.js
 */

import 'dotenv/config';
import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

async function setupTestDatabase() {
  console.log('Setup Test Database - AggieAce');
  console.log('');

  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
  };

  const testDbName = 'aggieace_test';

  // Connect to postgres database to create test database
  const adminPool = new Pool({
    ...dbConfig,
    database: 'postgres'
  });

  try {
    console.log('Connecting to PostgreSQL...');
    await adminPool.query('SELECT 1');
    console.log('Connected to PostgreSQL');

    // Drop existing test database
    console.log('Dropping existing test database (if exists)...');
    await adminPool.query(`DROP DATABASE IF EXISTS ${testDbName}`);

    // Create test database
    console.log(`Creating test database: ${testDbName}...`);
    await adminPool.query(`CREATE DATABASE ${testDbName}`);
    console.log('Test database created');

    await adminPool.end();

    // Connect to test database to apply schema
    const testPool = new Pool({
      ...dbConfig,
      database: testDbName
    });

    console.log('Applying database schema...');
    const schemaPath = path.join(__dirname, 'init_db.sql');
    const schema = await fs.readFile(schemaPath, 'utf-8');

    // Split schema into individual statements and execute
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      try {
        await testPool.query(statement);
      } catch (err) {
        // Ignore errors for DROP IF EXISTS and similar
        if (!err.message.includes('does not exist')) {
          console.warn(`Warning: ${err.message}`);
        }
      }
    }

    console.log('Schema applied successfully');

    // Verify tables exist
    const tablesResult = await testPool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('');
    console.log('Created tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    await testPool.end();

    console.log('');
    console.log('Test database setup complete!');
    console.log('');
    console.log('To run tests:');
    console.log('   npm run test:integration');
    console.log('');

  } catch (error) {
    console.error('Error setting up test database:', error.message);
    process.exit(1);
  }
}

setupTestDatabase();
