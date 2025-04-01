const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'guildMemberAdd',
    execute(member, client) {
        try {
            // Get the first text channel we can send messages to (often a welcome channel)
            const channel = member.guild.channels.cache.find(
                ch => ch.type === 0 && ch.permissionsFor(member.guild.members.me).has('SendMessages')
            );
            
            if (!channel) return;
            
            // Create welcome embed
            const welcomeEmbed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle(`Welcome to ${member.guild.name}!`)
                .setDescription(config.welcomeMessage.replace('{member}', member))
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `Member #${member.guild.memberCount}` })
                .setTimestamp();
            
            // Send welcome message
            channel.send({ 
                content: `Welcome, ${member}!`, 
                embeds: [welcomeEmbed] 
            }).catch(error => {
                console.error(`Could not send welcome message in guild ${member.guild.name}:`, error);
            });
            
        } catch (error) {
            console.error('Error in guildMemberAdd event:', error);
        }
    },
};
