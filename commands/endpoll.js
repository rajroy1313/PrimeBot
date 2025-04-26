const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('endpoll')
        .setDescription('End a poll early')
		.setDefaultMemberPermissions('0')
        .addStringOption(option => 
            option.setName('message_id')
                .setDescription('The message ID of the poll to end')
                .setRequired(true))
        ,
    
    async execute(interaction) {
        try {
            // Check permissions
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return interaction.reply({ 
                    content: 'You need the Manage Messages permission to end polls early!', 
                    ephemeral: false 
                });
            }
            
            const messageId = interaction.options.getString('message_id');
            
            // End the poll
            const success = await interaction.client.pollManager.forceEndPoll(messageId);
            
            if (success) {
                await interaction.reply({ 
                    content: 'Poll ended successfully!', 
                    ephemeral: false 
                });
            } else {
                await interaction.reply({ 
                    content: 'Could not find an active poll with that message ID.', 
                    ephemeral: false 
                });
            }
        } catch (error) {
            console.error('Error ending poll:', error);
            await interaction.reply({ 
                content: 'There was an error ending the poll! Please try again later.', 
                ephemeral: false 
            });
        }
    },
};