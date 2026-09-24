const pool = require('./db');

(async () => {
    try {
        const [[database]] = await pool.query("SELECT DATABASE() AS database_name");
        const [tables] = await pool.query("SHOW TABLES");

        console.log("✅ Layerbase MySQL connected!");
        console.log(`Database: ${database.database_name}`);
        console.log("Tables:", tables.map((table) => Object.values(table)[0]));
    } catch (error) {
        console.error("❌ Database connection failed:");
        console.error(error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
})();