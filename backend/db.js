const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

// Create a connection pool (reuses connections — better than single connect)
const pool = mysql.createPool({
    host:               process.env.DB_HOST,
    port:               parseInt(process.env.DB_PORT) || 3306,
    user:               process.env.DB_USERNAME,
    password:           process.env.DB_PASSWORD,
    database:           process.env.DB_DATABASE,
    ssl: process.env.DB_SSL_MODE === 'REQUIRED'
        ? { rejectUnauthorized: false }
        : false,
    waitForConnections:  true,
    connectionLimit:     10,
    queueLimit:          0,
});

// Test the connection on startup
async function testConnection() {
    try {
        const conn = await pool.getConnection();
        console.log('✅ MySQL connected →', process.env.DB_HOST);
        conn.release();
    } catch (err) {
        console.error('❌ MySQL connection failed:', err.message);
        process.exit(1);   // Stop server if DB is unreachable
    }
}

testConnection();

module.exports = pool;
