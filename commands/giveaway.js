const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Create a new giveaway')
        .addStringOption(option => 
            option.setName('duration')
                .setDescription('Duration of the giveaway (1m, 1h, 1d, etc.)')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('winners')
                .setDescription('Number of winners')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(10))
        .addStringOption(option => 
            option.setName('prize')
                .setDescription('The prize for the giveaway')
                .setRequired(true))
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel to start the giveaway in')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        try {
            // Check if user has permission
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.reply({ 
                    content: 'You need the Manage Server permission to create giveaways!', 
                    ephemeral: true 
                });
            }

            // Parse command options
            const duration = interaction.options.getString('duration');
            const winnerCount = interaction.options.getInteger('winners');
            const prize = interaction.options.getString('prize');
            const channel = interaction.options.getChannel('channel') || interaction.channel;

            // Convert duration to milliseconds
            const ms_duration = ms(duration);
            
            if (!ms_duration) {
                return interaction.reply({ 
                    content: 'Please provide a valid duration format (e.g., 1m, 1h, 1d)!', 
                    ephemeral: true 
                });
            }

            // Create giveaway
            const giveaway = await interaction.client.giveawayManager.startGiveaway({
                channelId: channel.id,
                duration: ms_duration,
                prize,
                winnerCount
            });

            await interaction.reply({ 
                content: `Giveaway created successfully in ${channel}!`, 
                ephemeral: true 
            });
            
        } catch (error) {
            console.error('Error creating giveaway:', error);
            await interaction.reply({ 
                content: 'There was an error creating the giveaway! Please try again later.', 
                ephemeral: true 
            });
        }
    },
};
