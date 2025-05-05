const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * Manages server-specific settings and preferences
 */
class ServerSettingsManager {
    constructor(client) {
        this.client = client;
        this.settings = new Map(); // Store server settings
        this.dataPath = path.join(__dirname, '../data/serverSettings.json');
        
        // Ensure data directory exists
        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        this.loadSettings();
    }
    
    /**
     * Load saved settings from the data file
     */
    loadSettings() {
        try {
            if (fs.existsSync(this.dataPath)) {
                const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
                
                for (const [guildId, guildSettings] of Object.entries(data)) {
                    this.settings.set(guildId, guildSettings);
                }
                
                console.log(`Loaded settings for ${this.settings.size} servers.`);
            } else {
                console.log('No server settings file found. Creating a new one.');
                this.saveSettings();
            }
        } catch (error) {
            console.error('Error loading server settings:', error);
            // Create a new settings file in case of corruption
            this.settings = new Map();
            this.saveSettings();
        }
    }
    
    /**
     * Save settings to the data file
     */
    saveSettings() {
        try {
            // Convert Map to a plain object for JSON serialization
            const dataToSave = {};
            for (const [guildId, settings] of this.settings.entries()) {
                dataToSave[guildId] = settings;
            }
            
            fs.writeFileSync(this.dataPath, JSON.stringify(dataToSave, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error('Error saving server settings:', error);
            return false;
        }
    }
    
    /**
     * Get settings for a specific guild
     * @param {string} guildId - Discord Guild ID
     * @returns {Object} Guild settings
     */
    getGuildSettings(guildId) {
        if (!this.settings.has(guildId)) {
            // Initialize with default settings
            const defaultSettings = {
                receiveBroadcasts: true, // By default, servers receive broadcasts
                welcomeEnabled: false,
                welcomeChannelId: null,
                welcomeMessage: null,
                welcomeDirectMessage: null,
                // Add other default settings as needed
            };
            
            this.settings.set(guildId, defaultSettings);
            this.saveSettings();
        }
        
        return this.settings.get(guildId);
    }
    
    /**
     * Update a specific setting for a guild
     * @param {string} guildId - Discord Guild ID
     * @param {string} setting - The setting name to update
     * @param {*} value - The new value
     * @returns {boolean} Whether the setting was successfully updated
     */
    updateGuildSetting(guildId, setting, value) {
        const guildSettings = this.getGuildSettings(guildId);
        
        if (guildSettings) {
            guildSettings[setting] = value;
            this.settings.set(guildId, guildSettings);
            return this.saveSettings();
        }
        
        return false;
    }
    
    /**
     * Toggle broadcast reception for a guild
     * @param {string} guildId - Discord Guild ID
     * @returns {boolean} The new state (true = receiving, false = opted out)
     */
    toggleBroadcastReception(guildId) {
        const guildSettings = this.getGuildSettings(guildId);
        
        // Toggle the current value
        const newValue = !guildSettings.receiveBroadcasts;
        guildSettings.receiveBroadcasts = newValue;
        
        // Save the updated settings
        this.settings.set(guildId, guildSettings);
        this.saveSettings();
        
        return newValue;
    }
    
    /**
     * Check if a guild has opted out of broadcasts
     * @param {string} guildId - Discord Guild ID
     * @returns {boolean} Whether the guild receives broadcasts
     */
    receivesBroadcasts(guildId) {
        const guildSettings = this.getGuildSettings(guildId);
        return guildSettings.receiveBroadcasts;
    }
    
    /**
     * Get a list of servers that have opted out of broadcasts
     * @returns {Array<string>} Array of guild IDs that have opted out
     */
    getOptedOutServers() {
        const optedOut = [];
        
        for (const [guildId, settings] of this.settings.entries()) {
            if (!settings.receiveBroadcasts) {
                optedOut.push(guildId);
            }
        }
        
        return optedOut;
    }
    
    /**
     * Get count of servers that receive broadcasts
     * @returns {number} Count of servers accepting broadcasts
     */
    getBroadcastReceptionCount() {
        let count = 0;
        
        for (const settings of this.settings.values()) {
            if (settings.receiveBroadcasts) {
                count++;
            }
        }
        
        // Add count for servers that haven't set preferences (they receive by default)
        const serversWithSettings = this.settings.size;
        const totalServers = this.client.guilds.cache.size;
        const serversWithoutSettings = totalServers - serversWithSettings;
        
        return count + serversWithoutSettings;
    }
}

module.exports = ServerSettingsManager;
