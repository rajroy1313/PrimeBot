/** @type { import("drizzle-kit").Config } */
export default {
  schema: "./shared/schema.js",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Handle PostgreSQL connection string if DB_HOST contains full URL
    connectionString: process.env.DB_HOST?.includes('postgresql://') || process.env.DB_HOST?.includes('postgres://') 
      ? process.env.DB_HOST 
      : undefined,
    // Fallback to individual credentials if not using connection string
    host: process.env.DB_HOST?.includes('://') ? undefined : (process.env.DB_HOST || 'localhost'),
    port: process.env.DB_HOST?.includes('://') ? undefined : parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_HOST?.includes('://') ? undefined : (process.env.DB_USER || 'postgres'),
    password: process.env.DB_HOST?.includes('://') ? undefined : (process.env.DB_PASSWORD || ''),
    database: process.env.DB_HOST?.includes('://') ? undefined : (process.env.DB_NAME || 'discord_bot'),
    ssl: process.env.DB_HOST?.includes('sslmode=require') ? true : (process.env.DB_SSL === 'require'),
  },
};