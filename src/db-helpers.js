// SQLite helper functions to replace pool.query
// Usage: instead of await pool.query(...), use db.prepare(...).run/get/all()

const { db } = require('./db');

// Convert PostgreSQL parameterized query to SQLite
// PostgreSQL: $1, $2, $3 => SQLite: ?, ?, ?
function convertQuery(pgQuery) {
    return pgQuery.replace(/\$\d+/g, '?');
}

// Convert PostgreSQL RETURNING clause (not supported in SQLite directly)
// For INSERT/UPDATE/DELETE, use last_insert_rowid() or read back

function exec(sql, params = []) {
    try {
        const query = convertQuery(sql);
        const stmt = db.prepare(query);
        const result = stmt.run(...params);
        return {
            rows: [{ affectedRows: result.changes }]
        };
    } catch (error) {
        console.error('DB exec error:', error, 'SQL:', sql);
        return { rows: [] };
    }
}

function query(sql, params = []) {
    try {
        const query = convertQuery(sql);
        const stmt = db.prepare(query);
        const rows = stmt.all(...params);
        return { rows };
    } catch (error) {
        console.error('DB query error:', error, 'SQL:', sql);
        return { rows: [] };
    }
}

function queryOne(sql, params = []) {
    try {
        const query = convertQuery(sql);
        const stmt = db.prepare(query);
        const row = stmt.get(...params);
        return { rows: row ? [row] : [] };
    } catch (error) {
        console.error('DB queryOne error:', error, 'SQL:', sql);
        return { rows: [] };
    }
}

module.exports = {
    exec,
    query,
    queryOne,
    db,
    convertQuery
};
