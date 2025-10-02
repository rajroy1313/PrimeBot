const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

class TicketManager {
    constructor(client) {
        this.client = client;
        this.tickets = new Map();
        this.dataPath = path.join(__dirname, '../data/tickets.json');
        this.db = null;
        this.schema = null;
        this.dbReady = false;
        
        // Ensure data directory exists
        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // Initialize database connection
        this.initializeDatabase();
        this.loadTickets();
    }

    async initializeDatabase() {
        try {
            // Wait for client database to be ready
            if (this.client.db && this.client.schema) {
                this.db = this.client.db;
                this.schema = this.client.schema;
                this.dbReady = true;
                console.log('✅ TicketManager database connection established');
            } else {
                // Retry after a short delay if database isn't ready yet
                console.log('[TICKET] Waiting for database to be ready...');
                setTimeout(() => this.initializeDatabase(), 2000);
            }
        } catch (error) {
            console.error('❌ TicketManager database initialization failed:', error);
            console.log('[TICKET] Will operate in file-based mode until database is available');
            // Retry after a longer delay
            setTimeout(() => this.initializeDatabase(), 10000);
        }
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
            // Get the channel where the button was clicked
            const parentChannel = interaction.channel;
            
            // Create ticket as a private thread
            const ticketThread = await parentChannel.threads.create({
                name: `🎫 ${interaction.user.username}'s ticket`,
                autoArchiveDuration: 1440, // 24 hours
                type: ChannelType.PrivateThread,
                reason: `Support ticket created by ${interaction.user.tag}`,
            });
            
            // Add the user to the thread
            await ticketThread.members.add(interaction.user.id);

            // Create ticket data
            const ticketData = {
                channelId: ticketThread.id,
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                category,
                createdAt: Date.now(),
                closed: false,
                isThread: true,
                parentChannelId: parentChannel.id
            };

            this.tickets.set(ticketThread.id, ticketData);
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

            await ticketThread.send({
                content: `${interaction.user} Welcome to your support ticket!`,
                embeds: [embed],
                components: [row]
            });

            return interaction.reply({
                content: `Your ticket thread has been created: ${ticketThread}`,
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

            // Archive and lock the thread after 10 seconds
            setTimeout(async () => {
                try {
                    if (ticket.isThread) {
                        // Archive and lock the thread
                        await interaction.channel.setArchived(true);
                        await interaction.channel.setLocked(true);
                    } else {
                        // For old channel-based tickets, delete the channel
                        await interaction.channel.delete();
                    }
                    this.tickets.delete(channelId);
                    this.saveTickets();
                } catch (error) {
                    console.error('Error closing ticket:', error);
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

    async sendTicketEmbed({ channelId, title = 'Support Tickets', description = 'Click the button below to create a support ticket', buttonText = 'Create Ticket', supportRoles = [] }) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            if (!channel) {
                throw new Error('Channel not found');
            }

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`🎫 ${title}`)
                .setDescription(description)
                .setTimestamp();

            if (supportRoles.length > 0) {
                const roleText = supportRoles.map(roleId => `<@&${roleId}>`).join(', ');
                embed.addFields({ name: '👥 Support Team', value: roleText });
            }

            const button = new ButtonBuilder()
                .setCustomId('ticket_create')
                .setLabel(buttonText)
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎫');

            const row = new ActionRowBuilder().addComponents(button);

            await channel.send({
                embeds: [embed],
                components: [row]
            });

            return true;
        } catch (error) {
            console.error('Error sending ticket embed:', error);
            throw error;
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