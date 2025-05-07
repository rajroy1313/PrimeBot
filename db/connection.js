/**
 * Database connection module
 * 
 * This module provides a connection to the PostgreSQL database
 * for the Discord bot to store persistent data.
 */

const { Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const ws = require('ws');
const schema = require('./schema');

// Set up Neon configuration for WebSockets
const neonConfig = require('@neondatabase/serverless').neonConfig;
neonConfig.webSocketConstructor = ws;

// Check if DATABASE_URL is provided
if (!process.env.DATABASE_URL) {
  console.error('[DATABASE] No DATABASE_URL found in environment variables!');
  console.error('[DATABASE] Please check your configuration and try again.');
  process.exit(1);
}

// Create a connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create a Drizzle ORM instance with our schema
const db = drizzle(pool, { schema });

// Export the pool and db instance for use in other modules
module.exports = { pool, db, schema };