const express = require('express');
const path = require('path');
const app = express();
const port = 5000;

// Static files middleware
app.use(express.static(path.join(__dirname, 'public')));

// Bot information middleware
app.use((req, res, next) => {
    res.locals.botInfo = {
        name: 'AFK Devs Bot',
        prefix: require('./config').prefix,
        servers: global.client ? global.client.guilds.cache.size : 'Loading...',
        commands: ['help', 'commands', 'giveaway', 'gstart', 'end', 'gend', 'reroll', 'echo'],
        uptime: global.client ? formatUptime(global.client.uptime) : 'Loading...'
    };
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
    res.json(res.locals.botInfo);
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`Bot website is running on port ${port}`);
});

module.exports = app;