module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        try {
            // We no longer handle slash commands, only button interactions
            
            // Handle giveaway reactions
            if (interaction.isButton()) {
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
                
                // Handle Truth or Dare buttons
                else if (interaction.customId === 'truth_button' || 
                        interaction.customId === 'dare_button' || 
                        interaction.customId === 'add_question') {
                    await client.truthDareManager.handleButtonInteraction(interaction);
                }
            }
            
            // Handle Truth or Dare modal submissions
            else if (interaction.isModalSubmit()) {
                if (interaction.customId === 'add_question_modal') {
                    await client.truthDareManager.handleModalSubmission(interaction);
                }
            }
        } catch (error) {
            console.error('Error in interactionCreate event:', error);
        }
    },
};
