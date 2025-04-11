const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        try {
            // Ignore messages from bots
            if (message.author.bot) return;

            const prefix = config.prefix;

            // Check for ping (mention)
            if (message.mentions.has(client.user.id) && client.ws.status === 0) {
                // Calculate bot uptime
                const uptime = process.uptime();
                const uptimeString = formatUptime(uptime);

                // Get guild count
                const guildCount = client.guilds.cache.size;

                // Get command count
                const commandCount = 9; // Update this manually when adding commands (giveaway, end, reroll, gstart, gend, commands, help, echo)

                // Create ping embed
                const inviteButton = new ButtonBuilder()
                    .setLabel('Invite Me')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=274878024704&scope=bot%20applications.commands`);

                const row = new ActionRowBuilder().addComponents(inviteButton);

                const pingEmbed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle('Hello there! 👋')
                    .setDescription(`I'm **${client.user.username}**, a Discord bot with giveaway and welcome features!`)
                    .addFields(
                        { name: '📋 Prefix', value: `\`${prefix}\``, inline: true },
                        { name: '🏓 Ping', value: `${client.ws.ping}ms`, inline: true },
                        { name: '⏱️ Uptime', value: uptimeString, inline: true },
                        { name: '🔧 Commands', value: `Type \`${prefix}commands\` to see all available commands!` }
                    )
                    .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
                    .setFooter({ 
                        text: `Requested by ${message.author.tag} | Serving ${guildCount} servers`, 
                        iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                    })
                    .setTimestamp();

                try {
                    await message.reply({ embeds: [pingEmbed], components: [row] });
                } catch (error) {
                    console.error('Error handling ping:', error);
                    await message.reply('Sorry, I encountered an error while processing your ping. Please try again later.');
                }
            }

            // Format uptime in a readable format
            function formatUptime(uptime) {
                const seconds = Math.floor(uptime % 60);
                const minutes = Math.floor((uptime / 60) % 60);
                const hours = Math.floor((uptime / 3600) % 24);
                const days = Math.floor(uptime / 86400);

                const parts = [];
                if (days > 0) parts.push(`${days}d`);
                if (hours > 0) parts.push(`${hours}h`);
                if (minutes > 0) parts.push(`${minutes}m`);
                if (seconds > 0) parts.push(`${seconds}s`);

                return parts.join(' ') || '0s';
            }

            // Check if message starts with prefix
            if (!message.content.startsWith(prefix)) return;

            // Parse command and arguments
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            // Handle commands
            switch (commandName) {
                case 'help':
                case 'commands':
                    const commandsEmbed = new EmbedBuilder()
                        .setColor(config.colors.primary)
                        .setTitle('Available Commands')
                        .setDescription('Here are all the commands you can use:')
                        .addFields(
                            { name: `${prefix}help`, value: 'Shows this list of commands' },
                            { name: `${prefix}commands`, value: 'Alias for help command' },
                            { name: `${prefix}giveaway [duration] [winners] [prize]`, value: 'Creates a new giveaway (Requires Manage Server permission)' },
                            { name: `${prefix}end [message_id]`, value: 'Ends a giveaway early (Requires Manage Server permission)' },
                            { name: `${prefix}reroll [message_id]`, value: 'Rerolls winners for a giveaway (Requires Manage Server permission)' },
                            { name: `${prefix}gstart [duration] [winners] [prize]`, value: 'Shortcut to create a giveaway (Requires Manage Server permission)' },
                            { name: `${prefix}gend [message_id]`, value: 'Shortcut to end a giveaway (Requires Manage Server permission)' },
                            { name: `${prefix}echo [message]`, value: 'Makes the bot repeat a message' },
                            { name: `${prefix}ticket [channel] (roles)`, value: 'Creates a ticket panel (Requires Manage Server permission)' },
                            { name: `${prefix}thistory (page)`, value: 'Shows ticket history (Requires Manage Server permission)' },
                            { name: `${prefix}ab`, value: 'Shows information about the bot' },
                            { name: `${prefix}ulog`, value: 'Shows updates and upcoming features' },
                            { name: `${prefix}tictactoe`, value: 'Starts a new TicTacToe game in the channel' },
                            { name: `${prefix}move [1-9]`, value: 'Makes a move in an active TicTacToe game' },
                            { name: `${prefix}end`, value: 'Ends the current TicTacToe game in the channel' }
                        )
                        .setTimestamp()
                        .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

                    return message.reply({ embeds: [commandsEmbed] });

                case 'giveaway':
                case 'gstart':
                    // Check permissions
                    if (!message.member.permissions.has('ManageGuild')) {
                        return message.reply('You need the Manage Server permission to create giveaways!');
                    }

                    // Validate arguments
                    if (args.length < 3) {
                        const usageEmbed = new EmbedBuilder()
                            .setColor(config.colors.error)
                            .setTitle('Invalid Usage')
                            .setDescription(`**Correct Usage:** \`${prefix}${commandName} [duration] [winners] [prize]\``)
                            .addFields(
                                { name: 'Examples', value: 
                                    `\`${prefix}${commandName} 1d 1 Discord Nitro\` - 1 day giveaway for 1 winner\n` +
                                    `\`${prefix}${commandName} 12h 3 Steam Game\` - 12 hour giveaway for 3 winners`
                                }
                            );
                        return message.reply({ embeds: [usageEmbed] });
                    }

                    // Parse arguments
                    const duration = args[0];
                    const winnerCount = parseInt(args[1]);
                    const prize = args.slice(2).join(' ');

                    // Validate winner count
                    if (isNaN(winnerCount) || winnerCount < 1 || winnerCount > 10) {
                        return message.reply('Winner count must be a number between 1 and 10!');
                    }

                    // Convert duration to milliseconds
                    const ms = require('ms');
                    const ms_duration = ms(duration);

                    if (!ms_duration) {
                        return message.reply('Please provide a valid duration format (e.g., 1m, 1h, 1d)!');
                    }

                    // Create giveaway
                    try {
                        await client.giveawayManager.startGiveaway({
                            channelId: message.channel.id,
                            duration: ms_duration,
                            prize,
                            winnerCount
                        });

                        // Send confirmation
                        const confirmEmbed = new EmbedBuilder()
                            .setColor(config.colors.success)
                            .setDescription(`✅ Giveaway created successfully for **${prize}**!`);

                        return message.reply({ embeds: [confirmEmbed] });
                    } catch (error) {
                        console.error('Error creating giveaway:', error);
                        return message.reply('There was an error creating the giveaway! Please try again later.');
                    }

                case 'end':
                case 'gend':
                    // Check permissions
                    if (!message.member.permissions.has('ManageGuild')) {
                        return message.reply('You need the Manage Server permission to end giveaways!');
                    }

                    // Validate arguments
                    if (args.length < 1) {
                        return message.reply(`**Correct Usage:** \`${prefix}${commandName} [message_id]\``);
                    }

                    // Parse arguments
                    const endMessageId = args[0];

                    // End giveaway
                    try {
                        const success = await client.giveawayManager.endGiveaway(endMessageId);

                        if (success) {
                            const endConfirmEmbed = new EmbedBuilder()
                                .setColor(config.colors.success)
                                .setDescription('✅ Giveaway ended successfully!');

                            return message.reply({ embeds: [endConfirmEmbed] });
                        } else {
                            return message.reply('Could not find an active giveaway with that message ID.');
                        }
                    } catch (error) {
                        console.error('Error ending giveaway:', error);
                        return message.reply('There was an error ending the giveaway! Please try again later.');
                    }

                case 'reroll':
                    // Check permissions
                    if (!message.member.permissions.has('ManageGuild')) {
                        return message.reply('You need the Manage Server permission to reroll giveaways!');
                    }

                    // Validate arguments
                    if (args.length < 1) {
                        return message.reply(`**Correct Usage:** \`${prefix}${commandName} [message_id]\``);
                    }

                    // Parse arguments
                    const rerollMessageId = args[0];

                    // Reroll giveaway
                    try {
                        const success = await client.giveawayManager.rerollGiveaway(rerollMessageId);

                        if (success) {
                            const rerollConfirmEmbed = new EmbedBuilder()
                                .setColor(config.colors.success)
                                .setDescription('✅ Giveaway rerolled successfully!');

                            return message.reply({ embeds: [rerollConfirmEmbed] });
                        } else {
                            return message.reply('Could not find a completed giveaway with that message ID.');
                        }
                    } catch (error) {
                        console.error('Error rerolling giveaway:', error);
                        return message.reply('There was an error rerolling the giveaway! Please try again later.');
                    }

                case 'echo':
                    // Validate arguments
                    if (args.length < 1) {
                        const usageEmbed = new EmbedBuilder()
                            .setColor(config.colors.error)
                            .setTitle('Invalid Usage')
                            .setDescription(`**Correct Usage:** \`${prefix}${commandName} [message]\``)
                            .addFields(
                                { name: 'Examples', value: 
                                    `\`${prefix}${commandName} Hello World!\` - Makes the bot say "Hello World!"\n` +
                                    `\`${prefix}${commandName} Welcome to the server!\` - Makes the bot say "Welcome to the server!"`
                                }
                            );
                        return message.reply({ embeds: [usageEmbed] });
                    }

                    // Get message content
                    const echoMessage = args.join(' ');

                    // Send the echo message
                    await message.channel.send(echoMessage);

                    // Send confirmation (optional - can be removed if you don't want this)
                    const confirmEchoEmbed = new EmbedBuilder()
                        .setColor(config.colors.success)
                        .setDescription('✅ Message echoed successfully!')
                        .setFooter({ text: `Echoed by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

                    // Delete the confirmation after 3 seconds
                    message.reply({ embeds: [confirmEchoEmbed] })
                        .then(reply => {
                            setTimeout(() => {
                                reply.delete().catch(err => console.error('Could not delete message:', err));
                            }, 3000);
                        })
                        .catch(err => console.error('Could not send message:', err));

                    // Don't return here to allow the confirmation to be sent
                    break;
                
                case 'ticket':
                    // Check permissions
                    if (!message.member.permissions.has('ManageGuild')) {
                        return message.reply('You need the Manage Server permission to create ticket panels!');
                    }
                    
                    // Validate arguments
                    if (args.length < 1) {
                        const usageEmbed = new EmbedBuilder()
                            .setColor(config.colors.error)
                            .setTitle('Invalid Usage')
                            .setDescription(`**Correct Usage:** \`${prefix}${commandName} [channel-mention] (role-mention1) (role-mention2)...\``)
                            .addFields(
                                { name: 'Examples', value: 
                                    `\`${prefix}${commandName} #support\` - Creates a ticket panel in #support channel\n` +
                                    `\`${prefix}${commandName} #help @Moderator @Admin\` - Creates a ticket panel with specified support roles`
                                }
                            );
                        return message.reply({ embeds: [usageEmbed] });
                    }
                    
                    // Parse arguments
                    const channelMention = args[0];
                    const channelId = channelMention.replace(/[<#>]/g, '');
                    
                    // Parse support roles
                    const supportRoles = [];
                    for (let i = 1; i < args.length; i++) {
                        const roleMention = args[i];
                        const roleId = roleMention.replace(/[<@&>]/g, '');
                        supportRoles.push(roleId);
                    }
                    
                    // Create ticket panel
                    try {
                        await client.ticketManager.sendTicketEmbed({
                            channelId,
                            title: 'Support Tickets',
                            description: 'Need help? Click the button below to create a support ticket!',
                            buttonText: 'Create Ticket',
                            supportRoles
                        });
                        
                        // Send confirmation
                        const confirmEmbed = new EmbedBuilder()
                            .setColor(config.colors.success)
                            .setDescription(`✅ Ticket panel created successfully in <#${channelId}>!`);
                            
                        return message.reply({ embeds: [confirmEmbed] });
                    } catch (error) {
                        console.error('Error creating ticket panel:', error);
                        return message.reply('There was an error creating the ticket panel! Make sure the channel exists and I have permissions to send messages there.');
                    }
                
                case 'thistory':
                    // Check permissions
                    if (!message.member.permissions.has('ManageGuild')) {
                        return message.reply('You need the Manage Server permission to view ticket history!');
                    }
                    
                    // Get ticket history
                    const history = client.ticketManager.getTicketHistory();
                    
                    if (history.length === 0) {
                        return message.reply('No ticket history found.');
                    }
                    
                    // Create pages of 10 tickets each
                    const page = args[0] ? parseInt(args[0]) : 1;
                    const pageSize = 10;
                    const totalPages = Math.ceil(history.length / pageSize);
                    const startIndex = (page - 1) * pageSize;
                    const endIndex = startIndex + pageSize;
                    const pageHistory = history.slice(startIndex, endIndex);
                    
                    // Create embed
                    const historyEmbed = new EmbedBuilder()
                        .setColor(config.colors.primary)
                        .setTitle('Ticket History')
                        .setDescription(`Showing ${pageHistory.length} of ${history.length} tickets. Page ${page}/${totalPages}`)
                        .setFooter({ text: `Use ${prefix}thistory [page] to view different pages` });
                    
                    // Add ticket info
                    pageHistory.forEach((ticket, index) => {
                        const createdAt = new Date(ticket.createdAt).toLocaleString();
                        const closedAt = new Date(ticket.closedAt).toLocaleString();
                        
                        historyEmbed.addFields({
                            name: `#${startIndex + index + 1} - ${ticket.threadName}`,
                            value: `Created by: ${ticket.userName} on ${createdAt}\n` +
                                  `Closed by: ${ticket.closedByName} on ${closedAt}`
                        });
                    });
                    
                    return message.reply({ embeds: [historyEmbed] });
                
                case 'tictactoe':
                case 'tictactoi': // Alternate spelling as requested
                    try {
                        // Start a new TicTacToe game
                        await client.ticTacToeManager.startGame({
                            channelId: message.channel.id,
                            playerId: message.author.id
                        });
                        
                        // Success message is sent by the manager
                    } catch (error) {
                        console.error('Error starting TicTacToe game:', error);
                        return message.reply(error.message || 'There was an error starting the game! Please try again later.');
                    }
                    break;
                    
                case 'move':
                    try {
                        // Validate arguments
                        if (args.length < 1) {
                            return message.reply(`**Correct Usage:** \`${prefix}${commandName} [position 1-9]\``);
                        }
                        
                        // Parse position
                        const position = parseInt(args[0]);
                        
                        // Make the move
                        await client.ticTacToeManager.makeMove({
                            channelId: message.channel.id,
                            playerId: message.author.id,
                            position: position
                        });
                        
                        // Success message is sent by the manager
                    } catch (error) {
                        console.error('Error making TicTacToe move:', error);
                        return message.reply(error.message || 'There was an error making the move! Please try again later.');
                    }
                    break;
                    
                case 'end':
                    try {
                        // Check if there's a TicTacToe game in this channel
                        const game = client.ticTacToeManager.getGame(message.channel.id);
                        
                        if (!game) {
                            return message.reply('There is no TicTacToe game in progress in this channel.');
                        }
                        
                        // Only allow the game starter or a user with manage messages permission to end the game
                        if (game.startedBy !== message.author.id && !message.member.permissions.has('ManageMessages')) {
                            return message.reply('Only the game starter or a moderator can end the game.');
                        }
                        
                        // End the game
                        await client.ticTacToeManager.endGame(message.channel.id);
                        
                        // Success message is sent by the manager
                    } catch (error) {
                        console.error('Error ending TicTacToe game:', error);
                        return message.reply(error.message || 'There was an error ending the game! Please try again later.');
                    }
                    break;
                
                case 'ab':
                    // Create bot description embed
                    const aboutEmbed = new EmbedBuilder()
                        .setColor(config.colors.primary)
                        .setTitle('About this Bot')
                        .setDescription('AFK Devs Bot is a feature-rich Discord bot designed to enhance server management and user engagement.')
                        .addFields(
                            { name: 'Giveaway System', value: 'Create and manage giveaways with customizable duration, prizes, and winners.' },
                            { name: 'Welcome System', value: 'Greet new members with customizable welcome messages and details.' },
                            { name: 'Ticket System', value: 'Handle support requests through a ticket system with private threads.' },
                            { name: 'Utility Commands', value: 'Various utility commands to enhance server management.' }
                        )
                        .setTimestamp()
                        .setFooter({ text: `Bot Version: 1.0.0`, iconURL: client.user.displayAvatarURL() });
                    
                    return message.reply({ embeds: [aboutEmbed] });
                
                case 'ulog':
                    // Create update log embed
                    const updateEmbed = new EmbedBuilder()
                        .setColor(config.colors.primary)
                        .setTitle('Update Log')
                        .setDescription('Keep track of the latest updates and upcoming features!')
                        .addFields(
                            { name: '✅ Recent Updates', value: 
                                '• Added TicTacToe game with $tictactoe and $move commands\n' +
                                '• Added ticket system for support requests\n' +
                                '• Added welcome system with customizable messages\n' +
                                '• Enhanced giveaway system with better visuals\n' +
                                '• Added echo command for fun interactions'
                            },
                            { name: '🔜 Coming Soon', value: 
                                '• Advanced moderation tools\n' +
                                '• Custom reaction roles\n' +
                                '• Server statistics tracking\n' +
                                '• Auto-responses for common questions'
                            }
                        )
                        .setTimestamp()
                        .setFooter({ text: `Current Version: 1.0.0`, iconURL: client.user.displayAvatarURL() });
                    
                    return message.reply({ embeds: [updateEmbed] });

                default:
                    // Command not found - do nothing
                    break;
            }

        } catch (error) {
            console.error('Error in messageCreate event:', error);
        }
    },
};