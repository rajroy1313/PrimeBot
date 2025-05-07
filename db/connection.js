const { Pool, neonConfig } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const schema = require('./schema');
const ws = require('ws');

// Configure neon to use the ws package for WebSocket connections
neonConfig.webSocketConstructor = ws;

// Check for environment variables
if (!process.env.DATABASE_URL) {
  console.error('[DATABASE] Missing DATABASE_URL. Database features will not work properly.');
}

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // maximum number of clients
});

// Create a drizzle ORM instance
const db = drizzle(pool, { schema });

// Export the database instance and pool
module.exports = { db, pool, schema };