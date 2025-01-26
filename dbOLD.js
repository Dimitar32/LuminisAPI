import dotenv from "dotenv";
dotenv.config(); 

import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD, 
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false, // Allow self-signed certificates (for Render, AWS, etc.)
    },
});

pool.connect()
    .then(() => console.log("✅ Successfully connected to PostgreSQL"))
    .catch();

export default pool;
