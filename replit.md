# Discord Bot Project

## Overview
A sophisticated Discord bot engineered for advanced community engagement, featuring a comprehensive ecosystem of interactive tools and community-building features.

## Stack
- Node.js backend
- Discord.js library
- PostgreSQL database with Drizzle ORM
- 28+ fully deployed slash and prefix commands
- Advanced real-time server interaction mechanisms
- Modular command architecture with extensive plugin support
- Multi-server engagement tracking

## Recent Changes

### July 23, 2025 - Live Poll System Implementation
✓ Added live poll system with `/lpoll` slash commands
✓ Created PostgreSQL database schema for polls, options, and votes
✓ Implemented cross-server poll sharing with pass codes
✓ Added comprehensive poll management (create, join, results, end, list)
✓ Database integration with Drizzle ORM
✓ Interactive voting system with Discord buttons
✓ Added prefix command versions (`$lpoll`) with full functionality
✓ Integrated vote button handling in interaction events
✓ Fixed voting button functionality by removing duplicate handlers
✓ Hidden Poll ID and Pass Code from voting interface for cleaner UX

## Project Architecture

### Database Layer
- **PostgreSQL**: Main database for persistent data
- **Drizzle ORM**: Type-safe database operations
- **Schema**: Located in `shared/schema.ts`
  - `live_polls`: Poll metadata and settings
  - `live_poll_options`: Poll choices and vote counts
  - `live_poll_votes`: Individual vote records

### Command System
- **Slash Commands**: Located in `commands/` directory
- **Prefix Commands**: Handled in `events/messageCreate.js`
- **Live Poll Commands**: Available as both slash and prefix commands
  - **Slash**: `/lpoll create|join|results|end|list`
  - **Prefix**: `$lpoll create|join|results|end|list`
  - Subcommands:
    - `create`: Create new cross-server polls
    - `join`: Join polls via ID or pass code
    - `results`: View poll results
    - `end`: End polls (creator only)
    - `list`: View user's created polls

### Utilities
- **LivePollManager**: `utils/livePollManager.js`
  - Poll creation and management
  - Vote processing and validation
  - Results calculation and display
  - Cross-server sharing capabilities

### Key Features
- **Pass Code System**: Secure poll sharing across servers
- **Vote Validation**: Prevents duplicate votes (configurable)
- **Expiration System**: Optional time-based poll expiration
- **Interactive UI**: Discord button integration for voting
- **Real-time Results**: Live vote count updates

## User Preferences
- Simple, everyday language for user communication
- Focus on functionality over technical details
- Comprehensive error handling and user feedback

## Next Steps
✓ Integrate live poll manager with main bot instance
✓ Add button interaction handlers for voting
✓ Add prefix command support
→ Test cross-server functionality thoroughly
→ Validate poll expiration and cleanup systems