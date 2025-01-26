import dotenv from "dotenv";
dotenv.config(); // Load environment variables

import pg from "pg";

const { Pool } = pg;

// SSL Configuration
const sslConfig =
    process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: true } // Enforce certificate validation in production
        : { rejectUnauthorized: false }; // Allow self-signed certificates in development

// PostgreSQL Pool Configuration
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false, // Allow self-signed certificates (for Render, AWS, etc.)
    }
});

// Test Database Connection
pool.connect()
    .then(() => console.log("✅ Successfully connected to PostgreSQL"))
    .catch(() => {
        process.exit(1); // Exit process on connection failure
    });

export default pool;
