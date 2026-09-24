const mysql = require('mysql2/promise');
const path  = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

let host     = process.env.DB_HOST;
let port     = Number(process.env.DB_PORT) || 3306;
let user     = process.env.DB_USER || process.env.DB_USERNAME;
let password = process.env.DB_PASSWORD;
let database = process.env.DB_NAME || process.env.DB_DATABASE;

// Support DATABASE_URL (provided by Vercel / Layerbase / Railway / Planetscale)
if (process.env.DATABASE_URL && (!host || !user || !database)) {
    try {
        const u  = new URL(process.env.DATABASE_URL);
        host     = u.hostname;
        port     = Number(u.port) || 3306;
        user     = decodeURIComponent(u.username);
        password = decodeURIComponent(u.password);
        database = u.pathname.replace(/^\//, '');
    } catch (e) {
        console.error('Error parsing DATABASE_URL:', e);
    }
}

if (!host || !user || !database || password === undefined) {
    throw new Error('Missing required database environment variables (DB_HOST, DB_USER, DB_NAME, DB_PASSWORD or DATABASE_URL)');
}

// Create connection pool with keepalive to avoid disconnects on remote Layerbase MySQL
const pool = mysql.createPool({
    host: host,
    port: port,
    user: user,
    password: password,
    database: database,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 60000,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
});

module.exports = pool;
