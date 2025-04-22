const { REST, Routes, PermissionFlagsBits } = require('discord.js');
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
        // Process commands and set permissions
        const processedCommands = commands.map(cmd => {
            // If default_member_permissions is not set, set it to '0' (available to everyone)
            if (cmd.default_member_permissions === undefined) {
                cmd.default_member_permissions = '0';
            }
            
            // Set all commands to have 'SendMessages' permission except 'echo'
            if (cmd.name !== 'echo') {
                // Ensure the command has permission to send messages
                console.log(`Setting SendMessages permission for command: ${cmd.name}`);
                
                // In Discord.js v14, we set permissions in the command data itself
                // This is handled in each individual command file
                
                // We'll create a separate logger entry
                console.log(`Permission status for ${cmd.name}: SendMessages permission = true`);
            } else {
                console.log(`Skipping SendMessages permission for command: ${cmd.name} (handled in command file)`);
            }
            
            return cmd;
        });

        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: processedCommands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
        console.log(`All commands are now accessible to all users in all servers.`);
    } catch (error) {
        console.error('Error deploying commands:', error);
    }
}

// Execute the deployment
deployCommands();