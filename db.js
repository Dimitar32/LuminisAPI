import dotenv from "dotenv";
dotenv.config(); // Load environment variables

import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD, // Make sure this is correct
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false, // Allow self-signed certificates (for Render, AWS, etc.)
    },
});

pool.connect()
    .then(() => console.log("✅ Successfully connected to PostgreSQL"))
    .catch(err => console.error("❌ Database connection error:", err));

export default pool;
