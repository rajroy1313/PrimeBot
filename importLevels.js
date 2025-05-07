/**
 * Import legacy leveling data from JSON to PostgreSQL database
 * 
 * Run this script to migrate all existing user levels and badges
 * to the new multi-server database system.
 */

// Import the migration utility
require('./utils/importLegacyLevels');