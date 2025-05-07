/**
 * Database-powered Leveling Manager for Discord bot
 * 
 * This module manages user levels, XP, and achievement badges
 * for the community engagement system across multiple servers.
 */

const { EmbedBuilder } = require('discord.js');
const { db, schema } = require('../db/connection');
const { eq, and, desc, sql } = require('drizzle-orm');
const { userLevels, userBadges, guildLevelingSettings } = schema;
const config = require('../config');

class DBLevelingManager {
    constructor(client) {
        this.client = client;
        this.cooldowns = new Map(); // userId_guildId -> timestamp
        
        // Cache for server settings to avoid excessive database queries
        this.settingsCache = new Map(); // guildId -> settings
        this.settingsCacheTime = new Map(); // guildId -> last updated timestamp
        
        console.log('[LEVELING] Database-backed leveling system initialized');
    }
    
    /**
     * Get the settings for a guild
     * @param {string} guildId - Guild ID
     * @returns {Promise<Object>} Guild settings
     */
    async getGuildSettings(guildId) {
        // Check cache first (cache for 5 minutes)
        const now = Date.now();
        const cacheTime = this.settingsCacheTime.get(guildId) || 0;
        
        if (now - cacheTime < 300000 && this.settingsCache.has(guildId)) {
            return this.settingsCache.get(guildId);
        }
        
        try {
            // Try to get settings from database
            const [settings] = await db
                .select()
                .from(guildLevelingSettings)
                .where(eq(guildLevelingSettings.guildId, guildId));
            
            if (settings) {
                // Update cache
                this.settingsCache.set(guildId, settings);
                this.settingsCacheTime.set(guildId, now);
                return settings;
            }
            
            // If no settings found, create default settings
            const [newSettings] = await db
                .insert(guildLevelingSettings)
                .values({
                    guildId,
                    enabled: true,
                    minMessageLength: config.leveling.minMessageLength,
                    xpPerMessage: config.leveling.xpPerMessage,
                    xpCooldown: config.leveling.xpCooldown,
                    maxRandomBonus: config.leveling.maxRandomBonus,
                    baseMultiplier: config.leveling.baseMultiplier
                })
                .returning();
            
            // Update cache
            this.settingsCache.set(guildId, newSettings);
            this.settingsCacheTime.set(guildId, now);
            
            return newSettings;
            
        } catch (error) {
            console.error(`[LEVELING] Error getting guild settings for ${guildId}:`, error);
            
            // Return default settings
            return {
                guildId,
                enabled: true,
                levelUpChannelId: null,
                minMessageLength: config.leveling.minMessageLength,
                xpPerMessage: config.leveling.xpPerMessage,
                xpCooldown: config.leveling.xpCooldown,
                maxRandomBonus: config.leveling.maxRandomBonus,
                baseMultiplier: config.leveling.baseMultiplier
            };
        }
    }
    
    /**
     * Update guild settings
     * @param {string} guildId - Guild ID
     * @param {Object} settings - Settings to update
     * @returns {Promise<Object>} Updated settings
     */
    async updateGuildSettings(guildId, settings) {
        try {
            const [updated] = await db
                .update(guildLevelingSettings)
                .set({
                    ...settings,
                    updatedAt: new Date()
                })
                .where(eq(guildLevelingSettings.guildId, guildId))
                .returning();
                
            if (!updated) {
                // If no record was updated, it means it doesn't exist yet
                const [newSettings] = await db
                    .insert(guildLevelingSettings)
                    .values({
                        guildId,
                        ...settings
                    })
                    .returning();
                    
                // Update cache
                this.settingsCache.set(guildId, newSettings);
                this.settingsCacheTime.set(guildId, Date.now());
                
                return newSettings;
            }
            
            // Update cache
            this.settingsCache.set(guildId, updated);
            this.settingsCacheTime.set(guildId, Date.now());
            
            return updated;
            
        } catch (error) {
            console.error(`[LEVELING] Error updating guild settings for ${guildId}:`, error);
            throw error;
        }
    }
    
    /**
     * Process a message for XP gain
     * @param {Message} message - The Discord message
     */
    async processMessage(message) {
        // Ignore bot messages and DMs
        if (message.author.bot || !message.guild) return;
        
        try {
            // Get guild settings
            const settings = await this.getGuildSettings(message.guild.id);
            
            // Check if leveling is enabled for this guild
            if (!settings.enabled) return;
            
            // Ignore messages that are too short
            if (message.content.length < settings.minMessageLength) return;
            
            // Check if the user is on cooldown
            const userId = message.author.id;
            const guildId = message.guild.id;
            const cooldownKey = `${userId}_${guildId}`;
            const now = Date.now();
            
            if (this.cooldowns.has(cooldownKey)) {
                const cooldownTime = this.cooldowns.get(cooldownKey);
                if (now < cooldownTime) {
                    // User is on cooldown, don't award XP
                    return;
                }
            }
            
            // Set cooldown
            this.cooldowns.set(cooldownKey, now + settings.xpCooldown);
            
            // Award XP
            await this.awardXP(message, settings);
            
        } catch (error) {
            console.error('[LEVELING] Error processing message:', error);
        }
    }
    
    /**
     * Award XP to a user for a message
     * @param {Message} message - The Discord message
     * @param {Object} settings - Guild settings
     */
    async awardXP(message, settings) {
        const guildId = message.guild.id;
        const userId = message.author.id;
        
        try {
            // Get current user level data
            const [userData] = await db
                .select()
                .from(userLevels)
                .where(
                    and(
                        eq(userLevels.userId, userId),
                        eq(userLevels.guildId, guildId)
                    )
                );
                
            // Calculate XP to award
            const baseXP = settings.xpPerMessage;
            const randomBonus = Math.floor(Math.random() * (settings.maxRandomBonus + 1));
            const xpGain = baseXP + randomBonus;
            
            let oldLevel = 0;
            let newUserData;
            
            if (userData) {
                // User exists, update their data
                oldLevel = userData.level;
                
                // Calculate new values
                const newXP = userData.xp + xpGain;
                const newMessages = userData.messages + 1;
                const newLevel = this.calculateLevel(newMessages);
                
                // Update user data in database
                const [updated] = await db
                    .update(userLevels)
                    .set({
                        xp: newXP,
                        messages: newMessages,
                        level: newLevel,
                        lastMessageAt: new Date(),
                        updatedAt: new Date()
                    })
                    .where(
                        and(
                            eq(userLevels.userId, userId),
                            eq(userLevels.guildId, guildId)
                        )
                    )
                    .returning();
                    
                newUserData = updated;
            } else {
                // User doesn't exist, create new entry
                const [created] = await db
                    .insert(userLevels)
                    .values({
                        userId,
                        guildId,
                        xp: xpGain,
                        messages: 1,
                        level: 0, // Start at level 0
                        lastMessageAt: new Date()
                    })
                    .returning();
                    
                newUserData = created;
            }
            
            // Check for level up
            if (newUserData.level > oldLevel) {
                // Level up!
                await this.handleLevelUp(message, newUserData, oldLevel, newUserData.level, settings);
            }
            
        } catch (error) {
            console.error(`[LEVELING] Error awarding XP to ${userId} in guild ${guildId}:`, error);
        }
    }
    
    /**
     * Calculate level based on messages
     * @param {number} messages - Number of messages sent
     * @returns {number} The calculated level
     */
    calculateLevel(messages) {
        // Same leveling algorithm as before
        if (messages < 3) return 0;
        
        let level = 1;
        let requiredMessages = 3;
        
        while (messages >= requiredMessages) {
            level += 1;
            requiredMessages += 3 * Math.pow(2, level - 1);
        }
        
        return level - 1;
    }
    
    /**
     * Calculate messages needed for a specific level
     * @param {number} level - The level
     * @returns {number} Messages needed
     */
    calculateRequiredMessages(level) {
        if (level <= 0) return 0;
        if (level === 1) return 3;
        
        let totalRequired = 3; // Level 1 requires 3 messages
        
        for (let i = 2; i <= level; i++) {
            totalRequired += 3 * Math.pow(2, i - 1);
        }
        
        return totalRequired;
    }
    
    /**
     * Handle level up event
     * @param {Message} message - The Discord message that triggered the level up
     * @param {Object} userData - User data
     * @param {number} oldLevel - Previous level
     * @param {number} newLevel - New level
     * @param {Object} settings - Guild settings
     */
    async handleLevelUp(message, userData, oldLevel, newLevel, settings) {
        try {
            // Get the user
            const user = message.author;
            
            // Check for new badges
            const newBadges = await this.checkForNewBadges(message.guild.id, user.id, oldLevel, newLevel);
            
            // Create level up embed
            const embed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('🎉 Level Up!')
                .setDescription(`Congratulations, **${user.displayName || user.username}**! You've reached **Level ${newLevel}**!`)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { 
                        name: 'Progress', 
                        value: `Level ${oldLevel} → **Level ${newLevel}**` 
                    },
                    { 
                        name: 'Total XP', 
                        value: `${userData.xp} XP` 
                    }
                )
                .setFooter({ 
                    text: `Continue chatting to earn more XP!`,
                    iconURL: this.client.user.displayAvatarURL()
                })
                .setTimestamp();
            
            // Add badge information if new badges were earned
            if (newBadges.length > 0) {
                const badgeList = newBadges.map(badge => 
                    `${badge.badgeEmoji} **${badge.badgeName}** - ${badge.badgeDescription}`
                ).join('\n');
                
                embed.addFields({
                    name: '🏅 New Badge' + (newBadges.length > 1 ? 's' : '') + ' Earned!',
                    value: badgeList
                });
            }
            
            // Determine which channel to send the level up message to
            let targetChannel = message.channel;
            
            // If configured, send to a specific level-up channel instead
            if (settings.levelUpChannelId) {
                const levelUpChannel = message.guild.channels.cache.get(settings.levelUpChannelId);
                if (levelUpChannel && levelUpChannel.permissionsFor(message.guild.members.me).has('SendMessages')) {
                    targetChannel = levelUpChannel;
                }
            }
            
            // Send the level up message
            await targetChannel.send({ embeds: [embed] });
            
        } catch (error) {
            console.error('[LEVELING] Error handling level up:', error);
        }
    }
    
    /**
     * Check for new badges when a user levels up
     * @param {string} guildId - Guild ID
     * @param {string} userId - User ID
     * @param {number} oldLevel - Previous level
     * @param {number} newLevel - New level
     * @returns {Promise<Array>} Array of new badges earned
     */
    async checkForNewBadges(guildId, userId, oldLevel, newLevel) {
        const newBadges = [];
        
        try {
            // Check for level badges from configuration
            for (const badge of config.leveling.badges.levelBadges) {
                if (badge.level > oldLevel && badge.level <= newLevel) {
                    // User earned this badge - first check if they already have it
                    const badgeId = `level_${badge.level}`;
                    
                    const [existingBadge] = await db
                        .select()
                        .from(userBadges)
                        .where(
                            and(
                                eq(userBadges.userId, userId),
                                eq(userBadges.guildId, guildId),
                                eq(userBadges.badgeId, badgeId)
                            )
                        );
                    
                    if (!existingBadge) {
                        // Create the badge
                        const [newBadge] = await db
                            .insert(userBadges)
                            .values({
                                userId,
                                guildId,
                                badgeId,
                                badgeName: badge.name,
                                badgeEmoji: badge.emoji,
                                badgeColor: badge.color,
                                badgeDescription: badge.description,
                                badgeType: 'level',
                                earnedAt: new Date()
                            })
                            .returning();
                            
                        newBadges.push(newBadge);
                    }
                }
            }
            
            return newBadges;
            
        } catch (error) {
            console.error(`[LEVELING] Error checking for new badges for ${userId} in guild ${guildId}:`, error);
            return [];
        }
    }
    
    /**
     * Award a badge to a user
     * @param {Object} options - Badge award options
     * @returns {Promise<Object>} Result of the operation
     */
    async awardBadge({ guildId, userId, badgeType, badgeId }) {
        try {
            // Get badge data based on type and ID
            let badgeData = null;
            
            if (badgeType === 'achievement') {
                badgeData = config.leveling.badges.achievementBadges.find(b => b.id === badgeId);
            } else if (badgeType === 'special') {
                badgeData = config.leveling.badges.specialBadges.find(b => b.id === badgeId);
            }
            
            if (!badgeData) {
                return { success: false, message: 'Badge not found' };
            }
            
            // Check if the user already has this badge
            const [existingBadge] = await db
                .select()
                .from(userBadges)
                .where(
                    and(
                        eq(userBadges.userId, userId),
                        eq(userBadges.guildId, guildId),
                        eq(userBadges.badgeId, badgeId)
                    )
                );
                
            if (existingBadge) {
                return { success: false, message: 'User already has this badge' };
            }
            
            // Create the badge
            const [newBadge] = await db
                .insert(userBadges)
                .values({
                    userId,
                    guildId,
                    badgeId,
                    badgeName: badgeData.name,
                    badgeEmoji: badgeData.emoji,
                    badgeColor: badgeData.color,
                    badgeDescription: badgeData.description,
                    badgeType,
                    earnedAt: new Date()
                })
                .returning();
                
            return { 
                success: true, 
                message: 'Badge awarded successfully', 
                badge: newBadge 
            };
            
        } catch (error) {
            console.error('[LEVELING] Error awarding badge:', error);
            return { success: false, message: 'An error occurred' };
        }
    }
    
    /**
     * Revoke a badge from a user
     * @param {Object} options - Badge revoke options
     * @returns {Promise<Object>} Result of the operation
     */
    async revokeBadge({ guildId, userId, badgeType, badgeId }) {
        try {
            // Find the badge in database
            const [badge] = await db
                .select()
                .from(userBadges)
                .where(
                    and(
                        eq(userBadges.userId, userId),
                        eq(userBadges.guildId, guildId),
                        eq(userBadges.badgeId, badgeId),
                        eq(userBadges.badgeType, badgeType)
                    )
                );
                
            if (!badge) {
                return { success: false, message: 'User does not have this badge' };
            }
            
            // Don't allow revoking level badges that the user earned fairly
            if (badgeType === 'level') {
                return { success: false, message: 'Level badges cannot be revoked' };
            }
            
            // Delete the badge
            await db
                .delete(userBadges)
                .where(eq(userBadges.id, badge.id));
                
            return { 
                success: true, 
                message: 'Badge revoked successfully',
                badge
            };
            
        } catch (error) {
            console.error('[LEVELING] Error revoking badge:', error);
            return { success: false, message: 'An error occurred' };
        }
    }
    
    /**
     * Get all badges for a user
     * @param {string} guildId - Guild ID 
     * @param {string} userId - User ID
     * @returns {Promise<Array>} Array of user badges
     */
    async getUserBadges(guildId, userId) {
        try {
            const badges = await db
                .select()
                .from(userBadges)
                .where(
                    and(
                        eq(userBadges.userId, userId),
                        eq(userBadges.guildId, guildId)
                    )
                )
                .orderBy(desc(userBadges.earnedAt));
                
            return badges;
        } catch (error) {
            console.error(`[LEVELING] Error getting badges for ${userId} in guild ${guildId}:`, error);
            return [];
        }
    }
    
    /**
     * Get user level information
     * @param {string} guildId - Guild ID
     * @param {string} userId - User ID 
     * @returns {Promise<Object|null>} User level data or null if not found
     */
    async getUserLevel(guildId, userId) {
        try {
            const [userData] = await db
                .select()
                .from(userLevels)
                .where(
                    and(
                        eq(userLevels.userId, userId),
                        eq(userLevels.guildId, guildId)
                    )
                );
                
            return userData || null;
        } catch (error) {
            console.error(`[LEVELING] Error getting level for ${userId} in guild ${guildId}:`, error);
            return null;
        }
    }
    
    /**
     * Create an embed to display user profile
     * @param {string} guildId - Guild ID
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} Embed and badges or null if user not found
     */
    async createProfileEmbed(guildId, userId) {
        try {
            // Get user data
            const userData = await this.getUserLevel(guildId, userId);
            if (!userData) {
                return null;
            }
            
            // Get user badges
            const badges = await this.getUserBadges(guildId, userId);
            
            // Get user from Discord
            const user = await this.client.users.fetch(userId);
            if (!user) {
                return null;
            }
            
            // Calculate level progress
            const currentLevelMessages = this.calculateRequiredMessages(userData.level);
            const nextLevelMessages = this.calculateRequiredMessages(userData.level + 1);
            const messagesNeeded = nextLevelMessages - currentLevelMessages;
            const messageProgress = userData.messages - currentLevelMessages;
            const progressPercent = Math.round((messageProgress / messagesNeeded) * 100);
            
            // Create progress bar
            const barLength = 15;
            const filledLength = Math.round((progressPercent / 100) * barLength);
            const emptyLength = barLength - filledLength;
            
            const progressBar = `[${"█".repeat(filledLength)}${" ".repeat(emptyLength)}] ${progressPercent}%`;
            
            // Sort badges by type and recency
            const levelBadges = badges.filter(b => b.badgeType === 'level')
                                     .sort((a, b) => parseInt(a.badgeId.split('_')[1]) - parseInt(b.badgeId.split('_')[1]));
            const achievementBadges = badges.filter(b => b.badgeType === 'achievement');
            const specialBadges = badges.filter(b => b.badgeType === 'special');
            
            // Create badge display text
            let badgeDisplay = '';
            
            if (levelBadges.length > 0) {
                badgeDisplay += "**Level Badges:**\n";
                badgeDisplay += levelBadges.map(b => `${b.badgeEmoji} ${b.badgeName}`).join(', ') + '\n\n';
            }
            
            if (achievementBadges.length > 0) {
                badgeDisplay += "**Achievement Badges:**\n";
                badgeDisplay += achievementBadges.map(b => `${b.badgeEmoji} ${b.badgeName}`).join(', ') + '\n\n';
            }
            
            if (specialBadges.length > 0) {
                badgeDisplay += "**Special Badges:**\n";
                badgeDisplay += specialBadges.map(b => `${b.badgeEmoji} ${b.badgeName}`).join(', ');
            }
            
            // If no badges, show a message
            if (badgeDisplay === '') {
                badgeDisplay = '*No badges earned yet. Keep participating to earn badges!*';
            }
            
            // Create embed
            const embed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle(`${user.username}'s Profile`)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'Level', value: `${userData.level}`, inline: true },
                    { name: 'XP', value: `${userData.xp}`, inline: true },
                    { name: 'Messages', value: `${userData.messages}`, inline: true },
                    { name: 'Next Level', value: `${progressBar}\n${messageProgress}/${messagesNeeded} messages`, inline: false },
                    { name: 'Badges', value: badgeDisplay, inline: false }
                )
                .setFooter({ text: `Continue chatting to earn more XP and badges!` })
                .setTimestamp();
                
            return { embed, badges };
            
        } catch (error) {
            console.error(`[LEVELING] Error creating profile for ${userId} in guild ${guildId}:`, error);
            return null;
        }
    }
    
    /**
     * Get the leaderboard for a guild
     * @param {string} guildId - Guild ID
     * @param {number} limit - Number of users to return
     * @param {number} offset - Offset for pagination
     * @returns {Promise<Array>} Array of user data
     */
    async getLeaderboard(guildId, limit = 10, offset = 0) {
        try {
            // Get top users by level and XP
            const leaderboard = await db
                .select()
                .from(userLevels)
                .where(eq(userLevels.guildId, guildId))
                .orderBy(desc(userLevels.level), desc(userLevels.xp))
                .limit(limit)
                .offset(offset);
                
            return leaderboard;
        } catch (error) {
            console.error(`[LEVELING] Error getting leaderboard for guild ${guildId}:`, error);
            return [];
        }
    }
    
    /**
     * Create a leaderboard embed
     * @param {string} guildId - Guild ID
     * @param {number} page - Page number (starting at 1)
     * @returns {Promise<Object>} The leaderboard embed with navigation buttons
     */
    async createLeaderboardEmbed(guildId, page = 1) {
        try {
            const itemsPerPage = 10;
            const offset = (page - 1) * itemsPerPage;
            
            // Get leaderboard data
            const leaderboard = await this.getLeaderboard(guildId, itemsPerPage, offset);
            
            // Get total count for pagination
            const [{ count }] = await db
                .select({ count: sql`count(*)` })
                .from(userLevels)
                .where(eq(userLevels.guildId, guildId));
                
            const totalPages = Math.ceil(count / itemsPerPage);
            
            // Create leaderboard text
            let leaderboardText = "";
            
            // No data case
            if (leaderboard.length === 0) {
                leaderboardText = "*No activity recorded yet. Start chatting to earn XP!*";
            } else {
                // Try to get user data for display names
                for (let i = 0; i < leaderboard.length; i++) {
                    const rank = offset + i + 1;
                    const entry = leaderboard[i];
                    let username = entry.userId; // Fallback to ID
                    
                    try {
                        const user = await this.client.users.fetch(entry.userId);
                        if (user) {
                            username = user.username;
                        }
                    } catch (error) {
                        // Ignore errors fetching users
                    }
                    
                    // Medal emojis for top 3
                    let rankDisplay = `\`${rank}.\``;
                    if (rank === 1) rankDisplay = "🥇";
                    else if (rank === 2) rankDisplay = "🥈";
                    else if (rank === 3) rankDisplay = "🥉";
                    
                    leaderboardText += `${rankDisplay} **${username}** - Level ${entry.level} (${entry.xp} XP)\n`;
                }
            }
            
            // Create embed
            const embed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle('🏆 XP Leaderboard')
                .setDescription(leaderboardText)
                .setFooter({ 
                    text: `Page ${page}/${totalPages || 1} • Activity Tracker`,
                    iconURL: this.client.user.displayAvatarURL()
                })
                .setTimestamp();
                
            return { 
                embed,
                currentPage: page,
                totalPages: totalPages || 1
            };
            
        } catch (error) {
            console.error(`[LEVELING] Error creating leaderboard for guild ${guildId}:`, error);
            
            // Return a basic embed on error
            const embed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle('🏆 XP Leaderboard')
                .setDescription("*Error loading leaderboard data.*")
                .setFooter({ 
                    text: `Error • Activity Tracker`,
                    iconURL: this.client.user.displayAvatarURL()
                })
                .setTimestamp();
                
            return { embed, currentPage: 1, totalPages: 1 };
        }
    }
    
    /**
     * Set a user's level directly
     * @param {Object} options - Level set options
     * @returns {Promise<Object>} Result of the operation
     */
    async setUserLevel({ guildId, userId, level }) {
        try {
            // Ensure valid level
            level = Math.max(0, Math.floor(Number(level)));
            
            // Calculate messages needed for this level
            const messagesNeeded = this.calculateRequiredMessages(level);
            
            // Calculate XP (simplified as level * 100)
            const xp = level * 100;
            
            // Get current user data
            const [userData] = await db
                .select()
                .from(userLevels)
                .where(
                    and(
                        eq(userLevels.userId, userId),
                        eq(userLevels.guildId, guildId)
                    )
                );
                
            // Store the old level for badge check
            let oldLevel = 0;
            
            if (userData) {
                oldLevel = userData.level;
                
                // Update user data
                await db
                    .update(userLevels)
                    .set({
                        level,
                        messages: messagesNeeded,
                        xp,
                        updatedAt: new Date()
                    })
                    .where(
                        and(
                            eq(userLevels.userId, userId),
                            eq(userLevels.guildId, guildId)
                        )
                    );
            } else {
                // Create new user data
                await db
                    .insert(userLevels)
                    .values({
                        userId,
                        guildId,
                        level,
                        messages: messagesNeeded,
                        xp,
                        lastMessageAt: new Date()
                    });
            }
            
            // Check for new badges if level increased
            let newBadges = [];
            if (level > oldLevel) {
                newBadges = await this.checkForNewBadges(guildId, userId, oldLevel, level);
            }
            
            return {
                success: true,
                level,
                xp,
                messages: messagesNeeded,
                newBadges
            };
            
        } catch (error) {
            console.error(`[LEVELING] Error setting level for ${userId} in guild ${guildId}:`, error);
            return { success: false, message: 'An error occurred' };
        }
    }
    
    /**
     * Import data from the legacy leveling system
     * @param {Map} legacyData - The old leveling data
     * @returns {Promise<Object>} Import results
     */
    async importLegacyData(legacyData) {
        let userCount = 0;
        let badgeCount = 0;
        let guildCount = 0;
        
        try {
            // Process each guild in the legacy data
            for (const [guildId, guildMap] of legacyData.entries()) {
                guildCount++;
                
                // Create default settings for this guild
                await this.getGuildSettings(guildId);
                
                // Process each user in the guild
                for (const [userId, userData] of guildMap.entries()) {
                    try {
                        // Import user level data
                        const [existingUser] = await db
                            .select()
                            .from(userLevels)
                            .where(
                                and(
                                    eq(userLevels.userId, userId),
                                    eq(userLevels.guildId, guildId)
                                )
                            );
                            
                        if (!existingUser) {
                            await db
                                .insert(userLevels)
                                .values({
                                    userId,
                                    guildId,
                                    xp: userData.xp || 0,
                                    level: userData.level || 0,
                                    messages: userData.messages || 0,
                                    lastMessageAt: new Date(userData.lastMessage || Date.now())
                                });
                                
                            userCount++;
                        }
                        
                        // Import badges if they exist
                        if (userData.badges && Array.isArray(userData.badges)) {
                            for (const badge of userData.badges) {
                                // Skip if badge doesn't have required properties
                                if (!badge.id || !badge.name) continue;
                                
                                const [existingBadge] = await db
                                    .select()
                                    .from(userBadges)
                                    .where(
                                        and(
                                            eq(userBadges.userId, userId),
                                            eq(userBadges.guildId, guildId),
                                            eq(userBadges.badgeId, badge.id)
                                        )
                                    );
                                    
                                if (!existingBadge) {
                                    await db
                                        .insert(userBadges)
                                        .values({
                                            userId,
                                            guildId,
                                            badgeId: badge.id,
                                            badgeName: badge.name,
                                            badgeEmoji: badge.emoji || '',
                                            badgeColor: badge.color || '',
                                            badgeDescription: badge.description || '',
                                            badgeType: badge.type || 'unknown',
                                            earnedAt: new Date(badge.earnedAt || Date.now())
                                        });
                                        
                                    badgeCount++;
                                }
                            }
                        }
                    } catch (userError) {
                        console.error(`[LEVELING] Error importing user ${userId} data:`, userError);
                    }
                }
            }
            
            return {
                success: true,
                guildCount,
                userCount,
                badgeCount
            };
            
        } catch (error) {
            console.error('[LEVELING] Error importing legacy data:', error);
            return {
                success: false,
                message: 'Error importing data',
                guildCount,
                userCount,
                badgeCount
            };
        }
    }
}

module.exports = DBLevelingManager;