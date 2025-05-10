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
                
                // Welcome system settings
                welcomeEnabled: false,
                welcomeChannelId: null,
                welcomeMessage: 'Welcome to the server, {member}! Enjoy your stay!',
                welcomeBannerUrl: config.welcome.bannerUrl || null,
                welcomeColor: config.colors.primary,
                
                // Direct message settings
                welcomeDmEnabled: config.welcome.sendDM,
                welcomeDmMessage: config.welcome.dmMessage || 'Hey {username}! Welcome to **{server}**!',
                
                // Welcome embed customization
                welcomeShowMemberCount: true,
                welcomeShowJoinDate: true,
                welcomeShowAccountAge: true,
                welcomeCustomTitle: null,
                welcomeCustomFooter: null,
                
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

    /**
     * Check if welcome messages are enabled for a guild
     * @param {string} guildId - Discord Guild ID
     * @returns {boolean} Whether welcome messages are enabled
     */
    isWelcomeEnabled(guildId) {
        const guildSettings = this.getGuildSettings(guildId);
        return guildSettings.welcomeEnabled;
    }

    /**
     * Toggle welcome messages for a guild
     * @param {string} guildId - Discord Guild ID
     * @returns {boolean} The new state (true = enabled, false = disabled)
     */
    toggleWelcome(guildId) {
        const guildSettings = this.getGuildSettings(guildId);
        
        // Toggle the current value
        const newValue = !guildSettings.welcomeEnabled;
        guildSettings.welcomeEnabled = newValue;
        
        // Save the updated settings
        this.settings.set(guildId, guildSettings);
        this.saveSettings();
        
        return newValue;
    }

    /**
     * Toggle welcome DMs for a guild
     * @param {string} guildId - Discord Guild ID
     * @returns {boolean} The new state (true = enabled, false = disabled)
     */
    toggleWelcomeDm(guildId) {
        const guildSettings = this.getGuildSettings(guildId);
        
        // Toggle the current value
        const newValue = !guildSettings.welcomeDmEnabled;
        guildSettings.welcomeDmEnabled = newValue;
        
        // Save the updated settings
        this.settings.set(guildId, guildSettings);
        this.saveSettings();
        
        return newValue;
    }

    /**
     * Set welcome channel for a guild
     * @param {string} guildId - Discord Guild ID
     * @param {string} channelId - Channel ID
     * @returns {boolean} Whether the channel was successfully set
     */
    setWelcomeChannel(guildId, channelId) {
        return this.updateGuildSetting(guildId, 'welcomeChannelId', channelId);
    }

    /**
     * Set welcome message for a guild
     * @param {string} guildId - Discord Guild ID
     * @param {string} message - Welcome message
     * @returns {boolean} Whether the message was successfully set
     */
    setWelcomeMessage(guildId, message) {
        return this.updateGuildSetting(guildId, 'welcomeMessage', message);
    }

    /**
     * Set welcome DM message for a guild
     * @param {string} guildId - Discord Guild ID
     * @param {string} message - Welcome DM message
     * @returns {boolean} Whether the message was successfully set
     */
    setWelcomeDmMessage(guildId, message) {
        return this.updateGuildSetting(guildId, 'welcomeDmMessage', message);
    }

    /**
     * Set welcome banner URL for a guild
     * @param {string} guildId - Discord Guild ID
     * @param {string} url - Banner URL
     * @returns {boolean} Whether the URL was successfully set
     */
    setWelcomeBanner(guildId, url) {
        return this.updateGuildSetting(guildId, 'welcomeBannerUrl', url);
    }

    /**
     * Set welcome color for a guild
     * @param {string} guildId - Discord Guild ID
     * @param {string} color - Color in hex format
     * @returns {boolean} Whether the color was successfully set
     */
    setWelcomeColor(guildId, color) {
        return this.updateGuildSetting(guildId, 'welcomeColor', color);
    }

    /**
     * Get welcome settings for a guild
     * @param {string} guildId - Discord Guild ID
     * @returns {Object} Welcome settings
     */
    getWelcomeSettings(guildId) {
        const settings = this.getGuildSettings(guildId);
        
        return {
            enabled: settings.welcomeEnabled,
            channelId: settings.welcomeChannelId,
            message: settings.welcomeMessage,
            bannerUrl: settings.welcomeBannerUrl,
            color: settings.welcomeColor,
            dmEnabled: settings.welcomeDmEnabled,
            dmMessage: settings.welcomeDmMessage,
            showMemberCount: settings.welcomeShowMemberCount,
            showJoinDate: settings.welcomeShowJoinDate,
            showAccountAge: settings.welcomeShowAccountAge,
            customTitle: settings.welcomeCustomTitle,
            customFooter: settings.welcomeCustomFooter
        };
    }

    /**
     * Toggle a welcome embed feature
     * @param {string} guildId - Discord Guild ID
     * @param {string} feature - Feature to toggle (welcomeShowMemberCount, welcomeShowJoinDate, welcomeShowAccountAge)
     * @returns {boolean} The new state
     */
    toggleWelcomeFeature(guildId, feature) {
        const validFeatures = [
            'welcomeShowMemberCount', 
            'welcomeShowJoinDate', 
            'welcomeShowAccountAge'
        ];
        
        if (!validFeatures.includes(feature)) {
            return false;
        }
        
        const settings = this.getGuildSettings(guildId);
        const newValue = !settings[feature];
        
        return this.updateGuildSetting(guildId, feature, newValue);
    }
}

module.exports = ServerSettingsManager;
