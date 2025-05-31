const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config');

class GiveawayManager {
    constructor(client) {
        this.client = client;
        this.giveaways = new Map(); // Store active giveaways
        this.checkInterval = null;
        this.dataPath = path.join(__dirname, '../data/giveaways.json');
        
        // Ensure data directory exists
        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        this.loadGiveaways();
        this.startCheckingGiveaways(); // Start checking for ended giveaways immediately
    }

    /**
     * Load saved giveaways from the data file
     */
    loadGiveaways() {
        try {
            if (fs.existsSync(this.dataPath)) {
                const fileContent = fs.readFileSync(this.dataPath, 'utf8');
                
                // Check if file is empty or invalid JSON
                if (!fileContent || fileContent.trim() === '') {
                    console.log('Giveaways file exists but is empty. Initializing with empty data.');
                    fs.writeFileSync(this.dataPath, JSON.stringify({}), 'utf8');
                    return;
                }
                
                let data;
                try {
                    data = JSON.parse(fileContent);
                } catch (parseError) {
                    console.error('Error parsing giveaways JSON file:', parseError);
                    console.log('Backing up corrupted file and initializing with empty data');
                    
                    // Backup the corrupted file
                    const backupPath = `${this.dataPath}.bak.${Date.now()}`;
                    fs.copyFileSync(this.dataPath, backupPath);
                    
                    // Reinitialize with empty data
                    fs.writeFileSync(this.dataPath, JSON.stringify({}), 'utf8');
                    return;
                }
                
                if (!data || typeof data !== 'object') {
                    console.error('Invalid giveaways data format. Initializing with empty data.');
                    fs.writeFileSync(this.dataPath, JSON.stringify({}), 'utf8');
                    return;
                }
                
                // Load the data into memory
                let loadedCount = 0;
                for (const [messageId, giveaway] of Object.entries(data)) {
                    // Validate giveaway object
                    if (!giveaway || typeof giveaway !== 'object') {
                        console.warn(`Skipping invalid giveaway with ID ${messageId}`);
                        continue;
                    }
                    
                    // Ensure required properties exist
                    if (!giveaway.channelId || !giveaway.prize) {
                        console.warn(`Skipping giveaway ${messageId} with missing required properties`);
                        continue;
                    }
                    
                    // Convert participants from array back to Set
                    if (giveaway.participants && Array.isArray(giveaway.participants)) {
                        giveaway.participants = new Set(giveaway.participants);
                    } else {
                        giveaway.participants = new Set();
                    }
                    
                    this.giveaways.set(messageId, giveaway);
                    loadedCount++;
                }
                
                console.log(`Loaded ${loadedCount} giveaways from file.`);
            } else {
                // Create the file if it doesn't exist
                console.log('No giveaways file found. Creating new file.');
                fs.writeFileSync(this.dataPath, JSON.stringify({}), 'utf8');
            }
        } catch (error) {
            console.error('Error loading giveaways:', error);
            // Reset the giveaways map in case of error
            this.giveaways = new Map();
            
            // Try to create a new file
            try {
                fs.writeFileSync(this.dataPath, JSON.stringify({}), 'utf8');
                console.log('Created new giveaways file after error.');
            } catch (writeError) {
                console.error('Failed to create new giveaways file:', writeError);
            }
        }
    }
    
    /**
     * Save giveaways to the data file
     */
    saveGiveaways() {
        try {
            console.log(`[GIVEAWAY] Saving ${this.giveaways.size} giveaways to file...`);
            const data = {};
            
            // Before saving, clean up any potentially corrupted entries
            let validCount = 0;
            let invalidCount = 0;
            
            for (const [messageId, giveaway] of this.giveaways.entries()) {
                // Skip invalid entries
                if (!giveaway || typeof giveaway !== 'object') {
                    console.warn(`[GIVEAWAY] Skipping invalid giveaway entry with ID ${messageId}`);
                    this.giveaways.delete(messageId);
                    invalidCount++;
                    continue;
                }
                
                // Deep copy the giveaway object to avoid modifying the original
                const giveawayData = { ...giveaway };
                
                // Convert Set to Array for JSON serialization
                if (giveawayData.participants instanceof Set) {
                    giveawayData.participants = Array.from(giveawayData.participants);
                } else {
                    // Ensure participants is always an array in the saved data
                    giveawayData.participants = [];
                }
                
                // Add required fields if missing
                if (!giveawayData.prize) giveawayData.prize = 'Unknown Prize';
                if (!giveawayData.channelId) {
                    console.warn(`[GIVEAWAY] Removing giveaway ${messageId} due to missing channelId`);
                    this.giveaways.delete(messageId);
                    invalidCount++;
                    continue;
                }
                
                // Add to data object
                data[messageId] = giveawayData;
                validCount++;
            }
            
            // Create a backup of the existing file if it exists
            if (fs.existsSync(this.dataPath)) {
                try {
                    const backupPath = `${this.dataPath}.bak`;
                    fs.copyFileSync(this.dataPath, backupPath);
                } catch (backupError) {
                    console.error('[GIVEAWAY] Failed to create backup file:', backupError);
                }
            }
            
            // Write the new data
            fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2), 'utf8');
            console.log(`[GIVEAWAY] Successfully saved ${validCount} giveaways to file (${invalidCount} invalid entries removed).`);
            
            return true;
        } catch (error) {
            console.error('[GIVEAWAY] Error saving giveaways:', error);
            console.error(error.stack);
            
            try {
                // Try writing a simple empty object in case the error was with JSON.stringify or data structure
                fs.writeFileSync(this.dataPath + '.emergency', JSON.stringify({}), 'utf8');
                console.log('[GIVEAWAY] Created emergency backup empty giveaways file.');
            } catch (emergencyError) {
                console.error('[GIVEAWAY] Failed even emergency file write:', emergencyError);
            }
            
            return false;
        }
    }
    
    /**
     * Start checking for ended giveaways at a regular interval
     */
    startCheckingGiveaways() {
        this.checkInterval = setInterval(() => {
            this.checkGiveaways();
        }, config.giveaway.checkInterval);
        
        console.log('Giveaway checking system started.');
    }

    /**
     * Check for ended giveaways and process them
     */
    async checkGiveaways() {
        const now = Date.now();
        const activeCount = Array.from(this.giveaways.values()).filter(g => !g.ended).length;
        console.log(`[GIVEAWAY] Checking for ended giveaways. Total: ${this.giveaways.size}, Active: ${activeCount}`);
        
        // Clean up old ended giveaways that are older than 24 hours
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        for (const [messageId, giveaway] of this.giveaways.entries()) {
            if (giveaway.ended && giveaway.endTime < oneDayAgo) {
                console.log(`[GIVEAWAY] Removing old ended giveaway ${messageId} from memory`);
                this.giveaways.delete(messageId);
                continue;
            }
            
            if (giveaway.endTime <= now && !giveaway.ended) {
                console.log(`[GIVEAWAY] Found ended giveaway: ${messageId} for prize "${giveaway.prize}". Ending now...`);
                try {
                    const result = await this.endGiveaway(messageId);
                    console.log(`[GIVEAWAY] Result of ending giveaway ${messageId}: ${result ? 'SUCCESS' : 'FAILED'}`);
                } catch (error) {
                    console.error(`[GIVEAWAY] Error ending giveaway ${messageId}:`, error);
                }
            }
        }
        
        // Save changes if we cleaned up any old giveaways
        this.saveGiveaways();
    }

    /**
     * Create and start a new giveaway
     * @param {Object} options - Giveaway options
     * @returns {Promise<Object>} The created giveaway object
     */
    async startGiveaway({ channelId, duration, prize, winnerCount, thumbnail = null, description = null, requiredRoleId = null }) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            if (!channel) throw new Error(`Channel with ID ${channelId} not found`);
            
            const endTime = Date.now() + duration;
            
            // Create giveaway embed
            const giveawayEmbed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle('🎉 GIVEAWAY 🎉')
                .setDescription(`**Prize**: ${prize}`)
                .addFields(
                    { name: '🏆 Winners', value: `${winnerCount}`, inline: true },
                    { name: '⏱️ Ends', value: `<t:${Math.floor(endTime / 1000)}:R>`, inline: true }
                );
                
            // Add description if provided
            if (description) {
                giveawayEmbed.addFields(
                    { name: '\u200B', value: '\u200B' },
                    { name: '📋 Description', value: description }
                );
            }
            
            // Add required role info if specified
            if (requiredRoleId) {
                const role = channel.guild.roles.cache.get(requiredRoleId);
                if (role) {
                    giveawayEmbed.addFields(
                        { name: '🎭 Required Role', value: `${role}`, inline: true }
                    );
                }
            }
            
            // Add entry instructions
            let entryInstructions = 'React with 🎉 to enter the giveaway!';
            if (requiredRoleId) {
                entryInstructions += '\n**Note:** You must have the required role to participate.';
            }
            
            giveawayEmbed.addFields(
                { name: '\u200B', value: '\u200B' },
                { name: '📝 How to Enter', value: entryInstructions }
            );
            
            // Add thumbnail or image
            if (thumbnail) {
                giveawayEmbed.setThumbnail(thumbnail);
            }
            
            // Always set the banner image
         //   giveawayEmbed.setImage('https://i.imgur.com/4MfQzYa.png');
            
            // Set footer
            giveawayEmbed.setFooter({ text: 'Good luck! • Powered by ProjectHub' })
                         .setTimestamp();
            
            // Send giveaway message
            const giveawayMessage = await channel.send({
                embeds: [giveawayEmbed]
            });
            
            // Add the reaction emoji for entering
            await giveawayMessage.react('🎉');
            
            // Store giveaway data
            const giveaway = {
                messageId: giveawayMessage.id,
                channelId,
                prize,
                winnerCount,
                endTime,
                ended: false,
                description,
                thumbnail,
                requiredRoleId,
                participants: new Set()
            };
            
            this.giveaways.set(giveawayMessage.id, giveaway);
            console.log(`Started giveaway in channel ${channelId} with ID ${giveawayMessage.id}`);
            
            return giveaway;
        } catch (error) {
            console.error('Error starting giveaway:', error);
            throw error;
        }
    }
    
    /**
     * Handle a user entering a giveaway
     * @param {Interaction} interaction - The button interaction
     */
    async handleGiveawayEntry(interaction) {
        try {
            console.log(`[GIVEAWAY] Processing entry for ${interaction.user.tag}`);
            
            // Debug information
            console.log(`[GIVEAWAY] Button customId: ${interaction.customId}`);
            console.log(`[GIVEAWAY] Message ID: ${interaction.message.id}`);
            console.log(`[GIVEAWAY] Current giveaways in memory:`, 
                Array.from(this.giveaways.keys()).join(', ') || 'None');
            
            const messageId = interaction.message.id;
            const giveaway = this.giveaways.get(messageId);
            
            if (!giveaway) {
                console.log(`[GIVEAWAY] No active giveaway found with message ID: ${messageId}`);
                return interaction.reply({ 
                    content: 'This giveaway no longer exists or has ended.', 
                    ephemeral: true 
                });
            }
            
            if (giveaway.ended) {
                console.log(`[GIVEAWAY] Giveaway ${messageId} has already ended`);
                return interaction.reply({ 
                    content: 'This giveaway has already ended.', 
                    ephemeral: true 
                });
            }
            
            const userId = interaction.user.id;
            console.log(`[GIVEAWAY] User ${interaction.user.tag} (${userId}) interacting with giveaway`);
            
            // Add or remove participant
            if (giveaway.participants.has(userId)) {
                console.log(`[GIVEAWAY] User ${interaction.user.tag} is leaving giveaway ${messageId}`);
                giveaway.participants.delete(userId);
                await interaction.reply({ 
                    content: 'You have left the giveaway.', 
                    ephemeral: true 
                });
                
                // Save updated participants
                console.log(`[GIVEAWAY] Saving updated participants (user removed)`);
                this.saveGiveaways();
                console.log(`[GIVEAWAY] Save complete`);
                
            } else {
                console.log(`[GIVEAWAY] User ${interaction.user.tag} is entering giveaway ${messageId}`);
                
                // Check if user has required role (if specified)
                if (giveaway.requiredRoleId) {
                    const member = await interaction.guild.members.fetch(userId).catch(() => null);
                    if (!member || !member.roles.cache.has(giveaway.requiredRoleId)) {
                        const role = interaction.guild.roles.cache.get(giveaway.requiredRoleId);
                        const roleName = role ? role.name : 'required role';
                        
                        return interaction.reply({
                            content: `You need the **${roleName}** role to enter this giveaway.`,
                            ephemeral: true
                        });
                    }
                }
                
                giveaway.participants.add(userId);
                await interaction.reply({ 
                    content: 'You have entered the giveaway! Good luck!', 
                    ephemeral: true 
                });
                
                // Save updated participants
                console.log(`[GIVEAWAY] Saving updated participants (user added)`);
                this.saveGiveaways();
                console.log(`[GIVEAWAY] Save complete. Current participants: ${giveaway.participants.size}`);
            }
            
        } catch (error) {
            console.error('Error handling giveaway entry:', error);
            console.error('Error stack:', error.stack);
            
            // Ensure we respond to the user even if there's an error
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({ 
                        content: 'There was an error processing your entry. Please try again.', 
                        ephemeral: true 
                    });
                } catch (replyError) {
                    console.error('Could not send error reply:', replyError);
                }
            }
        }
    }
    
    /**
     * End a giveaway and select winners
     * @param {string} messageId - The message ID of the giveaway
     * @returns {Promise<boolean>} Whether the giveaway was successfully ended
     */
    async endGiveaway(messageId) {
        try {
            const giveaway = this.giveaways.get(messageId);
            if (!giveaway || giveaway.ended) return false;
            
            // Mark as ended
            giveaway.ended = true;
            console.log(`[GIVEAWAY] Marked giveaway ${messageId} as ended. Updating in storage.`);
            
            // Get channel and message
            let channel, message;
            try {
                channel = await this.client.channels.fetch(giveaway.channelId);
                if (!channel) throw new Error(`Channel with ID ${giveaway.channelId} not found`);
                
                message = await channel.messages.fetch(messageId);
                if (!message) throw new Error(`Message with ID ${messageId} not found`);
            } catch (fetchError) {
                console.log(`[GIVEAWAY] Could not fetch message/channel for giveaway ${messageId}: ${fetchError.message}`);
                
                // If we can't fetch the message, still announce winners in a fallback way
                if (channel) {
                    const participants = Array.from(giveaway.participants);
                    const winners = this.selectWinners(participants, giveaway.winnerCount);
                    
                    if (winners.length > 0) {
                        const winnersText = winners.map(id => `<@${id}>`).join(', ');
                        await channel.send({
                            content: `🎉 **GIVEAWAY ENDED** 🎉\nCongratulations ${winnersText}! You won the **${giveaway.prize}**!\n*(Original giveaway message was deleted)*`,
                            allowedMentions: { users: winners }
                        });
                    } else {
                        await channel.send(`🎉 **GIVEAWAY ENDED** 🎉\nThe giveaway for **${giveaway.prize}** has ended, but no one entered!\n*(Original giveaway message was deleted)*`);
                    }
                }
                
                // Save and return
                this.saveGiveaways();
                console.log(`[GIVEAWAY] Giveaway ${messageId} ended with deleted message.`);
                return true;
            }
            
            // Select winners
            const participants = Array.from(giveaway.participants);
            const winners = this.selectWinners(participants, giveaway.winnerCount);
            
            // Create winners text
            let winnersText = 'No one entered the giveaway!';
            if (winners.length > 0) {
                winnersText = winners.map(id => `<@${id}>`).join(', ');
            }
            
            // Update giveaway embed
            const endedEmbed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('🎉 GIVEAWAY ENDED 🎉')
                .setDescription(`**Prize**: ${giveaway.prize}`)
                .addFields(
                    { name: '🏆 Winner(s)', value: winnersText, inline: false },
                    { name: '⏱️ Ended', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                    { name: '📊 Entries', value: `${participants.length}`, inline: true },
                );
                
            // Add description if it exists
            if (giveaway.description) {
                endedEmbed.addFields(
                    { name: '\u200B', value: '\u200B' },
                    { name: '📋 Description', value: giveaway.description }
                );
            }
            
            // Add thumbnail if it exists
            if (giveaway.thumbnail) {
                endedEmbed.setThumbnail(giveaway.thumbnail);
            }
            
            // Set banner for ended giveaways
           endedEmbed.setFooter({ text: 'Thanks for participating! • Powered by ProjectHub' })
                      .setTimestamp();
            
            // Disable the button
            const disabledButton = new ButtonBuilder()
                .setCustomId('giveaway_enter_disabled')
                .setLabel('Giveaway Ended')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🎉')
                .setDisabled(true);
            
            const disabledRow = new ActionRowBuilder().addComponents(disabledButton);
            
            // Update giveaway message
            await message.edit({
                embeds: [endedEmbed],
                components: [disabledRow]
            });
            
            // Announce winners
            if (winners.length > 0) {
                await channel.send({
                    content: `Congratulations ${winnersText}! You won the **${giveaway.prize}**!`,
                    allowedMentions: { users: winners }
                });
            } else {
                await channel.send('No one entered the giveaway, so there are no winners!');
            }
            
            // Save the updated giveaway with ended=true
            this.saveGiveaways();
            console.log(`[GIVEAWAY] Giveaway ${messageId} successfully ended and saved.`);
            
            return true;
        } catch (error) {
            console.error(`Error ending giveaway ${messageId}:`, error);
            return false;
        }
    }
    
    /**
     * Reroll winners for a giveaway
     * @param {string} messageId - The message ID of the giveaway
     * @returns {Promise<boolean>} Whether the giveaway was successfully rerolled
     */
    async rerollGiveaway(messageId) {
        try {
            const giveaway = this.giveaways.get(messageId);
            if (!giveaway || !giveaway.ended) return false;
            
            // Get channel
            const channel = await this.client.channels.fetch(giveaway.channelId);
            if (!channel) throw new Error(`Channel with ID ${giveaway.channelId} not found`);
            
            // Select new winners
            const participants = Array.from(giveaway.participants);
            const winners = this.selectWinners(participants, giveaway.winnerCount);
            
            // Create winners text
            let winnersText = 'No one entered the giveaway!';
            if (winners.length > 0) {
                winnersText = winners.map(id => `<@${id}>`).join(', ');
            }
            
            // Announce rerolled winners
            if (winners.length > 0) {
                await channel.send({
                    content: `🎉 **GIVEAWAY REROLLED!** 🎉\nNew winner(s) for the **${giveaway.prize}**: ${winnersText}`,
                    allowedMentions: { users: winners }
                });
            } else {
                await channel.send(`Could not reroll the giveaway for **${giveaway.prize}** because no one entered.`);
            }
            
            return true;
        } catch (error) {
            console.error(`Error rerolling giveaway ${messageId}:`, error);
            return false;
        }
    }
    
    /**
     * Select random winners from participants
     * @param {Array<string>} participants - Array of participant user IDs
     * @param {number} count - Number of winners to select
     * @returns {Array<string>} - Array of winner user IDs
     */
    selectWinners(participants, count) {
        if (participants.length === 0) return [];
        
        // If fewer participants than winner count, return all participants
        if (participants.length <= count) return participants;
        
        const winners = [];
        const participantsCopy = [...participants];
        
        // Randomly select winners
        for (let i = 0; i < count; i++) {
            if (participantsCopy.length === 0) break;
            
            const winnerIndex = Math.floor(Math.random() * participantsCopy.length);
            winners.push(participantsCopy[winnerIndex]);
            participantsCopy.splice(winnerIndex, 1);
        }
        
        return winners;
    }
}

module.exports = GiveawayManager;
