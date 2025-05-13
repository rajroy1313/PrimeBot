const {
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
} = require("discord.js");
const config = require("../config");

module.exports = {
    name: "messageCreate",
    async execute(message, client) {
        console.log(`[MESSAGE] From ${message.author.tag}: "${message.content}"`);
        
        try {
            // Ignore messages from bots
            if (message.author.bot) {
                console.log(`[BOT MSG] Skipping bot message from ${message.author.tag}`);
                return;
            }

            const prefix = config.prefix;

            // Check for ping (mention)
            if (message.mentions.has(client.user.id)) {
                console.log(`[MENTION] Bot was mentioned by ${message.author.tag}`);
                
                // Create ping embed
                const pingEmbed = new EmbedBuilder()
                    .setColor('#FF5733')
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
                    console.log(`[MENTION RESPONSE] Sent ping embed to ${message.author.tag}`);
                } catch (error) {
                    console.error("[ERROR] Error sending ping response:", error);
                    await message.reply("Hey there! My prefix is `$`. Try `$help` to see what I can do!");
                }
            }

            // Basic command handling with prefix
            if (message.content.startsWith(prefix)) {
                const args = message.content.slice(prefix.length).trim().split(/ +/);
                const commandName = args.shift().toLowerCase();
                
                console.log(`[PREFIX CMD] Detected command: ${commandName}, args: [${args.join(', ')}]`);

                // Handle counting game commands
                if (client.countingManager && commandName.startsWith('c')) {
                    console.log(`[PREFIX CMD] Processing counting command: ${commandName}`);
                    
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
                                await client.countingManager.startCountingGame({
                                    channelId: message.channel.id,
                                    startNumber,
                                    goalNumber
                                });
                                
                                message.reply(`Counting game started! Start counting from **${startNumber}** and reach **${goalNumber}** to win.`);
                                message.react('✅');
                                console.log(`[COUNTING] Started new game in ${message.guild.name} #${message.channel.name}`);
                            } catch (error) {
                                console.error('[ERROR] Starting counting game:', error);
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
                            console.log(`[COUNTING] Status requested in ${message.guild.name} #${message.channel.name}`);
                            
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
                                console.log(`[COUNTING] Game ended in ${message.guild.name} #${message.channel.name}`);
                            } else {
                                message.reply('Failed to end the counting game. Please try again later.');
                                console.error(`[COUNTING] Failed to end game in ${message.guild.name} #${message.channel.name}`);
                            }
                            
                            break;
                        }
                        
                        case 'chelp': {
                            // Show help information
                            const embed = client.countingManager.createHelpEmbed();
                            message.reply({ embeds: [embed] });
                            console.log(`[COUNTING] Help info sent to ${message.author.tag}`);
                            
                            break;
                        }
                    }
                }
                // Generic help command
                else if (commandName === 'help') {
                    console.log(`[PREFIX CMD] Processing help command from ${message.author.tag}`);
                    
                    // Create a basic help embed
                    const helpEmbed = new EmbedBuilder()
                        .setColor('#3498DB')
                        .setTitle('Bot Help')
                        .setDescription('Here are the commands you can use:')
                        .addFields(
                            { name: 'Prefix Commands', value: 'Use the `$` prefix for these commands' },
                            { name: '$help', value: 'Shows this help message', inline: true },
                            { name: '$ping', value: 'Checks the bot latency', inline: true },
                            { name: '$cstart [start] [goal]', value: 'Start a counting game (default 1 to 100)', inline: false },
                            { name: '$cstatus', value: 'Check the status of a counting game', inline: true },
                            { name: '$cend', value: 'End an active counting game', inline: true },
                            { name: '$chelp', value: 'Counting game help', inline: true }
                        )
                        .setFooter({ text: 'Bot is also equipped with slash commands - use / to see them' });
                    
                    message.reply({ embeds: [helpEmbed] });
                }
                // Simple ping command for testing
                else if (commandName === 'ping') {
                    console.log(`[PREFIX CMD] Processing ping command from ${message.author.tag}`);
                    
                    const sent = await message.reply('Pinging...');
                    const pingTime = sent.createdTimestamp - message.createdTimestamp;
                    
                    const pingEmbed = new EmbedBuilder()
                        .setColor('#2ECC71')
                        .setTitle('🏓 Pong!')
                        .addFields(
                            { name: 'Bot Latency', value: `${pingTime}ms`, inline: true },
                            { name: 'API Latency', value: `${client.ws.ping}ms`, inline: true }
                        );
                    
                    sent.edit({ content: null, embeds: [pingEmbed] });
                }
                // Unknown command - provide help
                else {
                    console.log(`[PREFIX CMD] Unknown command: ${commandName} from ${message.author.tag}`);
                    message.reply(`Unknown command: \`${commandName}\`. Try \`$help\` to see available commands.`);
                }
            }

            // Process message for counting game if available
            if (client.countingManager && typeof client.countingManager.processCountingMessage === 'function') {
                // Only log if the counting manager is processing
                console.log(`[COUNTING] Checking if message is a counting message`);
                
                // Check if message was processed by counting
                const wasProcessedByCounting = await client.countingManager.processCountingMessage(message);
                
                // If message was processed as a counting message, log and stop further processing
                if (wasProcessedByCounting) {
                    console.log(`[COUNTING] Message processed as a counting message`);
                    return;
                }
            }

            // Process message for XP and leveling if available
            if (client.levelingManager && typeof client.levelingManager.processMessage === 'function') {
                console.log(`[LEVELING] Processing message for XP`);
                await client.levelingManager.processMessage(message);
            }
            
        } catch (error) {
            console.error("[CRITICAL ERROR] Error in messageCreate event:", error);
            try {
                message.reply('Sorry, something went wrong while processing your message.');
            } catch (replyError) {
                console.error("[CRITICAL ERROR] Could not send error reply:", replyError);
            }
        }
    },
};