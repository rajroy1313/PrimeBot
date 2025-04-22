const { SlashCommandBuilder, EmbedBuilder , PermissionFlagsBits} = require('discord.js');
const ms = require('ms');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Create a timed poll with options')
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
        .addStringOption(option => 
            option.setName('duration')
                .setDescription('Duration of the poll (e.g., 1h, 1d)')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('question')
                .setDescription('The question for the poll')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('options')
                .setDescription('Poll options separated by | (e.g., option1|option2|option3)')
                .setRequired(true)),
    
    async execute(interaction) {
        try {
            // Parse command options
            const durationStr = interaction.options.getString('duration');
            const question = interaction.options.getString('question');
            const optionsStr = interaction.options.getString('options');
            
            // Split options
            const options = optionsStr.split('|').map(option => option.trim()).filter(option => option);
            
            // Validate options
            if (options.length < 2) {
                return interaction.reply({
                    content: 'You need to provide at least 2 options for the poll.',
                    ephemeral: true
                });
            }
            
            if (options.length > 10) {
                return interaction.reply({
                    content: 'You can provide a maximum of 10 options for the poll.',
                    ephemeral: true
                });
            }
            
            // Parse duration
            const duration = ms(durationStr);
            
            if (!duration || isNaN(duration)) {
                return interaction.reply({
                    content: 'Please provide a valid duration (e.g., 1h, 1d).',
                    ephemeral: true
                });
            }
            
            // Minimum duration of 10 seconds
            if (duration < 10000) {
                return interaction.reply({
                    content: 'Poll duration must be at least 10 seconds.',
                    ephemeral: true
                });
            }
            
            // Create the poll
            const pollMessage = await interaction.client.pollManager.createPoll({
                channelId: interaction.channel.id,
                question,
                options,
                duration,
                userId: interaction.user.id
            });
            
            // Confirm to the user
            const confirmEmbed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('Poll Created')
                .setDescription(`Your poll has been created in ${interaction.channel}!`)
                .addFields(
                    { name: 'Question', value: question },
                    { name: 'Duration', value: durationStr },
                    { name: 'Options', value: options.map((opt, i) => `${i+1}. ${opt}`).join('\n') }
                );
            
            await interaction.reply({
                embeds: [confirmEmbed],
                ephemeral: true
            });
            
        } catch (error) {
            console.error('Error creating poll:', error);
            await interaction.reply({
                content: 'There was an error creating the poll! Please try again later.',
                ephemeral: true
            });
        }
    },
};