const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows a list of all available commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
    
    async execute(interaction) {
        try {
            const commandsEmbed = new EmbedBuilder()
                .setColor(config.colors.Gold)
                .setTitle("Available Commands")
                .setDescription("Here are all the commands you can use:")
                .addFields(
                    {
                        name: `/help`,
                        value: "Shows this list of commands",
                    },
                    {
                        name: `/giveaway`,
                        value: "Creates a new giveaway",
                    },
                    {
                        name: `/end`,
                        value: "Ends a giveaway early",
                    },
                    {
                        name: `/reroll`,
                        value: "Rerolls winners for a giveaway",
                    },
                    {
                        name: `/echo`,
                        value: "Makes the bot repeat a message",
                    },
                    {
                        name: `/ticket`,
                        value: "Creates a ticket panel",
                    },
                    {
                        name: `/createticket`,
                        value: "Creates a ticket with a custom name",
                    },
                    {
                        name: `/tickethistory`,
                        value: "Shows ticket history",
                    },
                    {
                        name: `/about`,
                        value: "Shows information about the bot",
                    },
                    {
                        name: `/updates`,
                        value: "Shows updates and upcoming features",
                    },
                    {
                        name: `/tictactoe`,
                        value: "Starts a new TicTacToe game in the channel",
                    },
                    {
                        name: `/move`,
                        value: "Makes a move in an active TicTacToe game",
                    },
                    {
                        name: `/endgame`,
                        value: "Ends the current TicTacToe game in the channel",
                    },
                    {
                        name: `/poll`,
                        value: "Creates a poll with a timer",
                    },
                    {
                        name: `/endpoll`,
                        value: "Ends a poll early",
                    },
                    {
                        name: `/birthday`,
                        value: "Manage birthdays in the server",
                    },
                    {
                        name: `/counting`,
                        value: "Start, check, or end a counting game",
                    },
                    {
                        name: `/truthdare`,
                        value: "Start a Truth or Dare game",
                    },
                    {
                        name: `/addquestion`,
                        value: "Add a Truth or Dare question",
                    }
                )
                .setFooter({
                    text: `${interaction.client.user.username} v1.1.0`,
                    iconURL: interaction.client.user.displayAvatarURL()
                })
                .setTimestamp();
            
            await interaction.reply({ embeds: [commandsEmbed] });
            
        } catch (error) {
            console.error('Error executing help command:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'There was an error executing the command! Please try again later.',
                    ephemeral: true
                });
            }
        }
    },
};