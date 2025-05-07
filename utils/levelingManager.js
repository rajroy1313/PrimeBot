/**
 * Leveling and Achievement Badge Manager for Discord bot
 * 
 * This module manages user levels, XP, and achievement badges
 * for the community engagement system.
 */

const fs = require('fs');
const path = require('path');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const config = require('../config');

class LevelingManager {
    constructor(client) {
        this.client = client;
        this.dataPath = path.join(__dirname, '../data/levels.json');
        this.userLevels = new Map(); // guildId -> userId -> user data
        this.cooldowns = new Map(); // userId -> timestamp
        
        this.loadLevels();
    }
    
    /**
     * Load saved user levels from the data file
     */
    loadLevels() {
        try {
            if (fs.existsSync(this.dataPath)) {
                const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
                
                // Convert from JSON object to Map structure
                for (const [guildId, guildData] of Object.entries(data)) {
                    const guildMap = new Map();
                    for (const [userId, userData] of Object.entries(guildData)) {
                        guildMap.set(userId, userData);
                    }
                    this.userLevels.set(guildId, guildMap);
                }
                
                console.log(`[LEVELING] Loaded levels for ${this.userLevels.size} guilds.`);
            } else {
                console.log(`[LEVELING] No levels data file found, creating a new one.`);
                this.saveLevels();
            }
        } catch (error) {
            console.error('[LEVELING] Error loading levels:', error);
            this.userLevels = new Map();
            this.saveLevels();
        }
    }
    
    /**
     * Save user levels to the data file
     */
    saveLevels() {
        try {
            const data = {};
            
            // Convert from Map structure to JSON-serializable object
            for (const [guildId, guildMap] of this.userLevels.entries()) {
                data[guildId] = {};
                for (const [userId, userData] of guildMap.entries()) {
                    data[guildId][userId] = userData;
                }
            }
            
            fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('[LEVELING] Error saving levels:', error);
        }
    }
    
    /**
     * Process a message for XP gain
     * @param {Message} message - The Discord message
     */
    async processMessage(message) {
        // Ignore bot messages and DMs
        if (message.author.bot || !message.guild) return;
        
        const guildId = message.guild.id;
        
        // Check if leveling is enabled for this server
        if (!this.isLevelingEnabledForGuild(guildId)) {
            return;
        }
        
        // Ignore messages that are too short
        if (message.content.length < config.leveling.minMessageLength) return;
        
        // Check if the user is on cooldown
        const userId = message.author.id;
        const now = Date.now();
        const cooldownKey = `${guildId}-${userId}`;
        
        if (this.cooldowns.has(cooldownKey)) {
            const cooldownTime = this.cooldowns.get(cooldownKey);
            if (now < cooldownTime) {
                // User is on cooldown, don't award XP
                return;
            }
        }
        
        // Set cooldown
        this.cooldowns.set(cooldownKey, now + config.leveling.xpCooldown);
        
        // Award XP
        await this.awardXP(message);
    }
    
    /**
     * Check if leveling is enabled for a guild
     * @param {string} guildId - Guild ID to check
     * @returns {boolean} Whether leveling is enabled
     */
    isLevelingEnabledForGuild(guildId) {
        // If leveling is enabled for all servers, check if this specific server has opted out
        if (config.leveling.enabledForAllServers) {
            // Check for server-specific settings
            if (config.leveling.serverSettings[guildId]) {
                return config.leveling.serverSettings[guildId].enabled;
            }
            // Otherwise, use the default settings
            return config.leveling.serverSettings.default.enabled;
        } 
        // If not enabled for all servers, only enable for the support server
        else {
            return guildId === config.leveling.supportServerId;
        }
    }
    
    /**
     * Get server leveling settings
     * @param {string} guildId - Guild ID
     * @returns {Object} Server settings for leveling
     */
    getServerSettings(guildId) {
        // Check for server-specific settings
        if (config.leveling.serverSettings[guildId]) {
            return config.leveling.serverSettings[guildId];
        }
        // Otherwise, use the default settings
        return config.leveling.serverSettings.default;
    }
    
    /**
     * Award XP to a user for a message
     * @param {Message} message - The Discord message
     */
    async awardXP(message) {
        const guildId = message.guild.id;
        const userId = message.author.id;
        
        // Get or create guild data
        if (!this.userLevels.has(guildId)) {
            this.userLevels.set(guildId, new Map());
        }
        
        const guildData = this.userLevels.get(guildId);
        
        // Get or create user data
        if (!guildData.has(userId)) {
            guildData.set(userId, {
                xp: 0,
                level: 0,
                messages: 0,
                lastMessage: Date.now(),
                badges: []
            });
        }
        
        const userData = guildData.get(userId);
        
        // Calculate XP to award (we'll still track XP for possible future features)
        const baseXP = config.leveling.xpPerMessage;
        const randomBonus = Math.floor(Math.random() * (config.leveling.maxRandomBonus + 1));
        const xpGain = baseXP + randomBonus;
        
        // Update user data
        const oldLevel = userData.level;
        userData.xp += xpGain;
        userData.messages += 1;
        userData.lastMessage = Date.now();
        
        // Calculate new level based on messages (not XP)
        const newLevel = this.calculateLevel(userData.messages);
        userData.level = newLevel;
        
        // Check for level up
        if (newLevel > oldLevel) {
            // Level up!
            await this.handleLevelUp(message, userData, oldLevel, newLevel);
        }
        
        // Save data
        this.saveLevels();
    }
    
    /**
     * Calculate level based on messages
     * @param {number} messages - Number of messages sent
     * @returns {number} The calculated level
     */
    calculateLevel(messages) {
        // Start with 3 messages for level 1, then double for each subsequent level
        // Level 1: 3 messages
        // Level 2: 6 messages
        // Level 3: 12 messages
        // Level 4: 24 messages
        // And so on...
        
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
     */
    async handleLevelUp(message, userData, oldLevel, newLevel) {
        try {
            // Get the user
            const user = message.author;
            
            // Check for new badges
            const newBadges = this.checkForNewBadges(userData, oldLevel, newLevel);
            
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
                    `${badge.emoji} **${badge.name}** - ${badge.description}`
                ).join('\n');
                
                embed.addFields({
                    name: '🏅 New Badge' + (newBadges.length > 1 ? 's' : '') + ' Earned!',
                    value: badgeList
                });
            }
            
            // Determine which channel to send the level up message to
            let targetChannel = message.channel;
            
            // If configured, send to a specific level-up channel instead
            if (config.leveling.levelUpChannelId) {
                const levelUpChannel = message.guild.channels.cache.get(config.leveling.levelUpChannelId);
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
     * @param {Object} userData - User data
     * @param {number} oldLevel - Previous level
     * @param {number} newLevel - New level
     * @returns {Array} Array of new badges earned
     */
    checkForNewBadges(userData, oldLevel, newLevel) {
        const newBadges = [];
        
        // Check for level badges
        for (const badge of config.leveling.badges.levelBadges) {
            if (badge.level > oldLevel && badge.level <= newLevel) {
                // User earned this badge
                const badgeData = {
                    id: `level_${badge.level}`,
                    name: badge.name,
                    emoji: badge.emoji,
                    color: badge.color,
                    description: badge.description,
                    earnedAt: Date.now(),
                    type: 'level'
                };
                
                // Add badge if user doesn't already have it
                if (!userData.badges.some(b => b.id === badgeData.id)) {
                    userData.badges.push(badgeData);
                    newBadges.push(badgeData);
                }
            }
        }
        
        return newBadges;
    }
    
    /**
     * Award a badge to a user
     * @param {Object} options - Badge award options
     * @returns {Promise<Object>} Result of the operation
     */
    async awardBadge({ guildId, userId, badgeType, badgeId }) {
        try {
            // Verify this is the support server
            if (guildId !== config.leveling.supportServerId) {
                return { success: false, message: 'Badges can only be awarded in the support server' };
            }
            
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
            
            // Get or create guild data
            if (!this.userLevels.has(guildId)) {
                this.userLevels.set(guildId, new Map());
            }
            
            const guildData = this.userLevels.get(guildId);
            
            // Get or create user data
            if (!guildData.has(userId)) {
                guildData.set(userId, {
                    xp: 0,
                    level: 0,
                    messages: 0,
                    lastMessage: Date.now(),
                    badges: []
                });
            }
            
            const userData = guildData.get(userId);
            
            // Create the new badge object
            const newBadge = {
                id: badgeData.id,
                name: badgeData.name,
                emoji: badgeData.emoji,
                color: badgeData.color,
                description: badgeData.description,
                earnedAt: Date.now(),
                type: badgeType
            };
            
            // Check if the user already has this badge
            if (userData.badges.some(b => b.id === newBadge.id && b.type === newBadge.type)) {
                return { success: false, message: 'User already has this badge' };
            }
            
            // Add the badge
            userData.badges.push(newBadge);
            
            // Save data
            this.saveLevels();
            
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
            // Verify this is the support server
            if (guildId !== config.leveling.supportServerId) {
                return { success: false, message: 'Badges can only be managed in the support server' };
            }
            
            // Get guild data
            if (!this.userLevels.has(guildId)) {
                return { success: false, message: 'Guild data not found' };
            }
            
            const guildData = this.userLevels.get(guildId);
            
            // Get user data
            if (!guildData.has(userId)) {
                return { success: false, message: 'User data not found' };
            }
            
            const userData = guildData.get(userId);
            
            // Find the badge in user's collection
            const badgeIndex = userData.badges.findIndex(b => 
                b.id === badgeId && b.type === badgeType
            );
            
            if (badgeIndex === -1) {
                return { success: false, message: 'User does not have this badge' };
            }
            
            // Don't allow revoking level badges that the user earned fairly
            if (badgeType === 'level') {
                return { success: false, message: 'Level badges cannot be revoked' };
            }
            
            // Remove the badge
            const removedBadge = userData.badges.splice(badgeIndex, 1)[0];
            
            // Save data
            this.saveLevels();
            
            return { 
                success: true, 
                message: 'Badge revoked successfully',
                badge: removedBadge
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
     * @returns {Array} Array of user badges or empty array if none
     */
    getUserBadges(guildId, userId) {
        // Get guild data
        if (!this.userLevels.has(guildId)) {
            return [];
        }
        
        const guildData = this.userLevels.get(guildId);
        
        // Get user data
        if (!guildData.has(userId)) {
            return [];
        }
        
        const userData = guildData.get(userId);
        
        // Return badges, sorted by earned date (newest first)
        return userData.badges.sort((a, b) => b.earnedAt - a.earnedAt);
    }
    
    /**
     * Get all level and XP data for a user
     * @param {string} guildId - Guild ID
     * @param {string} userId - User ID
     * @returns {Object|null} User level data or null if not found
     */
    getUserLevel(guildId, userId) {
        // Get guild data
        if (!this.userLevels.has(guildId)) {
            return null;
        }
        
        const guildData = this.userLevels.get(guildId);
        
        // Get user data
        if (!guildData.has(userId)) {
            return null;
        }
        
        const userData = guildData.get(userId);
        
        // Calculate additional stats
        const currentLevel = userData.level;
        const nextLevel = currentLevel + 1;
        
        // Get message requirements for current and next level
        const currentLevelMessages = this.calculateRequiredMessages(currentLevel);
        const nextLevelMessages = this.calculateRequiredMessages(nextLevel);
        
        // Calculate progress
        const messagesForNextLevel = nextLevelMessages - currentLevelMessages;
        const messagesInCurrentLevel = userData.messages - currentLevelMessages;
        const progressToNextLevel = Math.min(100, Math.floor((messagesInCurrentLevel / messagesForNextLevel) * 100));
        
        return {
            ...userData,
            currentLevel,
            nextLevel,
            currentLevelMessages,
            nextLevelMessages,
            messagesForNextLevel,
            messagesInCurrentLevel,
            progressToNextLevel
        };
    }
    
    /**
     * Get leaderboard data
     * @param {string} guildId - Guild ID
     * @param {number} limit - Number of users to include
     * @returns {Array} Array of users sorted by messages and level
     */
    getLeaderboard(guildId, limit = 10) {
        // Get guild data
        if (!this.userLevels.has(guildId)) {
            return [];
        }
        
        const guildData = this.userLevels.get(guildId);
        
        // Convert to array and sort by level and messages (highest first)
        const leaderboardData = Array.from(guildData.entries())
            .map(([userId, userData]) => ({
                userId,
                ...userData
            }))
            // First sort by level, then by messages for users at the same level
            .sort((a, b) => {
                if (a.level !== b.level) {
                    return b.level - a.level; // Higher level first
                }
                return b.messages - a.messages; // More messages first
            })
            .slice(0, limit);
        
        return leaderboardData;
    }
    
    /**
     * Create a progress bar for level progress
     * @param {number} percentage - Progress percentage (0-100)
     * @param {number} length - Length of the progress bar
     * @returns {string} The progress bar
     */
    createProgressBar(percentage, length = 10) {
        const filledLength = Math.round((percentage / 100) * length);
        const emptyLength = length - filledLength;
        
        return '█'.repeat(filledLength) + '░'.repeat(emptyLength);
    }
    
    /**
     * Create an embed for displaying a user's profile
     * @param {string} guildId - Guild ID
     * @param {string} userId - User ID
     * @returns {Object|null} Object with embed or null if user not found
     */
    async createProfileEmbed(guildId, userId) {
        try {
            // Get the user
            const user = await this.client.users.fetch(userId).catch(() => null);
            if (!user) return null;
            
            // Get user level data
            const levelData = this.getUserLevel(guildId, userId);
            if (!levelData) {
                // User not found in database, create a basic profile
                const embed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle(`${user.username}'s Profile`)
                    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                    .setDescription("This user hasn't earned any XP yet.")
                    .setFooter({ 
                        text: 'Start chatting to earn XP and badges!',
                        iconURL: this.client.user.displayAvatarURL()
                    })
                    .setTimestamp();
                
                return { embed };
            }
            
            // Get the user's rank
            const leaderboard = this.getLeaderboard(guildId, Infinity);
            const rank = leaderboard.findIndex(entry => entry.userId === userId) + 1;
            
            // Create the progress bar
            const progressBar = this.createProgressBar(levelData.progressToNextLevel, 15);
            
            // Create the profile embed
            const embed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle(`${user.username}'s Profile`)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '🏆 Rank', value: `#${rank}`, inline: true },
                    { name: '⭐ Level', value: `${levelData.level}`, inline: true },
                    { name: '✉️ Messages', value: `${levelData.messages}`, inline: true },
                    { 
                        name: '📊 Level Progress', 
                        value: `${progressBar} ${levelData.progressToNextLevel}%\n${levelData.messagesInCurrentLevel}/${levelData.messagesForNextLevel} messages for Level ${levelData.nextLevel}`
                    }
                )
                .setFooter({ 
                    text: `Total XP: ${levelData.xp}`,
                    iconURL: this.client.user.displayAvatarURL()
                })
                .setTimestamp();
            
            // Add badges if the user has any
            const badges = this.getUserBadges(guildId, userId);
            if (badges.length > 0) {
                // Group badges by type for better organization
                const levelBadges = badges.filter(b => b.type === 'level');
                const achievementBadges = badges.filter(b => b.type === 'achievement');
                const specialBadges = badges.filter(b => b.type === 'special');
                
                // Add each badge type if present
                if (levelBadges.length > 0) {
                    const badgeList = levelBadges
                        .slice(0, 5) // Limit to prevent embed from getting too large
                        .map(badge => `${badge.emoji} **${badge.name}**`)
                        .join(' • ');
                    
                    embed.addFields({
                        name: '🎖️ Level Badges',
                        value: badgeList + (levelBadges.length > 5 ? '\n*...and more*' : '')
                    });
                }
                
                if (achievementBadges.length > 0) {
                    const badgeList = achievementBadges
                        .slice(0, 5)
                        .map(badge => `${badge.emoji} **${badge.name}**`)
                        .join(' • ');
                    
                    embed.addFields({
                        name: '🏅 Achievement Badges',
                        value: badgeList + (achievementBadges.length > 5 ? '\n*...and more*' : '')
                    });
                }
                
                if (specialBadges.length > 0) {
                    const badgeList = specialBadges
                        .map(badge => `${badge.emoji} **${badge.name}**`)
                        .join(' • ');
                    
                    embed.addFields({
                        name: '💎 Special Badges',
                        value: badgeList
                    });
                }
            }
            
            return { embed };
            
        } catch (error) {
            console.error('[LEVELING] Error creating profile embed:', error);
            return null;
        }
    }
    
    /**
     * Create an embed for displaying the leaderboard
     * @param {string} guildId - Guild ID
     * @param {number} page - Page number (starting at 1)
     * @returns {Object} Object with embed and page information
     */
    async createLeaderboardEmbed(guildId, page = 1) {
        try {
            // Get leaderboard data (get more than we need for pagination)
            const leaderboard = this.getLeaderboard(guildId, 100);
            
            // Pagination
            const itemsPerPage = 10;
            const maxPage = Math.ceil(leaderboard.length / itemsPerPage);
            const validPage = Math.min(Math.max(1, page), maxPage || 1);
            
            const startIndex = (validPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const pageItems = leaderboard.slice(startIndex, endIndex);
            
            // Create the embed
            const embed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle('🏆 XP Leaderboard')
                .setDescription('Top community members ranked by XP')
                .setFooter({ 
                    text: `Page ${validPage}/${maxPage} • Total Members: ${leaderboard.length}`,
                    iconURL: this.client.user.displayAvatarURL()
                })
                .setTimestamp();
            
            // No data case
            if (pageItems.length === 0) {
                embed.setDescription('No one has earned XP yet. Start chatting to be the first on the leaderboard!');
                return { embed, currentPage: 1, maxPage: 1 };
            }
            
            // Fetch users in bulk to avoid rate limits
            const userIds = pageItems.map(item => item.userId);
            const users = new Map();
            
            for (const userId of userIds) {
                try {
                    const user = await this.client.users.fetch(userId).catch(() => null);
                    if (user) users.set(userId, user);
                } catch (err) {
                    console.error(`[LEVELING] Error fetching user ${userId}:`, err);
                }
            }
            
            // Build the leaderboard entries
            let description = '';
            
            for (let i = 0; i < pageItems.length; i++) {
                const item = pageItems[i];
                const rank = startIndex + i + 1;
                const user = users.get(item.userId);
                
                // Skip if user not found (should rarely happen)
                if (!user) continue;
                
                // Format the leaderboard entry
                const rankEmoji = rank <= 3 
                    ? ['🥇', '🥈', '🥉'][rank - 1] 
                    : `\`${rank}.\``;
                
                description += `${rankEmoji} **${user.username}** • Level ${item.level} • ${item.xp} XP\n`;
            }
            
            embed.setDescription(description);
            
            return { 
                embed, 
                currentPage: validPage, 
                maxPage 
            };
            
        } catch (error) {
            console.error('[LEVELING] Error creating leaderboard embed:', error);
            
            // Return a basic error embed
            const errorEmbed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle('Error Displaying Leaderboard')
                .setDescription('There was an error generating the leaderboard.')
                .setTimestamp();
            
            return { embed: errorEmbed, currentPage: 1, maxPage: 1 };
        }
    }
    
    /**
     * Create an embed for displaying all badges
     * @param {string} guildId - Guild ID
     * @param {string} userId - User ID (optional, for highlighting owned badges)
     * @returns {Object} Object with embed
     */
    async createBadgesEmbed(guildId, userId = null) {
        try {
            // Get user badges if userId is provided
            let userBadges = [];
            if (userId) {
                userBadges = this.getUserBadges(guildId, userId);
            }
            
            // Create the embed
            const embed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle('🏅 Available Badges')
                .setDescription('Achievement badges that can be earned in the community')
                .setFooter({ 
                    text: 'Keep participating to earn more badges!',
                    iconURL: this.client.user.displayAvatarURL()
                })
                .setTimestamp();
            
            // Add level badges
            let levelBadgesText = '';
            for (const badge of config.leveling.badges.levelBadges) {
                const hasThisBadge = userId && userBadges.some(b => 
                    b.id === `level_${badge.level}` && b.type === 'level'
                );
                
                const badgeText = `${badge.emoji} **${badge.name}** (Level ${badge.level})`;
                levelBadgesText += `${hasThisBadge ? '✅ ' : ''}${badgeText} - ${badge.description}\n`;
            }
            
            embed.addFields({
                name: '🌟 Level Badges',
                value: levelBadgesText || 'No level badges configured.'
            });
            
            // Add achievement badges
            let achievementBadgesText = '';
            for (const badge of config.leveling.badges.achievementBadges) {
                const hasThisBadge = userId && userBadges.some(b => 
                    b.id === badge.id && b.type === 'achievement'
                );
                
                const badgeText = `${badge.emoji} **${badge.name}**`;
                achievementBadgesText += `${hasThisBadge ? '✅ ' : ''}${badgeText} - ${badge.description}\n`;
            }
            
            embed.addFields({
                name: '🏆 Achievement Badges',
                value: achievementBadgesText || 'No achievement badges configured.'
            });
            
            // Add special badges (these are rare, so only show them if the user has any)
            if (userId) {
                const specialBadges = userBadges.filter(b => b.type === 'special');
                
                if (specialBadges.length > 0) {
                    let specialBadgesText = '';
                    for (const badge of specialBadges) {
                        specialBadgesText += `${badge.emoji} **${badge.name}** - ${badge.description}\n`;
                    }
                    
                    embed.addFields({
                        name: '💎 Special Badges',
                        value: specialBadgesText
                    });
                }
            }
            
            return { embed };
            
        } catch (error) {
            console.error('[LEVELING] Error creating badges embed:', error);
            
            // Return a basic error embed
            const errorEmbed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle('Error Displaying Badges')
                .setDescription('There was an error generating the badges list.')
                .setTimestamp();
            
            return { embed: errorEmbed };
        }
    }
}

module.exports = LevelingManager;