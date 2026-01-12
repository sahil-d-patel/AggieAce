/**
 * Database Configuration
 *
 * PostgreSQL connection and pool setup
 *
 * @module config/db
 */

import pg from 'pg';
const { Pool } = pg;

/**
 * Create PostgreSQL connection pool
 */
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'aggieace',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

/**
 * Handle pool errors
 */
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Test database connection
 */
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('PostgreSQL connected successfully');
    client.release();
    return true;
  } catch (error) {
    console.error('PostgreSQL connection failed:', error.message);
    return false;
  }
};

/**
 * Query helper function
 *
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
export const query = (text, params) => {
  return pool.query(text, params);
};

/**
 * Get a client from the pool
 *
 * @returns {Promise<Object>} Database client
 */
export const getClient = () => {
  return pool.connect();
};

export default pool;
