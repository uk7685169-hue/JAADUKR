const { db } = require('./db');

// Create a compatibility layer that makes better-sqlite3 (sync) behave like node-postgres (async)
// This allows existing code that uses pool.query() to work with SQLite

function createCompatPool() {
    return {
        query: function(sql, params = []) {
            return new Promise((resolve, reject) => {
                try {
                    // Convert PostgreSQL $1, $2, etc to ?
                    const convertedSql = sql.replace(/\$\d+/g, '?');
                    
                    // Determine query type
                    const trimmed = convertedSql.trim().toUpperCase();
                    const isSelect = trimmed.startsWith('SELECT');
                    
                    if (isSelect) {
                        // Check if it's a single-row query with RETURNING
                        if (convertedSql.toUpperCase().includes('RETURNING')) {
                            const result = db.prepare(convertedSql).get(...params);
                            resolve({
                                rows: result ? [result] : [],
                                rowCount: result ? 1 : 0
                            });
                        } else {
                            // Regular SELECT - return all rows
                            const results = db.prepare(convertedSql).all(...params);
                            resolve({
                                rows: results || [],
                                rowCount: (results || []).length
                            });
                        }
                    } else {
                        // INSERT/UPDATE/DELETE/other
                        const stmt = db.prepare(convertedSql);
                        const info = stmt.run(...params);
                        resolve({
                            rows: [],
                            rowCount: info.changes || 0,
                            lastID: info.lastInsertRowid
                        });
                    }
                } catch (error) {
                    console.error('DB Error:', error.message);
                    reject(error);
                }
            });
        }
    };
}

// Create singleton pool instance
const pool = createCompatPool();

// Export both pool (for compatibility) and db (for direct SQLite access)
module.exports = {
    pool,
    db,
    createCompatPool
};
