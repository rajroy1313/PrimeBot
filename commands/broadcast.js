const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('broadcast')
        .setDescription('Send an announcement to all servers (Developer only)')
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
            
            // Debug logging
            console.log(`[DEBUG] Broadcast command triggered by ${interaction.user.tag} with message: ${broadcastMessage}`);
            
            // Create the broadcast embed
            const broadcastEmbed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle(customTitle)
                .setDescription(broadcastMessage)
                .setTimestamp()
                .setFooter({ 
                    text: `Version: ${config.version}`,
                    iconURL: interaction.client.user.displayAvatarURL()
                });

            // If preview is enabled, show a preview with confirm/cancel buttons
            if (preview) {
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
                
                await interaction.reply({
                    embeds: [previewEmbed, broadcastEmbed],
                    components: [row],
                    ephemeral: true
                });
                
                // Wait for button interaction
                try {
                    const filter = i => 
                        (i.customId === 'broadcast_confirm' || i.customId === 'broadcast_cancel') && 
                        i.user.id === interaction.user.id;
                    
                    const buttonInteraction = await interaction.channel.awaitMessageComponent({
                        filter,
                        time: 60_000 // 1 minute timeout
                    });
                    
                    if (buttonInteraction.customId === 'broadcast_cancel') {
                        await buttonInteraction.update({
                            content: 'Broadcast cancelled.',
                            embeds: [],
                            components: []
                        });
                        return;
                    }
                    
                    // Continue with broadcast if confirmed
                    await buttonInteraction.update({
                        content: '📣 Broadcasting message to all servers...',
                        embeds: [broadcastEmbed],
                        components: []
                    });
                    
                    // Store reference to continue with this interaction
                    interaction = buttonInteraction;
                    
                } catch (error) {
                    console.error('Error with button interaction:', error);
                    await interaction.editReply({
                        content: 'Broadcast cancelled due to timeout.',
                        embeds: [],
                        components: []
                    });
                    return;
                }
            } else {
                // No preview requested, proceed directly with broadcast
                await interaction.reply({
                    content: "📣 Broadcasting message to all servers...",
                    embeds: [broadcastEmbed],
                    ephemeral: true
                });
            }
            
            // Track statistics
            let successCount = 0;
            let failCount = 0;
            let totalGuilds = interaction.client.guilds.cache.size;
            let processingMessage = '';
            
            // Broadcast to all guilds
            console.log(`[DEBUG] Starting broadcast to ${totalGuilds} guilds`);
            
            // Create a progress update function
            const updateProgress = async (processed) => {
                if (processed % 5 === 0 || processed === totalGuilds) {
                    processingMessage = `Processing: ${processed}/${totalGuilds} servers (${successCount} successful, ${failCount} failed)`;
                    
                    try {
                        await interaction.editReply({
                            content: `📣 Broadcasting message to all servers...\n${processingMessage}`,
                            embeds: [broadcastEmbed],
                            components: []
                        });
                    } catch (e) {
                        console.error('Failed to update progress:', e);
                    }
                }
            };
            
            // Process each guild
            let processedCount = 0;
            for (const guild of interaction.client.guilds.cache.values()) {
                try {
                    console.log(`[DEBUG] Processing guild: ${guild.name} (${guild.id})`);
                    processedCount++;
                    
                    // Find the first available text channel
                    const channel = guild.channels.cache
                        .filter(ch => ch.type === 0) // 0 is GuildText channel type
                        .sort((a, b) => a.position - b.position)
                        .first();
                    
                    if (!channel) {
                        console.log(`[DEBUG] No suitable text channel found in guild: ${guild.name}`);
                        failCount++;
                        await updateProgress(processedCount);
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
                    
                    await updateProgress(processedCount);
                    
                } catch (error) {
                    console.error(`Error broadcasting to guild ${guild.name}:`, error);
                    failCount++;
                    await updateProgress(processedCount);
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
                embeds: [resultEmbed, broadcastEmbed],
                components: []
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