
const debug = require('debug')('bot:main');

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});
// Enhance client connection handling
const enhanceConnection = require('./connection-enhancer');
enhanceConnection(client);


// Initialize collections for commands
client.commands = new Collection();

// SLASH COMMANDS DISABLED (as requested by user)
console.log(`\n===== SLASH COMMANDS DISABLED =====`);
console.log(`Slash commands have been disabled as requested.`);
console.log(`============================\n`);

// Load event handlers
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// Initialize giveaway manager
const GiveawayManager = require('./utils/giveawayManager');
client.giveawayManager = new GiveawayManager(client);

// Initialize ticket manager
const TicketManager = require('./utils/ticketManager');
client.ticketManager = new TicketManager(client);

// Initialize tic-tac-toe manager
const TicTacToeManager = require('./utils/ticTacToeManager');
client.ticTacToeManager = new TicTacToeManager(client);

// Initialize poll manager
const PollManager = require('./utils/pollManager');
client.pollManager = new PollManager(client);

// Initialize birthday manager
const BirthdayManager = require('./utils/birthdayManager');
client.birthdayManager = new BirthdayManager(client);

// Initialize emoji manager
const EmojiManager = require('./utils/emojiManager');
client.emojiManager = new EmojiManager();

// Initialize counting game manager
const CountingManager = require('./utils/countingManager');
client.countingManager = new CountingManager(client);

// Initialize truth or dare game manager
const TruthDareManager = require('./utils/truthDareManager');
client.truthDareManager = new TruthDareManager(client);

// Initialize leveling and badges manager
const LevelingManager = require('./utils/levelingManager');
client.levelingManager = new LevelingManager(client);

// Make client globally available for the website
global.client = client;

// Start website
const website = require('./website');

// Function to handle reconnection
async function connectBot() {
    try {
        await client.login(process.env.DISCORD_TOKEN);
        debug('Bot successfully logged in');
    } catch (error) {
        console.error('[ERROR] Failed to login to Discord:', error);
        console.log('Attempting to reconnect in 5 seconds...');
        setTimeout(connectBot, 5000);
    }
}

// Initial connection
connectBot();

// Handle disconnections
client.on('disconnect', () => {
    console.log('Bot disconnected! Attempting to reconnect...');
    connectBot();
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('Bot is shutting down...');
    client.destroy();
    process.exit(0);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});


// Enhanced error handling for process events
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't crash on unhandled rejections
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Log the error but don't exit unless absolutely necessary
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
        console.log('Network error occurred, but the bot will continue running');
    } else if (error.message && error.message.includes('getaddrinfo')) {
        console.log('DNS resolution error occurred, but the bot will continue running');
    } else if (error.code === 'TOKEN_INVALID') {
        console.error('Invalid token. The bot must restart with a valid token');
        process.exit(1);
    }
    // For other errors, log but don't crash
});

process.on('warning', (warning) => {
    console.warn('Warning:', warning.name, warning.message);
});
