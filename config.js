module.exports = {
    // Bot configuration
    prefix: '$', // Command prefix for message commands
    
    // Bot URLs
    supportServer: "https://discord.gg/discord-testers", // General invite that will always work
    
    // Developer IDs (users who can access developer commands)
    developerIds: [
        "1073582894772076544", // Bot's client ID
        "742457806041743361",  // Additional developer ID
        "683452242928795979"   // Additional developer ID
    ],
    
    // Colors for embeds
    colors: {
        primary: '#5865F2', // Discord blurple color
        success: '#57F287', // Green color for success messages
        error: '#ED4245',   // Red color for error messages
        warning: '#FEE75C',  // Yellow color for warning messages
        Gold: "#FFD700"
    },
    
    // Welcome system configuration
    welcome: {
        // Default welcome message in server - can be customized
        serverMessage: 'Welcome to the server, {member}! Enjoy your stay!',
        
        // Welcome message sent via DM to new members
        dmMessage: 'Hey {username}! Welcome to **{server}**!\n\nWe\'re excited to have you join our community. If you have any questions, feel free to ask in the help channel.\n\nHere are a few things to check out:\n• Read the rules in the rules channel\n• Introduce yourself in the introductions channel\n• Get roles in the roles channel',
        
        // Default welcome channel ID (set to null to use the first available channel)
        channelId: null,
        
        // Whether to send a welcome DM to new members
        sendDM: true,
        
        // Additional welcome banner image URL (set to null for no image)
        bannerUrl: 'https://i.imgur.com/hxGEQJh.png',
        
        // Support server ID - welcome messages will only be sent to this server
        supportServerId: null // Set this to your support server ID when ready
    },
    
    // Giveaway settings
    giveaway: {
        defaultDuration: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
        reactionEmoji: '🎉', // Emoji used for giveaway reactions
        winnerCount: 1, // Default number of winners
        checkInterval: 10000, // Check for ended giveaways every 10 seconds
    },
    
    // Permission levels for commands
    permissions: {
        GIVEAWAY_CREATE: 'MANAGE_GUILD', // Permission needed to create giveaways
        GIVEAWAY_END: 'MANAGE_GUILD',    // Permission needed to end giveaways
        GIVEAWAY_REROLL: 'MANAGE_GUILD'  // Permission needed to reroll giveaways
    }
};
