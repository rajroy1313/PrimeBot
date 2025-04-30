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
            await handleServerWelcome(member);
            
            // DM WELCOME MESSAGE
            if (config.welcome.sendDM) {
                await handleDirectMessage(member);
            }
            
        } catch (error) {
            console.error('[WELCOME] Error in guildMemberAdd event:', error.message);
        }
    },
};

/**
 * Handle sending the welcome message in the server
 * @param {GuildMember} member - The member who joined
 */
async function handleServerWelcome(member) {
    try {
        // Get the welcome channel (either from config or find the first available channel)
        let welcomeChannel;

        if (config.welcome.channelId) {
            // Try to get the channel from config
            welcomeChannel = member.guild.channels.cache.get(config.welcome.channelId);
        }

        // If no channel found from config, fall back to finding an appropriate channel
        if (!welcomeChannel) {
            // First try to find a channel specifically for welcomes
            welcomeChannel = member.guild.channels.cache.find(
                ch => ch.type === 0 && 
                (ch.name.includes('welcome') || ch.name.includes('general')) && 
                ch.permissionsFor(member.guild.members.me).has('SendMessages')
            );
            
            // If still no channel, find any text channel with proper permissions
            if (!welcomeChannel) {
                welcomeChannel = member.guild.channels.cache.find(
                    ch => ch.type === 0 && ch.permissionsFor(member.guild.members.me).has('SendMessages')
                );
            }
        }
        
        // Only proceed if a channel was found and we have permissions
        if (welcomeChannel && welcomeChannel.permissionsFor(member.guild.members.me).has('SendMessages')) {
            console.log(`[WELCOME] Found welcome channel for ${member.user.tag} in ${member.guild.name}: ${welcomeChannel.name}`);
            
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
                console.error(`[WELCOME] Could not send welcome message in guild ${member.guild.name}:`, error.message);
            });
        } else {
            console.log(`[WELCOME] No suitable welcome channel found for ${member.user.tag} in ${member.guild.name}`);
        }
    } catch (error) {
        console.error(`[WELCOME] Error processing server welcome for ${member.user.tag}:`, error.message);
    }
}

/**
 * Handle sending a direct message to the new member
 * @param {GuildMember} member - The member who joined
 */
async function handleDirectMessage(member) {
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
            console.log(`[WELCOME] Could not send DM to ${member.user.tag}: ${error.message}`);
        });
    } catch (error) {
        console.error(`[WELCOME] Error sending welcome DM to ${member.user.tag}:`, error.message);
        // Silently fail if DM fails - the user might have DMs disabled
    }
}
