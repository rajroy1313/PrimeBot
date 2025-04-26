const { safeReply, safeExecute } = require('../utils/stabilityUtils');
const interactionDebugger = require('../utils/interactionDebugger');

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
            
            // Handle slash commands
            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);
                
                if (!command) {
                    console.warn(`Command not found: ${interaction.commandName}`);
                    interactionDebugger.logInteraction(interaction, 'Command Not Found');
                    return safeReply(interaction, { 
                        content: 'This command is not currently available.',
                        ephemeral: false
                    });
                }
                
                // Log command usage
                console.log(`[COMMAND] ${interaction.user.tag} used /${interaction.commandName} in ${interaction.guild ? interaction.guild.name : 'DM'}`);
                
                // Execute command with safe execution
                try {
                    await safeExecute(
                        command.execute.bind(command), 
                        [interaction],
                        null,
                        `Command "${interaction.commandName}"`
                    );
                } catch (cmdError) {
                    interactionDebugger.debugInteractionError(interaction, cmdError, `Command "${interaction.commandName}"`);
                    throw cmdError; // Re-throw to be caught by the outer try/catch
                }
                
                return;
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
                    } else if (action === 'ticket_create') {
                        await safeExecute(
                            client.ticketManager.handleTicketCreation.bind(client.ticketManager),
                            [interaction],
                            null,
                            'Ticket creation button'
                        );
                    } else if (action === 'ticket_close') {
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
                        if (!interaction.replied) {
                            await interaction.deferUpdate().catch(console.error);
                        }
                    } else if (action === 'command_prev_page' || action === 'command_next_page') {
                        // These are handled elsewhere, just acknowledge the interaction
                        if (!interaction.replied) {
                            await interaction.deferUpdate().catch(console.error);
                        }
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
            
            // Handle select menus, modals, etc.
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