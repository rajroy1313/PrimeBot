const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('broadcast')
        .setDescription('Send an announcement to all servers (Developer only)')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The message to broadcast to all servers')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),
    
    async execute(interaction) {
        try {
            // Check if user is a developer
            if (!config.developerIds.includes(interaction.user.id)) {
                return interaction.reply({
                    content: "You do not have permission to use this command.",
                    ephemeral: true
                });
            }
            
            // Get the broadcast message
            const broadcastMessage = interaction.options.getString('message');
            
            // Debug logging
            console.log(`[DEBUG] Broadcast command triggered by ${interaction.user.tag} with message: ${broadcastMessage}`);
            
            // Create the broadcast embed
            const broadcastEmbed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle("📣 Announcement from Developers")
                .setDescription(broadcastMessage)
                .setTimestamp()
                .setFooter({ 
                    text: `Version: ${config.version}`,
                    iconURL: interaction.client.user.displayAvatarURL()
                });
            
            // Send confirmation
            await interaction.reply({
                content: "📣 Broadcasting message to all servers...",
                ephemeral: true
            });
            
            // Track statistics
            let successCount = 0;
            let failCount = 0;
            let totalGuilds = interaction.client.guilds.cache.size;
            
            // Broadcast to all guilds
            console.log(`[DEBUG] Starting broadcast to ${totalGuilds} guilds`);
            
            for (const guild of interaction.client.guilds.cache.values()) {
                try {
                    console.log(`[DEBUG] Processing guild: ${guild.name} (${guild.id})`);
                    
                    // Find the first available text channel
                    const channel = guild.channels.cache
                        .filter(ch => ch.type === 0) // 0 is GuildText channel type
                        .sort((a, b) => a.position - b.position)
                        .first();
                    
                    if (!channel) {
                        console.log(`[DEBUG] No suitable text channel found in guild: ${guild.name}`);
                        failCount++;
                        continue;
                    }
                    
                    console.log(`[DEBUG] Selected channel: ${channel.name} (${channel.id})`);
                    
                    // Check bot permissions
                    const hasPermission = channel.permissionsFor(guild.members.me).has("SendMessages");
                    console.log(`[DEBUG] Bot has SendMessages permission: ${hasPermission}`);
                    
                    if (hasPermission) {
                        await channel.send({ embeds: [broadcastEmbed] });
                        console.log(`[DEBUG] Successfully sent broadcast to guild: ${guild.name}`);
                        successCount++;
                    } else {
                        console.log(`[DEBUG] Missing permissions to send in channel: ${channel.name}`);
                        failCount++;
                    }
                } catch (error) {
                    console.error(`Error broadcasting to guild ${guild.name}:`, error);
                    failCount++;
                }
            }
            
            // Update the original reply with the results
            const resultEmbed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle("📣 Broadcast Results")
                .setDescription(`Message has been broadcast to servers.`)
                .addFields(
                    { name: "✅ Success", value: `${successCount} servers`, inline: true },
                    { name: "❌ Failed", value: `${failCount} servers`, inline: true },
                    { name: "📊 Total", value: `${totalGuilds} servers`, inline: true }
                )
                .setTimestamp();
                
            await interaction.followUp({
                embeds: [resultEmbed],
                ephemeral: true
            });
            
        } catch (error) {
            console.error('Error executing broadcast command:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: 'There was an error executing the broadcast command.',
                    ephemeral: true
                });
            } else {
                await interaction.followUp({
                    content: 'There was an error completing the broadcast.',
                    ephemeral: true
                });
            }
        }
    },
};