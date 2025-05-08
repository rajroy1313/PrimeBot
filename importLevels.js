/**
 * Import legacy levels from JSON files to the database
 * 
 * This script imports existing level data from JSON files
 * into the new PostgreSQL database for multi-server support.
 */

const fs = require('fs');
const path = require('path');
const { db, schema } = require('./db/connection');
const { userLevels, userBadges, guildLevelingSettings } = schema;
const config = require('./config');

async function importLevels() {
  try {
    console.log('[IMPORT] Starting import of legacy level data...');
    
    // Check if levels.json exists
    const levelsPath = path.join(__dirname, 'data', 'levels.json');
    if (!fs.existsSync(levelsPath)) {
      console.log('[IMPORT] No legacy levels.json file found. Nothing to import.');
      return;
    }
    
    // Read levels data
    const levelsData = JSON.parse(fs.readFileSync(levelsPath, 'utf8'));
    if (!levelsData || Object.keys(levelsData).length === 0) {
      console.log('[IMPORT] Legacy levels file exists but contains no data.');
      return;
    }
    
    // Track import statistics
    let guildCount = 0;
    let userCount = 0;
    let badgeCount = 0;
    
    // Process each guild
    for (const [guildId, guildData] of Object.entries(levelsData)) {
      if (!guildData.users || Object.keys(guildData.users).length === 0) {
        console.log(`[IMPORT] Guild ${guildId} has no users to import.`);
        continue;
      }
      
      // Create/update guild settings
      await db
        .insert(guildLevelingSettings)
        .values({
          guildId,
          enabled: true,
          minMessageLength: config.leveling.minMessageLength,
          xpPerMessage: config.leveling.xpPerMessage,
          xpCooldown: config.leveling.xpCooldown,
          maxRandomBonus: config.leveling.maxRandomBonus,
          baseMultiplier: config.leveling.baseMultiplier
        })
        .onConflictDoNothing();
        
      guildCount++;
        
      // Process each user in the guild
      for (const [userId, userData] of Object.entries(guildData.users)) {
        // Skip if no data
        if (!userData) continue;
        
        // Convert legacy data format to new database format
        const level = userData.level || 0;
        const xp = userData.xp || level * 100; // Basic XP calculation if missing
        const messages = userData.messages || 0;
        
        // Create/update user level record
        await db
          .insert(userLevels)
          .values({
            userId,
            guildId,
            level,
            xp,
            messages,
            lastMessageAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .onConflictDoUpdate({
            target: [userLevels.userId, userLevels.guildId],
            set: {
              level,
              xp,
              messages,
              updatedAt: new Date()
            }
          });
          
        userCount++;
        
        // Import badges if they exist
        if (userData.badges && userData.badges.length > 0) {
          for (const badgeId of userData.badges) {
            // Find badge data
            let badgeData = null;
            if (badgeId.startsWith('achievement_')) {
              badgeData = config.leveling.badges.achievementBadges.find(b => b.id === badgeId);
            } else if (badgeId.startsWith('special_')) {
              badgeData = config.leveling.badges.specialBadges.find(b => b.id === badgeId);
            }
            
            // Skip if badge definition not found
            if (!badgeData) {
              console.log(`[IMPORT] Badge ${badgeId} not found in configuration, skipping.`);
              continue;
            }
            
            // Create badge record
            await db
              .insert(userBadges)
              .values({
                userId,
                guildId,
                badgeId,
                badgeName: badgeData.name,
                badgeEmoji: badgeData.emoji,
                badgeColor: badgeData.color,
                badgeDescription: badgeData.description,
                badgeType: badgeId.startsWith('achievement_') ? 'achievement' : 'special',
                earnedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
              })
              .onConflictDoNothing();
              
            badgeCount++;
          }
        }
      }
    }
    
    console.log(`[IMPORT] Import complete!`);
    console.log(`[IMPORT] Imported data for ${guildCount} guilds, ${userCount} users, and ${badgeCount} badges.`);
    
    // Create backup of the original file
    const backupPath = path.join(__dirname, 'data', `levels_backup_${Date.now()}.json`);
    fs.copyFileSync(levelsPath, backupPath);
    console.log(`[IMPORT] Created backup of original data at ${backupPath}`);
  
  } catch (error) {
    console.error('[IMPORT] Error importing legacy levels:', error);
  }
}

// Run the import if this file is executed directly
if (require.main === module) {
  importLevels()
    .then(() => {
      console.log('[IMPORT] Import process completed.');
      process.exit(0);
    })
    .catch(err => {
      console.error('[IMPORT] Import process failed:', err);
      process.exit(1);
    });
} else {
  // Export the function for use in other modules
  module.exports = importLevels;
}