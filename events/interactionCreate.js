const { safeReply, safeExecute } = require('../utils/stabilityUtils');
const interactionDebugger = require('../utils/interactionDebugger');
const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'interactionCreate',
    
    async execute(interaction, client) {
        try {
            // Initialize interaction debugger on first run
            if (!interactionDebugger.client) {
                interactionDebugger.init(client);
            }
            // Log interaction for debugging
            interactionDebugger.logInteraction(interaction, 'Incoming Interaction');
            
            // Slash commands have been disabled
            if (interaction.isChatInputCommand()) {
                console.log(`[COMMAND] Ignoring slash command /${interaction.commandName} from ${interaction.user.tag} (slash commands disabled)`);
                interactionDebugger.logInteraction(interaction, 'Slash Commands Disabled');
                
                return safeReply(interaction, { 
                    content: 'Slash commands have been disabled for this bot.',
                    ephemeral: true
                });
            }
            
            // Handle buttons
            if (interaction.isButton()) {
                // Extract the custom ID parts
                const [action, ...params] = interaction.customId.split(':');
                
                // Log button interaction
                interactionDebugger.logInteraction(interaction, `Button (${action})`);
                
                try {
                    // Route to the appropriate handler based on the action
                    if (action === 'giveaway_enter') {
                        await safeExecute(
                            client.giveawayManager.handleGiveawayEntry.bind(client.giveawayManager),
                            [interaction],
                            null,
                            'Giveaway entry button'
                        );
                    } else if (action === 'create-ticket' || interaction.customId === 'create-ticket') {
                        await safeExecute(
                            client.ticketManager.handleTicketCreation.bind(client.ticketManager),
                            [interaction],
                            null,
                            'Ticket creation button'
                        );
                    } else if (action === 'close-ticket' || interaction.customId === 'close-ticket') {
                        await safeExecute(
                            client.ticketManager.handleTicketClose.bind(client.ticketManager),
                            [interaction],
                            null,
                            'Ticket close button'
                        );
                    } else if (action === 'tictactoe') {
                        const position = params[0];
                        if (position) {
                            await safeExecute(
                                client.ticTacToeManager.makeMove.bind(client.ticTacToeManager),
                                [{ channelId: interaction.channelId, playerId: interaction.user.id, position }],
                                null,
                                'TicTacToe move button'
                            );
                        }
                    } else if (interaction.customId === 'truth_button') {
                        await safeExecute(
                            client.truthDareManager.handleButtonInteraction.bind(client.truthDareManager),
                            [interaction, 'truth'],
                            null,
                            'Truth button'
                        );
                    } else if (interaction.customId === 'dare_button') {
                        await safeExecute(
                            client.truthDareManager.handleButtonInteraction.bind(client.truthDareManager),
                            [interaction, 'dare'],
                            null,
                            'Dare button'
                        );
                    } else if (interaction.customId === 'add_question') {
                        await safeExecute(
                            client.truthDareManager.handleAddQuestion.bind(client.truthDareManager),
                            [interaction],
                            null,
                            'Add question button'
                        );
                    } else if (action === 'emoji_prev_page' || action === 'emoji_next_page') {
                        // These are handled elsewhere, just acknowledge the interaction
                        try {
                            if (!interaction.replied && !interaction.deferred) {
                                await interaction.deferUpdate();
                            }
                        } catch (error) {
                            console.error('Error acknowledging emoji pagination interaction:', error);
                            // Don't throw here to prevent the entire interaction from failing
                        }
                    } else if (action === 'command_prev_page' || action === 'command_next_page') {
                        // These are handled elsewhere, just acknowledge the interaction
                        try {
                            if (!interaction.replied && !interaction.deferred) {
                                await interaction.deferUpdate();
                            }
                        } catch (error) {
                            console.error('Error acknowledging command pagination interaction:', error);
                            // Don't throw here to prevent the entire interaction from failing
                        }
                    } else if (interaction.customId === 'broadcast_confirm') {
                        console.log('[BROADCAST] Broadcast confirmation button clicked');
                        // Handle broadcast confirmation - this now directly processes the broadcast
                        // Get the broadcast embed from the original message
                        const originalMessage = interaction.message;
                        const broadcastEmbed = originalMessage.embeds.length > 1 ? originalMessage.embeds[1] : null;
                        
                        if (!broadcastEmbed) {
                            await interaction.update({
                                content: 'Error: Could not find broadcast embed. Broadcast cancelled.',
                                embeds: [],
                                components: []
                            });
                            return;
                        }
                        
                        // Update the message to show that broadcasting has started
                        await interaction.update({
                            content: '📣 Broadcasting message to all servers...',
                            embeds: [broadcastEmbed],
                            components: []
                        });
                        
                        // Track statistics
                        let successCount = 0;
                        let failCount = 0;
                        let totalGuilds = client.guilds.cache.size;
                        
                        // Broadcast to all guilds
                        console.log(`[BROADCAST] Starting broadcast to ${totalGuilds} guilds`);
                        
                        // Helper function for progress bar
                        function createProgressBar(percentage) {
                            const barLength = 20;
                            const filledLength = Math.round((percentage / 100) * barLength);
                            const emptyLength = barLength - filledLength;
                            
                            const filled = '█'.repeat(filledLength);
                            const empty = '░'.repeat(emptyLength);
                            
                            return `[${filled}${empty}]`;
                        }
                        
                        // Process each guild
                        let processedCount = 0;
                        const startTime = Date.now();
                        
                        for (const guild of client.guilds.cache.values()) {
                            try {
                                console.log(`[BROADCAST] Processing guild: ${guild.name} (${guild.id})`);
                                processedCount++;
                                
                                // Find the first available text channel
                                const channel = guild.channels.cache
                                    .filter(ch => ch.type === 0) // 0 is GuildText channel type
                                    .sort((a, b) => a.position - b.position)
                                    .first();
                                
                                if (!channel) {
                                    console.log(`[BROADCAST] No suitable text channel found in guild: ${guild.name}`);
                                    failCount++;
                                    continue;
                                }
                                
                                console.log(`[BROADCAST] Selected channel: ${channel.name} (${channel.id})`);
                                
                                // Check bot permissions
                                const hasPermission = channel.permissionsFor(guild.members.me).has("SendMessages");
                                console.log(`[BROADCAST] Bot has SendMessages permission: ${hasPermission}`);
                                
                                if (hasPermission) {
                                    await channel.send({ embeds: [broadcastEmbed] });
                                    console.log(`[BROADCAST] Successfully sent broadcast to guild: ${guild.name}`);
                                    successCount++;
                                } else {
                                    console.log(`[BROADCAST] Missing permissions to send in channel: ${channel.name}`);
                                    failCount++;
                                }
                                
                                // Update progress every 5 guilds or when done
                                if (processedCount % 5 === 0 || processedCount === totalGuilds) {
                                    try {
                                        // Calculate progress percentage and display
                                        const progressPercent = Math.round((processedCount / totalGuilds) * 100);
                                        const progressBar = createProgressBar(progressPercent);
                                        const elapsedTime = Math.round((Date.now() - startTime) / 1000);
                                        
                                        await interaction.editReply({
                                            content: `📣 Broadcasting message to all servers...\n${progressBar} ${progressPercent}% Complete\n\nProgress: ${processedCount}/${totalGuilds} servers\n✅ Success: ${successCount} | ❌ Failed: ${failCount}\n⏱️ Time elapsed: ${elapsedTime}s`,
                                            embeds: [broadcastEmbed],
                                            components: []
                                        });
                                    } catch (e) {
                                        console.error('[BROADCAST] Failed to update progress:', e);
                                    }
                                }
                                
                            } catch (error) {
                                console.error(`[BROADCAST] Error broadcasting to guild ${guild.name}:`, error);
                                failCount++;
                            }
                        }
                        
                        // Calculate completion metrics
                        const completionTime = Math.round((Date.now() - startTime) / 1000);
                        const successRate = totalGuilds > 0 ? Math.round((successCount / totalGuilds) * 100) : 0;
                        
                        // Update with final results - modern design
                        const resultEmbed = new EmbedBuilder()
                            .setColor(config.colors.success)
                            .setTitle("📣 Broadcast Complete")
                            .setDescription(`Your announcement has been broadcast to ${successCount} out of ${totalGuilds} servers.`)
                            .addFields(
                                { name: "✅ Success", value: `${successCount} servers`, inline: true },
                                { name: "❌ Failed", value: `${failCount} servers`, inline: true },
                                { name: "📊 Success Rate", value: `${successRate}%`, inline: true },
                                { name: "⏰ Time Taken", value: `${completionTime} seconds`, inline: true },
                                { name: "💬 Potential Reach", value: `Message potentially reached all members across ${successCount} servers`, inline: false }
                            )
                            .setTimestamp()
                            .setFooter({ text: `Broadcast ID: ${Date.now().toString(36)}` });
                            
                        await interaction.editReply({
                            content: "✅ Broadcast successfully completed!",
                            embeds: [resultEmbed, broadcastEmbed],
                            components: []
                        });
                    } else if (interaction.customId === 'broadcast_cancel') {
                        // Handle cancellation with a more descriptive response
                        console.log('[BROADCAST] Broadcast cancelled by user');
                        
                        const cancelEmbed = new EmbedBuilder()
                            .setColor(config.colors.danger)
                            .setTitle('📣 Broadcast Cancelled')
                            .setDescription('Your broadcast has been cancelled. No messages were sent to any servers.')
                            .setFooter({ text: `Cancelled by ${interaction.user.tag}` })
                            .setTimestamp();
                            
                        await interaction.update({
                            content: '✅ Broadcast has been cancelled.',
                            embeds: [cancelEmbed],
                            components: []
                        });
                    } else {
                        // Unknown button action
                        console.warn(`Unknown button action: ${action}`);
                        interactionDebugger.logInteraction(interaction, `Unknown Button Action (${action})`);
                        
                        if (!interaction.replied) {
                            await interaction.reply({
                                content: 'This button is not currently functional.',
                                ephemeral: true
                            }).catch(console.error);
                        }
                    }
                } catch (buttonError) {
                    interactionDebugger.debugInteractionError(interaction, buttonError, `Button (${action})`);
                    throw buttonError; // Re-throw to be caught by the outer try/catch
                }
                
                return;
            }
            
            // Handle modal submissions
            if (interaction.isModalSubmit()) {
                // Route to appropriate handler based on customId
                if (interaction.customId === 'add_question_modal') {
                    await safeExecute(
                        client.truthDareManager.handleModalSubmission.bind(client.truthDareManager),
                        [interaction],
                        null,
                        'Truth or Dare modal submission'
                    );
                }
                return;
            }
            
            // Handle select menus and other interaction types
            // Add more handlers as needed
            
        } catch (error) {
            console.error('Error in interactionCreate event:', error);
            
            // Try to respond to the user if possible
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: 'There was an error executing this interaction! Please try again later.',
                        ephemeral: false
                    });
                }
            } catch (replyError) {
                console.error('Failed to send error response:', replyError);
            }
        }
    }
};