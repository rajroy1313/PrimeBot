const { ActivityType } = require('discord.js');

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`Logged in as ${client.user.tag}!`);
        
        // Start checking for ended giveaways
        client.giveawayManager.startCheckingGiveaways();
        
        // Set bot status
        client.user.setPresence({
            activities: [{ 
                name: `AFK Devs`,
                type: ActivityType.Watching
            }],
            status: 'dnd',
        });
        
        console.log(`Bot is ready! Serving ${client.guilds.cache.size} servers.`);
    },
};
