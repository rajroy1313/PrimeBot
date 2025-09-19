import mysql from "mysql2/promise";

export default async function handler(req, res) {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      port: 3306, // FreeDB uses default MySQL port
    });

    const [rows] = await connection.execute("SELECT NOW() AS time");
    await connection.end();

    res.status(200).json({ success: true, serverTime: rows[0].time });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
