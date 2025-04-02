module.exports = {
    // Bot configuration
    prefix: '$', // Command prefix for message commands
    
    // Colors for embeds
    colors: {
        primary: '#5865F2', // Discord blurple color
        success: '#57F287', // Green color for success messages
        error: '#ED4245',   // Red color for error messages
        warning: '#FEE75C'  // Yellow color for warning messages
    },
    
    // Default welcome message - can be customized
    welcomeMessage: 'Welcome to the server, {member}! Enjoy your stay!',
    
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
