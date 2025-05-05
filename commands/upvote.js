const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('upvote')
        .setDescription('Upvote a user to show appreciation and help them level up')
        .setDefaultMemberPermissions('0')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to upvote')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('Reason for the upvote (optional)')
                .setRequired(false)),
    
    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason');
            
            // Prevent upvoting bots
            if (targetUser.bot) {
                return interaction.reply({
                    content: 'You cannot upvote bots.',
                    ephemeral: false
                });
            }
            
            // Handle the upvote
            const result = await interaction.client.levelingManager.handleUpvote({
                guildId: interaction.guild.id,
                userId: targetUser.id,
                voterId: interaction.user.id,
                reason
            });
            
            if (result.success) {
                // Get upvote stats
                const stats = interaction.client.levelingManager.getUpvoteStats(
                    interaction.guild.id,
                    targetUser.id
                );
                
                // Create embed for successful upvote
                const embed = new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setTitle('Upvote Recorded! 👍')
                    .setDescription(`<@${interaction.user.id}> upvoted <@${targetUser.id}>!`)
                    .addFields(
                        { 
                            name: '🌟 XP Awarded', 
                            value: `+${result.xpAwarded} XP`, 
                            inline: true 
                        },
                        { 
                            name: '📊 Total Upvotes', 
                            value: `${stats.total}`, 
                            inline: true 
                        },
                        { 
                            name: '📈 Recent Upvotes', 
                            value: `${stats.recent} (30 days)`, 
                            inline: true 
                        }
                    )
                    .setFooter({ 
                        text: `Each upvote helps users level up faster!`,
                        iconURL: interaction.client.user.displayAvatarURL()
                    })
                    .setTimestamp();
                
                // Add reason if provided
                if (reason) {
                    embed.addFields({
                        name: '💬 Reason',
                        value: reason
                    });
                }
                
                // Add level up info if the user leveled up
                if (result.leveledUp) {
                    embed.addFields({
                        name: '🎉 Level Up!',
                        value: `<@${targetUser.id}> has reached Level ${result.newLevel}!`
                    });
                }
                
                await interaction.reply({ embeds: [embed] });
            } else {
                // Upvote failed
                const embed = new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle('Upvote Failed')
                    .setDescription(result.message);
                
                // Add cooldown info if applicable
                if (result.cooldownRemaining) {
                    embed.addFields({
                        name: '⏳ Cooldown',
                        value: `You can upvote this user again in ${result.cooldownRemaining} hour(s).`
                    });
                }
                
                await interaction.reply({ 
                    embeds: [embed],
                    ephemeral: false
                });
            }
        } catch (error) {
            console.error('Error executing upvote command:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'There was an error processing your upvote! Please try again later.',
                    ephemeral: false
                });
            }
        }
    },
};