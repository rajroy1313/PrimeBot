const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageReactionRemove,
    async execute(reaction, user, client) {
        try {
            // Ignore bot reactions
            if (user.bot) return;

            // Handle partial reactions
            if (reaction.partial) {
                try {
                    await reaction.fetch();
                } catch (error) {
                    console.error('Something went wrong when fetching the reaction:', error);
                    return;
                }
            }

            // Check if this is a giveaway reaction
            const messageId = reaction.message.id;
            
            // Check if giveawayManager exists
            if (!client.giveawayManager) {
                console.error('[GIVEAWAY] GiveawayManager not found on client');
                return;
            }
            
            const giveaway = client.giveawayManager.giveaways.get(messageId);
            
            if (!giveaway) return;

            // Check if the reaction is the giveaway emoji
            if (reaction.emoji.name === '🎉') {
                console.log(`[GIVEAWAY] User ${user.tag} removed reaction from giveaway ${messageId}`);
                
                // Check if giveaway has ended
                if (giveaway.ended) {
                    console.log(`[GIVEAWAY] Giveaway ${messageId} has already ended`);
                    return;
                }

                // Remove user from participants
                if (giveaway.participants.has(user.id)) {
                    giveaway.participants.delete(user.id);
                    console.log(`[GIVEAWAY] User ${user.tag} left giveaway ${messageId}. Total participants: ${giveaway.participants.size}`);
                    
                    // Save updated participants
                    client.giveawayManager.saveGiveaways();
                    
                    // Send confirmation DM
                    try {
                        await user.send(`You have left the giveaway for **${giveaway.prize}**.`);
                    } catch (dmError) {
                        console.log(`Could not DM user ${user.tag} about leaving giveaway`);
                    }
                }
            }
            
        } catch (error) {
            console.error('Error handling message reaction remove:', error);
        }
    },
};