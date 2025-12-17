const { Pool } = require('pg');

let pool = null;

function getPool() {
    if (!pool) {
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            console.warn('⚠️ DATABASE_URL not provided. Running in NO-DB MODE.');
            return null;
        }

        try {
            pool = new Pool({ connectionString: dbUrl });
            console.log('✅ PostgreSQL pool created');
        } catch (error) {
            console.warn('⚠️ Failed to create PostgreSQL pool:', error.message);
            console.warn('Running in NO-DB MODE.');
            return null;
        }
    }
    return pool;
}

module.exports = { getPool };