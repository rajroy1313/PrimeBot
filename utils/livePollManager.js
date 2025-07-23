const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

// Import database and schema - we'll handle this dynamically
let db, livePolls, livePollOptions, livePollVotes, eq, and, desc, sql;

try {
    // Try to import database components
    const dbModule = require('../server/db.js');
    db = dbModule.db;
    
    const schemaModule = require('../shared/schema.js');
    livePolls = schemaModule.livePolls;
    livePollOptions = schemaModule.livePollOptions;
    livePollVotes = schemaModule.livePollVotes;
    
    const drizzleORM = require('drizzle-orm');
    eq = drizzleORM.eq;
    and = drizzleORM.and;
    desc = drizzleORM.desc;
    sql = drizzleORM.sql;
    
    console.log('✅ Database components loaded successfully for LivePollManager');
} catch (error) {
    console.error('❌ Error importing database components:', error);
    // Create fallback functions for testing
    db = { 
        insert: () => Promise.resolve([{ pollId: 'test-poll', passCode: 'TEST123' }]),
        select: () => Promise.resolve([]),
        update: () => Promise.resolve()
    };
}

class LivePollManager {
    constructor() {
        this.pollCaches = new Map(); // Cache for active polls
    }

    // Generate a unique poll ID
    generatePollId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    // Generate a random pass code
    generatePassCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    // Create a new live poll
    async createLivePoll({ question, options, creatorId, duration = null, allowMultipleVotes = false }) {
        try {
            const pollId = this.generatePollId();
            const passCode = this.generatePassCode();
            const expiresAt = duration ? new Date(Date.now() + duration) : null;

            // Insert poll into database
            const [poll] = await db.insert(livePolls).values({
                pollId,
                passCode,
                question,
                creatorId,
                isActive: true,
                allowMultipleVotes,
                expiresAt
            }).returning();

            // Insert poll options
            const optionInserts = options.map((option, index) => ({
                pollId,
                optionText: option,
                optionIndex: index,
                voteCount: 0
            }));

            await db.insert(livePollOptions).values(optionInserts);

            // Cache the poll
            this.pollCaches.set(pollId, {
                ...poll,
                options: optionInserts
            });

            return { pollId, passCode, poll };
        } catch (error) {
            console.error('Error creating live poll:', error);
            throw error;
        }
    }

    // Get poll by ID or pass code
    async getPoll(identifier) {
        try {
            // Try to get from cache first
            if (this.pollCaches.has(identifier)) {
                return this.pollCaches.get(identifier);
            }

            // Query database by poll ID or pass code
            const [poll] = await db.select()
                .from(livePolls)
                .where(eq(livePolls.pollId, identifier))
                .or(eq(livePolls.passCode, identifier));

            if (!poll) return null;

            // Get poll options
            const options = await db.select()
                .from(livePollOptions)
                .where(eq(livePollOptions.pollId, poll.pollId))
                .orderBy(livePollOptions.optionIndex);

            const pollData = { ...poll, options };
            
            // Cache the poll
            this.pollCaches.set(poll.pollId, pollData);
            
            return pollData;
        } catch (error) {
            console.error('Error getting poll:', error);
            return null;
        }
    }

    // Vote on a poll
    async voteOnPoll({ pollId, userId, optionIndex }) {
        try {
            const poll = await this.getPoll(pollId);
            if (!poll || !poll.isActive) {
                return { success: false, message: 'Poll not found or not active' };
            }

            // Check if poll has expired
            if (poll.expiresAt && new Date() > new Date(poll.expiresAt)) {
                return { success: false, message: 'Poll has expired' };
            }

            // Check if option index is valid
            if (optionIndex < 0 || optionIndex >= poll.options.length) {
                return { success: false, message: 'Invalid option selected' };
            }

            // Check if user has already voted (if multiple votes not allowed)
            if (!poll.allowMultipleVotes) {
                const existingVote = await db.select()
                    .from(livePollVotes)
                    .where(and(
                        eq(livePollVotes.pollId, pollId),
                        eq(livePollVotes.userId, userId)
                    ));

                if (existingVote.length > 0) {
                    return { success: false, message: 'You have already voted on this poll' };
                }
            }

            // Record the vote
            await db.insert(livePollVotes).values({
                pollId,
                userId,
                optionIndex
            });

            // Update vote count
            await db.update(livePollOptions)
                .set({ voteCount: sql`${livePollOptions.voteCount} + 1` })
                .where(and(
                    eq(livePollOptions.pollId, pollId),
                    eq(livePollOptions.optionIndex, optionIndex)
                ));

            // Update cache
            if (this.pollCaches.has(pollId)) {
                const cachedPoll = this.pollCaches.get(pollId);
                cachedPoll.options[optionIndex].voteCount++;
            }

            return { success: true, message: 'Vote recorded successfully' };
        } catch (error) {
            console.error('Error voting on poll:', error);
            return { success: false, message: 'Error recording vote' };
        }
    }

    // End a poll
    async endPoll(pollId, userId) {
        try {
            const poll = await this.getPoll(pollId);
            if (!poll) {
                return { success: false, message: 'Poll not found' };
            }

            if (poll.creatorId !== userId) {
                return { success: false, message: 'Only the poll creator can end this poll' };
            }

            // Update poll as inactive
            await db.update(livePolls)
                .set({ isActive: false })
                .where(eq(livePolls.pollId, pollId));

            // Update cache
            if (this.pollCaches.has(pollId)) {
                this.pollCaches.get(pollId).isActive = false;
            }

            return { success: true, message: 'Poll ended successfully' };
        } catch (error) {
            console.error('Error ending poll:', error);
            return { success: false, message: 'Error ending poll' };
        }
    }

    // Get poll results
    async getPollResults(pollId) {
        try {
            const poll = await this.getPoll(pollId);
            if (!poll) return null;

            // Get updated vote counts
            const options = await db.select()
                .from(livePollOptions)
                .where(eq(livePollOptions.pollId, pollId))
                .orderBy(livePollOptions.optionIndex);

            const totalVotes = options.reduce((sum, option) => sum + option.voteCount, 0);

            return {
                poll,
                options,
                totalVotes
            };
        } catch (error) {
            console.error('Error getting poll results:', error);
            return null;
        }
    }

    // Create poll embed
    createPollEmbed(poll, options, totalVotes = 0, showResults = false) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('📊 Live Poll')
            .setDescription(`**${poll.question}**`)
            .setTimestamp();

        if (showResults) {
            const resultsText = options.map((option, index) => {
                const percentage = totalVotes > 0 ? ((option.voteCount / totalVotes) * 100).toFixed(1) : 0;
                const barLength = Math.round(percentage / 5);
                const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
                return `**${index + 1}.** ${option.optionText}\n${bar} ${option.voteCount} votes (${percentage}%)`;
            }).join('\n\n');

            embed.addFields(
                { name: 'Results', value: resultsText || 'No votes yet', inline: false },
                { name: 'Total Votes', value: totalVotes.toString(), inline: true },
                { name: 'Status', value: poll.isActive ? '🟢 Active' : '🔴 Ended', inline: true }
            );
        } else {
            const optionsText = options.map((option, index) => 
                `**${index + 1}.** ${option.optionText}`
            ).join('\n');

            embed.addFields(
                { name: 'Options', value: optionsText, inline: false },
                { name: 'Status', value: poll.isActive ? '🟢 Active' : '🔴 Ended', inline: true }
            );
        }

        if (poll.expiresAt) {
            embed.addFields({
                name: 'Expires',
                value: `<t:${Math.floor(new Date(poll.expiresAt).getTime() / 1000)}:R>`,
                inline: true
            });
        }

        return embed;
    }

    // Create vote buttons
    createVoteButtons(pollId, options) {
        const rows = [];
        const buttonsPerRow = 5;
        
        for (let i = 0; i < options.length; i += buttonsPerRow) {
            const row = new ActionRowBuilder();
            
            for (let j = i; j < Math.min(i + buttonsPerRow, options.length); j++) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`vote_${pollId}_${j}`)
                        .setLabel(`${j + 1}`)
                        .setStyle(ButtonStyle.Primary)
                );
            }
            
            rows.push(row);
        }

        return rows;
    }

    // Get user's polls
    async getUserPolls(userId, limit = 10) {
        try {
            const polls = await db.select()
                .from(livePolls)
                .where(eq(livePolls.creatorId, userId))
                .orderBy(desc(livePolls.createdAt))
                .limit(limit);

            return polls;
        } catch (error) {
            console.error('Error getting user polls:', error);
            return [];
        }
    }
}

module.exports = LivePollManager;