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
            if (message.mentions.has(client.user.id)) {
                const pingEmbed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle('Hello there! 👋')
                    .setDescription(`My prefix is \`${prefix}\`\nType \`${prefix}commands\` to see what I can do!`)
                    .setTimestamp()
                    .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });
                
                return message.reply({ embeds: [pingEmbed] });
            }
            
            // Check if message starts with prefix
            if (!message.content.startsWith(prefix)) return;
            
            // Parse command and arguments
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            
            // Handle commands
            switch (commandName) {
                case 'commands':
                    const commandsEmbed = new EmbedBuilder()
                        .setColor(config.colors.primary)
                        .setTitle('Available Commands')
                        .setDescription('Here are all the commands you can use:')
                        .addFields(
                            { name: `${prefix}commands`, value: 'Shows this list of commands' },
                            { name: `${prefix}giveaway [duration] [winners] [prize]`, value: 'Creates a new giveaway (Requires Manage Server permission)' },
                            { name: `${prefix}end [message_id]`, value: 'Ends a giveaway early (Requires Manage Server permission)' },
                            { name: `${prefix}reroll [message_id]`, value: 'Rerolls winners for a giveaway (Requires Manage Server permission)' },
                            { name: `${prefix}gstart [duration] [winners] [prize]`, value: 'Shortcut to create a giveaway (Requires Manage Server permission)' },
                            { name: `${prefix}gend [message_id]`, value: 'Shortcut to end a giveaway (Requires Manage Server permission)' },
                            { name: `${prefix}welcome channel #channel`, value: 'Sets the welcome channel (Requires Manage Server permission)' },
                            { name: `${prefix}welcome on/off`, value: 'Toggles welcome messages (Requires Manage Server permission)' },
                            { name: `${prefix}welcome message [text]`, value: 'Sets the welcome message (Requires Manage Server permission)' },
                            { name: '/giveaway', value: 'Creates a new giveaway with slash command' },
                            { name: '/end', value: 'Ends a giveaway early with slash command' },
                            { name: '/reroll', value: 'Rerolls winners for a giveaway with slash command' },
                            { name: '/welcome', value: 'Configure the welcome system with slash commands' }
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
                
                case 'welcome':
                    // Check permissions
                    if (!message.member.permissions.has('ManageGuild')) {
                        return message.reply('You need the Manage Server permission to configure welcome messages!');
                    }
                    
                    // No arguments - show current settings
                    if (args.length < 1) {
                        const settingsEmbed = new EmbedBuilder()
                            .setColor(config.colors.primary)
                            .setTitle('Welcome Message Settings')
                            .addFields(
                                { name: 'Status', value: config.welcome.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                                { name: 'Channel', value: `#${config.welcome.channelName}`, inline: true },
                                { name: 'Mentions', value: config.welcome.mentions ? '✅ Enabled' : '❌ Disabled', inline: true },
                                { name: 'Images', value: config.welcome.showImage ? '✅ Enabled' : '❌ Disabled', inline: true },
                                { name: 'Message', value: config.welcome.message, inline: false },
                                { name: 'Description', value: config.welcome.description, inline: false },
                                { name: 'Usage', value: 
                                    `\`${prefix}welcome channel #channel\` - Set welcome channel\n` +
                                    `\`${prefix}welcome on/off\` - Toggle welcome messages\n` +
                                    `\`${prefix}welcome message <text>\` - Set welcome message\n` +
                                    `\`${prefix}welcome description <text>\` - Set welcome description\n` +
                                    `\`${prefix}welcome test\` - Test the welcome message\n` +
                                    `\`${prefix}welcome mentions on/off\` - Toggle mentions\n` +
                                    `\`${prefix}welcome image on/off\` - Toggle images`
                                }
                            )
                            .setTimestamp();
                            
                        return message.reply({ embeds: [settingsEmbed] });
                    }
                    
                    const subCommand = args[0].toLowerCase();
                    
                    switch (subCommand) {
                        case 'channel':
                            // Validate arguments
                            if (args.length < 2 || !message.mentions.channels.size) {
                                return message.reply(`**Correct Usage:** \`${prefix}welcome channel #channel\``);
                            }
                            
                            const channel = message.mentions.channels.first();
                            
                            // Check if the channel is a text channel
                            if (channel.type !== 0) {
                                return message.reply('The channel must be a text channel!');
                            }
                            
                            // Update the config
                            config.welcome.channelName = channel.name;
                            
                            // Create response
                            const channelEmbed = new EmbedBuilder()
                                .setColor(config.colors.success)
                                .setTitle('Welcome Channel Updated')
                                .setDescription(`Welcome messages will now be sent to ${channel}!`)
                                .setTimestamp();
                            
                            return message.reply({ embeds: [channelEmbed] });
                            
                        case 'on':
                        case 'enable':
                            // Update the config
                            config.welcome.enabled = true;
                            
                            // Create response
                            const enableEmbed = new EmbedBuilder()
                                .setColor(config.colors.success)
                                .setTitle('Welcome Messages Enabled')
                                .setDescription('Welcome messages are now enabled!')
                                .setTimestamp();
                            
                            return message.reply({ embeds: [enableEmbed] });
                            
                        case 'off':
                        case 'disable':
                            // Update the config
                            config.welcome.enabled = false;
                            
                            // Create response
                            const disableEmbed = new EmbedBuilder()
                                .setColor(config.colors.success)
                                .setTitle('Welcome Messages Disabled')
                                .setDescription('Welcome messages are now disabled!')
                                .setTimestamp();
                            
                            return message.reply({ embeds: [disableEmbed] });
                            
                        case 'message':
                            // Validate arguments
                            if (args.length < 2) {
                                return message.reply(`**Correct Usage:** \`${prefix}welcome message Your message here\``);
                            }
                            
                            const welcomeMessage = args.slice(1).join(' ');
                            
                            // Update the config
                            config.welcome.message = welcomeMessage;
                            
                            // Create response
                            const messageEmbed = new EmbedBuilder()
                                .setColor(config.colors.success)
                                .setTitle('Welcome Message Updated')
                                .setDescription('The welcome message has been updated!')
                                .addFields(
                                    { name: 'New Message', value: welcomeMessage }
                                )
                                .setFooter({ text: `Use ${prefix}welcome test to preview` })
                                .setTimestamp();
                            
                            return message.reply({ embeds: [messageEmbed] });
                            
                        case 'description':
                            // Validate arguments
                            if (args.length < 2) {
                                return message.reply(`**Correct Usage:** \`${prefix}welcome description Your description here\``);
                            }
                            
                            const welcomeDescription = args.slice(1).join(' ');
                            
                            // Update the config
                            config.welcome.description = welcomeDescription;
                            
                            // Create response
                            const descriptionEmbed = new EmbedBuilder()
                                .setColor(config.colors.success)
                                .setTitle('Welcome Description Updated')
                                .setDescription('The welcome description has been updated!')
                                .addFields(
                                    { name: 'New Description', value: welcomeDescription }
                                )
                                .setFooter({ text: `Use ${prefix}welcome test to preview` })
                                .setTimestamp();
                            
                            return message.reply({ embeds: [descriptionEmbed] });
                            
                        case 'test':
                        case 'preview':
                            // Format the welcome message with placeholders
                            const formattedMessage = config.welcome.message
                                .replace('{member}', message.author)
                                .replace('{server}', message.guild.name)
                                .replace('{memberCount}', message.guild.memberCount);
                                
                            const formattedDescription = config.welcome.description
                                .replace('{member}', message.author)
                                .replace('{server}', message.guild.name)
                                .replace('{memberCount}', message.guild.memberCount);
                            
                            // Get information about the member
                            const joinedAt = `<t:${Math.floor(Date.now() / 1000)}:F> (<t:${Math.floor(Date.now() / 1000)}:R>)`;
                            const accountCreated = `<t:${Math.floor(message.author.createdTimestamp / 1000)}:F> (<t:${Math.floor(message.author.createdTimestamp / 1000)}:R>)`;
                            
                            // Create welcome embed preview
                            const previewEmbed = new EmbedBuilder()
                                .setColor(config.colors.primary)
                                .setTitle(`Welcome to ${message.guild.name}!`)
                                .setDescription(formattedMessage)
                                .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 256 }))
                                .addFields(
                                    { name: '📝 About', value: formattedDescription },
                                    { name: '📆 Account Created', value: accountCreated, inline: false },
                                    { name: '🎉 Joined Server', value: joinedAt, inline: false },
                                    { name: '👥 Member Count', value: `You are the ${message.guild.memberCount}th member!`, inline: false }
                                )
                                .setFooter({ text: `Preview • ID: ${message.author.id}` })
                                .setTimestamp();
                                
                            // Add banner image if enabled
                            if (config.welcome.showImage) {
                                previewEmbed.setImage(config.welcome.banner);
                            }
                            
                            // Reply with preview
                            return message.reply({
                                content: config.welcome.mentions ? `Welcome, ${message.author}!` : null,
                                embeds: [previewEmbed]
                            });
                            
                        case 'mentions':
                            // Validate arguments
                            if (args.length < 2) {
                                return message.reply(`**Correct Usage:** \`${prefix}welcome mentions on/off\``);
                            }
                            
                            const mentionsToggle = args[1].toLowerCase();
                            
                            if (mentionsToggle === 'on' || mentionsToggle === 'enable') {
                                config.welcome.mentions = true;
                                
                                const mentionsEnableEmbed = new EmbedBuilder()
                                    .setColor(config.colors.success)
                                    .setTitle('Welcome Mentions Enabled')
                                    .setDescription('User mentions in welcome messages are now enabled!')
                                    .setTimestamp();
                                
                                return message.reply({ embeds: [mentionsEnableEmbed] });
                            } else if (mentionsToggle === 'off' || mentionsToggle === 'disable') {
                                config.welcome.mentions = false;
                                
                                const mentionsDisableEmbed = new EmbedBuilder()
                                    .setColor(config.colors.success)
                                    .setTitle('Welcome Mentions Disabled')
                                    .setDescription('User mentions in welcome messages are now disabled!')
                                    .setTimestamp();
                                
                                return message.reply({ embeds: [mentionsDisableEmbed] });
                            } else {
                                return message.reply(`**Correct Usage:** \`${prefix}welcome mentions on/off\``);
                            }
                            
                        case 'image':
                        case 'images':
                            // Validate arguments
                            if (args.length < 2) {
                                return message.reply(`**Correct Usage:** \`${prefix}welcome image on/off\``);
                            }
                            
                            const imageToggle = args[1].toLowerCase();
                            
                            if (imageToggle === 'on' || imageToggle === 'enable') {
                                config.welcome.showImage = true;
                                
                                const imageEnableEmbed = new EmbedBuilder()
                                    .setColor(config.colors.success)
                                    .setTitle('Welcome Images Enabled')
                                    .setDescription('Images in welcome messages are now enabled!')
                                    .setTimestamp();
                                
                                return message.reply({ embeds: [imageEnableEmbed] });
                            } else if (imageToggle === 'off' || imageToggle === 'disable') {
                                config.welcome.showImage = false;
                                
                                const imageDisableEmbed = new EmbedBuilder()
                                    .setColor(config.colors.success)
                                    .setTitle('Welcome Images Disabled')
                                    .setDescription('Images in welcome messages are now disabled!')
                                    .setTimestamp();
                                
                                return message.reply({ embeds: [imageDisableEmbed] });
                            } else {
                                return message.reply(`**Correct Usage:** \`${prefix}welcome image on/off\``);
                            }
                        
                        default:
                            const helpEmbed = new EmbedBuilder()
                                .setColor(config.colors.primary)
                                .setTitle('Welcome Command Help')
                                .setDescription('Available welcome commands:')
                                .addFields(
                                    { name: 'Usage', value: 
                                        `\`${prefix}welcome channel #channel\` - Set welcome channel\n` +
                                        `\`${prefix}welcome on/off\` - Toggle welcome messages\n` +
                                        `\`${prefix}welcome message <text>\` - Set welcome message\n` +
                                        `\`${prefix}welcome description <text>\` - Set welcome description\n` +
                                        `\`${prefix}welcome test\` - Test the welcome message\n` +
                                        `\`${prefix}welcome mentions on/off\` - Toggle mentions\n` +
                                        `\`${prefix}welcome image on/off\` - Toggle images`
                                    }
                                )
                                .setTimestamp();
                                
                            return message.reply({ embeds: [helpEmbed] });
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