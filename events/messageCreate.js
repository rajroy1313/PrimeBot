const { EmbedBuilder } = require("discord.js");
const config = require("../config");

module.exports = {
    name: "messageCreate",
    async execute(message, client) {
        console.log(`[MESSAGE] From ${message.author.tag}: "${message.content}"`);
        
        try {
            // Ignore bot messages
            if (message.author.bot) return;
            
            // Extract the prefix from config
            const prefix = '$';  // Hardcoded prefix for testing
            
            // Simple mention response
            if (message.mentions.has(client.user.id)) {
                console.log('[MENTION] Bot was mentioned');
                return message.reply('Hi there! My prefix is `$`. Try `$ping` to test if I\'m working!');
            }
            
            // Check for prefix at the start of the message
            if (message.content.startsWith(prefix)) {
                const args = message.content.slice(prefix.length).trim().split(/ +/);
                const commandName = args.shift().toLowerCase();
                
                console.log(`[PREFIX] Command detected: ${commandName}, args: [${args.join(', ')}]`);
                
                // Simple ping command for testing
                if (commandName === 'ping') {
                    console.log('[COMMAND] Processing ping command');
                    return message.reply(`Pong! Latency: ${client.ws.ping}ms`);
                }
                
                // Simple help command
                if (commandName === 'help') {
                    console.log('[COMMAND] Processing help command');
                    return message.reply('This is a simple help message. Commands: `$ping`, `$help`');
                }
                
                // Simple test command
                if (commandName === 'test') {
                    console.log('[COMMAND] Processing test command');
                    return message.reply('Test command successful!');
                }
                
                // Counting commands
                if (commandName === 'cstart') {
                    console.log('[COMMAND] Processing cstart command');
                    return message.reply('Counting game command detected, but functionality is being configured.');
                }
                
                // Unknown command
                console.log(`[COMMAND] Unknown command: ${commandName}`);
                return message.reply(`Unknown command: \`${commandName}\`. Try \`$help\` to see available commands.`);
            }
            
            // Process message for counting - DISABLED TEMPORARILY FOR TESTING
            /*
            if (client.countingManager && typeof client.countingManager.processCountingMessage === 'function') {
                await client.countingManager.processCountingMessage(message);
            }
            
            // Process message for XP/leveling - DISABLED TEMPORARILY FOR TESTING
            if (client.levelingManager && typeof client.levelingManager.processMessage === 'function') {
                await client.levelingManager.processMessage(message);
            }
            */
            
        } catch (error) {
            console.error('Error in messageCreate event:', error);
            try {
                message.reply('An error occurred while processing your message.');
            } catch (replyError) {
                console.error('Could not send error reply:', replyError);
            }
        }
    },
};