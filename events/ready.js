const { ActivityType } = require("discord.js");

module.exports = {
    name: "ready",
    once: true,
    execute(client) {
        console.log(`Logged in as ${client.user.tag}!`);

        // Start checking for ended giveaways
        client.giveawayManager.startCheckingGiveaways();

        // Set bot nickname for all guilds
        client.guilds.cache.forEach((guild) => {
            guild.members.me
                ?.setNickname("AFK")
                .catch((error) =>
                    console.error(
                        `Could not set nickname in ${guild.name}:`,
                        error,
                    ),
                );
        });

        // Set bot status
        client.user.setPresence({
            activities: [
                {
                    name: `${client.guilds.cache.size} servers`,
                    type: ActivityType.Watching,
                },
            ],
            status: "online",
        });

        // Update activity every 5 minutes
        setInterval(
            () => {
                client.user.setPresence({
                    activities: [
                        {
                            name: `${client.guilds.cache.size} servers`,
                            type: ActivityType.Watching,
                        },
                    ],
                    status: "online",
                });
            },
            5 * 60 * 1000,
        );

        console.log(
            `Bot is ready! Serving ${client.guilds.cache.size} servers.`,
        );
    },
};
//
