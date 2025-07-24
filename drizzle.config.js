/** @type { import("drizzle-kit").Config } */
export default {
  schema: "./shared/schema.js",
  out: "./migrations",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'discord_bot',
  },
};