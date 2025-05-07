/**
 * Database migration script for Discord bot
 * 
 * This script creates the necessary tables in the database
 * if they don't already exist.
 */

const { db, pool, schema } = require('./connection');
const { sql } = require('drizzle-orm');

async function migrate() {
  console.log('[DATABASE] Starting database migration...');

  try {
    // Create user_levels table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_levels (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        xp INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 0,
        messages INTEGER NOT NULL DEFAULT 0,
        last_message_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT user_guild_unique UNIQUE(user_id, guild_id)
      );
    `);
    console.log('[DATABASE] Created or verified user_levels table');

    // Create user_badges table
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
        badge_type TEXT NOT NULL,
        earned_at TIMESTAMP DEFAULT NOW(),
        metadata JSONB,
        CONSTRAINT user_badge_unique UNIQUE(user_id, guild_id, badge_id)
      );
    `);
    console.log('[DATABASE] Created or verified user_badges table');

    // Create guild_leveling_settings table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS guild_leveling_settings (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL UNIQUE,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        level_up_channel_id TEXT,
        min_message_length INTEGER NOT NULL DEFAULT 3,
        xp_per_message INTEGER NOT NULL DEFAULT 15,
        xp_cooldown INTEGER NOT NULL DEFAULT 60000,
        max_random_bonus INTEGER NOT NULL DEFAULT 10,
        base_multiplier INTEGER NOT NULL DEFAULT 100,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('[DATABASE] Created or verified guild_leveling_settings table');
    
    console.log('[DATABASE] Migration completed successfully');
  } catch (error) {
    console.error('[DATABASE] Migration failed:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Execute migration
migrate();