import { pgTable, text, integer, timestamp, boolean, serial, json } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const livePolls = pgTable('live_polls', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  passcode: text('passcode').notNull(),
  creatorId: text('creator_id').notNull(),
  creatorUsername: text('creator_username').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  endsAt: timestamp('ends_at'),
  isActive: boolean('is_active').default(true).notNull(),
  allowMultipleVotes: boolean('allow_multiple_votes').default(false).notNull(),
  isAnonymous: boolean('is_anonymous').default(true).notNull(),
  guildId: text('guild_id').notNull(),
});

export const livePollOptions = pgTable('live_poll_options', {
  id: serial('id').primaryKey(),
  pollId: integer('poll_id').references(() => livePolls.id, { onDelete: 'cascade' }).notNull(),
  optionText: text('option_text').notNull(),
  optionIndex: integer('option_index').notNull(),
  voteCount: integer('vote_count').default(0).notNull(),
});

export const livePollVotes = pgTable('live_poll_votes', {
  id: serial('id').primaryKey(),
  pollId: integer('poll_id').references(() => livePolls.id, { onDelete: 'cascade' }).notNull(),
  optionId: integer('option_id').references(() => livePollOptions.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').notNull(),
  username: text('username').notNull(),
  guildId: text('guild_id').notNull(),
  votedAt: timestamp('voted_at').defaultNow().notNull(),
});

export const livePollsRelations = relations(livePolls, ({ many }) => ({
  options: many(livePollOptions),
  votes: many(livePollVotes),
}));

export const livePollOptionsRelations = relations(livePollOptions, ({ one, many }) => ({
  poll: one(livePolls, {
    fields: [livePollOptions.pollId],
    references: [livePolls.id],
  }),
  votes: many(livePollVotes),
}));

export const livePollVotesRelations = relations(livePollVotes, ({ one }) => ({
  poll: one(livePolls, {
    fields: [livePollVotes.pollId],
    references: [livePolls.id],
  }),
  option: one(livePollOptions, {
    fields: [livePollVotes.optionId],
    references: [livePollOptions.id],
  }),
}));

export type LivePoll = typeof livePolls.$inferSelect;
export type InsertLivePoll = typeof livePolls.$inferInsert;
export type LivePollOption = typeof livePollOptions.$inferSelect;
export type InsertLivePollOption = typeof livePollOptions.$inferInsert;
export type LivePollVote = typeof livePollVotes.$inferSelect;
export type InsertLivePollVote = typeof livePollVotes.$inferInsert;