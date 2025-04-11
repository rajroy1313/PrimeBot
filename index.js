
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

// Initialize collections for commands
client.commands = new Collection();

// We've removed loading slash commands since we're only using message commands now
// The commands are handled directly in the messageCreate event

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
