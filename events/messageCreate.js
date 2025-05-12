const {
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    PermissionsBitField,
    PermissionFlagsBits,
} = require("discord.js");
const config = require("../config");

module.exports = {
    name: "messageCreate",
    async execute(message, client) {
        try {
            // Ignore messages from bots
            if (message.author.bot) return;

            const prefix = config.prefix;

            // Process auto-reactions for trigger words if in a guild
            if (message.guild) {
                // Process reactions using serverSettingsManager
                await client.serverSettingsManager.processAutoReactions(message);
            }
            
            // Process counting game messages before checking commands
            const processed = await client.countingManager.processCountingMessage(message);
            if (processed) return; // Message was processed as a count
            
            // Process message for XP and leveling
            await client.levelingManager.processMessage(message);
            
            // Check if user has no-prefix mode enabled (skip prefix check if they do)
            const hasNoPrefixMode = message.guild && 
                client.serverSettingsManager.hasNoPrefixMode(message.guild.id, message.author.id);
                
            // Check if message starts with prefix
            const hasPrefix = message.content.startsWith(prefix);
            
            // Check if message either starts with prefix or user has no-prefix mode
            if (!hasPrefix && !hasNoPrefixMode) {
                return; // Not a command message, and no-prefix mode is not enabled
            }
            
            // Parse command and arguments
            const args = hasPrefix
                ? message.content.slice(prefix.length).trim().split(/ +/)
                : message.content.trim().split(/ +/);
                
            const commandName = args.shift().toLowerCase();

            console.log(`[COMMAND] ${message.author.tag} used ${commandName} command`);
            
            // Basic commands handling - just logging for now
            // Advanced command handling is removed to fix syntax errors
        } catch (error) {
            console.error("Error in messageCreate event:", error);
        }
    },
};