const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Configure the welcome message system')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setchannel')
                .setDescription('Set the channel for welcome messages')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('The channel to send welcome messages to')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Toggle welcome messages on or off')
                .addBooleanOption(option =>
                    option
                        .setName('enabled')
                        .setDescription('Whether welcome messages should be enabled')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('setmessage')
                .setDescription('Set the welcome message text')
                .addStringOption(option =>
                    option
                        .setName('message')
                        .setDescription('The welcome message text (use {member}, {server}, {memberCount} as placeholders)')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('setdescription')
                .setDescription('Set the welcome description text')
                .addStringOption(option =>
                    option
                        .setName('description')
                        .setDescription('The welcome description text (use {member}, {server}, {memberCount} as placeholders)')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('togglemention')
                .setDescription('Toggle whether users are mentioned in welcome messages')
                .addBooleanOption(option =>
                    option
                        .setName('enabled')
                        .setDescription('Whether users should be mentioned in welcome messages')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggleimage')
                .setDescription('Toggle whether to show an image in welcome messages')
                .addBooleanOption(option =>
                    option
                        .setName('enabled')
                        .setDescription('Whether to show an image in welcome messages')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('preview')
                .setDescription('Preview the current welcome message')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        try {
            // Check if user has permission
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.reply({ 
                    content: 'You need the Manage Server permission to configure welcome messages!', 
                    ephemeral: true 
                });
            }

            const subcommand = interaction.options.getSubcommand();
            
            switch (subcommand) {
                case 'setchannel':
                    return handleSetChannel(interaction);
                case 'toggle':
                    return handleToggle(interaction);
                case 'setmessage':
                    return handleSetMessage(interaction);
                case 'setdescription':
                    return handleSetDescription(interaction);
                case 'togglemention':
                    return handleToggleMention(interaction);
                case 'toggleimage':
                    return handleToggleImage(interaction);
                case 'preview':
                    return handlePreview(interaction);
                default:
                    return interaction.reply({
                        content: 'Unknown subcommand!',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error executing welcome command:', error);
            return interaction.reply({ 
                content: 'There was an error executing this command!', 
                ephemeral: true 
            });
        }
    },
};

async function handleSetChannel(interaction) {
    const channel = interaction.options.getChannel('channel');
    
    // Check if the channel is a text channel
    if (channel.type !== 0) {
        return interaction.reply({
            content: 'The channel must be a text channel!',
            ephemeral: true
        });
    }
    
    // Update the config
    config.welcome.channelName = channel.name;
    
    // Create response
    const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('Welcome Channel Updated')
        .setDescription(`Welcome messages will now be sent to ${channel}!`)
        .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
}

async function handleToggle(interaction) {
    const enabled = interaction.options.getBoolean('enabled');
    
    // Update the config
    config.welcome.enabled = enabled;
    
    // Create response
    const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('Welcome Messages Updated')
        .setDescription(`Welcome messages are now **${enabled ? 'enabled' : 'disabled'}**!`)
        .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
}

async function handleSetMessage(interaction) {
    const message = interaction.options.getString('message');
    
    // Update the config
    config.welcome.message = message;
    
    // Create response
    const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('Welcome Message Updated')
        .setDescription('The welcome message has been updated!')
        .addFields(
            { name: 'New Message', value: message }
        )
        .setFooter({ text: 'Use /welcome preview to see how it looks!' })
        .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
}

async function handleSetDescription(interaction) {
    const description = interaction.options.getString('description');
    
    // Update the config
    config.welcome.description = description;
    
    // Create response
    const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('Welcome Description Updated')
        .setDescription('The welcome description has been updated!')
        .addFields(
            { name: 'New Description', value: description }
        )
        .setFooter({ text: 'Use /welcome preview to see how it looks!' })
        .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
}

async function handleToggleMention(interaction) {
    const enabled = interaction.options.getBoolean('enabled');
    
    // Update the config
    config.welcome.mentions = enabled;
    
    // Create response
    const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('Welcome Mentions Updated')
        .setDescription(`User mentions in welcome messages are now **${enabled ? 'enabled' : 'disabled'}**!`)
        .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
}

async function handleToggleImage(interaction) {
    const enabled = interaction.options.getBoolean('enabled');
    
    // Update the config
    config.welcome.showImage = enabled;
    
    // Create response
    const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('Welcome Images Updated')
        .setDescription(`Images in welcome messages are now **${enabled ? 'enabled' : 'disabled'}**!`)
        .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
}

async function handlePreview(interaction) {
    // Format the welcome message with placeholders
    const formattedMessage = config.welcome.message
        .replace('{member}', interaction.user)
        .replace('{server}', interaction.guild.name)
        .replace('{memberCount}', interaction.guild.memberCount);
        
    const formattedDescription = config.welcome.description
        .replace('{member}', interaction.user)
        .replace('{server}', interaction.guild.name)
        .replace('{memberCount}', interaction.guild.memberCount);
    
    // Get information about the member
    const joinedAt = `<t:${Math.floor(Date.now() / 1000)}:F> (<t:${Math.floor(Date.now() / 1000)}:R>)`;
    const accountCreated = `<t:${Math.floor(interaction.user.createdTimestamp / 1000)}:F> (<t:${Math.floor(interaction.user.createdTimestamp / 1000)}:R>)`;
    
    // Create welcome embed preview
    const welcomeEmbed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`Welcome to ${interaction.guild.name}!`)
        .setDescription(formattedMessage)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: '📝 About', value: formattedDescription },
            { name: '📆 Account Created', value: accountCreated, inline: false },
            { name: '🎉 Joined Server', value: joinedAt, inline: false },
            { name: '👥 Member Count', value: `You are the ${interaction.guild.memberCount}th member!`, inline: false }
        )
        .setFooter({ text: `Preview • ID: ${interaction.user.id}` })
        .setTimestamp();
        
    // Add banner image if enabled
    if (config.welcome.showImage) {
        welcomeEmbed.setImage(config.welcome.banner);
    }
    
    // Create settings embed
    const settingsEmbed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('Welcome Message Settings')
        .addFields(
            { name: 'Status', value: config.welcome.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: 'Channel', value: `#${config.welcome.channelName}`, inline: true },
            { name: 'Mentions', value: config.welcome.mentions ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: 'Images', value: config.welcome.showImage ? '✅ Enabled' : '❌ Disabled', inline: true }
        )
        .setTimestamp();
    
    // Reply with preview
    return interaction.reply({
        content: config.welcome.mentions ? `Welcome, ${interaction.user}!` : null,
        embeds: [welcomeEmbed, settingsEmbed],
        ephemeral: true
    });
}