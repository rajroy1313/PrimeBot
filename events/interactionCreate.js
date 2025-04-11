module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // We no longer handle slash commands, only button interactions
        
        // Handle button interactions
        if (interaction.isButton()) {
            try {
                // Handle giveaway entry button
                if (interaction.customId === 'giveaway-enter') {
                    await client.giveawayManager.handleGiveawayEntry(interaction);
                }
                
                // Handle ticket creation button
                else if (interaction.customId === 'create-ticket') {
                    await client.ticketManager.handleTicketCreation(interaction);
                }
                
                // Handle ticket close button
                else if (interaction.customId === 'close-ticket') {
                    await client.ticketManager.handleTicketClose(interaction);
                }
            } catch (error) {
                console.error('Error in interactionCreate event:', error);
                
                // Try to notify user of error if possible
                if (!interaction.replied && !interaction.deferred) {
                    try {
                        await interaction.reply({
                            content: 'There was an error processing your interaction. Please try again later.',
                            ephemeral: true
                        });
                    } catch (replyError) {
                        console.error('Error sending error notification:', replyError);
                    }
                }
            }
        }
    }
};