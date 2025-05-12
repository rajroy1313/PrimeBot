
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
// Connection enhancer disabled as it may interfere with prefix commands
// const enhanceConnection = require('./connection-enhancer');
// enhanceConnection(client);


// Initialize collections for commands
client.commands = new Collection();

// Load command files
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Load commands into collection
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

console.log(`\n===== SLASH COMMANDS ENABLED =====`);
console.log(`Loaded ${client.commands.size} slash commands.`);
console.log(`Run deploy-commands.js to update registered commands.`);
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
try {
    const BirthdayManager = require('./utils/birthdayManager');
    client.birthdayManager = new BirthdayManager(client);
    console.log('Successfully loaded BirthdayManager');
} catch (error) {
    console.error('Failed to load BirthdayManager:', error.message);
    // Create a temporary birthday manager to prevent crashes
    client.birthdayManager = {
        getBirthday: () => null,
        setBirthday: () => false,
        removeBirthday: () => false,
        getAllBirthdays: () => new Map(),
        getUpcomingBirthdays: () => [],
        setAnnouncementChannel: () => false,
        setBirthdayRole: () => false,
        getGuildConfig: () => ({ announcementChannel: null, birthdayRole: null })
    };
}

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

// Initialize server settings manager for broadcast opt-outs
const ServerSettingsManager = require('./utils/serverSettingsManager');
client.serverSettingsManager = new ServerSettingsManager(client);

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
