# Discord Bot Architecture

## Overview

This is a sophisticated Discord bot built with Node.js that provides comprehensive community engagement tools including leveling systems, games, polls, tickets, and various interactive features. The bot is designed with a modular architecture supporting 25+ slash commands and advanced real-time server interactions.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### August 24, 2025 - React Dashboard Implementation Complete
✓ **REACT DASHBOARD CREATED**: Complete React-based online dashboard for bot control and configuration
✓ **Dashboard Components**: Built comprehensive dashboard with 7 main sections: Overview, Bot Config, Giveaways, Leveling, Polls, Tickets, and Moderation
✓ **API Endpoints**: Added RESTful API endpoints for all dashboard functionality (/api/config, /api/giveaways, etc.)
✓ **Real-time Bot Stats**: Dashboard displays live bot statistics including server count, uptime, and command count
✓ **Bot Configuration Interface**: Web-based interface to modify bot settings, welcome messages, and leveling parameters
✓ **Giveaway Management**: Create, monitor, and manage giveaways through the web interface
✓ **Leveling Control**: Award badges, view top users, and manage the leveling system
✓ **Poll Management**: Create both regular and live polls with real-time voting displays
✓ **Ticket System**: Monitor and manage support tickets through the dashboard
✓ **Moderation Dashboard**: View moderation actions, warnings, bans, and kicks
✓ **Modern UI**: Clean, responsive design with Discord-themed colors and professional layout
✓ **Single Page Application**: React Router for seamless navigation between dashboard sections
✓ **Mobile Responsive**: Dashboard works on desktop, tablet, and mobile devices
✓ **Dashboard Access**: Available at `/dashboard` route with full bot management capabilities

### August 7, 2025 - Leveling System Database Migration Complete
✓ **LEVELING SYSTEM MIGRATED TO MYSQL**: Complete migration from JSON files to database storage
✓ **Database Tables Created**: Added user_levels and user_badges tables with proper relations
✓ **Enhanced Data Persistence**: All leveling data now stored reliably in MySQL database
✓ **Improved Performance**: Database operations replace file I/O for better scalability
✓ **Badge Management**: Real-time badge tracking with database synchronization
✓ **Database Schema Integration**: Leveling tables added to unified schema structure
✓ **Automatic Table Creation**: Database initialization includes leveling tables
✓ **Seamless Migration**: Existing JSON data automatically migrated to database on startup
✓ **Enhanced Error Handling**: Robust error handling for database operations
✓ **Database Connection Validation**: Proper initialization and connection testing for leveling manager
✓ **JSON Backup Creation**: Original levels.json backed up as levels.json.backup during migration
✓ **Complete Feature Parity**: All leveling features maintained with database backend
✓ **Performance Indexes**: Optimized database indexes for fast queries on large datasets

### July 28, 2025 - Giveaway System Database Migration Complete
✓ **GIVEAWAY SYSTEM MIGRATED TO MYSQL**: Complete migration from JSON files to database storage
✓ **Database Tables Created**: Added giveaways, giveaway_participants, and giveaway_winners tables
✓ **Enhanced Data Persistence**: Giveaway data now stored reliably in MySQL database
✓ **Improved Performance**: Database operations replace file I/O for better scalability
✓ **Participant Management**: Real-time participant tracking with database synchronization
✓ **Database Schema Integration**: Giveaway tables added to unified schema structure
✓ **Automatic Table Creation**: Database initialization script updated to create giveaway tables
✓ **Seamless Migration**: Existing in-memory giveaway operations maintained while adding database persistence
✓ **Enhanced Error Handling**: Robust error handling for database operations with fallback mechanisms
✓ **Database Connection Validation**: Proper initialization and connection testing for giveaway manager

### July 28, 2025 - Categories Command Fix & No-Prefix System Complete
✓ **FIXED CATEGORIES COMMAND**: Resolved missing `showDetailedCategoryHelp` function causing prefix categories to fail
✓ **RESTORED FULL CATEGORIES FUNCTIONALITY**: Both `$categories` and `$commands` now work with interactive dropdown menus
✓ **Enhanced Category Support**: Added detailed category help with comprehensive command descriptions
✓ **FIXED NO-PREFIX MODE**: Removed unwanted reactions and optimized command execution for seamless no-prefix experience
✓ **No-Prefix System Clarified**: "np" refers to no-prefix mode allowing command execution without prefix ($np enable [minutes])
✓ **Silent Command Execution**: No-prefix commands now execute without reactions or visual indicators
✓ **Interactive Menu Support**: Dropdown menus work for both slash and prefix command versions
✓ **Comprehensive Command Coverage**: All 6 categories (general, leveling, games, moderation, community, admin) fully functional

### July 28, 2025 - System Optimizations & No-Prefix Fixes
✓ **OPTIMIZED NO-PREFIX SYSTEM**: Reduced verbose debug logging that was cluttering console output
✓ **Confirmed No-Prefix Functionality**: System working correctly - users can enable with $np enable [minutes]
✓ **Enhanced No-Prefix Commands**: Full command set available ($np enable/disable/status/user)
✓ **Improved Debug Output**: Only logs relevant events when no-prefix mode is actually active
✓ **System Performance**: Reduced unnecessary log spam for better console readability

### July 28, 2025 - Polling System Critical Fixes & Database Unification
✓ **FIXED POLL ENDING CRASHES**: Resolved critical error where poll ending failed with "message.reactions.fetch is not a function"
✓ **Enhanced Message Validation**: Added comprehensive checks for message and reactions manager validity
✓ **Improved Error Handling**: Added try-catch blocks around reaction fetching with fallback to cached reactions
✓ **Fixed Category System**: Updated help category interactions to properly display polling commands
✓ **Database Unification Complete**: Added regular polls tables to match live polls database structure
✓ **Enhanced Poll Display**: Added /poll, /lpoll, and /endpoll commands to Community category in help system
✓ **Live Poll Voting Confirmed Working**: Verified live poll button interactions are properly handled
✓ **Robust Reaction Processing**: Poll ending now works with cached reactions if fetching fails
✓ **Database Schema Extended**: Added polls, poll_options, and poll_votes tables with proper foreign keys
✓ **Unified Architecture**: Both regular and live polls now use the same database approach

### July 27, 2025 - Polling System Major Simplification & Bug Fixes
✓ **SIMPLIFIED POLL COMMANDS**: Completely overhauled polling system for ease of use
✓ **Regular Polls**: Now use simple format `$poll "question?" option1 option2 option3 24h`
✓ **Live Polls**: Now use simple format `$lpoll create "question?" option1 option2 2h`  
✓ **Removed Complex Pipe Syntax**: No more confusing | separators between options
✓ **Smart Quote Detection**: Automatically handles quoted questions and space-separated options
✓ **Default Timings**: Regular polls default to 24h, live polls are permanent unless specified
✓ **Slash Command Update**: /poll now uses separate option fields instead of pipe syntax
✓ Fixed live poll confirmation message not being sent
✓ Updated handleLivePollCreate to send confirmation embed before voting interface
✓ Resolved Discord token connection issues preventing message delivery
✓ Fixed duplicate message issue in Live Poll commands
✓ Simplified message handling to send single responses per command
✓ Added explicit return statements to prevent execution flow issues
✓ Added winning celebration messages for completed polls
✓ Created dynamic winner announcement embeds with random celebration emojis
✓ Implemented tie-breaker handling for multiple winners
✓ Updated poll end commands to show winners automatically
✓ Added celebration messages for expired polls with votes
✓ Enhanced user experience with festive winner announcements
✓ Fixed database schema issues with missing message_id and column_id columns
✓ **UPDATED HELP SYSTEM**: Added lpoll commands to $help, $commands, and /help menus
✓ **REFRESHED COMMAND COUNTS**: Updated from 25+ to 30+ commands across all help interfaces
✓ **ENHANCED DOCUMENTATION**: Included live poll features in community command sections
✓ **UNIFIED HELP EXPERIENCE**: Both prefix and slash command help now show polling capabilities

## System Architecture

### Core Technology Stack
- **Runtime**: Node.js
- **Discord Library**: Discord.js v14
- **Database**: MySQL with Drizzle ORM
- **Database Driver**: mysql2
- **Environment Management**: dotenv
- **Process Management**: Custom supervisor script
- **Web Interface**: Express.js server

### Bot Structure
The bot follows a modular command-based architecture with separate managers for different feature sets:

- **Command System**: Slash commands with individual command files
- **Manager System**: Specialized managers for complex features
- **Configuration**: Centralized config system
- **Database Integration**: Drizzle ORM with MySQL backend

## Key Components

### 1. Command System
- **Location**: `/commands/` directory
- **Format**: Individual JavaScript files implementing SlashCommandBuilder
- **Features**: 25+ commands covering games, moderation, community engagement
- **Permission System**: Role-based permissions with default settings

### 2. Manager Systems
The bot uses specialized manager classes for complex features:

- **GiveawayManager**: Handles giveaway creation, tracking, and winner selection
- **TicketManager**: Support ticket system with channel creation and management
- **TicTacToeManager**: Interactive game management
- **PollManager**: Traditional and live poll systems
- **BirthdayManager**: Birthday tracking and celebration system
- **LivePollManager**: Cross-server poll sharing system
- **CountingManager**: Counting game functionality
- **TruthDareManager**: Truth or Dare game system

### 3. Database Architecture
- **ORM**: Drizzle ORM for type-safe database operations
- **Database**: MySQL for persistent data storage
- **Schema**: Centralized schema definition in `/shared/schema.js`
- **Migrations**: Automated database migrations through Drizzle Kit

### 4. Web Interface
- **Framework**: Express.js
- **Port**: 5000
- **Features**: Bot statistics, command documentation, status monitoring
- **Static Assets**: Public directory for web resources

## Data Flow

### Command Execution Flow
1. Discord receives slash command
2. Discord.js routes to appropriate command handler
3. Command validates permissions and options
4. Manager classes handle complex business logic
5. Database operations through Drizzle ORM
6. Response sent back to Discord channel

### Event Handling
- **Guild Events**: Member join/leave, role updates
- **Message Events**: Command processing, reaction handling
- **Button Interactions**: Game moves, poll voting, ticket actions
- **Scheduled Events**: Birthday celebrations, poll endings, giveaway conclusions

### Database Operations
- **Connection**: MySQL connection through mysql2 driver
- **Queries**: Type-safe queries through Drizzle ORM
- **Transactions**: Atomic operations for complex features
- **Migrations**: Version-controlled schema changes

## External Dependencies

### Required Dependencies
- `discord.js`: Discord API interaction
- `drizzle-orm`: Database ORM
- `drizzle-kit`: Database migrations and tooling
- `mysql2`: MySQL database driver
- `dotenv`: Environment variable management
- `express`: Web server framework
- `ms`: Time parsing utility
- `debug`: Debug logging system

### Environment Variables
- `DISCORD_TOKEN`: Bot authentication token
- `CLIENT_ID`: Discord application client ID
- `DB_HOST`: MySQL database host
- `DB_PORT`: MySQL database port
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password
- `DB_NAME`: Database name

### Discord Permissions
The bot requires comprehensive permissions including:
- Send Messages
- Embed Links
- Manage Channels (for tickets)
- Manage Roles (for leveling)
- Add Reactions (for polls)
- Manage Messages (for moderation)

## Deployment Strategy

### Development Environment
- **Start Command**: `npm run direct` for development
- **Supervisor**: `npm start` for production with auto-restart
- **Debug Mode**: Debug logging with environment variables

### Production Considerations
- **Process Management**: Custom supervisor script with crash recovery
- **Error Handling**: Comprehensive error catching and logging
- **Connection Enhancement**: Automatic reconnection logic
- **Graceful Shutdown**: Proper cleanup on process termination

### Database Migration
- **Migration Files**: Generated in `/migrations/` directory
- **Schema Updates**: Automated through Drizzle Kit
- **Backup Strategy**: Required before schema changes

### Monitoring
- **Uptime Tracking**: Built-in uptime calculation
- **Performance Metrics**: Memory usage and response time monitoring
- **Error Logging**: Comprehensive error tracking and reporting
- **Web Dashboard**: Real-time statistics through Express server

The bot is designed for high availability with automatic recovery mechanisms and comprehensive error handling to ensure stable operation across multiple Discord servers.