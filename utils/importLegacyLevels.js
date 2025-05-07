/**
 * Utility to import legacy JSON-based leveling data into the PostgreSQL database
 * 
 * This script:
 * 1. Reads the existing levels.json file
 * 2. Imports all user levels and badges into the database
 * 3. Creates appropriate guild settings
 */

const fs = require('fs');
const path = require('path');
const { db, pool } = require('../db/connection');
const DBLevelingManager = require('./dbLevelingManager');
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

// Create a minimal Discord client for the import process
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
    ]
});

// Import function
async function importLegacyData() {
    try {
        console.log('[IMPORT] Starting import of legacy leveling data...');
        
        // Initialize the new leveling manager
        const levelingManager = new DBLevelingManager(client);
        
        // Load legacy data
        const dataPath = path.join(__dirname, '../data/levels.json');
        if (!fs.existsSync(dataPath)) {
            console.log('[IMPORT] No legacy data file found at', dataPath);
            return;
        }
        
        console.log('[IMPORT] Loading legacy data from', dataPath);
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        
        // Convert from JSON object to Map structure
        const legacyData = new Map();
        for (const [guildId, guildData] of Object.entries(data)) {
            const guildMap = new Map();
            for (const [userId, userData] of Object.entries(guildData)) {
                guildMap.set(userId, userData);
            }
            legacyData.set(guildId, guildMap);
        }
        
        console.log(`[IMPORT] Loaded legacy data for ${legacyData.size} guilds`);
        
        // Log in to Discord to get access to user data
        await client.login(process.env.TOKEN);
        console.log(`[IMPORT] Logged in as ${client.user.tag}`);
        
        // Import the data
        const result = await levelingManager.importLegacyData(legacyData);
        
        console.log('[IMPORT] Import complete:', result);
        console.log(`[IMPORT] Imported ${result.userCount} users and ${result.badgeCount} badges across ${result.guildCount} guilds`);
        
        // Create a backup of the old data
        const backupPath = path.join(__dirname, '../data/levels.json.backup');
        fs.copyFileSync(dataPath, backupPath);
        console.log(`[IMPORT] Created backup of legacy data at ${backupPath}`);
        
    } catch (error) {
        console.error('[IMPORT] Error importing legacy data:', error);
    } finally {
        // Clean up
        client.destroy();
        await pool.end();
        process.exit(0);
    }
}

// Run the import
importLegacyData();