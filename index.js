
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

// Load slash commands from the commands directory
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log(`\n===== LOADING SLASH COMMANDS =====`);
console.log(`Found ${commandFiles.length} command files in the commands directory`);

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
        const command = require(filePath);
        
        // Set a new item in the Collection with the key as the command name and the value as the exported module
        if ('data' in command && 'execute' in command) {
            console.log(`SUCCESS: Loading slash command from ${file}: ${command.data.name}`);
            client.commands.set(command.data.name, command);
        } else {
            console.error(`WARNING: The command at ${file} is missing required "data" or "execute" property.`);
            if (!('data' in command)) {
                console.error(`  - Missing 'data' property in ${file}`);
            }
            if (!('execute' in command)) {
                console.error(`  - Missing 'execute' property in ${file}`);
            }
        }
    } catch (error) {
        console.error(`ERROR: Failed to load command from ${file}:`, error);
    }
}

console.log(`Loaded ${client.commands.size} slash commands successfully`);
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
