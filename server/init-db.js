const { db } = require('./db.js');
const { livePolls, livePollOptions, livePollVotes } = require('../shared/schema.js');
const { sql } = require('drizzle-orm');

async function initializeDatabase() {
    try {
        console.log('🚀 Initializing database tables for live polls...');
        
        // Create live_polls table
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS live_polls (
                id SERIAL PRIMARY KEY,
                poll_id VARCHAR(100) NOT NULL UNIQUE,
                pass_code VARCHAR(20) NOT NULL,
                question TEXT NOT NULL,
                creator_id VARCHAR(50) NOT NULL,
                is_active BOOLEAN DEFAULT true,
                allow_multiple_votes BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW(),
                expires_at TIMESTAMP
            );
        `);
        
        // Create live_poll_options table
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS live_poll_options (
                id SERIAL PRIMARY KEY,
                poll_id VARCHAR(100) NOT NULL,
                option_text TEXT NOT NULL,
                option_index INTEGER NOT NULL,
                vote_count INTEGER DEFAULT 0,
                FOREIGN KEY (poll_id) REFERENCES live_polls(poll_id) ON DELETE CASCADE
            );
        `);
        
        // Create live_poll_votes table
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS live_poll_votes (
                id SERIAL PRIMARY KEY,
                poll_id VARCHAR(100) NOT NULL,
                user_id VARCHAR(50) NOT NULL,
                option_index INTEGER NOT NULL,
                voted_at TIMESTAMP DEFAULT NOW(),
                FOREIGN KEY (poll_id) REFERENCES live_polls(poll_id) ON DELETE CASCADE
            );
        `);
        
        // Create indexes for better performance
        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_live_polls_poll_id ON live_polls(poll_id);
        `);
        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_live_polls_pass_code ON live_polls(pass_code);
        `);
        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_live_poll_options_poll_id ON live_poll_options(poll_id);
        `);
        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_live_poll_votes_poll_id ON live_poll_votes(poll_id);
        `);
        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_live_poll_votes_user_id ON live_poll_votes(user_id);
        `);
        
        console.log('✅ Database tables initialized successfully!');
        
        // Test query to verify tables exist
        const result = await db.execute(sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE '%poll%';
        `);
        
        console.log('📊 Live poll tables found:', result.rows.map(r => r.table_name));
        
    } catch (error) {
        console.error('❌ Error initializing database:', error);
        throw error;
    }
}

// Export the function and auto-run if called directly
module.exports = { initializeDatabase };

if (require.main === module) {
    initializeDatabase()
        .then(() => {
            console.log('Database initialization complete!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Database initialization failed:', error);
            process.exit(1);
        });
}