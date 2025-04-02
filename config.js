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
    
    // Welcome system configuration
    welcome: {
        message: 'Welcome to the server, {member}! Enjoy your stay!',
        channelName: 'welcome', // Default channel name to look for
        enabled: true, // Whether welcome messages are enabled
        showImage: true, // Whether to show a welcome image banner
        mentions: true, // Whether to mention the user in the message
        // Additional welcome message text or information
        description: 'Please read the rules and have a great time in our community!',
        // Image banner for welcome messages
        banner: 'https://i.imgur.com/BQAcscx.png',
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
