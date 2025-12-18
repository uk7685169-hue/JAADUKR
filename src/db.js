const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

let pool = null;

function makeFilePool() {
    const dbFile = path.join(__dirname, '..', 'data', 'db.json');

    async function readDb() {
        try {
            const txt = await fs.readFile(dbFile, 'utf8');
            return JSON.parse(txt);
        } catch (e) {
            return { users: [], waifus: [], statistics: {}, settings: {} };
        }
    }

    return {
        on: () => {},
        async query(sql, params) {
            const q = (sql || '').toLowerCase().trim();
            const db = await readDb();

            if (q.startsWith('select 1') || q === 'select 1') {
                return { rows: [{ '?column?': 1 }] };
            }
            if (q.includes('select count(*)') && q.includes('from users')) {
                return { rows: [{ count: String((db.users || []).length) }] };
            }
            if (q.includes('select count(*)') && q.includes('from waifus')) {
                return { rows: [{ count: String((db.waifus || []).length) }] };
            }
            if (q.includes('select * from users')) {
                return { rows: db.users || [] };
            }
            if (q.includes('select * from waifus')) {
                return { rows: db.waifus || [] };
            }
            if (q.includes('select * from harem')) {
                // Flatten user harems into rows
                const rows = [];
                for (const u of db.users || []) {
                    const h = u.harem || [];
                    for (const entry of h) {
                        rows.push({ user_id: u.user_id, waifu_id: entry.waifu_id });
                    }
                }
                return { rows };
            }

            // For DDL and other queries, just return empty result
            return { rows: [] };
        }
    };
}

function getPool() {
    if (!pool) {
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            console.warn('⚠️ DATABASE_URL not provided. Running with file-backed stub pool.');
            pool = makeFilePool();
            return pool;
        }

        try {
            pool = new Pool({ connectionString: dbUrl });
            console.log('✅ PostgreSQL pool created');
        } catch (error) {
            console.warn('⚠️ Failed to create PostgreSQL pool:', error.message);
            console.warn('Falling back to file-backed stub pool.');
            pool = makeFilePool();
        }
    }
    return pool;
}

module.exports = { getPool };