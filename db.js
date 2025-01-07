import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  user: 'luminisdb_user',
  host: 'dpg-ctumdsjqf0us73f68utg-a.frankfurt-postgres.render.com',
  database: 'luminisdb',
  password: 'wDTAErN6IkC2WmO749hEomU4eIcPm3Lh',
  port: 5432, // Default PostgreSQL port
  ssl: {
    rejectUnauthorized: false, // Required for Render databases
  },
});

pool.connect()
  .then(() => console.log('✅ Connected to PostgreSQL'))
  .catch(err => console.error('❌ Connection error', err));

export default pool;