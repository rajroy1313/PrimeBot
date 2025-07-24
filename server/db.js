const mysql = require('mysql2/promise');
const { drizzle } = require('drizzle-orm/mysql2');
const schema = require("../shared/schema.js");

// MySQL connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'discord_bot',
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
};

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
      await initializeDatabase();
      return true;
    } else {
      console.log('⚠️  Bot will continue without MySQL database');
      console.log('⚠️  Live poll features may not work until database is configured');
      return false;
    }
  } catch (error) {
    console.error('Database initialization error:', error.message);
    return false;
  }
}

module.exports = { pool, db, testConnection, initializeGracefully };
