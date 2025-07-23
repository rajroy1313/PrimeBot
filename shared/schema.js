const { pgTable, text, integer, timestamp, boolean, serial, varchar } = require('drizzle-orm/pg-core');
const { relations } = require('drizzle-orm');

// Live polls table
const livePolls = pgTable('live_polls', {
  id: serial('id').primaryKey(),
  pollId: varchar('poll_id', { length: 100 }).notNull().unique(),
  passCode: varchar('pass_code', { length: 20 }).notNull(),
  question: text('question').notNull(),
  creatorId: varchar('creator_id', { length: 50 }).notNull(),
  isActive: boolean('is_active').default(true),
  allowMultipleVotes: boolean('allow_multiple_votes').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at'),
});

// Live poll options table
const livePollOptions = pgTable('live_poll_options', {
  id: serial('id').primaryKey(),
  pollId: varchar('poll_id', { length: 100 }).notNull(),
  optionText: text('option_text').notNull(),
  optionIndex: integer('option_index').notNull(),
  voteCount: integer('vote_count').default(0),
});

// Live poll votes table
const livePollVotes = pgTable('live_poll_votes', {
  id: serial('id').primaryKey(),
  pollId: varchar('poll_id', { length: 100 }).notNull(),
  userId: varchar('user_id', { length: 50 }).notNull(),
  optionIndex: integer('option_index').notNull(),
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

// Exports
module.exports = {
  livePolls,
  livePollOptions,
  livePollVotes,
  livePollsRelations,
  livePollOptionsRelations,
  livePollVotesRelations
};