const express = require('express');
const path = require('path');
const config = require('./config.js');
const app = express();
const port = 5000;

// JSON parsing middleware
app.use(express.json());

// Static files middleware - serve the dashboard build
app.use('/dashboard', express.static(path.join(__dirname, 'public/dashboard')));
// Static files middleware - serve the public landing page
app.use(express.static(path.join(__dirname, 'public')));

// Bot information middleware
app.use((req, res, next) => {
    try {
        // Get actual command names from the client if available
        let commandNames = ['help', 'commands', 'giveaway', 'end', 'reroll', 'echo'];
        if (global.client && global.client.commands) {
            commandNames = Array.from(global.client.commands.keys());
        }

        // Create bot info with proper error handling
        res.locals.botInfo = {
            name: 'AFK Devs Bot',
            prefix: '/',
            servers: global.client && global.client.guilds ? global.client.guilds.cache.size : 'Loading...',
            commands: commandNames,
            uptime: global.client ? formatUptime(global.client.uptime) : 'Loading...'
        };
    } catch (error) {
        console.error('Error setting up bot info middleware:', error);
        // Fallback bot info
        res.locals.botInfo = {
            name: 'AFK Devs Bot',
            prefix: '/',
            servers: 'Online',
            commands: ['help', 'about', 'giveaway'],
            uptime: 'Online'
        };
    }
    next();
});

// Format uptime in a readable format
function formatUptime(uptime) {
    if (!uptime) return 'Offline';

    const seconds = Math.floor((uptime / 1000) % 60);
    const minutes = Math.floor((uptime / (1000 * 60)) % 60);
    const hours = Math.floor((uptime / (1000 * 60 * 60)) % 24);
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);

    return parts.join(' ');
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Dashboard route - serve React app
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/dashboard', 'index.html'));
});

app.get('/api/botinfo', (req, res) => {
    if (!global.client) {
        return res.status(503).json({ error: 'Bot not ready' });
    }

    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    let uptimeString = '';
    if (days > 0) uptimeString += `${days}d `;
    if (hours > 0) uptimeString += `${hours}h `;
    if (minutes > 0) uptimeString += `${minutes}m `;
    uptimeString += `${seconds}s`;

    // Ensure we get the actual current server count
    const serverCount = global.client.guilds.cache.size || 0;

    res.json({
        servers: serverCount,
        uptime: uptimeString,
        commands: global.client.commands ? Array.from(global.client.commands.keys()) : [],
        prefix: config.prefix
    });
});

// Dashboard API endpoints
app.post('/api/config', (req, res) => {
    try {
        // In a real implementation, you would save config to database
        console.log('Config update requested:', req.body);
        res.json({ success: true, message: 'Configuration updated successfully' });
    } catch (error) {
        console.error('Error updating config:', error);
        res.status(500).json({ error: 'Failed to update configuration' });
    }
});

app.get('/api/giveaways', (req, res) => {
    try {
        // Mock giveaway data - in real implementation, fetch from database
        const giveaways = [
            {
                id: 1,
                prize: 'Discord Nitro',
                endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                participants: 15,
                ended: false,
                description: 'Monthly Discord Nitro giveaway'
            }
        ];
        res.json(giveaways);
    } catch (error) {
        console.error('Error fetching giveaways:', error);
        res.status(500).json({ error: 'Failed to fetch giveaways' });
    }
});

app.post('/api/giveaways', (req, res) => {
    try {
        console.log('Giveaway creation requested:', req.body);
        res.json({ success: true, message: 'Giveaway created successfully' });
    } catch (error) {
        console.error('Error creating giveaway:', error);
        res.status(500).json({ error: 'Failed to create giveaway' });
    }
});

app.post('/api/giveaways/:id/end', (req, res) => {
    try {
        console.log('End giveaway requested for ID:', req.params.id);
        res.json({ success: true, message: 'Giveaway ended successfully' });
    } catch (error) {
        console.error('Error ending giveaway:', error);
        res.status(500).json({ error: 'Failed to end giveaway' });
    }
});

app.post('/api/giveaways/:id/reroll', (req, res) => {
    try {
        console.log('Reroll giveaway requested for ID:', req.params.id);
        res.json({ success: true, message: 'Giveaway rerolled successfully' });
    } catch (error) {
        console.error('Error rerolling giveaway:', error);
        res.status(500).json({ error: 'Failed to reroll giveaway' });
    }
});

app.get('/api/leveling/top', (req, res) => {
    try {
        // Mock leveling data - in real implementation, fetch from database
        const topUsers = [
            {
                id: 1,
                userId: '123456789',
                username: 'TopUser1',
                level: 25,
                xp: 12500,
                messages: 500,
                badges: [{ name: 'Helper', emoji: '🤝' }]
            },
            {
                id: 2,
                userId: '987654321',
                username: 'TopUser2',
                level: 20,
                xp: 10000,
                messages: 400,
                badges: []
            }
        ];
        res.json(topUsers);
    } catch (error) {
        console.error('Error fetching leveling data:', error);
        res.status(500).json({ error: 'Failed to fetch leveling data' });
    }
});

app.post('/api/leveling/badge', (req, res) => {
    try {
        console.log('Badge award requested:', req.body);
        res.json({ success: true, message: 'Badge awarded successfully' });
    } catch (error) {
        console.error('Error awarding badge:', error);
        res.status(500).json({ error: 'Failed to award badge' });
    }
});

app.get('/api/polls', (req, res) => {
    try {
        // Mock poll data - in real implementation, fetch from database
        const polls = [
            {
                id: 1,
                question: 'What should we add next?',
                type: 'regular',
                endTime: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
                totalVotes: 25,
                ended: false,
                options: [
                    { text: 'New games', votes: 15 },
                    { text: 'Music bot', votes: 10 }
                ]
            }
        ];
        res.json(polls);
    } catch (error) {
        console.error('Error fetching polls:', error);
        res.status(500).json({ error: 'Failed to fetch polls' });
    }
});

app.post('/api/polls', (req, res) => {
    try {
        console.log('Poll creation requested:', req.body);
        res.json({ success: true, message: 'Poll created successfully' });
    } catch (error) {
        console.error('Error creating poll:', error);
        res.status(500).json({ error: 'Failed to create poll' });
    }
});

app.post('/api/polls/:id/end', (req, res) => {
    try {
        console.log('End poll requested for ID:', req.params.id);
        res.json({ success: true, message: 'Poll ended successfully' });
    } catch (error) {
        console.error('Error ending poll:', error);
        res.status(500).json({ error: 'Failed to end poll' });
    }
});

app.get('/api/tickets', (req, res) => {
    try {
        // Mock ticket data - in real implementation, fetch from database
        const tickets = [
            {
                id: 1,
                userId: '123456789',
                username: 'User123',
                subject: 'Need help with bot commands',
                description: 'I cannot figure out how to use the leveling system',
                status: 'open',
                createdAt: new Date().toISOString()
            }
        ];
        res.json(tickets);
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

app.post('/api/tickets/:id/close', (req, res) => {
    try {
        console.log('Close ticket requested for ID:', req.params.id);
        res.json({ success: true, message: 'Ticket closed successfully' });
    } catch (error) {
        console.error('Error closing ticket:', error);
        res.status(500).json({ error: 'Failed to close ticket' });
    }
});

app.get('/api/moderation', (req, res) => {
    try {
        // Mock moderation data - in real implementation, fetch from database
        const moderationData = {
            warnings: [
                {
                    id: 1,
                    userId: '123456789',
                    username: 'User123',
                    moderator: 'Moderator1',
                    reason: 'Spamming in chat',
                    createdAt: new Date().toISOString()
                }
            ],
            bans: [],
            kicks: []
        };
        res.json(moderationData);
    } catch (error) {
        console.error('Error fetching moderation data:', error);
        res.status(500).json({ error: 'Failed to fetch moderation data' });
    }
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`Bot website is running on port ${port}`);
});

module.exports = app;