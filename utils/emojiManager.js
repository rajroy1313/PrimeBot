const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const config = require('../config');

class EmojiManager {
    constructor() {
        this.emojis = new Map();
        this.dataPath = path.join(__dirname, '../data/emojis.json');
        
        // Ensure data directory exists
        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        this.loadEmojis();
    }
    
    /**
     * Load saved emojis from the data file
     */
    loadEmojis() {
        try {
            if (fs.existsSync(this.dataPath)) {
                const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
                
                // Reset the Map
                this.emojis.clear();
                
                // Load all emojis
                for (const [name, emoji] of Object.entries(data)) {
                    this.emojis.set(name, emoji);
                }
                
                console.log(`Loaded ${this.emojis.size} custom emojis.`);
            } else {
                // Create the file if it doesn't exist
                this.saveEmojis();
            }
        } catch (error) {
            console.error('Error loading emojis:', error);
            this.emojis = new Map();
        }
    }
    
    /**
     * Save emojis to the data file
     */
    saveEmojis() {
        try {
            const data = {};
            
            // Convert the Map to a plain object for JSON serialization
            for (const [name, emoji] of this.emojis.entries()) {
                data[name] = emoji;
            }
            
            fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving emojis:', error);
        }
    }
    
    /**
     * Add a new emoji
     * @param {string} name - The name of the emoji
     * @param {string} emoji - The emoji character or code
     * @returns {boolean} Whether the emoji was added successfully
     */
    addEmoji(name, emoji) {
        // Check if the name already exists
        if (this.emojis.has(name)) {
            return false;
        }
        
        // Add the emoji
        this.emojis.set(name, emoji);
        
        // Save the updated emojis
        this.saveEmojis();
        
        return true;
    }
    
    /**
     * Remove an emoji
     * @param {string} name - The name of the emoji to remove
     * @returns {boolean} Whether the emoji was removed successfully
     */
    removeEmoji(name) {
        // Check if the name exists
        if (!this.emojis.has(name)) {
            return false;
        }
        
        // Remove the emoji
        this.emojis.delete(name);
        
        // Save the updated emojis
        this.saveEmojis();
        
        return true;
    }
    
    /**
     * Get all emojis
     * @returns {Map} Map of all emojis
     */
    getAllEmojis() {
        return this.emojis;
    }
    
    /**
     * Get an emoji by name
     * @param {string} name - The name of the emoji
     * @returns {string|null} The emoji or null if not found
     */
    getEmoji(name) {
        return this.emojis.get(name) || null;
    }
    
    /**
     * Create an embed for displaying all emojis
     * @returns {EmbedBuilder} The emoji list embed
     */
    createEmojiListEmbed() {
        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('📋 Custom Emoji List')
            .setDescription(this.emojis.size > 0 ? 'Here are all the available custom emojis:' : 'No custom emojis have been added yet.');
        
        // Add fields for each emoji (max 25 fields per embed)
        let emojiCount = 0;
        let currentField = '';
        
        for (const [name, emoji] of this.emojis.entries()) {
            const emojiEntry = `**${name}**: ${emoji}\n`;
            
            // If adding this entry would exceed field value limit, create a new field
            if (currentField.length + emojiEntry.length > 1024) {
                embed.addFields({ name: `Emojis ${emojiCount - 9} to ${emojiCount}`, value: currentField });
                currentField = emojiEntry;
            } else {
                currentField += emojiEntry;
            }
            
            emojiCount++;
        }
        
        // Add the last field if there's anything left
        if (currentField.length > 0) {
            embed.addFields({ name: `Emojis ${Math.max(0, emojiCount - 9)} to ${emojiCount}`, value: currentField });
        }
        
        return embed;
    }
}

module.exports = EmojiManager;