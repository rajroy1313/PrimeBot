const { Collection } = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        try {
            // Handle slash commands
            if (interaction.isChatInputCommand()) {
                console.log(`Received slash command: ${interaction.commandName} from ${interaction.user.tag}`);
                const command = client.commands.get(interaction.commandName);
                
                if (!command) {
                    console.error(`No command matching ${interaction.commandName} was found.`);
                    return;
                }
                
                try {
                    console.log(`Executing command: ${interaction.commandName}`);
                    await command.execute(interaction);
                    console.log(`Command ${interaction.commandName} executed successfully`);
                } catch (error) {
                    console.error(`Error executing ${interaction.commandName}:`, error);
                    
                    // Handle error responses to users
                    try {
                        if (interaction.replied || interaction.deferred) {
                            await interaction.followUp({ 
                                content: 'There was an error while executing this command!', 
                                ephemeral: true 
                            }).catch(err => console.error('Could not send followUp:', err));
                        } else {
                            await interaction.reply({ 
                                content: 'There was an error while executing this command!', 
                                ephemeral: true 
                            }).catch(err => console.error('Could not send reply:', err));
                        }
                    } catch (responseError) {
                        console.error('Error sending error response:', responseError);
                    }
                }
            }
            // Handle button interactions
            else if (interaction.isButton()) {
                try {
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
                } catch (buttonError) {
                    console.error('Error handling button interaction:', buttonError);
                }
            }
            
            // Handle Truth or Dare modal submissions
            else if (interaction.isModalSubmit()) {
                try {
                    if (interaction.customId === 'add_question_modal') {
                        await client.truthDareManager.handleModalSubmission(interaction);
                    }
                } catch (modalError) {
                    console.error('Error handling modal submission:', modalError);
                }
            }
        } catch (error) {
            console.error('Error in interactionCreate event:', error);
        }
    },
};
