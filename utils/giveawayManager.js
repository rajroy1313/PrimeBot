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
                const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
                
                for (const [messageId, giveaway] of Object.entries(data)) {
                    // Convert participants from array back to Set
                    if (giveaway.participants && Array.isArray(giveaway.participants)) {
                        giveaway.participants = new Set(giveaway.participants);
                    } else {
                        giveaway.participants = new Set();
                    }
                    
                    this.giveaways.set(messageId, giveaway);
                }
                
                console.log(`Loaded ${this.giveaways.size} giveaways from file.`);
            } else {
                // Create the file if it doesn't exist
                this.saveGiveaways();
            }
        } catch (error) {
            console.error('Error loading giveaways:', error);
            this.giveaways = new Map();
        }
    }
    
    /**
     * Save giveaways to the data file
     */
    saveGiveaways() {
        try {
            const data = {};
            
            for (const [messageId, giveaway] of this.giveaways.entries()) {
                // Deep copy the giveaway object to avoid modifying the original
                const giveawayData = { ...giveaway };
                
                // Convert Set to Array for JSON serialization
                if (giveawayData.participants instanceof Set) {
                    giveawayData.participants = Array.from(giveawayData.participants);
                }
                
                data[messageId] = giveawayData;
            }
            
            fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
            console.log(`Saved ${this.giveaways.size} giveaways to file.`);
        } catch (error) {
            console.error('Error saving giveaways:', error);
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
        console.log(`[GIVEAWAY] Checking for ended giveaways. Active giveaways: ${this.giveaways.size}`);
        
        for (const [messageId, giveaway] of this.giveaways.entries()) {
            console.log(`[GIVEAWAY] Checking giveaway ${messageId}, end time: ${new Date(giveaway.endTime).toISOString()}, current time: ${new Date(now).toISOString()}, ended: ${giveaway.ended}`);
            
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
    }

    /**
     * Create and start a new giveaway
     * @param {Object} options - Giveaway options
     * @returns {Promise<Object>} The created giveaway object
     */
    async startGiveaway({ channelId, duration, prize, winnerCount, thumbnail = null, description = null }) {
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
            
            // Add entry instructions
            giveawayEmbed.addFields(
                { name: '\u200B', value: '\u200B' },
                { name: '📝 How to Enter', value: 'Click the button below to enter the giveaway!' }
            );
            
            // Add thumbnail or image
            if (thumbnail) {
                giveawayEmbed.setThumbnail(thumbnail);
            }
            
            // Always set the banner image
            giveawayEmbed.setImage('https://i.imgur.com/4MfQzYa.png');
            
            // Set footer
            giveawayEmbed.setFooter({ text: 'Good luck! • Powered by AFK Devs' })
                         .setTimestamp();
            
            // Create entry button
            const entryButton = new ButtonBuilder()
                .setCustomId('giveaway-enter')
                .setLabel('Enter Giveaway!')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎉');
            
            const row = new ActionRowBuilder().addComponents(entryButton);
            
            // Send giveaway message
            const giveawayMessage = await channel.send({
                embeds: [giveawayEmbed],
                components: [row]
            });
            
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
            const messageId = interaction.message.id;
            const giveaway = this.giveaways.get(messageId);
            
            if (!giveaway) {
                return interaction.reply({ 
                    content: 'This giveaway no longer exists or has ended.', 
                    ephemeral: true 
                });
            }
            
            if (giveaway.ended) {
                return interaction.reply({ 
                    content: 'This giveaway has already ended.', 
                    ephemeral: true 
                });
            }
            
            const userId = interaction.user.id;
            
            // Add or remove participant
            if (giveaway.participants.has(userId)) {
                giveaway.participants.delete(userId);
                await interaction.reply({ 
                    content: 'You have left the giveaway.', 
                    ephemeral: true 
                });
                // Save updated participants
                this.saveGiveaways();
            } else {
                giveaway.participants.add(userId);
                await interaction.reply({ 
                    content: 'You have entered the giveaway! Good luck!', 
                    ephemeral: true 
                });
                // Save updated participants
                this.saveGiveaways();
            }
            
        } catch (error) {
            console.error('Error handling giveaway entry:', error);
            await interaction.reply({ 
                content: 'There was an error processing your entry. Please try again.', 
                ephemeral: true 
            });
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
            const channel = await this.client.channels.fetch(giveaway.channelId);
            if (!channel) throw new Error(`Channel with ID ${giveaway.channelId} not found`);
            
            const message = await channel.messages.fetch(messageId);
            if (!message) throw new Error(`Message with ID ${messageId} not found`);
            
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
            endedEmbed.setImage('https://i.imgur.com/YlrGQlJ.png')
                      .setFooter({ text: 'Thanks for participating! • Powered by AFK Devs' })
                      .setTimestamp();
            
            // Disable the button
            const disabledButton = new ButtonBuilder()
                .setCustomId('giveaway-enter-disabled')
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
