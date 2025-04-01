const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        try {
            // Ignore messages from bots
            if (message.author.bot) return;
            
            const prefix = config.prefix;
            
            // Check for ping (mention)
            if (message.mentions.has(client.user.id)) {
                const pingEmbed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle('Hello there! 👋')
                    .setDescription(`My prefix is \`${prefix}\`\nType \`${prefix}commands\` to see what I can do!`)
                    .setTimestamp()
                    .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });
                
                return message.reply({ embeds: [pingEmbed] });
            }
            
            // Check if message starts with prefix
            if (!message.content.startsWith(prefix)) return;
            
            // Parse command and arguments
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            
            // Handle commands
            switch (commandName) {
                case 'commands':
                    const commandsEmbed = new EmbedBuilder()
                        .setColor(config.colors.primary)
                        .setTitle('Available Commands')
                        .setDescription('Here are all the commands you can use:')
                        .addFields(
                            { name: `${prefix}commands`, value: 'Shows this list of commands' },
                            { name: '/giveaway', value: 'Creates a new giveaway (Requires Manage Server permission)' },
                            { name: '/end', value: 'Ends a giveaway early (Requires Manage Server permission)' },
                            { name: '/reroll', value: 'Rerolls winners for a giveaway (Requires Manage Server permission)' }
                        )
                        .setTimestamp()
                        .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });
                    
                    return message.reply({ embeds: [commandsEmbed] });
                    
                default:
                    // Command not found - do nothing
                    break;
            }
            
        } catch (error) {
            console.error('Error in messageCreate event:', error);
        }
    },
};