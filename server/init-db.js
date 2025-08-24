// MySQL Database initialization script
const mysql = require('mysql2/promise');
const { db, testConnection } = require('./db.js');

// Parse MySQL connection string if DB_HOST contains full URL
function parseConnectionConfig() {
  const dbHost = process.env.DB_HOST || '';
  
  // Check if DB_HOST is a full connection string
  if (dbHost.includes('mysql://') || dbHost.includes('@')) {
    try {
      // Extract connection details from connection string
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
  };
}

async function createDatabase() {
  try {
    console.log('🔄 Creating MySQL database if it doesn\'t exist...');
    
    const config = parseConnectionConfig();
    
    // Connect to MySQL server without specifying database
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
    });

    // Create database if it doesn't exist
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${config.database}\``);
    console.log(`✅ Database '${config.database}' created or already exists`);
    
    await connection.end();
  } catch (error) {
    console.error('❌ Database creation failed:', error);
    throw error;
  }
}

async function initializeTables() {
  try {
    console.log('🔄 Initializing live poll database tables...');
    
    // Test connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Cannot connect to MySQL database');
    }

    // Create tables using raw SQL for better control
    const config = parseConnectionConfig();
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
    });

    // Create live_polls table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS live_polls (
        id INT AUTO_INCREMENT PRIMARY KEY,
        poll_id VARCHAR(100) NOT NULL UNIQUE,
        pass_code VARCHAR(20) NOT NULL,
        question TEXT NOT NULL,
        creator_id VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        allow_multiple_votes BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NULL,
        message_id VARCHAR(50),
        channel_id VARCHAR(50)
      )
    `);

    // Add missing columns if they don't exist (for existing tables)
    try {
      await connection.execute(`
        ALTER TABLE live_polls 
        ADD COLUMN IF NOT EXISTS message_id VARCHAR(50),
        ADD COLUMN IF NOT EXISTS channel_id VARCHAR(50)
      `);
    } catch (error) {
      // Ignore errors if columns already exist
      if (!error.message.includes('Duplicate column name')) {
        console.warn('Warning adding columns to live_polls:', error.message);
      }
    }

    // Create live_poll_options table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS live_poll_options (
        id INT AUTO_INCREMENT PRIMARY KEY,
        poll_id VARCHAR(100) NOT NULL,
        option_text TEXT NOT NULL,
        option_index INT NOT NULL,
        vote_count INT DEFAULT 0,
        FOREIGN KEY (poll_id) REFERENCES live_polls(poll_id) ON DELETE CASCADE
      )
    `);

    // Create live_poll_votes table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS live_poll_votes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        poll_id VARCHAR(100) NOT NULL,
        user_id VARCHAR(50) NOT NULL,
        option_index INT NOT NULL,
        voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (poll_id) REFERENCES live_polls(poll_id) ON DELETE CASCADE
      )
    `);

    // Create regular polls table (unified database approach)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS polls (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message_id VARCHAR(50) NOT NULL UNIQUE,
        channel_id VARCHAR(50) NOT NULL,
        guild_id VARCHAR(50) NOT NULL,
        question TEXT NOT NULL,
        creator_id VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NULL,
        ended BOOLEAN DEFAULT FALSE
      )
    `);

    // Create regular poll options table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS poll_options (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message_id VARCHAR(50) NOT NULL,
        option_text TEXT NOT NULL,
        option_index INT NOT NULL,
        emoji VARCHAR(10) NOT NULL,
        vote_count INT DEFAULT 0,
        FOREIGN KEY (message_id) REFERENCES polls(message_id) ON DELETE CASCADE
      )
    `);

    // Create regular poll votes table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS poll_votes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message_id VARCHAR(50) NOT NULL,
        user_id VARCHAR(50) NOT NULL,
        option_index INT NOT NULL,
        voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES polls(message_id) ON DELETE CASCADE
      )
    `);

    // Create giveaways table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS giveaways (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message_id VARCHAR(50) NOT NULL UNIQUE,
        channel_id VARCHAR(50) NOT NULL,
        guild_id VARCHAR(50) NOT NULL,
        prize TEXT NOT NULL,
        description TEXT,
        winner_count INT DEFAULT 1,
        host_id VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        ended BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ends_at TIMESTAMP NOT NULL
      )
    `);

    // Create giveaway participants table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS giveaway_participants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        giveaway_id VARCHAR(50) NOT NULL,
        user_id VARCHAR(50) NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (giveaway_id) REFERENCES giveaways(message_id) ON DELETE CASCADE
      )
    `);

    // Create giveaway winners table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS giveaway_winners (
        id INT AUTO_INCREMENT PRIMARY KEY,
        giveaway_id VARCHAR(50) NOT NULL,
        user_id VARCHAR(50) NOT NULL,
        selected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (giveaway_id) REFERENCES giveaways(message_id) ON DELETE CASCADE
      )
    `);

    // Create user levels table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_levels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guild_id VARCHAR(50) NOT NULL,
        user_id VARCHAR(50) NOT NULL,
        xp INT DEFAULT 0,
        level INT DEFAULT 0,
        messages INT DEFAULT 0,
        last_message TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_guild (guild_id, user_id)
      )
    `);

    // Create user badges table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guild_id VARCHAR(50) NOT NULL,
        user_id VARCHAR(50) NOT NULL,
        badge_id VARCHAR(100) NOT NULL,
        badge_name VARCHAR(255) NOT NULL,
        badge_emoji VARCHAR(10) NOT NULL,
        badge_color VARCHAR(50) NOT NULL,
        badge_description TEXT NOT NULL,
        badge_type VARCHAR(50) NOT NULL,
        earned_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create sessions table for authentication
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR(255) PRIMARY KEY,
        sess TEXT NOT NULL,
        expire TIMESTAMP NOT NULL,
        INDEX idx_session_expire (expire)
      )
    `);

    // Create users table for authentication
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        profile_image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await connection.execute(`
      CREATE INDEX IF NOT EXISTS idx_live_polls_poll_id ON live_polls(poll_id)
    `);
    await connection.execute(`
      CREATE INDEX IF NOT EXISTS idx_live_polls_pass_code ON live_polls(pass_code)
    `);
    await connection.execute(`
      CREATE INDEX IF NOT EXISTS idx_live_poll_options_poll_id ON live_poll_options(poll_id)
    `);
    await connection.execute(`
      CREATE INDEX IF NOT EXISTS idx_live_poll_votes_poll_id ON live_poll_votes(poll_id)
    `);
    await connection.execute(`
      CREATE INDEX IF NOT EXISTS idx_live_poll_votes_user_id ON live_poll_votes(user_id)
    `);

    // Create indexes for leveling tables
    await connection.execute(`
      CREATE INDEX IF NOT EXISTS idx_user_levels_guild_user ON user_levels(guild_id, user_id)
    `);
    await connection.execute(`
      CREATE INDEX IF NOT EXISTS idx_user_levels_guild_level ON user_levels(guild_id, level DESC)
    `);
    await connection.execute(`
      CREATE INDEX IF NOT EXISTS idx_user_levels_guild_xp ON user_levels(guild_id, xp DESC)
    `);
    await connection.execute(`
      CREATE INDEX IF NOT EXISTS idx_user_badges_guild_user ON user_badges(guild_id, user_id)
    `);
    await connection.execute(`
      CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id)
    `);

    await connection.end();
    console.log('✅ Database tables initialized successfully (including leveling system)');
  } catch (error) {
    console.error('❌ Database table initialization failed:', error);
    throw error;
  }
}

async function initializeDatabase() {
  try {
    await createDatabase();
    await initializeTables();
    console.log('🎉 MySQL database setup completed successfully!');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Run initialization if this file is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Database initialization complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database initialization failed:', error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase, createDatabase, initializeTables };