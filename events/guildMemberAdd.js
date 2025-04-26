const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        try {
            // Check if this is the support server
            if (config.welcome.supportServerId && member.guild.id !== config.welcome.supportServerId) {
                // Skip welcome messages for non-support servers
                return;
            }
            
            // SERVER WELCOME MESSAGE
            // Get the welcome channel (either from config or find the first available channel)
            let welcomeChannel;

            if (config.welcome.channelId) {
                // Try to get the channel from config
                welcomeChannel = member.guild.channels.cache.get(config.welcome.channelId);
            }

            // If no channel found from config, fall back to finding an appropriate channel
            if (!welcomeChannel) {
                welcomeChannel = member.guild.channels.cache.find(
                    ch => ch.type === 0 && ch.permissionsFor(member.guild.members.me).has('SendMessages')
                );
            }
            
            if (welcomeChannel) {
                // Create welcome embed for server
                const welcomeEmbed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle(`Welcome to ${member.guild.name}!`)
                    .setDescription(config.welcome.serverMessage.replace('{member}', member))
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                    .addFields(
                        { name: '📅 Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                        { name: '📥 Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                        { name: '👥 Member Count', value: `${member.guild.memberCount}`, inline: true }
                    )
                    .setFooter({ text: `User ID: ${member.user.id}` })
                    .setTimestamp();
                
                // Add banner image if defined in config
                if (config.welcome.bannerUrl) {
                    welcomeEmbed.setImage(config.welcome.bannerUrl);
                }
                
                // Send welcome message to channel
                await welcomeChannel.send({ 
                    content: `Welcome, ${member}! We hope you enjoy your stay in **${member.guild.name}**!`, 
                    embeds: [welcomeEmbed] 
                }).catch(error => {
                    console.error(`Could not send welcome message in guild ${member.guild.name}:`, error);
                });
            }
            
            // DM WELCOME MESSAGE
            if (config.welcome.sendDM) {
                try {
                    // Format the DM message
                    const dmMessage = config.welcome.dmMessage
                        .replace('{username}', member.user.username)
                        .replace('{server}', member.guild.name);
                    
                    // Create DM embed
                    const dmEmbed = new EmbedBuilder()
                        .setColor(config.colors.primary)
                        .setTitle(`Welcome to ${member.guild.name}!`)
                        .setDescription(dmMessage)
                        .setThumbnail(member.guild.iconURL({ dynamic: true }))
                        .setFooter({ text: 'We\'re happy to have you here!' })
                        .setTimestamp();
                    
                    // Send DM to the new member
                    await member.send({ embeds: [dmEmbed] }).catch(error => {
                        console.log(`Could not send DM to ${member.user.tag}: ${error.message}`);
                    });
                } catch (dmError) {
                    console.error(`Error sending welcome DM to ${member.user.tag}:`, dmError);
                    // Silently fail if DM fails - the user might have DMs disabled
                }
            }
            
        } catch (error) {
            console.error('Error in guildMemberAdd event:', error);
        }
    },
};
