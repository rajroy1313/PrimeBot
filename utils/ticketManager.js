const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, ThreadAutoArchiveDuration, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const fs = require('fs');
const path = require('path');

class TicketManager {
    constructor(client) {
        this.client = client;
        this.ticketsPath = path.join(__dirname, '..', 'data', 'tickets.json');
        this.ticketHistoryPath = path.join(__dirname, '..', 'data', 'ticketHistory.json');
        
        // Create data directory if it doesn't exist
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir);
        }
        
        // Initialize tickets data
        this.loadTickets();
    }
    
    // Load tickets from file
    loadTickets() {
        try {
            if (fs.existsSync(this.ticketsPath)) {
                this.tickets = JSON.parse(fs.readFileSync(this.ticketsPath, 'utf8'));
            } else {
                this.tickets = { active: {} };
                this.saveTickets();
            }
            
            if (fs.existsSync(this.ticketHistoryPath)) {
                this.ticketHistory = JSON.parse(fs.readFileSync(this.ticketHistoryPath, 'utf8'));
            } else {
                this.ticketHistory = { closed: [] };
                this.saveTicketHistory();
            }
        } catch (error) {
            console.error('Error loading tickets:', error);
            this.tickets = { active: {} };
            this.ticketHistory = { closed: [] };
        }
    }
    
    // Save tickets to file
    saveTickets() {
        try {
            fs.writeFileSync(this.ticketsPath, JSON.stringify(this.tickets, null, 2));
        } catch (error) {
            console.error('Error saving tickets:', error);
        }
    }
    
    // Save ticket history to file
    saveTicketHistory() {
        try {
            fs.writeFileSync(this.ticketHistoryPath, JSON.stringify(this.ticketHistory, null, 2));
        } catch (error) {
            console.error('Error saving ticket history:', error);
        }
    }
    
    /**
     * Send a ticket creation embed to a channel
     * @param {Object} options - Options for the ticket system
     * @returns {Promise<Object>} The sent message
     */
    async sendTicketEmbed({ channelId, title = 'Support Tickets', description = 'Click the button below to create a support ticket', buttonText = 'Create Ticket', supportRoles = [] }) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            
            if (!channel) {
                throw new Error('Channel not found');
            }
            
            // Create ticket embed
            const ticketEmbed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle(title)
                .setDescription(description)
                .setFooter({ text: 'Support Ticket System', iconURL: this.client.user.displayAvatarURL() })
                .setTimestamp();
            
            // Create ticket button
            const ticketButton = new ButtonBuilder()
                .setCustomId('create-ticket')
                .setLabel(buttonText)
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎫');
            
            const row = new ActionRowBuilder().addComponents(ticketButton);
            
            // Send embed with button
            const message = await channel.send({ embeds: [ticketEmbed], components: [row] });
            
            // Store support roles for this channel
            this.tickets.supportConfig = this.tickets.supportConfig || {};
            this.tickets.supportConfig[channelId] = supportRoles;
            this.saveTickets();
            
            return message;
        } catch (error) {
            console.error('Error sending ticket embed:', error);
            throw error;
        }
    }
    
    /**
     * Handle ticket creation button interaction
     * @param {Interaction} interaction - The button interaction
     */
    async handleTicketCreation(interaction) {
        try {
            // Defer the reply to avoid interaction timeout
            await interaction.deferReply({ ephemeral: true });
            
            const { channelId, user } = interaction;
            
            // Check if user already has an active ticket
            const userTickets = Object.values(this.tickets.active)
                .filter(ticket => ticket.userId === user.id && ticket.channelId === channelId);
            
            if (userTickets.length > 0) {
                return interaction.editReply({ 
                    content: 'You already have an active ticket. Please use your existing ticket thread.',
                    ephemeral: true
                });
            }
            
            // Get support roles for this channel
            const supportRoles = this.tickets.supportConfig?.[channelId] || [];
            
            // Create thread name
            const threadName = `ticket-${user.username}-${Date.now().toString().slice(-4)}`;
            
            // Get the channel
            const channel = await this.client.channels.fetch(channelId);
            
            // Create the thread
            const thread = await channel.threads.create({
                name: threadName,
                autoArchiveDuration: ThreadAutoArchiveDuration.ThreeDays,
                reason: `Support ticket created by ${user.tag}`
            });
            
            // Add the user to the thread
            await thread.members.add(user.id);
            
            // Store ticket information
            const ticketId = thread.id;
            this.tickets.active[ticketId] = {
                id: ticketId,
                channelId,
                userId: user.id,
                userName: user.tag,
                threadName,
                createdAt: new Date().toISOString(),
                supportRoles
            };
            this.saveTickets();
            
            // Create welcome embed for the thread
            const welcomeEmbed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle('Support Ticket')
                .setDescription(`Hello ${user}, support staff will be with you shortly.\nPlease describe your issue in detail.`)
                .addFields({ name: 'Ticket ID', value: ticketId })
                .setTimestamp()
                .setFooter({ text: 'Support Ticket System', iconURL: this.client.user.displayAvatarURL() });
            
            // Create close ticket button
            const closeButton = new ButtonBuilder()
                .setCustomId('close-ticket')
                .setLabel('Close Ticket')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒');
            
            const row = new ActionRowBuilder().addComponents(closeButton);
            
            // Send welcome message in thread
            await thread.send({ 
                content: `<@${user.id}> ${supportRoles.map(role => `<@&${role}>`).join(' ')}`,
                embeds: [welcomeEmbed],
                components: [row]
            });
            
            // Notify user that the ticket was created
            return interaction.editReply({ 
                content: `Your ticket has been created in <#${thread.id}>`,
                ephemeral: true
            });
            
        } catch (error) {
            console.error('Error creating ticket:', error);
            return interaction.editReply({ 
                content: 'There was an error creating your ticket. Please try again later.',
                ephemeral: true
            });
        }
    }
    
    /**
     * Handle ticket closing button interaction
     * @param {Interaction} interaction - The button interaction
     */
    async handleTicketClose(interaction) {
        try {
            // Get ticket information
            const ticketId = interaction.channelId;
            const ticket = this.tickets.active[ticketId];
            
            if (!ticket) {
                return interaction.reply({ 
                    content: 'This thread is not a registered support ticket.',
                    ephemeral: true
                });
            }
            
            // Check permissions
            const member = interaction.member;
            const hasPermission = member.permissions.has(PermissionFlagsBits.ManageThreads) || 
                                 ticket.supportRoles.some(roleId => member.roles.cache.has(roleId)) ||
                                 member.id === ticket.userId;
            
            if (!hasPermission) {
                return interaction.reply({ 
                    content: 'You do not have permission to close this ticket.',
                    ephemeral: true
                });
            }
            
            // Create closing notice
            const closingEmbed = new EmbedBuilder()
                .setColor(config.colors.warning)
                .setTitle('Ticket Closing')
                .setDescription(`This ticket is now being closed by ${interaction.user.tag}.`)
                .setTimestamp();
            
            await interaction.reply({ embeds: [closingEmbed] });
            
            // Archive the thread
            const thread = await this.client.channels.fetch(ticketId);
            await thread.setLocked(true);
            await thread.setArchived(true);
            
            // Add to history
            const closedTicket = {
                ...ticket,
                closedBy: interaction.user.id,
                closedByName: interaction.user.tag,
                closedAt: new Date().toISOString()
            };
            
            this.ticketHistory.closed.push(closedTicket);
            this.saveTicketHistory();
            
            // Remove from active tickets
            delete this.tickets.active[ticketId];
            this.saveTickets();
            
        } catch (error) {
            console.error('Error closing ticket:', error);
            return interaction.reply({ 
                content: 'There was an error closing the ticket. Please try again later.',
                ephemeral: true
            });
        }
    }
    
    /**
     * Get ticket history
     * @returns {Array} Array of closed tickets
     */
    getTicketHistory() {
        return this.ticketHistory.closed.sort((a, b) => 
            new Date(b.closedAt) - new Date(a.closedAt)
        );
    }
    
    /**
     * Get active tickets
     * @returns {Array} Array of active tickets
     */
    getActiveTickets() {
        return Object.values(this.tickets.active).sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
    }
}

module.exports = TicketManager;