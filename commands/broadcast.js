const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('broadcast')
        .setDescription('Send an announcement to all servers (Developer only)')
		.setDefaultMemberPermissions('0')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The message to broadcast to all servers')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('title')
                .setDescription('The title for the announcement (optional)')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('preview')
                .setDescription('Preview the announcement before sending it')
                .setRequired(false))
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
            
            // Get command options
            const broadcastMessage = interaction.options.getString('message');
            const customTitle = interaction.options.getString('title') || "📣 Announcement from Developers";
            const preview = interaction.options.getBoolean('preview') || false;
            
            console.log(`[BROADCAST] Command triggered by ${interaction.user.tag} with message: ${broadcastMessage}`);
            console.log(`[BROADCAST] Developer IDs in config: ${config.developerIds.join(', ')}`);
            console.log(`[BROADCAST] User ID: ${interaction.user.id}, In developer list: ${config.developerIds.includes(interaction.user.id)}`);
            
            // Create the broadcast embed
            const broadcastEmbed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle(customTitle)
                .setDescription(broadcastMessage)
                .setTimestamp()
                .setFooter({ 
                    text: `Sent by ${interaction.user.tag}`,
                    iconURL: interaction.client.user.displayAvatarURL()
                });

            // If preview is enabled, show a preview with confirm/cancel buttons
            if (preview) {
                console.log(`[BROADCAST] Showing preview to ${interaction.user.tag}`);
                
                const confirmButton = new ButtonBuilder()
                    .setCustomId('broadcast_confirm')
                    .setLabel('Send Broadcast')
                    .setStyle(ButtonStyle.Success);
                
                const cancelButton = new ButtonBuilder()
                    .setCustomId('broadcast_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Danger);
                
                const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);
                
                const previewEmbed = new EmbedBuilder()
                    .setColor(config.colors.warning)
                    .setTitle('📣 Broadcast Preview')
                    .setDescription('Here is a preview of your broadcast message. Review it and click "Send Broadcast" to send it to all servers, or "Cancel" to cancel.')
                    .setTimestamp();
                
                // Send the preview with buttons
                await interaction.reply({
                    embeds: [previewEmbed, broadcastEmbed],
                    components: [row],
                    ephemeral: true
                });
                
                // Add a note explaining how it works
                await interaction.followUp({
                    content: '**Note:** Click "Send Broadcast" to confirm and send this message to all servers. The buttons will be handled automatically.',
                    ephemeral: true
                });
                
                // The buttons will be handled by interactionCreate.js
                
            } else {
                // No preview requested, proceed directly with broadcast
                console.log(`[BROADCAST] No preview requested, proceeding with broadcast`);
                
                await interaction.reply({
                    content: "📣 Starting broadcast to all servers...",
                    embeds: [broadcastEmbed],
                    ephemeral: true
                });
                
                // Track statistics
                let successCount = 0;
                let failCount = 0;
                let totalGuilds = interaction.client.guilds.cache.size;
                
                // Broadcast to all guilds
                console.log(`[BROADCAST] Starting broadcast to ${totalGuilds} guilds`);
                
                // Process each guild
                let processedCount = 0;
                for (const guild of interaction.client.guilds.cache.values()) {
                    try {
                        console.log(`[BROADCAST] Processing guild: ${guild.name} (${guild.id})`);
                        processedCount++;
                        
                        // Find the first available text channel
                        const channel = guild.channels.cache
                            .filter(ch => ch.type === 0) // 0 is GuildText channel type
                            .sort((a, b) => a.position - b.position)
                            .first();
                        
                        if (!channel) {
                            console.log(`[BROADCAST] No suitable text channel found in guild: ${guild.name}`);
                            failCount++;
                            continue;
                        }
                        
                        console.log(`[BROADCAST] Selected channel: ${channel.name} (${channel.id})`);
                        
                        // Check bot permissions
                        const hasPermission = channel.permissionsFor(guild.members.me).has("SendMessages");
                        console.log(`[BROADCAST] Bot has SendMessages permission: ${hasPermission}`);
                        
                        if (hasPermission) {
                            await channel.send({ embeds: [broadcastEmbed] });
                            console.log(`[BROADCAST] Successfully sent broadcast to guild: ${guild.name}`);
                            successCount++;
                        } else {
                            console.log(`[BROADCAST] Missing permissions to send in channel: ${channel.name}`);
                            failCount++;
                        }
                        
                        // Update progress every 5 guilds or when done
                        if (processedCount % 5 === 0 || processedCount === totalGuilds) {
                            try {
                                await interaction.editReply({
                                    content: `📣 Broadcasting message to all servers...\nProcessing: ${processedCount}/${totalGuilds} servers (${successCount} successful, ${failCount} failed)`,
                                    embeds: [broadcastEmbed]
                                });
                            } catch (e) {
                                console.error('[BROADCAST] Failed to update progress:', e);
                            }
                        }
                        
                    } catch (error) {
                        console.error(`[BROADCAST] Error broadcasting to guild ${guild.name}:`, error);
                        failCount++;
                    }
                }
                
                // Update with final results
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
                    
                await interaction.editReply({
                    content: "Broadcast complete!",
                    embeds: [resultEmbed, broadcastEmbed]
                });
            }
            
        } catch (error) {
            console.error('[BROADCAST] Error executing broadcast command:', error);
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