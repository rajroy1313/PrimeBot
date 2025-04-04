const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('echo')
        .setDescription('Make the bot repeat a message')
        .addStringOption(option => 
            option.setName('message')
                .setDescription('The message to repeat')
                .setRequired(true))
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel to echo in (defaults to current channel)')
                .setRequired(false))
        .addBooleanOption(option => 
            option.setName('embed')
                .setDescription('Whether to send the message as an embed (defaults to false)')
                .setRequired(false)),
    
    async execute(interaction) {
        try {
            // Get command options
            const message = interaction.options.getString('message');
            const channel = interaction.options.getChannel('channel') || interaction.channel;
            const useEmbed = interaction.options.getBoolean('embed') || false;
            
            // Check if the bot can send messages in the target channel
            if (!channel.permissionsFor(interaction.client.user).has('SendMessages')) {
                return interaction.reply({ 
                    content: `I don't have permission to send messages in ${channel}.`, 
                    ephemeral: true 
                });
            }
            
            // Send the echo message
            if (useEmbed) {
                // Create embed
                const echoEmbed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setDescription(message)
                    .setFooter({ 
                        text: `Echoed by ${interaction.user.tag}`, 
                        iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
                    })
                    .setTimestamp();
                
                await channel.send({ embeds: [echoEmbed] });
            } else {
                await channel.send(message);
            }
            
            // Confirm to the user
            await interaction.reply({ 
                content: `Message has been echoed in ${channel}.`, 
                ephemeral: true 
            });
            
        } catch (error) {
            console.error('Error executing echo command:', error);
            await interaction.reply({ 
                content: 'There was an error executing the command! Please try again later.', 
                ephemeral: true 
            });
        }
    },
};