const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

class TicketManager {
    constructor(client) {
        this.client = client;
        this.tickets = new Map();
        this.dataPath = path.join(__dirname, '../data/tickets.json');
        
        // Ensure data directory exists
        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        this.loadTickets();
    }

    loadTickets() {
        try {
            if (fs.existsSync(this.dataPath)) {
                const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
                this.tickets = new Map(Object.entries(data));
                console.log(`Loaded ${this.tickets.size} tickets from file.`);
            } else {
                console.log('No ticket data file found, starting fresh.');
            }
        } catch (error) {
            console.error('Error loading tickets:', error);
        }
    }

    saveTickets() {
        try {
            const data = Object.fromEntries(this.tickets);
            fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving tickets:', error);
        }
    }

    async createTicket(interaction, category = 'general') {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        
        // Check if user already has an open ticket
        const existingTicket = Array.from(this.tickets.values()).find(
            ticket => ticket.userId === userId && ticket.guildId === guildId && !ticket.closed
        );
        
        if (existingTicket) {
            return interaction.reply({
                content: `You already have an open ticket: <#${existingTicket.channelId}>`,
                ephemeral: true
            });
        }

        try {
            // Create ticket channel
            const ticketChannel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: interaction.user.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                        ],
                    },
                ],
            });

            // Create ticket data
            const ticketData = {
                channelId: ticketChannel.id,
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                category,
                createdAt: Date.now(),
                closed: false
            };

            this.tickets.set(ticketChannel.id, ticketData);
            this.saveTickets();

            // Create initial embed
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🎫 Support Ticket')
                .setDescription(`Hello ${interaction.user}, welcome to your support ticket!\n\nPlease describe your issue and our staff will assist you shortly.`)
                .addFields(
                    { name: '📂 Category', value: category, inline: true },
                    { name: '🕐 Created', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                )
                .setThumbnail(interaction.user.displayAvatarURL())
                .setTimestamp();

            // Create close button
            const closeButton = new ButtonBuilder()
                .setCustomId('ticket_close')
                .setLabel('Close Ticket')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒');

            const row = new ActionRowBuilder().addComponents(closeButton);

            await ticketChannel.send({
                content: `${interaction.user}`,
                embeds: [embed],
                components: [row]
            });

            return interaction.reply({
                content: `Your ticket has been created: ${ticketChannel}`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Error creating ticket:', error);
            return interaction.reply({
                content: 'There was an error creating your ticket. Please try again later.',
                ephemeral: true
            });
        }
    }

    async closeTicket(interaction) {
        const channelId = interaction.channel.id;
        const ticket = this.tickets.get(channelId);

        if (!ticket) {
            return interaction.reply({
                content: 'This is not a valid ticket channel.',
                ephemeral: true
            });
        }

        if (ticket.closed) {
            return interaction.reply({
                content: 'This ticket is already closed.',
                ephemeral: true
            });
        }

        try {
            // Mark ticket as closed
            ticket.closed = true;
            ticket.closedAt = Date.now();
            ticket.closedBy = interaction.user.id;
            this.saveTickets();

            // Create closing embed
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('🔒 Ticket Closed')
                .setDescription('This ticket has been closed. The channel will be deleted in 10 seconds.')
                .addFields(
                    { name: '👤 Closed by', value: `${interaction.user}`, inline: true },
                    { name: '🕐 Closed at', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Delete channel after 10 seconds
            setTimeout(async () => {
                try {
                    await interaction.channel.delete();
                    this.tickets.delete(channelId);
                    this.saveTickets();
                } catch (error) {
                    console.error('Error deleting ticket channel:', error);
                }
            }, 10000);

        } catch (error) {
            console.error('Error closing ticket:', error);
            return interaction.reply({
                content: 'There was an error closing this ticket.',
                ephemeral: true
            });
        }
    }

    getTicketHistory(guildId, userId = null) {
        const tickets = Array.from(this.tickets.values())
            .filter(ticket => ticket.guildId === guildId)
            .filter(ticket => userId ? ticket.userId === userId : true)
            .sort((a, b) => b.createdAt - a.createdAt);

        return tickets;
    }
}

module.exports = TicketManager;