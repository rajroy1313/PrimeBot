require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const clientId = process.env.CLIENT_ID; // Your bot's client ID
const token = process.env.DISCORD_TOKEN; // Your bot's token

// Create a new REST instance
const rest = new REST({ version: '10' }).setToken(token);

// Function to unregister all global commands
async function unregisterGlobalCommands() {
    try {
        console.log('Started unregistering all application (/) commands globally...');

        // The PUT method is used to completely replace all commands in the guild with the new set
        // By passing an empty array, we're telling Discord to remove all commands
        await rest.put(
            Routes.applicationCommands(clientId),
            { body: [] },
        );

        console.log('Successfully unregistered all global application commands!');
    } catch (error) {
        console.error(error);
    }
}

// Execute the function
unregisterGlobalCommands();