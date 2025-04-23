const { safeReply, safeExecute } = require('../utils/stabilityUtils');

module.exports = {
    name: 'interactionCreate',
    
    async execute(interaction, client) {
        try {
            // Handle slash commands
            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);
                
                if (!command) {
                    console.warn(`Command not found: ${interaction.commandName}`);
                    return safeReply(interaction, { 
                        content: 'This command is not currently available.',
                        ephemeral: false
                    });
                }
                
                // Log command usage
                console.log(`[COMMAND] ${interaction.user.tag} used /${interaction.commandName} in ${interaction.guild ? interaction.guild.name : 'DM'}`);
                
                // Execute command with safe execution
                await safeExecute(
                    command.execute.bind(command), 
                    [interaction],
                    null,
                    `Command "${interaction.commandName}"`
                );
                
                return;
            }
            
            // Handle buttons
            if (interaction.isButton()) {
                // Extract the custom ID parts
                const [action, ...params] = interaction.customId.split(':');
                
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