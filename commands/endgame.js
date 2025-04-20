const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('endgame')
        .setDescription('End the current tic-tac-toe game'),
    
    async execute(interaction) {
        try {
            // Check if there is an active game
            const game = interaction.client.ticTacToeManager.getGame(interaction.channel.id);
            
            if (!game) {
                return interaction.reply({
                    content: 'There is no active game in this channel.',
                    ephemeral: true
                });
            }
            
            // Only allow the game creator or moderators to end the game
            if (game.playerId !== interaction.user.id && 
                !interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return interaction.reply({
                    content: 'Only the game creator or moderators can end the game.',
                    ephemeral: true
                });
            }
            
            // End the game
            const success = await interaction.client.ticTacToeManager.endGame(interaction.channel.id);
            
            if (success) {
                await interaction.reply(`${interaction.user} has ended the Tic-Tac-Toe game.`);
            } else {
                await interaction.reply({
                    content: 'Failed to end the game. Please try again.',
                    ephemeral: true
                });
            }
            
        } catch (error) {
            console.error('Error ending TicTacToe game:', error);
            await interaction.reply({
                content: 'There was an error ending the game! Please try again later.',
                ephemeral: true
            });
        }
    },
};