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

            // Check for ping (mention)
            if (message.mentions.has(client.user.id) && client.ws.status === 0) {
                // Create ping embed
                const pingEmbed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle("Hello there! 👋")
                    .setDescription(`I'm **${client.user.username}**, your Discord bot`)
                    .addFields(
                        {
                            name: "📋 Prefix",
                            value: `\`${prefix}\``,
                            inline: true,
                        },
                        {
                            name: "🏓 Ping",
                            value: `${client.ws.ping}ms`,
                            inline: true,
                        }
                    )
                    .setTimestamp();

                try {
                    await message.reply({ embeds: [pingEmbed] });
                } catch (error) {
                    console.error("Error handling ping:", error);
                    await message.reply("Sorry, I encountered an error while processing your ping. Please try again later.");
                }
            }

            // Process message for counting game if available
            if (client.countingManager && typeof client.countingManager.processCountingMessage === 'function') {
                // Check if message was processed by counting
                const wasProcessedByCounting = await client.countingManager.processCountingMessage(message);
                
                // If message was processed as a counting message, stop further processing
                if (wasProcessedByCounting) return;
            }

            // Process message for XP and leveling if available
            if (client.levelingManager && typeof client.levelingManager.processMessage === 'function') {
                await client.levelingManager.processMessage(message);
            }

            // Basic command handling with prefix
            if (message.content.startsWith(prefix)) {
                const args = message.content.slice(prefix.length).trim().split(/ +/);
                const commandName = args.shift().toLowerCase();

                // Handle counting game commands
                if (client.countingManager && commandName.startsWith('c')) {
                    // Counting command handling
                    switch (commandName) {
                        case 'cstart': {
                            // Check for permissions
                            if (!message.member.permissions.has('ManageChannels')) {
                                return message.reply('You need the Manage Channels permission to start counting games!');
                            }
                            
                            // Check if there's already a game in this channel
                            const existingGame = client.countingManager.getCountingStatus(message.channel.id);
                            if (existingGame) {
                                return message.reply('There is already a counting game in this channel. End it first with `$cend`.');
                            }
                            
                            // Get options
                            const startNumber = parseInt(args[0]) || 1;
                            const goalNumber = parseInt(args[1]) || 100;
                            
                            // Validate numbers
                            if (startNumber < 0) {
                                return message.reply('The starting number must be 0 or greater.');
                            }
                            
                            if (startNumber >= goalNumber) {
                                return message.reply('The starting number must be less than the goal number.');
                            }
                            
                            // Start the game
                            try {
                                client.countingManager.startCountingGame({
                                    channelId: message.channel.id,
                                    startNumber,
                                    goalNumber
                                });
                                
                                message.react('✅');
                            } catch (error) {
                                console.error('Error starting counting game:', error);
                                message.reply('There was an error starting the counting game. Please try again later.');
                            }
                            break;
                        }
                        
                        case 'cstatus': {
                            // Check if there's a game in this channel
                            const game = client.countingManager.getCountingStatus(message.channel.id);
                            
                            if (!game) {
                                return message.reply('There is no active counting game in this channel.');
                            }
                            
                            // Create embed for the game
                            const embed = client.countingManager.createCountingEmbed(game);
                            message.reply({ embeds: [embed] });
                            
                            break;
                        }
                        
                        case 'cend': {
                            // Check permissions
                            if (!message.member.permissions.has('ManageChannels')) {
                                return message.reply('You need the Manage Channels permission to end counting games!');
                            }
                            
                            // Check if there's a game in this channel
                            const game = client.countingManager.getCountingStatus(message.channel.id);
                            
                            if (!game) {
                                return message.reply('There is no active counting game in this channel.');
                            }
                            
                            // End the game
                            const success = client.countingManager.endCountingGame(message.channel.id);
                            
                            if (success) {
                                message.reply('The counting game has been ended.');
                            } else {
                                message.reply('Failed to end the counting game. Please try again later.');
                            }
                            
                            break;
                        }
                        
                        case 'chelp': {
                            // Show help information
                            const embed = client.countingManager.createHelpEmbed();
                            message.reply({ embeds: [embed] });
                            
                            break;
                        }
                    }
                }
                // Generic help command
                else if (commandName === 'help') {
                    message.reply("This is a placeholder help command. The bot is currently being reconfigured.");
                }
            }
        } catch (error) {
            console.error("Error in messageCreate event:", error);
        }
    },
};