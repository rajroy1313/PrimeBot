const mysql = require('mysql2/promise');
const { drizzle } = require('drizzle-orm/mysql2');
const schema = require("../shared/schema.js");

// Parse MySQL connection string if DB_HOST contains full URL
function parseConnectionString() {
  const dbHost = process.env.DB_HOST || '';
  
  // Check if DB_HOST is a full connection string
  if (dbHost.includes('mysql://') || dbHost.includes('@')) {
    try {
      // Extract connection details from connection string
      // Format: mysql://username:password@host:port/database
      // or: username:password@host:port/database
      const cleanUrl = dbHost.replace('jdbc:mysql://', '').replace('mysql://', '');
      const [credentials, hostAndDb] = cleanUrl.split('@');
      const [user, password] = credentials.split(':');
      const [hostPort, database] = hostAndDb.split('/');
      const [host, port] = hostPort.split(':');
      
      return {
        host: host || 'localhost',
        port: parseInt(port) || 3306,
        user: decodeURIComponent(user) || 'root',
        password: decodeURIComponent(password) || '',
        database: database || 'discord_bot',
        connectionLimit: 10,
      };
    } catch (error) {
      console.warn('Failed to parse connection string, using individual env vars:', error.message);
    }
  }
  
  // Fallback to individual environment variables
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'discord_bot',
    connectionLimit: 10,
  };
}

const dbConfig = parseConnectionString();

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Initialize Drizzle with MySQL
const db = drizzle(pool, { schema, mode: 'default' });

// Test connection function
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL connection failed:', error.message);
    console.log('💡 Please ensure MySQL is running and properly configured');
    console.log('💡 You can start MySQL using: npm run mysql:start');
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
      console.log('⚠️ Bot will continue without MySQL database');
      console.log('⚠️ Live poll features may not work until database is configured');
      return false;
    }
  } catch (error) {
    console.error('Database initialization error:', error.message);
    console.log('⚠️ Bot will continue in fallback mode');
    return false;
  }
}

module.exports = { pool, db, testConnection, initializeGracefully };
