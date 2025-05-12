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
            
            // Handle commands
            switch(commandName) {
                case "broadcast":
                case "broadcasts":
                    // Check if the command is being used in a guild
                    if (!message.guild) {
                        message.reply("This command can only be used in a server.");
                        return;
                    }
                    
                    // Check permissions
                    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                        message.reply("You need the 'Manage Server' permission to change broadcast settings.");
                        return;
                    }
                    
                    if (args.length === 0) {
                        // Show current settings
                        const settings = client.serverSettingsManager.getGuildSettings(message.guild.id);
                        
                        const statusEmbed = new EmbedBuilder()
                            .setColor(config.colors.primary)
                            .setTitle('Server Broadcast Settings')
                            .addFields(
                                { 
                                    name: 'Developer Broadcasts Status', 
                                    value: settings.receiveBroadcasts 
                                        ? '✅ This server is receiving developer broadcasts'
                                        : '🔕 This server has opted out of developer broadcasts'
                                },
                                {
                                    name: 'How to Change',
                                    value: `Use \`${prefix}broadcast toggle\` to change this setting\nYou can also use the slash command \`/broadcastsettings toggle\``
                                }
                            )
                            .setFooter({ text: `Server ID: ${message.guild.id}` })
                            .setTimestamp();
                        
                        message.reply({ embeds: [statusEmbed] });
                        return;
                    }
                    
                    const subCommand = args[0].toLowerCase();
                    
                    if (subCommand === "toggle") {
                        // Toggle broadcast reception for this server
                        const newState = client.serverSettingsManager.toggleBroadcastReception(message.guild.id);
                        
                        const statusEmbed = new EmbedBuilder()
                            .setColor(newState ? config.colors.success : config.colors.error)
                            .setTitle('Broadcast Settings Updated')
                            .setDescription(
                                newState 
                                ? '✅ This server will now receive developer broadcasts.'
                                : '🔕 This server has opted out of developer broadcasts.'
                            )
                            .addFields(
                                { 
                                    name: 'What This Means', 
                                    value: newState 
                                        ? 'The bot developers can send important announcements to this server.'
                                        : 'The bot developers cannot send broadcast announcements to this server.'
                                }
                            )
                            .setFooter({ text: `Server ID: ${message.guild.id}` })
                            .setTimestamp();
                        
                        message.reply({ embeds: [statusEmbed] });
                    } else {
                        message.reply(`Unknown subcommand. Use \`${prefix}broadcast\` to view current settings or \`${prefix}broadcast toggle\` to change settings.`);
                    }
                    break;
                    
                // Add other commands here as needed
            }
        } catch (error) {
            console.error("Error in messageCreate event:", error);
        }
    },
};