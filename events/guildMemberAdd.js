const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        try {
            // Skip if welcome messages are disabled
            if (!config.welcome.enabled) return;
            
            // Find welcome channel prioritizing:
            // 1. Channel named exactly as configured (e.g., 'welcome')
            // 2. Channel with 'welcome' in the name
            // 3. First available text channel with send permissions
            
            let welcomeChannel = member.guild.channels.cache.find(
                ch => ch.name === config.welcome.channelName && 
                      ch.type === 0 && 
                      ch.permissionsFor(member.guild.members.me).has('SendMessages')
            );
            
            if (!welcomeChannel) {
                welcomeChannel = member.guild.channels.cache.find(
                    ch => ch.name.includes('welcome') && 
                          ch.type === 0 && 
                          ch.permissionsFor(member.guild.members.me).has('SendMessages')
                );
            }
            
            if (!welcomeChannel) {
                welcomeChannel = member.guild.channels.cache.find(
                    ch => ch.type === 0 && 
                          ch.permissionsFor(member.guild.members.me).has('SendMessages')
                );
            }
            
            if (!welcomeChannel) return;
            
            // Format the welcome message
            const formattedMessage = config.welcome.message
                .replace('{member}', member)
                .replace('{server}', member.guild.name)
                .replace('{memberCount}', member.guild.memberCount);
                
            const formattedDescription = config.welcome.description
                .replace('{member}', member)
                .replace('{server}', member.guild.name)
                .replace('{memberCount}', member.guild.memberCount);
            
            // Get information about the member
            const joinedAt = `<t:${Math.floor(member.joinedTimestamp / 1000)}:F> (<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)`;
            const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F> (<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>)`;
            
            // Create welcome embed
            const welcomeEmbed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle(`Welcome to ${member.guild.name}!`)
                .setDescription(formattedMessage)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: '📝 About', value: formattedDescription },
                    { name: '📆 Account Created', value: accountCreated, inline: false },
                    { name: '🎉 Joined Server', value: joinedAt, inline: false },
                    { name: '👥 Member Count', value: `You are the ${member.guild.memberCount}${getMemberSuffix(member.guild.memberCount)} member!`, inline: false }
                )
                .setFooter({ text: `ID: ${member.id}` })
                .setTimestamp();
                
            // Add banner image if enabled
            if (config.welcome.showImage) {
                welcomeEmbed.setImage(config.welcome.banner);
            }
            
            // Send welcome message
            await welcomeChannel.send({ 
                content: config.welcome.mentions ? `Welcome, ${member}!` : null, 
                embeds: [welcomeEmbed] 
            });
            
            console.log(`Sent welcome message for ${member.user.tag} in ${member.guild.name}`);
            
        } catch (error) {
            console.error('Error in guildMemberAdd event:', error);
        }
    },
};

/**
 * Get the appropriate suffix for member count (1st, 2nd, 3rd, etc.)
 * @param {number} num - The number to get a suffix for
 * @returns {string} The appropriate suffix
 */
function getMemberSuffix(num) {
    if (num % 100 >= 11 && num % 100 <= 13) {
        return 'th';
    }
    
    switch (num % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}
