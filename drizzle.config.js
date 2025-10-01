/** @type { import("drizzle-kit").Config } */
export default {
  schema: "./shared/schema.js",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Use hardcoded DATABASE_URL for PostgreSQL
    connectionString: 'postgresql://neondb_owner:npg_fQMmC0N3dbXk@ep-tiny-fire-adfvcy9p-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' || 
      process.env.DATABASE_URL || 
      (process.env.DB_HOST?.includes('postgresql://') || process.env.DB_HOST?.includes('postgres://') 
        ? process.env.DB_HOST 
        : undefined),
    // Fallback to individual credentials if not using connection string
    host: (process.env.DATABASE_URL || process.env.DB_HOST?.includes('://')) ? undefined : (process.env.DB_HOST || 'localhost'),
    port: (process.env.DATABASE_URL || process.env.DB_HOST?.includes('://')) ? undefined : parseInt(process.env.DB_PORT) || 5432,
    user: (process.env.DATABASE_URL || process.env.DB_HOST?.includes('://')) ? undefined : (process.env.DB_USER || 'postgres'),
    password: (process.env.DATABASE_URL || process.env.DB_HOST?.includes('://')) ? undefined : (process.env.DB_PASSWORD || ''),
    database: (process.env.DATABASE_URL || process.env.DB_HOST?.includes('://')) ? undefined : (process.env.DB_NAME || 'discord_bot'),
    ssl: process.env.DATABASE_URL?.includes('sslmode=require') || process.env.DB_HOST?.includes('sslmode=require') ? true : (process.env.DB_SSL === 'require'),
  },
};