const { EmbedBuilder } = require('discord.js');
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
                const commandCount = 8; // Update this manually when adding commands (giveaway, end, reroll, gstart, gend, commands, help)
                
                // Create ping embed
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
                
                return message.reply({ embeds: [pingEmbed] });
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
                            { name: '/giveaway', value: 'Creates a new giveaway with slash command' },
                            { name: '/end', value: 'Ends a giveaway early with slash command' },
                            { name: '/reroll', value: 'Rerolls winners for a giveaway with slash command' }
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
                    
                default:
                    // Command not found - do nothing
                    break;
            }
            
        } catch (error) {
            console.error('Error in messageCreate event:', error);
        }
    },
};