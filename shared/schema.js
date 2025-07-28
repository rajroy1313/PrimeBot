const { mysqlTable, text, int, timestamp, boolean, varchar } = require('drizzle-orm/mysql-core');
const { relations } = require('drizzle-orm');

// Live polls table
const livePolls = mysqlTable('live_polls', {
  id: int('id').primaryKey().autoincrement(),
  pollId: varchar('poll_id', { length: 100 }).notNull().unique(),
  passCode: varchar('pass_code', { length: 20 }).notNull(),
  question: text('question').notNull(),
  creatorId: varchar('creator_id', { length: 50 }).notNull(),
  isActive: boolean('is_active').default(true),
  allowMultipleVotes: boolean('allow_multiple_votes').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at'),
  messageId: varchar('message_id', { length: 50 }),
  channelId: varchar('channel_id', { length: 50 }),
});

// Live poll options table
const livePollOptions = mysqlTable('live_poll_options', {
  id: int('id').primaryKey().autoincrement(),
  pollId: varchar('poll_id', { length: 100 }).notNull(),
  optionText: text('option_text').notNull(),
  optionIndex: int('option_index').notNull(),
  voteCount: int('vote_count').default(0),
});

// Live poll votes table
const livePollVotes = mysqlTable('live_poll_votes', {
  id: int('id').primaryKey().autoincrement(),
  pollId: varchar('poll_id', { length: 100 }).notNull(),
  userId: varchar('user_id', { length: 50 }).notNull(),
  optionIndex: int('option_index').notNull(),
  votedAt: timestamp('voted_at').defaultNow(),
});

// Relations
const livePollsRelations = relations(livePolls, ({ many }) => ({
  options: many(livePollOptions),
  votes: many(livePollVotes),
}));

const livePollOptionsRelations = relations(livePollOptions, ({ one }) => ({
  poll: one(livePolls, {
    fields: [livePollOptions.pollId],
    references: [livePolls.pollId],
  }),
}));

const livePollVotesRelations = relations(livePollVotes, ({ one }) => ({
  poll: one(livePolls, {
    fields: [livePollVotes.pollId],
    references: [livePolls.pollId],
  }),
}));

// Regular polls table (unified with live polls system)
const polls = mysqlTable('polls', {
  id: int('id').primaryKey().autoincrement(),
  messageId: varchar('message_id', { length: 50 }).notNull().unique(),
  channelId: varchar('channel_id', { length: 50 }).notNull(),
  guildId: varchar('guild_id', { length: 50 }).notNull(),
  question: text('question').notNull(),
  creatorId: varchar('creator_id', { length: 50 }).notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at'),
  ended: boolean('ended').default(false)
});

// Regular poll options table
const pollOptions = mysqlTable('poll_options', {
  id: int('id').primaryKey().autoincrement(),
  pollId: varchar('message_id', { length: 50 }).notNull(),
  optionText: text('option_text').notNull(),
  optionIndex: int('option_index').notNull(),
  emoji: varchar('emoji', { length: 10 }).notNull(),
  voteCount: int('vote_count').default(0),
});

// Regular poll votes table
const pollVotes = mysqlTable('poll_votes', {
  id: int('id').primaryKey().autoincrement(),
  pollId: varchar('message_id', { length: 50 }).notNull(),
  userId: varchar('user_id', { length: 50 }).notNull(),
  optionIndex: int('option_index').notNull(),
  votedAt: timestamp('voted_at').defaultNow(),
});

// Relations for regular polls
const pollsRelations = relations(polls, ({ many }) => ({
  options: many(pollOptions),
  votes: many(pollVotes),
}));

const pollOptionsRelations = relations(pollOptions, ({ one }) => ({
  poll: one(polls, {
    fields: [pollOptions.pollId],
    references: [polls.messageId],
  }),
}));

const pollVotesRelations = relations(pollVotes, ({ one }) => ({
  poll: one(polls, {
    fields: [pollVotes.pollId],
    references: [polls.messageId],
  }),
}));

// Giveaways table
const giveaways = mysqlTable('giveaways', {
  id: int('id').primaryKey().autoincrement(),
  messageId: varchar('message_id', { length: 50 }).notNull().unique(),
  channelId: varchar('channel_id', { length: 50 }).notNull(),
  guildId: varchar('guild_id', { length: 50 }).notNull(),
  prize: text('prize').notNull(),
  description: text('description'),
  winnerCount: int('winner_count').default(1),
  hostId: varchar('host_id', { length: 50 }).notNull(),
  isActive: boolean('is_active').default(true),
  ended: boolean('ended').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  endsAt: timestamp('ends_at').notNull(),
});

// Giveaway participants table
const giveawayParticipants = mysqlTable('giveaway_participants', {
  id: int('id').primaryKey().autoincrement(),
  giveawayId: varchar('message_id', { length: 50 }).notNull(),
  userId: varchar('user_id', { length: 50 }).notNull(),
  joinedAt: timestamp('joined_at').defaultNow(),
});

// Giveaway winners table
const giveawayWinners = mysqlTable('giveaway_winners', {
  id: int('id').primaryKey().autoincrement(),
  giveawayId: varchar('message_id', { length: 50 }).notNull(),
  userId: varchar('user_id', { length: 50 }).notNull(),
  selectedAt: timestamp('selected_at').defaultNow(),
});

// Relations for giveaways
const giveawaysRelations = relations(giveaways, ({ many }) => ({
  participants: many(giveawayParticipants),
  winners: many(giveawayWinners),
}));

const giveawayParticipantsRelations = relations(giveawayParticipants, ({ one }) => ({
  giveaway: one(giveaways, {
    fields: [giveawayParticipants.giveawayId],
    references: [giveaways.messageId],
  }),
}));

const giveawayWinnersRelations = relations(giveawayWinners, ({ one }) => ({
  giveaway: one(giveaways, {
    fields: [giveawayWinners.giveawayId],
    references: [giveaways.messageId],
  }),
}));

// Exports
module.exports = {
  livePolls,
  livePollOptions,
  livePollVotes,
  livePollsRelations,
  livePollOptionsRelations,
  livePollVotesRelations,
  polls,
  pollOptions,
  pollVotes,
  pollsRelations,
  pollOptionsRelations,
  pollVotesRelations,
  giveaways,
  giveawayParticipants,
  giveawayWinners,
  giveawaysRelations,
  giveawayParticipantsRelations,
  giveawayWinnersRelations
};