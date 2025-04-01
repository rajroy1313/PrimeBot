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
                    console.error(`Error executing command ${interaction.commandName}:`, error);
                    
                    // If the interaction hasn't been replied to yet, send an error message
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ 
                            content: 'There was an error executing this command!', 
                            ephemeral: true 
                        });
                    } else {
                        await interaction.reply({ 
                            content: 'There was an error executing this command!', 
                            ephemeral: true 
                        });
                    }
                }
            }
            
            // Handle giveaway reactions
            if (interaction.isButton() && interaction.customId === 'giveaway-enter') {
                await client.giveawayManager.handleGiveawayEntry(interaction);
            }
        } catch (error) {
            console.error('Error in interactionCreate event:', error);
        }
    },
};
