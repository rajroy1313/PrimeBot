const {
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    PermissionsBitField,
    PermissionFlagsBits,
} = require("discord.js");
const config = require("../config");

module.exports = {
    name: "messageCreate",
    async execute(message, client) {
        try {
            // Ignore messages from bots
            if (message.author.bot) return;

            const prefix = config.prefix;

            // Check for ping (mention)
            if (message.mentions.has(client.user.id) && client.ws.status === 0) {
                // Create ping embed
                const pingEmbed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle("Hello there! 👋")
                    .setDescription(`I'm **${client.user.username}**, your Discord bot`)
                    .addFields(
                        {
                            name: "📋 Prefix",
                            value: `\`${prefix}\``,
                            inline: true,
                        },
                        {
                            name: "🏓 Ping",
                            value: `${client.ws.ping}ms`,
                            inline: true,
                        }
                    )
                    .setTimestamp();

                try {
                    await message.reply({ embeds: [pingEmbed] });
                } catch (error) {
                    console.error("Error handling ping:", error);
                    await message.reply("Sorry, I encountered an error while processing your ping. Please try again later.");
                }
            }

            // Process message for counting game if available
            if (client.countingManager && typeof client.countingManager.processCountingMessage === 'function') {
                // Check if message was processed by counting
                const wasProcessedByCounting = await client.countingManager.processCountingMessage(message);
                
                // If message was processed as a counting message, stop further processing
                if (wasProcessedByCounting) return;
            }

            // Process message for XP and leveling if available
            if (client.levelingManager && typeof client.levelingManager.processMessage === 'function') {
                await client.levelingManager.processMessage(message);
            }

            // Basic command handling with prefix
            if (message.content.startsWith(prefix)) {
                const args = message.content.slice(prefix.length).trim().split(/ +/);
                const commandName = args.shift().toLowerCase();

                // Placeholder for command handling
                if (commandName === 'help') {
                    message.reply("This is a placeholder help command. The bot is currently being reconfigured.");
                }
            }
        } catch (error) {
            console.error("Error in messageCreate event:", error);
        }
    },
};