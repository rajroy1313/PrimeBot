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
            if (
                message.mentions.has(client.user.id) &&
                client.ws.status === 0
            ) {
                // Calculate bot uptime
                const uptime = process.uptime();
                const uptimeString = formatUptime(uptime);

                // Get guild count
                const guildCount = client.guilds.cache.size;

                // Get command count
                const commandCount = 9; // Update this manually when adding commands (giveaway, end, reroll, gstart, gend, commands, help, echo)

                // Create ping embed
                const inviteButton = new ButtonBuilder()
                    .setLabel("Invite Me")
                    .setStyle(ButtonStyle.Link)
                    .setURL(
                        `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=563242011339808&scope=bot%20applications.commands`,
                    );
                    
                const supportServerButton = new ButtonBuilder()
                    .setLabel("Support Server")
                    .setStyle(ButtonStyle.Link)
                    .setURL(config.supportServer);

                const row = new ActionRowBuilder().addComponents(inviteButton, supportServerButton);

                const pingEmbed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle("Hello there! 👋")
                    .setDescription(
                        `I'm **${client.user.username}**, your personal digital assistant (PDA)`,
                    )
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
                        },
                        {
                            name: "⏱️ Uptime",
                            value: uptimeString,
                            inline: true,
                        },
                        {
                            name: "🔧 Commands",
                            value: `Type \`${prefix}help\` to see all available commands!`,
                        },
                    )
                    .setThumbnail(
                        client.user.displayAvatarURL({ dynamic: true }),
                    )
                    .setFooter({
                        text: `Requested by ${message.author.tag}`,
                        iconURL: message.author.displayAvatarURL({
                            dynamic: true,
                        }),
                       
                          

                            iconURL: client.user.displayAvatarURL(),

                        text: `Version: ${config.version}`,
                    })
                    .setTimestamp();

                try {
                    await message.reply({
                        embeds: [pingEmbed],
                        components: [row],
                    });
                } catch (error) {
                    console.error("Error handling ping:", error);
                    await message.reply(
                        "Sorry, I encountered an error while processing your ping. Please try again later.",
                    );
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

                return parts.join(" ") || "0s";
            }

            // Check if message starts with emoji prefix (A!)
            const emojiPrefix = "+";
            if (message.content.startsWith(emojiPrefix)) {
                // Handle emoji commands
                const args = message.content.slice(emojiPrefix.length).trim().split(/ +/);
                const commandName = args.shift().toLowerCase();

                // Process emoji commands
                switch (commandName) {
                    case "emojis":
                        // Get page number if provided
                        let emojiPage = 1;
                        if (args.length > 0) {
                            const requestedPage = parseInt(args[0]);
                            if (!isNaN(requestedPage) && requestedPage > 0) {
                                emojiPage = requestedPage;
                            }
                        }
                        
                        // Get paginated emojis with buttons
                        const { embed: emojiListEmbed, currentPage, totalPages, components } = client.emojiManager.createEmojiListEmbed(emojiPage);
                        
                        // Display pagination info in the message if there are multiple pages
                        let content = null;
                        if (totalPages > 1) {
                            content = `Showing page ${currentPage} of ${totalPages}`;
                        }
                        
                        // Create message with pagination buttons that expire after 5 minutes
                        const reply = await message.reply({ 
                            content, 
                            embeds: [emojiListEmbed], 
                            components: components || [] 
                        });
                        
                        // Set up collector for button interactions
                        if (components && totalPages > 1) {
                            const filter = i => 
                                (i.customId === 'emoji_prev_page' || i.customId === 'emoji_next_page') && 
                                i.user.id === message.author.id;
                                
                            const collector = reply.createMessageComponentCollector({ 
                                filter, 
                                time: 300000 // 5 minutes
                            });
                            
                            // Store the current page for the collector to track
                            let currentEmojiPage = currentPage;
                            
                            collector.on('collect', async interaction => {
                                // Calculate the new page based on the current tracked page
                                let newPage = currentEmojiPage;
                                if (interaction.customId === 'emoji_prev_page') {
                                    newPage = Math.max(1, currentEmojiPage - 1);
                                } else if (interaction.customId === 'emoji_next_page') {
                                    newPage = Math.min(totalPages, currentEmojiPage + 1);
                                }
                                
                                // Update the current page for future interactions
                                currentEmojiPage = newPage;
                                
                                // Get the updated emoji list
                                const updatedList = client.emojiManager.createEmojiListEmbed(newPage);
                                
                                // Update the message
                                await interaction.update({ 
                                    embeds: [updatedList.embed], 
                                    components: updatedList.components || []
                                });
                            });
                            
                            collector.on('end', () => {
                                // Remove buttons when collector expires
                                reply.edit({ components: [] }).catch(console.error);
                            });
                        }
                        
                        return;
                        
                    case "eadd":
                        // Check permissions
                        if (!message.member.permissions.has("ManageMessages") && !message.member.permissions.has("ManageGuild")) {
                            return message.reply("You need the Manage Messages permission to add custom emojis!");
                        }
                        
                        // Validate arguments
                        if (args.length < 2) {
                            return message.reply(`**Correct Usage:** \`${emojiPrefix}${commandName} [name] [emoji]\``);
                        }
                        
                        // Get emoji name and emoji
                        const emojiName = args[0].toLowerCase();
                        const emojiValue = args[1];
                        
                        // Validate emoji name (no spaces, special characters)
                        if (!/^[a-z0-9_]+$/.test(emojiName)) {
                            return message.reply("Emoji names can only contain lowercase letters, numbers, and underscores.");
                        }
                        
                        // Add the emoji
                        const added = client.emojiManager.addEmoji(emojiName, emojiValue);
                        
                        if (added) {
                            const addEmbed = new EmbedBuilder()
                                .setColor(config.colors.success)
                                .setDescription(`✅ Added emoji **${emojiName}**: ${emojiValue}`);
                            
                            return message.reply({ embeds: [addEmbed] });
                        } else {
                            return message.reply(`An emoji with the name "${emojiName}" already exists.`);
                        }
                        
                    case "eremove":
                    case "edel":
                        // Check permissions
                        if (!message.member.permissions.has("ManageMessages") && !message.member.permissions.has("ManageGuild")) {
                            return message.reply("You need the Manage Messages permission to remove custom emojis!");
                        }
                        
                        // Validate arguments
                        if (args.length < 1) {
                            return message.reply(`**Correct Usage:** \`${emojiPrefix}${commandName} [name]\``);
                        }
                        
                        // Get emoji name
                        const emojiToRemove = args[0].toLowerCase();
                        
                        // Remove the emoji
                        const removed = client.emojiManager.removeEmoji(emojiToRemove);
                        
                        if (removed) {
                            const removeEmbed = new EmbedBuilder()
                                .setColor(config.colors.success)
                                .setDescription(`✅ Removed emoji **${emojiToRemove}**`);
                            
                            return message.reply({ embeds: [removeEmbed] });
                        } else {
                            return message.reply(`No emoji with the name "${emojiToRemove}" exists.`);
                        }
                        
                    case "e":
                        // Send an emoji by name
                        if (args.length < 1) {
                            return message.reply(`**Correct Usage:** \`${emojiPrefix}${commandName} [name]\``);
                        }
                        
                        const emojiToSend = args[0].toLowerCase();
                        const emoji = client.emojiManager.getEmoji(emojiToSend);
                        
                        if (emoji) {
                            return message.channel.send(emoji);
                        } else {
                            return message.reply(`No emoji with the name "${emojiToSend}" exists.`);
                        }
                        
                    case "ehelp":
                        // Display help for emoji commands
                        const emojiHelpEmbed = new EmbedBuilder()
                            .setColor(config.colors.primary)
                            .setTitle("Emoji Commands")
                            .setDescription("Here are all available emoji commands:")
                            .addFields(
                                { name: `${emojiPrefix}emojis [page]`, value: "Show all available custom emojis (5 per page)" },
                                { name: `${emojiPrefix}eadd [name] [emoji]`, value: "Add a new custom emoji (requires Manage Messages permission)" },
                                { name: `${emojiPrefix}eremove [name]`, value: "Remove a custom emoji (requires Manage Messages permission)" },
                                { name: `${emojiPrefix}e [name]`, value: "Send a custom emoji in the current channel" },
                                { name: `${emojiPrefix}ehelp`, value: "Show this help message" }
                            )
                            .setFooter({ 
                                text: `Emoji commands use the ${emojiPrefix} prefix • Version: ${config.version}`
                            });
                            
                        return message.reply({ embeds: [emojiHelpEmbed] });
                        
                    default:
                        // Check if it's an emoji name
                        const customEmoji = client.emojiManager.getEmoji(commandName);
                        if (customEmoji) {
                            return message.channel.send(customEmoji);
                        }
                        
                        // Unknown command
                        return message.reply(`Unknown emoji command. Use \`${emojiPrefix}ehelp\` to see available commands.`);
                }
                
                // We don't need to continue processing after emoji commands
                return;
            }

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
                
            // Check if message either starts with prefix or user has no-prefix mode
            const hasPrefix = message.content.startsWith(prefix);
            
            if (!hasPrefix && !hasNoPrefixMode) {
                return; // Not a command message, and no-prefix mode is not enabled
            }

            // Parse command and arguments
            const args = hasPrefix
                ? message.content.slice(prefix.length).trim().split(/ +/)
                : message.content.trim().split(/ +/);
                
            const commandName = args.shift().toLowerCase();

            // Handle commands
            switch (commandName) {
                case "help":
                case "commands":
                    // Handle help command with categorized buttons
                    
                    // Define command categories
                    const commandCategories = {
                        general: {
                            emoji: '🛠️',
                            name: 'General',
                            description: 'Basic bot commands and information',
                            commands: [
                                { name: 'help', description: 'Shows this help menu with categories' },
                                { name: 'ping', description: 'Check bot latency and status' },
                                { name: 'updates', description: 'View recent bot updates and changes' },
                                { name: 'echo', description: 'Make the bot say something (Admin only)' },
                                { name: 'np', description: 'Enable no-prefix mode for command usage' },
                                { name: 'autoreact', description: 'Set up auto-reactions to trigger words' }
                            ]
                        },
                        welcome: {
                            emoji: '👋',
                            name: 'Welcome',
                            description: 'Customize welcome messages and settings',
                            commands: [
                                { name: 'welcomeconfig', description: 'Configure welcome messages' },
                                { name: 'welcomeconfig test', description: 'Test current welcome message' },
                                { name: 'welcomeconfig channel', description: 'Set welcome channel' },
                                { name: 'welcomeconfig message', description: 'Set welcome message' },
                                { name: 'welcomeconfig toggle', description: 'Toggle welcome messages on/off' },
                                { name: 'welcomeconfig dm', description: 'Configure direct messages to new members' }
                            ]
                        },
                        leveling: {
                            emoji: '⭐',
                            name: 'Leveling',
                            description: 'User progression and leveling system',
                            commands: [
                                { name: 'leveling', description: 'Manage server leveling system' },
                                { name: 'leveling rank', description: 'View your rank and level' },
                                { name: 'leveling leaderboard', description: 'View server leaderboard' },
                                { name: 'leveling settings', description: 'Configure leveling settings' },
                                { name: 'leveling badges', description: 'View available badges' },
                                { name: 'leveling reset', description: 'Reset levels for a user (Admin only)' }
                            ]
                        },
                        tickets: {
                            emoji: '🎫',
                            name: 'Tickets',
                            description: 'Support ticket system tools',
                            commands: [
                                { name: 'ticket', description: 'Create a support ticket' },
                                { name: 'ticket close', description: 'Close an open ticket' },
                                { name: 'ticket add', description: 'Add a user to a ticket' },
                                { name: 'ticket remove', description: 'Remove a user from a ticket' },
                                { name: 'tickethistory', description: 'View past ticket history (Admin only)' }
                            ]
                        },
                        polls: {
                            emoji: '📊',
                            name: 'Polls',
                            description: 'Create polls and collect responses',
                            commands: [
                                { name: 'poll', description: 'Create a new poll with options' },
                                { name: 'endpoll', description: 'End a poll and show results' }
                            ]
                        },
                        giveaways: {
                            emoji: '🎁',
                            name: 'Giveaways',
                            description: 'Run giveaways with random winners',
                            commands: [
                                { name: 'giveaway', description: 'Start a new giveaway' },
                                { name: 'gstart', description: 'Start a giveaway with specific settings' },
                                { name: 'gend', description: 'End a giveaway early' },
                                { name: 'reroll', description: 'Reroll a giveaway winner' }
                            ]
                        },
                        games: {
                            emoji: '🎮',
                            name: 'Games',
                            description: 'Interactive games and activities',
                            commands: [
                                { name: 'tictactoe', description: 'Play Tic Tac Toe with a friend' },
                                { name: 'endgame', description: 'End an active game' },
                                { name: 'truthdare', description: 'Play Truth or Dare' },
                                { name: 'counting', description: 'Play a counting game in a channel' }
                            ]
                        },
                        utility: {
                            emoji: '⚙️',
                            name: 'Utility',
                            description: 'Server management and utility tools',
                            commands: [
                                { name: 'broadcastsettings', description: 'Control broadcast reception' },
                                { name: 'move', description: 'Move messages to another channel' },
                                { name: 'ses', description: 'View server enhancement suggestions' }
                            ]
                        }
                    };
                    
                    // Check if user specified a category
                    if (args.length > 0) {
                        // First check if it's a legacy page number request
                        const requestedPage = parseInt(args[0]);
                        if (!isNaN(requestedPage) && requestedPage > 0) {
                            // Handle legacy paginated help
                            let commandPage = requestedPage;
                            
                            // Define basic commands available in all servers
                            let allCommands = [
                                { name: `${prefix}help`, value: "Shows categorized commands" },
                                { name: `${prefix}commands`, value: "Alias for help command" },
                        { name: `${prefix}giveaway`, value: "Shows all giveaway commands" },
                        { name: `${prefix}gstart [duration] [winners] [prize]`, value: "Creates a new giveaway" },
                        { name: `${prefix}gend [message_id]`, value: "Ends a giveaway early" },
                        { name: `${prefix}reroll [message_id]`, value: "Rerolls winners for a giveaway" },
                        { name: `${prefix}echo [message]`, value: "Makes the bot repeat a message" },
                        { name: `${prefix}ping`, value: "Shows the bot's latency" },
                        { name: `${prefix}thelp`, value: "Shows all ticket system commands" },
                        { name: `${prefix}ticket [channel] (roles)`, value: "Creates a ticket panel" },
                        
                        { name: `${prefix}thistory (page)`, value: "Shows ticket history" },
                        { name: `${prefix}ab`, value: "Shows information about the bot" },
                        { name: `${prefix}ulog`, value: "Shows updates and upcoming features" },
                        { name: `${prefix}tictactoe`, value: "Starts a new TicTacToe game in the channel" },
                        { name: `${prefix}move [1-9]`, value: "Makes a move in an active TicTacToe game" },
                        { name: `${prefix}tend`, value: "Ends the current TicTacToe game in the channel" },
                        { name: `${prefix}poll [duration] [question] | [options]`, value: "Creates a poll with a timer" },
                        { name: `${prefix}endpoll [message_id]`, value: "Ends a poll early" },
                        { name: `${prefix}birthday`, value: "Shows all birthday commands" },
                        { name: `${prefix}birthday set [MM/DD/YYYY]`, value: "Sets your birthday (year is optional)" },
                        { name: `${prefix}birthday remove`, value: "Removes your birthday" },
                        { name: `${prefix}birthday list`, value: "Shows upcoming birthdays" },
                        { name: `${prefix}birthday check [@user]`, value: "Check your or someone else's birthday" },
                        { name: `${prefix}birthday channel [#channel]`, value: "Sets the birthday announcement channel (requires Manage Server permission)" },
                        { name: `${prefix}birthday role [@role]`, value: "Sets the birthday role (requires Manage Server permission)" },
                        { name: `Emoji Commands ${emojiPrefix} prefix`, value: `Use ${emojiPrefix}help to see all emoji commands`, },
                        { name: `${prefix}cstart [start] [goal]`, value: "Start a number counting game (requires Manage Server permission)" },
                        { name: `${prefix}cstatus`, value: "Check the status of the current counting game" },
                        { name: `${prefix}cend`, value: "End the current counting game (requires Manage Server permission)" },
                        { name: `${prefix}chelp`, value: "Show help for the counting game" },
                        { name: `${prefix}truthdare`, value: "Start a Truth or Dare game with interactive buttons" },
                        { name: `${prefix}qadd [truth/dare] [question]`, value: "Add a custom truth or dare question to the collection" },
                    ];
                    
                    // If we're in the support server, add the leveling commands to the list
                    if (message.guild && message.guild.id === config.leveling.supportServerId) {
                        // Leveling System Commands (only shown in support server)
                        const levelingCommands = [
                            { name: `${prefix}leaderboard [page]`, value: "Shows the community XP leaderboard" },
                            { name: `${prefix}rank [@user]`, value: "Shows your or another user's level and XP" },
                            { name: `${prefix}profile [@user]`, value: "Shows detailed stats and badges" },
                            { name: `${prefix}badges [@user]`, value: "Shows available and earned badges" },
                            { name: `${prefix}level [@user]`, value: "Alias for rank command" },
                            { name: `${prefix}exp [@user]`, value: "Alias for rank command" },
                        ];
                        
                        // Add leveling commands to the main commands list
                        allCommands = [...allCommands, ...levelingCommands];
                    }
                    
                    // Settings for pagination
                    const commandsPerPage = 5; // 5 commands per page as requested
                    const totalCommands = allCommands.length;
                    const totalPages = Math.ceil(totalCommands / commandsPerPage);
                    
                    // Validate the page number
                    commandPage = Math.max(1, Math.min(commandPage, totalPages));
                    
                    // Calculate start and end indices for the current page
                    const startIndex = (commandPage - 1) * commandsPerPage;
                    const endIndex = Math.min(startIndex + commandsPerPage, totalCommands);
                    
                    // Get the commands for the current page
                    const pageCommands = allCommands.slice(startIndex, endIndex);
                    
                    // Create the embed
                    const commandsEmbed = new EmbedBuilder()
                        .setColor(config.colors.Gold)
                        .setTitle("Available Commands")
                        .setDescription(`Here are commands you can use (Page ${commandPage}/${totalPages}):`)
                        .addFields(...pageCommands)
                        .setTimestamp()
                        .setFooter({
                            text: `Page ${commandPage}/${totalPages} • Use buttons below to navigate • Version: ${config.version}`,
                            iconURL: message.author.displayAvatarURL({
                                dynamic: true,
                            }),
                        });
                    
                    // Display pagination info in the message if there are multiple pages
                    let content = null;
                    if (totalPages > 1) {
                        content = `Showing page ${commandPage} of ${totalPages}`;
                    }
                    
                    // Create buttons for pagination
                    const buttons = [];
                    
                    // Create Previous page button (disabled on first page)
                    const prevButton = new ButtonBuilder()
                        .setCustomId('command_prev_page')
                        .setLabel('⬅️ Previous')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(commandPage === 1);
                    
                    // Create Next page button (disabled on last page)
                    const nextButton = new ButtonBuilder()
                        .setCustomId('command_next_page')
                        .setLabel('Next ➡️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(commandPage === totalPages);
                    
                    buttons.push(prevButton, nextButton);
                    const row = new ActionRowBuilder().addComponents(buttons);
                    
                    // Components array to include in the message
                    const components = totalPages > 1 ? [row] : [];
                    
                    // Create message with pagination buttons that expire after 5 minutes
                    const reply = await message.reply({ 
                        content, 
                        embeds: [commandsEmbed], 
                        components 
                    });
                    
                    // Set up collector for button interactions if we have multiple pages
                    if (totalPages > 1) {
                        const filter = i => 
                            (i.customId === 'command_prev_page' || i.customId === 'command_next_page') && 
                            i.user.id === message.author.id;
                            
                        const collector = reply.createMessageComponentCollector({ 
                            filter, 
                            time: 300000 // 5 minutes
                        });
                        
                        // Store the current page for the collector to track
                        let currentPage = commandPage;
                        
                        collector.on('collect', async interaction => {
                            // Calculate the new page based on the current tracked page
                            let newPage = currentPage;
                            if (interaction.customId === 'command_prev_page') {
                                newPage = Math.max(1, currentPage - 1);
                            } else if (interaction.customId === 'command_next_page') {
                                newPage = Math.min(totalPages, currentPage + 1);
                            }
                            
                            // Update the current page for future interactions
                            currentPage = newPage;
                            
                            // Get updated commands (in case server-specific commands need to be filtered)
                            let updatedCommands = [...allCommands]; // Start with all commands
                            
                            // Get the commands for the new page
                            const newPageCommands = updatedCommands.slice(
                                (newPage - 1) * commandsPerPage, 
                                Math.min(newPage * commandsPerPage, totalCommands)
                            );
                            
                            // Create the new embed
                            const newEmbed = new EmbedBuilder()
                                .setColor(config.colors.Gold)
                                .setTitle("Available Commands")
                                .setDescription(`Here are commands you can use (Page ${newPage}/${totalPages}):`)
                                .addFields(...newPageCommands)
                                .setTimestamp()
                                .setFooter({
                                    text: `Page ${newPage}/${totalPages} • Use buttons below to navigate • Version: ${config.version}`,
                                    iconURL: message.author.displayAvatarURL({
                                        dynamic: true,
                                    }),
                                });
                            
                            // Create new buttons with updated disabled states
                            const newButtons = [];
                            
                            const newPrevButton = new ButtonBuilder()
                                .setCustomId('command_prev_page')
                                .setLabel('⬅️ Previous')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(newPage === 1);
                            
                            const newNextButton = new ButtonBuilder()
                                .setCustomId('command_next_page')
                                .setLabel('Next ➡️')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(newPage === totalPages);
                            
                            newButtons.push(newPrevButton, newNextButton);
                            const newRow = new ActionRowBuilder().addComponents(newButtons);
                            
                            // Update the message
                            await interaction.update({ 
                                embeds: [newEmbed], 
                                components: [newRow]
                            });
                        });
                        
                        collector.on('end', () => {
                            // Remove buttons when collector expires
                            reply.edit({ components: [] }).catch(console.error);
                        });
                    }
                    
                    break;
                
}
