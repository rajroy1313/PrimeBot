const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tictactoe')
        .setDescription('Start a new tic-tac-toe game'),
    
    async execute(interaction) {
        try {
            // Check if a game is already active in this channel
            const existingGame = interaction.client.ticTacToeManager.getGame(interaction.channel.id);
            
            if (existingGame) {
                return interaction.reply({
                    content: 'There is already a game in progress in this channel. End it first with `/endgame`.',
                    ephemeral: true
                });
            }
            
            // Start a new game
            const game = await interaction.client.ticTacToeManager.startGame({
                channelId: interaction.channel.id,
                playerId: interaction.user.id
            });
            
            // Report to the user
            await interaction.reply(`${interaction.user} has started a new Tic-Tac-Toe game! Use \`/move\` to place your marker.`);
            
        } catch (error) {
            console.error('Error starting TicTacToe game:', error);
            await interaction.reply({
                content: 'There was an error starting the game! Please try again later.',
                ephemeral: true
            });
        }
    },
};