
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const session = require('express-session');
const { storage } = require('./storage');

function getSession() {
    const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
    return session({
        secret: process.env.SESSION_SECRET || 'fallback-secret-for-dev',
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: sessionTtl,
        },
    });
}

async function upsertUser(profile) {
    if (storage && typeof storage.upsertUser === 'function') {
        await storage.upsertUser({
            id: profile.id,
            email: profile.email,
            username: profile.username,
            discriminator: profile.discriminator,
            avatar: profile.avatar,
            verified: profile.verified,
        });
    }
}

async function setupDiscordAuth(app) {
    app.set('trust proxy', 1);
    app.use(getSession());
    app.use(passport.initialize());
    app.use(passport.session());

    // Check if Discord credentials are configured
    if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
        console.warn('⚠️ Discord OAuth credentials not configured. Authentication will be disabled.');
        
        // Add mock routes for when OAuth is not configured
        app.get('/api/login', (req, res) => {
            res.status(503).json({ error: 'Authentication not configured' });
        });
        
        app.get('/api/auth/callback', (req, res) => {
            res.redirect('/?error=auth_not_configured');
        });
        
        app.get('/api/logout', (req, res) => {
            res.redirect('/');
        });
        
        app.get('/api/auth/user', (req, res) => {
            res.status(401).json({ message: 'Authentication not configured' });
        });
        
        return;
    }

    // Configure Discord Strategy
    passport.use(new DiscordStrategy({
        clientID: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        callbackURL: process.env.DISCORD_REDIRECT_URI || 'https://primebot-online.vercel.app/api/auth/callback',
        scope: ['identify', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            await upsertUser(profile);
            const user = {
                id: profile.id,
                username: profile.username,
                discriminator: profile.discriminator,
                avatar: profile.avatar,
                email: profile.email,
                verified: profile.verified,
                accessToken: accessToken,
                refreshToken: refreshToken
            };
            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    }));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            // In a real app, you'd fetch from database
            // For now, we'll store in session
            done(null, { id });
        } catch (error) {
            done(error, null);
        }
    });

    // Routes
    app.get('/api/login', passport.authenticate('discord'));

    app.get('/api/auth/callback', 
        passport.authenticate('discord', { 
            failureRedirect: '/' 
        }),
        (req, res) => {
            res.redirect('/dashboard');
        }
    );

    app.get('/api/logout', (req, res) => {
        req.logout((err) => {
            if (err) {
                console.error('Logout error:', err);
            }
            res.redirect('/');
        });
    });

    app.get('/api/auth/user', (req, res) => {
        if (req.isAuthenticated()) {
            res.json(req.user);
        } else {
            res.status(401).json({ message: 'Unauthorized' });
        }
    });
}

const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: 'Unauthorized' });
};

module.exports = { setupDiscordAuth, isAuthenticated };
