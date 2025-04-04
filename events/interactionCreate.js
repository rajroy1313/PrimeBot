module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        try {
            // We no longer handle slash commands, only button interactions
            
            // Handle giveaway reactions
            if (interaction.isButton() && interaction.customId === 'giveaway-enter') {
                await client.giveawayManager.handleGiveawayEntry(interaction);
            }
        } catch (error) {
            console.error('Error in interactionCreate event:', error);
        }
    },
};
