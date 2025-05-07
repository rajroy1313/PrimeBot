const { pgTable, serial, text, integer, timestamp, uniqueIndex, boolean, json } = require('drizzle-orm/pg-core');

// Users table - stores user level information across multiple servers
exports.userLevels = pgTable('user_levels', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  guildId: text('guild_id').notNull(),
  xp: integer('xp').notNull().default(0),
  level: integer('level').notNull().default(0),
  messages: integer('messages').notNull().default(0),
  lastMessageAt: timestamp('last_message_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    userGuildIdx: uniqueIndex('user_guild_idx').on(table.userId, table.guildId),
  };
});

// User badges table - stores badges earned by users
exports.userBadges = pgTable('user_badges', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  guildId: text('guild_id').notNull(),
  badgeId: text('badge_id').notNull(),
  badgeName: text('badge_name').notNull(),
  badgeEmoji: text('badge_emoji'),
  badgeColor: text('badge_color'),
  badgeDescription: text('badge_description'),
  badgeType: text('badge_type').notNull(), // level, achievement, or special
  earnedAt: timestamp('earned_at').defaultNow(),
  metadata: json('metadata'),
}, (table) => {
  return {
    userBadgeIdx: uniqueIndex('user_badge_idx').on(table.userId, table.guildId, table.badgeId),
  };
});

// Guild leveling settings
exports.guildLevelingSettings = pgTable('guild_leveling_settings', {
  id: serial('id').primaryKey(),
  guildId: text('guild_id').notNull().unique(),
  enabled: boolean('enabled').notNull().default(true),
  levelUpChannelId: text('level_up_channel_id'),
  minMessageLength: integer('min_message_length').notNull().default(3),
  xpPerMessage: integer('xp_per_message').notNull().default(15),
  xpCooldown: integer('xp_cooldown').notNull().default(60000), // in milliseconds
  maxRandomBonus: integer('max_random_bonus').notNull().default(10),
  baseMultiplier: integer('base_multiplier').notNull().default(100),
  updatedAt: timestamp('updated_at').defaultNow(),
});