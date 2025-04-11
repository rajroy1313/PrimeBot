const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const ms = require('ms');

class PollManager {
    constructor(client) {
        this.client = client;
        this.polls = new Map();
        this.dataPath = path.join(__dirname, '../data/polls.json');
        
        // Ensure data directory exists
        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        this.loadPolls();
        this.startCheckingPolls();
    }
    
    /**
     * Load saved polls from the data file
     */
    loadPolls() {
        try {
            if (fs.existsSync(this.dataPath)) {
                const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
                for (const [messageId, poll] of Object.entries(data)) {
                    this.polls.set(messageId, poll);
                }
                console.log(`Loaded ${this.polls.size} polls from file.`);
            } else {
                // Create the file if it doesn't exist
                this.savePolls();
            }
        } catch (error) {
            console.error('Error loading polls:', error);
            this.polls = new Map();
        }
    }
    
    /**
     * Save polls to the data file
     */
    savePolls() {
        try {
            const data = {};
            for (const [messageId, poll] of this.polls.entries()) {
                data[messageId] = poll;
            }
            fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving polls:', error);
        }
    }
    
    /**
     * Start checking for ended polls at a regular interval
     */
    startCheckingPolls() {
        setInterval(() => {
            this.checkPolls();
        }, 10000); // Check every 10 seconds
        
        console.log('Poll checking system started.');
    }
    
    /**
     * Check for ended polls and process them
     */
    async checkPolls() {
        const now = Date.now();
        const endedPolls = [];
        
        for (const [messageId, poll] of this.polls.entries()) {
            if (poll.endTime <= now) {
                endedPolls.push(messageId);
            }
        }
        
        for (const messageId of endedPolls) {
            try {
                await this.endPoll(messageId);
            } catch (error) {
                console.error(`Error ending poll ${messageId}:`, error);
            }
        }
    }
    
    /**
     * Create a new poll
     * @param {Object} options - Poll options
     * @returns {Promise<Object>} The sent message
     */
    async createPoll({ channelId, question, options, duration, userId }) {
        // Validate options (must have 2-10 options)
        if (!options || options.length < 2 || options.length > 10) {
            throw new Error('A poll must have between 2 and 10 options.');
        }
        
        const channel = await this.client.channels.fetch(channelId);
        if (!channel) {
            throw new Error('Channel not found.');
        }
        
        // Calculate end time from duration
        const durationMs = ms(duration);
        if (!durationMs) {
            throw new Error('Invalid duration. Please use a valid format like 1m, 1h, 1d.');
        }
        
        const endTime = Date.now() + durationMs;
        
        // Create the poll embed
        const optionsWithEmojis = options.map((option, index) => {
            const emoji = this.getOptionEmoji(index);
            return `${emoji} ${option}`;
        });
        
        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`📊 Poll: ${question}`)
            .setDescription(optionsWithEmojis.join('\n\n'))
            .addFields(
                { name: 'Poll Duration', value: `Ends <t:${Math.floor(endTime / 1000)}:R>` }
            )
            .setFooter({ 
                text: `Poll created by ${userId ? (channel.guild.members.cache.get(userId)?.displayName || 'Unknown') : 'Unknown'}`, 
                iconURL: userId ? (channel.guild.members.cache.get(userId)?.user.displayAvatarURL({ dynamic: true }) || null) : null 
            })
            .setTimestamp();
        
        // Send the poll message
        const message = await channel.send({ embeds: [embed] });
        
        // Add reaction emojis for voting
        for (let i = 0; i < options.length; i++) {
            await message.react(this.getOptionEmoji(i));
        }
        
        // Save the poll data
        const pollData = {
            messageId: message.id,
            channelId,
            question,
            options,
            endTime,
            createdBy: userId,
            ended: false
        };
        
        this.polls.set(message.id, pollData);
        this.savePolls();
        
        return message;
    }
    
    /**
     * End a poll and display the results
     * @param {string} messageId - The message ID of the poll
     * @returns {Promise<boolean>} Whether the poll was successfully ended
     */
    async endPoll(messageId) {
        const poll = this.polls.get(messageId);
        if (!poll || poll.ended) {
            return false;
        }
        
        try {
            const channel = await this.client.channels.fetch(poll.channelId);
            if (!channel) {
                throw new Error('Channel not found.');
            }
            
            const message = await channel.messages.fetch(messageId).catch(() => null);
            
            if (!message) {
                // Remove the poll if the message doesn't exist anymore
                this.polls.delete(messageId);
                this.savePolls();
                return false;
            }
            
            // Count votes
            const results = [];
            
            for (let i = 0; i < poll.options.length; i++) {
                const emoji = this.getOptionEmoji(i);
                const reaction = message.reactions.cache.get(emoji);
                const count = reaction ? reaction.count - 1 : 0; // Subtract 1 to exclude the bot's reaction
                
                results.push({
                    option: poll.options[i],
                    emoji,
                    votes: count
                });
            }
            
            // Sort by votes (highest first)
            results.sort((a, b) => b.votes - a.votes);
            
            // Calculate total votes
            const totalVotes = results.reduce((sum, result) => sum + result.votes, 0);
            
            // Create results embed
            const resultLines = results.map(result => {
                const percentage = totalVotes > 0 ? Math.round((result.votes / totalVotes) * 100) : 0;
                const progressBar = this.getProgressBar(percentage);
                return `${result.emoji} **${result.option}**\n${progressBar} ${result.votes} votes (${percentage}%)`;
            });
            
            const resultsEmbed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle(`📊 Poll Results: ${poll.question}`)
                .setDescription(resultLines.join('\n\n'))
                .addFields(
                    { name: 'Total Votes', value: `${totalVotes} vote${totalVotes !== 1 ? 's' : ''}` }
                )
                .setFooter({ 
                    text: `Poll ended`, 
                    iconURL: null 
                })
                .setTimestamp();
            
            // Send the results
            await channel.send({ embeds: [resultsEmbed] });
            
            // Mark the poll as ended
            poll.ended = true;
            this.polls.set(messageId, poll);
            this.savePolls();
            
            return true;
        } catch (error) {
            console.error('Error ending poll:', error);
            return false;
        }
    }
    
    /**
     * Get the emoji for a poll option by index
     * @param {number} index - The option index
     * @returns {string} The emoji
     */
    getOptionEmoji(index) {
        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        return emojis[index] || '❓';
    }
    
    /**
     * Get a progress bar for a percentage
     * @param {number} percentage - The percentage (0-100)
     * @returns {string} The progress bar
     */
    getProgressBar(percentage) {
        const filled = Math.round(percentage / 10);
        const empty = 10 - filled;
        
        return '█'.repeat(filled) + '░'.repeat(empty);
    }
    
    /**
     * Force end a poll early
     * @param {string} messageId - The message ID of the poll
     * @returns {Promise<boolean>} Whether the poll was successfully ended
     */
    async forceEndPoll(messageId) {
        const poll = this.polls.get(messageId);
        if (!poll || poll.ended) {
            return false;
        }
        
        return await this.endPoll(messageId);
    }
}

module.exports = PollManager;