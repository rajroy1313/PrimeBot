const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const schema = require("../shared/schema.js");

// Parse PostgreSQL connection string - prioritize DATABASE_URL for Replit PostgreSQL
function parseConnectionString() {
  // Use Replit's DATABASE_URL if available (recommended for Replit PostgreSQL)
  if (process.env.DATABASE_URL) {
    try {
      console.log('✅ Using Replit PostgreSQL DATABASE_URL');
      return {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
        max: 10, // Connection pool size
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      };
    } catch (error) {
      console.warn('Failed to parse DATABASE_URL, falling back to individual env vars:', error.message);
    }
  } else {
    console.warn('⚠️ DATABASE_URL not found. Please create a PostgreSQL database in Replit.');
    console.log('💡 To fix: Open a new tab, type "Database", and click "Create a database"');
  }

  const dbHost = process.env.DB_HOST || '';
  
  // Check if DB_HOST is a full PostgreSQL connection string
  if (dbHost.includes('postgresql://') || dbHost.includes('postgres://')) {
    try {
      // PostgreSQL connection strings have the format:
      // postgresql://username:password@host:port/database?options
      const url = new URL(dbHost);
      
      return {
        host: url.hostname || 'localhost',
        port: parseInt(url.port) || 5432,
        user: decodeURIComponent(url.username) || 'postgres',
        password: decodeURIComponent(url.password) || '',
        database: url.pathname.slice(1) || 'discord_bot', // Remove leading slash
        ssl: url.searchParams.get('sslmode') === 'require' ? { rejectUnauthorized: false } : false,
        max: 10, // Connection pool size
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      };
    } catch (error) {
      console.warn('Failed to parse PostgreSQL connection string, using individual env vars:', error.message);
    }
  }
  
  // Fallback to individual environment variables
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'discord_bot',
    ssl: process.env.DB_SSL === 'require' ? { rejectUnauthorized: false } : false,
    max: 10, // Connection pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
}

const dbConfig = parseConnectionString();

// Create PostgreSQL connection pool with better timeout settings
const pool = new Pool({
    ...dbConfig,
    connectionTimeoutMillis: 10000, // 10 seconds
    idleTimeoutMillis: 30000, // 30 seconds
    max: 10, // maximum number of connections
    allowExitOnIdle: true
});

// Initialize Drizzle with PostgreSQL
const db = drizzle(pool, { schema });

// Test connection function
async function testConnection() {
  try {
    if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
      console.error('❌ No database configuration found');
      console.log('💡 Please create a PostgreSQL database in Replit:');
      console.log('   1. Open a new tab and type "Database"');
      console.log('   2. Click "Create a database"');
      return false;
    }
    
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    console.log('✅ PostgreSQL database connected successfully');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Database connection refused. Please create a PostgreSQL database in Replit:');
      console.log('   1. Open a new tab and type "Database"');
      console.log('   2. Click "Create a database"');
    } else {
      console.log('💡 Please check your database configuration');
    }
    return false;
  }
}

// Graceful database initialization
async function initializeGracefully() {
  try {
    const isConnected = await testConnection();
    if (isConnected) {
      const { initializeDatabase } = require('./init-db.js');
      try {
        await initializeDatabase();
        console.log('✅ Database initialized successfully');
        return true;
      } catch (initError) {
        console.error('❌ Database initialization failed:', initError.message);
        console.log('⚠️ Bot will continue without some database features');
        return false;
      }
    } else {
      console.log('⚠️ Bot will continue without PostgreSQL database');
      console.log('⚠️ Giveaway and ticket features may not work until database is configured');
      return false;
    }
  } catch (error) {
    console.error('Database initialization error:', error.message);
    console.log('⚠️ Bot will continue in fallback mode');
    return false;
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing PostgreSQL pool...');
  await pool.end();
});

process.on('SIGTERM', async () => {
  console.log('Closing PostgreSQL pool...');
  await pool.end();
});

module.exports = { pool, db, testConnection, initializeGracefully };