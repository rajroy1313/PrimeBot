const { Collection } = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        try {
            // Handle slash commands
            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);
                
                if (!command) {
                    console.error(`No command matching ${interaction.commandName} was found.`);
                    return;
                }
                
                try {
                    await command.execute(interaction);
                } catch (error) {
                    console.error(`Error executing ${interaction.commandName}:`, error);
                    
                    // Handle error responses to users
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ 
                            content: 'There was an error while executing this command!', 
                            ephemeral: true 
                        });
                    } else {
                        await interaction.reply({ 
                            content: 'There was an error while executing this command!', 
                            ephemeral: true 
                        });
                    }
                }
            }
            // Handle button interactions
            else if (interaction.isButton()) {
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
