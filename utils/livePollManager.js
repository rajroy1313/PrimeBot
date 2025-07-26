const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

// Import database and schema - we'll handle this dynamically
let db, livePolls, livePollOptions, livePollVotes, eq, and, desc, sql;

// Try to import database components - delayed initialization
let dbInitialized = false;

async function initializeDatabase() {
    if (dbInitialized) return true;
    
    try {
        // Try to import database components
        require('dotenv').config();
        
        // Check for MySQL database configuration
        const hasMySQL = process.env.DB_HOST || process.env.DB_USER || process.env.DB_NAME;
        const hasPostgreSQL = process.env.DATABASE_URL;
        
        if (!hasMySQL && !hasPostgreSQL) {
            console.log('⚠️ No database configuration found, using fallback mode');
            return false;
        }
        
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
        
        dbInitialized = true;
        console.log('✅ Database components loaded successfully for LivePollManager');
        return true;
    } catch (error) {
        console.error('❌ Error importing database components:', error.message);
        return false;
    }
}

// Initialize fallback functions
if (!dbInitialized) {
    db = { 
        insert: () => Promise.resolve([{ pollId: 'test-poll', passCode: 'TEST123' }]),
        select: () => Promise.resolve([]),
        update: () => Promise.resolve(),
        execute: () => Promise.resolve({ rows: [] })
    };
}

class LivePollManager {
    constructor() {
        this.pollCaches = new Map(); // Cache for active polls
        this.dbReady = false;
        this.db = null;
        this.drizzleDb = null;
        this.initializeDatabaseConnection();
    }

    // Initialize database connection and tables
    async initializeDatabaseConnection() {
        try {
            // First try to initialize database components
            const initialized = await initializeDatabase();
            
            if (initialized) {
                const { initializeGracefully } = require('../server/db.js');
                this.dbReady = await initializeGracefully();
                
                // Get the actual database instance
                if (this.dbReady) {
                    const dbModule = require('../server/db.js');
                    this.db = dbModule.pool;
                    this.drizzleDb = dbModule.db;
                    console.log('✅ Live poll database connection established');
                    
                    // Store database reference in global db variable for poll operations
                    if (!global.livePollDb) {
                        global.livePollDb = dbModule.db;
                    }
                } else {
                    console.log('⚠️ Live polls will use fallback mode (memory only)');
                }
            } else {
                this.dbReady = false;
                console.log('⚠️ Database components not available - using fallback mode');
            }
        } catch (error) {
            console.error('❌ Database initialization error:', error);
            this.dbReady = false;
            console.log('⚠️ Live polls will use fallback mode (memory only)');
        }
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

            const poll = {
                pollId,
                passCode,
                question,
                creatorId,
                isActive: true,
                allowMultipleVotes,
                expiresAt,
                createdAt: new Date()
            };

            // Create poll options
            const optionInserts = options.map((option, index) => ({
                pollId,
                optionText: option,
                optionIndex: index,
                voteCount: 0
            }));

            if (this.dbReady && (db || global.livePollDb)) {
                // Insert poll into database
                const dbInstance = db || global.livePollDb;
                await dbInstance.insert(livePolls).values(poll);
                await dbInstance.insert(livePollOptions).values(optionInserts);
                
                // Cache the poll
                this.pollCaches.set(pollId, {
                    ...poll,
                    options: optionInserts
                });
            } else {
                // Use in-memory storage
                this.pollCaches.set(pollId, {
                    ...poll,
                    options: optionInserts,
                    votes: [] // Store votes in memory
                });
            }

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

            // Check if any cached poll has this pass code
            for (const [pollId, pollData] of this.pollCaches.entries()) {
                if (pollData.passCode === identifier) {
                    return pollData;
                }
            }

            if (this.dbReady) {
                // Query database by poll ID or pass code  
                let poll = null;
                const dbInstance = db || global.livePollDb || this.drizzleDb;
                
                // First try by poll ID
                const pollById = await dbInstance.select()
                    .from(livePolls)
                    .where(eq(livePolls.pollId, identifier))
                    .limit(1);
                
                if (pollById.length > 0) {
                    poll = pollById[0];
                } else {
                    // If not found by poll ID, try by pass code
                    const pollByCode = await dbInstance.select()
                        .from(livePolls)
                        .where(eq(livePolls.passCode, identifier))
                        .limit(1);
                    
                    if (pollByCode.length > 0) {
                        poll = pollByCode[0];
                    }
                }

                if (!poll) return null;

                // Get poll options
                const options = await dbInstance.select()
                    .from(livePollOptions)
                    .where(eq(livePollOptions.pollId, poll.pollId))
                    .orderBy(livePollOptions.optionIndex);

                const pollData = { ...poll, options };
                
                // Check if poll has expired and update status
                if (pollData.expiresAt && new Date() > new Date(pollData.expiresAt) && pollData.isActive) {
                    console.log(`[DEBUG] Poll ${pollData.pollId} expired during retrieval, updating status...`);
                    
                    // Update database
                    await dbInstance.update(livePolls)
                        .set({ isActive: false })
                        .where(eq(livePolls.pollId, pollData.pollId));
                    
                    pollData.isActive = false;
                }
                
                // Cache the poll
                this.pollCaches.set(poll.pollId, pollData);
                
                return pollData;
            }

            return null;
        } catch (error) {
            console.error('Error getting poll:', error);
            return null;
        }
    }

    // Vote on a poll (wrapper method for button interactions)
    async vote(pollId, userId, optionIndex) {
        return await this.voteOnPoll({ pollId, userId, optionIndex });
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
                if (this.dbReady && (db || global.livePollDb || this.drizzleDb)) {
                    const dbInstance = db || global.livePollDb || this.drizzleDb;
                    const existingVote = await dbInstance.select()
                        .from(livePollVotes)
                        .where(and(
                            eq(livePollVotes.pollId, pollId),
                            eq(livePollVotes.userId, userId)
                        ));

                    if (existingVote.length > 0) {
                        return { success: false, message: 'You have already voted on this poll' };
                    }
                } else {
                    // Check in-memory votes
                    const cachedPoll = this.pollCaches.get(pollId);
                    if (cachedPoll && cachedPoll.votes) {
                        const existingVote = cachedPoll.votes.find(vote => vote.userId === userId);
                        if (existingVote) {
                            return { success: false, message: 'You have already voted on this poll' };
                        }
                    }
                }
            }

            if (this.dbReady && (db || global.livePollDb || this.drizzleDb)) {
                // Record the vote in database
                const dbInstance = db || global.livePollDb || this.drizzleDb;
                await dbInstance.insert(livePollVotes).values({
                    pollId,
                    userId,
                    optionIndex
                });

                // Update vote count
                await dbInstance.update(livePollOptions)
                    .set({ voteCount: sql`${livePollOptions.voteCount} + 1` })
                    .where(and(
                        eq(livePollOptions.pollId, pollId),
                        eq(livePollOptions.optionIndex, optionIndex)
                    ));
            } else {
                // Record vote in memory
                const cachedPoll = this.pollCaches.get(pollId);
                if (cachedPoll) {
                    if (!cachedPoll.votes) cachedPoll.votes = [];
                    cachedPoll.votes.push({
                        userId,
                        optionIndex,
                        votedAt: new Date()
                    });
                }
            }

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
            if (this.dbReady && (db || global.livePollDb || this.drizzleDb)) {
                const dbInstance = db || global.livePollDb || this.drizzleDb;
                await dbInstance.update(livePolls)
                    .set({ isActive: false })
                    .where(eq(livePolls.pollId, pollId));
            }

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

            // Check if poll has expired and update status if needed
            if (poll.expiresAt && new Date() > new Date(poll.expiresAt) && poll.isActive) {
                console.log(`[DEBUG] Poll ${pollId} has expired, updating status...`);
                
                // Update poll status to inactive
                if (this.dbReady && (db || global.livePollDb || this.drizzleDb)) {
                    const dbInstance = db || global.livePollDb || this.drizzleDb;
                    await dbInstance.update(livePolls)
                        .set({ isActive: false })
                        .where(eq(livePolls.pollId, pollId));
                }

                // Update cache
                if (this.pollCaches.has(pollId)) {
                    this.pollCaches.get(pollId).isActive = false;
                }
                
                // Update the poll object
                poll.isActive = false;
                console.log(`[DEBUG] Poll ${pollId} status updated to inactive`);
            }

            let options;
            
            if (this.dbReady && (db || global.livePollDb || this.drizzleDb)) {
                // Get updated vote counts from database
                const dbInstance = db || global.livePollDb || this.drizzleDb;
                options = await dbInstance.select()
                    .from(livePollOptions)
                    .where(eq(livePollOptions.pollId, pollId))
                    .orderBy(livePollOptions.optionIndex);
            } else {
                // Use cached data
                options = poll.options || [];
            }

            const totalVotes = options.reduce((sum, option) => sum + (option.voteCount || 0), 0);

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

    // Check for expired polls and update their status
    async checkExpiredPolls() {
        try {
            if (!this.dbReady || !(db || global.livePollDb || this.drizzleDb)) {
                console.log('[LIVE POLLS] Database not ready, skipping expiration check');
                return;
            }

            const dbInstance = db || global.livePollDb || this.drizzleDb;
            const now = new Date();

            // Find all active polls that have expired
            const expiredPolls = await dbInstance.select()
                .from(livePolls)
                .where(and(
                    eq(livePolls.isActive, true),
                    sql`${livePolls.expiresAt} IS NOT NULL AND ${livePolls.expiresAt} <= ${now}`
                ));

            console.log(`[LIVE POLLS] Checking for expired polls. Found ${expiredPolls.length} expired polls.`);

            if (expiredPolls.length > 0) {
                // Update all expired polls to inactive
                for (const poll of expiredPolls) {
                    await dbInstance.update(livePolls)
                        .set({ isActive: false })
                        .where(eq(livePolls.pollId, poll.pollId));

                    // Update cache if exists
                    if (this.pollCaches.has(poll.pollId)) {
                        this.pollCaches.get(poll.pollId).isActive = false;
                    }

                    console.log(`[LIVE POLLS] Expired poll ${poll.pollId}: "${poll.question}"`);
                }

                console.log(`[LIVE POLLS] Updated ${expiredPolls.length} expired polls to inactive status.`);
            }
        } catch (error) {
            console.error('[LIVE POLLS] Error checking expired polls:', error);
        }
    }
}

module.exports = LivePollManager;