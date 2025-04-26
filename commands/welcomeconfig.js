const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcomeconfig')
        .setDescription('Configure welcome settings for the support server')
        .setDefaultMemberPermissions('0') // Available to everyone but requires permissions
        .addSubcommand(subcommand =>
            subcommand
                .setName('setsupportserver')
                .setDescription('Set this server as the support server for welcome messages')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('channel')
                .setDescription('Set the welcome message channel')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Select the channel for welcome messages')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('message')
                .setDescription('Set the welcome message template')
                .addStringOption(option =>
                    option
                        .setName('message')
                        .setDescription('The welcome message (use {member} as placeholder for the member mention)')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('banner')
                .setDescription('Set the welcome banner image URL')
                .addStringOption(option =>
                    option
                        .setName('url')
                        .setDescription('The URL of the welcome banner image')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggledm')
                .setDescription('Toggle sending welcome DMs to new members')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('show')
                .setDescription('Show current welcome configuration')
        ),

    async execute(interaction) {
        // Check if the user has permission to manage the server
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({
                content: 'You need the Manage Server permission to configure welcome settings!',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        // Config file path
        const configPath = path.join(__dirname, '../config.js');

        // Create function to update config file
        const updateConfig = async (property, value, name) => {
            try {
                // Read the current config file
                let configContent = fs.readFileSync(configPath, 'utf8');
                
                // Create the regex pattern for the specific property
                const pattern = new RegExp(`(welcome:\\s*\\{[\\s\\S]*?${property}:\\s*)([^,\\n}]*)(,|\\s*\\n)`, 'g');
                
                // Replace the value
                let newValue = typeof value === 'string' ? `'${value}'` : value;
                if (value === null) newValue = 'null';
                
                // Make the replacement
                const newContent = configContent.replace(pattern, `$1${newValue}$3`);
                
                // Write the updated content back to the file
                fs.writeFileSync(configPath, newContent, 'utf8');
                
                // Update the runtime config
                if (property === 'supportServerId') {
                    config.welcome.supportServerId = value;
                } else if (property === 'channelId') {
                    config.welcome.channelId = value;
                } else if (property === 'serverMessage') {
                    config.welcome.serverMessage = value;
                } else if (property === 'bannerUrl') {
                    config.welcome.bannerUrl = value;
                } else if (property === 'sendDM') {
                    config.welcome.sendDM = value;
                }
                
                // Send success message
                const successEmbed = new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setTitle('✅ Configuration Updated')
                    .setDescription(`Welcome ${name} has been updated successfully.`);
                
                await interaction.reply({ embeds: [successEmbed] });
                return true;
            } catch (error) {
                console.error('Error updating config:', error);
                await interaction.reply({ 
                    content: `There was an error updating the welcome configuration: ${error.message}`,
                    ephemeral: true
                });
                return false;
            }
        };

        // Handle different subcommands
        switch (subcommand) {
            case 'setsupportserver':
                // Set the current server as the support server
                await updateConfig('supportServerId', `'${interaction.guild.id}'`, 'support server');
                break;
                
            case 'channel':
                // Get the selected channel
                const channel = interaction.options.getChannel('channel');
                
                // Validate channel type
                if (channel.type !== 0) { // 0 is text channel
                    return interaction.reply({
                        content: 'Please select a text channel for welcome messages.',
                        ephemeral: true
                    });
                }
                
                // Update the config
                await updateConfig('channelId', `'${channel.id}'`, 'channel');
                break;
                
            case 'message':
                // Get the new message
                const message = interaction.options.getString('message');
                
                // Update the config
                await updateConfig('serverMessage', message, 'message');
                break;
                
            case 'banner':
                // Get the banner URL
                const url = interaction.options.getString('url');
                
                // Validate URL format
                if (!url.match(/^https?:\/\/.+\.(png|jpg|jpeg|gif)$/i)) {
                    return interaction.reply({
                        content: 'Please provide a valid image URL (ending with .png, .jpg, .jpeg, or .gif)',
                        ephemeral: true
                    });
                }
                
                // Update the config
                await updateConfig('bannerUrl', url, 'banner');
                break;
                
            case 'toggledm':
                // Toggle the sendDM value
                const newValue = !config.welcome.sendDM;
                
                // Update the config
                await updateConfig('sendDM', newValue, 'DM setting');
                break;
                
            case 'show':
                // Show current configuration
                const supportServer = config.welcome.supportServerId
                    ? interaction.client.guilds.cache.get(config.welcome.supportServerId)?.name || 'Unknown'
                    : 'Not set';
                    
                const welcomeChannel = config.welcome.channelId
                    ? interaction.guild.channels.cache.get(config.welcome.channelId)?.name || 'Unknown'
                    : 'Auto (first available channel)';
                    
                const configEmbed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle('🔧 Welcome Configuration')
                    .addFields(
                        { name: 'Support Server', value: `${supportServer} (${config.welcome.supportServerId || 'Not set'})`, inline: true },
                        { name: 'Welcome Channel', value: welcomeChannel, inline: true },
                        { name: 'Send DMs', value: config.welcome.sendDM ? 'Enabled' : 'Disabled', inline: true },
                        { name: 'Welcome Message', value: config.welcome.serverMessage }
                    );
                    
                if (config.welcome.bannerUrl) {
                    configEmbed.setImage(config.welcome.bannerUrl);
                }
                
                await interaction.reply({ embeds: [configEmbed] });
                break;
        }
    },
};