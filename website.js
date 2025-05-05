const express = require('express');
const path = require('path');
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
    try {
        // Refresh server count and uptime if possible
        if (global.client && global.client.guilds) {
            res.locals.botInfo.servers = global.client.guilds.cache.size;
            res.locals.botInfo.uptime = formatUptime(global.client.uptime);
        }
        res.json(res.locals.botInfo);
    } catch (error) {
        console.error('Error serving bot info:', error);
        // Return fallback data on error
        res.json({
            name: 'AFK Devs Bot',
            prefix: '/',
            servers: 'Online',
            commands: ['help', 'about', 'giveaway'],
            uptime: 'Online'
        });
    }
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`Bot website is running on port ${port}`);
});

module.exports = app;