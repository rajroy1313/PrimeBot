const express = require('express');
const path = require('path');
const config = require('./config.js');
const app = express();
const port = 5000;

// Static files middleware
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

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`Bot website is running on port ${port}`);
});

module.exports = app;