const { ActivityType } = require('discord.js');

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`Logged in as ${client.user.tag}!`);
        
        // Start checking for ended giveaways
        client.giveawayManager.startCheckingGiveaways();
        
        // Set bot nickname for all guilds
        client.guilds.cache.forEach(guild => {
            guild.members.me?.setNickname(' Server bot')
                .catch(error => console.error(`Could not set nickname in ${guild.name}:`, error));
        });

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
//