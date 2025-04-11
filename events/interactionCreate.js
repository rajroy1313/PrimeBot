module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        try {
            // We no longer handle slash commands, only button interactions
            
            // Handle button interactions
            if (interaction.isButton()) {
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
            }
        } catch (error) {
            console.error('Error in interactionCreate event:', error);
        }
    },
};
