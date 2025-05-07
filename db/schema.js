/**
 * Database schema definitions for Discord bot
 * 
 * This file defines the database schema using Drizzle ORM.
 * It contains tables for user leveling, badges, and server settings.
 */

const { pgTable, text, integer, timestamp, real, boolean, serial, primaryKey } = require('drizzle-orm/pg-core');

// User levels table
const userLevels = pgTable('user_levels', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  guildId: text('guild_id').notNull(),
  xp: integer('xp').notNull().default(0),
  level: integer('level').notNull().default(0),
  messages: integer('messages').notNull().default(0),
  lastMessageAt: timestamp('last_message_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// User badges table
const userBadges = pgTable('user_badges', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  guildId: text('guild_id').notNull(),
  badgeId: text('badge_id').notNull(),
  badgeName: text('badge_name').notNull(),
  badgeEmoji: text('badge_emoji'),
  badgeColor: text('badge_color'),
  badgeDescription: text('badge_description'),
  badgeType: text('badge_type').notNull().default('achievement'),
  earnedAt: timestamp('earned_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Guild leveling settings table
const guildLevelingSettings = pgTable('guild_leveling_settings', {
  id: serial('id').primaryKey(),
  guildId: text('guild_id').notNull().unique(),
  enabled: boolean('enabled').notNull().default(true),
  levelUpChannelId: text('level_up_channel_id'),
  minMessageLength: integer('min_message_length').notNull().default(5),
  xpPerMessage: integer('xp_per_message').notNull().default(15),
  xpCooldown: integer('xp_cooldown').notNull().default(60000), // 1 minute cooldown in ms
  maxRandomBonus: integer('max_random_bonus').notNull().default(5),
  baseMultiplier: real('base_multiplier').notNull().default(1.0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

module.exports = {
  userLevels,
  userBadges,
  guildLevelingSettings
};