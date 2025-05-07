/**
 * Database migration script for Discord bot
 * 
 * This script creates the necessary tables in the database
 * if they don't already exist.
 */

const { db, pool, schema } = require('./connection');
const { userLevels, userBadges, guildLevelingSettings } = schema;
const { sql } = require('drizzle-orm');

async function migrate() {
  console.log('[DATABASE] Starting database migration...');
  
  try {
    // Create user_levels table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_levels (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        xp INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 0,
        messages INTEGER NOT NULL DEFAULT 0,
        last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[DATABASE] Created or verified user_levels table');
    
    // Create user_badges table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_badges (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        badge_id TEXT NOT NULL,
        badge_name TEXT NOT NULL,
        badge_emoji TEXT,
        badge_color TEXT,
        badge_description TEXT,
        badge_type TEXT NOT NULL DEFAULT 'achievement',
        earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[DATABASE] Created or verified user_badges table');
    
    // Create guild_leveling_settings table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS guild_leveling_settings (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL UNIQUE,
        enabled BOOLEAN NOT NULL DEFAULT true,
        level_up_channel_id TEXT,
        min_message_length INTEGER NOT NULL DEFAULT 5,
        xp_per_message INTEGER NOT NULL DEFAULT 15,
        xp_cooldown INTEGER NOT NULL DEFAULT 60000,
        max_random_bonus INTEGER NOT NULL DEFAULT 5,
        base_multiplier REAL NOT NULL DEFAULT 1.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[DATABASE] Created or verified guild_leveling_settings table');
    
    // Index creation for performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_user_levels_user_guild 
      ON user_levels(user_id, guild_id);
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_user_badges_user_guild 
      ON user_badges(user_id, guild_id);
    `);
    
    console.log('[DATABASE] Migration completed successfully');
  } catch (error) {
    console.error('[DATABASE] Migration error:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrate()
    .then(() => {
      pool.end();
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      pool.end();
      process.exit(1);
    });
} else {
  // Export for use in other modules
  module.exports = { migrate };
}