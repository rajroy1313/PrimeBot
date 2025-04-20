const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Get command files
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const commands = [];

// Load command data
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        console.log(`Loaded command: ${command.data.name}`);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing required "data" or "execute" property.`);
    }
}

// Configure REST for deployment
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Deploy commands function
async function deployCommands() {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // Check if we have a CLIENT_ID
        if (!process.env.CLIENT_ID) {
            console.error('Missing CLIENT_ID in .env file');
            return;
        }

        // Global deployment (for all servers the bot is in)
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error('Error deploying commands:', error);
    }
}

// Execute the deployment
deployCommands();